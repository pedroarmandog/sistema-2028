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

// Função reutilizável para abrir um modal com visualizador de PDF (mesma usada em meus-itens.js)
function openPdfModal(blobUrl, title = "Relatório") {
  // evitar duplicados
  if (document.getElementById("pdfModalOverlay")) return;

  // inserir estilos se necessário
  if (!document.getElementById("pdfModalStyles")) {
    const style = document.createElement("style");
    style.id = "pdfModalStyles";
    style.innerHTML = `
            .pdf-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:14000}
            .pdf-modal{width:92%;max-width:1150px;height:86%;background:#fff;border-radius:6px;box-shadow:0 12px 40px rgba(2,6,23,0.45);overflow:hidden;display:flex;flex-direction:column}
            .pdf-modal-header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e6e9ee;background:#f7f7f8}
            .pdf-modal-title{font-weight:600;color:#222}
            .pdf-modal-toolbar{display:flex;gap:8px;align-items:center}
            .pdf-modal-iframe{flex:1;border:0;width:100%;height:100%}
            .pdf-modal-actions a, .pdf-modal-actions button{background:transparent;border:0;color:#1f2937;padding:6px 10px;border-radius:6px;cursor:pointer}
            .pdf-modal-close{background:#fff;border:1px solid #ddd;padding:6px 10px;border-radius:6px}
        `;
    document.head.appendChild(style);
  }

  const overlay = document.createElement("div");
  overlay.id = "pdfModalOverlay";
  overlay.className = "pdf-modal-overlay";

  const modal = document.createElement("div");
  modal.className = "pdf-modal";

  const header = document.createElement("div");
  header.className = "pdf-modal-header";
  const hTitle = document.createElement("div");
  hTitle.className = "pdf-modal-title";
  hTitle.textContent = title;

  const toolbar = document.createElement("div");
  toolbar.className = "pdf-modal-toolbar pdf-modal-actions";

  const viewBtn = document.createElement("a");
  viewBtn.href = "#";
  viewBtn.textContent = "Ver em uma nova aba";
  viewBtn.onclick = function (ev) {
    ev.preventDefault();
    window.open(blobUrl, "_blank");
  };

  // criar botão quadrado de formato (pdf/xls) com dropdown
  const formatWrapper = document.createElement("div");
  formatWrapper.style.position = "relative";
  formatWrapper.style.display = "inline-block";

  const formatBtn = document.createElement("button");
  formatBtn.type = "button";
  formatBtn.className = "pdf-modal-format-btn";
  formatBtn.style.width = "56px";
  formatBtn.style.height = "28px";
  formatBtn.style.border = "1px solid #ddd";
  formatBtn.style.borderRadius = "6px";
  formatBtn.style.background = "#f3f4f6";
  formatBtn.style.cursor = "pointer";
  formatBtn.style.padding = "0 8px";
  formatBtn.style.fontSize = "12px";
  formatBtn.style.display = "flex";
  formatBtn.style.alignItems = "center";
  formatBtn.style.justifyContent = "space-between";
  const formatText = document.createTextNode("pdf");
  const caret = document.createElement("span");
  caret.textContent = " ▾";
  caret.style.marginLeft = "6px";
  formatBtn.appendChild(formatText);
  formatBtn.appendChild(caret);

  const formatMenu = document.createElement("ul");
  formatMenu.style.position = "absolute";
  formatMenu.style.top = "34px";
  formatMenu.style.right = "0";
  formatMenu.style.minWidth = "80px";
  formatMenu.style.background = "#fff";
  formatMenu.style.boxShadow = "0 6px 18px rgba(0,0,0,0.12)";
  formatMenu.style.border = "1px solid #eee";
  formatMenu.style.padding = "6px 0";
  formatMenu.style.margin = "0";
  formatMenu.style.listStyle = "none";
  formatMenu.style.display = "none";
  formatMenu.style.zIndex = "20000";

  function makeFormatItem(label) {
    const li = document.createElement("li");
    li.style.padding = "6px 12px";
    li.style.cursor = "pointer";
    li.textContent = label;
    li.addEventListener("mouseenter", function () {
      this.style.background = "#f5f7fa";
    });
    li.addEventListener("mouseleave", function () {
      this.style.background = "transparent";
    });
    return li;
  }

  const itemPdf = makeFormatItem("pdf");
  const itemXls = makeFormatItem("xls");
  formatMenu.appendChild(itemPdf);
  formatMenu.appendChild(itemXls);

  formatWrapper.appendChild(formatBtn);
  formatWrapper.appendChild(formatMenu);

  let selectedFormat = "pdf";
  formatBtn.addEventListener("click", function (ev) {
    ev.stopPropagation();
    formatMenu.style.display =
      formatMenu.style.display === "none" ? "block" : "none";
  });
  document.addEventListener("click", function () {
    if (formatMenu) formatMenu.style.display = "none";
  });
  itemPdf.addEventListener("click", function (ev) {
    ev.stopPropagation();
    selectedFormat = "pdf";
    formatText.nodeValue = "pdf";
    formatMenu.style.display = "none";
  });
  itemXls.addEventListener("click", function (ev) {
    ev.stopPropagation();
    selectedFormat = "xls";
    formatText.nodeValue = "xls";
    formatMenu.style.display = "none";
  });

  const downloadBtn = document.createElement("button");
  downloadBtn.type = "button";
  downloadBtn.className = "pdf-modal-download";
  downloadBtn.title = "Download";
  downloadBtn.style.width = "36px";
  downloadBtn.style.height = "28px";
  downloadBtn.style.border = "1px solid #ddd";
  downloadBtn.style.borderRadius = "6px";
  downloadBtn.style.background = "#fff";
  downloadBtn.style.cursor = "pointer";
  downloadBtn.style.display = "inline-flex";
  downloadBtn.style.alignItems = "center";
  downloadBtn.style.justifyContent = "center";
  downloadBtn.style.marginLeft = "6px";
  downloadBtn.textContent = "⤓";
  downloadBtn.addEventListener("click", function (ev) {
    ev.stopPropagation();
    try {
      if (selectedFormat === "pdf") {
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = "relatorio.pdf";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else if (selectedFormat === "xls") {
        // xls export not implemented here for etiquetas
        alert("Export XLS não implementado para este modal.");
      }
    } catch (e) {
      console.error("erro no download pelo botão", e);
    }
  });

  const closeBtn = document.createElement("button");
  closeBtn.className = "pdf-modal-close";
  closeBtn.textContent = "✕";
  closeBtn.onclick = closeModal;

  toolbar.appendChild(viewBtn);
  toolbar.appendChild(formatWrapper);
  toolbar.appendChild(downloadBtn);
  toolbar.appendChild(closeBtn);

  header.appendChild(hTitle);
  header.appendChild(toolbar);

  const iframe = document.createElement("iframe");
  iframe.className = "pdf-modal-iframe";
  iframe.src = blobUrl;
  iframe.type = "application/pdf";

  modal.appendChild(header);
  modal.appendChild(iframe);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  function onKey(e) {
    if (e.key === "Escape") closeModal();
  }
  document.addEventListener("keydown", onKey);
  overlay.addEventListener("click", function (ev) {
    if (ev.target === overlay) closeModal();
  });

  function closeModal() {
    try {
      document.removeEventListener("keydown", onKey);
    } catch (e) {}
    try {
      if (overlay && overlay.parentNode)
        overlay.parentNode.removeChild(overlay);
    } catch (e) {}
    try {
      URL.revokeObjectURL(blobUrl);
    } catch (e) {}
  }
}

// Função genérica de toast do sistema (ex: aviso amarelo no canto superior direito)
function showSystemToast(message, opts) {
  try {
    opts = opts || {};
    var duration = typeof opts.duration === "number" ? opts.duration : 4200;
    var containerId = "systemToastContainer";

    // estilos inseridos apenas uma vez
    if (!document.getElementById("systemToastStyles")) {
      var s = document.createElement("style");
      s.id = "systemToastStyles";
      s.innerHTML =
        "\n" +
        "#systemToastContainer{position:fixed;top:18px;right:18px;display:flex;flex-direction:column;gap:10px;z-index:2147483647;align-items:flex-end;pointer-events:none}\n" +
        ".system-toast{pointer-events:auto;min-width:260px;max-width:420px;padding:12px 16px;border-radius:10px;box-shadow:0 8px 24px rgba(2,6,23,0.12);font-weight:400;color:#3b2f00;background:linear-gradient(180deg,#fff9db,#fff1a8);border:1px solid rgba(180,140,0,0.12);display:flex;align-items:center;gap:12px}\n" +
        ".system-toast .icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.04);font-size:16px;color:#5a3d00}\n" +
        ".system-toast .text{flex:1;font-weight:400;color:#4a3b00}\n";
      document.head.appendChild(s);
    }

    var container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement("div");
      container.id = containerId;
      document.body.appendChild(container);
    }

    var toast = document.createElement("div");
    toast.className = "system-toast";
    var icon = document.createElement("div");
    icon.className = "icon";
    icon.innerHTML = "⚠";
    var txt = document.createElement("div");
    txt.className = "text";
    txt.textContent = message || "";
    toast.appendChild(icon);
    toast.appendChild(txt);

    container.appendChild(toast);

    // animação simples
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-6px)";
    requestAnimationFrame(function () {
      toast.style.transition = "opacity .18s, transform .18s";
      toast.style.opacity = "1";
      toast.style.transform = "none";
    });

    setTimeout(function () {
      try {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-6px)";
        setTimeout(function () {
          try {
            toast.remove();
          } catch (e) {}
        }, 220);
      } catch (e) {}
    }, duration);
  } catch (e) {
    console.warn("showSystemToast error", e);
  }
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

  // Inicializar funcionalidades da página de Etiquetas
  inicializarEtiquetas();
});

// ========================================
// EMISSÃO DE ETIQUETAS - FUNCIONALIDADES
// ========================================

// Estado da aplicação
let abaAtiva = "entradas";
let layoutAbaAtiva = "impressora";
let etiquetasSelecionadas = [];

function inicializarEtiquetas() {
  console.log("🔧 Inicializando funcionalidades de Etiquetas...");

  // Configurar abas principais (Entradas, Produtos, Preços Alterados)
  configurarAbasPrincipais();

  // Configurar abas de layout (Impressora, Modelo Etiqueta)
  configurarAbasLayout();
  // Configurar selector de impressora (frontend + persistência no backend)
  configurarImpressoraSelector();

  // Configurar botão Buscar Notas
  configurarBotaoBuscarNotas();
  // Configurar botão Adicionar à lista de impressão (Produtos)
  configurarAdicionarProduto();
  // Configurar autocomplete de produto
  configurarProdutoAutocomplete();
  // Configurar botão Buscar Produtos em Preços Alterados
  configurarBotaoBuscarPrecos();

  // Configurar botão Visualizar Etiquetas
  configurarBotaoVisualizarEtiquetas();

  // Configurar botões de ação da lista
  configurarBotoesAcaoLista();

  // Inicializar contador de etiquetas
  atualizarContadorEtiquetas();
  // Renderizar lista inicial (se houver itens pré-selecionados)
  renderListaEtiquetas();

  console.log("✅ Funcionalidades de Etiquetas inicializadas!");
}

// Configurar botão Buscar Produtos na aba Preços Alterados
function configurarBotaoBuscarPrecos() {
  const btn = document.getElementById("btnBuscarPrecos");
  if (!btn) return;
  btn.addEventListener("click", async function (e) {
    e.preventDefault();
    const periodo = document.getElementById("periodoPrecos")?.value || "";
    console.log("🔍 Buscar produtos com preços alterados - período:", periodo);

    // parse period expected format: 'dd/mm/yyyy - dd/mm/yyyy' or single date
    function toIso(dStr) {
      // dd/mm/yyyy -> yyyy-mm-dd
      const s = (dStr || "").trim();
      const parts = s.split("/").map((p) => p.trim());
      if (parts.length !== 3) return "";
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }

    let start = "",
      end = "";
    if (periodo.indexOf("-") !== -1) {
      const parts = periodo.split("-").map((p) => p.trim());
      start = toIso(parts[0]);
      end = toIso(parts[1]);
    } else if (periodo.trim()) {
      start = end = toIso(periodo.trim());
    }

    // build URL - backend route assumed /api/editar-produto?start=YYYY-MM-DD&end=YYYY-MM-DD
    let url = "/api/editar-produto";
    const params = [];
    if (start) params.push("start=" + encodeURIComponent(start));
    if (end) params.push("end=" + encodeURIComponent(end));
    if (params.length) url += "?" + params.join("&");

    const resultsContainer = document.getElementById("precosResults");
    if (!resultsContainer) return;
    resultsContainer.innerHTML =
      '<div style="padding:14px;color:#666">Buscando produtos...</div>';

    try {
      const res = await fetch(url);
      let data = [];
      if (res.ok) {
        data = await res.json().catch(() => []);
      } else {
        console.warn("Buscar preços API returned", res.status);
      }

      // if backend not available or returns empty, fallback to mock sample
      if (!Array.isArray(data) || data.length === 0) {
        // leave empty array; it's fine to show 'Nenhum produto encontrado'
      }

      renderProdutosPrecos(data || []);
    } catch (err) {
      console.warn("Erro ao buscar produtos de preços alterados", err);
      resultsContainer.innerHTML =
        '<div style="padding:14px;color:#c00">Erro ao buscar produtos.</div>';
    }
  });
}

function renderProdutosPrecos(items) {
  const container = document.getElementById("precosResults");
  if (!container) return;
  container.innerHTML = "";
  if (!items || items.length === 0) {
    container.innerHTML =
      '<div style="padding:14px;color:#666">Nenhum produto com preço alterado encontrado neste período.</div>';
    return;
  }

  items.forEach((p) => {
    // expected fields: id, codigo, nome, estoque, precoAntigo, precoNovo
    const row = document.createElement("div");
    row.className = "preco-item";
    // preparar valor de preço para atribuir ao botão (preferir precoNovo, depois preco)
    const precoBtnVal =
      typeof p.precoNovo !== "undefined" && p.precoNovo !== null
        ? p.precoNovo
        : typeof p.preco !== "undefined" && p.preco !== null
          ? p.preco
          : p.preco_venda || p.precoVenda || "";

    row.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 12px;border-bottom:1px solid #efefef;background:#fff;">
                <div style="flex:1">
                    <div class="preco-nome" style="font-weight:600;color:#333;margin-bottom:6px">${p.codigo ? p.codigo + " - " : ""}${escapeHtml(p.nome || p.descricao || "")}</div>
                    <div class="preco-estoque" style="font-size:13px;color:#666">Estoque: ${typeof p.estoque !== "undefined" ? p.estoque : p.stock || 0}</div>
                </div>
                <div style="margin-left:12px;flex-shrink:0">
                    <button class="btn-visualizar btn-add-print" data-id="${p.id}" data-preco="${precoBtnVal}" style="background:#6c757d;color:#fff;border:none;padding:10px 14px;border-radius:6px;">Adicionar à lista de Impressão</button>
                </div>
            </div>
        `;
    container.appendChild(row);
  });

  // attach handlers for add buttons
  container.querySelectorAll(".btn-add-print").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      const id = this.dataset.id;
      const parent = this.closest(".preco-item");
      // extrair nome e estoque a partir das classes definidas
      const nomeEl = parent ? parent.querySelector(".preco-nome") : null;
      const estoqueEl = parent ? parent.querySelector(".preco-estoque") : null;
      let nome = nomeEl
        ? String(nomeEl.textContent || "").trim()
        : "Produto " + id;
      let estoqueText = estoqueEl
        ? String(estoqueEl.textContent || "").trim()
        : "";

      // sanitizar nome caso contenha textos residuais (por precaução)
      nome = nome
        .replace(/Adicionar\s+à?\s+lista\s+de\s+Impressão/gi, "")
        .trim();
      // extrair número do estoque
      const estoqueMatch = estoqueText.match(/(\d+)/);
      const estoque = estoqueMatch ? Number(estoqueMatch[1]) : 0;
      const qty = 1;

      // obter preco passado no data-preco do botão e tentar normalizar para Number
      const precoRaw = this.dataset.preco;
      let precoVal = null;
      if (
        precoRaw !== undefined &&
        precoRaw !== null &&
        String(precoRaw).trim() !== ""
      ) {
        try {
          let cleaned = String(precoRaw)
            .replace(/\s/g, "")
            .replace(/R\$|\$/g, "")
            .trim();
          cleaned = cleaned.replace(/[^0-9\-,.]/g, "");
          const commaCount = (cleaned.match(/,/g) || []).length;
          const dotCount = (cleaned.match(/\./g) || []).length;
          if (commaCount === 1 && dotCount === 0)
            cleaned = cleaned.replace(",", ".");
          cleaned = cleaned.replace(/(\.(?=\d{3}(?:\.|,|$)))/g, "");
          const n = Number(cleaned);
          if (!isNaN(n) && isFinite(n)) precoVal = n;
        } catch (ex) {
          precoVal = null;
        }
      }

      const novo = {
        id: String(id || Date.now()),
        codigo: "",
        produto: nome || "Produto " + id,
        quantidade: qty,
        estoque: Number(estoque) || 0,
      };
      if (precoVal !== null) novo.preco = precoVal;
      adicionarEtiquetaNaLista(novo);
      console.log("✅ Produto adicionado da lista Preços Alterados", novo);
    });
  });
}

function escapeHtml(s) {
  if (!s) return "";
  return String(s).replace(/[&<>"']/g, function (c) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c];
  });
}

// Configurar botão Adicionar produto à lista de impressão
function configurarAdicionarProduto() {
  const btn = document.getElementById("btnAddToPrint");
  const produtoInput = document.getElementById("produto");
  const qtyInput = document.getElementById("produtoQuantidade");
  if (!btn || !produtoInput || !qtyInput) return;

  btn.addEventListener("click", function (e) {
    e.preventDefault();
    const nome = (produtoInput.value || "").trim();
    const qty = parseFloat(qtyInput.value) || 0;
    if (!nome) {
      try {
        showSystemToast("Informe o produto");
      } catch (e) {
        alert("Informe o produto");
      }
      produtoInput.focus();
      return;
    }
    if (qty <= 0) {
      try {
        showSystemToast("Informe quantidade válida");
      } catch (e) {
        alert("Informe quantidade válida");
      }
      qtyInput.focus();
      return;
    }
    // Usar o id selecionado no autocomplete quando disponível (para manter mesmo id do meus-itens)
    var selectedId =
      produtoInput.dataset.itemId ||
      produtoInput.getAttribute("data-item-id") ||
      String(Date.now());
    // Adicionar à lista de etiquetas selecionadas
    const novo = {
      id: String(selectedId),
      produto: nome,
      quantidade: qty,
      estoque: 0,
    };
    adicionarEtiquetaNaLista(novo);

    // Limpar campos (manter foco no produto para adicionar mais)
    produtoInput.value = "";
    qtyInput.value = "1";
    // remover id selecionado do autocomplete para evitar reuso acidental
    try {
      delete produtoInput.dataset.itemId;
    } catch (e) {}
    produtoInput.focus();
    console.log("✅ Produto adicionado à lista de impressão", novo);
  });
}

// Configurar autocomplete de produto usando /api/itens?q=
function configurarProdutoAutocomplete() {
  const input = document.getElementById("produto");
  if (!input) return;

  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  let dropdown = document.createElement("div");
  dropdown.className = "autocomplete-list";
  dropdown.style.position = "absolute";
  dropdown.style.display = "none";
  dropdown.setAttribute("data-owner", "produto");
  document.body.appendChild(dropdown);

  function escapeHtml(s) {
    if (!s) return "";
    return String(s).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
    });
  }

  async function fetchItens(q) {
    try {
      const url = "/api/itens" + (q ? "?q=" + encodeURIComponent(q) : "");
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("fetchItens error", e);
      return [];
    }
  }

  function position() {
    const r = input.getBoundingClientRect();
    const left = r.left + (window.pageXOffset || 0);
    const top = r.bottom + (window.pageYOffset || 0) + 6;
    dropdown.style.left = left + "px";
    dropdown.style.top = top + "px";
    dropdown.style.minWidth = Math.max(220, r.width) + "px";
  }

  function render(items) {
    dropdown.innerHTML = "";
    if (!items || items.length === 0) {
      dropdown.style.display = "none";
      return;
    }
    const top = document.createElement("div");
    top.className = "autocomplete-topline";
    dropdown.appendChild(top);
    items.slice(0, 40).forEach((it, idx) => {
      const el = document.createElement("div");
      el.className = "autocomplete-item";
      el.tabIndex = 0;
      const nome = it.nome || it.descricao || "";
      el.innerHTML =
        `<div>${escapeHtml(nome)}</div>` +
        (it.codigo
          ? `<div class="autocomplete-sub">${escapeHtml(it.codigo)}</div>`
          : "");
      el.addEventListener("click", function (ev) {
        ev.stopPropagation();
        selectItem(it);
      });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          selectItem(it);
        }
      });
      dropdown.appendChild(el);
    });
    position();
    dropdown.style.display = "block";
  }

  function selectItem(item) {
    input.value = item.nome || item.descricao || "";
    input.dataset.itemId = item.id || "";
    // optionally set focus to quantity
    const qty = document.getElementById("produtoQuantidade");
    if (qty) qty.focus();
    dropdown.style.display = "none";
  }

  const deb = debounce(async function (q) {
    const items = await fetchItens(q);
    render(items);
  }, 200);

  input.addEventListener("input", function (e) {
    deb(this.value.trim());
  });
  input.addEventListener("focus", function (e) {
    deb(this.value.trim());
  });
  input.addEventListener("click", function (e) {
    deb(this.value.trim());
  });

  document.addEventListener("click", function (ev) {
    if (!dropdown.contains(ev.target) && ev.target !== input)
      dropdown.style.display = "none";
  });
  window.addEventListener("resize", function () {
    if (dropdown.style.display !== "none") position();
  });
  window.addEventListener(
    "scroll",
    function () {
      if (dropdown.style.display !== "none") position();
    },
    true,
  );
}

// Configurar abas principais
function configurarAbasPrincipais() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      const tabName = this.dataset.tab;

      // Remover active de todas as abas
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      // Adicionar active na aba clicada
      this.classList.add("active");
      document.getElementById(`tab-${tabName}`).classList.add("active");

      abaAtiva = tabName;
      console.log(`📑 Aba alterada para: ${tabName}`);
    });
  });

  console.log("✅ Abas principais configuradas");
}

// Configurar abas de layout
function configurarAbasLayout() {
  const layoutTabs = document.querySelectorAll(".layout-tab");
  const layoutContents = document.querySelectorAll(".layout-tab-content");

  layoutTabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      const tabName = this.dataset.layoutTab;

      // Remover active de todas as abas de layout
      layoutTabs.forEach((t) => t.classList.remove("active"));
      layoutContents.forEach((c) => c.classList.remove("active"));

      // Adicionar active na aba clicada
      this.classList.add("active");
      document.getElementById(`layout-${tabName}`).classList.add("active");

      layoutAbaAtiva = tabName;
      console.log(`📋 Aba de layout alterada para: ${tabName}`);
    });
  });

  console.log("✅ Abas de layout configuradas");
}

// Configurar botão Buscar Notas
function configurarBotaoBuscarNotas() {
  const btnBuscarNotas = document.getElementById("btnBuscarNotas");

  if (btnBuscarNotas) {
    btnBuscarNotas.addEventListener("click", function () {
      const periodoEntrada = document.getElementById("periodoEntrada").value;
      const fornecedor = document.getElementById("fornecedor").value;

      console.log("🔍 Buscando notas de entrada...");
      console.log("Período:", periodoEntrada);
      console.log("Fornecedor:", fornecedor || "(todos)");

      // TODO: Implementar busca de notas
      alert(
        `Buscando notas de entrada:\nPeríodo: ${periodoEntrada}\nFornecedor: ${fornecedor || "Todos"}`,
      );

      // Busca real ainda não implementada: não adicionar produtos automaticamente
      // Removida a simulação que preenchia etiquetasSelecionadas com produtos fictícios.
      etiquetasSelecionadas = [];
      atualizarContadorEtiquetas();
      console.log(
        "ℹ️ Busca de notas de entrada: implementação de backend ausente — nenhum produto adicionado.",
      );
      try {
        showSystemToast(
          "Busca de notas de entrada não implementada (nenhum produto adicionado).",
        );
      } catch (e) {}
    });

    console.log("✅ Botão Buscar Notas configurado");
  }
}

// Configurar botão Visualizar Etiquetas
function configurarBotaoVisualizarEtiquetas() {
  const btnVisualizarEtiquetas = document.getElementById(
    "btnVisualizarEtiquetas",
  );

  if (btnVisualizarEtiquetas) {
    btnVisualizarEtiquetas.addEventListener("click", function () {
      if (etiquetasSelecionadas.length === 0) {
        showSystemToast("Nenhuma etiqueta selecionada para impressão!");
        return;
      }

      const primeiraLinha = document.querySelector(
        'input[type="number"][value="1"]',
      ).value;
      const primeiraColuna = document.querySelectorAll(
        'input[type="number"][value="1"]',
      )[1].value;
      const gerarPorEl = document.querySelector(".form-control-small");
      const gerarPor = gerarPorEl
        ? gerarPorEl.tagName === "SELECT"
          ? gerarPorEl.value
          : gerarPorEl.textContent || gerarPorEl.value || "Código do produto"
        : "Código do produto";

      console.log("👁️ Visualizando etiquetas... enviando para backend");

      // Montar payload para /api/relatorios/etiquetas/pdf incluindo marca/local
      function sanitizeName(str) {
        if (!str) return "";
        let s = String(str).trim();
        // remover linhas extras e labels comuns
        s = s.replace(/\n/g, " ");
        s = s.replace(/Estoque\s*[:\-].*$/i, "").trim();
        s = s.replace(/Adicionar\s+à?\s+lista\s+de\s+Impressão/i, "").trim();
        // remover textos de ação que possam ter vindo do DOM
        s = s.replace(/Adicionar à lista de Impressão/i, "").trim();
        return s;
      }

      const etiquetasPayload = (etiquetasSelecionadas || []).map((it) => ({
        id: it.id || it.codigo || String(Date.now()),
        produto: sanitizeName(it.produto || it.nome || it.descricao || ""),
        quantidade: Number(it.quantidade) || 1,
        codigo: it.codigo || it.id || "",
        marca: it.marca || it.marcaNome || it.fabricante || "",
        local: it.local || it.localEstoque || "",
        // incluir preço quando disponível (nomes comuns de campo)
        preco:
          it.preco !== undefined && it.preco !== null
            ? it.preco
            : it.preco_venda ||
              it.precoVenda ||
              it.preco_venda_formatted ||
              it.preco_formatted ||
              null,
      }));

      const modelo =
        (document.getElementById("modeloEtiquetaField") || {}).value || "";
      const API_BASE =
        (window.__API_BASE__ && window.__API_BASE__.toString()) ||
        window.location.origin;
      const apiUrl =
        API_BASE.replace(/\/$/, "") + "/api/relatorios/etiquetas/pdf";

      (async function () {
        try {
          // Log do payload para depuração: confirma exatamente o que será enviado ao backend
          try {
            console.log(
              "📤 etiquetasPayload (sample 0..9):",
              JSON.parse(JSON.stringify((etiquetasPayload || []).slice(0, 10))),
            );
          } catch (e) {
            console.log("📤 etiquetasPayload (raw):", etiquetasPayload);
          }
          const resp = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              etiquetas: etiquetasPayload,
              primeiraLinha: primeiraLinha,
              primeiraColuna: primeiraColuna,
              gerarPor: gerarPor,
              modelo: modelo,
            }),
          });
          if (!resp.ok) {
            const txt = await resp.text().catch(() => null);
            alert(
              "Erro gerando PDF: " +
                (resp.status + " " + (txt || resp.statusText)),
            );
            return;
          }
          const blob = await resp.blob();
          const url = URL.createObjectURL(blob);
          if (typeof openPdfModal === "function") {
            openPdfModal(url, "Emissão De Etiquetas - " + (modelo || "pdf"));
          } else {
            window.open(url, "_blank");
          }
        } catch (err) {
          console.error("Erro ao gerar/abrir PDF", err);
          alert("Erro ao gerar PDF: " + (err && err.message));
        }
      })();
    });

    console.log("✅ Botão Visualizar Etiquetas configurado");
  }
}

// Impressora selector: frontend widget + persistence
function configurarImpressoraSelector() {
  const container = document.getElementById("impressoraSelect");
  const current = document.getElementById("impressoraCurrent");
  const dropdown = document.getElementById("impressoraDropdown");
  if (!container || !current || !dropdown) return;

  function closeDropdown() {
    dropdown.style.display = "none";
  }
  function openDropdown() {
    dropdown.style.display = "block";
  }

  current.addEventListener("click", function (e) {
    e.stopPropagation();
    if (dropdown.style.display === "block") closeDropdown();
    else openDropdown();
  });

  // click outside closes
  document.addEventListener("click", function (e) {
    if (!container.contains(e.target)) closeDropdown();
  });

  // select item
  dropdown.querySelectorAll(".impressora-item").forEach((it) => {
    it.addEventListener("click", async function (e) {
      e.preventDefault();
      e.stopPropagation();
      const val = this.dataset.val;
      current.textContent = this.textContent || val;
      closeDropdown();
      // persist to backend
      try {
        await fetch("/api/impressora", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tipo: val }),
        });
        console.log("Impressora selecionada:", val);
      } catch (err) {
        console.warn("Erro salvando impressora", err);
      }
    });
  });

  // load current selection from backend
  (async function () {
    try {
      const res = await fetch("/api/impressora");
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.tipo) {
        const tipo = String(data.tipo).toLowerCase();
        // map to shown label
        if (tipo === "argox" || tipo === "agrox") current.textContent = "Argox";
        else current.textContent = "Laser";
      }
    } catch (e) {
      console.warn("Erro carregando impressora", e);
    }
  })();
}

// Configurar botões de ação da lista
function configurarBotoesAcaoLista() {
  const btnLimpar = document.querySelector('.btn-icon-action[title="Limpar"]');
  const btnOpcoes = document.querySelector('.btn-icon-action[title="Opções"]');

  if (btnLimpar) {
    btnLimpar.addEventListener("click", async function () {
      if (etiquetasSelecionadas.length === 0) {
        alert("Não há etiquetas para limpar!");
        return;
      }

      if (
        await confirmar(
          `Deseja realmente limpar ${etiquetasSelecionadas.length} etiqueta(s)?`,
        )
      ) {
        etiquetasSelecionadas = [];
        atualizarContadorEtiquetas();
        console.log("🗑️ Lista de etiquetas limpa");
      }
    });
  }

  if (btnOpcoes) {
    btnOpcoes.addEventListener("click", function () {
      console.log("⚙️ Opções");
      alert("Opções de etiquetas\n(Funcionalidade será implementada)");
    });
  }

  console.log("✅ Botões de ação da lista configurados");
}

// Atualizar contador de etiquetas
function atualizarContadorEtiquetas() {
  const etiquetasCount = document.querySelector(".etiquetas-count");

  if (etiquetasCount) {
    const total = etiquetasSelecionadas.length;
    etiquetasCount.textContent = `${total} etiqueta${total !== 1 ? "s" : ""} para impressão`;
  }
}

// Adiciona item ao array e re-renderiza a lista da direita
function adicionarEtiquetaNaLista(item) {
  // evitar duplicatas por id (se id já existir, incrementar quantidade)
  const existe = etiquetasSelecionadas.find(
    (e) => String(e.id) === String(item.id),
  );
  if (existe) {
    existe.quantidade =
      (Number(existe.quantidade) || 0) + (Number(item.quantidade) || 1);
  } else {
    etiquetasSelecionadas.push(item);
  }
  atualizarContadorEtiquetas();
  renderListaEtiquetas();
}

function removerEtiquetaPorId(id) {
  etiquetasSelecionadas = etiquetasSelecionadas.filter(
    (e) => String(e.id) !== String(id),
  );
  atualizarContadorEtiquetas();
  renderListaEtiquetas();
}

function renderListaEtiquetas() {
  const container = document.getElementById("etiquetasList");
  if (!container) return;
  container.innerHTML = "";
  if (!etiquetasSelecionadas || etiquetasSelecionadas.length === 0) {
    container.innerHTML =
      '<div style="padding:12px;color:#666">Nenhuma etiqueta adicionada.</div>';
    return;
  }

  etiquetasSelecionadas.forEach((it, idx) => {
    const row = document.createElement("div");
    row.className = "etiqueta-row";
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.padding = "10px 12px";
    row.style.borderBottom = "1px solid #efefef";
    row.style.background = "#fff";

    const left = document.createElement("div");
    left.style.flex = "1";
    // Mostrar apenas código e descrição (sem estoque nem links)
    left.innerHTML = `<div style="font-weight:600;color:#333;margin-bottom:6px">${escapeHtml(it.id)} - ${escapeHtml(it.produto || it.nome || "")}</div>`;

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.alignItems = "center";
    right.style.gap = "8px";
    right.style.marginLeft = "12px";

    const qtyInput = document.createElement("input");
    qtyInput.type = "number";
    qtyInput.value = Number(it.quantidade) || 1;
    qtyInput.min = 1;
    qtyInput.style.width = "80px";
    qtyInput.className = "form-control-tiny";
    qtyInput.addEventListener("change", function () {
      it.quantidade = Number(this.value) || 1;
    });

    // (listener será anexado após o elemento ser inserido no DOM)

    const btnRem = document.createElement("button");
    btnRem.className = "btn btn-danger";
    btnRem.textContent = "Remover";
    btnRem.addEventListener("click", function () {
      removerEtiquetaPorId(it.id);
    });

    right.appendChild(qtyInput);
    right.appendChild(btnRem);

    row.appendChild(left);
    row.appendChild(right);
    container.appendChild(row);
    // não anexar mais o link "Emitir etiquetas para o estoque" (removido)
  });
}
