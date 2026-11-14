/* Referências persistentes. Cookie HttpOnly no desktop; Bearer somente na API
   conhecida no PWA. Nenhum token é colocado em URL, img.src ou localStorage novo. */
(function(){
 'use strict';if(window.PetHubMidias)return;
 function base(){try{return new URL(window.API_URL||window.VPS_URL||location.origin,location.origin).origin;}catch{return location.origin;}}
 function url(ref){if(!ref)return '';if(/^(data:|blob:|https?:\/\/)/i.test(ref))return ref;return base()+'/uploads/'+String(ref).replace(/^\/?uploads\//,'').replace(/^\//,'');}
 function token(){try{return window.MobileAuth?.getToken?.()||localStorage.getItem('pethub_mobile_token')||sessionStorage.getItem('pethub_mobile_token')||localStorage.getItem('token')||sessionStorage.getItem('token')||'';}catch{return '';}}
 function permitida(src){try{const u=new URL(src,location.href);return [location.origin,base()].includes(u.origin)&&u.pathname.startsWith('/uploads/');}catch{return false;}}
 const objetos=new Map(),ocupados=new WeakSet(),tentadas=new WeakMap();
 async function autenticar(img){
  const src=img.getAttribute('src');if(!src||!permitida(src)||ocupados.has(img)||tentadas.get(img)===src)return;
  const t=token();if(!t)return;tentadas.set(img,src);ocupados.add(img);
  try{const r=await fetch(new URL(src,location.href),{credentials:'include',cache:'no-store',headers:{Authorization:'Bearer '+t}});if(!r.ok)throw Error('HTTP '+r.status);
   const b=await r.blob();if(!b.type.startsWith('image/'))throw Error('Resposta inválida');
   if(img.getAttribute('src')!==src||!img.isConnected)return;
   if(objetos.has(img))URL.revokeObjectURL(objetos.get(img));const object=URL.createObjectURL(b);objetos.set(img,object);img.src=object;
  }catch{img.title='Imagem indisponível. Verifique o armazenamento ou o relatório de migração.';console.warn('[Midias] Não foi possível carregar uma imagem.');}finally{ocupados.delete(img);}
 }
 function examinar(root){if(root instanceof HTMLImageElement)autenticar(root);root.querySelectorAll?.('img[src]').forEach(autenticar);}
 function iniciar(){examinar(document);new MutationObserver(records=>{for(const r of records){if(r.type==='attributes')examinar(r.target);for(const n of r.addedNodes)examinar(n);}for(const [img,object]of objetos)if(!img.isConnected){URL.revokeObjectURL(object);objetos.delete(img);}}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});}
 document.addEventListener('error',e=>{if(e.target instanceof HTMLImageElement)autenticar(e.target);},true);
 // Anexos privados também precisam do Bearer no PWA; sem alterar links externos.
 document.addEventListener('click',async e=>{const a=e.target.closest?.('a[href]');if(!a||!permitida(a.href)||!token()||e.ctrlKey||e.metaKey)return;e.preventDefault();const tab=window.open('about:blank','_blank');try{const r=await fetch(a.href,{credentials:'include',cache:'no-store',headers:{Authorization:'Bearer '+token()}});if(!r.ok)throw Error();const object=URL.createObjectURL(await r.blob());if(tab){tab.opener=null;tab.location.href=object;}else{const link=document.createElement('a');link.href=object;link.download=a.download||'anexo';link.click();}setTimeout(()=>URL.revokeObjectURL(object),300000);}catch{tab?.close();alert('Não foi possível abrir o anexo. Verifique sua sessão e o armazenamento.');}},false);
 window.addEventListener('pagehide',()=>{for(const object of objetos.values())URL.revokeObjectURL(object);objetos.clear();});
 window.PetHubMidias={url};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar,{once:true});else iniciar();
})();
