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
// FUNCIONALIDADES DA PÁGINA DE FORNECEDORES
// ========================================

// Dados de fornecedores (da imagem)
let fornecedoresData = [
    { id: 5, codigo: 5, nome: 'Banco', telefone: '', ativo: true },
    { id: 4, codigo: 4, nome: 'Companhia de Água e Esgoto', telefone: '', ativo: true },
    { id: 3, codigo: 3, nome: 'Concessionária Energia', telefone: '', ativo: true },
    { id: 2, codigo: 2, nome: 'Operadora de Cartão modelo', telefone: '', ativo: true }
];

let currentPage = 1;
let itemsPerPage = 50;
let searchTerm = '';
let filteredData = [...fornecedoresData];
// filtro 'Ativo' -> 'todos' | 'sim' | 'nao'
let activeFilter = 'todos';

function inicializarFornecedores() {
    console.log('🏢 Inicializando página de Fornecedores');
    
    // Configurar event listeners
    configurarEventListenersFornecedores();
    // Carregar dados do backend
    ApiClient.getFornecedores().then(data => {
        if (Array.isArray(data)) {
            fornecedoresData = data.map(f => ({ 
                id: f.id, 
                codigo: (f.codigo !== null && f.codigo !== undefined && f.codigo !== '') ? f.codigo : f.id,
                nome: f.nome, 
                telefone: f.telefone || '', 
                ativo: f.ativo 
            }));
        } else {
            fornecedoresData = [];
        }
        // Atualizar conjunto filtrado antes de renderizar
        filteredData = [...fornecedoresData];
        // Renderizar tabela
        renderizarTabelaFornecedores();
        // Atualizar paginação
        atualizarPaginacaoFornecedores();
        console.log('✅ Página de Fornecedores inicializada com', fornecedoresData.length, 'fornecedores (backend)');
    }).catch(err => {
        console.error('Erro ao carregar fornecedores do backend:', err);
        // fallback para os dados locais
        filteredData = [...fornecedoresData];
        renderizarTabelaFornecedores();
        atualizarPaginacaoFornecedores();
    });
}

function configurarEventListenersFornecedores() {
    const btnAdicionarFornecedor = document.getElementById('btnAdicionarFornecedor');
    const btnCompartilhar = document.getElementById('btnCompartilhar');
    const btnMaisFiltros = document.getElementById('btnMaisFiltros');
    const btnPesquisar = document.getElementById('btnPesquisar');
    const searchInput = document.getElementById('searchFornecedor');
    const itemsPerPageSelect = document.getElementById('itemsPerPage');
    const btnPrevPage = document.getElementById('btnPrevPage');
    const btnNextPage = document.getElementById('btnNextPage');
    
    if (btnAdicionarFornecedor) {
        btnAdicionarFornecedor.addEventListener('click', () => {
            // Abrir o formulário de adicionar/editar fornecedor
            window.location.href = 'adicionar-fornecedor.html';
        });
    }
    
    if (btnCompartilhar) {
        btnCompartilhar.addEventListener('click', function(e) {
            e.stopPropagation();
            // fechar menu anterior se existir
            const existing = document.querySelector('.ctx-menu-fornecedor.share-dropdown');
            if (existing) { existing.remove(); return; }

            // criar dropdown de compartilhamento (manter estilo do sistema)
            const menu = document.createElement('div');
            menu.className = 'ctx-menu-fornecedor share-dropdown';

            const itemResumo = document.createElement('div');
            itemResumo.className = 'ctx-item ctx-item-share';
            itemResumo.innerHTML = '<i class="fas fa-file-alt" style="width:18px;text-align:center;color:#666;margin-right:8px"></i><span>Cadastro Resumido</span>';
            itemResumo.addEventListener('click', function(ev){
                ev.stopPropagation();
                menu.remove();
                gerarRelatorioFornecedores('resumido');
            });

            const itemDetalhado = document.createElement('div');
            itemDetalhado.className = 'ctx-item ctx-item-share';
            itemDetalhado.innerHTML = '<i class="fas fa-file" style="width:18px;text-align:center;color:#666;margin-right:8px"></i><span>Cadastro Detalhado</span>';
            itemDetalhado.addEventListener('click', function(ev){
                ev.stopPropagation();
                menu.remove();
                gerarRelatorioFornecedores('detalhado');
            });

            menu.appendChild(itemResumo);
            menu.appendChild(itemDetalhado);
            document.body.appendChild(menu);

            // posicionar abaixo do botão
            try{
                const rect = btnCompartilhar.getBoundingClientRect();
                menu.style.position = 'absolute';
                menu.style.minWidth = '180px';
                menu.style.left = (rect.left + window.pageXOffset) + 'px';
                menu.style.top = (rect.bottom + window.pageYOffset + 6) + 'px';
                menu.style.zIndex = 12050;
            }catch(e){ /* silencioso */ }

            // fechar ao clicar fora
            setTimeout(()=>{
                const outHandler = function(ev){
                    if (!menu.contains(ev.target) && ev.target !== btnCompartilhar) { menu.remove(); document.removeEventListener('click', outHandler); }
                };
                document.addEventListener('click', outHandler);
            }, 10);
        });
    }
    
    if (btnMaisFiltros) {
        btnMaisFiltros.addEventListener('click', toggleMoreFilters);
    }
    
    if (btnPesquisar) {
        btnPesquisar.addEventListener('click', realizarPesquisaFornecedores);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                realizarPesquisaFornecedores();
            }
        });
    }
    
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', (e) => {
            itemsPerPage = parseInt(e.target.value);
            currentPage = 1;
            renderizarTabelaFornecedores();
            atualizarPaginacaoFornecedores();
        });
    }
    
    if (btnPrevPage) {
        btnPrevPage.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderizarTabelaFornecedores();
                atualizarPaginacaoFornecedores();
            }
        });
    }
    
    if (btnNextPage) {
        btnNextPage.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredData.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderizarTabelaFornecedores();
                atualizarPaginacaoFornecedores();
            }
        });
    }
    
    console.log('✅ Event listeners configurados');
}

// Toggle do painel 'Mais filtros'
function toggleMoreFilters() {
    const btn = document.getElementById('btnMaisFiltros');
    const container = document.querySelector('.search-filter-container-fornecedor');
    if (!container) return;
    
    let panel = document.getElementById('moreFiltersPanel');
    
    if (panel) {
        const isOpen = panel.classList.toggle('show');
        // Atualizar ícone da seta no botão
        updateFilterButtonIcon(btn, isOpen);
        if (!isOpen) {
            // se foi fechado, remover do DOM para evitar espaço em branco
            panel.remove();
        }
        return;
    }
    
    // Criar painel inline
    panel = document.createElement('div');
    panel.id = 'moreFiltersPanel';
    panel.className = 'more-filters-panel show';
    panel.innerHTML = `
        <div class="more-filters-content">
            <div class="more-filters-field">
                <label class="more-filters-label">Ativo:</label>
                <select id="ativoFilterSelect" class="more-filters-select">
                    <option value="todos">Todos</option>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                </select>
            </div>
        </div>
    `;
    
    container.appendChild(panel);
    
    // Setar valor atual
    const select = document.getElementById('ativoFilterSelect');
    if (select) {
        select.value = activeFilter;
        // Atualizar filtro quando mudar o select
        select.addEventListener('change', function() {
            activeFilter = this.value;
        });
    }
    
    // Atualizar ícone para seta para cima
    updateFilterButtonIcon(btn, true);
}

// Atualizar ícone da seta no botão 'Mais filtros'
function updateFilterButtonIcon(btn, isOpen) {
    if (!btn) return;
    const icon = btn.querySelector('i');
    if (icon) {
        icon.className = isOpen ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
    } else {
        // Se não existe ícone, criar
        const newIcon = document.createElement('i');
        newIcon.className = isOpen ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
        btn.insertBefore(newIcon, btn.firstChild);
    }
}

function realizarPesquisaFornecedores() {
    const searchInput = document.getElementById('searchFornecedor');
    searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
    
    currentPage = 1;
    
    // Filtrar dados (incluindo filtro Ativo)
    filteredData = fornecedoresData.filter(fornecedor => {
        // Aplicar filtro Ativo
        const ativoBool = !!fornecedor.ativo;
        if (activeFilter === 'sim' && !ativoBool) return false;
        if (activeFilter === 'nao' && ativoBool) return false;
        
        // Aplicar pesquisa por termo
        if (!searchTerm) return true;
        
        return (
            (fornecedor.nome && fornecedor.nome.toLowerCase().includes(searchTerm)) ||
            (fornecedor.codigo && fornecedor.codigo.toString().includes(searchTerm)) ||
            (fornecedor.telefone && fornecedor.telefone.includes(searchTerm))
        );
    });
    
    renderizarTabelaFornecedores();
    atualizarPaginacaoFornecedores();
    
    console.log(`🔍 Pesquisa realizada - ${filteredData.length} fornecedores encontrados`);
}

function renderizarTabelaFornecedores() {
    const tbody = document.getElementById('fornecedoresTableBody');
    
    if (!tbody) {
        console.error('❌ Tbody não encontrado');
        return;
    }
    
    // Limpar tabela
    tbody.innerHTML = '';
    
    if (filteredData.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="6" style="text-align: center; padding: 40px; color: #999;">
                Nenhum fornecedor encontrado
            </td>
        `;
        tbody.appendChild(emptyRow);
        console.log('📋 Tabela vazia - 0 fornecedores');
        return;
    }
    
    // Calcular índices de paginação
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const dadosPaginados = filteredData.slice(startIndex, endIndex);
    
    // Renderizar linhas
    dadosPaginados.forEach(fornecedor => {
        const row = document.createElement('tr');
        row.onclick = () => abrirPerfilFornecedor(fornecedor.id);
        row.style.cursor = 'pointer';
        
        row.innerHTML = `
            <td>${fornecedor.codigo}</td>
            <td>${fornecedor.nome}</td>
            <td>${fornecedor.telefone || ''}</td>
            <td>
                ${fornecedor.ativo ? '<i class="fas fa-check icon-ativo-fornecedor"></i>' : '<i class="fas fa-times icon-inativo-fornecedor"></i>'}
            </td>
            <td>
                <button class="btn-editar-fornecedor" onclick="event.stopPropagation(); editarFornecedor(${fornecedor.id})" title="Editar">
                    <i class="fas fa-pen"></i>
                </button>
            </td>
            <td>
                <button class="btn-excluir-fornecedor" onclick="event.stopPropagation(); confirmarEDeletarFornecedor(${fornecedor.id})" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    console.log(`✅ Tabela renderizada com ${dadosPaginados.length} fornecedores (página ${currentPage})`);
}

// Ouvir evento de alteração de status de fornecedor (disparado pela página de perfil)
window.addEventListener('fornecedorStatusChanged', function(e){
    try {
        const detail = e && e.detail ? e.detail : null;
        if (!detail || !detail.id) return;
        const { id, ativo } = detail;
        // atualizar arrays locais
        fornecedoresData = fornecedoresData.map(f => f.id === id ? ({ ...f, ativo }) : f);
        filteredData = filteredData.map(f => f.id === id ? ({ ...f, ativo }) : f);
        // re-renderizar tabela atual
        renderizarTabelaFornecedores();
    } catch (err) { console.warn('Erro ao processar fornecedorStatusChanged', err); }
});

// Recarregar lista ao voltar pela navegação (back/forward), garantindo que o estado vindo do backend seja aplicado
window.addEventListener('pageshow', function(evt){
    // Sempre tentar buscar dados mais recentes para sincronizar estado
    try {
        if (typeof ApiClient === 'undefined' || typeof ApiClient.getFornecedores !== 'function') return;
        ApiClient.getFornecedores().then(data => {
            if (Array.isArray(data)) {
                fornecedoresData = data.map(f => ({
                    id: f.id,
                    codigo: (f.codigo !== null && f.codigo !== undefined && f.codigo !== '') ? f.codigo : f.id,
                    nome: f.nome,
                    telefone: f.telefone || '',
                    ativo: f.ativo
                }));
            } else {
                fornecedoresData = [];
            }
            // reaplicar filtro atual e renderizar
            filteredData = fornecedoresData.filter(fornecedor => {
                const ativoBool = !!fornecedor.ativo;
                if (activeFilter === 'sim' && !ativoBool) return false;
                if (activeFilter === 'nao' && ativoBool) return false;
                if (!searchTerm) return true;
                return (
                    (fornecedor.nome && fornecedor.nome.toLowerCase().includes(searchTerm)) ||
                    (fornecedor.codigo && fornecedor.codigo.toString().includes(searchTerm)) ||
                    (fornecedor.telefone && fornecedor.telefone.includes(searchTerm))
                );
            });

            renderizarTabelaFornecedores();
            atualizarPaginacaoFornecedores();
        }).catch(err => { /* silencioso: manter estado atual se falhar */ });
    } catch (e) { console.warn('pageshow handler erro', e); }
});

function atualizarPaginacaoFornecedores() {
    const paginationText = document.getElementById('paginationText');
    const btnPrevPage = document.getElementById('btnPrevPage');
    const btnNextPage = document.getElementById('btnNextPage');
    
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startItem = filteredData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredData.length);
    
    if (paginationText) {
        paginationText.textContent = `${startItem} - ${endItem} de ${filteredData.length}`;
    }
    
    if (btnPrevPage) {
        btnPrevPage.disabled = currentPage === 1;
    }
    
    if (btnNextPage) {
        btnNextPage.disabled = currentPage >= totalPages || filteredData.length === 0;
    }
}

function abrirPerfilFornecedor(id) {
    console.log('👤 Abrindo perfil do fornecedor:', id);
    window.location.href = `fornecedor-perfil.html?id=${id}`;
}

function editarFornecedor(id) {
    // Redireciona para a página de adicionar/editar passando o id
    try {
        window.location.href = `adicionar-fornecedor.html?id=${id}`;
    } catch (e) {
        console.error('Erro ao redirecionar para edição:', e);
    }
}

// Abre um pequeno menu de opções abaixo do botão (Ex: 'Excluir')
function abrirOpcoesFornecedor(id, btnEl) {
    // fechar menu anterior se existir
    const existing = document.querySelector('.ctx-menu-fornecedor');
    if (existing) existing.remove();

    const fornecedor = fornecedoresData.find(f => f.id === id);
    if (!fornecedor) return;

    const menu = document.createElement('div');
    menu.className = 'ctx-menu-fornecedor';
    menu.setAttribute('data-fornecedor-id', id);

    const itemExcluir = document.createElement('div');
    itemExcluir.className = 'ctx-item ctx-item-excluir';
    itemExcluir.textContent = 'Excluir';
    itemExcluir.addEventListener('click', function(e){
        e.stopPropagation();
        // abrir modal de confirmação (texto do sistema centralizado)
        showConfirmModal(`Tem certeza que deseja excluir esse fornecedor? Essa ação não poderá ser desfeita.`, async function(){
            // onConfirm: tentar chamar API se disponível, senão remover localmente
            try{
                if (typeof ApiClient !== 'undefined' && typeof ApiClient.deletarFornecedor === 'function'){
                    await ApiClient.deletarFornecedor(id);
                }
            }catch(err){
                console.warn('Erro ao deletar via API, removendo localmente', err);
            }

            // Remover localmente
            fornecedoresData = fornecedoresData.filter(f => f.id !== id);
            filteredData = filteredData.filter(f => f.id !== id);
            renderizarTabelaFornecedores();
            // mostrar toast de sucesso se disponível
            if (typeof window.localShowToast === 'function') {
                try { window.localShowToast('Fornecedor excluído com sucesso.', 'success'); } catch(e){}
            }
            closeConfirmModal();
        });
        // fechar menu
        menu.remove();
    });

    menu.appendChild(itemExcluir);
    document.body.appendChild(menu);

    // posicionar o menu abaixo do botão e ajustar se ultrapassar a viewport
    try{
        const rect = btnEl.getBoundingClientRect();
        menu.style.position = 'absolute';
        // largura mínima menor para evitar overflow
        menu.style.minWidth = '120px';
        menu.style.boxSizing = 'border-box';
        menu.style.zIndex = 12050;

        // posição inicial
        let leftPos = rect.left + window.pageXOffset;
        let topPos = rect.bottom + window.pageYOffset + 6;
        menu.style.left = leftPos + 'px';
        menu.style.top = topPos + 'px';

        // depois de renderizar, ajusta se tocar a borda direita da janela
        setTimeout(() => {
            try {
                const menuRect = menu.getBoundingClientRect();
                const viewportRight = window.pageXOffset + window.innerWidth;
                const overflowRight = (menuRect.left + menuRect.width) - viewportRight;
                if (overflowRight > 0) {
                    // desloca o menu para a esquerda mantendo uma margem mínima
                    const newLeft = Math.max(8 + window.pageXOffset, leftPos - overflowRight - 8);
                    menu.style.left = newLeft + 'px';
                }
                // também garante que não saia pela esquerda
                if (menu.getBoundingClientRect().left < 8) {
                    menu.style.left = (8 + window.pageXOffset) + 'px';
                }
            } catch (e) { /* silencioso */ }
        }, 0);
    }catch(e){ console.warn('Erro ao posicionar menu', e); }

    // fechar ao clicar fora
    setTimeout(()=>{
        const outHandler = function(ev){
            if (!menu.contains(ev.target) && ev.target !== btnEl) { menu.remove(); document.removeEventListener('click', outHandler); }
        };
        document.addEventListener('click', outHandler);
    }, 10);
}

// Função reutilizável para confirmar e deletar fornecedor (usada pelo botão direto)
function confirmarEDeletarFornecedor(id) {
    showConfirmModal(`Tem certeza que deseja excluir esse fornecedor? Essa ação não poderá ser desfeita.`, async function(){
        try{
            if (typeof ApiClient !== 'undefined' && typeof ApiClient.deletarFornecedor === 'function'){
                await ApiClient.deletarFornecedor(id);
            }
        }catch(err){
            console.warn('Erro ao deletar via API, removendo localmente', err);
        }

        // Remover localmente
        fornecedoresData = fornecedoresData.filter(f => f.id !== id);
        filteredData = filteredData.filter(f => f.id !== id);
        renderizarTabelaFornecedores();
        if (typeof window.localShowToast === 'function') {
            try { window.localShowToast('Fornecedor excluído com sucesso.', 'success'); } catch(e){}
        }
        closeConfirmModal();
    });
}

// Gera relatório de fornecedores (resumido|detalhado) chamando o endpoint do backend e abrindo o modal PDF
async function gerarRelatorioFornecedores(tipo) {
    try {
        if (typeof window.localShowToast === 'function') window.localShowToast('Gerando relatório...','info');

        // montar payload: podemos enviar filtros atuais para o backend
        const payload = {
            tipo: tipo, // 'resumido' ou 'detalhado'
            filtros: {
                ativo: activeFilter || 'todos',
                pesquisa: searchTerm || ''
            }
            // o backend pode pegar dados direto do DB a partir dos filtros
        };

        const resp = await fetch('/api/relatorios/fornecedores/pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!resp.ok) {
            // tentar ler texto para mensagem de erro
            let text = '';
            try { text = await resp.text(); } catch(e){}
            console.error('Erro ao gerar relatório fornecedores:', resp.status, text);
            if (typeof window.localShowToast === 'function') window.localShowToast('Falha ao gerar relatório.', 'danger');
            return;
        }

        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const title = tipo === 'resumido' ? 'Cadastro de Fornecedores (Resumido)' : 'Cadastro de Fornecedores (Detalhado)';
        openPdfModal(url, title);
        if (typeof window.localShowToast === 'function') window.localShowToast('Relatório gerado.', 'success');
    } catch (err) {
        console.error('Erro ao gerarRelatorioFornecedores', err);
        if (typeof window.localShowToast === 'function') window.localShowToast('Erro ao gerar relatório.', 'danger');
    }
}

// Abre um modal com um iframe apontando para a URL do blob PDF
function openPdfModal(blobUrl, title) {
    // remover modal existente se houver
    const existing = document.getElementById('pdfModalOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'pdfModalOverlay';
    overlay.style.position = 'fixed';
    overlay.style.left = 0;
    overlay.style.top = 0;
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0,0,0,0.6)';
    overlay.style.zIndex = 12060;
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';

    const modal = document.createElement('div');
    modal.style.width = '90%';
    modal.style.height = '90%';
    modal.style.maxWidth = '1100px';
    modal.style.background = '#fff';
    modal.style.borderRadius = '6px';
    modal.style.overflow = 'hidden';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';

    const header = document.createElement('div');
    header.style.padding = '10px 12px';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.background = '#f6f6f6';

    const titleEl = document.createElement('div');
    titleEl.textContent = title || 'Relatório';
    titleEl.style.fontWeight = '600';

    const actions = document.createElement('div');

    const openNewBtn = document.createElement('button');
    openNewBtn.className = 'btn';
    openNewBtn.textContent = 'Ver em uma nova aba';
    openNewBtn.addEventListener('click', function(){ window.open(blobUrl, '_blank'); });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn';
    closeBtn.textContent = 'Fechar';
    closeBtn.addEventListener('click', function(){ overlay.remove(); URL.revokeObjectURL(blobUrl); });

    actions.appendChild(openNewBtn);
    actions.appendChild(closeBtn);

    header.appendChild(titleEl);
    header.appendChild(actions);

    const iframe = document.createElement('iframe');
    iframe.style.border = 'none';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.src = blobUrl;

    modal.appendChild(header);
    modal.appendChild(iframe);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

// =====================
// Modal de confirmação
// =====================
function showConfirmModal(message, onConfirm){
    // remover modal existente
    closeConfirmModal();

    const overlay = document.createElement('div');
    overlay.className = 'confirm-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'confirm-modal';

    const msg = document.createElement('div');
    msg.className = 'confirm-modal-message';
    msg.textContent = message;

    const actions = document.createElement('div');
    actions.className = 'confirm-modal-actions';

    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn-cancel-modal';
    btnCancel.textContent = 'Cancelar';
    btnCancel.addEventListener('click', function(e){ e.preventDefault(); closeConfirmModal(); });

    const btnOk = document.createElement('button');
    btnOk.className = 'btn-confirm-modal';
    btnOk.textContent = 'OK';
    btnOk.addEventListener('click', function(e){ e.preventDefault(); try{ onConfirm && onConfirm(); }catch(er){ console.error(er); } });

    actions.appendChild(btnCancel);
    actions.appendChild(btnOk);

    modal.appendChild(msg);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // focus no botão OK por acessibilidade
    setTimeout(()=>{ btnOk.focus(); }, 80);
}

function closeConfirmModal(){
    const ex = document.querySelector('.confirm-modal-overlay');
    if (ex) ex.remove();
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarFornecedores);
} else {
    inicializarFornecedores();
}
