/* Official sidebar markup/styles; navigation only, without Dashboard polling. */
(function(){
 'use strict';if(window.PortalSidebarNavigation)return;
 window.PortalSidebarNavigation=true;
 let sidebar;
 const children=el=>[...el.children];
 function closeAll(){sidebar?.querySelectorAll('.nav-item-with-submenu').forEach(g=>{g.classList.remove('open');children(g).find(n=>n.matches('.submenu'))?.classList.remove('open');children(g).find(n=>n.matches('a'))?.setAttribute('aria-expanded','false');});}
 function toggle(button){
  const group=button.closest('.nav-item-with-submenu'),panel=children(group).find(n=>n.matches('.submenu'));
  const open=!group.classList.contains('open');closeAll();group.dataset.pcClosed=String(!open);if(open){group.classList.add('open');panel.classList.add('open');button.setAttribute('aria-expanded','true');}
 }
 function nested(button){const panel=button.nextElementSibling;if(!panel?.classList.contains('nested-submenu'))return false;const open=panel.style.display==='none';panel.style.display=open?'block':'none';button.setAttribute('aria-expanded',String(open));const caret=button.querySelector('[id*="Caret"]');if(caret)caret.textContent=open?'▲':'▼';return true;}
 function init(){
  sidebar.querySelectorAll('.nav-item-with-submenu').forEach(g=>{
   const b=children(g).find(n=>n.matches('a.nav-item')),panel=children(g).find(n=>n.matches('.submenu'));if(!b||!panel)return;
   g.addEventListener('mouseleave',()=>delete g.dataset.pcClosed);
   b.setAttribute('aria-controls',panel.id);b.setAttribute('aria-expanded','false');b.setAttribute('role','button');
   const title=document.createElement('div');title.className='submenu-fixed-header';title.textContent=b.querySelector('span')?.textContent||b.textContent;panel.prepend(title);
  });
  sidebar.querySelectorAll('[id*="Btn"]').forEach(b=>{if(!b.nextElementSibling?.classList.contains('nested-submenu'))return;b.setAttribute('role','button');b.tabIndex=0;b.setAttribute('aria-expanded','false');});
  sidebar.querySelectorAll('a[href]').forEach(a=>{if(a.getAttribute('href')===location.pathname){a.classList.add('active');a.setAttribute('aria-current','page');a.closest('.nav-item-with-submenu')?.querySelector('.nav-item')?.classList.add('active');}});
  if(matchMedia('(max-width: 700px)').matches)sidebar.classList.add('collapsed');
 }
 document.addEventListener('click',e=>{
  const menu=e.target.closest('.menu-toggle');if(menu){const closed=sidebar?.classList.toggle('collapsed');document.body.classList.toggle('pc-sidebar-collapsed',closed);menu.setAttribute('aria-expanded',String(!closed));if(closed)closeAll();return;}
  if(!sidebar?.contains(e.target)){closeAll();if(sidebar&&matchMedia('(max-width: 700px)').matches){sidebar.classList.add('collapsed');document.querySelector('.menu-toggle')?.setAttribute('aria-expanded','false');}return;}
  const nestedButton=e.target.closest('[id*="Btn"]');if(nestedButton&&nested(nestedButton)){e.preventDefault();return;}
  const b=e.target.closest('.nav-item-with-submenu > a.nav-item');if(b){e.preventDefault();toggle(b);return;}
  if(e.target.closest('a[href="#"]'))e.preventDefault();
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll();if(e.key===' '||e.key==='Enter'){const b=e.target.closest('[role=button]');if(b&&sidebar?.contains(b)){e.preventDefault();b.click();}}});
 fetch('/sidebar-component/sidebar.html',{credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error('Menu indisponível');return r.text();}).then(html=>{
  const template=document.createElement('template');template.innerHTML=html;sidebar=template.content.querySelector('.sidebar');if(!sidebar)throw Error('Menu indisponível');
  const old=document.querySelector('.sidebar');if(old)old.replaceWith(sidebar);else document.body.prepend(sidebar);init();
 }).catch(()=>{const el=document.getElementById('pc-nav-status');if(el)el.textContent='Não foi possível carregar o menu. Use Voltar ao sistema ou atualize a página.';});
})();
