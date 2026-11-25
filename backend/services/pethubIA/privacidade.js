'use strict';
const {Op}=require('sequelize'),V=require('./validacao');
function anonimizarAcao(row){
 const proposta=V.json(row.proposta),resultado=V.json(row.resultado),p={conteudoRemovido:true},r={};
 if(row.tipo==='criarAgendamento'){
  if(typeof proposta.servicoId==='string')p.servicoId=proposta.servicoId;
  if(Number.isFinite(proposta.preco)&&proposta.preco>=0)p.preco=proposta.preco;
  if(Number.isFinite(resultado.valorAgendado)&&resultado.valorAgendado>=0)r.valorAgendado=resultado.valorAgendado;
 }
 return{proposta:p,resultado:r};
}
async function limparAcoes(m,where){
 const criterios={[Op.and]:[where,{[Op.or]:[{'proposta.conteudoRemovido':false},{'proposta.conteudoRemovido':null}]}]};let last=null;
 for(;;){const scoped=last?{[Op.and]:[criterios,{id:{[Op.gt]:last}}]}:criterios;const rows=await m.Acao.findAll({where:scoped,order:[['id','ASC']],limit:200});if(!rows.length)return;
  for(const row of rows){const data=anonimizarAcao(row);if(JSON.stringify(data.proposta)!==JSON.stringify(V.json(row.proposta))||JSON.stringify(data.resultado)!==JSON.stringify(V.json(row.resultado)))await row.update(data);}
  last=rows.at(-1).id;
 }
}
async function limparJobs(m,where){
 const criterios={[Op.and]:[where,{estado:{[Op.in]:['enviado','falha','incerto','cancelado']}},{[Op.or]:[{'dados.faturado':true},{teste:true},{ciclo_id:null}]},{[Op.or]:[{'dados.franquiaReservada':true},{saida_cifrada:{[Op.ne]:null}},{teste:true,'dados.usuario':{[Op.ne]:null}}]}]};
 for(;;){const rows=await m.Fila.findAll({where:criterios,attributes:['id','dados','saida_cifrada'],limit:100});if(!rows.length)return;
  for(const row of rows){const data=V.json(row.dados),summary={faturado:!!data.faturado,franquiaReservada:false,foraExpediente:typeof data.foraExpediente==='boolean'?data.foraExpediente:null};if(typeof data.respostaEm==='string'&&Number.isFinite(+new Date(data.respostaEm)))summary.respostaEm=data.respostaEm;await row.update({saida_cifrada:null,dados:summary});}
 }
}
module.exports={anonimizarAcao,limparAcoes,limparJobs};
