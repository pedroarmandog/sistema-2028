'use strict';
const { Op }=require('sequelize'),crypto=require('node:crypto'),Ajv=require('ajv');
const V=require('./validacao'),Agenda=require('../clientePortal/agenda');
const ajv=new Ajv({allErrors:false,strict:true});
const str={type:'string',maxLength:200},id={type:'string',minLength:1,maxLength:64},opt={type:['string','null'],maxLength:300};
const specs=[
 ['informacoesEmpresa','duvidas','Consultar endereço e informações comerciais públicas.',{}],
 ['buscarProdutos','produtos','Buscar poucos produtos por nome; valores são consultados ao vivo.',{busca:str}],
 ['consultarServicos','servicos','Consultar os serviços publicados para esta recepcionista.',{}],
 ['identificarCliente','duvidas','Identificar somente o remetente e seus pets pelo telefone autenticado.',{}],
 ['consultarStatusPet','status_pet','Consultar a situação atual de um atendimento do próprio remetente.',{agendamentoId:id}],
 ['consultarAgendamentos','agendamentos','Consultar somente próximos agendamentos do remetente.',{}],
 ['consultarHorarios','horarios','Consultar horários reais para um pet e serviço.',{petId:id,servicoId:id,data:{type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}$'}}],
 ['cadastrarCliente','cadastrar_cliente','Propor cadastro do remetente. O backend solicita confirmação explícita.',{nome:str}],
 ['cadastrarPet','cadastrar_pet','Propor cadastro de um pet pertencente ao remetente.',{nome:str,especie:str,raca:opt,porte:opt}],
 ['criarAgendamento','agendar','Propor agendamento, mostrando preço real e pedindo confirmação. Nunca grava sem confirmação posterior.',{petId:id,servicoId:id,data:str,hora:str,taxidog:{type:'boolean'}}],
 ['cancelarAgendamento','cancelar','Propor cancelamento de agendamento do próprio remetente.',{agendamentoId:id}],
 ['reagendarAgendamento','reagendar','Propor mudança de horário de agendamento do próprio remetente.',{agendamentoId:id,data:str,hora:str}],
 ['solicitarTaxiDog','taxidog','Propor táxi para um agendamento do próprio remetente.',{agendamentoId:id}],
 ['atualizarCliente','atualizar_cliente','Propor atualização apenas do nome do remetente.',{nome:str}],
 ['transferirHumano','humano','Transferir para a equipe e pausar IA nesta conversa.',{motivo:str}],
];
const schemas=Object.fromEntries(specs.map(([name,feature,description,properties])=>[name,{feature,tool:{type:'function',name,description,strict:true,parameters:{type:'object',properties,required:Object.keys(properties),additionalProperties:false}},validate:ajv.compile({type:'object',properties,required:Object.keys(properties),additionalProperties:false})}]));
function criar({ERP,m,assinaturas,agora=()=>new Date(),notificar=async()=>{}}){
 const agenda=Agenda.criarAgenda({ERP,m:{},agora});
 function permitido(ctx,feature){return ctx.contrato.funcionalidades.includes(feature)&&ctx.dados.permissoes.includes(feature);}
 function tools(ctx){return specs.filter(([name,feature])=>permitido(ctx,feature)).map(([name])=>schemas[name].tool);}
 async function cliente(ctx,o={}){
  if(ctx.teste&&!ctx.telefone)return null;
  const phone=V.telefone(ctx.telefone),last=phone.slice(-8);
  const rows=await ERP.Cliente.findAll({where:{empresa_id:ctx.empresaId,telefone:{[Op.like]:'%'+last.slice(-4)+'%'}},attributes:['id','nome','telefone','ativo'],limit:30,...o,logging:false});
  if(rows.length>=30)throw V.falha('Busca de telefone requer revisão da equipe.',409);
  const matches=rows.filter(r=>{try{return V.telefone(r.telefone)===phone;}catch{return false;}});
  if(matches.length>1)throw V.falha('Há cadastros ambíguos para este telefone. Solicite atendimento humano.',409);
  if(matches[0]?.ativo===false)throw V.falha('Cadastro não está ativo.',403);
  if(matches[0]&&!ctx.teste&&ctx.conversa?.nome!==matches[0].nome)await ctx.conversa?.update({nome:matches[0].nome});
  return matches[0]||null;
 }
 async function exigirCliente(ctx,o){const c=await cliente(ctx,o);if(!c)throw V.falha('Cliente ainda não identificado. Cadastre ou transfira para a equipe.',409);return c;}
 async function pet(ctx,petId,o={}){const c=await exigirCliente(ctx,o);const p=await ERP.Pet.findOne({where:{id:V.inteiro(petId,1),cliente_id:c.id,[Op.or]:[{empresa_id:ctx.empresaId},{empresa_id:null}]},attributes:['id','nome','especie','raca','porte','ativo'],...o,logging:false});if(!p||p.ativo===false)throw V.falha('Pet não encontrado para este remetente.',404);return{pet:p,cliente:c};}
 const cfg=ctx=>({empresa_id:ctx.empresaId,ativo:true,regras:ctx.dados.agenda.regras});
 async function agendamento(ctx,id,o={}){const c=await exigirCliente(ctx,o),pets=await ERP.Pet.findAll({where:{cliente_id:c.id,[Op.or]:[{empresa_id:ctx.empresaId},{empresa_id:null}]},attributes:['id'],...o});const a=await ERP.Agendamento.findOne({where:{id:V.inteiro(id,1),empresa_id:ctx.empresaId,petId:{[Op.in]:pets.map(p=>p.id)}},...o});if(!a)throw V.falha('Agendamento não encontrado para este remetente.',404);return a;}
 async function propor(ctx,tipo,dados){
  if(ctx.teste)return{simulado:true,tipo,dados,mensagem:'A operação foi apenas simulada; nenhum cadastro foi gravado.'};
  const key=V.hash(ctx.job.id+':'+tipo+':'+JSON.stringify(dados));
  const [a]=await m.Acao.findOrCreate({where:{empresa_id:ctx.empresaId,idempotencia:key},defaults:{conversa_id:ctx.conversa.id,job_id:ctx.job.id,tipo,estado:'proposta',proposta:{...dados,assinatura_revisao:ctx.assinatura.revisao,config_revisao:ctx.config.revisao},expira:new Date(+agora()+10*60000)}});
  return{confirmacaoNecessaria:true,acaoId:a.id,resumo:dados.resumo};
 }
 async function executar(ctx,name,args){
  const spec=schemas[name];if(!spec||!spec.validate(args))throw V.falha('Parâmetros da ferramenta inválidos.');
  if(!permitido(ctx,spec.feature))throw V.falha('Ferramenta não autorizada.',403);
  if(!ctx.teste)await assinaturas.estado(ctx.empresaId,{operacional:true});
  const o={logging:false};
  let result;
  if(name==='informacoesEmpresa'){
   const keys=['id','nome','nomeFantasia','telefone1','telefone','endereco','numero','bairro','cidade','estado'].filter(k=>ERP.Empresa.rawAttributes[k]);
   const e=await ERP.Empresa.findByPk(ctx.empresaId,{attributes:keys});result={empresa:e?.get({plain:true}),informacoes:ctx.dados.conhecimento.comercial,faq:ctx.dados.conhecimento.faq.filter(f=>f.ativo)};
  }
  if(name==='buscarProdutos'){
   const q=V.texto(args.busca,80,true).replace(/[%_\\]/g,'');const rows=await ERP.Produto.findAll({where:{empresa_id:ctx.empresaId,nome:{[Op.like]:'%'+q+'%'},tipo:'produto',[Op.or]:[{ativo:{[Op.ne]:'nao'}},{ativo:null}]},attributes:['id','nome',...(permitido(ctx,'precos')?['preco']:[]),...(permitido(ctx,'estoque')?['estoqueAtual']:[])],limit:5,...o});
   result=rows.map(p=>({id:p.id,nome:p.nome,...(permitido(ctx,'precos')?{preco:Number.isFinite(Number(p.preco))?Number(p.preco):null}:{}),...(permitido(ctx,'estoque')?{estoque:Number(p.estoqueAtual)||0,disponivel:Number(p.estoqueAtual)>0}:{})}));
  }
  if(name==='consultarServicos'){
   const r=ctx.dados.agenda.regras;if(!r?.servicos?.length)return{servicos:[],motivo:'Serviços ainda não publicados para a IA.'};
   const rows=await ERP.Produto.findAll({where:{empresa_id:ctx.empresaId,id:{[Op.in]:r.servicos.map(s=>s.id)},tipo:{[Op.in]:['servico','serviço']}},attributes:['id','nome',...(permitido(ctx,'precos')?['preco']:[])],limit:50,...o});
   result=rows.map(s=>({id:s.id,nome:s.nome,...(permitido(ctx,'precos')&&r.servicos.find(x=>x.id===s.id)?.mostrarPreco?{preco:Number.isFinite(Number(s.preco))?Number(s.preco):null}:{}),duracao:r.servicos.find(x=>x.id===s.id)?.duracao}));
  }
  if(name==='identificarCliente'){const c=await cliente(ctx);result=c?{id:c.id,nome:c.nome,pets:(await ERP.Pet.findAll({where:{cliente_id:c.id,[Op.or]:[{empresa_id:ctx.empresaId},{empresa_id:null}]},attributes:['id','nome','especie','raca','porte'],limit:30})).map(p=>p.get({plain:true}))}:{identificado:false};}
  if(name==='consultarStatusPet'){const a=await agendamento(ctx,args.agendamentoId);result={id:a.id,petId:a.petId,status:a.status,dataAgendamento:a.dataAgendamento,horario:a.horario,servico:a.servico};}
  if(name==='consultarAgendamentos'){const c=await exigirCliente(ctx),pets=await ERP.Pet.findAll({where:{cliente_id:c.id,[Op.or]:[{empresa_id:ctx.empresaId},{empresa_id:null}]},attributes:['id']});result=await ERP.Agendamento.findAll({where:{empresa_id:ctx.empresaId,petId:{[Op.in]:pets.map(p=>p.id)},dataAgendamento:{[Op.gte]:agora()}},attributes:['id','petId','dataAgendamento','horario','servico','status'],order:[['dataAgendamento','ASC']],limit:10});}
  if(name==='consultarHorarios'){await pet(ctx,args.petId);if(!ctx.dados.agenda.regras)throw V.falha('Agenda da recepcionista não configurada.',409);result=await agenda.horarios(cfg(ctx),Number(args.petId),args.servicoId,args.data);}
  if(name==='cadastrarCliente')result=await propor(ctx,name,{nome:V.texto(args.nome,100,true),resumo:'Cadastrar seu nome como '+args.nome+' neste pet shop.'});
  if(name==='cadastrarPet'){await exigirCliente(ctx);const values={nome:V.texto(args.nome,100,true),especie:V.texto(args.especie,100,true),raca:args.raca?V.texto(args.raca,100):null,porte:args.porte};if(values.porte&&!['Pequeno','Médio','Grande','Gigante'].includes(values.porte))throw V.falha('Porte inválido.');result=await propor(ctx,name,{...values,resumo:'Cadastrar o pet '+values.nome+' no seu cadastro.'});}
  if(name==='atualizarCliente'){await exigirCliente(ctx);result=await propor(ctx,name,{nome:V.texto(args.nome,100,true),resumo:'Alterar seu nome para '+args.nome+'.'});}
  if(name==='criarAgendamento'){
   if(ctx.dados.agenda.modo==='consulta')throw V.falha('A conclusão do agendamento deve ser feita pela equipe.',409);
   const own=await pet(ctx,args.petId);const s=await agenda.validar(cfg(ctx),{petId:Number(args.petId),servicoId:args.servicoId,data:args.data,hora:args.hora});
   if(args.taxidog&&!permitido(ctx,'taxidog'))throw V.falha('Táxi Dog não autorizado.',403);
   if(!Number.isFinite(s.valor))throw V.falha('Preço do serviço ainda precisa ser confirmado pela equipe.',409);
   result=await propor(ctx,name,{...args,preco:s.valor,resumo:`${s.nome} para ${own.pet.nome}, em ${args.data} às ${args.hora}${permitido(ctx,'precos')&&s.mostrarPreco?' por R$ '+s.valor.toFixed(2).replace('.',','):'. Valor a confirmar com a equipe'}${args.taxidog?' com Táxi Dog':''}.`});
  }
  if(['cancelarAgendamento','reagendarAgendamento','solicitarTaxiDog'].includes(name)){
   const a=await agendamento(ctx,args.agendamentoId);if(['cancelado','concluido'].includes(a.status)||+a.dataAgendamento<=+agora())throw V.falha('Este atendimento não pode ser alterado automaticamente.',409);
   result=await propor(ctx,name,{...args,versao:new Date(a.updatedAt).toISOString(),resumo:name==='cancelarAgendamento'?'Cancelar o atendimento '+a.id+'.':name==='solicitarTaxiDog'?'Solicitar Táxi Dog para o atendimento '+a.id+'.':'Alterar o atendimento '+a.id+' para '+args.data+' às '+args.hora+'.'});
  }
  if(name==='transferirHumano'){
   if(!ctx.teste){await ctx.conversa.update({estado:'humano',dono:'ia:'+ctx.job.id,revisao:ctx.conversa.revisao+1});await notificar(ctx.empresaId,'humano',{conversaId:ctx.conversa.id,motivo:V.texto(args.motivo,200)},'humano:'+ctx.job.id);}
   result={transferido:!ctx.teste,simulado:ctx.teste,mensagem:'O atendimento foi encaminhado à equipe. Não há promessa de resposta imediata.'};
  }
  await assinaturas.auditar(ctx.empresaId,'ia','ferramenta',{nome:name,conversaId:ctx.conversa.id,jobId:ctx.job.id,simulado:ctx.teste,ids:Array.isArray(result)?result.map(x=>x.id).filter(Boolean).slice(0,5):[]});
  return JSON.parse(JSON.stringify(result??{}));
 }
 async function confirmar(ctx,acaoId,mensagemId,{aprovador}={}){
  if(ctx.teste)throw V.falha('Ambiente de testes não executa ações.',403);
  return Agenda.serializar(ERP,ctx.empresaId,async transaction=>{
   const o={transaction,logging:false};await m.Global.findByPk(1,{...o,lock:transaction.LOCK.UPDATE});await m.Assinatura.findByPk(ctx.empresaId,{...o,lock:transaction.LOCK.UPDATE});const state=await assinaturas.estado(ctx.empresaId,{transaction,operacional:true});
   const a=await m.Acao.findOne({where:{id:acaoId,empresa_id:ctx.empresaId,conversa_id:ctx.conversa.id},...o,lock:transaction.LOCK.UPDATE});if(!a)throw V.falha('Ação não encontrada.',404);
   if(a.estado==='concluida')return V.json(a.resultado);
   if(!['aguardando_confirmacao','aguardando_gestor'].includes(a.estado)||+a.expira<=+agora())throw V.falha('Confirmação expirada. Solicite uma nova proposta.',409);
   const spec=schemas[a.tipo];if(!spec||!permitido({...ctx,...state},spec.feature))throw V.falha('Ação não autorizada.',403);
   const d=V.json(a.proposta);
   if(d.assinatura_revisao!==state.assinatura.revisao||d.config_revisao!==state.config.revisao)throw V.falha('As regras foram atualizadas. Solicite nova confirmação.',409);
   let result;
   if(a.tipo==='criarAgendamento'&&state.dados.agenda.modo==='aprovacao'&&!aprovador){await a.update({estado:'aguardando_gestor',confirmada_mensagem:mensagemId},o);transaction.afterCommit(()=>notificar(ctx.empresaId,'agendamento',{acaoId:a.id,conversaId:ctx.conversa.id},'aprovacao:'+a.id));return{aguardandoAprovacao:true,id:a.id,mensagem:'Sua solicitação foi enviada à equipe e ainda depende de aprovação.'};}
   if(a.estado==='aguardando_gestor'&&!aprovador)throw V.falha('Aguardando aprovação da equipe.',409);
   if(a.tipo==='cadastrarCliente'){if(await cliente(ctx,o))throw V.falha('Já há um cadastro para este telefone. A equipe deve revisar.',409);const c=await ERP.Cliente.create({nome:d.nome,telefone:V.telefone(ctx.telefone),empresa_id:ctx.empresaId,ativo:true},o);result={clienteId:c.id,mensagem:'Seu cadastro foi concluído.'};}
   if(a.tipo==='atualizarCliente'){const c=await exigirCliente(ctx,o);await c.update({nome:d.nome},o);result={clienteId:c.id,mensagem:'Seu nome foi atualizado.'};}
   if(a.tipo==='cadastrarPet'){const c=await exigirCliente(ctx,o);const p=await ERP.Pet.create({nome:d.nome,especie:d.especie,raca:d.raca,porte:d.porte,cliente_id:c.id,empresa_id:ctx.empresaId,ativo:true},o);result={petId:p.id,mensagem:'O cadastro de '+p.nome+' foi concluído.'};}
   if(a.tipo==='criarAgendamento'){
    await pet(ctx,d.petId,o);const s=await agenda.validar(cfg({...ctx,...state}),{petId:Number(d.petId),servicoId:d.servicoId,data:d.data,hora:d.hora},o);
    if(s.valor!==d.preco)throw V.falha('O preço foi atualizado. É necessária uma nova confirmação.',409);
    const values=Agenda.payload({empresaId:ctx.empresaId,petId:Number(d.petId),data:d.data,hora:d.hora,servico:s.nome,servicos:[{id:s.id,nome:s.nome,valor:s.valor,quantidade:1,meta:{portalDuracao:s.duracao,pethubIA:a.id,conversaIA:ctx.conversa.id}}],profissional:s.profissionalNome,valor:s.valor,taxidog:d.taxidog,observacoes:'Agendado pelo PetHub IA'});
    await Agenda.protegerReserva(ERP,values,null,transaction);const ag=await ERP.Agendamento.create(values,o);result={agendamentoId:ag.id,valorAgendado:s.valor,mensagem:'Agendamento confirmado para '+d.data+' às '+d.hora+'.'};
   }
   if(['cancelarAgendamento','reagendarAgendamento','solicitarTaxiDog'].includes(a.tipo)){
    const ag=await agendamento(ctx,d.agendamentoId,o);await ag.reload({...o,lock:transaction.LOCK.UPDATE});if(ag.updatedAt.toISOString()!==d.versao||['cancelado','concluido'].includes(ag.status))throw V.falha('O atendimento mudou. Solicite nova confirmação.',409);
    if(a.tipo==='cancelarAgendamento')await ag.update({status:'cancelado'},o);
    if(a.tipo==='solicitarTaxiDog')await ag.update({taxidog:true},o);
    if(a.tipo==='reagendarAgendamento'){
     const item=V.json(ag.servicos,[]).find(s=>s.id);if(!item)throw V.falha('A equipe precisa reagendar esse serviço.',409);
     const current={...cfg({...ctx,...state})};const old=ag.get({plain:true});await ag.update({status:'cancelado'},o);
     await agenda.validar(current,{petId:ag.petId,servicoId:item.id,data:d.data,hora:d.hora},o);
     const values={...old,dataAgendamento:require('../clientePortal/validacao').instante(d.data,d.hora),horario:d.hora};await Agenda.protegerReserva(ERP,values,ag.id,transaction);await ag.update({dataAgendamento:values.dataAgendamento,horario:d.hora,status:old.status},o);
    }
    result={agendamentoId:ag.id,mensagem:a.tipo==='cancelarAgendamento'?'Atendimento cancelado.':a.tipo==='solicitarTaxiDog'?'Táxi Dog registrado neste atendimento.':'Atendimento reagendado.'};
   }
   if(!result)throw V.falha('Ação indisponível.',409);
   await a.update({estado:'concluida',resultado:result,confirmada_mensagem:mensagemId},o);
   await assinaturas.auditar(ctx.empresaId,aprovador||'ia','acao_confirmada',{acaoId:a.id,tipo:a.tipo,resultado:Object.fromEntries(Object.entries(result).filter(([key])=>key!=='mensagem'))},transaction);
   transaction.afterCommit(()=>notificar(ctx.empresaId,a.tipo.includes('Agendamento')?'agendamento':'cadastro',{...result,conversaId:ctx.conversa.id},'acao:'+a.id));
   return result;
  });
 }
 return{tools,executar,confirmar,cliente,pet,agendamento,permitido};
}
module.exports={criar,schemas};
