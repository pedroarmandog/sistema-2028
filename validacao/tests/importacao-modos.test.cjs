const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const code=fs.readFileSync(path.join(__dirname,'../frontend/importacao.js'),'utf8');
const pause=()=>new Promise(r=>setTimeout(r,0));
async function setup(tipo,reply){
 const dom=new JSDOM(`<div id="actions"></div><script data-tipo="${tipo}" data-alvo="#actions"></script>`,{url:'https://pethub.test/item/meus-itens.html',runScripts:'outside-only'});
 await new Promise(r=>dom.window.document.addEventListener('DOMContentLoaded',r,{once:true}));
 Object.defineProperty(dom.window.document,'currentScript',{value:dom.window.document.querySelector('script')});
 const calls=[];dom.window.fetch=async(url,options)=>{calls.push({url,options});const r=reply(url,options);return {status:r.status||200,ok:!r.status||r.status<400,text:async()=>r.html||JSON.stringify(r.body)};};dom.window.eval(code);
 return {dom,calls,d:dom.window.document};
}
test('Produtos consulta somente seus campos e confirma em /api/itens/importacao/confirmar',async()=>{
 const s=await setup('produtos',(url)=>({body:url.endsWith('/campos')?{campos:{nome:['Nome'],custoBase:['Custo'],preco:['Venda']},centros:['Loja']}:url.endsWith('/analisar')?{token:'teste',cabecalho:['Nome'],mapeamento:['nome'],linhas:[{linha:2,dados:{nome:'Ração'},acao:'criar'}],resumo:{total:1,validos:1,erros:0,duplicados:0}}:{criados:1,atualizados:0,ignorados:0,relatorio:[]}}));
 try{s.d.querySelector('button').click();await pause();assert.deepEqual(s.calls.map(c=>c.url),['/api/itens/importacao/campos']);
  const input=s.d.querySelector('input[type=file]');Object.defineProperty(input,'files',{value:[new s.dom.window.File(['teste'],'teste.csv')]});input.onchange();
  [...s.d.querySelectorAll('button')].find(b=>b.textContent==='Analisar planilha').click();await pause();
  s.d.querySelector('[data-confirmar]').click();await pause();
  assert(s.calls.some(c=>c.url==='/api/itens/importacao/analisar'));assert(s.calls.some(c=>c.url==='/api/itens/importacao/confirmar'));
  assert(!s.calls.some(c=>c.url.includes('/clientes/')||c.url.includes('/operacoes')));
 }finally{s.dom.window.close();}
});
test('Clientes conserva consulta de operações em lotes e confirma em /api/clientes/importacao/operacoes',async()=>{
 const s=await setup('clientes',url=>({body:url.endsWith('/campos')?{campos:{nome:['Nome']},centros:[]}:url.endsWith('/operacoes/atual')?{operacao:null}:url.endsWith('/analisar')?{token:'cliente',cabecalho:['Nome'],mapeamento:['nome'],linhas:[{linha:2,dados:{nome:'Tutor'},acao:'criar'}],resumo:{total:1,validos:1,erros:0,duplicados:0}}:{operacao:{id:'1',estado:'concluido',total:1,processados:1,criados:1,atualizados:0,ignorados:0,erros:0}}}));
 try{s.d.querySelector('button').click();await pause();assert.deepEqual(s.calls.map(c=>c.url),['/api/clientes/importacao/campos','/api/clientes/importacao/operacoes/atual']);
  const input=s.d.querySelector('input[type=file]');Object.defineProperty(input,'files',{value:[new s.dom.window.File(['nome\nTutor'],'clientes.csv')]});input.onchange();
  [...s.d.querySelectorAll('button')].find(b=>b.textContent==='Analisar planilha').click();await pause();s.d.querySelector('[data-confirmar]').click();await pause();
  assert(s.calls.some(c=>c.url==='/api/clientes/importacao/operacoes'));
  assert(!s.calls.some(c=>c.url.includes('/itens/')||c.url.endsWith('/confirmar')));
 }finally{s.dom.window.close();}
});
test('HTML com status 200 e erros JSON mantêm o contexto e não expõem SyntaxError',async()=>{
 for(const [tipo,response,message]of [['produtos',{html:'<!DOCTYPE html><h1>Erro</h1>'},/importação de produtos recebeu HTML.*\/api\/itens\/importacao\/campos.*HTTP 200/],['clientes',{status:403,body:{erro:'Sem permissão para clientes'}},/Sem permissão para clientes/]]){
  const s=await setup(tipo,()=>response);try{s.d.querySelector('button').click();await pause();assert.match(s.d.querySelector('.notice.error').textContent,message);}finally{s.dom.window.close();}
 }
});
test('alteração publicada preserva todo o código fora de request e versiona os dois HTMLs',()=>{
 for(const [name,tipo]of [['item/meus-itens.html','produtos'],['clientes.html','clientes']]){
  const dom=new JSDOM(fs.readFileSync(path.join(__dirname,'../frontend',name),'utf8'));const script=dom.window.document.querySelector('script[src*="importacao.js"]');assert.equal(script.dataset.tipo,tipo);assert(script.src.endsWith('?v=20261123-api2'));dom.window.close();
 }
 assert.match(code,/operacaoId:d.operacaoId/);assert.match(code,/const emLotes=\["clientes","pets"\]\.includes\(tipo\)/);
});
