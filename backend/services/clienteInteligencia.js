// Dados complementares e resumos legados nunca são lançamentos financeiros.
const {DataTypes,Op,QueryTypes}=require('sequelize');
const crypto=require('node:crypto');
const preparados=new WeakMap();
const PERFIL={
  codigo_legado:DataTypes.STRING(80),id_legado:DataTypes.STRING(80),instagram:DataTypes.STRING(120),
  cadastro_original:DataTypes.DATEONLY,bloquear_sms:DataTypes.BOOLEAN,bloquear_whatsapp:DataTypes.BOOLEAN,cadastro_bloqueado:DataTypes.BOOLEAN,
};
const HISTORICO={
  vendas_desde_cadastro:DataTypes.DECIMAL(18,2),ticket_medio_desde_cadastro:DataTypes.DECIMAL(18,2),
  vendas_ultimo_mes:DataTypes.DECIMAL(18,2),vendas_ultima_semana:DataTypes.DECIMAL(18,2),
  data_ultima_venda:DataTypes.DATEONLY,quantidade_vendas_historicas:DataTypes.INTEGER,
  data_referencia_historico:DataTypes.DATEONLY,modo_conciliacao:DataTypes.STRING(24),origem_historico:DataTypes.STRING(120),
};
const erro=(s,status=400)=>Object.assign(new Error(s),{status});
function modelos(db){
  const Perfil=db.models.ClientePerfil||db.define('ClientePerfil',{
    empresa_id:{type:DataTypes.INTEGER,primaryKey:true},cliente_id:{type:DataTypes.INTEGER,primaryKey:true},...PERFIL,
  },{tableName:'cliente_perfis',indexes:[
    {name:'cp_empresa_codigo',unique:true,fields:['empresa_id','codigo_legado']},
    {name:'cp_empresa_legado',unique:true,fields:['empresa_id','id_legado']},
    {name:'cp_bloqueio',fields:['empresa_id','bloquear_whatsapp']},
    {name:'cp_cadastro',fields:['empresa_id','cadastro_original']},
  ]});
  const Historico=db.models.ClienteResumoHistorico||db.define('ClienteResumoHistorico',{
    id:{type:DataTypes.STRING(64),primaryKey:true},empresa_id:{type:DataTypes.INTEGER,allowNull:false},cliente_id:{type:DataTypes.INTEGER,allowNull:false},
    ...HISTORICO,corte_em:{type:DataTypes.DATE,allowNull:false},lote_origem:DataTypes.STRING(36),
  },{tableName:'cliente_resumos_historicos',indexes:[{name:'crh_empresa_cliente_ref',unique:true,fields:['empresa_id','cliente_id','data_referencia_historico']}]});
  return {Perfil,Historico};
}
async function preparar(db){
  if(!preparados.has(db))preparados.set(db,(async()=>{const m=modelos(db);await m.Perfil.sync();await m.Historico.sync();return m;})().catch(e=>{preparados.delete(db);throw e;}));
  return preparados.get(db);
}
function dataCivil(v,nome){
  let s=String(v??'').trim();
  if(/^\d{2}\/\d{2}\/\d{4}$/.test(s)){const[d,m,a]=s.split('/');s=`${a}-${m}-${d}`;}
  const d=new Date(s+'T00:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(+d)||d.toISOString().slice(0,10)!==s)throw erro(`${nome}: use uma data válida dd/mm/aaaa.`);
  return s;
}
function booleano(v,nome){
  const s=String(v).trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(['sim','s','true','1','bloqueado'].includes(s))return true;
  if(['nao','n','false','0','liberado'].includes(s))return false;
  throw erro(`${nome}: informe Sim ou Não.`);
}
function normalizar(raw){
  const out={};
  for(const[k,t]of Object.entries({...PERFIL,...HISTORICO})){
    const v=raw[k];if(v==null||String(v).trim()==='')continue;
    if(['bloquear_sms','bloquear_whatsapp','cadastro_bloqueado'].includes(k))out[k]=booleano(v,k);
    else if(['cadastro_original','data_ultima_venda','data_referencia_historico'].includes(k))out[k]=dataCivil(v,k);
    else if(t.key==='DECIMAL')out[k]=require('./importacao/campos').moeda(v).toFixed(2);
    else if(k==='quantidade_vendas_historicas'){
      if(!/^\d+$/.test(String(v))||Number(v)>2147483647)throw erro('Quantidade histórica inválida.');out[k]=Number(v);
    }else{
      out[k]=String(v).trim();
      if(out[k].length>(t.options?.length||120))throw erro(`Campo ${k} muito longo.`);
    }
  }
  if(out.quantidade_vendas_historicas===0&&Number(out.vendas_desde_cadastro)>0)throw erro('Quantidade histórica zero incompatível com total positivo.');
  if(out.modo_conciliacao&&!['separado','somar_posteriores'].includes(out.modo_conciliacao))throw erro('Conciliação inválida.');
  const hoje=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
  if(out.cadastro_original>hoje||out.data_ultima_venda>hoje||out.data_referencia_historico>hoje)throw erro('As datas históricas não podem estar no futuro.');
  return out;
}
const temHistorico=d=>Object.keys(HISTORICO).some(k=>!['modo_conciliacao','origem_historico','data_referencia_historico'].includes(k)&&d[k]!=null);
async function salvar(db,empresa,cliente,raw,{transaction,lote,agora=new Date()}={}){
  const {Perfil,Historico}=await preparar(db),dados=normalizar(raw);
  const p=Object.fromEntries(Object.entries(dados).filter(([k])=>k in PERFIL));
  if(Object.keys(p).length){
    for(const campo of ['codigo_legado','id_legado'])if(p[campo]){
      const outro=await Perfil.findOne({where:{empresa_id:empresa,[campo]:p[campo],cliente_id:{[Op.ne]:cliente}},transaction});
      if(outro)throw erro('Código ou ID legado já pertence a outro cliente desta empresa.',409);
    }
    const [row]=await Perfil.findOrCreate({where:{empresa_id:empresa,cliente_id:cliente},defaults:p,transaction});
    await row.update(p,{transaction});
  }
  if(temHistorico(dados)){
    const ref=dados.data_referencia_historico;
    if(!ref)throw erro('Informe a data de referência do resumo histórico.');
    if(dados.data_ultima_venda&&dados.data_ultima_venda>ref)throw erro('Última venda histórica não pode ser posterior à referência.');
    const id=crypto.createHash('sha256').update(JSON.stringify([Number(empresa),Number(cliente),ref])).digest('hex');
    const historico=Object.fromEntries(Object.entries(dados).filter(([k])=>k in HISTORICO));
    const limite=new Date(ref+'T23:59:59.999-03:00');
    const [row]=await Historico.findOrCreate({where:{id},defaults:{empresa_id:empresa,cliente_id:cliente,
      ...historico,modo_conciliacao:dados.modo_conciliacao||'separado',origem_historico:dados.origem_historico||'Informado/importado',
      corte_em:new Date(Math.min(+limite,+agora)),lote_origem:lote||null},transaction});
    const total=historico.vendas_desde_cadastro??row.vendas_desde_cadastro;
    const quantidade=historico.quantidade_vendas_historicas??row.quantidade_vendas_historicas;
    if(quantidade===0&&Number(total)>0)throw erro('Quantidade histórica zero incompatível com total positivo.');
    // Reimportar a mesma referência não desloca o corte nem acumula valores.
    await row.update(historico,{transaction});
  }
}
async function obter(db,empresa,cliente){
  const {Perfil,Historico}=await preparar(db);
  const perfil=await Perfil.findOne({where:{empresa_id:empresa,cliente_id:cliente},raw:true});
  const historicos=await Historico.findAll({where:{empresa_id:empresa,cliente_id:cliente},order:[['data_referencia_historico','DESC']],raw:true});
  return {perfil:perfil||{},historicos};
}
async function enriquecer(db,empresa,clientes,transaction){
  const {Perfil}=await preparar(db);const perfis=await Perfil.findAll({where:{empresa_id:empresa},transaction,raw:true});
  const mapa=new Map(perfis.map(p=>[Number(p.cliente_id),p]));
  for(const c of clientes)Object.assign(c,{codigo_legado:mapa.get(Number(c.id))?.codigo_legado,id_legado:mapa.get(Number(c.id))?.id_legado});
}
async function clientesNoMes(db,empresa,periodo){
  const {Perfil}=await preparar(db),Cliente=db.models.Cliente;
  const q=db.getQueryInterface().queryGenerator;
  const alias=q.quoteIdentifier(Cliente.name),tabela=q.quoteTable(Perfil.getTableName());
  const inicio=new Date(periodo.inicio).toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
  const fim=new Date(periodo.fim).toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
  const sub=`SELECT 1 FROM ${tabela} p WHERE p.cliente_id=${alias}.id AND p.empresa_id=${alias}.empresa_id AND p.cadastro_original IS NOT NULL`;
  // Datas de criação passam pelo dialect do Sequelize, preservando timezone;
  // data original é DATEONLY, independente do fuso da conexão.
  return Cliente.count({where:{empresa_id:empresa,[Op.or]:[
    {createdAt:{[Op.gte]:periodo.inicio,[Op.lt]:periodo.fim},[Op.and]:require('sequelize').literal(`NOT EXISTS (${sub})`)},
    {[Op.and]:require('sequelize').literal(`EXISTS (${sub} AND p.cadastro_original >= ${db.escape(inicio)} AND p.cadastro_original < ${db.escape(fim)})`)},
  ]}});
}

module.exports={PERFIL,HISTORICO,modelos,preparar,normalizar,salvar,obter,enriquecer,clientesNoMes,temHistorico,erro};
