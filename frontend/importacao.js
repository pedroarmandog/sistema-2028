(() => {
  "use strict";
  const config = document.currentScript.dataset;
  const tipo = config.tipo;
  const root =
    tipo === "pets" ? "/api/pets/importacao" : tipo === "clientes" ? "/api/clientes/importacao" : "/api/itens/importacao";
  const titulo =
    tipo === "pets" ? "Importar Pets" : tipo === "clientes" ? "Importar Clientes" : "Importar Produtos";
  let modal,
    anterior,
    arquivo,
    meta,
    previa,
    escolhas = {},
    pagina = 0,
    ocupado = false,
    relatorio = [];
  const emLotes=["clientes","pets"].includes(tipo);
  let operacao=null,timerOperacao=null,conclusaoEmitida=null;
  const el = (tag, texto) => {
    const n = document.createElement(tag);
    if (texto != null) n.textContent = texto;
    return n;
  };
  function botao(texto, fn, classe = "") {
    const b = el("button", texto);
    b.type = "button";
    b.className = classe;
    b.onclick = fn;
    return b;
  }
  async function request(url, options = {}) {
    const r = await fetch(url, {
      credentials: "include",
      cache: "no-store",
      ...options,
    });
    const d = await r.json();
    if (!r.ok)
      throw Object.assign(new Error(d.erro || d.error || "Falha ao acessar a importação."),{status:r.status,operacaoId:d.operacaoId});
    return d;
  }
  function aviso(texto, erro = false) {
    const n = modal.querySelector(".notice");
    n.textContent = texto;
    n.classList.toggle("error", erro);
  }
  function busy(v) {
    ocupado = v;
    modal.querySelector("progress").hidden = !v;
    modal.querySelectorAll("button,select,input").forEach((n) => {
      if (v) {
        n.dataset.phDisabled = String(n.disabled);
        n.disabled = true;
      } else if (n.dataset.phDisabled != null) {
        n.disabled = n.dataset.phDisabled === "true";
        delete n.dataset.phDisabled;
      }
    });
    modal.querySelector("[data-confirmar]").disabled = v || !previa?.token || !previa?.linhas?.some(r=>!r.erro&&!r.repetida);
  }
  function invalidar() {
    previa = null;
    modal.querySelector("[data-confirmar]").disabled = true;
    modal.querySelector(".table-wrap").replaceChildren();
    relatorio = [];
  }
  function fechar() {
    if (ocupado && !operacao) return;
    clearTimeout(timerOperacao);timerOperacao=null;operacao=null;
    modal.remove();
    modal = null;
    anterior?.focus();
    document.removeEventListener("keydown", tecla);
  }
  function tecla(e) {
    if (e.key === "Escape") fechar();
    if (e.key === "Tab" && modal) {
      const ns = [...modal.querySelectorAll("button,select,input,a")].filter(
        (n) => !n.disabled && n.offsetParent !== null,
      );
      if (e.shiftKey && document.activeElement === ns[0]) {
        e.preventDefault();
        ns.at(-1)?.focus();
      } else if (!e.shiftKey && document.activeElement === ns.at(-1)) {
        e.preventDefault();
        ns[0]?.focus();
      }
    }
  }
  function csv(linhas, nome) {
    const texto =
      "\ufeff" +
      linhas
        .map((row) =>
          row
            .map((v) => {
              let s = String(v ?? "");
              if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
              return '"' + s.replace(/"/g, '""') + '"';
            })
            .join(";"),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
        new Blob([texto], { type: "text/csv;charset=utf-8" }),
      ),
      a = el("a");
    a.href = url;
    a.download = nome;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function renderizarMapa(d) {
    const box = modal.querySelector(".mapping");
    box.replaceChildren();
    if (d.abas?.length > 1) {
      const label = el("label", "Aba da planilha"),
        select = el("select");
      select.id = "ph-aba";
      d.abas.forEach((nome) => {
        const o = el("option", nome);
        o.value = nome;
        select.append(o);
      });
      select.value = d.aba;
      select.onchange = () => {
        modal
          .querySelectorAll("[data-coluna]")
          .forEach((n) => n.parentElement.remove());
        invalidar();
      };
      label.append(select);
      box.append(label);
    }
    d.cabecalho.forEach((nome, i) => {
      const label = el("label", nome || "Coluna " + (i + 1)),
        select = el("select");
      select.dataset.coluna = i;
      const vazio = el("option", "Selecione um campo");
      vazio.value = "";
      select.append(vazio);
      const ignorar = el("option", "Ignorar esta coluna");
      ignorar.value = "ignorar";
      select.append(ignorar);
      Object.entries(meta.campos).forEach(([k, nomes]) => {
        const o = el("option", nomes[0]);
        o.value = k;
        select.append(o);
      });
      select.value = d.mapeamento[i] || "";
      select.onchange = () => {
        invalidar();
        aviso("Clique em Analisar planilha para conferir o novo mapeamento.");
      };
      label.append(select);
      box.append(label);
    });
  }
  function tabela() {
    const box = modal.querySelector(".table-wrap");
    box.replaceChildren();
    if(tipo==='pets')return tabelaPets(box);
    const t = el("table"),
      head = el("tr");
    ["Linha", "Registro", "Validação / classificação", "Ação"].forEach((s) =>
      head.append(el("th", s)),
    );
    t.append(head);
    const rows = previa.linhas;
    rows.slice(pagina * 50, pagina * 50 + 50).forEach((row) => {
      const tr = el("tr");
      tr.append(el("td", row.linha));
      const detalhes = Object.entries(row.dados || {})
        .map(([k, v]) => (meta.campos[k]?.[0] || k) + " = " + v)
        .join("\n");
      const td = el(
        "td",
        detalhes || "Confira os campos obrigatórios da linha",
      );
      td.style.whiteSpace = "pre-wrap";
      tr.append(td);
      tr.append(
        el(
          "td",
          row.erro ||
            [row.aviso, ...(row.avisos||[]), row.classificacao].filter(Boolean).join(" · ") ||
            "Válido",
        ),
      );
      const acao = el("td");
      if (row.erro || row.repetida) acao.textContent = "Ignorar";
      else {
        const select = el("select");
        const opcoes = row.existente
          ? [
              ["ignorar", "Ignorar duplicado"],
              ["atualizar", "Atualizar campos preenchidos"],
            ]
          : [
              ["criar", "Importar"],
              ["ignorar", "Ignorar"],
            ];
        opcoes.forEach(([valor, nome]) => {
          const o = el("option", nome);
          o.value = valor;
          select.append(o);
        });
        select.value = escolhas[row.linha] || row.acao;
        select.onchange = () => {
          escolhas[row.linha] = select.value;
        };
        select.setAttribute("aria-label", "Ação da linha " + row.linha);
        acao.append(select);
      }
      tr.append(acao);
      t.append(tr);
    });
    box.append(t);
    if(tipo==='clientes'){
      const existentes=rows.filter(r=>r.existente&&!r.erro&&!r.repetida);
      if(existentes.length)box.append(botao(`Atualizar os ${existentes.length} clientes identificados`,()=>{
        existentes.forEach(r=>escolhas[r.linha]='atualizar');tabela();
        aviso('Atualização selecionada para os cadastros identificados. Confira a prévia e confirme; opcionais vazios não apagam dados existentes.');
      }));
    }
    const pager = el("div");
    pager.className = "pager";
    const ant = botao("Anterior", () => {
        pagina--;
        tabela();
      }),
      prox = botao("Próxima", () => {
        pagina++;
        tabela();
      });
    ant.disabled = pagina === 0;
    prox.disabled = (pagina + 1) * 50 >= rows.length;
    pager.append(
      ant,
      el(
        "span",
        "Página " +
          (pagina + 1) +
          " de " +
          Math.max(1, Math.ceil(rows.length / 50)),
      ),
      prox,
    );
    box.append(pager);
  }
  async function analisar() {
    if (!arquivo) {
      aviso("Selecione um arquivo CSV, XLS ou XLSX.", true);
      return;
    }
    const mapa = [...modal.querySelectorAll("[data-coluna]")].map(
      (n) => n.value,
    );
    if (mapa.length && mapa.some((v) => !v)) {
      aviso(
        "Associe cada coluna a um campo ou escolha Ignorar esta coluna.",
        true,
      );
      return;
    }
    const form = new FormData();
    form.append("arquivo", arquivo);
    if (mapa.length) form.append("mapeamento", JSON.stringify(mapa));
    const aba = modal.querySelector("#ph-aba")?.value;
    if (aba) form.append("aba", aba);
    if(tipo==='clientes'){
      form.append('referenciaHistorico',modal.querySelector('#ph-referencia-historico')?.value||'');
      form.append('conciliacaoHistorico',modal.querySelector('#ph-conciliacao-historico')?.value||'separado');
    }
    if(tipo==='pets')form.append('origemImportacao',modal.querySelector('#ph-origem-pets')?.value||'legado');
    form.append("centroPadrao", modal.querySelector("#ph-centro")?.value || "");
    busy(true);
    aviso("Lendo arquivo, validando registros e verificando duplicidades…");
    try {
      const d = await request(root + "/analisar", {
        method: "POST",
        body: form,
      });
      renderizarMapa(d);
      if (d.precisaMapear) {
        invalidar();
        aviso(
          "Confirme o destino das colunas não reconhecidas e clique em Analisar planilha.",
        );
        return;
      }
      if(tipo==='clientes'){
        const historicos=['vendas_desde_cadastro','ticket_medio_desde_cadastro','vendas_ultimo_mes','vendas_ultima_semana','data_ultima_venda','quantidade_vendas_historicas'];
        const precisaReferencia=d.mapeamento.some(k=>historicos.includes(k))&&!d.mapeamento.includes('data_referencia_historico');
        const ref=modal.querySelector('#ph-referencia-historico');
        if(precisaReferencia&&!ref.value){
          if(d.referenciaSugerida)ref.value=d.referenciaSugerida;
          invalidar();
          aviso(d.referenciaSugerida
            ? 'Referência sugerida a partir das propriedades do arquivo: '+d.referenciaSugerida.split('-').reverse().join('/')+'. Confira se corresponde à exportação e clique novamente em Analisar planilha.'
            : 'Preencha a Data de referência dos indicadores, acima do mapeamento, e clique novamente em Analisar planilha.',true);
          queueMicrotask(()=>ref.focus());return;
        }
      }
      previa = d;
      escolhas = {};
      pagina = 0;
      tabela();
      relatorio = d.linhas
        .filter((r) => r.erro || r.repetida || r.avisos?.length)
        .map((r) => ({
          linha: r.linha,
          motivo: r.erro || [r.aviso,...(r.avisos||[])].filter(Boolean).join(" · "),
          registro: JSON.stringify(r.dados || r.originais),
        }));
      const r = d.resumo;
      if(tipo==='pets'){
        atualizarResumoPets();return;
      }
      aviso(
        r.total +
          " registros · " +
          r.validos +
          " válidos · " +
          r.erros +
          " com erro · " +
          r.duplicados +
          " avisos de duplicidade · "+(r.avisos||0)+" com avisos de campos opcionais. "+
          (!d.linhas.some(l=>!l.erro&&!l.repetida)?'Nenhuma linha pendente válida para confirmar. Revise os erros ou verifique se a planilha já foi importada.':'Confira as ações antes de confirmar.'),
      );
    } catch (e) {
      invalidar();
      aviso(e.message, true);
    } finally {
      busy(false);
    }
  }
  function atualizarResumoPets(){
    if(!previa)return;const selecionados=previa.linhas.filter(r=>!r.erro&&!r.repetida&&(escolhas[r.linha]?.acao||r.acao)!=='ignorar');
    const confirmados=selecionados.filter(r=>escolhas[r.linha]?.cliente_id||r.vinculo?.situacao==='automatico').length;
    aviso(`Conferir vínculo dos pets: ${previa.resumo.total} linhas · ${selecionados.length} selecionados · ${confirmados} tutores confirmados · ${selecionados.length-confirmados} vínculos para revisar · ${previa.resumo.erros} com erro. Confira as ações antes de confirmar.`);
  }
  function tabelaPets(box){
    box.append(el('h3','Conferir vínculo dos pets'));
    const t=el('table'),head=el('tr');for(const label of ['Linha / Pet','Tutor na planilha','Cliente encontrado / situação','Ação'])head.append(el('th',label));t.append(head);
    for(const row of previa.linhas.slice(pagina*25,pagina*25+25)){
      const tr=el('tr'),v=row.vinculo||{},d=row.dados||{};
      tr.append(el('td',`${row.linha} · ${d.nome||'Sem nome'}`),el('td',[d.tutor_nome,d.tutor_codigo&&'Código: '+d.tutor_codigo,d.tutor_telefone].filter(Boolean).join(' · ')));
      const vinculo=el('td'),acao=el('td');tr.append(vinculo,acao);t.append(tr);
      if(row.erro||row.repetida){vinculo.textContent=row.erro||row.aviso;acao.textContent='Ignorar';continue;}
      const choice=escolhas[row.linha]??={acao:row.acao};
      const status=el('p',choice.cliente_nome||v.cliente?.nome||v.motivo||'Tutor pendente');vinculo.append(status);
      const busca=el('input');busca.type='search';busca.placeholder='Pesquisar tutor por nome, telefone ou CPF';busca.setAttribute('aria-label','Pesquisar tutor da linha '+row.linha);
      const resultados=el('select');resultados.setAttribute('aria-label','Escolher tutor da linha '+row.linha);
      const escolher=(clientes)=>{resultados.replaceChildren();const vazio=el('option','Selecione o tutor');vazio.value='';resultados.append(vazio);for(const c of clientes){const o=el('option',`${c.nome} · ${c.telefone||'sem telefone'} · #${c.id}`);o.value=c.id;resultados.append(o);}resultados.onchange=()=>{const c=clientes.find(c=>String(c.id)===resultados.value);if(c){choice.cliente_id=c.id;choice.cliente_nome=c.nome;atualizarResumoPets();status.textContent=c.nome+' · vínculo selecionado manualmente';}else{delete choice.cliente_id;delete choice.cliente_nome;status.textContent=v.motivo||'Tutor pendente';atualizarResumoPets();}};};
      escolher(v.candidatos||[]);let tempo,numero=0;busca.oninput=()=>{clearTimeout(tempo);const n=++numero;tempo=setTimeout(async()=>{try{const r=await request(root+'/tutores?search='+encodeURIComponent(busca.value));if(n===numero)escolher(r.clientes);}catch(e){status.textContent=e.message;}},300);};
      vinculo.append(busca,resultados);
      if(v.situacao!=='automatico'&&d.tutor_nome&&d.tutor_telefone)vinculo.append(botao('Cadastrar tutor da planilha',async()=>{
        if(!confirm(`Cadastrar o tutor ${d.tutor_nome} com o telefone ${d.tutor_telefone}? O backend verificará duplicidades.`))return;
        try{const r=await request(root+'/tutores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:previa.token,linha:row.linha})});choice.cliente_id=r.cliente.id;choice.cliente_nome=r.cliente.nome;tabela();}catch(e){status.textContent=e.message;}
      }));
      const select=el('select');select.setAttribute('aria-label','Ação da linha '+row.linha);
      for(const[value,label]of row.existente?[['ignorar','Ignorar existente'],['atualizar','Atualizar pet identificado']]:[['criar','Importar pet'],['ignorar','Ignorar']]){const o=el('option',label);o.value=value;select.append(o);}select.value=choice.acao;select.onchange=()=>{choice.acao=select.value;atualizarResumoPets();};acao.append(select);
      if(row.aviso)acao.append(el('p',row.aviso));
      if(row.possivel_duplicado){const label=el('label','Confirmo que é outro animal'),ck=el('input');ck.type='checkbox';ck.checked=!!choice.distinto;ck.onchange=()=>{choice.distinto=ck.checked;atualizarResumoPets();};label.prepend(ck);acao.append(label);}
    }
    box.append(t);const pager=el('div');pager.className='pager';const a=botao('Anterior',()=>{pagina--;tabela();}),p=botao('Próxima',()=>{pagina++;tabela();});a.disabled=pagina===0;p.disabled=(pagina+1)*25>=previa.linhas.length;pager.append(a,el('span',`Página ${pagina+1} de ${Math.ceil(previa.linhas.length/25)}`),p);box.append(pager);
  }
  const duracao = n => {
    if(n==null)return 'Calculando…';
    if(n<60)return `${Math.max(0,Math.round(n))} s`;
    return `${Math.floor(n/60)} min ${Math.round(n%60)} s`;
  };
  function painelOperacao(){
    let box=modal.querySelector('.ph-job');if(box)return box;
    box=el('section');box.className='ph-job';box.setAttribute('aria-label','Andamento da importação');
    const titulo=el('h3',tipo==='pets'?'Importando seus pets':'Importando seus clientes'),fase=el('p');fase.dataset.jobFase='';fase.setAttribute('role','status');
    const trilha=el('div');trilha.className='ph-job-track';
    const barra=el('div');barra.className='ph-job-bar';barra.setAttribute('role','progressbar');barra.setAttribute('aria-valuemin','0');barra.setAttribute('aria-valuemax','100');barra.setAttribute('aria-label','Registros confirmados');
    const fill=el('div');fill.className='ph-job-fill';barra.append(fill);
    const pet=el('div');pet.className='ph-job-pet';pet.setAttribute('aria-hidden','true');
    // SVG local e estático; nunca inclui conteúdo da planilha.
    pet.innerHTML='<svg viewBox="0 0 100 65" width="76" height="50" xmlns="http://www.w3.org/2000/svg"><g fill="#ffaa33" stroke="#293f50" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path class="ph-job-tail" d="M21 35Q5 37 10 22" fill="none"/><path class="ph-job-leg leg-back" d="M31 43v14h10" fill="none"/><path class="ph-job-leg" d="M57 43v14h10" fill="none"/><rect x="20" y="25" width="49" height="24" rx="12"/><path d="M62 24q4-18 20-13l6 17 7 5q1 10-13 10H66z"/><path d="M68 15l-5 18q10 4 13-17" fill="#c4752f"/><circle cx="82" cy="24" r="1.7" fill="#293f50"/><path d="M91 31h4l-1 4z" fill="#293f50"/><path d="M65 31l4 13" stroke="#1c9554" stroke-width="5"/></g></svg>';
    trilha.append(barra,pet);
    const percentual=el('strong','0%');percentual.className='ph-job-percent';percentual.dataset.jobPercent='';
    const quantidade=el('p','0 registros confirmados');quantidade.dataset.jobQuantidade='';
    const tempos=el('div');tempos.className='ph-job-times';for(const[k,label]of [['decorrido','Tempo decorrido'],['restante','Tempo restante estimado']]){const n=el('span');n.dataset.jobTempo=k;n.append(el('small',label),el('strong','Calculando…'));tempos.append(n);}
    const contadores=el('div');contadores.className='ph-job-counts';for(const[k,label]of [['criados','Criados'],['atualizados','Atualizados'],['ignorados','Ignorados'],['rejeitados','Com erro']]){const n=el('div');n.append(el('strong','0'),el('span',label));n.dataset.jobContador=k;contadores.append(n);}
    const msg=el('p');msg.dataset.jobMensagem='';msg.className='ph-job-message';msg.setAttribute('aria-live','polite');
    const retomar=botao('Retomar com segurança',async()=>{
      retomar.disabled=true;
      try{const d=await request(root+'/operacoes/'+operacao.id+'/retomar',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});operacao=d.operacao;renderOperacao();consultarOperacao();}
      catch(e){msg.textContent=e.message;}finally{retomar.disabled=false;}
    },'primary');retomar.dataset.jobRetomar='';retomar.hidden=true;
    const nova=botao('Importar outra planilha',()=>{
      clearTimeout(timerOperacao);operacao=null;previa=null;relatorio=[];
      modal.querySelectorAll('main > *').forEach(n=>{if(n!==box)n.style.display=n.dataset.jobDisplay||'';});
      box.remove();modal.querySelector('[data-confirmar]').hidden=false;
      modal.querySelector('[data-fechar-importacao]').textContent='Cancelar';busy(false);aviso('Selecione o arquivo e analise novamente.');
    });nova.dataset.jobNova='';nova.hidden=true;
    box.append(titulo,fase,trilha,percentual,quantidade,tempos,contadores,msg,retomar,nova);
    modal.querySelectorAll('main > *').forEach(n=>{n.dataset.jobDisplay=n.style.display;n.style.display='none';});
    modal.querySelector('main').append(box);return box;
  }
  function renderOperacao(){
    if(!modal||!operacao)return;
    const box=painelOperacao(),o=operacao;
    box.classList.toggle('executando',o.estado==='processando');box.classList.toggle('concluido',o.estado==='concluido');
    box.querySelector('h3').textContent=o.estado==='concluido'?'Importação concluída ✓':o.estado==='interrompido'?'Importação interrompida':tipo==='pets'?'Importando seus pets':'Importando seus clientes';
    box.querySelector('[data-job-fase]').textContent=o.fase;
    const pct=Math.max(0,Math.min(100,o.percentual||0));box.style.setProperty('--job-progresso',pct+'%');
    box.querySelector('[role="progressbar"]').setAttribute('aria-valuenow',String(pct));
    box.querySelector('[data-job-percent]').textContent=pct+'%';
    box.querySelector('[data-job-quantidade]').textContent=`${o.processados} de ${o.total} registros confirmados`;
    for(const k of ['criados','atualizados','ignorados','rejeitados'])box.querySelector(`[data-job-contador="${k}"] strong`).textContent=o[k]||0;
    box.querySelector('[data-job-tempo="decorrido"] strong').textContent=duracao(o.decorridoSegundos);
    box.querySelector('[data-job-tempo="restante"] strong').textContent=o.estado==='concluido'?'Concluído':o.lento?'Aguardando confirmação do lote…':duracao(o.restanteSegundos);
    box.querySelector('[data-job-mensagem]').textContent=o.erro||(o.lento?'Sem um novo checkpoint recente. Os números exibidos são os já confirmados no banco.':o.estado==='concluido'?'Os resultados foram confirmados. Você pode baixar o relatório.':'Você pode fechar esta janela. A importação continua no servidor.');
    box.querySelector('[data-job-retomar]').hidden=!o.retomavel;box.querySelector('[data-job-nova]').hidden=o.estado!=='concluido';
    if(tipo==='pets')box.querySelector('[data-job-quantidade]').textContent+=` · ${o.vinculados||0} pets vinculados · ${o.vinculosPendentes||0} vínculos pendentes de revisão`;
    if(o.estado==='concluido'&&conclusaoEmitida!==o.id){conclusaoEmitida=o.id;document.dispatchEvent(new CustomEvent('pethub:importacao-concluida',{detail:{id:o.id,tipo}}));}
    modal.querySelector('[data-confirmar]').hidden=true;
    modal.querySelector('[data-fechar-importacao]').textContent='Fechar acompanhamento';
    modal.querySelector('[data-relatorio-importacao]').disabled=o.estado!=='concluido';
  }
  async function consultarOperacao(){
    clearTimeout(timerOperacao);if(!modal||!operacao)return;
    const id=operacao.id;let atraso=1500;
    try{
      const d=await request(root+'/operacoes/'+id);if(!modal||operacao?.id!==id)return;
      operacao=d.operacao;renderOperacao();
      if(['concluido','interrompido'].includes(operacao.estado))return;
    }catch(e){
      if(!modal||operacao?.id!==id)return;
      const msg=painelOperacao().querySelector('[data-job-mensagem]');msg.textContent='Não foi possível atualizar o andamento. A operação não foi cancelada. '+e.message;
      atraso=5000;if([401,403,404].includes(e.status))return;
    }
    timerOperacao=setTimeout(consultarOperacao,atraso);
  }
  function acompanhar(o){
    operacao=o;previa=null;busy(false);renderOperacao();consultarOperacao();
  }
  async function baixarRelatorio(){
    try{
      if(operacao){const d=await request(root+'/operacoes/'+operacao.id+'/relatorio');relatorio=d.relatorio||[];}
      csv([['Linha','Ação','Motivo','Registro'],...relatorio.map(r=>[r.linha,r.acao||'',r.motivo,r.registro||''])],tipo+'-relatorio.csv');
    }catch(e){if(operacao)painelOperacao().querySelector('[data-job-mensagem]').textContent=e.message;else aviso(e.message,true);}
  }
  async function confirmar() {
    if (ocupado || !previa?.token) return;
    const selecionados=previa.linhas.filter(r=>!r.erro&&!r.repetida&&(tipo==='pets'?(escolhas[String(r.linha)]?.acao||r.acao):(escolhas[String(r.linha)]||r.acao))!=='ignorar');
    if(tipo==='pets'){
      if(selecionados.some(r=>!escolhas[r.linha]?.cliente_id&&(r.vinculo?.situacao!=='automatico'||!r.cliente_id))){aviso('Existem pets selecionados sem tutor confirmado. Pesquise e escolha o tutor ou marque Ignorar.',true);return;}
      if(selecionados.some(r=>r.possivel_duplicado&&!escolhas[r.linha]?.distinto)){aviso('Confira os pets de mesmo nome: confirme se são animais distintos ou marque Ignorar.',true);return;}
    }
    if(!selecionados.length){
      aviso('Nenhum registro selecionado para criar ou atualizar. Se os clientes já existem, use Atualizar os clientes identificados; confira os erros e as ações da prévia.',true);
      return;
    }
    busy(true);
    aviso("Salvando registros. Aguarde…");
    try {
      const d = await request(root + (emLotes?'/operacoes':'/confirmar'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: previa.token, escolhas }),
      });
      if(emLotes){acompanhar(d.operacao);return;}
      relatorio = d.relatorio;
      previa = null;
      aviso(
        d.criados +
          " criados · " +
          d.atualizados +
          " atualizados · " +
          d.ignorados +
          " ignorados"+(d.rejeitados?" ("+d.rejeitados+" com erro)":"")+" · "+(d.comAvisos||0)+" importados/atualizados com aviso. Baixe o relatório para conferir.",
      );
      modal.querySelector(".table-wrap").replaceChildren();
      modal
        .querySelector("footer")
        .append(botao("Atualizar lista", () => location.reload(), "primary"));
    } catch (e) {
      if(emLotes&&e.operacaoId){
        try{const d=await request(root+'/operacoes/'+e.operacaoId);acompanhar(d.operacao);return;}catch{}
      }
      aviso(e.message, true);
    } finally {
      busy(false);
      if(operacao)renderOperacao();
    }
  }
  async function abrir() {
    if (modal) return;
    anterior = document.activeElement;
    arquivo = null;
    previa = null;
    escolhas = {};
    relatorio = [];
    modal = el("div");
    modal.className = "ph-import-backdrop";
    const dialog = el("section");
    dialog.className = "ph-import";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", titulo);
    const header = el("header");
    header.append(el("h2", titulo), botao("Fechar", fechar));
    const main = el("main");
    main.append(
      el(
        "p",
        tipo !== "produtos"
          ? "Importe sua planilha com as colunas em qualquer ordem. Nome é obrigatório."
          : "Nome, custo e venda são obrigatórios. Confira a classificação dos centros antes de salvar.",
      ),
    );
    const download = el("a", "Baixar Modelo CSV");
    download.href = root + "/modelo";
    download.download = "";
    main.append(download);
    const drop = el(
      "label",
      "Selecione ou arraste um arquivo CSV, XLS ou XLSX. Até 5 MB e 2.500 registros.",
    );
    drop.className = "drop";
    const input = el("input");
    input.type = "file";
    input.accept = ".csv,.xls,.xlsx";
    drop.append(input);
    function escolher(file) {
      arquivo = file;
      invalidar();
      modal.querySelector(".mapping").replaceChildren();
      aviso(
        file ? "Arquivo selecionado — " + file.name : "Selecione uma planilha.",
      );
    }
    input.onchange = () => escolher(input.files[0]);
    drop.ondragover = (e) => e.preventDefault();
    drop.ondrop = (e) => {
      e.preventDefault();
      escolher(e.dataTransfer.files[0]);
    };
    main.append(drop);
    if(tipo==='pets'){
      const origem=el('label','Origem dos códigos legados dos pets');const campo=el('input');campo.id='ph-origem-pets';campo.value='legado';campo.maxLength=80;campo.onchange=invalidar;origem.append(campo);main.append(origem,el('p','Importe os clientes primeiro. Pets precisam de tutor confirmado; linhas pendentes podem ser ignoradas e analisadas depois. Não são criados pets sem tutor.'));
    }
    if(tipo==='clientes'){
      const referencia=el('label','Data de referência dos indicadores da planilha (preencher se houver resumo histórico)');
      const inputRef=el('input');inputRef.type='date';inputRef.id='ph-referencia-historico';inputRef.onchange=invalidar;referencia.append(inputRef);main.append(referencia);
      const conciliacao=el('label','Conciliação do histórico');const op=el('select');op.id='ph-conciliacao-historico';
      for(const[v,t]of [['separado','Manter separado dos totais PetHub (recomendado até conferir)'],['somar_posteriores','Somar apenas vendas após o corte histórico']]){const o=el('option',t);o.value=v;op.append(o);}
      op.onchange=invalidar;conciliacao.append(op);main.append(conciliacao,el('p','Resumos não criam vendas. Último mês/semana ficam associados à referência informada. Atualizações não apagam campos opcionais vazios.'));
    }
    const progress = el("progress");
    progress.hidden = true;
    main.append(progress);
    const notice = el("div");
    notice.className = "notice";
    notice.setAttribute("role", "status");
    main.append(notice);
    const mapping = el("div");
    mapping.className = "mapping";
    main.append(mapping);
    const centro = el("label", "Centro padrão para itens sem correspondência");
    centro.hidden = tipo !== "produtos";
    const select = el("select");
    select.id = "ph-centro";
    select.onchange = invalidar;
    centro.append(select);
    main.append(centro);
    if (tipo === "produtos") {
      const gerenciar = el("a", "Gerenciar centros de resultado desta empresa");
      gerenciar.href = "/configuracoes/centro-resultado.html";
      gerenciar.target = "_blank";
      gerenciar.rel = "noopener";
      main.append(
        gerenciar,
        el(
          "p",
          "Após cadastrar um novo centro, feche e reabra a importação para atualizar as opções.",
        ),
      );
    }
    main.append(botao("Analisar planilha", analisar));
    const table = el("div");
    table.className = "table-wrap";
    main.append(table);
    const footer = el("footer"),
      confirm = botao("Confirmar importação", confirmar, "primary");
    confirm.dataset.confirmar = "";
    confirm.disabled = true;
    const baixar=botao('Baixar relatório',baixarRelatorio);baixar.dataset.relatorioImportacao='';
    const fecharBtn=botao('Cancelar',fechar);fecharBtn.dataset.fecharImportacao='';
    footer.append(baixar,fecharBtn,confirm);
    dialog.append(header, main, footer);
    modal.append(dialog);
    document.body.append(modal);
    document.addEventListener("keydown", tecla);
    header.querySelector("button").focus();
    busy(true);
    try {
      meta = await request(root + "/campos");
      drop.firstChild.textContent=`Selecione ou arraste CSV, XLS ou XLSX. Até ${meta.limites?.megabytes||5} MB e ${meta.limites?.linhas||2500} registros por arquivo.`;
      const o = el("option", "Selecione se necessário");
      o.value = "";
      select.append(o);
      meta.centros.forEach((nome) => {
        const o = el("option", nome);
        o.value = nome;
        select.append(o);
      });
      if(emLotes){
        const atual=await request(root+'/operacoes/atual');
        if(atual.operacao&&['pendente','processando','interrompido'].includes(atual.operacao.estado)){acompanhar(atual.operacao);return;}
        if(atual.operacao)main.append(botao('Ver última importação',()=>acompanhar(atual.operacao)));
      }
      aviso(
        tipo === "produtos" && !meta.centros.length
          ? "Cadastre um Centro de Resultado na empresa antes de importar os produtos."
          : "Selecione o arquivo e clique em Analisar planilha.",
      );
    } catch (e) {
      aviso(e.message, true);
    } finally {
      busy(false);
      if(operacao)renderOperacao();
    }
  }
  function iniciar() {
    const alvo = document.querySelector(config.alvo);
    if (!alvo) return;
    const b = botao(titulo, abrir, "ph-import-launch");
    alvo.append(b);
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
