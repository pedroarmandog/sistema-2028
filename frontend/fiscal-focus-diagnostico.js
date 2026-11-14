(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else{root.FocusDiagnosticoUI=factory();root.FocusDiagnosticoUI.iniciar();}})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 function iniciar({window:w=globalThis.window,document:doc=globalThis.document,fetch:buscar=globalThis.fetch.bind(globalThis)}={}){
  const grupo=doc.getElementById('focusDiagnostico'),btn=doc.getElementById('btnTestarFocus'),painel=doc.getElementById('focusDiagnosticoResultado'),status=doc.getElementById('focusDiagnosticoStatus'),linhas=doc.getElementById('focusDiagnosticoLinhas'),identidade=doc.getElementById('focusDiagnosticoEmpresa');
  if(!grupo||!btn)return null;let empresa=null,permitido=false,executando=false,geracao=0;
  const API=w.API_BASE_URL||'';
  const token=()=>{try{const c=doc.cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('admin_token='));return c?decodeURIComponent(c.slice(12)):'';}catch{return '';}};
  function mostrar(){grupo.hidden=!permitido;btn.disabled=executando||!empresa;}
  const adicionar=(nome,valor)=>{const dt=doc.createElement('dt'),dd=doc.createElement('dd');dt.textContent=nome;dd.textContent=String(valor??'—');linhas.append(dt,dd);};
  async function verificar(id){
   const versao=++geracao;empresa=null;permitido=false;painel.hidden=true;mostrar();const jwt=token();if(!jwt||!Number.isSafeInteger(Number(id))||Number(id)<1)return;
   try{const r=await buscar(API+'/api/fiscal/diagnostico-focus/permissao?empresaId='+encodeURIComponent(id),{cache:'no-store',credentials:'include',headers:{Authorization:'Bearer '+jwt}});if(!r.ok)return;const d=await r.json();if(geracao!==versao||!d.permitido||Number(d.empresa?.id)!==Number(id))return;empresa=d.empresa;permitido=true;identidade.textContent='Empresa consultada: '+empresa.nome+' · CNPJ '+empresa.cnpj;mostrar();}catch{/* Sem sessão administrativa válida, o botão continua oculto. */}
  }
  async function executar(){
   if(executando||!permitido||!empresa)return;const jwt=token();if(!jwt){permitido=false;mostrar();return;}
   executando=true;const versao=geracao,alvo=empresa.id;mostrar();painel.hidden=false;linhas.replaceChildren();status.textContent='Verificando conexão com a Focus NFe...';painel.dataset.estado='carregando';painel.setAttribute('aria-busy','true');
   try{const r=await buscar(API+'/api/fiscal/testar-conexao-focus',{method:'POST',cache:'no-store',credentials:'include',headers:{'Content-Type':'application/json',Authorization:'Bearer '+jwt},body:JSON.stringify({empresaId:alvo})});const d=await r.json();if(versao!==geracao)return;
    painel.dataset.estado=d.sucesso?'sucesso':'erro';status.textContent=d.mensagem||d.erro||'Não foi possível concluir o diagnóstico.';
    if(d.verificacoes){adicionar('Status',d.sucesso?'Conectado':'Não confirmado');adicionar('Serviço',d.servico);adicionar('Operação',d.operacao);adicionar('Ambiente consultado',d.ambienteConsultado);adicionar('Data e horário',new Date(d.executadoEm).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})+' (Brasília)');adicionar('Tempo de resposta',d.tempoRespostaMs==null?'Não consultado':d.tempoRespostaMs+' ms');
     for(const [nome,k]of [['Autenticação','autenticacao'],['Comunicação com API','comunicacao'],['Consulta de CNPJ','consultaCnpj'],['Emissão de NF-e','emissaoNFe'],['Certificado A1','certificadoA1']])adicionar(nome,d.verificacoes[k]);
     adicionar('Observação',d.aviso);
    }
   }catch{if(versao===geracao){painel.dataset.estado='erro';status.textContent='Não foi possível estabelecer comunicação com a Focus NFe. Verifique a conectividade e tente novamente.';}}
   finally{executando=false;if(versao===geracao)painel.setAttribute('aria-busy','false');mostrar();}
  }
  btn.addEventListener('click',executar);w.addEventListener('pethub:fiscal:carregada',e=>verificar(e.detail?.empresaId));grupo.hidden=true;
  return {verificar,executar};
 }
 return {iniciar};
});
