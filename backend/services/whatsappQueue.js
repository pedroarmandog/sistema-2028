const cron=require('node-cron');
const {Op,literal}=require('sequelize');
const whatsappService=require('./whatsappService');
const D=require('./marketingDisparos');
const T=require('./marketingTempo');
const Eventos=require('./marketingEventos');
const MAX_TENTATIVAS=3, BATCH_SIZE=10;
let cronJob=null,processando=false,lastRunAt=0;
function iniciarAgendador() {
  if(cronJob)return;
  const executar=async()=>{
    if(processando)return;
    processando=true;
    try {
      await require('./marketingScheduler').planejar();
      await processarFila();
    } catch(e) {console.error('[Marketing] Ciclo indisponível:',e.message);}
    finally {processando=false;lastRunAt=Date.now();}
  };
  cronJob=cron.schedule('* * * * *',executar,{timezone:T.FUSO});
  setImmediate(executar);
  console.info('[Marketing] Planejamento/fila a cada minuto; fuso America/Sao_Paulo');
}
async function processarFila(empresaId) {
  const {EnvioAgendado,LogEnvio}=require('../models');
  const filtro={ [Op.and]:literal("JSON_EXTRACT(contexto, '$.campanhaId') IS NULL"),
    empresaId:empresaId||{[Op.in]:whatsappService.empresasConectadas()} };
  // Um envio abandonado pode já ter sido aceito pelo WhatsApp. Nunca reenviar cegamente.
  const abandonados=await EnvioAgendado.findAll({where:{...filtro,status:'enviando',updatedAt:{[Op.lt]:new Date(Date.now()-300000)}}});
  for(const envio of abandonados) {
    const [n]=await EnvioAgendado.update({status:'erro',erroMensagem:'RESULTADO_INCERTO: processo interrompido durante o envio. Confira no WhatsApp antes de tentar manualmente.'},
      {where:{id:envio.id,empresaId:envio.empresaId,status:'enviando',updatedAt:{[Op.lt]:new Date(Date.now()-300000)}}});
    if(n)await D.marcar(envio,'incerto');
  }
  const empresas=empresaId?[Number(empresaId)]:whatsappService.empresasConectadas().map(Number);
  for(let pos=0;pos<empresas.length;pos+=4)await Promise.all(empresas.slice(pos,pos+4).map(async emp=>{
    const pendentes=await EnvioAgendado.findAll({where:{...filtro,empresaId:emp,status:'pendente',dataAgendada:{[Op.lte]:new Date()},tentativas:{[Op.lt]:MAX_TENTATIVAS}},order:[['dataAgendada','ASC']],limit:BATCH_SIZE});
    for(const envio of pendentes) {
      try {await processarEnvio(envio,LogEnvio);}
      catch(e){console.warn(`[Marketing][empresa:${emp}][envio:${envio.id}] pendência preservada:`,e.message);}
    }
  }));
}
async function processarEnvio(envio,LogEnvio) {
  const empresaId=Number(envio.empresaId);
  if(!empresaId||!whatsappService.isConectado(empresaId))return {sucesso:false,temporario:true,erro:'WhatsApp não está conectado.'};
  if(envio.mensagemAutomaticaId) {
    const v=await Eventos.validarEnvio(envio);
    if(!v.ok) {
      if(v.adiar)await envio.update({dataAgendada:v.adiar,erroMensagem:v.motivo});
      else {await envio.update({status:'cancelado',erroMensagem:v.motivo});await D.marcar(envio,'cancelado');}
      return {sucesso:false,erro:v.motivo};
    }
  }
  if(envio.dataAgendada && +new Date(envio.dataAgendada)>Date.now())return {sucesso:false,temporario:true,erro:'Envio ainda não chegou ao horário programado.'};
  const anteriores=envio.tentativas;
  const [reservado]=await envio.constructor.update({status:'enviando',tentativas:anteriores+1},
    {where:{id:envio.id,empresaId,status:'pendente',tentativas:anteriores}});
  if(!reservado)return {sucesso:false,erro:'Envio já processado ou em andamento.'};
  // UPDATE condicional não atualiza a instância Sequelize em memória. Sem reload,
  // voltar a pendente não era marcado como mudança e ficava preso em enviando.
  if(typeof envio.reload==='function')await envio.reload();
  else Object.assign(envio,{status:'enviando',tentativas:anteriores+1});
  // Revalidar após a reserva: desativação/cancelamento nunca usa o snapshot antigo.
  if(envio.mensagemAutomaticaId) {
    const v=await Eventos.validarEnvio(envio);
    if(!v.ok) {
      await envio.update({status:v.adiar?'pendente':'cancelado',tentativas:anteriores,...(v.adiar?{dataAgendada:v.adiar}:{}),erroMensagem:v.motivo});
      if(!v.adiar)await D.marcar(envio,'cancelado');
      return {sucesso:false,erro:v.motivo};
    }
  }
  await D.marcar(envio,'enviando');
  let resultado;
  try {resultado=await whatsappService.enviarMensagem(empresaId,envio.telefoneDestino,envio.conteudoFinal,envio.imagemPath);}
  catch {resultado={sucesso:false,incerto:true,erro:'Operação interrompida sem confirmação de envio.'};}
  try {
    if(resultado.sucesso) {
      await envio.update({status:'enviado',dataEnvio:new Date(),tentativas:anteriores+1});
      await D.marcar(envio,'enviado',resultado.mensagemId);
    } else if(resultado.incerto) {
      await envio.update({status:'erro',erroMensagem:'RESULTADO_INCERTO: '+resultado.erro});
      await D.marcar(envio,'incerto');
    } else {
      const tentativas=resultado.temporario?anteriores:anteriores+1;
      await envio.update({status:tentativas>=MAX_TENTATIVAS?'erro':'pendente',tentativas,erroMensagem:resultado.erro});
      await D.marcar(envio,tentativas>=MAX_TENTATIVAS?'erro':'pendente');
    }
  } catch {
    // Mantém a reserva como barreira mesmo se o banco cair após o envio real.
    await envio.update({status:'erro',erroMensagem:'RESULTADO_INCERTO: confirmação no banco falhou; confira no WhatsApp.'}).catch(()=>{});
    await D.marcar(envio,'incerto').catch(()=>{});
    return {sucesso:false,incerto:true,erro:'Envio com resultado incerto. Confira antes de reenviar.'};
  }
  await LogEnvio.create({empresaId,envioAgendadoId:envio.id,evento:resultado.sucesso?'envio_sucesso':'envio_erro',
    mensagem:resultado.sucesso?'Confirmado pelo WhatsApp':resultado.erro,detalhes:{mensagemId:resultado.mensagemId||null,incerto:!!resultado.incerto}}).catch(()=>{});
  return resultado;
}
async function agendarEnvio(params) {
  const {EnvioAgendado,MensagemAutomatica,sequelize}=require('../models');
  const emp=Number(params.empresaId);
  if(!Number.isSafeInteger(emp)||emp<1)throw new Error('Empresa obrigatória para agendar mensagem.');
  const ctx=typeof params.contexto==='string'?JSON.parse(params.contexto):{...params.contexto};
  if(params.mensagemAutomaticaId) {
    const m=await MensagemAutomatica.findOne({where:{id:params.mensagemAutomaticaId,empresaId:emp,ativo:true}});
    if(!m)return null;
    if(!await Eventos.validarContexto(emp,ctx))return null;
  }
  const telefone=String(params.telefone||'').replace(/\D/g,'');
  if(telefone.length<8||telefone.length>15)return null;
  const chave=D.chave(params,ctx), Disparo=await D.preparar();
  const dados={empresaId:emp,mensagemAutomaticaId:params.mensagemAutomaticaId||null,telefoneDestino:telefone,
    conteudoFinal:params.conteudoFinal,imagemPath:params.imagemPath||null,status:'pendente',dataAgendada:params.dataAgendada||new Date(),contexto:{...ctx,chaveDisparo:chave}};
  const envio=await sequelize.transaction(async transaction=>{
    // Chave primária do comprovante arbitra chamadas concorrentes/processos.
    const [rec,novo]=await Disparo.findOrCreate({where:{chave},defaults:{empresaId:emp,estado:'pendente'},transaction});
    if(!novo && rec.envioId) {
      const existente=await EnvioAgendado.findOne({where:{id:rec.envioId,empresaId:emp},transaction,lock:transaction.LOCK.UPDATE});
      if(existente?.status==='cancelado' && !/^(Automação desativada|Configuração alterada|Dia removido|Evento alterado|Data de disparo expirada)/.test(existente.erroMensagem||''))return null;
      if(!existente || ['enviado','enviando','erro'].includes(existente.status)||['incerto','enviado','enviando','erro'].includes(rec.estado))return null;
      await existente.update({...dados,tentativas:existente.tentativas||0},{transaction});
      await rec.update({estado:'pendente'},{transaction});
      return existente;
    }
    // Adotar filas legadas do mesmo dia/evento, sem reenviar confirmações antigas.
    const data=T.civil(dados.dataAgendada);
    const antigos=await EnvioAgendado.findAll({where:{empresaId:emp,mensagemAutomaticaId:dados.mensagemAutomaticaId,telefoneDestino:telefone,
      status:{[Op.in]:['enviado','enviando','pendente']},dataAgendada:{[Op.gte]:T.horario(data,'00:00'),[Op.lt]:T.horario(T.somarDias(data,1),'00:00')}},transaction});
    const antigo=antigos.find(e=>{
      const c=typeof e.contexto==='string'?JSON.parse(e.contexto):e.contexto||{};
      return !c.chaveDisparo && Number(c.diasAntes||0)===Number(ctx.diasAntes||0) &&
        ['agendamentoId','clienteId','petId','lembreteId'].every(k=>String(c[k]||'')===String(ctx[k]||'')) &&
        (ctx.servicoIndice===undefined || Number(ctx.servicoIndice)===Number(c.servicoIndice||0));
    });
    if(antigo) {
      await rec.update({envioId:antigo.id,estado:antigo.status},{transaction});
      if(antigo.status!=='pendente')return null;
      await antigo.update(dados,{transaction});return antigo;
    }
    const criado=await EnvioAgendado.create(dados,{transaction});
    await rec.update({envioId:criado.id},{transaction});return criado;
  });
  if(envio && +new Date(envio.dataAgendada)<=Date.now() && !processando) {
    setImmediate(async()=>{
      if(processando)return;
      processando=true;
      try {await processarFila(emp);}catch(e){console.warn('[Marketing] Pendência preservada:',e.message);}
      finally {processando=false;lastRunAt=Date.now();}
    });
  }
  return envio;
}
function pararAgendador(){cronJob?.stop();cronJob=null;}
module.exports={iniciarAgendador,pararAgendador,processarFila,processarEnvio,agendarEnvio};
