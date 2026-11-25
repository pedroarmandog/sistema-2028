'use strict';
const crypto=require('node:crypto'),V=require('./validacao');
function criar({env=process.env,m,legado,agora=()=>new Date(),http=fetch}){
 async function mapa(emp){const g=await m.Global.findByPk(1);return V.json(g?.configuracao).whatsapp?.[String(emp)]||null;}
 function version(){if(!/^v\d{1,3}\.\d+$/.test(env.META_GRAPH_VERSION||''))throw V.falha('META_GRAPH_VERSION não configurada.',503);return env.META_GRAPH_VERSION;}
 async function graph(emp,endpoint,options={}){
  const c=await mapa(emp);if(!c?.token_cifrado||!c.phone_number_id)throw V.falha('WhatsApp oficial não configurado.',503);
  const token=V.decifrar(c.token_cifrado,env,'wa:'+emp).token;
  const r=await http('https://graph.facebook.com/'+version()+'/'+endpoint,{...options,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(15000),redirect:'error'});
  const data=await r.json();if(!r.ok)throw V.falha('WhatsApp oficial recusou a operação.',502);return data;
 }
 async function status(emp,provider){
  if(provider==='baileys')return{provedor:provider,conectado:!!legado().isConectado(emp),status:legado().obterStatus(emp).status};
  const c=await mapa(emp);return{provedor:'oficial',conectado:!!c?.verificado_em,status:c?.verificado_em?'conectado':'aguardando_configuracao'};
 }
 async function validarOficial(emp){const c=await mapa(emp);if(!c)throw V.falha('Configuração ausente.');const r=await graph(emp,c.phone_number_id+'?fields=id,display_phone_number,verified_name');if(String(r.id)!==String(c.phone_number_id))throw V.falha('Número oficial divergente.',409);return{id:r.id,numero:r.display_phone_number,nome:r.verified_name};}
 async function enviar(ctx,texto,autorizar){
  await autorizar();
  if(ctx.dados.whatsapp.provedor==='baileys')return legado().enviarMensagem(ctx.empresaId,ctx.telefone,texto,null,{mensagemId:V.hash('ia:'+ctx.job.id).slice(0,32),autorizar});
  if(!ctx.conversa.ultima_entrada||+agora()-+ctx.conversa.ultima_entrada>=24*3600000)throw V.falha('Janela de atendimento encerrada. A equipe deve usar um template aprovado.',409);
  const c=await mapa(ctx.empresaId);await autorizar();
  try{const r=await graph(ctx.empresaId,c.phone_number_id+'/messages',{method:'POST',body:JSON.stringify({messaging_product:'whatsapp',recipient_type:'individual',to:ctx.telefone,type:'text',text:{preview_url:false,body:V.texto(texto,4000,true)}})});return r.messages?.[0]?.id?{sucesso:true,mensagemId:r.messages[0].id}:{sucesso:false,incerto:true};}
  catch{return{sucesso:false,incerto:true};}
 }
 function validarAssinatura(bytes,assinatura){
  if(!env.META_WHATSAPP_APP_SECRET||!/^sha256=[a-f0-9]{64}$/.test(assinatura||''))return false;
  const expected=crypto.createHmac('sha256',env.META_WHATSAPP_APP_SECRET).update(bytes).digest();return crypto.timingSafeEqual(expected,Buffer.from(assinatura.slice(7),'hex'));
 }
 async function webhook(body){
  const global=await m.Global.findByPk(1),providers=V.json(global?.configuracao).whatsapp||{};const entries=[];
  for(const entry of body.entry||[])for(const change of entry.changes||[]){
   const value=change.value;if(!value?.metadata?.phone_number_id)continue;
   const emp=Object.keys(providers).filter(k=>providers[k].phone_number_id===String(value.metadata.phone_number_id));
   if(emp.length!==1)continue;
   for(const msg of value.messages||[]){if(!['text','audio'].includes(msg.type))continue;if(Math.abs(+agora()-Number(msg.timestamp)*1000)>10*60000)continue;
    entries.push({empresaId:Number(emp[0]),provedor:'oficial',externa:String(msg.id),telefone:V.telefone(msg.from),texto:msg.text?.body||'',audio:msg.audio?{id:msg.audio.id}:null});
   }
  }
  return entries;
 }
 async function baixarAudio(ctx,ref){
  if(ctx.dados.whatsapp.provedor==='baileys'){
   if(typeof ref.protobuf!=='string'||ref.protobuf.length>90000)throw V.falha('Áudio inválido.');
   const lib=await import('@whiskeysockets/baileys');
   const msg=lib.proto.WebMessageInfo.decode(Buffer.from(ref.protobuf,'base64'));
   const audio=msg.message?.audioMessage||msg.message?.ephemeralMessage?.message?.audioMessage;
   if(!audio)throw V.falha('Áudio indisponível.');
   if(audio.url){const u=new URL(audio.url);if(u.protocol!=='https:'||!/(^|\.)(whatsapp\.net|fbcdn\.net)$/.test(u.hostname))throw V.falha('Origem de áudio inválida.');}
   const stream=await lib.downloadMediaMessage(msg,'stream',{}),chunks=[];let size=0;
   try{for await(const part of stream){size+=part.length;if(size>5*1024*1024)throw V.falha('Áudio excede 5 MB.');chunks.push(Buffer.from(part));}return Buffer.concat(chunks);}
   finally{stream.destroy?.();}
  }
  if(!/^\d{1,100}$/.test(ref.id||''))throw V.falha('Mídia inválida.');
  const media=await graph(ctx.empresaId,ref.id);const u=new URL(media.url);
  if(u.protocol!=='https:'||!/(^|\.)(facebook\.com|fbsbx\.com)$/.test(u.hostname))throw V.falha('Origem de mídia inválida.');
  const cfg=await mapa(ctx.empresaId),token=V.decifrar(cfg.token_cifrado,env,'wa:'+ctx.empresaId).token;
  const r=await http(u,{headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw V.falha('Áudio indisponível.',502);const reader=r.body.getReader(),chunks=[];let total=0;
  while(true){const{done,value}=await reader.read();if(done)break;total+=value.length;if(total>5*1024*1024){await reader.cancel();throw V.falha('Áudio excede 5 MB.');}chunks.push(Buffer.from(value));}return Buffer.concat(chunks);
 }
 return{status,enviar,validarAssinatura,webhook,baixarAudio,validarOficial,mapa};
}
module.exports={criar};
