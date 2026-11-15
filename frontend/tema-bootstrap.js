/* Uma conexão por página; credenciais nunca são colocadas na URL. */
(function(){
 if(window.PetHubTema)return;
 const mobile=location.pathname.startsWith('/mobile/');
 const carregar=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(Error('Não foi possível carregar o serviço de cores.'));document.head.appendChild(s);});
 const tema=window.PetHubTema={};
 tema.ready=(async()=>{await carregar('/tema-esquema.js');await carregar('/tema-cliente.js');
  const token=()=>mobile?(window.MobileAuth?.getToken?.()||localStorage.getItem('pethub_mobile_token')||''):'';
  const cliente=PetHubTemaCliente.criar({fetch:(...args)=>window.fetch(...args),headers:()=>{const t=token();return t?{Authorization:'Bearer '+t}:{};},aplicar:d=>PetHubTemaCliente.aplicarDocumento(d,document,mobile)});
  tema.cliente=cliente;
  const iniciar=()=>cliente.iniciar().catch(()=>{/* O editor apresenta a falha; demais telas continuam disponíveis. */});
  if(!mobile||token())await iniciar();
  window.addEventListener('pagehide',()=>cliente.parar());window.addEventListener('pageshow',e=>{if(e.persisted)void iniciar();});window.addEventListener('online',()=>void iniciar());
  if(mobile){let anterior=token();setInterval(()=>{const atual=token();if(atual!==anterior){anterior=atual;cliente.parar();cliente.limpar();if(atual)void iniciar();}},2000);}
  return cliente;
 })();tema.ready.catch(()=>{});
})();
