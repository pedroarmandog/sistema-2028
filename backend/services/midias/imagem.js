// PDFKit não lê WebP. Converter em memória sem criar arquivos temporários.
async function carregarImagem(empresa,referencia){
 if(!referencia)return null;
 try{
  const {instancia}=require('./index'),{base64,validar}=require('./validar');
  const r=String(referencia).startsWith('data:image/')?await validar(base64(referencia),{otimizar:false}):await instancia().ler(empresa,referencia);
  if(!r.tipo?.startsWith('image/'))return null;
  return await require('sharp')(r.bytes,{limitInputPixels:25000000}).rotate().png().toBuffer();
 }catch{console.warn('[Midias] Logo indisponível no relatório; empresa='+Number(empresa));return null;}
}
module.exports={carregarImagem};
