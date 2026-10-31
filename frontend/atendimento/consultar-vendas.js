// Copiado de frontend/dashboard.js - funcionalidades do menu e header

console.log("🚀 menu.js carregado (snippet do dashboard)");

function detectarIDsDuplicados() {
  const idsParaVerificar = [
    "clienteMenuItem",
    "clienteSubmenu",
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
  configurarSubmenuLateralCaixa();
  inicializarConsultarVendas();
});

// Fallback caso DOMContentLoaded já tenha disparado
if (
  document.readyState === "complete" ||
  document.readyState === "interactive"
) {
  setTimeout(function () {
    if (!window.__consultarVendasIniciado) {
      configurarSubmenuLateralCaixa();
      inicializarConsultarVendas();
    }
  }, 100);
}

/* ========================================
   CONSULTAR VENDAS - FUNCIONALIDADES
   ======================================== */

function inicializarConsultarVendas() {
  if (window.__consultarVendasIniciado) return;
  window.__consultarVendasIniciado = true;
  console.log("🛒 Inicializando Consultar Vendas...");

  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.querySelector(".search-btn");
  const filtroTodos = document.getElementById("filtroTodos");
  const novaVendaBtn = document.getElementById("novaVendaBtn");
  const vendasTableBody = document.getElementById("vendasTableBody");
  const emptyState = document.getElementById("emptyState");

  let vendas = [];
  let vendasFiltradas = [];

  // Carregar todas as vendas da API
  async function carregarVendas() {
    try {
      const resp = await fetch("/api/vendas");
      if (!resp.ok) throw new Error("Erro ao buscar vendas");
      const data = await resp.json();
      vendas = (data.vendas || []).map((v) => ({
        id: v.id,
        numero: v.id,
        cliente: v.cliente || "",
        clienteId: v.clienteId,
        emissao: v.data,
        valor:
          parseFloat(v.totalPago) || parseFloat((v.totais || {}).final) || 0,
        observacoes: v.observacoes || "",
        situacao: mapearStatus(v.status),
        pagamentos:
          (typeof v.pagamentos === "string"
            ? (function (s) {
                try {
                  return JSON.parse(s);
                } catch (e) {
                  return [];
                }
              })(v.pagamentos)
            : v.pagamentos) || [],
        itens:
          (typeof v.itens === "string"
            ? (function (s) {
                try {
                  return JSON.parse(s);
                } catch (e) {
                  return [];
                }
              })(v.itens)
            : v.itens) || [],
        totais:
          (typeof v.totais === "string"
            ? (function (s) {
                try {
                  return JSON.parse(s);
                } catch (e) {
                  return {};
                }
              })(v.totais)
            : v.totais) || {},
      }));
      filtrarVendas();
    } catch (err) {
      console.error("Erro ao carregar vendas:", err);
      vendas = [];
      filtrarVendas();
    }
  }

  function mapearStatus(status) {
    if (!status) return "Aberta";
    switch (status.toLowerCase()) {
      case "pago":
        return "Finalizada";
      case "cancelado":
        return "Cancelada";
      case "pendente":
        return "Aberta";
      case "parcial":
        return "Aberta";
      default:
        return status;
    }
  }

  function extrairFormaPagamento(pagamentos) {
    if (!Array.isArray(pagamentos) || pagamentos.length === 0) return "-";
    const formas = pagamentos.map((p) => {
      const f = (p.forma || p.tipo || "").toLowerCase();
      if (f.includes("dinheiro")) return "Dinheiro";
      if (f.includes("pix")) return "Pix";
      if (f.includes("debito") || f.includes("débito")) return "Débito";
      if (f.includes("credito") || f.includes("crédito")) return "Crédito";
      if (f.includes("crediario") || f.includes("crediário"))
        return "Crediário";
      if (f.includes("haver")) return "Haver";
      return p.forma || p.tipo || "-";
    });
    return [...new Set(formas)].join(", ");
  }

  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderizarVendas() {
    if (!vendasTableBody || !emptyState) return;
    if (vendasFiltradas.length === 0) {
      vendasTableBody.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }
    emptyState.style.display = "none";
    vendasTableBody.innerHTML = vendasFiltradas
      .map((venda) => {
        const statusClass = getStatusClass(venda.situacao);
        const dataFormatada = formatarData(venda.emissao);
        const valorFormatado = formatarValor(venda.valor);
        const formaPag = escapeHtml(extrairFormaPagamento(venda.pagamentos));
        return `
                <tr class="venda-row" data-venda-id="${venda.id}" style="cursor:pointer">
                    <td>${venda.numero}</td>
                    <td>${escapeHtml(venda.cliente) || ""}</td>
                    <td>${dataFormatada}</td>
                    <td>${valorFormatado}</td>
                    <td>${formaPag}</td>
                    <td>${escapeHtml(venda.observacoes) || ""}</td>
                    <td><span class="status-badge ${statusClass}">${venda.situacao}</span></td>
                    <td>${venda.situacao.toLowerCase() !== "aberta" ? `<button class="btn-ver-comprovante" data-comprovante-id="${venda.id}" onclick="event.stopPropagation(); abrirComprovanteConsulta(${venda.id})"><i class="fas fa-file-pdf"></i> Ver comprovante</button>` : ""}</td>
                </tr>`;
      })
      .join("");

    // Clique na linha redireciona para nova-venda com os dados
    vendasTableBody.querySelectorAll(".venda-row").forEach((row) => {
      row.addEventListener("click", function () {
        const vendaId = this.dataset.vendaId;
        window.location.href =
          "/atendimento/nova-venda.html?vendaId=" + vendaId;
      });
    });
  }

  function getStatusClass(situacao) {
    switch ((situacao || "").toLowerCase()) {
      case "aberta":
        return "status-aberta";
      case "finalizada":
        return "status-finalizada";
      case "cancelada":
        return "status-cancelada";
      default:
        return "status-aberta";
    }
  }

  function formatarData(data) {
    if (!data) return "-";
    const d = new Date(data);
    return d.toLocaleDateString("pt-BR");
  }

  function formatarValor(valor) {
    if (valor === null || valor === undefined) return "0,00";
    return Number(valor).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function filtrarVendas() {
    const searchTerm = searchInput
      ? searchInput.value.toLowerCase().trim()
      : "";
    const filtroStatus = filtroTodos ? filtroTodos.value : "todos";
    vendasFiltradas = vendas.filter((venda) => {
      const matchSearch =
        !searchTerm ||
        venda.numero.toString().includes(searchTerm) ||
        (venda.cliente && venda.cliente.toLowerCase().includes(searchTerm));
      const matchStatus =
        filtroStatus === "todos" ||
        venda.situacao.toLowerCase() === filtroStatus;
      return matchSearch && matchStatus;
    });
    renderizarVendas();
  }

  if (searchInput) {
    searchInput.addEventListener("input", filtrarVendas);
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        filtrarVendas();
      }
    });
  }
  if (searchBtn)
    searchBtn.addEventListener("click", function (e) {
      e.preventDefault();
      filtrarVendas();
    });
  if (filtroTodos) filtroTodos.addEventListener("change", filtrarVendas);

  if (novaVendaBtn)
    novaVendaBtn.addEventListener("click", function () {
      window.location.href = "/atendimento/nova-venda.html";
    });

  window.criarPrimeiraVenda = function () {
    window.location.href = "/atendimento/nova-venda.html";
  };

  // Carregar vendas ao iniciar
  carregarVendas();
  console.log("✅ Consultar Vendas inicializado!");
}

/* ========================================
   COMPROVANTE PDF - CONSULTAR VENDAS
   ======================================== */

async function abrirComprovanteConsulta(vendaId) {
  try {
    const resp = await fetch(
      "/api/vendas/" + encodeURIComponent(vendaId) + "/comprovante",
    );
    if (!resp.ok) throw new Error("Erro ao gerar comprovante");
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    abrirPdfModalConsulta(blobUrl, "Comprovante da Venda #" + vendaId);
  } catch (err) {
    console.error("Erro ao abrir comprovante:", err);
    alert("Erro ao gerar comprovante da venda.");
  }
}

function abrirPdfModalConsulta(blobUrl, title) {
  if (document.querySelector(".pdf-modal-consulta-overlay")) return;

  const overlay = document.createElement("div");
  overlay.className = "pdf-modal-consulta-overlay";
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:14000;";

  const modal = document.createElement("div");
  modal.style.cssText =
    "width:92%;max-width:1150px;height:86%;background:#fff;border-radius:6px;box-shadow:0 12px 40px rgba(2,6,23,0.45);overflow:hidden;display:flex;flex-direction:column;";

  const header = document.createElement("div");
  header.style.cssText =
    "display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e6e9ee;background:#f7f7f8;";

  const hTitle = document.createElement("div");
  hTitle.style.cssText = "font-weight:600;color:#222;";
  hTitle.textContent = title;

  const toolbar = document.createElement("div");
  toolbar.style.cssText = "display:flex;gap:8px;align-items:center;";

  const viewBtn = document.createElement("a");
  viewBtn.href = "#";
  viewBtn.textContent = "Ver em uma nova aba";
  viewBtn.style.cssText =
    "color:#1976d2;text-decoration:none;font-size:14px;padding:6px 10px;";
  viewBtn.onclick = (ev) => {
    ev.preventDefault();
    window.open(blobUrl, "_blank");
  };

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "\u2715";
  closeBtn.style.cssText =
    "background:#fff;border:1px solid #ddd;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:16px;";
  closeBtn.onclick = () => overlay.remove();

  toolbar.appendChild(viewBtn);
  toolbar.appendChild(closeBtn);
  header.appendChild(hTitle);
  header.appendChild(toolbar);

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "flex:1;border:0;width:100%;height:100%;";
  iframe.src = blobUrl;

  modal.appendChild(header);
  modal.appendChild(iframe);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };
  const esc = (e) => {
    if (e.key === "Escape") {
      overlay.remove();
      document.removeEventListener("keydown", esc);
    }
  };
  document.addEventListener("keydown", esc);
}
