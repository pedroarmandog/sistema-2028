'use strict';
const V=require('./validacao');
function dto(empresa,{slug,autenticada=false}={}){
 const logo=!!empresa?.logo,versao=logo?V.hash(String(empresa.logo)+'|'+String(empresa.updatedAt||'')).slice(0,20):null;
 return {logo,logoVersao:versao,logoUrl:logo?(autenticada?'/api/cliente-app/loja/logo':'/api/cliente-app/loja/'+encodeURIComponent(slug)+'/logo')+'?v='+versao:null};
}
function criarLogo(p){async function ler(empresa){
 if(!empresa?.logo||!Number.isSafeInteger(Number(empresa.id))||Number(empresa.id)<1)throw V.falha('Logo não encontrada.',404);
 const media=require('../midias/validar');
 const r=String(empresa.logo).startsWith('data:image/')?{bytes:media.base64(empresa.logo)}:await p.midias().ler(empresa.id,empresa.logo);
 let validada;try{validada=await media.validar(r.bytes,{imagem:true,otimizar:false});}catch{throw V.falha('Logo indisponível.',404);}
 try{const bytes=await require('sharp')(validada.bytes,{limitInputPixels:25000000}).rotate().resize({width:226,height:154,fit:'inside',withoutEnlargement:true}).png().toBuffer();return {bytes,tipo:'image/png'};}catch{throw V.falha('Logo indisponível.',404);}
 }return {ler};}
module.exports={dto,criarLogo};
