process.env.NODE_ENV='production';process.env.JWT_SECRET='segredo-admin-teste-forte';process.env.JWT_USER_SECRET='segredo-erp-teste-forte';
const {test}=require('node:test'),assert=require('node:assert/strict'),{criarDiagnostico,cnpjValido}=require('../backend/services/fiscal/FocusDiagnostico');
const segredo='MASTER_APENAS_NO_BACKEND_TESTE',cnpj='11222333000181';
const tick=()=>new Promise(r=>setImmediate(r));

test('CNPJ: dígitos verificadores, pontuação, repetidos e URL arbitrária',()=>{
 assert.equal(cnpjValido('11.222.333/0001-81'),cnpj);assert.equal(cnpjValido(cnpj),cnpj);
 for(const v of ['11222333000182','00000000000000','11111111111111','123','https://outro.example/'+cnpj,cnpj+'?url=x','abc'+cnpj,null,[cnpj]])assert.equal(cnpjValido(v),null);
});
test('Focus: somente GET fixo, Basic master, resposta resumida sem ler dados/segredos',async()=>{
 const calls=[];let cancelou=false,agora=Date.UTC(2026,10,14,20);
 const testar=criarDiagnostico({env:{FOCUS_NFE_MASTER_TOKEN:segredo},agora:()=>agora,fetch:async(url,opts)=>{calls.push({url,opts});agora+=125;return {status:200,body:{cancel:async()=>{cancelou=true;}},json(){throw Error('Não ler cadastro completo');}};}});
 const r=await testar('11.222.333/0001-81');assert.equal(r.status,200);assert.equal(r.dados.sucesso,true);assert.equal(r.dados.tempoRespostaMs,125);assert.equal(r.dados.verificacoes.certificadoA1,'Não verificado');assert.equal(r.dados.verificacoes.emissaoNFe,'Não testada');assert.equal(calls.length,1);assert.equal(calls[0].url,'https://api.focusnfe.com.br/v2/cnpjs/'+cnpj);assert.equal(calls[0].opts.method,'GET');assert.equal(calls[0].opts.redirect,'error');assert.equal(calls[0].opts.body,undefined);assert.equal(calls[0].opts.headers.Authorization,'Basic '+Buffer.from(segredo+':').toString('base64'));assert.ok(cancelou);assert.ok(!JSON.stringify(r).includes(segredo));assert.match(r.dados.aviso,/apenas a comunicação/);
});
test('Focus: token ausente/inválido, HTTPs, rede e timeout sem retry nem detalhes sensíveis',async()=>{
 let calls=0;const fetch=async()=>{calls++;return {status:200};};
 assert.equal((await criarDiagnostico({env:{},fetch})(cnpj)).dados.codigo,'TOKEN_AUSENTE');assert.equal(calls,0);
 assert.equal((await criarDiagnostico({env:{FOCUS_NFE_MASTER_TOKEN:segredo},fetch})('invalid')).status,400);assert.equal(calls,0);
 for(const [http,codigo,status]of [[401,'AUTENTICACAO',502],[403,'AUTENTICACAO',502],[400,'VALIDACAO',400],[404,'NAO_ENCONTRADO',502],[429,'COMUNICACAO',502],[500,'COMUNICACAO',502],[302,'COMUNICACAO',502]]){
  let n=0;const r=await criarDiagnostico({env:{FOCUS_NFE_MASTER_TOKEN:segredo},fetch:async()=>{n++;return{status:http,text:async()=>segredo,headers:{Authorization:segredo}};}})(cnpj);assert.equal(r.status,status);assert.equal(r.dados.codigo,codigo);assert.equal(r.dados.httpFocus,http);assert.equal(n,1);assert.ok(!JSON.stringify(r).includes(segredo));assert.notEqual(r.dados.verificacoes.autenticacao,'Funcionando');assert.equal(r.dados.verificacoes.comunicacao,'Funcionando');
 }
 const rede=await criarDiagnostico({env:{FOCUS_NFE_MASTER_TOKEN:segredo},fetch:async()=>{throw Error(segredo+' Authorization');}})(cnpj);assert.equal(rede.dados.codigo,'COMUNICACAO');assert.ok(!JSON.stringify(rede).includes(segredo));
 let signal;const timeout=await criarDiagnostico({env:{FOCUS_NFE_MASTER_TOKEN:segredo},timeout:5,fetch:async(u,o)=>{signal=o.signal;return new Promise(()=>{});}})(cnpj);assert.equal(timeout.status,504);assert.equal(timeout.dados.codigo,'TIMEOUT');assert.equal(signal.aborted,true);
});

test('HTTP/JWT: diagnóstico global não aceita ERP, admin não autorizado nem alteração de cadastro',async t=>{
 const {Sequelize,DataTypes}=require('sequelize'),express=require('express'),jwt=require('jsonwebtoken');
 const db=new Sequelize({dialect:'sqlite',storage:':memory:',logging:false,dialectModule:require('../backend/scripts/lab-fiscal/sqlite')});
 const Empresa=db.define('Empresa',{nome:DataTypes.STRING,razaoSocial:DataTypes.STRING,cnpj:DataTypes.STRING});const Admin=db.define('Admin',{email:DataTypes.STRING,ativo:DataTypes.BOOLEAN});
 await db.sync();await Empresa.bulkCreate([{id:1,nome:'A',cnpj},{id:2,nome:'Inválida',cnpj:'00000000000000'},{id:3,nome:'B',cnpj:'11444777000161'}]);await Admin.bulkCreate([{id:1,email:'dono@teste.local',ativo:true},{id:2,email:'outro@teste.local',ativo:true},{id:3,email:'inativo@teste.local',ativo:false}]);
 const stub=(p,exports)=>{const id=require.resolve(p);require.cache[id]={id,filename:id,loaded:true,exports};};stub('../backend/models/Cliente',{sequelize:db});stub('../backend/models',{sequelize:db,Empresa,Admin});
 const native=global.fetch;let providerCalls=[],resolver;global.fetch=async(url,opts)=>{providerCalls.push({url,opts});return new Promise(r=>{resolver=r;});};
 process.env.FOCUS_NFE_DIAGNOSTIC_ADMIN_IDS='1';delete process.env.FOCUS_NFE_MASTER_TOKEN;
 const logs=[];for(const metodo of ['info','log','warn','error'])t.mock.method(console,metodo,(...x)=>logs.push(x));
 const app=express();app.use(express.json());app.use('/api/fiscal',require('../backend/routes/configuracaoFiscalRoutes'));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 t.after(async()=>{global.fetch=native;server.closeAllConnections();await new Promise(r=>server.close(r));await db.close();delete process.env.FOCUS_NFE_MASTER_TOKEN;delete process.env.FOCUS_NFE_DIAGNOSTIC_ADMIN_IDS;});
 const base='http://127.0.0.1:'+server.address().port+'/api/fiscal';
 const token=(id,email,extra={})=>jwt.sign({id,email,...extra},process.env.JWT_SECRET,{expiresIn:'5m'});
 const admin=token(1,'dono@teste.local'),outro=token(2,'outro@teste.local'),pet=jwt.sign({id:1,empresaId:1,grupoUsuario:'Administrador'},process.env.JWT_USER_SECRET,{expiresIn:'5m'});
 async function api(path,body,tok=admin){const r=await native(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(tok?{Authorization:'Bearer '+tok}:{})},body:body&&JSON.stringify(body)});return{status:r.status,data:await r.json()};}
 const post='/testar-conexao-focus',permissao='/diagnostico-focus/permissao?empresaId=1';
 assert.equal((await api(post,{empresaId:1},null)).status,401);assert.equal((await api(post,{empresaId:1},pet)).status,401);assert.equal((await api(post,{empresaId:1},outro)).status,403);
 assert.equal((await api(post,{empresaId:1},token(1,'errado@teste.local'))).status,403);assert.equal((await api(post,{empresaId:1},token(1,undefined,{empresaId:1,grupoUsuario:'Administrador'}))).status,403);assert.equal((await api(post,{empresaId:1},token(3,'inativo@teste.local'))).status,401);
 assert.equal((await api(permissao,undefined,pet)).status,401);assert.equal((await api(permissao,undefined,outro)).status,403);assert.equal((await api(permissao)).data.empresa.id,1);assert.equal((await api('/diagnostico-focus/permissao?empresaId=3')).data.empresa.nome,'B');
 assert.equal((await api(post,{empresaId:1})).status,503);assert.equal(providerCalls.length,0);
 process.env.FOCUS_NFE_MASTER_TOKEN=segredo;
 assert.equal((await api(post,{empresaId:1,cnpj:'11444777000161'})).status,400);assert.equal((await api(post,{empresaId:'https://evil.example'})).status,400);assert.equal((await api(post,{empresaId:999})).status,404);assert.equal((await api(post,{empresaId:2})).status,400);assert.equal(providerCalls.length,0);
 const antes=JSON.stringify((await Empresa.findAll()).map(r=>r.toJSON()));
 const primeiro=api(post,{empresaId:1});for(let i=0;i<40&&!resolver;i++)await new Promise(r=>setTimeout(r,5));assert.equal(providerCalls.length,1);
 assert.equal((await api(post,{empresaId:1})).status,409);resolver({status:200});const r=await primeiro;assert.equal(r.status,200);assert.equal(r.data.empresa.id,1);assert.equal(r.data.sucesso,true);assert.equal((await api(post,{empresaId:1})).status,429);assert.equal(providerCalls.length,1);
 assert.equal(JSON.stringify((await Empresa.findAll()).map(r=>r.toJSON())),antes);assert.ok(!JSON.stringify(r).includes(segredo));assert.ok(!JSON.stringify(logs).includes(segredo));assert.ok(!JSON.stringify(logs).includes(Buffer.from(segredo+':').toString('base64')));assert.ok(providerCalls.every(r=>r.opts.method==='GET'&&r.url.startsWith('https://api.focusnfe.com.br/v2/cnpjs/')));
 // Remover autorização no servidor revoga inclusive token ainda válido.
 process.env.FOCUS_NFE_DIAGNOSTIC_ADMIN_IDS='';assert.equal((await api(post,{empresaId:1})).status,403);
 process.env.FOCUS_NFE_DIAGNOSTIC_ADMIN_IDS='1';const secretAdmin=process.env.JWT_SECRET;delete process.env.JWT_SECRET;assert.equal((await api(permissao)).status,503);process.env.JWT_SECRET=secretAdmin;
});

test('frontend: comum fica oculto; admin autorizado consulta uma vez, sem tokens de emissão',async()=>{
 const UI=require('../frontend/fiscal-focus-diagnostico');
 function ambiente(cookie){const ids={},listeners={},calls=[];for(const id of ['focusDiagnostico','btnTestarFocus','focusDiagnosticoResultado','focusDiagnosticoStatus','focusDiagnosticoLinhas','focusDiagnosticoEmpresa'])ids[id]={hidden:true,dataset:{},events:{},addEventListener(k,fn){this.events[k]=fn;},setAttribute(){},children:[],append(...v){this.children.push(...v);},replaceChildren(){this.children=[];}};
  const doc={cookie,getElementById:id=>ids[id],createElement:()=>({textContent:''})},window={addEventListener:(k,fn)=>{listeners[k]=fn;}};
  const ui=UI.iniciar({document:doc,window,fetch:async(url,opts)=>{calls.push({url,opts});if(url.includes('/permissao'))return{ok:true,json:async()=>({permitido:true,empresa:{id:1,nome:'Empresa A',cnpj}})};return new Promise(resolve=>{amb.resolver=resolve;});}});const amb={ids,calls,ui};return amb;
 }
 const comum=ambiente('pethub_token=erp');await comum.ui.verificar(1);assert.equal(comum.calls.length,0);assert.equal(comum.ids.focusDiagnostico.hidden,true);
 const a=ambiente('admin_token=JWT_ADMIN_TESTE; pethub_token=erp');await a.ui.verificar(1);assert.equal(a.ids.focusDiagnostico.hidden,false);const p=a.ui.executar();await tick();await a.ui.executar();assert.equal(a.calls.length,2);assert.equal(a.ids.btnTestarFocus.disabled,true);assert.equal(a.ids.focusDiagnosticoStatus.textContent,'Verificando conexão com a Focus NFe...');assert.deepEqual(JSON.parse(a.calls[1].opts.body),{empresaId:1});assert.ok(!JSON.stringify(a.calls).includes(segredo));
 const r=await criarDiagnostico({env:{FOCUS_NFE_MASTER_TOKEN:segredo},fetch:async()=>({status:200})})(cnpj);a.resolver({ok:true,json:async()=>r.dados});await p;assert.equal(a.ids.btnTestarFocus.disabled,false);assert.equal(a.ids.focusDiagnosticoResultado.dataset.estado,'sucesso');const texto=a.ids.focusDiagnosticoLinhas.children.map(x=>x.textContent).join(' ');assert.match(texto,/Não testada/);assert.match(texto,/Não verificado/);assert.match(texto,/Brasília/);
 const html=require('node:fs').readFileSync(require.resolve('../frontend/configuracoes/configuracao-fiscal.html'),'utf8');assert.equal((html.match(/id="btnTestarFocus"/g)||[]).length,1);assert.match(html,/id="focusDiagnostico"[^>]*hidden/);assert.ok(!html.includes('FOCUS_NFE_MASTER_TOKEN'));
});
