'use strict';
const V=require('./validacao');
function criar({env=process.env,sdk}={}){
 let client=sdk;
 function get(){if(client)return client;if(!env.OPENAI_API_KEY)throw V.falha('OPENAI_API_KEY não configurada.',503,'IA_CONFIG');const OpenAI=require('openai');return client=new OpenAI({apiKey:env.OPENAI_API_KEY,timeout:V.inteiro(env.OPENAI_REQUEST_TIMEOUT||30000,1000,60000),maxRetries:0});}
 async function resposta(body,signal){return get().responses.create({...body,store:false},{signal});}
 async function transcrever(bytes,model,signal){const {toFile}=require('openai');return get().audio.transcriptions.create({file:await toFile(bytes,'audio.ogg',{type:'audio/ogg'}),model,response_format:'json'},{signal});}
 async function verificar(modelo){const r=await get().models.retrieve(modelo);return{id:r.id,validado:true};}
 return{resposta,transcrever,verificar};
}
module.exports={criar};
