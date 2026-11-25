(() => {
 'use strict';
 function el(tag,text,attrs={}) {const n=document.createElement(tag);if(text!=null)n.textContent=text;for(const[k,v]of Object.entries(attrs)){if(k==='class')n.className=v;else n.setAttribute(k,v);}return n;}
 function button(text,fn,kind=''){const b=el('button',text,{type:'button',class:kind});b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){aviso(e.message,true);}finally{b.disabled=false;}};return b;}
 function aviso(text,error=false){let box=document.querySelector('#ia-feedback');if(!box){box=el('div',null,{id:'ia-feedback',role:'status'});document.body.append(box);}box.textContent=text;box.className='ia-feedback'+(error?' error':'');clearTimeout(box.timer);box.timer=setTimeout(()=>box.remove(),8000);}
 function field(label,value,onchange,{type='text',options,help,min,max,rows=3}={}){const wrap=el('label',null,{class:'ia-field'});wrap.append(el('span',label));const input=el(options?'select':type==='textarea'?'textarea':'input');if(options)for(const[v,t]of options){const o=el('option',t,{value:v});input.append(o);}else if(type!=='textarea')input.type=type;
 if(type==='checkbox'){input.checked=!!value;input.onchange=()=>onchange(input.checked);wrap.classList.add('ia-check');}else{input.value=value??'';input.onchange=()=>onchange(type==='number'||type==='range'?Number(input.value):input.value);}
 if(min!=null)input.min=min;if(max!=null)input.max=max;if(type==='textarea')input.rows=rows;wrap.append(input);if(help)wrap.append(el('small',help));return wrap;}
 function card(title,subtitle){const c=el('section',null,{class:'ia-card'});c.append(el('h3',title));if(subtitle)c.append(el('p',subtitle,{class:'ia-muted'}));return c;}
 function grid(...items){const d=el('div',null,{class:'ia-grid'});d.append(...items);return d;}
 function dialog(title){const d=el('dialog',null,{class:'ia-dialog'});const head=el('header');head.append(el('h2',title),button('Fechar',()=>d.close()));d.append(head);d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();return d;}
 function badge(text){return el('span',text,{class:'ia-badge'});}
 async function api(path,{method='GET',body,admin=false}={}){const base=admin?(window.VPS_URL||location.origin):location.origin;const headers={'X-PetHub-IA':'1'};if(admin){const token=typeof window.getToken==='function'?window.getToken():document.cookie.split('; ').find(x=>x.startsWith('admin_token='))?.split('=').slice(1).join('=');if(token)headers.Authorization='Bearer '+decodeURIComponent(token);}
 if(body!==undefined)headers['Content-Type']='application/json';const r=await fetch(base+'/api/pethub-ia/'+path,{method,headers,credentials:'include',cache:'no-store',signal:AbortSignal.timeout(15000),body:body===undefined?undefined:JSON.stringify(body)});let d;try{d=await r.json();}catch{throw Object.assign(Error('A API PetHub IA não está publicada ou retornou uma resposta inválida.'),{status:r.status});}if(!r.ok)throw Object.assign(Error(d.erro||d.error||'Não foi possível concluir.'),{status:r.status});return d;}
 function format(n,currency='BRL'){return new Intl.NumberFormat('pt-BR',{style:'currency',currency}).format(Number(n)||0);}
 function metric(label,value){const c=card(label);c.append(el('strong',String(value),{class:'ia-number'}));return c;}
 function bars(items){const wrap=el('div',null,{class:'ia-bars'});const max=Math.max(1,...items.map(x=>Number(x.value)||0));for(const item of items){const row=el('div');row.append(el('span',item.label),el('b',String(item.value)));const bar=el('i');bar.style.width=Math.round(Number(item.value)/max*100)+'%';row.append(bar);wrap.append(row);}return wrap;}
 window.PetHubIAUI={el,button,aviso,field,card,grid,dialog,badge,api,format,metric,bars};
})();
