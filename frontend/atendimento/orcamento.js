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

// ========================================
// FUNCIONALIDADES DOS ORÇAMENTOS
// ========================================

const API = "/api/orcamentos";

// --- Estado do modal Novo Orçamento ---
let orcItemSelecionado = null;
let orcClienteSelecionado = null;
let orcProfSelecionado = null;
let orcItensAdicionados = [];
let orcIdAtual = null; // usado pelo modal Ver

// --- Helpers ---
function fmt(v) {
  return parseFloat(v || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function fmtData(d) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-BR");
}
function statusMap(s) {
  return (
    {
      pendente: "pendentes",
      finalizado: "finalizados",
      faturado: "faturados",
      cancelado: "cancelados",
    }[s] || s
  );
}
function statusLabel(s) {
  return (
    {
      pendente: "Pendente",
      finalizado: "Finalizado",
      faturado: "Faturado",
      cancelado: "Cancelado",
    }[s] || s
  );
}

// ---- Carregar listagem ----
async function carregarOrcamentos() {
  const tbody = document.getElementById("orcamentosTableBody");
  const emptyState = document.getElementById("emptyState");
  if (!tbody) return;

  // Filtro de status
  const statusRadio = document.querySelector('input[name="status"]:checked');
  let status = statusRadio ? statusRadio.value : "pendentes";
  // Mapear para o valor que a API espera
  const statusApiMap = {
    pendentes: "pendente",
    finalizados: "finalizado",
    faturados: "faturado",
    cancelados: "cancelado",
    todos: "",
  };
  const statusApi = statusApiMap[status] || "";

  // Período — lido dos globais do date range picker
  let dataInicio = "";
  let dataFim = "";
  if (orcCalStart) dataInicio = _calISO(orcCalStart);
  if (orcCalEnd) dataFim = _calISO(orcCalEnd);

  // Pesquisa
  const searchInput = document.querySelector(".search-input");
  const q = searchInput ? searchInput.value.trim() : "";

  const params = new URLSearchParams();
  if (statusApi) params.set("status", statusApi);
  if (dataInicio) params.set("dataInicio", dataInicio);
  if (dataFim) params.set("dataFim", dataFim);
  if (q) params.set("q", q);

  try {
    const resp = await fetch(`${API}?${params}`);
    const data = await resp.json();
    const lista = data.orcamentos || [];

    if (lista.length === 0) {
      tbody.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      atualizarPaginacao(0);
      return;
    }
    if (emptyState) emptyState.style.display = "none";

    tbody.innerHTML = lista
      .map((orc) => {
        const totais =
          typeof orc.totais === "string"
            ? JSON.parse(orc.totais)
            : orc.totais || {};
        return `
        <tr onclick="verDetalhes(${orc.id})" style="cursor:pointer;">
          <td>${orc.id}</td>
          <td>${orc.cliente || "-"}</td>
          <td>${fmtData(orc.data)}</td>
          <td>R$ ${fmt(totais.total)}</td>
          <td><span class="status-badge status-${statusMap(orc.status)}">${statusLabel(orc.status)}</span></td>
          <td class="orc-acoes-cell" onclick="event.stopPropagation()">
            <div class="orc-acoes-wrap">
              <button class="orc-acoes-btn" onclick="toggleDropdownAcoes(event,${orc.id},${"'" + orc.status + "'"})">&#8942;</button>
            </div>
          </td>
        </tr>`;
      })
      .join("");
    atualizarPaginacao(lista.length);
  } catch (err) {
    console.error("Erro ao carregar orçamentos:", err);
  }
}

function atualizarPaginacao(total) {
  const txt = document.querySelector(".pagination-text");
  if (txt) txt.textContent = `${total} of ${total}`;
}

// --- Dropdown global de ações (position:fixed para nunca ser cortado) ---
let _ddAberto = null;

function _criarDropdownGlobal() {
  if (document.getElementById("orcDropdownGlobal")) return;
  const dd = document.createElement("div");
  dd.id = "orcDropdownGlobal";
  dd.style.cssText = [
    "position:fixed",
    "z-index:999999",
    "background:#fff",
    "border:1px solid #ddd",
    "border-radius:6px",
    "box-shadow:0 4px 18px rgba(0,0,0,0.18)",
    "min-width:120px",
    "overflow:hidden",
    "display:none",
  ].join(";");
  document.body.appendChild(dd);
  document.addEventListener("click", function (e) {
    if (!dd.contains(e.target)) _fecharDropdownGlobal();
  });
}

function _fecharDropdownGlobal() {
  const dd = document.getElementById("orcDropdownGlobal");
  if (dd) dd.style.display = "none";
  _ddAberto = null;
}

function toggleDropdownAcoes(event, id, status) {
  event.stopPropagation();
  _criarDropdownGlobal();
  const dd = document.getElementById("orcDropdownGlobal");

  // Se o mesmo botão foi clicado de novo, fecha
  if (_ddAberto === id) {
    _fecharDropdownGlobal();
    return;
  }
  _ddAberto = id;

  // Montar itens conforme status
  let html = "";
  const btn = (label, fn, cls) =>
    `<button style="display:block;width:100%;text-align:left;background:none;border:none;padding:9px 16px;font-size:13px;cursor:pointer;color:${cls === "danger" ? "#e74c3c" : "#333"}" onmouseenter="this.style.background='${cls === "danger" ? "#ffeaea" : "#f0f7ff"}';this.style.color='${cls === "danger" ? "#c0392b" : "#007bff"}'" onmouseleave="this.style.background='none';this.style.color='${cls === "danger" ? "#e74c3c" : "#333"}'" onclick="_fecharDropdownGlobal();${fn}">${label}</button>`;

  if (status !== "faturado") html += btn("Faturar", `faturarOrcamento(${id})`);
  if (status !== "cancelado" && status !== "faturado")
    html += btn("Cancelar", `confirmarCancelarOrcamento(${id})`);
  html += btn("Excluir", `confirmarExcluirOrcamento(${id})`, "danger");
  dd.innerHTML = html;

  // Posicionar abaixo do botão clicado
  const rect = event.currentTarget.getBoundingClientRect();
  const ddW = 130;
  let left = rect.right - ddW;
  let top = rect.bottom + 4;
  if (left < 4) left = 4;
  if (top + 140 > window.innerHeight) top = rect.top - 140;
  dd.style.left = left + "px";
  dd.style.top = top + "px";
  dd.style.display = "block";
}

async function faturarOrcamento(id) {
  window.location.href = `./nova-venda.html?orcamentoId=${id}`;
}

// ---- Filtros ----
const ORC_FILTRO_PAGINA = "orcamentos";

async function salvarFiltroStatus(statusValue) {
  try {
    await fetch("/api/user-filters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pagina: ORC_FILTRO_PAGINA,
        filtros: { status: statusValue },
      }),
    });
  } catch (e) {
    console.warn("Erro ao salvar filtro:", e);
  }
}

async function restaurarFiltroStatus() {
  try {
    const resp = await fetch(`/api/user-filters?pagina=${ORC_FILTRO_PAGINA}`);
    if (!resp.ok) return;
    const data = await resp.json();
    const statusSalvo = data?.filtros?.status;
    if (statusSalvo) {
      const radio = document.querySelector(
        `input[name="status"][value="${statusSalvo}"]`,
      );
      if (radio) radio.checked = true;
    }
  } catch (e) {
    console.warn("Erro ao restaurar filtro:", e);
  }
}

function configurarEventosListagem() {
  // Status — salva no banco ao mudar
  document.querySelectorAll('input[name="status"]').forEach((r) =>
    r.addEventListener("change", () => {
      salvarFiltroStatus(r.value);
      carregarOrcamentos();
    }),
  );

  // Pesquisar
  const btnPesq = document.querySelector(".btn-pesquisar");
  if (btnPesq) btnPesq.addEventListener("click", () => carregarOrcamentos());
  const searchInput = document.querySelector(".search-input");
  if (searchInput)
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") carregarOrcamentos();
    });

  // Items per page (não pagina real, mas manter)
  const ipp = document.querySelector(".items-per-page");
  if (ipp) ipp.addEventListener("change", () => carregarOrcamentos());

  // Mais Filtros
  const btnMais = document.getElementById("btnMaisFiltros");
  const menu = document.getElementById("maisFiltrosMenu");
  if (btnMais && menu) {
    btnMais.addEventListener("click", (e) => {
      e.preventDefault();
      menu.classList.toggle("open");
    });
    document.addEventListener("click", (e) => {
      if (!btnMais.contains(e.target) && !menu.contains(e.target))
        menu.classList.remove("open");
    });
  }
  const btnPesqFiltros = document.querySelector(".btn-pesquisar-filtros");
  if (btnPesqFiltros)
    btnPesqFiltros.addEventListener("click", () => {
      carregarOrcamentos();
      menu?.classList.remove("open");
    });
  const btnCancelFiltros = document.querySelector(".btn-cancelar-filtros");
  if (btnCancelFiltros)
    btnCancelFiltros.addEventListener("click", () =>
      menu?.classList.remove("open"),
    );

  // Botão Novo Orçamento
  const btnNovo = document.querySelector(".btn-novo-orcamento");
  if (btnNovo)
    btnNovo.addEventListener("click", () => abrirModalNovoOrcamento());
}

// ========================================
// MODAL NOVO ORÇAMENTO
// ========================================
async function abrirModalNovoOrcamento() {
  orcItemSelecionado = null;
  orcClienteSelecionado = null;
  orcProfSelecionado = null;
  orcItensAdicionados = [];
  orcIdAtual = null;
  document.getElementById("orcItemBusca").value = "";
  document.getElementById("orcQtd").value = "1";
  document.getElementById("orcPreco").value = "";
  document.getElementById("orcDesconto").value = "";
  document.getElementById("orcTotalItem").textContent = "0,00";
  document.getElementById("orcItensBody").innerHTML = "";
  document.getElementById("orcItensTable").style.display = "none";
  document.getElementById("orcClienteBusca").value = "";
  document.getElementById("orcProfBusca").value = "";
  document.getElementById("orcCondicao").value = "";
  document.getElementById("orcInfoAdicionais").value = "";
  document.getElementById("orcTotalGeral").textContent = "R$ 0,00";
  document.getElementById("novoOrcamentoModal").style.display = "flex";

  // Criar rascunho pendente imediatamente
  try {
    const resp = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pendente", itens: [] }),
    });
    if (resp.ok) {
      const orc = await resp.json();
      orcIdAtual = orc.id;
      carregarOrcamentos();
    }
  } catch (err) {
    console.error("Erro ao criar rascunho:", err);
  }
}
function fecharModalNovoOrcamento() {
  document.getElementById("novoOrcamentoModal").style.display = "none";
}

// --- Autocomplete Itens ---
function configurarAutocompletItens() {
  const input = document.getElementById("orcItemBusca");
  const lista = document.getElementById("orcItemSugestoes");
  let timeout;
  input.addEventListener("input", () => {
    clearTimeout(timeout);
    const q = input.value.trim();
    if (q.length < 2) {
      lista.classList.remove("show");
      return;
    }
    timeout = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/itens?q=${encodeURIComponent(q)}`);
        const data = await resp.json();
        const itens = Array.isArray(data) ? data : data.itens || [];
        if (itens.length === 0) {
          lista.classList.remove("show");
          return;
        }
        lista.innerHTML = itens
          .slice(0, 15)
          .map(
            (it) => `
          <div class="orc-sugestao-item" data-id="${it.id}" data-nome="${it.nome || it.descricao || ""}" data-preco="${it.precoVenda || it.preco || 0}">
            <span>${it.nome || it.descricao || "Item"}</span>
            <span class="preco">R$ ${fmt(it.precoVenda || it.preco || 0)}</span>
          </div>`,
          )
          .join("");
        lista.classList.add("show");

        lista.querySelectorAll(".orc-sugestao-item").forEach((el) => {
          el.addEventListener("click", () => {
            orcItemSelecionado = {
              id: el.dataset.id,
              nome: el.dataset.nome,
              preco: parseFloat(el.dataset.preco),
            };
            input.value = el.dataset.nome;
            document.getElementById("orcPreco").value = parseFloat(
              el.dataset.preco,
            ).toFixed(2);
            lista.classList.remove("show");
            calcularTotalItem();
          });
        });
      } catch (e) {
        console.error(e);
      }
    }, 300);
  });
  input.addEventListener("blur", () =>
    setTimeout(() => lista.classList.remove("show"), 200),
  );
}

// --- Autocomplete Clientes ---
function configurarAutocompletClientes() {
  const input = document.getElementById("orcClienteBusca");
  const lista = document.getElementById("orcClienteSugestoes");
  let cache = null;
  input.addEventListener("input", async () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 1) {
      lista.classList.remove("show");
      orcClienteSelecionado = null;
      return;
    }
    if (!cache) {
      try {
        const r = await fetch("/api/clientes");
        cache = await r.json();
        cache = Array.isArray(cache) ? cache : cache.clientes || [];
      } catch {
        cache = [];
      }
    }
    const filtrados = cache
      .filter((c) => (c.nome || "").toLowerCase().includes(q))
      .slice(0, 10);
    if (filtrados.length === 0) {
      lista.classList.remove("show");
      return;
    }
    lista.innerHTML = filtrados
      .map(
        (c) =>
          `<div class="orc-sugestao-item" data-id="${c.id}" data-nome="${c.nome}" data-tel="${c.telefone || c.celular || ""}">${c.nome}</div>`,
      )
      .join("");
    lista.classList.add("show");
    lista.querySelectorAll(".orc-sugestao-item").forEach((el) => {
      el.addEventListener("click", () => {
        orcClienteSelecionado = {
          id: el.dataset.id,
          nome: el.dataset.nome,
          telefone: el.dataset.tel,
        };
        input.value = el.dataset.nome;
        lista.classList.remove("show");
      });
    });
  });
  input.addEventListener("blur", () =>
    setTimeout(() => lista.classList.remove("show"), 200),
  );
}

// --- Autocomplete Profissionais ---
function configurarAutocompletProfissionais() {
  const input = document.getElementById("orcProfBusca");
  const lista = document.getElementById("orcProfSugestoes");
  let cache = null;
  input.addEventListener("input", async () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 1) {
      lista.classList.remove("show");
      orcProfSelecionado = null;
      return;
    }
    if (!cache) {
      try {
        const r = await fetch("/api/profissionais");
        cache = await r.json();
        cache = Array.isArray(cache) ? cache : cache.profissionais || [];
      } catch {
        cache = [];
      }
    }
    const filt = cache
      .filter((p) => (p.nome || "").toLowerCase().includes(q))
      .slice(0, 10);
    if (filt.length === 0) {
      lista.classList.remove("show");
      return;
    }
    lista.innerHTML = filt
      .map(
        (p) =>
          `<div class="orc-sugestao-item" data-id="${p.id}" data-nome="${p.nome}">${p.nome}</div>`,
      )
      .join("");
    lista.classList.add("show");
    lista.querySelectorAll(".orc-sugestao-item").forEach((el) => {
      el.addEventListener("click", () => {
        orcProfSelecionado = { id: el.dataset.id, nome: el.dataset.nome };
        input.value = el.dataset.nome;
        lista.classList.remove("show");
      });
    });
  });
  input.addEventListener("blur", () =>
    setTimeout(() => lista.classList.remove("show"), 200),
  );
}

// --- Cálculos de item ---
function calcularTotalItem() {
  const qty = parseFloat(document.getElementById("orcQtd").value) || 0;
  const preco = parseFloat(document.getElementById("orcPreco").value) || 0;
  const desc = parseFloat(document.getElementById("orcDesconto").value) || 0;
  const bruto = qty * preco;
  const total = bruto - (bruto * desc) / 100;
  document.getElementById("orcTotalItem").textContent = fmt(total);
}

function configurarCalculoItem() {
  ["orcQtd", "orcPreco", "orcDesconto"].forEach((id) => {
    document.getElementById(id).addEventListener("input", calcularTotalItem);
  });
}

// --- Adicionar item ao orçamento ---
function adicionarItemOrcamento() {
  if (!orcItemSelecionado) {
    alert("Selecione um item da lista de sugestões.");
    return;
  }
  const qty = parseFloat(document.getElementById("orcQtd").value) || 0;
  const preco = parseFloat(document.getElementById("orcPreco").value) || 0;
  const desc = parseFloat(document.getElementById("orcDesconto").value) || 0;
  if (qty <= 0 || preco <= 0) {
    alert("Preencha quantidade e preço válidos.");
    return;
  }
  const bruto = qty * preco;
  const total = bruto - (bruto * desc) / 100;

  orcItensAdicionados.push({
    itemId: orcItemSelecionado.id,
    nome: orcItemSelecionado.nome,
    quantidade: qty,
    valorUnitario: preco,
    desconto: desc,
    total: total,
  });

  renderItensTabela();
  // Limpar campos
  orcItemSelecionado = null;
  document.getElementById("orcItemBusca").value = "";
  document.getElementById("orcQtd").value = "1";
  document.getElementById("orcPreco").value = "";
  document.getElementById("orcDesconto").value = "";
  document.getElementById("orcTotalItem").textContent = "0,00";
}

function removerItemOrcamento(idx) {
  orcItensAdicionados.splice(idx, 1);
  renderItensTabela();
}

function renderItensTabela() {
  const tbody = document.getElementById("orcItensBody");
  const table = document.getElementById("orcItensTable");
  if (orcItensAdicionados.length === 0) {
    tbody.innerHTML = "";
    table.style.display = "none";
  } else {
    table.style.display = "table";
    tbody.innerHTML = orcItensAdicionados
      .map(
        (it, i) => `
      <tr>
        <td>${it.nome}</td>
        <td>${it.quantidade}</td>
        <td>R$ ${fmt(it.valorUnitario)}</td>
        <td>${fmt(it.desconto)}%</td>
        <td>R$ ${fmt(it.total)}</td>
        <td><button class="btn-rm" onclick="removerItemOrcamento(${i})">&times;</button></td>
      </tr>`,
      )
      .join("");
  }
  // Total geral
  const totalGeral = orcItensAdicionados.reduce((s, it) => s + it.total, 0);
  document.getElementById("orcTotalGeral").textContent =
    `R$ ${fmt(totalGeral)}`;
}

// --- Finalizar orçamento ---
async function finalizarOrcamento() {
  if (orcItensAdicionados.length === 0) {
    showNotification("Adicione ao menos um item.", "warning");
    return;
  }
  if (!orcClienteSelecionado) {
    showNotification("Selecione um cliente.", "warning");
    return;
  }
  if (!orcIdAtual) {
    alert("Erro: feche o modal e abra novamente.");
    return;
  }
  // Notificação global reutilizável (caso não exista)
  if (typeof window.showNotification !== "function") {
    window.showNotification = function (message, type = "info") {
      // Remove notificações antigas iguais
      document.querySelectorAll(".notification").forEach((n) => {
        if (n.textContent.includes(message)) n.remove();
      });
      const notification = document.createElement("div");
      notification.className = `notification notification-${type}`;
      notification.style.position = "fixed";
      notification.style.top = "32px";
      notification.style.right = "32px";
      notification.style.zIndex = 9999;
      notification.style.minWidth = "260px";
      notification.style.maxWidth = "350px";
      notification.style.padding = "14px 24px 14px 18px";
      notification.style.borderRadius = "8px";
      notification.style.boxShadow = "0 2px 16px rgba(0,0,0,0.10)";
      notification.style.display = "flex";
      notification.style.alignItems = "center";
      notification.style.gap = "10px";
      notification.style.fontSize = "15px";
      notification.style.fontWeight = 500;
      notification.style.cursor = "pointer";
      notification.style.transition = "opacity 0.2s";
      if (type === "warning") {
        notification.style.background = "#fffbe6";
        notification.style.color = "#856404";
        notification.innerHTML = `<i class='fas fa-exclamation-triangle' style='color:#ffc107;font-size:18px;'></i> <span>${message}</span>`;
      } else if (type === "success") {
        notification.style.background = "#e6ffed";
        notification.style.color = "#155724";
        notification.innerHTML = `<i class='fas fa-check-circle' style='color:#27ae60;font-size:18px;'></i> <span>${message}</span>`;
      } else if (type === "error") {
        notification.style.background = "#fdecea";
        notification.style.color = "#721c24";
        notification.innerHTML = `<i class='fas fa-times-circle' style='color:#e74c3c;font-size:18px;'></i> <span>${message}</span>`;
      } else {
        notification.style.background = "#e8f4fd";
        notification.style.color = "#0c5460";
        notification.innerHTML = `<i class='fas fa-info-circle' style='color:#17a2b8;font-size:18px;'></i> <span>${message}</span>`;
      }
      // Fechar ao clicar
      notification.onclick = () => notification.remove();
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.opacity = 0;
        setTimeout(() => notification.remove(), 300);
      }, 4000);
    };
  }

  const body = {
    cliente: orcClienteSelecionado.nome,
    clienteId: orcClienteSelecionado.id
      ? parseInt(orcClienteSelecionado.id)
      : null,
    clienteTelefone: orcClienteSelecionado.telefone || "",
    profissional: orcProfSelecionado ? orcProfSelecionado.nome : "",
    profissionalId: orcProfSelecionado ? parseInt(orcProfSelecionado.id) : null,
    condicaoPagamento: document.getElementById("orcCondicao").value.trim(),
    informacoesAdicionais: document
      .getElementById("orcInfoAdicionais")
      .value.trim(),
    itens: orcItensAdicionados.map((it) => ({
      itemId: it.itemId,
      nome: it.nome,
      quantidade: it.quantidade,
      valorUnitario: it.valorUnitario,
      desconto: it.desconto,
    })),
    status: "finalizado",
  };

  const btn = document.getElementById("btnFinalizarOrcamento");
  btn.disabled = true;
  btn.textContent = "Salvando...";

  try {
    const resp = await fetch(`${API}/${orcIdAtual}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error("Erro ao finalizar orçamento");

    fecharModalNovoOrcamento();
    document.getElementById("sucessoOrcMsg").textContent =
      `Orçamento #${orcIdAtual} finalizado com sucesso.`;
    document.getElementById("sucessoOrcamento").style.display = "flex";
    carregarOrcamentos();
  } catch (err) {
    console.error(err);
    alert("Erro ao finalizar orçamento. Tente novamente.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Finalizar Orçamento";
  }
}

// --- Sucesso ---
function fecharSucessoOrcamento() {
  document.getElementById("sucessoOrcamento").style.display = "none";
}
function verComprovantePDFSucesso() {
  fecharSucessoOrcamento();
  if (orcIdAtual) abrirComprovantePDF(orcIdAtual);
}

// ========================================
// MODAL VER ORÇAMENTO
// ========================================
async function verDetalhes(id) {
  try {
    const resp = await fetch(`${API}/${id}`);
    if (!resp.ok) throw new Error();
    const orc = await resp.json();
    orcIdAtual = orc.id;

    document.getElementById("verOrcTitulo").textContent =
      `Orçamento #${orc.id}`;

    const itens =
      typeof orc.itens === "string" ? JSON.parse(orc.itens) : orc.itens || [];
    const totais =
      typeof orc.totais === "string"
        ? JSON.parse(orc.totais)
        : orc.totais || {};

    let html = `
      <div class="orc-detalhe-section">
        <h3>Informações Gerais</h3>
        <div class="orc-detalhe-row"><span class="orc-detalhe-label">Data:</span><span class="orc-detalhe-value">${fmtData(orc.data)}</span></div>
        <div class="orc-detalhe-row"><span class="orc-detalhe-label">Cliente:</span><span class="orc-detalhe-value">${orc.cliente || "-"}</span></div>
        <div class="orc-detalhe-row"><span class="orc-detalhe-label">Telefone:</span><span class="orc-detalhe-value">${orc.clienteTelefone || "-"}</span></div>
        <div class="orc-detalhe-row"><span class="orc-detalhe-label">Profissional:</span><span class="orc-detalhe-value">${orc.profissional || "-"}</span></div>
        <div class="orc-detalhe-row"><span class="orc-detalhe-label">Condição Pgto:</span><span class="orc-detalhe-value">${orc.condicaoPagamento || "-"}</span></div>
        <div class="orc-detalhe-row"><span class="orc-detalhe-label">Status:</span><span class="orc-detalhe-value"><span class="status-badge status-${statusMap(orc.status)}">${statusLabel(orc.status)}</span></span></div>
      </div>
      <div class="orc-detalhe-section">
        <h3>Itens</h3>
        <table class="orc-detalhe-itens-table">
          <thead><tr><th>Item</th><th>Qtd</th><th>Unitário</th><th>Desc%</th><th>Total</th></tr></thead>
          <tbody>${itens
            .map((it) => {
              const b =
                parseFloat(it.quantidade || 1) *
                parseFloat(it.valorUnitario || 0);
              const t = b - (b * parseFloat(it.desconto || 0)) / 100;
              return `<tr><td>${it.nome || "-"}</td><td>${it.quantidade}</td><td>R$ ${fmt(it.valorUnitario)}</td><td>${fmt(it.desconto || 0)}%</td><td>R$ ${fmt(t)}</td></tr>`;
            })
            .join("")}</tbody>
        </table>
      </div>
      <div class="orc-detalhe-total">Total: R$ ${fmt(totais.total)}</div>`;

    if (orc.informacoesAdicionais) {
      html += `<div class="orc-detalhe-section"><h3>Informações Adicionais</h3><p style="font-size:14px;color:#555;">${orc.informacoesAdicionais}</p></div>`;
    }

    document.getElementById("verOrcCorpo").innerHTML = html;

    // Esconder botão cancelar se já cancelado/faturado
    const btnCanc = document.getElementById("btnCancelarOrc");
    btnCanc.style.display =
      orc.status === "cancelado" || orc.status === "faturado" ? "none" : "";

    document.getElementById("verOrcamentoModal").style.display = "flex";
  } catch (err) {
    console.error("Erro ao buscar orçamento:", err);
    alert("Erro ao buscar detalhes do orçamento.");
  }
}
function fecharModalVerOrcamento() {
  document.getElementById("verOrcamentoModal").style.display = "none";
}

// --- Cancelar orçamento ---
// --- Confirmar Cancelar ---
let _orcConfirmarCancelarId = null;
function confirmarCancelarOrcamento(id) {
  _orcConfirmarCancelarId = id;
  document.getElementById("confirmarCancelarModal").style.display = "flex";
}
function fecharConfirmarCancelar() {
  _orcConfirmarCancelarId = null;
  document.getElementById("confirmarCancelarModal").style.display = "none";
}
async function executarCancelarOrcamento() {
  if (!_orcConfirmarCancelarId) return;
  try {
    const resp = await fetch(`${API}/${_orcConfirmarCancelarId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelado" }),
    });
    if (!resp.ok) throw new Error();
    fecharConfirmarCancelar();
    carregarOrcamentos();
  } catch (err) {
    console.error(err);
    alert("Erro ao cancelar orçamento.");
  }
}

// Manter compatibilidade com o botão no modal de detalhes
async function cancelarOrcamento() {
  if (!orcIdAtual) return;
  confirmarCancelarOrcamento(orcIdAtual);
  fecharModalVerOrcamento();
}

// --- Confirmar Excluir ---
let _orcConfirmarExcluirId = null;
function confirmarExcluirOrcamento(id) {
  _orcConfirmarExcluirId = id;
  document.getElementById("confirmarExcluirModal").style.display = "flex";
}
function fecharConfirmarExcluir() {
  _orcConfirmarExcluirId = null;
  document.getElementById("confirmarExcluirModal").style.display = "none";
}
async function executarExcluirOrcamento() {
  if (!_orcConfirmarExcluirId) return;
  try {
    const resp = await fetch(`${API}/${_orcConfirmarExcluirId}`, {
      method: "DELETE",
    });
    if (!resp.ok) throw new Error();
    fecharConfirmarExcluir();
    carregarOrcamentos();
  } catch (err) {
    console.error(err);
    alert("Erro ao excluir orçamento.");
  }
}

// ========================================
// COMPROVANTE PDF
// ========================================
function verComprovantePDF() {
  if (!orcIdAtual) return;
  abrirComprovantePDF(orcIdAtual);
}
function abrirComprovantePDF(id) {
  const url = `${API}/${id}/comprovante`;
  document.getElementById("pdfIframe").src = url;
  document.getElementById("pdfNovaAba").href = url;
  document.getElementById("comprovantePDFModal").style.display = "flex";
}
function fecharComprovantePDF() {
  document.getElementById("comprovantePDFModal").style.display = "none";
  document.getElementById("pdfIframe").src = "";
}

// ========================================
// RANGE DATE PICKER
// ========================================
let orcCalStart = null;
let orcCalEnd = null;
let orcCalSelecting = false; // true = aguardando segundo clique
let orcCalLeftMonth = {
  year: new Date().getFullYear(),
  month: new Date().getMonth() - 1 < 0 ? 11 : new Date().getMonth() - 1,
};
let orcCalRightMonth = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
};

const _MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const _DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function _calISO(d) {
  return d.toISOString().split("T")[0];
}
function _calFmt(d) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function _calSameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function _calAdvance(ym, delta) {
  let m = ym.month + delta,
    y = ym.year;
  while (m > 11) {
    m -= 12;
    y++;
  }
  while (m < 0) {
    m += 12;
    y--;
  }
  return { year: y, month: m };
}

function _hojeHorarioBrasilia() {
  // Obtém a data atual no fuso horário de Brasília (America/Sao_Paulo)
  const agora = new Date();
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(agora);
  const get = (t) => parseInt(partes.find((p) => p.type === t).value);
  return new Date(get("year"), get("month") - 1, get("day"));
}

function inicializarCalendario() {
  const hoje = _hojeHorarioBrasilia();
  orcCalStart = hoje;
  orcCalEnd = hoje;
  orcCalLeftMonth = _calAdvance(
    { year: hoje.getFullYear(), month: hoje.getMonth() },
    -1,
  );
  orcCalRightMonth = { year: hoje.getFullYear(), month: hoje.getMonth() };
  _calAtualizarLabel();

  const trigger = document.getElementById("orcCalTrigger");
  const popup = document.getElementById("orcCalPopup");
  if (trigger && popup) {
    trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      const isOpen = popup.style.display !== "none";
      popup.style.display = isOpen ? "none" : "block";
      if (!isOpen) {
        orcCalSelecting = false; // sempre começa limpo ao abrir
        _calRender();
      }
    });
  }
  document.addEventListener("click", function (e) {
    const p = document.getElementById("orcCalPopup");
    const w = document.querySelector(".orc-cal-wrap");
    if (p && w && !w.contains(e.target)) p.style.display = "none";
  });
}

function _calAtualizarLabel() {
  const label = document.getElementById("orcCalLabel");
  if (!label) return;
  if (orcCalStart && orcCalEnd)
    label.textContent = `${_calFmt(orcCalStart)} \u2013 ${_calFmt(orcCalEnd)}`;
  else if (orcCalStart)
    label.textContent = `${_calFmt(orcCalStart)} \u2013 ...`;
  else label.textContent = "Selecione o período";
}

function _calRender() {
  _calRenderMes("orcCalLeft", orcCalLeftMonth, "left");
  _calRenderMes("orcCalRight", orcCalRightMonth, "right");
}

function _calRenderMes(containerId, ym, side) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const { year, month } = ym;
  const firstDow = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  let html = `
    <div class="orc-cal-header">
      <button class="orc-cal-nav" onclick="orcCalNavMes('${side}',-1)">&#8249;</button>
      <span class="orc-cal-mes-label">${_MESES[month]} ${year}</span>
      <button class="orc-cal-nav" onclick="orcCalNavMes('${side}',1)">&#8250;</button>
    </div>
    <table class="orc-cal-table"><thead><tr>${_DIAS.map((d) => `<th>${d}</th>`).join("")}</tr></thead><tbody>`;
  let day = 1;
  const rows = Math.ceil((firstDow + totalDays) / 7);
  for (let r = 0; r < rows; r++) {
    html += "<tr>";
    for (let c = 0; c < 7; c++) {
      const ci = r * 7 + c;
      if (ci < firstDow || day > totalDays) {
        html += "<td class='orc-cal-empty'></td>";
      } else {
        const td = new Date(year, month, day);
        const iso = _calISO(td);
        const isStart = _calSameDay(td, orcCalStart);
        const isEnd = _calSameDay(td, orcCalEnd);
        const inRange =
          orcCalStart && orcCalEnd && td > orcCalStart && td < orcCalEnd;
        const isToday = _calSameDay(td, _hojeHorarioBrasilia());
        let cls = "orc-cal-day";
        if (isStart) cls += " orc-cal-selected orc-cal-range-start";
        if (isEnd) cls += " orc-cal-selected orc-cal-range-end";
        if (inRange) cls += " orc-cal-in-range";
        if (isToday && !isStart && !isEnd) cls += " orc-cal-today";
        html += `<td class="${cls}" onclick="orcCalDayClick(event,'${iso}')">${day}</td>`;
        day++;
      }
    }
    html += "</tr>";
  }
  html += "</tbody></table>";
  container.innerHTML = html;
}

function orcCalNavMes(side, delta) {
  if (side === "left") {
    orcCalLeftMonth = _calAdvance(orcCalLeftMonth, delta);
    if (
      orcCalLeftMonth.year > orcCalRightMonth.year ||
      (orcCalLeftMonth.year === orcCalRightMonth.year &&
        orcCalLeftMonth.month >= orcCalRightMonth.month)
    ) {
      orcCalRightMonth = _calAdvance(orcCalLeftMonth, 1);
    }
  } else {
    orcCalRightMonth = _calAdvance(orcCalRightMonth, delta);
    if (
      orcCalRightMonth.year < orcCalLeftMonth.year ||
      (orcCalRightMonth.year === orcCalLeftMonth.year &&
        orcCalRightMonth.month <= orcCalLeftMonth.month)
    ) {
      orcCalLeftMonth = _calAdvance(orcCalRightMonth, -1);
    }
  }
  _calRender();
}

function orcCalDayClick(event, isoDate) {
  event.stopPropagation();
  const d = new Date(isoDate + "T00:00:00");
  if (!orcCalSelecting) {
    // Primeiro clique: marca início, fica aberto
    orcCalStart = d;
    orcCalEnd = null;
    orcCalSelecting = true;
  } else {
    // Segundo clique: define fim e fecha
    if (d < orcCalStart) {
      orcCalEnd = orcCalStart;
      orcCalStart = d;
    } else {
      orcCalEnd = d;
    }
    orcCalSelecting = false;
    const popup = document.getElementById("orcCalPopup");
    if (popup) popup.style.display = "none";
  }
  _calAtualizarLabel();
  _calRender();
}

// ========================================
// INICIALIZAÇÃO
// ========================================
document.addEventListener("DOMContentLoaded", function () {
  setTimeout(async () => {
    // Inicializar calendário de período
    inicializarCalendario();

    configurarEventosListagem();
    configurarAutocompletItens();
    configurarAutocompletClientes();
    configurarAutocompletProfissionais();
    configurarCalculoItem();

    // Restaurar filtro de status salvo no banco antes de carregar
    await restaurarFiltroStatus();

    carregarOrcamentos();
    console.log("✅ OrcamentosManager inicializado");
  }, 300);
});
