/* ERP header and read-only company identity for the portal settings screen. */
(function(){
 'use strict';
 if(window.PortalConfigShell||!document.body.classList.contains('pc-settings'))return;
 window.PortalConfigShell=true;
 const base=()=>window.API_URL||window.VPS_URL||location.origin;
 let user=null,company=null,sequence=0;
 const urls=new Set();
 async function get(path){
  const r=await fetch(base()+path,{credentials:'include',cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw Object.assign(Error('Recurso indisponível'),{status:r.status});return r.json();
 }
 function logoURL(value){
  if(typeof value!=='string'||!value.trim())return null;
  value=value.trim();
  if(/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=\s]+$/i.test(value))return value;
  if(value.startsWith('data:'))return null;
  if(value.startsWith('//')||value.includes('\\')||/^[a-z][a-z0-9+.-]*:/i.test(value)&&!value.startsWith('https://'))return null;
  if(value.startsWith('https://'))return value;
  return new URL(value.startsWith('/')?value:'/uploads/'+value,base()).href;
 }
 function profile(){
  if(!user){document.querySelectorAll('.user-profile-name').forEach(el=>el.textContent='Empresa');document.querySelectorAll('.user-profile-company').forEach(el=>el.textContent='Usuário');return;}
  const name=document.querySelector('[data-pc-user-name]');if(name)name.textContent=user.nome||'Usuário';
  const menu=document.querySelector('.user-menu');if(menu)menu.setAttribute('aria-label','Menu de '+(user.nome||'usuário'));
  document.querySelectorAll('.user-profile-name').forEach(el=>el.textContent=company?.nomeEmpresa||company?.razaoSocial||company?.nome||user.empresaNome||'Empresa');
  document.querySelectorAll('.user-profile-company').forEach(el=>el.textContent=user.nome||'Usuário');
 }
 function brand(){
  const img=document.querySelector('.sidebar .logo-pet-cria');if(!img)return;
  const run=++sequence,container=img.parentElement;
  let name=container.querySelector('[data-pc-company-name]');
  if(!name){name=document.createElement('span');name.dataset.pcCompanyName='1';container.append(name);}
  name.textContent=company?.nomeFantasia||company?.nomeEmpresa||company?.nome||user?.empresaNome||'Empresa';
  img.hidden=true;name.hidden=false;img.onload=null;img.onerror=null;
  const url=logoURL(company?.logoDataUrl||company?.logoUrl||company?.logo);
  if(!url)return;
  img.width=113;img.height=77;img.alt='Logo de '+name.textContent;
  const apply=()=>{if(run!==sequence||!img.isConnected)return;img.hidden=false;name.hidden=true;};
  img.onload=apply;
  img.onerror=()=>{if(run!==sequence||!img.isConnected)return;img.hidden=true;name.hidden=false;container.title='Não foi possível carregar a logo cadastrada.';};
  img.src=url;if(img.complete&&img.naturalWidth>0)apply();
 }
 async function identity(){
  try{
   user=await get('/api/usuarios/me');profile();brand();
   const id=Number(user.empresaId);if(!Number.isSafeInteger(id)||id<=0)return;
   // The existing PDF identity service resolves private permanent storage and legacy files.
   try{const result=await get('/api/empresas/identidade-pdf');if(Number(result.id)!==id)throw Error('Escopo diferente');company=result;}
   catch(e){if(e.status===401||e.status===403)return;const result=await get('/api/empresas/'+id);if(Number(result.id)!==id)return;company=result;}
   profile();brand();
  }catch{profile();brand();}
 }
 function quickClose(){const dropdown=document.getElementById('inicioRapidoBtn')?.closest('.dropdown');dropdown?.classList.remove('open');document.getElementById('inicioRapidoBtn')?.setAttribute('aria-expanded','false');}
 const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function search(){
  const input=document.getElementById('pc-menu-search'),list=document.getElementById('pc-menu-results');if(!input||!list)return;
  list.replaceChildren();urls.clear();const q=normalize(input.value.trim());
  if(q)for(const source of document.querySelectorAll('.sidebar a[href]')){
   const href=source.getAttribute('href'),text=source.textContent.trim().replace(/\s+/g,' ');
   if(!href.startsWith('/')||urls.has(href)||!normalize(text).includes(q))continue;
   urls.add(href);const a=document.createElement('a');a.href=href;a.textContent=text;list.append(a);if(urls.size>=8)break;
  }
  if(q&&!list.children.length){const empty=document.createElement('p');empty.textContent='Nenhum menu encontrado.';list.append(empty);}
  list.hidden=!q;input.setAttribute('aria-expanded',String(!list.hidden));
 }
 document.addEventListener('click',e=>{
  const quick=e.target.closest('#inicioRapidoBtn');if(quick){const parent=quick.closest('.dropdown'),open=!parent.classList.contains('open');parent.classList.toggle('open',open);quick.setAttribute('aria-expanded',String(open));}else if(!e.target.closest('#inicioRapidoMenu'))quickClose();
  if(!e.target.closest('.search-box')){const list=document.getElementById('pc-menu-results');if(list)list.hidden=true;document.getElementById('pc-menu-search')?.setAttribute('aria-expanded','false');}
 });
 document.addEventListener('input',e=>{if(e.target.id==='pc-menu-search')search();});
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){quickClose();const list=document.getElementById('pc-menu-results');if(list)list.hidden=true;document.getElementById('pc-menu-search')?.setAttribute('aria-expanded','false');}
  if(e.target.id==='pc-menu-search'&&['Enter','ArrowDown'].includes(e.key)){const a=document.querySelector('#pc-menu-results a');if(a){e.preventDefault();if(e.key==='Enter')a.click();else a.focus();}}
  if(e.target.matches('.user-menu')&&['Enter',' '].includes(e.key)){e.preventDefault();e.target.click();}
 });
 document.addEventListener('pethub:sidebar-ready',()=>{brand();search();});
 document.addEventListener('DOMContentLoaded',profile,{once:true});
 void identity();
})();
