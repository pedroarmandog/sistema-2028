const {S3Client,PutObjectCommand,HeadObjectCommand,GetObjectCommand,GetBucketLifecycleConfigurationCommand}=require('@aws-sdk/client-s3');
const falha=(mensagem,status=503)=>Object.assign(new Error(mensagem),{status,publica:true});
function criarArmazenamento(env=process.env,{client}={}){
 const bucket=env.MEDIA_S3_BUCKET,endpoint=env.MEDIA_S3_ENDPOINT;
 function pronto(){
  if(!bucket||!endpoint||!env.MEDIA_S3_ACCESS_KEY_ID||!env.MEDIA_S3_SECRET_ACCESS_KEY)throw falha('Armazenamento permanente não configurado. Configure MEDIA_S3_* no serviço da API.');
  const url=new URL(endpoint);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw falha('Endpoint do armazenamento inválido. Use HTTPS, sem credenciais na URL.');
  return client??=new S3Client({endpoint,region:env.MEDIA_S3_REGION||'auto',forcePathStyle:true,maxAttempts:3,requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED',credentials:{accessKeyId:env.MEDIA_S3_ACCESS_KEY_ID,secretAccessKey:env.MEDIA_S3_SECRET_ACCESS_KEY}});
 }
 const enviar=async(Command,params)=>pronto().send(new Command({Bucket:bucket,...params}),{abortSignal:AbortSignal.timeout(45000)});
 return {
  async gravar(chave,bytes,tipo,sha){try{
   await enviar(PutObjectCommand,{Key:chave,Body:bytes,ContentType:tipo,Metadata:{sha256:sha},CacheControl:'private, max-age=86400'});
   const h=await enviar(HeadObjectCommand,{Key:chave});if(Number(h.ContentLength)!==bytes.length||h.Metadata?.sha256!==sha)throw Error('Confirmação divergente.');
   return {etag:h.ETag};
  }catch(e){if(e.publica)throw e;console.warn('[Midias] upload não confirmado; código='+String(e.name||'STORAGE').replace(/[^a-z0-9_-]/gi,'').slice(0,50));throw falha('Não foi possível confirmar o arquivo no armazenamento permanente. A referência anterior foi preservada.');}},
  async ler(chave){try{const r=await enviar(GetObjectCommand,{Key:chave});const max=20*1024*1024;
   if(Number(r.ContentLength)>max){r.Body.destroy?.();throw Error('Tamanho excedido');}
   if(r.Body[Symbol.asyncIterator]){const chunks=[];let n=0;for await(const chunk of r.Body){n+=chunk.length;if(n>max){r.Body.destroy?.();throw Error('Tamanho excedido');}chunks.push(Buffer.from(chunk));}return Buffer.concat(chunks);}
   const bytes=Buffer.from(await r.Body.transformToByteArray());if(bytes.length>max)throw Error('Tamanho excedido');return bytes;}catch(e){if(e.publica)throw e;console.warn('[Midias] leitura indisponível; código='+String(e.name||'STORAGE').replace(/[^a-z0-9_-]/gi,'').slice(0,50));throw falha('Arquivo temporariamente indisponível no armazenamento permanente.');}},
  async politica(){try{return (await enviar(GetBucketLifecycleConfigurationCommand,{})).Rules||[];}catch(e){if(['NoSuchLifecycleConfiguration','NoSuchLifecycle'].includes(e.name))return [];throw e;}},
 };
}
module.exports={criarArmazenamento,falha};
