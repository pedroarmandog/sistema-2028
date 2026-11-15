'use strict';
const S=require('../../frontend/tema-esquema');
const json=v=>typeof v==='string'?JSON.parse(v):v;
// Nunca adivinhar a empresa quando uma preferência pertencia a usuário multiempresa.
function planejar(usuarios){const grupos=new Map(),avisos=[];
 for(const u of usuarios)try{const pref=json(u.preferencias);if(!pref?.systemColors)continue;const ids=[...new Set((json(u.empresas)||[]).map(x=>Number(typeof x==='object'?x.id:x)))];if(ids.length!==1||!Number.isSafeInteger(ids[0])||ids[0]<1){avisos.push({usuarioId:u.id,motivo:'Usuário sem empresa única: escolha manualmente a paleta no editor.'});continue;}
  const paleta=S.normalizar(pref.systemColors),g=grupos.get(ids[0])||[];g.push({usuarioId:u.id,paleta});grupos.set(ids[0],g);
 }catch{avisos.push({usuarioId:u.id,motivo:'Preferência antiga inválida; preservada para revisão.'});}
 const candidatos=[];for(const [empresaId,g]of grupos){if(new Set(g.map(x=>JSON.stringify(x.paleta))).size>1)avisos.push({empresaId,motivo:'Usuários possuem paletas diferentes: escolha manualmente no editor.'});else candidatos.push({empresaId,...g[0]});}
 return {candidatos,avisos};
}
module.exports={planejar};
