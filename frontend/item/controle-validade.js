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
    // Não persistir em localStorage por razões de segurança conforme política do sistema.
    // Esta função é mantida como noop para compatibilidade com outros scripts.
    try { console.debug('salvarEstadoSubmenu chamado (noop) ->', submenuId, isOpen); } catch(e){}
}

function obterEstadoSubmenu(submenuId) {
    // noop: nunca ler do localStorage
    try { console.debug('obterEstadoSubmenu chamado (noop) ->', submenuId); } catch(e){}
    return false;
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

function limparEstadoSubmenus() { try { console.debug('limparEstadoSubmenus chamado (noop)'); } catch(e){} }

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
// FUNCIONALIDADES DA PÁGINA DE CONTROLE DE VALIDADE
// ========================================

// Lista principal que será preenchida a partir do backend (/api/itens)
let produtosValidade = [];

let currentPage = 1;
let itemsPerPage = 50;
let searchTerm = '';
let currentStatus = 'todos';
let filteredData = [];

function calcularStatusValidade(dataValidade) {
    if (!dataValidade) return '';
    // parse seguro da data sem sofrer deslocamento de timezone
    const d = parseDateAsLocal(dataValidade);
    if (!d) return '';
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    d.setHours(0,0,0,0);
    const diffMs = d.getTime() - hoje.getTime();
    const diffDias = Math.ceil(diffMs / (1000*60*60*24));
    if (diffDias < 0) return 'Vencido';
    if (diffDias <= 30) return 'Alto risco';
    if (diffDias <= 90) return 'Necessita de atenção';
    return 'Baixo risco';
}

function formatDateBR(dateStr) {
    if (!dateStr) return '';
    try {
        // Usar parseDateAsLocal para evitar problemas de timezone
        const d = parseDateAsLocal(dateStr);
        if (d) {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        }
        // fallback simples
        const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return `${m[3]}/${m[2]}/${m[1]}`;
        return String(dateStr);
    } catch (e) {
        return String(dateStr);
    }
}

// Parse de data garantindo que strings do tipo YYYY-MM-DD sejam interpretadas como data local
function parseDateAsLocal(dateStr) {
    if (!dateStr) return null;
    const s = String(dateStr).trim();
    // captar 'YYYY-MM-DD' ou 'YYYY-MM-DDTHH:MM:SS' (vamos preferir criar Date local quando sem hora)
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](.*))?$/);
    if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]) - 1;
        const d = Number(m[3]);
        // Se houver parte de hora (m[4]) e contiver informações, usar new Date(s) (ja com timezone),
        // caso contrário construir Date local (ano, mêsIndex, dia) para evitar deslocamento.
        if (m[4] && m[4].trim() !== '') {
            const parsed = new Date(s);
            return isNaN(parsed.getTime()) ? null : parsed;
        }
        const localDate = new Date(y, mo, d);
        return isNaN(localDate.getTime()) ? null : localDate;
    }
    const parsed = new Date(s);
    return isNaN(parsed.getTime()) ? null : parsed;
}

async function carregarProdutosDoServidor() {
    try {
        // ApiClient está disponível via ../api/api-client.js incluído no HTML
        // Pedir os mesmos itens que 'meus-itens' (excluir medicamentos)
        const itens = await ApiClient.getProdutos({ excludeAgrupamento: 'MEDICAMENTOS' });
        const lista = Array.isArray(itens) ? itens : (itens && itens.itens ? itens.itens : []);
        produtosValidade = lista.map(p => {
            const estoqueAtual = (p.estoqueAtual !== undefined && p.estoqueAtual !== null) ? p.estoqueAtual : (p.estoque || 0);
            const dataValidade = p.validade || p.dataValidade || p.data_validade || null;
            const statusValidade = calcularStatusValidade(dataValidade);
            const ativo = (p.ativo === true || String(p.ativo).toLowerCase() === 'sim' || String(p.ativo).toLowerCase() === 'true');
            return {
                id: p.id,
                codigo: p.codigo,
                nome: p.nome || p.descricao || p.titulo,
                estoqueAtual,
                dataValidade: dataValidade || '',
                statusValidade,
                ativo
            };
        });
        filteredData = [...produtosValidade];
        renderizarTabelaValidade();
        atualizarPaginacaoValidade();
        console.log('✅ Produtos carregados do servidor:', produtosValidade.length);
    } catch (err) {
        console.error('Erro ao carregar produtos do servidor:', err);
        // fallback: lista vazia
        produtosValidade = [];
        filteredData = [];
        renderizarTabelaValidade();
        atualizarPaginacaoValidade();
    }
}

function inicializarControleValidade() {
    console.log('📅 Inicializando página de Controle de Validade');
    
    // Configurar event listeners
    configurarEventListenersValidade();
    // Carregar produtos do servidor e renderizar
    carregarProdutosDoServidor();
    
    console.log('✅ Página de Controle de Validade inicializada com', produtosValidade.length, 'produtos');
}

function configurarEventListenersValidade() {
    const btnAdicionarProduto = document.getElementById('btnAdicionarProduto');
    const btnExportar = document.getElementById('btnExportar');
    const btnConfiguracoes = document.getElementById('btnConfiguracoes');
    const btnMaisFiltros = document.getElementById('btnMaisFiltros');
    const btnPesquisar = document.getElementById('btnPesquisar');
    const searchInput = document.getElementById('searchProduto');
    const btnPrevPage = document.getElementById('btnPrevPage');
    const btnNextPage = document.getElementById('btnNextPage');
    const tabButtons = document.querySelectorAll('.tab-button');
    
    if (btnAdicionarProduto) {
        btnAdicionarProduto.addEventListener('click', () => {
            // Abrir a página de novo produto (mesma pasta `item`)
            window.location.href = 'novo-produto.html';
            closeDropdown();
        });
    }
    
    if (btnExportar) {
        btnExportar.addEventListener('click', () => {
            alert('Exportação de dados será implementada em breve!');
        });
    }
    
    if (btnConfiguracoes) {
        btnConfiguracoes.addEventListener('click', () => {
            alert('Configurações serão implementadas em breve!');
        });
    }
    
    // mais filtros: handler removido para evitar alert indesejado
    
    if (btnPesquisar) {
        btnPesquisar.addEventListener('click', realizarPesquisaValidade);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                realizarPesquisaValidade();
            }
        });
    }
    
    // Tabs de status
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remover active de todos
            tabButtons.forEach(b => b.classList.remove('active'));
            // Adicionar active no clicado
            btn.classList.add('active');
            
            currentStatus = btn.dataset.status;
            currentPage = 1;
            realizarPesquisaValidade();
        });
    });
    
    if (btnPrevPage) {
        btnPrevPage.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderizarTabelaValidade();
                atualizarPaginacaoValidade();
            }
        });
    }
    
    if (btnNextPage) {
        btnNextPage.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredData.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderizarTabelaValidade();
                atualizarPaginacaoValidade();
            }
        });
    }
    
    console.log('✅ Event listeners configurados');
}

function realizarPesquisaValidade() {
    const searchInput = document.getElementById('searchProduto');
    searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
    
    currentPage = 1;
    
    // Filtrar dados
    filteredData = produtosValidade.filter(produto => {
        // Filtro de busca
        const matchSearch = !searchTerm || 
            (produto.nome && produto.nome.toLowerCase().includes(searchTerm)) ||
            (produto.codigo && produto.codigo.toString().includes(searchTerm));
        
        // Filtro de status
        let matchStatus = true;
        if (currentStatus && currentStatus !== 'todos') {
            const s = (produto.statusValidade || '').toLowerCase();
            if (currentStatus === 'vencido') matchStatus = s === 'vencido' || s === 'vencido';
            else if (currentStatus === 'alto-risco') matchStatus = s === 'alto risco' || s === 'alto risco' || s === 'alto-risco';
            else if (currentStatus === 'necessita-atencao') matchStatus = s === 'necessita de atenção' || s === 'necessita de atenção' || s === 'necessita-atencao';
            else if (currentStatus === 'baixo-risco') matchStatus = s === 'baixo risco' || s === 'baixo-risco';
            else matchStatus = true;
        }

        return matchSearch && matchStatus;
    });
    
    renderizarTabelaValidade();
    atualizarPaginacaoValidade();
    
    console.log(`🔍 Pesquisa realizada - ${filteredData.length} produtos encontrados`);
}

function renderizarTabelaValidade() {
    const tbody = document.getElementById('produtosValidadeTableBody');
    
    if (!tbody) {
        console.error('❌ Tbody não encontrado');
        return;
    }
    
    // Limpar tabela
    tbody.innerHTML = '';
    
    if (filteredData.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="7" style="text-align: center; padding: 40px; color: #999;">
                Nenhum produto encontrado
            </td>
        `;
        tbody.appendChild(emptyRow);
        console.log('📋 Tabela vazia - 0 produtos');
        return;
    }
    
    // Calcular índices de paginação
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const dadosPaginados = filteredData.slice(startIndex, endIndex);
    
    // Renderizar linhas
    dadosPaginados.forEach(produto => {
        const row = document.createElement('tr');
        // determinar classe da bolinha: no-date / red (vencido) / green (dentro da validade)
        const hasDate = produto.dataValidade && String(produto.dataValidade).trim() !== '';
        let dotClass = 'no-date';
        let statusTitle = '';
        if (!hasDate) {
            dotClass = 'no-date';
            statusTitle = 'Sem data de validade';
        } else {
            const sv = (produto.statusValidade || '').toLowerCase();
            if (sv.indexOf('venc') !== -1) {
                dotClass = 'red';
                statusTitle = produto.statusValidade || 'Vencido';
            } else {
                dotClass = 'green';
                statusTitle = produto.statusValidade || 'Dentro da validade';
            }
        }

            row.innerHTML = `
            <td>${produto.codigo || '-'}</td>
            <td>${produto.nome || '-'}</td>
            <td>${produto.estoqueAtual !== undefined ? produto.estoqueAtual : '-'}</td>
            <td>${formatDateBR(produto.dataValidade) || ''}</td>
            <td class="status-cell"><span class="validity-dot ${dotClass}" title="${statusTitle}"></span></td>
            <td>
                ${produto.ativo ? '<i class="fas fa-check icon-ativo-validade"></i>' : ''}
            </td>
            <td>
                <button class="btn-opcoes" onclick="abrirOpcoesProduto(${produto.id})" title="Opções">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    console.log(`✅ Tabela renderizada com ${dadosPaginados.length} produtos (página ${currentPage})`);
}

function atualizarPaginacaoValidade() {
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

function abrirOpcoesProduto(id) {
    const produto = produtosValidade.find(p => p.id === id);
    if (produto) {
        console.log('⚙️ Opções do produto:', produto);
        alert(`Opções para:\n\n${produto.nome}\n\n• Editar validade\n• Visualizar histórico\n• Excluir registro`);
    }
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarControleValidade);
} else {
    inicializarControleValidade();
}
