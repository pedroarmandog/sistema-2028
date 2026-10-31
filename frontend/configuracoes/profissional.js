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
// PROFISSIONAIS - FUNCIONALIDADES
// ==========================================

// Estado global dos profissionais
let profissionaisData = []; // Vazio inicialmente, será preenchido via API
let currentPage = 1;
const itemsPerPage = 10;
let filteredProfissionais = [];

// Elementos da página
let searchInput,
  searchBtn,
  profissionalTable,
  paginationInfo,
  statusFilter,
  itemsPerPageSelect;
let btnAdicionarProfissional, btnFloatingAdd, btnAddProfissional;

// Inicialização da página de profissionais
async function initializeProfissionais() {
  console.log("Inicializando página de profissionais...");

  // Obter elementos da página
  searchInput = document.querySelector("#searchProfissional");
  searchBtn = document.querySelector(".btn-pesquisar");
  profissionalTable = document.querySelector(".profissional-table tbody");
  paginationInfo = document.querySelector(".pagination-info");
  statusFilter = document.querySelector("#statusFilter");
  itemsPerPageSelect = document.querySelector("#itemsPerPage");
  btnAdicionarProfissional = document.querySelector(
    ".btn-adicionar-profissional",
  );
  btnFloatingAdd = document.querySelector(".btn-floating-add");
  btnAddProfissional = document.querySelector(".btn-add-profissional");

  // Verificar se estamos na página de profissionais
  if (!profissionalTable) {
    console.log("Não é a página de profissionais, pulando inicialização");
    return;
  }

  // Carregar profissionais salvos do backend (aguardar antes de renderizar)
  await carregarProfissionaisSalvos();

  // Configurar eventos
  setupEventListeners();

  // Renderizar profissionais carregados
  filteredProfissionais = [...profissionaisData];
  renderProfissionais();
  updatePagination();

  console.log(
    `Página de profissionais inicializada com ${profissionaisData.length} profissionais`,
  );
}

// Carregar profissionais salvos do backend
async function carregarProfissionaisSalvos() {
  try {
    console.log("🔄 Carregando profissionais do backend...");
    const profissionaisArray = await ApiClient.getProfissionais();
    if (Array.isArray(profissionaisArray) && profissionaisArray.length > 0) {
      profissionaisData = profissionaisArray;
      console.log(
        `✅ ${profissionaisData.length} profissionais carregados do backend`,
      );
      return;
    }

    // Se não há dados salvos, usar array vazio
    profissionaisData = [];
    console.log("📋 Nenhum profissional encontrado, iniciando com lista vazia");
  } catch (error) {
    console.error("❌ Erro ao carregar profissionais do backend:", error);
    profissionaisData = [];
  }
}

// Não há mais necessidade de salvar no localStorage - os dados são salvos no backend via API

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

  // Filtro de status
  if (statusFilter) {
    statusFilter.addEventListener("change", handleStatusFilter);
  }

  // Items por página
  if (itemsPerPageSelect) {
    itemsPerPageSelect.addEventListener("change", handleItemsPerPageChange);
  }

  // Botões de ação
  if (btnAdicionarProfissional) {
    btnAdicionarProfissional.addEventListener("click", handleAddProfissional);
  }

  if (btnFloatingAdd) {
    btnFloatingAdd.addEventListener("click", handleAddProfissional);
  }

  if (btnAddProfissional) {
    btnAddProfissional.addEventListener("click", handleAddProfissional);
  }
}

// Renderizar lista de profissionais
function renderProfissionais() {
  if (!profissionalTable) return;

  // Calcular paginação
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProfissionais = filteredProfissionais.slice(
    startIndex,
    endIndex,
  );

  // Limpar tabela
  profissionalTable.innerHTML = "";

  if (paginatedProfissionais.length === 0) {
    // Mostrar estado vazio
    const emptyRow = document.createElement("tr");
    emptyRow.className = "empty-state";
    emptyRow.innerHTML = `
            <td colspan="5">
                <div class="empty-content">
                    <i class="fas fa-user-md"></i>
                    <h3>Nenhum profissional cadastrado</h3>
                    <p>Ainda não há profissionais no sistema. Cadastre o primeiro profissional para começar.</p>
                    <button class="btn-add-profissional">
                        <i class="fas fa-plus"></i>
                        Cadastrar Primeiro Profissional
                    </button>
                </div>
            </td>
        `;
    profissionalTable.appendChild(emptyRow);

    // Reconfigurar evento do botão
    const newBtnAdd = emptyRow.querySelector(".btn-add-profissional");
    if (newBtnAdd) {
      newBtnAdd.addEventListener("click", handleAddProfissional);
    }
  } else {
    // Renderizar profissionais
    paginatedProfissionais.forEach((profissional) => {
      const row = createProfissionalRow(profissional);
      profissionalTable.appendChild(row);
    });
  }

  // Atualizar informações de paginação
  updatePaginationInfo();
}

// Criar linha da tabela para um profissional
function createProfissionalRow(profissional) {
  const row = document.createElement("tr");

  // Sempre mostrar como ativo (V verde) para todos os profissionais
  const statusClass = "active";
  const statusIcon = "fa-check";

  row.innerHTML = `
        <td>${profissional.codigo}</td>
        <td>${profissional.nome}</td>
        <td>${formatTelefone(profissional.telefone || "")}</td>
        <td>
            <span class="status-badge ${statusClass}">
                <i class="fas ${statusIcon}"></i>
            </span>
        </td>
        <td>
            <div class="actions-container">
                <button class="btn-action btn-edit" onclick="editarProfissional('${profissional.id}')" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-action btn-delete" onclick="excluirProfissional('${profissional.codigo}')" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </td>
    `;
  return row;
}

// Manipular pesquisa
function handleSearch() {
  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";
  console.log("Pesquisando por:", searchTerm);

  // Filtrar profissionais apenas por termo de busca (não mais por status)
  filteredProfissionais = profissionaisData.filter((profissional) => {
    const matchesSearch =
      !searchTerm ||
      profissional.nome.toLowerCase().includes(searchTerm) ||
      profissional.codigo.toString().includes(searchTerm) ||
      (profissional.telefone && profissional.telefone.includes(searchTerm)) ||
      (profissional.cpf && profissional.cpf.includes(searchTerm)) ||
      (profissional.cnpj && profissional.cnpj.includes(searchTerm));

    // Removido filtro de status - todos os profissionais aparecem como ativos
    return matchesSearch;
  });

  // Resetar para primeira página
  currentPage = 1;

  // Renderizar resultados
  renderProfissionais();
  updatePagination();

  // Feedback visual
  if (searchTerm) {
    showNotification(`Pesquisando por: "${searchTerm}"`, "info");
  }
}

// Manipular filtro de status
function handleStatusFilter() {
  console.log("Filtro de status alterado:", statusFilter.value);
  handleSearch(); // Reutilizar lógica de pesquisa
}

// Manipular mudança de itens por página
function handleItemsPerPageChange() {
  const newItemsPerPage = parseInt(itemsPerPageSelect.value);
  console.log("Itens por página alterado para:", newItemsPerPage);

  // Atualizar itemsPerPage global
  window.itemsPerPage = newItemsPerPage;
  currentPage = 1;

  renderProfissionais();
  updatePagination();
}

// Manipular adição de profissional
function handleAddProfissional() {
  console.log("🎯 Redirecionando para cadastro de profissional");
  window.location.href = "cadastro-profissional.html";
}

// Manipular edição de profissional
function handleEditProfissional(profissionalId) {
  console.log("Editar profissional:", profissionalId);
  const profissional = profissionaisData.find((p) => p.id === profissionalId);

  if (profissional) {
    showNotification(`Editando profissional: ${profissional.nome}`, "info");
    // TODO: Implementar modal ou redirecionamento para formulário de edição
  }
}

// Manipular exclusão de profissional
async function handleDeleteProfissional(profissionalId) {
  console.log("Excluir profissional:", profissionalId);
  const profissional = profissionaisData.find((p) => p.id === profissionalId);

  if (profissional) {
    if (
      await confirmar(
        `Tem certeza que deseja excluir o profissional "${profissional.nome}"?`,
      )
    ) {
      // TODO: Implementar exclusão via API
      showNotification("Funcionalidade de exclusão em desenvolvimento", "info");
    }
  }
}

// Atualizar paginação
function updatePagination() {
  const totalItems = filteredProfissionais.length;
  updatePaginationInfo();
  updatePaginationControls();
}

// Atualizar informações de paginação
function updatePaginationInfo() {
  if (!paginationInfo) return;

  const totalItems = filteredProfissionais.length;
  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  paginationInfo.textContent = `Mostrando ${startItem}-${endItem} de ${totalItems} profissionais`;
}

// Atualizar controles de paginação
function updatePaginationControls() {
  const totalPages = Math.ceil(filteredProfissionais.length / itemsPerPage);
  const pageNavigation = document.querySelector(".page-navigation");

  if (pageNavigation) {
    const pageInfo = pageNavigation.querySelector(".page-info");
    const prevBtn = pageNavigation.querySelector(".btn-page:first-of-type");
    const nextBtn = pageNavigation.querySelector(".btn-page:last-of-type");

    if (pageInfo) {
      pageInfo.textContent = `${currentPage} - ${totalPages} de ${totalPages}`;
    }

    if (prevBtn) {
      prevBtn.disabled = currentPage === 1;
      prevBtn.onclick = () => changePage(currentPage - 1);
    }

    if (nextBtn) {
      nextBtn.disabled = currentPage === totalPages || totalPages === 0;
      nextBtn.onclick = () => changePage(currentPage + 1);
    }
  }
}

// Mudar página
function changePage(newPage) {
  const totalPages = Math.ceil(filteredProfissionais.length / itemsPerPage);

  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    renderProfissionais();
    updatePagination();

    // Scroll para o topo da tabela
    const container = document.querySelector(".container");
    if (container) {
      container.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
}

// Formatar telefone
function formatTelefone(telefone) {
  if (!telefone) return "";

  // Remove caracteres não numéricos
  const numbers = telefone.replace(/\D/g, "");

  // Aplica formatação
  if (numbers.length === 11) {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  } else if (numbers.length === 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }

  return telefone;
}

// Função para carregar profissionais via API (para ser chamada externamente)
function loadProfissionaisFromAPI(data) {
  console.log("Carregando profissionais via API:", data);
  profissionaisData = data;
  filteredProfissionais = [...profissionaisData];
  renderProfissionais();
  updatePagination();
}

// Função para adicionar profissional via API (para ser chamada externamente)
function addProfissionalFromAPI(profissional) {
  console.log("Adicionando profissional via API:", profissional);
  profissionaisData.push(profissional);
  filteredProfissionais = [...profissionaisData];
  renderProfissionais();
  updatePagination();
  showNotification(
    `Profissional "${profissional.nome}" adicionado com sucesso!`,
    "success",
  );
}

// Função para atualizar profissional via API (para ser chamada externamente)
function updateProfissionalFromAPI(updatedProfissional) {
  console.log("Atualizando profissional via API:", updatedProfissional);
  const index = profissionaisData.findIndex(
    (p) => p.id === updatedProfissional.id,
  );
  if (index !== -1) {
    profissionaisData[index] = updatedProfissional;
    filteredProfissionais = [...profissionaisData];
    renderProfissionais();
    updatePagination();
    showNotification(
      `Profissional "${updatedProfissional.nome}" atualizado com sucesso!`,
      "success",
    );
  }
}

// Função para remover profissional via API (para ser chamada externamente)
function removeProfissionalFromAPI(profissionalId) {
  console.log("Removendo profissional via API:", profissionalId);
  const profissional = profissionaisData.find((p) => p.id === profissionalId);
  if (profissional) {
    profissionaisData = profissionaisData.filter(
      (p) => p.id !== profissionalId,
    );
    filteredProfissionais = [...profissionaisData];
    renderProfissionais();
    updatePagination();
    showNotification(
      `Profissional "${profissional.nome}" removido com sucesso!`,
      "success",
    );
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

// Adicionar configuração dos profissionais ao DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
  // Aguardar um pouco para garantir que outros elementos carregaram
  setTimeout(async () => {
    try {
      await initializeProfissionais();
      verificarNovoCadastro();
    } catch (e) {
      console.error("Erro inicializando profissionais:", e);
    }
  }, 300);
});

// Verificar se há um novo profissional cadastrado
function verificarNovoCadastro() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("novoCadastro") === "true") {
    // Não usar localStorage: recarregar a lista do backend e mostrar notificação
    (async () => {
      try {
        await carregarProfissionaisSalvos();
        filteredProfissionais = [...profissionaisData];
        renderProfissionais();
        updatePagination();
      } catch (e) {
        console.warn("Erro ao recarregar profissionais após cadastro:", e);
      }
      // Limpar parâmetro da URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    })();
  }
}

// Adicionar profissional na tabela
function adicionarProfissionalNaTabela(profissionalData) {
  const tbody = document.querySelector(".profissional-table tbody");
  if (!tbody) return;

  // Verificar se já existe uma linha com esse código
  const linhaExistente = tbody.querySelector(
    `tr[data-codigo="${profissionalData.codigo}"]`,
  );
  if (linhaExistente) {
    console.log(
      "⚠️ Profissional já existe na tabela, evitando duplicação visual",
    );
    return;
  }

  const row = document.createElement("tr");
  row.className = "profissional-row novo-profissional";
  row.setAttribute("data-codigo", profissionalData.codigo);

  const funcoes = Array.isArray(profissionalData.funcoes)
    ? profissionalData.funcoes.join(", ")
    : profissionalData.funcoes || "";

  const telefone = profissionalData.contatos?.telefone || "";
  const ativo = profissionalData.ativo
    ? '<i class="fas fa-check" style="color: #28a745;"></i>'
    : '<i class="fas fa-times" style="color: #dc3545;"></i>';

  row.innerHTML = `
        <td>${profissionalData.codigo}</td>
        <td><strong>${profissionalData.nome}</strong></td>
        <td>${telefone}</td>
        <td class="text-center">${ativo}</td>
        <td class="text-center">
            <button class="btn-action btn-edit" title="Editar profissional" onclick="editarProfissional(${profissionalData.codigo})">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn-action btn-delete" title="Excluir profissional" onclick="excluirProfissional(${profissionalData.codigo})">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;

  // Remover linha de estado vazio se existir
  const emptyRow = tbody.querySelector(".empty-state");
  if (emptyRow) {
    emptyRow.remove();
  }

  // Inserir no início da tabela
  const firstRow = tbody.querySelector("tr:not(.empty-state)");
  if (firstRow) {
    tbody.insertBefore(row, firstRow);
  } else {
    tbody.appendChild(row);
  }

  // Destacar temporariamente o novo profissional
  setTimeout(() => {
    row.classList.add("destacar-novo");

    setTimeout(() => {
      row.classList.remove("novo-profissional", "destacar-novo");
    }, 3000);
  }, 100);

  console.log(
    "✅ Novo profissional adicionado à tabela:",
    profissionalData.nome,
  );
}

// Funções para ações da tabela
function editarProfissional(codigo) {
  console.log("✏️ Editando profissional com código:", codigo);
  window.location.href = `cadastro-profissional.html?id=${codigo}`;
}

function excluirProfissional(codigo) {
  // Criar modal de confirmação customizado
  showCustomAlert(
    "Tem certeza que deseja excluir esse profissional?",
    "Essa ação não poderá ser desfeita",
    function () {
      // Callback de confirmação
      console.log(
        "🗑️ Excluindo profissional com código:",
        codigo,
        "Tipo:",
        typeof codigo,
      );
      console.log("🔍 Array de profissionais atual:", profissionaisData);
      console.log(
        "🔍 Códigos no array:",
        profissionaisData.map((p) => ({
          codigo: p.codigo,
          tipo: typeof p.codigo,
          nome: p.nome,
        })),
      );

      // Converter código para string para garantir compatibilidade
      const codigoStr = String(codigo);

      // Buscar profissional por código (comparar como string e como número)
      let indexToRemove = -1;
      for (let i = 0; i < profissionaisData.length; i++) {
        if (
          String(profissionaisData[i].codigo) === codigoStr ||
          profissionaisData[i].codigo === codigo ||
          profissionaisData[i].codigo == codigo
        ) {
          indexToRemove = i;
          break;
        }
      }

      console.log("🎯 Index encontrado para remoção:", indexToRemove);

      if (indexToRemove !== -1) {
        const profissionalRemovido = profissionaisData[indexToRemove];
        console.log("🗑️ Removendo profissional:", profissionalRemovido);

        // Deletar do backend usando o ID
        ApiClient.deletarProfissional(profissionalRemovido.id)
          .then(() => {
            // Remover do array local
            profissionaisData.splice(indexToRemove, 1);

            // Atualizar lista filtrada
            filteredProfissionais = [...profissionaisData];

            // Forçar re-renderização completa
            currentPage = 1; // Voltar para primeira página
            renderProfissionais();
            updatePagination();

            showNotification(
              `Profissional "${profissionalRemovido.nome}" excluído com sucesso!`,
              "success",
            );
            console.log(
              `✅ Profissional ${profissionalRemovido.nome} removido permanentemente`,
            );
          })
          .catch((error) => {
            console.error("❌ Erro ao deletar profissional do backend:", error);
            showNotification(
              `Erro ao excluir profissional: ${error.message}`,
              "error",
            );
          });
      } else {
        console.error("❌ Profissional não encontrado para exclusão");
        showNotification(
          `Erro: Profissional código ${codigo} não encontrado.`,
          "error",
        );
      }
    },
  );
}

// Modal de confirmação personalizado
function showCustomAlert(title, message, onConfirm) {
  // Remover modal existente se houver
  const existingModal = document.querySelector(".custom-modal");
  if (existingModal) {
    existingModal.remove();
  }

  // Criar modal
  const modal = document.createElement("div");
  modal.className = "custom-modal";
  modal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 class="modal-title">${title}</h3>
                <p class="modal-message">${message}</p>
                <div class="modal-actions">
                    <button class="btn-cancel">Cancelar</button>
                    <button class="btn-confirm">Excluir</button>
                </div>
            </div>
        </div>
    `;

  // Adicionar ao DOM
  document.body.appendChild(modal);

  // Adicionar event listeners
  const btnCancel = modal.querySelector(".btn-cancel");
  const btnConfirm = modal.querySelector(".btn-confirm");
  const overlay = modal.querySelector(".modal-overlay");

  btnCancel.addEventListener("click", () => {
    modal.remove();
  });

  btnConfirm.addEventListener("click", () => {
    modal.remove();
    if (onConfirm) onConfirm();
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      modal.remove();
    }
  });

  // Mostrar modal com animação
  setTimeout(() => modal.classList.add("show"), 10);
}
