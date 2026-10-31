(function(){
  // speciesData será gerada a partir das raças predefinidas (racas-data.js) e de raças personalizadas no localStorage
  let speciesData = [];
  function buildSpeciesDataFromRacas() {
    try {
      const predef = window.racasPredefinidas || [];
      const personal = JSON.parse(localStorage.getItem('racasPersonalizadas') || '[]');

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

      // Mapear tipo -> set de nomes (para contar raças únicas)
      const map = {};
      todas.forEach(r => {
        const tipo = (r.tipo || r.type || 'Outros').toString();
        if (!map[tipo]) map[tipo] = new Set();
        if (r.nome) map[tipo].add(r.nome);
      });

      // Construir lista dinâmica de espécies encontradas (inclui Canina e Felina por compatibilidade)
      const typesSet = new Set(Object.keys(map));
      // Garantir Canina/Felina estejam presentes (mesmo que zero)
      typesSet.add('Canina');
      typesSet.add('Felina');

      const result = Array.from(typesSet).map(t => ({ name: t, count: (map[t] || new Set()).size }));

      // Ordenar por nome para consistência
      result.sort((a,b) => a.name.localeCompare(b.name, 'pt-BR'));
      return result;
    } catch (err) {
      console.error('Erro ao construir speciesData a partir de racas:', err);
      return [ { name: 'Canina', count: 0 }, { name: 'Felina', count: 0 } ];
    }
  }

  // Retorna array com todos os tipos/espécies existentes (predefinidas + personalizadas)
  function getAllSpeciesTypes(){
    const predef = window.racasPredefinidas || [];
    const personal = JSON.parse(localStorage.getItem('racasPersonalizadas') || '[]');
    const types = new Set();
    predef.forEach(p => { if(p && p.tipo) types.add(p.tipo.toString()); });
    personal.forEach(p => { if(p && !p.deleted && p.tipo) types.add(p.tipo.toString()); });
    // garantir compatibilidade
    types.add('Canina'); types.add('Felina');
    return Array.from(types).filter(Boolean).sort((a,b)=> a.localeCompare(b,'pt-BR'));
  }

  // inicializar speciesData
  speciesData = buildSpeciesDataFromRacas();

  let currentPage = 1;
  let itemsPerPage = 50;

  function createRow(item){
    const tr = document.createElement('tr');
    const tdName = document.createElement('td');
    tdName.innerHTML = `<span class="species-name">${item.name}</span> <span class="badge">${item.count}</span>`;
    // Tornar o cell clicável: abrir dropdown com raças ao clicar no td (mais resiliente que o span)
    tdName.style.cursor = 'pointer';
    tdName.title = 'Ver raças';
    tdName.addEventListener('click', (e) => {
      e.stopPropagation();
      try { console.debug('Abrindo dropdown para espécie:', item.name); } catch(e){}
      openSpeciesBreedsDropdown(item.name, tdName);
    });

    const tdEdit = document.createElement('td');
    const editBtn = document.createElement('button');
    editBtn.className = 'action-icon';
    editBtn.title = 'Editar';
    editBtn.innerHTML = '<i class="fas fa-pen"></i>';
  // Ao clicar em editar na linha da espécie, abrir painel para editar a espécie (rename)
  editBtn.addEventListener('click', (ev)=>{ ev.stopPropagation(); openEditSpeciesPanel(item.name); });
    tdEdit.appendChild(editBtn);

    const tdDel = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.className = 'action-icon';
    delBtn.title = 'Excluir';
    delBtn.innerHTML = '<i class="fas fa-trash"></i>';
    delBtn.addEventListener('click', ()=>{ 
      showConfirmDeleteModal(
        `Tem certeza que deseja excluir a espécie "${item.name}"? Essa ação não poderá ser desfeita.`,
        'Excluir',
        ()=>{ deleteSpeciesImmediate(item.name); }
      );
    });
    tdDel.appendChild(delBtn);

    tr.appendChild(tdName); tr.appendChild(tdEdit); tr.appendChild(tdDel);
    return tr;
  }

  // Dropdown flutuante para mostrar raças de uma espécie
  let currentSpeciesDropdown = null;
  let currentSpeciesAnchor = null;
  const racasChannel = new BroadcastChannel('racas-channel');
  function openSpeciesBreedsDropdown(speciesName, anchorEl) {
    closeSpeciesBreedsDropdown();
    // Obter raças predefinidas + personalizadas
    const predef = window.racasPredefinidas || [];
    const personal = JSON.parse(localStorage.getItem('racasPersonalizadas') || '[]');
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
    const racas = todas.filter(r => (r.tipo || '').toString().toLowerCase() === speciesName.toLowerCase());

    const dropdown = document.createElement('div');
    dropdown.className = 'species-breeds-dropdown';

    if (racas.length === 0) {
      const none = document.createElement('div');
      none.className = 'breed-item';
      none.innerHTML = `<div class="breed-name">Nenhuma raça encontrada</div>`;
      dropdown.appendChild(none);
    } else {
      racas.forEach(r => {
        const item = document.createElement('div');
        item.className = 'breed-item';
        item.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;">
            <div class="breed-name">${r.nome}</div>
            <div class="breed-meta">${r.tipo}</div>
          </div>
          <div class="breed-actions">
            <button class="small-icon" title="Editar" data-name="${r.nome}"><i class="fas fa-pen"></i></button>
            <button class="small-icon" title="Excluir" data-name="${r.nome}"><i class="fas fa-trash"></i></button>
          </div>
        `;

        // Selecionar raça ao clicar no texto
        item.querySelector('.breed-name')?.addEventListener('click', ()=>{
          // ação ao selecionar; por enquanto apenas fecha o dropdown
          closeSpeciesBreedsDropdown();
        });

        // Ações pequenas: editar / excluir
        item.querySelectorAll('.small-icon')[0]?.addEventListener('click', (ev)=>{
          ev.stopPropagation();
          openEditPanel(r);
        });
        item.querySelectorAll('.small-icon')[1]?.addEventListener('click', (ev)=>{
          ev.stopPropagation();
          // pedir confirmação antes de excluir a raça
          showConfirmDeleteModal(
            `Tem certeza que deseja excluir a raça "${r.nome}"? Essa ação não poderá ser desfeita.`,
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
      <div class="panel-header"><h3>Espécie/Raça</h3><button class="btn secondary close-btn">Fechar</button></div>
      <div class="form-group"><label>Espécie:</label><select id="editTipo"></select></div>
      <div class="form-group"><label>Raça:</label><input type="text" id="editNome" /></div>
      <div class="panel-actions"><button class="btn secondary close-btn">Fechar</button><button class="btn primary" id="saveEditBtn">Salvar</button></div>
    `;
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    setTimeout(()=> panel.classList.add('show'), 10);

    // preencher valores
    const tipoEl = panel.querySelector('#editTipo');
    const nomeEl = panel.querySelector('#editNome');
    // popular opções dinâmicas de espécies (inclui predefinidas + personalizadas)
    try{
      const types = getAllSpeciesTypes();
      tipoEl.innerHTML = '';
      types.forEach(t => {
        const opt = document.createElement('option'); opt.value = t; opt.textContent = t; tipoEl.appendChild(opt);
      });
    }catch(e){
      tipoEl.innerHTML = '<option value="Canina">Canina</option><option value="Felina">Felina</option>';
    }
    // garantir que o tipo atual da raça esteja presente como opção
    try{
      const cur = (raca.tipo || '').toString();
      if(cur){
        let found = false;
        for(let i=0;i<tipoEl.options.length;i++){ if(tipoEl.options[i].value === cur){ found = true; break; } }
        if(!found){ const opt = document.createElement('option'); opt.value = cur; opt.textContent = cur; tipoEl.appendChild(opt); }
      }
    }catch(e){}
    tipoEl.value = (raca.tipo || (tipoEl.options[0] && tipoEl.options[0].value) || 'Canina');
    nomeEl.value = raca.nome || '';

    panel.querySelectorAll('.close-btn').forEach(b => b.addEventListener('click', ()=> closeEditPanel()));
    panel.querySelector('#saveEditBtn').addEventListener('click', ()=>{
      const newNome = nomeEl.value.trim();
      const newTipo = tipoEl.value;
      if (!newNome) return alert('Informe o nome da raça');
      saveEditedRaca(raca.nome, newNome, newTipo);
      closeEditPanel();
    });
  }

  function closeEditPanel() {
    const existing = document.querySelector('.side-panel-backdrop');
    if (existing) existing.remove();
  }

  // Painel para editar a espécie (ex: renomear Canina -> Canino)
  function openEditSpeciesPanel(speciesName){
    // fechar qualquer outro painel
    closeEditPanel();
    const backdrop = document.createElement('div');
    backdrop.className = 'side-panel-backdrop';
    const panel = document.createElement('div');
    panel.className = 'side-panel';
    panel.innerHTML = `
      <div class="panel-header"><h3>Editar Espécie</h3><button class="btn secondary close-btn">Fechar</button></div>
      <div class="form-group"><label>Espécie atual:</label><div style="font-weight:600;margin-bottom:8px;">${speciesName}</div></div>
      <div class="form-group"><label>Novo nome da espécie:</label><input type="text" id="editSpeciesName" value="${speciesName}" /></div>
      <div class="form-group"><label>Raças nesta espécie:</label><div id="speciesCount" style="font-weight:600;">--</div></div>
      <div class="panel-actions"><button class="btn secondary close-btn">Cancelar</button><button class="btn primary" id="saveSpeciesBtn">Salvar</button></div>
    `;
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    setTimeout(()=> panel.classList.add('show'), 10);

    // preencher contagem
    const countEl = panel.querySelector('#speciesCount');
    const map = {};
    const predef = window.racasPredefinidas || [];
    const personal = JSON.parse(localStorage.getItem('racasPersonalizadas') || '[]');
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
      if(!newName) return alert('Informe o novo nome da espécie');
      if(newName === speciesName){ backdrop.remove(); return; }
      saveEditedSpecies(speciesName, newName);
      backdrop.remove();
    });
  }

  function saveEditedSpecies(originalSpecies, newSpecies){
    // Atualiza entradas personalizadas e adiciona overrides para predefinidas para alterar o tipo
    let rp = JSON.parse(localStorage.getItem('racasPersonalizadas') || '[]');
    // atualizar personalizadas existentes
    rp = rp.map(r => {
      if((r.tipo||'').toString() === originalSpecies){ return Object.assign({}, r, { tipo: newSpecies }); }
      return r;
    });
    // para cada predef que pertence a originalSpecies, garantir override que mude o tipo para newSpecies (se não houver override existente)
    const predef = window.racasPredefinidas || [];
    predef.forEach(p =>{
      if(p.tipo === originalSpecies){
        const exists = rp.some(x => x.originalNome === p.nome || x.nome === p.nome);
        if(!exists){
          rp.push({ originalNome: p.nome, nome: p.nome, tipo: newSpecies });
        }
      }
    });
    localStorage.setItem('racasPersonalizadas', JSON.stringify(rp));
    speciesData = buildSpeciesDataFromRacas();
    filterAndRender();
    try{ racasChannel.postMessage({ action: 'species-renamed', from: originalSpecies, to: newSpecies }); }catch(e){}
  }

  // Painel para adicionar nova espécie e raças iniciais
  function openAddSpeciesPanel(){
    closeEditPanel();
    const backdrop = document.createElement('div');
    backdrop.className = 'side-panel-backdrop';
    const panel = document.createElement('div');
    panel.className = 'side-panel';
    panel.innerHTML = `
      <div class="panel-header"><h3>Espécie/Raça</h3><button class="btn secondary close-btn">Fechar</button></div>
      <div class="form-group"><label>Espécie: *</label><input type="text" id="newSpeciesName" placeholder="Ex: Canina" /></div>
      <div class="form-group" style="display:flex;gap:8px;align-items:flex-end;">
        <div style="flex:1">
          <label>Raça: *</label>
          <input type="text" id="newBreedName" placeholder="Ex: Labrador Retriever" />
        </div>
        <div>
          <button class="btn" id="addBreedBtn">Adicionar</button>
        </div>
      </div>
      <div class="form-group"><label>Raças adicionadas:</label><div id="addedBreedsList" style="min-height:40px;padding:8px;border:1px dashed #e6e6e6;border-radius:6px;background:#fff;"></div></div>
      <div class="panel-actions"><button class="btn secondary close-btn">Cancelar</button><button class="btn primary" id="saveNewSpeciesBtn">Salvar</button></div>
    `;
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    setTimeout(()=> panel.classList.add('show'), 10);

    const breeds = [];
    const nameInput = panel.querySelector('#newSpeciesName');
    const breedInput = panel.querySelector('#newBreedName');
    const listEl = panel.querySelector('#addedBreedsList');

    function renderBreeds(){
      listEl.innerHTML = '';
      if(breeds.length === 0){ listEl.innerHTML = '<div style="color:#666">Nenhuma raça adicionada ainda</div>'; return; }
      breeds.forEach((b, idx)=>{
        const el = document.createElement('div');
        el.style.display = 'flex'; el.style.justifyContent = 'space-between'; el.style.alignItems='center'; el.style.padding='6px 0';
        el.innerHTML = `<div style="font-weight:600">${b}</div><div><button class="btn secondary small remove-breed" data-idx="${idx}">Remover</button></div>`;
        listEl.appendChild(el);
      });
      panel.querySelectorAll('.remove-breed').forEach(btn=> btn.addEventListener('click', (ev)=>{
        const i = parseInt(btn.getAttribute('data-idx'),10);
        breeds.splice(i,1); renderBreeds();
      }));
    }

    panel.querySelectorAll('.close-btn').forEach(b => b.addEventListener('click', ()=> backdrop.remove()));

    function addBreedToList(){
      const bname = (breedInput.value || '').trim();
      if(!bname) return alert('Informe o nome da raça');
      // evitar duplicatas na lista temporária
      if(breeds.includes(bname)){
        breedInput.value = '';
        breedInput.focus();
        return;
      }
      breeds.push(bname);
      breedInput.value = '';
      renderBreeds();
      breedInput.focus();
    }

    panel.querySelector('#addBreedBtn').addEventListener('click', (e)=>{ e.preventDefault(); addBreedToList(); });
    // permitir adicionar com Enter no campo de raça
    breedInput.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter'){
        e.preventDefault(); addBreedToList();
      }
    });

    panel.querySelector('#saveNewSpeciesBtn').addEventListener('click', ()=>{
      const sname = (nameInput.value || '').trim();
      if(!sname) return alert('Informe o nome da espécie');
      if(breeds.length === 0) return alert('Adicione ao menos uma raça antes de salvar');
      // persistir raças como personalizadas (tipo = sname)
      let rp = JSON.parse(localStorage.getItem('racasPersonalizadas') || '[]');
      breeds.forEach(b=>{
        // não duplicar
        if(!rp.some(x => x.nome === b && ((x.tipo||'') === sname))){
          rp.push({ nome: b, tipo: sname });
        }
      });
      localStorage.setItem('racasPersonalizadas', JSON.stringify(rp));
      speciesData = buildSpeciesDataFromRacas();
      filterAndRender();
      try{ racasChannel.postMessage({ action: 'species-added', species: sname, breeds }); }catch(e){}
      backdrop.remove();
    });
  }

  function saveEditedRaca(originalNome, newNome, newTipo) {
    let rp = JSON.parse(localStorage.getItem('racasPersonalizadas') || '[]');
    // procurar se há uma entrada personalizada para este originalNome ou nome
    let foundIdx = rp.findIndex(x => x.originalNome === originalNome || x.nome === originalNome);
    if (foundIdx !== -1) {
      rp[foundIdx].nome = newNome;
      rp[foundIdx].tipo = newTipo;
      rp[foundIdx].deleted = false;
    } else {
      // se originalNome existe como predefinida, salvar como override
      const isPredef = (window.racasPredefinidas || []).some(p => p.nome === originalNome);
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
    localStorage.setItem('racasPersonalizadas', JSON.stringify(rp));
    // atualizar UI
    speciesData = buildSpeciesDataFromRacas();
    filterAndRender();
    // notificar outras abas/paginas
    try { racasChannel.postMessage({ action: 'updated', originalNome, nome: newNome, tipo: newTipo }); } catch(e){}
  }

  function deleteRacaImmediate(nome) {
    let rp = JSON.parse(localStorage.getItem('racasPersonalizadas') || '[]');
    // se existe como personalizada, remover
    const idx = rp.findIndex(x => x.nome === nome || x.originalNome === nome);
    if (idx !== -1) {
      rp.splice(idx,1);
    } else {
      // marcar predef como deletada
      const isPredef = (window.racasPredefinidas || []).some(p => p.nome === nome);
      if (isPredef) rp.push({ originalNome: nome, deleted: true });
    }
    localStorage.setItem('racasPersonalizadas', JSON.stringify(rp));
    speciesData = buildSpeciesDataFromRacas();
    filterAndRender();
    closeSpeciesBreedsDropdown();
    try { racasChannel.postMessage({ action: 'deleted', originalNome: nome }); } catch(e){}
  }

  // Excluir espécie: remover todas as raças personalizadas do tipo e marcar predefinidas como deletadas
  function deleteSpeciesImmediate(speciesName) {
    let rp = JSON.parse(localStorage.getItem('racasPersonalizadas') || '[]');
    // remover personalizadas com tipo == speciesName
    rp = rp.filter(x => (x.tipo || '').toString() !== speciesName);
    // marcar predef como deletada
    const predef = window.racasPredefinidas || [];
    predef.forEach(p => {
      if (p.tipo === speciesName) {
        // adicionar marcação de deleção se não existir
        if (!rp.some(r => r.originalNome === p.nome)) {
          rp.push({ originalNome: p.nome, deleted: true });
        }
      }
    });
    localStorage.setItem('racasPersonalizadas', JSON.stringify(rp));
    speciesData = buildSpeciesDataFromRacas();
    filterAndRender();
    closeSpeciesBreedsDropdown();
    try { racasChannel.postMessage({ action: 'species-deleted', species: speciesName }); } catch(e){}
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
    // reconstruir caso raças personalizadas existam no localStorage
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
  window.especieRacaTable = { data: speciesData, refresh: filterAndRender };
})();