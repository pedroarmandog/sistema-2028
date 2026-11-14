'use strict';
const jwt=require('jsonwebtoken');
const {criarDiagnostico,cnpjValido}=require('../services/fiscal/FocusDiagnostico');
function autorizado(req,res,next){
 // authAdmin já verificou assinatura, expiração, registro e ativo no banco.
 // Exigir também as claims próprias do painel evita aceitar um JWT do ERP
 // mesmo se o operador tiver configurado as duas chaves JWT iguais.
 const header=req.headers.authorization,token=header?.startsWith('Bearer ')?header.slice(7):process.env.REQUIRE_AUTH_HEADER==='0'?req.cookies?.admin_token:null;
 if(!process.env.JWT_SECRET?.trim())return res.status(503).json({erro:'Autenticação administrativa não configurada no servidor.'});
 let claims=null;try{if(token)claims=jwt.verify(token,process.env.JWT_SECRET,{algorithms:['HS256']});}catch{}
 const ids=(process.env.FOCUS_NFE_DIAGNOSTIC_ADMIN_IDS||'').split(',').map(v=>v.trim()).filter(v=>/^[1-9]\d*$/.test(v));
 if(!req.adminId||!claims?.email||claims.empresaId!==undefined||claims.grupoUsuario!==undefined||String(claims.email).toLowerCase()!==String(req.adminEmail).toLowerCase()||!ids.includes(String(req.adminId)))return res.status(403).json({erro:'Diagnóstico restrito aos administradores da plataforma autorizados.'});
 next();
}
function criarController({Empresa,env=process.env,testar=criarDiagnostico({env}),agora=Date.now,registrar=evento=>console.info('[FocusDiagnostico]',JSON.stringify(evento)),esperaMs=15000}={}){
 const execucoes=new Map();
 const empresaId=v=>{const s=String(v??'');const n=Number(s);return /^[1-9]\d*$/.test(s)&&Number.isSafeInteger(n)&&n<=2147483647?n:null;};
 async function empresa(valor){const id=empresaId(valor);if(!id)throw Object.assign(Error('Selecione a empresa atual para o diagnóstico.'),{status:400,publica:true});const M=Empresa||require('../models').Empresa;const r=await M.findByPk(id,{attributes:['id','nome','razaoSocial','cnpj']});if(!r)throw Object.assign(Error('Empresa não encontrada.'),{status:404,publica:true});return {id:r.id,nome:r.razaoSocial||r.nome||'',cnpj:r.cnpj||''};}
 async function permissao(req,res){res.set('Cache-Control','no-store');try{const e=await empresa(req.query.empresaId);return res.json({permitido:true,empresa:e});}catch(e){return res.status(e.status||503).json({erro:e.status?e.message:'Não foi possível identificar a empresa para o diagnóstico.'});}}
 async function executar(req,res){
  res.set('Cache-Control','no-store');const id=String(req.adminId),antes=execucoes.get(id),now=agora();
  if(antes&&(antes.pendente||antes.ate>now)){const espera=Math.max(1,Math.ceil((antes.ate-now)/1000));res.set('Retry-After',String(espera));return res.status(antes.pendente?409:429).json({erro:antes.pendente?'Já existe uma verificação em andamento. Aguarde.':'Aguarde alguns segundos antes de testar novamente.'});}
  if(!req.body||typeof req.body!=='object'||Array.isArray(req.body)||Object.keys(req.body).some(k=>k!=='empresaId'))return res.status(400).json({erro:'Informe somente a empresa selecionada. O CNPJ será obtido do cadastro no servidor.'});
  const reserva={pendente:true,ate:now+esperaMs};execucoes.set(id,reserva);let consultou=false;
  try{
   const e=await empresa(req.body.empresaId);if(!cnpjValido(e.cnpj))return res.status(400).json({erro:'Não foi possível concluir a consulta. Verifique o CNPJ informado e os parâmetros enviados. Corrija o CNPJ da empresa em Configurações → Empresa.'});
   const r=await testar(e.cnpj);consultou=r.dados.tempoRespostaMs!==null;
   // Somente identificadores internos e estado resumido. Nunca erro bruto/token/cabeçalhos.
   try{registrar({adminId:req.adminId,empresaId:e.id,codigo:r.dados.codigo,httpFocus:r.dados.httpFocus,tempoRespostaMs:r.dados.tempoRespostaMs});}catch{}
   return res.status(r.status).json({...r.dados,empresa:e});
  }catch(e){return res.status(e.publica?e.status:503).json({erro:e.publica?e.message:'Não foi possível concluir o diagnóstico. Tente novamente.'});}
  finally{reserva.pendente=false;if(!consultou)execucoes.delete(id);else reserva.ate=agora()+esperaMs;for(const[k,v]of execucoes)if(!v.pendente&&v.ate<agora())execucoes.delete(k);}
 }
 return {permissao,executar};
}
const controller=criarController();module.exports={...controller,criarController,autorizado};
