const fs=require('node:fs'),path=require('node:path');
const arquivos=['backend/routes/importacaoRoutes.js','backend/services/importacao/campos.js','backend/services/importacao/arquivo-worker.js','backend/services/importacao/modelos.js','backend/services/importacao/servico.js','backend/utils/sexoCliente.js','backend/scripts/preparar-importacao.js'];
function rota(src,app='') {
  if(/router\.use\(\s*['"]\/importacao['"]/.test(src)||/app\.use\(\s*['"]\/api\/itens\/importacao['"]/.test(app))return src;
  const anchor=/const router\s*=\s*express\.Router\(\);/;
  if(!anchor.test(src))throw Error('itemRoutes.js não reconhecido. Nenhum arquivo foi alterado.');
  return src.replace(anchor,'$&\n// Importação precisa ser registrada antes das rotas de itens por ID.\nrouter.use("/importacao", require("./importacaoRoutes").criarRotas("produtos"));');
}
function cliente(src){
 if(src.includes('ph-import-resposta-json-v1'))return src;
 const anchor='    const d = await r.json();';
 if(!src.includes(anchor))throw Error('importacao.js não reconhecido. Nenhum arquivo foi alterado.');
 return src.replace(anchor,`    // ph-import-resposta-json-v1: não interpretar a página HTML de erro como JSON.
    if (!(r.headers.get("content-type") || "").toLowerCase().includes("json")) {
      throw new Error(r.status === 404
        ? "A API de importação não foi encontrada (HTTP 404). Publique a correção do backend e reinicie o serviço."
        : "A API de importação retornou uma resposta inesperada (HTTP " + r.status + "). Tente novamente ou confira a publicação do backend.");
    }
    const d = await r.json();`).replace('d.erro || d.error || "Falha ao acessar a importação."','d.erro || d.error || d.mensagem || "Falha ao acessar a importação."');
}
function aplicar(root=path.resolve(__dirname,'..')){
 const rp=path.join(root,'backend/routes/itemRoutes.js'),fp=path.join(root,'frontend/importacao.js');
 const r=fs.readFileSync(rp,'utf8'),f=fs.readFileSync(fp,'utf8');
 const app=fs.readFileSync(path.join(root,'backend/app.js'),'utf8');
 const rr=rota(r,app),ff=cliente(f);
 const hp=path.join(root,'frontend/item/meus-itens.html');
 const h=fs.readFileSync(hp,'utf8');
 const hh=h.replace(/src=(['"])([^'"\s]*importacao\.js)(?:\?[^'"]*)?\1/g,'src=$1$2?v=20261123-api1$1');
 const faltantes=arquivos.filter(n=>!fs.existsSync(path.join(root,n)));
 for(const n of faltantes)if(!fs.existsSync(path.join(root,'recuperacao-api-importacao',n)))throw Error('Recurso ausente no pacote: '+n);
 for(const n of faltantes){fs.mkdirSync(path.dirname(path.join(root,n)),{recursive:true});fs.copyFileSync(path.join(root,'recuperacao-api-importacao',n),path.join(root,n),fs.constants.COPYFILE_EXCL);}
 if(rr!==r)fs.writeFileSync(rp,rr);if(ff!==f)fs.writeFileSync(fp,ff);if(hh!==h)fs.writeFileSync(hp,hh);
 return{rotaIntegrada:rr!==r,frontendAtualizado:ff!==f,recuperados:faltantes};
}
module.exports={rota,cliente,aplicar,arquivos};
if(require.main===module){try{console.log(aplicar());}catch(e){console.error(e.message);process.exitCode=1;}}
