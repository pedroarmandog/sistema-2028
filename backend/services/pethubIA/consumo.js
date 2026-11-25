'use strict';
const V=require('./validacao'),crypto=require('node:crypto');
const n=v=>Number(v||0);
function custo(p,entrada,saida,cache=0){return Math.ceil((Math.max(0,entrada-cache)*n(p.entrada_micros_milhao)+saida*n(p.saida_micros_milhao)+cache*n(p.cache_micros_milhao))/1000000);}
function criar({ERP,m,assinaturas,agora=()=>new Date()}){
 const db=ERP.sequelize;
 async function travar(emp,transaction){
  const o={transaction,logging:false};const global=await m.Global.findByPk(1,{...o,lock:transaction.LOCK.UPDATE});
  if(!global)throw V.falha('Execute a preparação do PetHub IA.',503);
  const periodo=agora().toISOString().slice(0,7);if(global.periodo!==periodo){if(n(global.reserva_micros))throw V.falha('Há reservas do período anterior para reconciliar.',409);await global.update({periodo,gasto_micros:0},o);}
  const assinatura=await m.Assinatura.findByPk(emp,{...o,lock:transaction.LOCK.UPDATE});
  if(!assinatura)throw V.falha('IA não contratada.',403);
  const ciclo=await assinaturas.ciclo(assinatura,transaction);await ciclo.reload({...o,lock:transaction.LOCK.UPDATE});
  return{global,assinatura,ciclo,o};
 }
 async function admitir(job){return db.transaction(async transaction=>{
  const{global,assinatura,ciclo,o}=await travar(job.empresa_id,transaction);
  await assinaturas.estado(job.empresa_id,{transaction,operacional:!job.teste});
  if(!global.habilitado)throw V.falha('PetHub IA pausado administrativamente.',403,'IA_PAUSADA');
  const limites=V.json(ciclo.limites);
  if(n(ciclo.custo_micros)+n(ciclo.reservado_micros)>=n(limites.teto_micros)||n(global.gasto_micros)+n(global.reserva_micros)>=n(global.teto_micros))throw V.falha('Limite financeiro atingido.',429,'IA_LIMITE');
  if(!job.teste&&n(ciclo.respostas)+n(ciclo.reservado_respostas)>=n(limites.respostas))throw V.falha('Franquia de respostas atingida.',429,'IA_LIMITE');
  if(!job.teste)await ciclo.update({reservado_respostas:n(ciclo.reservado_respostas)+1},o);
  await job.update({ciclo_id:ciclo.id,assinatura_revisao:assinatura.revisao,dados:{...V.json(job.dados),franquiaReservada:!job.teste,faturado:false}},o);
 });}
 async function reservar(job,{modelo,entrada,saida,audio=0,finalidade='resposta'}){
  return db.transaction(async transaction=>{
   const{global,assinatura,ciclo,o}=await travar(job.empresa_id,transaction);
   const context=await assinaturas.estado(job.empresa_id,{transaction,operacional:!job.teste});
   if(!global.habilitado||assinatura.revisao!==job.assinatura_revisao||ciclo.id!==job.ciclo_id)throw V.falha('Autorização alterada.',409,'IA_PAUSADA');
   if(!V.json(context.contrato).modelos.includes(modelo))throw V.falha('Modelo fora do contrato.',403);
   const price=await m.Preco.findByPk(modelo,o);
   if(!price?.ativo||!price.verificado_em||(!audio&&(!n(price.entrada_micros_milhao)||!n(price.saida_micros_milhao)))||(audio&&!n(price.audio_micros_minuto)))throw V.falha('Modelo/preços ainda não validados pelo administrador.',503,'IA_MODELO');
   const valor=audio?Math.ceil(audio*n(price.audio_micros_minuto)/60):custo(price,entrada,saida);
   const periodo=agora().toISOString().slice(0,7);
   if(global.periodo!==periodo){if(n(global.reserva_micros))throw V.falha('Há reservas do período anterior para reconciliar.',409);await global.update({periodo,gasto_micros:0},o);}
   const limits=V.json(ciclo.limites);
   if(n(ciclo.custo_micros)+n(ciclo.reservado_micros)+valor>n(limits.teto_micros)||n(global.gasto_micros)+n(global.reserva_micros)+valor>n(global.teto_micros))throw V.falha('Limite financeiro atingido.',429,'IA_LIMITE');
   if(n(ciclo.tokens)+n(ciclo.reservado_tokens)+entrada+saida>n(limits.tokens)||n(ciclo.audios_segundos)+n(ciclo.reservado_audio)+audio>n(limits.audios_segundos))throw V.falha('Franquia de tokens ou áudio atingida.',429,'IA_LIMITE');
   await global.update({reserva_micros:n(global.reserva_micros)+valor},o);
   await ciclo.update({reservado_micros:n(ciclo.reservado_micros)+valor,reservado_tokens:n(ciclo.reservado_tokens)+entrada+saida,reservado_audio:n(ciclo.reservado_audio)+audio},o);
   return m.Consumo.create({id:crypto.randomUUID(),empresa_id:job.empresa_id,conversa_id:job.conversa_id,job_id:job.id,ciclo_id:ciclo.id,modelo,precificacao:{entrada_micros_milhao:price.entrada_micros_milhao,saida_micros_milhao:price.saida_micros_milhao,cache_micros_milhao:price.cache_micros_milhao,audio_micros_minuto:price.audio_micros_minuto},finalidade,estado:'reservado',reserva_micros:valor,reserva_tokens:entrada+saida,audio_segundos:audio},{...o});
  });
 }
 async function liquidar(id,usage=null,requestId=null){
  const base=await m.Consumo.findByPk(id);if(!base)return;
  return db.transaction(async transaction=>{
   const o={transaction,logging:false};const global=await m.Global.findByPk(1,{...o,lock:transaction.LOCK.UPDATE});
   await m.Assinatura.findByPk(base.empresa_id,{...o,lock:transaction.LOCK.UPDATE});
   const ciclo=await m.Ciclo.findByPk(base.ciclo_id,{...o,lock:transaction.LOCK.UPDATE}),r=await m.Consumo.findByPk(id,{...o,lock:transaction.LOCK.UPDATE});
   if(r.estado!=='reservado')return r;
   const p=V.json(r.precificacao);
   const input=n(usage?.input_tokens),output=n(usage?.output_tokens),cache=Math.min(input,n(usage?.input_tokens_details?.cached_tokens));
   // Timeout ou queda de processo: preserva custo/tokens conservadores até reconciliação administrativa.
   const confirmado=usage&&Number.isSafeInteger(usage.input_tokens)&&Number.isSafeInteger(usage.output_tokens)&&Number.isSafeInteger(input)&&Number.isSafeInteger(output)&&input>=0&&output>=0&&!n(r.audio_segundos);
   const valor=confirmado?custo(p,input,output,cache):n(r.reserva_micros),tokens=confirmado?input+output:n(r.reserva_tokens);
   await global.update({reserva_micros:Math.max(0,n(global.reserva_micros)-n(r.reserva_micros)),gasto_micros:n(global.gasto_micros)+valor},o);
   await ciclo.update({reservado_micros:Math.max(0,n(ciclo.reservado_micros)-n(r.reserva_micros)),reservado_tokens:Math.max(0,n(ciclo.reservado_tokens)-n(r.reserva_tokens)),reservado_audio:Math.max(0,n(ciclo.reservado_audio)-n(r.audio_segundos)),custo_micros:n(ciclo.custo_micros)+valor,tokens:n(ciclo.tokens)+tokens,audios_segundos:n(ciclo.audios_segundos)+n(r.audio_segundos)},o);
   await r.update({estado:confirmado?'confirmado':'estimado_conservador',entrada:input,saida:output,cache,custo_micros:valor,request_id:requestId,confirmado_em:agora()},o);
   return r;
  });
 }
 async function fechar(job,enviado){return db.transaction(async transaction=>{
  const o={transaction};const global=await m.Global.findByPk(1,{...o,lock:transaction.LOCK.UPDATE});
  await m.Assinatura.findByPk(job.empresa_id,{...o,lock:transaction.LOCK.UPDATE});
  const j=await m.Fila.findByPk(job.id,{...o,lock:transaction.LOCK.UPDATE}),data=V.json(j.dados);
  if(!data.franquiaReservada||data.faturado)return;
  const c=await m.Ciclo.findByPk(j.ciclo_id,{...o,lock:transaction.LOCK.UPDATE});
  await c.update({reservado_respostas:Math.max(0,n(c.reservado_respostas)-1),respostas:n(c.respostas)+(enviado?1:0)},o);
  await j.update({dados:{...data,faturado:true}},o);
  if(enviado){const l=V.json(c.limites);for(const pct of[70,90,100])if(n(c.respostas)*100>=n(l.respostas)*pct)await m.Notificacao.findOrCreate({where:{empresa_id:j.empresa_id,chave:'franquia:'+c.id+':'+pct},defaults:{tipo:'franquia',dados:{percentual:pct}},...o});}
 });}
 return{admitir,reservar,liquidar,fechar,travar};
}
module.exports={criar,custo};
