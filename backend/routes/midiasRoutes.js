const {instancia,falha}=require('../services/midias');const {authUser}=require('../middleware/authUser');
function leitor({servico,autenticar=authUser}={}){return async(req,res)=>{
 try{
  if(!["GET","HEAD"].includes(req.method))return res.set("Allow","GET, HEAD").sendStatus(405);
  const ref=decodeURIComponent(req.path.replace(/^\//,''));if(!ref||ref.includes('..'))throw falha('Arquivo não encontrado.',404);
  const media=servico||instancia(),publica=await media.buscar(null,ref,{publico:true});
  const enviar=async()=>{const r=publica?{bytes:await media.store.ler(publica.chave),tipo:publica.tipo,id:publica.id,publico:true}:await media.ler(req.user.empresaId,ref);
   res.set({'Content-Type':r.tipo,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Cache-Control':r.publico?'public, max-age=86400':'private, no-store','Vary':'Cookie, Authorization','Content-Length':String(r.bytes.length)});if(!r.tipo.startsWith('image/'))res.set('Content-Disposition','inline; filename="arquivo.'+(require('mime-types').extension(r.tipo)||'bin')+'"');res.send(r.bytes);
  };
  if(publica)return await enviar();
  // <img> e links não enviam Bearer: aceitar somente o cookie HttpOnly já
  // emitido pelo ERP nesta leitura, mantendo as demais verificações do authUser.
  if(!req.headers.authorization&&req.cookies?.pethub_token)req.headers.authorization='Bearer '+req.cookies.pethub_token;
  return await new Promise(resolve=>{autenticar(req,res,()=>{Promise.resolve(enviar()).catch(e=>res.status(e.status||503).json({erro:e.publica?e.message:'Não foi possível carregar o arquivo.'})).finally(resolve);});res.once('finish',resolve);});
 }catch(e){return res.status(e.status||503).json({erro:e.publica?e.message:'Não foi possível carregar o arquivo.'});}
};}
module.exports={leitor};
