'use strict';
const {DataTypes:D,Op}=require('sequelize');
function modelos(db){
 if(db.__portalAlertas)return db.__portalAlertas;
 const emp={type:D.INTEGER,allowNull:false,references:{model:'empresas',key:'id'}};
 const Fila=db.define('PortalAlertaFila',{solicitacao_id:{type:D.STRING(36),primaryKey:true,references:{model:'cliente_portal_solicitacoes',key:'id'}},empresa_id:emp,pendente:{type:D.BOOLEAN,allowNull:false,defaultValue:true},decisao:D.STRING(20),autor_id:D.INTEGER,versao_decidida:D.INTEGER,decidiu_em:D.DATE,motivo:D.STRING(500)},{tableName:'cliente_portal_alertas_fila',indexes:[{fields:['empresa_id','pendente']}]});
 const Som=db.define('PortalAlertaSom',{empresa_id:{...emp,primaryKey:true},tipo:{type:D.STRING(20),allowNull:false,defaultValue:'padrao'},padrao:{type:D.STRING(40),allowNull:false,defaultValue:'classico'},referencia:D.STRING(200),nome:D.STRING(120),volume:{type:D.INTEGER,allowNull:false,defaultValue:45},intervalo:{type:D.INTEGER,allowNull:false,defaultValue:25},versao:{type:D.INTEGER,allowNull:false,defaultValue:0}},{tableName:'cliente_portal_alertas_som'});
 const Silencio=db.define('PortalAlertaSilencio',{id:{type:D.STRING(64),primaryKey:true},empresa_id:emp,usuario_id:{type:D.INTEGER,allowNull:false},solicitacao_id:{type:D.STRING(36),allowNull:false,references:{model:'cliente_portal_solicitacoes',key:'id'}},silenciado:{type:D.BOOLEAN,allowNull:false,defaultValue:false}},{tableName:'cliente_portal_alertas_silencios',indexes:[{unique:true,fields:['empresa_id','usuario_id','solicitacao_id']}]});
 return db.__portalAlertas={Fila,Som,Silencio};
}
async function abrir(db,p,transaction){const {Fila}=modelos(db),o={transaction,logging:false};const [r]=await Fila.findOrCreate({where:{solicitacao_id:p.id},defaults:{empresa_id:p.empresa_id,pendente:true},...o});if(!r.pendente)await r.update({pendente:true},o);return r;}
async function decidir(db,p,acao,autor,motivo,transaction){const {Fila}=modelos(db);await Fila.upsert({solicitacao_id:p.id,empresa_id:p.empresa_id,pendente:false,decisao:acao,autor_id:autor,versao_decidida:p.versao,decidiu_em:new Date(),motivo:motivo||null},{transaction,logging:false});}
async function preparar(db){for(const m of Object.values(modelos(db)))await m.sync();const Solic=db.models.ClientePortalSolicitacao;if(Solic){const rows=await Solic.findAll({where:{estado:{[Op.in]:['PENDENTE','PROPOSTA_RECUSADA']}},attributes:['id','empresa_id'],logging:false});for(const p of rows)await modelos(db).Fila.findOrCreate({where:{solicitacao_id:p.id},defaults:{empresa_id:p.empresa_id,pendente:true},logging:false});}}
module.exports={modelos,preparar,abrir,decidir};
