/* Paleta da empresa: somente respostas autenticadas do servidor podem aplicá-la. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./tema-esquema'));else root.PetHubTemaCliente=factory(root.PetHubPaletaEsquema);})(typeof window==='undefined'?globalThis:window,function(S){
 'use strict';
 function criar({fetch:enviar,aplicar=()=>{},headers=()=>({}),setTimeout:agendar=setTimeout,clearTimeout:cancelar=clearTimeout}={}){
  let estado=null,fila=Promise.resolve(),ativo=false,geracao=0,stream=null,timer=null,atraso=1000,podeEditar=false;
  const ouvintes=new Set(),pedidos=new Set(),url='/api/usuarios/preferencias';
  function aceitar(d){if(!d?.tema||!Number.isSafeInteger(d.tema.empresaId)||!Number.isSafeInteger(d.tema.versao))throw Error('Resposta de paleta inválida.');
   if(estado&&d.tema.empresaId===estado.tema.empresaId&&d.tema.versao<estado.tema.versao)return estado;
   if(Object.hasOwn(d.tema,'podeEditar'))podeEditar=d.tema.podeEditar===true;
   estado={systemColors:S.normalizar(d.systemColors),tema:{...d.tema,podeEditar}};aplicar(estado);for(const fn of ouvintes)try{fn(estado);}catch{/* Um observador da tela não deve interromper a sincronização. */}return estado;
  }
  async function request(method='GET',body){const controller=new AbortController(),g=geracao;pedidos.add(controller);const t=agendar(()=>controller.abort(),10000);
   try{const r=await enviar(url,{method,credentials:'include',cache:'no-store',headers:{...headers(),...(body?{'Content-Type':'application/json'}:{})},signal:controller.signal,...(body?{body:JSON.stringify(body)}:{})});
    const d=await r.json();if(g!==geracao)throw Error('A sessão mudou. Atualize a página.');
    if(!r.ok){if(r.status===401||r.status===403){parar();limpar();}throw Object.assign(Error(d.erro||d.error||'Não foi possível salvar a paleta.'),{status:r.status,dados:d});}return d;
   }finally{cancelar(t);pedidos.delete(controller);}
  }
  async function atualizar(){return aceitar(await request());}
  function gravar(operacao){const g=geracao;const tarefa=async()=>{if(g!==geracao)throw Error('A sessão mudou.');if(!estado)await atualizar();const antes=estado;
   try{return aceitar(await request('PUT',{...operacao,versaoBase:antes.tema.versao}));}
   catch(e){if(e.status!==409||!e.dados?.tema)throw e;const atual=aceitar(e.dados);
    // Rebase somente de cores diferentes; reset e edição da mesma cor exigem revisão.
    if(operacao.patchCores){const a=S.valores(antes.systemColors),b=S.valores(atual.systemColors);if(Object.keys(operacao.patchCores).every(k=>a[k]===b[k]))return aceitar(await request('PUT',{...operacao,versaoBase:atual.tema.versao}));}
    throw e;
   }};const p=fila.then(tarefa);fila=p.catch(()=>{});return p;
  }
  function editar(p){return gravar({patchCores:S.patches(p)});}
  function restaurar(){return gravar({restaurarCores:true});}
  function importar(p){return gravar({systemColors:S.normalizar(p)});}
  function limpar(){estado=null;podeEditar=false;aplicar(null);}
  function parar(){ativo=false;geracao++;stream?.abort();stream=null;cancelar(timer);timer=null;for(const p of pedidos)p.abort();pedidos.clear();}
  async function conectar(){if(!ativo||stream)return;const g=geracao,c=new AbortController();stream=c;let normal=false;
   try{const r=await enviar(url+'/eventos',{credentials:'include',cache:'no-store',headers:headers(),signal:c.signal});if(!r.ok){if(r.status===401||r.status===403){parar();limpar();}throw Error('Conexão indisponível.');}
    if(!r.body?.getReader)throw Error('Streaming indisponível.');const reader=r.body.getReader(),decoder=new TextDecoder();let buf='';
    try{while(ativo&&g===geracao){const {done,value}=await reader.read();if(done){normal=true;break;}buf+=decoder.decode(value,{stream:true}).replace(/\r\n/g,'\n');let i;
     while((i=buf.indexOf('\n\n'))>=0){const bloco=buf.slice(0,i);buf=buf.slice(i+2);if(bloco.split('\n').includes('event: paleta')){const dados=bloco.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trim()).join('\n');if(g===geracao)aceitar(JSON.parse(dados));atraso=1000;}}
     if(buf.length>65536)throw Error('Evento inválido.');
    }}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
   }catch{if(ativo&&g===geracao)try{await atualizar();}catch{/* Manter última paleta confirmada durante indisponibilidade. */}}
   finally{if(stream===c)stream=null;if(ativo&&g===geracao){timer=agendar(conectar,normal?1000:atraso);if(!normal)atraso=Math.min(atraso*2,30000);}}
  }
  async function iniciar(){parar();ativo=true;try{await atualizar();}finally{if(ativo)void conectar();}return estado;}
  return {iniciar,parar,atualizar,limpar,editar,restaurar,importar,receber:aceitar,get estado(){return estado;},assinar(fn){ouvintes.add(fn);if(estado)fn(estado);return()=>ouvintes.delete(fn);}};
 }
 function aplicarDocumento(d,doc,mobile=false){const root=doc.documentElement;const styleId='custom-colors-override';const aliases={'--bg':'bg-body','--surface':'bg-white','--surface-2':'bg-light','--text':'text-primary','--text-muted':'text-secondary','--blue':'primary-blue','--green':'btn-primary','--success':'status-success','--danger':'status-danger','--warning':'status-warning'};
  if(!d){for(const c of S.itens)root.style.removeProperty(c.var);root.style.removeProperty('--bg-sidebar');if(mobile)for(const k of Object.keys(aliases))root.style.removeProperty(k);doc.getElementById(styleId)?.remove();return;}
  const cores=S.normalizar(d.systemColors),v=S.valores(cores);for(const cat of Object.values(cores))for(const c of cat)root.style.setProperty(c.var,c.hex);
  const grad=`linear-gradient(180deg, ${v['sidebar-start']} 0%, ${v['sidebar-end']} 100%)`;root.style.setProperty('--bg-sidebar',grad);
  if(mobile){for(const [k,id]of Object.entries(aliases)){if(d.tema.personalizada)root.style.setProperty(k,v[id]);else root.style.removeProperty(k);}return;}
  let el=doc.getElementById(styleId);if(!el){el=doc.createElement('style');el.id=styleId;doc.head.appendChild(el);}
  el.textContent=`.btn-primary,.button-primary{background:${v['btn-primary']}!important}.btn-primary:hover,.button-primary:hover{background:${v['btn-primary-hover']}!important}.text-primary{color:${v['primary-blue']}!important}.bg-primary{background-color:${v['primary-blue']}!important}.border-primary{border-color:${v['primary-blue']}!important}.text-success,.notification.success{color:${v['status-success']}!important}.bg-success{background-color:${v['status-success']}!important}.text-danger,.text-error,.notification.error{color:${v['status-danger']}!important}.bg-danger,.bg-error{background-color:${v['status-danger']}!important}.sidebar{background:${grad}!important}`;
 }
 return {criar,aplicarDocumento};
});
