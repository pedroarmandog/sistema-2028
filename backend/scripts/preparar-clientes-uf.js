require('dotenv').config({quiet:true});process.env.NODE_ENV='production';
const {sequelize}=require('../models/Cliente');
(async()=>{try{const r=await require('../services/clienteEndereco').prepararEstrutura(sequelize);console.log(r.criada?'Coluna estado adicionada; registros preservados.':'Coluna estado já existe; nenhuma alteração necessária.');}catch(e){console.error('Não foi possível preparar UF dos clientes:',e.message);process.exitCode=1;}finally{await sequelize.close();}})();
