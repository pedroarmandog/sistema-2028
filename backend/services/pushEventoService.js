// Eventos derivados exclusivamente de registros já gravados. Não executa cron.
const crypto=require('node:crypto');
const {DataTypes}=require('sequelize');
const tabelas=new WeakMap(),tarefas=new Set();
const fisico=p=>['','produto'].includes(String(p.tipo??'produto').trim().toLowerCase());
const baixo=p=>fisico(p)&&(Number(p.estoqueAtual||0)<=0||Number(p.estoqueAtual||0)<=Number(p.estoqueMinimo||0));
async function preparar(db){
  if(!tabelas.has(db))tabelas.set(db,(async()=>{
    const Estado=db.models.PushEstadoEvento||db.define('PushEstadoEvento',{
      chave:{type:DataTypes.STRING(64),primaryKey:true},empresaId:{type:DataTypes.INTEGER,allowNull:false},
      estado:{type:DataTypes.BOOLEAN,allowNull:false},revisao:{type:DataTypes.INTEGER,defaultValue:0},
    },{tableName:'push_estados_evento',timestamps:true});
    await Estado.sync();return Estado;
  })().catch(e=>{tabelas.delete(db);throw e;}));
  return tabelas.get(db);
}
async function processar(tipo,id,empresaId,anterior){
  const M=require('../models'),emp=Number(empresaId);
  if(!M.PushSubscription||!Number.isSafeInteger(emp)||emp<1)return;
  const db=M.sequelize,Estado=await preparar(db);
  const chave=crypto.createHash('sha256').update(JSON.stringify([tipo,emp,String(id)])).digest('hex');
  const aviso=await db.transaction(async transaction=>{
    await Estado.findOrCreate({where:{chave},defaults:{empresaId:emp,estado:!!anterior,revisao:0},transaction});
    const estado=await Estado.findByPk(chave,{transaction,lock:transaction.LOCK.UPDATE});
    const model=tipo==='estoque'?M.Produto:M.Agendamento;
    const registro=await model.findOne({where:{id,empresa_id:emp},transaction,lock:transaction.LOCK.UPDATE});
    if(!registro)return null;
    const condicao=tipo==='estoque'?baixo(registro):registro.status==='cancelado';
    if(Boolean(estado.estado)===condicao)return null;
    const revisao=Number(estado.revisao)+1;
    await estado.update({estado:condicao,revisao},{transaction});
    if(!condicao)return null;
    if(tipo==='estoque')return {evento:'estoque_baixo',dados:{produto:registro.nome,produtoId:registro.id,
      quantidade:Number(registro.estoqueAtual||0),minimo:Number(registro.estoqueMinimo||0),eventoId:chave+':'+revisao}};
    const pet=await M.Pet.findByPk(registro.petId,{transaction});
    let nome='';
    if(pet){
      if(pet.empresa_id && Number(pet.empresa_id)!==emp)return null;
      const tutor=await M.Cliente.findOne({where:{id:pet.cliente_id,empresa_id:emp},transaction});
      if(!tutor)return null;
      nome=pet.nome;
    }
    return {evento:'cancelamento',dados:{agendamentoId:registro.id,petNome:nome,servico:registro.servico,
      horario:String(registro.horario||'').slice(0,5),eventoId:chave+':'+revisao}};
  });
  if(aviso)await require('./pushNotificationService').notificarEmpresa(emp,aviso.evento,aviso.dados);
}
function depoisDeSalvar(instancia,options,tipo,criado=false){
  if(!require('../models').PushSubscription)return;
  const anterior=instancia.previous?instancia.previous():{};
  if(tipo==='estoque'&&!criado&&!['estoqueAtual','estoqueMinimo','tipo','empresa_id'].some(k=>instancia.changed(k)))return;
  if(tipo==='cancelamento'&&!instancia.changed('status'))return;
  const empresaId=instancia.empresa_id,id=instancia.id;
  const antes=tipo==='estoque'?(criado?false:baixo(anterior)):anterior.status==='cancelado';
  const executar=()=>{
    const tarefa=Promise.resolve().then(()=>processar(tipo,id,empresaId,antes)).catch(e=>console.warn('[Push Evento] Evento não entregue:',e.message));
    tarefas.add(tarefa);tarefa.finally(()=>tarefas.delete(tarefa));return tarefa;
  };
  const invalidar=()=>require('../utils/simpleCache').del(`dashboard:produtosEstoqueBaixo:${empresaId}`);
  if(options.transaction){options.transaction.afterCommit(()=>{if(tipo==='estoque')invalidar();executar();});return;}
  if(tipo==='estoque')invalidar();
  return executar();
}
function registrarProduto(model){
  model.addHook('afterCreate','pushEstoqueCriacao',(p,o)=>depoisDeSalvar(p,o,'estoque',true));
  model.addHook('afterUpdate','pushEstoqueAlteracao',(p,o)=>depoisDeSalvar(p,o,'estoque'));
  model.addHook('beforeBulkUpdate','pushEstoqueIndividual',o=>{
    if(['estoqueAtual','estoqueMinimo','tipo','empresa_id'].some(k=>Object.hasOwn(o.attributes||{},k)))o.individualHooks=true;
  });
}
function registrarAgendamento(model){
  model.addHook('afterUpdate','pushCancelamento',(a,o)=>depoisDeSalvar(a,o,'cancelamento'));
  model.addHook('beforeBulkUpdate','pushCancelamentoIndividual',o=>{if(Object.hasOwn(o.attributes||{},'status'))o.individualHooks=true;});
}
async function drenar(){while(tarefas.size)await Promise.allSettled([...tarefas]);}
module.exports={registrarProduto,registrarAgendamento,preparar,drenar,fisico,baixo};
