'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {Sequelize,DataTypes:D}=require('sequelize'),{JSDOM,VirtualConsole}=require('jsdom');
const agenda=require('../backend/services/clientePortal/agenda'),{normalizarTaxidog}=require('../backend/services/taxidog');
const root=path.resolve(__dirname,'..');
const silent={log(){},warn(){},error(){},debug(){}};
function load(file,stubs){const mod={exports:{}};const real=require('node:module').createRequire(path.join(root,file));vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),{module:mod,exports:mod.exports,console:silent,Buffer,Date,setImmediate:()=>{},require:n=>n in stubs?stubs[n]:real(n)});return mod.exports;}
function response(){return {statusCode:200,status(n){this.statusCode=n;return this},set(){return this},json(data){this.body=JSON.parse(JSON.stringify(data));return this}};}
async function fixture(t){
 const db=new Sequelize({dialect:'sqlite',storage:':memory:',logging:false,dialectModule:require('./helpers/sqlite-caixa')});t.after(()=>db.close());
 const Empresa=db.define('Empresa',{id:{type:D.INTEGER,primaryKey:true}});
 const Cliente=db.define('Cliente',{nome:D.STRING,telefone:D.STRING,empresa_id:D.INTEGER,endereco:D.STRING,numero:D.STRING,complemento:D.STRING,bairro:D.STRING,cidade:D.STRING,estado:D.STRING,cep:D.STRING});
 const Pet=db.define('Pet',{nome:D.STRING,raca:D.STRING,observacao:D.STRING,empresa_id:D.INTEGER,cliente_id:D.INTEGER});Pet.belongsTo(Cliente,{as:'cliente',foreignKey:'cliente_id'});
 const Agendamento=db.define('Agendamento',{empresa_id:D.INTEGER,petId:D.INTEGER,horario:D.STRING,servico:D.STRING,servicos:D.JSON,observacoes:D.STRING,profissional:D.STRING,valor:D.FLOAT,status:{type:D.STRING,defaultValue:'agendado'},dataAgendamento:D.DATE,taxidog:{type:D.BOOLEAN,defaultValue:false}});Agendamento.belongsTo(Pet,{as:'pet',foreignKey:'petId'});
 await db.sync();await Empresa.bulkCreate([{id:1},{id:2}]);await Cliente.bulkCreate([{id:1,nome:'Karol',empresa_id:1},{id:2,nome:'Outra',empresa_id:2}]);await Pet.bulkCreate([{id:1,nome:'Leleco',empresa_id:1,cliente_id:1},{id:2,nome:'Outro',empresa_id:2,cliente_id:2}]);
 const models={sequelize:db,Empresa,Cliente,Pet,Agendamento};const handlers={};const router={use(){},get(p,...fn){handlers['GET '+p]=fn.at(-1)},post(p,...fn){handlers['POST '+p]=fn.at(-1)},put(p,...fn){handlers['PUT '+p]=fn.at(-1)},delete(){},patch(){}};
 load('backend/routes/agendamentoRoutes.js',{'express':{Router:()=>router},'../models':models,'../middleware/authUser':{authUser(){}},'../services/identidadeEmpresaPDF':{},'multer':{},'../services/midias/upload':{upload:()=>({single:()=>()=>{}})},'../services/marketingScheduler':{sincronizarAgendamento:async()=>{}},'../services/clientePortal/agenda':agenda});
 const controller=load('backend/controllers/dashboardController.js',{'../models':models,'../utils/simpleCache':{get(){throw Error('Taxi Dog must not reuse stale cache')}}});
 async function call(method,body={},id,empresa=1,query={}){const res=response();await handlers[method]({body,params:{id},query,user:{empresaId:empresa}},res);return res;}
 return {db,models,call,controller};
}
test('normalização não converte texto false em true e rejeita valores inválidos',()=>{for(const v of [undefined,null,false,0,'0','false'])assert.equal(normalizarTaxidog(v),false);for(const v of [true,1,'1','true'])assert.equal(normalizarTaxidog(v),true);assert.throws(()=>normalizarTaxidog('sim'),e=>e.status===400)});
test('API + SQL: criar, reler, editar e manter estados diferentes para o mesmo pet',async t=>{
 const f=await fixture(t),base={data:'2026-11-20',hora:'12:00',petId:1,servico:'Banho',valor:129};
 const off=await f.call('POST /',base);assert.equal(off.statusCode,201);assert.equal(off.body.taxidog,false);
 const on=await f.call('POST /',{...base,hora:'13:00',taxidog:true});assert.equal(on.statusCode,201);assert.equal(on.body.taxidog,true);
 let list=await f.call('GET /');assert.deepEqual(list.body.map(a=>a.taxidog),[false,true]);
 assert.equal((await f.call('GET /:id',{},on.body.id)).body.taxidog,true);
 assert.equal((await f.call('PUT /:id',{taxidog:false},on.body.id)).body.taxidog,false);
 assert.equal((await f.call('PUT /:id',{taxidog:true},off.body.id)).body.taxidog,true);
 assert.equal((await f.call('GET /:id',{},on.body.id)).body.taxidog,false);
 assert.equal((await f.call('POST /',{...base,hora:'15:00',taxidog:'invalido'})).statusCode,400);
});
test('isolamento da empresa, cancelamento e bloqueio após checkout',async t=>{
 const f=await fixture(t),{Agendamento}=f.models;const a=await Agendamento.create({empresa_id:1,petId:1,servico:'Banho',taxidog:true});
 assert.equal((await f.call('PUT /:id',{taxidog:false},a.id,2)).statusCode,404);
 assert.equal((await f.call('GET /:id',{},a.id,2)).statusCode,404);
 await a.update({status:'cancelado'});assert.equal((await f.call('GET /:id',{},a.id)).body.taxidog,true);
 await a.update({status:'concluido'});assert.equal((await f.call('PUT /:id',{taxidog:false},a.id)).statusCode,409);
 assert.equal((await a.reload()).taxidog,true);
});
test('Dashboard: somente flag salva, dia Brasília e empresa; desligar remove mesmo com observação transporte',async t=>{
 const f=await fixture(t),{Agendamento}=f.models;const dia=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
 await Agendamento.bulkCreate([
 {id:1,empresa_id:1,petId:1,servico:'Banho',taxidog:true,horario:'12:00',dataAgendamento:new Date(dia+'T12:00:00-03:00')},
 {id:2,empresa_id:1,petId:1,servico:'Banho',taxidog:false,observacoes:'buscar e transportar',dataAgendamento:new Date(dia+'T13:00:00-03:00')},
 {id:3,empresa_id:2,petId:2,servico:'Banho',taxidog:true,dataAgendamento:new Date(dia+'T13:00:00-03:00')},
 {id:4,empresa_id:1,petId:1,servico:'Banho',taxidog:true,status:'cancelado',dataAgendamento:new Date(dia+'T13:00:00-03:00')},
 {id:5,empresa_id:1,petId:1,servico:'Banho',taxidog:true,dataAgendamento:new Date(+new Date(dia+'T13:00:00-03:00')-86400000)}]);
 let res=response();await f.controller.levaTraz({user:{empresaId:1}},res);assert.equal(res.statusCode,200);assert.equal(res.body.length,1);assert.equal(res.body[0].petNome,'Leleco');assert.equal(res.body[0].clienteNome,'Karol');assert.equal(res.body[0].horario,'12:00');
 await Agendamento.update({taxidog:false},{where:{id:1}});res=response();await f.controller.levaTraz({user:{empresaId:1}},res);assert.deepEqual(res.body,[]);
 res=response();await f.controller.levaTraz({user:{}},res);assert.equal(res.statusCode,403);
});
test('modal real: toggle desligado inicialmente, clique e coleta do estado; novo modal volta desligado',async t=>{
 const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url:'https://pethub.test/agendamentos-novo.html',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});t.after(()=>dom.window.close());const w=dom.window;
 w.fetch=async()=>({ok:true,json:async()=>[]});w.alert=()=>{};w.eval(fs.readFileSync(path.join(root,'frontend/novo-atendimento-global.js'),'utf8'));
 w.abrirNovoAgendamentoModal();const d=w.document,input=d.getElementById('taxidogGlobal');assert.ok(input);assert.equal(input.checked,false);input.click();assert.equal(input.checked,true);assert.equal(w.coletarDadosFormulario().taxidog,true);
 assert.match(w.taxidogIcone({taxidog:true}),/Táxi Dog ativado/);assert.equal(w.taxidogIcone({taxidog:false}),'');assert.equal(w.taxidogIcone({}),'');
 const styles=d.getElementById('pethub-taxidog-estilos').textContent;assert.match(styles,/prefers-reduced-motion:reduce/);assert.equal(input.parentElement.parentElement.querySelector('label').textContent,'Profissional');
 w.abrirNovoAgendamentoModal();assert.equal(d.getElementById('taxidogGlobal').checked,false);
 await new Promise(r=>setTimeout(r,80));
});
for (const botao of ['salvarAgendamento','salvarEIr']) test('botão '+botao+' envia taxidog e mantém payload dos serviços',async t=>{
 const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url:'https://pethub.test/agendamentos-novo.html',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});t.after(()=>dom.window.close());const w=dom.window,calls=[];
 w.fetch=async(url,op={})=>{if(op.method){calls.push(JSON.parse(op.body));return {ok:true,json:async()=>({id:1,dataAgendamento:'2026-11-20T15:00:00Z',...calls.at(-1)})}}return {ok:true,json:async()=>[]}};
 w.eval(fs.readFileSync(path.join(root,'frontend/novo-atendimento-global.js'),'utf8'));w.abrirNovoAgendamentoModal();const d=w.document;
 d.getElementById('petClienteGlobal').value='Leleco — Karol';d.getElementById('petClienteGlobal').dataset.selectedPetId='1';d.getElementById('dataGlobal').value='20/11/2026';d.getElementById('horaGlobal').value='12:00';d.getElementById('taxidogGlobal').checked=true;w.servicosAdicionados=[{id:1,nome:'Banho',valor:129,quantidade:1}];d.getElementById(botao).click();
 await new Promise(r=>setTimeout(r,80));assert.equal(calls.length,1);assert.equal(calls[0].taxidog,true);assert.equal(calls[0].petId,'1');assert.equal(calls[0].servicos[0].nome,'Banho');
});
