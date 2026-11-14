// Operações duráveis. Um checkpoint e seus dados são confirmados na mesma transação.
const crypto=require('node:crypto');
const {DataTypes,Op,fn,col,where}=require('sequelize');
const I=require('../clienteInteligencia');
const S=require('./servico');
const json=v=>typeof v==='string'?JSON.parse(v):v;
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const estadosAtivos=['pendente','processando'];
function modelo(db){return db.models.ImportacaoOperacao||db.define('ImportacaoOperacao',{
 id:{type:DataTypes.STRING(36),primaryKey:true},empresa_id:{type:DataTypes.INTEGER,allowNull:false},usuario_id:{type:DataTypes.INTEGER,allowNull:false},lote_id:{type:DataTypes.STRING(36),allowNull:false},
 tipo:{type:DataTypes.STRING(16),allowNull:false,defaultValue:'clientes'},estado:{type:DataTypes.STRING(24),allowNull:false},fase:DataTypes.STRING(120),total:DataTypes.INTEGER,cursor:{type:DataTypes.INTEGER,defaultValue:0},
 criados:{type:DataTypes.INTEGER,defaultValue:0},atualizados:{type:DataTypes.INTEGER,defaultValue:0},ignorados:{type:DataTypes.INTEGER,defaultValue:0},rejeitados:{type:DataTypes.INTEGER,defaultValue:0},
 dados:DataTypes.TEXT('long'),escolhas:DataTypes.TEXT('long'),relatorio:DataTypes.TEXT('long'),resultado:DataTypes.TEXT('long'),
 vinculos_pendentes:{type:DataTypes.INTEGER,defaultValue:0},ms_por_registro:DataTypes.DOUBLE,iniciadoEm:DataTypes.DATE,progressoEm:DataTypes.DATE,concluidoEm:DataTypes.DATE,dono:DataTypes.STRING(36),lease_ate:DataTypes.BIGINT,erro:DataTypes.STRING(300),tentativas:{type:DataTypes.INTEGER,defaultValue:0},
},{tableName:'importacoes_operacoes',indexes:[
 {unique:true,name:'importacao_empresa_lote',fields:['empresa_id','lote_id']},
 {name:'importacao_recuperacao',fields:['estado','lease_ate','updatedAt']},
 {name:'importacao_empresa_estado',fields:['empresa_id','estado']},
]});}
async function prepararEstrutura(db){
 const C=db.models.Cliente,q=db.getQueryInterface(),table=C.getTableName(),cols=await q.describeTable(table);
 if(!cols.importacao_ref)await q.addColumn(table,'importacao_ref',{type:DataTypes.STRING(64),allowNull:true});
 const indices=await q.showIndex(table);
 if(!indices.some(i=>i.name==='clientes_importacao_ref'))await q.addIndex(table,['importacao_ref'],{name:'clientes_importacao_ref',unique:true});
 if(!indices.some(i=>i.fields?.[0]?.attribute==='empresa_id'))await q.addIndex(table,['empresa_id','id'],{name:'clientes_empresa_importacao'});
 const Job=modelo(db);await Job.sync();
 const jobCols=await q.describeTable(Job.getTableName());
 if(!jobCols.tipo)await q.addColumn(Job.getTableName(),'tipo',{type:DataTypes.STRING(16),allowNull:false,defaultValue:'clientes'});
 if(!jobCols.vinculos_pendentes)await q.addColumn(Job.getTableName(),'vinculos_pendentes',{type:DataTypes.INTEGER,defaultValue:0});
}
const extras=Object.keys({...I.PERFIL,...I.HISTORICO});
const atributosCliente=dados=>Object.fromEntries(Object.entries(dados).filter(([k])=>!extras.includes(k)&&!['id','empresa_id','createdAt','updatedAt','importacao_ref'].includes(k)));
function preservarNotas(dados,originais,anteriores){
 if(!Object.keys(originais||{}).length)return;
 const nota='[Importação: dados de origem para conferência]\n'+Object.entries(originais).map(([k,v])=>`${k}: ${v}`).join('\n');
 const antes=dados.observacoes||anteriores||'';
 dados.observacoes=antes.includes(nota)?antes:[antes,nota].filter(Boolean).join('\n');
}
function mesclarTelefones(a,b){
 if(typeof a==='string'){try{a=JSON.parse(a);}catch{a=[];}}
 return [...new Map([...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])].map(v=>[JSON.stringify(v),v])).values()];
}
function criarProcessador({db,Cliente=db.models.Cliente,Empresa=db.models.Empresa,Lote=db.models.ImportacaoLote,Linha=db.models.ImportacaoLinha,
 tamanho=Number(process.env.IMPORTACAO_CLIENTES_LOTE)||50,agora=Date.now,agendar=setTimeout,cancelar=clearTimeout,antesCommit=async()=>{},log=console}={}){
 const Job=modelo(db),dono=crypto.randomUUID(),batch=Math.max(10,Math.min(200,Math.trunc(tamanho))),leaseMs=120000;
 let pronto,rodando=null,timer=null,parado=true;
 async function preparar(){
  pronto??=(async()=>{
   const cols=await db.getQueryInterface().describeTable(Cliente.getTableName());
   if(!cols.importacao_ref)throw Object.assign(I.erro('Execute preparar-clientes-inteligencia.js antes de iniciar importações em lotes.',503),{publica:true});
   await Job.sync();await I.preparar(db);
  })().catch(e=>{pronto=null;throw e;});return pronto;
 }
 function dto(row){
  const r=row.get?row.get({plain:true}):row,elapsed=r.iniciadoEm?Math.max(0,(r.concluidoEm?+new Date(r.concluidoEm):agora())-+new Date(r.iniciadoEm)):0;
  const stale=r.progressoEm?agora()-+new Date(r.progressoEm)>30000:elapsed>30000;
  const percentual=r.total?Math.floor(Number(r.cursor||0)/r.total*100):0;
  const eta=r.cursor>0&&r.cursor<r.total&&r.ms_por_registro&&!stale&&r.estado==='processando'?Math.ceil(r.ms_por_registro*(r.total-r.cursor)/1000):null;
  return {id:r.id,vinculosPendentes:r.tipo==='pets'?Number(r.vinculos_pendentes||0):undefined,tipo:r.tipo||'clientes',vinculados:r.tipo==='pets'?Number(r.criados||0)+Number(r.atualizados||0):undefined,estado:r.estado,fase:r.fase,total:r.total,processados:r.cursor,percentual,criados:r.criados,atualizados:r.atualizados,ignorados:r.ignorados,rejeitados:r.rejeitados,
   iniciadoEm:r.iniciadoEm,progressoEm:r.progressoEm,decorridoSegundos:Math.floor(elapsed/1000),restanteSegundos:eta,lento:stale&&estadosAtivos.includes(r.estado),
   erro:r.erro,resultado:r.resultado?json(r.resultado):null,retomavel:r.estado==='interrompido'};
 }
 async function iniciar(empresa,usuario,token,escolhas={},tipo='clientes'){
  await preparar();if(!/^[a-f0-9-]{36}$/.test(token||''))throw I.erro('Prévia inválida.');
  if(!['clientes','pets'].includes(tipo))throw I.erro('Tipo inválido.');
  if(!escolhas||typeof escolhas!=='object'||Array.isArray(escolhas)||Object.values(escolhas).some(v=>tipo==='clientes'?!['criar','atualizar','ignorar'].includes(v):!v||typeof v!=='object'||!['criar','atualizar','ignorar'].includes(v.acao)||v.cliente_id!=null&&(!Number.isSafeInteger(Number(v.cliente_id))||Number(v.cliente_id)<1)||v.distinto!=null&&typeof v.distinto!=='boolean'))throw I.erro('Ações inválidas.');
  const row=await db.transaction(async transaction=>{
   const emp=await Empresa.findByPk(empresa,{transaction,lock:transaction.LOCK.UPDATE});if(!emp)throw I.erro('Empresa indisponível.',403);
   const existente=await Job.findOne({where:{empresa_id:empresa,lote_id:token,tipo},transaction});if(existente)return existente;
   const ativo=await Job.findOne({where:{empresa_id:empresa,estado:{[Op.in]:[...estadosAtivos,'interrompido']}},transaction});
   if(ativo)throw Object.assign(I.erro('Já existe uma importação para acompanhar ou retomar nesta empresa.',409),{operacaoId:ativo.id});
   const lote=await Lote.findOne({where:{id:token,empresa_id:empresa,usuario_id:usuario,tipo},transaction,lock:transaction.LOCK.UPDATE});
   if(!lote)throw I.erro('Importação não encontrada.',404);
   if(lote.resultado)throw I.erro('Esta prévia já foi confirmada pelo fluxo anterior. Analise novamente.',409);
   if(+new Date(lote.expira)<agora())throw I.erro('Prévia expirada. Analise novamente.');
   const rows=json(lote.dados);if(!rows.length||rows.every(r=>r.erro))throw I.erro('Nenhum registro válido para importar.');
   return Job.create({id:crypto.randomUUID(),empresa_id:empresa,usuario_id:usuario,lote_id:token,tipo,vinculos_pendentes:tipo==='pets'?rows.filter(r=>!r.erro&&!r.repetida&&(escolhas[String(r.linha)]?.acao||r.acao)!=='ignorar'&&!escolhas[String(r.linha)]?.cliente_id&&r.vinculo?.situacao!=='automatico').length:0,estado:'pendente',fase:'Aguardando processamento',total:rows.length,cursor:0,dados:lote.dados,escolhas:JSON.stringify(escolhas),relatorio:'[]',lease_ate:0},{transaction});
  });return dto(row);
 }
 async function obter(empresa,id,tipo='clientes'){await preparar();const row=await Job.findOne({where:{empresa_id:empresa,id,tipo},attributes:{exclude:['dados','escolhas','relatorio','resultado']}});if(!row)throw I.erro('Operação não encontrada.',404);return dto(row);}
 async function atual(empresa,tipo='clientes'){await preparar();const row=await Job.findOne({where:{empresa_id:empresa,tipo},attributes:{exclude:['dados','escolhas','relatorio','resultado']},order:[['createdAt','DESC'],['id','DESC']]});return row?dto(row):null;}
 async function relatorioFinal(empresa,id,tipo='clientes'){await preparar();const row=await Job.findOne({where:{empresa_id:empresa,id,tipo},attributes:['estado','resultado']});if(!row)throw I.erro('Operação não encontrada.',404);if(row.estado!=='concluido')throw I.erro('Relatório disponível após concluir a importação.',409);return json(row.resultado);}
 async function retomar(empresa,id,tipo='clientes'){await preparar();
  const row=await db.transaction(async transaction=>{
   await Empresa.findByPk(empresa,{transaction,lock:transaction.LOCK.UPDATE});
   const r=await Job.findOne({where:{id,empresa_id:empresa,tipo},transaction,lock:transaction.LOCK.UPDATE});if(!r)throw I.erro('Operação não encontrada.',404);
   if(r.estado==='interrompido')await r.update({estado:'pendente',fase:'Aguardando retomada',erro:null,tentativas:0,dono:null,lease_ate:0},{transaction});return r;
  });return dto(row);
 }
 async function reivindicar(id,empresa){
  return db.transaction(async transaction=>{
   await Empresa.findByPk(empresa,{transaction,lock:transaction.LOCK.UPDATE});
   const r=await Job.findOne({where:{id,empresa_id:empresa},attributes:{exclude:['dados','escolhas','relatorio','resultado']},transaction,lock:transaction.LOCK.UPDATE});
   if(!r||!estadosAtivos.includes(r.estado)||(r.dono&&r.dono!==dono&&Number(r.lease_ate)>agora()))return false;
   await r.update({estado:'processando',fase:'Conferindo e salvando lote',dono,lease_ate:agora()+leaseMs,iniciadoEm:r.iniciadoEm||new Date(agora())},{transaction});return true;
  });
 }
 async function salvarLote(id,empresa){
  const inicio=agora();
  const confirmado=await db.transaction(async transaction=>{
   await Empresa.findByPk(empresa,{transaction,lock:transaction.LOCK.UPDATE});
   const job=await Job.findOne({where:{id,empresa_id:empresa},transaction,lock:transaction.LOCK.UPDATE});
   if(!job||job.dono!==dono||job.estado!=='processando')return;
   const rows=json(job.dados),escolhas=json(job.escolhas),slice=rows.slice(job.cursor,job.cursor+batch),relatorio=json(job.relatorio||'[]');
   if(!slice.length)return finalizar(job,transaction,relatorio);
   async function checkpoint(cont){
    const cursor=job.cursor+slice.length;
   await job.update({cursor,...Object.fromEntries(Object.entries(cont).map(([k,n])=>[k,Number(job[k]||0)+n])),relatorio:JSON.stringify(relatorio),fase:cursor===job.total?'Finalizando relatório':'Conferindo e salvando lote',progressoEm:new Date(agora()),lease_ate:agora()+leaseMs,erro:null,tentativas:0,ms_por_registro:job.ms_por_registro?job.ms_por_registro*0.7+(Math.max(1,agora()-inicio)/slice.length)*0.3:Math.max(1,agora()-inicio)/slice.length},{transaction});
   await antesCommit({job,cont,transaction});
   return {cursor,total:job.total,linhas:slice.length};
   }
   if(job.tipo==='pets')return checkpoint(await require('./pets').gravarLote({db,job,slice,escolhas,transaction,relatorio}));
   const ids=slice.map(r=>Number(r.existente)).filter(Number.isSafeInteger);
   const codigos=slice.map(r=>r.dados?.codigo_legado).filter(Boolean),legados=slice.map(r=>r.dados?.id_legado).filter(Boolean);
   const {Perfil,Historico}=I.modelos(db);
   const perfisFonte=await Perfil.findAll({where:{empresa_id:empresa,[Op.or]:[{cliente_id:{[Op.in]:ids}},{codigo_legado:{[Op.in]:codigos}},{id_legado:{[Op.in]:legados}}]},transaction,lock:transaction.LOCK.UPDATE});
   const refs=slice.map(r=>hash([empresa,id,r.linha]));
   const or=[{id:{[Op.in]:[...ids,...perfisFonte.map(p=>p.cliente_id)]}},{importacao_ref:{[Op.in]:refs}}];
   for(const k of ['cpf','cnpj','email']){
    const values=slice.map(r=>r.dados?.[k]).filter(Boolean).map(v=>S.valorIdentidade(k,v));
    if(!values.length)continue;
    let expr=fn('COALESCE',col(k),'');
    if(k==='email')expr=fn('LOWER',fn('TRIM',expr));else for(const c of ['.','-','/',' '])expr=fn('REPLACE',expr,c,'');
    or.push(where(expr,{[Op.in]:values}));
   }
   const atuais=await Cliente.findAll({where:{empresa_id:empresa,[Op.or]:or},transaction,lock:transaction.LOCK.UPDATE});
   const perfis=await Perfil.findAll({where:{empresa_id:empresa,cliente_id:{[Op.in]:atuais.map(c=>c.id)}},transaction,lock:transaction.LOCK.UPDATE});
   const perfilMap=new Map(perfis.map(p=>[Number(p.cliente_id),p.get({plain:true})]));
   atuais.forEach(c=>Object.assign(c,{codigo_legado:perfilMap.get(Number(c.id))?.codigo_legado,id_legado:perfilMap.get(Number(c.id))?.id_legado}));
   const historicos=await Historico.findAll({where:{empresa_id:empresa,cliente_id:{[Op.in]:atuais.map(c=>c.id)},data_referencia_historico:{[Op.in]:slice.map(r=>r.dados?.data_referencia_historico).filter(Boolean)}},transaction,lock:transaction.LOCK.UPDATE});
   const histMap=new Map(historicos.map(h=>[h.id,h.get({plain:true})]));
   const feitas=new Set((await Linha.findAll({where:{empresa_id:empresa,tipo:'clientes',hash:{[Op.in]:slice.map(r=>r.hash).filter(Boolean)}},attributes:['hash'],transaction})).map(r=>r.hash));
   const cont={criados:0,atualizados:0,ignorados:0,rejeitados:0},planos=[],targets=new Set();
   for(const row of slice){
    const acao=escolhas[String(row.linha)]||row.acao;
    if(row.erro){cont.rejeitados++;relatorio.push({linha:row.linha,acao:'rejeitado',motivo:row.erro});continue;}
    if(row.repetida||acao==='ignorar'||feitas.has(row.hash)){cont.ignorados++;relatorio.push({linha:row.linha,acao:'ignorado',motivo:row.aviso||'Ignorado ou já importado.'});continue;}
    try{
     const dados={...row.dados},matches=S.encontrarMatches('clientes',atuais,dados);
     if(matches.length>1)throw I.erro('Identificadores ambíguos. Reanalise esta linha.');
     let existente=null;
     if(acao==='atualizar'){
      if(!row.existente||matches.length!==1||String(matches[0].id)!==row.existente)throw I.erro('Cadastro alterado desde a prévia. Reanalise esta linha.');
      existente=matches[0];if(targets.has(String(existente.id)))throw I.erro('Mesmo cliente selecionado mais de uma vez no lote.');
      if(row.versao&&existente.updatedAt?.toISOString()!==row.versao)throw I.erro('Cadastro atualizado após a prévia. Reanalise esta linha.');
     }else if(matches.length){cont.ignorados++;relatorio.push({linha:row.linha,acao:'ignorado',motivo:'Identificador já cadastrado. Reanalise para atualizar.'});continue;}
     const extra=I.normalizar(dados);
     if(I.temHistorico(extra)){
      if(!extra.data_referencia_historico)throw I.erro('Referência histórica ausente.');
      const h=existente?histMap.get(hash([Number(empresa),Number(existente.id),extra.data_referencia_historico])):null;
      if((extra.quantidade_vendas_historicas??h?.quantidade_vendas_historicas)===0&&Number(extra.vendas_desde_cadastro??h?.vendas_desde_cadastro)>0)throw I.erro('Quantidade histórica incompatível com o total.');
     }
     const base=atributosCliente(dados);preservarNotas(base,row.preservados,existente?.observacoes);
     if(base.telefones_adicionais)base.telefones_adicionais=mesclarTelefones(existente?.telefones_adicionais,base.telefones_adicionais);
     const ref=hash([empresa,id,row.linha]);
     planos.push({row,acao,existente,extra,base,ref,id:existente?.id});
     if(existente)targets.add(String(existente.id));
     else atuais.push({...dados,id:'novo:'+row.linha,importacao_ref:ref});
    }catch(e){if(!e.status)throw e;cont.rejeitados++;relatorio.push({linha:row.linha,acao:'rejeitado',motivo:e.message});}
   }
   const novos=planos.filter(p=>!p.existente),updates=planos.filter(p=>p.existente),agoraDate=new Date(agora());
   if(novos.length){
    await Cliente.bulkCreate(novos.map(p=>({...p.base,empresa_id:empresa,importacao_ref:p.ref})),{transaction,validate:true});
    const criados=await Cliente.findAll({where:{empresa_id:empresa,importacao_ref:{[Op.in]:novos.map(p=>p.ref)}},attributes:['id','importacao_ref'],transaction});
    const mapa=new Map(criados.map(c=>[c.importacao_ref,c.id]));for(const p of novos){p.id=mapa.get(p.ref);if(!p.id)throw new Error('Inserção sem identificação confirmada.');}
   }
   if(updates.length){
    const fields=[...new Set(updates.flatMap(p=>Object.keys(p.base)))].filter(k=>Cliente.rawAttributes[k]);fields.push('updatedAt');
    await Cliente.bulkCreate(updates.map(p=>({...p.existente.get({plain:true}),...p.base,updatedAt:agoraDate})),{transaction,validate:true,updateOnDuplicate:fields,conflictAttributes:['id']});
   }
   const perfisGravar=[],histGravar=[],marcas=[];
   for(const p of planos){
    const perfil=Object.fromEntries(Object.entries(p.extra).filter(([k])=>k in I.PERFIL));
    if(Object.keys(perfil).length)perfisGravar.push({...(perfilMap.get(Number(p.id))||{}),...perfil,empresa_id:empresa,cliente_id:p.id,updatedAt:agoraDate});
    if(I.temHistorico(p.extra)){
     const ref=p.extra.data_referencia_historico,hid=hash([Number(empresa),Number(p.id),ref]),old=histMap.get(hid);
     const h=Object.fromEntries(Object.entries(p.extra).filter(([k])=>k in I.HISTORICO));
     histGravar.push({...(old||{}),...h,id:hid,empresa_id:empresa,cliente_id:p.id,modo_conciliacao:h.modo_conciliacao||old?.modo_conciliacao||'separado',origem_historico:h.origem_historico||old?.origem_historico||'Informado/importado',corte_em:old?.corte_em||new Date(Math.min(+new Date(ref+'T23:59:59.999-03:00'),+new Date(job.iniciadoEm))),lote_origem:old?.lote_origem||job.lote_id,updatedAt:agoraDate});
    }
    marcas.push({empresa_id:empresa,tipo:'clientes',hash:p.row.hash,registro:String(p.id)});
    cont[p.existente?'atualizados':'criados']++;
    relatorio.push({linha:p.row.linha,acao:p.acao,aviso:!!p.row.avisos?.length,motivo:p.row.avisos?.length?p.row.avisos.join(' · '):(p.existente?'Cliente atualizado.':'Cliente criado.'),registro:String(p.id)});
   }
   if(perfisGravar.length)await Perfil.bulkCreate(perfisGravar,{transaction,validate:true,updateOnDuplicate:[...Object.keys(I.PERFIL),'updatedAt'],conflictAttributes:['empresa_id','cliente_id']});
   if(histGravar.length)await Historico.bulkCreate(histGravar,{transaction,validate:true,updateOnDuplicate:[...Object.keys(I.HISTORICO),'updatedAt'],conflictAttributes:['id']});
   if(marcas.length)await Linha.bulkCreate(marcas,{transaction});
   return checkpoint(cont);
  });
  if(confirmado)log.info(`[Importação][empresa:${empresa}][op:${id}] checkpoint confirmado ${confirmado.cursor}/${confirmado.total}; lote=${confirmado.linhas}`);
 }
 async function finalizar(job,transaction,relatorio){
  relatorio.sort((a,b)=>a.linha-b.linha);
  const resultado={tipo:job.tipo||'clientes',criados:job.criados,atualizados:job.atualizados,ignorados:job.ignorados,rejeitados:job.rejeitados,relatorio,comAvisos:relatorio.filter(r=>r.aviso).length};
  await Lote.update({resultado:JSON.stringify({...resultado,ignorados:resultado.ignorados+resultado.rejeitados}),dados:'[]'},{where:{id:job.lote_id,empresa_id:job.empresa_id},transaction});
  await job.update({estado:'concluido',fase:'Importação concluída',resultado:JSON.stringify(resultado),dados:'[]',concluidoEm:new Date(agora()),erro:null,dono:null,lease_ate:0},{transaction});
 }
 async function falhou(id,empresa,e){
  // Não publicar contadores da transação que sofreu rollback.
  const r=await Job.findOne({where:{id,empresa_id:empresa,dono}});if(!r)return;
  const codigo=e.original?.code||e.parent?.code||e.code||'DB';
  await r.update({estado:'interrompido',fase:'Importação interrompida; lotes anteriores preservados',erro:'Houve falha ao confirmar o lote. O progresso exibido vem do checkpoint salvo. Verifique o banco e use Retomar com segurança.',dono:null,lease_ate:0,tentativas:Number(r.tentativas||0)+1});
  log.warn(`[Importação][empresa:${empresa}][op:${id}] lote não confirmado; código=${String(codigo).replace(/[^a-z0-9_-]/gi,'').slice(0,40)}`);
 }
 async function executarUma(){
  await preparar();
  const row=await Job.findOne({where:{estado:{[Op.in]:estadosAtivos},[Op.or]:[{dono:null},{dono},{lease_ate:{[Op.lte]:agora()}}]},attributes:['id','empresa_id'],order:[['updatedAt','ASC'],['id','ASC']]});
  if(!row)return false;
  if(!await reivindicar(row.id,row.empresa_id))return true;
  try{await salvarLote(row.id,row.empresa_id);}catch(e){await falhou(row.id,row.empresa_id,e);}
  return true;
 }
 function iniciarMonitor(){
  if(!parado)return;parado=false;let erros=0;
  const tick=async()=>{
   if(parado)return;
   let atraso=3000;
   if(!rodando){
    rodando=executarUma();
    try{const fez=await rodando;erros=0;atraso=fez?25:3000;}
    catch{erros++;atraso=Math.min(30000,1000*2**Math.min(erros,5));log.warn('[Importação] Recuperação aguardando banco/preparação da estrutura.');}
    finally{rodando=null;}
   }
   if(!parado){timer=agendar(tick,atraso);timer?.unref?.();}
  };timer=agendar(tick,0);timer?.unref?.();
 }
 async function parar(){parado=true;cancelar(timer);timer=null;await rodando?.catch(()=>{});if(pronto)await Job.update({dono:null,lease_ate:0},{where:{dono,estado:{[Op.in]:estadosAtivos}}});}
 return {Job,preparar,iniciar,obter,atual,retomar,relatorioFinal,executarUma,iniciarMonitor,parar,dto,tamanhoLote:batch};
}

let padrao;
function instancia(){
 if(!padrao){const banco=require('./modelos'),M=require('../../models');padrao=criarProcessador({db:banco.sequelize,Cliente:M.Cliente,Empresa:M.Empresa,Lote:banco.Lote,Linha:banco.Linha});}
 return padrao;
}
module.exports={modelo,prepararEstrutura,criarProcessador,instancia};
