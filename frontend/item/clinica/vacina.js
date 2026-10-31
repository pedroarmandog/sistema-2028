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
// FUNCIONALIDADES DA PÁGINA DE VACINAS
// ========================================

// Estado local mínimo: apenas paginação e controle de edição
let currentPage = 1;
let itemsPerPage = 40;
let searchTerm = '';
let filteredData = [];
let editingVacinaId = null; // null => criando

async function loadVacinas() {
    try {
        const q = searchTerm ? `?q=${encodeURIComponent(searchTerm)}` : '';
        const resp = await fetch(`/api/vacinas${q}`);
        if (!resp.ok) throw new Error('Falha ao buscar vacinas');
        const json = await resp.json();
        // Mapear para uso de frontend (nome/descritivo)
        filteredData = Array.isArray(json) ? json.map(v => ({ id: v.id, nome: v.nome || v.descricao || '', raw: v })) : [];
        currentPage = 1;
        renderizarTabelaVacinas();
        atualizarPaginacao();
        console.log('🔁 Lista de vacinas carregada:', filteredData.length);
    } catch (err) {
        console.error('Erro carregando vacinas:', err);
        showToast('Falha ao carregar vacinas', 'error');
    }
}

function inicializarVacinas() {
    console.log('💉 Inicializando página de Vacinas');
    
    // Configurar event listeners
    configurarEventListenersVacinas();
    
    // Carregar lista do backend
    loadVacinas();
    
    console.log('✅ Página de Vacinas inicializada');
}

function configurarEventListenersVacinas() {
    const btnAdicionar = document.getElementById('btnAdicionarVacina');
    const btnPesquisar = document.getElementById('btnPesquisarVacina');
    const searchInput = document.getElementById('searchVacinas');
    const itemsPerPageSelect = document.getElementById('itemsPerPage');
    const btnPrevPage = document.getElementById('btnPrevPage');
    const btnNextPage = document.getElementById('btnNextPage');
    
    if (btnAdicionar) {
        btnAdicionar.addEventListener('click', () => {
            openVacinaModal();
        });
    }
    
    if (btnPesquisar) {
        btnPesquisar.addEventListener('click', realizarPesquisaVacinas);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                realizarPesquisaVacinas();
            }
        });
    }
    
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', (e) => {
            itemsPerPage = parseInt(e.target.value);
            currentPage = 1;
            renderizarTabelaVacinas();
            atualizarPaginacao();
        });
    }
    
    if (btnPrevPage) {
        btnPrevPage.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderizarTabelaVacinas();
                atualizarPaginacao();
            }
        });
    }
    
    if (btnNextPage) {
        btnNextPage.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredData.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderizarTabelaVacinas();
                atualizarPaginacao();
            }
        });
    }
    
    console.log('✅ Event listeners configurados');
}

function realizarPesquisaVacinas() {
    const searchInput = document.getElementById('searchVacinas');
    if (searchInput) {
        searchTerm = searchInput.value.trim();
        currentPage = 1;
        // recarregar via backend com query
        loadVacinas();
        console.log(`🔍 Pesquisando por: "${searchTerm}"`);
    }
}

function renderizarTabelaVacinas() {
    const tbody = document.getElementById('vacinasTableBody');
    
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
    dadosPaginados.forEach(vacina => {
        const row = document.createElement('tr');
        const displayName = vacina.nome || (vacina.raw && (vacina.raw.nome || vacina.raw.descricao)) || '';
        row.innerHTML = `
            <td>${displayName}</td>
            <td>
                <button class="btn-action-vacina btn-edit" onclick="editarVacina(${vacina.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
            <td>
                <button class="btn-action-vacina btn-delete" onclick="excluirVacina(${vacina.id})" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    console.log(`✅ Tabela renderizada com ${dadosPaginados.length} vacinas (página ${currentPage})`);
}

function atualizarPaginacao() {
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

function editarVacina(id) {
    (async () => {
        try {
            const resp = await fetch(`/api/vacinas/${encodeURIComponent(id)}`);
            if (!resp.ok) throw new Error('Vacina não encontrada');
            const json = await resp.json();
            const backdrop = document.getElementById('vacinaModalBackdrop');
            const input = document.getElementById('vacinaDescricao');
            if (!backdrop || !input) return showToast('Erro ao abrir modal', 'error');
            input.value = json.nome || json.descricao || '';
            editingVacinaId = json.id;
            backdrop.style.display = 'flex'; backdrop.classList.add('open');
            document.getElementById('vacinaModalClose')?.addEventListener('click', closeVacinaModal);
            document.getElementById('vacinaCancelBtn')?.addEventListener('click', closeVacinaModal);
            document.getElementById('vacinaSaveBtn')?.addEventListener('click', handleSaveVacina);
        } catch (err) {
            console.error('Erro ao carregar vacina para edição:', err);
            showToast('Erro ao carregar vacina', 'error');
        }
    })();
}
// Modal de confirmação reutilizável (centralizado, estilo do sistema)
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
        <div style="display:flex;justify-content:flex-end;gap:10px">
          <button class="btn btn-secondary" id="__confirm_cancel" style="cursor:pointer">Cancelar</button>
          <button class="btn btn-danger" id="__confirm_ok" style="cursor:pointer">${confirmLabel || 'Excluir'}</button>
        </div>
    `;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    function cleanup(){ try{ backdrop.remove(); }catch(e){} }

    modal.querySelector('#__confirm_cancel').addEventListener('click', () => { cleanup(); });
    modal.querySelector('#__confirm_ok').addEventListener('click', async () => {
        try {
            await onConfirm();
        } catch (e) { console.error(e); }
        cleanup();
    });
}

function excluirVacina(id) {
    const vacina = filteredData.find(v => String(v.id) === String(id));
    const name = vacina ? (vacina.nome || (vacina.raw && (vacina.raw.nome || vacina.raw.descricao)) || '') : '';
    showConfirmDeleteModal(`Deseja realmente excluir a vacina "${name}"?`, 'Excluir', async () => {
        try {
            const resp = await fetch(`/api/vacinas/${encodeURIComponent(id)}`, { method: 'DELETE' });
            if (!resp.ok) {
                const txt = await resp.text().catch(()=>null);
                throw new Error(txt || 'Falha ao deletar');
            }
            showToast('Vacina excluída', 'success');
            await loadVacinas();
        } catch (err) {
            console.error('Erro ao excluir vacina:', err);
            showToast('Falha ao excluir vacina', 'error');
        }
    });
}

    // Modal: abrir/fechar/salvar
    function openVacinaModal() {
        const backdrop = document.getElementById('vacinaModalBackdrop');
        const input = document.getElementById('vacinaDescricao');
        if (!backdrop) return;
        backdrop.style.display = 'flex';
        backdrop.classList.add('open');
        editingVacinaId = null; // criando
        if (input) { input.value = ''; input.focus(); }

        // handlers
        document.getElementById('vacinaModalClose')?.addEventListener('click', closeVacinaModal);
        document.getElementById('vacinaCancelBtn')?.addEventListener('click', closeVacinaModal);
        document.getElementById('vacinaSaveBtn')?.addEventListener('click', handleSaveVacina);

        // evitar fechamento ao clicar no backdrop
        const modalCard = backdrop.querySelector('.modal-card');
        backdrop.addEventListener('click', function(e){ if (e.target !== backdrop) return; /* ignore clicks on backdrop */ });
    }

    function closeVacinaModal() {
        const backdrop = document.getElementById('vacinaModalBackdrop');
        if (!backdrop) return;
        backdrop.style.display = 'none';
        backdrop.classList.remove('open');

        // remover listeners para evitar duplicação
        document.getElementById('vacinaModalClose')?.removeEventListener('click', closeVacinaModal);
        document.getElementById('vacinaCancelBtn')?.removeEventListener('click', closeVacinaModal);
        document.getElementById('vacinaSaveBtn')?.removeEventListener('click', handleSaveVacina);
    }

    function handleSaveVacina() {
        (async () => {
            const input = document.getElementById('vacinaDescricao');
            if (!input) return;
            const val = input.value.trim();
            if (!val) { showToast('Preencha a descrição da vacina', 'error'); input.focus(); return; }

            try {
                if (editingVacinaId) {
                    const resp = await fetch(`/api/vacinas/${encodeURIComponent(editingVacinaId)}`, {
                        method: 'PUT', headers: { 'Content-Type':'application/json' },
                        body: JSON.stringify({ nome: val })
                    });
                    if (!resp.ok) throw new Error('Falha ao atualizar');
                    showToast('Vacina atualizada', 'success');
                } else {
                    const resp = await fetch('/api/vacinas', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ nome: val }) });
                    if (!resp.ok) throw new Error('Falha ao criar');
                    const created = await resp.json();
                    if (!created || (!created.id && !created.codigo)) throw new Error('Resposta inválida do servidor');
                    showToast('Vacina criada', 'success');
                }
                editingVacinaId = null;
                closeVacinaModal();
                await loadVacinas();
            } catch (err) {
                console.error('Erro salvando vacina:', err);
                showToast('Erro ao salvar vacina', 'error');
            }
        })();
    }

    // Toaster simples
    function showToast(message, type) {
        try {
            let container = document.querySelector('.gh-toast-container');
            if (!container) { container = document.createElement('div'); container.className = 'gh-toast-container'; container.style.position='fixed'; container.style.top='18px'; container.style.right='18px'; container.style.display='flex'; container.style.flexDirection='column'; container.style.gap='8px'; container.style.zIndex='99999'; document.body.appendChild(container); }
            const t = document.createElement('div');
            t.textContent = message;
            t.style.padding = '10px 14px'; t.style.borderRadius='8px'; t.style.minWidth='180px'; t.style.boxShadow='0 8px 24px rgba(2,6,23,0.12)'; t.style.fontWeight='500';
            if (type === 'error') { t.style.background = '#ffecec'; t.style.color = '#8a1f1f'; }
            else { t.style.background = '#e8ffed'; t.style.color = '#10421a'; }
            container.appendChild(t);
            requestAnimationFrame(()=>{ t.style.opacity = '1'; t.style.transform = 'none'; });
            setTimeout(()=>{ t.style.transition='opacity .2s'; t.style.opacity='0'; setTimeout(()=>t.remove(), 220); }, 4000);
        } catch(e){ console.warn(e); }
    }

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarVacinas);
} else {
    inicializarVacinas();
}
