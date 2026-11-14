const I=require('../services/clienteInteligencia');
const A=require('../services/clienteAnaliseVendas');
const {Cliente,sequelize}=require('../models/Cliente');
async function executar(req,res,fn){
  try{
    const empresa=Number(req.user?.empresaId),id=Number(req.params.id);
    if(!Number.isSafeInteger(empresa)||empresa<1)return res.status(403).json({erro:'Empresa não identificada.'});
    if(!Number.isSafeInteger(id)||id<1)return res.status(404).json({erro:'Cliente não encontrado.'});
    const cliente=await Cliente.findOne({where:{id,empresa_id:empresa},attributes:['id']});
    if(!cliente)return res.status(404).json({erro:'Cliente não encontrado.'});
    res.set('Cache-Control','private, no-store');
    return await fn(empresa,id);
  }catch(e){return res.status(e.name==='SequelizeUniqueConstraintError'?409:e.status||500).json({erro:e.name==='SequelizeUniqueConstraintError'?'Código ou ID legado já pertence a outro cliente desta empresa.':e.status?e.message:'Não foi possível consultar/salvar os dados complementares.'});}
}
exports.obter=(req,res)=>executar(req,res,async(empresa,id)=>res.json(await I.obter(sequelize,empresa,id)));
exports.analise=(req,res)=>executar(req,res,async(empresa,id)=>res.json(await A.analisar(sequelize,empresa,id)));
exports.salvar=(req,res)=>executar(req,res,async(empresa,id)=>{
  const dados=I.normalizar(req.body); // whitelist: IDs/empresa no body são ignorados.
  if(I.temHistorico(dados)&&!dados.data_referencia_historico)throw I.erro('Informe a referência dos indicadores históricos.');
  await I.preparar(sequelize);
  await sequelize.transaction(async transaction=>{
    // Serializar com importação e excluir cliente evita perfis órfãos por corrida.
    const c=await Cliente.findOne({where:{id,empresa_id:empresa},transaction,lock:transaction.LOCK.UPDATE});
    if(!c)throw I.erro('Cliente não encontrado.',404);
    await I.salvar(sequelize,empresa,id,dados,{transaction});
  });
  return res.json({sucesso:true,...await I.obter(sequelize,empresa,id)});
});
