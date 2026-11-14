(() => {
  'use strict';
  const id=new URLSearchParams(location.search).get('id')||new URLSearchParams(location.search).get('edit');
  const novo=/novo-cliente\.html$/.test(location.pathname);
  const defs={
    codigo_legado:['Código do cliente no sistema anterior','text'],id_legado:['ID legado','text'],instagram:['Instagram','text'],
    cadastro_original:['Data original do cadastro','date'],cadastro_bloqueado:['Cadastro bloqueado (informativo)','checkbox'],
    bloquear_sms:['Bloquear envio de SMS','checkbox'],bloquear_whatsapp:['Bloquear envio de WhatsApp','checkbox'],
    vendas_desde_cadastro:['Total vendido histórico (R$)','text'],ticket_medio_desde_cadastro:['Ticket médio histórico (R$)','text'],
    quantidade_vendas_historicas:['Quantidade histórica de vendas, se conhecida','number'],
    vendas_ultimo_mes:['Vendas no mês da referência (R$)','text'],vendas_ultima_semana:['Vendas na semana da referência (R$)','text'],
    data_ultima_venda:['Última venda histórica','date'],data_referencia_historico:['Data de referência da planilha','date'],
    origem_historico:['Origem do histórico','text'],modo_conciliacao:['Conciliação do histórico','select'],
  };
  const campos=new Map();let pronto=false,form,status,analiseEmAndamento=false;
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
  async function api(path,options={}){
    const res=await fetch(`/api/clientes/${encodeURIComponent(id)}/${path}`,{credentials:'include',cache:'no-store',...options});
    const d=await res.json();if(!res.ok)throw new Error(d.erro||d.error||'Não foi possível carregar os dados do cliente.');return d;
  }
  function dadosForm(){
    if(!pronto)throw new Error('Aguarde carregar os dados complementares antes de salvar.');
    const out={};
    for(const[k,n]of campos){if(n.type==='checkbox')out[k]=n.checked;else if(n.value.trim())out[k]=n.value.trim();}
    return out;
  }
  window.PetHubClienteExtras={anexar(formData){for(const[k,v]of Object.entries(dadosForm()))formData.set(k,v);}};
  function preencher(data){
    const valores={...data.perfil,...(data.historicos?.[0]||{})};
    for(const[k,n]of campos){if(n.type==='checkbox')n.checked=!!valores[k];else n.value=valores[k]??(k==='modo_conciliacao'?'separado':'');}
  }
  function construirForm(container){
    form=el('section',null,'ci-panel ci-complementos');
    form.append(el('h2','Dados complementares e comunicação'));
    form.append(el('p','Os resumos importados são indicadores consolidados. Não geram vendas, saldo financeiro, pontos ou lançamentos de estoque.','ci-muted'));
    for(const [titulo,chaves]of [
      ['Dados da migração',['codigo_legado','id_legado','instagram','cadastro_original','cadastro_bloqueado']],
      ['Preferências de Comunicação',['bloquear_sms','bloquear_whatsapp']],
      ['Resumo histórico importado',['data_referencia_historico','origem_historico','vendas_desde_cadastro','ticket_medio_desde_cadastro','quantidade_vendas_historicas','vendas_ultimo_mes','vendas_ultima_semana','data_ultima_venda','modo_conciliacao']],
    ]){
      const group=el('details');group.open=titulo==='Preferências de Comunicação';group.append(el('summary',titulo));
      const grid=el('div',null,'ci-fields');
      for(const key of chaves){
        const[label,type]=defs[key],wrap=el('label',null,type==='checkbox'?'ci-check':'');
        const input=el(type==='select'?'select':'input');input.id='ci-'+key;input.dataset.ciCampo=key;
        if(type==='select'){
          for(const[value,text]of [['separado','Manter separado até conferir a conciliação'],['somar_posteriores','Somar somente vendas após o corte histórico']]){const o=el('option',text);o.value=value;input.append(o);}
        }else{input.type=type;if(type==='number'){input.min='0';input.step='1';}}
        if(type==='text'&&key.includes('vendas')||key.includes('ticket'))input.inputMode='decimal';
        if(type==='checkbox')wrap.append(input,el('span',label));else wrap.append(el('span',label),input);
        grid.append(wrap);campos.set(key,input);
      }
      group.append(grid);
      if(titulo==='Preferências de Comunicação')group.append(el('p','WhatsApp bloqueado: lembretes e campanhas serão ignorados, inclusive os já agendados. SMS é uma preferência independente.','ci-muted'));
      if(titulo==='Resumo histórico importado')group.append(el('p','Não preencha quantidades por estimativa. O ticket histórico sem quantidade fica separado. Os valores da semana e do mês valem apenas na referência informada. Nova referência preserva os resumos anteriores. Campos vazios mantêm os dados já salvos.','ci-muted'));
      form.append(group);
    }
    status=el('p','Carregando dados…','ci-message');status.setAttribute('role','status');form.append(status);
    if(!novo){
      const salvar=el('button','Salvar dados e preferências','ci-button');salvar.type='button';
      salvar.onclick=async()=>{
        salvar.disabled=true;
        try{const data=await api('inteligencia',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(dadosForm())});preencher(data);status.textContent='Dados salvos. Preferências aplicadas aos próximos envios.';carregarAnalise();}
        catch(e){status.textContent=e.message;}finally{salvar.disabled=false;}
      };form.append(salvar);
    }
    container.append(form);
  }
  const reais=c=>c==null?'Não disponível':(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const data=d=>d?(/^\d{4}-\d{2}-\d{2}$/.test(d)?d.split('-').reverse().join('/'):new Date(d).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})):'Sem venda registrada';
  function card(titulo,valor,sub){const n=el('article',null,'ci-card');n.append(el('span',titulo,'ci-muted'),el('strong',valor),el('small',sub||'','ci-muted'));return n;}
  function grafico(titulo,series){
    const panel=el('section',null,'ci-panel');panel.append(el('h3',titulo),el('p','Somente transações individuais do PetHub.','ci-muted'));
    const max=Math.max(0,...series.map(x=>x.centavos));
    if(!max){panel.append(el('p','Nenhuma venda elegível neste período.','ci-empty'));return panel;}
    const chart=el('div',null,'ci-chart');chart.setAttribute('role','img');chart.setAttribute('aria-label',series.map(s=>`${s.periodo}: ${reais(s.centavos)}`).join('; '));
    for(const s of series){const col=el('div',null,'ci-column'),bar=el('div',null,'ci-bar');bar.style.height=`${s.centavos/max*140}px`;bar.title=`${s.periodo}: ${reais(s.centavos)}`;col.append(el('span',reais(s.centavos),'ci-chart-value'),bar,el('small',s.periodo.length===7?s.periodo.slice(5)+'/'+s.periodo.slice(2,4):s.periodo.slice(8)+'/'+s.periodo.slice(5,7)));chart.append(col);}
    panel.append(chart);return panel;
  }
  async function carregarAnalise(){
    const target=document.getElementById('analise-vendas-tab');if(!target||analiseEmAndamento)return;
    analiseEmAndamento=true;target.replaceChildren(el('p','Carregando indicadores…','ci-empty'));
    try{
      const d=await api('analise-vendas'),p=d.pethub,c=d.combinado;
      const header=el('div',null,'ci-heading'),refresh=el('button','Atualizar','ci-button ci-secondary');refresh.type='button';refresh.onclick=carregarAnalise;
      header.append(el('div','Análise de Vendas','ci-title'),refresh);target.replaceChildren(header);
      target.append(el('p','Indicadores calculados a partir das vendas vinculadas a este cliente. Pagamento e faturamento são informações distintas.','ci-muted'));
      const cards=el('div',null,'ci-cards');
      cards.append(card(c.total!=null?'Total desde o cadastro':'Total vendido no PetHub',reais(c.total??p.total),!d.historico?'Vendas elegíveis registradas no PetHub':c.total!=null?'Histórico conciliado + vendas posteriores ao corte':'Vendas elegíveis; canceladas não entram'),
        card('Ticket médio desde o cadastro',reais(c.ticket),c.ticket==null?(!d.historico?'Sem vendas elegíveis':`Ticket PetHub: ${reais(p.ticket)} · histórico sem combinação disponível`):'Total ÷ quantidade conhecida'),
        card('Vendas nos últimos 30 dias',reais(p.ultimos30),'Período móvel · transações PetHub'),
        card('Vendas nos últimos 7 dias',reais(p.ultimos7),'Período móvel · transações PetHub'),
        card('Última venda',data(c.ultimaVenda),'Maior data entre transações e resumo histórico'),
        card('Quantidade de vendas',c.quantidade!=null?String(c.quantidade):`${p.quantidade} no PetHub`,c.quantidade==null?'Quantidade histórica desconhecida ou não conciliada':d.historico?'Histórico conhecido + vendas posteriores':'Transações elegíveis do PetHub'));
      target.append(cards);
      if(d.avisos.length){const avisos=el('div',null,'ci-notice');for(const a of d.avisos)avisos.append(el('p',a));target.append(avisos);}
      const charts=el('div',null,'ci-charts');charts.append(grafico('Evolução mensal',d.meses),grafico('Vendas por semana',d.semanas));target.append(charts);
      const comparacao=el('section',null,'ci-panel');comparacao.append(el('h3','Comparação de períodos'),el('p',`Últimos 30 dias: ${reais(p.ultimos30)} · 30 dias anteriores: ${reais(p.anteriores30)}`));
      const tipos=el('div',null,'ci-types');for(const[key,label]of [['produto','Produtos'],['servico','Serviços'],['nao_classificado','Sem classificação']])tipos.append(card(label,reais(p.tipos[key])));comparacao.append(tipos,el('small','Descontos/acréscimos são distribuídos proporcionalmente aos valores dos itens quando estes estão disponíveis.','ci-muted'));target.append(comparacao);
      const legado=el('section',null,'ci-panel');legado.append(el('h3','Resumos históricos preservados'));
      if(!d.historicos.length)legado.append(el('p','Nenhum resumo importado. As próximas vendas já atualizam os indicadores automaticamente.','ci-muted'));
      for(const h of d.historicos){
        const row=el('div',null,'ci-legacy');row.append(el('strong',`Referência ${data(h.data_referencia_historico)} · ${h.origem_historico||'Importado'}`));
        const valores=el('dl');for(const[key,label]of [['vendas_desde_cadastro','Total histórico'],['ticket_medio_desde_cadastro','Ticket histórico'],['vendas_ultimo_mes','Último mês na referência'],['vendas_ultima_semana','Última semana na referência']]){valores.append(el('dt',label),el('dd',h[key]==null?'Não informado':Number(h[key]).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})));}
        row.append(valores,el('p',`Corte da conciliação: ${new Date(h.corte_em).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}. ${h.modo_conciliacao==='somar_posteriores'?'Soma somente transações posteriores ao corte.':'Separado dos totais PetHub.'}`,'ci-muted'));legado.append(row);
      }
      target.append(legado);
    }catch(e){const retry=el('button','Tentar novamente','ci-button');retry.type='button';retry.onclick=carregarAnalise;target.replaceChildren(el('p',e.message,'ci-message'),retry);}
    finally{analiseEmAndamento=false;}
  }
  async function iniciar(){
    const container=novo?document.querySelector('form'):document.getElementById('detalhes-tab');if(!container)return;
    construirForm(container);
    if(novo){const actions=container.querySelector('.form-actions');if(actions)container.insertBefore(form,actions);}
    form.querySelectorAll('input,select,button').forEach(n=>n.disabled=true);
    try{if(id)preencher(await api('inteligencia'));pronto=true;status.textContent='Dados complementares disponíveis. Campos vazios preservam valores existentes.';}
    catch(e){status.textContent=e.message;}
    if(pronto)form.querySelectorAll('input,select,button').forEach(n=>n.disabled=false);
    document.querySelector('[data-tab="analise-vendas"]')?.addEventListener('click',carregarAnalise);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);else iniciar();
})();
