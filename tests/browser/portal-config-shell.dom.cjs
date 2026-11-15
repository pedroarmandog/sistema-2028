const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../../frontend'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),pause=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await pause(5);}throw Error('Expected state absent');}
function page(t,{pdf={id:1,nomeEmpresa:'Pet A',logoDataUrl:'data:image/png;base64,YWJj'},fallback={id:1,nome:'Pet A',logo:'logo-a.png'},user={id:9,nome:'Belto',empresaId:1,empresaNome:'Pet A'},delay=false,common=false}={}){
 const dom=new JSDOM(read('configuracoes/portal-cliente.html'),{url:'https://erp.example/configuracoes/portal-cliente.html',runScripts:'outside-only',pretendToBeVisual:true});const observers=[];t.after(()=>{for(const observer of observers)observer.disconnect();dom.window.close();});const w=dom.window,d=w.document,calls=[];const NativeObserver=w.MutationObserver;w.MutationObserver=class extends NativeObserver{constructor(callback){super(callback);observers.push(this);}};w.matchMedia=()=>({matches:false});let insert;
 w.fetch=async(url,options={})=>{const p=new URL(url,w.location.href).pathname;calls.push({p,options});let data;
  if(p==='/sidebar-component/sidebar.html'){if(delay)await new Promise(r=>insert=r);return {ok:true,text:async()=>read('sidebar-component/sidebar.html')};}
  if(p==='/api/usuarios/me')data=user;
  else if(p==='/api/empresas/identidade-pdf')data=pdf;
  else if(p==='/api/empresas/1')data=fallback;
  else throw Error('Unexpected endpoint '+p);
  if(typeof data==='number')return {ok:false,status:data};return {ok:true,json:async()=>data};
 };
 const load=f=>w.eval(read(f));if(common){w.console.log=()=>{};load('config/help-center-config.js');load('components/global-help-center.js');load('components/user-profile-dropdown.js');}load('components/cliente-portal-config-shell.js');load('sidebar-component/sidebar-navigation.js');
 return {w,d,calls,load,release:()=>insert?.()};
}
test('standard ERP header sits at viewport edges and contains functional standard controls',async t=>{
 const p=page(t);await until(()=>p.d.querySelector('.sidebar'));const d=p.d,style=d.createElement('style');style.textContent=read('components/cliente-portal-config.css');d.head.append(style);const cs=p.w.getComputedStyle(d.querySelector('.pc-settings-header'));assert.equal(cs.position,'fixed');assert.equal(cs.top,'0px');assert.equal(cs.left,'120px');assert.equal(cs.right,'0px');assert.equal(parseFloat(cs.borderRadius),0);assert.ok(d.querySelector('.header-left .menu-toggle'));assert.ok(d.querySelector('.header-right .calendar-widget'));assert.ok(d.getElementById('inicioRapidoBtn'));assert.ok(d.getElementById('pc-menu-search'));assert.ok(d.querySelector('.user-menu'));assert.equal(d.querySelector('.pc-settings-heading .pc-header-actions a').pathname,'/dashboard.html');
});
test('company logo and user come from authenticated scope; logo loads after late sidebar insertion',async t=>{
 const p=page(t,{delay:true});await until(()=>p.calls.some(c=>c.p.endsWith('identidade-pdf')));p.release();await until(()=>p.d.querySelector('.logo-pet-cria')?.src.startsWith('data:'));const img=p.d.querySelector('.logo-pet-cria');assert.equal(img.width,113);assert.equal(img.height,77);assert.equal(img.hidden,true);img.onload();assert.equal(img.hidden,false);assert.equal(p.d.querySelector('[data-pc-company-name]').hidden,true);assert.equal(p.d.querySelector('[data-pc-user-name]').textContent,'Belto');assert.match(img.alt,/Pet A/);for(const c of p.calls.filter(c=>c.p.startsWith('/api/'))){assert.equal(c.options.credentials,'include');assert.equal(c.options.cache,'no-store');assert.equal(c.options.method,undefined);}assert.equal(p.calls.some(c=>c.p==='/api/empresas'),false);
});
test('legacy filename fallback and permanent HTTPS URL are normalized without duplicated uploads prefix',async t=>{
 for(const [value,url] of [['logo-a.png','https://erp.example/uploads/logo-a.png'],['/uploads/logo-a.png','https://erp.example/uploads/logo-a.png'],['https://cdn.example/pet/logo.png','https://cdn.example/pet/logo.png']]){
  const p=page(t,{pdf:404,fallback:{id:1,nome:'Pet A',logo:value}});await until(()=>p.d.querySelector('.logo-pet-cria')?.src===url);assert.equal(p.calls.filter(c=>c.p==='/api/empresas/1').length,1);
 }
});
test('foreign identity is rejected; no logo image error replaces company with another brand',async t=>{
 const p=page(t,{pdf:{id:2,nomeEmpresa:'Foreign',logoDataUrl:'data:image/png;base64,Zm9yZWlnbg=='},fallback:{id:1,nome:'Minha empresa',logo:'/uploads/minha.png'}});await until(()=>p.d.querySelector('.logo-pet-cria')?.src.endsWith('/uploads/minha.png'));const img=p.d.querySelector('.logo-pet-cria');assert.doesNotMatch(img.src,/Zm9yZWlnbg/);img.onerror();assert.equal(img.hidden,true);assert.equal(p.d.querySelector('[data-pc-company-name]').textContent,'Minha empresa');assert.equal(p.d.querySelector('[data-pc-company-name]').hidden,false);
});
test('unauthorized session stops company reads; no-logo and unsafe URLs retain shop-name fallback',async t=>{
 const denied=page(t,{user:401});await until(()=>denied.d.querySelector('.sidebar'));await pause(10);assert.equal(denied.calls.some(c=>c.p.startsWith('/api/empresas')),false);
 for(const logo of [null,'javascript:alert(1)','//other.example/logo.png','data:text/html;base64,YWJj']){
  const p=page(t,{pdf:{id:1,nomeEmpresa:'Pet sem logo',logo}});await until(()=>p.d.querySelector('[data-pc-company-name]')?.textContent==='Pet sem logo');assert.equal(p.d.querySelector('.logo-pet-cria').hidden,true);assert.equal(p.d.querySelector('[data-pc-company-name]').hidden,false);
 }
});
test('quick menu and normalized search work once; every direct header link and script exists',async t=>{
 const p=page(t);await until(()=>p.d.querySelector('.sidebar'));p.load('components/cliente-portal-config-shell.js');const button=p.d.getElementById('inicioRapidoBtn');button.click();assert.equal(button.getAttribute('aria-expanded'),'true');button.click();assert.equal(button.getAttribute('aria-expanded'),'false');const input=p.d.getElementById('pc-menu-search');input.value='configuracao';input.dispatchEvent(new p.w.Event('input',{bubbles:true}));assert.ok(p.d.querySelector('#pc-menu-results a[href="/configuracoes/configuracao-fiscal.html"]'));p.d.body.dispatchEvent(new p.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(p.d.getElementById('pc-menu-results').hidden,true);for(const el of p.d.querySelectorAll('.pc-settings-header a[href],script[src]')){const href=el.getAttribute('href')||el.getAttribute('src');if(href.startsWith('/'))assert.ok(fs.existsSync(path.join(root,new URL(href,'https://erp.example').pathname)),href);}
});
test('shared ERP help and profile components initialize alongside the shell with real session name',async t=>{
 const p=page(t,{common:true});await until(()=>p.d.querySelector('#hcHeaderBtn')&&p.d.querySelector('.user-profile-company')?.textContent==='Belto');assert.equal(p.d.querySelectorAll('#hcHeaderBtn').length,1);assert.equal(p.d.querySelector('.user-profile-name').textContent,'Pet A');p.d.querySelector('.user-menu').click();assert.equal(p.d.querySelector('.user-profile-dropdown').classList.contains('active'),true);p.d.getElementById('hcHeaderBtn').click();assert.equal(p.d.getElementById('hc-modal').classList.contains('hc-open'),true);
});
