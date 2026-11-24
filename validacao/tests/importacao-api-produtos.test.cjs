const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const express=require('express'),{Sequelize,DataTypes}=require('sequelize');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const patch=require('../scripts/corrigir-api-importacao-produtos.cjs');
function load(name,stubs){const module={exports:{}};const file=path.join(root,name);const real=require('node:module').createRequire(file);
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{module,exports:module.exports,require:n=>Object.hasOwn(stubs,n)?stubs[n]:real(n),__dirname:path.dirname(file),Buffer,console,process,setTimeout,clearTimeout});return module.exports;}
test('restauração registra importação antes dos IDs e é idempotente sem alterar os outros handlers',()=>{
 const src='const router = express.Router();\nrouter.get("/:id", handler);';
 const after=patch.rota(src);assert(after.indexOf('router.use("/importacao"')<after.indexOf('router.get("/:id"'));
 assert.equal(patch.rota(after),after);assert(after.endsWith('router.get("/:id", handler);'));
 assert.equal(patch.rota(src,'app.use("/api/itens/importacao", existente);'),src);
 const js=fs.readFileSync(path.join(root,'frontend/importacao.js'),'utf8');assert.equal(patch.cliente(js),js);
});
test('rotas reais abrem campos/modelo, analisam XLSX, confirmam e isolam empresas',async t=>{
 const db=new Sequelize({dialect:'sqlite',storage:':memory:',logging:false,dialectModule:require('./helpers/sqlite-caixa')});
 const Cliente=db.define('Cliente',{nome:DataTypes.STRING,empresa_id:DataTypes.INTEGER});
 const Empresa=db.define('Empresa',{});const Usuario=db.define('Usuario',{permissoes:DataTypes.JSON});
 const Produto=load('backend/models/Produto.js',{'./Cliente':{sequelize:db}});
 const banco=load('backend/services/importacao/modelos.js',{'../../models/Cliente':{sequelize:db}});
 const campos=require('../backend/services/importacao/campos');
 const servico=load('backend/services/importacao/servico.js',{'../../models/Cliente':{Cliente},'../../models/Produto':Produto,'../../models':{Empresa},'./modelos':banco,'./campos':campos});
 const {exigePermissao}=load('backend/middleware/exigePermissao.js',{'../models':{Usuario}});
 const authUser=(req,res,next)=>{const ids={'Bearer loja1':[1,1],'Bearer loja2':[2,2],'Bearer restrito':[3,1]};const idsUser=ids[req.headers.authorization];if(!idsUser)return res.status(401).json({erro:'Não autenticado'});req.user={id:idsUser[0],empresaId:idsUser[1]};next();};
 const routes=load('backend/routes/importacaoRoutes.js',{'../middleware/authUser':{authUser},'../middleware/exigePermissao':{exigePermissao},'../services/importacao/modelos':banco,'../services/importacao/servico':servico,'../services/importacao/campos':campos});
 await db.sync();await Empresa.bulkCreate([{id:1},{id:2}]);await Usuario.bulkCreate([{id:1,permissoes:['item.novo.produto']},{id:2,permissoes:['item.novo.produto']},{id:3,permissoes:['cliente.novo']}]);
 await banco.Centro.bulkCreate([{empresa_id:1,descricao:'Loja',slug:'loja'},{empresa_id:2,descricao:'Outra Loja',slug:'outra'}]);
 const app=express();app.use(express.json());const item=express.Router();item.use('/importacao',routes.criarRotas('produtos'));item.get('/:id',(req,res)=>res.status(404).json({error:'Produto não encontrado'}));app.use('/api/itens',item);
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await db.close();});
 const base='http://127.0.0.1:'+server.address().port+'/api/itens/importacao';
 async function api(suffix,{auth='loja1',body,form}={}){const r=await fetch(base+suffix,{method:body||form?'POST':'GET',headers:{...(auth?{Authorization:'Bearer '+auth}:{}),...(body?{'Content-Type':'application/json'}:{})},body:form||(body&&JSON.stringify(body))});return{status:r.status,type:r.headers.get('content-type'),body:await r.text()};}
 const campos1=await api('/campos');assert.equal(campos1.status,200);assert.match(campos1.type,/json/);assert.deepEqual(JSON.parse(campos1.body).centros,['Loja']);
 assert.deepEqual(JSON.parse((await api('/campos',{auth:'loja2'})).body).centros,['Outra Loja']);
 assert.equal((await api('/campos',{auth:null})).status,401);assert.equal((await api('/campos',{auth:'restrito'})).status,403);
 const model=await api('/modelo');assert.equal(model.status,200);assert.match(model.type,/csv/);assert(model.body.includes('Custo'));
 const XLSX=require('xlsx');const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['Nome','Custo','Venda','Estoque atual','Observação'],['Produto teste',9.99,15.98,8,'Teste']]));
 const form=new FormData();form.append('arquivo',new Blob([XLSX.write(book,{type:'buffer',bookType:'xlsx'})]),'teste.xlsx');form.append('centroPadrao','Loja');
 const analysis=await api('/analisar',{form});assert.equal(analysis.status,200,analysis.body);const preview=JSON.parse(analysis.body);assert.equal(preview.resumo.validos,1);assert.equal(preview.linhas[0].dados.preco,15.98);
 const stolen=await api('/confirmar',{auth:'loja2',body:{token:preview.token,escolhas:{}}});assert.equal(stolen.status,404);
 const confirmation=await api('/confirmar',{body:{token:preview.token,escolhas:{}}});assert.equal(confirmation.status,200,confirmation.body);assert.equal(JSON.parse(confirmation.body).criados,1);
 const product=await Produto.findOne({where:{empresa_id:1}});assert.equal(Number(product.preco),15.98);assert.equal(product.estoqueAtual,8);assert.equal(await Produto.count({where:{empresa_id:2}}),0);
 assert.equal(JSON.parse((await api('/confirmar',{body:{token:preview.token,escolhas:{}}})).body).criados,1);assert.equal(await Produto.count(),1);
 if(process.env.PETHUB_TEST_PLANILHA){
  const form=new FormData();form.append('arquivo',new Blob([fs.readFileSync(process.env.PETHUB_TEST_PLANILHA)]),'cliente.xlsx');form.append('centroPadrao','Loja');
  const real=await api('/analisar',{form});assert.equal(real.status,200,real.body);
  const p=JSON.parse(real.body);assert.equal(p.resumo.validos,95);assert.equal(p.resumo.erros,0);assert.equal(p.linhas.reduce((s,r)=>s+r.dados.estoqueAtual,0),604);
  const c=await api('/confirmar',{body:{token:p.token,escolhas:{}}});assert.equal(c.status,200,c.body);assert.equal(JSON.parse(c.body).criados,95);
  assert.equal(await Produto.count({where:{empresa_id:1}}),96);assert.equal(await Produto.count({where:{empresa_id:2}}),0);
 }
});
test('frontend apresenta diagnóstico do 404 HTML em vez de Unexpected token',async()=>{
 const dom=new JSDOM('<div class="action-bar"></div><script data-tipo="produtos" data-alvo=".action-bar"></script>',{url:'https://pethub.test/item/meus-itens.html',runScripts:'outside-only'});
 try{
  await new Promise(r=>dom.window.document.addEventListener('DOMContentLoaded',r,{once:true}));
  Object.defineProperty(dom.window.document,'currentScript',{value:dom.window.document.querySelector('script')});
  dom.window.fetch=async()=>({status:404,ok:false,headers:{get:()=> 'text/html'},text:async()=> '<!DOCTYPE html><p>404</p>'});
  dom.window.eval(fs.readFileSync(path.join(root,'frontend/importacao.js'),'utf8'));dom.window.document.querySelector('.ph-import-launch').click();await new Promise(r=>setTimeout(r,0));
  assert.match(dom.window.document.querySelector('.notice.error').textContent,/importação de produtos recebeu HTML.*HTTP 404/);
 }finally{dom.window.close();}
});
