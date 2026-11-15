// node frontend/base-conhecimento/ferramentas/otimizar-mascote.cjs "caminho/original.png" nova-pose
// Gera variantes sem apagar nem modificar o original. Usa Sharp já presente no projeto.
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
(async()=>{const [fonte,slug]=process.argv.slice(2);if(!fonte||!/^[a-z0-9-]+$/.test(slug||''))throw Error('Informe a imagem original e um nome com letras minúsculas, números e hífens.');
 const input=path.resolve(fonte),pasta=path.resolve(__dirname,'../assets/mascotes'),metadata=await sharp(input).metadata();if(!metadata.width||!metadata.height)throw Error('Imagem inválida.');
 for(const n of [360,720])if(fs.existsSync(path.join(pasta,slug+'-'+n+'.webp')))throw Error('Já existe uma variante com esse nome. Escolha outro nome para preservar os arquivos atuais.');
 fs.mkdirSync(pasta,{recursive:true});for(const n of [360,720])await sharp(input).resize({width:n,withoutEnlargement:true}).webp({lossless:true,effort:5}).toFile(path.join(pasta,slug+'-'+n+'.webp'));
 console.log('Variantes criadas. Adicione aos assets de mascotes.js:',JSON.stringify({arquivo:slug,width:metadata.width,height:metadata.height,alt:'Descreva a pose do mascote'}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
