// Copiado de frontend/dashboard.js - funcionalidades do menu e header

console.log("🚀 menu.js carregado (snippet do dashboard)");

// Garantir helper de toast global (fallback local) para mostrar notificações no canto superior direito
if (typeof window.showToast !== "function") {
  window.showToast = function (message, type = "info", timeout = 3500) {
    try {
      let container = document.getElementById("global-toast-container");
      if (!container) {
        container = document.createElement("div");
        container.id = "global-toast-container";
        document.body.appendChild(container);
      }
      const toast = document.createElement("div");
      toast.className = "toast toast-" + (type || "info");
      toast.textContent = message;
      container.appendChild(toast);
      // forçar transição
      setTimeout(() => toast.classList.add("show"), 10);
      // remover automaticamente
      setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => {
          try {
            toast.remove();
          } catch (e) {}
        }, 240);
      }, timeout);
    } catch (e) {
      console.warn("showToast falhou", e);
    }
  };
}

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

  // Inicializar funcionalidades da página de Marca
  inicializarMarca();
});

// ========================================
// MARCA DE PRODUTOS - FUNCIONALIDADES
// ========================================

// Lista de marcas pré-cadastradas
const marcasPadrao = [
  "2G Acessórios Pet",
  "777 Imex",
  "8in1",
  "Acana",
  "Acquapet",
  "Adaptil",
  "Addison",
  "Adimax",
  "Adimax Pet",
  "Adore",
  "Advantage",
  "Advocate",
  "Affinity PetCare",
  "Agener União",
  "Agronese",
  "Akio",
  "Alcon",
  "Alfapet",
  "Alfa Pet",
  "Almo Nature",
  "Bravecto",
  "Canaã",
  "Dog Chow",
  "Drontal",
  "Equilíbrio",
  "Eukanuba",
  "Farmina",
  "Fórmula Natural",
  "Friskies",
  "Frontline",
  "Furminator",
  "Golden",
  "Gran Plus",
  "Greenies",
  "Guabi Natural",
  "Hill's Science Diet",
  "Kaytee",
  "Kong",
  "Mac's",
  "Magnus",
  "N&D",
  "NexGard",
  "Orijen",
  "Pedigree",
  "PetEdge",
  "PetSafe",
  "Premier Pet",
  "Pro Plan",
  "Real Nature",
  "Rex",
  "Royal Canin",
  "Select Gold",
  "Seresto",
  "SmartBones",
  "Tetra",
  "Ultra Paws",
  "Vermivet",
  "Wellness",
  "West Paw",
  "Whiskas",
  "Zippy Paws",
  "Zukes",
  "ZuPreem",
  "Biofresh",
];

// Carregar marcas do backend (se disponível). Caso a API não responda,
// mantemos a lista padrão embutida em `marcasPadrao`.
async function carregarMarcas() {
  try {
    if (typeof ApiClient === "undefined" || !ApiClient.getMarcas)
      throw new Error("ApiClient não disponível");
    const resp = await ApiClient.getMarcas();
    if (Array.isArray(resp) && resp.length) {
      // Substituir a lista padrão pela lista persistida no backend
      marcasPadrao.length = 0;
      resp.forEach((m) => {
        if (m && typeof m === "string") marcasPadrao.push(m);
      });
      marcasPadrao.sort((a, b) =>
        String(a).localeCompare(String(b), "pt-BR", { sensitivity: "base" }),
      );
    } else {
      // garantir ordenação da lista embarcada
      marcasPadrao.sort((a, b) =>
        String(a).localeCompare(String(b), "pt-BR", { sensitivity: "base" }),
      );
    }
  } catch (err) {
    console.debug(
      "[marca] API marcas indisponível ou falhou, usando lista local embarcada",
      err && err.message,
    );
    marcasPadrao.sort((a, b) =>
      String(a).localeCompare(String(b), "pt-BR", { sensitivity: "base" }),
    );
  }
  // refletir no estado atual
  marcasAtual = [...marcasPadrao];
}

// Estado da aplicação
let marcasAtual = [...marcasPadrao];
let paginaAtual = 1;
let itensPorPagina = 50;

function inicializarMarca() {
  console.log("🔧 Inicializando funcionalidades de Marca...");
  // Carregar marcas (API → fallback embarcado) e então inicializar UI
  carregarMarcas()
    .then(() => {
      // Renderizar marcas na tabela
      renderizarMarcas();
      // Configurar botão Adicionar Marca
      configurarBotaoAdicionar();
      // Configurar pesquisa
      configurarPesquisa();
      // Configurar paginação
      configurarPaginacao();
      console.log("✅ Funcionalidades de Marca inicializadas!");
    })
    .catch((err) => {
      console.error("[inicializarMarca] erro ao carregar marcas:", err);
      // Mesmo em erro, inicializar UI com lista embarcada
      renderizarMarcas();
      configurarBotaoAdicionar();
      configurarPesquisa();
      configurarPaginacao();
    });
}

// Diálogo de confirmação reutilizável (estilo centralizado do sistema)
function showConfirmDialog(message, onConfirm, opts = {}) {
  try {
    const title = opts.title || "Confirmação";
    const confirmText = opts.confirmText || "OK";
    const cancelText = opts.cancelText || "Cancelar";
    const confirmClass = opts.confirmClass || "qc-confirm";

    // remover overlays antigos
    document
      .querySelectorAll(".custom-confirm-overlay, .modal-overlay, .qc-overlay")
      .forEach((e) => e.remove());
    const overlay = document.createElement("div");
    overlay.className = "custom-confirm-overlay";
    overlay.style.position = "fixed";
    overlay.style.left = "0";
    overlay.style.top = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0,0,0,0.45)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "20000";

    const modal = document.createElement("div");
    modal.className = "custom-confirm-box";
    modal.style.background = "#fff";
    modal.style.borderRadius = "10px";
    modal.style.boxShadow = "0 12px 36px rgba(0,0,0,0.18)";
    modal.style.padding = "20px";
    modal.style.maxWidth = "640px";
    modal.style.width = "min(92%,720px)";
    modal.style.fontFamily = "inherit";

    modal.innerHTML = `
            <div style="font-weight:700;margin-bottom:10px;font-size:16px;color:#2b2b2b">${title}</div>
            <div style="margin-bottom:18px;color:#444">${message}</div>
            <div style="text-align:right;display:flex;gap:12px;justify-content:flex-end">
                <button class="custom-confirm-cancel" style="padding:10px 16px;border-radius:10px;border:1px solid #f0d7d9;background:#fff;color:#333;cursor:pointer">${cancelText}</button>
                <button class="${confirmClass}" style="padding:10px 18px;border-radius:12px;border:none;background:#8b3b41;color:#fff;font-weight:600;cursor:pointer">${confirmText}</button>
            </div>
        `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    const btnCancel = modal.querySelector(".custom-confirm-cancel");
    const btnConfirm = modal.querySelector("." + confirmClass);
    function close() {
      try {
        overlay.remove();
      } catch (e) {}
    }
    btnCancel.addEventListener("click", function (e) {
      e.preventDefault();
      close();
    });
    btnConfirm.addEventListener("click", function (e) {
      e.preventDefault();
      try {
        if (typeof onConfirm === "function") onConfirm();
      } catch (err) {
        console.debug(err);
      }
      close();
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
  } catch (e) {
    console.debug("showConfirmDialog error", e);
    if (typeof onConfirm === "function") {
      confirmar(message).then(function (r) {
        if (r) onConfirm();
      });
    }
  }
}

// Diálogo de input (editar) reutilizável
function showInputDialog(label, defaultValue, onConfirm, opts = {}) {
  try {
    const title = opts.title || "Entrada";
    const confirmText = opts.confirmText || "Salvar";
    const cancelText = opts.cancelText || "Cancelar";

    document
      .querySelectorAll(".custom-confirm-overlay, .modal-overlay, .qc-overlay")
      .forEach((e) => e.remove());
    const overlay = document.createElement("div");
    overlay.className = "custom-confirm-overlay";
    overlay.style.position = "fixed";
    overlay.style.left = "0";
    overlay.style.top = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0,0,0,0.45)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "20000";

    const modal = document.createElement("div");
    modal.className = "custom-input-box";
    modal.style.background = "#fff";
    modal.style.borderRadius = "10px";
    modal.style.boxShadow = "0 12px 36px rgba(0,0,0,0.18)";
    modal.style.padding = "18px";
    modal.style.maxWidth = "520px";
    modal.style.width = "min(92%,560px)";
    modal.style.fontFamily = "inherit";

    modal.innerHTML = `
            <div style="font-weight:700;margin-bottom:10px;font-size:16px;color:#2b2b2b">${title}</div>
            <div style="margin-bottom:12px;color:#444">${label}</div>
            <input type="text" class="custom-input-field" value="${(defaultValue || "").replace(/"/g, "&quot;")}" style="width:100%;padding:10px 12px;border:1px solid #e6e9eb;border-radius:8px;margin-bottom:14px;box-sizing:border-box;font-size:14px" />
            <div style="text-align:right;display:flex;gap:12px;justify-content:flex-end">
                <button class="custom-confirm-cancel" style="padding:8px 12px;border-radius:10px;border:1px solid #f0d7d9;background:#fff;color:#333;cursor:pointer">${cancelText}</button>
                <button class="custom-confirm-ok" style="padding:8px 12px;border-radius:10px;border:none;background:#28a745;color:#fff;cursor:pointer">${confirmText}</button>
            </div>
        `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    const inputField = modal.querySelector(".custom-input-field");
    const btnCancel = modal.querySelector(".custom-confirm-cancel");
    const btnOk = modal.querySelector(".custom-confirm-ok");
    function close() {
      try {
        overlay.remove();
      } catch (e) {}
    }
    btnCancel.addEventListener("click", function (e) {
      e.preventDefault();
      close();
    });
    btnOk.addEventListener("click", function (e) {
      e.preventDefault();
      try {
        if (typeof onConfirm === "function") onConfirm(inputField.value);
      } catch (err) {
        console.debug(err);
      }
      close();
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    setTimeout(() => {
      inputField.focus();
      inputField.select();
    }, 30);
  } catch (e) {
    console.debug("showInputDialog error", e);
    solicitar(label, "", defaultValue).then(function (v) {
      if (v !== null && typeof onConfirm === "function") onConfirm(v);
    });
  }
}

// Renderizar marcas na tabela
function renderizarMarcas() {
  const tbody = document.getElementById("marcasTableBody");

  if (!tbody) {
    console.error("❌ Elemento marcasTableBody não encontrado");
    return;
  }

  // Calcular itens da página atual
  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const marcasPagina = marcasAtual.slice(inicio, fim);

  // Limpar tabela
  tbody.innerHTML = "";

  // Adicionar marcas
  marcasPagina.forEach((marca, index) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
            <td class="descricao-cell">${marca}</td>
            <td class="editar-cell">
                <button class="btn-icon btn-editar" title="Editar" data-marca="${marca}">
                    <i class="fas fa-pen"></i>
                </button>
            </td>
            <td class="excluir-cell">
                <button class="btn-icon btn-excluir" title="Excluir" data-marca="${marca}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

    tbody.appendChild(tr);
  });

  // Configurar botões de ação
  configurarBotoesAcao();

  // Atualizar informações de paginação
  atualizarPaginacao();

  console.log(
    `✅ ${marcasPagina.length} marcas renderizadas (página ${paginaAtual})`,
  );
}

// Configurar botão Adicionar Marca
function configurarBotaoAdicionar() {
  const btnAdicionar = document.getElementById("btnAdicionarMarca");

  if (btnAdicionar) {
    btnAdicionar.addEventListener("click", function () {
      console.log("➕ Adicionar nova marca");
      showInputDialog(
        "Digite o nome da nova marca:",
        "",
        function (nomeMarca) {
          if (!nomeMarca || !nomeMarca.trim()) return;
          const marcaTrim = nomeMarca.trim();
          if (marcasAtual.includes(marcaTrim)) {
            if (window.showToast)
              window.showToast("Esta marca já existe!", "warning", 3000);
            else alert("Esta marca já existe!");
            return;
          }

          // Tentar persistir no backend
          if (typeof ApiClient !== "undefined" && ApiClient.criarMarca) {
            ApiClient.criarMarca({ nome: marcaTrim })
              .then(() => {
                marcasAtual.push(marcaTrim);
                marcasAtual.sort((a, b) =>
                  String(a).localeCompare(String(b), "pt-BR", {
                    sensitivity: "base",
                  }),
                );
                renderizarMarcas();
                if (window.showToast)
                  window.showToast(
                    `Marca "${marcaTrim}" adicionada.`,
                    "success",
                    2200,
                  );
              })
              .catch((err) => {
                console.debug(
                  "[marca] falha ao salvar via API, aplicando em memória",
                  err,
                );
                // fallback: manter em memória apenas
                marcasAtual.push(marcaTrim);
                marcasAtual.sort((a, b) =>
                  String(a).localeCompare(String(b), "pt-BR", {
                    sensitivity: "base",
                  }),
                );
                renderizarMarcas();
                if (window.showToast)
                  window.showToast(
                    "Marca adicionada localmente (API indisponível)",
                    "warning",
                    3000,
                  );
              });
          } else {
            marcasAtual.push(marcaTrim);
            marcasAtual.sort((a, b) =>
              String(a).localeCompare(String(b), "pt-BR", {
                sensitivity: "base",
              }),
            );
            renderizarMarcas();
            if (window.showToast)
              window.showToast(
                `Marca "${marcaTrim}" adicionada.`,
                "success",
                2200,
              );
          }
        },
        {
          title: "Adicionar Marca",
          confirmText: "Adicionar",
          cancelText: "Cancelar",
        },
      );
    });

    console.log("✅ Botão Adicionar Marca configurado");
  }
}

// Configurar botões de Editar e Excluir
function configurarBotoesAcao() {
  // Botões de Editar
  const botoesEditar = document.querySelectorAll(".btn-editar");
  botoesEditar.forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const marcaAtual = this.dataset.marca;

      console.log(`✏️ Editar: ${marcaAtual}`);

      showInputDialog(
        `Editar marca "${marcaAtual}":`,
        marcaAtual,
        function (novoNome) {
          if (!novoNome || !novoNome.trim() || novoNome.trim() === marcaAtual)
            return;
          const novoNomeTrim = novoNome.trim();

          // Verificar se o novo nome já existe
          if (marcasAtual.includes(novoNomeTrim)) {
            if (window.showToast)
              window.showToast(
                "Já existe uma marca com este nome!",
                "warning",
                3000,
              );
            else alert("Já existe uma marca com este nome!");
            return;
          }

          // Atualizar marca
          const index = marcasAtual.indexOf(marcaAtual);
          if (index !== -1) {
            // Persistir no backend (se disponível)
            if (typeof ApiClient !== "undefined" && ApiClient.atualizarMarca) {
              ApiClient.atualizarMarca(encodeURIComponent(marcaAtual), {
                nome: novoNomeTrim,
              })
                .then(() => {
                  marcasAtual[index] = novoNomeTrim;
                  marcasAtual.sort((a, b) =>
                    String(a).localeCompare(String(b), "pt-BR", {
                      sensitivity: "base",
                    }),
                  );
                  renderizarMarcas();
                  if (window.showToast)
                    window.showToast(
                      `Marca atualizada: ${novoNomeTrim}`,
                      "success",
                      2000,
                    );
                })
                .catch((err) => {
                  console.debug(
                    "[marca] falha ao atualizar via API, aplicando em memória",
                    err,
                  );
                  marcasAtual[index] = novoNomeTrim;
                  marcasAtual.sort((a, b) =>
                    String(a).localeCompare(String(b), "pt-BR", {
                      sensitivity: "base",
                    }),
                  );
                  renderizarMarcas();
                  if (window.showToast)
                    window.showToast(
                      "Marca atualizada localmente (API indisponível)",
                      "warning",
                      3000,
                    );
                });
            } else {
              marcasAtual[index] = novoNomeTrim;
              marcasAtual.sort((a, b) =>
                String(a).localeCompare(String(b), "pt-BR", {
                  sensitivity: "base",
                }),
              );
              renderizarMarcas();
              if (window.showToast)
                window.showToast(
                  `Marca atualizada: ${novoNomeTrim}`,
                  "success",
                  2000,
                );
            }
            console.log(`✅ Marca atualizada: ${marcaAtual} → ${novoNomeTrim}`);
          }
        },
        {
          title: "Editar Marca",
          confirmText: "Salvar",
          cancelText: "Cancelar",
        },
      );
    });
  });

  // Botões de Excluir
  const botoesExcluir = document.querySelectorAll(".btn-excluir");
  botoesExcluir.forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const marca = this.dataset.marca;

      showConfirmDialog(
        `Deseja realmente excluir a marca "${marca}"?`,
        function () {
          console.log(`🗑️ Excluir: ${marca}`);

          // Remover marca
          const index = marcasAtual.indexOf(marca);
          if (index !== -1) {
            if (typeof ApiClient !== "undefined" && ApiClient.deletarMarca) {
              ApiClient.deletarMarca(encodeURIComponent(marca))
                .then(() => {
                  marcasAtual.splice(index, 1);
                  renderizarMarcas();
                  if (window.showToast)
                    window.showToast(`"${marca}" excluída!`, "success", 2200);
                })
                .catch((err) => {
                  console.debug(
                    "[marca] falha ao deletar via API, removendo em memória",
                    err,
                  );
                  marcasAtual.splice(index, 1);
                  renderizarMarcas();
                  if (window.showToast)
                    window.showToast(
                      "Marca removida localmente (API indisponível)",
                      "warning",
                      3000,
                    );
                });
            } else {
              marcasAtual.splice(index, 1);
              renderizarMarcas();
              if (window.showToast)
                window.showToast(`"${marca}" excluída!`, "success", 2200);
            }
            console.log(`✅ Marca excluída: ${marca}`);
          }
        },
        { title: "Excluir Marca", confirmText: "OK", cancelText: "Cancelar" },
      );
    });
  });
}

// Configurar pesquisa
function configurarPesquisa() {
  const inputPesquisa = document.getElementById("inputPesquisaMarca");
  const btnPesquisar = document.getElementById("btnPesquisar");

  function realizarPesquisa() {
    const termo = inputPesquisa.value.toLowerCase().trim();
    console.log(`🔍 Pesquisando: "${termo}"`);

    if (termo === "") {
      // Restaurar todas as marcas
      marcasAtual = [...marcasPadrao];
    } else {
      // Filtrar marcas
      marcasAtual = marcasPadrao.filter((marca) =>
        marca.toLowerCase().includes(termo),
      );
    }

    // Voltar para página 1
    paginaAtual = 1;

    // Re-renderizar
    renderizarMarcas();

    console.log(`✅ ${marcasAtual.length} marcas encontradas`);
  }

  if (btnPesquisar) {
    btnPesquisar.addEventListener("click", realizarPesquisa);
  }

  if (inputPesquisa) {
    inputPesquisa.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        realizarPesquisa();
      }
    });

    // Pesquisa em tempo real com debounce (mostra resultados enquanto digita)
    let debounceTimer = null;
    inputPesquisa.addEventListener("input", function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        realizarPesquisa();
      }, 160);
    });
  }

  console.log("✅ Pesquisa configurada");
}

// Configurar paginação
function configurarPaginacao() {
  const selectItensPorPagina = document.getElementById("itensPorPagina");
  const btnPrevPage = document.getElementById("btnPrevPage");
  const btnNextPage = document.getElementById("btnNextPage");

  if (selectItensPorPagina) {
    selectItensPorPagina.addEventListener("change", function () {
      itensPorPagina = parseInt(this.value);
      paginaAtual = 1;
      renderizarMarcas();
      console.log(`📄 Itens por página alterado para: ${itensPorPagina}`);
    });
  }

  if (btnPrevPage) {
    btnPrevPage.addEventListener("click", function () {
      if (paginaAtual > 1) {
        paginaAtual--;
        renderizarMarcas();
        console.log(`⬅️ Página ${paginaAtual}`);
      }
    });
  }

  if (btnNextPage) {
    btnNextPage.addEventListener("click", function () {
      const totalPaginas = Math.ceil(marcasAtual.length / itensPorPagina);
      if (paginaAtual < totalPaginas) {
        paginaAtual++;
        renderizarMarcas();
        console.log(`➡️ Página ${paginaAtual}`);
      }
    });
  }

  console.log("✅ Paginação configurada");
}

// Atualizar informações de paginação
function atualizarPaginacao() {
  const pageRange = document.getElementById("pageRange");
  const btnPrevPage = document.getElementById("btnPrevPage");
  const btnNextPage = document.getElementById("btnNextPage");

  const totalItens = marcasAtual.length;
  const totalPaginas = Math.ceil(totalItens / itensPorPagina);
  const inicio = (paginaAtual - 1) * itensPorPagina + 1;
  const fim = Math.min(paginaAtual * itensPorPagina, totalItens);

  if (pageRange) {
    pageRange.textContent = `${inicio} - ${fim} de ${totalItens}`;
  }

  if (btnPrevPage) {
    btnPrevPage.disabled = paginaAtual === 1;
  }

  if (btnNextPage) {
    btnNextPage.disabled = paginaAtual >= totalPaginas;
  }
}
