// Copiado de frontend/dashboard.js - funcionalidades do menu e header

console.log("🚀 menu.js carregado (snippet do dashboard)");

function detectarIDsDuplicados() {
  const idsParaVerificar = [
    "clienteMenuItem",
    "clienteSubmenu",
    "itemMenuItem",
    "itemSubmenu",
    "petMenuItem",
    "petSubmenu",
    "atendimentoMenuItem",
    "atendimentoSubmenu",
    "financeiroMenuItem",
    "financeiroSubmenu",
    "configuracaoMenuItem",
    "configuracaoSubmenu",
    "painelMenuItem",
    "painelSubmenu",
    "comprasMenuItem",
    "comprasSubmenu",
  ];

  let problemas = [];
  idsParaVerificar.forEach((id) => {
    const elementos = document.querySelectorAll(`#${id}`);
    if (elementos.length > 1) {
      problemas.push(`ID '${id}' duplicado ${elementos.length} vezes`);
      console.warn(`⚠️  ID DUPLICADO: ${id} (${elementos.length} elementos)`);
    }
  });

  if (problemas.length > 0) {
    console.error("🚨 PROBLEMAS DE IDs DUPLICADOS DETECTADOS:");
    problemas.forEach((p) => console.error(`   - ${p}`));
    return false;
  }

  console.log("✅ Verificação de IDs: Nenhum duplicado encontrado");
  return true;
}

function configurarDropdownInicioRapido() {
  if (window.dropdownConfigurado) return;
  const dropdownBtn = document.getElementById("inicioRapidoBtn");
  const dropdown = document.querySelector(".dropdown");
  if (dropdownBtn && dropdown) {
    dropdownBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const wasOpen = dropdown.classList.contains("open");
      dropdown.classList.toggle("open");
    });

    document.addEventListener("click", function (e) {
      if (!dropdown.contains(e.target)) {
        if (dropdown.classList.contains("open"))
          dropdown.classList.remove("open");
      }
    });

    window.dropdownConfigurado = true;
  }
}

function salvarEstadoSubmenu(submenuId, isOpen) {
  try {
    const estadoSubmenus = JSON.parse(
      localStorage.getItem("estadoSubmenus") || "{}",
    );
    estadoSubmenus[submenuId] = isOpen;
    localStorage.setItem("estadoSubmenus", JSON.stringify(estadoSubmenus));
  } catch (error) {
    console.error(error);
  }
}

function obterEstadoSubmenu(submenuId) {
  try {
    return (
      JSON.parse(localStorage.getItem("estadoSubmenus") || "{}")[submenuId] ||
      false
    );
  } catch (e) {
    return false;
  }
}

function configurarPersistenciaSubmenu(menuItemId, submenuId, submenuName) {
  const menuItems = document.querySelectorAll(`#${menuItemId}`);
  const submenus = document.querySelectorAll(`#${submenuId}`);
  if (menuItems.length > 1) {
    for (let i = 1; i < menuItems.length; i++) {
      const duplicateElement = menuItems[i].closest(".nav-item-with-submenu");
      if (duplicateElement) duplicateElement.remove();
    }
  }
  if (submenus.length > 1) {
    for (let i = 1; i < submenus.length; i++) submenus[i].remove();
  }

  const menuItem = document.getElementById(menuItemId);
  const submenu = document.getElementById(submenuId);
  const menuContainer = menuItem?.parentElement;
  if (menuItem && submenu && menuContainer) {
    if (menuItem.getAttribute("data-listener-added")) return;
    menuItem.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.target.closest(".submenu-item")) return;
      fecharOutrosSubmenus(submenuName);
      const isNowOpen = !menuContainer.classList.contains("open");
      menuContainer.classList.toggle("open");
      submenu.classList.toggle("open");
      salvarEstadoSubmenu(submenuName, isNowOpen);
    });

    const submenuItems = submenu.querySelectorAll(".submenu-item[href]");
    submenuItems.forEach((item) =>
      item.addEventListener("click", function (e) {
        e.stopPropagation();
        setTimeout(() => {
          menuContainer.classList.remove("open");
          submenu.classList.remove("open");
          salvarEstadoSubmenu(submenuName, false);
        }, 150);
      }),
    );
    const submenuItemsSemHref = submenu.querySelectorAll(
      ".submenu-item:not([href])",
    );
    submenuItemsSemHref.forEach((item) =>
      item.addEventListener("click", function (e) {
        e.stopPropagation();
        menuContainer.classList.remove("open");
        submenu.classList.remove("open");
        salvarEstadoSubmenu(submenuName, false);
      }),
    );

    menuItem.setAttribute("data-listener-added", "true");
  }
}

function fecharOutrosSubmenus(submenuAtual) {
  const todosSubmenus = [
    { container: "clienteMenuItem", submenu: "clienteSubmenu", id: "cliente" },
    { container: "itemMenuItem", submenu: "itemSubmenu", id: "item" },
    { container: "petMenuItem", submenu: "petSubmenu", id: "pet" },
    {
      container: "atendimentoMenuItem",
      submenu: "atendimentoSubmenu",
      id: "atendimento",
    },
    {
      container: "financeiroMenuItem",
      submenu: "financeiroSubmenu",
      id: "financeiro",
    },
    {
      container: "configuracaoMenuItem",
      submenu: "configuracaoSubmenu",
      id: "configuracao",
    },
    { container: "painelMenuItem", submenu: "painelSubmenu", id: "painel" },
    { container: "comprasMenuItem", submenu: "comprasSubmenu", id: "compras" },
  ];
  todosSubmenus.forEach(({ container, submenu, id }) => {
    if (id !== submenuAtual) {
      const containerElement =
        document.getElementById(container)?.parentElement;
      const submenuElement = document.getElementById(submenu);
      if (containerElement && submenuElement) {
        if (containerElement.classList.contains("open")) {
          containerElement.classList.remove("open");
          submenuElement.classList.remove("open");
          salvarEstadoSubmenu(id, false);
        }
      }
    }
  });
}

function limparEstadoSubmenus() {
  try {
    localStorage.removeItem("estadoSubmenus");
  } catch (e) {}
}

function destacarSecaoAtiva() {
  const paginaAtual = window.location.pathname.split("/").pop() || "index.html";
  const mapeamentoPaginas = {
    "clientes.html": "clienteMenuItem",
    "novo-cliente.html": "clienteMenuItem",
    "grupos-clientes.html": "clienteMenuItem",
    "meus-clientes.html": "clienteMenuItem",
    "meus-itens.html": "itemMenuItem",
    "novo-item.html": "itemMenuItem",
    "agrupamento.html": "itemMenuItem",
    "marca.html": "itemMenuItem",
    "unidade.html": "itemMenuItem",
    "descontos-item.html": "itemMenuItem",
    "comissao.html": "itemMenuItem",
    "etiquetas.html": "itemMenuItem",
    "tributacao.html": "itemMenuItem",
    "estoque.html": "itemMenuItem",
    "clinica.html": "itemMenuItem",
    "manutencao-produtos.html": "itemMenuItem",
    "controle-validade.html": "itemMenuItem",
    "agendamentos-novo.html": "atendimentoMenuItem",
    "agendamentos.html": "atendimentoMenuItem",
    "minha-agenda.html": "atendimentoMenuItem",
    "meus-pets.html": "petMenuItem",
    "novo-pet.html": "petMenuItem",
    "dashboard.html": "dashboard",
  };
  const itemParaDestacar = mapeamentoPaginas[paginaAtual];
  if (itemParaDestacar && itemParaDestacar !== "dashboard") {
    const menuItem = document.getElementById(itemParaDestacar);
    if (menuItem) {
      document
        .querySelectorAll(".nav-item")
        .forEach((item) => item.classList.remove("active"));
      menuItem.classList.add("active");
    }
  }
}

// Inicialização
document.addEventListener("DOMContentLoaded", function () {
  detectarIDsDuplicados();
  limparEstadoSubmenus();

  const menuToggle = document.querySelector(".menu-toggle");
  const sidebar = document.querySelector(".sidebar");
  const mainContent = document.querySelector(".main-content");
  if (menuToggle && sidebar && mainContent) {
    if (!menuToggle.hasAttribute("data-toggle-configured")) {
      menuToggle.setAttribute("data-toggle-configured", "true");
      menuToggle.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        sidebar.classList.toggle("collapsed");
        mainContent.classList.toggle("sidebar-collapsed");
      });
    }
  }

  document.addEventListener("click", function (e) {
    if (window.innerWidth <= 768) {
      if (
        sidebar &&
        mainContent &&
        !sidebar.contains(e.target) &&
        !menuToggle.contains(e.target)
      ) {
        sidebar.classList.add("collapsed");
        mainContent.classList.add("sidebar-collapsed");
      }
    }
  });

  configurarDropdownInicioRapido();
  configurarPersistenciaSubmenu("clienteMenuItem", "clienteSubmenu", "cliente");
  configurarPersistenciaSubmenu("itemMenuItem", "itemSubmenu", "item");
  configurarPersistenciaSubmenu("painelMenuItem", "painelSubmenu", "painel");
  configurarPersistenciaSubmenu("petMenuItem", "petSubmenu", "pet");
  configurarPersistenciaSubmenu(
    "atendimentoMenuItem",
    "atendimentoSubmenu",
    "atendimento",
  );
  configurarPersistenciaSubmenu(
    "financeiroMenuItem",
    "financeiroSubmenu",
    "financeiro",
  );
  configurarPersistenciaSubmenu(
    "configuracaoMenuItem",
    "configuracaoSubmenu",
    "configuracao",
  );
  configurarPersistenciaSubmenu("comprasMenuItem", "comprasSubmenu", "compras");
  destacarSecaoAtiva();
});

// Funções de navegação rápida (shims)
function novoAtendimento() {
  window.location.href = "/agendamentos-novo.html";
  closeDropdown();
}
function novoPet() {
  window.location.href = "/pets/cadastro-pet.html";
  closeDropdown();
}
function novoCliente() {
  window.location.href = "/clientes.html";
  closeDropdown();
}
function novoContrato() {
  window.location.href = "/contrato-novo.html";
  closeDropdown();
}
function novaVenda() {
  window.location.href = "/venda-nova.html";
  closeDropdown();
}
function novaContaPagar() {
  window.location.href = "/contas-pagar-nova.html";
  closeDropdown();
}
function closeDropdown() {
  const dropdown = document.querySelector(".dropdown");
  if (dropdown) dropdown.classList.remove("open");
}

// Configurar submenu lateral para Caixa
function configurarSubmenuLateralCaixa() {
  console.log("🔍 Iniciando configuração do submenu lateral Caixa...");

  const caixaSubmenuItem = document.getElementById("caixaSubmenuItem");
  const caixaLateralSubmenu = document.getElementById("caixaLateralSubmenu");
  const submenuItemWithLateral = document.querySelector(
    ".submenu-item-with-lateral",
  );

  console.log("🔍 Elementos encontrados:");
  console.log("- caixaSubmenuItem:", caixaSubmenuItem);
  console.log("- caixaLateralSubmenu:", caixaLateralSubmenu);
  console.log("- submenuItemWithLateral:", submenuItemWithLateral);

  if (caixaSubmenuItem && caixaLateralSubmenu && submenuItemWithLateral) {
    console.log("✅ Configurando submenu lateral do Caixa...");

    let isSubmenuVisible = false;

    // Função para mostrar submenu
    const showSubmenu = () => {
      console.log("📤 Mostrando submenu lateral");
      caixaLateralSubmenu.style.opacity = "1";
      caixaLateralSubmenu.style.visibility = "visible";
      caixaLateralSubmenu.style.transform = "translateX(0)";
      isSubmenuVisible = true;
    };

    // Função para esconder submenu
    const hideSubmenu = () => {
      console.log("📥 Escondendo submenu lateral");
      caixaLateralSubmenu.style.opacity = "0";
      caixaLateralSubmenu.style.visibility = "hidden";
      caixaLateralSubmenu.style.transform = "translateX(-10px)";
      isSubmenuVisible = false;
    };

    // Configurar hover no container principal
    submenuItemWithLateral.addEventListener("mouseenter", function () {
      console.log("🎯 Mouse entrou no container do Caixa");
      showSubmenu();
    });

    submenuItemWithLateral.addEventListener("mouseleave", function () {
      console.log("🎯 Mouse saiu do container do Caixa");
      setTimeout(hideSubmenu, 100);
    });

    // Configurar hover no submenu lateral
    caixaLateralSubmenu.addEventListener("mouseenter", function () {
      console.log("🎯 Mouse entrou no submenu lateral");
      showSubmenu();
    });

    caixaLateralSubmenu.addEventListener("mouseleave", function () {
      console.log("🎯 Mouse saiu do submenu lateral");
      hideSubmenu();
    });

    // Adicionar event listeners para os itens do submenu lateral
    const lateralItems = caixaLateralSubmenu.querySelectorAll(
      ".lateral-submenu-item",
    );
    console.log(
      `🔍 Encontrados ${lateralItems.length} itens no submenu lateral`,
    );

    lateralItems.forEach((item, index) => {
      item.addEventListener("click", function (e) {
        e.preventDefault();
        const texto = this.textContent.trim();
        console.log(`🚀 Clique em: ${texto}`);

        // Aqui você pode adicionar navegação específica para cada item
        switch (texto) {
          case "Abertura/Fechamento":
            alert("Navegando para Abertura/Fechamento de Caixa");
            // window.location.href = '/caixa/abertura-fechamento.html';
            break;
          case "Suprimento/Sangria":
            alert("Navegando para Suprimento/Sangria");
            // window.location.href = '/caixa/suprimento-sangria.html';
            break;
          case "Rel. Demonstrativo de caixa":
            alert("Navegando para Relatório Demonstrativo de Caixa");
            // window.location.href = '/caixa/relatorio-demonstrativo.html';
            break;
        }

        hideSubmenu();
      });

      console.log(
        `✅ Configurado evento click para item ${index + 1}: ${item.textContent.trim()}`,
      );
    });

    console.log("✅ Submenu lateral do Caixa configurado com sucesso!");
  } else {
    console.error("❌ Elementos do submenu lateral Caixa não encontrados");
    console.log(
      "- Verifique se os IDs caixaSubmenuItem e caixaLateralSubmenu existem no HTML",
    );
    console.log(
      "- Verifique se a classe .submenu-item-with-lateral existe no HTML",
    );
  }
}

// Adicionar configuração do submenu lateral ao DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
  // Aguardar um pouco para garantir que outros elementos carregaram
  setTimeout(() => {
    configurarSubmenuLateralCaixa();
  }, 200);
});

// ==========================================
// EMPRESAS - FUNCIONALIDADES
// ==========================================

// Estado global das empresas
let empresasData = [];
let currentPage = 1;
const itemsPerPage = 10;

// Elementos da página
let searchInput,
  searchBtn,
  empresaTable,
  paginationInfo,
  paginationControls,
  btnFloatingAdd,
  btnAddEmpresa;

// Inicialização da página de empresas
function initializeEmpresas() {
  console.log("Inicializando página de empresas...");

  // Obter elementos da página
  searchInput = document.querySelector(".search-box-empresa input");
  searchBtn = document.querySelector(".btn-pesquisar");
  empresaTable = document.querySelector(".empresa-table tbody");
  paginationInfo = document.querySelector(".pagination-info");
  paginationControls = document.querySelector(".pagination-controls");
  btnFloatingAdd = document.querySelector(".btn-floating-add");
  btnAddEmpresa = document.querySelector(".btn-add-empresa");

  // Verificar se estamos na página de empresas
  if (!empresaTable) {
    console.log("Não é a página de empresas, pulando inicialização");
    return;
  }

  // Configurar eventos
  setupEventListeners();

  // Carregar dados iniciais
  loadEmpresas();

  // Atualizar interface
  updateEmptyState();
  updatePagination();
}

// Configurar eventos
function setupEventListeners() {
  // Pesquisa
  if (searchInput) {
    searchInput.addEventListener("input", debounce(handleSearch, 300));
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearch();
      }
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener("click", handleSearch);
  }

  // Botões de adicionar empresa
  if (btnFloatingAdd) {
    btnFloatingAdd.addEventListener("click", handleAddEmpresa);
  }

  if (btnAddEmpresa) {
    btnAddEmpresa.addEventListener("click", handleAddEmpresa);
  }
}

// Carregar empresas (simulação - substituir por API real)
function loadEmpresas() {
  console.log("Carregando empresas...");

  // Simular carregamento
  showLoading(true);

  setTimeout(() => {
    // Por enquanto, deixar vazio como solicitado
    empresasData = [];

    // Atualizar interface
    renderEmpresas();
    updateEmptyState();
    updatePagination();
    showLoading(false);

    console.log("Empresas carregadas:", empresasData.length);
  }, 1000);
}

// Renderizar lista de empresas
function renderEmpresas(searchTerm = "") {
  if (!empresaTable) return;

  // Filtrar empresas se houver termo de pesquisa
  let filteredEmpresas = empresasData;
  if (searchTerm) {
    filteredEmpresas = empresasData.filter(
      (empresa) =>
        empresa.nomeFantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
        empresa.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
        empresa.cnpj.includes(searchTerm),
    );
  }

  // Calcular paginação
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEmpresas = filteredEmpresas.slice(startIndex, endIndex);

  // Limpar tabela
  empresaTable.innerHTML = "";

  if (paginatedEmpresas.length === 0) {
    // Mostrar estado vazio
    const emptyRow = document.createElement("tr");
    emptyRow.className = "empty-state";
    emptyRow.innerHTML = `
            <td colspan="6">
                <div class="empty-content">
                    <i class="fas fa-building"></i>
                    <h3>Nenhuma empresa cadastrada</h3>
                    <p>Ainda não há empresas no sistema. Cadastre a primeira empresa para começar.</p>
                    <button class="btn-add-empresa">
                        <i class="fas fa-plus"></i>
                        Cadastrar Primeira Empresa
                    </button>
                </div>
            </td>
        `;
    empresaTable.appendChild(emptyRow);

    // Reconfigurar evento do botão
    const newBtnAdd = emptyRow.querySelector(".btn-add-empresa");
    if (newBtnAdd) {
      newBtnAdd.addEventListener("click", handleAddEmpresa);
    }
  } else {
    // Renderizar empresas
    paginatedEmpresas.forEach((empresa) => {
      const row = createEmpresaRow(empresa);
      empresaTable.appendChild(row);
    });
  }

  // Atualizar informações de paginação
  updatePaginationInfo(filteredEmpresas.length);
}

// Criar linha da tabela para uma empresa
function createEmpresaRow(empresa) {
  const row = document.createElement("tr");
  row.innerHTML = `
        <td>${empresa.codigo}</td>
        <td>${empresa.razaoSocial}</td>
        <td>${empresa.nomeFantasia}</td>
        <td>${formatCNPJ(empresa.cnpj)}</td>
        <td>${empresa.codigoLoja}</td>
        <td class="actions-column">
            <button class="btn-action btn-view" onclick="handleViewEmpresa('${empresa.id}')" title="Visualizar">
                <i class="fas fa-eye"></i>
            </button>
            <button class="btn-action btn-edit" onclick="handleEditEmpresa('${empresa.id}')" title="Editar">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn-action btn-delete" onclick="handleDeleteEmpresa('${empresa.id}')" title="Excluir">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
  return row;
}

// Manipular pesquisa
function handleSearch() {
  const searchTerm = searchInput ? searchInput.value.trim() : "";
  console.log("Pesquisando por:", searchTerm);

  // Resetar para primeira página
  currentPage = 1;

  // Renderizar resultados filtrados
  renderEmpresas(searchTerm);
  updatePagination();

  // Feedback visual
  if (searchTerm) {
    showNotification(`Pesquisando por: "${searchTerm}"`, "info");
  }
}

// Manipular adição de empresa
function handleAddEmpresa() {
  console.log("Adicionar nova empresa");
  showNotification("Funcionalidade de cadastro em desenvolvimento", "info");

  // TODO: Implementar modal ou redirecionamento para formulário de cadastro
  // window.location.href = 'novo-empresa.html';
}

// Manipular visualização de empresa
function handleViewEmpresa(empresaId) {
  console.log("Visualizar empresa:", empresaId);
  showNotification("Funcionalidade de visualização em desenvolvimento", "info");

  // TODO: Implementar modal ou redirecionamento para detalhes
}

// Manipular edição de empresa
function handleEditEmpresa(empresaId) {
  console.log("Editar empresa:", empresaId);
  showNotification("Funcionalidade de edição em desenvolvimento", "info");

  // TODO: Implementar modal ou redirecionamento para formulário de edição
}

// Manipular exclusão de empresa
async function handleDeleteEmpresa(empresaId) {
  console.log("Excluir empresa:", empresaId);

  if (await confirmar("Tem certeza que deseja excluir esta empresa?")) {
    // TODO: Implementar exclusão via API
    showNotification("Funcionalidade de exclusão em desenvolvimento", "info");
  }
}

// Atualizar estado vazio
function updateEmptyState() {
  const hasEmpresas = empresasData.length > 0;
  const tableContainer = document.querySelector(".table-container");

  if (tableContainer) {
    if (hasEmpresas) {
      tableContainer.style.display = "block";
    } else {
      tableContainer.style.display = "block"; // Manter visível para mostrar estado vazio
    }
  }
}

// Atualizar paginação
function updatePagination() {
  const totalItems = empresasData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  updatePaginationInfo(totalItems);
  updatePaginationControls(totalPages);
}

// Atualizar informações de paginação
function updatePaginationInfo(totalItems) {
  if (!paginationInfo) return;

  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  paginationInfo.textContent = `Mostrando ${startItem}-${endItem} de ${totalItems} empresas`;
}

// Atualizar controles de paginação
function updatePaginationControls(totalPages) {
  if (!paginationControls) return;

  paginationControls.innerHTML = "";

  // Botão anterior
  const prevBtn = document.createElement("button");
  prevBtn.className = "btn-page";
  prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Anterior';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener("click", () => changePage(currentPage - 1));
  paginationControls.appendChild(prevBtn);

  // Números das páginas
  const pageNumbers = document.createElement("div");
  pageNumbers.className = "page-numbers";

  for (let i = 1; i <= totalPages; i++) {
    const pageBtn = document.createElement("button");
    pageBtn.className = `page-number ${i === currentPage ? "active" : ""}`;
    pageBtn.textContent = i;
    pageBtn.addEventListener("click", () => changePage(i));
    pageNumbers.appendChild(pageBtn);
  }

  paginationControls.appendChild(pageNumbers);

  // Botão próximo
  const nextBtn = document.createElement("button");
  nextBtn.className = "btn-page";
  nextBtn.innerHTML = 'Próximo <i class="fas fa-chevron-right"></i>';
  nextBtn.disabled = currentPage === totalPages || totalPages === 0;
  nextBtn.addEventListener("click", () => changePage(currentPage + 1));
  paginationControls.appendChild(nextBtn);
}

// Mudar página
function changePage(newPage) {
  const totalPages = Math.ceil(empresasData.length / itemsPerPage);

  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    renderEmpresas(searchInput ? searchInput.value.trim() : "");
    updatePagination();

    // Scroll para o topo da tabela
    const container = document.querySelector(".container");
    if (container) {
      container.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
}

// Formatar CNPJ
function formatCNPJ(cnpj) {
  if (!cnpj) return "";

  // Remove caracteres não numéricos
  const numbers = cnpj.replace(/\D/g, "");

  // Aplica formatação
  if (numbers.length === 14) {
    return numbers.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5",
    );
  }

  return cnpj;
}

// Mostrar indicador de carregamento
function showLoading(show) {
  const container = document.querySelector(".container");
  if (container) {
    if (show) {
      container.classList.add("loading");
    } else {
      container.classList.remove("loading");
    }
  }
}

// Função debounce para pesquisa
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Mostrar notificações
function showNotification(message, type = "success") {
  // Remover notificação existente
  const existingNotification = document.querySelector(".notification");
  if (existingNotification) {
    existingNotification.remove();
  }

  // Criar nova notificação
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === "success" ? "fa-check-circle" : type === "error" ? "fa-exclamation-circle" : "fa-info-circle"}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;

  // Adicionar estilos
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === "success" ? "#4CAF50" : type === "error" ? "#f44336" : "#2196F3"};
        color: white;
        padding: 15px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 15px;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
    `;

  // Adicionar ao DOM
  document.body.appendChild(notification);

  // Configurar botão de fechar
  const closeBtn = notification.querySelector(".notification-close");
  if (closeBtn) {
    closeBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 0;
            font-size: 14px;
        `;
    closeBtn.addEventListener("click", () => notification.remove());
  }

  // Remover automaticamente após 5 segundos
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}

// Adicionar configuração das empresas ao DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
  // Aguardar um pouco para garantir que outros elementos carregaram
  setTimeout(() => {
    initializeEmpresas();
  }, 300);
});

// CEP lookup: consulta ViaCEP e preenche campos do formulário quando disponível
function limparCep(cep) {
  return (cep || "").toString().replace(/\D/g, "");
}

async function buscarCep(cepRaw) {
  const cep = limparCep(cepRaw);
  if (!cep || cep.length !== 8) return;
  const apiBase = (window.VPS_URL || "") + "/api";
  const url = `${apiBase}/cep/${cep}`;
  try {
    const res = await fetch(url, { credentials: "include", cache: "no-store" });
    if (!res.ok) throw new Error("Erro ao consultar CEP");
    const data = await res.json();
    if (data.erro) {
      showNotification("CEP não encontrado", "error");
      return;
    }
    // Preencher campos se existirem
    const enderecoEl = document.getElementById("endereco");
    const bairroEl = document.getElementById("bairro");
    const cidadeEl = document.getElementById("cidade");
    const complementoEl = document.getElementById("complemento");
    if (enderecoEl) enderecoEl.value = data.logradouro || "";
    if (bairroEl) bairroEl.value = data.bairro || "";
    if (cidadeEl)
      cidadeEl.value = data.localidade
        ? data.localidade.toUpperCase() + (data.uf ? " (" + data.uf + ")" : "")
        : "";
    if (complementoEl) complementoEl.value = data.complemento || "";
    showNotification("Endereço preenchido automaticamente", "success");
  } catch (err) {
    console.error("buscarCep error", err);
    showNotification("Falha ao consultar CEP", "error");
  }
}

// Configurar listeners para o campo CEP quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", function () {
  setTimeout(() => {
    const cepInput = document.getElementById("cep");
    if (!cepInput) return;
    // Ao perder o foco, tenta buscar
    cepInput.addEventListener("blur", function () {
      buscarCep(this.value);
    });
    // Ao digitar, quando tiver 8 dígitos tenta buscar automaticamente (debounced)
    cepInput.addEventListener(
      "input",
      debounce(function () {
        const digits = limparCep(cepInput.value);
        if (digits.length === 8) buscarCep(digits);
      }, 300),
    );
  }, 350);
});

// Handlers para Salvar / Cancelar
document.addEventListener("DOMContentLoaded", function () {
  setTimeout(() => {
    const btnSalvar = document.getElementById("btnSalvar");
    const btnCancelar = document.getElementById("btnCancelar");
    if (btnCancelar)
      btnCancelar.addEventListener("click", function () {
        window.location.href = "./empresa.html";
      });
    if (btnSalvar)
      btnSalvar.addEventListener("click", function (e) {
        e.preventDefault();
        salvarEmpresa();
      });
  }, 400);
});

// Inicialização do formulário: distingue novo vs edição (query param `id`)
(function initFormOnOpen() {
  try {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("id");
    const preview = document.getElementById("logoPreview");
    const defaultSrc = preview ? preview.getAttribute("src") : "";

    const breadcrumbEl = document.getElementById("breadcrumbEmpresa");
    if (editId) {
      // Modo edição: carregar dados do backend
      ApiClient.getEmpresa(editId)
        .then((empresa) => {
          if (empresa) {
            // preencher campos existentes - mapear campos do backend para IDs do formulário
            if (empresa.nome) {
              const nomeInput = document.getElementById("nomeFantasia");
              if (nomeInput) nomeInput.value = empresa.nome;
            }
            if (empresa.razaoSocial) {
              const rsInput = document.getElementById("razaoSocial");
              if (rsInput) rsInput.value = empresa.razaoSocial;
            }
            if (empresa.cnpj) {
              const cnpjInput = document.getElementById("cnpj");
              if (cnpjInput) cnpjInput.value = empresa.cnpj;
            }
            if (empresa.telefone) {
              const telInput = document.getElementById("telefone1");
              if (telInput) telInput.value = empresa.telefone;
            }
            if (empresa.telefone2) {
              const tel2Input = document.getElementById("telefone2");
              if (tel2Input) tel2Input.value = empresa.telefone2;
            }
            if (empresa.telefonePlantao) {
              const telPInput = document.getElementById("telefonePlantao");
              if (telPInput) telPInput.value = empresa.telefonePlantao;
            }
            if (empresa.email) {
              const emailInput = document.getElementById("email");
              if (emailInput) emailInput.value = empresa.email;
            }
            if (empresa.inscricaoEstadual) {
              const ieInput = document.getElementById("inscricaoEstadual");
              if (ieInput) ieInput.value = empresa.inscricaoEstadual;
            }
            if (empresa.inscricaoMunicipal) {
              const imInput = document.getElementById("inscricaoMunicipal");
              if (imInput) imInput.value = empresa.inscricaoMunicipal;
            }
            if (empresa.credenciamento) {
              const credInput = document.getElementById("credenciamento");
              if (credInput) credInput.value = empresa.credenciamento;
            }
            if (empresa.regime) {
              const regimeInput = document.getElementById("regime");
              if (regimeInput) regimeInput.value = empresa.regime;
            }
            // Campos fiscais
            const camposFiscais = [
              "cnae",
              "crt",
              "codigo_ibge_municipio",
              "pais",
            ];
            camposFiscais.forEach(function (campo) {
              if (empresa[campo] !== undefined && empresa[campo] !== null) {
                const el = document.getElementById(campo);
                if (el) el.value = empresa[campo];
              }
            });
            if (empresa.ativo !== undefined && empresa.ativo !== null) {
              const ativoInput = document.getElementById("ativo");
              if (ativoInput) ativoInput.value = empresa.ativo ? "Sim" : "Não";
            }

            // endereço (JSON -> campos individuais)
            if (empresa.endereco && typeof empresa.endereco === "object") {
              const endInput = document.getElementById("endereco");
              const numInput = document.getElementById("numero");
              const compInput = document.getElementById("complemento");
              const bairroInput = document.getElementById("bairro");
              const cidInput = document.getElementById("cidade");
              const cepInput = document.getElementById("cep");

              if (endInput && empresa.endereco.rua)
                endInput.value = empresa.endereco.rua;
              if (numInput && empresa.endereco.numero)
                numInput.value = empresa.endereco.numero;
              if (compInput && empresa.endereco.complemento)
                compInput.value = empresa.endereco.complemento;
              if (bairroInput && empresa.endereco.bairro)
                bairroInput.value = empresa.endereco.bairro;
              if (cidInput && empresa.endereco.cidade)
                cidInput.value = empresa.endereco.cidade;
              if (cepInput && empresa.endereco.cep)
                cepInput.value = empresa.endereco.cep;
            }

            // logo - carregar do servidor se existir, MAS só se não houver logo nova selecionada
            if (preview && empresa.logo && empresa.logo !== "") {
              // Verificar se já tem logo nova carregada (usuário selecionou nova logo)
              const hasNewLogo =
                window._currentLogoDataUrl && window._currentLogoDataUrl !== "";
              if (!hasNewLogo) {
                // logo é o nome do arquivo, construir URL completo (base configurável)
                const _API_BASE = window.__API_BASE__
                  ? window.__API_BASE__.replace(/\/$/, "")
                  : "";
                preview.src = _API_BASE + "/uploads/" + empresa.logo;
                console.log("📸 Logo carregada do servidor:", empresa.logo);
              } else {
                console.log("🔄 Mantendo logo nova selecionada pelo usuário");
              }
            }

            // atualizar previews de nome
            const nomeExibicao = empresa.nome || "---";
            const e1 = document.getElementById("empresaCadastroNome");
            if (e1) e1.innerText = nomeExibicao;
            const e2 = document.getElementById("empresaFinanceiroNome");
            if (e2) e2.innerText = nomeExibicao;
            const e3 = document.getElementById("empresaPrecoNome");
            if (e3) e3.innerText = nomeExibicao;

            // breadcrumb
            if (breadcrumbEl)
              breadcrumbEl.innerText = `${empresa.id} - ${nomeExibicao}`;
          }
        })
        .catch((e) => {
          console.warn("Falha ao carregar empresa para edição", e);
        });
    } else {
      // Modo novo: NÃO remover storage; apenas limpar campos e manter logo padrão
      try {
        const campos = document.querySelectorAll("input, select, textarea");
        campos.forEach((el) => {
          if (el.type === "checkbox" || el.type === "radio") el.checked = false;
          else el.value = "";
        });
        // reset preview para padrão
        if (preview && defaultSrc) preview.src = defaultSrc;
        // reset previews de nome
        const e1 = document.getElementById("empresaCadastroNome");
        if (e1) e1.innerText = "---";
        const e2 = document.getElementById("empresaFinanceiroNome");
        if (e2) e2.innerText = "---";
        const e3 = document.getElementById("empresaPrecoNome");
        if (e3) e3.innerText = "---";
        // limpar breadcrumb (em modo novo não mostrar nome)
        if (breadcrumbEl) breadcrumbEl.innerText = "";
      } catch (e) {
        /* silencioso */
      }
    }
  } catch (e) {
    console.warn("initFormOnOpen error", e);
  }
})();

// Atualiza os previews abaixo (Empresa Cadastro / Financeiro / Preço)
document.addEventListener("DOMContentLoaded", function () {
  function atualizarPreviewsNome() {
    const nome = (document.getElementById("nomeFantasia") || {}).value || "";
    const e1 = document.getElementById("empresaCadastroNome");
    const e2 = document.getElementById("empresaFinanceiroNome");
    const e3 = document.getElementById("empresaPrecoNome");
    const texto = nome ? nome : "";
    if (e1) e1.innerText = texto || "---";
    if (e2) e2.innerText = texto || "---";
    if (e3) e3.innerText = texto || "---";
  }

  const nomeInput = document.getElementById("nomeFantasia");
  if (nomeInput) {
    nomeInput.addEventListener("input", atualizarPreviewsNome);
  }
  // chamar uma vez ao abrir
  setTimeout(atualizarPreviewsNome, 200);
});

// --- Logo upload: aceita apenas PNG com transparência ---
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(new Error("Falha ao ler arquivo"));
    fr.readAsDataURL(file);
  });
}

// Verifica se uma imagem PNG dataURL possui pixels com alpha < 255
function pngHasTransparency(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = function () {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      // limitar canvas para evitar OOM: redimensiona se muito grande
      const maxDim = 800;
      let sw = w,
        sh = h;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        sw = Math.round(w * ratio);
        sh = Math.round(h * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, sw, sh);
      ctx.drawImage(img, 0, 0, sw, sh);
      try {
        const imgd = ctx.getImageData(0, 0, sw, sh).data;
        // amostragem para performance: checar cada 10 pixels
        const step = 4 * 10; // cada pixel tem 4 canais
        for (let i = 3; i < imgd.length; i += step) {
          if (imgd[i] < 255) {
            resolve(true);
            return;
          }
        }
        // Se amostragem não encontrou, checar alguns cantos mais detalhadamente
        const corners = [0, sw - 1, (sh - 1) * sw, sw - 1 + (sh - 1) * sw];
        for (let c = 0; c < corners.length; c++) {
          const px = corners[c];
          const idx = px * 4 + 3;
          if (imgd[idx] < 255) {
            resolve(true);
            return;
          }
        }
        resolve(false);
      } catch (e) {
        // se getImageData falhar (CORS), não validar e rejeitar
        console.warn("pngHasTransparency: não foi possível analisar pixels", e);
        resolve(false);
      }
    };
    img.onerror = function () {
      resolve(false);
    };
    img.src = dataUrl;
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const upload = document.getElementById("logoUpload");
  const preview = document.getElementById("logoPreview");
  const removeBtn = document.getElementById("logoRemove");
  const defaultSrc = preview ? preview.getAttribute("src") : "";
  window._currentLogoDataUrl = "";

  if (upload && preview) {
    upload.addEventListener("change", async function (e) {
      e.preventDefault();
      e.stopPropagation();

      const file = (e.target.files && e.target.files[0]) || null;
      if (!file) return;
      if (file.type !== "image/png") {
        if (typeof showNotification === "function")
          showNotification("Apenas arquivos PNG são permitidos", "error");
        upload.value = "";
        return;
      }
      try {
        const dataUrl = await readFileAsDataURL(file);
        // validar dimensões exatas 113x77
        const img = new Image();
        const dimsOk = await new Promise((resolve) => {
          img.onload = function () {
            const w = img.naturalWidth || img.width;
            const h = img.naturalHeight || img.height;
            resolve(w === 113 && h === 77);
          };
          img.onerror = function () {
            resolve(false);
          };
          img.src = dataUrl;
        });
        if (!dimsOk) {
          if (typeof showNotification === "function")
            showNotification(
              "A imagem deve ter exatamente 113x77 pixels",
              "error",
            );
          upload.value = "";
          return;
        }
        const hasTransp = await pngHasTransparency(dataUrl);
        if (!hasTransp) {
          if (typeof showNotification === "function")
            showNotification("O PNG deve ter fundo transparente", "error");
          upload.value = "";
          return;
        }
        // válido: mostrar preview e guardar dataURL temporariamente
        preview.src = dataUrl;
        window._currentLogoDataUrl = dataUrl;
        console.log("✅ Logo carregada, tamanho:", dataUrl.length, "bytes");
        if (typeof showNotification === "function")
          showNotification("Logo carregada com sucesso", "success");
      } catch (err) {
        console.error("Erro ao processar logo:", err);
        if (typeof showNotification === "function")
          showNotification("Erro ao processar a imagem", "error");
        upload.value = "";
      }
    });
  }

  if (removeBtn && preview) {
    removeBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      preview.src = defaultSrc;
      window._currentLogoDataUrl = "";
      if (upload) upload.value = "";
      if (typeof showNotification === "function")
        showNotification("Logo restaurada para o padrão", "info");
    });
  }

  // Ajustar salvarEmpresa para incluir logoDataUrl: já feito abaixo ao coletar campos (pegaremos preview se for data:)
});

// Salvar empresa: cria nova ou atualiza quando em modo edição (query param `id`)
function salvarEmpresa() {
  console.log("🔵 Iniciando salvarEmpresa()...");

  // buscar logo do preview (se for data: então foi carregado pelo usuário)
  const preview = document.getElementById("logoPreview");
  let logoDataUrl = "";
  try {
    if (preview && preview.src && preview.src.indexOf("data:") === 0) {
      logoDataUrl = preview.src;
      console.log(
        "✅ Logo encontrada no preview, tamanho:",
        logoDataUrl.length,
        "bytes",
      );
    } else {
      console.log(
        "⚠️ Sem logo no preview ou não é base64. preview.src:",
        preview?.src?.substring(0, 50),
      );
    }
  } catch (e) {
    console.error("❌ Erro ao capturar logo:", e);
  }

  // detectar se estamos em modo edição (URL ?id=...)
  const params = new URLSearchParams(window.location.search);
  const editId = params.get("id");

  // montar objeto empresa com os campos do formulário
  const empresaForm = {
    nome: (document.getElementById("nomeFantasia") || {}).value || "", // Backend espera 'nome'
    razaoSocial: (document.getElementById("razaoSocial") || {}).value || "",
    cnpj: (document.getElementById("cnpj") || {}).value || "",
    inscricaoEstadual:
      (document.getElementById("inscricaoEstadual") || {}).value || "",
    inscricaoMunicipal:
      (document.getElementById("inscricaoMunicipal") || {}).value || "",
    credenciamento:
      (document.getElementById("credenciamento") || {}).value || "",
    regime: (document.getElementById("regime") || {}).value || "",
    cnae: (document.getElementById("cnae") || {}).value || "",
    crt: (document.getElementById("crt") || {}).value || "",
    codigo_ibge_municipio:
      (document.getElementById("codigo_ibge_municipio") || {}).value || "",
    pais: (document.getElementById("pais") || {}).value || "Brasil",
    telefone: (document.getElementById("telefone1") || {}).value || "",
    telefone2: (document.getElementById("telefone2") || {}).value || "",
    telefonePlantao:
      (document.getElementById("telefonePlantao") || {}).value || "",
    email: (document.getElementById("email") || {}).value || "",
    endereco: {
      rua: (document.getElementById("endereco") || {}).value || "",
      numero: (document.getElementById("numero") || {}).value || "",
      complemento: (document.getElementById("complemento") || {}).value || "",
      bairro: (document.getElementById("bairro") || {}).value || "",
      cidade: (document.getElementById("cidade") || {}).value || "",
      cep: (document.getElementById("cep") || {}).value || "",
    },
    ativo: (document.getElementById("ativo") || {}).value === "Sim",
    ativa: true,
  };

  // Não sobrescrever a logo no backend quando estivermos em modo edição
  // e o usuário NÃO tiver carregado uma nova imagem (logoDataUrl vazia).
  // Ou seja: enviar a propriedade `logo` somente quando houver uma nova imagem.
  if (logoDataUrl && logoDataUrl.length > 0) {
    empresaForm.logo = logoDataUrl;
  }

  console.log("📦 Dados da empresa:", {
    ...empresaForm,
    logo: logoDataUrl ? `[${logoDataUrl.length} bytes]` : "vazio",
  });

  if (editId) {
    // Atualizar empresa existente no backend
    ApiClient.atualizarEmpresa(editId, empresaForm)
      .then(() => {
        if (typeof showNotification === "function")
          showNotification("Empresa atualizada com sucesso", "success");
        setTimeout(() => {
          window.location.href = "./empresa.html";
        }, 600);
      })
      .catch((err) => {
        console.error("Erro ao atualizar empresa", err);
        if (typeof showNotification === "function")
          showNotification(
            "Erro ao atualizar empresa: " + err.message,
            "error",
          );
      });
  } else {
    // Criar nova empresa no backend
    ApiClient.criarEmpresa(empresaForm)
      .then(() => {
        if (typeof showNotification === "function")
          showNotification("Empresa salva com sucesso", "success");
        setTimeout(() => {
          window.location.href = "./empresa.html";
        }, 600);
      })
      .catch((err) => {
        console.error("Erro ao salvar empresa", err);
        if (typeof showNotification === "function")
          showNotification("Erro ao salvar empresa: " + err.message, "error");
      });
  }
}
