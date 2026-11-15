// Execute após adicionar/remover um arquivo Markdown. Não altera artigos nem seu índice.
const fs=require('node:fs'),path=require('node:path');
const raiz=path.resolve(__dirname,'..'),indice=JSON.parse(fs.readFileSync(path.join(raiz,'data/artigos.json'),'utf8'));
const disponiveis=(indice.artigos||[]).filter(a=>/^[a-z0-9-]+$/.test(a.category)&&/^[a-z0-9-]+$/.test(a.slug)&&fs.existsSync(path.join(raiz,'artigos',a.category,a.slug+'.md'))).map(a=>a.category+'/'+a.slug);
fs.writeFileSync(path.join(raiz,'data/disponibilidade.json'),JSON.stringify({versao:1,arquivos:disponiveis},null,2)+'\n');
console.log(disponiveis.length+' guias disponíveis; '+((indice.artigos||[]).length-disponiveis.length)+' referências sem arquivo.');
