'use strict';
// Ajuste local e idempotente dos arquivos existentes, sem substituir a página inteira.
const fs=require('node:fs'),path=require('node:path');
const VERSAO='20261122-thumb-contida';
function integrar(root=path.resolve(__dirname,'../..')){
 const changed=[];
 const atualizar=(rel,fn)=>{const file=path.join(root,rel);const original=fs.readFileSync(file,'utf8'),novo=fn(original);if(novo!==original){fs.writeFileSync(file,novo);changed.push(rel);}};
 atualizar('frontend/item/meus-itens.html',s=>s.replace(/((?:src|href)\s*=\s*["'][^"']*\b(?:produto-imagens\.js|meus-itens\.js|meus-itens\.css))(?:\?[^"']*)?(["'])/g,(_,url,q)=>url+'?v='+VERSAO+q));
 atualizar('frontend/item/meus-itens.js',s=>s.replace(/(\/components\/produto-imagens\.js)(?:\?[^'"\s]*)?/g,(_,url)=>url+'?v='+VERSAO));
 atualizar('frontend/item/meus-itens.css',s=>s.replace(/(\.product-image\s*\{)([^}]*)(\})/,(_,open,body,close)=>{
  if(/\bposition\s*:/.test(body))return open+body.replace(/\bposition\s*:[^;]+;/,'position: relative;')+close;
  const nl=body.includes('\r\n')?'\r\n':'\n';return open+nl+'  position: relative;'+body+close;
 }));
 return changed;
}
if(require.main===module){const files=integrar();console.log(files.length?'Arquivos atualizados: '+files.join(', '):'A correção já está integrada.');}
module.exports={integrar,VERSAO};
