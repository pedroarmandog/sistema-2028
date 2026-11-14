// Somente SELECT. Não modifica registros nem recria tabelas.
require('dotenv').config({quiet:true});process.env.NODE_ENV='production';
const {sequelize,Cliente}=require('../models/Cliente');
const {periodoMes}=require('../utils/periodoBrasilia');
(async()=>{try{
 const empresa=Number(process.argv[2]);if(!Number.isSafeInteger(empresa)||empresa<1)throw Error('Uso: node backend/scripts/auditar-clientes-importacao.js ID_DA_EMPRESA');
 const p=periodoMes(),q=sequelize.getQueryInterface().queryGenerator,t=q.quoteTable(Cliente.getTableName());
 const inicio=new Date(p.inicio).toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}),fim=new Date(p.fim).toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
 const replacements={empresa,inicio,fim,inicioUtc:p.inicio,fimUtc:p.fim};
 const [contagens]=await sequelize.query(`SELECT COUNT(*) AS total, SUM(CASE WHEN c.ativo=1 THEN 1 ELSE 0 END) AS ativos,
 SUM(CASE WHEN c.createdAt>=:inicioUtc AND c.createdAt<:fimUtc THEN 1 ELSE 0 END) AS entradasPethubNoMes,
 SUM(CASE WHEN EXISTS (SELECT 1 FROM cliente_perfis p WHERE p.empresa_id=c.empresa_id AND p.cliente_id=c.id AND p.cadastro_original>=:inicio AND p.cadastro_original<:fim)
 OR (c.createdAt>=:inicioUtc AND c.createdAt<:fimUtc AND NOT EXISTS (SELECT 1 FROM cliente_perfis p WHERE p.empresa_id=c.empresa_id AND p.cliente_id=c.id AND p.cadastro_original IS NOT NULL)) THEN 1 ELSE 0 END) AS cadastradosNoMes
 FROM ${t} c WHERE c.empresa_id=:empresa`,{replacements,type:sequelize.QueryTypes.SELECT});
 const operacoes=await sequelize.query("SELECT id,estado,total,cursor,criados,atualizados,ignorados,rejeitados,createdAt,concluidoEm FROM importacoes_operacoes WHERE empresa_id=:empresa AND tipo='clientes' ORDER BY createdAt DESC LIMIT 10",{replacements,type:sequelize.QueryTypes.SELECT});
 const [comprovantes]=await sequelize.query("SELECT COUNT(DISTINCT registro) AS clientesComComprovante FROM importacoes_linhas WHERE empresa_id=:empresa AND tipo='clientes'",{replacements,type:sequelize.QueryTypes.SELECT});
 console.log(JSON.stringify({empresa,periodo:{inicio,fim},...contagens,...comprovantes,operacoes},null,2));
}catch(e){console.error('Auditoria não concluída:',e.message);process.exitCode=1;}finally{await sequelize.close();}})();
