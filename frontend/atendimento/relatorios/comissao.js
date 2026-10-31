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

  // Inicializar funcionalidades do relatório de comissão
  inicializarRelatorioComissao();
});

// ========================================
// FUNCIONALIDADES DO RELATÓRIO DE COMISSÃO
// ========================================

// Cache dos dados para o PDF
let _dadosRelatorio = null;
let _filtrosRelatorio = null;

function inicializarRelatorioComissao() {
  configurarBotoesRelatorio();
  inicializarCalendarioPersonalizado();
  configurarDataPadrao();
  carregarDropdownsFiltros();
  configurarDropdownProduto();
}

function configurarBotoesRelatorio() {
  const btnVisualizar = document.getElementById("btnVisualizar");
  const btnLimpar = document.getElementById("btnLimpar");

  if (btnVisualizar) {
    btnVisualizar.addEventListener("click", function () {
      visualizarRelatorio();
    });
  }

  if (btnLimpar) {
    btnLimpar.addEventListener("click", function () {
      limparFiltros();
    });
  }

  document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "btnGerarPdf") {
      gerarPdfComissao();
    }
  });
}

// ---- Carregar dropdowns via API ----

async function carregarDropdownsFiltros() {
  try {
    const [profissionais, clientes, grupos, marcas] = await Promise.all([
      ApiClient.getProfissionais().catch(() => []),
      ApiClient.getClientes().catch(() => []),
      ApiClient.getGruposClientes().catch(() => []),
      ApiClient.getMarcas().catch(() => []),
    ]);

    preencherSelect("profissional", profissionais, (p) => p.nome);
    preencherSelect("cliente", clientes, (c) => c.nome);
    preencherSelect(
      "grupoCliente",
      grupos,
      (g) => g.nome || g.descricao || g.grupo,
    );
    preencherSelect("marca", marcas, (m) => m.nome || m.descricao);
  } catch (err) {
    console.error("Erro ao carregar dropdowns:", err);
  }
}

function preencherSelect(id, itens, labelFn) {
  const sel = document.getElementById(id);
  if (!sel) return;
  const valorAtual = sel.value;
  // manter a opção "Todos"
  sel.innerHTML = '<option value="">Todos</option>';
  // normalizar: API pode retornar { rows: [...] } ou { data: [...] } em vez de array
  let lista = itens;
  if (!Array.isArray(lista)) {
    lista = (itens && (itens.rows || itens.data || itens.items)) || [];
  }
  lista.forEach((item) => {
    const label = labelFn(item) || "";
    if (!label.trim()) return;
    const opt = document.createElement("option");
    opt.value = label;
    opt.textContent = label;
    sel.appendChild(opt);
  });
  if (valorAtual) sel.value = valorAtual;
}

// ---- Dropdown de produto (searchable) ----

function configurarDropdownProduto() {
  const input = document.getElementById("produto");
  if (!input) return;

  let wrapper = input.parentElement;
  if (!wrapper.classList.contains("select-wrapper-produto")) {
    const wrap = document.createElement("div");
    wrap.className = "select-wrapper-produto";
    wrap.style.position = "relative";
    input.parentElement.insertBefore(wrap, input);
    wrap.appendChild(input);
    wrapper = wrap;
  }

  let dropdown = null;
  let cached = null;
  let suppressOpen = false;

  ApiClient.getProdutos()
    .then((items) => {
      cached = Array.isArray(items) ? items : [];
    })
    .catch(() => {
      cached = [];
    });

  function showDropdown() {
    if (suppressOpen || dropdown) return;
    const q = (input.value || "").toLowerCase();
    const filtered = (cached || []).filter(
      (it) => !q || (it.nome || "").toLowerCase().includes(q),
    );

    dropdown = document.createElement("div");
    dropdown.className = "select-dropdown";
    dropdown.style.cssText =
      "position:absolute;z-index:9999;background:#fff;border:1px solid #ccc;border-radius:4px;max-height:200px;overflow-y:auto;width:100%;box-shadow:0 4px 12px rgba(0,0,0,.12);";

    if (!filtered.length) {
      const el = document.createElement("div");
      el.className = "select-item no-results";
      el.style.cssText = "padding:8px 12px;color:#999;font-size:13px;";
      el.textContent = "Nenhum resultado";
      dropdown.appendChild(el);
    } else {
      filtered.slice(0, 80).forEach((it) => {
        const el = document.createElement("div");
        el.className = "select-item";
        el.style.cssText = "padding:7px 12px;cursor:pointer;font-size:13px;";
        el.textContent = it.nome || "";
        el.addEventListener("mousedown", function (e) {
          e.preventDefault();
          input.value = it.nome || "";
          closeDropdown();
        });
        el.addEventListener("mouseover", function () {
          this.style.background = "#f0f4ff";
        });
        el.addEventListener("mouseout", function () {
          this.style.background = "";
        });
        dropdown.appendChild(el);
      });
    }
    wrapper.appendChild(dropdown);
  }

  function closeDropdown() {
    if (dropdown && dropdown.parentElement)
      dropdown.parentElement.removeChild(dropdown);
    dropdown = null;
    suppressOpen = true;
    setTimeout(() => {
      suppressOpen = false;
    }, 120);
  }

  input.addEventListener("focus", showDropdown);
  input.addEventListener("click", showDropdown);
  input.addEventListener("input", function () {
    if (dropdown) dropdown.remove();
    dropdown = null;
    showDropdown();
  });
  document.addEventListener("click", function (e) {
    if (!wrapper.contains(e.target)) closeDropdown();
  });
}

// ---- Visualizar relatório ----

async function visualizarRelatorio() {
  const filtros = coletarFiltros();

  if (!filtros.dataInicio || !filtros.dataFim) {
    mostrarNotificacao("Por favor, selecione o período.", "warning");
    return;
  }

  const dataInicioObj = parseData(filtros.dataInicio);
  const dataFimObj = parseData(filtros.dataFim);
  if (dataInicioObj > dataFimObj) {
    mostrarNotificacao(
      "A data de início não pode ser maior que a data final.",
      "error",
    );
    return;
  }

  mostrarNotificacao("Gerando relatório...", "info");

  try {
    // 1. Buscar dados
    const respDados = await fetch(`/api/relatorios/comissao`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filtros),
    });
    if (!respDados.ok) {
      const err = await respDados.json().catch(() => ({}));
      throw new Error(err.error || err.message || `HTTP ${respDados.status}`);
    }
    const dados = await respDados.json();
    _dadosRelatorio = dados;
    _filtrosRelatorio = filtros;

    if (!dados.linhas || dados.linhas.length === 0) {
      mostrarNotificacao(
        "Nenhuma comissão encontrada no período selecionado.",
        "warning",
      );
      return;
    }

    // 2. Gerar PDF
    const respPdf = await fetch(`/api/relatorios/comissao/pdf`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        linhas: dados.linhas,
        totais: dados.totais,
        filtros,
      }),
    });
    if (!respPdf.ok) throw new Error(`HTTP ${respPdf.status}`);

    const blob = await respPdf.blob();
    const blobUrl = URL.createObjectURL(blob);
    const profFiltro =
      filtros.profissional &&
      filtros.profissional !== "" &&
      filtros.profissional !== "Todos"
        ? ` — ${filtros.profissional}`
        : "";
    abrirModalPdfComissao(
      blobUrl,
      `Relatório de Comissão${profFiltro} — ${filtros.dataInicio} a ${filtros.dataFim}`,
    );
    mostrarNotificacao("Relatório gerado com sucesso!", "success");
  } catch (err) {
    console.error("Erro ao gerar relatório:", err);
    mostrarNotificacao(`Erro: ${err.message}`, "error");
  }
}

function abrirModalPdfComissao(blobUrl, titulo) {
  const existing = document.getElementById("pdfModalComissaoOverlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "pdfModalComissaoOverlay";
  Object.assign(overlay.style, {
    position: "fixed",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.65)",
    zIndex: 12060,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  const modal = document.createElement("div");
  Object.assign(modal.style, {
    width: "90%",
    height: "90%",
    maxWidth: "1100px",
    background: "#fff",
    borderRadius: "8px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
  });

  const header = document.createElement("div");
  Object.assign(header.style, {
    padding: "10px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#f6f6f6",
    borderBottom: "1px solid #e0e0e0",
  });

  const titleEl = document.createElement("span");
  titleEl.textContent = titulo || "Relatório de Comissão";
  titleEl.style.fontWeight = "600";
  titleEl.style.fontSize = "14px";

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "8px";

  const openNewBtn = document.createElement("button");
  openNewBtn.textContent = "Ver em uma nova aba";
  Object.assign(openNewBtn.style, {
    padding: "6px 12px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    background: "#fff",
    cursor: "pointer",
    fontSize: "13px",
  });
  openNewBtn.addEventListener("click", () => window.open(blobUrl, "_blank"));

  const downloadBtn = document.createElement("button");
  downloadBtn.textContent = "Baixar PDF";
  Object.assign(downloadBtn.style, {
    padding: "6px 12px",
    border: "none",
    borderRadius: "4px",
    background: "#2c3e6b",
    color: "#fff",
    cursor: "pointer",
    fontSize: "13px",
  });
  downloadBtn.addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `relatorio_comissao_${(_filtrosRelatorio?.dataInicio || "").replace(/\//g, "-")}.pdf`;
    a.click();
  });

  const xlsBtn = document.createElement("button");
  xlsBtn.textContent = "Exportar XLS";
  Object.assign(xlsBtn.style, {
    padding: "6px 12px",
    border: "none",
    borderRadius: "4px",
    background: "#1a7a3d",
    color: "#fff",
    cursor: "pointer",
    fontSize: "13px",
  });
  xlsBtn.addEventListener("click", () => exportarXlsComissao());

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕";
  Object.assign(closeBtn.style, {
    padding: "6px 10px",
    border: "none",
    borderRadius: "4px",
    background: "#e74c3c",
    color: "#fff",
    cursor: "pointer",
    fontSize: "16px",
    lineHeight: "1",
  });
  closeBtn.addEventListener("click", () => {
    overlay.remove();
    URL.revokeObjectURL(blobUrl);
  });

  // Fechar ao clicar no overlay
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.remove();
      URL.revokeObjectURL(blobUrl);
    }
  });

  actions.appendChild(openNewBtn);
  actions.appendChild(downloadBtn);
  actions.appendChild(xlsBtn);
  actions.appendChild(closeBtn);
  header.appendChild(titleEl);
  header.appendChild(actions);

  const iframe = document.createElement("iframe");
  iframe.src = blobUrl;
  iframe.type = "application/pdf";
  Object.assign(iframe.style, { border: "none", width: "100%", flex: "1" });

  modal.appendChild(header);
  modal.appendChild(iframe);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function coletarFiltros() {
  return {
    dataInicio: document.getElementById("dataInicio")?.value,
    dataFim: document.getElementById("dataFim")?.value,
    tipoRelatorio: document.getElementById("tipoRelatorio")?.value,
    tipoComissao: document.getElementById("tipoComissao")?.value,
    layout: document.getElementById("layout")?.value,
    profissional: document.getElementById("profissional")?.value,
    fornecedorParceiro: document.getElementById("fornecedorParceiro")?.value,
    cliente: document.getElementById("cliente")?.value,
    grupoCliente: document.getElementById("grupoCliente")?.value,
    produto: document.getElementById("produto")?.value,
    grupo: document.getElementById("grupo")?.value,
    subgrupo: document.getElementById("subgrupo")?.value,
    marca: document.getElementById("marca")?.value,
    numeroVenda: document.getElementById("numeroVenda")?.value,
  };
}

function limparFiltros() {
  ["produto", "numeroVenda"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  [
    "tipoRelatorio",
    "tipoComissao",
    "layout",
    "profissional",
    "fornecedorParceiro",
    "cliente",
    "grupoCliente",
    "grupo",
    "subgrupo",
    "marca",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });
  configurarDataPadrao();
  const area = document.getElementById("resultados-comissao");
  if (area) area.style.display = "none";
  _dadosRelatorio = null;
  _filtrosRelatorio = null;
  mostrarNotificacao("Filtros limpos!", "success");
}

// ---- Renderizar resultados na tela ----

function renderizarResultados(dados, filtros) {
  const area = document.getElementById("resultados-comissao");
  const corpo = document.getElementById("resultados-corpo");
  const titulo = document.getElementById("resultados-titulo");
  if (!area || !corpo) return;

  const linhas = dados.linhas || [];
  const totais = dados.totais || {};

  if (titulo) {
    titulo.textContent = `Relatório de Comissão — ${filtros.dataInicio} a ${filtros.dataFim}`;
  }

  if (!linhas.length) {
    corpo.innerHTML =
      '<p style="color:#888;text-align:center;padding:20px;">Nenhum resultado encontrado para os filtros selecionados.</p>';
    area.style.display = "block";
    return;
  }

  // Totalizadores por profissional para exibição sumária
  const porProfissional = {};
  linhas.forEach((l) => {
    const k = l.profissional || "(sem profissional)";
    if (!porProfissional[k])
      porProfissional[k] = { totalVendas: 0, totalComissao: 0, linhas: [] };
    porProfissional[k].totalVendas += l.totalVenda;
    porProfissional[k].totalComissao += l.valorComissao;
    porProfissional[k].linhas.push(l);
  });

  const layout = filtros.layout || "";
  const isDetalhado =
    !layout ||
    layout.toLowerCase().includes("detalh") ||
    layout.toLowerCase().includes("operac");

  let html = "";

  if (isDetalhado) {
    // Tabela detalhada
    html += `<div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#2c3e6b;color:#fff;">
              <th style="padding:8px 10px;text-align:left;">Nº Venda</th>
              <th style="padding:8px 10px;text-align:left;">Data</th>
              <th style="padding:8px 10px;text-align:left;">Profissional</th>
              <th style="padding:8px 10px;text-align:left;">Cliente</th>
              <th style="padding:8px 10px;text-align:left;">Produto</th>
              <th style="padding:8px 10px;text-align:right;">Qtd</th>
              <th style="padding:8px 10px;text-align:right;">Total Venda</th>
              <th style="padding:8px 10px;text-align:right;">% Comissão</th>
              <th style="padding:8px 10px;text-align:right;">Valor Comissão</th>
            </tr>
          </thead>
          <tbody>`;
    linhas.forEach((l, i) => {
      const bg = i % 2 === 0 ? "#fff" : "#f7f8ff";
      const data = l.data ? new Date(l.data).toLocaleDateString("pt-BR") : "";
      html += `<tr style="background:${bg};">
              <td style="padding:7px 10px;">${l.vendaId || ""}</td>
              <td style="padding:7px 10px;">${data}</td>
              <td style="padding:7px 10px;">${l.profissional || ""}</td>
              <td style="padding:7px 10px;">${l.cliente || ""}</td>
              <td style="padding:7px 10px;">${l.produto || ""}</td>
              <td style="padding:7px 10px;text-align:right;">${l.quantidade || 1}</td>
              <td style="padding:7px 10px;text-align:right;">R$ ${Number(l.totalVenda || 0).toFixed(2)}</td>
              <td style="padding:7px 10px;text-align:right;">${Number(l.percentualComissao || 0).toFixed(2)}%</td>
              <td style="padding:7px 10px;text-align:right;font-weight:600;color:#2c7a2c;">R$ ${Number(l.valorComissao || 0).toFixed(2)}</td>
            </tr>`;
    });
    html += "</tbody></table></div>";
  } else {
    // Layout resumido por profissional
    html += `<table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#2c3e6b;color:#fff;">
              <th style="padding:8px 10px;text-align:left;">Profissional</th>
              <th style="padding:8px 10px;text-align:right;">Total Vendas</th>
              <th style="padding:8px 10px;text-align:right;">Total Comissões</th>
            </tr>
          </thead>
          <tbody>`;
    let i = 0;
    for (const prof of Object.keys(porProfissional)) {
      const bg = i++ % 2 === 0 ? "#fff" : "#f7f8ff";
      const d = porProfissional[prof];
      html += `<tr style="background:${bg};">
              <td style="padding:7px 10px;">${prof}</td>
              <td style="padding:7px 10px;text-align:right;">R$ ${d.totalVendas.toFixed(2)}</td>
              <td style="padding:7px 10px;text-align:right;font-weight:600;color:#2c7a2c;">R$ ${d.totalComissao.toFixed(2)}</td>
            </tr>`;
    }
    html += "</tbody></table>";
  }

  // rodapé de totais
  html += `<div style="margin-top:16px;padding:12px 16px;background:#f0f4ff;border-radius:6px;display:flex;gap:32px;flex-wrap:wrap;">
      <span style="font-size:13px;"><strong>Total de Vendas:</strong> R$ ${Number(totais.totalVendas || 0).toFixed(2)}</span>
      <span style="font-size:13px;"><strong>Total de Comissões:</strong> <span style="color:#2c7a2c;font-weight:700;">R$ ${Number(totais.totalComissoes || 0).toFixed(2)}</span></span>
      <span style="font-size:13px;"><strong>Itens:</strong> ${totais.qtdLinhas || 0}</span>
    </div>`;

  corpo.innerHTML = html;
  area.style.display = "block";
  area.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---- Gerar PDF ----

async function gerarPdfComissao() {
  if (!_dadosRelatorio) {
    mostrarNotificacao(
      "Visualize o relatório antes de gerar o PDF.",
      "warning",
    );
    return;
  }

  mostrarNotificacao("Gerando PDF...", "info");

  try {
    const resp = await fetch(`/api/relatorios/comissao/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        linhas: _dadosRelatorio.linhas,
        totais: _dadosRelatorio.totais,
        filtros: _filtrosRelatorio,
      }),
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_comissao_${(_filtrosRelatorio.dataInicio || "").replace(/\//g, "-")}.pdf`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1000);
    mostrarNotificacao("PDF gerado com sucesso!", "success");
  } catch (err) {
    console.error("Erro ao gerar PDF:", err);
    mostrarNotificacao(`Erro ao gerar PDF: ${err.message}`, "error");
  }
}

// ---- Exportar XLS ----

function exportarXlsComissao() {
  if (
    !_dadosRelatorio ||
    !_dadosRelatorio.linhas ||
    !_dadosRelatorio.linhas.length
  ) {
    mostrarNotificacao(
      "Nenhum dado disponível para exportar. Visualize o relatório primeiro.",
      "warning",
    );
    return;
  }

  if (typeof XLSX === "undefined") {
    mostrarNotificacao(
      "Biblioteca XLSX não carregada. Verifique sua conexão e recarregue a página.",
      "error",
    );
    return;
  }

  try {
    const linhas = _dadosRelatorio.linhas;
    const totais = _dadosRelatorio.totais || {};
    const filtros = _filtrosRelatorio || {};

    // Agrupar por profissional para montar o layout como na imagem modelo
    const porProfissional = {};
    linhas.forEach((l) => {
      const prof = l.profissional || "(sem profissional)";
      if (!porProfissional[prof]) porProfissional[prof] = [];
      porProfissional[prof].push(l);
    });

    // Montar linhas do Excel
    const wsData = [];

    // Cabeçalho do relatório
    const empresa = window._empresaNome || "";
    wsData.push([
      `RELATÓRIO DE COMISSÃO POR FATURAMENTO${empresa ? ` - ${empresa}` : ""}`,
    ]);
    wsData.push([
      `Período: ${filtros.dataInicio || ""} a ${filtros.dataFim || ""}`,
    ]);
    wsData.push([]);

    // Colunas
    const colunas = [
      "ID Prof.",
      "Profissional",
      "Tipo de",
      "Perfil de comissão",
      "ID Operação",
      "Operação",
      "Data",
      "ID Produto",
      "Produto",
      "Qtd.",
      "Valor",
      "% Comissão",
      "Vlr.",
      "Cliente",
      "Pet",
    ];
    wsData.push(colunas);

    // Linha 1 = título, linha 2 = período, linha 3 = vazia, linha 4 = colunas
    // Dados começam na linha 5 (1-based no Excel)
    const primeiraLinhaData = 5;
    let idProf = 1;
    for (const [profNome, itens] of Object.entries(porProfissional)) {
      itens.forEach((l) => {
        const dataFormatada = l.data
          ? new Date(l.data).toLocaleDateString("pt-BR")
          : "";
        wsData.push([
          idProf,
          profNome,
          "Vendedor",
          l.perfilComissao || "",
          l.vendaId || "",
          "Atendimento",
          dataFormatada,
          "",
          l.produto || "",
          Number(l.quantidade || 1),
          Number(l.totalVenda || 0),
          Number(l.percentualComissao || 0),
          Number(l.valorComissao || 0),
          l.cliente || "",
          "",
        ]);
      });
      idProf++;
    }

    // Linha de totais com fórmulas Excel para recalculo automático ao editar
    const ultimaLinhaData = primeiraLinhaData + linhas.length - 1;
    wsData.push([]);
    const linhaTotais = ultimaLinhaData + 2; // +1 linha em branco, +1 para a própria linha (1-based)

    // Criar planilha a partir dos dados sem a linha de totais (vamos inserir cells manualmente)
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Inserir células de totais com fórmulas SUM
    // Coluna K = índice 10 → "Total Vendas:" + fórmula SUM(K5:Kultimo)
    // Coluna M = índice 12 → "Total Comissões:" + fórmula SUM(M5:Multimo)
    const colValor = "K"; // Valor (índice 10)
    const colVlr = "M"; // Vlr. Comissão (índice 12)
    const intervaloValor = `${colValor}${primeiraLinhaData}:${colValor}${ultimaLinhaData}`;
    const intervaloVlr = `${colVlr}${primeiraLinhaData}:${colVlr}${ultimaLinhaData}`;

    // Célula rótulo "Total Vendas:" na coluna J (índice 9) da linha de totais
    const celulaRotuloVendas = XLSX.utils.encode_cell({
      r: linhaTotais - 1,
      c: 9,
    });
    const celulaSomatorioVendas = XLSX.utils.encode_cell({
      r: linhaTotais - 1,
      c: 10,
    });
    const celulaRotuloComissao = XLSX.utils.encode_cell({
      r: linhaTotais - 1,
      c: 12,
    });
    const celulaSomatorioComissao = XLSX.utils.encode_cell({
      r: linhaTotais - 1,
      c: 13,
    });

    ws[celulaRotuloVendas] = { t: "s", v: "Total Vendas:" };
    ws[celulaSomatorioVendas] = {
      t: "n",
      f: `SUM(${intervaloValor})`,
      z: "#,##0.00",
    };
    ws[celulaRotuloComissao] = { t: "s", v: "Total Comissões:" };
    ws[celulaSomatorioComissao] = {
      t: "n",
      f: `SUM(${intervaloVlr})`,
      z: "#,##0.00",
    };

    // Atualizar o range da planilha para incluir a linha de totais
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    range.e.r = Math.max(range.e.r, linhaTotais - 1);
    range.e.c = Math.max(range.e.c, 13);
    ws["!ref"] = XLSX.utils.encode_range(range);

    // Aplicar formato numérico nas colunas Qtd., Valor, % Comissão e Vlr.
    for (
      let rowIdx = primeiraLinhaData - 1;
      rowIdx <= ultimaLinhaData - 1;
      rowIdx++
    ) {
      const celulaQtd = XLSX.utils.encode_cell({ r: rowIdx, c: 9 });
      const celulaVal = XLSX.utils.encode_cell({ r: rowIdx, c: 10 });
      const celulaPct = XLSX.utils.encode_cell({ r: rowIdx, c: 11 });
      const celulaVlr = XLSX.utils.encode_cell({ r: rowIdx, c: 12 });
      if (ws[celulaQtd]) ws[celulaQtd].z = "0.000";
      if (ws[celulaVal]) ws[celulaVal].z = "#,##0.00";
      if (ws[celulaPct]) ws[celulaPct].z = "0.00";
      if (ws[celulaVlr]) ws[celulaVlr].z = "#,##0.00";
    }

    // Ajustar largura das colunas
    ws["!cols"] = [
      { wch: 8 },
      { wch: 18 },
      { wch: 12 },
      { wch: 22 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 10 },
      { wch: 30 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 25 },
      { wch: 20 },
    ];

    // Criar workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comissão");

    // Nome do arquivo
    const dataStr = (filtros.dataInicio || "").replace(/\//g, "-");
    const fileName = `relatorio_comissao_${dataStr}.xlsx`;

    XLSX.writeFile(wb, fileName);
    mostrarNotificacao("Arquivo XLS exportado com sucesso!", "success");
  } catch (err) {
    console.error("Erro ao exportar XLS:", err);
    mostrarNotificacao(`Erro ao exportar XLS: ${err.message}`, "error");
  }
}

// ---- Data padrão ----

function configurarDataPadrao() {
  const dataInicio = document.getElementById("dataInicio");
  const dataFim = document.getElementById("dataFim");
  if (dataInicio && dataFim) {
    const hoje = new Date();
    const dataFormatada = formatarData(hoje);
    dataInicio.value = dataFormatada;
    dataFim.value = dataFormatada;
  }
}

// ========================================
// CALENDÁRIO PERSONALIZADO
// ========================================

let calendarioAtual = {
  mes: new Date().getMonth(),
  ano: new Date().getFullYear(),
  dataInicio: null,
  dataFim: null,
  selecionandoInicio: true,
  _hoverDate: null,
};

function inicializarCalendarioPersonalizado() {
  console.log("📅 Inicializando calendário personalizado");

  const periodoEmissao = document.getElementById("periodoEmissao");
  const calendarioPopup = document.getElementById("calendarioPopup");

  if (periodoEmissao && calendarioPopup) {
    // Abrir calendário ao clicar no período
    periodoEmissao.addEventListener("click", function (e) {
      e.stopPropagation();
      abrirCalendario();
    });

    // Qualquer clique dentro do popup não deve fechar
    calendarioPopup.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    // Fechar calendário ao clicar fora
    document.addEventListener("click", function (e) {
      if (
        !calendarioPopup.contains(e.target) &&
        !periodoEmissao.contains(e.target)
      ) {
        fecharCalendario();
      }
    });

    // Limpar hover ao sair do popup
    calendarioPopup.addEventListener("mouseleave", function () {
      if (calendarioAtual._hoverDate) {
        calendarioAtual._hoverDate = null;
        gerarCalendario();
      }
    });

    // Configurar navegação do calendário
    configurarNavegacaoCalendario();

    // Configurar botões do calendário
    configurarBotoesCalendario();

    // Gerar calendário inicial
    gerarCalendario();
  }
}

function configurarNavegacaoCalendario() {
  const btnMesAnterior = document.getElementById("btnMesAnterior");
  const btnProximoMes = document.getElementById("btnProximoMes");

  if (btnMesAnterior) {
    btnMesAnterior.addEventListener("click", function () {
      calendarioAtual.mes--;
      if (calendarioAtual.mes < 0) {
        calendarioAtual.mes = 11;
        calendarioAtual.ano--;
      }
      gerarCalendario();
    });
  }

  if (btnProximoMes) {
    btnProximoMes.addEventListener("click", function () {
      calendarioAtual.mes++;
      if (calendarioAtual.mes > 11) {
        calendarioAtual.mes = 0;
        calendarioAtual.ano++;
      }
      gerarCalendario();
    });
  }
}

function configurarBotoesCalendario() {
  const btnCancelar = document.getElementById("btnCalendarioCancelar");
  const btnAplicar = document.getElementById("btnCalendarioAplicar");

  if (btnCancelar) {
    btnCancelar.addEventListener("click", function () {
      fecharCalendario();
    });
  }

  if (btnAplicar) {
    btnAplicar.addEventListener("click", function () {
      aplicarDatasCalendario();
    });
  }
}

function abrirCalendario() {
  const calendarioPopup = document.getElementById("calendarioPopup");
  const dataInicio = document.getElementById("dataInicio");
  const dataFim = document.getElementById("dataFim");

  // Carregar datas atuais e navegar para o mês da data inicial
  if (dataInicio.value) {
    const d = parseData(dataInicio.value);
    calendarioAtual.dataInicio = d;
    calendarioAtual.mes = d.getMonth();
    calendarioAtual.ano = d.getFullYear();
  }
  if (dataFim.value) {
    calendarioAtual.dataFim = parseData(dataFim.value);
  }

  calendarioAtual.selecionandoInicio = true;
  calendarioAtual._hoverDate = null;
  atualizarHintCalendario();

  if (calendarioPopup) {
    calendarioPopup.classList.add("show");
    gerarCalendario();
  }
}

function fecharCalendario() {
  const calendarioPopup = document.getElementById("calendarioPopup");
  if (calendarioPopup) {
    calendarioPopup.classList.remove("show");
  }
}

function gerarCalendario() {
  const nomesMeses = [
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

  // Segundo mês: sempre o mês seguinte ao esquerdo
  let mes2 = calendarioAtual.mes + 1;
  let ano2 = calendarioAtual.ano;
  if (mes2 > 11) {
    mes2 = 0;
    ano2++;
  }

  const mesAnoElement = document.getElementById("mesAnoAtual");
  const mesAnoElement2 = document.getElementById("mesAnoAtual2");
  if (mesAnoElement)
    mesAnoElement.textContent = `${nomesMeses[calendarioAtual.mes]} ${calendarioAtual.ano}`;
  if (mesAnoElement2)
    mesAnoElement2.textContent = `${nomesMeses[mes2]} ${ano2}`;

  gerarMesCalendario(
    "diasCalendario",
    calendarioAtual.mes,
    calendarioAtual.ano,
  );
  gerarMesCalendario("diasCalendario2", mes2, ano2);
}

function gerarMesCalendario(containerId, mes, ano) {
  const diasCalendario = document.getElementById(containerId);
  if (!diasCalendario) return;
  diasCalendario.innerHTML = "";

  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const diasAnterior = primeiroDia.getDay();
  const mesAnteriorObj = new Date(ano, mes, 0);

  for (let i = diasAnterior - 1; i >= 0; i--) {
    const dia = mesAnteriorObj.getDate() - i;
    criarDiaCalendario(containerId, dia, true, mes - 1, ano);
  }
  for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
    criarDiaCalendario(containerId, dia, false, mes, ano);
  }
  const diasRestantes = 42 - (diasAnterior + ultimoDia.getDate());
  for (let dia = 1; dia <= diasRestantes; dia++) {
    criarDiaCalendario(containerId, dia, true, mes + 1, ano);
  }
}

function criarDiaCalendario(containerId, numeroDia, outroMes, mes, ano) {
  const diasCalendario = document.getElementById(containerId);
  const diaElement = document.createElement("div");
  diaElement.className = "dia";
  diaElement.textContent = numeroDia;

  // Ajustar ano se necessário
  let anoAjustado = ano;
  if (mes < 0) {
    mes = 11;
    anoAjustado--;
  } else if (mes > 11) {
    mes = 0;
    anoAjustado++;
  }

  const dataAtual = new Date(anoAjustado, mes, numeroDia);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  if (outroMes) diaElement.classList.add("outros-mes");

  // Destacar hoje
  if (dataAtual.getTime() === hoje.getTime() && !outroMes)
    diaElement.classList.add("hoje");

  // Data início selecionada
  if (
    calendarioAtual.dataInicio &&
    datasSaoIguais(dataAtual, calendarioAtual.dataInicio)
  ) {
    diaElement.classList.add("inicio-periodo");
  }

  // Data fim selecionada (real ou preview de hover)
  const previewFim =
    !calendarioAtual.dataFim &&
    !calendarioAtual.selecionandoInicio &&
    calendarioAtual._hoverDate;
  const dataFimEfetiva =
    calendarioAtual.dataFim || (previewFim ? calendarioAtual._hoverDate : null);

  if (dataFimEfetiva && datasSaoIguais(dataAtual, dataFimEfetiva)) {
    diaElement.classList.add("fim-periodo");
  }

  // Range highlight entre inicio e fim
  if (calendarioAtual.dataInicio && dataFimEfetiva) {
    const [dMin, dMax] =
      calendarioAtual.dataInicio <= dataFimEfetiva
        ? [calendarioAtual.dataInicio, dataFimEfetiva]
        : [dataFimEfetiva, calendarioAtual.dataInicio];
    if (dataAtual > dMin && dataAtual < dMax) {
      diaElement.classList.add("periodo-range");
    }
  }

  // Hover: atualizar preview
  diaElement.addEventListener("mouseover", function () {
    if (
      !calendarioAtual.selecionandoInicio &&
      calendarioAtual.dataInicio &&
      !calendarioAtual.dataFim
    ) {
      if (
        !calendarioAtual._hoverDate ||
        !datasSaoIguais(calendarioAtual._hoverDate, dataAtual)
      ) {
        calendarioAtual._hoverDate = dataAtual;
        gerarCalendario();
      }
    }
  });

  // Evento de clique
  diaElement.addEventListener("click", function (e) {
    e.stopPropagation();
    selecionarDataCalendario(dataAtual);
  });

  diasCalendario.appendChild(diaElement);
}

function selecionarDataCalendario(data) {
  if (calendarioAtual.selecionandoInicio) {
    calendarioAtual.dataInicio = new Date(data);
    calendarioAtual.dataFim = null;
    calendarioAtual._hoverDate = null;
    calendarioAtual.selecionandoInicio = false;
    atualizarHintCalendario();
    gerarCalendario();
  } else {
    if (data < calendarioAtual.dataInicio) {
      calendarioAtual.dataFim = calendarioAtual.dataInicio;
      calendarioAtual.dataInicio = new Date(data);
    } else {
      calendarioAtual.dataFim = new Date(data);
    }
    calendarioAtual._hoverDate = null;
    calendarioAtual.selecionandoInicio = true;
    // Segunda data selecionada: aplica e fecha automaticamente
    aplicarDatasCalendario();
  }
}

function atualizarHintCalendario() {
  const hint = document.getElementById("calendarioHint");
  if (!hint) return;
  if (calendarioAtual.selecionandoInicio) {
    hint.textContent = "Clique para selecionar a data inicial";
  } else {
    hint.textContent = "Agora clique para selecionar a data final";
    hint.style.color = "#2563eb";
    hint.style.fontWeight = "600";
  }
  if (calendarioAtual.selecionandoInicio) {
    hint.style.color = "";
    hint.style.fontWeight = "";
  }
}

function aplicarDatasCalendario() {
  const dataInicio = document.getElementById("dataInicio");
  const dataFim = document.getElementById("dataFim");

  if (calendarioAtual.dataInicio && dataInicio) {
    dataInicio.value = formatarData(calendarioAtual.dataInicio);
  }

  if (calendarioAtual.dataFim && dataFim) {
    dataFim.value = formatarData(calendarioAtual.dataFim);
  } else if (calendarioAtual.dataInicio && dataFim) {
    // Se só uma data foi selecionada, usar como início e fim
    dataFim.value = formatarData(calendarioAtual.dataInicio);
  }

  fecharCalendario();
}

// Funções utilitárias
function formatarData(data) {
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

function parseData(dataString) {
  const partes = dataString.split("/");
  if (partes.length === 3) {
    return new Date(
      parseInt(partes[2]),
      parseInt(partes[1]) - 1,
      parseInt(partes[0]),
    );
  }
  return new Date();
}

function datasSaoIguais(data1, data2) {
  return (
    data1.getDate() === data2.getDate() &&
    data1.getMonth() === data2.getMonth() &&
    data1.getFullYear() === data2.getFullYear()
  );
}

function mostrarNotificacao(mensagem, tipo = "info") {
  // Remove notificação existente se houver
  const existente = document.querySelector(".notification");
  if (existente) {
    existente.remove();
  }

  // Criar nova notificação
  const notification = document.createElement("div");
  notification.className = "notification";

  // Definir cor baseada no tipo
  const cores = {
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
  };

  notification.style.background = cores[tipo] || cores.info;
  notification.style.color = "white";

  // Adicionar ícone baseado no tipo
  const icones = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };

  notification.innerHTML = `
        <span style="font-size: 16px;">${icones[tipo] || icones.info}</span>
        <span>${mensagem}</span>
    `;

  document.body.appendChild(notification);

  // Remover após 4 segundos
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 4000);
}

console.log("✅ Funcionalidades do Relatório de Comissão carregadas");
