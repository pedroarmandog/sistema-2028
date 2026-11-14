/* Endereço de clientes: CEP é uma ajuda opcional; todos os campos são editáveis. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ClienteEndereco=factory();})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const estados={AC:'Acre',AL:'Alagoas',AP:'Amapá',AM:'Amazonas',BA:'Bahia',CE:'Ceará',DF:'Distrito Federal',ES:'Espírito Santo',GO:'Goiás',MA:'Maranhão',MT:'Mato Grosso',MS:'Mato Grosso do Sul',MG:'Minas Gerais',PA:'Pará',PB:'Paraíba',PR:'Paraná',PE:'Pernambuco',PI:'Piauí',RJ:'Rio de Janeiro',RN:'Rio Grande do Norte',RS:'Rio Grande do Sul',RO:'Rondônia',RR:'Roraima',SC:'Santa Catarina',SP:'São Paulo',SE:'Sergipe',TO:'Tocantins'};
 const chave=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toUpperCase();
 function normalizarUF(v){const s=chave(v);return Object.keys(estados).find(u=>s===u||s===chave(estados[u])||s===chave(`${estados[u]} (${u})`))||'';}
 const instalados=new WeakMap();
 function instalar({document:doc=globalThis.document,fetch:buscar=globalThis.fetch.bind(globalThis),apiBase='',agendar=setTimeout,cancelar=clearTimeout,debounce=250,timeout=10000}={}){
  const cep=doc.getElementById('cep');if(!cep)return null;if(instalados.has(cep))return instalados.get(cep);
  const campos={endereco:'logradouro',bairro:'bairro',cidade:'localidade',estado:'uf',codigo_ibge_municipio:'ibge'},versoes={};
  const botao=doc.querySelector('.btn-search-cep'),status=doc.getElementById('cep-status');
  let sequencia=0,pendente=null,timer=null,atual=cep.value.replace(/\D/g,''),concluido=null;
  function informar(texto,carregando=false){if(status){status.textContent=texto;status.setAttribute('aria-busy',String(carregando));}cep.setAttribute('aria-busy',String(carregando));if(botao){botao.disabled=carregando;botao.innerHTML=carregando?'<i class="fas fa-spinner fa-spin" aria-hidden="true"></i>':'<i class="fas fa-search" aria-hidden="true"></i>';}}
  for(const id of Object.keys(campos)){const el=doc.getElementById(id);versoes[id]=0;for(const evento of ['input','change'])el?.addEventListener(evento,()=>{versoes[id]++;if(id==='estado')delete el.dataset.estadoLegado;});}
  function invalidar(){sequencia++;cancelar(timer);timer=null;pendente?.controller.abort();pendente=null;}
  function consultar(valor,forcar=false){
   const numeros=String(valor??cep.value).replace(/\D/g,'');cancelar(timer);timer=null;
   if(!/^\d{8}$/.test(numeros)){invalidar();informar('CEP inválido. Informe 8 números ou preencha o endereço manualmente.');return Promise.resolve(false);}
   if(numeros!==cep.value.replace(/\D/g,''))return Promise.resolve(false);
   if(pendente?.cep===numeros)return pendente.promise;
   if(!forcar&&concluido===numeros)return Promise.resolve(true);
   invalidar();const id=sequencia,controller=new AbortController(),snapshot={},revisoes={...versoes};
   for(const k of Object.keys(campos))snapshot[k]=doc.getElementById(k)?.value;
   informar('Consultando CEP…',true);let esgotou=false;
   const limite=agendar(()=>{esgotou=true;controller.abort();},timeout);
   const aindaAtual=()=>sequencia===id&&cep.value.replace(/\D/g,'')===numeros;
   const promise=(async()=>{await Promise.resolve();try{
    const r=await buscar(`${apiBase.replace(/\/$/,'')}/api/cep/${numeros}`,{credentials:'include',signal:controller.signal});
    const d=await r.json();if(!aindaAtual())return false;
    if(!d||typeof d!=='object'||Array.isArray(d))throw Error('Resposta inválida');
    if(!r.ok||d.erro===true||d.erro==='true')throw Object.assign(Error(d.mensagem||'CEP não encontrado ou serviço indisponível. Confira o CEP; seus dados foram mantidos.'),{cep:true});
    let preenchidos=0;for(const [k,origem]of Object.entries(campos)){
     const el=doc.getElementById(k);let valor=typeof d[origem]==='string'?d[origem].trim():'';
     if(k==='estado')valor=normalizarUF(valor);if(k==='codigo_ibge_municipio'&&!/^\d{7}$/.test(valor))valor='';
     if(!el||!valor||el.value!==snapshot[k]||versoes[k]!==revisoes[k])continue;
     el.value=valor;if(k==='estado')delete el.dataset.estadoLegado;preenchidos++;
     const EventType=doc.defaultView?.Event;if(EventType)el.dispatchEvent(new EventType('change',{bubbles:true}));
    }
    concluido=numeros;informar(preenchidos?'Endereço localizado. Confira os dados e informe número e complemento.':'Consulta concluída. Dados vazios ou campos editados manualmente foram mantidos.');return true;
   }catch(e){if(!aindaAtual())return false;informar(esgotou?'Consulta demorou demais. Seus dados foram mantidos; preencha manualmente ou tente novamente.':e.name==='AbortError'?'Consulta cancelada. Seus dados foram mantidos.':e.cep?e.message:'Não foi possível consultar o CEP. Seus dados foram mantidos; preencha manualmente ou tente novamente.');return false;}
   finally{cancelar(limite);if(aindaAtual()){pendente=null;if(botao){botao.disabled=false;botao.innerHTML='<i class="fas fa-search" aria-hidden="true"></i>';}cep.setAttribute('aria-busy','false');status?.setAttribute('aria-busy','false');}}})();
   pendente={cep:numeros,controller,promise};return promise;
  }
  cep.addEventListener('input',()=>{const n=cep.value.replace(/\D/g,'');cep.value=n.length<=8?n.replace(/^(\d{5})(\d)/,'$1-$2'):n;if(n===atual)return;atual=n;concluido=null;invalidar();
   if(n.length===8){informar('Aguardando consulta…');timer=agendar(()=>consultar(n),debounce);}else informar(n.length>8?'CEP inválido: informe 8 números.':'');
  });
  botao?.addEventListener('click',()=>consultar(cep.value,true));
  const api={consultar,cancelar:invalidar};instalados.set(cep,api);return api;
 }
 return {estados,normalizarUF,instalar};
});
