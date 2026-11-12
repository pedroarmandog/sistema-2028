const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {periodoMes}=require('../backend/utils/periodoBrasilia');

test('mês civil de Brasília: UTC, virada de mês e virada de ano',()=>{
  assert.equal(periodoMes('2026-12-01T02:59:59Z').inicio.toISOString(),'2026-11-01T03:00:00.000Z');
  assert.equal(periodoMes('2026-12-01T03:00:00Z').inicio.toISOString(),'2026-12-01T03:00:00.000Z');
  assert.equal(periodoMes('2026-12-01T03:00:00Z').fim.toISOString(),'2027-01-01T03:00:00.000Z');
});
test('Dashboard desktop não troca zero pelo total; Mobile continua usando o total histórico',async()=>{
  const fonte=fs.readFileSync(require.resolve('../frontend/dashboard.js'),'utf8');
  const trecho=fonte.slice(fonte.indexOf('  async loadStats() {'),fonte.indexOf('  async loadIndicadores',fonte.indexOf('  async loadStats() {')));
  // Extrair apenas o método para não executar polling ou inicialização da interface.
  const fim=trecho.indexOf('\n  },');
  const elementos=new Map();
  const doc={getElementById(id){if(!elementos.has(id))elementos.set(id,{});return elementos.get(id);}};
  const ctx=vm.createContext({document:doc,console});
  const app=vm.runInContext('({'+trecho.slice(0,fim+5)+'})',ctx);
  app.apiFetch=async()=>({clientes:56,clientesMes:0});app.formatCurrency=()=>'';
  await app.loadStats();assert.equal(doc.getElementById('statClientes').textContent,0);
  const mobile=fs.readFileSync(require.resolve('../frontend/mobile/pages/dashboard.js'),'utf8');
  assert.match(mobile,/const clientes = resumo\?\.clientes \?\?/);
  assert.doesNotMatch(mobile,/const clientes = resumo\?\.clientesMes/);
});

test('banco isolado: resumo, estoque e eventos push após gravação',async t=>{
  const lab=await require('../backend/scripts/lab-fiscal/app').criarLaboratorio();
  const db=lab.db,M=lab.models,{DataTypes}=require('sequelize');
  const fonte=fs.readFileSync(require.resolve('../backend/models/Cliente'),'utf8');
  const Cliente=vm.runInNewContext(fonte.slice(fonte.indexOf('const Cliente = sequelize.define('),fonte.indexOf('module.exports = { Cliente'))+'\nCliente;',{sequelize:db,DataTypes,require});
  await Cliente.sync({force:true});M.Cliente=Cliente;require.cache[require.resolve('../backend/models/Cliente')].exports.Cliente=Cliente;
  M.Pet=require('../backend/models/Pet');M.Pet.associate(M);
  M.Agendamento.belongsTo(M.Pet,{foreignKey:'petId',as:'pet'});
  M.PushSubscription=require('../backend/models/PushSubscription')(db);
  for(const nome of ['MensagemAutomatica','EnvioAgendado','LogEnvio','ProdutoLembreteRecorrente','Periodicidade'])M[nome]=require('../backend/models/'+nome)(db);
  await db.sync();
  const con=await db.connectionManager.getConnection();con.db.function('JSON_UNQUOTE',v=>v);
  const transaction=db.transaction.bind(db);let filaSQL=Promise.resolve();
  db.transaction=(...args)=>{if(args[0]?.transaction)return transaction(...args);const p=filaSQL.then(()=>transaction(...args));filaSQL=p.catch(()=>{});return p;};
  const webpush=require('web-push'),keys=webpush.generateVAPIDKeys();process.env.VAPID_PRIVATE_KEY=keys.privateKey;process.env.VAPID_PUBLIC_KEY=keys.publicKey;
  const entregas=[];
  t.mock.method(webpush,'sendNotification',async(sub,payload,options)=>{entregas.push({endpoint:sub.endpoint,payload:JSON.parse(payload),options});return {statusCode:201};});
  const Eventos=require('../backend/services/pushEventoService');await Eventos.preparar(db);
  const Push=require('../backend/services/pushNotificationService'),dash=require('../backend/controllers/dashboardController');
  const cache=require('../backend/utils/simpleCache');
  t.mock.timers.enable({apis:['Date'],now:Date.parse('2026-11-15T12:00:00Z')});
  const setHora=d=>t.mock.timers.setTime(Date.parse(d));
  const request=async(fn,empresa=1)=>{const res={statusCode:200,status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;}};await fn({user:{empresaId:empresa}},res);return res;};
  const produto=(id,extras={})=>{const {transaction,...dados}=extras;return M.Produto.create({id,nome:id,tipo:'produto',empresa_id:1,estoqueAtual:10,estoqueMinimo:5,estoqueIdeal:20,...dados},{transaction});};
  await M.PushSubscription.create({usuario_id:1,empresa_id:1,endpoint:'https://push.test/empresa-A',keys:{auth:'fixture',p256dh:'fixture'},preferencias:{estoque_baixo:true,cancelamento:true}});
  await M.PushSubscription.create({usuario_id:2,empresa_id:2,endpoint:'https://push.test/empresa-B',keys:{auth:'fixture',p256dh:'fixture'},preferencias:{estoque_baixo:true,cancelamento:true}});
  await M.PushSubscription.create({usuario_id:3,empresa_id:1,endpoint:'https://push.test/A-sem-estoque',keys:{auth:'fixture',p256dh:'fixture'},preferencias:{estoque_baixo:false,cancelamento:true}});
  t.after(async()=>{await Eventos.drenar();t.mock.timers.reset();await filaSQL;await db.close();});
  await t.test('Desktop conta somente mês/empresa, aceita zero e não devolve cache de outra virada',async()=>{
    await Cliente.create({nome:'Anterior',empresa_id:1,createdAt:new Date('2026-11-01T02:59:59Z')});
    await Cliente.create({nome:'Atual',empresa_id:1,createdAt:new Date('2026-11-01T03:00:00Z')});
    await Cliente.create({nome:'Outra empresa',empresa_id:2,createdAt:new Date('2026-11-02T03:00:00Z')});
    const r=await request(dash.resumo);assert.equal(r.statusCode,200,JSON.stringify(r.body));assert.equal(r.body.clientesMes,1);assert.equal(r.body.clientes,2);
    await Cliente.create({nome:'Novo agora',empresa_id:1});
    const atualizado=await request(dash.resumo);assert.equal(atualizado.body.clientesMes,2); // cache do resumo financeiro não congela o contador mensal
    setHora('2026-12-01T03:00:00Z');const virou=await request(dash.resumo);assert.equal(virou.body.clientesMes,0);assert.equal(virou.body.clientes,3);
    setHora('2026-11-15T12:00:00Z');
  });
  await t.test('estoque do Dashboard exclui serviço/plano, mantém físico, mínimo e ideal',async()=>{
    await produto('BANHO',{tipo:'servico',estoqueAtual:0});await produto('PLANO',{tipo:'plano',estoqueAtual:0});
    await produto('RACAO',{estoqueAtual:2});await produto('RACAO-B',{empresa_id:2,estoqueAtual:0});entregas.length=0;
    cache.clear();const r=await request(dash.produtosEstoqueBaixo);assert.equal(r.statusCode,200);
    assert.ok(r.body.some(p=>p.id==='RACAO'&&Number(p.estoqueIdeal)===20),JSON.stringify(r.body));assert.ok(!r.body.some(p=>['BANHO','PLANO','RACAO-B'].includes(p.id)));
    await request(dash.produtosEstoqueBaixo);assert.equal(entregas.length,0);
  });
  await t.test('cadastro baixo, igualdade ao mínimo, nova queda e isolamento/preferências',async()=>{
    entregas.length=0;const p=await produto('INICIAL-BAIXO',{estoqueAtual:2});assert.equal(entregas.length,1);assert.equal(entregas[0].endpoint,'https://push.test/empresa-A');
    assert.match(entregas[0].payload.body,/2 unidade/);assert.match(entregas[0].payload.body,/5/);assert.equal(entregas[0].options.TTL,3600);
    await p.update({estoqueAtual:1});await p.update({nome:'Nome editado'});assert.equal(entregas.length,1);
    await p.update({estoqueAtual:10});await p.update({estoqueAtual:5});assert.equal(entregas.length,2);
    assert.notEqual(entregas[0].payload.tag,entregas[1].payload.tag);
    await produto('SERVICO-SEM-PUSH',{tipo:'servico',estoqueAtual:0});assert.equal(entregas.length,2);
    await produto('BAIXO-B',{empresa_id:2,estoqueAtual:1});assert.equal(entregas.at(-1).endpoint,'https://push.test/empresa-B');
  });
  await t.test('baixa de PDV e edição direta usam o mesmo evento; transação/rollback não notifica antes de commit',async()=>{
    const p=await produto('PDV');entregas.length=0;
    await p.update({estoqueAtual:5});assert.equal(entregas.length,1);
    await M.Produto.update({estoqueAtual:10},{where:{id:p.id,empresa_id:1}});
    await M.Produto.update({estoqueAtual:4},{where:{id:p.id,empresa_id:1}});assert.equal(entregas.length,2);
    entregas.length=0;
    await assert.rejects(db.transaction(async transaction=>{await produto('ROLLBACK',{estoqueAtual:1,transaction});throw new Error('rollback');}));
    await Eventos.drenar();assert.equal(entregas.length,0);
    await db.transaction(async transaction=>{
      await M.Produto.create({id:'COMMIT',nome:'COMMIT',tipo:'produto',empresa_id:1,estoqueAtual:1,estoqueMinimo:5},{transaction});
      assert.equal(entregas.length,0);
    });
    await Eventos.drenar();assert.equal(entregas.length,1);
  });
  await t.test('cancelamento salvo em qualquer rota notifica uma vez; reabrir e cancelar gera nova ocorrência',async()=>{
    const cli=await Cliente.findOne({where:{empresa_id:1}}),pet=await M.Pet.create({nome:'Thor',cliente_id:cli.id,empresa_id:1});
    const ag=await M.Agendamento.create({empresa_id:1,petId:pet.id,dataAgendamento:new Date('2026-11-20T17:00:00Z'),horario:'14:00',servico:'Banho e Tosa',status:'agendado'});
    entregas.length=0;await ag.update({status:'cancelado'});assert.equal(entregas.length,2);
    assert.ok(entregas.every(e=>!e.endpoint.endsWith('empresa-B')));assert.match(entregas[0].payload.body,/Thor.*Banho e Tosa.*14:00/);
    await ag.update({status:'cancelado'});await M.Agendamento.update({status:'cancelado'},{where:{id:ag.id,empresa_id:1}});assert.equal(entregas.length,2);
    await ag.update({status:'agendado'});await ag.update({status:'cancelado'});assert.equal(entregas.length,4);
  });
  await t.test('outros pushes mantêm o fluxo e preferências existentes',async()=>{
    entregas.length=0;await Push.notificarEmpresa(1,'nova_venda',{clienteNome:'Cliente de teste'});
    assert.equal(entregas.length,2);assert.ok(entregas.every(e=>e.payload.title==='💰 Nova Venda Realizada'));assert.equal(entregas[0].options.TTL,0);
  });
  await t.test('concorrência na mesma queda não duplica e rollback de cancelamento não publica evento',async()=>{
    const p=await produto('CONCORRENTE');const a=await M.Produto.findByPk(p.id),b=await M.Produto.findByPk(p.id);entregas.length=0;
    await Promise.all([a.update({estoqueAtual:5}),b.update({estoqueAtual:4})]);assert.equal(entregas.length,1);
    const cli=await Cliente.findOne({where:{empresa_id:1}}),pet=await M.Pet.create({nome:'Rollback',cliente_id:cli.id,empresa_id:1});
    const ag=await M.Agendamento.create({empresa_id:1,petId:pet.id,dataAgendamento:new Date(),horario:'14:00',servico:'Banho',status:'agendado'});
    entregas.length=0;await assert.rejects(db.transaction(async transaction=>{await ag.update({status:'cancelado'},{transaction});assert.equal(entregas.length,0);throw new Error('rollback');}));
    await Eventos.drenar();assert.equal(entregas.length,0);assert.equal((await ag.reload()).status,'agendado');
  });
  await t.test('HTTP: cadastro/baixa, três caminhos de cancelamento e bloqueio entre empresas',async()=>{
    M.Admin=require('../backend/models/Admin')(db);await M.Admin.sync();
    await M.Admin.create({nome:'Gestor',sobrenome:'Teste',email:'gestor@fixture.test',senha:'fixture-only-test',cpf:'00000000000',telefone:'31999990000'});
    await M.Usuario.update({permissoes:['item.novo.produto','cliente.novo']},{where:{id:1}});
    await require('../backend/models/HistoricoEstoque').sync();
    lab.app.use('/api/itens',require('../backend/routes/itemRoutes'));
    lab.app.use('/api/agendamentos',require('../backend/routes/agendamentoRoutes'));
    const server=lab.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
    const base='http://127.0.0.1:'+server.address().port;
    async function api(rota,method,body,emp=1){const r=await lab.fetchLocal(base+rota,{method,headers:{Authorization:'Bearer '+lab.token(emp),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
    try{
      entregas.length=0;
      const novo=await api('/api/itens','POST',{nome:'Produto via API',tipo:'produto',estoqueAtual:2,estoqueMinimo:5,empresa_id:2});
      assert.equal(novo.status,201,JSON.stringify(novo.data));assert.equal(entregas.length,1);assert.equal(entregas[0].endpoint,'https://push.test/empresa-A');
      const produtoId=novo.data.id;assert.equal((await M.Produto.findByPk(produtoId)).empresa_id,1);
      await api('/api/itens/'+produtoId+'/estoque','PUT',{quantidade:10,operacao:'adicionar'});
      entregas.length=0;await api('/api/itens/'+produtoId+'/estoque','PUT',{quantidade:7,operacao:'reduzir'});assert.equal(entregas.length,1);
      const cli=await Cliente.findOne({where:{empresa_id:1}}),pet=await M.Pet.create({nome:'HTTP',cliente_id:cli.id,empresa_id:1});
      for(const [method,sufixo,body] of [['DELETE','',null],['PATCH','/status',{status:'cancelado'}],['POST','/cancelar',{usuario:'gestor@fixture.test',senha:'fixture-only-test'}]]){
        const ag=await M.Agendamento.create({empresa_id:1,petId:pet.id,dataAgendamento:new Date(),horario:'14:00',servico:'Banho',status:'agendado'});
        entregas.length=0;
        const bloqueado=await api('/api/agendamentos/'+ag.id+sufixo,method,body,2);assert.equal(bloqueado.status,404,JSON.stringify(bloqueado.data));assert.equal(entregas.length,0);
        const r=await api('/api/agendamentos/'+ag.id+sufixo,method,body);assert.equal(r.status,200,JSON.stringify(r.data));await Eventos.drenar();assert.equal(entregas.length,2);
        await api('/api/agendamentos/'+ag.id+sufixo,method,body);await Eventos.drenar();assert.equal(entregas.length,2);
      }
    }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
  });

});
