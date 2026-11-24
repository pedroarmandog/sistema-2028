const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {JSDOM}=require('jsdom');
const {integrar,aplicar}=require('../scripts/restaurar-botao-importar-produtos.cjs');
const raiz=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(raiz,'frontend/item/meus-itens.html'),'utf8');
const codigo=fs.readFileSync(path.join(raiz,'frontend/importacao.js'),'utf8');
test('integra somente os recursos do importador e não duplica ao reaplicar',()=>{
 const original='<html><head><link href="dashboard.css"></head><body><div class="action-bar"><button>Exportar</button></div><p>catálogo preservado</p></body></html>';
 const novo=integrar(original);assert.equal(integrar(novo),novo);
 assert.equal(novo.replace(/<link rel="stylesheet" href="\.\.\/importacao[^>]+>\n/,'').replace(/<script src="\.\.\/importacao[^>]+><\/script>\n/,''),original);
 const dom=new JSDOM(html);const scripts=dom.window.document.querySelectorAll('script[src*="importacao.js"]');
 assert.equal(scripts.length,1);assert.equal(scripts[0].dataset.tipo,'produtos');assert.equal(scripts[0].dataset.alvo,'.action-bar');
 assert.equal(dom.window.document.querySelectorAll('link[href*="importacao.css"]').length,1);dom.window.close();
});
test('instalador preserva importador já instalado e recupera somente recursos ausentes',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ph-import-'));
 try{
  fs.mkdirSync(path.join(dir,'frontend/item'),{recursive:true});fs.mkdirSync(path.join(dir,'recuperacao-importacao/frontend'),{recursive:true});
  fs.writeFileSync(path.join(dir,'frontend/item/meus-itens.html'),html);
  fs.writeFileSync(path.join(dir,'frontend/importacao.js'),'versão instalada preservada');
  fs.writeFileSync(path.join(dir,'recuperacao-importacao/frontend/importacao.css'),'.css{}');
  assert.deepEqual(aplicar(dir).recuperados,['importacao.css']);
  assert.equal(fs.readFileSync(path.join(dir,'frontend/importacao.js'),'utf8'),'versão instalada preservada');
  assert.deepEqual(aplicar(dir).recuperados,[]);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
async function pagina(fetch){
 const dom=new JSDOM(html,{url:'https://pethub.test/item/meus-itens.html',runScripts:'outside-only'});
 await new Promise(r=>dom.window.document.addEventListener('DOMContentLoaded',r,{once:true}));
 const script=dom.window.document.querySelector('script[src*="importacao.js"]');
 Object.defineProperty(dom.window.document,'currentScript',{configurable:true,value:script});
 dom.window.fetch=async(...args)=>{const r=await fetch(...args);return {headers:{get:()=> 'application/json'},...r,text:async()=>JSON.stringify(await r.json())};};dom.window.eval(codigo);return dom;
}
const esperar=()=>new Promise(r=>setTimeout(r,0));
test('botão aparece na barra real e abre o modal de produtos usando a API existente',async()=>{
 const requests=[];const dom=await pagina(async(url,opts)=>{requests.push([url,opts]);return{ok:true,json:async()=>({campos:{nome:['Nome']},centros:['Loja'],limites:{linhas:2500}})}});
 try{
  const d=dom.window.document;const b=d.querySelector('.action-bar .ph-import-launch');assert.equal(b.textContent,'Importar Produtos');
  assert.equal(requests.length,0);b.click();await esperar();
  assert.equal(d.querySelector('[role=dialog]').getAttribute('aria-label'),'Importar Produtos');
  assert.equal(requests[0][0],'/api/itens/importacao/campos');assert.equal(requests[0][1].credentials,'include');
  assert.equal(d.querySelector('a[download]').getAttribute('href'),'/api/itens/importacao/modelo');
  assert.equal(d.querySelector('input[type=file]').accept,'.csv,.xls,.xlsx');
  assert.equal(d.querySelector('[data-confirmar]').disabled,true);
  d.querySelector('.ph-import header button').click();assert.equal(d.querySelector('.ph-import-backdrop'),null);
  assert.equal(requests.length,1);
 }finally{dom.window.close();}
});
test('erro da API é mostrado dentro do modal sem remover o botão ou alterar produtos',async()=>{
 const dom=await pagina(async()=>({ok:false,json:async()=>({erro:'Sem permissão para importar'})}));
 try{const d=dom.window.document;d.querySelector('.ph-import-launch').click();await esperar();
  assert.equal(d.querySelector('.notice.error').textContent,'Sem permissão para importar');assert.equal(d.querySelector('[data-confirmar]').disabled,true);
  assert.ok(d.querySelector('.action-bar .ph-import-launch'));
 }finally{dom.window.close();}
});
