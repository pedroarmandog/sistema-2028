(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.PortalAlertasCore=factory();})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
 function criar({api,audio,onChange=()=>{}}){let itens=[],som=null,scope='',seq=0,epoca=0,erro='',autorizado=false;const busy=new Set();
  const estado=()=>({itens:itens.map(x=>({...x})),som,scope,erro,busy:[...busy],autorizado});
  function emit(){audio?.setPending(itens.some(x=>!x.silenciado),scope);onChange(estado());}
  function limpar(){seq++;epoca++;itens=[];som=null;scope='';autorizado=false;busy.clear();audio?.stop();emit();}
  async function sync(){const token=++seq;try{const r=await api('/alertas');if(token!==seq)return estado();const chave=r.empresaId+':'+r.usuarioId;if(scope&&scope!==chave){epoca++;itens=[];busy.clear();audio?.stop();}scope=chave;som=r.som;itens=r.itens;erro='';autorizado=true;audio?.configure(som,scope);emit();return estado();}catch(e){if(token!==seq)return estado();if([401,403].includes(e.status))limpar();else{erro='Não foi possível atualizar as solicitações. Tentaremos novamente.';emit();}throw e;}}
  async function agir(id,acao,b={}){if(busy.has(id))return;const p=itens.find(x=>x.id===id);if(!p)throw Error('A solicitação já foi atualizada.');const origem=epoca;busy.add(id);emit();try{const r=await api('/solicitacoes/'+encodeURIComponent(id)+'/acao',{method:'POST',body:{...b,acao,versao:p.versao}});if(origem!==epoca)return r;seq++;if(r.respostaGestorSalva!==true){await sync();throw Error('A decisão não foi confirmada. Confira a situação atual da solicitação.');}itens=itens.filter(x=>x.id!==id);erro='';emit();await sync().catch(()=>{});return r;}catch(e){if(origem===epoca){erro=e.message;emit();}throw e;}finally{if(origem===epoca){busy.delete(id);emit();}}}
  async function silenciar(id,valor){if(busy.has(id))return;const origem=epoca;busy.add(id);emit();try{const r=await api('/alertas/'+encodeURIComponent(id)+'/silencio',{method:'PUT',body:{silenciado:valor}});if(origem!==epoca)return r;seq++;itens=itens.map(p=>p.id===id?{...p,silenciado:r.silenciado}:p);emit();return r;}finally{if(origem===epoca){busy.delete(id);emit();}}}
  return {estado,sync,agir,silenciar,limpar};
 }
 return {criar};
});
