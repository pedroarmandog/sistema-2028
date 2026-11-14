// Regra central imediatamente antes do envio: erro do banco não libera mensagens.
const I=require('./clienteInteligencia');
const {Op}=require('sequelize');
function variantes(v){
  let n=String(v||'').split('@')[0].replace(/\D/g,'');
  if(n.length<=11&&!n.startsWith('55'))n='55'+n;
  const out=new Set([n]);
  if(n.startsWith('55')&&n.length===13&&n[4]==='9')out.add(n.slice(0,4)+n.slice(5));
  if(n.startsWith('55')&&n.length===12)out.add(n.slice(0,4)+'9'+n.slice(4));
  return out;
}
async function verificar(empresa,telefone,{db,canal='whatsapp'}={}){
  db??=require('../models/Cliente').sequelize;
  if(!Number.isSafeInteger(Number(empresa))||Number(empresa)<1)throw new Error('Empresa inválida para comunicação.');
  if(!['sms','whatsapp'].includes(canal))throw new Error('Canal inválido.');
  const {Perfil}=await I.preparar(db);
  const bloqueados=await Perfil.findAll({where:{empresa_id:empresa,[canal==='sms'?'bloquear_sms':'bloquear_whatsapp']:true},attributes:['cliente_id'],raw:true});
  if(!bloqueados.length)return {permitido:true};
  const destino=variantes(telefone);
  const clientes=await db.models.Cliente.findAll({where:{empresa_id:empresa,id:{[Op.in]:bloqueados.map(p=>p.cliente_id)}},attributes:['telefone','telefones_adicionais'],raw:true});
  for(const c of clientes){
    let adicionais=c.telefones_adicionais||[];if(typeof adicionais==='string'){try{adicionais=JSON.parse(adicionais);}catch{adicionais=[];}}
    const telefones=[c.telefone,...(Array.isArray(adicionais)?adicionais.map(p=>typeof p==='object'?p.telefone||p.numero||p.valor:p):[])];
    if(telefones.some(t=>t&&[...variantes(t)].some(v=>destino.has(v))))return {permitido:false,bloqueado:true,erro:'IGNORADO_POR_BLOQUEIO: cliente bloqueou mensagens de '+canal.toUpperCase()+'.'};
  }
  return {permitido:true};
}
async function prepararAuditoria(db){
  const q=db.getQueryInterface(),colunas=await q.describeTable('logs_envio');
  const tipo=colunas.evento?.type||'';
  if(/^ENUM\(/i.test(tipo)){
    const valores=[...tipo.matchAll(/'((?:[^']|'')*)'/g)].map(m=>m[1].replace(/''/g,"'"));
    if(!valores.includes('ignorado_bloqueio')){
      if(!valores.length)throw new Error('Não foi possível identificar o ENUM de logs_envio.evento.');
      await q.changeColumn('logs_envio','evento',{type:require('sequelize').DataTypes.ENUM(...valores,'ignorado_bloqueio'),allowNull:colunas.evento.allowNull??false,...(colunas.evento.defaultValue!=null?{defaultValue:colunas.evento.defaultValue}:{})});
    }
  }
}
module.exports={verificar,variantes,prepararAuditoria};
