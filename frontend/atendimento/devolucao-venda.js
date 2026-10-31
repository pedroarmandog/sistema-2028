// Copiado de frontend/dashboard.js - funcionalidades do menu e header

console.log('🚀 menu.js carregado (snippet do dashboard)');

function detectarIDsDuplicados() {
    const idsParaVerificar = [
        'clienteMenuItem', 'clienteSubmenu',
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

// =====================================================
// FUNCIONALIDADES ESPECÍFICAS DA PÁGINA DE DEVOLUÇÕES  
// =====================================================

// Dados de exemplo para a tabela
const devolucoesMock = [
  {
    id: 'DEV001',
    origem: 'Venda',
    cliente: 'Maria Silva',
    emissao: '15/12/2024',
    valor: 'R$ 150,00',
    situacao: 'pendente'
  },
  {
    id: 'DEV002',
    origem: 'Atendimento',
    cliente: 'João Santos',
    emissao: '14/12/2024',
    valor: 'R$ 80,00',
    situacao: 'aprovada'
  },
  {
    id: 'DEV003',
    origem: 'Venda',
    cliente: 'Ana Costa',
    emissao: '13/12/2024',
    valor: 'R$ 200,00',
    situacao: 'cancelada'
  },
  {
    id: 'DEV004',
    origem: 'Atendimento',
    cliente: 'Carlos Oliveira',
    emissao: '12/12/2024',
    valor: 'R$ 120,00',
    situacao: 'aprovada'
  },
  {
    id: 'DEV005',
    origem: 'Venda',
    cliente: 'Paula Ferreira',
    emissao: '11/12/2024',
    valor: 'R$ 95,00',
    situacao: 'pendente'
  }
];

// Estado da aplicação de devoluções
let currentFilter = 'todos';
let currentSearch = '';
let currentPage = 1;
let itemsPerPage = 50;
let filteredData = [...devolucoesMock];

// Inicializar funcionalidades específicas da página de devoluções
function initializeDevolucoesPage() {
  console.log('🔍 Tentando inicializar página de devoluções...');
  
  // Verificar se os elementos existem antes de configurar
  const todosTab = document.getElementById('todosTab');
  const vendasTab = document.getElementById('vendasTab');
  const atendimentosTab = document.getElementById('atendimentosTab');
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('searchInput');
  const itemsPerPageSelect = document.getElementById('itemsPerPage');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const novaProcessoBtn = document.getElementById('novaProcessoBtn');
  
  console.log('🔍 Elementos encontrados:', {
    todosTab: !!todosTab,
    novaProcessoBtn: !!novaProcessoBtn
  });
  
  // Se não encontrar o botão Nova Devolução, tentar configurar apenas ele
  if (novaProcessoBtn) {
    console.log('✅ Configurando botão Nova Devolução...');
    novaProcessoBtn.addEventListener('click', function() {
      console.log('🚀 Botão Nova Devolução clicado!');
      window.location.href = './nova-devolucao.html';
    });
  } else {
    console.log('❌ Botão Nova Devolução não encontrado!');
  }
  
  if (!todosTab) {
    console.log('ℹ️ Não é a página de devoluções completa, saindo...');
    return; // Se não é a página de devoluções, sair
  }
  
  console.log('✅ Configurando página completa de devoluções...');
  
  // Filtros por aba
  todosTab.addEventListener('click', () => setFilter('todos'));
  vendasTab.addEventListener('click', () => setFilter('vendas'));
  atendimentosTab.addEventListener('click', () => setFilter('atendimentos'));
  
  // Pesquisa
  searchBtn.addEventListener('click', performSearch);
  searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      performSearch();
    }
  });
  
  // Paginação
  itemsPerPageSelect.addEventListener('change', function() {
    itemsPerPage = parseInt(this.value);
    currentPage = 1;
    renderTable();
  });
  
  prevBtn.addEventListener('click', function() {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  });
  
  nextBtn.addEventListener('click', function() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
    }
  });
  
  // Carregar dados iniciais
  loadDevolucoesData();
}

// Carregar dados das devoluções
function loadDevolucoesData() {
  showLoadingState();
  
  setTimeout(() => {
    filteredData = [...devolucoesMock];
    applyFilters();
    renderTable();
  }, 500);
}

// Mostrar estado de carregamento
function showLoadingState() {
  const tbody = document.getElementById('devolucoesTbody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="loading-state">
          <div class="loading-spinner"></div>
          <br>
          Carregando devoluções...
        </td>
      </tr>
    `;
  }
}

// Mostrar estado vazio
function showEmptyState() {
  const tbody = document.getElementById('devolucoesTbody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <i class="fas fa-inbox"></i>
          <h3>Nenhuma devolução encontrada</h3>
          <p>Não há devoluções que correspondam aos critérios de pesquisa.</p>
        </td>
      </tr>
    `;
  }
}

// Definir filtro ativo
function setFilter(filter) {
  currentFilter = filter;
  currentPage = 1;
  
  // Atualizar UI das abas
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  const activeTab = {
    'todos': 'todosTab',
    'vendas': 'vendasTab',
    'atendimentos': 'atendimentosTab'
  };
  
  const tabElement = document.getElementById(activeTab[filter]);
  if (tabElement) {
    tabElement.classList.add('active');
  }
  
  applyFilters();
  renderTable();
}

// Realizar pesquisa
function performSearch() {
  const searchInput = document.getElementById('searchInput');
  currentSearch = searchInput ? searchInput.value.toLowerCase().trim() : '';
  currentPage = 1;
  applyFilters();
  renderTable();
}

// Aplicar filtros aos dados
function applyFilters() {
  filteredData = devolucoesMock.filter(item => {
    // Filtro por tipo
    let typeMatch = true;
    if (currentFilter === 'vendas') {
      typeMatch = item.origem.toLowerCase() === 'venda';
    } else if (currentFilter === 'atendimentos') {
      typeMatch = item.origem.toLowerCase() === 'atendimento';
    }
    
    // Filtro por pesquisa
    let searchMatch = true;
    if (currentSearch) {
      searchMatch = item.id.toLowerCase().includes(currentSearch) ||
                   item.cliente.toLowerCase().includes(currentSearch) ||
                   item.origem.toLowerCase().includes(currentSearch);
    }
    
    return typeMatch && searchMatch;
  });
}

// Renderizar tabela
function renderTable() {
  const tbody = document.getElementById('devolucoesTbody');
  if (!tbody) return;
  
  if (filteredData.length === 0) {
    showEmptyState();
    updatePaginationInfo();
    return;
  }
  
  // Calcular paginação
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageData = filteredData.slice(startIndex, endIndex);
  
  // Renderizar linhas
  tbody.innerHTML = pageData.map(item => `
    <tr class="fade-in">
      <td><strong>${item.id}</strong></td>
      <td>${item.origem}</td>
      <td>${item.cliente}</td>
      <td>${item.emissao}</td>
      <td><strong>${item.valor}</strong></td>
      <td>
        <span class="situacao-badge situacao-${item.situacao}">
          ${getSituacaoText(item.situacao)}
        </span>
      </td>
    </tr>
  `).join('');
  
  updatePaginationInfo();
  updatePaginationButtons();
}

// Obter texto da situação
function getSituacaoText(situacao) {
  const situacoes = {
    'pendente': 'Pendente',
    'aprovada': 'Aprovada',
    'cancelada': 'Cancelada'
  };
  return situacoes[situacao] || situacao;
}

// Atualizar informações de paginação
function updatePaginationInfo() {
  const paginationText = document.getElementById('paginationText');
  if (!paginationText) return;
  
  const totalItems = filteredData.length;
  const startItem = totalItems === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  paginationText.textContent = `${startItem}-${endItem} of ${totalItems}`;
}

// Atualizar botões de paginação
function updatePaginationButtons() {
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  
  if (prevBtn && nextBtn) {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
  }
}

// Adicionar inicialização da página de devoluções ao DOM ready existente
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 DOM carregado - tentando inicializar devoluções...');
  
  // Configuração simples e direta do botão
  function setupButton() {
    const btn = document.getElementById('novaProcessoBtn') || document.querySelector('#novaProcessoBtn') || document.querySelector('button:contains("Nova Devolução")');
    if (btn) {
      console.log('✅ Botão encontrado, adicionando listener...');
      btn.onclick = function(e) {
        e.preventDefault();
        console.log('🚀 Clique detectado! Redirecionando...');
        window.location.href = './nova-devolucao.html';
      };
      return true;
    } else {
      console.log('❌ Botão novaProcessoBtn não encontrado!');
      console.log('Tentando encontrar por outros métodos...');
      const allButtons = document.querySelectorAll('button');
      console.log('Botões encontrados:', allButtons.length);
      allButtons.forEach((btn, i) => {
        console.log(`Botão ${i}:`, btn.id, btn.textContent.trim());
      });
      return false;
    }
  }
  
  // Tentar configurar imediatamente
  if (!setupButton()) {
    // Se não encontrou, tentar novamente após um delay
    setTimeout(() => {
      if (!setupButton()) {
        // Última tentativa após mais delay
        setTimeout(setupButton, 500);
      }
    }, 200);
  }
  
  // Aguardar um tick para garantir que outros scripts carregaram
  setTimeout(initializeDevolucoesPage, 100);
});
