'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom'),{DataTypes:D}=require('sequelize');
const {fixture}=require('./helpers/cliente-portal-fixture');
const dir=path.join(__dirname,'../frontend/cliente-app');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function tela(t,{falhas={},dados={}}={}){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(fs.readFileSync(path.join(dir,'app.html'),'utf8'),{url:'https://pethub.test/cliente-app/app.html?loja=11111111-1111-4111-8111-111111111111',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
 const w=dom.window,d=w.document;t.after(()=>w.close());w.scrollTo=()=>{};w.HTMLDialogElement.prototype.close=function(){this.open=false;};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.EventSource=class{close(){}};
 const sess={perfil:{nome:'Ana',emailAcesso:'ana@example.com'},loja:{nome:'PetShop A',slug:'11111111-1111-4111-8111-111111111111',receberPedidos:true,aparencia:{}}};
 const base={'/sessao':sess,'/pets':[{id:1,nome:'Lua',ativo:true,raca:'SRD'}],'/agendamentos':[{id:10,petId:1,servico:'Banho realizado',data:'2020-01-01',hora:'10:00',status:'concluido'},{id:11,petId:1,servico:'Banho futuro',data:'2099-01-01',hora:'11:00',status:'agendado'}],'/servicos':[{id:'banho',nome:'Banho',duracao:60}],'/solicitacoes':[],'/notificacoes':{itens:[],naoLidas:0}};
 let limpou=0;const calls=[];
 w.ClienteAPI={limpar(){limpou++;},async request(p){calls.push(p);if(falhas[p])throw Object.assign(Error('Falha de teste'),{status:falhas[p]});if(p.startsWith('/loja/'))return sess.loja;return Object.hasOwn(dados,p)?dados[p]:base[p];}};
 for(const n of ['tema.js','visual.js','app.js'])w.eval(fs.readFileSync(path.join(dir,n),'utf8'));
 await tick();await tick();
 return {w,d,errors,calls,base,falhas,dados,get limpou(){return limpou;},async click(sel){const b=d.querySelector(sel);assert.ok(b,sel);b.click();await tick();await tick();},async atualizar(){w.dispatchEvent(new w.Event('online'));await tick();await tick();}};
}
for(const endpoint of ['/servicos','/solicitacoes','/notificacoes'])test('falha em '+endpoint+' não esconde pets, histórico e perfil',async t=>{
 const a=await tela(t,{falhas:{[endpoint]:503}});assert.match(a.d.querySelector('main').textContent,/Banho futuro/);assert.ok(a.d.querySelector('[data-retry-dados]'));
 await a.click('#navegacao [data-tab=pets]');assert.match(a.d.querySelector('#pet-cards').textContent,/Lua/);
 await a.click('#navegacao [data-tab=history]');assert.match(a.d.querySelector('#history-list').textContent,/Banho realizado/);assert.doesNotMatch(a.d.querySelector('#history-list').textContent,/Banho futuro/);
 await a.click('#navegacao [data-tab=profile]');assert.equal(a.d.querySelector('[name=nome]').value,'Ana');assert.equal(a.errors.length,0);
});
test('falha inicial de pets mostra erro com retry, sem dizer que tutor não tem pets; recuperar sem reload',async t=>{
 const a=await tela(t,{falhas:{'/pets':503}});await a.click('#navegacao [data-tab=pets]');assert.equal(a.d.querySelector('#pet-cards'),null);assert.match(a.d.querySelector('main').textContent,/Não foi possível carregar: pets/);
 delete a.falhas['/pets'];await a.click('[data-retry-dados]');assert.match(a.d.querySelector('#pet-cards').textContent,/Lua/);assert.equal(a.d.querySelector('[data-retry-dados]'),null);assert.equal(a.errors.length,0);
});
test('histórico não depende do sucesso dos dados complementares de pets e recupera pela própria tela',async t=>{
 const a=await tela(t,{falhas:{'/agendamentos':503}});await a.click('#navegacao [data-tab=pets]');assert.match(a.d.querySelector('#pet-cards').textContent,/Lua/);
 await a.click('#navegacao [data-tab=history]');assert.equal(a.d.querySelector('#history-list'),null);assert.match(a.d.querySelector('main').textContent,/histórico e agendamentos/);
 delete a.falhas['/agendamentos'];await a.click('[data-retry-dados]');assert.match(a.d.querySelector('#history-list').textContent,/Banho realizado/);
});
test('atualização parcial preserva pets já carregados e aplica histórico novo',async t=>{
 const a=await tela(t);a.falhas['/pets']=503;a.dados['/agendamentos']=[{id:12,petId:1,servico:'Tosa realizada',data:'2020-02-02',hora:'10:00',status:'concluido'}];await a.atualizar();
 await a.click('#navegacao [data-tab=pets]');assert.match(a.d.querySelector('#pet-cards').textContent,/Lua/);
 await a.click('#navegacao [data-tab=history]');assert.match(a.d.querySelector('#history-list').textContent,/Tosa realizada/);assert.ok(a.d.querySelector('[data-retry-dados]'));assert.equal(a.errors.length,0);
});
test('lista vazia verdadeira é exibida normalmente; resposta fora do contrato é erro',async t=>{
 const a=await tela(t,{dados:{'/pets':[],'/agendamentos':[]}});await a.click('#navegacao [data-tab=pets]');assert.equal(a.d.querySelector('[data-retry-dados]'),null);
 a.dados['/pets']={erro:'Resposta inválida'};await a.atualizar();assert.ok(a.d.querySelector('[data-retry-dados]'));assert.equal(a.errors.length,0);
});
for(const status of [401,403])test('sessão revogada '+status+' limpa os dados e apresenta login',async t=>{
 const a=await tela(t);a.falhas['/pets']=status;await a.atualizar();assert.equal(a.limpou,1);assert.ok(a.d.querySelector('#auth-form'));assert.doesNotMatch(a.d.querySelector('main').textContent,/Lua|Banho realizado/);assert.equal(a.errors.length,0);
});

test('serviço publicado não consulta coluna de imagens ausente; histórico respeita tutor e empresa, inclusive pets legados',async t=>{
 const f=await fixture(t),a=await f.ativar();
 // Reproduz um model novo apontando para tabela antiga sem a coluna opcional.
 f.ERP.Produto.rawAttributes.imagemVersoes={type:D.JSON,field:'imagemVersoes'};f.ERP.Produto.refreshAttributes();
 await assert.rejects(f.ERP.Produto.findOne(),/imagemVersoes/);
 const cfg=await f.p.config(1),s=await f.p.agenda.servico(cfg,'banho');assert.equal(s.nome,'Banho');
 await assert.rejects(f.p.agenda.servico({...cfg.toJSON(),regras:{servicos:[{id:'outro'}]}},'outro'),e=>e.status===409);
 await f.ERP.Pet.create({id:4,nome:'Legado',cliente_id:1,empresa_id:null});
 await f.ERP.Pet.create({id:5,nome:'Vínculo divergente',cliente_id:1,empresa_id:2});
 for(const[petId,emp]of [[1,1],[4,1],[3,1],[2,2],[1,2],[5,1]])await f.ERP.Agendamento.create({empresa_id:emp,petId,dataAgendamento:new Date('2026-11-15T13:00:00Z'),horario:'10:00',servico:'Banho',status:'concluido'});
 const ps=await f.p.cadastros.pets(a.tutor);assert.deepEqual(ps.map(p=>p.id).sort(),[1,4]);
 const ags=await f.p.cadastros.agendamentos(a.tutor);assert.deepEqual(ags.map(a=>a.petId).sort(),[1,4]);
 // Histórico usa apenas os IDs autorizados, sem carregar metadados da ficha.
 const find=f.p.m.Detalhe.findOne;f.p.m.Detalhe.findOne=async()=>{throw Error('Complemento indisponível');};
 assert.equal((await f.p.cadastros.agendamentos(a.tutor)).length,2);f.p.m.Detalhe.findOne=find;
 assert.equal(await f.ERP.Pet.count(),5);
});
