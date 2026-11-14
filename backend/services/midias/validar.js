const sharp=require('sharp');
const {falha}=require('./armazenamento');
const maxImagem=8*1024*1024,maxDocumento=20*1024*1024;
async function validar(bytes,{imagem=true,otimizar=true}={}){
 if(!Buffer.isBuffer(bytes)||!bytes.length)throw falha('Arquivo vazio.',400);
 if(bytes.length>(imagem?maxImagem:maxDocumento))throw falha(imagem?'Imagem excede 8 MB.':'Arquivo excede 20 MB.',413);
 let tipo=await import('file-type').then(m=>m.fileTypeFromBuffer(bytes));
 const xml=bytes.subarray(0,512).toString('utf8').trim();const svg=!tipo&&(/^(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(xml));
 if(svg){const texto=bytes.toString('utf8');if(bytes.length>1024*1024||/<!DOCTYPE|<!ENTITY|<script|<foreignObject|@import|javascript:|\bon[a-z]+\s*=|(?:href\s*=\s*["'](?!#))|url\(\s*["']?(?!#)/i.test(texto))throw falha('SVG contém recursos externos ou conteúdo não permitido. Envie PNG, JPG ou WebP.',400);tipo={mime:'image/svg+xml',ext:'svg'};}
 if(tipo&&['image/png','image/jpeg','image/webp','image/gif','image/svg+xml'].includes(tipo.mime)){
  try{
   const image=sharp(bytes,{limitInputPixels:25000000,animated:tipo.mime==='image/gif'}),m=await image.metadata();
   if(!m.width||!m.height||m.width*m.height>25000000||(m.pages||1)>100)throw Error('Dimensões inválidas.');
   if((otimizar&&tipo.mime!=='image/gif')||svg){
    const output=image.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true});
    // Logo/transparência preservados. SVG é rasterizado, nunca servido como código ativo.
    bytes=svg?await output.png().toBuffer():await output.webp({quality:88}).toBuffer();tipo=svg?{mime:'image/png',ext:'png'}:{mime:'image/webp',ext:'webp'};
   }else await sharp(bytes,{limitInputPixels:25000000}).raw().toBuffer();
  }catch{throw falha('Imagem inválida, corrompida ou com dimensões excessivas.',400);}
  return {bytes,tipo:tipo.mime,ext:tipo.ext,imagem:true};
 }
 if(!imagem&&tipo?.mime==='application/x-cfb'){
  try{const XLSX=require('xlsx'),cfb=XLSX.CFB.read(bytes,{type:'buffer'});
   if(cfb.FullPaths.some(n=>/\/(?:Workbook|Book)$/i.test(n))&&XLSX.read(bytes,{type:'buffer',bookSheets:true}).SheetNames.length)tipo={mime:'application/vnd.ms-excel',ext:'xls'};
  }catch{throw falha('Planilha XLS inválida.',400);}
 }
 if(imagem)throw falha('Envie uma imagem válida JPG, PNG, WebP ou GIF. SVG seguro será convertido em PNG.',400);
 const permitidos=['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel'];
 if(tipo&&permitidos.includes(tipo.mime))return {bytes,tipo:tipo.mime,ext:tipo.ext,imagem:false};
 throw falha('Formato de anexo não permitido. Use PDF, imagem, DOCX, XLS ou XLSX.',400);
}
function base64(valor){
 const m=/^data:([^;,]+);base64,([a-z0-9+/=\r\n]+)$/i.exec(String(valor));if(!m)throw falha('Imagem em base64 inválida.',400);
 if(m[2].length>Math.ceil(maxImagem*4/3)+8)throw falha('Imagem excede 8 MB.',413);
 const s=m[2].replace(/[\r\n]/g,'');if(s.length%4||!/^[a-z0-9+/]*={0,2}$/i.test(s))throw falha('Imagem em base64 inválida.',400);
 const b=Buffer.from(s,'base64');if(b.toString('base64')!==s)throw falha('Imagem em base64 inválida.',400);return b;
}
module.exports={validar,base64,maxImagem,maxDocumento};
