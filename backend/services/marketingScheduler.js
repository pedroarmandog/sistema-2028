const T=require('./marketingTempo');
const E=require('./marketingEventos');
let planejando=null;
async function criarEnvios(mensagem,ref,{agora=new Date(),somenteHoje=false}={}) {
  const {Empresa}=require('../models');
  const empresa=await Empresa.findByPk(mensagem.empresaId);
  const config=T.config(mensagem.configuracaoEnvio,mensagem.tipo), envios=[];
  const nomeEmpresa=empresa?.nomeFantasia||empresa?.razaoSocial||empresa?.nome||'PetHub';
  const conteudoFinal=require('./whatsappService').substituirVariaveis(mensagem.conteudo,{...ref.variaveis,nomeEmpresa});
  for(const dia of config.dias) {
    const data=T.somarDias(ref.data,-dia), hoje=T.civil(agora);
    if(data<hoje || (somenteHoje && data!==hoje))continue;
    const instante=T.horario(data,config.hora);
    if(ref.limite && +instante>=+ref.limite)continue;
    const envio=await require('./whatsappQueue').agendarEnvio({empresaId:mensagem.empresaId,mensagemAutomaticaId:mensagem.id,
      telefone:ref.telefone,conteudoFinal,imagemPath:mensagem.imagemPath,
      dataAgendada:instante,contexto:{...ref.contexto,eventoChave:ref.chave,referenciaData:ref.data,diasAntes:dia}});
    if(envio)envios.push(envio);
  }
  return envios;
}
async function planejar(empresaFiltro,opcoes={}) {
  // Serialização local. A unicidade entre processos está no comprovante SQL.
  if(planejando)await planejando;
  const trabalho=(async()=>{
    const {MensagemAutomatica}=require('../models');
    const {Op}=require('sequelize');
    const mensagens=await E.todos(MensagemAutomatica,{where:{ativo:true,tipo:{[Op.in]:[...E.CALENDARIO]},...(empresaFiltro?{empresaId:Number(empresaFiltro)}:{})}});
    let criados=0;
    for(const mensagem of mensagens) {
      try {
        const refs=await E.referencias(mensagem,opcoes.agora||new Date());
        for(const ref of refs)criados+=(await criarEnvios(mensagem,ref,{...opcoes,somenteHoje:true})).length;
      } catch(e) {console.warn(`[Marketing][empresa:${mensagem.empresaId}][mensagem:${mensagem.id}] planejamento pendente:`,e.message);}
    }
    return criados;
  })();
  planejando=trabalho;
  try{return await trabalho;}finally{if(planejando===trabalho)planejando=null;}
}
async function disparar(tipo,variaveis,telefone,dataReferencia,contexto,empresaId) {
  const {MensagemAutomatica}=require('../models');
  const emp=Number(empresaId);
  if(!Number.isSafeInteger(emp)||emp<1)return null;
  const m=await MensagemAutomatica.findOne({where:{empresaId:emp,tipo,ativo:true}});
  if(!m)return null;
  const dono=await E.validarContexto(emp,contexto||{}); if(!dono)return null;
  // O telefone vem do cadastro validado, nunca de uma empresa/destinatário do frontend.
  telefone=dono.cliente.telefone;
  const ctx=dono.contexto;
  if(T.IMEDIATOS.has(tipo)||ctx.manual) {
    const {Empresa}=require('../models');
    const empresa=await Empresa.findByPk(emp);
    const conteudoFinal=require('./whatsappService').substituirVariaveis(m.conteudo,{...variaveis,nomeEmpresa:empresa?.nomeFantasia||empresa?.razaoSocial||empresa?.nome||'PetHub'});
    return require('./whatsappQueue').agendarEnvio({empresaId:emp,mensagemAutomaticaId:m.id,telefone,conteudoFinal,
      imagemPath:m.imagemPath,dataAgendada:new Date(),contexto:{...ctx,diasAntes:0,
        eventoChave:ctx.eventoChave||`${tipo}:${ctx.agendamentoId||ctx.petId||ctx.clienteId}:${ctx.manual?T.civil(): 'evento'}`}});
  }
  if(!E.CALENDARIO.has(tipo))throw new Error('Tipo de automação sem referência configurada.');
  const refs=await E.referencias(m);
  const matches=refs.filter(r=>['agendamentoId','petId','clienteId','lembreteId'].every(k=>ctx[k]==null||String(ctx[k])===String(r.contexto[k])));
  const envios=[];
  for(const ref of matches)envios.push(...await criarEnvios(m,ref));
  return envios.length?envios:null;
}
module.exports={planejar,criarEnvios,disparar};

async function cancelarPendentes(empresaId,filtrar,motivo) {
  const {EnvioAgendado,MensagemAutomatica}=require('../models');
  const pendentes=await E.todos(EnvioAgendado,{where:{empresaId:Number(empresaId),status:'pendente'}});
  for(const envio of pendentes) {
    const ctx=typeof envio.contexto==='string'?JSON.parse(envio.contexto):envio.contexto||{};
    if(!filtrar(envio,ctx))continue;
    const m=await MensagemAutomatica.findOne({where:{id:envio.mensagemAutomaticaId,empresaId:Number(empresaId)}});
    if(!m || !E.CALENDARIO.has(m.tipo))continue;
    const [n]=await EnvioAgendado.update({status:'cancelado',erroMensagem:motivo},{where:{id:envio.id,empresaId:Number(empresaId),status:'pendente'}});
    if(n)await require('./marketingDisparos').marcar(envio,'cancelado');
  }
}
async function sincronizarMensagem(mensagem) {
  if(!E.CALENDARIO.has(mensagem.tipo))return;
  await cancelarPendentes(mensagem.empresaId,e=>Number(e.mensagemAutomaticaId)===Number(mensagem.id),'Configuração alterada. Planejamento substituído.');
  const hoje=T.civil();
  for(const ref of await E.referencias(mensagem)) {
    if(['aniversario_pet','aniversario_tutor','produto_recorrente'].includes(mensagem.tipo) && ref.data>T.somarDias(hoje,7))continue;
    await criarEnvios(mensagem,ref);
  }
}
async function sincronizarAgendamento(agendamento,empresaId) {
  if(Number(agendamento.empresa_id)!==Number(empresaId))return;
  await cancelarPendentes(empresaId,(_,ctx)=>Number(ctx.agendamentoId)===Number(agendamento.id),'Evento alterado. Planejamento substituído.');
  const {MensagemAutomatica}=require('../models');
  const {Op}=require('sequelize');
  const mensagens=await MensagemAutomatica.findAll({where:{empresaId:Number(empresaId),ativo:true,tipo:{[Op.in]:['lembrete_agendamento','vacinas_vencendo']}}});
  for(const m of mensagens)for(const ref of await E.referencias(m))if(Number(ref.contexto.agendamentoId)===Number(agendamento.id))await criarEnvios(m,ref);
}
module.exports.sincronizarMensagem=sincronizarMensagem;
module.exports.sincronizarAgendamento=sincronizarAgendamento;
