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

/* ========================================
   CALENDÁRIO (cópia do rel-faturamento adaptada para Recebiveis)
   ======================================== */

// Estado do calendário (intervalo)
const calendarioState = {
  mes: new Date().getMonth(),
  ano: new Date().getFullYear(),
  dataInicio: null,
  dataFim: null,
  selecionandoInicio: true,
  hoverDate: null,
};

// Inicialização do calendário (executa no DOMContentLoaded já existente)
document.addEventListener("DOMContentLoaded", function () {
  try {
    // Preencher por padrão com a data de hoje nos inputs de período
    // para que ambos mostrem o dia atual ao carregar a página.
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (!calendarioState.dataInicio)
      calendarioState.dataInicio = new Date(hoje);
    if (!calendarioState.dataFim) calendarioState.dataFim = new Date(hoje);

    inicializarCalendarioRecebiveis();
    // Atualiza os inputs visuais com as datas do estado
    try {
      atualizarInputsRecebiveis();
    } catch (e) {}
    preencherFiltrosRecebiveis();
  } catch (e) {
    console.warn("Erro inicializando calendário Recebiveis", e);
  }
});

// ==========================
// Preencher filtros (Centro, Agrupamento, Marca, Categoria, Profissional)
// ==========================
function preencherFiltrosRecebiveis() {
  try {
    preencherRelatorioPor();
    preencherCentroResultado();
    preencherAgrupamentoSubgrupos();
    preencherMarcas();
    preencherCategorias();
    preencherProfissionais();
  } catch (e) {
    console.warn("Erro ao preencher filtros:", e);
  }
}

function clearSelectOptions(select) {
  if (!select) return;
  select.innerHTML = "";
}

function addOption(select, value, text) {
  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = text;
  select.appendChild(opt);
}

async function preencherCentroResultado() {
  const select = document.getElementById("filtroResultadoRecebiveis");
  if (!select) return;
  clearSelectOptions(select);
  addOption(select, "", "Todos");
  // TODO: Quando API de centros de resultado estiver disponível, implementar:
  // const centros = await ApiClient.getCentrosResultado();
  // centros.forEach(c => addOption(select, slugify(c.nome), c.nome));

  // Após popular opções, transformar o select em dropdown customizado
  try {
    transformarFiltroResultadoEmCustom();
  } catch (e) {
    /* silencioso */
  }
}

// Converte o select #filtroResultadoRecebiveis em um dropdown customizado
function transformarFiltroResultadoEmCustom() {
  const select = document.getElementById("filtroResultadoRecebiveis");
  if (!select) return;
  // evitar duplicar
  const prev = select.previousElementSibling;
  if (prev && prev.classList && prev.classList.contains("custom-dropdown"))
    return;

  // esconder select original (mantendo no DOM para valor real)
  select.style.display = "none";

  const wrapper = document.createElement("div");
  wrapper.className = "custom-dropdown";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "custom-dropdown-toggle";
  toggle.textContent = select.options[select.selectedIndex]?.text || "Todos";

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
      toggle.textContent = this.textContent;
      select.dispatchEvent(new Event("change", { bubbles: true }));
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

  toggle.addEventListener("click", function (e) {
    e.stopPropagation();
    wrapper.classList.toggle("open");
  });

  // fechar ao clicar fora
  document.addEventListener("click", function (e) {
    if (!wrapper.contains(e.target)) wrapper.classList.remove("open");
  });

  wrapper.appendChild(toggle);
  wrapper.appendChild(menu);
  select.parentNode.insertBefore(wrapper, select);
}

// Função genérica que converte um select nativo em dropdown customizado
function transformarSelectEmCustomGeneric(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  // evitar duplicar
  const prev = select.previousElementSibling;
  if (prev && prev.classList && prev.classList.contains("custom-dropdown"))
    return;

  // esconder select original (mantendo no DOM para valor real)
  select.style.display = "none";

  const wrapper = document.createElement("div");
  wrapper.className = "custom-dropdown";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "custom-dropdown-toggle";
  toggle.textContent = select.options[select.selectedIndex]?.text || "Todos";

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
      toggle.textContent = this.textContent;
      select.dispatchEvent(new Event("change", { bubbles: true }));
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

  toggle.addEventListener("click", function (e) {
    e.stopPropagation();
    wrapper.classList.toggle("open");
  });

  // fechar ao clicar fora
  document.addEventListener("click", function (e) {
    if (!wrapper.contains(e.target)) wrapper.classList.remove("open");
  });

  wrapper.appendChild(toggle);
  wrapper.appendChild(menu);
  select.parentNode.insertBefore(wrapper, select);
}

async function preencherAgrupamentoSubgrupos() {
  const select = document.getElementById("filtroAgrupamentoRecebiveis");
  if (!select) return;
  clearSelectOptions(select);
  addOption(select, "", "Todos");
  try {
    const agrupamentos = await ApiClient.getAgrupamentos();
    if (Array.isArray(agrupamentos)) {
      const allNames = [];
      agrupamentos.forEach((g) => {
        if (g.name) allNames.push(g.name);
        if (Array.isArray(g.subgrupos)) {
          g.subgrupos.forEach((s) => {
            if (s) allNames.push(s);
          });
        }
      });
      const unique = [...new Set(allNames)];
      unique.forEach((name) => addOption(select, slugify(name), name));
    }
  } catch (e) {
    console.error("Erro ao buscar agrupamentos:", e);
  }
  try {
    transformarSelectEmCustomGeneric("filtroAgrupamentoRecebiveis");
  } catch (e) {}
}

async function preencherMarcas() {
  const select = document.getElementById("filtroMarcaRecebiveis");
  if (!select) return;
  clearSelectOptions(select);
  addOption(select, "", "Todas");
  // TODO: Quando API de marcas estiver disponível, implementar:
  // const marcas = await ApiClient.getMarcas();
  // marcas.forEach(m => addOption(select, slugify(m.nome), m.nome));
  try {
    transformarSelectEmCustomGeneric("filtroMarcaRecebiveis");
  } catch (e) {}
}

async function preencherCategorias() {
  const select = document.getElementById("filtroCategoriaRecebiveis");
  if (!select) return;
  clearSelectOptions(select);
  // Substitui o preenchimento dinâmico por lista fixa definida pelo usuário
  const categorias = [
    "Antiparasitário",
    "Banho",
    "Consulta",
    "Diária",
    "Exame",
    "Procedimento Cirúrgico",
    "Procedimento Clínico",
    "Procedimento Estético",
    "Retorno",
    "Tosa",
    "Vacina",
    "Vermífugo",
  ];
  // adicionar opção 'Todas' no topo e deixá-la selecionada
  addOption(select, "", "Todas");
  categorias.forEach((name) => addOption(select, slugify(name), name));
  // garantir seleção padrão
  try {
    select.value = "";
  } catch (e) {}
  try {
    transformarSelectEmCustomGeneric("filtroCategoriaRecebiveis");
  } catch (e) {}
}

// Preenche o select 'Relatório por' com as opções do mock
async function preencherRelatorioPor() {
  const select = document.getElementById("relatorioPorRecebiveis");
  if (!select) return;
  clearSelectOptions(select);
  addOption(select, "produto", "Por Produto");
  addOption(select, "grupo-subgrupo", "Por Grupo/Subgrupo");
  // seleção padrão
  try {
    select.value = "produto";
  } catch (e) {}
  try {
    transformarSelectEmCustomGeneric("relatorioPorRecebiveis");
  } catch (e) {}
}

async function preencherProfissionais() {
  const select = document.getElementById("filtroProfissionalRecebiveis");
  if (!select) return;
  clearSelectOptions(select);
  addOption(select, "", "Todos");
  try {
    const list = await fetchAndCacheProfissionais();
    if (Array.isArray(list) && list.length) {
      list.forEach(function (nome) {
        if (!nome) return;
        addOption(select, slugify(nome), nome);
      });
    }
  } catch (e) {
    console.warn("Erro ao popular profissionais:", e);
  }
  try {
    transformarSelectEmCustomGeneric("filtroProfissionalRecebiveis");
  } catch (e) {}
}

// Buscar profissionais da API. Usa cache.
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

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
}

function inicializarCalendarioRecebiveis() {
  const periodoAnalise = document.getElementById("periodoAnaliseRecebiveis");
  const calendarioPopup = document.getElementById("calendarioPopupRecebiveis");

  if (periodoAnalise && calendarioPopup) {
    periodoAnalise.addEventListener("click", function (e) {
      e.stopPropagation();
      abrirCalendarioRecebiveis();
    });

    document.addEventListener("click", function (e) {
      if (
        !calendarioPopup.contains(e.target) &&
        !periodoAnalise.contains(e.target)
      ) {
        fecharCalendarioRecebiveis();
      }
    });

    configurarNavegacaoCalendarioRecebiveis();
    configurarBotoesCalendarioRecebiveis();
    gerarCalendarioRecebiveis();
  }
}

function configurarNavegacaoCalendarioRecebiveis() {
  const btnMesAnterior = document.getElementById("btnMesAnteriorRecebiveis");
  const btnProximoMes = document.getElementById("btnProximoMesRecebiveis");
  if (btnMesAnterior)
    btnMesAnterior.addEventListener("click", function () {
      calendarioState.mes--;
      if (calendarioState.mes < 0) {
        calendarioState.mes = 11;
        calendarioState.ano--;
      }
      gerarCalendarioRecebiveis();
    });
  if (btnProximoMes)
    btnProximoMes.addEventListener("click", function () {
      calendarioState.mes++;
      if (calendarioState.mes > 11) {
        calendarioState.mes = 0;
        calendarioState.ano++;
      }
      gerarCalendarioRecebiveis();
    });
}

function configurarBotoesCalendarioRecebiveis() {
  const btnCancelar = document.getElementById(
    "btnCalendarioCancelarRecebiveis",
  );
  const btnAplicar = document.getElementById("btnCalendarioAplicarRecebiveis");
  if (btnCancelar)
    btnCancelar.addEventListener("click", function () {
      fecharCalendarioRecebiveis();
    });
  if (btnAplicar)
    btnAplicar.addEventListener("click", function () {
      aplicarDatasCalendarioRecebiveis();
    });
}

function abrirCalendarioRecebiveis() {
  const calendarioPopup = document.getElementById("calendarioPopupRecebiveis");
  const dataInicio = document.getElementById("dataInicioRecebiveis");
  const dataFim = document.getElementById("dataFimRecebiveis");

  if (dataInicio && dataInicio.value)
    calendarioState.dataInicio = parseDataRecebiveis(dataInicio.value);
  if (dataFim && dataFim.value)
    calendarioState.dataFim = parseDataRecebiveis(dataFim.value);

  calendarioState.selecionandoInicio = true;
  calendarioState.hoverDate = null;

  if (calendarioPopup) {
    // Garantir que o popup esteja no body para evitar problemas de stacking/overflow
    try {
      if (!document.body.contains(calendarioPopup))
        document.body.appendChild(calendarioPopup);
    } catch (e) {}
    calendarioPopup.classList.add("active");
    calendarioPopup.style.zIndex = "2147483647";
    gerarCalendarioRecebiveis();

    try {
      const periodo = document.getElementById("periodoAnaliseRecebiveis");
      if (periodo)
        requestAnimationFrame(() => {
          calendarioPopup.style.transform = "none";
          const computedWidth = calendarioPopup.offsetWidth || 420;
          const preferred = Math.min(
            computedWidth,
            Math.max(320, window.innerWidth - 40),
          );
          const rect = periodo.getBoundingClientRect();
          let left = Math.round(
            rect.left + window.pageXOffset + rect.width / 2 - preferred / 2,
          );
          let top = Math.round(rect.bottom + window.pageYOffset + 8);
          if (left + preferred > window.innerWidth - 12)
            left = Math.max(12, window.innerWidth - preferred - 12);
          if (left < 12) left = 12;
          calendarioPopup.style.left = left + "px";
          calendarioPopup.style.top = top + "px";
        });
    } catch (e) {}
  }
}

function fecharCalendarioRecebiveis() {
  const calendarioPopup = document.getElementById("calendarioPopupRecebiveis");
  if (calendarioPopup) {
    calendarioPopup.classList.remove("active");
    calendarioState.hoverDate = null;
  }
}

function gerarCalendarioRecebiveis() {
  const mesAnoElement = document.getElementById("mesAnoAtualRecebiveis");
  const diasCalendario = document.getElementById("diasCalendarioRecebiveis");
  if (!mesAnoElement || !diasCalendario) return;
  diasCalendario.innerHTML = "";

  const mes1 = calendarioState.mes;
  const ano1 = calendarioState.ano;
  let mes2 = mes1 + 1;
  let ano2 = ano1;
  if (mes2 > 11) {
    mes2 = 0;
    ano2 = ano1 + 1;
  }
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

  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.gap = "18px";
  wrapper.style.justifyContent = "center";

  function gerarMes(mes, ano) {
    const container = document.createElement("div");
    container.className = "mes-container";
    container.style.minWidth = "260px";
    const grid = document.createElement("div");
    grid.className = "mes-days-grid";
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(7,1fr)";
    grid.style.gap = "6px";
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    const diasAnterior = primeiroDia.getDay();
    const mesAnterior = new Date(ano, mes, 0);
    for (let i = diasAnterior - 1; i >= 0; i--) {
      const dia = mesAnterior.getDate() - i;
      criarDiaRecebiveis(dia, true, mes - 1, ano, grid);
    }
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      criarDiaRecebiveis(dia, false, mes, ano, grid);
    }
    const totalPreenchido = diasAnterior + ultimoDia.getDate();
    const restantes = Math.max(0, 42 - totalPreenchido);
    for (let d = 1; d <= restantes; d++)
      criarDiaRecebiveis(d, true, mes + 1, ano, grid);
    container.appendChild(grid);
    return container;
  }

  wrapper.appendChild(gerarMes(mes1, ano1));
  wrapper.appendChild(gerarMes(mes2, ano2));
  diasCalendario.appendChild(wrapper);
}

function criarDiaRecebiveis(numeroDia, outroMes, mes, ano, container) {
  const diasContainer =
    container || document.getElementById("diasCalendarioRecebiveis");
  const diaElement = document.createElement("div");
  diaElement.className = "dia";
  diaElement.textContent = numeroDia;
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
  if (dataAtual.getTime() === hoje.getTime() && !outroMes)
    diaElement.classList.add("hoje");
  if (
    calendarioState.dataInicio &&
    datasSaoIguaisRecebiveis(dataAtual, calendarioState.dataInicio)
  )
    diaElement.classList.add("inicio-periodo");
  if (
    calendarioState.dataFim &&
    datasSaoIguaisRecebiveis(dataAtual, calendarioState.dataFim)
  )
    diaElement.classList.add("fim-periodo");
  if (
    calendarioState.dataInicio &&
    calendarioState.dataFim &&
    dataAtual > calendarioState.dataInicio &&
    dataAtual < calendarioState.dataFim
  )
    diaElement.classList.add("periodo-range");
  diaElement.dataset.dateIso = dataAtual.toISOString().slice(0, 10);

  diaElement.addEventListener("click", function (e) {
    e.stopPropagation();
    selecionarDataRecebiveis(dataAtual);
  });
  diaElement.addEventListener("mouseenter", function () {
    if (!calendarioState.selecionandoInicio && calendarioState.dataInicio) {
      calendarioState.hoverDate = dataAtual;
      atualizarHoverVisualRecebiveis();
    }
  });
  diaElement.addEventListener("mouseleave", function () {
    if (calendarioState.hoverDate) {
      calendarioState.hoverDate = null;
      atualizarHoverVisualRecebiveis();
    }
  });

  diasContainer.appendChild(diaElement);
}

function selecionarDataRecebiveis(data) {
  if (calendarioState.selecionandoInicio) {
    calendarioState.dataInicio = new Date(data);
    calendarioState.dataFim = null;
    calendarioState.selecionandoInicio = false;
  } else {
    if (data < calendarioState.dataInicio) {
      calendarioState.dataFim = calendarioState.dataInicio;
      calendarioState.dataInicio = new Date(data);
    } else calendarioState.dataFim = new Date(data);
    calendarioState.selecionandoInicio = true;
  }
  gerarCalendarioRecebiveis();
  atualizarInputsRecebiveis();
  if (calendarioState.dataFim) {
    setTimeout(() => {
      fecharCalendarioRecebiveis();
      try {
        if (typeof mostrarNotificacao === "function")
          mostrarNotificacao("Período selecionado com sucesso!", "success");
        else console.log("Período selecionado com sucesso!");
      } catch (e) {}
    }, 60);
  }
}

function atualizarInputsRecebiveis() {
  const dataInicioEl = document.getElementById("dataInicioRecebiveis");
  const dataFimEl = document.getElementById("dataFimRecebiveis");
  if (dataInicioEl && calendarioState.dataInicio)
    dataInicioEl.value = formatarData(calendarioState.dataInicio);
  if (dataFimEl) {
    if (calendarioState.dataFim)
      dataFimEl.value = formatarData(calendarioState.dataFim);
    else if (calendarioState.dataInicio)
      dataFimEl.value = formatarData(calendarioState.dataInicio);
  }
}

function atualizarHoverVisualRecebiveis() {
  const dias = document.querySelectorAll("#diasCalendarioRecebiveis .dia");
  if (!dias || dias.length === 0) return;
  dias.forEach((d) => {
    d.classList.remove("hover-range");
    d.classList.remove("hover-target");
  });
  if (!calendarioState.dataInicio || !calendarioState.hoverDate) return;
  const start =
    calendarioState.dataInicio.getTime() <= calendarioState.hoverDate.getTime()
      ? calendarioState.dataInicio
      : calendarioState.hoverDate;
  const end =
    calendarioState.dataInicio.getTime() > calendarioState.hoverDate.getTime()
      ? calendarioState.dataInicio
      : calendarioState.hoverDate;
  dias.forEach((d) => {
    const iso = d.dataset.dateIso;
    if (!iso) return;
    const parts = iso.split("-");
    const dt = new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2]),
    );
    if (dt.getTime() > start.getTime() && dt.getTime() < end.getTime())
      d.classList.add("hover-range");
    if (dt.getTime() === calendarioState.hoverDate.getTime())
      d.classList.add("hover-target");
  });
}

function aplicarDatasCalendarioRecebiveis() {
  const dataInicio = document.getElementById("dataInicioRecebiveis");
  const dataFim = document.getElementById("dataFimRecebiveis");
  if (calendarioState.dataInicio && dataInicio)
    dataInicio.value = formatarData(calendarioState.dataInicio);
  if (calendarioState.dataFim && dataFim)
    dataFim.value = formatarData(calendarioState.dataFim);
  else if (calendarioState.dataInicio && dataFim)
    dataFim.value = formatarData(calendarioState.dataInicio);
  fecharCalendarioRecebiveis();
  try {
    if (typeof mostrarNotificacao === "function")
      mostrarNotificacao("Período selecionado com sucesso!", "success");
    else console.log("Período selecionado com sucesso!");
  } catch (e) {}
}

function formatarData(data) {
  if (!data) return "";
  const dd = ("0" + data.getDate()).slice(-2);
  const mm = ("0" + (data.getMonth() + 1)).slice(-2);
  const yyyy = data.getFullYear();
  return dd + "/" + mm + "/" + yyyy;
}

function parseDataRecebiveis(str) {
  if (!str || typeof str !== "string") return null;
  const parts = str.split("/");
  if (parts.length !== 3) return null;
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const y = parseInt(parts[2], 10);
  return new Date(y, m, d);
}

function datasSaoIguaisRecebiveis(a, b) {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ===== MODAL PDF (igual ao rel-demonstrativo-resultados.html) =====
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
  // mostrar texto + caret
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

  // track selected format (default pdf)
  let selectedFormat = "pdf";

  // abrir/fechar menu
  formatBtn.addEventListener("click", function (ev) {
    ev.stopPropagation();
    formatMenu.style.display =
      formatMenu.style.display === "none" ? "block" : "none";
  });
  // fechar ao clicar fora
  document.addEventListener("click", function () {
    if (formatMenu) formatMenu.style.display = "none";
  });

  // ações: apenas selecionam o formato
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

  // botão de download
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
        a.download = "relatorio_recebiveis_produto.pdf";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else if (selectedFormat === "xls") {
        alert("Exportação XLS não implementada ainda.");
      }
    } catch (e) {
      console.error("erro no download", e);
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

function visualizarRelatorio() {
  // Placeholder: função antiga mantida para compatibilidade
  // Usar visualizarRelatorioRecebiveis() em vez desta
  console.warn(
    "visualizarRelatorio() deprecated - use visualizarRelatorioRecebiveis()",
  );
}

function limparFormulario() {
  // Resetar para data de hoje
  const hoje = new Date();
  calendarioState.dataInicio = new Date(hoje);
  calendarioState.dataFim = new Date(hoje);
  atualizarCamposPeriodo();

  // Resetar select do relatório por
  document.getElementById("relatorioPorRecebiveis").value = "produto";

  // Resetar todos os filtros
  document.getElementById("filtroResultadoRecebiveis").value = "";
  document.getElementById("filtroAgrupamentoRecebiveis").value = "";
  document.getElementById("filtroMarcaRecebiveis").value = "";
  document.getElementById("filtroCategoriaRecebiveis").value = "";
  document.getElementById("filtroProfissionalRecebiveis").value = "";

  console.log("🧹 Formulário limpo");
  mostrarNotificacao("Formulário limpo", "info");
}

function mostrarNotificacao(mensagem, tipo = "info") {
  // Criar elemento de notificação
  const notificacao = document.createElement("div");
  notificacao.className = "notification";

  // Definir ícone e cor baseado no tipo
  let icone = "fa-info-circle";
  let cor = "var(--primary-color)";

  if (tipo === "success") {
    icone = "fa-check-circle";
    cor = "var(--turquoise)";
  } else if (tipo === "error") {
    icone = "fa-exclamation-circle";
    cor = "var(--red)";
  } else if (tipo === "warning") {
    icone = "fa-exclamation-triangle";
    cor = "var(--orange)";
  }

  notificacao.innerHTML = `
        <i class="fas ${icone}" style="color: ${cor}; font-size: 20px;"></i>
        <span>${mensagem}</span>
    `;

  notificacao.style.backgroundColor = "var(--bg-card)";
  notificacao.style.color = "var(--text-primary)";
  notificacao.style.border = `1px solid ${cor}`;

  document.body.appendChild(notificacao);

  // Remover após 3 segundos
  setTimeout(() => {
    notificacao.style.animation = "slideOutRight 0.3s ease";
    setTimeout(() => {
      document.body.removeChild(notificacao);
    }, 300);
  }, 3000);
}

// Animação de saída para notificação
const style = document.createElement("style");
style.textContent = `
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// ===== EVENTO PARA GERAR RELATÓRIO (VISUALIZAR) =====
document
  .getElementById("btnVisualizarRecebiveis")
  ?.addEventListener("click", async function () {
    console.log("🔵 Botão Visualizar Recebíveis clicado");
    try {
      const dataInicio = document.getElementById("dataInicioRecebiveis").value;
      const dataFim = document.getElementById("dataFimRecebiveis").value;
      const relatorioPor =
        document.getElementById("relatorioPorRecebiveis")?.value || "produto";
      const filtroResultado =
        document.getElementById("filtroResultadoRecebiveis")?.value || "";
      const filtroAgrupamento =
        document.getElementById("filtroAgrupamentoRecebiveis")?.value || "";
      const filtroMarca =
        document.getElementById("filtroMarcaRecebiveis")?.value || "";
      const filtroCategoria =
        document.getElementById("filtroCategoriaRecebiveis")?.value || "";
      const filtroProfissional =
        document.getElementById("filtroProfissionalRecebiveis")?.value || "";

      console.log("📋 Dados coletados:", { dataInicio, dataFim, relatorioPor });

      // validar campos obrigatórios
      if (!dataInicio || !dataFim) {
        alert("Por favor, selecione o período de análise.");
        return;
      }

      const payload = {
        dataInicio,
        dataFim,
        relatorioPor,
        filtroResultado,
        filtroAgrupamento,
        filtroMarca,
        filtroCategoria,
        filtroProfissional,
      };

      // Buscar logo e razão social da empresa da API
      try {
        const empresasData = await ApiClient.getEmpresas();
        if (empresasData.length > 0 && empresasData[0].logoDataUrl) {
          payload.companyLogo = empresasData[0].logoDataUrl;
          payload.companyRazao = empresasData[0].razaoSocial || "";
          console.log("✅ Logo e razão social carregados");
        }
      } catch (e) {
        console.warn("⚠️ Erro ao carregar logo da empresa:", e);
      }

      console.log("🚀 Payload preparado (API futura):", payload);

      // TODO: quando API estiver pronta, substituir por exemplo abaixo (usar API_BASE dinâmico):
      // const API_BASE = (window.__API_BASE__ && window.__API_BASE__.toString()) || window.location.origin;
      // const response = await fetch(`${API_BASE}/api/relatorios/recebiveis-produto/pdf`, {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify(payload)
      // });
      // const blob = await response.blob();
      // const blobUrl = URL.createObjectURL(blob);
      // openPdfModal(blobUrl, 'Relatório de Recebíveis por Produto');

      // Por enquanto, gerar PDF mock usando jsPDF (simulação - até API estar pronta):

      // Simular delay de rede
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Gerar PDF mock usando jsPDF
      const pdfBlob = await gerarPdfMockRecebiveis(payload);
      const blobUrl = URL.createObjectURL(pdfBlob);

      // Abrir no modal (mesmo comportamento do rel-demonstrativo-resultados)
      openPdfModal(blobUrl, "Relatório de Recebíveis por Produto");
    } catch (error) {
      console.error("💥 Erro ao gerar relatório:", error);
      console.error("Stack:", error.stack);
      alert(
        "Erro ao gerar relatório: " +
          error.message +
          "\n\nVerifique o console (F12) para mais detalhes.",
      );
    }
  });

// Função auxiliar para gerar PDF mock usando jsPDF (enquanto API não está pronta)
async function gerarPdfMockRecebiveis(payload) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let yPos = 20;

  // Adicionar logo se disponível (mantendo proporção)
  if (payload.companyLogo) {
    try {
      // Criar imagem temporária para obter dimensões originais
      const img = new Image();
      img.src = payload.companyLogo;
      await new Promise((resolve) => {
        img.onload = () => {
          const maxWidth = 50;
          const maxHeight = 25;
          let width = img.width;
          let height = img.height;

          // Calcular proporção mantendo aspect ratio
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;

          // Centralizar horizontalmente
          const xPos = (210 - width) / 2; // 210 é largura A4 em mm

          doc.addImage(payload.companyLogo, "PNG", xPos, yPos, width, height);
          resolve();
        };
        img.onerror = () => resolve();
      });
      yPos += 30;
    } catch (e) {
      console.warn("Erro ao adicionar logo:", e);
    }
  }

  // Título
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text(payload.companyRazao || "PET CRIA LTDA", 105, yPos, {
    align: "center",
  });
  yPos += 8;

  doc.setFontSize(14);
  doc.text("RELATÓRIO DE RECEBÍVEIS POR PRODUTO", 105, yPos, {
    align: "center",
  });
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(`Período: ${payload.dataInicio} até ${payload.dataFim}`, 105, yPos, {
    align: "center",
  });
  yPos += 15;

  // Linha separadora
  doc.setDrawColor(44, 90, 160);
  doc.setLineWidth(0.5);
  doc.line(20, yPos, 190, yPos);
  yPos += 10;

  // Parâmetros do relatório
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("Parâmetros do Relatório", 20, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");

  const params = [
    [
      "Relatório por:",
      payload.relatorioPor === "produto" ? "Por Produto" : "Por Grupo/Subgrupo",
    ],
    payload.filtroResultado
      ? ["Centro de Resultado:", payload.filtroResultado]
      : null,
    payload.filtroAgrupamento
      ? ["Agrupamento:", payload.filtroAgrupamento]
      : null,
    payload.filtroMarca ? ["Marca:", payload.filtroMarca] : null,
    payload.filtroCategoria ? ["Categoria:", payload.filtroCategoria] : null,
    payload.filtroProfissional
      ? ["Profissional:", payload.filtroProfissional]
      : null,
  ].filter(Boolean);

  params.forEach(([label, value]) => {
    doc.setFont(undefined, "bold");
    doc.text(label, 25, yPos);
    doc.setFont(undefined, "normal");
    doc.text(value, 75, yPos);
    yPos += 6;
  });

  yPos += 10;

  // Área de dados (placeholder)
  doc.setFillColor(102, 126, 234);
  doc.rect(20, yPos, 170, 80, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.text("📊 Visualização de Dados", 105, yPos + 20, { align: "center" });

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text("O conteúdo detalhado do relatório será gerado", 105, yPos + 35, {
    align: "center",
  });
  doc.text("pela API quando estiver integrada.", 105, yPos + 42, {
    align: "center",
  });

  doc.setFontSize(9);
  doc.text("Este é um preview de demonstração.", 105, yPos + 55, {
    align: "center",
  });
  doc.text("Os dados reais virão do backend.", 105, yPos + 61, {
    align: "center",
  });

  yPos += 90;

  // Footer
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  const now = new Date().toLocaleString("pt-BR");
  doc.text(`Gerado em ${now} • Sistema PetHub`, 105, 280, { align: "center" });

  // Converter para Blob
  const pdfBlob = doc.output("blob");
  return pdfBlob;
}
