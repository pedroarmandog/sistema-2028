// O banco conserva a referência otimizada. Preparar os bytes para a mensagem
// sem mudar sessões, reconexão, agendamento ou confirmação de envio.
async function carregar(empresa,referencia){
 const r=await require('./index').instancia().ler(empresa,referencia);
 if(r.tipo==='image/webp')return {...r,bytes:await require('sharp')(r.bytes,{limitInputPixels:25000000}).flatten({background:'#ffffff'}).jpeg({quality:90}).toBuffer(),tipo:'image/jpeg'};
 return r;
}
module.exports={carregar};
