const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
test('operações de importação: checkpoints, lotes, retomada e segurança',async t=>{
 const lab=await require('../backend/scripts/lab-fiscal/app').criarLaboratorio(),db=lab.db,M=lab.models,{DataTypes}=require('sequelize');
 const src=fs.readFileSync(require.resolve('../backend/models/Cliente'),'utf8');
 const Cliente=vm.runInNewContext(src.slice(src.indexOf('const Cliente = sequelize.define('),src.indexOf('module.exports = { Cliente'))+'\nCliente;',{sequelize:db,DataTypes,require});
 await Cliente.sync({force:true});M.Cliente=Cliente;require.cache[require.resolve('../backend/models/Cliente')].exports.Cliente=Cliente;
 const banco=require('../backend/services/importacao/modelos'),I=require('../backend/services/clienteInteligencia'),S=require('../backend/services/importacao/servico'),O=require('../backend/services/importacao/operacoes');
 await banco.preparar();await I.preparar(db);await O.prepararEstrutura(db);await O.prepararEstrutura(db);
 await M.Usuario.update({permissoes:['cliente.novo']},{where:{id:1}});
 const transacao=db.transaction.bind(db);let sql=Promise.resolve();
 db.transaction=(...args)=>{if(args[0]?.transaction)return transacao(...args);const p=sql.then(()=>transacao(...args));sql=p.catch(()=>{});return p;};
 let agora=Date.parse('2026-11-13T18:00:00Z');const processadores=[];
 const criar=(options={})=>{const p=O.criarProcessador({db,Cliente,Empresa:M.Empresa,Lote:banco.Lote,Linha:banco.Linha,tamanho:10,agora:()=>agora,log:{info(){},warn(){}},...options});processadores.push(p);return p;};
 async function previa(prefixo,n=25,empresa=1,{erros=0}={}){
  const linhas=Array.from({length:n},(_,i)=>[prefixo+'-'+i,i<erros?'':'Cliente '+prefixo+' '+i,'@'+prefixo,100,50,'2026-11-01','2022-02-01']);
  return S.analisar('clientes',{linhas},['codigo_legado','nome','instagram','vendas_desde_cadastro','ticket_medio_desde_cadastro','data_referencia_historico','cadastro_original'],empresa,'',1,{conciliacao:'somar_posteriores'});
 }
 async function concluir(p,id,empresa=1){for(let i=0;i<400;i++){const status=await p.obter(empresa,id);if(!['pendente','processando'].includes(status.estado))return status;await p.executarUma();agora+=100;}throw new Error('Operação não terminou.');}
 lab.app.use('/api/clientes/importacao',require('../backend/routes/importacaoRoutes').criarRotas('clientes'));
 const server=lab.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 t.after(async()=>{for(const p of processadores)await p.parar();await O.instancia().parar();server.closeAllConnections();await new Promise(r=>server.close(r));await sql;await db.close();});
 async function api(path,{body,empresa=1,token=true}={}){const headers={};if(token)headers.Authorization='Bearer '+lab.token(empresa);if(body)headers['Content-Type']='application/json';const r=await lab.fetchLocal(base+path,{headers,method:body?'POST':'GET',body:body&&JSON.stringify(body)});return{status:r.status,data:await r.json()};}
 await t.test('criação rápida, cliques repetidos e progresso só nos lotes confirmados',async()=>{
  const a=await previa('PROGRESSO',25,1,{erros:2}),p=criar();
  const [um,dois]=await Promise.all([p.iniciar(1,1,a.token,{}),p.iniciar(1,1,a.token,{})]);assert.equal(um.id,dois.id);assert.equal(um.processados,0);assert.equal(await Cliente.count(),0);
  const outra=await previa('OUTRA',10);await assert.rejects(p.iniciar(1,1,outra.token,{}),e=>e.status===409&&e.operacaoId===um.id);
  await p.executarUma();let s=await p.obter(1,um.id);assert.equal(s.processados,10);assert.equal(s.percentual,40);assert.equal(s.criados,8);assert.equal(s.rejeitados,2);assert.equal(await Cliente.count(),8);
  const fim=await concluir(p,um.id);assert.equal(fim.estado,'concluido');assert.equal(fim.percentual,100);assert.equal(fim.criados,23);assert.equal(fim.rejeitados,2);assert.equal(fim.processados,fim.criados+fim.atualizados+fim.ignorados+fim.rejeitados);
  const rel=await p.relatorioFinal(1,um.id);assert.equal(rel.relatorio.length,25);assert.equal((await I.modelos(db).Historico.count()),23);
  await assert.rejects(p.obter(2,um.id),{status:404});assert.equal(Object.hasOwn(fim,'dados'),false);
 });
 await t.test('reinício abrupto: dono antigo não duplica e novo processo retoma o cursor persistente',async()=>{
  const a=await previa('RESTART',30),p=criar(),job=await p.iniciar(1,1,a.token,{});
  await p.executarUma();assert.equal((await p.obter(1,job.id)).processados,10);
  const novo=criar();assert.equal(await novo.executarUma(),false);
  agora+=120001;await novo.executarUma();assert.equal((await novo.obter(1,job.id)).processados,20);
  assert.equal(await p.executarUma(),false);
  const fim=await concluir(novo,job.id);assert.equal(fim.criados,30);assert.equal(await Cliente.count({where:{nome:{[require('sequelize').Op.like]:'Cliente RESTART %'}}}),30);
 });
 await t.test('rollback do lote não publica contadores; retomar não repete o lote já confirmado',async()=>{
  const a=await previa('ROLLBACK',25);let chamadas=0;
  const p=criar({antesCommit:async()=>{if(++chamadas===2)throw new Error('Queda simulada antes do COMMIT');}}),job=await p.iniciar(1,1,a.token,{});
  await p.executarUma();await p.executarUma();let s=await p.obter(1,job.id);assert.equal(s.estado,'interrompido');assert.equal(s.processados,10);assert.equal(s.criados,10);
  assert.equal(await Cliente.count({where:{nome:{[require('sequelize').Op.like]:'Cliente ROLLBACK %'}}}),10);
  const novo=criar();await novo.retomar(1,job.id);s=await concluir(novo,job.id);assert.equal(s.criados,25);assert.equal(s.rejeitados,0);
 });
 await t.test('IDs esparsos do banco são usados nos perfis, snapshots e comprovantes',async()=>{
  const a=await previa('IDS',10),p=criar(),job=await p.iniciar(1,1,a.token,{}),original=Cliente.bulkCreate.bind(Cliente);let id=100000;
  const mock=t.mock.method(Cliente,'bulkCreate',(rows,opts)=>original(rows.map(r=>({...r,id:id+=7})),opts));
  await concluir(p,job.id);mock.mock.restore();
  const cs=await Cliente.findAll({where:{nome:{[require('sequelize').Op.like]:'Cliente IDS %'}},order:[['id','ASC']]});
  assert.equal(cs.length,10);assert.equal(cs[1].id-cs[0].id,7);
  for(const c of cs){const d=await I.obter(db,1,c.id);assert.equal(d.perfil.codigo_legado,'IDS-'+c.nome.split(' ').at(-1));assert.equal(Number(d.historicos[0].vendas_desde_cadastro),100);}
 });
 await t.test('resposta perdida depois do COMMIT recupera o checkpoint real sem repetir inserções',async()=>{
  const a=await previa('COMMIT-INCERTO',20),p=criar(),job=await p.iniciar(1,1,a.token,{});
  const original=db.transaction;let perdeu=false;
  db.transaction=async(...args)=>{const valor=await original(...args);if(!perdeu&&valor?.cursor===10){perdeu=true;throw new Error('Resposta do COMMIT perdida');}return valor;};
  try{await p.executarUma();}finally{db.transaction=original;}
  const s=await p.obter(1,job.id);assert.equal(s.estado,'interrompido');assert.equal(s.processados,10);assert.equal(s.criados,10);
  await p.retomar(1,job.id);assert.equal((await concluir(p,job.id)).criados,20);
  assert.equal(await Cliente.count({where:{nome:{[require('sequelize').Op.like]:'Cliente COMMIT-INCERTO %'}}}),20);
 });
 await t.test('bulk update preserva opcionais, saldos, bloqueios, telefones e corte histórico',async()=>{
  const c=await Cliente.create({nome:'Antes',empresa_id:1,email:'manter@teste.local',saldo_haver:55,telefone:'31999990000',telefones_adicionais:['31999990001']});
  await I.salvar(db,1,c.id,{codigo_legado:'ATUALIZAR',instagram:'@manter',bloquear_whatsapp:true,bloquear_sms:false,vendas_desde_cadastro:'2000',ticket_medio_desde_cadastro:'250',quantidade_vendas_historicas:8,data_referencia_historico:'2026-11-01',modo_conciliacao:'somar_posteriores'});
  const antes=(await I.obter(db,1,c.id)).historicos[0];
  const a=await S.analisar('clientes',{linhas:[['ATUALIZAR','Depois','','Sim',2100,'2026-11-01']]},['codigo_legado','nome','email','bloquear_sms','vendas_desde_cadastro','data_referencia_historico'],1,'',1,{conciliacao:'somar_posteriores'});
  const p=criar(),job=await p.iniciar(1,1,a.token,{'2':'atualizar'});const fim=await concluir(p,job.id);assert.equal(fim.atualizados,1);assert.equal(fim.rejeitados,0);
  await c.reload();assert.equal(c.nome,'Depois');assert.equal(c.email,'manter@teste.local');assert.equal(Number(c.saldo_haver),55);assert.deepEqual(c.telefones_adicionais,['31999990001']);
  const d=await I.obter(db,1,c.id);assert.ok(d.perfil.bloquear_whatsapp);assert.ok(d.perfil.bloquear_sms);assert.equal(d.perfil.instagram,'@manter');assert.equal(Number(d.historicos[0].ticket_medio_desde_cadastro),250);assert.equal(+new Date(d.historicos[0].corte_em),+new Date(antes.corte_em));
 });
 await t.test('empresa distinta avança; reimportação usa comprovantes sem duplicar clientes',async()=>{
  const a=await previa('EMPRESA2',10,2),p=criar(),job=await p.iniciar(2,1,a.token,{});await concluir(p,job.id,2);
  await assert.rejects(p.relatorioFinal(1,job.id),{status:404});
  const b=await previa('EMPRESA2',10,2),job2=await p.iniciar(2,1,b.token,{}),fim=await concluir(p,job2.id,2);assert.equal(fim.criados,0);assert.equal(fim.ignorados,10);
 });
 await t.test('API 202, status/relatório autenticados e retorno após reabrir a tela',async()=>{
  const a=await previa('API',10),path='/api/clientes/importacao/operacoes';
  const r=await api(path,{body:{token:a.token,escolhas:{}}});assert.equal(r.status,202,JSON.stringify(r.data));assert.equal(r.data.operacao.processados,0);
  const id=r.data.operacao.id;assert.equal((await api(path+'/'+id,{token:false})).status,401);assert.equal((await api(path+'/'+id,{empresa:2})).status,404);
  assert.equal((await api(path+'/atual')).data.operacao.id,id);assert.equal((await api(path+'/'+id+'/relatorio')).status,409);
  const p=O.instancia();for(let i=0;i<5;i++)await p.executarUma();
  assert.equal((await api(path+'/'+id)).data.operacao.estado,'concluido');assert.equal((await api(path+'/'+id+'/relatorio')).data.relatorio.length,10);
  const repetida=await api(path,{body:{token:a.token,escolhas:{}}});assert.equal(repetida.data.operacao.id,id);
 });
 await t.test('ETA usa ritmo confirmado e deixa de estimar quando o checkpoint envelhece',async()=>{
  const p=criar();const base={id:'fixture',estado:'processando',fase:'Lote',total:100,cursor:40,criados:40,atualizados:0,ignorados:0,rejeitados:0,iniciadoEm:new Date(agora-20000),progressoEm:new Date(agora),ms_por_registro:500};
  const d=p.dto(base);assert.equal(d.percentual,40);assert.equal(d.restanteSegundos,30);
  agora+=31000;const velho=p.dto(base);assert.equal(velho.restanteSegundos,null);assert.equal(velho.lento,true);
  const encerrado=p.dto({...base,estado:'concluido',cursor:100,concluidoEm:new Date(+base.iniciadoEm+25000)});assert.equal(encerrado.decorridoSegundos,25);
 });
});
