(() => {
 'use strict';if(window.__petHubIALoader)return;window.__petHubIALoader=true;
 const path=location.pathname;if(path.startsWith('/cliente-app/')||path.startsWith('/mobile/')||path.startsWith('/comunidade/'))return;
 function script(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.append(s);});}
 function css(){if(document.querySelector('link[data-ia-css]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='/components/pethub-ia/estilos.css?v=1';l.dataset.iaCss='1';document.head.append(l);}
 const ready=()=>new Promise(r=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',r,{once:true}):r());
 window.pethubIAIcone=a=>{let servicos=a.servicos;if(typeof servicos==='string'){try{servicos=JSON.parse(servicos);}catch{return'';}}const source=Array.isArray(servicos)&&servicos.some(s=>s.meta?.pethubIA);return source?'<span class="ia-origin" title="Agendado pelo PetHub IA" aria-label="Agendado pelo PetHub IA"><i class="fas fa-robot" aria-hidden="true"></i></span>':'';};
 async function boot(){await ready();css();
  if(path==='/painel-admin/admin-dashboard.html'){await script('/components/pethub-ia/ui.js?v=1');await script('/components/pethub-ia/financeiro-ui.js?v=2');await script('/components/pethub-ia/admin.js?v=2');return;}
  if(path==='/configuracoes/pethub-ia.html')return;
  try{const r=await fetch('/api/pethub-ia/acesso',{credentials:'include',cache:'no-store'});if(!r.ok)return;const acesso=await r.json();if(!acesso.liberado)return;
   function inserir(){for(const menu of document.querySelectorAll('#configuracaoSubmenu')){if(menu.querySelector('[data-pethub-ia-menu]'))continue;const a=document.createElement('a');a.href='/configuracoes/pethub-ia.html';a.className='submenu-item';a.dataset.pethubIaMenu='1';a.textContent='PetHub IA';const portal=menu.querySelector('a[href*="portal-cliente.html"]');if(portal)portal.after(a);else menu.append(a);}}
   inserir();const observer=new MutationObserver(inserir);observer.observe(document.body,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),20000);window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
  }catch{/* O ERP segue funcionando quando a IA não está instalada/configurada. */}
 }
 boot().catch(()=>{});
})();
