 (function(){
  // porte-table.js — gerencia portes (predefinidos + personalizados) e sincroniza entre abas
  const CHANNEL = 'portes-channel';
  const STORAGE_KEY = 'portesPersonalizados';

  let porteItems = [];
  let currentPage = 1;
  let itemsPerPage = 50;

  const channel = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel(CHANNEL) : null;
  if (channel) {
    channel.onmessage = (ev) => {
      if (!ev?.data) return;
      // rebuild from storage on any change
      porteItems = buildPorteList();
      filterAndRender();
    };
  }

  function buildPorteList(){
    try {
      const predef = (window.portesPredefinidos || []) || [];
      const personal = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const map = new Map();
      // predefinidos: não personalizados
      predef.forEach(p => { if (p && p.nome) map.set(p.nome, { nome: p.nome, descricao: p.descricao || '', personalizado: false }); });
      // personalizados/renames/deletes (vêm de localStorage)
      (personal || []).forEach(pp => {
        if (!pp) return;
        if (pp.deleted) { map.delete(pp.originalNome || pp.nome); return; }
        if (pp.originalNome) { // rename of a predef
          map.delete(pp.originalNome);
          map.set(pp.nome, { nome: pp.nome, descricao: pp.descricao || '', personalizado: true });
        }
        else if (pp.nome) { // new personal entry
          map.set(pp.nome, { nome: pp.nome, descricao: pp.descricao || '', personalizado: true });
        }
      });
      return Array.from(map.values()).sort((a,b)=> a.nome.localeCompare(b.nome,'pt-BR'));
    } catch (e) { console.error('Erro buildPorteList', e); return []; }
  }

  // small html escaper to avoid injection in innerHTML
  function escapeHtml(str){
    return String(str || '').replace(/[&<>"']/g, function(s){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]);
    });
  }

  function createRow(item){
    const tr = document.createElement('tr');
    const tdName = document.createElement('td');
    // show nome and descricao (if present). If personalizado, show badge
    const descHtml = item.descricao ? `<div class="porte-desc"><small>${escapeHtml(item.descricao)}</small></div>` : '';
    const badgeHtml = item.personalizado ? `<span class="badge small">Personalizado</span>` : '';
    tdName.innerHTML = `<div><span class="porte-name">${escapeHtml(item.nome)}</span> ${badgeHtml}</div>${descHtml}`;
    tdName.style.cursor = 'pointer';
    tdName.title = 'Editar porte';
    tdName.addEventListener('click', (e)=>{ e.stopPropagation(); openEditPanel(item.nome); });

    const tdEdit = document.createElement('td');
    const editBtn = document.createElement('button'); editBtn.className='action-icon'; editBtn.title='Editar'; editBtn.innerHTML='<i class="fas fa-pen"></i>';
    editBtn.addEventListener('click', (ev)=>{ ev.stopPropagation(); openEditPanel(item.nome); });
    tdEdit.appendChild(editBtn);

    const tdDel = document.createElement('td');
    const delBtn = document.createElement('button'); delBtn.className='action-icon'; delBtn.title='Excluir'; delBtn.innerHTML='<i class="fas fa-trash"></i>';
    delBtn.addEventListener('click', ()=>{
      showConfirmDeleteModal(`Tem certeza que deseja excluir o porte "${item.nome}"? Essa ação não poderá ser desfeita.`, 'Excluir', ()=>{ deletePorteImmediate(item.nome); });
    });
    tdDel.appendChild(delBtn);

    tr.appendChild(tdName); tr.appendChild(tdEdit); tr.appendChild(tdDel);
    return tr;
  }

  function renderTable(list){
    const tbody = document.getElementById('porteList'); if(!tbody) return; tbody.innerHTML='';
    const start = (currentPage-1)*itemsPerPage; const end = start+itemsPerPage; const pageItems = list.slice(start,end);
    pageItems.forEach(it => tbody.appendChild(createRow(it)));
    const pageInfo = document.getElementById('pageInfo'); if(pageInfo) pageInfo.textContent = `${Math.min(start+1, list.length)} - ${Math.min(end, list.length)} de ${list.length}`;
  }

  function filterAndRender(){
    const q = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    const filtered = porteItems.filter(p => p.nome.toLowerCase().includes(q));
    renderTable(filtered);
  }

  function showConfirmDeleteModal(message, confirmLabel, onConfirm){
    const backdrop = document.createElement('div'); backdrop.className='confirm-backdrop';
    const modal = document.createElement('div'); modal.className='confirm-modal';
    modal.innerHTML = `<div class="icon"><i class="fas fa-exclamation-triangle"></i></div><h4>Confirmação</h4><p>${message}</p><div class="confirm-actions"><button class="btn secondary cancel-btn">Cancelar</button><button class="btn danger confirm-btn">${confirmLabel||'Excluir'}</button></div>`;
    backdrop.appendChild(modal); document.body.appendChild(backdrop);
    modal.querySelector('.cancel-btn').addEventListener('click', ()=>backdrop.remove());
    modal.querySelector('.confirm-btn').addEventListener('click', ()=>{ try{ onConfirm(); }catch(e){console.error(e);} backdrop.remove(); });
  }

  function openEditPanel(nome){
    closeEditPanel();
    const backdrop = document.createElement('div'); backdrop.className='side-panel-backdrop';
    const panel = document.createElement('div'); panel.className='side-panel';
    panel.innerHTML = `<div class="panel-header"><h3>Editar Porte</h3><button class="btn secondary close-btn">Fechar</button></div><div class="form-group"><label>Porte:</label><input type="text" id="editPorteNome" /></div><div class="form-group"><label>Descrição (opcional):</label><input type="text" id="editPorteDescricao" placeholder="Ex: Até 3kg" /></div><div class="panel-actions"><button class="btn secondary close-btn">Fechar</button><button class="btn primary" id="saveEditPorteBtn">Salvar</button></div>`;
    backdrop.appendChild(panel); document.body.appendChild(backdrop); setTimeout(()=> panel.classList.add('show'),10);
    const nomeEl = panel.querySelector('#editPorteNome'); nomeEl.value = nome || '';
    const descEl = panel.querySelector('#editPorteDescricao');
    // try to find existing descricao
    const existing = porteItems.find(p=>p.nome===nome) || buildPorteList().find(p=>p.nome===nome) || {};
    descEl.value = existing.descricao || '';
    panel.querySelectorAll('.close-btn').forEach(b=>b.addEventListener('click', ()=> closeEditPanel()));
    panel.querySelector('#saveEditPorteBtn').addEventListener('click', ()=>{ const n = (nomeEl.value||'').trim(); const d = (descEl.value||'').trim(); if(!n) return alert('Informe o nome do porte'); renamePorte(nome,n,d); closeEditPanel(); });
  }
  function closeEditPanel(){ const ex = document.querySelector('.side-panel-backdrop'); if(ex) ex.remove(); }

  function openAddPanel(){
    closeEditPanel(); const backdrop=document.createElement('div'); backdrop.className='side-panel-backdrop';
    const panel=document.createElement('div'); panel.className='side-panel';
    panel.innerHTML = `<div class="panel-header"><h3>Adicionar Porte</h3><button class="btn secondary close-btn">Fechar</button></div><div class="form-group"><label>Porte: *</label><input type="text" id="newPorteNome" placeholder="Ex: Mini, XXL" /></div><div class="form-group"><label>Descrição (opcional):</label><input type="text" id="newPorteDescricao" placeholder="Ex: Até 3kg" /></div><div class="panel-actions"><button class="btn secondary close-btn">Cancelar</button><button class="btn primary" id="saveNewPorte">Salvar</button></div>`;
    backdrop.appendChild(panel); document.body.appendChild(backdrop); setTimeout(()=> panel.classList.add('show'),10);
    panel.querySelectorAll('.close-btn').forEach(b=>b.addEventListener('click', ()=> backdrop.remove()));
    panel.querySelector('#saveNewPorte').addEventListener('click', ()=>{
      const cname = (panel.querySelector('#newPorteNome').value||'').trim(); const cdesc = (panel.querySelector('#newPorteDescricao').value||'').trim(); if(!cname) return alert('Informe o nome do porte');
      const rp = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); if(!rp.some(x=>x.nome && x.nome.toLowerCase()===cname.toLowerCase())){ rp.push({ nome: cname, descricao: cdesc }); localStorage.setItem(STORAGE_KEY, JSON.stringify(rp)); porteItems = buildPorteList(); filterAndRender(); try{ channel?.postMessage({ action:'porte-added', nome:cname, descricao: cdesc }); }catch(e){} }
      backdrop.remove();
    });
  }

  function renamePorte(original, novo, descricao){
    if(!original || !novo) return;
    let rp = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    let changed = false;
    rp = rp.map(x=>{
      try{
        if((x.nome||'')===original || (x.originalNome||'')===original){
          changed = true;
          const updated = Object.assign({}, x, { nome: novo });
          if(typeof descricao !== 'undefined') updated.descricao = descricao;
          return updated;
        }
      }catch(e){ console.error(e); }
      return x;
    });
    const predef = window.portesPredefinidos||[];
    predef.forEach(p=>{
      if(p.nome===original){
        const exists = rp.some(x=>x.originalNome===p.nome||x.nome===p.nome||x.nome===novo);
        if(!exists){
          changed = true;
          rp.push({ originalNome:p.nome, nome:novo, descricao: (typeof descricao !== 'undefined' ? descricao : (p.descricao || '')) });
        }
      }
    });
    if(changed){
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rp));
      porteItems = buildPorteList();
      filterAndRender();
      try{ channel?.postMessage({ action:'porte-renamed', from: original, to: novo, descricao: descricao }); }catch(e){}
    }
  }

  function deletePorteImmediate(nome){ let rp = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); const idx = rp.findIndex(x => x.nome===nome || x.originalNome===nome); if(idx!==-1) rp.splice(idx,1); else { const isPredef = (window.portesPredefinidos||[]).some(p=>p.nome===nome); if(isPredef) rp.push({ originalNome: nome, deleted: true }); } localStorage.setItem(STORAGE_KEY, JSON.stringify(rp)); porteItems = buildPorteList(); filterAndRender(); try{ channel?.postMessage({ action:'deleted', originalNome: nome }); }catch(e){} }

  document.addEventListener('DOMContentLoaded', ()=>{
    porteItems = buildPorteList();
    const search = document.getElementById('searchInput');
    const addBtn = document.getElementById('addButton');
    const itemsSel = document.getElementById('itemsPerPage');
    const prev = document.getElementById('prevPage');
    const next = document.getElementById('nextPage');
    search?.addEventListener('input', ()=>{ currentPage=1; filterAndRender(); });
    addBtn?.addEventListener('click', ()=> openAddPanel());
    itemsSel?.addEventListener('change', (e)=>{ itemsPerPage = parseInt(e.target.value,10)||50; currentPage=1; filterAndRender(); });
    prev?.addEventListener('click', ()=>{ if(currentPage>1){ currentPage--; filterAndRender(); } });
    next?.addEventListener('click', ()=>{ currentPage++; filterAndRender(); });
    filterAndRender();
  });

  // expose debug
  window.porteTable = { refresh: ()=>{ porteItems = buildPorteList(); filterAndRender(); } };
})();