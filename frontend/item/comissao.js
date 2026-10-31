// Copiado de frontend/dashboard.js - funcionalidades do menu e header

console.log("🚀 menu.js carregado (snippet do dashboard)");

// Garantir helper global de toast para esta página (fallback leve)
if (typeof window.showToast !== "function") {
  window.showToast = function (message, type = "info", timeout = 3500) {
    try {
      let container = document.getElementById("global-toast-container");
      if (!container) {
        container = document.createElement("div");
        container.id = "global-toast-container";
        container.className = "toast-container";
        document.body.appendChild(container);
      }
      const toast = document.createElement("div");
      toast.className = "toast toast-" + (type || "info");
      // permitir quebra de linha na mensagem
      toast.innerText = message;
      container.appendChild(toast);
      setTimeout(() => toast.classList.add("show"), 10);
      setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => {
          try {
            toast.remove();
          } catch (e) {}
        }, 240);
      }, timeout || 3500);
    } catch (e) {
      try {
        alert(message);
      } catch (_) {
        console.log(message);
      }
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

// Segurança: remove overlays remanescentes de modais da área de Comissão
function removeComissaoOverlays() {
  try {
    document.querySelectorAll('[data-modal-owner="comissao"]').forEach((o) => {
      try {
        o.remove();
      } catch (e) {}
    });
  } catch (e) {}
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

// Fallback: garantir que os botões do header tenham listeners mesmo se a inicialização falhar
function garantirListenersHeaderComissao() {
  try {
    const btnAdicionarComissao = document.getElementById(
      "btnAdicionarComissao",
    );
    if (
      btnAdicionarComissao &&
      !btnAdicionarComissao.getAttribute("data-listener-added")
    ) {
      btnAdicionarComissao.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        try {
          openAdicionarComissaoModal();
        } catch (err) {
          console.error("erro abrir modal comissao (fallback)", err);
        }
      });
      btnAdicionarComissao.setAttribute("data-listener-added", "true");
    }

    const btnAdicionarPerfil = document.getElementById("btnAdicionarPerfil");
    if (
      btnAdicionarPerfil &&
      !btnAdicionarPerfil.getAttribute("data-listener-added")
    ) {
      btnAdicionarPerfil.addEventListener("click", function (e) {
        e.stopPropagation();
        try {
          openAdicionarPerfilModal();
        } catch (err) {
          console.error("erro abrir modal adicionar perfil (fallback)", err);
        }
      });
      btnAdicionarPerfil.setAttribute("data-listener-added", "true");
    }
  } catch (e) {
    console.debug("garantirListenersHeaderComissao erro", e);
  }
}

// executar imediatamente e também após um pequeno atraso (robustez)
try {
  garantirListenersHeaderComissao();
  setTimeout(garantirListenersHeaderComissao, 120);
} catch (e) {}

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

  // Inicializar funcionalidades da página de Comissão
  inicializarComissao();
});

// ========================================
// COMISSÃO - FUNCIONALIDADES
// ========================================

// Estado da aplicação
let comissoesAtual = [];
let paginaAtual = 1;
let itensPorPagina = 50;
let abaAtiva = "percentual";
let currentFilter = null; // 'produto' | 'vendedor' | null

async function inicializarComissao() {
  console.log("🔧 Inicializando funcionalidades de Comissão...");

  // Configurar abas
  configurarAbas();
  // Carregar dados da API
  try {
    comissoesAtual = await getCombinedComissoes();
  } catch (e) {
    console.error("Erro ao carregar comissões:", e);
    comissoesAtual = [];
  }

  // Renderizar comissões na tabela
  renderizarComissoes();

  // Configurar botões do header
  configurarBotoesHeader();

  // Renderizar perfis na aba PERFIL
  try {
    renderPerfis();
  } catch (e) {
    console.debug("renderPerfis falhou", e);
  }

  // Configurar pesquisa
  configurarPesquisa();
  // Configurar filtros Produto / Vendedor
  try {
    setupFilters();
  } catch (e) {
    console.debug("setupFilters falhou", e);
  }

  // Configurar paginação
  configurarPaginacao();
  // garantir que autocomplete do navegador esteja desligado para esta página
  try {
    disableAutocomplete();
  } catch (e) {}

  console.log("✅ Funcionalidades de Comissão inicializadas!");
}

// Desativa autocomplete em forms/inputs na página (ou dentro de um root opcional)
function disableAutocomplete(root) {
  try {
    const ctx = root && root.querySelectorAll ? root : document;
    // forms
    const forms = ctx.querySelectorAll("form");
    forms.forEach((f) => {
      try {
        f.setAttribute("autocomplete", "off");
      } catch (e) {}
    });
    // inputs, textareas, selects
    const inputs = ctx.querySelectorAll("input, textarea, select");
    inputs.forEach((i) => {
      try {
        i.setAttribute("autocomplete", "off");
        i.autocomplete = "off";
      } catch (e) {}
    });
  } catch (e) {
    /* ignore */
  }
}

// Retorna a lista de comissões da API do backend
async function getCombinedComissoes() {
  let arr = [];
  try {
    // Carregar COMISSÕES (produto + vendedor + percentual) da API
    if (
      typeof ApiClient !== "undefined" &&
      typeof ApiClient.getComissoes === "function"
    ) {
      const comissoes = await ApiClient.getComissoes();
      if (Array.isArray(comissoes)) {
        // Já vem no formato correto: perfilProduto, perfilVendedor, percentual
        arr = comissoes.map((c) => ({
          id: c.id,
          perfilProduto: c.perfilProduto || "",
          perfilVendedor: c.perfilVendedor || "",
          percentual: c.percentual ? c.percentual + "%" : "",
        }));
      }
    }
  } catch (e) {
    console.error("Erro ao carregar comissões da API:", e);
    arr = []; // Em caso de erro, retorna array vazio
  }
  return arr;
}

// Aplica filtro: 'produto' | 'vendedor' | null
async function applyFilter(tipo) {
  let combined = await getCombinedComissoes();
  if (tipo === "produto") {
    comissoesAtual = combined.filter(
      (c) => (c.perfilProduto || "").toString().trim() !== "",
    );
  } else if (tipo === "vendedor") {
    comissoesAtual = combined.filter(
      (c) => (c.perfilVendedor || "").toString().trim() !== "",
    );
  } else {
    comissoesAtual = combined;
  }
  paginaAtual = 1;
  // memorizar filtro e atualizar a visualização adequada
  currentFilter = tipo || null;
  if (abaAtiva === "perfil") renderPerfis();
  else renderizarComissoes();
}

function setupFilters() {
  const btnP = document.getElementById("filterProduto");
  const btnV = document.getElementById("filterVendedor");
  if (!btnP || !btnV) return;

  function clearActive() {
    btnP.classList.remove("active");
    btnV.classList.remove("active");
  }

  btnP.addEventListener("click", function () {
    const isActive = btnP.classList.contains("active");
    clearActive();
    if (!isActive) {
      btnP.classList.add("active");
      applyFilter("produto");
    } else {
      applyFilter(null);
    }
  });

  btnV.addEventListener("click", function () {
    const isActive = btnV.classList.contains("active");
    clearActive();
    if (!isActive) {
      btnV.classList.add("active");
      applyFilter("vendedor");
    } else {
      applyFilter(null);
    }
  });
}

// Configurar abas
function configurarAbas() {
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
      try {
        // Recarregar dados da API ao trocar de aba
        if (tabName === "percentual") {
          // recarregar da API
          getCombinedComissoes()
            .then((combined) => {
              comissoesAtual = combined;
              // if a filter is active, re-apply it so comissoesAtual reflects the filter
              if (currentFilter) applyFilter(currentFilter);
              else renderizarComissoes();
            })
            .catch((e) => {
              console.error("Erro ao recarregar comissões:", e);
              comissoesAtual = [];
              renderizarComissoes();
            });
        } else {
          // for other tabs also refresh the combined view
          getCombinedComissoes()
            .then((combined) => {
              comissoesAtual = combined;
            })
            .catch((e) => {
              console.error("Erro ao recarregar comissões:", e);
              comissoesAtual = [];
            });
        }
      } catch (e) {
        console.debug("erro ao recomputar comissoes ao trocar aba", e);
      }

      try {
        updateFiltersVisibility();
      } catch (e) {
        console.debug("updateFiltersVisibility falhou", e);
      }

      // garantir render correto conforme aba
      try {
        if (abaAtiva === "percentual") renderizarComissoes();
        else if (abaAtiva === "perfil") renderPerfis();
      } catch (e) {
        console.debug("erro re-renderizando apos troca de aba", e);
      }
    });
  });

  console.log("✅ Abas configuradas");
}

// Mostrar/ocultar filtros dependendo da aba ativa
function updateFiltersVisibility() {
  const container = document.querySelector(".filters-row");
  if (!container) return;
  if (abaAtiva === "perfil") {
    container.classList.add("show");
    container.setAttribute("aria-hidden", "false");
  } else {
    container.classList.remove("show");
    container.setAttribute("aria-hidden", "true");
    // também limpar qualquer estado ativo nos botões
    try {
      document.getElementById("filterProduto")?.classList.remove("active");
      document.getElementById("filterVendedor")?.classList.remove("active");
    } catch (e) {}
  }
}

// Renderizar comissões na tabela
function renderizarComissoes() {
  const tbody = document.getElementById("comissoesTableBody");

  if (!tbody) {
    console.error("❌ Elemento comissoesTableBody não encontrado");
    return;
  }

  // Calcular itens da página atual
  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;

  // Apenas exibir, na aba PERCENTUAL, as comissões que têm percentual definido
  // (ou seja: esconder perfis adicionados sem percentual). Não alteramos
  // `comissoesAtual` em si, apenas o que será renderizado.
  let efetivas = comissoesAtual || [];
  try {
    if (abaAtiva === "percentual") {
      efetivas = (comissoesAtual || []).filter(
        (c) => (c.percentual || "").toString().trim() !== "",
      );
    }
  } catch (e) {
    efetivas = comissoesAtual || [];
  }

  const comissoesPagina = efetivas.slice(inicio, fim);

  // Limpar tabela
  tbody.innerHTML = "";

  // Adicionar comissões
  comissoesPagina.forEach((comissao, index) => {
    const tr = document.createElement("tr");
    // Garantir que o valor exibido do percentual contenha '%' ao final
    let displayPercentual = "";
    try {
      const raw = (comissao.percentual || "").toString().trim();
      if (raw === "") displayPercentual = "";
      else displayPercentual = raw.endsWith("%") ? raw : raw + "%";
    } catch (e) {
      displayPercentual = (comissao.percentual || "").toString();
    }

    tr.innerHTML = `
            <td class="perfil-produto-cell">${comissao.perfilProduto}</td>
            <td class="perfil-vendedor-cell">${comissao.perfilVendedor}</td>
            <td class="percentual-cell">${displayPercentual}</td>
            <td class="editar-cell">
                <button class="btn-icon btn-editar" title="Editar" data-index="${inicio + index}">
                    <i class="fas fa-pen"></i>
                </button>
            </td>
            <td class="excluir-cell">
                <button class="btn-icon btn-excluir" title="Excluir" data-index="${inicio + index}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

    tbody.appendChild(tr);
  });

  // Configurar botões de ação
  configurarBotoesAcao();

  // Atualizar informações de paginação (passamos o total efetivo para a função)
  try {
    window.__comissoesRenderTotal = (efetivas || []).length;
  } catch (e) {}
  atualizarPaginacao();
  try {
    delete window.__comissoesRenderTotal;
  } catch (e) {}

  console.log(
    `✅ ${comissoesPagina.length} comissões renderizadas (página ${paginaAtual})`,
  );
}

// Configurar botões do header
function configurarBotoesHeader() {
  const btnAdicionarComissao = document.getElementById("btnAdicionarComissao");
  const btnAdicionarPerfil = document.getElementById("btnAdicionarPerfil");
  const btnOpcoes = document.getElementById("btnOpcoes");

  if (btnAdicionarComissao) {
    btnAdicionarComissao.addEventListener("click", function () {
      try {
        openAdicionarComissaoModal();
      } catch (e) {
        console.error(e);
      }
    });
  }

  if (btnAdicionarPerfil) {
    // open the Add Profile modal directly (with type selector inside)
    btnAdicionarPerfil.addEventListener("click", function (e) {
      e.stopPropagation();
      try {
        openAdicionarPerfilModal();
      } catch (err) {
        console.error("erro abrindo modal adicionar perfil", err);
      }
    });
  }

  if (btnOpcoes) {
    // Toggle pequeno menu de opções (exibe "Recalcular Comissão")
    btnOpcoes.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleOpcoesMenu(btnOpcoes);
    });
    // fechar ao clicar fora
    document.addEventListener("click", function (ev) {
      const existing = document.getElementById("comissaoOpcoesMenu");
      if (!existing) return;
      if (ev.target.closest && ev.target.closest("#comissaoOpcoesMenu")) return;
      if (
        ev.target === btnOpcoes ||
        (ev.target.closest && ev.target.closest("#btnOpcoes"))
      )
        return;
      try {
        existing.remove();
      } catch (e) {}
    });
  }

  console.log("✅ Botões do header configurados");
}

// Construir e alternar o pequeno menu de opções para o botão Opções
function toggleOpcoesMenu(btn) {
  try {
    const existing = document.getElementById("comissaoOpcoesMenu");
    if (existing) {
      existing.remove();
      return;
    }

    const menu = document.createElement("div");
    menu.id = "comissaoOpcoesMenu";
    menu.className = "comissao-opcoes-menu";
    menu.style.position = "absolute";
    menu.style.minWidth = "200px";
    menu.style.background = "#fff";
    menu.style.border = "1px solid rgba(0,0,0,0.08)";
    menu.style.boxShadow = "0 6px 18px rgba(0,0,0,0.08)";
    menu.style.borderRadius = "6px";
    menu.style.padding = "6px 0";
    menu.style.zIndex = 13000;

    const item = document.createElement("button");
    item.type = "button";
    item.className = "comissao-opcao-item";
    item.style.display = "flex";
    item.style.alignItems = "center";
    item.style.gap = "8px";
    item.style.width = "100%";
    item.style.border = "none";
    item.style.background = "transparent";
    item.style.padding = "10px 14px";
    item.style.cursor = "pointer";
    item.style.fontSize = "14px";
    item.textContent = "Recalcular Comissão";

    item.addEventListener("click", function (e) {
      e.stopPropagation();
      try {
        menu.remove();
      } catch (e) {}
      openRecalcularComissaoModal();
    });

    item.addEventListener(
      "mouseover",
      () => (item.style.background = "#f8f9fa"),
    );
    item.addEventListener(
      "mouseout",
      () => (item.style.background = "transparent"),
    );

    menu.appendChild(item);
    document.body.appendChild(menu);

    // posicionar abaixo do botão
    const rect = btn.getBoundingClientRect();
    menu.style.left =
      Math.max(
        8,
        rect.left + window.scrollX - (menu.offsetWidth - rect.width),
      ) + "px";
    menu.style.top = rect.bottom + window.scrollY + 8 + "px";
  } catch (err) {
    console.error("toggleOpcoesMenu erro", err);
  }
}

// Abre modal centralizado no estilo do sistema para Recalcular Comissão
function openRecalcularComissaoModal() {
  try {
    removeComissaoOverlays();
  } catch (e) {}
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay modal-centered-overlay";
  overlay.dataset.modalOwner = "comissao";
  overlay.style.zIndex = 13050;
  const modal = document.createElement("div");
  modal.className = "modal modal-centered";
  modal.style.maxWidth = "640px";
  modal.style.width = "640px";
  modal.innerHTML = `
        <div class="modal-header">
            <h3 style="margin:0">Recalcular Percentual de Comissão</h3>
            <button type="button" class="btn btn-secondary btn-close-modal">Fechar</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label>Período <span style="color:#d00">*</span></label>
                <div style="display:flex;gap:8px;align-items:center;margin-top:6px;">
                    <input type="date" id="rcDataInicio" class="form-control" style="flex:1" />
                    <span style="color:#888">até</span>
                    <input type="date" id="rcDataFim" class="form-control" style="flex:1" />
                </div>
            </div>
            <div class="form-group" style="margin-top:8px;color:#666;font-size:13px;">
                <p>Esta ação recalcula os percentuais de comissão para o período selecionado. A operação pode levar alguns segundos.</p>
            </div>
        </div>
        <div class="modal-footer" style="text-align:right">
            <button type="button" class="btn btn-primary btn-recalcular-comissao">Recalcular</button>
        </div>
    `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Styling defensive (segue padrão dos modais existentes)
  try {
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.background = overlay.style.background || "rgba(0,0,0,0.22)";
    overlay.style.top = overlay.style.top || "0";
    overlay.style.left = overlay.style.left || "0";
    overlay.style.width = overlay.style.width || "100%";
    overlay.style.height = overlay.style.height || "100%";
    modal.style.width = "520px";
    modal.style.maxWidth = "calc(100% - 40px)";
    modal.style.zIndex = "13051";
    modal.style.background = "#fff";
    modal.style.boxShadow = "0 10px 40px rgba(0,0,0,0.12)";
    modal.style.borderRadius = "8px";
    // limitar altura vertical e permitir que o conteúdo role internamente
    modal.style.maxHeight = "70vh";
    modal.style.height = "auto";
    // usar layout flex para header/body/footer e centralizar verticalmente
    modal.style.display = "flex";
    modal.style.flexDirection = "column";
    modal.style.justifyContent = "flex-start";
    modal.style.visibility = "visible";
    modal.style.opacity = "1";
    modal.style.position = modal.style.position || "relative";
    modal.style.transform = modal.style.transform || "none";
    modal.style.alignSelf = "center";
    modal.style.margin = modal.style.margin || "0";
    modal.style.left = modal.style.left || "unset";
    modal.style.top = modal.style.top || "unset";
    const bodyEl = modal.querySelector(".modal-body");
    if (bodyEl) {
      bodyEl.style.maxHeight = "50vh";
      bodyEl.style.overflowY = "auto";
      bodyEl.style.padding = "18px 20px";
      bodyEl.style.flex = "1 1 auto";
    }
    // garantir que header e footer não estiquem o modal
    try {
      const hdr = modal.querySelector(".modal-header");
      if (hdr) {
        hdr.style.flex = "0 0 auto";
        hdr.style.display = "flex";
        hdr.style.justifyContent = "space-between";
        hdr.style.alignItems = "center";
        hdr.style.padding = hdr.style.padding || "16px 20px";
      }
    } catch (e) {}
    try {
      const ftr = modal.querySelector(".modal-footer");
      if (ftr) ftr.style.flex = "0 0 auto";
    } catch (e) {}
  } catch (e) {
    console.error("openRecalcularComissaoModal styling erro", e);
  }

  disableAutocomplete(modal);

  const btnClose = modal.querySelector(".btn-close-modal");
  const btnRecalcular = modal.querySelector(".btn-recalcular-comissao");

  function close() {
    try {
      overlay.remove();
    } catch (e) {}
    try {
      removeComissaoOverlays();
    } catch (e) {}
  }
  try {
    if (btnClose) {
      // posicionar de forma absoluta no canto superior direito do modal
      btnClose.style.position = "absolute";
      btnClose.style.right = "14px";
      btnClose.style.top = "12px";
      btnClose.style.marginLeft = "0";
      btnClose.style.display = "inline-block";
      // garantir que o modal seja relativo para referência posicionamento
      modal.style.position = modal.style.position || "relative";
    }
  } catch (e) {}
  btnClose.addEventListener("click", function (e) {
    e.preventDefault();
    close();
  });
  // Clique fora do modal (overlay) NÃO fecha o modal — fechamento somente pelo botão 'Fechar'

  btnRecalcular.addEventListener("click", async function (e) {
    e.preventDefault();
    const inicio = document.getElementById("rcDataInicio")?.value;
    const fim = document.getElementById("rcDataFim")?.value;
    if (!inicio || !fim) {
      showToast && showToast("Informe o período", "warning");
      return;
    }

    // Desabilitar botão durante processamento
    btnRecalcular.disabled = true;
    btnRecalcular.textContent = "Recalculando...";

    try {
      showToast &&
        showToast("Recalculando comissões, aguarde...", "info", 6000);
      // As datas do input type="date" já vêm em YYYY-MM-DD
      const resultado = await ApiClient.recalcularComissao({ inicio, fim });
      const msg =
        resultado.mensagem ||
        `${resultado.itensAtualizados} item(ns) atualizado(s) em ${resultado.vendasAtualizadas} venda(s).`;
      showToast && showToast("✅ " + msg, "success", 5000);
      setTimeout(() => {
        try {
          close();
        } catch (e) {}
      }, 1500);
    } catch (err) {
      console.error("Erro ao recalcular comissão", err);
      showToast &&
        showToast("Erro ao recalcular: " + (err.message || err), "error", 5000);
      btnRecalcular.disabled = false;
      btnRecalcular.textContent = "Recalcular";
    }
  });
}

// Configurar botões de Editar e Excluir
function configurarBotoesAcao() {
  // Botões de Editar
  const botoesEditar = document.querySelectorAll(".btn-editar");
  botoesEditar.forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const index = parseInt(this.dataset.index);
      const comissao = comissoesAtual[index];
      console.log(
        `✏️ Editar: ${comissao.perfilProduto} - ${comissao.perfilVendedor}`,
      );
      const original = {
        perfilProduto: (comissao.perfilProduto || "").toString().trim(),
        perfilVendedor: (comissao.perfilVendedor || "").toString().trim(),
        percentual: (comissao.percentual || "").toString().trim(),
      };

      // Abrir modal de edição (substitui prompts)
      try {
        openEditarComissaoModal(index);
      } catch (e) {
        console.debug("openEditarComissaoModal falhou", e);
      }
    });
  });

  // Botões de Excluir
  const botoesExcluir = document.querySelectorAll(".btn-excluir");
  botoesExcluir.forEach((btn) => {
    btn.addEventListener("click", async function (e) {
      e.stopPropagation();
      const index = parseInt(this.dataset.index);
      const comissao = comissoesAtual[index];
      console.log(
        `🗑️ Excluir: ${comissao.perfilProduto} - ${comissao.perfilVendedor}`,
      );

      // Se a comissão tem ID (veio da API), deletar via backend
      if (comissao.id) {
        try {
          if (
            typeof ApiClient !== "undefined" &&
            typeof ApiClient.deletarComissao === "function"
          ) {
            await ApiClient.deletarComissao(comissao.id);
            console.log(
              `✅ Comissão excluída do banco de dados (ID: ${comissao.id})`,
            );
            showToast && showToast("Comissão excluída com sucesso", "success");
          } else {
            console.error("ApiClient.deletarComissao não disponível");
            showToast && showToast("Erro: API não disponível", "error");
            return;
          }
        } catch (error) {
          console.error("Erro ao excluir comissão:", error);
          showToast &&
            showToast(
              "Erro ao excluir comissão: " + (error.message || error),
              "error",
            );
          return;
        }
      }

      // Remover da memória local
      comissoesAtual.splice(index, 1);

      // Re-renderizar a tabela
      renderizarComissoes();
    });
  });
}

// Configurar pesquisa
function configurarPesquisa() {
  const inputPesquisa = document.getElementById("inputPesquisaComissao");
  const btnPesquisar = document.getElementById("btnPesquisar");

  async function realizarPesquisa() {
    const termo = inputPesquisa.value.toLowerCase().trim();
    console.log(`🔍 Pesquisando: "${termo}"`);

    try {
      const todasComissoes = await getCombinedComissoes();

      if (termo === "") {
        // Restaurar todas as comissões
        comissoesAtual = todasComissoes;
      } else {
        // Filtrar comissões
        comissoesAtual = todasComissoes.filter(
          (comissao) =>
            comissao.perfilProduto.toLowerCase().includes(termo) ||
            comissao.perfilVendedor.toLowerCase().includes(termo) ||
            comissao.percentual.toLowerCase().includes(termo),
        );
      }
    } catch (e) {
      console.error("Erro ao pesquisar:", e);
      comissoesAtual = [];
    }

    // Voltar para página 1
    paginaAtual = 1;

    // Re-renderizar
    renderizarComissoes();

    console.log(`✅ ${comissoesAtual.length} comissões encontradas`);
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

    // Pesquisa em tempo real
    inputPesquisa.addEventListener("input", function () {
      if (this.value.trim() === "") {
        realizarPesquisa();
      }
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
      renderizarComissoes();
      console.log(`📄 Itens por página alterado para: ${itensPorPagina}`);
    });
  }

  if (btnPrevPage) {
    btnPrevPage.addEventListener("click", function () {
      if (paginaAtual > 1) {
        paginaAtual--;
        renderizarComissoes();
        console.log(`⬅️ Página ${paginaAtual}`);
      }
    });
  }

  if (btnNextPage) {
    btnNextPage.addEventListener("click", function () {
      const totalPaginas = Math.ceil(comissoesAtual.length / itensPorPagina);
      if (paginaAtual < totalPaginas) {
        paginaAtual++;
        renderizarComissoes();
        console.log(`➡️ Página ${paginaAtual}`);
      }
    });
  }

  console.log("✅ Paginação configurada");
}

// Modal: Adicionar Percentual de Comissão
function openAdicionarComissaoModal(prefill) {
  console.log("openAdicionarComissaoModal: start", { prefill });
  // remove any existing overlays for this page to avoid stacking and double-click issues
  try {
    removeComissaoOverlays();
  } catch (e) {}
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay modal-centered-overlay";
  overlay.style.zIndex = 12050;
  overlay.dataset.modalOwner = "comissao";
  // ensure overlay covers the viewport (diagnostic / defensive)
  try {
    overlay.style.position = overlay.style.position || "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = overlay.style.background || "rgba(0,0,0,0.6)";
  } catch (e) {}
  const modal = document.createElement("div");
  modal.className = "modal modal-centered";
  modal.style.maxWidth = "640px";
  modal.style.width = "640px";
  modal.innerHTML = `
        <div class="modal-header">
            <h3 style="margin:0">Adicionar Percentual de Comissão</h3>
            <button type="button" class="btn btn-secondary btn-close-modal">Fechar</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label>Perfil de Produto <span style="color:#d00">*</span></label>
                <div class="input-with-icon">
                    <input type="text" id="modalPerfilProduto" class="form-control" placeholder="Perfil de Produto" />
                </div>
            </div>
            <div class="form-group">
                <label>Perfil de Vendedor/Fornecedor <span style="color:#d00">*</span></label>
                <div class="input-with-icon">
                    <input type="text" id="modalPerfilVendedor" class="form-control" placeholder="Perfil de Vendedor/Fornecedor" />
                </div>
            </div>
            <div class="form-group">
                <label>Percentual: <span style="color:#d00">*</span></label>
                <input type="text" id="modalPercentual" class="form-control" placeholder="Ex: 5%" />
            </div>
        </div>
        <div class="modal-footer" style="text-align:right">
            <button type="button" class="btn btn-primary btn-save-comissao">Salvar</button>
        </div>
    `;
  // append overlay and apply compact, centered styling
  try {
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  } catch (e) {
    console.error("openAdicionarComissaoModal: append error", e);
  }
  try {
    console.log("openAdicionarComissaoModal: appended overlay and modal", {
      overlay,
      modal,
    });
    // prefer overlay flex centering (defined in CSS). Keep modal compact and scrollable if content overflows.
    // enforce overlay behavior in case some CSS overrides exist
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    // use a slightly lighter dim so background isn't too dark
    overlay.style.background = overlay.style.background || "rgba(0,0,0,0.22)";
    overlay.style.inset = overlay.style.inset || "0";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";

    // compact modal sizing and scroll behavior
    modal.style.width = "520px";
    modal.style.maxWidth = "calc(100% - 40px)";
    modal.style.maxHeight = "70vh";
    // make modal height auto and restrict scrolling to the body only
    modal.style.height = "auto";
    modal.style.maxHeight = "none";
    modal.style.overflow = "visible";
    modal.style.zIndex = "12051";
    // remove any diagnostic border and ensure visible background
    try {
      if (modal.style.border && modal.style.border.includes("rgba(255,0,0"))
        modal.style.border = "none";
    } catch (e) {}
    modal.style.background = modal.style.background || "#fff";
    modal.style.boxShadow =
      modal.style.boxShadow || "0 10px 40px rgba(0,0,0,0.12)";
    modal.style.position = "relative";
    modal.style.transform = "none";
    modal.style.left = "unset";
    modal.style.top = "unset";
    modal.style.alignSelf = "center";
    modal.style.display = "block";
    modal.style.visibility = "visible";
    modal.style.opacity = "1";
    modal.style.margin = "0";
    console.log("openAdicionarComissaoModal: modal dimensions", {
      w: modal.offsetWidth,
      h: modal.offsetHeight,
      parent: modal.parentElement,
    });
  } catch (e) {
    console.error("openAdicionarComissaoModal: styling error", e);
  }
  // ensure only the modal body scrolls if content is large
  try {
    const bodyEl = modal.querySelector(".modal-body");
    if (bodyEl) {
      bodyEl.style.maxHeight = "60vh";
      bodyEl.style.overflowY = "auto";
    }
  } catch (e) {
    console.debug("could not set modal body scroll", e);
  }
  // desativar autocomplete nos inputs do modal recém-criado
  try {
    disableAutocomplete(modal);
  } catch (e) {}

  const btnClose = modal.querySelector(".btn-close-modal");
  const btnSave = modal.querySelector(".btn-save-comissao");
  const inputPerfil = modal.querySelector("#modalPerfilProduto");
  const inputVendedor = modal.querySelector("#modalPerfilVendedor");
  const inputPercentual = modal.querySelector("#modalPercentual");

  // Attach dropdown suggestion helpers to inputs
  try {
    attachPerfilDropdown(inputPerfil, "produto");
  } catch (e) {}
  try {
    attachPerfilDropdown(inputVendedor, "vendedor");
  } catch (e) {}

  // Preencher se houver prefill
  if (prefill && prefill.perfilProduto)
    inputPerfil.value = prefill.perfilProduto;
  if (prefill && prefill.perfilVendedor)
    inputVendedor.value = prefill.perfilVendedor;
  if (prefill && prefill.percentual) inputPercentual.value = prefill.percentual;

  function close() {
    try {
      overlay.remove();
    } catch (e) {}
    try {
      removeComissaoOverlays();
    } catch (e) {}
  }
  btnClose.addEventListener("click", function (e) {
    e.preventDefault();
    close();
  });
  // Observação: não fechar ao clicar fora do modal — somente fechar com o botão 'Fechar'
  // (Comportamento solicitado pelo usuário: evitar fechamento acidental ao interagir)
  // Portanto, não há listener que feche o modal ao clicar no overlay.

  // adicionar botão '...' rápido para criar perfis diretamente (usa o helper existente)
  try {
    addQuickNewComissaoControl(
      "modalPerfilProduto",
      "comissoes_list",
      "Novo Perfil de Comissão",
    );
  } catch (e) {}
  try {
    addQuickNewComissaoControl(
      "modalPerfilVendedor",
      "comissoes_list",
      "Novo Perfil de Comissão",
    );
  } catch (e) {}

  btnSave.addEventListener("click", async function (e) {
    e.preventDefault();
    const perfilProduto = (inputPerfil.value || "").toString().trim();
    const perfilVendedor = (inputVendedor.value || "").toString().trim();
    const percentual = (inputPercentual.value || "").toString().trim();
    if (!perfilProduto) {
      showToast("Informe Perfil de Produto", "warning");
      inputPerfil.focus();
      return;
    }
    if (!perfilVendedor) {
      showToast("Informe Perfil de Vendedor/Fornecedor", "warning");
      inputVendedor.focus();
      return;
    }
    if (!percentual) {
      showToast("Informe Percentual", "warning");
      inputPercentual.focus();
      return;
    }

    // Adicionar via API do backend (tabela comissoes)
    try {
      if (
        typeof ApiClient !== "undefined" &&
        typeof ApiClient.criarComissao === "function"
      ) {
        // Remover % do percentual se houver
        const percentualNumerico = parseFloat(
          percentual.toString().replace("%", ""),
        );

        await ApiClient.criarComissao({
          perfilProduto: perfilProduto,
          perfilVendedor: perfilVendedor,
          percentual: percentualNumerico,
        });
        console.log("✅ Comissão criada no banco de dados");
      }
      // Adicionar à lista em memória também
      comissoesAtual.push({
        perfilProduto: perfilProduto,
        perfilVendedor: perfilVendedor,
        percentual: percentual,
      });
    } catch (e) {
      console.error("Erro ao criar comissão:", e);
      showToast("Erro ao salvar comissão: " + (e.message || e), "error");
      return;
    }

    // Fechar o modal primeiro para evitar que fique visível durante o reflow
    try {
      close();
    } catch (e) {}

    try {
      renderizarComissoes();
    } catch (e) {}
    showToast("Comissão adicionada", "success", 2000);
    try {
      removeComissaoOverlays();
    } catch (e) {}
  });
}

// Helper: attach a dropdown of existing perfis to an input
function attachPerfilDropdown(inputEl, tipo) {
  if (!inputEl) return;
  // desligar autocomplete nativo do navegador para este input
  try {
    inputEl.setAttribute("autocomplete", "off");
    inputEl.autocomplete = "off";
  } catch (e) {}
  inputEl.style.position = "relative";

  const dropdown = document.createElement("div");
  dropdown.className = "perfil-sug-dropdown";
  dropdown.style.position = "absolute";
  dropdown.style.minWidth = (inputEl.offsetWidth || 200) + "px";
  dropdown.style.maxHeight = "220px";
  dropdown.style.overflowY = "auto";
  dropdown.style.background = "#fff";
  dropdown.style.border = "1px solid rgba(0,0,0,0.08)";
  dropdown.style.boxShadow = "0 6px 18px rgba(0,0,0,0.08)";
  dropdown.style.borderRadius = "6px";
  dropdown.style.zIndex = 13000;
  dropdown.style.display = "none";
  dropdown.style.padding = "6px 0";

  // position relative to inputEl
  function positionDropdown() {
    const rect = inputEl.getBoundingClientRect();
    dropdown.style.left = rect.left + window.scrollX + "px";
    dropdown.style.top = rect.bottom + window.scrollY + 6 + "px";
    dropdown.style.minWidth = rect.width + "px";
  }

  document.body.appendChild(dropdown);

  async function buildItems(filterText) {
    dropdown.innerHTML = "";
    const suggestions = [];
    try {
      // Carregar perfis da API (tabela perfis_comissao)
      if (
        typeof ApiClient !== "undefined" &&
        typeof ApiClient.getPerfisComissao === "function"
      ) {
        const perfis = await ApiClient.getPerfisComissao();
        perfis.forEach((p) => {
          if (!p) return;
          // Filtrar por tipo
          if (tipo === "produto" && p.tipo === "produto" && p.perfilVendedor) {
            suggestions.push((p.perfilVendedor || "").toString().trim());
          }
          if (
            tipo === "vendedor" &&
            p.tipo === "vendedor" &&
            p.perfilVendedor
          ) {
            suggestions.push((p.perfilVendedor || "").toString().trim());
          }
        });
      }
    } catch (e) {
      console.error("Erro ao carregar sugestões:", e);
    }

    // normalize, unique
    const uniques = suggestions
      .map((s) => (s || "").trim())
      .filter((s) => s)
      .filter((v, i, a) => a.indexOf(v) === i);
    const q = (filterText || "").toString().trim().toLowerCase();
    const filtered = uniques.filter((u) =>
      q === "" ? true : u.toLowerCase().includes(q),
    );

    filtered.forEach((s) => {
      const it = document.createElement("div");
      it.className = "perfil-sug-item";
      it.style.padding = "8px 12px";
      it.style.cursor = "pointer";
      it.style.fontSize = "13px";
      it.textContent = s;
      it.addEventListener("click", function (ev) {
        ev.stopPropagation();
        inputEl.value = s;
        // remover dropdown e listeners ao selecionar
        try {
          dropdown.remove();
        } catch (e) {}
        try {
          document.removeEventListener("click", docClickHandler);
        } catch (e) {}
        try {
          window.removeEventListener("resize", positionDropdown);
        } catch (e) {}
        inputEl.dispatchEvent(new Event("input"));
        inputEl.blur();
      });
      it.addEventListener("mouseover", () => (it.style.background = "#f5f7fb"));
      it.addEventListener(
        "mouseout",
        () => (it.style.background = "transparent"),
      );
      dropdown.appendChild(it);
    });

    if (filtered.length === 0) {
      const none = document.createElement("div");
      none.style.padding = "8px 12px";
      none.style.color = "#666";
      none.textContent = "Nenhum perfil encontrado";
      dropdown.appendChild(none);
    }
  }

  function show() {
    positionDropdown();
    dropdown.style.display = "block";
  }
  function hide() {
    dropdown.style.display = "none";
  }

  inputEl.addEventListener("focus", function () {
    buildItems(inputEl.value);
    show();
  });
  inputEl.addEventListener("input", function () {
    buildItems(inputEl.value);
    show();
  });
  window.addEventListener("resize", positionDropdown);

  // fechar ao clicar fora
  const docClickHandler = function (e) {
    if (e.target === inputEl) return;
    if (!dropdown.contains(e.target)) hide();
  };
  setTimeout(() => document.addEventListener("click", docClickHandler), 10);

  // retornar referência se necessário
  return { show, hide, rebuild: buildItems };
}

// Modal: Adicionar Perfil de Comissão (Produto ou Vendedor/Fornecedor)
function openAdicionarPerfilModal(tipo, prefill) {
  try {
    removeComissaoOverlays();
  } catch (e) {}
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay modal-centered-overlay";
  overlay.style.zIndex = 12050;
  overlay.dataset.modalOwner = "comissao";
  const modal = document.createElement("div");
  modal.className = "modal modal-centered";
  modal.style.maxWidth = "640px";
  modal.style.width = "640px";
  const title = "Novo Perfil de Comissão";
  // If tipo is not provided, include a select to choose Produto/Vendedor
  if (!tipo) {
    modal.innerHTML = `
            <div class="modal-header">
                <h3 style="margin:0">${title}</h3>
                <button type="button" class="btn btn-secondary btn-close-modal">Fechar</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Tipo de Perfil <span style="color:#d00">*</span></label>
                    <select id="modalPerfilTipo" class="form-control">
                        <option value="produto">Produto</option>
                        <option value="vendedor">Vendedor/Fornecedor</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Descrição: <span style="color:#d00">*</span></label>
                    <input type="text" id="modalPerfilDescricao" class="form-control" placeholder="Descrição" />
                </div>
            </div>
            <div class="modal-footer" style="text-align:right">
                <button type="button" class="btn btn-primary btn-save-perfil">Salvar</button>
            </div>
        `;
  } else {
    modal.innerHTML = `
            <div class="modal-header">
                <h3 style="margin:0">${title}</h3>
                <button type="button" class="btn btn-secondary btn-close-modal">Fechar</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Descrição: <span style="color:#d00">*</span></label>
                    <input type="text" id="modalPerfilDescricao" class="form-control" placeholder="Descrição" />
                </div>
            </div>
            <div class="modal-footer" style="text-align:right">
                <button type="button" class="btn btn-primary btn-save-perfil">Salvar</button>
            </div>
        `;
  }
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  // ensure overlay is full-screen and slightly lighter; force modal visible and compact
  try {
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.left = "0";
    overlay.style.top = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.background = overlay.style.background || "rgba(0,0,0,0.22)";
    // compact modal sizing to match Adicionar Comissão
    modal.style.width = "520px";
    modal.style.maxWidth = "calc(100% - 40px)";
    modal.style.height = "auto";
    modal.style.maxHeight = "none";
    modal.style.overflow = "visible";
    modal.style.zIndex = "12051";
    modal.style.background = modal.style.background || "#fff";
    modal.style.boxShadow =
      modal.style.boxShadow || "0 10px 40px rgba(0,0,0,0.12)";
    modal.style.display = "block";
    modal.style.visibility = "visible";
    modal.style.opacity = "1";
    modal.style.position = "relative";
    modal.style.transform = "none";
    modal.style.left = "unset";
    modal.style.top = "unset";
    modal.style.margin = "0";
    console.log("openAdicionarPerfilModal: overlay & modal appended", {
      overlay,
      modal,
      modalW: modal.offsetWidth,
      modalH: modal.offsetHeight,
    });
  } catch (e) {
    console.error("openAdicionarPerfilModal: styling error", e);
  }
  // ensure only the modal body scrolls if content is large (matching Adicionar Comissão behavior)
  try {
    const bodyEl = modal.querySelector(".modal-body");
    if (bodyEl) {
      bodyEl.style.maxHeight = "60vh";
      bodyEl.style.overflowY = "auto";
    }
  } catch (e) {
    console.debug("could not set modal body scroll", e);
  }
  // desativar autocomplete nos inputs do modal recém-criado
  try {
    disableAutocomplete(modal);
  } catch (e) {}

  const btnClose = modal.querySelector(".btn-close-modal");
  const btnSave = modal.querySelector(".btn-save-perfil");
  const inputDesc = modal.querySelector("#modalPerfilDescricao");

  if (prefill && prefill.descricao) inputDesc.value = prefill.descricao;

  function close() {
    try {
      overlay.remove();
    } catch (e) {}
    try {
      removeComissaoOverlays();
    } catch (e) {}
  }
  btnClose.addEventListener("click", function (e) {
    e.preventDefault();
    close();
  });
  // Não fechar ao clicar no overlay — clique fora é ignorado intencionalmente.

  btnSave.addEventListener("click", async function (e) {
    e.preventDefault();
    const desc = (inputDesc.value || "").toString().trim();
    if (!desc) {
      showToast("Informe a descrição", "warning");
      inputDesc.focus();
      return;
    }

    // determine tipo: use provided param or selected value in modal
    let actualTipo = tipo;
    try {
      const sel = modal.querySelector("#modalPerfilTipo");
      if (!actualTipo && sel) actualTipo = sel.value;
    } catch (e) {}

    console.log("🔄 Salvando perfil:", desc);
    console.log("📌 ApiClient disponível?", typeof ApiClient !== "undefined");

    // Salvar na API
    try {
      if (typeof ApiClient === "undefined") {
        throw new Error(
          "ApiClient não está disponível. Verifique se api-client.js foi carregado.",
        );
      }

      const perfil = {
        perfilVendedor: desc,
        descricao: `Perfil de comissão - ${desc}`,
        percentual: 0.0,
        tipo: actualTipo || "vendedor", // Salvar o tipo selecionado
      };

      console.log("📤 Enviando para API:", perfil);
      const resultado = await ApiClient.criarPerfilComissao(perfil);
      console.log("✅ Perfil criado na API:", resultado);
      showToast("Perfil salvo com sucesso!", "success", 2000);
    } catch (error) {
      console.error("❌ Erro ao salvar perfil na API:", error);
      showToast("Erro ao salvar perfil: " + error.message, "error", 4000);
      return;
    }

    // Fechar modal primeiro para evitar que fique visível durante reflows
    try {
      close();
    } catch (e) {}

    try {
      // garantir que a aba PERFIL esteja visível e atualizada
      abaAtiva = "perfil";
      // ativar botão da aba e conteúdo
      document
        .querySelectorAll(".tab-btn")
        .forEach((b) => b.classList.remove("active"));
      document
        .querySelectorAll(".tab-content")
        .forEach((c) => c.classList.remove("active"));
      const btnPerfil = document.querySelector('.tab-btn[data-tab="perfil"]');
      if (btnPerfil) btnPerfil.classList.add("active");
      const tabPerfil = document.getElementById("tab-perfil");
      if (tabPerfil) tabPerfil.classList.add("active");
      updateFiltersVisibility();
      // O evento 'perfis_comissao:updated' será disparado automaticamente pelo ApiClient
      // que vai chamar renderPerfis()
    } catch (e) {
      console.debug("erro atualizando perfis após salvar", e);
    }
  });
}

// Atualizar informações de paginação
function atualizarPaginacao() {
  const pageRange = document.getElementById("pageRange");
  const btnPrevPage = document.getElementById("btnPrevPage");
  const btnNextPage = document.getElementById("btnNextPage");

  // Permitir override temporário do total (usado quando filtramos somente itens com percentual)
  const totalItens =
    typeof window.__comissoesRenderTotal === "number"
      ? window.__comissoesRenderTotal
      : comissoesAtual.length;
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
    btnNextPage.disabled = paginaAtual >= totalPaginas || totalItens === 0;
  }
}

// Renderizar lista de perfis na aba PERFIL
async function renderPerfis() {
  try {
    const container = document.querySelector("#tab-perfil .perfil-info");
    if (!container) return;

    // Buscar perfis da API
    let perfis = [];
    try {
      console.log("📊 Buscando perfis de comissão da API...");
      const response = await ApiClient.getPerfisComissao();
      console.log("✅ Perfis recebidos da API:", response);

      if (response && Array.isArray(response)) {
        perfis = response
          .filter(
            (p) => p && p.perfilVendedor && p.perfilVendedor.trim() !== "",
          )
          .map((p) => ({
            nome: p.perfilVendedor.trim(),
            id: p.id,
            tipo: p.tipo || "vendedor", // Adicionar tipo
          }));
      }
    } catch (e) {
      console.error("❌ Erro ao buscar perfis da API:", e);
      showToast && showToast("Erro ao carregar perfis", "error");
    }

    // Aplicar filtro por tipo se houver
    if (currentFilter) {
      console.log(`🔍 Aplicando filtro: ${currentFilter}`);
      perfis = perfis.filter((p) => p.tipo === currentFilter);
    }

    // normalizar e únicos
    const uniqueNames = new Set();
    perfis = perfis.filter((p) => {
      if (uniqueNames.has(p.nome)) return false;
      uniqueNames.add(p.nome);
      return true;
    });

    console.log(
      "📋 Perfis a renderizar:",
      perfis.length,
      `(filtro: ${currentFilter || "nenhum"})`,
    );

    container.innerHTML = "";

    // Construir tabela no mesmo estilo da aba PERCENTUAL
    const table = document.createElement("table");
    table.className = "comissoes-table perfis-table";
    table.style.width = "100%";
    const thead = document.createElement("thead");
    thead.innerHTML = `<tr><th>Descrição</th><th style="width:60px">Editar</th><th style="width:60px">Excluir</th></tr>`;
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    tbody.id = "perfisTableBody";

    perfis.forEach((perfil, idx) => {
      const p = perfil.nome;
      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td class="descricao-cell">${p}</td>
                <td class="editar-cell"><button class="btn-icon btn-editar-perfil" data-perfil="${encodeURIComponent(p)}" title="Editar"><i class="fas fa-pen"></i></button></td>
                <td class="excluir-cell"><button class="btn-icon btn-excluir-perfil" data-perfil="${encodeURIComponent(p)}" data-perfil-id="${perfil.id || ""}" title="Excluir"><i class="fas fa-trash"></i></button></td>
            `;
      // clique na linha filtra e navega para PERCENTUAL
      tr.addEventListener("click", async function (e) {
        if (e.target.closest(".btn-icon")) return; // ignorar cliques nos botões
        const perfil = p;
        // Carregar comissões da API e filtrar
        try {
          const todasComissoes = await getCombinedComissoes();
          // filtrar tanto por perfilProduto quanto por perfilVendedor que coincidam com o perfil clicado
          comissoesAtual = todasComissoes.filter(
            (c) =>
              (c.perfilProduto || "").toString().trim() === perfil ||
              (c.perfilVendedor || "").toString().trim() === perfil,
          );
        } catch (e) {
          console.error("Erro ao filtrar comissões:", e);
          comissoesAtual = [];
        }
        paginaAtual = 1;
        // primeiro ativar a aba PERCENTUAL para que renderizarComissoes aplique o filtro correto
        try {
          abaAtiva = "percentual";
          document
            .querySelectorAll(".tab-btn")
            .forEach((b) => b.classList.remove("active"));
          document
            .querySelectorAll(".tab-content")
            .forEach((c) => c.classList.remove("active"));
          const btn = document.querySelector('.tab-btn[data-tab="percentual"]');
          if (btn) btn.classList.add("active");
          const tab = document.getElementById("tab-percentual");
          if (tab) tab.classList.add("active");
        } catch (e) {}
        renderizarComissoes();
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);

    // configurar botões de editar/excluir para perfis
    container.querySelectorAll(".btn-editar-perfil").forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const perfil = decodeURIComponent(this.dataset.perfil || "");
        try {
          openEditarPerfilModal(perfil);
        } catch (err) {
          console.debug("openEditarPerfilModal falhou", err);
        }
      });
    });

    container.querySelectorAll(".btn-excluir-perfil").forEach((btn) => {
      btn.addEventListener("click", async function (e) {
        e.stopPropagation();
        const perfil = decodeURIComponent(this.dataset.perfil || "");
        try {
          // Buscar todos os perfis de comissão da API
          if (
            typeof ApiClient !== "undefined" &&
            typeof ApiClient.getPerfisComissao === "function"
          ) {
            const perfis = await ApiClient.getPerfisComissao();
            // Encontrar perfis que correspondem ao nome
            const matches = perfis.filter(
              (p) =>
                (p.perfilVendedor || "").toLowerCase() ===
                  perfil.toLowerCase() ||
                (p.descricao || "").toLowerCase() === perfil.toLowerCase(),
            );

            // Deletar cada perfil encontrado
            for (const match of matches) {
              await ApiClient.deletarPerfilComissao(match.id);
              console.log(
                `✅ Perfil deletado: ${match.perfilVendedor || match.descricao}`,
              );
            }

            showToast &&
              showToast("Perfil(s) excluído(s) com sucesso", "success");
          }
        } catch (e) {
          console.error("Erro ao excluir perfil:", e);
          showToast &&
            showToast("Erro ao excluir perfil: " + (e.message || e), "error");
        }

        // Recarregar a lista combinada
        try {
          comissoesAtual = await getCombinedComissoes();
        } catch (e) {
          console.error("Erro ao recarregar comissões:", e);
        }

        renderPerfis();
        renderizarComissoes();
      });
    });
  } catch (err) {
    console.error("Erro renderPerfis", err);
  }
}

// Modal para editar uma comissão existente (PERCENTUAL)
function openEditarComissaoModal(index) {
  const comissao = comissoesAtual[index];
  if (!comissao) return;
  try {
    removeComissaoOverlays();
  } catch (e) {}
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay modal-centered-overlay";
  overlay.style.zIndex = 12050;
  const modal = document.createElement("div");
  modal.className = "modal modal-centered";
  modal.style.maxWidth = "640px";
  modal.style.width = "640px";
  modal.innerHTML = `
        <div class="modal-header">
            <h3 style="margin:0">Editar Percentual de Comissão</h3>
            <button type="button" class="btn btn-secondary btn-close-modal">Fechar</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label>Perfil de Produto <span style="color:#d00">*</span></label>
                <div class="input-with-icon">
                    <input type="text" id="modalPerfilProdutoEdit" class="form-control" placeholder="Perfil de Produto" />
                </div>
            </div>
            <div class="form-group">
                <label>Perfil de Vendedor/Fornecedor <span style="color:#d00">*</span></label>
                <div class="input-with-icon">
                    <input type="text" id="modalPerfilVendedorEdit" class="form-control" placeholder="Perfil de Vendedor/Fornecedor" />
                </div>
            </div>
            <div class="form-group">
                <label>Percentual: <span style="color:#d00">*</span></label>
                <input type="text" id="modalPercentualEdit" class="form-control" placeholder="Ex: 5%" />
            </div>
        </div>
        <div class="modal-footer" style="text-align:right">
            <button type="button" class="btn btn-primary btn-save-comissao-edit">Salvar</button>
        </div>
    `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  try {
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.background = overlay.style.background || "rgba(0,0,0,0.22)";
    // force modal visible and compact, avoid flex stretch
    modal.style.width = "520px";
    modal.style.maxWidth = "calc(100% - 40px)";
    modal.style.display = "block";
    modal.style.visibility = "visible";
    modal.style.opacity = "1";
    modal.style.zIndex = "12051";
    modal.style.background = modal.style.background || "#fff";
    modal.style.boxShadow =
      modal.style.boxShadow || "0 10px 40px rgba(0,0,0,0.12)";
    modal.style.alignSelf = "center";
    modal.style.height = "auto";
    modal.style.maxHeight = "80vh";
    modal.style.borderRadius = modal.style.borderRadius || "8px";
    modal.style.margin = "0";
    modal.style.position = "relative";
    modal.style.transform = "none";
    modal.style.left = "unset";
    modal.style.right = "unset";
    modal.style.marginLeft = "auto";
    modal.style.marginRight = "auto";
    // ensure modal body scroll if needed and remove big bottom whitespace
    try {
      const mb = modal.querySelector(".modal-body");
      if (mb) {
        mb.style.maxHeight = "60vh";
        mb.style.overflowY = "auto";
        mb.style.padding = "18px 20px";
      }
    } catch (e) {}
    console.log("openEditarComissaoModal: appended modal", {
      index,
      modalW: modal.offsetWidth,
      modalH: modal.offsetHeight,
    });
  } catch (e) {
    console.error("openEditarComissaoModal: styling error", e);
  }
  try {
    disableAutocomplete(modal);
  } catch (e) {}

  const btnClose = modal.querySelector(".btn-close-modal");
  const btnSave = modal.querySelector(".btn-save-comissao-edit");
  const inputPerfil = modal.querySelector("#modalPerfilProdutoEdit");
  const inputVendedor = modal.querySelector("#modalPerfilVendedorEdit");
  const inputPercentual = modal.querySelector("#modalPercentualEdit");

  try {
    attachPerfilDropdown(inputPerfil, "produto");
  } catch (e) {}
  try {
    attachPerfilDropdown(inputVendedor, "vendedor");
  } catch (e) {}

  inputPerfil.value = comissao.perfilProduto || "";
  inputVendedor.value = comissao.perfilVendedor || "";
  inputPercentual.value = comissao.percentual || "";

  function close() {
    try {
      overlay.remove();
    } catch (e) {}
    try {
      removeComissaoOverlays();
    } catch (e) {}
  }
  btnClose.addEventListener("click", function (e) {
    e.preventDefault();
    close();
  });
  // Clique fora do modal (overlay) NÃO fecha o modal — fechamento somente pelo botão 'Fechar'

  try {
    addQuickNewComissaoControl(
      "modalPerfilProdutoEdit",
      "comissoes_list",
      "Novo Perfil de Comissão",
    );
  } catch (e) {}
  try {
    addQuickNewComissaoControl(
      "modalPerfilVendedorEdit",
      "comissoes_list",
      "Novo Perfil de Comissão",
    );
  } catch (e) {}

  btnSave.addEventListener("click", async function (e) {
    e.preventDefault();
    const perfilProduto = (inputPerfil.value || "").toString().trim();
    const perfilVendedor = (inputVendedor.value || "").toString().trim();
    const percentual = (inputPercentual.value || "").toString().trim();
    if (!perfilProduto) {
      showToast("Informe Perfil de Produto", "warning");
      inputPerfil.focus();
      return;
    }
    if (!perfilVendedor) {
      showToast("Informe Perfil de Vendedor/Fornecedor", "warning");
      inputVendedor.focus();
      return;
    }
    if (!percentual) {
      showToast("Informe Percentual", "warning");
      inputPercentual.focus();
      return;
    }

    const updated = {
      perfilProduto: perfilProduto,
      perfilVendedor: perfilVendedor,
      percentual: percentual,
    };

    // Atualizar via API se a comissão tem ID
    if (comissao.id) {
      try {
        if (
          typeof ApiClient !== "undefined" &&
          typeof ApiClient.atualizarComissao === "function"
        ) {
          // Remover % do percentual se houver
          const percentualNumerico = parseFloat(
            percentual.toString().replace("%", ""),
          );

          await ApiClient.atualizarComissao(comissao.id, {
            perfilProduto: perfilProduto,
            perfilVendedor: perfilVendedor,
            percentual: percentualNumerico,
          });
          console.log(`✅ Comissão atualizada no banco (ID: ${comissao.id})`);
        }
      } catch (e) {
        console.error("Erro ao atualizar comissão:", e);
        showToast &&
          showToast("Erro ao atualizar: " + (e.message || e), "error");
        return;
      }
    }

    comissoesAtual[index] = updated;

    try {
      close();
    } catch (e) {}
    try {
      renderizarComissoes();
    } catch (e) {}
    showToast("Comissão atualizada", "success", 2000);
    // garantir que quaisquer overlays remanescentes sejam removidos
    try {
      removeComissaoOverlays();
    } catch (e) {}
    console.log("✅ Comissão atualizada");
  });
}

// Modal para editar um perfil (PERFIL)
function openEditarPerfilModal(perfil) {
  if (!perfil) return;
  try {
    removeComissaoOverlays();
  } catch (e) {}
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay modal-centered-overlay";
  overlay.style.zIndex = 12050;
  const modal = document.createElement("div");
  modal.className = "modal modal-centered";
  modal.style.maxWidth = "560px";
  modal.style.width = "520px";
  modal.innerHTML = `
        <div class="modal-header">
            <h3 style="margin:0">Editar Perfil</h3>
            <button type="button" class="btn btn-secondary btn-close-modal">Fechar</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label>Descrição do Perfil <span style="color:#d00">*</span></label>
                <input type="text" id="modalEditarPerfilInput" class="form-control" />
            </div>
        </div>
        <div class="modal-footer" style="text-align:right">
            <button type="button" class="btn btn-primary btn-save-perfil-edit">Salvar</button>
        </div>
    `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  try {
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.left = "0";
    overlay.style.top = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.background = overlay.style.background || "rgba(0,0,0,0.22)";
    // force modal visible and compact (defensive styling similar to editar comissao)
    modal.style.display = "block";
    modal.style.visibility = "visible";
    modal.style.opacity = "1";
    modal.style.zIndex = "12051";
    modal.style.background = modal.style.background || "#fff";
    modal.style.boxShadow =
      modal.style.boxShadow || "0 10px 40px rgba(0,0,0,0.12)";
    modal.style.maxWidth = modal.style.maxWidth || "560px";
    modal.style.width = modal.style.width || "520px";
    // use absolute centering inside full-viewport overlay to avoid flex conflicts
    modal.style.position = "absolute";
    modal.style.left = "50%";
    modal.style.top = "50%";
    modal.style.transform = "translate(-50%, -50%)";
    modal.style.height = "auto";
    modal.style.maxHeight = "80vh";
    modal.style.borderRadius = modal.style.borderRadius || "8px";
    modal.style.margin = "0";
    try {
      const mb = modal.querySelector(".modal-body");
      if (mb) {
        mb.style.maxHeight = "60vh";
        mb.style.overflowY = "auto";
        mb.style.padding = "18px 20px";
      }
    } catch (e) {}
    console.log("openEditarPerfilModal: appended modal", {
      perfil,
      modalW: modal.offsetWidth,
      modalH: modal.offsetHeight,
    });
  } catch (e) {
    console.error("openEditarPerfilModal: styling error", e);
  }
  try {
    disableAutocomplete(modal);
  } catch (e) {}

  const input = modal.querySelector("#modalEditarPerfilInput");
  const btnClose = modal.querySelector(".btn-close-modal");
  const btnSave = modal.querySelector(".btn-save-perfil-edit");
  input.value = perfil;

  function close() {
    try {
      overlay.remove();
    } catch (e) {}
    try {
      removeComissaoOverlays();
    } catch (e) {}
  }
  btnClose.addEventListener("click", function (e) {
    e.preventDefault();
    close();
  });
  // Clique fora do modal (overlay) NÃO fecha o modal — fechamento somente pelo botão 'Fechar'

  btnSave.addEventListener("click", async function (e) {
    e.preventDefault();
    const novo = (input.value || "").toString().trim();
    if (!novo) {
      showToast("Informe a descrição", "warning");
      input.focus();
      return;
    }

    // Buscar o ID do perfil pela API
    try {
      console.log("🔄 Buscando perfil para atualizar:", perfil);
      const perfis = await ApiClient.getPerfisComissao();
      const perfilObj = perfis.find((p) => p.perfilVendedor === perfil);

      if (perfilObj && perfilObj.id) {
        // Atualizar via API
        const dadosAtualizados = {
          perfilVendedor: novo,
          descricao: perfilObj.descricao,
          percentual: perfilObj.percentual,
          tipo: perfilObj.tipo,
        };

        await ApiClient.atualizarPerfilComissao(perfilObj.id, dadosAtualizados);
        console.log("✅ Perfil atualizado via API:", novo);
        showToast("Perfil atualizado com sucesso!", "success", 2000);

        // O evento 'perfis_comissao:updated' será disparado automaticamente
        // que vai atualizar a lista
      } else {
        console.warn("⚠️ Perfil não encontrado na API:", perfil);
        showToast("Perfil não encontrado", "warning");
      }
    } catch (error) {
      console.error("❌ Erro ao atualizar perfil:", error);
      showToast("Erro ao atualizar perfil", "error");
    }

    try {
      removeComissaoOverlays();
    } catch (e) {}
    close();
  });
}

// Event listener para atualizar a lista de perfis quando houver mudanças via API
window.addEventListener("perfis_comissao:updated", function () {
  console.log(
    "🔄 Evento perfis_comissao:updated recebido em comissao.js, atualizando lista...",
  );
  if (abaAtiva === "perfil") {
    try {
      renderPerfis();
      console.log("✅ Lista de perfis atualizada");
    } catch (e) {
      console.error("❌ Erro ao renderizar perfis:", e);
    }
  }
});
