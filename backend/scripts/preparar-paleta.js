require('dotenv').config({quiet:true});process.env.NODE_ENV='production';
const {sequelize}=require('../models/Cliente');require('../models');
(async()=>{try{await require('../services/paletaEmpresa').preparar(sequelize);console.log('Paleta por empresa preparada; dados existentes preservados.');}catch(e){console.error('Não foi possível preparar paleta:',e.message);process.exitCode=1;}finally{await sequelize.close();}})();
