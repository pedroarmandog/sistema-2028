'use strict';
const express=require('express'),{Op,fn,col}=require('sequelize'),V=require('../services/pethubIA/validacao');
function criarRotas(s,{authUser,authAdmin}){
 const r=express.Router();r.use((req,res,next)=>{res.set('Cache-Control','no-store');if(req.method!=='GET'&&req.get('X-PetHub-IA')!=='1')return res.status(403).json({erro:'Origem da ação inválida.'});next();});
 const wrap=fn=>async(req,res,next)=>{try{await fn(req,res,next);}catch(e){next(e);}};
 const ipRate=new Map();r.use((req,res,next)=>{const key=req.ip+':'+req.path;const now=Date.now(),old=ipRate.get(key)||{at:now,n:0};if(now-old.at>60000){old.at=now;old.n=0;}old.n++;ipRate.set(key,old);if(ipRate.size>2000)for(const[k,v]of ipRate)if(now-v.at>60000)ipRate.delete(k);if(old.n>60)return res.status(429).json({erro:'Aguarde antes de tentar novamente.'});next();});
 r.get('/acesso',authUser,wrap(async(req,res)=>{try{await s.permitidoGestor(req);await s.assinaturas.estado(req.user.empresaId);res.json({liberado:true});}catch(e){if(e.status===403)return res.json({liberado:false});throw e;}}));
 const admin=express.Router();admin.use(authAdmin);
 admin.get('/planos',wrap(async(req,res)=>res.json(await s.m.Plano.findAll({order:[['nome','ASC']]}))));
 admin.put('/planos/:id',wrap(async(req,res)=>{
  const b=req.body;V.objeto(b,['contrato','ativo','versao']);const dados=s.assinaturas.contrato(b.contrato);
  const id=V.texto(req.params.id,64,true);const row=await s.m.Plano.findByPk(id);
  if(row){if(row.versao!==V.inteiro(b.versao))throw V.falha('Plano alterado.',409);const[n]=await s.m.Plano.update({...dados,ativo:b.ativo===true,versao:row.versao+1},{where:{id,versao:row.versao}});if(!n)throw V.falha('Plano alterado. Atualize antes de salvar.',409);}
  else await s.m.Plano.create({id,...dados,ativo:b.ativo===true});
  await s.assinaturas.auditar(null,req.adminId,'plano_alterado',{id});res.json({salvo:true});
 }));
 admin.get('/global',wrap(async(req,res)=>{const g=await s.m.Global.findByPk(1),cfg=V.json(g.configuracao);res.json({habilitado:g.habilitado,teto_micros:Number(g.teto_micros),gasto_micros:Number(g.gasto_micros),reserva_micros:Number(g.reserva_micros),revisao:g.revisao,cambio:cfg.cambio||null,precos:await s.m.Preco.findAll(),whatsapp:Object.fromEntries(Object.entries(cfg.whatsapp||{}).map(([emp,v])=>[emp,{phone_number_id:v.phone_number_id,verificado_em:v.verificado_em}]))});}));
 admin.put('/global',wrap(async(req,res)=>{
  V.objeto(req.body,['habilitado','teto_micros','cambio','revisao']);await s.ERP.sequelize.transaction(async transaction=>{
   const g=await s.m.Global.findByPk(1,{transaction,lock:transaction.LOCK.UPDATE});if(g.revisao!==V.inteiro(req.body.revisao))throw V.falha('Configuração alterada.',409);
   const cambio=req.body.cambio==null?null:Number(req.body.cambio);if(cambio!==null&&(!Number.isFinite(cambio)||cambio<=0||cambio>100))throw V.falha('Cotação inválida.');
   await g.update({habilitado:req.body.habilitado===true,teto_micros:V.inteiro(req.body.teto_micros,0,1000000000000),configuracao:{...V.json(g.configuracao),cambio},revisao:g.revisao+1},{transaction});
   if(!g.habilitado)await s.m.Fila.update({estado:'cancelado',erro:'IA_GLOBAL_PAUSADA'},{where:{estado:{[Op.in]:['pendente','processando','pronto']}},transaction});
   await s.assinaturas.auditar(null,req.adminId,'global_alterado',{habilitado:g.habilitado,teto_micros:g.teto_micros},transaction);
  });res.json({salvo:true});
 }));
 admin.put('/modelos/:modelo',wrap(async(req,res)=>{
  const name=V.texto(req.params.modelo,100,true),b=V.objeto(req.body,['entrada_micros_milhao','saida_micros_milhao','cache_micros_milhao','audio_micros_minuto','fonte']);
  const dados=Object.fromEntries(['entrada_micros_milhao','saida_micros_milhao','cache_micros_milhao','audio_micros_minuto'].map(k=>[k,V.inteiro(b[k],0,1000000000000)]));
  const fonte=V.texto(b.fonte,500,true);if(!/^https:\/\/(developers|platform)\.openai\.com\//.test(fonte)&&!/^https:\/\/openai\.com\//.test(fonte))throw V.falha('Use uma fonte oficial de precificação.');
  await s.m.Preco.upsert({id:name,...dados,fonte,ativo:false,verificado_em:null});await s.assinaturas.auditar(null,req.adminId,'preco_modelo_alterado',{modelo:name});res.json({salvo:true,precisaValidar:true});
 }));
 admin.post('/modelos/:modelo/verificar',wrap(async(req,res)=>{const row=await s.m.Preco.findByPk(req.params.modelo);if(!row)throw V.falha('Cadastre a tarifa antes de validar.',404);await s.ia.verificar(row.id);await row.update({ativo:true,verificado_em:s.agora()});await s.assinaturas.auditar(null,req.adminId,'modelo_validado',{modelo:row.id});res.json({validado:true});}));
 admin.get('/empresas',wrap(async(req,res)=>{
  const rows=await s.ERP.EmpresaPainel.findAll({attributes:['id','cnpj','nome_fantasia'],limit:1000});const result=[];
  for(const p of rows){try{const emp=await s.assinaturas.painelId(p.id);result.push({painelId:p.id,nome:p.nome_fantasia,cnpj:p.cnpj,...await s.assinaturas.resumo(emp,true)});}catch(e){if(e.status!==409)throw e;result.push({painelId:p.id,nome:p.nome_fantasia,cnpj:p.cnpj,status:'sem_vinculo',erro:e.message});}}
  res.json(result);
 }));
 admin.get('/empresas/:id',wrap(async(req,res)=>{const emp=await s.assinaturas.painelId(req.params.id);res.json({resumo:await s.assinaturas.resumo(emp,true),auditoria:await s.m.Auditoria.findAll({where:{empresa_id:emp},order:[['createdAt','DESC']],limit:100})});}));
 admin.put('/empresas/:id',wrap(async(req,res)=>{const emp=await s.assinaturas.painelId(req.params.id);await s.assinaturas.salvar(emp,req.body,req.adminId);res.json(await s.assinaturas.resumo(emp,true));}));
 admin.post('/empresas/:id/creditos',wrap(async(req,res)=>{const emp=await s.assinaturas.painelId(req.params.id);res.json(await s.assinaturas.credito(emp,req.body,req.adminId));}));
 admin.put('/empresas/:id/whatsapp-oficial',wrap(async(req,res)=>{
  const emp=await s.assinaturas.painelId(req.params.id),b=V.objeto(req.body,['phone_number_id','token']);const phone=V.texto(b.phone_number_id,100,true);if(!/^\d+$/.test(phone))throw V.falha('ID do número inválido.');
  await s.ERP.sequelize.transaction(async transaction=>{const g=await s.m.Global.findByPk(1,{transaction,lock:transaction.LOCK.UPDATE}),cfg=V.json(g.configuracao),wa=cfg.whatsapp||{};
   if(Object.entries(wa).some(([key,v])=>Number(key)!==emp&&v.phone_number_id===phone))throw V.falha('Este número já está associado a outra empresa.',409);
   wa[String(emp)]={phone_number_id:phone,token_cifrado:V.cifrar({token:V.texto(b.token,3000,true)},s.env,'wa:'+emp),verificado_em:null};await g.update({configuracao:{...cfg,whatsapp:wa},revisao:g.revisao+1},{transaction});
  });await s.assinaturas.auditar(emp,req.adminId,'whatsapp_oficial_configurado',{phone_number_id:phone});res.json({salvo:true});
 }));
 admin.post('/empresas/:id/whatsapp-oficial/verificar',wrap(async(req,res)=>{const emp=await s.assinaturas.painelId(req.params.id),result=await s.wa.validarOficial(emp);await s.ERP.sequelize.transaction(async transaction=>{const g=await s.m.Global.findByPk(1,{transaction,lock:transaction.LOCK.UPDATE}),cfg=V.json(g.configuracao);cfg.whatsapp[String(emp)].verificado_em=s.agora().toISOString();await g.update({configuracao:cfg,revisao:g.revisao+1},{transaction});});res.json(result);}));
 admin.get('/consumo',wrap(async(req,res)=>{
  const where={};if(req.query.empresa)where.empresa_id=V.inteiro(req.query.empresa,1);const start=new Date(req.query.inicio||new Date(s.agora().getFullYear(),s.agora().getMonth(),1)),end=new Date(req.query.fim||s.agora());if(!Number.isFinite(+start)||!Number.isFinite(+end)||end<start||+end-+start>366*86400000)throw V.falha('Período inválido ou maior que um ano.');where.createdAt={[Op.gte]:start,[Op.lte]:end};
  const rows=await s.m.Consumo.findAll({where,attributes:['empresa_id',[fn('DATE',col('createdAt')),'dia'],[fn('SUM',col('entrada')),'entrada'],[fn('SUM',col('saida')),'saida'],[fn('SUM',col('cache')),'cache'],[fn('SUM',col('custo_micros')),'custo_micros'],[fn('SUM',col('audio_segundos')),'audio_segundos']],group:['empresa_id',fn('DATE',col('createdAt'))],raw:true});res.json({moeda_custo:'USD',estimativa:true,linhas:rows});
 }));
 admin.get('/financeiro/faturas',wrap(async(req,res)=>res.json(await s.financeiro.resumo(req.query))));
 admin.post('/financeiro/faturas',wrap(async(req,res)=>res.status(201).json(await s.financeiro.registrar(req.body,req.adminId))));
 r.use('/admin',admin);
 const gestor=express.Router();gestor.use(authUser,wrap(async(req,res,next)=>{await s.permitidoGestor(req);await s.assinaturas.estado(req.user.empresaId);next();}));
 gestor.get('/resumo',wrap(async(req,res)=>{const emp=req.user.empresaId;const dto=await s.assinaturas.resumo(emp);const c=await s.m.Config.findByPk(emp);const whatsapp=await s.wa.status(emp,V.json(c?.dados).whatsapp?.provedor||'baileys');if(dto.status==='ativo'&&!whatsapp.conectado)dto.status='whatsapp_desconectado';res.json({...dto,whatsapp});}));
 gestor.get('/configuracao',wrap(async(req,res)=>res.json(await s.configuracao.obter(req.user.empresaId))));
 gestor.get('/catalogo',wrap(async(req,res)=>{
  const emp=req.user.empresaId;
  const [empresa,servicos,profissionais]=await Promise.all([
   s.ERP.Empresa.findByPk(emp,{attributes:['id','nome','cnpj']}),
   s.ERP.Produto.findAll({where:{empresa_id:emp,tipo:{[Op.in]:['servico','serviço']}},attributes:['id','nome','preco'],order:[['nome','ASC']],limit:150}),
   s.ERP.Profissional.findAll({where:{empresa_id:emp,status:'ativo'},attributes:['id','nome'],limit:100})
  ]);
  const portal=s.ERP.sequelize.models.ClientePortalConfig;
  const regras=portal?V.json((await portal.findByPk(emp))?.regras):null;
  res.json({empresa,servicos,profissionais,regrasAgenda:regras?.dias?regras:null});
 }));
 gestor.post('/avatar',require('multer')({storage:require('multer').memoryStorage(),limits:{fileSize:4*1024*1024,files:1}}).single('avatar'),wrap(async(req,res)=>{
  if(!req.file)throw V.falha('Selecione uma imagem.');const emp=req.user.empresaId;
  const media=await require('../services/midias').instancia().salvar(emp,req.file.buffer,'ia-avatar',{imagem:true,publico:false});
  await s.ERP.sequelize.transaction(async transaction=>{const o={transaction};await s.m.Global.findByPk(1,{...o,lock:transaction.LOCK.UPDATE});const c=await s.m.Config.findByPk(emp,{...o,lock:transaction.LOCK.UPDATE});await c.update({dados:{...V.json(c.dados),avatar:media.url},operacional:false,teste_em:null,revisao:c.revisao+1},o);});
  await s.assinaturas.auditar(emp,req.user.id,'avatar_alterado',{});res.json({salvo:true});
 }));
 gestor.get('/avatar',wrap(async(req,res)=>{const emp=req.user.empresaId,c=await s.m.Config.findByPk(emp),ref=V.json(c?.dados).avatar;if(!ref)throw V.falha('Avatar não encontrado.',404);const media=await require('../services/midias').instancia().ler(emp,ref);res.type(media.tipo).send(media.bytes);}));
 gestor.put('/configuracao',wrap(async(req,res)=>res.json(await s.configuracao.salvar(req.user.empresaId,req.body,req.user.id))));
 gestor.get('/conversas',wrap(async(req,res)=>res.json(await s.conversas.listar(req.user.empresaId,req.query))));
 gestor.get('/conversas/:id/mensagens',wrap(async(req,res)=>res.json(await s.conversas.mensagens(req.user.empresaId,req.params.id,req.query))));
 gestor.get('/conversas/:id',wrap(async(req,res)=>res.json(await s.conversa(req.user.empresaId,req.params.id))));
 gestor.post('/conversas/:id/assumir',wrap(async(req,res)=>res.json(await s.assumir(req.user.empresaId,req.params.id,req.user.id,false))));
 gestor.post('/conversas/:id/devolver',wrap(async(req,res)=>res.json(await s.assumir(req.user.empresaId,req.params.id,req.user.id,true))));
 gestor.post('/conversas/:id/finalizar',wrap(async(req,res)=>{const emp=req.user.empresaId,id=req.params.id;await s.assumir(emp,id,req.user.id);await s.m.Conversa.update({estado:'finalizada',dono:null},{where:{id,empresa_id:emp}});await s.assinaturas.auditar(emp,req.user.id,'conversa_finalizada',{conversaId:id});res.json({finalizada:true});}));
 gestor.post('/conversas/:id/enviar',wrap(async(req,res)=>{
  const emp=req.user.empresaId,id=req.params.id,text=V.texto(req.body.texto,3500,true),c=await s.m.Conversa.findOne({where:{id,empresa_id:emp,estado:'humano',provedor:{[Op.ne]:'teste'}}});if(!c)throw V.falha('Assuma o atendimento antes de enviar.',409);
  const phone=V.decifrar(c.contato_cifrado,s.env,'contato:'+emp).telefone,cfg=await s.m.Config.findByPk(emp);
  const result=await s.wa.enviar({empresaId:emp,telefone:phone,conversa:c,dados:V.json(cfg.dados),job:{id:require('node:crypto').randomUUID()}},text,async()=>{const state=await s.assinaturas.estado(emp);const fresh=await s.m.Conversa.findOne({where:{id,empresa_id:emp,estado:'humano',dono:String(req.user.id)}});if(!fresh)throw V.falha('Atendimento alterado.',409);});
  if(!result.sucesso)throw V.falha(result.incerto?'Envio não confirmado. Confira no WhatsApp antes de tentar novamente.':'Não foi possível enviar.',502);
  await s.m.Mensagem.findOrCreate({where:{empresa_id:emp,externa:V.hash(V.json(cfg.dados).whatsapp.provedor+':'+result.mensagemId)},defaults:{conversa_id:id,papel:'assistant',texto_cifrado:V.cifrar({texto:text},s.env,'msg:'+emp),evento:{autor:req.user.id},enviada_em:s.agora()}});res.json({enviado:true});
 }));
 gestor.post('/conversas/:id/excluir-conteudo',wrap(async(req,res)=>{
  if(req.body.confirmar!==true)throw V.falha('Confirme a exclusão do conteúdo.');const emp=req.user.empresaId,c=await s.m.Conversa.findOne({where:{id:req.params.id,empresa_id:emp}});if(!c)throw V.falha('Conversa não encontrada.',404);
  await s.assumir(emp,c.id,req.user.id);await s.m.Mensagem.destroy({where:{empresa_id:emp,conversa_id:c.id}});await require('../services/pethubIA/privacidade').limparAcoes(s.m,{empresa_id:emp,conversa_id:c.id});await s.m.Fila.update({saida_cifrada:null},{where:{empresa_id:emp,conversa_id:c.id}});await c.update({contato_cifrado:V.cifrar({telefone:null},s.env,'contato:'+emp),contato_hash:V.hash('apagado:'+c.id),nome:null,contexto:{},bloqueada:true});await s.assinaturas.auditar(emp,req.user.id,'conteudo_excluido',{conversaId:c.id});res.json({excluido:true});
 }));
 gestor.post('/testes',wrap(async(req,res)=>res.status(202).json(await s.testar(req.user.empresaId,req.user.id,req.body))));
 gestor.get('/testes/:id',wrap(async(req,res)=>{const j=await s.m.Fila.findOne({where:{id:req.params.id,empresa_id:req.user.empresaId,teste:true}});if(!j||V.json(j.dados).usuario!==req.user.id)throw V.falha('Teste não encontrado.',404);res.json({id:j.id,estado:j.estado,erro:j.erro,saida:j.saida_cifrada?V.decifrar(j.saida_cifrada,s.env,'saida:'+j.empresa_id).texto:null});}));
 gestor.get('/consumo',wrap(async(req,res)=>{const emp=req.user.empresaId;await s.assinaturas.resumo(emp);const su=await s.m.Assinatura.findByPk(emp);const c=await s.m.Ciclo.findByPk(su.ciclo_id);res.json({respostas:Number(c?.respostas||0),limites:{respostas:V.json(c?.limites).respostas||0},historico:await s.m.Ciclo.findAll({where:{empresa_id:emp},attributes:['id','inicio','fim','respostas'],order:[['inicio','DESC']],limit:12}),creditos:await s.m.Credito.findAll({where:{empresa_id:emp},attributes:['tipo','quantidade','expira','createdAt'],limit:30})});}));
 gestor.get('/relatorios',wrap(async(req,res)=>res.json(await s.relatorios.resultados(req.user.empresaId,req.query))));
 gestor.post('/acoes/:id/aprovar',wrap(async(req,res)=>{const emp=req.user.empresaId,a=await s.m.Acao.findOne({where:{id:req.params.id,empresa_id:emp,estado:'aguardando_gestor'}});if(!a)throw V.falha('Solicitação não encontrada.',404);const job=await s.m.Fila.findByPk(a.job_id),ctx=await s.motor.contexto(job);res.json(await s.ferramentas.confirmar(ctx,a.id,a.confirmada_mensagem,{aprovador:req.user.id}));}));
 gestor.post('/acoes/:id/recusar',wrap(async(req,res)=>{const emp=req.user.empresaId;const [n]=await s.m.Acao.update({estado:'recusada'},{where:{id:req.params.id,empresa_id:emp,estado:'aguardando_gestor'}});if(!n)throw V.falha('Solicitação não encontrada.',404);await s.assinaturas.auditar(emp,req.user.id,'solicitacao_recusada',{id:req.params.id});res.json({recusada:true});}));
 r.use('/gestor',gestor);
 r.use((e,req,res,next)=>res.status(e.status||503).json({erro:e.status&&e.status<500?e.message:'PetHub IA indisponível. Confira a preparação das tabelas e a configuração do servidor.',codigo:e.code||'IA_INDISPONIVEL'}));
 return r;
}
function criarWebhook(s){
 const r=express.Router();r.get('/',(req,res)=>{if(s.env.META_WHATSAPP_VERIFY_TOKEN&&req.query['hub.mode']==='subscribe'&&req.query['hub.verify_token']===s.env.META_WHATSAPP_VERIFY_TOKEN)return res.type('text/plain').send(String(req.query['hub.challenge']||''));res.sendStatus(403);});
 r.post('/',express.raw({type:'application/json',limit:'1mb'}),async(req,res)=>{try{if(!Buffer.isBuffer(req.body)||!s.wa.validarAssinatura(req.body,req.get('x-hub-signature-256')))return res.sendStatus(403);const events=await s.wa.webhook(JSON.parse(req.body));if(events.length>100)return res.sendStatus(413);for(const e of events)await s.motor.receber(e).catch(err=>{if(![403,409].includes(err.status))throw err;});res.sendStatus(200);}catch{res.status(503).json({erro:'Webhook não processado. Tente novamente.'});}});return r;
}
module.exports={criarRotas,criarWebhook};
