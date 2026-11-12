const {DataTypes}=require('sequelize');
const crypto=require('node:crypto');
const preparados=new WeakMap();
async function preparar() {
  const db=require('../models').sequelize;
  if(!preparados.has(db))preparados.set(db,(async()=>{
    const Disparo=db.models.MarketingDisparo||db.define('MarketingDisparo',{
      chave:{type:DataTypes.STRING(64),primaryKey:true},empresaId:{type:DataTypes.INTEGER,allowNull:false},
      envioId:DataTypes.INTEGER,estado:{type:DataTypes.STRING(24),allowNull:false,defaultValue:'pendente'},
      mensagemId:DataTypes.STRING(150),
    },{tableName:'marketing_disparos',timestamps:true,indexes:[{fields:['empresaId','envioId']} ]});
    await Disparo.sync(); return Disparo;
  })().catch(e=>{preparados.delete(db);throw e;}));
  return preparados.get(db);
}
function chave(params,contexto) {
  return crypto.createHash('sha256').update(JSON.stringify([
    Number(params.empresaId),Number(params.mensagemAutomaticaId),String(params.telefone).replace(/\D/g,''),
    contexto.eventoChave||null,contexto.agendamentoId||null,contexto.clienteId||null,contexto.petId||null,
    contexto.lembreteId||null,contexto.cicloData||null,Number(contexto.diasAntes||0),
  ])).digest('hex');
}
async function marcar(envio,estado,mensagemId,transaction) {
  const ctx=typeof envio.contexto==='string'?JSON.parse(envio.contexto):envio.contexto;
  if(!ctx?.chaveDisparo)return;
  const Disparo=await preparar();
  await Disparo.update({estado,...(mensagemId?{mensagemId}: {})},{where:{chave:ctx.chaveDisparo,empresaId:envio.empresaId,envioId:envio.id},transaction});
}
module.exports={preparar,chave,marcar};
