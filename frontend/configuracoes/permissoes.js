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
// PERMISSÕES - FUNCIONALIDADES
// ==========================================

// Estado global das permissões
let currentGroup = "administradores";
let permissions = {
  "acesso-total": {},
  administradores: {
    // Todas as permissões marcadas para administradores
    painel: true,
    "painel.operacional": true,
    "painel.faturamento": true,
    "painel.demonstrativo": true,
    "painel.recebiveis": true,
    "painel.caixa": true,
    "painel.financeiro": true,
    item: true,
    "item.meus-itens": true,
    "item.novo": true,
    "item.novo.produto": true,
    "item.novo.servico": true,
    "item.novo.plano": true,
    "item.agrupamento": true,
    "item.marca": true,
    "item.unidade": true,
    "item.descontos": true,
    "item.comissao": true,
    "item.etiquetas": true,
    "item.tributacao": true,
    "item.estoque": true,
    "item.estoque.outras-entradas": true,
    cliente: true,
    "cliente.meus-clientes": true,
    "cliente.novo": true,
    "cliente.grupo": true,
    "cliente.descontos": true,
    pet: true,
    "pet.meus-pets": true,
    "pet.novo": true,
    "pet.especie-raca": true,
    "pet.pelagem": true,
    "pet.porte": true,
    "pet.box": true,
    atendimento: true,
    "atendimento.agenda": true,
    "atendimento.vendas": true,
    "atendimento.contratos": true,
    "atendimento.devolucao": true,
    "atendimento.caixa": true,
    "atendimento.caixa.abertura": true,
    "atendimento.caixa.suprimento": true,
    "atendimento.caixa.relatorio": true,
    "atendimento.orcamento": true,
    "atendimento.relatorios": true,
    marketing: true,
    compras: true,
    "compras.entrada": true,
    "compras.fornecedores": true,
    "compras.relatorios": true,
    financeiro: true,
    "financeiro.receber": true,
    "financeiro.pagar": true,
    "financeiro.conta": true,
    "financeiro.cheque": true,
    "financeiro.cartao": true,
    "financeiro.condicao": true,
    "financeiro.relatorios": true,
    configuracoes: true,
    "configuracoes.empresa": true,
    "configuracoes.usuario": true,
    "configuracoes.grupo": true,
    "configuracoes.profissional": true,
    "configuracoes.permissoes": true,
    "configuracoes.centro": true,
    "configuracoes.categoria": true,
    "configuracoes.documento": true,
    "configuracoes.gerais": true,
    "configuracoes.pdv": true,
    "configuracoes.formularios": true,
    "configuracoes.feriado": true,
    "configuracoes.ip": true,
    "configuracoes.central-fiscal": true,
    "gerenciar_configuracao_fiscal": true,
  },
  usuarios: {},
};

// Elementos da página
let groupRadios, tabBtns, moduleContents, btnLiberarTudo, btnBloquearTudo;

// Inicialização da página de permissões
function initializePermissoes() {
  console.log("Inicializando página de permissões...");

  // Obter elementos da página
  groupRadios = document.querySelectorAll('input[name="grupo"]');
  tabBtns = document.querySelectorAll(".tab-btn");
  moduleContents = document.querySelectorAll(".modulo-content");
  btnLiberarTudo = document.querySelector(".btn-liberar-tudo");
  btnBloquearTudo = document.querySelector(".btn-bloquear-tudo");

  // Verificar se estamos na página de permissões
  if (!groupRadios.length) {
    console.log("Não é a página de permissões, pulando inicialização");
    return;
  }

  // Configurar eventos
  setupEventListeners();

  // Carregar estado inicial (Administradores selecionado)
  loadGroupPermissions(currentGroup);

  console.log("Página de permissões inicializada com sucesso");
}

// Configurar eventos
function setupEventListeners() {
  // Grupos de usuário
  groupRadios.forEach((radio) => {
    radio.addEventListener("change", handleGroupChange);
  });

  // Abas dos módulos
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", handleTabChange);
  });

  // Botões de ação
  if (btnLiberarTudo) {
    btnLiberarTudo.addEventListener("click", handleLiberarTudo);
  }

  if (btnBloquearTudo) {
    btnBloquearTudo.addEventListener("click", handleBloquearTudo);
  }

  // Checkboxes de permissões
  document.addEventListener("change", handlePermissionChange);
}

// Manipular mudança de grupo
function handleGroupChange(e) {
  const selectedGroup = e.target.value;
  console.log("Grupo selecionado:", selectedGroup);

  // Salvar permissões do grupo atual antes de trocar
  saveCurrentPermissions();

  // Trocar grupo atual
  currentGroup = selectedGroup;

  // Carregar permissões do novo grupo
  loadGroupPermissions(selectedGroup);

  showNotification(
    `Grupo "${getGroupName(selectedGroup)}" selecionado`,
    "info",
  );
}

// Manipular mudança de aba
function handleTabChange(e) {
  const targetModule = e.target.dataset.modulo;
  console.log("Módulo selecionado:", targetModule);

  // Remover classe active de todas as abas e conteúdos
  tabBtns.forEach((btn) => btn.classList.remove("active"));
  moduleContents.forEach((content) => content.classList.remove("active"));

  // Adicionar classe active à aba e conteúdo selecionados
  e.target.classList.add("active");
  const targetContent = document.getElementById(`modulo-${targetModule}`);
  if (targetContent) {
    targetContent.classList.add("active");
  }
}

// Manipular mudança de permissão
function handlePermissionChange(e) {
  if (e.target.type === "checkbox" && e.target.dataset.permission) {
    const permission = e.target.dataset.permission;
    const isChecked = e.target.checked;

    console.log(
      `Permissão ${permission}: ${isChecked ? "habilitada" : "desabilitada"}`,
    );

    // Atualizar estado das permissões
    if (!permissions[currentGroup]) {
      permissions[currentGroup] = {};
    }
    permissions[currentGroup][permission] = isChecked;

    // Gerenciar dependências hierárquicas
    handlePermissionHierarchy(permission, isChecked);

    // Salvar estado
    savePermissionsState();
  }
}

// Gerenciar hierarquia de permissões
function handlePermissionHierarchy(permission, isChecked) {
  const parts = permission.split(".");

  if (isChecked) {
    // Se habilitando uma permissão, habilitar todas as superiores
    for (let i = 1; i <= parts.length; i++) {
      const parentPermission = parts.slice(0, i).join(".");
      permissions[currentGroup][parentPermission] = true;

      const parentCheckbox = document.querySelector(
        `[data-permission="${parentPermission}"]`,
      );
      if (parentCheckbox && !parentCheckbox.checked) {
        parentCheckbox.checked = true;
      }
    }
  } else {
    // Se desabilitando uma permissão, desabilitar todas as inferiores
    Object.keys(permissions[currentGroup]).forEach((perm) => {
      if (perm.startsWith(permission + ".")) {
        permissions[currentGroup][perm] = false;

        const childCheckbox = document.querySelector(
          `[data-permission="${perm}"]`,
        );
        if (childCheckbox && childCheckbox.checked) {
          childCheckbox.checked = false;
        }
      }
    });
  }
}

// Liberar todas as permissões
function handleLiberarTudo() {
  console.log("Liberando todas as permissões para:", currentGroup);

  const checkboxes = document.querySelectorAll("[data-permission]");
  checkboxes.forEach((checkbox) => {
    checkbox.checked = true;
    const permission = checkbox.dataset.permission;
    if (!permissions[currentGroup]) {
      permissions[currentGroup] = {};
    }
    permissions[currentGroup][permission] = true;
  });

  savePermissionsState();
  showNotification("Todas as permissões foram liberadas", "success");
}

// Bloquear todas as permissões
function handleBloquearTudo() {
  console.log("Bloqueando todas as permissões para:", currentGroup);

  const checkboxes = document.querySelectorAll("[data-permission]");
  checkboxes.forEach((checkbox) => {
    checkbox.checked = false;
    const permission = checkbox.dataset.permission;
    if (!permissions[currentGroup]) {
      permissions[currentGroup] = {};
    }
    permissions[currentGroup][permission] = false;
  });

  savePermissionsState();
  showNotification("Todas as permissões foram bloqueadas", "error");
}

// Carregar permissões do grupo
function loadGroupPermissions(groupKey) {
  console.log("Carregando permissões para o grupo:", groupKey);

  const groupPermissions = permissions[groupKey] || {};

  // Atualizar checkboxes conforme as permissões do grupo
  const checkboxes = document.querySelectorAll("[data-permission]");
  checkboxes.forEach((checkbox) => {
    const permission = checkbox.dataset.permission;
    checkbox.checked = groupPermissions[permission] || false;
  });
}

// Salvar permissões do grupo atual
function saveCurrentPermissions() {
  console.log("Salvando permissões do grupo atual:", currentGroup);

  if (!permissions[currentGroup]) {
    permissions[currentGroup] = {};
  }

  const checkboxes = document.querySelectorAll("[data-permission]");
  checkboxes.forEach((checkbox) => {
    const permission = checkbox.dataset.permission;
    permissions[currentGroup][permission] = checkbox.checked;
  });
}

// Salvar estado das permissões
function savePermissionsState() {
  try {
    localStorage.setItem("petcria_permissions", JSON.stringify(permissions));
    console.log("Estado das permissões salvo");
  } catch (error) {
    console.error("Erro ao salvar permissões:", error);
  }
}

// Carregar estado das permissões
function loadPermissionsState() {
  try {
    const saved = localStorage.getItem("petcria_permissions");
    if (saved) {
      const loadedPermissions = JSON.parse(saved);
      // Mesclar com permissões padrão, mantendo administradores sempre com permissões
      permissions = {
        ...permissions,
        ...loadedPermissions,
        administradores: permissions.administradores, // Manter administradores sempre completo
      };
      console.log("Estado das permissões carregado");
    }
  } catch (error) {
    console.error("Erro ao carregar permissões:", error);
  }
}

// Obter nome do grupo
function getGroupName(groupKey) {
  const names = {
    "acesso-total": "Acesso Total",
    administradores: "Administradores",
    usuarios: "Usuários",
  };
  return names[groupKey] || groupKey;
}

// Exportar permissões (para integração com API)
function exportPermissions() {
  console.log("Exportando permissões:", permissions);
  return JSON.parse(JSON.stringify(permissions));
}

// Importar permissões (para integração com API)
function importPermissions(newPermissions) {
  console.log("Importando permissões:", newPermissions);
  permissions = { ...permissions, ...newPermissions };
  loadGroupPermissions(currentGroup);
  savePermissionsState();
  showNotification("Permissões importadas com sucesso", "success");
}

// Resetar permissões para padrão
async function resetPermissions() {
  if (
    await confirmar(
      "Tem certeza que deseja resetar todas as permissões para o padrão?",
    )
  ) {
    // Limpar localStorage
    localStorage.removeItem("petcria_permissions");

    // Resetar para estado inicial
    permissions = {
      "acesso-total": {},
      administradores: permissions.administradores, // Manter administradores completo
      usuarios: {},
    };

    // Recarregar permissões do grupo atual
    loadGroupPermissions(currentGroup);

    showNotification("Permissões resetadas para o padrão", "info");
  }
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

// Adicionar configuração das permissões ao DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
  // Aguardar um pouco para garantir que outros elementos carregaram
  setTimeout(() => {
    // Carregar estado salvo
    loadPermissionsState();

    // Inicializar página
    initializePermissoes();
  }, 300);
});
