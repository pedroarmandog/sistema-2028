// Copiado de frontend/dashboard.js - funcionalidades do menu e header

console.log("ðŸš€ menu.js carregado (snippet do dashboard)");

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
      console.warn(
        `âš ï¸  ID DUPLICADO: ${id} (${elementos.length} elementos)`,
      );
    }
  });

  if (problemas.length > 0) {
    console.error("ðŸš¨ PROBLEMAS DE IDs DUPLICADOS DETECTADOS:");
    problemas.forEach((p) => console.error(`   - ${p}`));
    return false;
  }

  console.log("âœ… VerificaÃ§Ã£o de IDs: Nenhum duplicado encontrado");
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

// InicializaÃ§Ã£o
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

// FunÃ§Ãµes de navegaÃ§Ã£o rÃ¡pida (shims)
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
  console.log("ðŸ” Iniciando configuraÃ§Ã£o do submenu lateral Caixa...");

  const caixaSubmenuItem = document.getElementById("caixaSubmenuItem");
  const caixaLateralSubmenu = document.getElementById("caixaLateralSubmenu");
  const submenuItemWithLateral = document.querySelector(
    ".submenu-item-with-lateral",
  );

  console.log("ðŸ” Elementos encontrados:");
  console.log("- caixaSubmenuItem:", caixaSubmenuItem);
  console.log("- caixaLateralSubmenu:", caixaLateralSubmenu);
  console.log("- submenuItemWithLateral:", submenuItemWithLateral);

  if (caixaSubmenuItem && caixaLateralSubmenu && submenuItemWithLateral) {
    console.log("âœ… Configurando submenu lateral do Caixa...");

    let isSubmenuVisible = false;

    // FunÃ§Ã£o para mostrar submenu
    const showSubmenu = () => {
      console.log("ðŸ“¤ Mostrando submenu lateral");
      caixaLateralSubmenu.style.opacity = "1";
      caixaLateralSubmenu.style.visibility = "visible";
      caixaLateralSubmenu.style.transform = "translateX(0)";
      isSubmenuVisible = true;
    };

    // FunÃ§Ã£o para esconder submenu
    const hideSubmenu = () => {
      console.log("ðŸ“¥ Escondendo submenu lateral");
      caixaLateralSubmenu.style.opacity = "0";
      caixaLateralSubmenu.style.visibility = "hidden";
      caixaLateralSubmenu.style.transform = "translateX(-10px)";
      isSubmenuVisible = false;
    };

    // Configurar hover no container principal
    submenuItemWithLateral.addEventListener("mouseenter", function () {
      console.log("ðŸŽ¯ Mouse entrou no container do Caixa");
      showSubmenu();
    });

    submenuItemWithLateral.addEventListener("mouseleave", function () {
      console.log("ðŸŽ¯ Mouse saiu do container do Caixa");
      setTimeout(hideSubmenu, 100);
    });

    // Configurar hover no submenu lateral
    caixaLateralSubmenu.addEventListener("mouseenter", function () {
      console.log("ðŸŽ¯ Mouse entrou no submenu lateral");
      showSubmenu();
    });

    caixaLateralSubmenu.addEventListener("mouseleave", function () {
      console.log("ðŸŽ¯ Mouse saiu do submenu lateral");
      hideSubmenu();
    });

    // Adicionar event listeners para os itens do submenu lateral
    const lateralItems = caixaLateralSubmenu.querySelectorAll(
      ".lateral-submenu-item",
    );
    console.log(
      `ðŸ” Encontrados ${lateralItems.length} itens no submenu lateral`,
    );

    lateralItems.forEach((item, index) => {
      item.addEventListener("click", function (e) {
        e.preventDefault();
        const texto = this.textContent.trim();
        console.log(`ðŸš€ Clique em: ${texto}`);

        // Aqui vocÃª pode adicionar navegaÃ§Ã£o especÃ­fica para cada item
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
            alert("Navegando para RelatÃ³rio Demonstrativo de Caixa");
            // window.location.href = '/caixa/relatorio-demonstrativo.html';
            break;
        }

        hideSubmenu();
      });

      console.log(
        `âœ… Configurado evento click para item ${index + 1}: ${item.textContent.trim()}`,
      );
    });

    console.log("âœ… Submenu lateral do Caixa configurado com sucesso!");
  } else {
    console.error("âŒ Elementos do submenu lateral Caixa nÃ£o encontrados");
    console.log(
      "- Verifique se os IDs caixaSubmenuItem e caixaLateralSubmenu existem no HTML",
    );
    console.log(
      "- Verifique se a classe .submenu-item-with-lateral existe no HTML",
    );
  }
}

// Adicionar configuraÃ§Ã£o do submenu lateral ao DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
  // Aguardar um pouco para garantir que outros elementos carregaram
  setTimeout(() => {
    configurarSubmenuLateralCaixa();
  }, 200);
});

/* =========================================
   PAINEL FINANCEIRO – DADOS REAIS
   ========================================= */

// ── Estado ──────────────────────────────
let _pfMes = new Date().getMonth() + 1;
let _pfAno = new Date().getFullYear();
let _pfDadosCalendario = [];
let graficoSaldos = null;
let graficoReceberPagar = null;

// ── Bootstrap ───────────────────────────
document.addEventListener("DOMContentLoaded", function () {
  configurarAbas();
  configurarNavegacao();
  inicializarDatePicker();
  inicializarDatePickerPagRec();
  preencherSelectPagRec();
  carregarTudo();
  renderizarTabelasPagRec();
  document
    .getElementById("btnAtualizar")
    ?.addEventListener("click", carregarTudo);
  document
    .getElementById("btnDownloadCSV")
    ?.addEventListener("click", exportarFluxoCaixaCSV);
  ["fluxoPeriodo"].forEach((id) =>
    document.getElementById(id)?.addEventListener("change", carregarFluxoCaixa),
  );
  ["pagRecPeriodo"].forEach((id) =>
    document
      .getElementById(id)
      ?.addEventListener("change", renderizarTabelasPagRec),
  );
});

// ── Abas ─────────────────────────────────
function configurarAbas() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const tabId = this.getAttribute("data-tab");
      document
        .querySelectorAll(".tab-btn")
        .forEach((b) => b.classList.remove("active"));
      document
        .querySelectorAll(".tab-content")
        .forEach((c) => c.classList.remove("active"));
      this.classList.add("active");
      document.getElementById(tabId)?.classList.add("active");
      if (tabId === "fluxo-caixa") carregarFluxoCaixa();
      if (tabId === "pagamentos-recebimentos") renderizarTabelasPagRec();
    });
  });
}

// ── Navegação do mês ─────────────────────
function configurarNavegacao() {
  document.getElementById("btnMesAnterior")?.addEventListener("click", () => {
    const d = new Date(_pfAno, _pfMes - 2, 1);
    _pfMes = d.getMonth() + 1;
    _pfAno = d.getFullYear();
    carregarTudo();
  });
  document.getElementById("btnProximoMes")?.addEventListener("click", () => {
    const d = new Date(_pfAno, _pfMes, 1);
    _pfMes = d.getMonth() + 1;
    _pfAno = d.getFullYear();
    carregarTudo();
  });
}

// ── Date Picker (calendário) ─────────────
var _calVisualizandoAno, _calVisualizandoMes, _calDataSelecionada;

var _NOMES_MESES_CAL = [
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

function inicializarDatePicker() {
  var hoje = new Date();
  _calVisualizandoAno = hoje.getFullYear();
  _calVisualizandoMes = hoje.getMonth(); // 0-11
  _calDataSelecionada = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate(),
  );

  // Atualiza o display e o hidden input com a data atual
  _calAtualizarDisplay();

  // Abre/fecha o calendário ao clicar no botão
  var btn = document.getElementById("fluxoDataBtn");
  if (btn)
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var drop = document.getElementById("fluxoCalDropdown");
      if (!drop) return;
      if (drop.style.display === "none" || !drop.style.display) {
        _calVisualizandoAno = _calDataSelecionada.getFullYear();
        _calVisualizandoMes = _calDataSelecionada.getMonth();
        _calRenderizarMes();
        drop.style.display = "block";
      } else {
        drop.style.display = "none";
      }
    });

  // Navegação: mês anterior
  var prev = document.getElementById("calPrevMonth");
  if (prev)
    prev.addEventListener("click", function (e) {
      e.stopPropagation();
      _calVisualizandoMes--;
      if (_calVisualizandoMes < 0) {
        _calVisualizandoMes = 11;
        _calVisualizandoAno--;
      }
      _calRenderizarMes();
    });

  // Navegação: próximo mês
  var next = document.getElementById("calNextMonth");
  if (next)
    next.addEventListener("click", function (e) {
      e.stopPropagation();
      _calVisualizandoMes++;
      if (_calVisualizandoMes > 11) {
        _calVisualizandoMes = 0;
        _calVisualizandoAno++;
      }
      _calRenderizarMes();
    });

  // Fecha ao clicar fora
  document.addEventListener("click", function () {
    var drop = document.getElementById("fluxoCalDropdown");
    if (drop) drop.style.display = "none";
  });

  var wrapper = document.getElementById("fluxoDataWrapper");
  if (wrapper)
    wrapper.addEventListener("click", function (e) {
      e.stopPropagation();
    });
}

function _calRenderizarMes() {
  var label = document.getElementById("calMesAnoLabel");
  if (label)
    label.textContent =
      _NOMES_MESES_CAL[_calVisualizandoMes] + " / " + _calVisualizandoAno;

  var container = document.getElementById("fluxoCalDays");
  if (!container) return;
  container.innerHTML = "";

  var hoje = new Date();
  var primeiroDia = new Date(_calVisualizandoAno, _calVisualizandoMes, 1);
  var ultimoDia = new Date(_calVisualizandoAno, _calVisualizandoMes + 1, 0);
  var iniciaDom = primeiroDia.getDay(); // 0 = domingo

  // Dias do mês anterior (preenchimento)
  for (var i = 0; i < iniciaDom; i++) {
    var d = new Date(
      _calVisualizandoAno,
      _calVisualizandoMes,
      -(iniciaDom - i - 1),
    );
    var el = document.createElement("div");
    el.className = "cal-day outro-mes";
    el.textContent = d.getDate();
    container.appendChild(el);
  }

  // Dias do mês atual
  for (var dia = 1; dia <= ultimoDia.getDate(); dia++) {
    var el2 = document.createElement("div");
    el2.className = "cal-day";
    el2.textContent = dia;
    var isHoje =
      dia === hoje.getDate() &&
      _calVisualizandoMes === hoje.getMonth() &&
      _calVisualizandoAno === hoje.getFullYear();
    var isSel =
      _calDataSelecionada &&
      dia === _calDataSelecionada.getDate() &&
      _calVisualizandoMes === _calDataSelecionada.getMonth() &&
      _calVisualizandoAno === _calDataSelecionada.getFullYear();
    if (isHoje) el2.classList.add("hoje");
    if (isSel) el2.classList.add("selecionado");
    (function (d2) {
      el2.addEventListener("click", function () {
        _calDataSelecionada = new Date(
          _calVisualizandoAno,
          _calVisualizandoMes,
          d2,
        );
        _calAtualizarDisplay();
        var drop = document.getElementById("fluxoCalDropdown");
        if (drop) drop.style.display = "none";
        carregarFluxoCaixa();
      });
    })(dia);
    container.appendChild(el2);
  }
}

function _calAtualizarDisplay() {
  var d = _calDataSelecionada;
  if (!d) return;
  var yyyy = d.getFullYear();
  var mm = String(d.getMonth() + 1).padStart(2, "0");
  var dd = String(d.getDate()).padStart(2, "0");
  var inputHidden = document.getElementById("fluxoData");
  if (inputHidden) inputHidden.value = yyyy + "-" + mm + "-" + dd;
  var display = document.getElementById("fluxoDataDisplay");
  if (display) display.textContent = dd + "/" + mm + "/" + yyyy;
}

// Mantida por compatibilidade (não faz nada)
function preencherSelectMeses() {}

// ── Date Picker – Pagamentos e Recebimentos ─────────────
var _pagCalVisualizandoAno, _pagCalVisualizandoMes, _pagCalDataSelecionada;

function inicializarDatePickerPagRec() {
  var hoje = new Date();
  _pagCalVisualizandoAno = hoje.getFullYear();
  _pagCalVisualizandoMes = hoje.getMonth();
  _pagCalDataSelecionada = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate(),
  );
  _pagCalAtualizarDisplay();

  var btn = document.getElementById("pagRecDataBtn");
  if (btn)
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var drop = document.getElementById("pagRecCalDropdown");
      if (!drop) return;
      if (drop.style.display === "none" || !drop.style.display) {
        _pagCalVisualizandoAno = _pagCalDataSelecionada.getFullYear();
        _pagCalVisualizandoMes = _pagCalDataSelecionada.getMonth();
        _pagCalRenderizarMes();
        drop.style.display = "block";
      } else {
        drop.style.display = "none";
      }
    });

  var prev = document.getElementById("pagCalPrevMonth");
  if (prev)
    prev.addEventListener("click", function (e) {
      e.stopPropagation();
      _pagCalVisualizandoMes--;
      if (_pagCalVisualizandoMes < 0) {
        _pagCalVisualizandoMes = 11;
        _pagCalVisualizandoAno--;
      }
      _pagCalRenderizarMes();
    });

  var next = document.getElementById("pagCalNextMonth");
  if (next)
    next.addEventListener("click", function (e) {
      e.stopPropagation();
      _pagCalVisualizandoMes++;
      if (_pagCalVisualizandoMes > 11) {
        _pagCalVisualizandoMes = 0;
        _pagCalVisualizandoAno++;
      }
      _pagCalRenderizarMes();
    });

  document.addEventListener("click", function () {
    var drop = document.getElementById("pagRecCalDropdown");
    if (drop) drop.style.display = "none";
  });

  var wrapper = document.getElementById("pagRecDataWrapper");
  if (wrapper)
    wrapper.addEventListener("click", function (e) {
      e.stopPropagation();
    });
}

function _pagCalRenderizarMes() {
  var label = document.getElementById("pagCalMesAnoLabel");
  if (label)
    label.textContent =
      _NOMES_MESES_CAL[_pagCalVisualizandoMes] + " / " + _pagCalVisualizandoAno;

  var container = document.getElementById("pagRecCalDays");
  if (!container) return;
  container.innerHTML = "";

  var hoje = new Date();
  var primeiroDia = new Date(_pagCalVisualizandoAno, _pagCalVisualizandoMes, 1);
  var ultimoDia = new Date(
    _pagCalVisualizandoAno,
    _pagCalVisualizandoMes + 1,
    0,
  );
  var iniciaDom = primeiroDia.getDay();

  for (var i = 0; i < iniciaDom; i++) {
    var el = document.createElement("div");
    el.className = "cal-day outro-mes";
    el.textContent = new Date(
      _pagCalVisualizandoAno,
      _pagCalVisualizandoMes,
      -(iniciaDom - i - 1),
    ).getDate();
    container.appendChild(el);
  }

  for (var dia = 1; dia <= ultimoDia.getDate(); dia++) {
    var el2 = document.createElement("div");
    el2.className = "cal-day";
    el2.textContent = dia;
    var isHoje =
      dia === hoje.getDate() &&
      _pagCalVisualizandoMes === hoje.getMonth() &&
      _pagCalVisualizandoAno === hoje.getFullYear();
    var isSel =
      _pagCalDataSelecionada &&
      dia === _pagCalDataSelecionada.getDate() &&
      _pagCalVisualizandoMes === _pagCalDataSelecionada.getMonth() &&
      _pagCalVisualizandoAno === _pagCalDataSelecionada.getFullYear();
    if (isHoje) el2.classList.add("hoje");
    if (isSel) el2.classList.add("selecionado");
    (function (d2) {
      el2.addEventListener("click", function () {
        _pagCalDataSelecionada = new Date(
          _pagCalVisualizandoAno,
          _pagCalVisualizandoMes,
          d2,
        );
        _pagCalAtualizarDisplay();
        var drop = document.getElementById("pagRecCalDropdown");
        if (drop) drop.style.display = "none";
        renderizarTabelasPagRec();
      });
    })(dia);
    container.appendChild(el2);
  }
}

function _pagCalAtualizarDisplay() {
  var d = _pagCalDataSelecionada;
  if (!d) return;
  var yyyy = d.getFullYear();
  var mm = String(d.getMonth() + 1).padStart(2, "0");
  var dd = String(d.getDate()).padStart(2, "0");
  var inputHidden = document.getElementById("pagRecData");
  if (inputHidden) inputHidden.value = yyyy + "-" + mm;
  var display = document.getElementById("pagRecDataDisplay");
  if (display) display.textContent = dd + "/" + mm + "/" + yyyy;
}

// Mantida por compatibilidade (não faz nada)
function preencherSelectPagRec() {}

// ── Carregamento principal ───────────────
async function carregarTudo() {
  try {
    const [resumo, calendario, grafico] = await Promise.all([
      fetch("/api/painel-financeiro/resumo").then((r) => r.json()),
      fetch(
        "/api/painel-financeiro/calendario?mes=" + _pfMes + "&ano=" + _pfAno,
      ).then((r) => r.json()),
      fetch(
        "/api/painel-financeiro/grafico?mes=" + _pfMes + "&ano=" + _pfAno,
      ).then((r) => r.json()),
    ]);
    _pfDadosCalendario = calendario.dias || [];
    atualizarHeaderCalendario();
    renderizarCalendario(_pfDadosCalendario);
    atualizarCards(resumo);
    if (!graficoSaldos || !graficoReceberPagar) {
      setTimeout(() => inicializarGraficos(grafico), 400);
    } else {
      atualizarGraficos(grafico);
    }
  } catch (err) {
    console.error("Erro ao carregar painel financeiro:", err);
    mostrarNotificacao("Erro ao carregar dados do servidor", "error");
  }
}

// ── Header do calendário ─────────────────
function atualizarHeaderCalendario() {
  const nomes = [
    "janeiro",
    "fevereiro",
    "marco",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  const el = document.getElementById("mesAnoCalendario");
  if (el) el.textContent = nomes[_pfMes - 1] + " de " + _pfAno;
}

// ── Calendário ───────────────────────────
function renderizarCalendario(diasAPI) {
  const container = document.getElementById("calendarioDays");
  if (!container) return;
  container.innerHTML = "";

  const mapaAPI = {};
  (diasAPI || []).forEach(function (d) {
    mapaAPI[parseInt(d.dia, 10)] = d;
  });

  const primeiroDia = new Date(_pfAno, _pfMes - 1, 1).getDay();
  const totalDias = new Date(_pfAno, _pfMes, 0).getDate();
  const diasMesAnt = new Date(_pfAno, _pfMes - 1, 0).getDate();

  for (let i = primeiroDia - 1; i >= 0; i--) {
    container.appendChild(criarDiaCalendario(diasMesAnt - i, null, true));
  }
  for (let dia = 1; dia <= totalDias; dia++) {
    container.appendChild(criarDiaCalendario(dia, mapaAPI[dia] || null, false));
  }
  const restante = container.children.length % 7;
  if (restante > 0) {
    for (let dia = 1; dia <= 7 - restante; dia++) {
      container.appendChild(criarDiaCalendario(dia, null, true));
    }
  }
}

function criarDiaCalendario(dia, dadoAPI, outroMes) {
  const diaDiv = document.createElement("div");
  diaDiv.className = "calendario-day" + (outroMes ? " other-month" : "");

  const numeroDiv = document.createElement("span");
  numeroDiv.className = "day-number";
  numeroDiv.textContent = dia;
  diaDiv.appendChild(numeroDiv);

  if (!outroMes && dadoAPI) {
    const eventosDiv = document.createElement("div");
    eventosDiv.className = "day-events";

    if (dadoAPI.entradas > 0) {
      const chip = document.createElement("div");
      chip.className = "event-chip cartao";
      chip.innerHTML =
        '<span class="event-chip-label">Entradas</span><span class="event-chip-valor">' +
        formatarValor(dadoAPI.entradas) +
        "</span>";
      eventosDiv.appendChild(chip);
    }
    if (dadoAPI.saidas > 0) {
      const chip = document.createElement("div");
      chip.className = "event-chip crediario";
      chip.innerHTML =
        '<span class="event-chip-label">Saidas</span><span class="event-chip-valor">' +
        formatarValor(dadoAPI.saidas) +
        "</span>";
      eventosDiv.appendChild(chip);
    }
    if (
      dadoAPI.saldoAcumulado !== undefined &&
      dadoAPI.saldoAcumulado !== null
    ) {
      const chip = document.createElement("div");
      chip.className = "event-chip saldo";
      chip.innerHTML =
        '<span class="event-chip-label">Saldo Final</span><span class="event-chip-valor">' +
        formatarValor(dadoAPI.saldoAcumulado) +
        "</span>";
      eventosDiv.appendChild(chip);
    }
    diaDiv.appendChild(eventosDiv);
  }
  return diaDiv;
}

// ── Cards contas a receber/pagar ─────────
function atualizarCards(resumo) {
  if (!resumo) return;
  var set = function (id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = formatarValor(parseFloat(val) || 0);
  };
  set("receberHoje", resumo.receber && resumo.receber.hoje);
  set("receberSemana", resumo.receber && resumo.receber.essaSemana);
  set("receberProximaSemana", resumo.receber && resumo.receber.proximaSemana);
  set("receberMes", resumo.receber && resumo.receber.esseMes);
  set("receberProximoMes", resumo.receber && resumo.receber.proximoMes);
  set("receberAtrasado", resumo.receber && resumo.receber.atrasado);
  set("receberGeral", resumo.receber && resumo.receber.geral);
  set("pagarHoje", resumo.pagar && resumo.pagar.hoje);
  set("pagarSemana", resumo.pagar && resumo.pagar.essaSemana);
  set("pagarProximaSemana", resumo.pagar && resumo.pagar.proximaSemana);
  set("pagarMes", resumo.pagar && resumo.pagar.esseMes);
  set("pagarProximoMes", resumo.pagar && resumo.pagar.proximoMes);
  set("pagarAtrasado", resumo.pagar && resumo.pagar.atrasado);
  set("pagarGeral", resumo.pagar && resumo.pagar.geral);
}

// ── Gráficos ─────────────────────────────
function inicializarGraficos(dados) {
  var canvasSaldos = document.getElementById("graficoSaldos");
  var canvasReceberPagar = document.getElementById("graficoReceberPagar");
  if (!canvasSaldos || !canvasReceberPagar) return;

  var labels = (dados && dados.labels) || [];
  var saldoContas = (dados && dados.saldoContas) || [];
  var saldoPrevisto = (dados && dados.saldoPrevisto) || [];
  var aReceber = (dados && dados.aReceber) || [];
  var aPagar = (dados && dados.aPagar) || [];

  if (graficoSaldos) {
    graficoSaldos.destroy();
    graficoSaldos = null;
  }
  graficoSaldos = new Chart(canvasSaldos.getContext("2d"), {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Saldo de contas",
          data: saldoContas,
          borderColor: "#3A7CA5",
          backgroundColor: "rgba(58,124,165,0.1)",
          tension: 0.4,
          fill: true,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
        {
          label: "Saldo previsto",
          data: saldoPrevisto,
          borderColor: "#B0BEC5",
          backgroundColor: "rgba(176,190,197,0.1)",
          tension: 0.4,
          fill: true,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 3,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true, mode: "index", intersect: false },
      },
      scales: {
        x: {
          grid: { display: true, color: "#f0f0f0" },
          ticks: { font: { size: 10 } },
        },
        y: {
          beginAtZero: true,
          grid: { display: true, color: "#f0f0f0" },
          ticks: {
            callback: function (v) {
              return v.toLocaleString("pt-BR");
            },
            font: { size: 10 },
          },
        },
      },
      interaction: { mode: "nearest", axis: "x", intersect: false },
    },
  });

  if (graficoReceberPagar) {
    graficoReceberPagar.destroy();
    graficoReceberPagar = null;
  }
  graficoReceberPagar = new Chart(canvasReceberPagar.getContext("2d"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "A receber",
          data: aReceber,
          backgroundColor: "#71B27F",
          borderRadius: 4,
          barThickness: "flex",
          maxBarThickness: 20,
        },
        {
          label: "A pagar",
          data: aPagar,
          backgroundColor: "#D66A6A",
          borderRadius: 4,
          barThickness: "flex",
          maxBarThickness: 20,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 3,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true, mode: "index", intersect: false },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 10 } },
        },
        y: {
          beginAtZero: true,
          grid: { display: true, color: "#f0f0f0" },
          ticks: {
            callback: function (v) {
              return v.toLocaleString("pt-BR");
            },
            font: { size: 10 },
          },
        },
      },
    },
  });
}

function atualizarGraficos(dados) {
  if (!dados) return;
  var labels = dados.labels || [];
  if (graficoSaldos) {
    graficoSaldos.data.labels = labels;
    graficoSaldos.data.datasets[0].data = dados.saldoContas || [];
    graficoSaldos.data.datasets[1].data = dados.saldoPrevisto || [];
    graficoSaldos.update();
  }
  if (graficoReceberPagar) {
    graficoReceberPagar.data.labels = labels;
    graficoReceberPagar.data.datasets[0].data = dados.aReceber || [];
    graficoReceberPagar.data.datasets[1].data = dados.aPagar || [];
    graficoReceberPagar.update();
  }
}

// ── Fluxo de Caixa ───────────────────────
async function carregarFluxoCaixa() {
  var periodo =
    (document.getElementById("fluxoPeriodo") || {}).value || "mensal";
  var dataVal =
    (document.getElementById("fluxoData") || {}).value ||
    _pfAno + "-" + String(_pfMes).padStart(2, "0");
  var partes = dataVal.split("-");
  var anoFx = parseInt(partes[0], 10) || _pfAno;
  var mesFx = parseInt(partes[1], 10) || _pfMes;
  var empresa = (document.getElementById("fluxoEmpresa") || {}).value || "";
  var centro = (document.getElementById("fluxoCentro") || {}).value || "";

  var thead = document.getElementById("fluxoThead");
  var tbody = document.getElementById("fluxoTbody");
  if (thead)
    thead.innerHTML =
      '<tr><th class="col-descricao"></th><th class="col-data" colspan="31">Carregando...</th></tr>';
  if (tbody) tbody.innerHTML = "";

  try {
    var qs =
      "periodo=" +
      encodeURIComponent(periodo) +
      "&mes=" +
      mesFx +
      "&ano=" +
      anoFx +
      "&empresa=" +
      encodeURIComponent(empresa) +
      "&centro=" +
      encodeURIComponent(centro);
    var data = await fetch("/api/painel-financeiro/fluxo-caixa?" + qs).then(
      function (r) {
        return r.json();
      },
    );
    renderizarFluxoTabela(data);
  } catch (err) {
    console.error("Erro fluxo de caixa:", err);
    mostrarNotificacao("Erro ao carregar fluxo de caixa", "error");
  }
}

function renderizarFluxoTabela(data) {
  var thead = document.getElementById("fluxoThead");
  var tbody = document.getElementById("fluxoTbody");
  if (!thead || !tbody || !data) return;

  var colunas = data.colunas || [];
  var linhas = data.linhas || {};
  var nCols = colunas.length;

  // cabeçalho
  var thHtml = '<tr><th class="col-descricao"></th>';
  colunas.forEach(function (col) {
    thHtml +=
      '<th class="col-data">' +
      col.dataStr +
      '<br><span class="dia-semana">' +
      col.diaSemana +
      "</span></th>";
  });
  thHtml += "</tr>";
  thead.innerHTML = thHtml;

  // helper linha
  function buildLinha(rotulo, chave, cssClass) {
    var vals = linhas[chave] || new Array(nCols).fill(0);
    var tds = vals
      .map(function (v) {
        return '<td class="col-valor">' + fmtTabela(v) + "</td>";
      })
      .join("");
    return (
      '<tr class="' +
      (cssClass || "") +
      '"><td class="col-descricao">' +
      rotulo +
      "</td>" +
      tds +
      "</tr>"
    );
  }

  tbody.innerHTML =
    buildLinha(
      "<strong>SALDO INICIAL</strong>",
      "saldoInicial",
      "row-saldo-inicial",
    ) +
    buildLinha(
      "<strong>ENTRADAS</strong>",
      "entradas",
      "row-section entradas",
    ) +
    buildLinha(
      "Receitas Operacionais",
      "receitasOperacionais",
      "row-subsection",
    ) +
    buildLinha(
      "Receitas Financeiras",
      "receitasFinanceiras",
      "row-subsection",
    ) +
    buildLinha("Outras Entradas", "outrasEntradas", "row-subsection") +
    buildLinha("<strong>SAIDAS</strong>", "saidas", "row-section saidas") +
    buildLinha("Custos Operacionais", "custosOperacionais", "row-subsection") +
    buildLinha(
      "Despesas Operacionais",
      "despesasOperacionais",
      "row-subsection",
    ) +
    buildLinha("Investimentos", "investimentos", "row-subsection") +
    buildLinha("Outras Saidas", "outrasSaidas", "row-subsection") +
    buildLinha(
      "SALDO DO PERIODO (ENTRADAS - SAIDAS)",
      "saldoPeriodo",
      "row-saldo-periodo",
    ) +
    buildLinha("<strong>SALDO FINAL</strong>", "saldoFinal", "row-saldo-final");
}

// ── Utilitários ──────────────────────────
function formatarValor(valor) {
  var n = parseFloat(valor) || 0;
  return (
    "R$ " +
    n.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function fmtTabela(valor) {
  var n = parseFloat(valor) || 0;
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function mostrarNotificacao(mensagem, tipo) {
  tipo = tipo || "info";
  var notificacao = document.createElement("div");
  notificacao.className = "notification";
  var icone = "fa-info-circle";
  var cor = "var(--primary-color)";
  if (tipo === "success") {
    icone = "fa-check-circle";
    cor = "var(--turquoise)";
  } else if (tipo === "error") {
    icone = "fa-exclamation-circle";
    cor = "var(--red)";
  }
  notificacao.innerHTML =
    '<i class="fas ' +
    icone +
    '" style="color:' +
    cor +
    ';font-size:20px;"></i><span>' +
    mensagem +
    "</span>";
  notificacao.style.backgroundColor = "var(--bg-card)";
  notificacao.style.color = "var(--text-primary)";
  notificacao.style.border = "1px solid " + cor;
  document.body.appendChild(notificacao);
  setTimeout(function () {
    notificacao.style.animation = "slideOutRight 0.3s ease";
    setTimeout(function () {
      if (notificacao.parentNode) notificacao.remove();
    }, 300);
  }, 3000);
}

// ── Export CSV do Fluxo ──────────────────
function exportarFluxoCaixaCSV() {
  var tabela = document.getElementById("fluxoTabela");
  if (!tabela) return;
  var rows = [];
  tabela.querySelectorAll("thead tr, tbody tr").forEach(function (tr) {
    var cells = Array.from(tr.querySelectorAll("th, td")).map(function (c) {
      return '"' + c.textContent.replace(/\n/g, " ").trim() + '"';
    });
    rows.push(cells.join(";"));
  });
  var blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  var link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "fluxo_caixa_" + Date.now() + ".csv";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  mostrarNotificacao("CSV exportado com sucesso!", "success");
}

// ── API pública ──────────────────────────
window.painelFinanceiro = {
  carregarTudo: carregarTudo,
  carregarFluxoCaixa: carregarFluxoCaixa,
  atualizarCards: atualizarCards,
  atualizarGraficos: atualizarGraficos,
  renderizarCalendario: renderizarCalendario,
};

// ── Pagamentos e Recebimentos ─────────────
const _DIAS_PT = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];
const _MESES_PR = [
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

function preencherSelectPagRec() {
  const sel = document.getElementById("pagRecData");
  if (!sel) return;
  sel.innerHTML = "";
  const hoje = new Date();
  for (let i = -6; i <= 3; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    const val =
      d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = _MESES_PR[d.getMonth()] + " / " + d.getFullYear();
    if (i === 0) opt.selected = true;
    sel.appendChild(opt);
  }
}

function _obterColunasPagRec() {
  const periodo = document.getElementById("pagRecPeriodo")?.value || "mensal";
  const dataVal = document.getElementById("pagRecData")?.value || "";
  let ano, mes;
  if (dataVal && dataVal.includes("-")) {
    [ano, mes] = dataVal.split("-").map(Number);
  } else {
    const hoje = new Date();
    ano = hoje.getFullYear();
    mes = hoje.getMonth() + 1;
  }
  const datas = [];
  if (periodo === "mensal") {
    const totalDias = new Date(ano, mes, 0).getDate();
    for (let d = 1; d <= totalDias; d++) datas.push(new Date(ano, mes - 1, d));
  } else if (periodo === "semanal") {
    const hoje = new Date();
    const dow = hoje.getDay();
    const seg = new Date(hoje);
    seg.setDate(hoje.getDate() - (dow === 0 ? 6 : dow - 1));
    for (let i = 0; i < 7; i++) {
      const d = new Date(seg);
      d.setDate(seg.getDate() + i);
      datas.push(d);
    }
  } else {
    // diário
    const hoje = new Date();
    for (let i = 0; i < 9; i++) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() + i);
      datas.push(d);
    }
  }
  return datas;
}

async function renderizarTabelasPagRec() {
  const periodo = document.getElementById("pagRecPeriodo")?.value || "mensal";
  const dataVal =
    document.getElementById("pagRecData")?.value ||
    new Date().toISOString().slice(0, 7);

  const datas = _obterColunasPagRec();
  const _f2 = (n) => String(n).padStart(2, "0");
  const fmtVal = (v) =>
    (v || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // 1. Rebuild column headers e zerar células em ambas as tabelas
  ["pagamentosTabela", "recebimentosTabela"].forEach((tabelaId) => {
    const tabela = document.getElementById(tabelaId);
    if (!tabela) return;

    const thead = tabela.querySelector("thead");
    if (thead) {
      const tr = document.createElement("tr");
      tr.innerHTML = '<th class="col-descricao"></th>';
      datas.forEach((d) => {
        const th = document.createElement("th");
        th.className = "col-data";
        th.innerHTML =
          _f2(d.getDate()) +
          "/" +
          _f2(d.getMonth() + 1) +
          "/" +
          d.getFullYear() +
          '<br><span class="dia-semana">' +
          _DIAS_PT[d.getDay()] +
          "</span>";
        tr.appendChild(th);
      });
      thead.innerHTML = "";
      thead.appendChild(tr);
    }

    const tbody = tabela.querySelector("tbody");
    if (tbody) {
      tbody.querySelectorAll("tr").forEach((row) => {
        row.querySelectorAll(".col-valor").forEach((td) => td.remove());
        datas.forEach(() => {
          const td = document.createElement("td");
          td.className = "col-valor";
          td.textContent = "0,00";
          row.appendChild(td);
        });
      });
    }
  });

  // 2. Buscar dados reais da API
  try {
    const params = new URLSearchParams({ periodo, data: dataVal });
    const resp = await fetch(
      `/api/painel-financeiro/pagamentos-recebimentos?${params}`,
    );
    if (!resp.ok) return;
    const apiData = await resp.json();

    const { colunas = [], recebimentos = {}, pagamentos = {} } = apiData;
    if (!colunas.length) return;

    // Encontra linha pelo texto da primeira célula
    const findRow = (tabelaId, texto) => {
      const tabela = document.getElementById(tabelaId);
      if (!tabela) return null;
      for (const row of tabela.querySelectorAll("tbody tr")) {
        const td = row.querySelector("td");
        if (td && td.textContent.trim().includes(texto)) return row;
      }
      return null;
    };

    // Preenche células de uma linha com valores por data
    const preencherRow = (row, valoresPorDia) => {
      if (!row) return;
      const tds = row.querySelectorAll(".col-valor");
      colunas.forEach((col, i) => {
        if (tds[i])
          tds[i].textContent = fmtVal(valoresPorDia[col.dataStr] || 0);
      });
    };

    // Preenche SALDO FINAL com total acumulado
    const preencherSaldoFinal = (tabelaId, valoresPorDia) => {
      const saldoRow = document.querySelector(`#${tabelaId} .row-footer`);
      if (!saldoRow) return;
      const tds = saldoRow.querySelectorAll(".col-valor");
      let acum = 0;
      colunas.forEach((col, i) => {
        acum += valoresPorDia[col.dataStr] || 0;
        if (tds[i]) tds[i].textContent = fmtVal(acum);
      });
    };

    // Recebimentos
    preencherRow(
      findRow("recebimentosTabela", "(-) Recebimentos"),
      recebimentos,
    );
    preencherSaldoFinal("recebimentosTabela", recebimentos);

    // Pagamentos
    preencherRow(findRow("pagamentosTabela", "(-) Pagamentos"), pagamentos);
    preencherSaldoFinal("pagamentosTabela", pagamentos);
  } catch (err) {
    console.error("Erro ao carregar pagamentos e recebimentos:", err);
  }
}
