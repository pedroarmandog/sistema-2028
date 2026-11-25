'use strict';
require('dotenv').config({path:require('node:path').resolve(__dirname,'../../.env')});
const {sequelize}=require('../models/Cliente');
require('../services/pethubIA/modelos').preparar(sequelize).then(()=>console.log('Tabelas PetHub IA preparadas. Planos iniciais criados somente se ausentes. Atendimento real permanece desativado por padrão.')).catch(e=>{console.error('Preparação PetHub IA falhou:',e.message);process.exitCode=1;}).finally(()=>sequelize.close());
