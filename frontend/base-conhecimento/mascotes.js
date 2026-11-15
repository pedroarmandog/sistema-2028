/* Catálogo exclusivo da Central: novas poses podem ser associadas aqui. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.PetHubMascotes=factory();})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const assets={
  escritorio:{arquivo:'escritorio',width:1536,height:1024,alt:'Mascote PetHub trabalhando no escritório com um tablet'},
  dashboard:{arquivo:'dashboard',width:1312,height:1199,alt:'Mascote PetHub apresentando gráficos de um dashboard'},
  cafe:{arquivo:'cafe',width:1199,height:1312,alt:'Mascote PetHub dando boas-vindas com café e laptop'},
  campanha:{arquivo:'campanha',width:1312,height:1199,alt:'Mascote PetHub com câmera e claquete de campanha'},
  veterinario:{arquivo:'veterinario',width:1199,height:1312,alt:'Mascote PetHub veterinário com uma lista de cuidados'},
  tablet:{arquivo:'tablet',width:1024,height:1536,alt:'Mascote PetHub com tablet e garrafa de água'},
  pausa:{arquivo:'pausa',width:1312,height:1199,alt:'Mascote PetHub fazendo uma pausa para o café'}
 };
 const contextos={home:'cafe',boasVindas:'escritorio',dashboard:'dashboard',agenda:'tablet',clientes:'cafe',pets:'veterinario',clinica:'veterinario',financeiro:'dashboard',caixa:'dashboard',relatorios:'dashboard',marketing:'campanha',videos:'campanha',produtos:'escritorio',estoque:'escritorio',compras:'escritorio',configuracoes:'tablet',mobile:'tablet',notificacoes:'tablet','painel-admin':'escritorio',novidades:'campanha',vazio:'pausa',conclusao:'escritorio'};
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function imagem(contexto,{prioridade=false,compacta=false,decorativa=false}={}){
  const a=assets[contextos[contexto]]||assets.escritorio,base='/base-conhecimento/assets/mascotes/'+a.arquivo;
  return `<figure class="kb-mascot ${prioridade?'kb-mascot-float':''} ${compacta?'kb-mascot-compact':''}" data-mascot><picture><source type="image/webp" srcset="${base}-360.webp 360w, ${base}-720.webp 720w" sizes="${compacta?'96px':'(max-width: 600px) 72vw, (max-width: 1000px) 38vw, 440px'}"><img src="${base}-${compacta?'360':'720'}.webp" width="${a.width}" height="${a.height}" alt="${decorativa?'':esc(a.alt)}" loading="${prioridade?'eager':'lazy'}" decoding="async" ${prioridade?'fetchpriority="high"':''}></picture><span class="kb-mascot-fallback" aria-hidden="true">✦</span></figure>`;
 }
 function dica(texto,contexto='boasVindas'){return `<aside class="kb-mascot-tip">${imagem(contexto,{compacta:true,decorativa:true})}<div><strong>Dica do PetHub</strong><p>${esc(texto)}</p></div></aside>`;}
 function introducao(contexto,titulo,texto){return `<div class="kb-mascot-intro">${imagem(contexto,{compacta:true,decorativa:true})}<div><strong>${esc(titulo)}</strong><p>${esc(texto)}</p></div></div>`;}
 function vazio(titulo,texto){return `<div class="kb-guide-empty">${imagem('vazio',{compacta:true,decorativa:true})}<div><strong>${esc(titulo)}</strong><p>${esc(texto)}</p></div></div>`;}
 return {assets,contextos,imagem,dica,introducao,vazio};
});
