const fs=require('node:fs/promises'),path=require('node:path'),{Op}=require('sequelize');
const {falha}=require('./armazenamento');
const campos=/imagem|foto|logo|assinatura|anexo|prontuario|documento/i;
const referencia=v=>typeof v==='string'&&(/^data:image\//i.test(v)||/\/uploads\//.test(v)||/^uploads\//.test(v)||/(?:^|\/)[^/\s]+\.(?:png|jpe?g|webp|gif|svg|pdf|docx|xlsx?)(?:\?[^\s]*)?$/i.test(v));
function percorrer(v,caminho=[],saida=[]){
 if(typeof v==='string'){
  if(/^[\[{]/.test(v.trim())){try{return percorrer(JSON.parse(v),[...caminho,'$json'],saida);}catch{}}
  if(referencia(v))saida.push({referencia:v,caminho});
 }else if(Array.isArray(v))v.forEach((x,i)=>percorrer(x,[...caminho,i],saida));
 else if(v&&typeof v==='object')for(const[k,x]of Object.entries(v))percorrer(x,[...caminho,k],saida);
 return saida;
}
function substituir(valor,caminho,novo){
 if(!caminho.length)return novo;const [k,...rest]=caminho;
 if(k==='$json')return JSON.stringify(substituir(JSON.parse(valor),rest,novo));
 const copia=Array.isArray(valor)?[...valor]:{...valor};copia[k]=substituir(copia[k],rest,novo);return copia;
}
async function inventariar(db,{empresa,receber,erro=()=>{}}){
 for(const M of Object.values(db.models)){
  if(/MidiaArquivo|Whatsapp|Sessao|Token|Backup|Push|ConfiguracaoFiscal|NotaFiscal/.test(M.name))continue;const nomes=Object.keys(M.rawAttributes).filter(k=>campos.test(k)||M.rawAttributes[k].type.key==='JSON');if(!nomes.length)continue;
  const pk=M.primaryKeyAttribute;if(!pk)continue;const owner=M.rawAttributes.empresa_id?'empresa_id':M.rawAttributes.empresaId?'empresaId':M.name==='Empresa'?pk:null;
  const painel=M.name==='EmpresaPainel',attrs=[...new Set([pk,...nomes,...(owner?[owner]:[]),...(painel?['cnpj']:[])])];let cursor=null;
  try{while(true){const where={};if(owner&&empresa)where[owner]=empresa;if(cursor!=null)where[pk]={[Op.gt]:cursor};
   const rows=await M.findAll({where,attributes:attrs,limit:200,order:[[pk,'ASC']]});if(!rows.length)break;
   for(const row of rows){let dono=owner?Number(row[owner]):null;
    if(painel&&row.cnpj){const c=await db.models.Empresa.findOne({where:{cnpj:row.cnpj},attributes:['id']});dono=c?.id||null;}
    if(empresa&&Number(dono)!==Number(empresa))continue;
    for(const campo of nomes){const valor=row[campo];for(const ref of percorrer(valor))await receber({M,pk,id:row[pk],empresa:dono||null,campo,valor,...ref});}
   }cursor=rows.at(-1)[pk];if(rows.length<200)break;
  }}catch(e){await erro({modelo:M.name,codigo:e.original?.code||e.name});}
 }
}
function raizesPadrao(){return [...new Set([path.resolve(__dirname,'../../../uploads'),path.resolve(process.cwd(),'uploads'),...(process.env.MEDIA_LEGACY_ROOT?[process.env.MEDIA_LEGACY_ROOT]:[])])];}
async function arquivoLocal(ref,raizes=raizesPadrao()){
 const local=require('./index').localizar(ref);if(!local)return null;
 for(const dir of raizes){try{const raiz=await fs.realpath(dir),alvo=await fs.realpath(path.resolve(raiz,local));if(alvo!==raiz&&!alvo.startsWith(raiz+path.sep))continue;const stat=await fs.stat(alvo);if(!stat.isFile()||stat.size>20*1024*1024)continue;return {bytes:await fs.readFile(alvo),origem:'arquivo-local'};}catch(e){if(!['ENOENT','ENOTDIR'].includes(e.code))throw e;}}
 return null;
}
async function lerAutorizado({db,empresa,referencia:ref,raizes}){
 const local=require('./index').localizar(ref);if(!local)throw falha('Arquivo não encontrado.',404);
 const arquivo=await arquivoLocal(ref,raizes);if(!arquivo)throw falha('Arquivo legado não localizado. Consulte o relatório de migração.',404);
 let autorizado=false,falhou=false;await inventariar(db,{empresa,receber:async r=>{if(require('./index').localizar(r.referencia)===local)autorizado=true;},erro:()=>{falhou=true;}});
 if(!autorizado)throw falha(falhou?'Não foi possível verificar o acesso ao arquivo.':'Arquivo não encontrado.',falhou?503:404);
 const validado=await require('./validar').validar(arquivo.bytes,{imagem:false,otimizar:false});return {bytes:validado.bytes,tipo:validado.tipo,tamanho:validado.bytes.length,legado:true};
}
module.exports={inventariar,percorrer,substituir,arquivoLocal,raizesPadrao,lerAutorizado,referencia};
