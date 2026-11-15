const {exigePermissao}=require('../middleware/exigePermissao');
const podeEditar=exigePermissao('configuracoes.empresa');
const temCores=b=>b&&['systemColors','patchCores','restaurarCores'].some(k=>Object.hasOwn(b,k));
function autorizar(req,res,next){return temCores(req.body)?podeEditar(req,res,next):next();}
async function permissao(req){let pode=false;await podeEditar(req,{status(){return this;},json(){return this;},sendStatus(){return this;}},()=>{pode=true;});return pode;}
async function ler(req,res){try{const {Usuario}=require('../models');const u=await Usuario.findByPk(req.user.id,{attributes:['preferencias']});const pref=typeof u?.preferencias==='string'?JSON.parse(u.preferencias):u?.preferencias||{};const atual=await require('../services/paletaEmpresa').instancia().ler(req.user.empresaId);res.set('Cache-Control','private, no-store');res.json({...pref,...atual,tema:{...atual.tema,podeEditar:await permissao(req)}});}catch{res.status(503).json({erro:'Não foi possível carregar a paleta da empresa. Confira a preparação da estrutura.'});}}
async function salvar(req,res){const {Usuario,sequelize}=require('../models');try{
 const b=req.body;if(!b||typeof b!=='object'||Array.isArray(b)||Object.hasOwn(b,'empresaId')||Object.hasOwn(b,'empresa_id'))return res.status(400).json({erro:'Preferências inválidas. A empresa vem da sessão autenticada.'});
 const dados=await sequelize.transaction(async transaction=>{
  let atual;if(temCores(b))atual=await require('../services/paletaEmpresa').instancia().alterar(req.user.empresaId,b,{transaction});
  const outros={...b};for(const k of ['systemColors','patchCores','restaurarCores','versaoBase','tema'])delete outros[k];
  if(Object.keys(outros).length){const u=await Usuario.findByPk(req.user.id,{transaction,lock:transaction.LOCK.UPDATE});let anteriores=u.preferencias;if(typeof anteriores==='string')anteriores=JSON.parse(anteriores);await u.update({preferencias:{...(anteriores||{}),...outros}},{transaction});}
  return atual;
 });res.set('Cache-Control','private, no-store');res.json({ok:true,...dados});
 }catch(e){res.status(e.status||503).json({erro:e.status?e.message:'Não foi possível salvar as cores. A paleta anterior foi preservada.',...(e.atual||{})});}}
async function eventos(req,res){
 res.set({'Content-Type':'text/event-stream','Cache-Control':'private, no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.flushHeaders();res.write('retry: 1000\n\n');let fechado=false,remover;
 const heartbeat=setInterval(()=>{if(!fechado)res.write(': ativo\n\n');},10000);
 const limite=setTimeout(()=>res.end(),20000); // Reconectar exige autenticação novamente; não alterar authUser.
 const fechar=()=>{fechado=true;clearInterval(heartbeat);clearTimeout(limite);remover?.();};res.once('close',fechar);
 try{remover=await require('../services/paletaEmpresa').instancia().assinar(req.user.empresaId,dados=>{if(!fechado)res.write('event: paleta\ndata: '+JSON.stringify(dados)+'\n\n');});if(fechado)remover();}catch{res.end();fechar();}
}
module.exports={ler,salvar,eventos,autorizar};
