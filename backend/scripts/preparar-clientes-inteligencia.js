// Aditiva e idempotente. Não modifica nem apaga dados das tabelas existentes.
require('dotenv').config({quiet:true});process.env.NODE_ENV='production';
const {sequelize}=require('../models/Cliente');
(async()=>{try{
  await require('../services/clienteInteligencia').preparar(sequelize);
  await require('../services/clienteComunicacao').prepararAuditoria(sequelize);
  const q=sequelize.getQueryInterface();
  const indices=await q.showIndex('vendas');
  if(!indices.some(i=>i.name==='vendas_empresa_cliente_data'||i.fields?.slice(0,3).map(f=>f.attribute).join(',')==='empresa_id,clienteId,data'))await q.addIndex('vendas',['empresa_id','clienteId','data'],{name:'vendas_empresa_cliente_data'});
  console.log('Tabelas complementares de clientes e índice de vendas preparados.');
}catch(e){console.error('Falha ao preparar estrutura:',e.message);process.exitCode=1;}finally{await sequelize.close();}})();
