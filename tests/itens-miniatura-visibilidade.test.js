'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{JSDOM,VirtualConsole}=require('jsdom'),postcss=require('postcss');
const root=path.resolve(__dirname,'..');
function app(t){
 const d=new JSDOM('<!doctype html><html><head></head><body><main><div id="productsGrid"></div></main></body></html>',{url:'https://pethub.test/item/meus-itens.html',runScripts:'outside-only',virtualConsole:new VirtualConsole()});t.after(()=>d.window.close());
 const w=d.window;w.document.addEventListener=()=>{};
 w.eval(fs.readFileSync(path.join(root,'frontend/components/produto-imagens.js'),'utf8'));
 w.eval(fs.readFileSync(path.join(root,'frontend/item/meus-itens.js'),'utf8'));
 return w;
}
for(const state of ['','static'])test('card criado fora do DOM com position '+JSON.stringify(state)+' limita placeholder à foto',t=>{
 const w=app(t),original=w.getComputedStyle.bind(w);w.getComputedStyle=n=>n.isConnected?original(n):{position:state};
 const card=w.criarCardProduto({id:5,nome:'HOT CAT',tipo:'produto',preco:189.75,imagem:'/uploads/foto-ausente.png'});
 const box=card.querySelector('.product-image'),img=box.querySelector('img'),placeholder=box.querySelector('[data-produto-placeholder]');
 assert.equal(card.isConnected,false);assert.equal(box.style.position,'relative');assert.equal(placeholder.style.position,'absolute');assert.equal(placeholder.style.inset,'0');assert.equal(placeholder.style.pointerEvents,'none');
 w.document.getElementById('productsGrid').append(card);
 img.dispatchEvent(new w.Event('error'));
 assert.equal(img.hasAttribute('src'),false);assert.equal(placeholder.style.display,'flex');assert.equal(box.style.position,'relative');assert.match(card.textContent,/HOT CAT/);assert.match(card.textContent,/189,75/);
});
test('oito produtos continuam no grid quando todas as miniaturas respondem com erro',async t=>{
 const w=app(t),rows=Array.from({length:8},(_,i)=>({id:String(i+1),nome:'Produto '+i,tipo:'produto',preco:i+10,estoqueAtual:2,imagem:'/uploads/ausente-'+i+'.png'}));
 w.ApiClient={getProdutos:async()=>rows,getVendas:async()=>[]};
 await w.inicializarProdutosLista();w.renderizarProdutos('todos');
 const grid=w.document.getElementById('productsGrid');assert.equal(grid.querySelectorAll('.product-card').length,8);
 for(const img of grid.querySelectorAll('img'))img.dispatchEvent(new w.Event('error'));
 for(const card of grid.querySelectorAll('.product-card')){
  assert.equal(card.querySelector('.product-image').style.position,'relative');
  assert.equal(card.querySelector('[data-produto-placeholder]').style.display,'flex');
  assert.ok(card.querySelector('.product-title').textContent.startsWith('Produto '));
 }
 assert.equal(grid.querySelectorAll('.product-card').length,8);assert.equal(grid.style.display,'');assert.equal(w.document.querySelector('main').style.display,'');
});
test('foto carregada esconde apenas placeholder; posição explícita de outros componentes é preservada',t=>{
 const w=app(t);for(const pos of ['relative','absolute','fixed']){
  const box=w.document.createElement('span'),img=w.document.createElement('img');box.style.position=pos;box.append(img);w.document.body.append(box);
  w.PetHubProdutoImagem.aplicar(img,{id:'3',imagem:'foto.png'});assert.equal(box.style.position,pos);
  img.dispatchEvent(new w.Event('load'));assert.equal(img.style.opacity,'1');assert.equal(box.querySelector('[data-produto-placeholder]').style.display,'none');
 }
});
test('CSS e HTML garantem contenção desde o primeiro card e atualizam versão dos recursos',()=>{
 const css=postcss.parse(fs.readFileSync(path.join(root,'frontend/item/meus-itens.css'),'utf8'));
 let position;css.walkRules('.product-image',r=>r.walkDecls('position',d=>position=d.value));assert.equal(position,'relative');
 const html=fs.readFileSync(path.join(root,'frontend/item/meus-itens.html'),'utf8');
 for(const file of ['produto-imagens.js','meus-itens.js','meus-itens.css'])assert.ok(html.includes(file+'?v=20261122-thumb-contida'),file);
});
test('instalador atualiza somente recursos e contenção, preserva HTML atual e é idempotente',t=>{
 const os=require('node:os'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'pethub-thumb-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const dir=path.join(temp,'frontend/item');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'meus-itens.html'),'<script src="/components/produto-imagens.js?v=antiga"></script><script src="./meus-itens.js?v=20261121-orc1"></script><link href="./meus-itens.css"><div id="customizacao-empresa">Preservar</div>');
 fs.writeFileSync(path.join(dir,'meus-itens.js'),"const src='/components/produto-imagens.js?v=antiga'; // manter funções");
 fs.writeFileSync(path.join(dir,'meus-itens.css'),'.product-image {\r\n  width: 80px;\r\n  height: 80px;\r\n}\r\n.custom {color:red}');
 const {integrar}=require('../backend/scripts/corrigir-miniaturas-itens');assert.equal(integrar(temp).length,3);assert.deepEqual(integrar(temp),[]);
 const html=fs.readFileSync(path.join(dir,'meus-itens.html'),'utf8');assert.match(html,/id="customizacao-empresa">Preservar/);assert.match(html,/produto-imagens.js\?v=20261122-thumb-contida/);
 const css=fs.readFileSync(path.join(dir,'meus-itens.css'),'utf8');assert.match(css,/position: relative;/);assert.match(css,/width: 80px/);assert.match(css,/\.custom \{color:red\}/);
});
