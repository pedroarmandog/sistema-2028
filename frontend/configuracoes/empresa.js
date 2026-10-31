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

// Carregar empresas do backend
async function loadEmpresas() {
  console.log("Carregando empresas...");

  // Mostrar loading
  showLoading(true);

  try {
    // Carregar empresas do backend via API
    const empresasArray = await ApiClient.getEmpresas();
    empresasData = Array.isArray(empresasArray) ? empresasArray : [];

    // Atualizar interface
    renderEmpresas();
    updateEmptyState();
    updatePagination();
    showLoading(false);

    console.log("Empresas carregadas:", empresasData.length);
  } catch (error) {
    console.error("❌ Erro ao carregar empresas do backend:", error);
    empresasData = [];
    showLoading(false);
    showNotification("Erro ao carregar empresas: " + error.message, "error");
  }
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
  // Redireciona para a página de cadastro de empresa (arquivo local)
  try {
    window.location.href = "./cadastrar-empresa.html";
  } catch (err) {
    console.error("Erro ao navegar para cadastrar-empresa.html", err);
    showNotification(
      "Não foi possível abrir o formulário de cadastro",
      "error",
    );
  }
}

// Manipular visualização de empresa
function handleViewEmpresa(empresaId) {
  console.log("Visualizar empresa:", empresaId);
  showNotification("Funcionalidade de visualização em desenvolvimento", "info");

  // TODO: Implementar modal ou redirecionamento para detalhes
}

// Manipular edição de empresa
function handleEditEmpresa(empresaId) {
  // Redireciona para o formulário de edição com parâmetro id
  try {
    window.location.href = `./cadastrar-empresa.html?id=${empresaId}`;
  } catch (err) {
    console.error("Erro ao navegar para edição da empresa", err);
    showNotification("Não foi possível abrir o formulário de edição", "error");
  }
}

// Manipular exclusão de empresa
async function handleDeleteEmpresa(empresaId) {
  // Pergunta de confirmação ao usuário
  try {
    const confirmMsg =
      "Deseja realmente excluir esta empresa? Esta ação não poderá ser desfeita.";
    if (!(await confirmar(confirmMsg))) {
      return; // usuário cancelou
    }

    // Deletar do backend via API
    await ApiClient.deletarEmpresa(empresaId);
    console.log("✅ Empresa deletada do backend");

    // Remover do array local
    const beforeCount = empresasData.length;
    empresasData = empresasData.filter((e) => e.id !== empresaId);

    // Ajustar página atual se necessário
    const totalPages = Math.max(
      1,
      Math.ceil(empresasData.length / itemsPerPage),
    );
    if (currentPage > totalPages) currentPage = totalPages;
    renderEmpresas(searchInput ? searchInput.value.trim() : "");
    updatePagination();

    const afterCount = empresasData.length;
    if (afterCount < beforeCount) {
      showNotification("Empresa excluída com sucesso", "success");
    } else {
      showNotification("Empresa não encontrada para exclusão", "error");
    }
  } catch (err) {
    console.error("Erro ao excluir empresa", err);
    showNotification("Erro ao excluir empresa: " + err.message, "error");
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
