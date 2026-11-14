// Auditoria isolada: SQLite em memória, relógio controlado, WhatsApp inteiramente simulado.
const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'), vm=require('node:vm'), path=require('node:path');
const {spawnSync}=require('node:child_process');
const T=require('../backend/services/marketingTempo');

test('dias independentes e combinações geram somente as datas escolhidas',()=>{
  for(const dia of T.DIAS)assert.deepEqual(T.config({dias:[dia],hora:'09:00'}).dias,[dia]);
  const esperadas=['2026-11-20','2026-11-19','2026-11-18','2026-11-17','2026-11-15','2026-11-13'];
  assert.deepEqual(T.DIAS.map(d=>T.somarDias('2026-11-20',-d)),esperadas);
  assert.deepEqual(T.config({dias:[0,2],hora:'09:00'}).dias,[0,2]);
  for(const c of [{dias:[]},{dias:[4]},{dias:[-1]},{dias:[8]},{dias:[0],hora:'24:00'},{dias:[0],hora:'9:00'}])assert.throws(()=>T.config(c));
});
test('Brasília independente do servidor UTC, Los Angeles ou Tóquio; viradas de dia/ano',()=>{
  assert.equal(T.nascimento(new Date('2000-11-20T00:00:00Z')),'2000-11-20');
  const modulo=require.resolve('../backend/services/marketingTempo');
  const code=`const t=require(${JSON.stringify(modulo)}); console.log(JSON.stringify([t.horario('2026-11-20','09:00').toISOString(),t.civil('2026-11-21T01:00:00Z'),t.somarDias('2027-01-01',-7)]))`;
  for(const TZ of ['UTC','America/Los_Angeles','Asia/Tokyo']) {
    const r=spawnSync(process.execPath,['-e',code],{env:{...process.env,TZ},encoding:'utf8'});
    assert.equal(r.status,0,r.stderr);assert.deepEqual(JSON.parse(r.stdout),['2026-11-20T12:00:00.000Z','2026-11-20','2026-12-25']);
  }
  for(const hora of ['07:30','09:00','12:00','15:30','18:00'])assert.equal(T.horario('2026-11-20',hora).getUTCHours(),Number(hora.slice(0,2))+3);
});

test('auditoria integrada de automações, persistência, fila, isolamento e retentativas',async t=>{
  const lab=await require('../backend/scripts/lab-fiscal/app').criarLaboratorio();
  const {DataTypes}=require('sequelize'), db=lab.db, M=lab.models;
  const fonte=fs.readFileSync(require.resolve('../backend/models/Cliente'),'utf8');
  const Cliente=vm.runInNewContext(fonte.slice(fonte.indexOf('const Cliente = sequelize.define('),fonte.indexOf('module.exports = { Cliente'))+'\nCliente;',{sequelize:db,DataTypes,require});
  await Cliente.sync({force:true});
  require.cache[require.resolve('../backend/models/Cliente')].exports.Cliente=Cliente; M.Cliente=Cliente;
  M.Pet=require('../backend/models/Pet');
  M.Pet.associate(M);
  Cliente.hasMany(M.Pet,{foreignKey:"cliente_id",as:"pets"});
  M.Agendamento.belongsTo(M.Pet,{foreignKey:'petId',as:'pet'});
  for(const nome of ['MensagemAutomatica','EnvioAgendado','LogEnvio','ProdutoLembreteRecorrente','Periodicidade'])M[nome]=require('../backend/models/'+nome)(db);
  M.ProdutoLembreteRecorrente.belongsTo(Cliente,{foreignKey:"cliente_id",as:"cliente"});
  await db.sync();
  const transaction=db.transaction.bind(db);let transacoes=Promise.resolve();
  db.transaction=(...args)=>{if(args[0]?.transaction)return transaction(...args);const p=transacoes.then(()=>transaction(...args));transacoes=p.catch(()=>{});return p;};
  const wpp=require('../backend/services/whatsappService');
  const online=new Set(), enviados=[];
  t.mock.method(wpp,'isConectado',id=>online.has(Number(id)));
  t.mock.method(wpp,'empresasConectadas',()=>[...online]);
  const send=t.mock.method(wpp,'enviarMensagem',async(empresa,telefone,conteudo)=>{
    enviados.push({empresa,telefone,conteudo});return {sucesso:true,mensagemId:'ack-'+enviados.length};
  });
  const fila=require('../backend/services/whatsappQueue'), S=require('../backend/services/marketingScheduler'), E=require('../backend/services/marketingEventos');
  const controller=require('../backend/controllers/marketingController');
  const D=require('../backend/services/marketingDisparos');await D.preparar();
  t.mock.timers.enable({apis:['Date','setImmediate'],now:Date.parse('2026-11-12T10:00:00Z')});
  const setHora=data=>t.mock.timers.setTime(Date.parse(data));
  const tick=()=>new Promise(resolve=>setImmediate(resolve));
  const cliA=await Cliente.create({nome:'Tutora A',empresa_id:1,telefone:'31999990001',data_nascimento:'2000-11-20'});
  const cliB=await Cliente.create({nome:'Tutora B',empresa_id:2,telefone:'31999990002',data_nascimento:'2000-11-20'});
  const petA=await M.Pet.create({nome:'Pet A',cliente_id:cliA.id,empresa_id:1,data_nascimento:'2020-11-20'});
  const petB=await M.Pet.create({nome:'Pet B',cliente_id:cliB.id,empresa_id:2,data_nascimento:'2020-11-20'});
  const mensagem=(tipo,empresa=1,dias=[0],hora='09:00')=>M.MensagemAutomatica.create({tipo,empresaId:empresa,titulo:tipo,conteudo:'{nome_tutor}: {nome_pet} {produto} {data_agendamento} {hora_agendamento}',ativo:true,configuracaoEnvio:T.config({dias,hora},tipo)});
  async function chamar(fn,id,empresa,body={}) {
    const res={statusCode:200,status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;}};
    await fn({params:{id},user:{empresaId:empresa},body},res);return res;
  }
  async function zerar() {online.clear();enviados.length=0;await M.EnvioAgendado.destroy({where:{}});await db.models.MarketingDisparo.destroy({where:{}});await M.MensagemAutomatica.destroy({where:{}});}
  t.after(async()=>{fila.pararAgendador();online.clear();t.mock.timers.reset();await transacoes;await db.close();});

  await t.test('planejamento real: no dia + 2 antes, sem enviar 1 antes; concorrência idempotente',async()=>{
    const m=await mensagem('aniversario_pet',1,[0,2]);
    setHora('2026-11-18T10:00:00Z');
    await Promise.all([S.planejar(1),S.planejar(1),S.planejar(1)]);
    assert.equal(await M.EnvioAgendado.count(),1);
    const envio=await M.EnvioAgendado.findOne();assert.equal(envio.contexto.diasAntes,2);
    assert.equal(envio.dataAgendada.toISOString(),'2026-11-18T12:00:00.000Z');
    setHora('2026-11-19T10:00:00Z');await S.planejar(1);assert.equal(await M.EnvioAgendado.count(),1);
    setHora('2026-11-20T10:00:00Z');await S.planejar(1);assert.equal(await M.EnvioAgendado.count(),2);
    await zerar();
  });
  await t.test('todas as opções: seis disparos independentes; aniversário do ano seguinte não bloqueado',async()=>{
    await mensagem('aniversario_pet',1,T.DIAS);
    for(const dia of T.DIAS){setHora(T.horario(T.somarDias('2026-11-20',-dia),'07:00').toISOString());await S.planejar(1);}
    assert.equal(await M.EnvioAgendado.count(),6);
    setHora('2027-11-20T10:00:00Z');await S.planejar(1);assert.equal(await M.EnvioAgendado.count(),7);
    await zerar();
  });
  await t.test('dois pets do mesmo tutor têm disparos próprios; vínculo legado cruzado é recusado',async()=>{
    const outro=await M.Pet.create({nome:'Outro pet A',cliente_id:cliA.id,empresa_id:1,data_nascimento:'2021-11-20'});
    const cruzado=await M.Pet.create({nome:'Vínculo inválido',cliente_id:cliA.id,empresa_id:2,data_nascimento:'2021-11-20'});
    await mensagem('aniversario_pet');setHora('2026-11-20T10:00:00Z');await S.planejar(1);
    const jobs=await M.EnvioAgendado.findAll();assert.equal(jobs.length,2);
    assert.deepEqual(jobs.map(e=>Number(e.contexto.petId)).sort((a,b)=>a-b),[petA.id,outro.id].sort((a,b)=>a-b));
    assert.ok(jobs.every(e=>e.empresaId===1));
    await zerar();await outro.destroy();await cruzado.destroy();
  });
  await t.test('empresas e horários independentes; offline mantém pendente e somente open libera envio',async()=>{
    await mensagem('aniversario_tutor',1,[0],'09:00');await mensagem('aniversario_tutor',2,[0],'14:00');
    setHora('2026-11-20T11:59:00Z');await S.planejar();
    online.add(1);online.add(2);await fila.processarFila();assert.equal(enviados.length,0);
    setHora('2026-11-20T12:00:00Z');online.delete(1);await fila.processarFila();assert.equal(enviados.length,0);
    const pendente=await M.EnvioAgendado.findOne({where:{empresaId:1}});assert.equal(pendente.status,'pendente');assert.equal(pendente.tentativas,0);
    online.add(1);await Promise.all([fila.processarFila(1),fila.processarFila(1)]);assert.equal(enviados.length,1);assert.equal(enviados[0].telefone,cliA.telefone);assert.equal(enviados[0].empresa,1);
    setHora('2026-11-20T17:00:00Z');await fila.processarFila(2);assert.equal(enviados.length,2);assert.equal(enviados[1].empresa,2);assert.equal(enviados[1].telefone,cliB.telefone);
    await S.planejar();await fila.processarFila();assert.equal(enviados.length,2);
    await zerar();
  });
  await t.test('Ativar persiste e reabre dias/horários; configuração inválida retorna 400 sem alterar outra mensagem',async()=>{
    const a=await mensagem('aniversario_tutor'),b=await mensagem('aniversario_pet');
    setHora('2026-11-12T10:00:00Z');
    const r=await chamar(controller.ativarMensagem,a.id,1,{configuracaoEnvio:{dias:[7,3,0],hora:'17:30'}});assert.equal(r.statusCode,200);
    delete require.cache[require.resolve('../backend/services/marketingScheduler')];
    const salvo=await M.MensagemAutomatica.findByPk(a.id);assert.deepEqual(salvo.configuracaoEnvio,{hora:'17:30',dias:[0,3,7]});
    assert.deepEqual((await M.MensagemAutomatica.findByPk(b.id)).configuracaoEnvio,{hora:'09:00',dias:[0]});
    assert.equal((await chamar(controller.ativarMensagem,a.id,1,{configuracaoEnvio:{dias:[],hora:'25:00'}})).statusCode,400);
    assert.equal((await chamar(controller.ativarMensagem,a.id,2,{configuracaoEnvio:{dias:[0],hora:'12:00'}})).statusCode,403);
    await zerar();
  });
  await t.test('dias/horários editados replanejam pendentes; desativação impede envio',async()=>{
    const m=await mensagem('aniversario_tutor',1,[0],'09:00');setHora('2026-11-20T10:00:00Z');await S.planejar(1);
    await chamar(controller.ativarMensagem,m.id,1,{configuracaoEnvio:{dias:[0],hora:'15:30'}});
    const e=await M.EnvioAgendado.findOne();assert.equal(e.dataAgendada.toISOString(),'2026-11-20T18:30:00.000Z');
    await chamar(controller.desativarMensagem,m.id,1);online.add(1);setHora('2026-11-20T19:00:00Z');await fila.processarFila(1);assert.equal(enviados.length,0);
    assert.equal((await e.reload()).status,'cancelado');await zerar();
  });
  await t.test('agendamento alterado/cancelado cancela aviso antigo e novo horário é materializado',async()=>{
    const m=await mensagem('lembrete_agendamento',1,[0,2]);
    const ag=await M.Agendamento.create({empresa_id:1,petId:petA.id,dataAgendamento:T.horario('2026-11-20','16:00'),horario:'16:00',servico:'Banho',status:'agendado'});
    setHora('2026-11-18T10:00:00Z');await S.planejar(1);const antigo=await M.EnvioAgendado.findOne();
    await ag.update({dataAgendamento:T.horario('2026-11-21','16:00')});online.add(1);setHora('2026-11-18T12:00:00Z');await fila.processarFila(1);assert.equal(enviados.length,0);assert.equal((await antigo.reload()).status,'cancelado');
    setHora('2026-11-19T10:00:00Z');await S.planejar(1);const novo=await M.EnvioAgendado.findOne({where:{status:'pendente'}});assert.ok(novo);
    await ag.update({status:'cancelado'});setHora('2026-11-19T12:00:00Z');await fila.processarFila(1);assert.equal(enviados.length,0);assert.equal((await novo.reload()).status,'cancelado');
    await zerar();await ag.destroy();
  });
  await t.test('vacinas: produtos do mesmo atendimento e dias diferentes não se bloqueiam',async()=>{
    const p=await M.Periodicidade.create({descricao:'Mensal',dias:30});
    const ag=await M.Agendamento.create({empresa_id:1,petId:petA.id,dataAgendamento:T.horario('2026-10-21','15:00'),horario:'15:00',servico:'Vacinas',status:'concluido',servicos:[{nome:'Vacina A',meta:{tipoEspecial:'vacina',dataAplic:'2026-10-21',renovacao:'Mensal'}},{nome:'Produto B',meta:{tipoEspecial:'vermifugo',dataAplic:'2026-10-21',renovacao:'Mensal'}}]});
    await mensagem('vacinas_vencendo',1,[0,2]);setHora('2026-11-18T10:00:00Z');await S.planejar(1);assert.equal(await M.EnvioAgendado.count(),2);
    setHora('2026-11-20T10:00:00Z');await S.planejar(1);assert.equal(await M.EnvioAgendado.count(),4);
    await zerar();await ag.destroy();await p.destroy();
  });
  await t.test('produto recorrente usa ciclo, respeita dias/hora e não se reativa após desativação',async()=>{
    const m=await mensagem('produto_recorrente',1,[0,3],'14:00');
    const l=await M.ProdutoLembreteRecorrente.create({empresa_id:1,cliente_id:cliA.id,produto_nome:'Ração',dias_lembrete:30,data_proximo_disparo:T.horario('2026-11-20','09:00')});
    setHora('2026-11-17T10:00:00Z');await S.planejar(1);assert.equal(await M.EnvioAgendado.count(),1);assert.equal((await M.EnvioAgendado.findOne()).dataAgendada.toISOString(),'2026-11-17T17:00:00.000Z');
    setHora('2026-11-20T10:00:00Z');await S.planejar(1);assert.equal(await M.EnvioAgendado.count(),2);
    await m.update({ativo:false});await require('../backend/controllers/produtoLembreteController').processarLembretes(1);assert.equal((await m.reload()).ativo,false);
    await m.update({ativo:true});setHora('2026-12-20T10:00:00Z');await S.planejar(1);assert.equal(await M.EnvioAgendado.count(),3);assert.equal(T.civil((await l.reload()).data_proximo_disparo),'2026-12-20');
    await zerar();await l.destroy();
  });
  await t.test('disparo manual recorrente é explícito, usa data de Brasília e não finge confirmação',async()=>{
    setHora('2026-11-19T02:00:00Z');await mensagem('produto_recorrente',1,[3],'14:00');
    const l=await M.ProdutoLembreteRecorrente.create({empresa_id:1,cliente_id:cliA.id,produto_nome:'Ração',dias_lembrete:30,data_proximo_disparo:T.horario('2026-11-20','09:00')});
    const controle=require('../backend/controllers/produtoLembreteController');
    const res=await chamar(controle.dispararIndividual,l.id,1);
    assert.equal(res.statusCode,200,JSON.stringify(res.body));assert.equal(res.body.agendado,true);
    const job=await M.EnvioAgendado.findOne();assert.equal(job.status,'pendente');assert.equal(job.contexto.manual,true);
    assert.equal(job.contexto.cicloData,`${l.id}-2026-11-18`);assert.equal(+job.dataAgendada,Date.now());
    await zerar();await l.destroy();
  });
  await t.test('boas-vindas, pet pronto e primeiro banho preservam envio imediato e não duplicam',async()=>{
    setHora('2026-11-20T10:00:00Z');
    for(const tipo of ['boas_vindas','pet_pronto','primeiro_banho']) {
      const m=await mensagem(tipo);
      const e=await S.disparar(tipo,{nomeTutor:cliA.nome,nomePet:petA.nome},'numero-nao-usado',null,{clienteId:cliA.id,petId:petA.id},1);
      assert.ok(e);assert.equal(e.dataAgendada.getTime(),Date.now());
      await S.disparar(tipo,{},cliA.telefone,null,{clienteId:cliA.id,petId:petA.id},1);
      assert.equal(await M.EnvioAgendado.count({where:{mensagemAutomaticaId:m.id}}),1);
      assert.equal((await chamar(controller.ativarMensagem,m.id,1,{configuracaoEnvio:{dias:[0,1],hora:'09:00'}})).statusCode,400);
    }
    const m=await mensagem('pet_pronto',2);
    assert.equal(await S.disparar('pet_pronto',{},cliA.telefone,null,{clienteId:cliA.id,petId:petA.id},2),null);
    await zerar();
  });
  await t.test('falha definida tem três tentativas; resultado incerto e perda da confirmação não reenviam',async()=>{
    setHora('2026-11-20T10:00:00Z');const m=await mensagem('boas_vindas');
    let e=await S.disparar('boas_vindas',{},cliA.telefone,null,{clienteId:cliA.id,petId:petA.id},1);online.add(1);
    send.mock.mockImplementation(async()=>({sucesso:false,erro:'Falha antes de enviar'}));
    for(let i=0;i<3;i++)await fila.processarFila(1);assert.equal((await e.reload()).status,'erro');assert.equal(e.tentativas,3);
    await zerar();await mensagem('boas_vindas');online.add(1);
    e=await S.disparar('boas_vindas',{},cliA.telefone,null,{clienteId:cliA.id,petId:petA.id},1);
    let tentativas=0;send.mock.mockImplementation(async()=>{tentativas++;return {sucesso:false,incerto:true,erro:'Sem confirmação'};});
    await fila.processarFila(1);await fila.processarFila(1);assert.equal(tentativas,1);assert.match((await e.reload()).erroMensagem,/RESULTADO_INCERTO/);
    await zerar();await mensagem('boas_vindas');online.add(1);e=await S.disparar('boas_vindas',{},cliA.telefone,null,{clienteId:cliA.id,petId:petA.id},1);
    send.mock.mockImplementation(async()=>{tentativas++;return {sucesso:true,mensagemId:'ack'};});
    const update=e.update.bind(e);e.update=async dados=>{if(dados.status==='enviado')throw new Error('Banco indisponível após ACK');return update(dados);};
    const r=await fila.processarEnvio(e,M.LogEnvio);assert.equal(r.incerto,true);assert.match((await e.reload()).erroMensagem,/RESULTADO_INCERTO/);
    const antes=tentativas;await fila.processarFila(1);assert.equal(tentativas,antes);
    send.mock.mockImplementation(async(empresa,telefone,conteudo)=>{enviados.push({empresa,telefone,conteudo});return {sucesso:true,mensagemId:'ack'};});
    await zerar();
  });
  await t.test('envio abandonado fica incerto e reiniciar o módulo não o coloca novamente na fila',async()=>{
    setHora('2026-11-20T10:00:00Z');await mensagem('boas_vindas');
    const e=await S.disparar('boas_vindas',{},cliA.telefone,null,{clienteId:cliA.id,petId:petA.id},1);
    await e.update({status:'enviando'});await D.marcar(e,'enviando');
    setHora('2026-11-20T10:06:00Z');online.add(1);
    delete require.cache[require.resolve('../backend/services/whatsappQueue')];
    const reiniciada=require('../backend/services/whatsappQueue');
    await reiniciada.processarFila(1);
    assert.match((await e.reload()).erroMensagem,/RESULTADO_INCERTO/);
    assert.equal(enviados.length,0);
    assert.equal(await S.disparar('boas_vindas',{},cliA.telefone,null,{clienteId:cliA.id,petId:petA.id},1),null);
    await zerar();
  });
  await t.test('cancelar manualmente uma pendência não é desfeito pelo próximo planejamento',async()=>{
    setHora('2026-11-20T10:00:00Z');await mensagem('aniversario_pet');await S.planejar(1);
    const e=await M.EnvioAgendado.findOne();await e.update({status:'cancelado',erroMensagem:'Cancelado manualmente pelo usuário.'});
    await S.planejar(1);assert.equal((await e.reload()).status,'cancelado');assert.equal(await M.EnvioAgendado.count(),1);
    await zerar();
  });
  await t.test('replanejamento de edição cancela datas antigas imediatamente e cria os dias futuros corretos',async()=>{
    setHora('2026-11-12T10:00:00Z');const m=await mensagem('lembrete_agendamento',1,[0,2],'09:00');
    const ag=await M.Agendamento.create({empresa_id:1,petId:petA.id,dataAgendamento:T.horario('2026-11-20','16:00'),horario:'16:00',servico:'Banho',status:'agendado'});
    await S.sincronizarAgendamento(ag,1);
    const antigos=await M.EnvioAgendado.findAll({where:{status:'pendente'}});assert.equal(antigos.length,2);
    await ag.update({dataAgendamento:T.horario('2026-11-23','16:00')});await S.sincronizarAgendamento(ag,1);
    for(const e of antigos)assert.equal((await e.reload()).status,'cancelado');
    const futuros=await M.EnvioAgendado.findAll({where:{status:'pendente'},order:[['dataAgendada','ASC']]});
    assert.deepEqual(futuros.map(e=>T.civil(e.dataAgendada)),['2026-11-21','2026-11-23']);
    await zerar();await ag.destroy();
  });
  await t.test('HTTP com JWT: empresa B não altera agendamento nem registra vacina para pet da A',async()=>{
    const ag=await M.Agendamento.create({empresa_id:1,petId:petA.id,dataAgendamento:T.horario('2026-11-21','15:00'),horario:'15:00',servico:'Banho',status:'agendado'});
    lab.app.use('/api/agendamentos',require('../backend/routes/agendamentoRoutes'));
    lab.app.use('/api/pets',require('../backend/routes/petRoutes'));
    const server=lab.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
    try {
      const base='http://127.0.0.1:'+server.address().port;
      for(const [rota,method,body] of [[`/api/agendamentos/${ag.id}/status`,'PATCH',{status:'pronto'}],[`/api/pets/${petA.id}/vacinas`,'POST',{nome:'Vacina indevida',dataAplic:'2026-11-20'}]]) {
        const res=await lab.fetchLocal(base+rota,{method,headers:{Authorization:'Bearer '+lab.token(2),'Content-Type':'application/json'},body:JSON.stringify(body)});
        assert.equal(res.status,404,await res.text());
      }
      assert.equal((await ag.reload()).status,'agendado');
      const media=require('../backend/services/midias').instancia();
      t.mock.method(media.store,'gravar',async()=>({etag:'fake'}));
      const foto=await lab.fetchLocal(base+`/api/pets/${petA.id}/foto`,{method:'POST',headers:{Authorization:'Bearer '+lab.token(1),'Content-Type':'application/json'},body:JSON.stringify({foto_url:'data:image/png;base64,'+(await require('sharp')({create:{width:1,height:1,channels:3,background:'green'}}).png().toBuffer()).toString('base64')})});
      assert.equal(foto.status,200,await foto.text());
    } finally {server.closeAllConnections();await new Promise(r=>server.close(r));await ag.destroy();}
    await zerar();
  });

});


test('modal de Marketing salva/reabre seleção exata e distingue eventos imediatos',async()=>{
  const fonte=fs.readFileSync(path.join(__dirname,'../frontend/marketing.js'),'utf8');
  const funcoes=fonte.slice(fonte.indexOf('async function avancarParaConfiguracao()'),fonte.indexOf('async function desativarMensagem('));
  const nodes=new Map(),checks=T.DIAS.map(d=>({value:String(d),checked:false}));
  const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',style:{},disabled:false});return nodes.get(id);};
  node('modalMsgConteudo').value='Texto personalizado';
  let salvo={id:10,tipo:'aniversario_pet',titulo:'Aniversário',configuracaoEnvio:{dias:[0,2,7],hora:'17:30'}};
  const ctx=vm.createContext({console,FormData,API:'/api/marketing',_modalMsgAtualId:10,_mensagens:[salvo],_imagemArquivo:null,_removerImagem:false,
    document:{getElementById:node,querySelectorAll(sel){return sel.includes(':checked')?checks.filter(c=>c.checked):checks;},querySelector(sel){const n=sel.match(/value="(\d+)"/);return n?checks.find(c=>c.value===n[1]):null;}},
    async fetch(url,options){if(options.method==='POST')salvo={...salvo,configuracaoEnvio:JSON.parse(options.body).configuracaoEnvio};return {ok:true,json:async()=>JSON.parse(JSON.stringify(salvo))};},
    fecharModal(){},carregarMensagens:async()=>{ctx._mensagens=[JSON.parse(JSON.stringify(salvo))];},mostrarToast(){},alert(m){throw new Error(m);}
  });
  vm.runInContext(funcoes,ctx);
  await ctx.avancarParaConfiguracao();assert.deepEqual(checks.filter(c=>c.checked).map(c=>Number(c.value)),[0,2,7]);assert.equal(node('horaEnvio').value,'17:30');
  checks.forEach(c=>c.checked=['0','3'].includes(c.value));node('horaEnvio').value='07:30';
  await ctx.ativarMensagemConfirmado();await ctx.avancarParaConfiguracao();
  assert.deepEqual(checks.filter(c=>c.checked).map(c=>Number(c.value)),[0,3]);assert.equal(node('horaEnvio').value,'07:30');
  salvo={...salvo,tipo:'pet_pronto',configuracaoEnvio:{tipo:'imediato'}};ctx._mensagens=[salvo];await ctx.avancarParaConfiguracao();
  assert.equal(node('marketingConfigDatas').style.display,'none');assert.equal(node('marketingConfigImediato').style.display,'block');
  await ctx.ativarMensagemConfirmado();assert.deepEqual(salvo.configuracaoEnvio,{tipo:'imediato'});
});


test('adaptador de envio distingue falha antes do envio e resultado incerto após sendMessage',async()=>{
  const {EventEmitter}=require('node:events');
  const socket={ev:new EventEmitter(),user:{id:'5531999990000@s.whatsapp.net'},end(){},
    async onWhatsApp(...jids){return [{exists:true,jid:jids[0]}];},async sendMessage(){throw new Error('Resposta perdida');}};
  const service=require('../backend/services/whatsappService').criarServico({pausaEnvio:async()=>{},carregar:async()=>({initAuthCreds:()=>({}),Browsers:{macOS:()=>['Mac','Desktop','1']},default:()=>socket})});
  await service.inicializarCliente(1);socket.ev.emit('connection.update',{connection:'open'});
  const incerto=await service.enviarMensagem(1,'31999990000','teste');assert.equal(incerto.sucesso,false);assert.equal(incerto.incerto,true);
  socket.onWhatsApp=async()=>{throw new Error('Falha na consulta anterior ao envio');};
  const anterior=await service.enviarMensagem(1,'31999990000','teste');assert.equal(anterior.sucesso,false);assert.notEqual(anterior.incerto,true);
  await service.suspender();
});
