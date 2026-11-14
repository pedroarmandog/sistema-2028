process.env.NODE_ENV='production';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {Sequelize,DataTypes}=require('sequelize'),{ESTADOS,normalizarUF}=require('../backend/utils/ufBrasil');
const Endereco=require('../frontend/cliente-endereco');
const tick=()=>new Promise(r=>setImmediate(r));
function tela(){
 class Campo{constructor(value=''){this.value=value;this.dataset={};this.events={};this.attrs={};this.disabled=false;}addEventListener(k,fn){(this.events[k]??=[]).push(fn);}setAttribute(k,v){this.attrs[k]=v;}dispatchEvent(e){for(const fn of this.events[e.type]||[])fn({type:e.type,target:this});}emit(type){this.dispatchEvent({type});}}
 const ids={};for(const id of ['cep','endereco','bairro','cidade','estado','codigo_ibge_municipio','numero','complemento','cep-status','pais'])ids[id]=new Campo();
 ids.numero.value='1058';ids.complemento.value='Loja 2';const botao=new Campo(),timers=new Map(),requisicoes=[];
 const doc={getElementById:id=>ids[id]||null,querySelector:s=>s==='.btn-search-cep'?botao:null,querySelectorAll:()=>[],defaultView:{Event:class{constructor(type){this.type=type;}}}};
 const api=Endereco.instalar({document:doc,fetch:(url,opts)=>new Promise((resolve,reject)=>requisicoes.push({url,opts,resolve:d=>resolve({ok:true,json:async()=>d}),falhar:reject,http:(status,d)=>resolve({ok:false,status,json:async()=>d})})),agendar:(fn,ms)=>{const id={};timers.set(id,{fn,ms});return id;},cancelar:id=>timers.delete(id)});
 function correr(ms){for(const[id,v]of [...timers])if(v.ms===ms){timers.delete(id);v.fn();}}
 function digitar(valor){ids.cep.value=valor;ids.cep.emit('input');}
 return {ids,botao,doc,api,timers,requisicoes,correr,digitar};
}

test('27 UFs, nomes legados, opcionais e formulário sem duplicidade',()=>{
 assert.equal(Object.keys(ESTADOS).length,27);assert.deepEqual(Endereco.estados,ESTADOS);
 for(const [uf,nome]of Object.entries(ESTADOS)){assert.equal(normalizarUF(' '+uf.toLowerCase()+' '),uf);assert.equal(normalizarUF(nome),uf);assert.equal(Endereco.normalizarUF(nome+' ('+uf+')'),uf);}
 assert.equal(normalizarUF(''),null);assert.equal(normalizarUF(null),null);assert.throws(()=>normalizarUF('XX'),e=>e.status===400);
 const html=fs.readFileSync(require.resolve('../frontend/novo-cliente.html'),'utf8'),select=html.match(/<select id="estado"[\s\S]*?<\/select>/g);assert.equal(select.length,1);assert.equal((select[0].match(/<option /g)||[]).length,28);assert.ok(!select[0].includes('required'));assert.ok(html.indexOf('id="cidade"')<html.indexOf('id="estado"'));assert.ok(html.indexOf('cliente-endereco.js')<html.indexOf('novo-cliente.js'));
});

test('CEP por input/colar: endereço + UF + IBGE, sem alterar número e complemento, sem duplicar consulta',async()=>{
 const f=tela();f.digitar('30130010');assert.equal(f.ids.cep.value,'30130-010');f.correr(250);await tick();assert.equal(f.requisicoes.length,1);assert.equal(f.requisicoes[0].url,'/api/cep/30130010');assert.equal(f.botao.disabled,true);
 const repetida=f.api.consultar('30130010');f.ids.cep.emit('input');assert.equal(f.requisicoes.length,1);
 f.requisicoes[0].resolve({logradouro:'Avenida A',bairro:'Centro',localidade:'Belo Horizonte',uf:'MG',ibge:'3106200',complemento:'Não usar'});await repetida;
 assert.equal(f.ids.estado.value,'MG');assert.equal(f.ids.codigo_ibge_municipio.value,'3106200');assert.equal(f.ids.endereco.value,'Avenida A');assert.equal(f.ids.numero.value,'1058');assert.equal(f.ids.complemento.value,'Loja 2');assert.equal(f.botao.disabled,false);
 f.ids.estado.value='ES';f.ids.estado.emit('change');assert.equal(f.ids.estado.value,'ES');
});

test('resposta antiga não substitui CEP novo nem encerra seu indicador de consulta',async()=>{
 const f=tela();f.digitar('30130010');f.correr(250);await tick();const antiga=f.requisicoes[0];f.digitar('01001000');f.correr(250);await tick();assert.equal(antiga.opts.signal.aborted,true);assert.equal(f.requisicoes.length,2);
 antiga.resolve({logradouro:'Antigo',uf:'MG',ibge:'3106200'});await tick();assert.equal(f.ids.estado.value,'');assert.equal(f.botao.disabled,true);
 f.requisicoes[1].resolve({logradouro:'Praça da Sé',bairro:'Sé',localidade:'São Paulo',uf:'SP',ibge:'3550308'});await tick();assert.equal(f.ids.estado.value,'SP');assert.equal(f.ids.endereco.value,'Praça da Sé');assert.equal(f.ids.codigo_ibge_municipio.value,'3550308');
});

test('edições manuais durante consulta e respostas vazias não são apagadas',async()=>{
 const f=tela();f.ids.bairro.value='Bairro manual';f.ids.estado.value='MG';f.digitar('01001000');f.correr(250);await tick();f.ids.estado.value='ES';f.ids.estado.emit('change');f.ids.endereco.value='Rua digitada';f.ids.endereco.emit('input');
 f.requisicoes[0].resolve({logradouro:'Não sobrescrever',bairro:'',localidade:'São Paulo',uf:'SP',ibge:''});await tick();assert.equal(f.ids.estado.value,'ES');assert.equal(f.ids.endereco.value,'Rua digitada');assert.equal(f.ids.bairro.value,'Bairro manual');assert.equal(f.ids.cidade.value,'São Paulo');
});

test('CEP inválido/inexistente, falha de rede e timeout mantêm cadastro manual utilizável',async()=>{
 const f=tela();f.ids.estado.value='MG';f.ids.endereco.value='Manual';f.digitar('123');await f.api.consultar('123');assert.equal(f.requisicoes.length,0);assert.match(f.ids['cep-status'].textContent,/inválido/);
 f.digitar('99999999');f.correr(250);await tick();f.requisicoes[0].http(404,{erro:true,mensagem:'CEP não encontrado'});await tick();assert.match(f.ids['cep-status'].textContent,/não encontrado/);assert.equal(f.ids.estado.value,'MG');
 const nova=f.api.consultar('99999999',true);await tick();f.requisicoes[1].falhar(Error('Rede'));await nova;assert.match(f.ids['cep-status'].textContent,/mantidos/);assert.equal(f.ids.endereco.value,'Manual');
 const lenta=f.api.consultar('99999999',true);await tick();f.requisicoes[2].opts.signal.addEventListener('abort',()=>f.requisicoes[2].falhar(Object.assign(Error('Abortado'),{name:'AbortError'})));f.correr(10000);await lenta;assert.match(f.ids['cep-status'].textContent,/demorou/);assert.equal(f.botao.disabled,false);assert.equal(f.ids.numero.value,'1058');
});

test('edição carrega estado/IBGE salvos e serialização permite alterar/limpar a UF',()=>{
 const f=tela(),source=fs.readFileSync(require.resolve('../frontend/novo-cliente.js'),'utf8');
 const Classe=vm.runInNewContext(source.slice(0,source.indexOf('\n}\n')+3)+';NovoClienteManager;', {document:f.doc,window:{ClienteEndereco:Endereco},console});
 const manager=Object.create(Classe.prototype);manager._aplicarLembreteConfig=()=>{};
 manager.preencherFormulario({nome:'Antigo',estado:'Minas Gerais',codigo_ibge_municipio:'3106200',pais:'Brasil'});assert.equal(f.ids.estado.value,'MG');assert.equal(f.ids.codigo_ibge_municipio.value,'3106200');
 const start=source.indexOf('      // Adicionar campos ao FormData'),end=source.indexOf('      // Adicionar ID do grupo',start),loop=source.slice(start,end);
 const coletar=()=>{const valores={};vm.runInNewContext(loop,{campos:{estado:'estado'},document:f.doc,formData:{append:(k,v)=>{valores[k]=v;}}});return valores;};
 f.ids.estado.value='ES';assert.equal(coletar().estado,'ES');f.ids.estado.value='';assert.equal(coletar().estado,'');
 manager.preencherFormulario({nome:'Sem UF',estado:null});assert.equal(f.ids.estado.value,'');
});

test('migração de UF é aditiva, repetível e preserva clientes legados',async t=>{
 const db=new Sequelize({dialect:'sqlite',storage:':memory:',logging:false,dialectModule:require('../backend/scripts/lab-fiscal/sqlite')});t.after(()=>db.close());
 const C=db.define('Cliente',{nome:DataTypes.STRING},{tableName:'Clientes'});await C.sync();const c=await C.create({nome:'Cliente legado'});
 const preparar=require('../backend/services/clienteEndereco').prepararEstrutura;assert.equal((await preparar(db)).criada,true);assert.equal((await preparar(db)).criada,false);assert.equal(await C.count(),1);assert.equal((await c.reload()).nome,'Cliente legado');const [rows]=await db.query('SELECT estado FROM Clientes');assert.equal(rows[0].estado,null);
});

test('importação mantém arquivos sem UF e preserva UF inválida como aviso opcional',()=>{
 const N=require('../backend/services/importacao/normalizarCliente');assert.equal(N.preparar({nome:'Antigo'}).dados.nome,'Antigo');assert.equal(N.preparar({nome:'UF',estado:'minas gerais'}).dados.estado,'MG');const r=N.preparar({nome:'UF',estado:'Inválido'});assert.equal(r.dados.estado,undefined);assert.equal(r.preservados.estado,'Inválido');assert.match(r.avisos[0],/UF inválida/);
});

test('HTTP real: cria/edita/consulta/lista UF, mantém vínculos e isola empresas; fiscal usa o cadastro',async t=>{
 const lab=await require('../backend/scripts/lab-fiscal/app').criarLaboratorio(),db=lab.db,M=lab.models;
 const fonte=fs.readFileSync(require.resolve('../backend/models/Cliente'),'utf8');
 const Cliente=vm.runInNewContext(fonte.slice(fonte.indexOf('const Cliente = sequelize.define('),fonte.indexOf('module.exports = { Cliente'))+'\nCliente;',{sequelize:db,DataTypes,require});
 await Cliente.sync({force:true});M.Cliente=Cliente;require.cache[require.resolve('../backend/models/Cliente')].exports.Cliente=Cliente;
 M.Pet=require('../backend/models/Pet');Cliente.hasMany(M.Pet,{foreignKey:'cliente_id',as:'pets'});Cliente.hasMany(M.Venda,{foreignKey:'clienteId',as:'vendas'});await M.Pet.sync();
 t.mock.method(require('../backend/services/pushNotificationService'),'notificarEmpresa',async()=>{});
 lab.app.use('/api/clientes',require('../backend/routes/clienteRoutes'));
 const server=lab.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await tick();await db.close();});
 const base='http://127.0.0.1:'+server.address().port;
 async function api(path,method='GET',body,empresa=1){const r=await lab.fetchLocal(base+'/api/clientes'+path,{method,headers:{Authorization:'Bearer '+lab.token(empresa),'Content-Type':'application/json'},body:body&&JSON.stringify(body)});return {status:r.status,data:await r.json()};}
 const criado=await api('','POST',{nome:'Cliente UF',estado:' mg ',endereco:'Rua',numero:'1058',complemento:'Loja 2',bairro:'Centro',cidade:'Belo Horizonte',codigo_ibge_municipio:'3106200',cep:'30130010',cpf:'12345678901'});assert.equal(criado.status,201,JSON.stringify(criado.data));const id=criado.data.cliente.id;assert.equal(criado.data.cliente.estado,'MG');
 const pet=await M.Pet.create({nome:'Pet vinculado',cliente_id:id,empresa_id:1});
 assert.equal((await api('/'+id)).data.cliente.estado,'MG');assert.equal((await api('')).data.clientes.find(c=>c.id===id).estado,'MG');
 assert.equal((await api('/'+id,'PUT',{estado:'Espírito Santo'})).status,200);assert.equal((await api('/'+id)).data.cliente.estado,'ES');assert.equal((await pet.reload()).cliente_id,id);assert.equal((await api('/'+id)).data.cliente.pets[0].id,pet.id);
 assert.equal((await api('/'+id,'PUT',{estado:'XX'})).status,400);assert.equal((await api('/'+id)).data.cliente.estado,'ES');assert.equal((await api('/'+id,'PUT',{estado:'SP'},2)).status,404);
 const Builder=require('../backend/services/fiscal/FiscalPayloadBuilder'),Adapter=require('../backend/services/fiscal/adapters/FocusNFeAdapter');
 const cliente=(await Cliente.findByPk(id)).toJSON(),dest=Builder._buildDestinatario(cliente);assert.equal(dest.endereco.uf,'ES');
 const payload={_notaTipo:'nfe',emitente:{cnpj:'12345678000199',endereco:{uf:'MG'}},destinatario:dest,itens:[{codigo_produto:'1',descricao:'Ração',ncm:'23091000',cfop:'6102',csosn:'102',cst_pis:'07',cst_cofins:'07',origem:0,quantidade:1,valor_unitario:10}],pagamentos:[{forma:'pix',valor:10}],totais:{valor_total:10}};
 const corpo=Adapter.montarPayloadNFe(payload);assert.equal(corpo.uf_destinatario,'ES');assert.equal(corpo.local_destino,'2');
 const a=new Adapter({token_api:'LAB',ambiente:'homologacao'});assert.equal(a.prepararTransmissao(payload).corpo.uf_destinatario,'ES');
 await api('/'+id,'PUT',{estado:''});assert.equal((await api('/'+id)).data.cliente.estado,null);payload.destinatario=Builder._buildDestinatario((await Cliente.findByPk(id)).toJSON());assert.throws(()=>a.prepararTransmissao(payload),/Estado \(UF\).*Clientes/);assert.equal(Adapter.montarPayloadNFe(payload).uf_destinatario,undefined);
 const antigo=await api('','POST',{nome:'Sem estado'});assert.equal(antigo.status,201);assert.equal(antigo.data.cliente.estado,null);assert.equal((await api('/'+antigo.data.cliente.id,'PUT',{nome:'Ainda sem estado'})).status,200);assert.equal(lab.chamadas.length,0);
});

test('proxy de CEP: valida entrada, limita resposta/tempo e trata inexistência/rede/JSON',async()=>{
 const {EventEmitter}=require('node:events'),{consultar,endpoint}=require('../backend/services/consultaCep');
 let chamadas=0,ultimaURL;
 const get=(status,body,modo)=> (url,callback)=>{chamadas++;ultimaURL=url;const req=new EventEmitter();req.destroy=()=>{req.destroyed=true;req.emit('error',Error('encerrado'));};
  queueMicrotask(()=>{if(modo==='rede')return req.emit('error',Error('rede'));if(modo==='lento')return;const resp=new EventEmitter();resp.statusCode=status;resp.resume=()=>{};resp.setEncoding=()=>{};callback(resp);resp.emit('data',body);resp.emit('end');});return req;};
 const ok=await consultar('30130010',{get:get(200,JSON.stringify({logradouro:'Rua',localidade:'BH',bairro:'Centro',uf:'mg',ibge:'3106200',complemento:'não retornar'}))});assert.equal(ok.uf,'MG');assert.equal(ok.ibge,'3106200');assert.equal(ok.complemento,'não retornar');assert.equal(ultimaURL,'https://viacep.com.br/ws/30130010/json/');
 const antes=chamadas;await assert.rejects(consultar('123',{get:get(200,'{}')}),e=>e.status===400);assert.equal(chamadas,antes);
 await assert.rejects(consultar('99999999',{get:get(200,'{"erro":true}')}),e=>e.status===404);
 for(const [status,body,modo] of [[500,'{}'],[200,'<html>'],[200,'null'],[200,'{}','rede'],[200,'x'.repeat(65537)]])await assert.rejects(consultar('30130010',{get:get(status,body,modo)}),e=>e.status===502);
 await assert.rejects(consultar('30130010',{get:get(200,'{}','lento'),timeout:5}),e=>e.status===504);
 const res={status(c){this.code=c;return this;},set(){return this;},json(d){this.data=d;}};
 await endpoint({buscar:async()=>{throw Object.assign(Error('CEP não encontrado'),{status:404});}})({params:{cep:'99999999'}},res);assert.equal(res.code,404);assert.equal(res.data.erro,true);assert.equal(res.data.mensagem,'CEP não encontrado');
});
