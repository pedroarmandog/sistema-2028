const multer=require('multer');const {instancia,falha}=require('./index');
let ativos=0;const espera=[];
function vaga(fn){return new Promise((resolve,reject)=>{const executar=()=>{ativos++;Promise.resolve().then(fn).then(resolve,reject).finally(()=>{ativos--;espera.shift()?.();});};if(ativos<2)executar();else if(espera.length<8)espera.push(executar);else reject(falha('Há uploads em andamento. Aguarde e tente novamente.',429));});}
function upload(modulo,{imagem=true,publico=false,transitorios=[]}={}){
 const storage={
  _handleFile(req,file,done){
   file.stream.pause();vaga(async()=>{
    if(!req.user?.empresaId)throw falha('Empresa não identificada para o arquivo.',403);
    const chunks=[];let tamanho=0;for await(const chunk of file.stream){tamanho+=chunk.length;if(tamanho>20*1024*1024)throw falha('Arquivo excede 20 MB.',413);chunks.push(chunk);}
    if(file.stream.truncated)throw falha('Arquivo excede o limite do upload.',413);const buffer=Buffer.concat(chunks);
    if(transitorios.includes(file.fieldname))return {buffer,size:tamanho};
    const salvo=await instancia().salvar(req.user.empresaId,buffer,modulo,{imagem,publico});
    return {filename:salvo.filename,path:salvo.url,url:salvo.url,size:salvo.tamanho,mimetype:salvo.tipo,midiaId:salvo.id};
   }).then(r=>done(null,r),done);
  },
  // Erro em outro campo não pode apagar um objeto que já tenha vínculos.
  _removeFile(req,file,done){delete file.buffer;done(null);},
 };
 return multer({storage,limits:{fileSize:imagem?8*1024*1024:20*1024*1024,files:20,fields:100}});
}
function exigirRegistro(nome,campo="empresa_id",param="id"){return async(req,res,next)=>{try{
 if(!req.user?.empresaId)return res.status(403).json({erro:"Empresa não identificada"});
 const M=require("../../models")[nome];
 if(!await M.findOne({where:{id:req.params[param],[campo]:req.user.empresaId}}))return res.status(404).json({erro:"Registro não encontrado"});next();
 }catch(e){next(e);}};}
module.exports={upload,vaga,exigirRegistro};
