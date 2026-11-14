const https=require('node:https');
const erro=(mensagem,status)=>Object.assign(new Error(mensagem),{status});
function consultar(cep,{get=https.get,timeout=8000}={}){
 if(!/^\d{8}$/.test(String(cep)))return Promise.reject(erro('CEP inválido. Informe 8 números.',400));
 return new Promise((resolve,reject)=>{
  let terminou=false,timer,request;
  const fim=(e,d)=>{if(terminou)return;terminou=true;clearTimeout(timer);e?reject(e):resolve(d);};
  try{request=get(`https://viacep.com.br/ws/${cep}/json/`,resp=>{
   if(resp.statusCode!==200){resp.resume();return fim(erro('Consulta de CEP indisponível. Preencha o endereço manualmente ou tente novamente.',502));}
   let data='';resp.setEncoding?.('utf8');resp.on('data',c=>{data+=c;if(Buffer.byteLength(data)>65536){fim(erro('Resposta inválida na consulta de CEP.',502));request.destroy();}});
   resp.on('error',()=>fim(erro('Consulta de CEP interrompida. Tente novamente.',502)));
   resp.on('end',()=>{try{const d=JSON.parse(data);if(!d||typeof d!=='object'||Array.isArray(d))throw Error();
    if(d.erro===true||d.erro==='true')return fim(erro('CEP não encontrado. Confira o CEP ou preencha o endereço manualmente.',404));
    const saida={};for(const k of ['cep','logradouro','complemento','unidade','bairro','localidade','uf','estado','regiao','ibge','gia','ddd','siafi'])if(typeof d[k]==='string')saida[k]=d[k].trim();
    if(saida.uf){const uf=require('../utils/ufBrasil').normalizarUF(saida.uf,{estrito:false});if(!uf)throw Error();saida.uf=uf;}
    if(saida.ibge&&!/^\d{7}$/.test(saida.ibge))delete saida.ibge;fim(null,saida);
   }catch{fim(erro('Resposta inválida na consulta de CEP. Preencha manualmente.',502));}});
  });request.on('error',()=>fim(erro('Não foi possível consultar o CEP. Seus dados foram mantidos.',502)));
  timer=setTimeout(()=>{fim(erro('Tempo esgotado na consulta de CEP. Preencha manualmente ou tente novamente.',504));request.destroy();},timeout);
  }catch{fim(erro('Consulta de CEP indisponível.',502));}
 });
}
function endpoint({buscar=consultar}={}){return async(req,res)=>{try{res.set('Cache-Control','no-store');res.json(await buscar(req.params.cep));}catch(e){res.status(e.status||502).json({erro:true,mensagem:e.message||'Não foi possível consultar o CEP.'});}};}
module.exports={consultar,endpoint};
