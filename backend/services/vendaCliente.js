// A análise usa o ID estável; nomes são apenas apresentação e podem se repetir.
async function vincularCliente(Cliente,empresa,dados){
  if(!Number.isSafeInteger(Number(empresa))||Number(empresa)<1)throw Object.assign(new Error('Empresa não identificada.'),{status:403});
  const falhar=mensagem=>{throw Object.assign(new Error(mensagem),{status:400});};
  const objeto=dados.cliente&&typeof dados.cliente==='object'?dados.cliente:null;
  const id=dados.clienteId??objeto?.id;
  const nome=String(objeto?.nome??dados.cliente??'').trim();
  if(id!=null&&id!==''){
    if(!/^[1-9]\d*$/.test(String(id))||!Number.isSafeInteger(Number(id)))falhar('Selecione um cliente válido.');
    const c=await Cliente.findOne({where:{id:Number(id),empresa_id:Number(empresa)},attributes:['id','nome']});
    if(!c)falhar('Cliente não encontrado nesta empresa. Pesquise e selecione novamente.');
    dados.clienteId=c.id;dados.cliente=c.nome;return;
  }
  if(!nome){dados.clienteId=null;dados.cliente=null;return;}
  // Compatibilidade com vendas antigas que mandavam apenas o nome: só um
  // resultado exato é seguro. Nunca escolher arbitrariamente entre homônimos.
  const encontrados=await Cliente.findAll({where:{empresa_id:Number(empresa),nome},attributes:['id','nome'],limit:2});
  if(encontrados.length===1){dados.clienteId=encontrados[0].id;dados.cliente=encontrados[0].nome;return;}
  if(!encontrados.length&&['consumidor final','cliente não informado','sem cliente'].includes(nome.toLowerCase())){dados.clienteId=null;dados.cliente=null;return;}
  falhar(encontrados.length>1?'Há clientes com o mesmo nome. Selecione o cliente na lista.':'Pesquise e selecione um cliente cadastrado ou deixe o campo vazio.');
}
module.exports={vincularCliente};
