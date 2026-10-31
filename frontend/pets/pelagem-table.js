(function(){
  // pelagemData será gerada a partir das pelagens predefinidas (pelagem-data.js) e de pelagens personalizadas no localStorage
  let speciesData = [];
  function buildSpeciesDataFromRacas() {
    try {
  const predef = (window.pelagensPredefinidas || []) || [];
      const personal = JSON.parse(localStorage.getItem('pelagensPersonalizadas') || '[]');

      // Construir lista de raças aplicando overrides/deleções (mesma lógica usada no cadastro)
      const todas = [];
      predef.forEach(p => {
        const override = personal.find(pp => pp.originalNome === p.nome);
        if (override) {
          if (!override.deleted) todas.push({ nome: override.nome, tipo: override.tipo });
        } else {
          const sameNameCustom = personal.find(pp => !pp.originalNome && pp.nome === p.nome && !pp.deleted);
          if (sameNameCustom) {
            todas.push({ nome: sameNameCustom.nome, tipo: sameNameCustom.tipo });
          } else {
            todas.push({ nome: p.nome, tipo: p.tipo });
          }
        }
      });
      personal.forEach(pp => { if (!pp.originalNome && !pp.deleted) {
        if (!todas.some(t => t.nome === pp.nome)) todas.push({ nome: pp.nome, tipo: pp.tipo });
      }});

      // Mapear cor -> set de tipos (para listar CORES únicas e quantos tipos têm essa cor)
      const map = {};
      todas.forEach(r => {
        const nome = (r.nome || '').toString();
        const tipo = (r.tipo || r.type || '').toString();
        if (!nome) return;
        if (!map[nome]) map[nome] = new Set();
        if (tipo) map[nome].add(tipo);
      });

      // Construir lista dinâmica de cores encontradas
  const result = Object.keys(map).map(name => ({ name, count: (map[name] || new Set()).size }));
  // ordenar alfabeticamente
  result.sort((a,b) => a.name.localeCompare(b.name, 'pt-BR'));

      // Ordenar por nome para consistência
      result.sort((a,b) => a.name.localeCompare(b.name, 'pt-BR'));
      return result;
    } catch (err) {
      console.error('Erro ao construir pelagemData a partir de predefinidos:', err);
      return [];
    }
  }

  // Retorna array com todos os tipos/espécies existentes (predefinidas + personalizadas)
  function getAllSpeciesTypes(){
  const predef = (window.pelagensPredefinidas || []) || [];
    const personal = JSON.parse(localStorage.getItem('pelagensPersonalizadas') || '[]');
    const types = new Set();
    predef.forEach(p => { if(p && p.tipo) types.add(p.tipo.toString()); });
    personal.forEach(p => { if(p && !p.deleted && p.tipo) types.add(p.tipo.toString()); });
  // garantir compatibilidade mínima (se desejar, mantenha exemplos)
    return Array.from(types).filter(Boolean).sort((a,b)=> a.localeCompare(b,'pt-BR'));
  }

  // inicializar speciesData
  speciesData = buildSpeciesDataFromRacas();

  let currentPage = 1;
  let itemsPerPage = 50;

  function createRow(item){
    const tr = document.createElement('tr');
    const tdName = document.createElement('td');
    tdName.innerHTML = `<span class="species-name">${item.name}</span>`;
    // Tornar o cell clicável: abrir dropdown com raças ao clicar no td (mais resiliente que o span)
    tdName.style.cursor = 'pointer';
    tdName.title = 'Editar cor';
    tdName.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditPanel(item.name);
    });

    const tdEdit = document.createElement('td');
    const editBtn = document.createElement('button');
    editBtn.className = 'action-icon';
    editBtn.title = 'Editar';
    editBtn.innerHTML = '<i class="fas fa-pen"></i>';
    // Ao clicar em editar na linha da cor, abrir painel de edição da cor
    editBtn.addEventListener('click', (ev)=>{ ev.stopPropagation(); openEditPanel(item.name); });
    tdEdit.appendChild(editBtn);

    const tdDel = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.className = 'action-icon';
    delBtn.title = 'Excluir';
    delBtn.innerHTML = '<i class="fas fa-trash"></i>';
    delBtn.addEventListener('click', ()=>{ 
      showConfirmDeleteModal(
        `Tem certeza que deseja excluir a cor "${item.name}"? Essa ação não poderá ser desfeita.`,
        'Excluir',
        ()=>{ deleteRacaImmediate(item.name); }
      );
    });
    tdDel.appendChild(delBtn);

    tr.appendChild(tdName); tr.appendChild(tdEdit); tr.appendChild(tdDel);
    return tr;
  }

  // Dropdown flutuante para mostrar tipos/pelagens de uma COR
  let currentSpeciesDropdown = null;
  let currentSpeciesAnchor = null;
  const pelagensChannel = new BroadcastChannel('pelagens-channel');
  // Escutar mudanças vindas de outras abas (cadastro-pet ou outras) e reconstruir dados
  try {
    pelagensChannel.onmessage = (ev) => {
      if(!ev?.data) return;
      try { speciesData = buildSpeciesDataFromRacas(); } catch(e){}
      try { filterAndRender(); } catch(e){}
    };
  } catch(e){ console.warn('BroadcastChannel (pelagens) not available', e); }
  function openSpeciesBreedsDropdown(speciesName, anchorEl) {
    closeSpeciesBreedsDropdown();
    // Obter raças predefinidas + personalizadas
  const predef = (window.pelagensPredefinidas || []) || [];
    const personal = JSON.parse(localStorage.getItem('pelagensPersonalizadas') || '[]');
    // construir lista aplicada overrides/deleções
    const todas = [];
    predef.forEach(p => {
      const override = personal.find(pp => pp.originalNome === p.nome);
      if (override) {
        if (!override.deleted) todas.push({ nome: override.nome, tipo: override.tipo });
      } else {
        const sameNameCustom = personal.find(pp => !pp.originalNome && pp.nome === p.nome && !pp.deleted);
        if (sameNameCustom) todas.push({ nome: sameNameCustom.nome, tipo: sameNameCustom.tipo });
        else todas.push({ nome: p.nome, tipo: p.tipo });
      }
    });
  personal.forEach(pp => { if (!pp.originalNome && !pp.deleted) { if (!todas.some(t => t.nome === pp.nome)) todas.push({ nome: pp.nome, tipo: pp.tipo }); }});
  // Agora filtramos por nome da cor
  const racas = todas.filter(r => (r.nome || '').toString().toLowerCase() === speciesName.toLowerCase());

    const dropdown = document.createElement('div');
    dropdown.className = 'species-breeds-dropdown';

    if (racas.length === 0) {
      const none = document.createElement('div');
      none.className = 'breed-item';
      none.innerHTML = `<div class="breed-name">Nenhuma pelagem encontrada para esta cor</div>`;
      dropdown.appendChild(none);
    } else {
      // mostramos cada ocorrência da cor (apenas o nome), permitindo editar/excluir
      racas.forEach(r => {
        const item = document.createElement('div');
        item.className = 'breed-item';
        item.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;">
            <div class="breed-name">${r.nome}</div>
          </div>
          <div class="breed-actions">
            <button class="small-icon" title="Editar" data-name="${r.nome}"><i class="fas fa-pen"></i></button>
            <button class="small-icon" title="Excluir" data-name="${r.nome}"><i class="fas fa-trash"></i></button>
          </div>
        `;

        // Ao clicar no nome, apenas fechamos (ou poderíamos selecionar)
        item.querySelector('.breed-name')?.addEventListener('click', ()=>{ closeSpeciesBreedsDropdown(); });

        // Ações pequenas: editar / excluir (edit recebe o objeto com nome+tipo)
        item.querySelectorAll('.small-icon')[0]?.addEventListener('click', (ev)=>{ ev.stopPropagation(); openEditPanel(r); });
        item.querySelectorAll('.small-icon')[1]?.addEventListener('click', (ev)=>{
          ev.stopPropagation();
          showConfirmDeleteModal(
            `Tem certeza que deseja excluir a cor "${r.nome}" desta pelagem? Essa ação não poderá ser desfeita.`,
            'Excluir',
            ()=>{ deleteRacaImmediate(r.nome); }
          );
        });

        dropdown.appendChild(item);
      });
    }

  document.body.appendChild(dropdown);
  currentSpeciesDropdown = dropdown;
  currentSpeciesAnchor = anchorEl;

    // posicionar o dropdown abaixo do anchorEl
    const rect = anchorEl.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const top = rect.top + rect.height + 8 + scrollTop;
    const left = rect.left;
    dropdown.style.top = top + 'px';
    dropdown.style.left = left + 'px';

    // forçar show com pequena animação
    setTimeout(()=> dropdown.classList.add('show'), 10);

    // fechar ao clicar fora; escutar redimensionamento; escutar scroll apenas para decidir se a âncora saiu da viewport
    setTimeout(()=>{
      window.addEventListener('click', onDocClickForSpeciesDropdown);
      window.addEventListener('resize', closeSpeciesBreedsDropdown);
      window.addEventListener('scroll', onScrollForSpeciesDropdown, true);
    }, 20);
  }

  function onDocClickForSpeciesDropdown(e) {
    if (!currentSpeciesDropdown) return;
    if (!currentSpeciesDropdown.contains(e.target)) closeSpeciesBreedsDropdown();
  }

  function onScrollForSpeciesDropdown(e) {
    if (!currentSpeciesDropdown || !currentSpeciesAnchor) return;
    try {
      const rect = currentSpeciesAnchor.getBoundingClientRect();
      // Se a âncora saiu completamente da viewport, fechar dropdown
      if (rect.bottom < 0 || rect.top > (window.innerHeight || document.documentElement.clientHeight)) {
        closeSpeciesBreedsDropdown();
      }
      // Caso contrário, não fechamos ao rolar
    } catch (err) {
      // Se der erro ao acessar anchor, fechar por segurança
      closeSpeciesBreedsDropdown();
    }
  }

  function closeSpeciesBreedsDropdown() {
    if (!currentSpeciesDropdown) return;
    try { currentSpeciesDropdown.classList.remove('show'); } catch(e){}
    try { currentSpeciesDropdown.remove(); } catch(e){}
    currentSpeciesDropdown = null;
    currentSpeciesAnchor = null;
    window.removeEventListener('click', onDocClickForSpeciesDropdown);
    window.removeEventListener('resize', closeSpeciesBreedsDropdown);
    window.removeEventListener('scroll', onScrollForSpeciesDropdown, true);
  }

  // Edicao rapida via side panel
  function openEditPanel(raca) {
    // criar backdrop/painel
    closeEditPanel();
    const backdrop = document.createElement('div');
    backdrop.className = 'side-panel-backdrop';
    const panel = document.createElement('div');
    panel.className = 'side-panel';
    panel.innerHTML = `
      <div class="panel-header"><h3>Editar Cor</h3><button class="btn secondary close-btn">Fechar</button></div>
      <div class="form-group"><label>Cor:</label><input type="text" id="editNome" /></div>
      <div class="panel-actions"><button class="btn secondary close-btn">Fechar</button><button class="btn primary" id="saveEditBtn">Salvar</button></div>
    `;
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    setTimeout(()=> panel.classList.add('show'), 10);

    // preencher valores
    const nomeEl = panel.querySelector('#editNome');
    // aceitar parâmetro sendo string ou objeto
    const originalName = (typeof raca === 'string') ? raca : (raca && raca.nome) || '';
    nomeEl.value = originalName;

    panel.querySelectorAll('.close-btn').forEach(b => b.addEventListener('click', ()=> closeEditPanel()));
    panel.querySelector('#saveEditBtn').addEventListener('click', ()=>{
      const newNome = nomeEl.value.trim();
  if (!newNome) return alert('Informe o nome da cor');
      renameColor(originalName, newNome);
      closeEditPanel();
    });
  }

  function closeEditPanel() {
    const existing = document.querySelector('.side-panel-backdrop');
    if (existing) existing.remove();
  }

  // Painel para editar a pelagem (ex: renomear uma pelagem)
  function openEditSpeciesPanel(speciesName){
    // fechar qualquer outro painel
    closeEditPanel();
    const backdrop = document.createElement('div');
    backdrop.className = 'side-panel-backdrop';
    const panel = document.createElement('div');
    panel.className = 'side-panel';
    panel.innerHTML = `
      <div class="panel-header"><h3>Editar Pelagem</h3><button class="btn secondary close-btn">Fechar</button></div>
      <div class="form-group"><label>Pelagem atual:</label><div style="font-weight:600;margin-bottom:8px;">${speciesName}</div></div>
      <div class="form-group"><label>Novo nome da pelagem:</label><input type="text" id="editSpeciesName" value="${speciesName}" /></div>
      <div class="form-group"><label>Cores nesta pelagem:</label><div id="speciesCount" style="font-weight:600;">--</div></div>
      <div class="panel-actions"><button class="btn secondary close-btn">Cancelar</button><button class="btn primary" id="saveSpeciesBtn">Salvar</button></div>
    `;
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    setTimeout(()=> panel.classList.add('show'), 10);

  // preencher contagem
    const countEl = panel.querySelector('#speciesCount');
    const map = {};
  const predef = (window.pelagensPredefinidas || []) || [];
  const personal = JSON.parse(localStorage.getItem('pelagensPersonalizadas') || '[]');
    const todas = [];
    predef.forEach(p => {
      const override = personal.find(pp => pp.originalNome === p.nome);
      if (override) {
        if (!override.deleted) todas.push({ nome: override.nome, tipo: override.tipo });
      } else {
        const sameNameCustom = personal.find(pp => !pp.originalNome && pp.nome === p.nome && !pp.deleted);
        if (sameNameCustom) todas.push({ nome: sameNameCustom.nome, tipo: sameNameCustom.tipo });
        else todas.push({ nome: p.nome, tipo: p.tipo });
      }
    });
    personal.forEach(pp => { if (!pp.originalNome && !pp.deleted) { if (!todas.some(t => t.nome === pp.nome)) todas.push({ nome: pp.nome, tipo: pp.tipo }); }});
    const speciesRacas = todas.filter(r => (r.tipo||'').toString().toLowerCase() === speciesName.toLowerCase());
    if(countEl) countEl.textContent = speciesRacas.length;

    panel.querySelectorAll('.close-btn').forEach(b => b.addEventListener('click', ()=> backdrop.remove()));

    panel.querySelector('#saveSpeciesBtn').addEventListener('click', ()=>{
      const newName = (panel.querySelector('#editSpeciesName')?.value || '').trim();
      if(!newName) return alert('Informe o novo nome da pelagem');
      if(newName === speciesName){ backdrop.remove(); return; }
      saveEditedSpecies(speciesName, newName);
      backdrop.remove();
    });
  }

  function saveEditedSpecies(originalSpecies, newSpecies){
    // Atualiza entradas personalizadas e adiciona overrides para predefinidas para alterar o tipo
  let rp = JSON.parse(localStorage.getItem('pelagensPersonalizadas') || '[]');
    // atualizar personalizadas existentes
    rp = rp.map(r => {
      if((r.tipo||'').toString() === originalSpecies){ return Object.assign({}, r, { tipo: newSpecies }); }
      return r;
    });
    // para cada predef que pertence a originalSpecies, garantir override que mude o tipo para newSpecies (se não houver override existente)
  const predef = window.pelagensPredefinidas || [];
    predef.forEach(p =>{
      if(p.tipo === originalSpecies){
        const exists = rp.some(x => x.originalNome === p.nome || x.nome === p.nome);
        if(!exists){
          rp.push({ originalNome: p.nome, nome: p.nome, tipo: newSpecies });
        }
      }
    });
  localStorage.setItem('pelagensPersonalizadas', JSON.stringify(rp));
    speciesData = buildSpeciesDataFromRacas();
    filterAndRender();
  try{ pelagensChannel.postMessage({ action: 'species-renamed', from: originalSpecies, to: newSpecies }); }catch(e){}
  }

  // Painel para adicionar nova COR (somente o nome da cor)
  function openAddSpeciesPanel(){
    closeEditPanel();
    const backdrop = document.createElement('div');
    backdrop.className = 'side-panel-backdrop';
    const panel = document.createElement('div');
    panel.className = 'side-panel';
    panel.innerHTML = `
      <div class="panel-header"><h3>Adicionar Cor</h3><button class="btn secondary close-btn">Fechar</button></div>
      <div class="form-group"><label>Cor: *</label><input type="text" id="newColorName" placeholder="Ex: Branco" /></div>
      <div class="panel-actions"><button class="btn secondary close-btn">Cancelar</button><button class="btn primary" id="saveNewColorBtn">Salvar</button></div>
    `;
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    setTimeout(()=> panel.classList.add('show'), 10);

    const nameInput = panel.querySelector('#newColorName');

    panel.querySelectorAll('.close-btn').forEach(b => b.addEventListener('click', ()=> backdrop.remove()));

    panel.querySelector('#saveNewColorBtn').addEventListener('click', ()=>{
      const cname = (nameInput.value || '').trim();
      if(!cname) return alert('Informe o nome da cor');
      // persistir cor como personalizada (apenas { nome })
      let rp = JSON.parse(localStorage.getItem('pelagensPersonalizadas') || '[]');
      // evitar duplicatas
      if(!rp.some(x => x.nome && x.nome.toLowerCase() === cname.toLowerCase())){
        rp.push({ nome: cname });
        localStorage.setItem('pelagensPersonalizadas', JSON.stringify(rp));
        speciesData = buildSpeciesDataFromRacas();
        filterAndRender();
        try{ pelagensChannel.postMessage({ action: 'color-added', nome: cname }); }catch(e){}
      }
      backdrop.remove();
    });
  }

  function saveEditedRaca(originalNome, newNome, newTipo) {
  let rp = JSON.parse(localStorage.getItem('pelagensPersonalizadas') || '[]');
    // procurar se há uma entrada personalizada para este originalNome ou nome
    let foundIdx = rp.findIndex(x => x.originalNome === originalNome || x.nome === originalNome);
    if (foundIdx !== -1) {
      rp[foundIdx].nome = newNome;
      rp[foundIdx].tipo = newTipo;
      rp[foundIdx].deleted = false;
    } else {
      // se originalNome existe como predefinida, salvar como override
  const isPredef = (window.pelagensPredefinidas || []).some(p => p.nome === originalNome);
      if (isPredef) {
        rp.push({ originalNome: originalNome, nome: newNome, tipo: newTipo });
      } else {
        // editing a custom item (rename)
        const idxByName = rp.findIndex(x => x.nome === originalNome);
        if (idxByName !== -1) {
          rp[idxByName].nome = newNome; rp[idxByName].tipo = newTipo;
        } else {
          rp.push({ nome: newNome, tipo: newTipo });
        }
      }
    }
  localStorage.setItem('pelagensPersonalizadas', JSON.stringify(rp));
    // atualizar UI
    speciesData = buildSpeciesDataFromRacas();
    filterAndRender();
    // notificar outras abas/paginas
  try { pelagensChannel.postMessage({ action: 'updated', originalNome, nome: newNome, tipo: newTipo }); } catch(e){}
  }

  // Renomear uma cor (alterar occurrences em personalizadas e criar overrides para predefinidas)
  function renameColor(originalNome, newNome){
    if(!originalNome || !newNome || originalNome === newNome) return;
    let rp = JSON.parse(localStorage.getItem('pelagensPersonalizadas') || '[]');
    // atualizar entradas personalizadas existentes
    rp = rp.map(r => {
      try{
        if((r.nome||'') === originalNome){ return Object.assign({}, r, { nome: newNome }); }
        if((r.originalNome||'') === originalNome){ return Object.assign({}, r, { nome: newNome }); }
      }catch(e){}
      return r;
    });
    // para cada predef que corresponde ao originalNome, se não houver override, criar override com novo nome
    const predef = window.pelagensPredefinidas || [];
    predef.forEach(p =>{
      if(p.nome === originalNome){
        const exists = rp.some(x => x.originalNome === p.nome || x.nome === p.nome || x.nome === newNome);
        if(!exists){
          rp.push({ originalNome: p.nome, nome: newNome, tipo: p.tipo });
        }
      }
    });
    localStorage.setItem('pelagensPersonalizadas', JSON.stringify(rp));
    speciesData = buildSpeciesDataFromRacas();
    filterAndRender();
    try{ pelagensChannel.postMessage({ action: 'color-renamed', from: originalNome, to: newNome }); }catch(e){}
  }

  function deleteRacaImmediate(nome) {
  let rp = JSON.parse(localStorage.getItem('pelagensPersonalizadas') || '[]');
    // se existe como personalizada, remover
    const idx = rp.findIndex(x => x.nome === nome || x.originalNome === nome);
    if (idx !== -1) {
      rp.splice(idx,1);
    } else {
      // marcar predef como deletada
  const isPredef = (window.pelagensPredefinidas || []).some(p => p.nome === nome);
      if (isPredef) rp.push({ originalNome: nome, deleted: true });
    }
  localStorage.setItem('pelagensPersonalizadas', JSON.stringify(rp));
    speciesData = buildSpeciesDataFromRacas();
    filterAndRender();
    closeSpeciesBreedsDropdown();
  try { pelagensChannel.postMessage({ action: 'deleted', originalNome: nome }); } catch(e){}
  }

  // Excluir espécie: remover todas as raças personalizadas do tipo e marcar predefinidas como deletadas
  function deleteSpeciesImmediate(speciesName) {
  let rp = JSON.parse(localStorage.getItem('pelagensPersonalizadas') || '[]');
    // remover personalizadas com tipo == speciesName
    rp = rp.filter(x => (x.tipo || '').toString() !== speciesName);
    // marcar predef como deletada
  const predef = window.pelagensPredefinidas || [];
    predef.forEach(p => {
      if (p.tipo === speciesName) {
        // adicionar marcação de deleção se não existir
        if (!rp.some(r => r.originalNome === p.nome)) {
          rp.push({ originalNome: p.nome, deleted: true });
        }
      }
    });
  localStorage.setItem('pelagensPersonalizadas', JSON.stringify(rp));
    speciesData = buildSpeciesDataFromRacas();
    filterAndRender();
    closeSpeciesBreedsDropdown();
  try { pelagensChannel.postMessage({ action: 'species-deleted', species: speciesName }); } catch(e){}
  }

  // Mostrar modal de confirmação centralizada
  function showConfirmDeleteModal(message, confirmLabel, onConfirm) {
    // criar elementos
    const backdrop = document.createElement('div');
    backdrop.className = 'confirm-backdrop';
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    modal.innerHTML = `
      <div class="icon"><i class="fas fa-exclamation-triangle"></i></div>
      <h4>Confirmação</h4>
      <p>${message}</p>
      <div class="confirm-actions">
        <button class="btn secondary cancel-btn">Cancelar</button>
        <button class="btn danger confirm-btn">${confirmLabel || 'Excluir'}</button>
      </div>
    `;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    // handlers
    modal.querySelector('.cancel-btn').addEventListener('click', ()=>{ backdrop.remove(); });
    modal.querySelector('.confirm-btn').addEventListener('click', ()=>{
      try { onConfirm(); } catch(e){ console.error(e); }
      backdrop.remove();
    });
  }

  function renderTable(filtered){
    const tbody = document.getElementById('speciesList');
    if(!tbody) return;
    tbody.innerHTML = '';

    // paging
    const start = (currentPage-1)*itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = filtered.slice(start, end);

    pageItems.forEach(it => tbody.appendChild(createRow(it)));

    const pageInfo = document.getElementById('pageInfo');
    if(pageInfo) pageInfo.textContent = `${Math.min(start+1, filtered.length)} - ${Math.min(end, filtered.length)} de ${filtered.length}`;
  }

  function filterAndRender(){
    const q = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    const filtered = speciesData.filter(s => s.name.toLowerCase().includes(q));
    renderTable(filtered);
  }

  function removeItem(item){
    const idx = speciesData.indexOf(item);
    if(idx !== -1){ speciesData.splice(idx,1); filterAndRender(); }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
  // reconstruir caso pelagens personalizadas existam no localStorage
    speciesData = buildSpeciesDataFromRacas();
    const search = document.getElementById('searchInput');
    const addBtn = document.getElementById('addButton');
    const itemsSel = document.getElementById('itemsPerPage');
    const prev = document.getElementById('prevPage');
    const next = document.getElementById('nextPage');

    search?.addEventListener('input', ()=>{ currentPage = 1; filterAndRender(); });
  addBtn?.addEventListener('click', ()=>{ openAddSpeciesPanel(); });
    itemsSel?.addEventListener('change', (e)=>{ itemsPerPage = parseInt(e.target.value,10)||50; currentPage=1; filterAndRender(); });
    prev?.addEventListener('click', ()=>{ if(currentPage>1){ currentPage--; filterAndRender(); } });
    next?.addEventListener('click', ()=>{ currentPage++; filterAndRender(); });

    filterAndRender();
  });

  // expose for debugging
  window.pelagemTable = { data: speciesData, refresh: filterAndRender };
})();