'use strict';
// Rollback de schema somente para uma instalação ainda sem dados de uso.
require('dotenv').config({path:require('node:path').resolve(__dirname,'../../.env')});
const {sequelize}=require('../models/Cliente');
async function main(){if(!process.argv.includes('--confirmar-tabelas-sem-uso'))throw Error('Para remover uma instalação sem uso: --confirmar-tabelas-sem-uso. Instalações com dados exigem backup e procedimento de retenção.');const m=require('../services/pethubIA/modelos').modelos(sequelize);for(const[name,model]of Object.entries(m)){if(['Global','Plano','Preco'].includes(name))continue;if(await model.count())throw Error('Há dados em '+model.tableName+'. Rollback destrutivo recusado. Desative a IA e preserve o histórico.');}for(const model of Object.values(m).reverse())await model.drop();console.log('Somente tabelas novas PetHub IA, sem uso, foram removidas. Tabelas do ERP preservadas.');}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>sequelize.close());
