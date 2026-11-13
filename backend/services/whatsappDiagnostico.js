// Histórico operacional: nunca armazena QR, número, tokens ou material Signal.
const {DataTypes,Op}=require('sequelize');
function criarDiagnostico({obterBanco=()=>require('../models/Cliente').sequelize}={}) {
const filas=new Map(),memoria=new Map(),preparados=new WeakMap();
const boot=require('node:crypto').randomUUID();
let avisado=false;
function db(){return obterBanco();}
async function tabela(){
  const banco=db();
  if(!preparados.has(banco))preparados.set(banco,(async()=>{
    const M=banco.models.WhatsappDiagnostico||banco.define('WhatsappDiagnostico',{
      id:{type:DataTypes.INTEGER,autoIncrement:true,primaryKey:true},empresaId:{type:DataTypes.STRING(32),allowNull:false},
      evento:{type:DataTypes.STRING(48),allowNull:false},codigo:DataTypes.STRING(48),detalhes:DataTypes.JSON,
    },{tableName:'pethub_wa_eventos',updatedAt:false,indexes:[{fields:['empresaId','createdAt']} ]});
    await M.sync();return M;
  })().catch(e=>{preparados.delete(banco);throw e;}));
  return preparados.get(banco);
}
function registrar(empresaId,evento,dados={}){
  const empresa=String(empresaId);if(!/^[1-9]\d*$/.test(empresa))return;
  const detalhes={processo:process.pid,inicioProcesso:boot};
  for(const k of ['atrasoMs','tentativa','pareada','duracaoMs'])if(typeof dados[k]==='number'||typeof dados[k]==='boolean')detalhes[k]=dados[k];
  const codigo=/^[a-z0-9_-]{1,48}$/i.test(String(dados.codigo))?String(dados.codigo):null;
  const row={empresaId:empresa,evento:String(evento).slice(0,48),codigo,detalhes,createdAt:new Date()};
  if(!memoria.has(empresa))memoria.set(empresa,[]);
  const buffer=memoria.get(empresa);buffer.push(row);if(buffer.length>100)buffer.shift();
  gravar(empresa);
}
function gravar(empresa){
  if(filas.has(empresa))return filas.get(empresa);
  const p=(async()=>{
    const M=await tabela(),buffer=memoria.get(empresa);
    while(buffer?.length){
      const row=buffer[0];await M.create(row);
      const i=buffer.indexOf(row);if(i>=0)buffer.splice(i,1);
    }
    const recentes=await M.findAll({where:{empresaId:empresa},attributes:['id'],order:[['id','DESC']],offset:200,limit:200});
    if(recentes.length)await M.destroy({where:{empresaId:empresa,id:{[Op.lte]:recentes[0].id}}});
  })().catch(()=>{if(!avisado){console.warn('[WhatsApp] histórico aguardando banco; conexão preservada');avisado=true;}})
    .finally(()=>filas.delete(empresa));
  filas.set(empresa,p);return p;
}
async function flush(){await Promise.allSettled([...memoria.keys()].map(gravar));}
async function historico(empresaId){
  const empresa=String(empresaId);if(!/^[1-9]\d*$/.test(empresa))throw new Error('Empresa inválida.');
  await flush();
  const M=await tabela();
  return M.findAll({where:{empresaId:empresa},order:[['id','DESC']],limit:100,raw:true});
}
return {registrar,flush,historico};
}
module.exports={...criarDiagnostico(),criarDiagnostico};
