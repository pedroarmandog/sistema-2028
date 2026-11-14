require('dotenv').config({quiet:true});process.env.NODE_ENV='production';
const {sequelize}=require('../models/Cliente');
(async()=>{try{await require('../services/midias').instancia().preparar();console.log('Tabela midias_arquivos preparada (aditiva, sem apagar cadastros).');}catch(e){console.error('Falha ao preparar mídias:',e.name);process.exitCode=1;}finally{await sequelize.close();}})();
