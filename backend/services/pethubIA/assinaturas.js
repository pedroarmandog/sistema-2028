'use strict';
const V = require('./validacao'), { FUNCOES } = require('./modelos');
const { Op } = require('sequelize');
const money = value => V.inteiro(value, 0, 1000000000000);
function contrato(b) {
  V.objeto(b, ['nome','mensalidade_centavos','respostas','tokens','audios_segundos','teto_micros','modelos','funcionalidades']);
  return { nome: V.texto(b.nome,100,true), mensalidade_centavos: money(b.mensalidade_centavos), respostas: money(b.respostas), tokens: money(b.tokens), audios_segundos: money(b.audios_segundos), teto_micros: money(b.teto_micros), modelos: V.lista(b.modelos,null,10).map(v=>V.texto(v,100,true)), funcionalidades: V.lista(b.funcionalidades,FUNCOES) };
}
function proximoMes(date) { const d = new Date(date), day = d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth()+1); const last = new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate(); d.setUTCDate(Math.min(day,last)); return d; }
function criar({ ERP, m, agora = () => new Date(), env, statusWhatsApp }) {
  const db = ERP.sequelize;
  async function auditar(emp, autor, tipo, dados, transaction) { return m.Auditoria.create({empresa_id:emp,autor:String(autor),tipo,dados},{transaction,logging:false}); }
  async function estado(emp, { transaction, operacional = false } = {}) {
    const o = { transaction, logging:false };
    const keys=['id',...['ativa','ativo'].filter(k=>ERP.Empresa.rawAttributes[k])];
    const empresa=await ERP.Empresa.findByPk(emp,{...o,attributes:keys});
    if(!empresa||empresa.ativa===false||empresa.ativo===false)throw V.falha('Empresa indisponível para atendimento.',403,'IA_EMPRESA');
    const assinatura = await m.Assinatura.findByPk(emp,o), config = await m.Config.findByPk(emp,o);
    if (!assinatura || assinatura.estado !== 'ativo' || !assinatura.vencimento || +assinatura.inicio > +agora() || +assinatura.vencimento <= +agora()) throw V.falha('PetHub IA não está liberado para esta empresa.',403,'IA_ASSINATURA');
    if (operacional && (!config?.operacional || config.etapa < 7 || !config.teste_em)) throw V.falha('Atendimento automático pausado ou configuração incompleta.',409,'IA_PAUSADA');
    return { assinatura, config, contrato:V.json(assinatura.contrato), dados:V.json(config?.dados) };
  }
  async function ciclo(assinatura, transaction) {
    const o={transaction,logging:false};
    let c=assinatura.ciclo_id?await m.Ciclo.findByPk(assinatura.ciclo_id,o):null;
    if(c && +c.fim > +agora()) return c;
    if(assinatura.estado!=='ativo' || +assinatura.vencimento<=+agora())throw V.falha('Assinatura vencida ou suspensa.',403);
    const inicio=c?new Date(c.fim):new Date(assinatura.inicio);
    // Ciclos perdidos são avançados sem apagar os históricos.
    let from=inicio, to=proximoMes(from), n=0;
    while(+to<=+agora() && ++n<=1200){from=to;to=proximoMes(from);}
    if(n>1200)throw V.falha('Ciclo inválido.',409);
    to=new Date(Math.min(+to,+assinatura.vencimento));
    if(+to<=+agora())throw V.falha('Renovação comercial pendente.',403);
    const [next]=await m.Ciclo.findOrCreate({where:{empresa_id:assinatura.empresa_id,inicio:from},defaults:{fim:to,limites:V.json(assinatura.contrato)},...o});
    await assinatura.update({ciclo_id:next.id,renovacao:to},o);
    return next;
  }
  async function salvar(emp, b, autor) {
    V.objeto(b,['estado','plano_id','personalizado','inicio','vencimento','notas','revisao']);
    if(!['ativo','desativado','suspenso'].includes(b.estado))throw V.falha('Status inválido.');
    if(!await ERP.Empresa.findByPk(emp,{attributes:['id']}))throw V.falha('Empresa não encontrada.',404);
    return db.transaction(async transaction=>{
      const o={transaction,logging:false};await m.Global.findByPk(1,{...o,lock:transaction.LOCK.UPDATE});
      const [s]=await m.Assinatura.findOrCreate({where:{empresa_id:emp},...o});await s.reload({...o,lock:transaction.LOCK.UPDATE});
      if(s.revisao!==V.inteiro(b.revisao))throw V.falha('Assinatura alterada. Atualize os dados.',409);
      const p=await m.Plano.findByPk(V.texto(b.plano_id,64,true),o);if(!p?.ativo)throw V.falha('Plano indisponível.');
      const snapshot=b.personalizado?contrato(b.personalizado):s.plano_id===p.id&&V.json(s.contrato).nome?V.json(s.contrato):contrato(Object.fromEntries(['nome','mensalidade_centavos','respostas','tokens','audios_segundos','teto_micros','modelos','funcionalidades'].map(k=>[k,p[k]])));
      const aplicarNovosLimites=!!b.personalizado||s.plano_id!==p.id;
      const inicio=new Date(b.inicio),vencimento=new Date(b.vencimento);
      if(!Number.isFinite(+inicio)||!Number.isFinite(+vencimento)||+vencimento<=+inicio)throw V.falha('Datas da assinatura inválidas.');
      await s.update({estado:b.estado,plano_id:p.id,contrato:snapshot,inicio,vencimento,notas:V.texto(b.notas||'',2000),revisao:s.revisao+1},o);
      await m.Config.findOrCreate({where:{empresa_id:emp},...o});
      // Toda alteração administrativa invalida trabalhos ainda não enviados.
      await m.Fila.update({estado:'cancelado',erro:'ASSINATURA_ALTERADA'},{where:{empresa_id:emp,estado:{[Op.in]:['pendente','processando','pronto']}},...o});
      if(b.estado!=='ativo')await m.Config.update({operacional:false},{where:{empresa_id:emp},...o});
      if(b.estado==='ativo'){const c=await ciclo(s,transaction);if(aplicarNovosLimites){const limites={...snapshot};for(const extra of await m.Credito.findAll({where:{empresa_id:emp,ciclo_id:c.id,expira:{[Op.gt]:agora()}},...o}))limites[extra.tipo]=Number(limites[extra.tipo]||0)+Number(extra.quantidade);await c.update({limites},o);}}
      await auditar(emp,autor,'assinatura_alterada',{estado:b.estado,plano:p.id,revisao:s.revisao,contrato:snapshot},transaction);
      return s;
    });
  }
  async function credito(emp,b,autor){
    V.objeto(b,['tipo','quantidade','valor_centavos','expira','chave']);if(!['respostas','tokens','audios_segundos','teto_micros'].includes(b.tipo))throw V.falha('Tipo de crédito inválido.');
    const qtd=V.inteiro(b.quantidade,1,1000000000000),exp=new Date(b.expira);if(!Number.isFinite(+exp)||+exp<=+agora())throw V.falha('Validade inválida.');
    return db.transaction(async transaction=>{
      const o={transaction};await m.Global.findByPk(1,{...o,lock:transaction.LOCK.UPDATE});const s=await m.Assinatura.findByPk(emp,{...o,lock:transaction.LOCK.UPDATE});if(!s)throw V.falha('Assinatura não encontrada.',404);
      const c=await ciclo(s,transaction);if(+exp<+c.fim)throw V.falha('A validade deve cobrir o ciclo atual. Créditos desta versão não são transferidos para outro ciclo.');
      const chave=V.texto(b.chave,64,true);const [r,novo]=await m.Credito.findOrCreate({where:{empresa_id:emp,chave},defaults:{ciclo_id:c.id,quantidade:qtd,tipo:b.tipo,valor_centavos:money(b.valor_centavos),expira:exp,autor:String(autor)},...o});
      if(!novo && (r.tipo!==b.tipo||Number(r.quantidade)!==qtd))throw V.falha('Chave de crédito reutilizada com outros dados.',409);
      if(novo){const limites={...V.json(c.limites)};limites[b.tipo]=Number(limites[b.tipo]||0)+qtd;await c.update({limites},o);await auditar(emp,autor,'credito_adicionado',{id:r.id,tipo:b.tipo,quantidade:qtd,ciclo:c.id},transaction);}
      return r;
    });
  }
  async function painelId(id){
    const p=await ERP.EmpresaPainel.findByPk(V.inteiro(id,1),{attributes:['id','cnpj','nome_fantasia']});if(!p)throw V.falha('Empresa administrativa não encontrada.',404);
    const cnpj=String(p.cnpj).replace(/\D/g,'');if(cnpj.length!==14)throw V.falha('Associe um CNPJ válido ao cadastro da empresa.',409);
    const rows=await ERP.Empresa.findAll({where:{cnpj:{[Op.in]:[cnpj,p.cnpj]}},attributes:['id','cnpj']});
    if(rows.length!==1)throw V.falha('Vínculo inequívoco entre painel e ERP não encontrado. Nenhuma empresa foi alterada.',409);
    return Number(rows[0].id);
  }
  async function resumo(emp,admin=false){
    const previous=await m.Assinatura.findByPk(emp);if(previous?.estado==='ativo'&&+previous.inicio<=+agora()&&+previous.vencimento>+agora())await db.transaction(async transaction=>{const o={transaction};await m.Global.findByPk(1,{...o,lock:transaction.LOCK.UPDATE});const current=await m.Assinatura.findByPk(emp,{...o,lock:transaction.LOCK.UPDATE});await ciclo(current,transaction);});
    const s=await m.Assinatura.findByPk(emp),cfg=await m.Config.findByPk(emp),c=s?.ciclo_id?await m.Ciclo.findByPk(s.ciclo_id):null;
    if(!s)return{empresa_id:emp,status:'desativado',revisao:0};
    const contrato=V.json(s.contrato),dados=V.json(cfg?.dados);
    let status=s.estado;if(status==='ativo'&&+s.vencimento<=+agora())status='suspenso';
    if(status==='ativo'&&(!cfg?.teste_em||cfg.etapa<7))status='aguardando_configuracao';
    if(status==='ativo'&&!cfg?.operacional)status='pausado';
    if(status==='ativo'&&c&&(Number(c.respostas)+Number(c.reservado_respostas)>=Number(V.json(c.limites).respostas)||Number(c.custo_micros)+Number(c.reservado_micros)>=Number(V.json(c.limites).teto_micros)))status='limite_atingido';
    if(status==='ativo'&&statusWhatsApp){try{if(!(await statusWhatsApp(emp,dados.whatsapp?.provedor||'baileys')).conectado)status='whatsapp_desconectado';}catch{status='erro_integracao';}}
    const dto={empresa_id:emp,status,estado:s.estado,plano:contrato.nome,plano_id:s.plano_id,funcionalidades:contrato.funcionalidades||[],inicio:s.inicio,vencimento:s.vencimento,renovacao:s.renovacao,revisao:s.revisao,operacional:!!cfg?.operacional,etapa:cfg?.etapa||0,respostas:Number(c?.respostas||0),franquia:Number(V.json(c?.limites).respostas||contrato.respostas||0),modelos:contrato.modelos||[],nome:dados.identidade?.nome||'Assistente virtual'};
    if(admin)Object.assign(dto,{contrato,custo_micros:Number(c?.custo_micros||0),reserva_micros:Number(c?.reservado_micros||0),tokens:Number(c?.tokens||0),notas:s.notas,ciclo_id:c?.id});
    return dto;
  }
  return { estado,ciclo,salvar,credito,painelId,resumo,auditar,contrato };
}
module.exports={criar,contrato,proximoMes};
