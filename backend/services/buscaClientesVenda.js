const {Op,fn,col,where}=require('sequelize');
const normalizar=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function expressaoNome(){
  let expr=fn('LOWER',col('nome'));
  for(const [de,para] of Object.entries({á:'a',à:'a',â:'a',ã:'a',ä:'a',é:'e',è:'e',ê:'e',ë:'e',í:'i',ó:'o',ô:'o',õ:'o',ú:'u',ü:'u',ç:'c'}))expr=fn('REPLACE',expr,de,para);
  return expr;
}
function dto(c){return {id:c.id,codigo:String(c.id),nome:String(c.nome??''),telefone:String(c.telefone??''),email:String(c.email??''),cpf:String(c.cpf??''),ativo:c.ativo};}
async function buscar(Cliente,empresa,{search='',id}={}){
  if(!Number.isSafeInteger(Number(empresa))||Number(empresa)<1)throw Object.assign(new Error('Empresa não identificada.'),{status:403});
  const filtro={empresa_id:Number(empresa)};
  if(id!=null){
    if(!/^[1-9]\d*$/.test(String(id))||!Number.isSafeInteger(Number(id)))throw Object.assign(new Error('Cliente inválido.'),{status:400});
    filtro.id=Number(id);
  }else{
    const termo=normalizar(search);
    if(!termo)return [];
    if(termo.length>100)throw Object.assign(new Error('Pesquisa muito longa.'),{status:400});
    // LIKE recebe um valor escapado pelo Sequelize; %/_ digitados não são curingas.
    const like='%'+termo.replace(/[\\%_]/g,'\\$&')+'%';
    const condicoes=[where(expressaoNome(),{[Op.like]:like}),where(fn('LOWER',fn('COALESCE',col('email'),'')),{[Op.like]:like})];
    const numeros=termo.replace(/\D/g,'');
    if(numeros&&/^[\d\s()+.\-/]+$/.test(termo)){
      for(const campo of ['telefone','cpf']){
        let expr=fn('COALESCE',col(campo),'');for(const c of [' ', '(', ')', '-', '.', '+'])expr=fn('REPLACE',expr,c,'');
        condicoes.push(where(expr,{[Op.like]:'%'+numeros+'%'}));
      }
      if(/^[1-9]\d*$/.test(termo)&&Number.isSafeInteger(Number(termo)))condicoes.push({id:Number(termo)});
    }
    filtro[Op.or]=condicoes;
  }
  const rows=await Cliente.findAll({where:filtro,attributes:['id','nome','telefone','email','cpf','ativo'],order:[['nome','ASC'],['id','ASC']],limit:id!=null?1:30});
  return rows.map(dto);
}
async function endpoint(req,res){
  try{return res.set('Cache-Control','private, no-store').json({success:true,clientes:await buscar(require('../models/Cliente').Cliente,req.user?.empresaId,req.query)});}
  catch(e){return res.status(e.status||500).json({success:false,error:e.status?e.message:'Não foi possível pesquisar clientes.'});}
}
module.exports={buscar,endpoint,normalizar};
