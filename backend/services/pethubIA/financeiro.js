'use strict';
const {Op}=require('sequelize'),V=require('./validacao');
function criar({ERP,m,assinaturas,agora}){
 function data(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(+new Date(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)throw V.falha('Data da fatura inválida.');return value;}
 async function registrar(b,autor){
  V.objeto(b,['empresa_id','provedor','referencia','inicio','fim','valor_micros','observacoes']);
  if(!['openai','whatsapp'].includes(b.provedor))throw V.falha('Fornecedor inválido.');
  const empresa=b.empresa_id==null?null:V.inteiro(b.empresa_id,1),inicio=data(b.inicio),fim=data(b.fim),referencia=V.texto(b.referencia,120,true),valor=V.inteiro(b.valor_micros,0,1000000000000),observacoes=V.texto(b.observacoes||'',1000);
  if(fim<inicio||+new Date(fim)-+new Date(inicio)>366*86400000)throw V.falha('Período da fatura inválido.');
  if(empresa&&!await ERP.Empresa.findByPk(empresa,{attributes:['id']}))throw V.falha('Empresa não encontrada.',404);
  const chave=V.hash(JSON.stringify([empresa,b.provedor,referencia.normalize('NFC').toLowerCase()]));
  return ERP.sequelize.transaction(async transaction=>{
   const o={transaction};await m.Global.findByPk(1,{...o,lock:transaction.LOCK.UPDATE});
   const [row,created]=await m.Fatura.findOrCreate({where:{chave},defaults:{empresa_id:empresa,provedor:b.provedor,referencia,inicio,fim,valor_micros:valor,observacoes,autor:String(autor)},...o});
   if(!created&&(row.inicio!==inicio||row.fim!==fim||Number(row.valor_micros)!==valor||row.observacoes!==observacoes))throw V.falha('Esta referência já foi registrada com outros valores. Preserve a fatura original e registre uma referência de ajuste distinta.',409);
   if(created)await assinaturas.auditar(empresa,autor,'fatura_informada',{id:row.id,provedor:b.provedor,referencia,inicio,fim,valor_micros:valor},transaction);
   return row;
  });
 }
 async function resumo(b={}){
  V.objeto(b,['empresa','inicio','fim']);const inicio=data(b.inicio||agora().toISOString().slice(0,7)+'-01'),fim=data(b.fim||agora().toISOString().slice(0,10));if(fim<inicio||+new Date(fim)-+new Date(inicio)>366*86400000)throw V.falha('Período inválido.');
  const where={inicio:{[Op.lte]:fim},fim:{[Op.gte]:inicio}};if(b.empresa)where.empresa_id=V.inteiro(b.empresa,1);
  const rows=await m.Fatura.findAll({where,order:[['inicio','DESC'],['createdAt','DESC']],limit:501});if(rows.length>500)throw V.falha('Refine o período: mais de 500 faturas.',422);
  const itens=[];
  for(const row of rows){let estimado=null;
   if(row.provedor==='openai'){
    const usageWhere={createdAt:{[Op.gte]:new Date(row.inicio+'T00:00:00-03:00'),[Op.lte]:new Date(row.fim+'T23:59:59.999-03:00')},estado:{[Op.in]:['confirmado','estimado_conservador']}};if(row.empresa_id!=null)usageWhere.empresa_id=row.empresa_id;
    estimado=Number(await m.Consumo.sum('custo_micros',{where:usageWhere})||0);
   }
   itens.push({id:row.id,empresa_id:row.empresa_id,provedor:row.provedor,referencia:row.referencia,inicio:row.inicio,fim:row.fim,valor_micros:Number(row.valor_micros),estimativa_micros:estimado,diferenca_micros:estimado==null?null:Number(row.valor_micros)-estimado,fonte:'informada_pelo_admin',cobreTodoFiltro:row.inicio===inicio&&row.fim===fim,observacoes:row.observacoes,registrado_em:row.createdAt});
  }
  // Faturas globais e atribuídas podem se sobrepor: nunca somar tudo como se fossem custos adicionais.
  return{inicio,fim,moeda:'USD',itens,nota:'Valores de faturas são informados pelo administrador; não houve consulta ao fornecedor. Diferença compara o valor declarado à estimativa do mesmo período. Faturas globais e por empresa podem se sobrepor e não são somadas automaticamente. O registro não modifica consumo, reservas, limites nem cobranças.'};
 }
 return{registrar,resumo};
}
module.exports={criar};
