'use strict';
const V=require('./validacao'),{FUNCOES}=require('./modelos');
const PERSONALIDADES=['amigavel','extrovertida','profissional','carinhosa','descontraida','objetiva','consultiva','comercial','formal'];
function validar(b){
 V.objeto(b,['avatar','identidade','personalidade','instrucoes','scripts','conhecimento','permissoes','agenda','atendimento','whatsapp','notificacoes','retencao_dias','modelo']);
 const id=V.objeto(b.identidade||{},['nome','nomeEmpresa','apresentacao','boasVindas','encerramento','idioma','idiomas']);
 const identidade={nome:V.texto(id.nome||'',80),nomeEmpresa:V.texto(id.nomeEmpresa||'',200),apresentacao:V.texto(id.apresentacao||'',500),boasVindas:V.texto(id.boasVindas||'',500),encerramento:V.texto(id.encerramento||'',500),idioma:V.texto(id.idioma||'pt-BR',20),idiomas:V.lista(id.idiomas||[],null,5)};
 const p=V.objeto(b.personalidade||{},['caracteristicas','formalidade','emojis','preferidos','tamanho','comportamentos']);
 const personalidade={caracteristicas:V.lista(p.caracteristicas||['profissional'],PERSONALIDADES,5),formalidade:V.inteiro(p.formalidade??3,1,5),emojis:V.inteiro(p.emojis??1,0,3),preferidos:V.texto(p.preferidos||'',40),tamanho:V.inteiro(p.tamanho??2,1,3),comportamentos:V.lista(p.comportamentos||[],['nome_cliente','nome_pet','acolhimento','servicos_adicionais','produtos_relacionados','incentivar_agenda','evitar_repeticao','encerrar_cordial','evitar_excesso_comercial'])};
 const scripts=(b.scripts||[]);if(!Array.isArray(scripts)||scripts.length>30)throw V.falha('Limite de 30 scripts.');
 const mapaScripts=scripts.map(s=>{V.objeto(s,['id','nome','categoria','descricao','instrucoes','exemplos','prioridade','ativo','condicoes']);return{id:V.texto(s.id,64,true),nome:V.texto(s.nome,100,true),categoria:V.texto(s.categoria,80,true),descricao:V.texto(s.descricao||'',300),instrucoes:V.texto(s.instrucoes||'',2000),exemplos:V.texto(s.exemplos||'',1500),prioridade:V.inteiro(s.prioridade||0,0,100),ativo:s.ativo===true,condicoes:V.texto(s.condicoes||'',500)};});
 const k=V.objeto(b.conhecimento||{},['comercial','faq']);
 const faq=k.faq||[];if(!Array.isArray(faq)||faq.length>60)throw V.falha('Limite de 60 perguntas frequentes.');
 const conhecimento={comercial:V.texto(k.comercial||'',6000),faq:faq.map(f=>{V.objeto(f,['id','pergunta','resposta','ativo']);return{id:V.texto(f.id,64,true),pergunta:V.texto(f.pergunta,300,true),resposta:V.texto(f.resposta,1200,true),ativo:f.ativo===true};})};
 const agenda=V.objeto(b.agenda||{},['modo','regras']);if(!['consulta','aprovacao','automatico'].includes(agenda.modo||'consulta'))throw V.falha('Modo de agendamento inválido.');
 const regras=agenda.regras?require('../clientePortal/agenda').validarRegras(agenda.regras):null;
 const atendimento=V.objeto(b.atendimento||{},['modo','dias','inicio','fim','bloqueados','agrupamento_ms','limite_turnos','max_entrada','max_saida','max_ferramentas','max_chamadas']);
 if(!['24h','fora_expediente','horario'].includes(atendimento.modo||'24h'))throw V.falha('Horário da IA inválido.');
 const validarHora=v=>{if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(v))throw V.falha('Hora inválida.');return v;};
 const a={modo:atendimento.modo||'24h',dias:(atendimento.dias||[0,1,2,3,4,5,6]).map(v=>V.inteiro(v,0,6)),inicio:validarHora(atendimento.inicio||'08:00'),fim:validarHora(atendimento.fim||'18:00'),bloqueados:V.lista(atendimento.bloqueados||[],null,500).map(v=>/^[a-f0-9]{64}$/.test(v)?v:V.hash(V.telefone(v))),agrupamento_ms:V.inteiro(atendimento.agrupamento_ms??2000,0,10000),limite_turnos:V.inteiro(atendimento.limite_turnos??20,1,60),max_entrada:V.inteiro(atendimento.max_entrada??12000,2000,30000),max_saida:V.inteiro(atendimento.max_saida??500,100,1500),max_ferramentas:V.inteiro(atendimento.max_ferramentas??5,1,8),max_chamadas:V.inteiro(atendimento.max_chamadas??4,1,6)};
 const wa=V.objeto(b.whatsapp||{},['provedor']);if(!['baileys','oficial'].includes(wa.provedor||'baileys'))throw V.falha('Provedor inválido.');
 return{identidade,personalidade,instrucoes:V.texto(b.instrucoes||'',6000),scripts:mapaScripts,conhecimento,permissoes:V.lista(b.permissoes||['duvidas','humano'],FUNCOES),agenda:{modo:agenda.modo||'consulta',regras},atendimento:a,whatsapp:{provedor:wa.provedor||'baileys'},notificacoes:V.lista(b.notificacoes||['agendamento','humano','erro','franquia'],['agendamento','cadastro','humano','erro','franquia','taxidog','reclamacao']),retencao_dias:V.inteiro(b.retencao_dias??90,7,365),modelo:V.texto(b.modelo||'',100)};
}
function criar({ERP,m,assinaturas,env,pronto,agora=()=>new Date()}){
 async function obter(emp){await assinaturas.estado(emp);const c=await m.Config.findByPk(emp);return{dados:V.json(c?.dados),operacional:!!c?.operacional,etapa:c?.etapa||0,revisao:c?.revisao||0,teste_em:c?.teste_em||null};}
 async function salvar(emp,b,autor){
  V.objeto(b,['dados','etapa','operacional','revisao']);const dados=validar(b.dados);const estado=await assinaturas.estado(emp);
  const features=V.json(estado.contrato).funcionalidades||[];if(dados.permissoes.some(f=>!features.includes(f)))throw V.falha('Recurso não contratado.',403);
  if(dados.modelo&&!estado.contrato.modelos.includes(dados.modelo))throw V.falha('Modelo não contratado.',403);
  if(!features.includes('scripts_avancados')&&dados.scripts.length>10)throw V.falha('O plano permite até dez scripts.',403);
  const etapa=V.inteiro(b.etapa,0,7);
  return ERP.sequelize.transaction(async transaction=>{
   const o={transaction};await m.Global.findByPk(1,{...o,lock:transaction.LOCK.UPDATE});
   const atual=await assinaturas.estado(emp,{transaction});if(atual.assinatura.revisao!==estado.assinatura.revisao)throw V.falha('Contrato alterado. Atualize antes de salvar.',409);const c=await m.Config.findByPk(emp,{...o,lock:transaction.LOCK.UPDATE});
   if(c.revisao!==V.inteiro(b.revisao))throw V.falha('Configuração mudou. Atualize antes de salvar.',409);
   const antes=V.json(c.dados),modificada=JSON.stringify(dados)!==JSON.stringify({...antes,avatar:undefined});
   const testada=!modificada&&!!c.teste_em;
   if(b.operacional===true){
    if(etapa!==7||!testada||!dados.identidade.nome||!dados.identidade.apresentacao||!dados.modelo)throw V.falha('Conclua as etapas e um teste real antes de ativar.',409);
    if(dados.agenda.modo!=='consulta'&&!dados.agenda.regras)throw V.falha('Configure as regras da agenda.');
    await pronto(emp,dados,estado.contrato,transaction);
   }
   await c.update({dados:{...dados,...(antes.avatar?{avatar:antes.avatar}:{})},etapa,operacional:b.operacional===true,teste_em:modificada?null:c.teste_em,revisao:c.revisao+1},o);
   await m.Fila.update({estado:'cancelado',erro:'CONFIGURACAO_ALTERADA'},{where:{empresa_id:emp,estado:{[require('sequelize').Op.in]:['pendente','processando','pronto']}},...o});
   await assinaturas.auditar(emp,autor,'configuracao_alterada',{revisao:c.revisao,operacional:c.operacional,etapa},transaction);
   return {dados:V.json(c.dados),operacional:c.operacional,etapa:c.etapa,revisao:c.revisao,teste_em:c.teste_em};
  });
 }
 return{obter,salvar,validar};
}
module.exports={criar,validar};
