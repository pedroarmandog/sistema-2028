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
// USUÁRIOS - FUNCIONALIDADES
// ==========================================

// Estado global dos usuários
let usuariosData = [];
let currentPage = 1;
const itemsPerPage = 10;
let filteredUsuarios = [];

// Elementos da página
let searchInput,
  searchBtn,
  usuarioTable,
  paginationInfo,
  statusFilter,
  itemsPerPageSelect;
let btnAdicionarUsuario, btnCompartilhar, btnFloatingAdd;

// Inicialização da página de usuários
function initializeUsuarios() {
  console.log("Inicializando página de usuários...");

  // Obter elementos da página
  searchInput = document.querySelector("#searchUsuario");
  searchBtn = document.querySelector(".btn-pesquisar");
  usuarioTable = document.querySelector(".usuario-table tbody");
  paginationInfo = document.querySelector(".pagination-info");
  statusFilter = document.querySelector("#statusFilter");
  itemsPerPageSelect = document.querySelector("#itemsPerPage");
  btnAdicionarUsuario = document.querySelector(".btn-adicionar-usuario");
  btnCompartilhar = document.querySelector(".btn-compartilhar");
  btnFloatingAdd = document.querySelector(".btn-floating-add");

  // Verificar se estamos na página de usuários
  if (!usuarioTable) {
    console.log("Não é a página de usuários, pulando inicialização");
    return;
  }

  // Configurar eventos
  setupEventListeners();

  // Carregar usuários do backend
  carregarUsuarios();

  console.log("Página de usuários inicializada com sucesso");
}

// Carregar usuários do backend
async function carregarUsuarios() {
  try {
    const API_BASE =
      (window.__API_BASE__ && window.__API_BASE__.toString()) ||
      window.location.origin;
    const response = await fetch(API_BASE + "/api/usuarios");

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const usuarios = await response.json();
    console.log("Usuários carregados do backend:", usuarios);

    // Mapear para o formato esperado pela UI
    usuariosData = usuarios.map((u) => ({
      id: u.id,
      codigo: u.id,
      nome: u.nome,
      usuario: u.usuario,
      grupoUsuario: u.grupoUsuario,
      status: u.ativo ? "ativo" : "inativo",
      dataCriacao: u.createdAt
        ? new Date(u.createdAt).toLocaleDateString("pt-BR")
        : "",
      ultimoLogin: u.updatedAt
        ? new Date(u.updatedAt).toLocaleDateString("pt-BR")
        : "",
    }));

    // Renderizar usuários
    filteredUsuarios = [...usuariosData];
    renderUsuarios();
    updatePagination();
  } catch (error) {
    console.error("Erro ao carregar usuários:", error);
    // Em caso de erro, manter array vazio
    usuariosData = [];
    filteredUsuarios = [];
    renderUsuarios();
  }
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

  // Filtro de status
  if (statusFilter) {
    statusFilter.addEventListener("change", handleStatusFilter);
  }

  // Items por página
  if (itemsPerPageSelect) {
    itemsPerPageSelect.addEventListener("change", handleItemsPerPageChange);
  }

  // Botões de ação
  if (btnAdicionarUsuario) {
    btnAdicionarUsuario.addEventListener("click", handleAddUsuario);
  }

  if (btnCompartilhar) {
    btnCompartilhar.addEventListener("click", handleCompartilhar);
  }

  if (btnFloatingAdd) {
    btnFloatingAdd.addEventListener("click", handleAddUsuario);
  }
}

// Renderizar lista de usuários
function renderUsuarios() {
  if (!usuarioTable) return;

  // Calcular paginação
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsuarios = filteredUsuarios.slice(startIndex, endIndex);

  // Limpar tabela
  usuarioTable.innerHTML = "";

  if (paginatedUsuarios.length === 0) {
    // Mostrar estado vazio
    const emptyRow = document.createElement("tr");
    emptyRow.className = "empty-state";
    emptyRow.innerHTML = `
            <td colspan="4">
                <div class="empty-content">
                    <i class="fas fa-users"></i>
                    <h3>Nenhum usuário encontrado</h3>
                    <p>Não foram encontrados usuários com os critérios de pesquisa.</p>
                </div>
            </td>
        `;
    usuarioTable.appendChild(emptyRow);
  } else {
    // Renderizar usuários
    paginatedUsuarios.forEach((usuario) => {
      const row = createUsuarioRow(usuario);
      usuarioTable.appendChild(row);
    });
  }

  // Atualizar informações de paginação
  updatePaginationInfo();
}

// Criar linha da tabela para um usuário
function createUsuarioRow(usuario) {
  const row = document.createElement("tr");

  const statusClass = usuario.status === "ativo" ? "active" : "inactive";
  const statusIcon = usuario.status === "ativo" ? "fa-check" : "fa-times";
  const statusText = usuario.status === "ativo" ? "Ativo" : "Inativo";

  row.innerHTML = `
        <td>${usuario.codigo}</td>
        <td>${usuario.nome}</td>
        <td>
            <span class="status-badge ${statusClass}">
                <i class="fas ${statusIcon}"></i>
                ${statusText}
            </span>
        </td>
        <td class="actions-column">
            <button class="btn-action btn-edit" onclick="handleEditUsuario('${usuario.id}')" title="Editar">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn-action btn-delete" onclick="handleDeleteUsuario('${usuario.id}')" title="Excluir">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
  return row;
}

// Manipular pesquisa
function handleSearch() {
  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";
  console.log("Pesquisando por:", searchTerm);

  // Filtrar usuários
  filteredUsuarios = usuariosData.filter((usuario) => {
    const matchesSearch =
      !searchTerm ||
      usuario.nome.toLowerCase().includes(searchTerm) ||
      usuario.codigo.toString().includes(searchTerm);

    const selectedStatus = statusFilter ? statusFilter.value : "";
    const matchesStatus = !selectedStatus || usuario.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  // Resetar para primeira página
  currentPage = 1;

  // Renderizar resultados
  renderUsuarios();
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

  renderUsuarios();
  updatePagination();
}

// Manipular adição de usuário
function handleAddUsuario() {
  console.log("Adicionar novo usuário");
  showNotification("Funcionalidade de cadastro em desenvolvimento", "info");

  // TODO: Implementar modal ou redirecionamento para formulário de cadastro
  // window.location.href = 'novo-usuario.html';
}

// Manipular compartilhamento
function handleCompartilhar() {
  console.log("Compartilhar usuários");
  showNotification(
    "Funcionalidade de compartilhamento em desenvolvimento",
    "info",
  );

  // TODO: Implementar funcionalidade de compartilhamento/exportação
}

// Manipular edição de usuário
function handleEditUsuario(usuarioId) {
  console.log("Editar usuário:", usuarioId);
  window.location.href = `./novo-usuario.html?id=${usuarioId}`;
}

// Manipular exclusão de usuário
async function handleDeleteUsuario(usuarioId) {
  console.log("Excluir usuário:", usuarioId);
  const usuario = usuariosData.find((u) => u.id === usuarioId);

  if (usuario) {
    if (usuario.nome === "LOGIN INICIAL") {
      showNotification(
        "O usuário LOGIN INICIAL não pode ser excluído",
        "error",
      );
      return;
    }

    if (
      await confirmar(
        `Tem certeza que deseja excluir o usuário "${usuario.nome}"?`,
      )
    ) {
      // TODO: Implementar exclusão via API
      showNotification("Funcionalidade de exclusão em desenvolvimento", "info");
    }
  }
}

// Atualizar paginação
function updatePagination() {
  const totalItems = filteredUsuarios.length;
  updatePaginationInfo();
  updatePaginationControls();
}

// Atualizar informações de paginação
function updatePaginationInfo() {
  if (!paginationInfo) return;

  const totalItems = filteredUsuarios.length;
  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  paginationInfo.textContent = `Mostrando ${startItem}-${endItem} de ${totalItems} usuários`;
}

// Atualizar controles de paginação
function updatePaginationControls() {
  const totalPages = Math.ceil(filteredUsuarios.length / itemsPerPage);
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
  const totalPages = Math.ceil(filteredUsuarios.length / itemsPerPage);

  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    renderUsuarios();
    updatePagination();

    // Scroll para o topo da tabela
    const container = document.querySelector(".container");
    if (container) {
      container.scrollIntoView({ behavior: "smooth", block: "start" });
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

// Adicionar configuração dos usuários ao DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
  // Aguardar um pouco para garantir que outros elementos carregaram
  setTimeout(() => {
    initializeUsuarios();
  }, 300);
});
