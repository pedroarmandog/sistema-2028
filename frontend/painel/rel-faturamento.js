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

  // Inicializar funcionalidades do relatório
  inicializarRelatorioFaturamento();
});

// ========================================
// FUNCIONALIDADES DO RELATÓRIO DE FATURAMENTO
// ========================================

function inicializarRelatorioFaturamento() {
  console.log("🚀 Inicializando funcionalidades do Relatório de Faturamento");

  // Configurar data padrão
  configurarDataPadraoRel();

  // Configurar eventos dos botões
  configurarBotoesRel();

  // Configurar calendário
  inicializarCalendarioRel();

  // Configurar filtros
  configurarFiltrosRel();

  // Popular selects com dados da API (async)
  Promise.all([
    populateFiltroGrupo(),
    populateFiltroSubgrupo(""),
    populateFiltroMarca(),
    populateFiltroProfissional(),
    populateFiltroPerfilComissao(),
  ])
    .then(() => {
      console.log("✅ Todos os filtros populados com dados da API");

      // Transformar selects em dropdowns customizados DEPOIS de popular
      transformarSelectsEmCustom([
        "relatorioPor",
        "ordenacao",
        "apuracaoCusto",
        "filtroGrupo",
        "filtroSubgrupo",
        "filtroMarca",
        "filtroClienteRel",
        "filtroProfissionalRel",
        "filtroPerfilComissao",
        "filtroFornecedor",
      ]);
    })
    .catch((err) => {
      console.error("❌ Erro ao popular filtros:", err);
    });
}

function configurarDataPadraoRel() {
  const dataInicio = document.getElementById("dataInicioRel");
  const dataFim = document.getElementById("dataFimRel");

  if (dataInicio && dataFim) {
    const hoje = new Date();
    const dataFormatada = formatarDataRel(hoje);
    dataInicio.value = dataFormatada;
    dataFim.value = dataFormatada;
  }
}

function configurarBotoesRel() {
  const btnVisualizar = document.getElementById("btnVisualizarRel");
  const btnLimpar = document.getElementById("btnLimparRel");

  if (btnVisualizar) {
    btnVisualizar.addEventListener("click", function () {
      console.log("📊 Botão Visualizar Relatório clicado");
      visualizarRelatorioRel();
    });
  }

  if (btnLimpar) {
    btnLimpar.addEventListener("click", function () {
      console.log("🧹 Botão Limpar Relatório clicado");
      limparFiltrosRel();
    });
  }
}

function configurarFiltrosRel() {
  // Configurar eventos de mudança nos filtros
  const filtros = [
    "relatorioPor",
    "ordenacao",
    "apuracaoCusto",
    "filtroGrupo",
    "filtroSubgrupo",
    "filtroMarca",
    "filtroClienteRel",
    "filtroProfissionalRel",
    "filtroPerfilComissao",
    "filtroFornecedor",
  ];

  filtros.forEach((filtroId) => {
    const elemento = document.getElementById(filtroId);
    if (elemento) {
      elemento.addEventListener("change", function () {
        console.log(`🔍 Filtro ${filtroId} alterado:`, this.value);
      });
    }
  });

  // Configurar autocomplete no campo produto/serviço
  const produtoInput = document.getElementById("filtroProdutoServico");
  if (produtoInput) {
    // criar menu simples de sugestões logo abaixo
    function ensureProdutoWrapper() {
      // Se já envolver com custom-dropdown existe, retornar o menu dentro dele
      var parent = produtoInput.parentNode;
      if (
        parent &&
        parent.classList &&
        parent.classList.contains("custom-dropdown")
      ) {
        var existing = parent.querySelector(".custom-dropdown-menu");
        if (existing) return { wrapper: parent, menu: existing };
      }
      // Criar wrapper e mover input para dentro
      var wrapper = document.createElement("div");
      wrapper.className = "custom-dropdown";
      // inserir wrapper antes do input e mover input para dentro
      produtoInput.parentNode.insertBefore(wrapper, produtoInput);
      wrapper.appendChild(produtoInput);
      // aplicar classe toggle ao input
      produtoInput.classList.add("custom-dropdown-toggle");
      // criar menu com a mesma classe usada pelos outros dropdowns
      var menu = document.createElement("ul");
      menu.className = "custom-dropdown-menu";
      menu.setAttribute("role", "listbox");
      wrapper.appendChild(menu);
      return { wrapper: wrapper, menu: menu };
    }

    var produtoMenu = null;
    function showSuggestions(q) {
      fetchAndCacheProdutos()
        .then(function (list) {
          try {
            var res = ensureProdutoWrapper();
            var menu = res.menu;
            produtoMenu = menu;
            menu.innerHTML = "";
            var qlow = (q || "").toLowerCase();
            var matches = (list || [])
              .filter(function (name) {
                return !qlow || name.toLowerCase().indexOf(qlow) !== -1;
              })
              .slice(0, 50);
            if (!matches.length) {
              menu.style.display = "none";
              return;
            }
            matches.forEach(function (name) {
              var li = document.createElement("li");
              li.className = "custom-dropdown-item";
              li.textContent = name;
              li.tabIndex = 0;
              li.addEventListener("click", function (e) {
                e.stopPropagation();
                produtoInput.value = name;
                menu.style.display = "none";
              });
              li.addEventListener("keydown", function (e) {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  this.click();
                }
              });
              menu.appendChild(li);
            });
            menu.style.display = "block";
          } catch (e) {
            console.warn("autocomplete produtos erro", e);
          }
        })
        .catch(function (e) {
          console.debug("fetch produtos falhou", e);
        });
    }

    produtoInput.addEventListener("input", function () {
      const valor = this.value;
      if (valor.length >= 1) {
        showSuggestions(valor);
      } else {
        // se vazio, esconder menu caso exista
        try {
          var resHide =
            typeof ensureProdutoWrapper === "function"
              ? ensureProdutoWrapper()
              : null;
          if (resHide && resHide.menu) resHide.menu.style.display = "none";
        } catch (e) {}
      }
    });

    produtoInput.addEventListener("focus", function () {
      showSuggestions(this.value || "");
    });
    // fechar ao clicar fora: reutilizar listener existente para custom-dropdowns (genérico)
    document.addEventListener("click", function (e) {
      try {
        var wrapper =
          produtoInput.parentNode &&
          produtoInput.parentNode.classList &&
          produtoInput.parentNode.classList.contains("custom-dropdown")
            ? produtoInput.parentNode
            : null;
        if (!wrapper) return;
        if (!wrapper.contains(e.target)) {
          var menu = wrapper.querySelector(".custom-dropdown-menu");
          if (menu) menu.style.display = "none";
        }
      } catch (err) {}
    });
  }
}

// ========================================
// BUSCAR DADOS DA API (SEM LOCALSTORAGE)
// ========================================

// Buscar agrupamentos da API com cache
async function fetchAndCacheAgrupamentos() {
  if (window.__agrupamentos_cache) return window.__agrupamentos_cache;
  try {
    const agrupamentos = await ApiClient.getAgrupamentos();
    if (Array.isArray(agrupamentos)) {
      window.__agrupamentos_cache = agrupamentos;
      return agrupamentos;
    }
  } catch (e) {
    console.error("Erro ao buscar agrupamentos:", e);
  }
  return [];
}

// Buscar marcas da API com cache
async function fetchAndCacheMarcas() {
  if (window.__marcas_cache) return window.__marcas_cache;
  try {
    const marcas = await ApiClient.getMarcas();
    if (Array.isArray(marcas)) {
      window.__marcas_cache = marcas;
      return marcas;
    }
  } catch (e) {
    console.error("Erro ao buscar marcas:", e);
  }
  return [];
}

// Buscar produtos da API com cache
async function fetchAndCacheProdutos() {
  if (window.__produtos_cache) return window.__produtos_cache;
  var out = [];
  try {
    const produtos = await ApiClient.getProdutos();
    if (Array.isArray(produtos)) {
      produtos.forEach(function (p) {
        try {
          var n =
            p && (p.nome || p.name)
              ? (p.nome || p.name).toString().trim()
              : null;
          if (n && out.indexOf(n) === -1) out.push(n);
        } catch (e) {}
      });
    }
  } catch (e) {
    console.error("Erro ao buscar produtos:", e);
  }
  window.__produtos_cache = out;
  return out;
}

// Buscar clientes da API com cache
async function fetchAndCacheClientes() {
  if (window.__clientes_cache) return window.__clientes_cache;
  try {
    const clientes = await ApiClient.getClientes();
    if (Array.isArray(clientes)) {
      const nomes = clientes.map((c) => c.nome || c.name || "").filter(Boolean);
      window.__clientes_cache = nomes;
      return nomes;
    }
  } catch (e) {
    console.error("Erro ao buscar clientes:", e);
  }
  return [];
}

// Busca incremental de clientes via API (sem cache)
async function searchClientes(q) {
  if (!q || !q.trim()) return [];
  try {
    const clientes = await ApiClient.getClientes();
    if (Array.isArray(clientes)) {
      const query = q.toLowerCase();
      return clientes
        .filter((c) => {
          const nome = (c.nome || c.name || "").toLowerCase();
          return nome.indexOf(query) !== -1;
        })
        .map((c) => c.nome || c.name || "")
        .filter(Boolean);
    }
  } catch (e) {
    console.error("Erro ao buscar clientes:", e);
  }
  return [];
}

// Buscar profissionais da API com cache
async function fetchAndCacheProfissionais() {
  if (window.__profissionais_cache) return window.__profissionais_cache;
  try {
    const profissionais = await ApiClient.getProfissionais();
    if (Array.isArray(profissionais) && profissionais.length) {
      var out = [];
      profissionais.forEach(function (p) {
        try {
          var n =
            p && (p.nome || p.name)
              ? (p.nome || p.name).toString().trim()
              : null;
          if (n && out.indexOf(n) === -1) out.push(n);
        } catch (e) {}
      });
      window.__profissionais_cache = out;
      return out;
    }
  } catch (e) {
    console.error("Erro ao buscar profissionais:", e);
  }
  return [];
}

// Buscar perfis de comissão da API com cache
async function fetchAndCachePerfisComissao() {
  if (window.__perfis_comissao_cache) return window.__perfis_comissao_cache;
  try {
    const perfis = await ApiClient.getPerfisComissao();
    if (Array.isArray(perfis)) {
      const nomes = perfis.map((p) => p.perfilVendedor || "").filter(Boolean);
      window.__perfis_comissao_cache = nomes;
      return nomes;
    }
  } catch (e) {
    console.error("Erro ao buscar perfis de comissão:", e);
  }
  return [];
}

// ========================================
// POPULAR FILTROS COM DADOS DA API
// ========================================

// Popular select de Grupo
async function populateFiltroGrupo() {
  var sel = document.getElementById("filtroGrupo");
  if (!sel) return;

  sel.innerHTML = "";
  var oTodos = document.createElement("option");
  oTodos.value = "";
  oTodos.text = "Todos";
  sel.appendChild(oTodos);

  const agrupamentos = await fetchAndCacheAgrupamentos();
  const added = new Set();

  agrupamentos.forEach(function (g) {
    const name = g && g.nome ? g.nome : "";
    const key = name.toLowerCase();
    if (!name || added.has(key)) return;
    var o = document.createElement("option");
    o.value = name;
    o.text = name;
    sel.appendChild(o);
    added.add(key);
  });

  rebuildCustomDropdownMenu("filtroGrupo");
}

// Popular select de Subgrupo
async function populateFiltroSubgrupo(groupName) {
  var sel = document.getElementById("filtroSubgrupo");
  if (!sel) return;

  sel.innerHTML = "";
  var oTodos = document.createElement("option");
  oTodos.value = "";
  oTodos.text = "Todos";
  sel.appendChild(oTodos);

  const agrupamentos = await fetchAndCacheAgrupamentos();

  if (!groupName) {
    // Mostrar todos os subgrupos
    agrupamentos.forEach(function (g) {
      if (!Array.isArray(g.subgrupos)) return;
      g.subgrupos.forEach(function (s) {
        if (!s) return;
        var o = document.createElement("option");
        o.value = (g.nome || "") + "||" + s;
        o.text = s + " (" + (g.nome || "") + ")";
        sel.appendChild(o);
      });
    });
  } else {
    // Mostrar apenas subgrupos do grupo selecionado
    const found = agrupamentos.find(function (g) {
      return (g.nome || "").toLowerCase() === groupName.toLowerCase();
    });

    if (found && Array.isArray(found.subgrupos)) {
      found.subgrupos.forEach(function (s) {
        if (!s) return;
        var o = document.createElement("option");
        o.value = groupName + "||" + s;
        o.text = s;
        sel.appendChild(o);
      });
    }
  }

  rebuildCustomDropdownMenu("filtroSubgrupo");
}

// Popular select de Marca
async function populateFiltroMarca() {
  var sel = document.getElementById("filtroMarca");
  if (!sel) return;

  sel.innerHTML = "";
  var oTodas = document.createElement("option");
  oTodas.value = "";
  oTodas.text = "Todas";
  sel.appendChild(oTodas);

  const marcas = await fetchAndCacheMarcas();
  marcas.forEach(function (marca) {
    if (!marca || !marca.nome) return;
    var o = document.createElement("option");
    o.value = marca.nome;
    o.text = marca.nome;
    sel.appendChild(o);
  });

  rebuildCustomDropdownMenu("filtroMarca");
}

// Popular select de Perfil de Comissão
async function populateFiltroPerfilComissao() {
  var sel = document.getElementById("filtroPerfilComissao");
  if (!sel) return;

  sel.innerHTML = "";
  var oTodos = document.createElement("option");
  oTodos.value = "";
  oTodos.text = "Todos";
  sel.appendChild(oTodos);

  const perfis = await fetchAndCachePerfisComissao();
  perfis.forEach(function (name) {
    if (!name) return;
    var o = document.createElement("option");
    o.value = name;
    o.text = name;
    sel.appendChild(o);
  });

  rebuildCustomDropdownMenu("filtroPerfilComissao");
}

// Popular select de Profissional
async function populateFiltroProfissional() {
  var sel = document.getElementById("filtroProfissionalRel");
  if (!sel) return;

  sel.innerHTML = "";
  var oTodos = document.createElement("option");
  oTodos.value = "";
  oTodos.text = "Todos";
  sel.appendChild(oTodos);

  const profissionais = await fetchAndCacheProfissionais();
  profissionais.forEach(function (name) {
    if (!name) return;
    var o = document.createElement("option");
    o.value = name;
    o.text = name;
    sel.appendChild(o);
  });

  rebuildCustomDropdownMenu("filtroProfissionalRel");
}

// Reconstrói o menu customizado de um select transformado
function rebuildCustomDropdownMenu(selectId) {
  try {
    var sel = document.getElementById(selectId);
    if (!sel) return;
    var wrapper = sel.previousElementSibling;
    if (!wrapper || !wrapper.classList.contains("custom-dropdown")) return;
    var menu = wrapper.querySelector(".custom-dropdown-menu");
    var toggle = wrapper.querySelector(".custom-dropdown-toggle");
    if (!menu) return;
    menu.innerHTML = "";
    Array.from(sel.options).forEach(function (opt) {
      var li = document.createElement("li");
      li.className = "custom-dropdown-item";
      li.textContent = opt.text;
      li.dataset.value = opt.value;
      li.tabIndex = 0;
      li.addEventListener("click", function (e) {
        e.stopPropagation();
        sel.value = this.dataset.value;
        if (toggle) {
          if (toggle.tagName === "INPUT") toggle.value = this.textContent;
          else toggle.textContent = this.textContent;
        }
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        wrapper.classList.remove("open");
      });
      li.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.click();
        }
      });
      menu.appendChild(li);
    });
  } catch (e) {}
}

// Transformar select padrão em dropdown customizado mantendo sincronização
// Transformar um select nativo em um dropdown customizado (mantém sincronização)
function transformarSelectEmCustom(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  if (select.dataset.customized === "true") return;

  // esconder select original mantendo acessibilidade
  select.style.display = "none";

  const wrapper = document.createElement("div");
  wrapper.className = "custom-dropdown";

  const isMarca = selectId === "filtroMarca";
  const isCliente = selectId === "filtroClienteRel";
  const isProfissional = selectId === "filtroProfissionalRel";
  const isFornecedor = selectId === "filtroFornecedor";
  // Se for fornecedor, forçar apenas 'Todos' e bloquear alteração
  if (isFornecedor) {
    try {
      select.innerHTML = "";
      var oTodasF = document.createElement("option");
      oTodasF.value = "";
      oTodasF.text = "Todos";
      select.appendChild(oTodasF);
      select.value = "";
      select.disabled = true;
      select.setAttribute("data-locked-fornecedor", "true");
    } catch (e) {}
  }
  var toggle;
  // criar input para Marca/Cliente/Profissional (typeahead), caso contrário botão
  if (isMarca || isCliente || isProfissional) {
    toggle = document.createElement("input");
    toggle.type = "text";
    toggle.className = "custom-dropdown-toggle";
    toggle.placeholder = select.options[select.selectedIndex]?.text || "Todos";
    // deixar o campo vazio inicialmente, mostrando apenas placeholder
    toggle.value = "";
  } else {
    toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "custom-dropdown-toggle";
    toggle.textContent =
      select.options[select.selectedIndex]?.text || "Selecionar";
  }

  const menu = document.createElement("ul");
  menu.className = "custom-dropdown-menu";
  menu.setAttribute("role", "listbox");

  Array.from(select.options).forEach((opt) => {
    const li = document.createElement("li");
    li.className = "custom-dropdown-item";
    li.textContent = opt.text;
    li.dataset.value = opt.value;
    li.tabIndex = 0;
    li.addEventListener("click", function (e) {
      e.stopPropagation();
      select.value = this.dataset.value;
      if (isMarca) toggle.value = this.textContent;
      else toggle.textContent = this.textContent;
      const ev = new Event("change", { bubbles: true });
      select.dispatchEvent(ev);
      wrapper.classList.remove("open");
    });
    li.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.click();
      }
    });
    menu.appendChild(li);
  });

  if (isMarca || isCliente || isProfissional) {
    // abrir ao focar e filtrar conforme digita
    // debounce util (local)
    function debounce(fn, wait) {
      var t;
      return function () {
        var ctx = this,
          args = arguments;
        clearTimeout(t);
        t = setTimeout(function () {
          fn.apply(ctx, args);
        }, wait);
      };
    }

    toggle.addEventListener("focus", function () {
      wrapper.classList.add("open");
      // don't preload all clients to avoid cost; only prepare menu shell
      if (isCliente) {
        // ensure menu is empty (will be filled on input)
        menu.innerHTML = "";
      }
      // for profissional, keep previous behavior (populate on focus)
      try {
        if (isProfissional) {
          fetchAndCacheProfissionais().then(function () {
            populateFiltroProfissional();
          });
        }
      } catch (e) {}
    });

    // input handler: marca uses local filtering; cliente fetcha sob demanda; profissional usa existing list
    toggle.addEventListener(
      "input",
      debounce(function () {
        var qRaw = this.value || "";
        var q = qRaw.toLowerCase();
        if (isMarca) {
          var items = menu.querySelectorAll(".custom-dropdown-item");
          items.forEach(function (it) {
            var txt = (it.textContent || "").toLowerCase();
            it.style.display = txt.indexOf(q) !== -1 ? "" : "none";
          });
          return;
        }

        if (isCliente) {
          // busca incremental via API (com fallback)
          if (!qRaw || !qRaw.trim()) {
            menu.innerHTML = "";
            menu.style.display = "none";
            return;
          }
          searchClientes(qRaw)
            .then(function (list) {
              try {
                menu.innerHTML = "";
                var matches = (list || []).slice(0, 100);
                if (!matches.length) {
                  menu.style.display = "none";
                  return;
                }
                matches.forEach(function (name) {
                  var li = document.createElement("li");
                  li.className = "custom-dropdown-item";
                  li.textContent = name;
                  li.tabIndex = 0;
                  li.addEventListener("click", function (e) {
                    e.stopPropagation();
                    select.value = this.textContent;
                    toggle.value = this.textContent;
                    // fechar menu e remover foco para garantir comportamento esperado
                    try {
                      menu.style.display = "none";
                    } catch (_) {}
                    try {
                      wrapper.classList.remove("open");
                    } catch (_) {}
                    try {
                      if (typeof toggle.blur === "function") toggle.blur();
                    } catch (_) {}
                    select.dispatchEvent(
                      new Event("change", { bubbles: true }),
                    );
                  });
                  li.addEventListener("keydown", function (e) {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      this.click();
                    }
                  });
                  menu.appendChild(li);
                });
                menu.style.display = "block";
              } catch (e) {
                console.warn("erro filtrar clientes", e);
              }
            })
            .catch(function (e) {
              console.debug("search clientes falhou", e);
            });
          return;
        }

        if (isProfissional) {
          var itemsP = menu.querySelectorAll(".custom-dropdown-item");
          itemsP.forEach(function (it) {
            var txt = (it.textContent || "").toLowerCase();
            it.style.display = txt.indexOf(q) !== -1 ? "" : "none";
          });
          return;
        }
      }, 200),
    );
    // abrir menu ao clicar no input
    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      wrapper.classList.add("open");
    });
  } else {
    if (isFornecedor) {
      // não permitir abrir/alterar
      try {
        if (toggle.tagName === "INPUT") {
          toggle.value = select.options[select.selectedIndex]?.text || "Todos";
          toggle.readOnly = true;
        } else {
          toggle.textContent =
            select.options[select.selectedIndex]?.text || "Todos";
          toggle.setAttribute("disabled", "true");
        }
        toggle.classList.add("locked");
      } catch (e) {}
    } else {
      toggle.addEventListener("click", function (e) {
        e.stopPropagation();
        wrapper.classList.toggle("open");
      });
    }
  }

  // fechar ao clicar fora
  document.addEventListener("click", function (e) {
    if (!wrapper.contains(e.target)) wrapper.classList.remove("open");
  });

  wrapper.appendChild(toggle);
  wrapper.appendChild(menu);
  select.parentNode.insertBefore(wrapper, select);
  select.dataset.customized = "true";

  // se o populate marcou que precisa rebuildar, faz isso agora
  try {
    if (isMarca && window.__filtroMarca_needsRebuild) {
      rebuildCustomDropdownMenu("filtroMarca");
      window.__filtroMarca_needsRebuild = false;
    }
    // cliente/profissional também podem necessitar rebuild se populated antes da transformação
    if (
      selectId === "filtroClienteRel" &&
      window.__filtroCliente_needsRebuild
    ) {
      rebuildCustomDropdownMenu("filtroClienteRel");
      window.__filtroCliente_needsRebuild = false;
    }
    if (
      selectId === "filtroProfissionalRel" &&
      window.__filtroProfissional_needsRebuild
    ) {
      rebuildCustomDropdownMenu("filtroProfissionalRel");
      window.__filtroProfissional_needsRebuild = false;
    }
    if (
      selectId === "filtroPerfilComissao" &&
      window.__filtroPerfilComissao_needsRebuild
    ) {
      rebuildCustomDropdownMenu("filtroPerfilComissao");
      window.__filtroPerfilComissao_needsRebuild = false;
    }
  } catch (e) {}
}

// Transformar múltiplos selects por IDs
function transformarSelectsEmCustom(ids) {
  if (!Array.isArray(ids)) return;
  ids.forEach((id) => transformarSelectEmCustom(id));
}

// ========================================
// CALENDÁRIO PERSONALIZADO
// ========================================

let calendarioRel = {
  mes: new Date().getMonth(),
  ano: new Date().getFullYear(),
  dataInicio: null,
  dataFim: null,
  selecionandoInicio: true,
  hoverDate: null,
};

function inicializarCalendarioRel() {
  console.log("📅 Inicializando calendário do relatório");

  const periodoAnalise = document.getElementById("periodoAnaliseRel");
  const dataInicio = document.getElementById("dataInicioRel");
  const dataFim = document.getElementById("dataFimRel");
  const calendarioPopup = document.getElementById("calendarioPopupRel");

  if (periodoAnalise && calendarioPopup) {
    // Abrir calendário ao clicar no período ou nos inputs
    periodoAnalise.addEventListener("click", function (e) {
      e.stopPropagation();
      console.log("📅 Clique no período de análise - abrindo calendário");
      abrirCalendarioRel();
    });

    if (dataInicio) {
      dataInicio.addEventListener("click", function (e) {
        e.stopPropagation();
        console.log("📅 Clique no input de data início");
        abrirCalendarioRel();
      });
    }

    if (dataFim) {
      dataFim.addEventListener("click", function (e) {
        e.stopPropagation();
        console.log("📅 Clique no input de data fim");
        abrirCalendarioRel();
      });
    }

    // Fechar calendário ao clicar fora
    document.addEventListener("click", function (e) {
      if (
        !calendarioPopup.contains(e.target) &&
        !periodoAnalise.contains(e.target)
      ) {
        fecharCalendarioRel();
      }
    });

    // Configurar navegação do calendário
    configurarNavegacaoCalendarioRel();

    // Configurar botões do calendário
    configurarBotoesCalendarioRel();

    // Gerar calendário inicial
    gerarCalendarioRel();
  }
}

function configurarNavegacaoCalendarioRel() {
  const btnMesAnterior = document.getElementById("btnMesAnteriorRel");
  const btnProximoMes = document.getElementById("btnProximoMesRel");

  if (btnMesAnterior) {
    btnMesAnterior.addEventListener("click", function () {
      calendarioRel.mes--;
      if (calendarioRel.mes < 0) {
        calendarioRel.mes = 11;
        calendarioRel.ano--;
      }
      gerarCalendarioRel();
    });
  }

  if (btnProximoMes) {
    btnProximoMes.addEventListener("click", function () {
      calendarioRel.mes++;
      if (calendarioRel.mes > 11) {
        calendarioRel.mes = 0;
        calendarioRel.ano++;
      }
      gerarCalendarioRel();
    });
  }
}

function configurarBotoesCalendarioRel() {
  const btnCancelar = document.getElementById("btnCalendarioCancelarRel");
  const btnAplicar = document.getElementById("btnCalendarioAplicarRel");

  if (btnCancelar) {
    btnCancelar.addEventListener("click", function () {
      fecharCalendarioRel();
    });
  }

  if (btnAplicar) {
    btnAplicar.addEventListener("click", function () {
      aplicarDatasCalendarioRel();
    });
  }
}

function abrirCalendarioRel() {
  console.log("📅 [abrirCalendarioRel] Função chamada");
  const calendarioPopup = document.getElementById("calendarioPopupRel");
  const dataInicio = document.getElementById("dataInicioRel");
  const dataFim = document.getElementById("dataFimRel");

  console.log("📅 Elementos encontrados:", {
    calendarioPopup: !!calendarioPopup,
    dataInicio: !!dataInicio,
    dataFim: !!dataFim,
  });

  // Carregar datas atuais
  if (dataInicio && dataInicio.value) {
    calendarioRel.dataInicio = parseDataRel(dataInicio.value);
    console.log("📅 Data início carregada:", calendarioRel.dataInicio);
  }
  if (dataFim && dataFim.value) {
    calendarioRel.dataFim = parseDataRel(dataFim.value);
    console.log("📅 Data fim carregada:", calendarioRel.dataFim);
  }

  calendarioRel.selecionandoInicio = true;
  calendarioRel.hoverDate = null;

  if (calendarioPopup) {
    // Garantir que outros calendários globais sejam fechados
    try {
      if (typeof window.fecharCalendarioSidebar === "function") {
        window.fecharCalendarioSidebar();
      }
    } catch (e) {
      console.debug("fecharCalendarioSidebar não disponível", e);
    }

    try {
      if (typeof window.esconderCalendario === "function") {
        window.esconderCalendario();
      }
    } catch (e) {
      console.debug("esconderCalendario não disponível", e);
    }

    console.log("📅 Adicionando classe show ao popup");
    calendarioPopup.classList.add("show");
    calendarioPopup.style.zIndex = "1000010";

    gerarCalendarioRel();

    // Posicionar o popup
    try {
      const periodoAnalise = document.getElementById("periodoAnaliseRel");
      if (periodoAnalise) {
        requestAnimationFrame(() => {
          const computedWidth = calendarioPopup.offsetWidth || 420;
          const preferred = Math.min(
            computedWidth,
            Math.max(320, window.innerWidth - 40),
          );

          calendarioPopup.style.transform = "none";

          const rect = periodoAnalise.getBoundingClientRect();
          let left = Math.round(
            rect.left + window.pageXOffset + rect.width / 2 - preferred / 2,
          );
          let top = Math.round(rect.bottom + window.pageYOffset + 8);

          if (left + preferred > window.innerWidth - 12) {
            left = Math.max(12, window.innerWidth - preferred - 12);
          }
          if (left < 12) left = 12;

          calendarioPopup.style.left = left + "px";
          calendarioPopup.style.top = top + "px";

          console.log("📅 Popup posicionado em:", { left, top });
        });
      }
    } catch (err) {
      console.error("📅 Erro ao posicionar popup:", err);
    }

    console.log("✅ Calendário aberto com sucesso");
  } else {
    console.error("❌ Elemento calendarioPopupRel não encontrado!");
  }
}

function fecharCalendarioRel() {
  console.log("📅 fecharCalendarioRel called");
  const calendarioPopup = document.getElementById("calendarioPopupRel");
  if (calendarioPopup) {
    calendarioPopup.classList.remove("show");
    calendarioRel.hoverDate = null;
  }
}

function gerarCalendarioRel() {
  const mesAnoElement = document.getElementById("mesAnoAtualRel");
  const diasCalendario = document.getElementById("diasCalendarioRel");

  if (!mesAnoElement || !diasCalendario) return;

  // header será atualizado abaixo com os dois meses

  // Limpar dias
  diasCalendario.innerHTML = "";

  // Renderizar dois meses lado-a-lado: mês atual e próximo mês
  const mes1 = calendarioRel.mes;
  const ano1 = calendarioRel.ano;
  let mes2 = mes1 + 1;
  let ano2 = ano1;
  if (mes2 > 11) {
    mes2 = 0;
    ano2 = ano1 + 1;
  }

  // Mostrar ambos nomes no header
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
  mesAnoElement.textContent = `${nomesMeses[mes1]} ${ano1}  —  ${nomesMeses[mes2]} ${ano2}`;

  // Wrapper para os dois meses
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.gap = "18px";
  wrapper.style.justifyContent = "center";

  // Função local que gera o grid de um mês dentro de um container
  function gerarMes(mes, ano) {
    const container = document.createElement("div");
    container.className = "mes-container";
    container.style.minWidth = "260px";

    // título do mês (interno) removido — o cabeçalho global já mostra os nomes dos meses

    const grid = document.createElement("div");
    grid.className = "mes-days-grid";
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(7, 1fr)";
    grid.style.gap = "6px";

    // Primeiro e último dia
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);

    const diasAnterior = primeiroDia.getDay();
    const mesAnterior = new Date(ano, mes, 0);

    for (let i = diasAnterior - 1; i >= 0; i--) {
      const dia = mesAnterior.getDate() - i;
      criarDiaCalendarioRel(dia, true, mes - 1, ano, grid);
    }

    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      criarDiaCalendarioRel(dia, false, mes, ano, grid);
    }

    // Preencher até completar 42 células (6 semanas)
    const totalPreenchido = diasAnterior + ultimoDia.getDate();
    const restantes = Math.max(0, 42 - totalPreenchido);
    for (let d = 1; d <= restantes; d++) {
      criarDiaCalendarioRel(d, true, mes + 1, ano, grid);
    }

    container.appendChild(grid);
    return container;
  }

  // Adicionar mês 1 e mês 2
  wrapper.appendChild(gerarMes(mes1, ano1));
  wrapper.appendChild(gerarMes(mes2, ano2));

  diasCalendario.appendChild(wrapper);
}

function criarDiaCalendarioRel(numeroDia, outroMes, mes, ano, container) {
  const diasContainer =
    container || document.getElementById("diasCalendarioRel");
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

  if (outroMes) {
    diaElement.classList.add("outros-mes");
  }

  // Destacar hoje
  if (dataAtual.getTime() === hoje.getTime() && !outroMes) {
    diaElement.classList.add("hoje");
  }

  // Destacar datas selecionadas
  if (
    calendarioRel.dataInicio &&
    datasSaoIguaisRel(dataAtual, calendarioRel.dataInicio)
  ) {
    diaElement.classList.add("inicio-periodo");
  }

  if (
    calendarioRel.dataFim &&
    datasSaoIguaisRel(dataAtual, calendarioRel.dataFim)
  ) {
    diaElement.classList.add("fim-periodo");
  }

  // Destacar período
  if (
    calendarioRel.dataInicio &&
    calendarioRel.dataFim &&
    dataAtual > calendarioRel.dataInicio &&
    dataAtual < calendarioRel.dataFim
  ) {
    diaElement.classList.add("periodo-range");
  }

  // armazenar data ISO para atualizações rápidas sem re-render
  diaElement.dataset.dateIso = dataAtual.toISOString().slice(0, 10);

  // Evento de clique (evitar que clicks dentro do popup borbulhem e fechem o calendário)
  diaElement.addEventListener("click", function (e) {
    console.log("📅 dia click:", dataAtual);
    e.stopPropagation();
    // e.preventDefault(); // não necessário para divs
    selecionarDataCalendarioRel(dataAtual);
  });

  // Evento de hover para marcar o range provisório sem re-render completo
  diaElement.addEventListener("mouseenter", function () {
    if (!calendarioRel.selecionandoInicio && calendarioRel.dataInicio) {
      console.log("📅 dia mouseenter (hover):", dataAtual);
      calendarioRel.hoverDate = dataAtual;
      atualizarHoverVisualRel();
    }
  });

  diaElement.addEventListener("mouseleave", function () {
    if (calendarioRel.hoverDate) {
      calendarioRel.hoverDate = null;
      atualizarHoverVisualRel();
    }
  });

  diasContainer.appendChild(diaElement);
}

function selecionarDataCalendarioRel(data) {
  if (calendarioRel.selecionandoInicio) {
    calendarioRel.dataInicio = new Date(data);
    calendarioRel.dataFim = null;
    calendarioRel.selecionandoInicio = false;
  } else {
    if (data < calendarioRel.dataInicio) {
      calendarioRel.dataFim = calendarioRel.dataInicio;
      calendarioRel.dataInicio = new Date(data);
    } else {
      calendarioRel.dataFim = new Date(data);
    }
    calendarioRel.selecionandoInicio = true;
  }

  gerarCalendarioRel();

  // Atualizar inputs imediatamente (sem fechar o popup)
  atualizarInputsRel();

  console.log(
    "📅 selecionarDataCalendarioRel - dataInicio:",
    calendarioRel.dataInicio,
    "dataFim:",
    calendarioRel.dataFim,
    "selecionandoInicio:",
    calendarioRel.selecionandoInicio,
  );

  // Se a segunda data foi escolhida, fechar o popup e notificar o usuário
  if (calendarioRel.dataFim) {
    console.log("📅 Segunda data selecionada — fechando popup em breve");
    // pequeno delay para que o input seja atualizado visualmente antes do fechamento
    setTimeout(() => {
      console.log("📅 fechando popup agora");
      fecharCalendarioRel();
      mostrarNotificacaoRel("Período selecionado com sucesso!", "success");
    }, 60);
  }
}

function atualizarInputsRel() {
  const dataInicioEl = document.getElementById("dataInicioRel");
  const dataFimEl = document.getElementById("dataFimRel");
  if (dataInicioEl && calendarioRel.dataInicio) {
    dataInicioEl.value = formatarDataRel(calendarioRel.dataInicio);
  }
  if (dataFimEl) {
    if (calendarioRel.dataFim) {
      dataFimEl.value = formatarDataRel(calendarioRel.dataFim);
    } else if (calendarioRel.dataInicio) {
      // enquanto não escolheu o fim, mostrar a mesma data no fim (comportamento consistente)
      dataFimEl.value = formatarDataRel(calendarioRel.dataInicio);
    }
  }
  console.log(
    "📅 atualizarInputsRel - dataInicioEl.value=",
    dataInicioEl?.value,
    "dataFimEl.value=",
    dataFimEl?.value,
  );
}

function atualizarHoverVisualRel() {
  const dias = document.querySelectorAll("#diasCalendarioRel .dia");
  if (!dias || dias.length === 0) return;

  // limpar estados prévios
  dias.forEach((d) => {
    d.classList.remove("hover-range");
    d.classList.remove("hover-target");
  });

  if (!calendarioRel.dataInicio || !calendarioRel.hoverDate) return;

  // normalizar intervalo entre dataInicio e hoverDate
  const start =
    calendarioRel.dataInicio.getTime() <= calendarioRel.hoverDate.getTime()
      ? calendarioRel.dataInicio
      : calendarioRel.hoverDate;
  const end =
    calendarioRel.dataInicio.getTime() > calendarioRel.hoverDate.getTime()
      ? calendarioRel.dataInicio
      : calendarioRel.hoverDate;

  dias.forEach((d) => {
    const iso = d.dataset.dateIso;
    if (!iso) return;
    const parts = iso.split("-");
    const dt = new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2]),
    );
    if (dt.getTime() > start.getTime() && dt.getTime() < end.getTime()) {
      d.classList.add("hover-range");
    }
    if (dt.getTime() === calendarioRel.hoverDate.getTime()) {
      d.classList.add("hover-target");
    }
  });
}

function aplicarDatasCalendarioRel() {
  const dataInicio = document.getElementById("dataInicioRel");
  const dataFim = document.getElementById("dataFimRel");

  if (calendarioRel.dataInicio && dataInicio) {
    dataInicio.value = formatarDataRel(calendarioRel.dataInicio);
  }

  if (calendarioRel.dataFim && dataFim) {
    dataFim.value = formatarDataRel(calendarioRel.dataFim);
  } else if (calendarioRel.dataInicio && dataFim) {
    dataFim.value = formatarDataRel(calendarioRel.dataInicio);
  }

  fecharCalendarioRel();
  mostrarNotificacaoRel("Período selecionado com sucesso!", "success");
}

function visualizarRelatorioRel() {
  const filtros = coletarFiltrosRel();

  console.log("📊 Gerando relatório de faturamento com filtros:", filtros);

  // Validar período
  if (!filtros.dataInicio || !filtros.dataFim) {
    mostrarNotificacaoRel(
      "Por favor, selecione o período de análise.",
      "warning",
    );
    return;
  }

  const dataInicioObj = parseDataRel(filtros.dataInicio);
  const dataFimObj = parseDataRel(filtros.dataFim);

  if (dataInicioObj > dataFimObj) {
    mostrarNotificacaoRel(
      "A data de início não pode ser maior que a data final.",
      "error",
    );
    return;
  }

  // Gerar PDF com logo da empresa
  gerarPDFFaturamento(filtros);
}

async function gerarPDFFaturamento(filtros) {
  try {
    // Obter empresa diretamente do backend
    let companyRazao = "SUA EMPRESA";
    let companyLogo = null;

    try {
      console.log("📋 Buscando dados da empresa do backend...");
      const empresas = await ApiClient.getEmpresas();

      if (Array.isArray(empresas) && empresas.length > 0) {
        const empresa = empresas[0]; // Primeira empresa cadastrada
        companyRazao =
          empresa.razaoSocial || empresa.nomeFantasia || companyRazao;

        // Buscar logo da empresa se existir
        if (empresa.logo) {
          // Logo é um caminho de arquivo no servidor, precisamos buscar como base64
          try {
            const logoUrl = `/uploads/${empresa.logo}`;
            const response = await fetch(logoUrl);
            if (response.ok) {
              const blob = await response.blob();
              const reader = new FileReader();
              await new Promise((resolve) => {
                reader.onloadend = () => {
                  companyLogo = reader.result;
                  resolve();
                };
                reader.readAsDataURL(blob);
              });
              console.log("🖼️ Logo carregada do servidor");
            }
          } catch (logoErr) {
            console.warn("⚠️ Erro ao carregar logo:", logoErr);
          }
        }

        console.log("🏢 Razão Social:", companyRazao);
        console.log("🖼️ Logo:", companyLogo ? "Carregada" : "Não disponível");
      } else {
        console.warn("⚠️ Nenhuma empresa cadastrada no sistema");
      }
    } catch (e) {
      console.error("❌ Erro ao buscar empresa:", e);
    }

    // Buscar vendas reais do banco de dados
    console.log(
      "📊 Buscando vendas do período:",
      filtros.dataInicio,
      "até",
      filtros.dataFim,
    );

    // Converter dd/mm/yyyy → yyyy-mm-dd para enviar ao backend
    function toISODate(ddmmyyyy) {
      if (!ddmmyyyy) return null;
      const p = ddmmyyyy.split("/");
      if (p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
      return ddmmyyyy;
    }

    const vendas = await ApiClient.getVendas(
      toISODate(filtros.dataInicio),
      toISODate(filtros.dataFim),
    );
    console.log("📦 Total de vendas encontradas:", vendas.length);

    // Filtrar vendas pelo período selecionado (segurança adicional no frontend)
    const dataInicioObj = parseDataRel(filtros.dataInicio);
    const dataFimObj = parseDataRel(filtros.dataFim);
    dataFimObj.setHours(23, 59, 59, 999); // Incluir todo o dia final

    const vendasFiltradas = vendas.filter((v) => {
      const dataVenda = new Date(v.data || v.createdAt);
      return dataVenda >= dataInicioObj && dataVenda <= dataFimObj;
    });

    console.log("✅ Vendas no período:", vendasFiltradas.length);

    // Agregar dados por produto
    // DEBUG: inspecionar itens de cada venda filtrada
    vendasFiltradas.forEach((v, idx) => {
      try {
        console.log(
          `🔎 Venda[${idx}] id=${v.id} - itens type:`,
          typeof v.itens,
          "length:",
          Array.isArray(v.itens)
            ? v.itens.length
            : v.itens
              ? JSON.stringify(v.itens).length
              : 0,
        );
        if (!Array.isArray(v.itens) && typeof v.itens === "string")
          console.log("🔎 Venda itens (string):", v.itens.substring(0, 200));
        if (Array.isArray(v.itens))
          console.log("🔎 Primeiros itens:", v.itens.slice(0, 3));
      } catch (e) {
        console.warn("Erro ao inspecionar itens da venda", e);
      }
    });

    const produtosMap = new Map();

    vendasFiltradas.forEach((venda) => {
      const itens = Array.isArray(venda.itens)
        ? venda.itens
        : typeof venda.itens === "string"
          ? JSON.parse(venda.itens)
          : [];

      itens.forEach((item) => {
        const codigo = item.produto?.id || item.id || "S/N";
        const nome =
          item.produto?.nome ||
          item.nome ||
          item.descricao ||
          "Produto sem nome";
        const qtd = parseFloat(item.quantidade) || 0;
        const totalItem =
          parseFloat(item.totalFinal) || parseFloat(item.totalBruto) || 0;

        // Calcular custo e lucro (se disponível)
        const valorUnit = parseFloat(item.valorUnitario) || 0;
        const custoUnit =
          parseFloat(
            item.produto?.custoUnitario || item.custoUnitario || item.custo,
          ) || 0;
        const custoTotal = qtd * custoUnit;
        const lucro = totalItem - custoTotal;
        const margem = totalItem > 0 ? (lucro / totalItem) * 100 : 0;

        if (produtosMap.has(codigo)) {
          const existing = produtosMap.get(codigo);
          existing.qtd_vendida += qtd;
          existing.total_venda += totalItem;
          existing.custo_total += custoTotal;
          existing.lucro = existing.total_venda - existing.custo_total;
          existing.margem =
            existing.total_venda > 0
              ? (existing.lucro / existing.total_venda) * 100
              : 0;
        } else {
          produtosMap.set(codigo, {
            codigo: String(codigo),
            produto: nome,
            qtd_vendida: qtd,
            total_venda: totalItem,
            custo_total: custoTotal,
            lucro: lucro,
            margem: margem,
          });
        }
      });
    });

    let produtos = Array.from(produtosMap.values()).sort(
      (a, b) => b.total_venda - a.total_venda,
    );

    // Adicionar preço unitário de venda e custo (quando aplicável)
    produtos = produtos.map((p) => {
      const qtd = Number(p.qtd_vendida) || 0;
      const total = Number(p.total_venda) || 0;
      const custoTotal = Number(p.custo_total) || 0;
      const preco_venda =
        qtd > 0 ? Number((total / qtd).toFixed(2)) : Number(total.toFixed(2));
      const preco_custo =
        qtd > 0
          ? Number((custoTotal / qtd).toFixed(2))
          : Number(custoTotal.toFixed(2));
      return Object.assign({}, p, {
        preco_venda: preco_venda,
        preco_custo: preco_custo,
      });
    });

    console.log("📋 Produtos agregados:", produtos.length);

    if (produtos.length === 0) {
      mostrarNotificacaoRel(
        "Nenhuma venda encontrada no período selecionado.",
        "warning",
      );
      return;
    }

    // Verificar tamanho da logo
    let logoToSend = companyLogo;
    if (companyLogo && typeof companyLogo === "string") {
      const estimatedSize = (companyLogo.length * 3) / 4;
      console.log(
        "📏 Tamanho estimado da logo:",
        (estimatedSize / 1024).toFixed(2),
        "KB",
      );
      if (estimatedSize > 150000) {
        console.warn("⚠️ Logo muito grande (>150KB), enviando sem logo");
        logoToSend = null;
      } else {
        console.log("✅ Logo dentro do limite, será enviada");
      }
    } else {
      console.warn("⚠️ Logo não disponível ou inválida");
    }

    const payload = {
      dataInicio: filtros.dataInicio,
      dataFim: filtros.dataFim,
      produtos: produtos,
      companyLogo: logoToSend,
      companyRazao: companyRazao,
    };

    console.log("📤 Enviando payload para PDF:", {
      dataInicio: payload.dataInicio,
      dataFim: payload.dataFim,
      produtosCount: payload.produtos.length,
      temLogo: !!payload.companyLogo,
      razaoSocial: payload.companyRazao,
    });

    const API_BASE =
      (window.__API_BASE__ && window.__API_BASE__.toString()) ||
      window.location.origin;
    const apiUrl =
      API_BASE.replace(/\/$/, "") + "/api/relatorios/faturamento/pdf";

    let resp = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Retry sem logo se der 413
    if (!resp.ok && resp.status === 413 && logoToSend) {
      console.warn("⚠️ Erro 413: Tentando sem logo...");
      payload.companyLogo = null;
      resp = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    if (!resp.ok) throw new Error("Resposta do servidor: " + resp.status);

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);

    // Abrir em modal centralizado com visualizador embutido
    openPdfModal(url, "Relatório de Faturamento");

    mostrarNotificacaoRel("Relatório gerado com sucesso!", "success");
  } catch (e) {
    console.error("Erro ao gerar PDF:", e);
    mostrarNotificacaoRel("Erro ao gerar PDF: " + (e.message || e), "error");
  }
}

// Abre modal centralizado com visualizador de PDF (recebe blob URL)
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

  const closeBtn = document.createElement("button");
  closeBtn.className = "pdf-modal-close";
  closeBtn.textContent = "✕";
  closeBtn.onclick = closeModal;

  toolbar.appendChild(viewBtn);
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

  // fechar ao tecla ESC
  function onKey(e) {
    if (e.key === "Escape") closeModal();
  }
  document.addEventListener("keydown", onKey);

  // fechar ao clicar no backdrop
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

function coletarFiltrosRel() {
  return {
    dataInicio: document.getElementById("dataInicioRel")?.value,
    dataFim: document.getElementById("dataFimRel")?.value,
    relatorioPor: document.getElementById("relatorioPor")?.value,
    ordenacao: document.getElementById("ordenacao")?.value,
    apuracaoCusto: document.getElementById("apuracaoCusto")?.value,
    filtroGrupo: document.getElementById("filtroGrupo")?.value,
    filtroSubgrupo: document.getElementById("filtroSubgrupo")?.value,
    filtroMarca: document.getElementById("filtroMarca")?.value,
    filtroProdutoServico: document.getElementById("filtroProdutoServico")
      ?.value,
    filtroCliente: document.getElementById("filtroClienteRel")?.value,
    filtroProfissional: document.getElementById("filtroProfissionalRel")?.value,
    filtroPerfilComissao: document.getElementById("filtroPerfilComissao")
      ?.value,
    filtroFornecedor: document.getElementById("filtroFornecedor")?.value,
    considerarCusto: document.getElementById("considerarCusto")?.checked,
  };
}

function limparFiltrosRel() {
  console.log("🧹 Limpando todos os filtros do relatório");

  // Limpar campo de produto/serviço
  const filtroProdutoServico = document.getElementById("filtroProdutoServico");
  if (filtroProdutoServico) filtroProdutoServico.value = "";

  // Resetar selects para primeira opção
  const selects = [
    "relatorioPor",
    "ordenacao",
    "apuracaoCusto",
    "filtroGrupo",
    "filtroSubgrupo",
    "filtroMarca",
    "filtroClienteRel",
    "filtroProfissionalRel",
    "filtroPerfilComissao",
    "filtroFornecedor",
  ];

  selects.forEach((select) => {
    const elemento = document.getElementById(select);
    if (elemento) elemento.selectedIndex = 0;
  });

  // Desmarcar checkbox
  const considerarCusto = document.getElementById("considerarCusto");
  if (considerarCusto) considerarCusto.checked = false;

  // Manter data atual
  configurarDataPadraoRel();

  mostrarNotificacaoRel("Filtros limpos com sucesso!", "success");
}

function processarRelatorioRel(filtros) {
  console.log("🔄 Processando relatório no backend...", filtros);

  const dadosRelatorio = {
    periodo: `${filtros.dataInicio} à ${filtros.dataFim}`,
    relatorioPor: filtros.relatorioPor,
    ordenacao: filtros.ordenacao,
    totalFaturamento: 125750.0,
    totalItens: 456,
    lucroTotal: 45230.0,
  };

  console.log("📈 Dados do relatório:", dadosRelatorio);
}

// Funções utilitárias
function formatarDataRel(data) {
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

function parseDataRel(dataString) {
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

function datasSaoIguaisRel(data1, data2) {
  return (
    data1.getDate() === data2.getDate() &&
    data1.getMonth() === data2.getMonth() &&
    data1.getFullYear() === data2.getFullYear()
  );
}

function mostrarNotificacaoRel(mensagem, tipo = "info") {
  const existente = document.querySelector(".notification-rel");
  if (existente) {
    existente.remove();
  }

  const notification = document.createElement("div");
  notification.className = "notification-rel";
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        opacity: 0;
        transform: translateX(100px);
        animation: slideInRight 0.3s ease forwards, slideOutRight 0.3s ease 3.7s forwards;
    `;

  const cores = {
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
  };

  notification.style.background = cores[tipo] || cores.info;

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

  if (!document.querySelector("#notification-styles-rel")) {
    const style = document.createElement("style");
    style.id = "notification-styles-rel";
    style.textContent = `
            @keyframes slideInRight {
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            @keyframes slideOutRight {
                to {
                    opacity: 0;
                    transform: translateX(100px);
                }
            }
        `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 4000);
}

console.log("✅ Funcionalidades do Relatório de Faturamento carregadas");
