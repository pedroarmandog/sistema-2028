const crypto=require('node:crypto'),{DataTypes}=require('sequelize');
const {criarArmazenamento,falha}=require('./armazenamento');const {validar,base64}=require('./validar');
function modelo(db){return db.models.MidiaArquivo||db.define('MidiaArquivo',{
 id:{type:DataTypes.STRING(36),primaryKey:true},empresa_id:{type:DataTypes.INTEGER,allowNull:false},modulo:{type:DataTypes.STRING(40),allowNull:false},
 chave:{type:DataTypes.STRING(300),allowNull:false},caminho:{type:DataTypes.STRING(160),allowNull:false},sha256:{type:DataTypes.STRING(64),allowNull:false},
 tipo:{type:DataTypes.STRING(150),allowNull:false},tamanho:{type:DataTypes.INTEGER,allowNull:false},publico:{type:DataTypes.BOOLEAN,allowNull:false,defaultValue:false},aliases:{type:DataTypes.JSON,allowNull:true},
 },{tableName:'midias_arquivos',indexes:[{name:'midias_conteudo_empresa',unique:true,fields:['empresa_id','modulo','sha256','publico']},{name:'midias_caminho',unique:true,fields:['caminho']},{name:'midias_empresa',fields:['empresa_id']}]});}
function localizar(valor){
 if(typeof valor!=='string')return null;let v=valor.replace(/\\/g,'/');if(/^https?:\/\//i.test(v)){try{const u=new URL(v);if(!u.pathname.startsWith('/uploads/'))return null;v=u.pathname;}catch{return null;}}
 const i=v.indexOf('/uploads/');if(i>=0)v=v.slice(i+9);else v=v.replace(/^\/?uploads\//,'').replace(/^\//,'');
 if(!v||v.includes('..')||v.includes('\0')||v.includes('?')||v.includes('#')||v.length>768||v.startsWith('data:')||/^[a-z]:/i.test(v))return null;
 return v;
}
function criarServico({db,store=criarArmazenamento(),raizes}={}){
 const Media=modelo(db);let preparada;
 const preparar=()=>preparada??=Media.sync().catch(e=>{preparada=null;throw e;});
 function empresaValida(emp){if(!Number.isSafeInteger(Number(emp))||Number(emp)<1)throw falha('Empresa não identificada para o arquivo.',403);return Number(emp);}
 async function buscar(emp,ref,{publico=false}={}){
  const caminho=localizar(ref);if(!caminho)return null;await preparar();
  const where=publico?{publico:true}: {empresa_id:empresaValida(emp)};
  const id=/(?:^|\/)([a-f0-9-]{36})\.[a-z0-9]+$/i.exec(caminho)?.[1];
  if(id){const r=await Media.findOne({where:{...where,id}});return r&&r.caminho===caminho?r:null;}
  if(publico)return null;
  const rows=await Media.findAll({where});return rows.find(r=>{let a=r.aliases;try{if(typeof a==='string')a=JSON.parse(a);}catch{a=[];}return Array.isArray(a)&&a.includes(caminho);})||null;
 }
 async function salvar(emp,bytes,modulo,{imagem=true,publico=false,otimizar=true,alias}={}){
  emp=empresaValida(emp);if(!/^[a-z0-9-]{1,40}$/.test(modulo))throw falha('Módulo de arquivo inválido.',400);
  const v=await validar(bytes,{imagem,otimizar}),digest=crypto.createHash('sha256').update(v.bytes).digest('hex');await preparar();
  let r=await Media.findOne({where:{empresa_id:emp,modulo,sha256:digest,publico}});
  const chave=`empresas/${emp}/${modulo}/${publico?'publico':'privado'}/${digest}.${v.ext}`;
  // Reconfirmar também em reenvios deduplicados, reparando objeto ausente.
  await store.gravar(chave,v.bytes,v.tipo,digest);
  if(!r){const id=crypto.randomUUID();
   try{r=await Media.create({id,empresa_id:emp,modulo,chave,caminho:`${modulo}/${id}.${v.ext}`,sha256:digest,tipo:v.tipo,tamanho:v.bytes.length,publico,aliases:alias?[localizar(alias)].filter(Boolean):[]});}
   catch(e){if(e.name!=='SequelizeUniqueConstraintError')throw falha('Arquivo enviado, mas não foi possível registrar sua referência. O cadastro anterior foi preservado.');r=await Media.findOne({where:{empresa_id:emp,modulo,sha256:digest,publico}});if(!r)throw e;}
  }
  if(alias){const a=localizar(alias);if(a)await db.transaction(async transaction=>{const locked=await Media.findByPk(r.id,{transaction,lock:transaction.LOCK.UPDATE});const aliases=typeof locked.aliases==='string'?JSON.parse(locked.aliases):locked.aliases||[];if(!aliases.includes(a))await locked.update({aliases:[...aliases,a]},{transaction});});}
  return {id:r.id,empresa_id:emp,chave:r.chave,caminho:r.caminho,url:'/uploads/'+r.caminho,filename:r.caminho.split('/').at(-1),tipo:r.tipo,tamanho:r.tamanho};
 }
 async function referencia(emp,valor,modulo,{anterior,formato='url',publico=false}={}){
  if(valor===undefined)return undefined;if(valor===null||valor==='')return null;
  if(typeof valor!=='string')throw falha('Referência de imagem inválida.',400);
  if(valor===anterior&&!valor.startsWith('data:'))return valor;
  let r;if(valor.startsWith('data:'))r=await salvar(emp,base64(valor),modulo,{publico});
  else{r=await buscar(emp,valor);if(!r)throw falha('Arquivo não pertence à empresa ou ainda não foi migrado. Envie novamente o arquivo ou execute a migração.',400);r={caminho:r.caminho,url:'/uploads/'+r.caminho};}
  return formato==='nome'?r.caminho:r.url;
 }
 async function importar(emp,ref,modulo,opcoes={}){
  if(typeof ref==='string'&&/^https?:\/\//i.test(ref)){
   const u=new URL(ref),path=u.pathname;
   const existente=path.startsWith('/uploads/')?await buscar(emp,path):null;
   if(existente)return referencia(emp,path,modulo,opcoes);
   const hosts=(process.env.MEDIA_IMPORT_HOSTS||'').split(',').map(s=>s.trim()).filter(Boolean);
   const remoto=await require('./remoto').lerRemoto(ref,{hosts});
   const r=await salvar(emp,remoto.bytes,modulo);return opcoes.formato==='nome'?r.caminho:r.url;
  }
  return referencia(emp,ref,modulo,opcoes);
 }
 async function ler(emp,ref){
  const r=await buscar(emp,ref);if(r)return {bytes:await store.ler(r.chave),tipo:r.tipo,tamanho:r.tamanho,id:r.id,publico:r.publico};
  const legado=require('./legados');return legado.lerAutorizado({db,empresa:empresaValida(emp),referencia:ref,raizes});
 }
 return {Media,preparar,buscar,salvar,referencia,importar,ler,store};
}
let singleton;function instancia(){return singleton??=criarServico({db:require('../../models/Cliente').sequelize});}
module.exports={modelo,criarServico,instancia,localizar,falha};
