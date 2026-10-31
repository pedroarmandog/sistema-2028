// Copiado de frontend/dashboard.js - funcionalidades do menu e header

console.log('🚀 menu.js carregado (snippet do dashboard)');

function escapeHtml(str){ if(str === null || str === undefined) return ''; return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

function detectarIDsDuplicados() {
    const idsParaVerificar = [
        'clienteMenuItem', 'clienteSubmenu',
        'itemMenuItem', 'itemSubmenu',
        'petMenuItem', 'petSubmenu', 
        'atendimentoMenuItem', 'atendimentoSubmenu',
        'financeiroMenuItem', 'financeiroSubmenu',
        'configuracaoMenuItem', 'configuracaoSubmenu',
        'painelMenuItem', 'painelSubmenu',
        'comprasMenuItem', 'comprasSubmenu'
    ];
    
    let problemas = [];
    idsParaVerificar.forEach(id => {
        const elementos = document.querySelectorAll(`#${id}`);
        if (elementos.length > 1) {
            problemas.push(`ID '${id}' duplicado ${elementos.length} vezes`);
            console.warn(`⚠️  ID DUPLICADO: ${id} (${elementos.length} elementos)`);
        }
    });
    
    if (problemas.length > 0) {
        console.error('🚨 PROBLEMAS DE IDs DUPLICADOS DETECTADOS:');
        problemas.forEach(p => console.error(`   - ${p}`));
        return false;
    }
    
    console.log('✅ Verificação de IDs: Nenhum duplicado encontrado');
    return true;
}

function configurarDropdownInicioRapido() {
    if (window.dropdownConfigurado) return;
    const dropdownBtn = document.getElementById('inicioRapidoBtn');
    const dropdown = document.querySelector('.dropdown');
    if (dropdownBtn && dropdown) {
        dropdownBtn.addEventListener('click', function(e) {
            e.preventDefault(); e.stopPropagation();
            const wasOpen = dropdown.classList.contains('open');
            dropdown.classList.toggle('open');
        });

        document.addEventListener('click', function(e) {
            if (!dropdown.contains(e.target)) {
                if (dropdown.classList.contains('open')) dropdown.classList.remove('open');
            }
        });

        window.dropdownConfigurado = true;
    }
}

function salvarEstadoSubmenu(submenuId, isOpen) {
    try {
        const estadoSubmenus = JSON.parse(localStorage.getItem('estadoSubmenus') || '{}');
        estadoSubmenus[submenuId] = isOpen;
        localStorage.setItem('estadoSubmenus', JSON.stringify(estadoSubmenus));
    } catch (error) { console.error(error); }
}

function obterEstadoSubmenu(submenuId) {
    try { return JSON.parse(localStorage.getItem('estadoSubmenus') || '{}')[submenuId] || false; } catch (e) { return false; }
}

function configurarPersistenciaSubmenu(menuItemId, submenuId, submenuName) {
    const menuItems = document.querySelectorAll(`#${menuItemId}`);
    const submenus = document.querySelectorAll(`#${submenuId}`);
    if (menuItems.length > 1) {
        for (let i = 1; i < menuItems.length; i++) {
            const duplicateElement = menuItems[i].closest('.nav-item-with-submenu');
            if (duplicateElement) duplicateElement.remove();
        }
    }
    if (submenus.length > 1) { for (let i = 1; i < submenus.length; i++) submenus[i].remove(); }

    const menuItem = document.getElementById(menuItemId);
    const submenu = document.getElementById(submenuId);
    const menuContainer = menuItem?.parentElement;
    if (menuItem && submenu && menuContainer) {
        if (menuItem.getAttribute('data-listener-added')) return;
        menuItem.addEventListener('click', function(e) {
            e.preventDefault(); e.stopPropagation();
            if (e.target.closest('.submenu-item')) return;
            fecharOutrosSubmenus(submenuName);
            const isNowOpen = !menuContainer.classList.contains('open');
            menuContainer.classList.toggle('open');
            submenu.classList.toggle('open');
            salvarEstadoSubmenu(submenuName, isNowOpen);
        });

        const submenuItems = submenu.querySelectorAll('.submenu-item[href]');
        submenuItems.forEach(item => item.addEventListener('click', function(e) { e.stopPropagation(); setTimeout(()=>{ menuContainer.classList.remove('open'); submenu.classList.remove('open'); salvarEstadoSubmenu(submenuName, false); }, 150); }));
        const submenuItemsSemHref = submenu.querySelectorAll('.submenu-item:not([href])');
        submenuItemsSemHref.forEach(item => item.addEventListener('click', function(e) { e.stopPropagation(); menuContainer.classList.remove('open'); submenu.classList.remove('open'); salvarEstadoSubmenu(submenuName, false); }));

        menuItem.setAttribute('data-listener-added', 'true');
    }
}

function fecharOutrosSubmenus(submenuAtual) {
    const todosSubmenus = [
        { container: 'clienteMenuItem', submenu: 'clienteSubmenu', id: 'cliente' },
        { container: 'itemMenuItem', submenu: 'itemSubmenu', id: 'item' },
        { container: 'petMenuItem', submenu: 'petSubmenu', id: 'pet' },
        { container: 'atendimentoMenuItem', submenu: 'atendimentoSubmenu', id: 'atendimento' },
        { container: 'financeiroMenuItem', submenu: 'financeiroSubmenu', id: 'financeiro' },
        { container: 'configuracaoMenuItem', submenu: 'configuracaoSubmenu', id: 'configuracao' },
        { container: 'painelMenuItem', submenu: 'painelSubmenu', id: 'painel' },
        { container: 'comprasMenuItem', submenu: 'comprasSubmenu', id: 'compras' }
    ];
    todosSubmenus.forEach(({ container, submenu, id }) => {
        if (id !== submenuAtual) {
            const containerElement = document.getElementById(container)?.parentElement;
            const submenuElement = document.getElementById(submenu);
            if (containerElement && submenuElement) {
                if (containerElement.classList.contains('open')) { containerElement.classList.remove('open'); submenuElement.classList.remove('open'); salvarEstadoSubmenu(id, false); }
            }
        }
    });
}

function limparEstadoSubmenus() { try { localStorage.removeItem('estadoSubmenus'); } catch(e){} }

function destacarSecaoAtiva() {
    const paginaAtual = window.location.pathname.split('/').pop() || 'index.html';
    const mapeamentoPaginas = {
        'clientes.html': 'clienteMenuItem', 'novo-cliente.html': 'clienteMenuItem', 'grupos-clientes.html': 'clienteMenuItem', 'meus-clientes.html': 'clienteMenuItem',
        'meus-itens.html': 'itemMenuItem', 'novo-item.html': 'itemMenuItem', 'agrupamento.html': 'itemMenuItem', 'marca.html': 'itemMenuItem', 'unidade.html': 'itemMenuItem', 'descontos-item.html': 'itemMenuItem', 'comissao.html': 'itemMenuItem', 'etiquetas.html': 'itemMenuItem', 'tributacao.html': 'itemMenuItem', 'estoque.html': 'itemMenuItem', 'clinica.html': 'itemMenuItem', 'manutencao-produtos.html': 'itemMenuItem', 'controle-validade.html': 'itemMenuItem',
        'agendamentos-novo.html': 'atendimentoMenuItem', 'agendamentos.html': 'atendimentoMenuItem', 'minha-agenda.html': 'atendimentoMenuItem',
        'meus-pets.html': 'petMenuItem', 'novo-pet.html': 'petMenuItem', 'dashboard.html': 'dashboard'
    };
    const itemParaDestacar = mapeamentoPaginas[paginaAtual];
    if (itemParaDestacar && itemParaDestacar !== 'dashboard') {
        const menuItem = document.getElementById(itemParaDestacar);
        if (menuItem) {
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            menuItem.classList.add('active');
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    detectarIDsDuplicados();
    limparEstadoSubmenus();

    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    if (menuToggle && sidebar && mainContent) {
        if (!menuToggle.hasAttribute('data-toggle-configured')) {
            menuToggle.setAttribute('data-toggle-configured', 'true');
            menuToggle.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); sidebar.classList.toggle('collapsed'); mainContent.classList.toggle('sidebar-collapsed'); });
        }
    }

    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            if (sidebar && mainContent && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.add('collapsed'); mainContent.classList.add('sidebar-collapsed');
            }
        }
    });

    configurarDropdownInicioRapido();
    configurarPersistenciaSubmenu('clienteMenuItem', 'clienteSubmenu', 'cliente');
    configurarPersistenciaSubmenu('itemMenuItem', 'itemSubmenu', 'item');
    configurarPersistenciaSubmenu('painelMenuItem', 'painelSubmenu', 'painel');
    configurarPersistenciaSubmenu('petMenuItem', 'petSubmenu', 'pet');
    configurarPersistenciaSubmenu('atendimentoMenuItem', 'atendimentoSubmenu', 'atendimento');
    configurarPersistenciaSubmenu('financeiroMenuItem', 'financeiroSubmenu', 'financeiro');
    configurarPersistenciaSubmenu('configuracaoMenuItem', 'configuracaoSubmenu', 'configuracao');
    configurarPersistenciaSubmenu('comprasMenuItem', 'comprasSubmenu', 'compras');
    destacarSecaoAtiva();
});

// ---- Modais customizados para Unidade (substituem prompt/confirm nativos) ----
function openConfirmModal(message, onConfirm) {
    try {
        document.querySelectorAll('.qc-overlay, .modal-overlay').forEach(e => e.remove());
        const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
        overlay.style.position = 'fixed'; overlay.style.left = '0'; overlay.style.top = '0'; overlay.style.width = '100%'; overlay.style.height = '100%'; overlay.style.background = 'rgba(0,0,0,0.35)'; overlay.style.display = 'flex'; overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center'; overlay.style.zIndex = '10000';
        const modal = document.createElement('div'); modal.className = 'modal-box modal-centered';
        modal.style.background = '#fff'; modal.style.borderRadius = '8px'; modal.style.boxShadow = '0 8px 24px rgba(19,24,28,0.12)'; modal.style.padding = '20px'; modal.style.maxWidth = '520px'; modal.style.width = 'calc(100% - 40px)';
        modal.innerHTML = `
            <div style="font-weight:600;margin-bottom:10px">Confirmação</div>
            <div style="margin-bottom:18px">${(message||'')}</div>
            <div style="text-align:right;display:flex;gap:8px;justify-content:flex-end">
                <button class="qc-cancel" style="padding:8px 12px;border-radius:6px;border:1px solid #e6e9eb;background:#fff;cursor:pointer">Cancelar</button>
                <button class="qc-confirm" style="padding:8px 12px;border-radius:6px;border:none;background:#dc3545;color:#fff;cursor:pointer">Excluir</button>
            </div>
        `;
        overlay.appendChild(modal); document.body.appendChild(overlay);
        const btnCancel = modal.querySelector('.qc-cancel');
        const btnConfirm = modal.querySelector('.qc-confirm');
        function close(){ overlay.remove(); }
        btnCancel.addEventListener('click', function(e){ e.preventDefault(); close(); });
        btnConfirm.addEventListener('click', function(e){ e.preventDefault(); try{ if (typeof onConfirm === 'function') onConfirm(); } catch(err){ console.debug(err); } close(); });
        overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
    } catch(e){ console.debug('openConfirmModal failed', e); }
}

function openUnidadeModal(initial, onSave) {
    try {
        document.querySelectorAll('.qc-overlay, .modal-overlay').forEach(e => e.remove());
        const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
        overlay.style.position = 'fixed'; overlay.style.left = '0'; overlay.style.top = '0'; overlay.style.width = '100%'; overlay.style.height = '100%'; overlay.style.background = 'rgba(0,0,0,0.35)'; overlay.style.display = 'flex'; overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center'; overlay.style.zIndex = '10000';
        const modal = document.createElement('div'); modal.className = 'modal-box modal-centered';
        modal.style.background = '#fff'; modal.style.borderRadius = '8px'; modal.style.boxShadow = '0 8px 24px rgba(19,24,28,0.12)'; modal.style.padding = '18px'; modal.style.maxWidth = '520px'; modal.style.width = 'calc(100% - 40px)';

        const desc = initial && initial.descricao ? initial.descricao : '';
        const uni = initial && initial.unidade ? initial.unidade : '';
        const pes = initial && initial.pesavel ? true : false;
        const atv = initial && (initial.ativo === false ? false : true);

        modal.innerHTML = `
            <div style="font-weight:600;margin-bottom:8px">Descrição:</div>
            <input id="modal-unidade-descricao" type="text" style="width:100%;padding:10px;border:1px solid #e6e9eb;border-radius:6px;margin-bottom:10px" value="${escapeHtml(desc)}" />
            <div style="display:flex;gap:12px;margin-bottom:10px">
                <div style="flex:1">
                    <div style="font-weight:600;margin-bottom:6px">Unidade (sigla)</div>
                    <input id="modal-unidade-sigla" type="text" style="width:100%;padding:10px;border:1px solid #e6e9eb;border-radius:6px" value="${escapeHtml(uni)}" />
                </div>
                <div style="width:140px;display:flex;flex-direction:column;gap:8px;justify-content:center">
                    <label style="display:flex;align-items:center;gap:8px"><input id="modal-unidade-pesavel" type="checkbox" ${pes? 'checked':''} /> Pesável</label>
                    <label style="display:flex;align-items:center;gap:8px"><input id="modal-unidade-ativo" type="checkbox" ${atv? 'checked':''} /> Ativo</label>
                </div>
            </div>
            <div style="text-align:right;display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
                <button class="qc-cancel" style="padding:8px 12px;border-radius:6px;border:1px solid #e6e9eb;background:#fff; cursor:pointer">Cancelar</button>
                <button class="qc-save" style="padding:8px 12px;border-radius:6px;border:none;background:#28a745;color:#fff;cursor:pointer">OK</button>
            </div>
        `;

        overlay.appendChild(modal); document.body.appendChild(overlay);
        const btnCancel = modal.querySelector('.qc-cancel');
        const btnSave = modal.querySelector('.qc-save');
        const inputDesc = modal.querySelector('#modal-unidade-descricao');
        const inputSig = modal.querySelector('#modal-unidade-sigla');
        const inputPes = modal.querySelector('#modal-unidade-pesavel');
        const inputAtv = modal.querySelector('#modal-unidade-ativo');

        function close(){ overlay.remove(); }
        btnCancel.addEventListener('click', function(e){ e.preventDefault(); close(); });
        btnSave.addEventListener('click', function(e){ e.preventDefault(); const data = { descricao: (inputDesc.value||'').trim(), unidade: (inputSig.value||'').trim(), pesavel: !!inputPes.checked, ativo: !!inputAtv.checked }; try{ if (typeof onSave === 'function') onSave(data); } catch(err){ console.debug(err); } close(); });
        setTimeout(()=>{ if (inputDesc) inputDesc.focus(); },50);
        overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
    } catch(e){ console.debug('openUnidadeModal failed', e); }
}

// Funções de navegação rápida (shims)
function novoAtendimento(){ window.location.href = '/agendamentos-novo.html'; closeDropdown(); }
function novoPet(){ window.location.href = '/pets/cadastro-pet.html'; closeDropdown(); }
function novoCliente(){ window.location.href = '/clientes.html'; closeDropdown(); }
function novoContrato(){ window.location.href = '/contrato-novo.html'; closeDropdown(); }
function novaVenda(){ window.location.href = '/venda-nova.html'; closeDropdown(); }
function novaContaPagar(){ window.location.href = '/contas-pagar-nova.html'; closeDropdown(); }
function closeDropdown(){ const dropdown = document.querySelector('.dropdown'); if (dropdown) dropdown.classList.remove('open'); }

// Configurar submenu lateral para Caixa
function configurarSubmenuLateralCaixa() {
    console.log('🔍 Iniciando configuração do submenu lateral Caixa...');
    
    const caixaSubmenuItem = document.getElementById('caixaSubmenuItem');
    const caixaLateralSubmenu = document.getElementById('caixaLateralSubmenu');
    const submenuItemWithLateral = document.querySelector('.submenu-item-with-lateral');
    
    console.log('🔍 Elementos encontrados:');
    console.log('- caixaSubmenuItem:', caixaSubmenuItem);
    console.log('- caixaLateralSubmenu:', caixaLateralSubmenu);
    console.log('- submenuItemWithLateral:', submenuItemWithLateral);
    
    if (caixaSubmenuItem && caixaLateralSubmenu && submenuItemWithLateral) {
        console.log('✅ Configurando submenu lateral do Caixa...');
        
        let isSubmenuVisible = false;
        
        // Função para mostrar submenu
        const showSubmenu = () => {
            console.log('📤 Mostrando submenu lateral');
            caixaLateralSubmenu.style.opacity = '1';
            caixaLateralSubmenu.style.visibility = 'visible';
            caixaLateralSubmenu.style.transform = 'translateX(0)';
            isSubmenuVisible = true;
        };
        
        // Função para esconder submenu
        const hideSubmenu = () => {
            console.log('📥 Escondendo submenu lateral');
            caixaLateralSubmenu.style.opacity = '0';
            caixaLateralSubmenu.style.visibility = 'hidden';
            caixaLateralSubmenu.style.transform = 'translateX(-10px)';
            isSubmenuVisible = false;
        };
        
        // Configurar hover no container principal
        submenuItemWithLateral.addEventListener('mouseenter', function() {
            console.log('🎯 Mouse entrou no container do Caixa');
            showSubmenu();
        });
        
        submenuItemWithLateral.addEventListener('mouseleave', function() {
            console.log('🎯 Mouse saiu do container do Caixa');
            setTimeout(hideSubmenu, 100);
        });
        
        // Configurar hover no submenu lateral
        caixaLateralSubmenu.addEventListener('mouseenter', function() {
            console.log('🎯 Mouse entrou no submenu lateral');
            showSubmenu();
        });
        
        caixaLateralSubmenu.addEventListener('mouseleave', function() {
            console.log('🎯 Mouse saiu do submenu lateral');
            hideSubmenu();
        });
        
        // Adicionar event listeners para os itens do submenu lateral
        const lateralItems = caixaLateralSubmenu.querySelectorAll('.lateral-submenu-item');
        console.log(`🔍 Encontrados ${lateralItems.length} itens no submenu lateral`);
        
        lateralItems.forEach((item, index) => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const texto = this.textContent.trim();
                console.log(`🚀 Clique em: ${texto}`);
                
                // Aqui você pode adicionar navegação específica para cada item
                switch(texto) {
                    case 'Abertura/Fechamento':
                        alert('Navegando para Abertura/Fechamento de Caixa');
                        // window.location.href = '/caixa/abertura-fechamento.html';
                        break;
                    case 'Suprimento/Sangria':
                        alert('Navegando para Suprimento/Sangria');
                        // window.location.href = '/caixa/suprimento-sangria.html';
                        break;
                    case 'Rel. Demonstrativo de caixa':
                        alert('Navegando para Relatório Demonstrativo de Caixa');
                        // window.location.href = '/caixa/relatorio-demonstrativo.html';
                        break;
                }
                
                hideSubmenu();
            });
            
            console.log(`✅ Configurado evento click para item ${index + 1}: ${item.textContent.trim()}`);
        });
        
        console.log('✅ Submenu lateral do Caixa configurado com sucesso!');
    } else {
        console.error('❌ Elementos do submenu lateral Caixa não encontrados');
        console.log('- Verifique se os IDs caixaSubmenuItem e caixaLateralSubmenu existem no HTML');
        console.log('- Verifique se a classe .submenu-item-with-lateral existe no HTML');
    }
}

// Adicionar configuração do submenu lateral ao DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    // Aguardar um pouco para garantir que outros elementos carregaram
    setTimeout(() => {
        configurarSubmenuLateralCaixa();
    }, 200);
    
    // Inicializar funcionalidades da página de Unidade
    inicializarUnidade();
});

// ========================================
// UNIDADE DE MEDIDA - FUNCIONALIDADES
// ========================================

// Lista de unidades padrão (fallback)
let unidadesPadrao = [
    { descricao: 'Brinquedo', unidade: '36', pesavel: false, ativo: true },
    { descricao: 'Kilo', unidade: 'KG', pesavel: true, ativo: true },
    { descricao: 'Mililitro', unidade: 'ml', pesavel: false, ativo: true },
    { descricao: 'Unidade', unidade: 'UN', pesavel: false, ativo: true }
];

// Estado da aplicação
let unidadesAtual = [...unidadesPadrao];
let paginaAtual = 1;
let itensPorPagina = 50;

// API helpers
function slugify(text){
    return (text||'').toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}

function apiFetchJson(url, opts){
    return fetch(url, opts).then(r=>{
        if(!r.ok) return r.text().then(t=>{ throw new Error(t||r.statusText) });
        return r.json().catch(()=>null);
    });
}

function fetchUnidadesAPI(){
    return apiFetchJson('/api/unidades').catch(err=>{ console.debug('fetchUnidadesAPI error', err); return []; });
}

function createUnidadeAPI(payload){
    return apiFetchJson('/api/unidades', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
}

function updateUnidadeAPI(slug, payload){
    return apiFetchJson(`/api/unidades/${encodeURIComponent(slug)}`, { method: 'PUT', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
}

function deleteUnidadeAPI(slug){
    return apiFetchJson(`/api/unidades/${encodeURIComponent(slug)}`, { method: 'DELETE' });
}

function inicializarUnidade() {
    console.log('🔧 Inicializando funcionalidades de Unidade...');
    
    // Carregar unidades do servidor
    fetchUnidadesAPI().then(list => {
        if (Array.isArray(list) && list.length) {
            unidadesPadrao.length = 0;
            list.forEach(u => unidadesPadrao.push(u));
            unidadesAtual = [...unidadesPadrao];
        }
        renderizarUnidades();
    }).catch(err => {
        console.debug('Falha ao buscar unidades, usando local', err);
        renderizarUnidades();
    }).finally(()=>{
        configurarBotaoAdicionar();
        configurarPesquisa();
    });
    
    // Configurar paginação
    configurarPaginacao();
    
    console.log('✅ Funcionalidades de Unidade inicializadas!');
}

// Renderizar unidades na tabela
function renderizarUnidades() {
    const tbody = document.getElementById('unidadesTableBody');
    
    if (!tbody) {
        console.error('❌ Elemento unidadesTableBody não encontrado');
        return;
    }
    
    // Calcular itens da página atual
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const unidadesPagina = unidadesAtual.slice(inicio, fim);
    
    // Limpar tabela
    tbody.innerHTML = '';
    
    // Adicionar unidades
    unidadesPagina.forEach((unidade, index) => {
        const tr = document.createElement('tr');
        
        const pesavelIcon = unidade.pesavel 
            ? '<i class="fas fa-check status-icon check"></i>' 
            : '<i class="fas fa-times status-icon times"></i>';
            
        const ativoIcon = unidade.ativo 
            ? '<i class="fas fa-check status-icon check"></i>' 
            : '<i class="fas fa-times status-icon times"></i>';
        
        tr.innerHTML = `
            <td class="descricao-cell">${unidade.descricao}</td>
            <td class="unidade-cell">${unidade.unidade}</td>
            <td class="status-cell">${pesavelIcon}</td>
            <td class="status-cell">${ativoIcon}</td>
            <td class="editar-cell">
                <button class="btn-icon btn-editar" title="Editar" data-index="${inicio + index}">
                    <i class="fas fa-pen"></i>
                </button>
            </td>
            <td class="excluir-cell">
                <button class="btn-icon btn-excluir" title="Excluir" data-index="${inicio + index}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // Configurar botões de ação
    configurarBotoesAcao();
    
    // Atualizar informações de paginação
    atualizarPaginacao();
    
    console.log(`✅ ${unidadesPagina.length} unidades renderizadas (página ${paginaAtual})`);
}

// Configurar botão Adicionar Unidade
function configurarBotaoAdicionar() {
    const btnAdicionar = document.getElementById('btnAdicionarUnidade');
    
    if (btnAdicionar) {
        btnAdicionar.addEventListener('click', function() {
            console.log('➕ Adicionar nova unidade');
            openUnidadeModal({}, function(data){
                if (!data || !data.descricao) return;
                // Salvar no servidor
                createUnidadeAPI({ descricao: data.descricao, unidade: data.unidade, pesavel: data.pesavel, ativo: data.ativo })
                    .then(created => {
                        console.log('✅ Unidade criada no servidor:', created);
                        return fetchUnidadesAPI();
                    }).then(list => {
                        unidadesPadrao.length = 0;
                        list.forEach(u=>unidadesPadrao.push(u));
                        unidadesAtual = [...unidadesPadrao];
                        paginaAtual = 1;
                        renderizarUnidades();
                    }).catch(err => {
                        console.error('Erro ao criar unidade:', err);
                        alert('Erro ao salvar unidade: ' + (err.message || err));
                    });
            });
        });
        
        console.log('✅ Botão Adicionar Unidade configurado');
    }
}

// Configurar botões de Editar e Excluir
function configurarBotoesAcao() {
    // Botões de Editar
    const botoesEditar = document.querySelectorAll('.btn-editar');
    botoesEditar.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const index = parseInt(this.dataset.index);
            const unidade = unidadesAtual[index];
            
            console.log(`✏️ Editar: ${unidade.descricao}`);
            // usar modal customizado para edição
            openUnidadeModal(unidade, function(data){
                if (!data || !data.descricao) return;
                const idOrSlug = unidade.id || unidade.slug || slugify(unidade.descricao);
                updateUnidadeAPI(idOrSlug, { descricao: data.descricao, unidade: data.unidade, pesavel: data.pesavel, ativo: data.ativo })
                    .then(updated => {
                        console.log('✅ Unidade atualizada no servidor:', updated);
                        return fetchUnidadesAPI();
                    }).then(list => {
                        unidadesPadrao.length = 0;
                        list.forEach(u=>unidadesPadrao.push(u));
                        unidadesAtual = [...unidadesPadrao];
                        paginaAtual = 1;
                        renderizarUnidades();
                    }).catch(err => {
                        console.error('Erro ao atualizar unidade:', err);
                        alert('Erro ao atualizar unidade: ' + (err.message || err));
                    });
            });
        });
    });
    
    // Botões de Excluir
    const botoesExcluir = document.querySelectorAll('.btn-excluir');
    botoesExcluir.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const index = parseInt(this.dataset.index);
            const unidade = unidadesAtual[index];
            openConfirmModal(`Deseja realmente excluir a unidade "${unidade.descricao}"?`, function(){
                console.log(`🗑️ Excluir: ${unidade.descricao}`);
                const idOrSlug = unidade.id || unidade.slug || slugify(unidade.descricao);
                deleteUnidadeAPI(idOrSlug).then(res => {
                    console.log('✅ Unidade removida no servidor', res);
                    return fetchUnidadesAPI();
                }).then(list => {
                    unidadesPadrao.length = 0;
                    list.forEach(u=>unidadesPadrao.push(u));
                    unidadesAtual = [...unidadesPadrao];
                    paginaAtual = 1;
                    renderizarUnidades();
                }).catch(err => {
                    console.error('Erro ao remover unidade:', err);
                    alert('Erro ao excluir unidade: ' + (err.message || err));
                });
            });
        });
    });
}

// Configurar pesquisa
function configurarPesquisa() {
    const inputPesquisa = document.getElementById('inputPesquisaUnidade');
    const btnPesquisar = document.getElementById('btnPesquisar');
    
    function realizarPesquisa() {
        const termo = inputPesquisa.value.toLowerCase().trim();
        console.log(`🔍 Pesquisando: "${termo}"`);
        
        if (termo === '') {
            // Restaurar todas as unidades
            unidadesAtual = [...unidadesPadrao];
        } else {
            // Filtrar unidades
            unidadesAtual = unidadesPadrao.filter(unidade => 
                unidade.descricao.toLowerCase().includes(termo) ||
                unidade.unidade.toLowerCase().includes(termo)
            );
        }
        
        // Voltar para página 1
        paginaAtual = 1;
        
        // Re-renderizar
        renderizarUnidades();
        
        console.log(`✅ ${unidadesAtual.length} unidades encontradas`);
    }
    
    if (btnPesquisar) {
        btnPesquisar.addEventListener('click', realizarPesquisa);
    }
    
    if (inputPesquisa) {
        inputPesquisa.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                realizarPesquisa();
            }
        });
        
        // Pesquisa em tempo real (filtra a tabela enquanto digita)
        inputPesquisa.addEventListener('input', debounce(function() {
            realizarPesquisa();
        }, 150));
    }
    
    console.log('✅ Pesquisa configurada');
}

// Debounce helper para pesquisa em tempo real
function debounce(fn, wait){ let t; return function(){ const ctx = this; const args = arguments; clearTimeout(t); t = setTimeout(function(){ fn.apply(ctx, args); }, wait); }; }

// Configurar paginação
function configurarPaginacao() {
    const btnPrevPage = document.getElementById('btnPrevPage');
    const btnNextPage = document.getElementById('btnNextPage');
    
    if (btnPrevPage) {
        btnPrevPage.addEventListener('click', function() {
            if (paginaAtual > 1) {
                paginaAtual--;
                renderizarUnidades();
                console.log(`⬅️ Página ${paginaAtual}`);
            }
        });
    }
    
    if (btnNextPage) {
        btnNextPage.addEventListener('click', function() {
            const totalPaginas = Math.ceil(unidadesAtual.length / itensPorPagina);
            if (paginaAtual < totalPaginas) {
                paginaAtual++;
                renderizarUnidades();
                console.log(`➡️ Página ${paginaAtual}`);
            }
        });
    }
    
    console.log('✅ Paginação configurada');
}

// Atualizar informações de paginação
function atualizarPaginacao() {
    const pageInfo = document.getElementById('pageInfo');
    const btnPrevPage = document.getElementById('btnPrevPage');
    const btnNextPage = document.getElementById('btnNextPage');
    
    const totalItens = unidadesAtual.length;
    const totalPaginas = Math.ceil(totalItens / itensPorPagina);
    const inicio = (paginaAtual - 1) * itensPorPagina + 1;
    const fim = Math.min(paginaAtual * itensPorPagina, totalItens);
    
    if (pageInfo) {
        pageInfo.textContent = `${inicio} - ${fim} de ${totalItens}`;
    }
    
    if (btnPrevPage) {
        btnPrevPage.disabled = paginaAtual === 1;
    }
    
    if (btnNextPage) {
        btnNextPage.disabled = paginaAtual >= totalPaginas || totalItens === 0;
    }
}

