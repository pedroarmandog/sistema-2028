// Sem --aplicar, apenas diagnóstico. Nenhuma preferência antiga é apagada.
require('dotenv').config({quiet:true});process.env.NODE_ENV='production';
const {sequelize,Usuario}=require('../models'),{planejar}=require('../services/paletaLegada'),{criarServico}=require('../services/paletaEmpresa');
(async()=>{try{const plano=planejar(await Usuario.findAll({attributes:['id','empresas','preferencias'],raw:true}));const servico=criarServico({db:sequelize});
 for(const aviso of plano.avisos)console.log(JSON.stringify(aviso));
 for(const c of plano.candidatos){const atual=await servico.ler(c.empresaId);if(atual.tema.versao!==0||atual.tema.personalizada){console.log(`Empresa ${c.empresaId}: configuração central já existe, preservada.`);continue;}
  if(process.argv.includes('--aplicar'))await servico.alterar(c.empresaId,{versaoBase:0,systemColors:c.paleta});
  console.log(`Empresa ${c.empresaId}: paleta do usuário ${c.usuarioId} ${process.argv.includes('--aplicar')?'migrada':'disponível para migração (--aplicar)'}.`);
 }
}catch(e){console.error('Falha na migração de paletas:',e.message);process.exitCode=1;}finally{await sequelize.close();}})();
