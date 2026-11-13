// Sem TiDB real, aparelho, rede WhatsApp ou leitura do .env.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const crypto = require('node:crypto');
const { Sequelize } = require('sequelize');
const { criarRepositorio } = require('../backend/services/whatsappAuthStore');
const { criarServico } = require('../backend/services/whatsappService');
const tick = () => new Promise(resolve => setImmediate(resolve));
async function ate(verificar) {
  for (let i=0;i<300;i++) { if (await verificar()) return; await tick(); }
  assert.fail('Estado esperado não foi alcançado.');
}
async function ambiente(t) {
  const db = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false,
    dialectModule: require('./helpers/whatsappSqlite') });
  // SQLite tem uma conexão. Serializar transações neste laboratório; no TiDB
  // a exclusão entre processos é feita pelo SELECT FOR UPDATE do repositório.
  const transaction = db.transaction.bind(db);
  let transacoes = Promise.resolve();
  db.transaction = (...args) => {
    const p = transacoes.then(() => transaction(...args));
    transacoes = p.catch(() => {});
    return p;
  };
  let hora = 1000000;
  const key = crypto.randomBytes(32);
  const repo = criarRepositorio(db, key, { agora: () => hora });
  const real = await import('@whiskeysockets/baileys');
  const instancias = [];
  function instancia(opcoes = {}) {
    const sockets = [], timers = [];
    const lib = { ...real, default(config) {
      opcoes.aoCriar?.(config);
      const socket = { config, ev: new EventEmitter(), ws: {isClosed:false},
        user: {id:'5531999990000:2@s.whatsapp.net'}, enviados: [],
        end() { this.encerrado = true; }, async logout() { this.logoutChamado = true; },
        async onWhatsApp(...jids) { return [{exists:true,jid:jids[0]}]; },
        async sendMessage(jid, content) { this.enviados.push(content); return {key:{id:'ack'}}; },
      };
      sockets.push(socket); return socket;
    }};
    const service = criarServico({ carregar: async () => lib, repositorio: () => repo,
      agora: () => hora, pausaEnvio: async () => {},
      agendar(fn, ms) { const timer = {fn, ms}; timers.push(timer); return timer; },
      cancelar(timer) { if(timer) timer.cancelado=true; }, ...opcoes });
    const out = {service,sockets,timers}; instancias.push(out); return out;
  }
  t.after(async () => {
    for (const {service} of instancias) await service.suspender();
    await db.close();
  });
  return {db,repo,key,real,instancia,avancar:ms=>hora+=ms};
}
const update = (s,data) => s.ev.emit('connection.update',data);
const close = (s,code) => update(s,{connection:'close',lastDisconnect:{error:{output:{statusCode:code}}}});
function autenticar(socket) {
  socket.ev.emit('creds.update',{registered:true,me:{id:'5531999990000@s.whatsapp.net'}});
  update(socket,{isNewLogin:true});
}

test('persistência cifrada: uma leitura, 515, open, reinício da API e novo envio sem QR', async t => {
  const {db,instancia} = await ambiente(t);
  const a = instancia();
  await a.service.inicializarCliente(1);
  update(a.sockets[0],{qr:'fixture-nao-registrar'});
  await ate(()=>a.service.obterStatus(1).qrBase64);
  const auth = a.sockets[0].config.auth;
  await auth.keys.set({session:{contato:Buffer.from('chave-signal-teste')}});
  autenticar(a.sockets[0]);
  assert.equal(a.service.obterStatus(1).qrBase64,null);
  close(a.sockets[0],515);
  assert.equal(a.timers[0].ms,0);
  await a.timers[0].fn();
  assert.equal(a.sockets[1].config.auth,auth);
  update(a.sockets[1],{connection:'open'});
  await ate(()=>a.service.isConectado(1));
  close(a.sockets[0],401); update(a.sockets[0],{qr:'obsoleto'});
  assert.equal(a.service.isConectado(1),true);
  assert.equal((await a.service.enviarMensagem(1,'31999990000','primeira')).sucesso,true);
  await a.service.suspender();
  assert.equal(a.sockets[1].logoutChamado,undefined);
  const row = await db.models.PetHubWaAuth.findByPk('1');
  assert.equal(row.restaurar,true);
  assert.equal(row.dono,null);
  assert.equal(Buffer.from(row.creds).includes(Buffer.from('5531999990000')),false);
  const signal = await db.models.PetHubWaSignal.findOne();
  assert.equal(Buffer.from(signal.valor).includes(Buffer.from('chave-signal-teste')),false);
  const b = instancia();
  await b.service.restaurar();
  assert.equal(b.sockets.length,1);
  assert.equal(b.sockets[0].config.auth.creds.registered,true);
  assert.deepEqual((await b.sockets[0].config.auth.keys.get('session',['contato'])).contato,Buffer.from('chave-signal-teste'));
  assert.equal(b.service.obterStatus(1).qrBase64,null);
  update(b.sockets[0],{connection:'open'});
  assert.equal((await b.service.enviarMensagem(1,'31999990000','segunda')).sucesso,true);
});

test('lease: outra API não duplica socket; recuperação após queda abrupta preserva chaves', async t => {
  const {instancia,avancar} = await ambiente(t);
  const a = instancia(), b = instancia();
  await a.service.inicializarCliente(1);
  autenticar(a.sockets[0]); update(a.sockets[0],{connection:'open'});
  await a.service.restaurar();
  await b.service.restaurar();
  assert.equal(b.sockets.length,0);
  avancar(91000); // Simula processo morto sem executar suspender().
  await b.service.restaurar();
  assert.equal(b.sockets.length,1);
  assert.equal(b.sockets[0].config.auth.creds.registered,true);
  await a.service.restaurar();
  assert.equal(a.service.isConectado(1),false);
  assert.equal(a.sockets[0].encerrado,true);
});

test('empresas isoladas, atualização/exclusão de chaves e logout manual não restaura vínculo', async t => {
  const {instancia,db,repo,real} = await ambiente(t);
  const a=instancia();
  await Promise.all([a.service.inicializarCliente(1),a.service.inicializarCliente('1')]);
  assert.equal(a.sockets.length,1);
  autenticar(a.sockets[0]); update(a.sockets[0],{connection:'open'});
  await a.service.restaurar();
  await a.service.inicializarCliente(2);
  const um=a.sockets[0].config.auth, dois=a.sockets[1].config.auth;
  await um.keys.set({session:{mesmo:Buffer.from('A')}});
  await dois.keys.set({session:{mesmo:Buffer.from('B')}});
  assert.equal((await um.keys.get('session',['mesmo'])).mesmo.toString(),'A');
  assert.equal((await dois.keys.get('session',['mesmo'])).mesmo.toString(),'B');
  await dois.keys.set({session:{mesmo:null}});
  assert.deepEqual(await dois.keys.get('session',['mesmo']),{});
  await a.service.desconectar(1);
  assert.equal(a.sockets[0].logoutChamado,true);
  assert.equal(await db.models.PetHubWaAuth.findByPk('1'),null);
  assert.equal(await db.models.PetHubWaSignal.count({where:{empresa:'1'}}),0);
  assert.deepEqual(await repo.candidatas(),[]);
  await a.service.restaurar();
  assert.equal(a.sockets.length,2);
  await a.service.inicializarCliente(1);
  assert.equal(a.sockets[2].config.auth.creds.registered,false);
  const handle=await repo.adquirir('3',real,true);
  handle.auth.creds.registered=true; await handle.salvar(); await handle.liberar();
  const b=instancia(); await b.service.desconectar(3);
  assert.equal(await db.models.PetHubWaAuth.findByPk('3'),null);
});

test('chave de servidor incorreta falha sem apagar credenciais nem gerar QR', async t => {
  const {instancia,db,real} = await ambiente(t);
  const a=instancia(); await a.service.inicializarCliente(1);
  autenticar(a.sockets[0]); update(a.sockets[0],{connection:'open'});
  await a.service.suspender();
  const antes=Buffer.from((await db.models.PetHubWaAuth.findByPk('1')).creds);
  const errado=criarRepositorio(db,crypto.randomBytes(32));
  await assert.rejects(errado.adquirir('1',real,true),{code:'WA_AUTH_UNREADABLE'});
  assert.deepEqual(Buffer.from((await db.models.PetHubWaAuth.findByPk('1')).creds),antes);
});

test('monitor recupera socket fechado e abertura travada sem perder vínculo', async t => {
  const {instancia,avancar} = await ambiente(t);
  const a=instancia(); await a.service.inicializarCliente(1);
  autenticar(a.sockets[0]); update(a.sockets[0],{connection:'open'});
  await a.service.restaurar();
  update(a.sockets[0],{qr:'atrasado'});
  assert.equal(a.service.isConectado(1),true);
  a.sockets[0].ws.isClosed=true;
  await a.service.restaurar();
  assert.equal(a.service.obterStatus(1).reconectando,true);
  await a.timers[0].fn();
  // A API continua viva e renova o lease, mas o socket não chega ao open.
  for (let i=0;i<5;i++) { avancar(20000); await a.service.restaurar(); }
  assert.equal(a.sockets[1].encerrado,true);
  assert.equal(a.service.obterStatus(1).qrBase64,null);
  await a.timers.at(-1).fn();
  assert.equal(a.sockets.length,3);
  assert.equal(a.sockets[2].config.auth.creds.registered,true);
  update(a.sockets[2],{connection:'open'});
  assert.equal((await a.service.enviarMensagem(1,'31999990000','recuperou')).sucesso,true);
});

test('desconectar durante aquisição aguarda o banco e não cria socket tardio', async t => {
  const {instancia,repo} = await ambiente(t);
  let liberar;
  const gate = new Promise(resolve=>liberar=resolve);
  const a=instancia({repositorio:()=>({...repo,async adquirir(...args){await gate;return repo.adquirir(...args);}})});
  const conectar=a.service.inicializarCliente(1);
  await tick();
  const desconectar=a.service.desconectar(1);
  liberar();
  await assert.rejects(conectar);
  await desconectar;
  assert.equal(a.sockets.length,0);
  assert.equal(a.service.obterStatus(1).status,'desconectado');
  assert.deepEqual(await repo.candidatas(),[]);
});


test('falha ao recriar socket não apaga autenticação e continua tentando', async t => {
  const {instancia} = await ambiente(t);
  let falhar=false;
  const a=instancia({aoCriar:()=>{if(falhar)throw new Error('Indisponibilidade simulada');}});
  await a.service.inicializarCliente(1);
  const auth=a.sockets[0].config.auth;
  autenticar(a.sockets[0]); update(a.sockets[0],{connection:'open'});
  await a.service.restaurar();
  close(a.sockets[0],408);
  falhar=true; await a.timers[0].fn();
  assert.equal(a.sockets.length,1);
  assert.equal(a.service.obterStatus(1).reconectando,true);
  falhar=false; await a.timers[1].fn();
  assert.equal(a.sockets[1].config.auth,auth);
  update(a.sockets[1],{connection:'open'});
  assert.equal((await a.service.enviarMensagem(1,'31999990000','voltou')).sucesso,true);
});

test('logout real encerra tentativas e remove persistência somente da empresa afetada', async t => {
  const {instancia,db} = await ambiente(t);
  const a=instancia();
  await a.service.inicializarCliente(1); autenticar(a.sockets[0]);
  update(a.sockets[0],{connection:'open'});
  await a.service.restaurar();
  await a.service.inicializarCliente(2); autenticar(a.sockets[1]);
  update(a.sockets[1],{connection:'open'});
  await a.service.restaurar();
  close(a.sockets[0],401);
  await ate(async()=>!(await db.models.PetHubWaAuth.findByPk('1')));
  assert.equal(a.service.isConectado(1),false);
  assert.equal(a.service.isConectado(2),true);
  await a.service.restaurar();
  assert.equal(a.sockets.length,2);
});

test('Marketing diferencia QR, reconectando e conectado sem exibir QR antigo', () => {
  const fs=require('node:fs'), vm=require('node:vm'), path=require('node:path');
  const fonte=fs.readFileSync(path.join(__dirname,'../frontend/marketing.js'),'utf8');
  const trecho=fonte.slice(fonte.indexOf('let revisaoWhatsapp ='),fonte.indexOf('async function carregarStatusWhatsapp'));
  const elementos=new Map();
  const elemento=id=>{
    if(!elementos.has(id)) elementos.set(id,{style:{},textContent:'',classList:{toggle(){}},removeAttribute(nome){delete this[nome];}});
    return elementos.get(id);
  };
  const ctx=vm.createContext({document:{getElementById:elemento,querySelector:()=>elemento('textoConexao')}});
  vm.runInContext(trecho,ctx);
  ctx.exibirWhatsapp({status:'aguardando_qr',qrBase64:'fixture'});
  assert.equal(elemento('qrImageContainer').style.display,'block');
  ctx.exibirWhatsapp({status:'inicializando',reconectando:true,numero:'5531999990000'});
  assert.equal(elemento('qrImageContainer').style.display,'none');
  assert.equal(elemento('qrCodeImg').src,undefined);
  assert.equal(elemento('wppStatusLabel').textContent,'Reconectando…');
  assert.match(elemento('textoConexao').textContent,/automaticamente/);
  ctx.exibirWhatsapp({status:'conectado',numero:'5531999990000'});
  assert.equal(elemento('qrStatusConectado').style.display,'block');
  assert.equal(elemento('qrImageContainer').style.display,'none');
  assert.equal(elemento('qrNumeroConectado').textContent,'+5531999990000');
  ctx.exibirWhatsapp({status:'desconectado',requerAcao:true,mensagem:'Vínculo preservado. Verifique a sessão.'});
  assert.equal(elemento('qrBtnDesconectar').style.display,'block');
  assert.equal(elemento('wppErroConexao').textContent,'Vínculo preservado. Verifique a sessão.');
});

test('24 horas simuladas de monitor mantêm o mesmo socket e permitem envio no fim', async t => {
  const {instancia,avancar} = await ambiente(t);
  const a=instancia(); await a.service.inicializarCliente(1);
  autenticar(a.sockets[0]); update(a.sockets[0],{connection:'open'});
  await a.service.restaurar();
  for(let minuto=0;minuto<1440;minuto++) {
    avancar(60000);
    await a.service.restaurar();
    assert.equal(a.service.isConectado(1),true);
  }
  assert.equal(a.sockets.length,1);
  assert.equal(a.service.obterStatus(1).qrBase64,null);
  assert.equal((await a.service.enviarMensagem(1,'31999990000','após 24h simuladas')).sucesso,true);
});


test('428/500 temporários preservam credenciais, recuperam sem QR e enviam de novo', async t => {
  const {instancia,db}=await ambiente(t);
  const eventos=[];
  const a=instancia({registrar:(id,evento,dados)=>eventos.push({id,evento,...dados})});
  await a.service.inicializarCliente(1);autenticar(a.sockets[0]);
  update(a.sockets[0],{connection:'open'});await a.service.restaurar();
  const auth=a.sockets[0].config.auth;
  for(const codigo of [428,500,408,503]){
    close(a.sockets.at(-1),codigo);
    assert.equal(a.service.obterStatus(1).reconectando,true);
    assert.equal(a.service.obterStatus(1).qrBase64,null);
    await a.timers.at(-1).fn();
    assert.equal(a.sockets.at(-1).config.auth,auth);
    update(a.sockets.at(-1),{connection:'open'});
    assert.equal((await a.service.enviarMensagem(1,'31999990000','depois da queda')).sucesso,true);
    assert.ok((await db.models.PetHubWaAuth.findByPk('1')).creds);
  }
  assert.equal(eventos.filter(e=>e.evento==='socket_fechado').length,4);
});

test('QR inesperado em vínculo pareado nunca apaga credenciais e exige ação explícita', async t => {
  const {instancia,db}=await ambiente(t),a=instancia();
  await a.service.inicializarCliente(1);autenticar(a.sockets[0]);
  update(a.sockets[0],{connection:'open'});await a.service.restaurar();
  close(a.sockets[0],428);
  for(let i=0;i<3;i++){
    await a.timers.at(-1).fn();
    update(a.sockets.at(-1),{qr:'nao-exibir-token-do-qr'});
    await tick();
    assert.equal(a.service.obterStatus(1).qrBase64,null);
  }
  await ate(()=>a.service.obterStatus(1).requerAcao);
  const row=await db.models.PetHubWaAuth.findByPk('1');
  assert.ok(row.creds);assert.equal(row.restaurar,false);
  assert.equal(a.sockets.at(-1).logoutChamado,undefined);
  await a.service.desconectar(1);
  assert.equal(await db.models.PetHubWaAuth.findByPk('1'),null);
  await a.service.inicializarCliente(1);
  assert.equal(a.sockets.at(-1).config.auth.creds.registered,false);
});

test('403 preserva vínculo em vez de apagá-lo; empresa pode tentar conectar de novo', async t=>{
  const {instancia,db}=await ambiente(t),a=instancia();
  await a.service.inicializarCliente(1);autenticar(a.sockets[0]);
  update(a.sockets[0],{connection:'open'});await a.service.restaurar();
  close(a.sockets[0],403);
  await ate(()=>a.service.obterStatus(1).requerAcao);
  assert.ok((await db.models.PetHubWaAuth.findByPk('1')).creds);
  await a.service.inicializarCliente(1);
  assert.equal(a.sockets.at(-1).config.auth.creds.registered,true);
});

test('posse expirada ainda nossa é renovada sem descartar socket nem credenciais',async t=>{
  const {instancia,avancar}=await ambiente(t),a=instancia();
  await a.service.inicializarCliente(1);autenticar(a.sockets[0]);
  update(a.sockets[0],{connection:'open'});await a.service.restaurar();
  avancar(91000);await a.service.restaurar();
  assert.equal(a.service.isConectado(1),true);assert.equal(a.sockets.length,1);
  await a.sockets[0].config.auth.keys.set({session:{contato:Buffer.from('depois')}});
  assert.equal((await a.service.enviarMensagem(1,'31999990000','após pausa do banco')).sucesso,true);
});

test('cache reduz leituras de chaves; falha de COMMIT não confirma set e journal recupera atualização/exclusão',async t=>{
  const {db,repo,real}=await ambiente(t);
  const h=await repo.adquirir('9',real,true);
  await h.auth.keys.set({session:{a:Buffer.from('antiga'),b:Buffer.from('excluir')}});
  const M=db.models.PetHubWaSignal;
  let leituras=0;const find=M.findAll.bind(M);
  t.mock.method(M,'findAll',(...args)=>{leituras++;return find(...args);});
  for(let i=0;i<30;i++)assert.equal((await h.auth.keys.get('session',['a'])).a.toString(),'antiga');
  assert.equal(leituras,0);
  const bulk=M.bulkCreate.bind(M);let falhar=true,notificacoes=0;
  h.onFailure(()=>notificacoes++);
  t.mock.method(M,'bulkCreate',(...args)=>{if(falhar)throw new Error('DB indisponível');return bulk(...args);});
  await assert.rejects(h.auth.keys.set({session:{a:Buffer.from('nova'),b:null}}));
  assert.equal(notificacoes,1);assert.equal(h.temPendencias(),true);
  falhar=false;await h.flush();assert.equal(h.temPendencias(),false);
  assert.equal((await h.auth.keys.get('session',['a'])).a.toString(),'nova');
  assert.deepEqual(await h.auth.keys.get('session',['b']),{});
  h.auth.creds.registered=true;await h.salvar();await h.liberar();
  const outro=await repo.adquirir('9',real,false);
  assert.equal((await outro.auth.keys.get('session',['a'])).a.toString(),'nova');
  assert.deepEqual(await outro.auth.keys.get('session',['b']),{});
  await outro.liberar();
});

test('heartbeat não espera a fila de chaves e rajada de creds.update grava o último estado',async t=>{
  const {db,repo,real,instancia}=await ambiente(t);
  const h=await repo.adquirir('9',real,true);
  const M=db.models.PetHubWaSignal,bulk=M.bulkCreate.bind(M);
  let liberar,iniciou=false;
  const gate=new Promise(r=>liberar=r);
  t.mock.method(M,'bulkCreate',async(...args)=>{iniciou=true;await gate;return bulk(...args);});
  const gravando=h.auth.keys.set({session:{a:Buffer.from('pendente')}});
  await ate(()=>iniciou);
  // SQLite não simula concorrência real entre conexões, mas verifica que a
  // renovação é despachada antes do COMMIT pendente, fora da fila serial.
  const Sessao=db.models.PetHubWaAuth,renew=Sessao.update.bind(Sessao);let despachou=false;
  t.mock.method(Sessao,'update',(...args)=>{despachou=true;return renew(...args);});
  const renovando=h.renovar();await tick();assert.equal(despachou,true);
  liberar();await gravando;await renovando;
  const a=instancia();await a.service.inicializarCliente(1);
  const save=await repo.adquirir('99',real,true);await save.remover();
  const rowUpdate=Sessao.prototype.update;
  let escritos=0,soltar;
  const espera=new Promise(r=>soltar=r);
  t.mock.method(Sessao.prototype,'update',async function(values,...args){
    if(this.empresa==='1'&&values.creds){escritos++;if(escritos===1)await espera;}
    return rowUpdate.call(this,values,...args);
  });
  for(let i=0;i<100;i++)a.sockets[0].ev.emit('creds.update',{registered:true,contadorTeste:i});
  soltar();await a.service.restaurar();
  assert.ok(escritos<=2,`Esperadas no máximo 2 escritas; ocorreram ${escritos}`);
  await a.service.suspender();
  const restaurada=await repo.adquirir('1',real,false);
  assert.equal(restaurada.auth.creds.contadorTeste,99);await restaurada.liberar();await h.liberar();
});

test('um monitor por processo; banco lento de uma empresa não bloqueia heartbeat de outra',async t=>{
  const {instancia,repo}=await ambiente(t);
  let liberar,travada=false,renovouOutra=0;
  const gate=new Promise(r=>liberar=r);
  const handles=new Map();
  const a=instancia({repositorio:()=>({...repo,async adquirir(id,...args){
    const h=await repo.adquirir(id,...args),renew=h.renovar.bind(h);
    h.renovar=async()=>{if(id==='1'&&travada)await gate;if(id==='2')renovouOutra++;return renew();};
    handles.set(id,h);return h;
  }})});
  await a.service.inicializarCliente(1);await a.service.inicializarCliente(2);
  a.service.iniciarMonitor();a.service.iniciarMonitor();assert.equal(a.timers.length,1);
  travada=true;await a.timers[0].fn();await tick();
  a.service.iniciarMonitor();assert.equal(a.timers.length,2);
  await ate(()=>renovouOutra===1);
  await a.timers[1].fn();await ate(()=>renovouOutra===2);
  assert.equal(a.timers.length,3);
  liberar();await a.service.restaurar();
});

test('histórico persistente separa empresas, limita retenção e não grava QR/chaves/número',async t=>{
  const {db}=await ambiente(t);
  const {criarDiagnostico}=require('../backend/services/whatsappDiagnostico');
  const diag=criarDiagnostico({obterBanco:()=>db});
  diag.registrar('1','socket_fechado',{codigo:428,pareada:true,qr:'SEGREDO_QR',telefone:'5531999990000',token:'SEGREDO_TOKEN',keys:'SEGREDO_SIGNAL'});
  diag.registrar('2','conectado',{codigo:'OPEN',pareada:true});
  await diag.flush();
  const um=await diag.historico(1),dois=await diag.historico(2);
  assert.equal(um.length,1);assert.equal(dois.length,1);
  assert.equal(um[0].codigo,'428');assert.equal(um[0].empresaId,'1');
  const json=JSON.stringify(um);
  for(const segredo of ['SEGREDO_QR','SEGREDO_TOKEN','SEGREDO_SIGNAL','5531999990000'])assert.equal(json.includes(segredo),false);
  // Recuperar histórico por um leitor novo, equivalente a reiniciar o processo.
  const novo=criarDiagnostico({obterBanco:()=>db});assert.equal((await novo.historico(1)).length,1);
  for(let i=0;i<205;i++){novo.registrar(1,'reconexao_agendada',{tentativa:i});await novo.flush();}
  assert.equal(await db.models.WhatsappDiagnostico.count({where:{empresaId:'1'}}),200);
  assert.equal((await novo.historico(1)).length,100);
  assert.equal((await novo.historico(2)).length,1);
});


test('sessão inválida repetida interrompe retentativas sem apagar autenticação silenciosamente',async t=>{
  const {instancia,db}=await ambiente(t),a=instancia();
  await a.service.inicializarCliente(1);autenticar(a.sockets[0]);
  update(a.sockets[0],{connection:'open'});await a.service.restaurar();
  for(let i=0;i<3;i++){
    close(a.sockets.at(-1),500);
    if(i<2)await a.timers.at(-1).fn();
  }
  await ate(()=>a.service.obterStatus(1).requerAcao);
  assert.ok((await db.models.PetHubWaAuth.findByPk('1')).creds);
  const agendados=a.timers.length;
  await a.service.restaurar();assert.equal(a.sockets.length,3);assert.equal(a.timers.length,agendados);
});

test('renovação sem alteração de timestamp não perde posse; outra dona continua bloqueada',async t=>{
  const {repo,real,db}=await ambiente(t),h=await repo.adquirir('8',real,true);
  const M=db.models.PetHubWaAuth;
  t.mock.method(M,'update',async()=>[0]);
  await h.renovar(); // mesmo instante do acquire: deadline não mudou
  await M.findByPk('8').then(row=>row.update({dono:'OUTRO-PROCESSO'}));
  await assert.rejects(h.renovar(),{code:'WA_LEASE_LOST'});
});
