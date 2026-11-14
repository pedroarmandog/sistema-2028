process.env.NODE_ENV='production';
const {test}=require('node:test'),assert=require('node:assert/strict'),{Sequelize,DataTypes}=require('sequelize');
const express=require('express'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const sharp=require('sharp'),{EventEmitter}=require('node:events');
const Midias=require('../backend/services/midias');
const imagem=async cor=>sharp({create:{width:32,height:24,channels:4,background:cor}}).png().toBuffer();
const uri=b=>'data:image/png;base64,'+b.toString('base64');
function stub(nome,exports){const filename=require.resolve(nome);require.cache[filename]={filename,id:filename,loaded:true,exports};}
function armazenamento(){const objetos=new Map();return{objetos,puts:[],async gravar(k,b,t,sha){this.puts.push(k);objetos.set(k,{bytes:Buffer.from(b),tipo:t,sha});},async ler(k){if(!objetos.has(k))throw Error('Objeto ausente');return Buffer.from(objetos.get(k).bytes);},async politica(){return[];}};}
async function ouvir(app,t){const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));});return 'http://127.0.0.1:'+server.address().port;}
const autenticar=(req,res,next)=>{const id=req.get('x-empresa')||req.get('Authorization')?.replace('Bearer ','');if(!id)return res.sendStatus(401);req.user={id:1,empresaId:Number(id)};next();};

test('armazenamento S3 confirma PUT + HEAD, preserva falha e não usa exclusão',async()=>{
 const {criarArmazenamento}=require('../backend/services/midias/armazenamento'),comandos=[];let confere=true;
 const env={MEDIA_S3_BUCKET:'teste',MEDIA_S3_ENDPOINT:'https://teste.r2.cloudflarestorage.com',MEDIA_S3_ACCESS_KEY_ID:'fake',MEDIA_S3_SECRET_ACCESS_KEY:'segredo-nao-publicar'};
 const bytes=await imagem('green'),sha=crypto.createHash('sha256').update(bytes).digest('hex');
 const client={async send(c){comandos.push(c);if(c.constructor.name==='HeadObjectCommand')return {ContentLength:confere?bytes.length:0,Metadata:{sha256:sha}};if(c.constructor.name==='GetObjectCommand')return {Body:{transformToByteArray:async()=>bytes}};return{};}};
 const s=criarArmazenamento(env,{client});await s.gravar('empresas/1/produtos/x',bytes,'image/png',sha);assert.deepEqual(comandos.map(c=>c.constructor.name),['PutObjectCommand','HeadObjectCommand']);assert.deepEqual(await s.ler('empresas/1/produtos/x'),bytes);
 confere=false;await assert.rejects(s.gravar('x',bytes,'image/png',sha),e=>e.status===503&&!e.message.includes(env.MEDIA_S3_SECRET_ACCESS_KEY));
 assert.ok(comandos.every(c=>!c.constructor.name.startsWith('Delete')));
 await assert.rejects(criarArmazenamento({}).gravar('x',bytes,'image/png',sha),/não configurado/);
});

test('integração de mídias: produtos, Marketing, memória nova, envio, tenants e migração',async t=>{
 const db=new Sequelize({dialect:'sqlite',storage:':memory:',logging:false,dialectModule:require('../backend/scripts/lab-fiscal/sqlite')});t.after(()=>db.close());
 stub('../backend/models/Cliente',{sequelize:db});
 const Empresa=db.define('Empresa',{id:{type:DataTypes.INTEGER,primaryKey:true},nome:DataTypes.STRING,logo:DataTypes.TEXT},{tableName:'empresas'});
 const Produto=require('../backend/models/Produto');require('../backend/models/Fornecedor');require('../backend/models/HistoricoEstoque');
 const MensagemAutomatica=require('../backend/models/MensagemAutomatica')(db),EnvioAgendado=require('../backend/models/EnvioAgendado')(db);
 const Agendamento=db.define('Agendamento',{empresa_id:DataTypes.INTEGER,prontuario:DataTypes.TEXT});
 const modelos={sequelize:db,Empresa,Produto,MensagemAutomatica,EnvioAgendado,Agendamento,Usuario:{findByPk:async()=>({permissoes:null})}};
 stub('../backend/models',modelos);stub('../backend/middleware/authUser',{authUser:autenticar});
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'midias-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const store=armazenamento(),media=Midias.criarServico({db,store,raizes:[dir]});t.mock.method(Midias,'instancia',()=>media);
 await db.sync();await Empresa.bulkCreate([{id:1,nome:'A'},{id:2,nome:'B'}]);
 const app=express();app.use(express.json({limit:'10mb'}));app.use(require('cookie-parser')());app.use('/uploads',require('../backend/routes/midiasRoutes').leitor({servico:media,autenticar}));
 app.use('/api/itens',require('../backend/routes/itemRoutes'));
 app.use('/api/marketing',autenticar,require('../backend/routes/marketingRoutes'));
 app.use((e,req,res,next)=>res.status(e.status||400).json({erro:e.publica?e.message:'Upload recusado'}));
 const base=await ouvir(app,t);
 async function api(url,method='GET',body,empresa=1){const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json','x-empresa':String(empresa)},body:body&&JSON.stringify(body)});return {status:r.status,data:await r.json().catch(()=>null)};}
 let produto,anterior,marketing;
 await t.test('produto: cadastro confirmado, imagem real, preço e tenant autenticado',async()=>{
  const r=await api('/api/itens','POST',{nome:'Produto com foto',preco:80,custoBase:50,estoqueAtual:10,empresa_id:2,imagem:uri(await imagem('green'))});assert.equal(r.status,201,JSON.stringify(r.data));produto=r.data;anterior='/uploads/'+produto.imagem;
  assert.equal(produto.empresa_id,1);assert.match(produto.imagem,/^produtos\/[a-f0-9-]+\.webp$/);
  const foto=await fetch(base+anterior,{headers:{Cookie:'pethub_token=1'}});assert.equal(foto.status,200);assert.equal(foto.headers.get('content-type'),'image/webp');assert.match(foto.headers.get('cache-control'),/no-store/);assert.ok((await foto.arrayBuffer()).byteLength);
  assert.equal((await fetch(base+anterior)).status,401);assert.equal((await fetch(base+anterior,{headers:{'x-empresa':'2'}})).status,404);
  assert.equal((await api('/api/itens/'+produto.id,'PUT',{imagem:null},2)).status,404);
  await assert.rejects(media.referencia(2,produto.imagem,'produtos'),/não pertence/);
 });
 await t.test('substituir/remover preserva preço, estoque e arquivo anterior compartilhado',async()=>{
  const antes=store.objetos.size;const r=await api('/api/itens/'+produto.id,'PUT',{imagem:uri(await imagem('red'))});assert.equal(r.status,200);assert.equal(r.data.preco,80);assert.equal(r.data.estoqueAtual,10);assert.notEqual(r.data.imagem,produto.imagem);assert.equal(store.objetos.size,antes+1);
  assert.equal((await fetch(base+anterior,{headers:{'x-empresa':'1'}})).status,200);
  const limpo=await api('/api/itens/'+produto.id,'PUT',{imagem:null});assert.equal(limpo.status,200);assert.equal(limpo.data.imagem,null);assert.equal(store.objetos.size,antes+1);
 });
 await t.test('falha de armazenamento e formato falso não gravam nova referência nem outros campos',async()=>{
  const original=store.gravar;store.gravar=async()=>{throw Object.assign(Error('Falha simulada'),{status:503,publica:true});};
  try{const r=await api('/api/itens/'+produto.id,'PUT',{preco:1,imagem:uri(await imagem('blue'))});assert.equal(r.status,503);const atual=await Produto.findByPk(produto.id);assert.equal(atual.preco,80);assert.equal(atual.imagem,null);}finally{store.gravar=original;}
  assert.equal((await api('/api/itens/'+produto.id,'PUT',{imagem:uri(Buffer.from('arquivo falso'))})).status,400);
  await assert.rejects(media.salvar(1,Buffer.alloc(8*1024*1024+1),'produtos'),e=>e.status===413);
  const wb=require('xlsx').utils.book_new();require('xlsx').utils.book_append_sheet(wb,require('xlsx').utils.aoa_to_sheet([['teste'],['ok']]),'Dados');const xls=require('xlsx').write(wb,{type:'buffer',bookType:'xls'});assert.equal((await require('../backend/services/midias/validar').validar(xls,{imagem:false})).ext,'xls');
  await assert.rejects(media.salvar(1,Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><image href="https://interno/segredo"/></svg>'),'produtos'),e=>e.status===400);
 });
 await t.test('Marketing: multipart recebe imagem e altera somente o modelo da empresa',async()=>{
  const msg=await MensagemAutomatica.create({empresaId:1,tipo:'agendamento',titulo:'Lembrete',conteudo:'Olá',ativo:true});
  const enviar=async empresa=>{const fd=new FormData();fd.set('imagem',new Blob([await imagem('purple')],{type:'image/png'}),'campanha.png');return fetch(base+'/api/marketing/mensagens/'+msg.id+'/upload-imagem',{method:'POST',headers:{'x-empresa':String(empresa)},body:fd});};
  const r=await enviar(1);assert.equal(r.status,200,await r.clone().text());marketing=(await r.json()).imagemPath;assert.match(marketing,/^\/uploads\/marketing\//);assert.equal((await msg.reload()).imagemPath,marketing);
  const antes=msg.imagemPath;assert.ok([403,404].includes((await enviar(2)).status));assert.equal((await msg.reload()).imagemPath,antes);
  assert.equal((await fetch(base+marketing,{headers:{'x-empresa':'1'}})).status,200);
 });
 await t.test('reinício/substituição de instância: novo serviço lê só banco e armazenamento externo',async()=>{
  const novo=Midias.criarServico({db,store,raizes:[path.join(dir,'disco-inexistente')]});assert.ok((await novo.ler(1,anterior)).bytes.length);assert.ok((await novo.ler(1,marketing)).bytes.length);
  const novaApp=express();novaApp.use('/uploads',require('../backend/routes/midiasRoutes').leitor({servico:novo,autenticar}));const outra=await ouvir(novaApp,t);
  assert.equal((await fetch(outra+marketing,{headers:{Authorization:'Bearer 1'}})).status,200);assert.equal((await fetch(outra+marketing,{headers:{Authorization:'Bearer 2'}})).status,404);
 });
 await t.test('deduplicação por empresa; logo público explícito e privado protegido',async()=>{
  const bytes=await imagem('yellow'),a=await media.salvar(1,bytes,'produtos'),deNovo=await media.salvar(1,bytes,'produtos'),b=await media.salvar(2,bytes,'produtos');assert.equal(a.url,deNovo.url);assert.notEqual(a.url,b.url);assert.notEqual(a.chave,b.chave);
  store.objetos.delete(a.chave);await media.salvar(1,bytes,'produtos');assert.ok(store.objetos.has(a.chave));
  const logo=await media.salvar(1,bytes,'logos',{publico:true});assert.equal((await fetch(base+logo.url)).status,200);assert.equal((await fetch(base+a.url)).status,401);
  const png=await require('../backend/services/midias/imagem').carregarImagem(1,logo.url);assert.equal((await sharp(png).metadata()).format,'png');
 });
 await t.test('WhatsApp recupera mídia persistente; confirma envio e preserva pendente se objeto faltar',async()=>{
  const real=await import('@whiskeysockets/baileys'),sockets=[];
  const service=require('../backend/services/whatsappService').criarServico({carregar:async()=>({...real,default(){const s={ev:new EventEmitter(),user:{id:'5531999990000@s.whatsapp.net'},end(){},async onWhatsApp(...ids){return[{jid:ids[0],exists:true}]},enviados:[],async sendMessage(jid,msg){this.enviados.push(msg);return{key:{id:'confirmado'}};}};sockets.push(s);return s;}}),pausaEnvio:async()=>{},carregarMidia:(id,ref)=>require("../backend/services/midias/whatsapp").carregar(id,ref)});
  try{await service.inicializarCliente(1);sockets[0].ev.emit('connection.update',{connection:'open'});assert.equal((await service.enviarMensagem(1,'31999990000','legenda',marketing)).sucesso,true);assert.equal(sockets[0].enviados[0].mimetype,'image/jpeg');assert.ok(sockets[0].enviados[0].image.length);
   const r=await service.enviarMensagem(1,'31999990000','texto','/uploads/ausente.png');assert.equal(r.sucesso,false);assert.equal(r.temporario,true);assert.equal(sockets[0].enviados.length,1);
   const wpp=require('../backend/services/whatsappService');
   t.mock.method(wpp,'isConectado',id=>service.isConectado(id));
   t.mock.method(wpp,'enviarMensagem',(...args)=>service.enviarMensagem(...args));
   const envio=await EnvioAgendado.create({empresaId:1,telefoneDestino:'5531999990000',conteudoFinal:'fila com anexo',imagemPath:'/uploads/ausente.png',dataAgendada:new Date(Date.now()-1000),status:'pendente',tentativas:0});
   const fila=require('../backend/services/whatsappQueue'),log={create:async()=>{}};
   const pendente=await fila.processarEnvio(envio,log);assert.equal(pendente.temporario,true);assert.equal((await envio.reload()).status,'pendente');assert.equal(envio.tentativas,0);
   await envio.update({imagemPath:marketing});assert.equal((await fila.processarEnvio(envio,log)).sucesso,true);assert.equal((await envio.reload()).status,'enviado');
  }finally{await service.suspender();}
 });
 await t.test('migração: dry-run, arquivo+JSON+fila, base64, ausentes, idempotência e alias antigo',async()=>{
  const bytes=await imagem('orange');await fs.writeFile(path.join(dir,'antiga.png'),bytes);
  const p=await Produto.create({id:'legado',empresa_id:1,nome:'Legado',imagem:'antiga.png'}),ausente=await Produto.create({id:'perdido',empresa_id:1,nome:'Não localizado',imagem:'sumiu.png'});
  const ag=await Agendamento.create({empresa_id:1,prontuario:JSON.stringify([{arquivos:[{url:'/uploads/antiga.png'},{url:'/uploads/antiga.png'}]}])});
  const foto=await Empresa.findByPk(1);await foto.update({logo:uri(bytes)});
  const envio=await EnvioAgendado.create({empresaId:1,telefoneDestino:'5531999990000',conteudoFinal:'programada',imagemPath:'/uploads/antiga.png',dataAgendada:new Date(Date.now()+5*86400000)});
  const {migrar}=require('../backend/services/midias/migrar'),rel=[];
  const seco=await migrar({db,media,raizes:[dir],receber:r=>rel.push(r)});assert.ok(seco.recuperaveis>=5);assert.equal(seco.migradas,0);assert.equal((await p.reload()).imagem,'antiga.png');
  const fez=await migrar({db,media,aplicar:true,raizes:[dir]});assert.ok(fez.migradas>=5,JSON.stringify(fez));assert.equal(fez.nao_localizadas,1);assert.equal(fez.erros,0);assert.equal((await ausente.reload()).imagem,'sumiu.png');assert.match((await p.reload()).imagem,/^produtos\//);assert.match((await envio.reload()).imagemPath,/^\/uploads\/marketing\//);
  const anexos=JSON.parse((await ag.reload()).prontuario)[0].arquivos;assert.ok(anexos.every(a=>a.url.startsWith('/uploads/prontuario/')));assert.ok((await media.ler(1,'/uploads/antiga.png')).bytes.length);assert.ok(await fs.stat(path.join(dir,'antiga.png')));
  const novamente=await migrar({db,media,aplicar:true,raizes:[dir]});assert.equal(novamente.migradas,0);assert.ok(novamente.ja_migradas>=5);assert.equal(novamente.nao_localizadas,1);
 });
 await t.test('migração com falha e referências sem empresa não alteram o cadastro',async()=>{
  await fs.writeFile(path.join(dir,'falha.png'),await imagem('black'));const p=await Produto.create({id:'falhamig',empresa_id:1,nome:'Falha',imagem:'falha.png'});await Produto.create({id:'semempresa',nome:'Sem empresa',imagem:'falha.png',empresa_id:null});
  const gravar=store.gravar;store.gravar=async()=>{throw Error('falha simulada')};try{const totais=await require('../backend/services/midias/migrar').migrar({db,media,aplicar:true,raizes:[dir]});assert.ok(totais.erros>=1);assert.ok(totais.sem_empresa>=1);assert.equal((await p.reload()).imagem,'falha.png');}finally{store.gravar=gravar;}
 });
 await t.test('uploads concorrentes deduplicam e migração respeita edição simultânea',async()=>{
  const bytes=await imagem('navy');
  const results=await Promise.all(Array.from({length:3},()=>media.salvar(1,bytes,'concorrencia')));assert.equal(new Set(results.map(r=>r.id)).size,1);assert.equal(new Set(results.map(r=>r.chave)).size,1);
  await fs.writeFile(path.join(dir,'conflito.png'),bytes);const p=await Produto.create({id:'conflito',empresa_id:1,nome:'Conflito',imagem:'conflito.png'});
  const original=store.ler;let alterou=false;
  store.ler=async function(k){if(!alterou&&k.includes('/produtos/')){alterou=true;await p.update({imagem:null});}return original.call(store,k);};
  try{const r=await require('../backend/services/midias/migrar').migrar({db,media,aplicar:true,raizes:[dir]});assert.ok(r.conflitos>=1,JSON.stringify(r));assert.equal((await p.reload()).imagem,null);}finally{store.ler=original;}
 });
 await t.test('legacy: bloqueia traversal, symlink e acesso a arquivo de outra empresa',async()=>{
  await assert.rejects(media.ler(1,'../package.json'),e=>e.status===404);await assert.rejects(media.ler(2,'falha.png'),e=>e.status===404);
  assert.equal(require('../backend/services/midias/remoto').publico('127.0.0.1'),false);assert.equal(require('../backend/services/midias/remoto').publico('169.254.169.254'),false);assert.equal(require('../backend/services/midias/remoto').publico('::ffff:127.0.0.1'),false);assert.equal(require('../backend/services/midias/remoto').publico('8.8.8.8'),true);
  await assert.rejects(require('../backend/services/midias/remoto').lerRemoto('https://nao-autorizado.example/arquivo.png'),e=>e.status===400);
  await assert.rejects(require('../backend/services/midias/remoto').lerRemoto('https://permitido.example/arquivo.png',{hosts:['permitido.example'],lookup:async()=>[{address:'127.0.0.1',family:4}]}),e=>e.status===400);
 });
});

test('PWA: imagem privada usa Bearer só na API conhecida e revoga blob ao sair',async()=>{
 const vm=require('node:vm'),f=require('node:fs'),handlers={},calls=[],revogados=[];let fetches=0;
 class Img{constructor(src){this.attrs={src};this.isConnected=true;}getAttribute(k){return this.attrs[k];}set src(s){this.attrs.src=s;}}
 const img=new Img('/uploads/produtos/foto.webp'),externa=new Img('https://terceiro.example/uploads/foto.webp');
 const U=class extends URL{};U.createObjectURL=()=> 'blob:teste-privado';U.revokeObjectURL=u=>revogados.push(u);
 const document={readyState:'complete',documentElement:{},querySelectorAll:()=>[img,externa],addEventListener:(e,fn)=>{handlers[e]=fn;}};
 const window={API_URL:'https://api.example',MobileAuth:{getToken:()=> 'token-de-teste'},addEventListener:(e,fn)=>{handlers[e]=fn;}};
 vm.runInNewContext(f.readFileSync(require.resolve('../frontend/midias.js'),'utf8'),{window,document,location:new URL('https://app.example/mobile/app.html'),URL:U,HTMLImageElement:Img,MutationObserver:class{observe(){}},localStorage:{getItem:()=>null},sessionStorage:{getItem:()=>null},fetch:async(u,o)=>{calls.push([String(u),o]);fetches++;return{ok:true,blob:async()=>new Blob(['png'],{type:'image/png'})};},Blob,console,setTimeout});
 await new Promise(r=>setImmediate(r));assert.equal(fetches,1);assert.equal(calls[0][1].headers.Authorization,'Bearer token-de-teste');assert.equal(calls[0][1].cache,'no-store');assert.equal(img.attrs.src,'blob:teste-privado');assert.equal(externa.attrs.src,'https://terceiro.example/uploads/foto.webp');assert.equal(window.PetHubMidias.url('produtos/id.webp'),'https://api.example/uploads/produtos/id.webp');assert.equal(window.PetHubMidias.url('/uploads/produtos/id.webp'),'https://api.example/uploads/produtos/id.webp');
 handlers.pagehide();assert.deepEqual(revogados,['blob:teste-privado']);
});

test('service worker PWA: mídias privadas passam pela rede e não pelo cache offline',async()=>{
 const vm=require('node:vm'),f=require('node:fs'),eventos={},calls=[];let cachesUsados=0;
 const self={addEventListener:(k,fn)=>{eventos[k]=fn;}};
 vm.runInNewContext(f.readFileSync(require.resolve('../frontend/mobile/service-worker.js'),'utf8'),{self,URL,console,setTimeout,clearTimeout,caches:{open:()=>{cachesUsados++;throw Error('Não usar cache privado');}},fetch:async(r,o)=>{calls.push(o);return {status:200};}});
 let response;eventos.fetch({request:{url:'https://api.example/uploads/marketing/id.webp',method:'GET'},respondWith:p=>{response=p;}});assert.equal((await response).status,200);assert.equal(calls[0].cache,'no-store');assert.equal(cachesUsados,0);
});
