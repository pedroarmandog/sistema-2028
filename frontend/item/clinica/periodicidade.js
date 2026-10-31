// Copiado de frontend/dashboard.js - funcionalidades do menu e header

console.log('🚀 menu.js carregado (snippet do dashboard)');

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
});

// ========================================
// FUNCIONALIDADES DA PÁGINA DE PERIODICIDADE
// ========================================

// Estado local transitório (somente para renderização da lista carregada do backend)
let periodicidadeData = [];
let currentPage = 1;
let itemsPerPage = 40;
let searchTerm = '';
let filteredData = [];

// Carrega lista do backend
async function loadPeriodicidades() {
    try {
        const resp = await fetch('/api/periodicidades');
        if (!resp.ok) throw new Error('Falha ao carregar periodicidades');
        const data = await resp.json();
        // Garantir integridade dos dados
        periodicidadeData = (Array.isArray(data) ? data : []).filter(d => d && d.id != null && d.dias != null);
        // Normalizar tipo de ativo
        periodicidadeData = periodicidadeData.map(d => ({ ...d, ativo: d.ativo === true || d.ativo === '1' || d.ativo === 1 }));
        // Aplicar filtro de busca atual
        if (searchTerm) {
            filteredData = periodicidadeData.filter(item => item.descricao.toLowerCase().includes(searchTerm) || String(item.dias).includes(searchTerm));
        } else {
            filteredData = [...periodicidadeData];
        }
        currentPage = 1;
        renderizarTabelaPeriodicidade();
        atualizarPaginacaoPeriodicidade();
    } catch (err) {
        console.error('Erro ao carregar periodicidades:', err);
        showToast('Erro ao carregar periodicidades', 'error');
    }
}

function inicializarPeriodicidade() {
    console.log('📅 Inicializando página de Periodicidade');
    
    // Configurar event listeners
    configurarEventListenersPeriodicidade();
    
    // Carregar lista do backend
    loadPeriodicidades();
    
    console.log('✅ Página de Periodicidade inicializada com', periodicidadeData.length, 'registros');
}

function configurarEventListenersPeriodicidade() {
    const btnAdicionar = document.getElementById('btnAdicionarPeriodicidade');
    const btnPesquisar = document.getElementById('btnPesquisarPeriodicidade');
    const searchInput = document.getElementById('searchPeriodicidade');
    const btnPrevPage = document.getElementById('btnPrevPage');
    const btnNextPage = document.getElementById('btnNextPage');
    
    if (btnAdicionar) {
        console.log('Periodicidade: found btnAdicionarPeriodicidade, attaching listener');
        btnAdicionar.addEventListener('click', () => openPeriodicidadeModal());
    } else {
        console.warn('Periodicidade: btnAdicionarPeriodicidade not found during setup');
    }
    
    if (btnPesquisar) btnPesquisar.addEventListener('click', realizarPesquisaPeriodicidade);
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                realizarPesquisaPeriodicidade();
            }
        });
    }
    
    if (btnPrevPage) btnPrevPage.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderizarTabelaPeriodicidade(); atualizarPaginacaoPeriodicidade(); } });
    
    if (btnNextPage) btnNextPage.addEventListener('click', () => { const totalPages = Math.ceil(filteredData.length / itemsPerPage); if (currentPage < totalPages) { currentPage++; renderizarTabelaPeriodicidade(); atualizarPaginacaoPeriodicidade(); } });
    
    console.log('✅ Event listeners configurados');
}

// Fallback: listener delegado global para garantir abertura do modal mesmo se houver conflitos
document.addEventListener('click', function(e){
    try {
        if (e.target && e.target.closest && e.target.closest('#btnAdicionarPeriodicidade')) {
            console.log('Periodicidade: delegated click detected on add button');
            openPeriodicidadeModal();
        }
    } catch (err) { /* silencioso */ }
});

function realizarPesquisaPeriodicidade() {
    const searchInput = document.getElementById('searchPeriodicidade');
    if (searchInput) {
        searchTerm = searchInput.value.trim().toLowerCase();
        currentPage = 1;
        // Filtrar dados (a lista já vem do backend)
        if (searchTerm) filteredData = periodicidadeData.filter(item => (item.descricao || '').toLowerCase().includes(searchTerm) || String(item.dias).includes(searchTerm));
        else filteredData = [...periodicidadeData];
        renderizarTabelaPeriodicidade();
        atualizarPaginacaoPeriodicidade();
        console.log(`🔍 Pesquisando por: "${searchTerm}" - ${filteredData.length} resultados`);
    }
}

function renderizarTabelaPeriodicidade() {
    const tbody = document.getElementById('periodicidadeTableBody');
    
    if (!tbody) {
        console.error('❌ Tbody não encontrado');
        return;
    }
    
    // Limpar tabela
    tbody.innerHTML = '';
    
    // Calcular índices de paginação
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const dadosPaginados = filteredData.slice(startIndex, endIndex);
    
    // Renderizar linhas
    dadosPaginados.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.descricao}</td>
            <td>${item.dias}</td>
            <td>
                ${item.ativo ? '<i class="fas fa-check icon-ativo-periodicidade" title="Ativo"></i>' : '<i class="fas fa-times icon-inativo-periodicidade" title="Inativo"></i>'}
            </td>
            <td>
                <button class="btn-action-periodicidade btn-edit" onclick="editarPeriodicidade(${item.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
            <td>
                <button class="btn-action-periodicidade btn-delete" onclick="excluirPeriodicidade(${item.id})" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    console.log(`✅ Tabela renderizada com ${dadosPaginados.length} registros (página ${currentPage})`);
}

function atualizarPaginacaoPeriodicidade() {
    const paginationText = document.getElementById('paginationText');
    const btnPrevPage = document.getElementById('btnPrevPage');
    const btnNextPage = document.getElementById('btnNextPage');
    
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startItem = filteredData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredData.length);
    
    if (paginationText) {
        paginationText.textContent = `${startItem} - ${endItem} of ${filteredData.length}`;
    }
    
    if (btnPrevPage) {
        btnPrevPage.disabled = currentPage === 1;
    }
    
    if (btnNextPage) {
        btnNextPage.disabled = currentPage >= totalPages || filteredData.length === 0;
    }
}

function editarPeriodicidade(id) {
    // Buscar dados do backend por id e abrir modal
    (async () => {
        try {
            const resp = await fetch(`/api/periodicidades/${encodeURIComponent(id)}`);
            if (!resp.ok) throw new Error('Não encontrado');
            const data = await resp.json();
            openPeriodicidadeModal(data);
        } catch (err) {
            console.error('Erro ao buscar periodicidade:', err);
            showToast('Falha ao carregar dados da periodicidade', 'error');
        }
    })();
}

function excluirPeriodicidade(id) {
    const item = periodicidadeData.find(p => p.id === id);
    if (!item) return;
    showConfirmDeleteModal(`Deseja realmente excluir a periodicidade "${item.descricao}"?`, 'Excluir', async () => {
        try {
            const resp = await fetch(`/api/periodicidades/${encodeURIComponent(id)}`, { method: 'DELETE' });
            if (!resp.ok) throw new Error('Falha ao excluir');
            showToast('Periodicidade excluída', 'success');
            await loadPeriodicidades();
        } catch (err) {
            console.error('Erro ao excluir periodicidade:', err);
            showToast('Falha ao excluir periodicidade', 'error');
        }
    });
}

// Modal e helpers para adicionar/editar periodicidade
let editingPeriodicidadeId = null;
function openPeriodicidadeModal(item) {
    console.log('openPeriodicidadeModal -> item', item && item.id);
    editingPeriodicidadeId = item ? item.id : null;
    const backdrop = document.getElementById('periodModalBackdrop');
    const title = document.getElementById('periodModalTitle');
    const desc = document.getElementById('periodDescricao');
    const dias = document.getElementById('periodDias');
    const ativo = document.getElementById('periodAtivo');
    if (!backdrop) return;
    if (item) {
        title.textContent = 'Editar Periodicidade';
        desc.value = item.descricao || '';
        dias.value = item.dias || '';
        ativo.checked = !!item.ativo;
    } else {
        title.textContent = 'Nova Periodicidade';
        desc.value = '';
        dias.value = '';
        ativo.checked = true;
    }
    backdrop.classList.add('open');
}
 
function closePeriodicidadeModal() {
    const backdrop = document.getElementById('periodModalBackdrop');
    if (backdrop) backdrop.classList.remove('open');
    editingPeriodicidadeId = null;
}

// Wiring dos botões do modal (usar IDs existentes no HTML)
const btnSave = document.getElementById('btnSavePeriodicidade');
const btnCancel = document.getElementById('btnCancelPeriodicidade');
const btnCloseX = document.getElementById('periodModalClose');

if (btnSave) {
    btnSave.addEventListener('click', async function(){
        const desc = document.getElementById('periodDescricao').value.trim();
        const dias = parseInt(document.getElementById('periodDias').value, 10) || 0;
        const ativo = document.getElementById('periodAtivo').checked;
        if (!desc) { showToast('Preencha a descrição', 'error'); return; }
        if (!dias || dias <= 0) { showToast('Informe a quantidade de dias', 'error'); return; }

        try {
            if (editingPeriodicidadeId) {
                const resp = await fetch(`/api/periodicidades/${encodeURIComponent(editingPeriodicidadeId)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ descricao: desc, dias: dias, ativo: ativo })
                });
                if (!resp.ok) throw new Error('Falha ao atualizar');
                showToast('Periodicidade atualizada', 'success');
            } else {
                const resp = await fetch('/api/periodicidades', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ descricao: desc, dias: dias, ativo: ativo })
                });
                if (!resp.ok) {
                    const txt = await resp.text().catch(()=>null);
                    throw new Error(txt || 'Falha ao criar');
                }
                showToast('Periodicidade criada', 'success');
            }
            await loadPeriodicidades();
            closePeriodicidadeModal();
        } catch (err) {
            console.error('Erro ao salvar periodicidade:', err);
            showToast('Falha ao salvar periodicidade', 'error');
        }
    });
}

if (btnCancel) btnCancel.addEventListener('click', closePeriodicidadeModal);
if (btnCloseX) btnCloseX.addEventListener('click', closePeriodicidadeModal);

// Reutiliza o confirm modal simples usado em outras páginas
function showConfirmDeleteModal(message, confirmLabel, onConfirm) {
    const backdrop = document.createElement('div');
    backdrop.className = 'confirm-backdrop';
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    modal.style.maxWidth = '520px';
    modal.style.padding = '18px';
    modal.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
          <div style="font-size:22px;color:#d9534f"><i class="fas fa-exclamation-circle"></i></div>
          <h4 style="margin:0">Confirmação</h4>
        </div>
        <p style="color:#333;margin-bottom:18px">${message}</p>
                <div style="display:flex;justify-content:flex-end;gap:10px" class="confirm-actions">
                    <button class="btn-cancel" id="__confirm_cancel">Cancelar</button>
                    <button class="btn-confirm" id="__confirm_ok">${confirmLabel || 'Confirmar'}</button>
                </div>
    `;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    function cleanup(){ try{ backdrop.remove(); }catch(e){} }

    modal.querySelector('#__confirm_cancel').addEventListener('click', () => { cleanup(); });
    modal.querySelector('#__confirm_ok').addEventListener('click', async () => {
        try { await onConfirm(); } catch (e) { console.error(e); }
        cleanup();
    });
}

// Toast helper (simples)
function showToast(message, type) {
    const cName = '__period_toast_container';
    let c = document.querySelector(`.${cName}`);
    if(!c){ c = document.createElement('div'); c.className = cName; c.style.position='fixed'; c.style.top='18px'; c.style.right='18px'; c.style.zIndex=99999; document.body.appendChild(c);} 
    const t = document.createElement('div'); t.textContent = message; t.style.background = (type==='error')? '#f8d7da' : '#d1e7dd'; t.style.color = (type==='error')? '#842029' : '#0f5132'; t.style.padding='10px 14px'; t.style.borderRadius='8px'; t.style.marginTop='8px'; t.style.boxShadow='0 8px 24px rgba(2,16,26,0.12)'; c.appendChild(t);
    setTimeout(()=>{ try{ t.remove(); }catch(e){} }, 4000);
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarPeriodicidade);
} else {
    inicializarPeriodicidade();
}
