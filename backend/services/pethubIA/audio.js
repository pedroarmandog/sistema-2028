'use strict';
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),{execFile}=require('node:child_process'),{promisify}=require('node:util'),V=require('./validacao');
async function duracao(bytes,{env=process.env,executar=promisify(execFile)}={}){
 if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>5*1024*1024)throw V.falha('Áudio inválido ou maior que 5 MB.');
 const file=path.join(os.tmpdir(),'pethub-ia-'+crypto.randomUUID()+'.ogg');
 try{await fs.writeFile(file,bytes,{mode:0o600});const r=await executar(env.PETHUB_IA_FFPROBE||'ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',file],{timeout:5000,maxBuffer:1024});const n=Math.ceil(Number(r.stdout));if(!Number.isFinite(n)||n<1||n>120)throw V.falha('Envie um áudio de até dois minutos.');return n;}
 catch(e){if(e.code==='ENOENT')throw V.falha('Processamento de áudio indisponível. Configure ffprobe no servidor.',503);throw e;}
 finally{await fs.unlink(file).catch(()=>{});}
}
module.exports={duracao};
