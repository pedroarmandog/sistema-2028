process.env.NODE_ENV = "production"; // Exercitar os modelos sem o monitor de desenvolvimento.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { mkdtemp, writeFile, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { criarServico } = require('../backend/services/whatsappService');

const tick = () => new Promise(resolve => setImmediate(resolve));
async function ambiente(opcoes = {}) {
  const real = await import('@whiskeysockets/baileys');
  const sockets = [], timers = [];
  const lib = { ...real, default(config) {
    const socket = { config, ev: new EventEmitter(), user: { id: '5531999000000:2@s.whatsapp.net' },
      enviados: [], end() {}, async logout() { this.logouts = (this.logouts || 0) + 1; },
      async onWhatsApp(...jids) { this.consulta = jids; return [{ exists: true, jid: jids.at(-1) }]; },
      async sendMessage(jid, msg) { this.enviados.push({ jid, msg }); return { key: { id: 'ack' } }; }
    };
    sockets.push(socket);
    return socket;
  } };
  const service = criarServico({ carregar: async () => lib,
    pausaEnvio: async () => {},
    agendar(fn, ms) { const timer = { fn, ms }; timers.push(timer); return timer; },
    cancelar(timer) { if (timer) timer.cancelado = true; }, ...opcoes });
  return { service, sockets, timers };
}
const atualizar = (socket, dados) => socket.ev.emit('connection.update', dados);
const fechar = (socket, codigo) => atualizar(socket, { connection: 'close', lastDisconnect: { error: { output: { statusCode: codigo } } } });

test('QR → leitura → restartRequired → open mantém credenciais e chaves, ignora eventos antigos', async () => {
  const { service, sockets, timers } = await ambiente();
  await service.inicializarCliente(1);
  const a = sockets[0];
  atualizar(a, { qr: 'fixture' });
  await new Promise(resolve => {
    if (service.obterStatus(1).qrBase64) return resolve();
    const listener = new EventEmitter();
    listener.write = () => { listener.emit('close'); resolve(); };
    service.adicionarListenerSSE(1, listener);
  });
  assert.match(service.obterStatus(1).qrBase64, /^data:image\/png;base64,/);
  const auth = a.config.auth;
  await auth.keys.set({ session: { contact: Buffer.from('key') } });
  a.ev.emit('creds.update', { registered: true, me: { id: '123@s.whatsapp.net' } });
  atualizar(a, { isNewLogin: true });
  assert.equal(service.obterStatus(1).qrBase64, null);
  assert.equal((await service.enviarMensagem(1,'31999999999','x')).sucesso, false);
  fechar(a, 515);
  await timers[0].fn();
  const b = sockets[1];
  assert.equal(b.config.auth, auth);
  assert.equal(b.config.auth.creds.registered, true);
  assert.deepEqual((await b.config.auth.keys.get('session',['contact'])).contact, Buffer.from('key'));
  await b.config.auth.keys.set({session:{ contact:null }});
  assert.deepEqual(await b.config.auth.keys.get('session',['contact']), {});
  atualizar(b, {connection:'open'});
  fechar(a, 401);
  a.ev.emit('creds.update', {registered:false});
  atualizar(a, {qr:'stale'});
  assert.equal(service.isConectado(1), true);
  assert.equal(b.config.auth.creds.registered, true);
  assert.equal((await service.enviarMensagem(1,'(31) 99999-0000','primeira')).sucesso,true);
  assert.equal(b.enviados.length,1);
  assert.deepEqual(b.consulta, ['5531999990000@s.whatsapp.net','553199990000@s.whatsapp.net']);
});

test('duas abas, polling e recarga não criam novo socket; empresas isoladas; desconexão manual', async () => {
  const {service,sockets,timers} = await ambiente();
  await Promise.all([service.inicializarCliente('1'),service.inicializarCliente(1),service.inicializarCliente(2)]);
  assert.equal(sockets.length,2);
  assert.notEqual(sockets[0].config.auth,sockets[1].config.auth);
  const aba = new EventEmitter(), outra = new EventEmitter();
  const eventos = [], daOutra = [];
  aba.write = s => eventos.push(s); outra.write = s => daOutra.push(s);
  service.adicionarListenerSSE(1,aba); service.adicionarListenerSSE(2,outra);
  atualizar(sockets[0],{connection:'open'});
  aba.emit('close');
  for (let i=0;i<20;i++) assert.equal(service.obterStatus(1).status,'conectado');
  assert.equal(sockets.length,2); assert.equal(eventos.length,1); assert.equal(daOutra.length,0);
  assert.equal(service.isConectado(2),false);
  assert.equal((await service.enviarMensagem(1,'31999990000','segunda')).sucesso,true);
  assert.equal((await service.enviarMensagem(2,'31999990000','x')).sucesso,false);
  await service.desconectar(1);
  fechar(sockets[0],515);
  assert.equal(sockets[0].logouts,1); assert.equal(timers.length,0);
  await service.inicializarCliente(1);
  assert.notEqual(sockets[2].config.auth,sockets[0].config.auth);
  assert.equal((await ambiente()).service.obterStatus(1).status,'desconectado');
});

test('rotação e conversão assíncrona do QR não substituem QR novo nem estado open', async () => {
  const encodes = new Map();
  const {service,sockets} = await ambiente({gerarQR: qr => new Promise(resolve=>encodes.set(qr,resolve))});
  await service.inicializarCliente(1);
  atualizar(sockets[0],{qr:'primeiro'}); atualizar(sockets[0],{qr:'segundo'});
  encodes.get('segundo')('imagem2'); await tick();
  encodes.get('primeiro')('imagem1'); await tick();
  assert.equal(service.obterStatus(1).qrBase64,'imagem2');
  atualizar(sockets[0],{qr:'terceiro'}); atualizar(sockets[0],{connection:'open'});
  encodes.get('terceiro')('imagem3'); await tick();
  assert.equal(service.obterStatus(1).qrBase64,null);
});

test('queda temporária, backoff limitado, logout e cancelamento durante espera', async () => {
  const {service,sockets,timers} = await ambiente();
  await service.inicializarCliente(1);
  for(let i=0;i<5;i++) {
    fechar(sockets[i],408); assert.equal(timers[i].ms,1000 * 2 ** i); await timers[i].fn();
  }
  fechar(sockets[5],408);
  assert.equal(service.obterStatus(1).status,'desconectado'); assert.equal(timers.length,5);
  await service.inicializarCliente(1); fechar(sockets[6],401);
  assert.equal(service.obterStatus(1).status,'desconectado');
  await service.inicializarCliente(1); fechar(sockets[7],503);
  await service.desconectar(1); assert.equal(timers[5].cancelado,true);
  await timers[5].fn(); assert.equal(sockets.length,8);
});

test('imagens, documentos e confirmação de envio', async () => {
  const {service,sockets} = await ambiente();
  await service.inicializarCliente(1); atualizar(sockets[0],{connection:'open'});
  const dir = await mkdtemp(path.join(os.tmpdir(),'pet-media-'));
  try {
    for(const [nome,tipo] of [['imagem.png','image'],['arquivo.pdf','document']]) {
      const file = path.join(dir,nome); await writeFile(file,'fixture');
      assert.equal((await service.enviarMensagem(1,'31999990000','legenda',file)).sucesso,true);
      assert.equal(sockets[0].enviados.at(-1).msg[tipo].toString(),'fixture');
    }
    sockets[0].sendMessage = async () => undefined;
    assert.equal((await service.enviarMensagem(1,'31999990000','x')).sucesso,false);
    assert.equal((await service.enviarMensagem(1,'31999990000','x',path.join(dir,'ausente'))).sucesso,false);
  } finally {await rm(dir,{recursive:true});}
});

test('fila preserva pendente offline e só marca enviado após confirmação', async t => {
  const wpp = require('../backend/services/whatsappService');
  const { processarEnvio } = require('../backend/services/whatsappQueue');
  const online = t.mock.method(wpp,'isConectado',()=>false);
  const log = {create: async()=>{}};
  const envio = {id: 1,empresaId: 2,tentativas:0,status:'pendente',
    constructor: {update:async()=>[1]}, async update(dados){Object.assign(this,dados);} };
  assert.equal((await processarEnvio(envio,log)).sucesso,false);
  assert.equal(envio.status,'pendente'); assert.equal(envio.tentativas,0);
  online.mock.mockImplementation(()=>true);
  const send = t.mock.method(wpp,'enviarMensagem',async()=>({sucesso:false, temporario:true,erro:'Conexão interrompida'}));
  await processarEnvio(envio,log);
  assert.equal(envio.tentativas,0); assert.equal(envio.status,'pendente');
  send.mock.mockImplementation(async(id)=>{assert.equal(id,2); return {sucesso:true};});
  await processarEnvio(envio,log); assert.equal(envio.status,'enviado'); assert.ok(envio.dataEnvio);
  envio.constructor.update = async()=>[0];
  assert.equal((await processarEnvio(envio,log)).sucesso,false); assert.equal(send.mock.callCount(),2);
});

test('SSE rejeita seleção de outra empresa pelo parâmetro do disparador', async t => {
  const { WhatsappSession } = require('../backend/models');
  const {eventoSSE} = require('../backend/controllers/marketingController');
  t.mock.method(WhatsappSession, 'findOne', async ({where})=>{
    assert.equal(where.empresaId, 2); assert.equal(where.id,'1'); return null;
  });
  let status;
  const res = { status(n){status=n;return this;},end(){} };
  await eventoSSE({user:{empresaId:2},query:{empresaId:'disp_1'}},res);
  assert.equal(status,403);
});
