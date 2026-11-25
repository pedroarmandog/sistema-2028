'use strict';
const crypto=require('node:crypto'),{Op}=require('sequelize'),V=require('./validacao');
function criar({ERP,env=process.env,agora=()=>new Date(),sdk,legado=()=>require('../whatsappService'),push=()=>require('../pushNotificationService'),sincronizarAgendamento=(ag,emp)=>require('../marketingScheduler').sincronizarAgendamento(ag,emp),boasVindas=(...args)=>require('../../controllers/marketingController').dispararMensagemAutomatica(...args)}={}){
 const m=require('./modelos').modelos(ERP.sequelize),assinaturas=require('./assinaturas').criar({ERP,m,env,agora,statusWhatsApp:(emp,provider)=>wa.status(emp,provider)});
 const ia=require('./openai').criar({env,sdk}),wa=require('./whatsapp').criar({env,m,legado,agora});
 const consumo=require('./consumo').criar({ERP,m,assinaturas,agora});
 async function notificar(emp,tipo,dados,chave){
  if(tipo==='agendamento'&&dados.agendamentoId){try{const ag=await ERP.Agendamento.findOne({where:{id:dados.agendamentoId,empresa_id:emp}});if(ag)await sincronizarAgendamento(ag,emp);}catch{await m.Notificacao.findOrCreate({where:{empresa_id:emp,chave:V.hash('sincronizacao:'+chave)},defaults:{tipo:'erro',dados:{codigo:'IA_LEMBRETE_PENDENTE',agendamentoId:dados.agendamentoId}}});}}
  if(tipo==='cadastro'&&dados.petId){
   const pet=await ERP.Pet.findOne({where:{id:dados.petId,empresa_id:emp},attributes:['id','nome','cliente_id']});
   if(pet&&await ERP.Pet.count({where:{cliente_id:pet.cliente_id}})===1){
    const cliente=await ERP.Cliente.findOne({where:{id:pet.cliente_id,empresa_id:emp},attributes:['id','nome','telefone']});
    if(cliente){const[notice,novo]=await m.Notificacao.findOrCreate({where:{empresa_id:emp,chave:V.hash('boas-vindas-primeiro-pet:'+cliente.id)},defaults:{tipo:'integracao_boas_vindas',dados:{petId:pet.id,clienteId:cliente.id,estado:'iniciado'},entregue_em:agora()}});
     if(novo){try{await boasVindas('boas_vindas',{nomeTutor:cliente.nome,nomePet:pet.nome},cliente.telefone||'',null,{clienteId:cliente.id,petId:pet.id},emp);await notice.update({dados:{...V.json(notice.dados),estado:'delegado_automacao_existente'}});}catch{await notice.update({dados:{...V.json(notice.dados),estado:'incerto'}});await m.Notificacao.findOrCreate({where:{empresa_id:emp,chave:V.hash('boas-vindas-erro:'+pet.id)},defaults:{tipo:'erro',dados:{codigo:'IA_BOAS_VINDAS_PENDENTE',petId:pet.id}}});}}
    }
   }
  }
  return m.Notificacao.findOrCreate({where:{empresa_id:emp,chave:V.hash(chave)},defaults:{tipo,dados}});}
 const ferramentas=require('./ferramentas').criar({ERP,m,assinaturas,agora,notificar});
 const financeiro=require('./financeiro').criar({ERP,m,assinaturas,agora});
 const conversas=require('./conversas').criar({m,env});
 const relatorios=require('./relatorios').criar({ERP,m,assinaturas,agora});
 const motor=require('./motor').criar({ERP,m,assinaturas,consumo,ia,wa,ferramentas,env,agora,notificar});
 async function pronto(emp,dados,contrato,transaction){
  if(env.PETHUB_IA_ENABLED!=='true')throw V.falha('Módulo IA desligado no servidor.',409);
  if(env.PETHUB_IA_ALLOW_LIVE!=='true')throw V.falha('Atendimento real bloqueado no servidor. Habilite PETHUB_IA_ALLOW_LIVE após homologação.',409);
  if(dados.whatsapp.provedor==='oficial')throw V.falha('Canal oficial em homologação: conciliação financeira pendente. Utilize a conexão atual do PetHub.',409);
  V.cifrar({teste:true},env,'config');if(!env.OPENAI_API_KEY)throw V.falha('Configure a chave central da OpenAI no servidor.',503);
  const g=await m.Global.findByPk(1,{transaction}),p=await m.Preco.findByPk(dados.modelo,{transaction});
  if(!g?.habilitado||Number(g.teto_micros)<=0||Number(contrato.teto_micros)<=0||Number(contrato.tokens)<=0||!p?.ativo||!p.verificado_em)throw V.falha('Configure os limites e valide o modelo/preços no Admin.',409);
  if(!(await wa.status(emp,dados.whatsapp.provedor)).conectado)throw V.falha('WhatsApp não conectado ou não validado.',409);
  if(dados.permissoes.includes('audio')&&(!env.OPENAI_TRANSCRIPTION_MODEL||!contrato.modelos.includes(env.OPENAI_TRANSCRIPTION_MODEL)))throw V.falha('Modelo de transcrição não autorizado no contrato.',409);
  return true;
 }
 const configuracao=require('./configuracao').criar({ERP,m,assinaturas,env,agora,pronto});
 async function permitidoGestor(req){
  const user=await ERP.Usuario.findByPk(req.user.id,{attributes:['id','permissoes']});if(!user)throw V.falha('Usuário não encontrado.',401);
  let p=user.permissoes;if(p==null||p==='')return;
  if(typeof p==='string'){try{p=JSON.parse(p);}catch{throw V.falha('Permissões inválidas.',403);}}
  if(!Array.isArray(p))throw V.falha('Permissões inválidas.',403);
  if(!p.length||p.some(v=>['pethub_ia.gerenciar','configuracao.pethub_ia','configuracao.geral','configuracao'].includes(v)))return;
  throw V.falha('Sem permissão para gerenciar PetHub IA.',403);
 }
 async function testar(emp,user,b){
  if(env.PETHUB_IA_ENABLED!=='true')throw V.falha('Módulo IA desligado no servidor.',503);
  V.objeto(b,['texto','telefone','conversaId','idempotencia']);const texto=V.texto(b.texto,2000,true),state=await assinaturas.estado(emp);
  const contact=b.telefone?V.telefone(b.telefone):null;
  const key=V.hash('teste:'+user+':'+V.texto(b.idempotencia,64,true));
  return ERP.sequelize.transaction(async transaction=>{
   const o={transaction};const existing=await m.Fila.findOne({where:{empresa_id:emp,chave:key},...o});if(existing)return{id:existing.id,conversaId:existing.conversa_id};
   let c=b.conversaId?await m.Conversa.findOne({where:{id:b.conversaId,empresa_id:emp,provedor:'teste',dono:'teste:'+user},...o}):null;
   if(b.conversaId&&!c)throw V.falha('Conversa de teste não encontrada para este usuário.',404);
   c??=await m.Conversa.create({empresa_id:emp,provedor:'teste',contato_hash:V.hash('teste:'+user+':'+(contact||'')+':'+crypto.randomUUID()),contato_cifrado:V.cifrar({telefone:contact},env,'contato:'+emp),dono:'teste:'+user},o);
   // O dono é validado separadamente do contato para permitir múltiplos testes independentes.
   if(c.dono!=='teste:'+user)throw V.falha('Conversa de outro usuário.',403);
   const msg=await m.Mensagem.create({empresa_id:emp,conversa_id:c.id,papel:'user',externa:key,texto_cifrado:V.cifrar({texto},env,'msg:'+emp),evento:{recebida_em:agora().toISOString()}},o);
   const job=await m.Fila.create({empresa_id:emp,conversa_id:c.id,chave:key,estado:'pendente',disponivel:agora(),teste:true,dados:{mensagens:[msg.id],usuario:user}},o);await msg.update({job_id:job.id},o);
   return{id:job.id,conversaId:c.id};
  });
 }
 async function conversa(emp,id){
  const c=await m.Conversa.findOne({where:{id,empresa_id:emp,provedor:{[Op.ne]:'teste'}}});if(!c)throw V.falha('Conversa não encontrada.',404);
  const page=await conversas.mensagens(emp,id),phone=V.decifrar(c.contato_cifrado,env,'contato:'+emp).telefone;let cadastro=null,cadastroAviso=null;
  if(phone&&!c.bloqueada){try{const cliente=await ferramentas.cliente({empresaId:emp,telefone:phone,conversa:c});if(cliente){const pets=await ERP.Pet.findAll({where:{cliente_id:cliente.id,[Op.or]:[{empresa_id:emp},{empresa_id:null}]},attributes:['id','nome','especie','raca','porte'],limit:100});cadastro={cliente:{id:cliente.id,nome:cliente.nome},pets:pets.map(p=>p.get({plain:true}))};}}catch(e){cadastroAviso=e.status&&e.status<500?e.message:'Cadastro temporariamente indisponível.';}}
  const scope={empresa_id:emp,conversa_id:id},[entrada,saida,incertas,respostas]=await Promise.all([m.Consumo.sum('entrada',{where:{...scope,estado:'confirmado'}}),m.Consumo.sum('saida',{where:{...scope,estado:'confirmado'}}),m.Consumo.count({where:{...scope,estado:{[Op.ne]:'confirmado'}}}),m.Fila.count({where:{...scope,teste:false,estado:'enviado'}})]),context=V.json(c.contexto);
  return{conversa:{id:c.id,estado:c.estado,dono:c.dono,ultima_entrada:c.ultima_entrada,provedor:c.provedor,telefone:phone},cadastro,cadastroAviso,contexto:{atualizado_em:context.atualizado_em||null,trechos:context.resumo_cifrado?V.decifrar(context.resumo_cifrado,env,'contexto:'+emp).notas||[]:[]},consumo:{respostas,tokensConfirmados:Number(entrada||0)+Number(saida||0),chamadasSemUsoConfirmado:incertas},mensagens:page.itens,mensagensCursor:page.proximoCursor,temMaisMensagens:page.temMais,acoes:await m.Acao.findAll({where:scope,attributes:['id','tipo','estado','proposta','resultado','createdAt'],order:[['createdAt','DESC']],limit:30})};
 }

 async function assumir(emp,id,user,retomar=false){
  await assinaturas.estado(emp);return ERP.sequelize.transaction(async transaction=>{
   const o={transaction};const c=await m.Conversa.findOne({where:{id,empresa_id:emp,provedor:{[Op.ne]:'teste'}},...o,lock:transaction.LOCK.UPDATE});if(!c)throw V.falha('Conversa não encontrada.',404);
   await c.update({estado:retomar?'ia':'humano',dono:retomar?null:String(user),revisao:c.revisao+1,lease:retomar?c.lease:null,lease_ate:retomar?c.lease_ate:null},o);
   await m.Fila.update({estado:'cancelado',erro:'HUMANO_ASSUMIU'},{where:{empresa_id:emp,conversa_id:id,estado:{[Op.in]:['pendente','processando','pronto']}},...o});
   await assinaturas.auditar(emp,user,retomar?'devolvido_ia':'humano_assumiu',{conversaId:id},transaction);return{id,estado:c.estado};
  });
 }
 async function entradaBaileys(empresaId,sessao,msg,lib){
  if(env.PETHUB_IA_ENABLED!=='true'||env.PETHUB_IA_ALLOW_LIVE!=='true'||String(sessao)!==String(empresaId))return;
  const jid=msg.key?.remoteJid||'';if(!jid.endsWith('@s.whatsapp.net')||jid==='status@broadcast'||!msg.key?.id)return;
  const content=msg.message?.ephemeralMessage?.message||msg.message;const text=content?.conversation||content?.extendedTextMessage?.text||'';
  if(!text&&!content?.audioMessage)return;
  if(msg.messageTimestamp&&Math.abs(+agora()-Number(msg.messageTimestamp)*1000)>10*60000)return;
  const audio=content?.audioMessage?{protobuf:Buffer.from(lib.proto.WebMessageInfo.encode(msg).finish()).toString('base64')}:null;
  if(audio&&audio.protobuf.length>90000)return;
  try{return await motor.receber({empresaId,provedor:'baileys',externa:msg.key.id,telefone:jid.split('@')[0],texto:text,audio,propria:!!msg.key.fromMe});}catch(e){if(![403,409].includes(e.status))await notificar(empresaId,'erro',{codigo:e.code||'IA_RECEBIMENTO'},'entrada:'+V.hash(msg.key.id)).catch(()=>{});}
 }
 let maintenance;
 async function manter(){
  // Retenção só remove conteúdo do módulo; consumo e auditoria financeira são preservados.
  const configs=await m.Config.findAll();for(const c of configs){const dias=Number(V.json(c.dados).retencao_dias)||90,cutoff=new Date(+agora()-dias*86400000),where={empresa_id:c.empresa_id,createdAt:{[Op.lt]:cutoff}};await m.Mensagem.destroy({where});await require('./privacidade').limparJobs(m,where);await require('./privacidade').limparAcoes(m,{...where,expira:{[Op.lt]:cutoff}});
   const antigas=await m.Conversa.findAll({where:{empresa_id:c.empresa_id,ultima_entrada:{[Op.lt]:cutoff},lease:null,bloqueada:false},limit:100});for(const conversa of antigas)await conversa.update({contato_cifrado:V.cifrar({telefone:null},env,'contato:'+c.empresa_id),contato_hash:V.hash('retido:'+conversa.id),nome:null,contexto:{},bloqueada:true});}
  const notices=await m.Notificacao.findAll({where:{entregue_em:null},limit:20,order:[['createdAt','ASC']]});
  for(const notice of notices){const config=configs.find(c=>c.empresa_id===notice.empresa_id);if(V.json(config?.dados).notificacoes?.includes(notice.tipo)){await push().notificarEmpresa(notice.empresa_id,'pethub_ia',{...V.json(notice.dados),tipo:notice.tipo,url:'/configuracoes/pethub-ia.html'});}await notice.update({entregue_em:agora()});}
 }
 function iniciar(){if(env.PETHUB_IA_ENABLED!=='true')return;motor.iniciar();if(!maintenance){maintenance=setInterval(()=>manter().catch(()=>{}),30000);maintenance.unref?.();}}
 function parar(){motor.parar();clearInterval(maintenance);maintenance=null;}
 return{ERP,m,env,agora,assinaturas,ia,wa,consumo,configuracao,ferramentas,motor,relatorios,conversas,financeiro,notificar,pronto,permitidoGestor,testar,conversa,assumir,entradaBaileys,iniciar,parar,manter};
}
let singleton;function instancia(){return singleton??=criar({ERP:require('../../models')});}
module.exports={criar,instancia};
