// @ts-nocheck

// Copiado de frontend/dashboard.js - funcionalidades do menu e header

console.log("🚀 menu.js carregado (snippet do dashboard)");

// Garantir helper de toast global (caso nenhuma outra página já tenha definido)
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
        var collapsed = sidebar.classList.contains("collapsed");
        document.querySelectorAll(".main-content").forEach(function (mc) {
          if (collapsed) {
            mc.classList.add("sidebar-collapsed");
            try {
              mc.style.setProperty("margin-left", "0", "important");
              mc.style.setProperty("width", "100%", "important");
            } catch (err) {}
          } else {
            mc.classList.remove("sidebar-collapsed");
            var w = sidebar.getBoundingClientRect().width || 120;
            try {
              mc.style.setProperty("margin-left", w + "px", "important");
              mc.style.setProperty(
                "width",
                "calc(100% - " + w + "px)",
                "important",
              );
            } catch (err) {}
          }
        });
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
        document.querySelectorAll(".main-content").forEach(function (mc) {
          mc.classList.add("sidebar-collapsed");
          try {
            mc.style.setProperty("margin-left", "0", "important");
            mc.style.setProperty("width", "100%", "important");
          } catch (err) {}
        });
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
    inicializarMeusItens();
  }, 200);
});

/* ========================================
    MEUS ITENS - FUNCIONALIDADES
    ======================================== */

// Dados de exemplo dos produtos (fallback)
const produtosExemplo = [];

// Lista efetiva (carregada de localStorage quando disponível)
let produtosLista = null;
// Mapa de status de validade retornado pela API: id -> { dias, status, mensagem }
let validadeStatusMap = {};
// Produtos filtrados atualmente exibidos (usado para exportação)
let produtosFiltradosGlobal = [];

/**
 * =============================================================
 * SISTEMA DE MÚLTIPLA SELEÇÃO COM TAGS (Multi-Select Dropdown)
 * =============================================================
 */

// Armazena os dados de cada multi-select: { selectId: { selectedValues: [], options: [] } }
const multiSelectData = {};

// Cache em memória para perfis de validade (substitui uso de localStorage)
let cachedPerfisValidade = null;

// Busca perfis de validade via API e popula cache (idempotente)
async function fetchPerfisValidade() {
  if (cachedPerfisValidade !== null) return cachedPerfisValidade;
  try {
    const resp = await ApiClient.getPerfisProduto();
    if (Array.isArray(resp)) cachedPerfisValidade = resp;
    else cachedPerfisValidade = [];
  } catch (e) {
    console.debug("[fetchPerfisValidade] erro ao buscar perfis via API", e);
    cachedPerfisValidade = [];
  }
  return cachedPerfisValidade;
}

// Retorna perfis do cache de forma síncrona (usado em funções não-async). Se cache vazio, retorna []
function getPerfisValidadeSync() {
  return Array.isArray(cachedPerfisValidade) ? cachedPerfisValidade : [];
}

/**
 * Transforma um select simples em um campo de múltipla seleção com tags
 * @param {string} selectId - ID do select original
 * @param {Array} options - Array de opções [{value, text}]
 */
function createMultiSelect(selectId, options = []) {
  const originalSelect = document.getElementById(selectId);
  if (!originalSelect) {
    console.warn(`[createMultiSelect] Select ${selectId} não encontrado`);
    return;
  }

  // Inicializar dados
  multiSelectData[selectId] = {
    selectedValues: [],
    options:
      options.length > 0
        ? options
        : Array.from(originalSelect.options).map((opt) => ({
            value: opt.value,
            text: opt.text,
          })),
  };

  // Criar container
  const container = document.createElement("div");
  container.className = "multi-select-container";
  container.id = `${selectId}-multi-container`;

  // Criar área de tags
  const tagsArea = document.createElement("div");
  tagsArea.className = "multi-select-tags";
  tagsArea.id = `${selectId}-tags`;

  // Criar input de busca
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.className = "multi-select-search";
  searchInput.placeholder = "Digite para buscar...";
  searchInput.autocomplete = "off";

  tagsArea.appendChild(searchInput);

  // Criar dropdown
  const dropdown = document.createElement("div");
  dropdown.className = "multi-select-dropdown";
  dropdown.id = `${selectId}-dropdown`;
  dropdown.style.display = "none";

  container.appendChild(tagsArea);
  container.appendChild(dropdown);

  // Substituir select original
  originalSelect.style.display = "none";
  originalSelect.parentNode.insertBefore(container, originalSelect);

  // Popular dropdown
  updateMultiSelectDropdown(selectId);

  // Eventos
  searchInput.addEventListener("focus", () => {
    dropdown.style.display = "block";
    updateMultiSelectDropdown(selectId, searchInput.value);
  });

  searchInput.addEventListener("input", (e) => {
    dropdown.style.display = "block";
    updateMultiSelectDropdown(selectId, e.target.value);
  });

  // Fechar dropdown ao clicar fora
  document.addEventListener("click", (e) => {
    if (!container.contains(e.target)) {
      dropdown.style.display = "none";
      searchInput.value = ""; // Limpar busca ao fechar
    }
  });

  // Permitir clicar na área de tags para focar no input
  tagsArea.addEventListener("click", (e) => {
    if (
      e.target === tagsArea ||
      e.target.classList.contains("multi-select-tags")
    ) {
      searchInput.focus();
      dropdown.style.display = "block";
      updateMultiSelectDropdown(selectId, searchInput.value);
    }
  });
}

/**
 * Atualiza o dropdown do multi-select com as opções filtradas
 */
function updateMultiSelectDropdown(selectId, searchTerm = "") {
  const data = multiSelectData[selectId];
  if (!data) return;

  const dropdown = document.getElementById(`${selectId}-dropdown`);
  if (!dropdown) return;

  const searchLower = searchTerm.toLowerCase();
  const filteredOptions = data.options.filter(
    (opt) =>
      opt.value !== "todos" && // Não mostrar "Todos" no dropdown
      opt.text.toLowerCase().includes(searchLower) &&
      !data.selectedValues.includes(opt.value),
  );

  dropdown.innerHTML = "";

  if (filteredOptions.length === 0) {
    dropdown.innerHTML =
      '<div class="multi-select-no-results">Nenhum resultado encontrado</div>';
    return;
  }

  filteredOptions.forEach((opt) => {
    const item = document.createElement("div");
    item.className = "multi-select-item";
    item.textContent = opt.text;
    item.dataset.value = opt.value;

    item.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevenir que o clique feche o dropdown
      addMultiSelectTag(selectId, opt.value, opt.text);
      const searchInput = document.querySelector(
        `#${selectId}-tags .multi-select-search`,
      );
      const dropdownElement = document.getElementById(`${selectId}-dropdown`);
      if (searchInput) {
        searchInput.value = "";
        // Usar setTimeout para garantir que o dropdown reabra
        setTimeout(() => {
          searchInput.focus();
          if (dropdownElement) {
            dropdownElement.style.display = "block";
          }
          updateMultiSelectDropdown(selectId, "");
        }, 10);
      }
    });

    dropdown.appendChild(item);
  });
}

/**
 * Adiciona uma tag ao multi-select
 */
function addMultiSelectTag(selectId, value, text) {
  const data = multiSelectData[selectId];
  if (!data || data.selectedValues.includes(value)) return;

  data.selectedValues.push(value);

  const tagsArea = document.getElementById(`${selectId}-tags`);
  if (!tagsArea) return;

  const tag = document.createElement("span");
  tag.className = "multi-select-tag";
  tag.dataset.value = value;
  tag.innerHTML = `
        ${text}
        <i class="fas fa-times" data-remove="${value}"></i>
    `;

  // Inserir tag antes do input
  const searchInput = tagsArea.querySelector(".multi-select-search");
  tagsArea.insertBefore(tag, searchInput);

  // Evento para remover tag
  tag.querySelector("i").addEventListener("click", (e) => {
    e.stopPropagation();
    removeMultiSelectTag(selectId, value);
    // Reabrir dropdown após remover tag
    const searchInput = tagsArea.querySelector(".multi-select-search");
    const dropdownElement = document.getElementById(`${selectId}-dropdown`);
    if (searchInput && dropdownElement) {
      setTimeout(() => {
        searchInput.focus();
        dropdownElement.style.display = "block";
        updateMultiSelectDropdown(selectId, "");
      }, 10);
    }
  });

  updateMultiSelectDropdown(selectId);
  // Reaplicar filtros imediatamente para manter UI responsiva (evitar precisar recarregar)
  try {
    setTimeout(() => {
      try {
        renderizarProdutos(
          document.querySelector(".tab-btn.active")?.dataset.category ||
            "todos",
          coletarFiltrosAtuais(),
        );
      } catch (e) {}
    }, 50);
  } catch (e) {}
}

/**
 * Remove uma tag do multi-select
 */
function removeMultiSelectTag(selectId, value) {
  const data = multiSelectData[selectId];
  if (!data) return;

  const index = data.selectedValues.indexOf(value);
  if (index > -1) {
    data.selectedValues.splice(index, 1);
  }

  const tagsArea = document.getElementById(`${selectId}-tags`);
  if (tagsArea) {
    const tag = tagsArea.querySelector(`[data-value="${value}"]`);
    if (tag) tag.remove();
  }

  // Garantir que o <select> nativo seja desmarcado para evitar filtros persistentes
  try {
    const select = document.getElementById(selectId);
    if (select) {
      // tentar localizar a opção correspondente e desmarcá-la
      let found = false;
      Array.from(select.options).forEach((o) => {
        try {
          if (
            String(o.value) === String(value) ||
            String(o.text).trim() === String(value).trim()
          ) {
            o.selected = false;
            found = true;
          }
        } catch (e) {}
      });
      // se não encontrou, resetar o select para valor vazio quando possível
      if (!found) {
        try {
          select.value = "";
        } catch (e) {
          select.selectedIndex = -1;
        }
      }
      // disparar evento change para sincronizar possíveis listeners
      try {
        select.dispatchEvent(new Event("change"));
      } catch (e) {}
    }
  } catch (e) {
    console.debug("[removeMultiSelectTag] erro ao resetar select nativo", e);
  }

  updateMultiSelectDropdown(selectId);
}

/**
 * Obtém os valores selecionados de um multi-select
 */
function getMultiSelectValues(selectId) {
  const data = multiSelectData[selectId];
  if (data) return data.selectedValues;

  // Fallback: alguns dropdowns customizados usam uma implementação diferente
  // que cria `.multi-select-tags-area` e insere tags com um <i> contendo dataset.value.
  try {
    const select = document.getElementById(selectId);
    if (!select) return [];
    const wrapper = select.parentElement;
    const tagsArea = wrapper
      ? wrapper.querySelector(".multi-select-tags-area") ||
        wrapper.querySelector(".multi-select-tags")
      : null;
    if (!tagsArea) return [];
    const tags = Array.from(tagsArea.querySelectorAll(".multi-select-tag"));
    const values = tags
      .map((tag) => {
        const icon = tag.querySelector("i");
        if (icon && icon.dataset && icon.dataset.value)
          return icon.dataset.value;
        if (tag.dataset && tag.dataset.value) return tag.dataset.value;
        return tag.textContent.trim();
      })
      .filter(Boolean);
    return values;
  } catch (e) {
    console.debug("[getMultiSelectValues] fallback error", e);
    return [];
  }
}

/**
 * Limpa todas as seleções de um multi-select
 */
function clearMultiSelect(selectId) {
  const data = multiSelectData[selectId];
  if (!data) return;

  data.selectedValues = [];
  const tagsArea = document.getElementById(`${selectId}-tags`);
  if (tagsArea) {
    const tags = tagsArea.querySelectorAll(".multi-select-tag");
    tags.forEach((tag) => tag.remove());
  }

  updateMultiSelectDropdown(selectId);
}

/**
 * Atualiza as opções disponíveis em um multi-select
 */
function updateMultiSelectOptions(selectId, newOptions) {
  const data = multiSelectData[selectId];
  if (!data) return;

  data.options = newOptions;
  updateMultiSelectDropdown(selectId);
}

/**
 * =============================================================
 * FIM DO SISTEMA DE MÚLTIPLA SELEÇÃO
 * =============================================================
 */

/**
 * Inicializa os multi-selects para os campos de filtro
 */
function initializeMultiSelects() {
  console.log("🔄 Inicializando multi-selects...");

  // Lista de IDs dos selects que devem ser convertidos para multi-select
  const multiSelectIds = [
    "filtroAgrupamento",
    "filtroMarca",
    "filtroFornecedor",
    "filtroCentroResultado",
  ];

  // Apenas converte selects que explicitamente pedirem (`data-multiselect="true").
  // Isso mantém selects simples (como o `filtroPerfilValidade`) exibindo o dropdown nativo do navegador.
  multiSelectIds.forEach((id) => {
    try {
      const select = document.getElementById(id);
      if (!select) {
        console.warn(`⚠️ Select ${id} não encontrado`);
        return;
      }

      // somente criar widget se o markup pedir explicitamente
      if (select.dataset && select.dataset.multiselect === "true") {
        if (select.options.length > 0) {
          createMultiSelect(id);
          console.log(`✅ Multi-select criado para: ${id}`);
        } else {
          console.warn(
            `⚠️ Select ${id} vazio, pulando criação do multi-select`,
          );
        }
      } else {
        console.log(
          `ℹ️ Select ${id} deixado como nativo (data-multiselect != true)`,
        );
      }
    } catch (e) {
      console.error(
        `❌ Erro ao decidir criação do multi-select para ${id}:`,
        e,
      );
    }
  });
}

/**
 * Popular dropdown de Centro de Resultado com dados da API
 */
async function populateCentroResultado() {
  const select = document.getElementById("filtroCentroResultado");
  if (!select) {
    console.warn("[populateCentroResultado] Select não encontrado");
    return;
  }

  select.innerHTML = "";

  // Adicionar opção "Todos"
  const optTodos = document.createElement("option");
  optTodos.value = "todos";
  optTodos.text = "Todos";
  select.appendChild(optTodos);

  try {
    console.log(
      "[populateCentroResultado] Buscando centros de resultado da API...",
    );
    const centros = await ApiClient.getCentrosResultado();

    if (Array.isArray(centros) && centros.length > 0) {
      centros.forEach((centro, idx) => {
        const opt = document.createElement("option");
        // Garantir value único e confiável: preferir id, depois nome, depois descricao, por fim um índice
        const value =
          centro && centro.id !== undefined && centro.id !== null
            ? String(centro.id)
            : centro && (centro.nome || centro.descricao)
              ? String(centro.nome || centro.descricao)
              : String("centro_" + idx);
        const text =
          centro && (centro.nome || centro.descricao)
            ? String(centro.nome || centro.descricao)
            : String(centro && centro.id ? centro.id : "Centro " + idx);
        opt.value = value;
        opt.text = text;
        select.appendChild(opt);
      });
      console.log(`✅ ${centros.length} centros de resultado carregados`);
      // Atualizar multi-select caso já exista
      try {
        const sid = select.id;
        if (typeof multiSelectData !== "undefined" && multiSelectData[sid]) {
          const newOptions = Array.from(select.options).map((opt) => ({
            value: opt.value,
            text: opt.text,
          }));
          updateMultiSelectOptions(sid, newOptions);
        }
      } catch (e) {
        console.warn("Erro ao atualizar multi-select (centros):", e);
      }
    } else {
      console.warn("⚠️ Nenhum centro de resultado encontrado na API");
    }
  } catch (e) {
    console.error("❌ Erro ao buscar centros de resultado:", e);
  }
}

// Carregar produtos via API
async function loadMeusItensFromAPI() {
  try {
    console.log("[loadMeusItensFromAPI] Chamando ApiClient.getProdutos()...");
    // Carregar produtos excluindo explicitamente agrupamento de medicamentos
    const produtos = await ApiClient.getProdutos({
      excludeAgrupamento: "MEDICAMENTOS",
    });
    console.log("[loadMeusItensFromAPI] Resposta da API:", produtos);

    if (!Array.isArray(produtos)) {
      console.warn("[loadMeusItensFromAPI] Resposta não é array:", produtos);
      return [];
    }

    console.log(
      `[loadMeusItensFromAPI] ${produtos.length} produtos retornados`,
    );
    return produtos;
  } catch (e) {
    console.error("❌ [loadMeusItensFromAPI] Erro:", e);
    return [];
  }
}

// Inicializar produtosLista via API
async function inicializarProdutosLista() {
  try {
    console.log("[inicializarProdutosLista] Iniciando carregamento...");
    produtosLista = await loadMeusItensFromAPI();

    console.log(
      "[inicializarProdutosLista] Produtos carregados:",
      produtosLista,
    );

    // Se API retornar vazio, usar fallback local apenas para desenvolvimento
    if (!produtosLista || produtosLista.length === 0) {
      console.warn("⚠️ API retornou vazio, usando fallback local");
      produtosLista = produtosExemplo || [];
    }

    // Ordenar por data de criação (mais novo primeiro)
    produtosLista.sort((a, b) => {
      const ta =
        a && a.createdAt ? new Date(a.createdAt).getTime() : Number(a.id) || 0;
      const tb =
        b && b.createdAt ? new Date(b.createdAt).getTime() : Number(b.id) || 0;
      return tb - ta;
    });

    console.log(`✅ ${produtosLista.length} produtos carregados e ordenados`);

    // Log dos primeiros produtos para debug
    if (produtosLista.length > 0) {
      console.log(
        "[inicializarProdutosLista] Primeiros 3 produtos:",
        produtosLista.slice(0, 3),
      );
    }
    // Buscar histórico de vendas para calcular "lastVenda" por produto
    try {
      console.log(
        "[inicializarProdutosLista] Buscando vendas para calcular lastVenda por produto...",
      );
      const vendas = await ApiClient.getVendas();
      if (Array.isArray(vendas) && vendas.length > 0) {
        // Map de idProduto -> data mais recente (ISO)
        const lastMap = new Map();
        vendas.forEach((v) => {
          try {
            const vendaData =
              v && (v.data || v.createdAt || v.updatedAt)
                ? new Date(v.data || v.createdAt || v.updatedAt)
                : null;
            if (!vendaData || isNaN(vendaData.getTime())) return;
            const itens = Array.isArray(v.itens)
              ? v.itens
              : v.itens && typeof v.itens === "object"
                ? [v.itens]
                : [];
            itens.forEach((item) => {
              try {
                // Tentar extrair id do produto de formas comuns
                const candidates = [];
                if (item.produtoId) candidates.push(String(item.produtoId));
                if (item.produto && (item.produto.id || item.produto.codigo))
                  candidates.push(
                    String(item.produto.id || item.produto.codigo),
                  );
                if (item.id) candidates.push(String(item.id));
                if (item.produto_id) candidates.push(String(item.produto_id));
                if (item.codigo) candidates.push(String(item.codigo));
                // normalizar: remover nulls
                const ids = candidates.filter(Boolean);
                ids.forEach((pid) => {
                  const existing = lastMap.get(pid);
                  if (!existing || new Date(existing) < vendaData) {
                    lastMap.set(pid, vendaData.toISOString());
                  }
                });
              } catch (e) {
                /* ignore item parsing errors */
              }
            });
          } catch (e) {
            /* ignore venda parse errors */
          }
        });

        // Anexar lastVenda aos produtos carregados
        produtosLista = produtosLista.map((p) => {
          try {
            const pidCandidates = [];
            if (p.id !== undefined && p.id !== null)
              pidCandidates.push(String(p.id));
            if (p.codigo) pidCandidates.push(String(p.codigo));
            // procurar no mapa por qualquer candidate
            let last = null;
            for (let c of pidCandidates) {
              if (lastMap.has(c)) {
                last = lastMap.get(c);
                break;
              }
            }
            return Object.assign({}, p, { lastVenda: last });
          } catch (e) {
            return p;
          }
        });
        console.log(
          "[inicializarProdutosLista] lastVenda anexado a produtos quando disponível",
        );
      }
    } catch (e) {
      console.debug(
        "[inicializarProdutosLista] falha ao buscar anexar lastVenda",
        e,
      );
    }
  } catch (error) {
    console.error("❌ Erro ao inicializar produtos:", error);
    produtosLista = produtosExemplo || [];
  }
}

// Migra produtos armazenados no localStorage para o backend via API
async function migrarProdutosLocalParaAPI() {
  try {
    const keys = ["meusItens", "produtos"];
    let collected = [];
    keys.forEach((k) => {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw || "[]");
          if (Array.isArray(parsed) && parsed.length > 0)
            collected = collected.concat(parsed);
        }
      } catch (e) {
        console.debug("[migrarProdutosLocalParaAPI] parse error for key", k, e);
      }
    });

    // remover duplicados por id (priorizar items com id)
    if (!collected || collected.length === 0) return { imported: 0 };

    const map = new Map();
    collected.forEach((p) => {
      try {
        const id =
          p && p.id !== undefined && p.id !== null
            ? String(p.id)
            : p && p.codigo
              ? String(p.codigo)
              : null;
        if (id) map.set(id, p);
        else {
          // gerar id baseado em timestamp quando ausente
          const gen = String(Date.now()) + Math.floor(Math.random() * 1000);
          map.set(gen, Object.assign({}, p, { id: gen }));
        }
      } catch (e) {
        /* ignore */
      }
    });

    const uniqueList = Array.from(map.values());
    if (uniqueList.length === 0) return { imported: 0 };

    console.log(
      "[migrarProdutosLocalParaAPI] iniciando import de",
      uniqueList.length,
      "produtos",
    );
    // Chamar a API de import (implementada em ApiClient.importProdutos)
    try {
      const resp = await ApiClient.importProdutos(uniqueList);
      console.log("[migrarProdutosLocalParaAPI] import response", resp);
      // limpar chaves locais somente se import aparentemente OK
      try {
        keys.forEach((k) => localStorage.removeItem(k));
        if (window.showToast)
          window.showToast(
            "Produtos migrados para o servidor",
            "success",
            3000,
          );
      } catch (e) {
        console.debug(
          "[migrarProdutosLocalParaAPI] failed clearing localStorage",
          e,
        );
      }
      return { imported: uniqueList.length, resp };
    } catch (err) {
      console.warn(
        "[migrarProdutosLocalParaAPI] falha ao importar produtos para API",
        err,
      );
      return { imported: 0, error: err };
    }
  } catch (e) {
    console.error("[migrarProdutosLocalParaAPI] erro inesperado", e);
    return { imported: 0, error: e };
  }
}

// DEBUG: helper para logar produtos carregados (valores relevantes)
function debugLogProdutos() {
  try {
    console.groupCollapsed("[meus-itens] Debug produtosLista");
    (produtosLista || []).forEach((p) => {
      console.log(
        "produto id=",
        p.id,
        "nome=",
        p.nome,
        "validade=",
        p.validade,
        "perfilValidade=",
        p.perfilValidade,
      );
    });
    console.groupEnd();
  } catch (e) {
    console.debug("[meus-itens] debugLogProdutos erro", e);
  }
}

// Buscar perfis de validade via API (evita uso de localStorage)
async function carregarPerfisValidade() {
  const select = document.getElementById("filtroPerfilValidade");
  if (!select) return;

  // Limpar opções existentes e adicionar apenas 'Todos' (remover 'Vencido' e 'A vencer')
  select.innerHTML = "";
  const optTodos = document.createElement("option");
  optTodos.value = "todos";
  optTodos.textContent = "Todos";
  select.appendChild(optTodos);

  try {
    let perfis = [];

    try {
      // Tenta obter via ApiClient - endpoint genérico de perfis de produto
      const resp = await ApiClient.getPerfisProduto();
      if (Array.isArray(resp)) perfis = resp;
    } catch (err) {
      console.debug(
        "[carregarPerfisValidade] falha ao buscar perfis via API, fallback para lista vazia",
        err,
      );
      perfis = [];
    }

    // Normalizar, filtrar por perfis de validade e popular o select
    console.debug(
      "[carregarPerfisValidade] perfis recebidos (preview):",
      perfis && perfis.slice ? perfis.slice(0, 10) : perfis,
    );

    // Heurística: perfis de validade têm campos `alerta1`/`alerta2` ou descrições no formato "NN - NN" (ex: "40 - 50")
    const validadeRegex = /^\s*\d+\s*-\s*\d+/;
    const perfisValidade = (perfis || []).filter((p) => {
      try {
        if (p === null || typeof p !== "object") return false;
        if (p.alerta1 !== undefined || p.alerta2 !== undefined) return true;
        const desc = (p.descricao || p.nome || p.value || "").toString();
        if (validadeRegex.test(desc)) return true;
        return false;
      } catch (e) {
        return false;
      }
    });

    console.debug(
      `[carregarPerfisValidade] perfis filtrados para validade: ${perfisValidade.length} de ${perfis.length}`,
    );

    perfisValidade.forEach((perfil) => {
      try {
        const option = document.createElement("option");
        const value =
          perfil && (perfil.id || perfil.value || perfil.codigo)
            ? perfil.id || perfil.value || perfil.codigo
            : "";
        const text =
          perfil &&
          (perfil.descricao || perfil.nome || perfil.display || perfil.value)
            ? perfil.descricao || perfil.nome || perfil.display || perfil.value
            : String(value || "");
        option.value = value;
        option.textContent = text;
        select.appendChild(option);
        if (!value || !text)
          console.warn(
            "[carregarPerfisValidade] perfil de validade sem id/nome detectado",
            perfil,
          );
      } catch (e) {
        console.debug("[carregarPerfisValidade] erro ao adicionar option", e);
      }
    });

    console.log(
      `📋 ${perfis.length} perfis de validade carregados no filtro (via API)`,
    );
  } catch (e) {
    console.error("❌ Erro ao carregar perfis de validade via API:", e);
  }
}

// Popula qualquer select de perfil de validade encontrado no DOM.
// Selects que devem ser atualizados podem usar a classe `perfil-validade-select`.
window.populateAllPerfilValidadeSelects = async function () {
  try {
    // Força refresh do cache
    try {
      cachedPerfisValidade = null;
    } catch (e) {}
    await fetchPerfisValidade();
    const perfis = getPerfisValidadeSync() || [];

    const selectorList = [
      "select.perfil-validade-select",
      "select#perfilValidade",
      "select#perfilValidadeNovo",
      'select[name="perfilValidade"]',
    ];
    const selects = document.querySelectorAll(selectorList.join(","));
    selects.forEach((sel) => {
      try {
        // Preserve seleção atual quando possível
        const prev = sel.value;

        // Caso seja o filtro principal, utilize a função especializada
        if (sel.id === "filtroPerfilValidade") {
          try {
            carregarPerfisValidade();
          } catch (e) {
            /* fallback abaixo */
          }
          return;
        }

        // Reconstruir opções: primeira opção vazia / padronizada
        sel.innerHTML = "";
        const optEmpty = document.createElement("option");
        optEmpty.value = "";
        optEmpty.textContent =
          sel.getAttribute("data-empty-text") || "Selecione";
        sel.appendChild(optEmpty);

        perfis.forEach((p) => {
          const o = document.createElement("option");
          const val =
            p && (p.id || p.value || p.codigo)
              ? p.id || p.value || p.codigo
              : "";
          const txt =
            p && (p.descricao || p.nome || p.display || p.value)
              ? p.descricao || p.nome || p.display || p.value
              : String(val || "");
          o.value = val;
          o.textContent = txt;
          sel.appendChild(o);
        });

        // tentar restaurar seleção
        try {
          if (prev !== undefined && prev !== null && String(prev) !== "")
            sel.value = prev;
        } catch (e) {}
      } catch (e) {
        console.debug(
          "[populateAllPerfilValidadeSelects] erro ao popular select",
          e,
        );
      }
    });
  } catch (e) {
    console.debug("[populateAllPerfilValidadeSelects] falha geral", e);
  }
};

// Quando outra tela criar/atualizar perfis, este evento deve ser disparado:
// document.dispatchEvent(new CustomEvent('perfis_validade:updated', { detail: {...} }));
document.addEventListener("perfis_validade:updated", function (ev) {
  try {
    window.populateAllPerfilValidadeSelects();
  } catch (e) {
    console.debug("listener perfis_validade:updated falhou", e);
  }
});

// Não mais dependemos de localStorage para perfis; atualizações devem vir via API

/**
 * Transforma selects nativos em dropdowns customizados com múltipla seleção (tags)
 */
function configurarDropdownsCustomizados() {
  const selectIds = [
    "filtroAgrupamento",
    "filtroMarca",
    "filtroFornecedor",
    "filtroAtivo",
    "filtroFinalidade",
    "filtroCentroResultado",
    "filtroPerfilValidade",
  ];

  selectIds.forEach((id) => {
    const select = document.getElementById(id);
    if (!select || select.dataset.customDropdown === "true") return;

    // Marcar como processado
    select.dataset.customDropdown = "true";

    // Array para armazenar valores selecionados
    const selectedValues = [];

    // Criar wrapper se não existir
    let wrapper = select.parentElement;
    if (!wrapper.classList.contains("select-wrapper")) {
      const wrap = document.createElement("div");
      wrap.className = "select-wrapper";
      select.parentElement.insertBefore(wrap, select);
      wrap.appendChild(select);
      wrapper = wrap;
    }

    // Esconder o select nativo
    select.style.display = "none";

    // Criar container de tags
    const tagsContainer = document.createElement("div");
    tagsContainer.className = "multi-select-tags-container";
    tagsContainer.style.cursor = "pointer";
    wrapper.insertBefore(tagsContainer, select);

    // Criar área de tags
    const tagsArea = document.createElement("div");
    tagsArea.className = "multi-select-tags-area";
    tagsContainer.appendChild(tagsArea);

    // Criar placeholder
    const placeholder = document.createElement("span");
    placeholder.className = "multi-select-placeholder";
    placeholder.textContent = "Selecione uma ou mais opções";
    tagsArea.appendChild(placeholder);

    let dropdown = null;

    // Função para adicionar tag
    function addTag(value, text) {
      const val = value === undefined || value === null ? "" : String(value);
      const txt = text === undefined || text === null ? "" : String(text);

      // Não adicionar 'todos', 'undefined' ou valores vazios
      if (
        !val ||
        val.trim() === "" ||
        val.toLowerCase() === "todos" ||
        txt.toLowerCase() === "todos" ||
        val.toLowerCase() === "undefined"
      ) {
        console.log("🚫 Ignorar addTag inválido", {
          id: id,
          value: value,
          text: text,
        });
        return;
      }

      if (selectedValues.includes(val)) return;

      selectedValues.push(val);

      // Remover placeholder
      if (placeholder.parentElement) {
        placeholder.remove();
      }

      // Criar tag com DOM (evitar innerHTML)
      const tag = document.createElement("span");
      tag.className = "multi-select-tag";
      const tn = document.createTextNode(txt + " ");
      tag.appendChild(tn);
      const icon = document.createElement("i");
      icon.className = "fas fa-times";
      icon.dataset.value = val;
      icon.style.cursor = "pointer";
      tag.appendChild(icon);

      // Evento para remover tag
      icon.addEventListener("click", (e) => {
        e.stopPropagation();
        removeTag(val);
      });

      tagsArea.appendChild(tag);

      // Marcar a opção correspondente no select original (se existir)
      try {
        const opt = Array.from(select.options).find(
          (o) => String(o.value) === val || String(o.text) === txt,
        );
        if (opt) opt.selected = true;
      } catch (e) {
        console.debug("addTag select mark error", e);
      }

      // Atualizar dropdown se estiver aberto
      if (dropdown) {
        updateDropdown();
      }
      // Reaplicar filtros imediatamente para manter UI responsiva
      try {
        setTimeout(() => {
          try {
            renderizarProdutos(
              document.querySelector(".tab-btn.active")?.dataset.category ||
                "todos",
              coletarFiltrosAtuais(),
            );
          } catch (e) {}
        }, 50);
      } catch (e) {}
    }

    // Função para remover tag
    function removeTag(value) {
      const index = selectedValues.indexOf(value);
      if (index > -1) {
        selectedValues.splice(index, 1);
      }

      // Remover elemento visual
      const tags = tagsArea.querySelectorAll(".multi-select-tag");
      tags.forEach((tag) => {
        const icon = tag.querySelector("i");
        if (icon && icon.dataset.value === value) {
          tag.remove();
        }
      });

      // Mostrar placeholder se não houver tags
      if (selectedValues.length === 0 && !placeholder.parentElement) {
        tagsArea.appendChild(placeholder);
      }

      // Desmarcar opção correspondente no select original
      try {
        let found = false;
        Array.from(select.options).forEach((o) => {
          try {
            if (
              String(o.value) === String(value) ||
              String(o.text) === String(value)
            ) {
              o.selected = false;
              found = true;
            }
          } catch (e) {}
        });
        if (!found) {
          try {
            select.value = "";
          } catch (e) {
            select.selectedIndex = -1;
          }
        }
        try {
          select.dispatchEvent(new Event("change"));
        } catch (e) {}
      } catch (e) {
        console.debug("removeTag select unmark error", e);
      }

      // Atualizar dropdown se estiver aberto
      if (dropdown) {
        updateDropdown();
      }

      // Se não houver mais tags selecionadas, resetar o select para 'vazio' ou 'todos'
      try {
        if (selectedValues.length === 0) {
          // Preferir opção com value == '' quando existir
          const emptyOpt = Array.from(select.options).find(
            (o) => o.value === "" || o.value === undefined,
          );
          if (emptyOpt) {
            select.value = "";
          } else {
            const todosOpt = Array.from(select.options).find(
              (o) => String(o.value).toLowerCase() === "todos",
            );
            if (todosOpt) select.value = todosOpt.value;
            else select.selectedIndex = -1;
          }
        }
      } catch (e) {
        console.debug("removeTag reset select error", e);
      }
    }

    // Função para atualizar dropdown
    function updateDropdown() {
      if (!dropdown) return;

      const items = dropdown.querySelectorAll(".select-item");
      items.forEach((item) => {
        const value = item.dataset.value;
        if (selectedValues.includes(value)) {
          item.classList.add("selected");
        } else {
          item.classList.remove("selected");
        }
      });
    }

    // Função para mostrar dropdown
    function showDropdown(e) {
      e.stopPropagation();

      // Fechar outros dropdowns
      document.querySelectorAll(".select-dropdown").forEach((d) => {
        if (d !== dropdown) d.remove();
      });

      if (dropdown) {
        dropdown.remove();
        dropdown = null;
        return;
      }

      dropdown = document.createElement("div");
      dropdown.className = "select-dropdown";

      Array.from(select.options).forEach((option, index) => {
        // Pular opção "Todos" (verificar valor e texto)
        const optVal =
          option.value === undefined || option.value === null
            ? ""
            : String(option.value).toLowerCase();
        const optTxt =
          option.text === undefined || option.text === null
            ? ""
            : String(option.text).toLowerCase();
        if (
          optVal === "todos" ||
          optTxt === "todos" ||
          optVal.trim() === "" ||
          optVal === "undefined"
        ) {
          // ignorar
          return;
        }

        const item = document.createElement("div");
        item.className = "select-item";
        const itemVal = String(option.value);
        if (selectedValues.includes(itemVal)) {
          item.classList.add("selected");
        }
        item.textContent = option.text;
        item.dataset.value = itemVal;

        item.addEventListener("click", (e) => {
          e.stopPropagation();
          console.log("click item", {
            id: id,
            value: option.value,
            text: option.text,
          });
          if (selectedValues.includes(itemVal)) {
            removeTag(itemVal);
          } else {
            addTag(itemVal, option.text);
          }
        });

        dropdown.appendChild(item);
      });

      wrapper.appendChild(dropdown);

      // Posicionar dropdown
      dropdown.style.top = tagsContainer.offsetHeight + 6 + "px";
      dropdown.style.left = "0";
      dropdown.style.minWidth = tagsContainer.offsetWidth + "px";
    }

    // Eventos
    tagsContainer.addEventListener("click", showDropdown);

    // Fechar ao clicar fora
    document.addEventListener("click", (e) => {
      if (!wrapper.contains(e.target) && dropdown) {
        dropdown.remove();
        dropdown = null;
      }
    });

    // Atualizar quando o select mudar programaticamente
    const observer = new MutationObserver(() => {
      // Sincronizar com mudanças externas se necessário
    });
    observer.observe(select, { childList: true, subtree: true });
  });

  console.log("✅ Dropdowns multi-select com tags configurados");
}

/**
 * Inicializar funcionalidades de Meus Itens
 */
async function inicializarMeusItens() {
  console.log("🔄 Inicializando Meus Itens...");
  // Garantir que não exista key legada 'perfis_validade' no localStorage
  try {
    localStorage.removeItem("perfis_validade");
  } catch (e) {}

  // Configurar abas
  configurarAbas();

  // Carregar perfis de validade no dropdown (aguarda e popula cache)
  try {
    await carregarPerfisValidade();
  } catch (e) {
    console.debug("[inicializarMeusItens] carregarPerfisValidade falhou", e);
  }

  // Migrar produtos que ainda estejam no localStorage (uma vez)
  try {
    await migrarProdutosLocalParaAPI();
  } catch (e) {
    console.debug("[inicializarMeusItens] migracao falhou", e);
  }

  // Renderizar produtos (carregar lista via API e verificar status de validade antes)
  await inicializarProdutosLista();
  debugLogProdutos();

  // Popular filtros após carregar produtos
  try {
    populateFiltroAgrupamento();
  } catch (e) {
    console.debug("[inicializarMeusItens] erro ao popular agrupamento", e);
  }
  try {
    populateFiltroMarca();
  } catch (e) {
    console.debug("[inicializarMeusItens] erro ao popular marca", e);
  }
  try {
    populateFiltroFornecedor();
  } catch (e) {
    console.debug("[inicializarMeusItens] erro ao popular fornecedor", e);
  }
  try {
    populateCentroResultado();
  } catch (e) {
    console.debug("[inicializarMeusItens] erro ao popular centro resultado", e);
  }

  // Configurar dropdowns customizados após popular os selects
  setTimeout(() => {
    try {
      configurarDropdownsCustomizados();
    } catch (e) {
      console.debug(
        "[inicializarMeusItens] erro ao configurar dropdowns customizados",
        e,
      );
    }
  }, 300);

  // Aguardar um momento para garantir que os selects foram populados
  setTimeout(() => {
    try {
      initializeMultiSelects();
    } catch (e) {
      console.debug(
        "[inicializarMeusItens] erro ao inicializar multi-selects",
        e,
      );
    }
  }, 300);

  // Carregar filtros salvos no banco (se houver) e aplicá-los
  try {
    await carregarFiltrosSalvos();
  } catch (e) {
    console.debug("[inicializarMeusItens] carregarFiltrosSalvos falhou", e);
  }

  // buscar status de validade no backend (se disponível) e depois renderizar
  obterStatusValidade()
    .then(() => {
      console.debug("[meus-itens] validadeStatusMap final=", validadeStatusMap);
      renderizarProdutos("todos");
    })
    .catch((err) => {
      console.debug("[meus-itens] obterStatusValidade erro", err);
      renderizarProdutos("todos");
    });

  // Configurar botões
  configurarBotoes();

  // Configurar busca com sugestões
  configurarBuscaComSugestoes();

  console.log("✅ Meus Itens inicializado com sucesso");
}

/**
 * Configurar funcionalidade das abas
 */
function configurarAbas() {
  const tabBtns = document.querySelectorAll(".tab-btn");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      // Remover classe active de todas as abas
      tabBtns.forEach((b) => b.classList.remove("active"));

      // Adicionar classe active na aba clicada
      this.classList.add("active");

      // Obter categoria
      const categoria = this.dataset.category;

      // Renderizar produtos filtrados
      renderizarProdutos(categoria);

      console.log(`📂 Categoria selecionada: ${categoria}`);
    });
  });
}

/**
 * Renderizar produtos no grid
 */
function getLastPriceChangeDate(produto) {
  try {
    if (!produto) return null;

    function tryParse(d) {
      if (!d && d !== 0) return null;
      if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
      const s = String(d).trim();
      // dd/mm/yyyy
      const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (m) {
        const day = Number(m[1]),
          month = Number(m[2]) - 1,
          year = Number(m[3]);
        const D = new Date(year, month, day);
        if (!isNaN(D.getTime())) return D;
      }
      const D2 = new Date(s);
      if (!isNaN(D2.getTime())) return D2;
      return null;
    }

    // Common direct fields (prioritizar campo explícito `ultimoPrecoAlterado`)
    // Evitar usar `updatedAt` aqui pois atualizações gerais no produto geram muitos falsos-positivos
    const directKeys = [
      "ultimoPrecoAlterado",
      "ultimo_preco_alterado",
      "precoAlteradoAt",
      "preco_alterado_at",
      "ultimoPrecoAlterado",
      "ultimo_preco_alterado",
      "ultimoPrecoAlteradoRaw",
      "ultimo_preco_raw",
      "lastPriceChange",
      "precoAlteradoEm",
      "preco_alterado_em",
      "precoUpdatedAt",
      "preco_updated_at",
      "preco_update_at",
    ];
    for (let k of directKeys) {
      if (produto[k]) {
        const d = tryParse(produto[k]);
        if (d) {
          try {
            console.log(
              "[getLastPriceChangeDate] chave encontrada para produto",
              produto && produto.nome,
              ":",
              k,
              d,
            );
          } catch (e) {}
          return d;
        }
      }
    }

    // Check for arrays that may contain history entries
    const arrayKeys = [
      "precos",
      "precosHistorico",
      "historicoPrecos",
      "precoHistorico",
      "priceHistory",
      "precoAlteracoes",
      "alteracoesPreco",
      "prices",
    ];
    for (let ak of arrayKeys) {
      const arr = produto[ak];
      if (Array.isArray(arr) && arr.length) {
        let latest = null;
        for (let el of arr) {
          if (!el) continue;
          // try common date-like properties
          const cand =
            el.updatedAt ||
            el.updated_at ||
            el.data ||
            el.dataAlteracao ||
            el.data_alteracao ||
            el.date ||
            el.dt ||
            el.createdAt ||
            el.created_at ||
            el.timestamp ||
            el.time ||
            el.dataHora;
          const d = tryParse(cand);
          if (d) {
            if (!latest || d.getTime() > latest.getTime()) latest = d;
          }
        }
        if (latest) return latest;
      }
    }

    // As fallback, look into nested structures for a date-like value
    for (let key in produto) {
      try {
        const val = produto[key];
        if (typeof val === "object" && val !== null) {
          const cand =
            val.updatedAt || val.updated_at || val.data || val.date || val.dt;
          const d = tryParse(cand);
          if (d) return d;
        }
      } catch (e) {}
    }
  } catch (e) {
    console.debug("[getLastPriceChangeDate] erro", e);
  }
  return null;
}
function renderizarProdutos(categoria, filtrosAdicionais = {}) {
  const grid = document.getElementById("productsGrid");

  console.log("[renderizarProdutos] ===== INÍCIO =====");
  console.log("[renderizarProdutos] categoria:", categoria);
  console.log(
    "[renderizarProdutos] produtosLista.length:",
    produtosLista ? produtosLista.length : "null/undefined",
  );
  console.log("[renderizarProdutos] filtrosAdicionais:", filtrosAdicionais);

  if (!grid) {
    console.error("❌ Grid de produtos não encontrado");
    return;
  }

  // Filtrar produtos por categoria e por status (remover inativos)
  let produtosFiltrados = produtosLista || produtosExemplo;

  // aplicar filtro de categoria quando fornecido
  if (categoria !== "todos") {
    produtosFiltrados = (produtosLista || produtosExemplo).filter(
      (p) => p.tipo === categoria,
    );
  }

  // Aplicar filtro de 'Ativo' conforme solicitado pelo usuário em filtrosAdicionais
  // Possíveis valores: 'sim' (apenas ativos), 'nao' (apenas inativos), 'todos' (todos)
  try {
    const filtroAtivoRaw =
      filtrosAdicionais && typeof filtrosAdicionais.ativo !== "undefined"
        ? filtrosAdicionais.ativo
        : undefined;
    // Quando não informado (undefined/null/'') devemos mostrar TODOS os produtos
    const filtroAtivo =
      filtroAtivoRaw === null ||
      filtroAtivoRaw === undefined ||
      String(filtroAtivoRaw).trim() === ""
        ? "todos"
        : String(filtroAtivoRaw).toLowerCase();

    produtosFiltrados = produtosFiltrados.filter((p) => {
      try {
        if (p === null || p === undefined) return false;
        const v = p.ativo;
        // tratar itens antigos (sem propriedade) como ativos
        let isActive;
        if (v === undefined || v === null || v === "") {
          isActive = true;
        } else if (typeof v === "boolean") {
          isActive = v === true;
        } else {
          const vStr = String(v).toLowerCase();
          isActive = vStr === "sim" || vStr === "true" || vStr === "1";
        }

        if (filtroAtivo === "todos") return true;
        if (filtroAtivo === "sim") return isActive;
        if (
          filtroAtivo === "nao" ||
          filtroAtivo === "não" ||
          filtroAtivo === "false" ||
          filtroAtivo === "0"
        )
          return !isActive;
        // fallback: manter apenas ativos
        return isActive;
      } catch (e) {
        console.warn(
          "[renderizarProdutos] erro ao verificar ativo para produto:",
          p,
        );
        return true;
      }
    });
  } catch (e) {
    console.debug(
      "[renderizarProdutos] falha ao aplicar filtroAtivo, mantendo comportamento anterior",
      e,
    );
  }

  // Aplicar filtros de múltipla seleção (arrays)
  if (
    filtrosAdicionais.agrupamento &&
    Array.isArray(filtrosAdicionais.agrupamento) &&
    filtrosAdicionais.agrupamento.length > 0
  ) {
    console.log("🔍 Filtrando por Agrupamento:", filtrosAdicionais.agrupamento);
    produtosFiltrados = produtosFiltrados.filter((p) => {
      if (!p.agrupamento) return false;
      const agrupamentoProdutoRaw =
        typeof p.agrupamento === "object"
          ? p.agrupamento.nome || p.agrupamento.id
          : p.agrupamento;
      const agrupamentoProduto = (agrupamentoProdutoRaw || "").toString();
      return filtrosAdicionais.agrupamento.some((valor) => {
        const v = (valor || "").toString();
        try {
          const a = normalizarTexto(agrupamentoProduto);
          const b = normalizarTexto(v);
          return a === b || a.includes(b) || b.includes(a);
        } catch (e) {
          return agrupamentoProduto.toString() === v.toString();
        }
      });
    });
  }

  if (
    filtrosAdicionais.marca &&
    Array.isArray(filtrosAdicionais.marca) &&
    filtrosAdicionais.marca.length > 0
  ) {
    console.log("🔍 Filtrando por Marca:", filtrosAdicionais.marca);
    produtosFiltrados = produtosFiltrados.filter((p) => {
      if (!p.marca) return false;
      const marcaProdutoRaw =
        typeof p.marca === "object" ? p.marca.nome || p.marca.id : p.marca;
      const marcaProduto = (marcaProdutoRaw || "").toString();
      return filtrosAdicionais.marca.some((valor) => {
        const v = (valor || "").toString();
        try {
          const a = normalizarTexto(marcaProduto);
          const b = normalizarTexto(v);
          return a === b || a.includes(b) || b.includes(a);
        } catch (e) {
          return marcaProduto.toString() === v.toString();
        }
      });
    });
  }

  if (
    filtrosAdicionais.fornecedor &&
    Array.isArray(filtrosAdicionais.fornecedor) &&
    filtrosAdicionais.fornecedor.length > 0
  ) {
    console.log("🔍 Filtrando por Fornecedor:", filtrosAdicionais.fornecedor);
    // helper para extrair possíveis strings do objeto fornecedor
    function extractFornecedorStrings(fObj) {
      const out = [];
      if (!fObj && fObj !== 0) return out;
      if (typeof fObj === "string" || typeof fObj === "number") {
        out.push(String(fObj));
        return out;
      }
      try {
        const candidates = [
          "nome",
          "nomeFantasia",
          "fantasia",
          "razaoSocial",
          "razao",
          "descricao",
          "id",
          "codigo",
        ];
        candidates.forEach((k) => {
          if (fObj[k]) out.push(String(fObj[k]));
        });
        // tentar propriedades comuns aninhadas
        if (fObj.pessoa && typeof fObj.pessoa === "object") {
          if (fObj.pessoa.nome) out.push(String(fObj.pessoa.nome));
        }
        // fallback: stringify whole object
        if (out.length === 0) {
          out.push(JSON.stringify(fObj));
        }
      } catch (e) {
        out.push(String(fObj));
      }
      return out.map((s) => s.trim()).filter(Boolean);
    }

    function fornecedorMatches(produto, filtroVal) {
      try {
        const filtroNorm = normalizarTexto(String(filtroVal || ""));

        // Extrair candidatos do próprio produto (vários campos)
        const candidates = [];
        // se existir objeto fornecedor, usar suas propriedades
        if (produto && produto.fornecedor) {
          extractFornecedorStrings(produto.fornecedor).forEach((s) =>
            candidates.push(s),
          );
        }
        // checar campos comuns no produto
        const possibleFields = [
          "fornecedorNome",
          "fornecedor_nome",
          "fornecedorNomeFantasia",
          "fornecedorFantasia",
          "fornecedorRazao",
          "fornecedorRazaoSocial",
          "fornecedorId",
          "fornecedor_id",
          "fornecedorCodigo",
          "fornecedorCodigoBarra",
          "marca",
          "fornecedor",
          "fornecedorText",
          "fornecedorDescricao",
        ];
        possibleFields.forEach((k) => {
          try {
            if (produto && produto[k]) candidates.push(String(produto[k]));
          } catch (e) {}
        });

        // também verificar propriedades aninhadas
        try {
          if (produto && produto.fornecedor && produto.fornecedor.nome)
            candidates.push(String(produto.fornecedor.nome));
        } catch (e) {}
        try {
          if (produto && produto.fornecedor && produto.fornecedor.razaoSocial)
            candidates.push(String(produto.fornecedor.razaoSocial));
        } catch (e) {}

        // Se houver array `fornecedores` (novo-produto salva nesse formato), extrair nomes
        try {
          if (
            produto &&
            Array.isArray(produto.fornecedores) &&
            produto.fornecedores.length
          ) {
            produto.fornecedores.forEach((f) => {
              try {
                if (f && (f.fornecedor || f.nome))
                  candidates.push(String(f.fornecedor || f.nome));
                else candidates.push(JSON.stringify(f));
              } catch (e) {}
            });
          }
        } catch (e) {
          /* ignore */
        }

        // fallback: stringify whole produto
        if (candidates.length === 0) {
          candidates.push(JSON.stringify(produto));
        }

        // normalizar e comparar
        for (let i = 0; i < candidates.length; i++) {
          const pv = normalizarTexto(String(candidates[i] || ""));
          if (!pv) continue;
          if (
            pv === filtroNorm ||
            pv.includes(filtroNorm) ||
            filtroNorm.includes(pv)
          ) {
            return true;
          }
        }
        // nenhum candidato bateu
        console.log(
          "[filter-fornecedor] candidatos não bateram:",
          candidates,
          " | filtro:",
          filtroVal,
        );
        return false;
      } catch (e) {
        console.debug("[filter-fornecedor] erro na comparação:", e);
        return false;
      }
    }

    produtosFiltrados = produtosFiltrados.filter((p) => {
      // Excluir explicitamente produtos do tipo serviço ou planos ao filtrar por fornecedor
      try {
        const tipoVal = p && (p.tipo || p.type) ? String(p.tipo || p.type) : "";
        const categoriaVal =
          p && (p.categoria || p.category || p.categoriaNome)
            ? String(p.categoria || p.category || p.categoriaNome)
            : "";
        const tipoNorm = normalizarTexto(tipoVal);
        const categoriaNorm = normalizarTexto(categoriaVal);
        // palavras que identificam serviços/planos
        if (
          (tipoNorm &&
            (tipoNorm.includes("serv") || tipoNorm.includes("plano"))) ||
          (categoriaNorm &&
            (categoriaNorm.includes("serv") || categoriaNorm.includes("plano")))
        ) {
          return false; // não incluir serviços/planos no filtro por fornecedor
        }
      } catch (e) {
        /* ignore */
      }

      return filtrosAdicionais.fornecedor.some((valor) => {
        const match = fornecedorMatches(p, valor);
        console.log(
          "[filter-fornecedor] produto id:",
          p && p.id,
          "| candidatos:",
          (p && p.fornecedor) || "(sem fornecedor)",
          "| filtro:",
          valor,
          "| match:",
          match,
        );
        return match;
      });
    });
  }

  if (
    filtrosAdicionais.centroResultado &&
    Array.isArray(filtrosAdicionais.centroResultado) &&
    filtrosAdicionais.centroResultado.length > 0
  ) {
    console.log(
      "🔍 Filtrando por Centro de Resultado:",
      filtrosAdicionais.centroResultado,
    );
    produtosFiltrados = produtosFiltrados.filter((p) => {
      if (!p.centroResultado) return false;
      const centroProdutoRaw =
        typeof p.centroResultado === "object"
          ? p.centroResultado.nome || p.centroResultado.id
          : p.centroResultado;
      const centroProduto = (centroProdutoRaw || "").toString();
      return filtrosAdicionais.centroResultado.some((valor) => {
        const v = (valor || "").toString();
        try {
          const a = normalizarTexto(centroProduto);
          const b = normalizarTexto(v);
          return a === b || a.includes(b) || b.includes(a);
        } catch (e) {
          return centroProduto.toString() === v.toString();
        }
      });
    });
  }

  // Aplicar filtro de Finalidade (ex: 'revenda' ou 'insumo')
  try {
    if (
      filtrosAdicionais &&
      filtrosAdicionais.finalidade &&
      String(filtrosAdicionais.finalidade).toLowerCase().trim() !== "" &&
      String(filtrosAdicionais.finalidade).toLowerCase().trim() !== "todos"
    ) {
      const targetFinalidade = String(filtrosAdicionais.finalidade)
        .toLowerCase()
        .trim();
      console.log("🔍 Filtrando por Finalidade:", targetFinalidade);
      produtosFiltrados = produtosFiltrados.filter((p) => {
        try {
          if (!p) return false;
          let pf = p.finalidade;
          if (pf === undefined || pf === null) return false;
          // suportar objeto ou string
          let pfStr = "";
          if (typeof pf === "object") {
            pfStr = String(
              pf.value || pf.nome || pf.id || pf.display || pf,
            ).toLowerCase();
          } else {
            pfStr = String(pf).toLowerCase();
          }
          // permissivo: aceitar quando o campo contém a palavra (ex: 'revenda', 'insumo')
          if (pfStr.indexOf(targetFinalidade) !== -1) return true;
          return false;
        } catch (e) {
          return false;
        }
      });
      console.log(
        `✅ ${produtosFiltrados.length} produtos após filtro Finalidade`,
      );
    }
  } catch (e) {
    console.debug("[renderizarProdutos] falha ao aplicar filtro Finalidade", e);
  }

  // Aplicar filtro de Perfil de Validade
  if (
    filtrosAdicionais.perfilValidade &&
    filtrosAdicionais.perfilValidade !== "todos"
  ) {
    let perfilSelecionado = filtrosAdicionais.perfilValidade || "";

    // Remover prefixo "perfil::" se existir
    try {
      if (
        perfilSelecionado &&
        perfilSelecionado.startsWith &&
        perfilSelecionado.startsWith("perfil::")
      ) {
        perfilSelecionado = perfilSelecionado.replace("perfil::", "");
      }
    } catch (e) {}

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    console.log("🔍 Filtrando por Perfil de Validade:", perfilSelecionado);

    produtosFiltrados = produtosFiltrados.filter((p) => {
      console.log(`  🔍 Verificando produto: ${p.nome}`);
      console.log(`     p.perfilValidade:`, p.perfilValidade);
      console.log(`     p.validade:`, p.validade);

      // OPÇÃO 1: Verificar se o produto tem o perfil de validade atribuído
      // Podem existir perfis identificados por id (value) ou por descrição. Vamos suportar ambos.
      let temPerfilAtribuido = false;
      try {
        const perfis = getPerfisValidadeSync();

        // tentar localizar o objeto de perfil correspondente ao selecionado (pode ser id ou descricao)
        const perfilSel = (perfis || []).find((pf) => {
          try {
            const idCand = String(pf.id || pf.value || pf.codigo || "").trim();
            const descCand = String(
              pf.descricao || pf.nome || pf.display || pf.value || "",
            ).trim();
            if (!perfilSelecionado) return false;
            if (idCand && idCand === String(perfilSelecionado)) return true;
            if (descCand && descCand === String(perfilSelecionado)) return true;
            return false;
          } catch (e) {
            return false;
          }
        });

        if (p.perfilValidade) {
          // Se produto armazena objeto, verificar id e descricao
          if (typeof p.perfilValidade === "object") {
            const pid = String(
              p.perfilValidade.id || p.perfilValidade.value || "",
            ).trim();
            const pdesc = String(
              p.perfilValidade.descricao || p.perfilValidade.nome || "",
            ).trim();
            if (perfilSel) {
              if (
                pid &&
                String(perfilSel.id || perfilSel.value || perfilSel.codigo) ===
                  pid
              )
                temPerfilAtribuido = true;
              if (
                !temPerfilAtribuido &&
                pdesc &&
                String(
                  perfilSel.descricao || perfilSel.nome || perfilSel.display,
                ) === pdesc
              )
                temPerfilAtribuido = true;
            } else {
              // comparar diretamente com o valor selecionado (caso select contenha descricao text)
              if (pid && String(pid) === String(perfilSelecionado))
                temPerfilAtribuido = true;
              if (pdesc && String(pdesc) === String(perfilSelecionado))
                temPerfilAtribuido = true;
            }
          } else {
            // produto armazena string (provavelmente descricao)
            const pstr = String(p.perfilValidade).trim();
            if (perfilSel) {
              const descSel = String(
                perfilSel.descricao ||
                  perfilSel.nome ||
                  perfilSel.display ||
                  "",
              ).trim();
              if (descSel && descSel === pstr) temPerfilAtribuido = true;
              const idSel = String(
                perfilSel.id || perfilSel.value || perfilSel.codigo || "",
              ).trim();
              if (!temPerfilAtribuido && idSel && idSel === pstr)
                temPerfilAtribuido = true;
            } else {
              if (pstr === String(perfilSelecionado)) temPerfilAtribuido = true;
            }
          }

          console.log(
            `     Perfil do produto (avaliado):`,
            p.perfilValidade,
            "=> match:",
            temPerfilAtribuido,
          );
          if (temPerfilAtribuido) {
            console.log(
              `     ✅ INCLUÍDO: Produto tem perfil "${perfilSelecionado}" atribuído`,
            );
            return true;
          }
        }
      } catch (e) {
        console.debug("[filtro-perfilValidade] erro ao comparar perfis", e);
      }

      // OPÇÃO 2: Verificar se tem data de validade dentro do período
      if (!p.validade) {
        console.log(
          `     ❌ EXCLUÍDO: Sem data de validade e sem perfil correspondente`,
        );
        return false;
      }

      const dataValidade = new Date(p.validade);
      const diasRestantes = Math.ceil(
        (dataValidade - hoje) / (1000 * 60 * 60 * 24),
      );

      console.log(
        `     📅 Data de validade: ${p.validade}, diasRestantes: ${diasRestantes}`,
      );

      // Aplicar filtro baseado no perfil selecionado
      if (perfilSelecionado === "vencido") {
        const match = diasRestantes < 0;
        console.log(
          `     Filtro "vencido": ${match ? "✅ INCLUÍDO" : "❌ EXCLUÍDO"}`,
        );
        return match;
      } else if (perfilSelecionado === "a-vencer") {
        // A vencer = qualquer produto com menos de 30 dias
        const match = diasRestantes >= 0 && diasRestantes <= 30;
        console.log(
          `     Filtro "a-vencer": ${match ? "✅ INCLUÍDO" : "❌ EXCLUÍDO"}`,
        );
        return match;
      } else {
        // Para perfis específicos (ex: "30-20 DIAS" ou "15-10 DIAS")
        // Buscar os thresholds do perfil selecionado (do cache em memória)
        const perfis = getPerfisValidadeSync();
        const perfilSel = perfis.find(
          (pf) =>
            pf &&
            (pf.descricao || pf.value || pf.nome) &&
            String(pf.descricao || pf.value || pf.nome).trim() ===
              String(perfilSelecionado).trim(),
        );

        if (perfilSel) {
          const alerta1 = perfilSel.alerta1 || 30; // threshold superior
          const alerta2 = perfilSel.alerta2 || 15; // threshold inferior

          // Produto está no range de alerta deste perfil?
          // Entre 0 e alerta1 dias (ex: entre 0 e 30 dias para "30-20 DIAS")
          const matchRange = diasRestantes >= 0 && diasRestantes <= alerta1;
          console.log(
            `     Perfil "${perfilSelecionado}": alerta1=${alerta1}, alerta2=${alerta2}, matchRange=${matchRange ? "✅ INCLUÍDO" : "❌ EXCLUÍDO"}`,
          );
          return matchRange;
        } else {
          console.log(
            `     ⚠️ Perfil "${perfilSelecionado}" não encontrado no cache de perfis`,
          );
          return false;
        }
      }
    });

    console.log(
      `✅ ${produtosFiltrados.length} produtos após filtro de Perfil de Validade`,
    );
  }

  // Aplicar filtro de texto (query) se fornecido
  try {
    if (
      filtrosAdicionais &&
      filtrosAdicionais.query &&
      String(filtrosAdicionais.query).trim() !== ""
    ) {
      const q = normalizarTexto(String(filtrosAdicionais.query));
      produtosFiltrados = produtosFiltrados.filter((p) => {
        const nome = normalizarTexto(p.nome || "");
        const codigo = normalizarTexto((p.codigo || p.id || "").toString());
        const codigoBarras = normalizarTexto((p.codigoBarras || "").toString());
        return (
          nome.includes(q) || codigo.includes(q) || codigoBarras.includes(q)
        );
      });
      console.log(
        `🔍 Filtro de texto aplicado: "${filtrosAdicionais.query}", ${produtosFiltrados.length} produtos resultantes`,
      );
    }
  } catch (e) {
    console.debug("[renderizarProdutos] erro ao aplicar filtro de texto:", e);
  }

  // Aplicar filtros de preço (Preço de Custo e Preço de Venda)
  try {
    const parseNumber = (v) => {
      if (v === undefined || v === null) return null;
      const s = String(v).trim();
      if (s === "") return null;
      // remover 'R$', espaços, milhares e trocar vírgula por ponto
      let cleaned = s
        .replace(/R\$|\s/g, "")
        .replace(/\./g, "")
        .replace(/,/g, ".");
      cleaned = cleaned.replace(/[^0-9.\-]/g, "");
      const n = parseFloat(cleaned);
      return isNaN(n) ? null : n;
    };

    const custoMin = parseNumber(filtrosAdicionais.custoMin);
    const custoMax = parseNumber(filtrosAdicionais.custoMax);
    const vendaMin = parseNumber(filtrosAdicionais.vendaMin);
    const vendaMax = parseNumber(filtrosAdicionais.vendaMax);

    if (custoMin !== null || custoMax !== null) {
      produtosFiltrados = produtosFiltrados.filter((p) => {
        try {
          const custo =
            p.custoBase !== undefined && p.custoBase !== null
              ? Number(p.custoBase)
              : p.custo || 0;
          if (custoMin !== null && custo < custoMin) return false;
          if (custoMax !== null && custo > custoMax) return false;
          return true;
        } catch (e) {
          return true;
        }
      });
      console.log(
        `[renderizarProdutos] Aplicado filtro custoMin=${custoMin}, custoMax=${custoMax}, resultado=${produtosFiltrados.length}`,
      );
    }

    if (vendaMin !== null || vendaMax !== null) {
      produtosFiltrados = produtosFiltrados.filter((p) => {
        try {
          const venda =
            p.preco !== undefined && p.preco !== null
              ? Number(p.preco)
              : p.precoVenda || p.preco_venda || 0;
          if (vendaMin !== null && venda < vendaMin) return false;
          if (vendaMax !== null && venda > vendaMax) return false;
          return true;
        } catch (e) {
          return true;
        }
      });
      console.log(
        `[renderizarProdutos] Aplicado filtro vendaMin=${vendaMin}, vendaMax=${vendaMax}, resultado=${produtosFiltrados.length}`,
      );
    }
  } catch (e) {
    console.debug("[renderizarProdutos] erro ao aplicar filtros de preço:", e);
  }

  // Aplicar filtro: Preços Alterados no Período (se fornecido)
  try {
    if (
      filtrosAdicionais &&
      filtrosAdicionais.precosAlterados &&
      filtrosAdicionais.precosAlterados.from &&
      filtrosAdicionais.precosAlterados.to
    ) {
      console.log(
        "🔍 Filtrando por Preços Alterados entre:",
        filtrosAdicionais.precosAlterados.from,
        filtrosAdicionais.precosAlterados.to,
      );
      produtosFiltrados = produtosFiltrados.filter((p) => {
        try {
          // obter data da última alteração de preço usando helper genérico
          const d = getLastPriceChangeDate(p);
          // DEBUG: log auxiliar para investigação de por que itens não entram no filtro
          try {
            console.log(
              "[filter-precosAlterados] produto:",
              p && p.nome,
              "candidateDate:",
              d,
            );
          } catch (e) {}
          if (!d) return false;
          const match =
            d >= filtrosAdicionais.precosAlterados.from &&
            d <= filtrosAdicionais.precosAlterados.to;
          try {
            if (!match)
              console.log(
                "[filter-precosAlterados] EXCLUÍDO por data:",
                p && p.nome,
                d,
              );
          } catch (e) {}
          return match;
        } catch (e) {
          return false;
        }
      });
      console.log(
        `[renderizarProdutos] após filtro preçosAlterados: ${produtosFiltrados.length} itens`,
      );
    }
  } catch (e) {
    console.debug(
      "[renderizarProdutos] erro ao aplicar filtro preçosAlterados:",
      e,
    );
  }

  // Aplicar filtro: Período de Validade (se fornecido)
  try {
    if (
      filtrosAdicionais &&
      filtrosAdicionais.periodoValidade &&
      filtrosAdicionais.periodoValidade.from &&
      filtrosAdicionais.periodoValidade.to
    ) {
      console.log(
        "🔍 Filtrando por Período de Validade entre:",
        filtrosAdicionais.periodoValidade.from,
        filtrosAdicionais.periodoValidade.to,
      );
      produtosFiltrados = produtosFiltrados.filter((p) => {
        try {
          if (!p.validade) return false;
          const vd = new Date(p.validade);
          if (isNaN(vd.getTime())) return false;
          return (
            vd >= filtrosAdicionais.periodoValidade.from &&
            vd <= filtrosAdicionais.periodoValidade.to
          );
        } catch (e) {
          return false;
        }
      });
      console.log(
        `[renderizarProdutos] após filtro periodoValidade: ${produtosFiltrados.length} itens`,
      );
    }
  } catch (e) {
    console.debug(
      "[renderizarProdutos] erro ao aplicar filtro periodoValidade:",
      e,
    );
  }

  // Aplicar filtro: Qtd de dias sem vendas
  try {
    const dias =
      filtrosAdicionais && (Number(filtrosAdicionais.diasSemVendas) || 0);
    if (dias && dias > 0) {
      produtosFiltrados = produtosFiltrados.filter((p) => {
        try {
          let diff;
          if (!p.lastVenda) {
            // sem registro de venda -> considerar como nunca vendido (infinito)
            diff = Number.POSITIVE_INFINITY;
          } else {
            const last = new Date(p.lastVenda);
            if (isNaN(last)) {
              diff = Number.POSITIVE_INFINITY;
            } else {
              diff = Math.floor(
                (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24),
              );
            }
          }
          // incluir apenas produtos onde diff >= dias (ou seja, sem venda há pelo menos X dias)
          return diff >= dias;
        } catch (e) {
          return true;
        }
      });
      console.log(
        `[renderizarProdutos] Aplicado filtro diasSemVendas=${dias}, ${produtosFiltrados.length} produtos restantes`,
      );
    }
  } catch (e) {
    console.debug(
      "[renderizarProdutos] erro ao aplicar filtro diasSemVendas:",
      e,
    );
  }

  // Aplicar filtro de saldo de estoque (positivo / zero / negativo)
  try {
    if (
      filtrosAdicionais &&
      Array.isArray(filtrosAdicionais.saldoEstoque) &&
      filtrosAdicionais.saldoEstoque.length > 0
    ) {
      const selecoesSaldo = filtrosAdicionais.saldoEstoque;
      // Se 'todos' estiver selecionado, não filtrar por saldo
      if (!selecoesSaldo.includes("todos")) {
        produtosFiltrados = produtosFiltrados.filter((p) => {
          const estoque = Number(p.estoqueAtual) || 0;
          return selecoesSaldo.some((s) => {
            if (s === "positivo") return estoque > 0;
            if (s === "zero") return estoque === 0;
            if (s === "negativo") return estoque < 0;
            return false;
          });
        });
        console.log(
          `[renderizarProdutos] Aplicado filtro saldoEstoque=${selecoesSaldo}, ${produtosFiltrados.length} produtos restantes`,
        );
      }
    }
  } catch (e) {
    console.debug(
      "[renderizarProdutos] erro ao aplicar filtro saldoEstoque:",
      e,
    );
  }

  // Aplicar filtro de Estoque Mínimo Ideal (radio)
  try {
    const filtroEstoqueMinimo =
      filtrosAdicionais && filtrosAdicionais.estoqueMinimo
        ? String(filtrosAdicionais.estoqueMinimo)
        : null;
    if (filtroEstoqueMinimo && filtroEstoqueMinimo !== "todos") {
      produtosFiltrados = produtosFiltrados.filter((p) => {
        const estoqueAtual = Number(p.estoqueAtual) || 0;
        const estoqueMinimo = Number(p.estoqueMinimo) || 0;
        const estoqueIdeal =
          p.estoqueIdeal !== undefined && p.estoqueIdeal !== null
            ? Number(p.estoqueIdeal)
            : null;

        if (filtroEstoqueMinimo === "abaixo") {
          // Abaixo do mínimo: estritamente menor que o mínimo
          return estoqueAtual < estoqueMinimo;
        }
        if (filtroEstoqueMinimo === "igual") {
          // Igual ou abaixo do mínimo
          return estoqueAtual <= estoqueMinimo;
        }
        if (filtroEstoqueMinimo === "abaixo-ideal") {
          // Abaixo do ideal: prefere comparar com estoqueIdeal quando disponível
          if (estoqueIdeal !== null && !isNaN(estoqueIdeal)) {
            return estoqueAtual < estoqueIdeal;
          }
          // fallback: se não há estoqueIdeal, usar comportamento 'abaixo'
          return estoqueAtual < estoqueMinimo;
        }

        // por segurança, incluir tudo
        return true;
      });
      console.log(
        `[renderizarProdutos] Aplicado filtro estoqueMinimo=${filtroEstoqueMinimo}, ${produtosFiltrados.length} produtos restantes`,
      );
    }
  } catch (e) {
    console.debug(
      "[renderizarProdutos] erro ao aplicar filtro estoqueMinimo:",
      e,
    );
  }

  // Salvar produtos filtrados na variável global para exportação
  produtosFiltradosGlobal = produtosFiltrados;

  // Limpar grid
  grid.innerHTML = "";

  console.log(
    `[renderizarProdutos] Renderizando ${produtosFiltrados.length} produtos no grid`,
  );

  // Estado vazio — nenhum item cadastrado ou filtrado
  if (produtosFiltrados.length === 0) {
    const emptyDiv = document.createElement("div");
    emptyDiv.style.cssText =
      "grid-column:1/-1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;";
    emptyDiv.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" fill="none" viewBox="0 0 24 24" stroke="#c0c8d0" stroke-width="1.2" style="margin-bottom:14px;">
        <path stroke-linecap="round" stroke-linejoin="round" d="M20 7H4a1 1 0 00-1 1v11a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1z"/>
        <path stroke-linecap="round" stroke-linejoin="round" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
      </svg>
      <p style="font-size:15px;font-weight:500;color:#9aa4ae;margin:0;">Nenhum item cadastrado</p>`;
    grid.appendChild(emptyDiv);
    return;
  }

  // Renderizar cada produto
  produtosFiltrados.forEach((produto, index) => {
    try {
      const card = criarCardProduto(produto);
      grid.appendChild(card);
    } catch (error) {
      console.error(
        `[renderizarProdutos] Erro ao criar card do produto ${index}:`,
        error,
        produto,
      );
    }
  });

  console.log(`📦 ${produtosFiltrados.length} produtos renderizados no DOM`);
}

/**
 * Criar card de produto
 */
function criarCardProduto(produto) {
  const card = document.createElement("div");
  card.className = "product-card";
  card.dataset.id = produto.id;

  // Converter valores para número (MySQL retorna DECIMAL como string)
  const custoBase = parseFloat(produto.custoBase) || 0;
  const preco = parseFloat(produto.preco) || 0;
  const margem = parseFloat(produto.margem) || 0;
  const estoqueAtual = parseInt(produto.estoqueAtual) || 0;
  const estoqueMinimo = parseInt(produto.estoqueMinimo) || 0;

  // Debug formatação
  const precoFormatado = preco.toFixed(2).replace(".", ",");
  console.log(
    `💰 Produto: ${produto.nome} - Preço: ${preco} -> Formatado: R$ ${precoFormatado}`,
  );

  // Status de estoque
  let stockStatus = "good";
  if (estoqueAtual === 0) {
    stockStatus = "out";
  } else if (estoqueAtual <= estoqueMinimo && estoqueMinimo > 0) {
    stockStatus = "low";
  }

  // Categoria badge color
  const categoryColors = {
    Higiene: "#e3f2fd",
    Farmácia: "#f3e5f5",
    Rações: "#fff3e0",
    "Ossos e Petiscos": "#fce4ec",
    Serviços: "#e8f5e9",
    Planos: "#fff9c4",
  };

  const badgeColor = categoryColors[produto.categoria] || "#f5f5f5";

  // Processar imagem
  let imagemSrc = "";
  if (produto.imagem) {
    // Se for base64, usar diretamente
    if (produto.imagem.startsWith("data:image")) {
      imagemSrc = produto.imagem;
    } else {
      // Se for nome de arquivo, carregar do servidor
      const API_BASE =
        (window.__API_BASE__ && window.__API_BASE__.toString()) ||
        window.location.origin;
      imagemSrc = `${API_BASE}/uploads/${produto.imagem}`;
    }
  }

  card.innerHTML = `
        <div class="product-image">
            ${imagemSrc ? `<img src="${imagemSrc}" alt="${produto.nome}">` : '<i class="fas fa-box"></i>'}
        </div>
        
        <div class="product-info">
            <h3 class="product-title">${produto.nome}</h3>
            
            <div class="product-category">
                <span>Categoria:</span>
                <span class="category-badge" style="background: ${badgeColor};">${produto.categoria || "Sem categoria"}</span>
            </div>
            
            <div class="product-pricing">
                ${
                  produto.tipo === "produto"
                    ? `
                    <div class="product-margin">
                        Margem: <span class="margin-value">R$ ${custoBase.toFixed(2).replace(".", ",")} (${margem.toFixed(1).replace(".", ",")}%)</span>
                    </div>
                `
                    : ""
                }
                
                <div class="product-prices">
                    ${
                      produto.tipo === "produto"
                        ? `
                        <div class="product-cost">
                            Custo R$ <span class="product-cost-value">${custoBase.toFixed(2).replace(".", ",")}</span>
                        </div>
                    `
                        : ""
                    }
                    
                    <div class="product-price">
                        <span class="product-price-value">
                            ${produto.tipo === "servico" ? "Valor " : produto.tipo === "plano" ? "Mensalidade " : "R$ "}${preco.toFixed(2).replace(".", ",")}
                        </span>
                    </div>
                </div>
            </div>
            
            ${
              produto.tipo === "produto"
                ? `
                <div class="product-stock">
                    <div class="stock-row">
                        <span class="stock-label">Estoque Mínimo:</span>
                        <span class="stock-value">${estoqueMinimo}</span>
                    </div>
                    <div class="stock-row">
                        <span class="stock-label">Estoque Atual:</span>
                        <span class="stock-value ${stockStatus}">${estoqueAtual}</span>
                    </div>
                    <div class="validade-alert-container" style="margin-top:6px"></div>
                </div>
            `
                : ""
            }
        </div>
    `;

  // Inserir badge de validade (se houver status disponível)
  try {
    const alertContainer = card.querySelector(".validade-alert-container");
    const statusObj =
      validadeStatusMap && validadeStatusMap[String(produto.id)];
    if (
      alertContainer &&
      statusObj &&
      statusObj.status &&
      statusObj.status !== "normal"
    ) {
      const badge = document.createElement("div");
      badge.className = "validade-badge";
      const diasText =
        statusObj.dias !== null && statusObj.dias !== undefined
          ? ` (${statusObj.dias} dias)`
          : "";
      badge.textContent = `${statusObj.mensagem || ""}${diasText}`;
      if (statusObj.status === "warning") {
        badge.style.background = "#fff3bf";
        badge.style.color = "#7a5b00";
        badge.style.padding = "4px 8px";
        badge.style.borderRadius = "6px";
        badge.style.fontSize = "12px";
        badge.style.display = "inline-block";
      } else if (statusObj.status === "critical") {
        badge.style.background = "#ffd6d6";
        badge.style.color = "#8a1313";
        badge.style.padding = "4px 8px";
        badge.style.borderRadius = "6px";
        badge.style.fontSize = "12px";
        badge.style.display = "inline-block";
      }
      alertContainer.appendChild(badge);
    }
  } catch (e) {
    console.debug("erro ao inserir badge validade", e);
  }

  // Adicionar evento de clique (usar data-id do card para evitar possíveis conflitos de closure)
  card.addEventListener("click", function (e) {
    // evitar que cliques em elementos internos com handlers próprios causem comportamento inesperado
    try {
      const idFromAttr = this.dataset.id;
      const id =
        idFromAttr !== undefined && idFromAttr !== null && idFromAttr !== ""
          ? idFromAttr
          : produto && produto.id
            ? produto.id
            : "";
      console.log(
        "🔍 Produto clicado (dataset.id):",
        id,
        "obj.nome=",
        produto && produto.nome,
      );
      if (!id) {
        console.warn(
          "[meus-itens] id do produto ausente — não será feito redirecionamento",
        );
        return;
      }
      // Navegar para página de detalhes do produto, forçando usar pagina-produto
      window.location.href = `./pagina-produto.html?id=${encodeURIComponent(id)}`;
    } catch (err) {
      console.error("[meus-itens] erro no click do produto", err);
    }
  });

  return card;
}

// Busca status de validade no backend para os produtos da lista atual
async function obterStatusValidade() {
  try {
    validadeStatusMap = {};
    if (!Array.isArray(produtosLista) || produtosLista.length === 0) return;

    // Preparar payload: expandir perfilValidade (descrição -> objeto) para que o backend possa usar os thresholds
    let payloadList = produtosLista.map((p) => Object.assign({}, p));
    try {
      const perfis = await fetchPerfisValidade();
      payloadList = payloadList.map((p) => {
        try {
          if (p.perfilValidade && typeof p.perfilValidade === "string") {
            const found = perfis.find(
              (x) =>
                String(x.descricao || x.value || "").trim() ===
                String(p.perfilValidade).trim(),
            );
            if (found) p.perfilValidade = Object.assign({}, found);
          }
        } catch (e) {}
        return p;
      });
    } catch (e) {
      /* ignore perfis parse errors */
    }

    // Fazer POST para /api/itens/validade-status com a lista de produtos enriquecida
    const resp = await fetch("/api/itens/validade-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadList),
    });

    if (!resp.ok) {
      console.warn(
        "[meus-itens] falha ao obter status de validade, status=",
        resp.status,
      );
      // fallback para cálculo local quando backend responder com erro
      calcularStatusLocal();
      return;
    }

    const resultados = await resp.json();
    // resultados: [{ produto, dias, status, mensagem }, ...]
    (resultados || []).forEach((r) => {
      try {
        const id =
          r && r.produto && r.produto.id !== undefined && r.produto.id !== null
            ? String(r.produto.id)
            : null;
        if (id) {
          validadeStatusMap[id] = {
            dias: r.dias,
            status: r.status,
            mensagem: r.mensagem,
          };
        }
      } catch (e) {
        /* ignore individual mapping errors */
      }
    });
    console.debug(
      "[meus-itens] validadeStatusMap carregado, count=",
      Object.keys(validadeStatusMap).length,
    );
  } catch (error) {
    console.error(
      "[meus-itens] erro obterStatusValidade (fetch), fallback para cálculo local",
      error,
    );
    // Fallback local em caso de exceção
    calcularStatusLocal();
    return;
  }
}

// Calcula status de validade localmente a partir de `produtosLista` e `localStorage.perfis_validade`
function calcularStatusLocal() {
  try {
    validadeStatusMap = {};
    const perfis = getPerfisValidadeSync();

    function parseDateLocal(s) {
      if (!s) return null;
      if (s instanceof Date) return s;
      const d1 = new Date(s);
      if (!isNaN(d1.getTime()))
        return new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
      const m = String(s)
        .trim()
        .match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (m) {
        const day = Number(m[1]),
          month = Number(m[2]) - 1,
          year = Number(m[3]);
        const d2 = new Date(year, month, day);
        if (!isNaN(d2.getTime())) return d2;
      }
      return null;
    }

    function calcularDiasLocal(validadeStr) {
      const d = parseDateLocal(validadeStr);
      if (!d) return null;
      const hoje = new Date();
      const v = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const h = new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        hoje.getDate(),
      ).getTime();
      const msPorDia = 1000 * 60 * 60 * 24;
      return Math.ceil((v - h) / msPorDia);
    }

    function normalizar(a1, a2) {
      const n1 = Number(a1) || 0;
      const n2 = Number(a2) || 0;
      return n1 >= n2 ? { high: n1, low: n2 } : { high: n2, low: n1 };
    }

    produtosLista.forEach((p) => {
      try {
        const dias = calcularDiasLocal(p.validade);
        let alerta1 = 30,
          alerta2 = 15;
        // tentar encontrar perfil correspondente por descricao
        if (p.perfilValidade && typeof p.perfilValidade === "string") {
          const found = perfis.find(
            (x) =>
              String(x.descricao || "").trim() ===
              String(p.perfilValidade).trim(),
          );
          if (found) {
            alerta1 = found.alerta1 || alerta1;
            alerta2 = found.alerta2 || alerta2;
          }
        } else if (p.perfilValidade && typeof p.perfilValidade === "object") {
          alerta1 = p.perfilValidade.alerta1 || alerta1;
          alerta2 = p.perfilValidade.alerta2 || alerta2;
        }
        const { high, low } = normalizar(alerta1, alerta2);
        let status = "normal",
          mensagem = null;
        if (dias === null || isNaN(dias)) {
          status = "normal";
        } else if (dias <= low) {
          status = "critical";
          mensagem = "Produto próximo ao vencimento";
        } else if (dias <= high) {
          status = "warning";
          mensagem = "Produto próximo do vencimento";
        } else {
          status = "normal";
        }
        const id =
          p && p.id !== undefined && p.id !== null ? String(p.id) : null;
        if (id) validadeStatusMap[id] = { dias, status, mensagem };
      } catch (e) {
        /* ignore item */
      }
    });
    console.debug(
      "[meus-itens] validadeStatusMap (local) carregado, count=",
      Object.keys(validadeStatusMap).length,
    );
  } catch (e2) {
    console.error("[meus-itens] calcularStatusLocal falhou", e2);
  }
}

/**
 * Configurar botões de ação
 */
function configurarBotoes() {
  // Botão Adicionar Produto
  const btnAdicionar = document.getElementById("btnAdicionarProduto");
  if (btnAdicionar) {
    btnAdicionar.addEventListener("click", function () {
      console.log("➕ Adicionar novo produto");
      // Abrir formulário de novo produto
      window.location.href = "./novo-produto.html";
    });
  }

  // Função: abrir relatório de produtos em PDF (nova aba)
  async function abrirRelatorioProdutosPDF(mode = "detalhado") {
    try {
      // Se o frontend estiver servido de outra porta (ex: 5500), precisamos apontar
      // para o backend na porta 3000. Quando o frontend já estiver em 3000, usar caminho relativo.
      const API_BASE =
        (window.__API_BASE__ && window.__API_BASE__.toString()) ||
        window.location.origin;
      let apiUrl = API_BASE.replace(/\/$/, "") + "/api/relatorios/produtos/pdf";
      // obter empresa padrão via API (fallback para localStorage)
      let companyRazao = "PET CRIA LTDA";
      let companyLogo = null;
      try {
        let empArr = [];
        try {
          empArr = await ApiClient.getEmpresas();
        } catch (e) {
          // fallback para localStorage caso a API não responda
          try {
            empArr = JSON.parse(
              localStorage.getItem("empresasData_v1") || "[]",
            );
          } catch (e2) {
            empArr = [];
          }
        }
        if (Array.isArray(empArr) && empArr.length > 0) {
          const e0 = empArr[0] || {};
          companyRazao = e0.razaoSocial || e0.nome || e0.razao || companyRazao;
          // possíveis campos de logo: logoDataUrl, logo, imagem
          companyLogo = e0.logoDataUrl || e0.logo || e0.imagem || null;
        }
      } catch (e) {
        /* ignore */
      }

      // enviar lista completa de produtos ao backend para gerar o PDF com campos detalhados
      const camposDetalhados = [
        "Código - Descrição",
        "Unidade",
        "Grupo",
        "Subgrupo",
        "Marca",
        "Local",
        "Estoque Mínimo",
        "NCM",
        "Centro de resultado",
        "Perfil de validade",
        "Preço de Custo",
        "Preço de Venda",
        "Data de validade",
        "Status da validade",
      ];
      const headerLines = [
        "RELATÓRIO DE PRODUTO",
        companyRazao,
        "Campos: " + camposDetalhados.join(" | "),
      ];

      // Preferir coletar os itens visíveis na página (cards/tabela) — assim respeitamos página atual e filtros.
      let produtosParaExportar = [];
      try {
        const domCards = Array.from(document.querySelectorAll(".product-card"));
        if (domCards && domCards.length > 0) {
          produtosParaExportar = domCards.map((card) => {
            const id = card.dataset.id || card.getAttribute("data-id") || "";
            const nome =
              card.querySelector(".product-title") &&
              card.querySelector(".product-title").textContent
                ? card.querySelector(".product-title").textContent.trim()
                : "";
            const precoText =
              card.querySelector(".product-price-value") &&
              card.querySelector(".product-price-value").textContent
                ? card
                    .querySelector(".product-price-value")
                    .textContent.replace(/[^0-9,.-]/g, "")
                    .replace(",", ".")
                : "";
            const preco = precoText
              ? isNaN(Number(precoText))
                ? null
                : Number(precoText)
              : null;
            const unidade = card.querySelector(".product-prices") ? "" : "";
            return {
              id: id,
              codigo: id,
              nome: nome,
              descricao: nome,
              preco: preco,
              preco_venda: preco,
              unidade: unidade,
            };
          });
        }
      } catch (e) {
        console.warn(
          "[abrirRelatorioProdutosPDF] falha ao coletar itens da DOM, fallback para produtos filtrados",
          e,
        );
      }

      if (!produtosParaExportar || produtosParaExportar.length === 0) {
        produtosParaExportar =
          produtosFiltradosGlobal.length > 0
            ? produtosFiltradosGlobal
            : produtosLista || produtosExemplo;
      }
      console.log(
        `[abrirRelatorioProdutosPDF] Exportando ${produtosParaExportar.length} produtos (visíveis/filtrados)`,
      );

      // mapear produtos para incluir todos os campos solicitados (ou resumido)
      const produtosMapeados = produtosParaExportar.map((p) => {
        const id = p && p.id !== undefined && p.id !== null ? p.id : "";
        if (mode === "resumido") {
          const descricao = p.nome || p.descricao || "";
          const precoVal =
            p.preco !== undefined && p.preco !== null
              ? p.preco
              : p.precoVenda || p.preco_venda || p.preco || "";
          // enviar tanto preco_venda quanto preco para compatibilidade com backend
          return {
            codigo: p.codigo || id || "",
            descricao: descricao,
            preco_venda: precoVal,
            preco: precoVal,
          };
        }

        const precoCusto =
          p.custoBase !== undefined && p.custoBase !== null
            ? p.custoBase
            : p.precoCusto || "";
        const precoVenda =
          p.preco !== undefined && p.preco !== null
            ? p.preco
            : p.precoVenda || "";
        const unidadeBase = p.unidade || p.unidadeMedida || "";
        // Formatar unidade com preços: Un: XX\nC: R$ Y / V: R$ Z
        const formatarPreco = (valor) => {
          if (!valor && valor !== 0) return "0,00";
          const num = typeof valor === "number" ? valor : parseFloat(valor);
          return num.toFixed(2).replace(".", ",");
        };
        const unidadeComPreco =
          unidadeBase +
          (precoCusto || precoVenda
            ? "\nC: R$ " +
              formatarPreco(precoCusto) +
              " / V: R$ " +
              formatarPreco(precoVenda)
            : "");

        return {
          codigo: p.codigo || id || "",
          descricao: p.nome || p.descricao || "",
          unidade: unidadeComPreco,
          grupo: p.grupo || p.categoria || "",
          subgrupo: p.subgrupo || p.agrupamento || "",
          marca: p.marca || "",
          local: p.local || p.localEstoque || "",
          estoqueMinimo:
            p.estoqueMinimo !== undefined && p.estoqueMinimo !== null
              ? p.estoqueMinimo
              : p.estoque_minimo || "",
          ncm: p.ncm || "",
          centroResultado: p.centroResultado || p.centro || "",
          perfilValidade:
            p.perfilValidade && typeof p.perfilValidade === "object"
              ? p.perfilValidade.descricao || ""
              : p.perfilValidade || "",
          precoCusto: precoCusto,
          precoVenda: precoVenda,
          dataValidade: p.validade || p.dataValidade || "",
          statusValidade:
            validadeStatusMap && validadeStatusMap[String(id)]
              ? validadeStatusMap[String(id)].mensagem ||
                validadeStatusMap[String(id)].status ||
                ""
              : "",
        };
      });

      // Ordenar produtosMapeados por descrição (apenas para o relatório PDF)
      produtosMapeados.sort((a, b) =>
        (a.descricao || "")
          .toString()
          .localeCompare(b.descricao || "", "pt-BR", { sensitivity: "base" }),
      );

      // Verificar tamanho aproximado da logo (evitar 413 Payload Too Large)
      let logoToSend = companyLogo;
      if (companyLogo && typeof companyLogo === "string") {
        const estimatedSize = (companyLogo.length * 3) / 4; // tamanho aproximado em bytes
        if (estimatedSize > 150000) {
          // ~150KB - limite conservador
          console.warn(
            "⚠️ Logo muito grande, enviando sem logo para evitar erro 413",
          );
          logoToSend = null;
        }
      }

      // enviar largura da logo em pontos (pt) para manter consistência visual
      let payload = {
        produtos: produtosMapeados,
        campos: camposDetalhados,
        headerLines,
        mode,
        companyLogo: logoToSend,
        companyRazao,
        companyLogoWidth: 90,
      };
      let resp = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Se der erro 413 (payload muito grande), tentar novamente SEM a logo
      if (!resp.ok && resp.status === 413 && logoToSend) {
        console.warn(
          "⚠️ Erro 413: Payload muito grande. Tentando novamente sem logo...",
        );
        payload = {
          produtos: produtosMapeados,
          campos: camposDetalhados,
          headerLines,
          mode,
          companyLogo: null,
          companyRazao,
          companyLogoWidth: 90,
        };
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
      openPdfModal(
        url,
        mode === "resumido"
          ? "Cadastro resumido de itens"
          : "Cadastro detalhado de itens",
      );
    } catch (e) {
      console.error("Erro ao gerar PDF", e);
      const msg = e && e.message ? e.message : String(e);
      if (window.showToast)
        window.showToast("Erro ao gerar PDF: " + msg, "error", 5000);
      else alert("Erro ao gerar PDF: " + msg);
    }
  }

  // Botão Exportar -> abrir dropdown com opções
  if (btnExportar && exportDropdown) {
    btnExportar.addEventListener("click", function (ev) {
      ev.stopPropagation();
      // posicionar dropdown abaixo do botão (fixed = relativo à viewport)
      const rect = btnExportar.getBoundingClientRect();
      // ajustar para não passar da borda direita
      const viewportW =
        window.innerWidth || document.documentElement.clientWidth;
      const desiredWidth = Math.max(rect.width, 220);
      let left = rect.left;
      if (left + desiredWidth > viewportW - 12) {
        left = Math.max(12, viewportW - desiredWidth - 12);
      }
      exportDropdown.style.left = `${left}px`;
      exportDropdown.style.top = `${rect.bottom + 8}px`;
      exportDropdown.style.minWidth = `${desiredWidth}px`;
      exportDropdown.style.boxSizing = "border-box";
      exportDropdown.style.display =
        exportDropdown.style.display === "none" ? "block" : "none";
    });

    // clique nas opções
    if (exportDetalhado)
      exportDetalhado.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();
        abrirRelatorioProdutosPDF("detalhado");
        exportDropdown.style.display = "none";
        return false;
      });
    if (exportResumido)
      exportResumido.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();
        abrirRelatorioProdutosPDF("resumido");
        exportDropdown.style.display = "none";
        return false;
      });

    // fechar ao clicar fora
    document.addEventListener("click", function () {
      if (exportDropdown) exportDropdown.style.display = "none";
    });
    // manter aberto ao clicar dentro do dropdown
    exportDropdown.addEventListener("click", function (ev) {
      ev.stopPropagation();
    });
  }

  // Botão Pesquisar (agora chama API /api/itens?q=... para retornar do banco)
  const btnPesquisar = document.querySelector(".btn-search");
  if (btnPesquisar) {
    btnPesquisar.addEventListener("click", async function () {
      const searchInput = document.querySelector(".search-input");
      const termo = (searchInput?.value || "").trim();
      console.log("🔍 Pesquisar (API):", termo);

      try {
        // Coletar filtros atuais para enriquecer params (sem persistir nada no localStorage)
        const filtros = coletarFiltrosAtuais();
        const params = {};
        if (termo) params.q = termo;
        // quando houver agrupamento selecionado, repassar ao backend
        if (filtros && filtros.agrupamento)
          params.agrupamento = filtros.agrupamento;
        // manter comportamento atual de excluir medicamentos por padrão
        params.excludeAgrupamento = "MEDICAMENTOS";

        // Chamada à API para carregar itens do banco que contenham o termo
        const resultados = await ApiClient.getProdutos(params);
        produtosLista = Array.isArray(resultados) ? resultados : [];

        // Renderizar usando a lista retornada pelo servidor
        renderizarProdutos("todos", filtros || {});
      } catch (e) {
        console.error("[btnPesquisar] erro ao buscar via API:", e);
        // Fallback local: filtrar pela lista já carregada em memória
        try {
          filtrarProdutosPorBusca(termo);
        } catch (err) {
          console.error(err);
        }
      }
    });
  }

  // Botão Mais Filtros
  const btnMaisFiltros = document.getElementById("btnMaisFiltros");
  const filtrosAvancados = document.getElementById("filtrosAvancados");

  if (btnMaisFiltros && filtrosAvancados) {
    btnMaisFiltros.addEventListener("click", function () {
      const isOpen = filtrosAvancados.classList.contains("open");

      if (isOpen) {
        filtrosAvancados.classList.remove("open");
        console.log("❌ Filtros avançados fechados");
      } else {
        filtrosAvancados.classList.add("open");
        console.log("✅ Filtros avançados abertos");
      }
    });
  }

  // Botão Aplicar Filtros
  const btnAplicarFiltros = document.getElementById("btnAplicarFiltros");
  if (btnAplicarFiltros) {
    btnAplicarFiltros.addEventListener("click", function () {
      console.log("🔍 Aplicando filtros avançados...");
      aplicarFiltrosAvancados();
    });
  }

  // Botão Cancelar Filtros
  const btnCancelarFiltros = document.getElementById("btnCancelarFiltros");
  if (btnCancelarFiltros && filtrosAvancados) {
    btnCancelarFiltros.addEventListener("click", function () {
      filtrosAvancados.classList.remove("open");
      limparFiltrosAvancados();
      console.log("❌ Filtros cancelados");
    });
  }

  // Botão Limpar Filtros
  const btnLimparFiltros = document.getElementById("btnLimparFiltros");
  if (btnLimparFiltros) {
    btnLimparFiltros.addEventListener("click", function () {
      limparFiltrosAvancados();
      console.log("🔄 Filtros limpos");
    });
  }

  // Botão Opções (dropdown)
  try {
    const btnOpcoes = document.getElementById("btnOpcoes");
    const opcoesDropdown = document.getElementById("opcoesDropdown");
    const opcoesZerar = document.getElementById("opcoesZerarEstoque");

    if (btnOpcoes && opcoesDropdown) {
      btnOpcoes.addEventListener("click", function (ev) {
        ev.stopPropagation();
        const rect = btnOpcoes.getBoundingClientRect();
        const viewportW =
          window.innerWidth || document.documentElement.clientWidth;
        const desiredWidth = Math.max(rect.width, 220);
        let left = rect.left;
        if (left + desiredWidth > viewportW - 12) {
          left = Math.max(12, viewportW - desiredWidth - 12);
        }
        opcoesDropdown.style.left = `${left}px`;
        opcoesDropdown.style.top = `${rect.bottom + 8}px`;
        opcoesDropdown.style.minWidth = `${desiredWidth}px`;
        opcoesDropdown.style.boxSizing = "border-box";
        opcoesDropdown.style.display =
          opcoesDropdown.style.display === "none" ? "block" : "none";
        console.log("📋 Dropdown Opções aberto");
      });

      // Fechar ao clicar fora
      document.addEventListener("click", function () {
        if (opcoesDropdown) opcoesDropdown.style.display = "none";
      });
      opcoesDropdown.addEventListener("click", function (ev) {
        ev.stopPropagation();
      });
    }

    if (opcoesZerar) {
      opcoesZerar.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        console.log("🧹 Abrindo modal Zerar Estoque...");
        try {
          abrirModalZerarEstoque();
        } catch (e) {
          console.error("Erro ao abrir modal zerar estoque:", e);
        }
        if (opcoesDropdown) opcoesDropdown.style.display = "none";
        return false;
      });
    }
  } catch (e) {
    console.warn("⚠️ Opções dropdown handlers falharam:", e);
  }
}

/**
 * Configurar busca com filtro em tempo real nos cards
 */
function configurarBuscaComSugestoes() {
  const searchInput = document.getElementById("searchInput");

  if (!searchInput) {
    console.warn("⚠️ Campo de busca não encontrado");
    return;
  }

  let searchTimeout = null;

  // Event listener para input
  searchInput.addEventListener("input", function (e) {
    const query = e.target.value.trim().toLowerCase();

    // Limpar timeout anterior
    if (searchTimeout) clearTimeout(searchTimeout);

    // Aguardar 200ms antes de filtrar (debounce)
    searchTimeout = setTimeout(() => {
      filtrarProdutosPorBusca(query);
    }, 200);
  });

  console.log("✅ Busca em tempo real configurada");
}

/**
 * Normalizar texto removendo acentos e caracteres especiais
 */
function normalizarTexto(texto) {
  if (!texto) return "";
  return texto
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove acentos
}

/**
 * Filtrar produtos por busca (mostra/oculta cards)
 */
function filtrarProdutosPorBusca(query) {
  const produtos = produtosLista || [];

  // Se query vazia, mostrar todos
  if (!query) {
    renderizarProdutos("todos");
    return;
  }

  // Normalizar query (sem acentos)
  const queryNormalizada = normalizarTexto(query);

  // Filtrar produtos que correspondem à busca
  const produtosFiltrados = produtos.filter((p) => {
    const nome = normalizarTexto(p.nome || "");
    const codigo = normalizarTexto((p.codigo || p.id || "").toString());
    const codigoBarras = normalizarTexto((p.codigoBarras || "").toString());

    return (
      nome.includes(queryNormalizada) ||
      codigo.includes(queryNormalizada) ||
      codigoBarras.includes(queryNormalizada)
    );
  });

  console.log(
    `🔍 Busca "${query}": ${produtosFiltrados.length} produtos encontrados`,
  );

  // Renderizar apenas produtos filtrados
  const grid = document.getElementById("productsGrid");
  if (!grid) {
    console.error("❌ productsGrid não encontrado");
    return;
  }

  grid.innerHTML = "";

  if (produtosFiltrados.length === 0) {
    const emptyDiv = document.createElement("div");
    emptyDiv.style.cssText =
      "grid-column:1/-1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;";
    emptyDiv.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" fill="none" viewBox="0 0 24 24" stroke="#c0c8d0" stroke-width="1.2" style="margin-bottom:14px;">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
      </svg>
      <p style="font-size:15px;font-weight:500;color:#9aa4ae;margin:0;">Nenhum item encontrado para "<strong>${query}</strong>"</p>`;
    grid.appendChild(emptyDiv);
    return;
  }

  // Renderizar cada produto filtrado
  produtosFiltrados.forEach((produto, index) => {
    try {
      const card = criarCardProduto(produto);
      grid.appendChild(card);

      // Nota: o badge de validade já é adicionado dentro de `criarCardProduto`.
      // Não inserir aqui para evitar duplicação quando usamos a busca.
    } catch (error) {
      console.error(
        `[filtrarProdutosPorBusca] Erro ao criar card do produto ${index}:`,
        error,
        produto,
      );
    }
  });

  console.log(`📦 ${produtosFiltrados.length} produtos renderizados no grid`);
}

/**
 * Aplicar filtros avançados
 */
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

  // ações: apenas selecionam o formato — não disparam o download
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

  // botão de download (clicar aqui inicia o download conforme formato selecionado)
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
  // simple download icon (arrow)
  downloadBtn.textContent = "⤓";
  downloadBtn.addEventListener("click", function (ev) {
    ev.stopPropagation();
    try {
      if (selectedFormat === "pdf") {
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = "relatorio_produtos.pdf";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else if (selectedFormat === "xls") {
        // gerar XLS no formato selecionado (detalhado por padrão no modal)
        exportarProdutosXLS("detalhado", false);
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
function aplicarFiltrosAvancados() {
  // Delega para coletor centralizado de filtros
  console.log("🔍 [aplicarFiltrosAvancados] INÍCIO");
  const filtros = coletarFiltrosAtuais();
  // Converter strings de data (dd/mm/yyyy ou ISO) em objetos Date para filtros de período
  function parseDateInput(s) {
    if (!s) return null;
    if (s instanceof Date) return s;
    const str = String(s).trim();
    // tentar formato dd/mm/yyyy
    const m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      const day = Number(m[1]);
      const month = Number(m[2]) - 1;
      const year = Number(m[3]);
      const d = new Date(year, month, day);
      if (!isNaN(d)) return d;
    }
    // tentar parse padrão (ISO ou similar)
    const d2 = new Date(str);
    if (!isNaN(d2)) return d2;
    return null;
  }

  // Preços alterados
  try {
    const inicioP = parseDateInput(filtros.precosAlteradosInicio);
    const fimP = parseDateInput(filtros.precosAlteradosFim);
    if (inicioP || fimP) {
      const from = inicioP
        ? new Date(
            inicioP.getFullYear(),
            inicioP.getMonth(),
            inicioP.getDate(),
            0,
            0,
            0,
            0,
          )
        : new Date(-8640000000000000);
      const to = fimP
        ? new Date(
            fimP.getFullYear(),
            fimP.getMonth(),
            fimP.getDate(),
            23,
            59,
            59,
            999,
          )
        : new Date(8640000000000000);
      filtros.precosAlterados = { from, to };
    }
  } catch (e) {
    console.debug(
      "[aplicarFiltrosAvancados] erro parseando precosAlterados",
      e,
    );
  }

  // Período validade
  try {
    const inicioV = parseDateInput(filtros.validadeInicio);
    const fimV = parseDateInput(filtros.validadeFim);
    if (inicioV || fimV) {
      const from = inicioV
        ? new Date(
            inicioV.getFullYear(),
            inicioV.getMonth(),
            inicioV.getDate(),
            0,
            0,
            0,
            0,
          )
        : new Date(-8640000000000000);
      const to = fimV
        ? new Date(
            fimV.getFullYear(),
            fimV.getMonth(),
            fimV.getDate(),
            23,
            59,
            59,
            999,
          )
        : new Date(8640000000000000);
      filtros.periodoValidade = { from, to };
    }
  } catch (e) {
    console.debug(
      "[aplicarFiltrosAvancados] erro parseando periodoValidade",
      e,
    );
  }
  console.log("📊 Filtros aplicados:", filtros);
  // Fechar o painel
  document.getElementById("filtrosAvancados")?.classList.remove("open");
  // Tentar salvar filtros no servidor (sem bloquear a renderização)
  try {
    saveFiltersToServer({ pagina: "meus-itens", filtros }).catch((e) =>
      console.debug("Falha ao salvar filtros no servidor", e),
    );
  } catch (e) {
    console.debug("Erro ao iniciar saveFiltersToServer", e);
  }
  // Renderizar produtos filtrados
  renderizarProdutos("todos", filtros);
}

/**
 * Salva filtros no servidor (POST /api/user-filters)
 */
async function saveFiltersToServer(payload) {
  try {
    await fetch("/api/user-filters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.debug("[saveFiltersToServer] erro", e);
    throw e;
  }
}

/**
 * Busca filtros salvos para esta página e aplica na UI
 */
async function carregarFiltrosSalvos() {
  try {
    const resp = await fetch("/api/user-filters?pagina=meus-itens");
    if (!resp.ok) return null;
    const json = await resp.json();
    const filtros = json && json.filtros ? json.filtros : null;
    if (!filtros) return null;
    // Não reaplicar filtros de data ao carregar filtros salvos (datas são temporárias por sessão)
    try {
      if (filtros.precosAlteradosInicio) filtros.precosAlteradosInicio = "";
      if (filtros.precosAlteradosFim) filtros.precosAlteradosFim = "";
      if (filtros.validadeInicio) filtros.validadeInicio = "";
      if (filtros.validadeFim) filtros.validadeFim = "";
      // remover objetos de período caso existam
      if (filtros.precosAlterados) delete filtros.precosAlterados;
      if (filtros.periodoValidade) delete filtros.periodoValidade;
      // Não reaplicar filtros de Preço de Venda (temporários por sessão)
      if (filtros.vendaMin) filtros.vendaMin = "";
      if (filtros.vendaMax) filtros.vendaMax = "";
    } catch (e) {
      console.debug(
        "[carregarFiltrosSalvos] limpeza datas/filtros temporarios falhou",
        e,
      );
    }

    // Aplicar outros filtros na UI (sem datas)
    aplicarFiltrosNaUI(filtros);
    // Renderizar com filtros carregados (datas não serão aplicadas)
    renderizarProdutos("todos", filtros);
    console.log("[carregarFiltrosSalvos] filtros aplicados:", filtros);
    return filtros;
  } catch (e) {
    console.debug("[carregarFiltrosSalvos] erro", e);
    return null;
  }
}

// Limpar inputs/estados de data quando o usuário navegar para outra aba ou recarregar
function clearDateInputsAndState() {
  try {
    const diP = document.getElementById("dataInicioPrecos");
    const dfP = document.getElementById("dataFimPrecos");
    const diV = document.getElementById("dataInicioValidade");
    const dfV = document.getElementById("dataFimValidade");
    if (diP) diP.value = "";
    if (dfP) dfP.value = "";
    if (diV) diV.value = "";
    if (dfV) dfV.value = "";
  } catch (e) {
    console.debug("[clearDateInputsAndState] erro ao limpar inputs", e);
  }

  // limpar inputs de Preço de Venda também (temporários por sessão)
  try {
    const vendaMin = document.getElementById("filtroVendaMin");
    const vendaMax = document.getElementById("filtroVendaMax");
    if (vendaMin) vendaMin.value = "";
    if (vendaMax) vendaMax.value = "";
  } catch (e) {
    console.debug(
      "[clearDateInputsAndState] erro ao limpar filtroVenda inputs",
      e,
    );
  }

  try {
    if (typeof calendarioPrecos === "object") {
      calendarioPrecos.dataInicio = null;
      calendarioPrecos.dataFim = null;
      calendarioPrecos.selecionandoInicio = true;
    }
  } catch (e) {}
  try {
    if (typeof calendarioValidade === "object") {
      calendarioValidade.dataInicio = null;
      calendarioValidade.dataFim = null;
      calendarioValidade.selecionandoInicio = true;
    }
  } catch (e) {}
}

// Limpar ao sair da aba (visibilidade) e antes de unload
document.addEventListener("visibilitychange", function () {
  if (document.hidden) {
    clearDateInputsAndState();
  }
});

window.addEventListener("beforeunload", function () {
  // tentar limpar para navegações internas/refresh
  try {
    clearDateInputsAndState();
  } catch (e) {}
});

function aplicarFiltrosNaUI(filtros) {
  try {
    // Multi-selects
    if (Array.isArray(filtros.agrupamento)) {
      clearMultiSelect("filtroAgrupamento");
      filtros.agrupamento.forEach((val) => {
        try {
          const opts =
            (multiSelectData["filtroAgrupamento"] &&
              multiSelectData["filtroAgrupamento"].options) ||
            [];
          const opt = opts.find((o) => String(o.value) === String(val));
          const text = opt ? opt.text : String(val);
          addMultiSelectTag("filtroAgrupamento", String(val), text);
        } catch (e) {}
      });
    }
    if (Array.isArray(filtros.marca)) {
      clearMultiSelect("filtroMarca");
      filtros.marca.forEach((val) => {
        try {
          const opts =
            (multiSelectData["filtroMarca"] &&
              multiSelectData["filtroMarca"].options) ||
            [];
          const opt = opts.find((o) => String(o.value) === String(val));
          const text = opt ? opt.text : String(val);
          addMultiSelectTag("filtroMarca", String(val), text);
        } catch (e) {}
      });
    }
    if (Array.isArray(filtros.fornecedor)) {
      clearMultiSelect("filtroFornecedor");
      filtros.fornecedor.forEach((val) => {
        try {
          const opts =
            (multiSelectData["filtroFornecedor"] &&
              multiSelectData["filtroFornecedor"].options) ||
            [];
          const opt = opts.find((o) => String(o.value) === String(val));
          const text = opt ? opt.text : String(val);
          addMultiSelectTag("filtroFornecedor", String(val), text);
        } catch (e) {}
      });
    }
    if (Array.isArray(filtros.centroResultado)) {
      clearMultiSelect("filtroCentroResultado");
      filtros.centroResultado.forEach((val) => {
        try {
          const opts =
            (multiSelectData["filtroCentroResultado"] &&
              multiSelectData["filtroCentroResultado"].options) ||
            [];
          const opt = opts.find((o) => String(o.value) === String(val));
          const text = opt ? opt.text : String(val);
          addMultiSelectTag("filtroCentroResultado", String(val), text);
        } catch (e) {}
      });
    }

    // Selects simples
    if (filtros.ativo)
      document.getElementById("filtroAtivo").value = filtros.ativo;
    if (filtros.filtros && filtros.filtros) {
    }

    // Data
    if (filtros.dataEstoque)
      document.getElementById("filtroDataEstoque").value = filtros.dataEstoque;

    // Dias sem vendas
    if (filtros.diasSemVendas !== undefined && filtros.diasSemVendas !== null) {
      document.getElementById("filtroDiasSemVendas").value =
        filtros.diasSemVendas || "";
    }

    // Custos / vendas
    if (filtros.custoMin !== undefined)
      document.getElementById("filtroCustoMin").value = filtros.custoMin || "";
    if (filtros.custoMax !== undefined)
      document.getElementById("filtroCustoMax").value = filtros.custoMax || "";
    if (filtros.vendaMin !== undefined)
      document.getElementById("filtroVendaMin").value = filtros.vendaMin || "";
    if (filtros.vendaMax !== undefined)
      document.getElementById("filtroVendaMax").value = filtros.vendaMax || "";

    // Datas (preços alterados / validade) - suportar tanto strings salvas quanto objetos período
    try {
      function formatDateForInput(d) {
        if (!d) return "";
        const D = d instanceof Date ? d : new Date(d);
        if (!D || isNaN(D.getTime())) return "";
        const dd = String(D.getDate()).padStart(2, "0");
        const mm = String(D.getMonth() + 1).padStart(2, "0");
        const yyyy = D.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      }

      // Preços alterados: preferir valores explícitos se existirem
      if (
        filtros.precosAlteradosInicio !== undefined &&
        filtros.precosAlteradosInicio !== null
      ) {
        document.getElementById("dataInicioPrecos").value =
          filtros.precosAlteradosInicio || "";
      } else if (filtros.precosAlterados && filtros.precosAlterados.from) {
        document.getElementById("dataInicioPrecos").value = formatDateForInput(
          filtros.precosAlterados.from,
        );
      }
      if (
        filtros.precosAlteradosFim !== undefined &&
        filtros.precosAlteradosFim !== null
      ) {
        document.getElementById("dataFimPrecos").value =
          filtros.precosAlteradosFim || "";
      } else if (filtros.precosAlterados && filtros.precosAlterados.to) {
        document.getElementById("dataFimPrecos").value = formatDateForInput(
          filtros.precosAlterados.to,
        );
      }

      // Validade
      if (
        filtros.validadeInicio !== undefined &&
        filtros.validadeInicio !== null
      ) {
        document.getElementById("dataInicioValidade").value =
          filtros.validadeInicio || "";
      } else if (filtros.periodoValidade && filtros.periodoValidade.from) {
        document.getElementById("dataInicioValidade").value =
          formatDateForInput(filtros.periodoValidade.from);
      }
      if (filtros.validadeFim !== undefined && filtros.validadeFim !== null) {
        document.getElementById("dataFimValidade").value =
          filtros.validadeFim || "";
      } else if (filtros.periodoValidade && filtros.periodoValidade.to) {
        document.getElementById("dataFimValidade").value = formatDateForInput(
          filtros.periodoValidade.to,
        );
      }
    } catch (e) {
      console.debug("[aplicarFiltrosNaUI] erro ao aplicar datas na UI", e);
    }

    // Checkboxes saldoEstoque
    if (Array.isArray(filtros.saldoEstoque)) {
      document
        .querySelectorAll('input[name="saldoEstoque"]')
        .forEach((cb) => (cb.checked = false));
      filtros.saldoEstoque.forEach((val) => {
        const cb = document.querySelector(
          `input[name="saldoEstoque"][value="${val}"]`,
        );
        if (cb) cb.checked = true;
      });
    }

    // Radio estoqueMinimo
    if (filtros.estoqueMinimo) {
      const rb = document.querySelector(
        `input[name="estoqueMinimo"][value="${filtros.estoqueMinimo}"]`,
      );
      if (rb) rb.checked = true;
    }
  } catch (e) {
    console.debug("[aplicarFiltrosNaUI] erro", e);
  }
}

/**
 * Coleta todos os filtros atuais da UI e retorna um objeto padrão
 */
function coletarFiltrosAtuais() {
  const filtros = {
    agrupamento: getMultiSelectValues("filtroAgrupamento"),
    marca: getMultiSelectValues("filtroMarca"),
    fornecedor: getMultiSelectValues("filtroFornecedor"),
    centroResultado: getMultiSelectValues("filtroCentroResultado"),
    // Para selects que podem ter sido transformados em dropdowns customizados,
    // ler o valor efetivo visual (tags) quando disponível.
    ativo: getEffectiveSelectValue("filtroAtivo"),
    dataEstoque: document.getElementById("filtroDataEstoque")?.value,
    custoMin: document.getElementById("filtroCustoMin")?.value,
    custoMax: document.getElementById("filtroCustoMax")?.value,
    vendaMin: document.getElementById("filtroVendaMin")?.value,
    vendaMax: document.getElementById("filtroVendaMax")?.value,
    finalidade: getEffectiveSelectValue("filtroFinalidade"),
    perfilValidade: getEffectiveSelectValue("filtroPerfilValidade"),
    // Novos filtros de data
    precosAlteradosInicio: document.getElementById("dataInicioPrecos")?.value,
    precosAlteradosFim: document.getElementById("dataFimPrecos")?.value,
    validadeInicio: document.getElementById("dataInicioValidade")?.value,
    validadeFim: document.getElementById("dataFimValidade")?.value,
  };

  // Qtd de dias sem vendas
  const diasSemVendasRaw = document.getElementById(
    "filtroDiasSemVendas",
  )?.value;
  filtros.diasSemVendas = diasSemVendasRaw
    ? parseInt(diasSemVendasRaw, 10) || 0
    : 0;

  // Obter checkboxes de saldo estoque
  const saldoEstoque = [];
  document
    .querySelectorAll('input[name="saldoEstoque"]:checked')
    .forEach((cb) => {
      saldoEstoque.push(cb.value);
    });
  filtros.saldoEstoque = saldoEstoque;

  // Obter radio de estoque mínimo
  const estoqueMinimo = document.querySelector(
    'input[name="estoqueMinimo"]:checked',
  )?.value;
  filtros.estoqueMinimo = estoqueMinimo;

  // Log detalhado para debugging dos valores coletados
  try {
    console.log("🧾 filtros coletados:", JSON.parse(JSON.stringify(filtros)));
  } catch (e) {
    console.log("🧾 filtros coletados (raw):", filtros);
  }

  return filtros;
}

/**
 * Retorna o valor efetivo selecionado de um select, levando em conta
 * dropdowns customizados (tags). Se nenhuma seleção visual existir,
 * retorna a string vazia.
 */
function getEffectiveSelectValue(selectId) {
  try {
    const select = document.getElementById(selectId);
    if (!select) return "";

    // Se existe estrutura de multi-select (multiSelectData), use-a
    if (typeof multiSelectData !== "undefined" && multiSelectData[selectId]) {
      const data = multiSelectData[selectId];
      if (
        Array.isArray(data.selectedValues) &&
        data.selectedValues.length > 0
      ) {
        // Para selects simples (single-select) retornamos o primeiro valor
        return String(data.selectedValues[0]);
      }
      return "";
    }

    // Se o select foi transformado em um dropdown customizado sem multiSelectData,
    // procurar região de tags e extrair o primeiro tag
    const wrapper = select.parentElement;
    if (wrapper) {
      const tagsArea =
        wrapper.querySelector(".multi-select-tags-area") ||
        wrapper.querySelector(".multi-select-tags") ||
        wrapper.querySelector(".multi-select");
      if (tagsArea) {
        const tag = tagsArea.querySelector(".multi-select-tag");
        if (tag) {
          // Prefer dataset.value no ícone, se existir
          const icon = tag.querySelector("i");
          if (icon && icon.dataset && icon.dataset.value)
            return String(icon.dataset.value);
          if (tag.dataset && tag.dataset.value)
            return String(tag.dataset.value);
          return tag.textContent.trim();
        }
      }
    }

    // Fallback: usar o valor do select nativo
    return select.value || "";
  } catch (e) {
    console.debug("[getEffectiveSelectValue] erro", e);
    try {
      return document.getElementById(selectId)?.value || "";
    } catch (e2) {
      return "";
    }
  }
}

/**
 * Limpar filtros avançados
 */
function limparFiltrosAvancados() {
  // Limpar multi-selects
  clearMultiSelect("filtroAgrupamento");
  clearMultiSelect("filtroMarca");
  clearMultiSelect("filtroFornecedor");
  clearMultiSelect("filtroCentroResultado");

  // Resetar selects simples
  // Ao limpar, deixar vazio para que o filtro trate como 'todos' (mostrar tudo)
  try {
    document.getElementById("filtroAtivo").value = "";
  } catch (e) {}
  document.getElementById("filtroFinalidade").value = "todos";
  document.getElementById("filtroPerfilValidade").value = "todos";

  // Limpar também a representação visual dos dropdowns customizados (tags)
  try {
    const singleSelectIds = [
      "filtroAtivo",
      "filtroFinalidade",
      "filtroPerfilValidade",
    ];
    singleSelectIds.forEach((id) => {
      try {
        const sel = document.getElementById(id);
        if (!sel) return;
        // limpar estado em multiSelectData se existir
        if (typeof multiSelectData !== "undefined" && multiSelectData[id]) {
          multiSelectData[id].selectedValues = [];
        }
        // remover tags visuais
        const wrapper = sel.parentElement;
        const tagsArea = wrapper
          ? wrapper.querySelector(".multi-select-tags-area") ||
            wrapper.querySelector(".multi-select-tags") ||
            wrapper.querySelector(".multi-select")
          : null;
        if (tagsArea) {
          const tags = tagsArea.querySelectorAll(".multi-select-tag");
          tags.forEach((t) => t.remove());
          // adicionar placeholder caso não exista
          if (!tagsArea.querySelector(".multi-select-placeholder")) {
            const ph = document.createElement("span");
            ph.className = "multi-select-placeholder";
            ph.textContent = sel.getAttribute("data-empty-text") || "Selecione";
            tagsArea.appendChild(ph);
          }
        }
      } catch (e) {
        /* ignore per-select errors */
      }
    });
  } catch (e) {
    console.debug("[limparFiltrosAvancados] erro ao limpar tags visuais", e);
  }

  // Resetar inputs
  document.getElementById("filtroCustoMin").value = "";
  document.getElementById("filtroCustoMax").value = "";
  document.getElementById("filtroVendaMin").value = "";
  document.getElementById("filtroVendaMax").value = "";
  document.getElementById("filtroCentroResultado").value = "";
  document.getElementById("filtroDiasSemVendas").value = "";

  // Limpar calendários de data
  document.getElementById("dataInicioPrecos").value = "";
  document.getElementById("dataFimPrecos").value = "";
  document.getElementById("dataInicioValidade").value = "";
  document.getElementById("dataFimValidade").value = "";

  // Resetar objetos dos calendários
  calendarioPrecos.dataInicio = null;
  calendarioPrecos.dataFim = null;
  calendarioValidade.dataInicio = null;
  calendarioValidade.dataFim = null;

  // Resetar checkboxes
  document.querySelectorAll('input[name="saldoEstoque"]').forEach((cb) => {
    cb.checked = cb.value === "todos";
  });

  // Resetar radios
  document.querySelectorAll('input[name="estoqueMinimo"]').forEach((rb) => {
    rb.checked = rb.value === "todos";
  });

  console.log("🔄 Filtros resetados");
}

/**
 * Exportar produtos para CSV
 */
function exportarProdutosCSV(mode = "resumido", notify = true) {
  console.log("📥 Exportando produtos para CSV...", mode);

  // Helper para escapar células que contenham separador/delimitador/quotes/newlines
  function esc(cell) {
    if (cell === null || cell === undefined) return "";
    const s = String(cell);
    const needQuote =
      s.indexOf(";") !== -1 || s.indexOf('"') !== -1 || s.indexOf("\n") !== -1;
    const escaped = s.replace(/"/g, '""');
    return needQuote ? `"${escaped}"` : escaped;
  }

  const list = produtosLista || produtosExemplo || [];

  let csv = "";
  let filename = `produtos_${new Date().getTime()}.csv`;

  if (mode === "detalhado") {
    // Campos solicitados pelo usuário
    const headers = [
      "Código - Descrição",
      "Unidade",
      "Grupo",
      "Subgrupo",
      "Marca",
      "Local",
      "Estoque Mínimo",
      "NCM",
      "Centro de resultado",
      "Perfil de validade",
      "Preço de Custo",
      "Preço de Venda",
      "Data de validade",
      "Status da validade",
    ];

    // Cabeçalho do relatório
    csv += "RELATÓRIO DE PRODUTO\n";
    csv += "PET CRIA LTDA\n";
    csv += "Campos: " + headers.join(" | ") + "\n";
    csv += "\n";
    csv += headers.join("\t") + "\n";

    const sortedList = (list || []).slice().sort((a, b) =>
      (a.nome || a.descricao || "")
        .toString()
        .localeCompare(b.nome || b.descricao || "", "pt-BR", {
          sensitivity: "base",
        }),
    );
    sortedList.forEach((produto) => {
      const id =
        produto && produto.id !== undefined && produto.id !== null
          ? produto.id
          : "";
      const codigo = produto.codigo || id || "";
      const descricao = produto.nome || produto.descricao || "";
      const unidade = produto.unidade || produto.unidadeMedida || "";
      const grupo = produto.grupo || produto.categoria || "";
      const subgrupo = produto.subgrupo || produto.agrupamento || "";
      const marca = produto.marca || "";
      const local = produto.local || produto.localEstoque || "";
      const estoqueMinimo =
        produto.estoqueMinimo !== undefined && produto.estoqueMinimo !== null
          ? produto.estoqueMinimo
          : produto.estoque_minimo || "";
      const ncm = produto.ncm || "";
      const centroResultado = produto.centroResultado || produto.centro || "";
      const perfilValidade =
        produto.perfilValidade && typeof produto.perfilValidade === "object"
          ? produto.perfilValidade.descricao || ""
          : produto.perfilValidade || "";
      const precoCusto =
        produto.custoBase !== undefined && produto.custoBase !== null
          ? produto.custoBase
          : produto.precoCusto || "";
      const precoVenda =
        produto.preco !== undefined && produto.preco !== null
          ? produto.preco
          : produto.precoVenda || "";
      const dataValidade = produto.validade || produto.dataValidade || "";
      const statusValidade =
        validadeStatusMap && validadeStatusMap[String(id)]
          ? validadeStatusMap[String(id)].mensagem ||
            validadeStatusMap[String(id)].status ||
            ""
          : "";

      const row = [
        `${codigo} - ${descricao}`,
        unidade,
        grupo,
        subgrupo,
        marca,
        local,
        estoqueMinimo,
        ncm,
        centroResultado,
        perfilValidade,
        precoCusto,
        precoVenda,
        dataValidade,
        statusValidade,
      ];
      csv += row.map(esc).join("\t") + "\n";
    });
    filename = `meus-itens-detalhado_${new Date().toISOString().slice(0, 10)}.csv`;
  } else {
    // resumido (tab-separated)
    csv = "ID\tNome\tTipo\tPreço\n";
    list.forEach((produto) => {
      csv += `${esc(produto.id)}\t${esc(produto.nome)}\t${esc(produto.tipo)}\t${esc(produto.preco)}\n`;
    });
    filename = `meus-itens-resumido_${new Date().toISOString().slice(0, 10)}.csv`;
  }

  // Download do arquivo (adicionar BOM para preservar acentuação no Excel)
  try {
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/tab-separated-values;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log("✅ CSV exportado com sucesso");
    if (notify) {
      if (window.showToast)
        window.showToast("Exportação gerada com sucesso", "success", 2200);
      else alert("Exportação gerada com sucesso");
    }
  } catch (e) {
    console.error("Erro ao exportar CSV", e);
    if (notify) {
      if (window.showToast)
        window.showToast("Erro ao gerar exportação", "error", 3000);
      else alert("Erro ao gerar exportação");
    }
  }
}

/**
 * Exportar produtos como XLS (na prática um CSV com mime-type e extensão .xls)
 */
function exportarProdutosXLS(mode = "resumido", notify = true) {
  console.log("📥 Exportando produtos como XLS/XLSX...", mode);
  const list = produtosLista || produtosExemplo || [];

  // Prefer generating a real .xlsx when SheetJS (XLSX) is available in the page
  if (window.XLSX) {
    try {
      const aoa = [];
      if (mode === "detalhado") {
        const headers = [
          "Código - Descrição",
          "Unidade",
          "Grupo",
          "Subgrupo",
          "Marca",
          "Local",
          "Estoque Mínimo",
          "NCM",
          "Centro de resultado",
          "Perfil de validade",
          "Preço de Custo",
          "Preço de Venda",
          "Data de validade",
          "Status da validade",
        ];

        // Cabeçalho do relatório
        aoa.push(["RELATÓRIO DE PRODUTO"]);
        aoa.push(["PET CRIA LTDA"]);
        aoa.push(["Campos: " + headers.join(" | ")]);
        aoa.push([]);
        aoa.push(headers);

        const sortedList = (list || []).slice().sort((a, b) =>
          (a.nome || a.descricao || "")
            .toString()
            .localeCompare(b.nome || b.descricao || "", "pt-BR", {
              sensitivity: "base",
            }),
        );
        sortedList.forEach((p) => {
          const id = p && p.id !== undefined && p.id !== null ? p.id : "";
          const codigo = p.codigo || id || "";
          const descricao = p.nome || p.descricao || "";
          const unidadeBase = p.unidade || p.unidadeMedida || "";
          const grupo = p.grupo || p.categoria || "";
          const subgrupo = p.subgrupo || p.agrupamento || "";
          const marca = p.marca || "";
          const local = p.local || p.localEstoque || "";
          const estoqueMinimo =
            p.estoqueMinimo !== undefined && p.estoqueMinimo !== null
              ? p.estoqueMinimo
              : p.estoque_minimo || "";
          const ncm = p.ncm || "";
          const centroResultado = p.centroResultado || p.centro || "";
          const perfilValidade =
            p.perfilValidade && typeof p.perfilValidade === "object"
              ? p.perfilValidade.descricao || ""
              : p.perfilValidade || "";
          const precoCusto =
            p.custoBase !== undefined && p.custoBase !== null
              ? p.custoBase
              : p.precoCusto || "";
          const precoVenda =
            p.preco !== undefined && p.preco !== null
              ? p.preco
              : p.precoVenda || "";
          const dataValidade = p.validade || p.dataValidade || "";
          const statusValidade =
            validadeStatusMap && validadeStatusMap[String(id)]
              ? validadeStatusMap[String(id)].mensagem ||
                validadeStatusMap[String(id)].status ||
                ""
              : "";
          // Formatar unidade com preços
          const formatarPreco = (valor) => {
            if (!valor && valor !== 0) return "0,00";
            const num = typeof valor === "number" ? valor : parseFloat(valor);
            return num.toFixed(2).replace(".", ",");
          };
          const unidadeComPreco =
            unidadeBase +
            (precoCusto || precoVenda
              ? "\nC: R$ " +
                formatarPreco(precoCusto) +
                " / V: R$ " +
                formatarPreco(precoVenda)
              : "");

          aoa.push([
            `${codigo} - ${descricao}`,
            unidadeComPreco,
            grupo,
            subgrupo,
            marca,
            local,
            estoqueMinimo,
            ncm,
            centroResultado,
            perfilValidade,
            precoCusto,
            precoVenda,
            dataValidade,
            statusValidade,
          ]);
        });
      } else {
        aoa.push(["RELATÓRIO DE PRODUTO"]);
        aoa.push(["PET CRIA LTDA"]);
        aoa.push(["Campos: ID | Nome | Tipo | Preço"]);
        aoa.push([]);
        aoa.push(["ID", "Nome", "Tipo", "Preço"]);
        list.forEach((p) => aoa.push([p.id, p.nome, p.tipo, p.preco]));
      }

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Produtos");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const filename =
        mode === "detalhado"
          ? `meus-itens-detalhado_${new Date().toISOString().slice(0, 10)}.xlsx`
          : `meus-itens-resumido_${new Date().toISOString().slice(0, 10)}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (notify) {
        if (window.showToast)
          window.showToast("Exportação gerada com sucesso", "success", 2200);
        else console.log("Exportação gerada com sucesso");
      }
      return;
    } catch (err) {
      console.error("Erro gerando XLSX com SheetJS, fallback para TSV:", err);
      // fallback para TSV abaixo
    }
  }

  // fallback: gerar arquivo tab-separated com BOM (compatível com Excel)
  function esc(cell) {
    if (cell === null || cell === undefined) return "";
    return String(cell);
  }
  let tsv = "";
  let filename = `produtos_${new Date().getTime()}.xls`;
  if (mode === "detalhado") {
    const headers = [
      "Código - Descrição",
      "Unidade",
      "Grupo",
      "Subgrupo",
      "Marca",
      "Local",
      "Estoque Mínimo",
      "NCM",
      "Centro de resultado",
      "Perfil de validade",
      "Preço de Custo",
      "Preço de Venda",
      "Data de validade",
      "Status da validade",
    ];

    tsv += "RELATÓRIO DE PRODUTO\n";
    tsv += "PET CRIA LTDA\n";
    tsv += "Campos: " + headers.join(" | ") + "\n";
    tsv += "\n";
    tsv += headers.join("\t") + "\n";

    list.forEach((produto) => {
      const id =
        produto && produto.id !== undefined && produto.id !== null
          ? produto.id
          : "";
      const codigo = produto.codigo || id || "";
      const descricao = produto.nome || produto.descricao || "";
      const unidadeBase = produto.unidade || produto.unidadeMedida || "";
      const precoCusto =
        produto.custoBase !== undefined && produto.custoBase !== null
          ? produto.custoBase
          : produto.precoCusto || "";
      const precoVenda =
        produto.preco !== undefined && produto.preco !== null
          ? produto.preco
          : produto.precoVenda || "";
      const formatarPreco = (valor) => {
        if (!valor && valor !== 0) return "0,00";
        const num = typeof valor === "number" ? valor : parseFloat(valor);
        return num.toFixed(2).replace(".", ",");
      };
      const unidade =
        unidadeBase +
        (precoCusto || precoVenda
          ? "\nC: R$ " +
            formatarPreco(precoCusto) +
            " / V: R$ " +
            formatarPreco(precoVenda)
          : "");
      const grupo = produto.grupo || produto.categoria || "";
      const subgrupo = produto.subgrupo || produto.agrupamento || "";
      const marca = produto.marca || "";
      const local = produto.local || produto.localEstoque || "";
      const estoqueMinimo =
        produto.estoqueMinimo !== undefined && produto.estoqueMinimo !== null
          ? produto.estoqueMinimo
          : produto.estoque_minimo || "";
      const ncm = produto.ncm || "";
      const centroResultado = produto.centroResultado || produto.centro || "";
      const perfilValidade =
        produto.perfilValidade && typeof produto.perfilValidade === "object"
          ? produto.perfilValidade.descricao || ""
          : produto.perfilValidade || "";
      const dataValidade = produto.validade || produto.dataValidade || "";
      const statusValidade =
        validadeStatusMap && validadeStatusMap[String(id)]
          ? validadeStatusMap[String(id)].mensagem ||
            validadeStatusMap[String(id)].status ||
            ""
          : "";

      const row = [
        `${codigo} - ${descricao}`,
        unidade,
        grupo,
        subgrupo,
        marca,
        local,
        estoqueMinimo,
        ncm,
        centroResultado,
        perfilValidade,
        precoCusto,
        precoVenda,
        dataValidade,
        statusValidade,
      ];
      tsv += row.map(esc).join("\t") + "\n";
    });
    filename = `meus-itens-detalhado_${new Date().toISOString().slice(0, 10)}.xls`;
  } else {
    tsv = "ID\tNome\tTipo\tPreço\n";
    list.forEach((produto) => {
      tsv += `${esc(produto.id)}\t${esc(produto.nome)}\t${esc(produto.tipo)}\t${esc(produto.preco)}\n`;
    });
    filename = `meus-itens-resumido_${new Date().toISOString().slice(0, 10)}.xls`;
  }

  try {
    const blob = new Blob(["\uFEFF" + tsv], {
      type: "text/tab-separated-values;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (notify) {
      if (window.showToast)
        window.showToast("Exportação gerada com sucesso", "success", 2200);
      else console.log("Exportação gerada com sucesso");
    }
  } catch (e) {
    console.error("Erro exportar XLS", e);
    if (notify) {
      if (window.showToast)
        window.showToast("Erro ao gerar exportação", "error", 3000);
      else console.error("Erro ao gerar exportação");
    }
  }
}

// ===== FUNÇÕES PARA POPULAR FILTROS =====

/**
 * Buscar agrupamentos da API
 */
async function fetchAndParseAgrupamentos() {
  try {
    const agrupamentos = await ApiClient.getAgrupamentos();
    console.debug(
      "[fetchAndParseAgrupamentos] Agrupamentos da API:",
      agrupamentos,
    );

    // Transformar para formato esperado: [{ name: 'Grupo', children: ['Sub1', 'Sub2'] }]
    const groups = agrupamentos.map(function (agrup) {
      let subgrupos = [];

      // Se subgrupos for string JSON, fazer parse
      if (typeof agrup.subgrupos === "string") {
        try {
          subgrupos = JSON.parse(agrup.subgrupos);
        } catch (e) {
          console.warn(
            "[fetchAndParseAgrupamentos] Erro ao parsear subgrupos:",
            e,
          );
          subgrupos = [];
        }
      } else if (Array.isArray(agrup.subgrupos)) {
        subgrupos = agrup.subgrupos;
      }

      return {
        name: agrup.name,
        children: subgrupos,
      };
    });

    return groups;
  } catch (error) {
    console.error(
      "[fetchAndParseAgrupamentos] Erro ao buscar agrupamentos da API:",
      error,
    );
    return [];
  }
}

/**
 * Popular filtro de Agrupamento
 */
async function populateFiltroAgrupamento() {
  const sel = document.getElementById("filtroAgrupamento");
  if (!sel) return;

  sel.innerHTML = "";
  const optTodos = document.createElement("option");
  optTodos.value = "todos";
  optTodos.text = "Todos";
  sel.appendChild(optTodos);
  sel.value = "todos";

  try {
    console.log("[populateFiltroAgrupamento] Buscando agrupamentos da API...");
    const agrupamentos = await ApiClient.getAgrupamentos();

    if (Array.isArray(agrupamentos) && agrupamentos.length > 0) {
      agrupamentos.forEach((agrupamento) => {
        // Adicionar o agrupamento principal
        const opt = document.createElement("option");
        opt.value = agrupamento.id || agrupamento.name;
        opt.text = agrupamento.name;
        sel.appendChild(opt);

        // Se houver subgrupos, adicionar como opções indentadas
        if (agrupamento.subgrupos) {
          let subgrupos = [];

          // Se subgrupos for string JSON, fazer parse
          if (typeof agrupamento.subgrupos === "string") {
            try {
              subgrupos = JSON.parse(agrupamento.subgrupos);
            } catch (e) {
              console.warn("Erro ao fazer parse de subgrupos:", e);
            }
          } else if (Array.isArray(agrupamento.subgrupos)) {
            subgrupos = agrupamento.subgrupos;
          }

          // Adicionar cada subgrupo
          if (Array.isArray(subgrupos) && subgrupos.length > 0) {
            subgrupos.forEach((sub) => {
              const optSub = document.createElement("option");
              const subNome =
                typeof sub === "object" ? sub.name || sub.nome : sub;
              optSub.value = `${agrupamento.name} > ${subNome}`;
              optSub.text = `  ${subNome}`;
              sel.appendChild(optSub);
            });
          }
        }
      });
      console.log(`✅ ${agrupamentos.length} agrupamentos carregados da API`);
      // Atualizar multi-select caso já tenha sido inicializado
      try {
        const sid = sel.id;
        if (typeof multiSelectData !== "undefined" && multiSelectData[sid]) {
          const newOptions = Array.from(sel.options).map((opt) => ({
            value: opt.value,
            text: opt.text,
          }));
          updateMultiSelectOptions(sid, newOptions);
        }
      } catch (e) {
        console.warn("Erro ao atualizar multi-select (agrupamentos):", e);
      }
    } else {
      console.warn("⚠️ Nenhum agrupamento encontrado na API");
    }
  } catch (e) {
    console.error("❌ Erro ao buscar agrupamentos da API:", e);
  }
}

/**
 * Buscar e parsear marcas do arquivo marca.js
 */
function fetchAndParseMarcas() {
  var scriptCandidates = [
    "../item/marca.js",
    "/item/marca.js",
    "/item/marca.js",
    "item/marca.js",
    "./item/marca.js",
    "./marca.js",
    "marca.js",
  ];

  function tryInjectScripts(idx) {
    if (idx >= scriptCandidates.length) return Promise.resolve(null);
    var src = scriptCandidates[idx];
    return new Promise(function (resolve) {
      try {
        var script = document.createElement("script");
        script.src = src;
        script.async = true;
        var cleaned = false;
        var finish = function (result) {
          if (cleaned) return;
          cleaned = true;
          try {
            script.remove();
          } catch (e) {}
          resolve(result);
        };
        script.onload = function () {
          setTimeout(function () {
            try {
              if (
                window.marcasPadrao &&
                Array.isArray(window.marcasPadrao) &&
                window.marcasPadrao.length
              ) {
                var copy = Array.from(new Set(window.marcasPadrao.slice()));
                finish(copy);
              } else {
                finish(null);
              }
            } catch (e) {
              finish(null);
            }
          }, 120);
        };
        script.onerror = function () {
          finish(null);
        };
        (document.head || document.documentElement).appendChild(script);
        setTimeout(function () {
          if (!cleaned) finish(null);
        }, 1000);
      } catch (e) {
        resolve(null);
      }
    }).then(function (res) {
      if (res && res.length) return res;
      return tryInjectScripts(idx + 1);
    });
  }

  function fetchFallback() {
    var candidatesJs = [
      "../item/marca.js",
      "/item/marca.js",
      "/item/marca.js",
      "item/marca.js",
      "./item/marca.js",
      "./marca.js",
      "marca.js",
    ];
    function tryJs(i) {
      if (i >= candidatesJs.length) return Promise.resolve(null);
      var url = candidatesJs[i];
      return fetch(url)
        .then(function (resp) {
          if (!resp.ok) throw new Error("fetch failed:" + resp.status);
          return resp.text();
        })
        .then(function (txt) {
          try {
            var m = txt.match(/const\s+marcasPadrao\s*=\s*\[([\s\S]*?)\];/m);
            if (m && m[1]) {
              var entries = m[1]
                .split(/,(?=(?:[^'"`]*['"`]))/)
                .map(function (s) {
                  return s.trim();
                })
                .filter(Boolean)
                .map(function (s) {
                  return s.replace(/^['"`]|['"`]$/g, "").trim();
                })
                .filter(Boolean);
              return Array.from(new Set(entries));
            }
          } catch (e) {}
          return tryJs(i + 1);
        })
        .catch(function () {
          return tryJs(i + 1);
        });
    }

    var candidatesHtml = [
      "../item/marca.html",
      "/item/marca.html",
      "/item/marca.html",
      "item/marca.html",
      "./item/marca.html",
      "./marca.html",
      "marca.html",
    ];
    function tryHtml(i) {
      if (i >= candidatesHtml.length)
        return Promise.reject("nenhum caminho válido para marca");
      var url = candidatesHtml[i];
      return fetch(url)
        .then(function (resp) {
          if (!resp.ok) throw new Error("fetch failed:" + resp.status);
          return resp.text();
        })
        .then(function (txt) {
          try {
            var parser = new DOMParser();
            var doc = parser.parseFromString(txt, "text/html");
            var arr = [];
            var rows = doc.querySelectorAll(".marcas-table tbody tr");
            if (rows && rows.length) {
              rows.forEach(function (tr) {
                var td = tr.querySelector("td");
                if (td) arr.push(td.textContent.trim());
              });
              return Array.from(new Set(arr));
            }
            var els = doc.querySelectorAll(".marca-nome, .nome-marca");
            els.forEach(function (el) {
              if (el && el.textContent) arr.push(el.textContent.trim());
            });
            return Array.from(new Set(arr));
          } catch (e) {
            return Promise.reject(e);
          }
        })
        .catch(function () {
          return tryHtml(i + 1);
        });
    }
    return tryJs(0).then(function (jsRes) {
      if (Array.isArray(jsRes) && jsRes.length) return jsRes;
      return tryHtml(0);
    });
  }

  function mergeWithLocal(list) {
    var base = Array.isArray(list) ? Array.from(list) : [];
    try {
      var raw = localStorage.getItem("marcas_list");
      if (raw) {
        var localArr = JSON.parse(raw);
        if (Array.isArray(localArr))
          localArr.forEach(function (x) {
            if (x && base.indexOf(x) === -1) base.push(x);
          });
      }
    } catch (e) {}
    base = base
      .map(function (s) {
        return (s || "").toString().trim();
      })
      .filter(Boolean);
    var seen = {};
    var out = [];
    base.forEach(function (it) {
      if (!seen[it]) {
        seen[it] = true;
        out.push(it);
      }
    });
    return out;
  }

  return tryInjectScripts(0).then(function (res) {
    if (res && res.length) return mergeWithLocal(res);
    return fetchFallback().then(function (r) {
      return mergeWithLocal(r);
    });
  });
}

/**
 * Popular filtro de Marca
 */
async function populateFiltroMarca() {
  const sel = document.getElementById("filtroMarca");
  if (!sel) return;

  sel.innerHTML = "";
  const optTodos = document.createElement("option");
  optTodos.value = "todos";
  optTodos.text = "Todas";
  sel.appendChild(optTodos);
  sel.value = "todos";

  try {
    console.log("[populateFiltroMarca] Buscando marcas dos produtos...");
    const produtos = await ApiClient.getProdutos();

    if (Array.isArray(produtos) && produtos.length > 0) {
      // Extrair marcas únicas dos produtos
      const marcasSet = new Set();
      produtos.forEach((produto) => {
        if (produto.marca) {
          const marcaNome =
            typeof produto.marca === "object"
              ? produto.marca.nome
              : produto.marca;
          if (marcaNome) marcasSet.add(marcaNome);
        }
      });

      const marcas = Array.from(marcasSet).sort();
      marcas.forEach((marca) => {
        const opt = document.createElement("option");
        opt.value = marca;
        opt.text = marca;
        sel.appendChild(opt);
      });
      console.log(`✅ ${marcas.length} marcas únicas encontradas`);
      // Atualizar multi-select caso já exista
      try {
        const sid = sel.id;
        if (typeof multiSelectData !== "undefined" && multiSelectData[sid]) {
          const newOptions = Array.from(sel.options).map((opt) => ({
            value: opt.value,
            text: opt.text,
          }));
          updateMultiSelectOptions(sid, newOptions);
        }
      } catch (e) {
        console.warn("Erro ao atualizar multi-select (marcas):", e);
      }
    } else {
      console.warn("⚠️ Nenhum produto encontrado");
    }
  } catch (e) {
    console.error("❌ Erro ao buscar marcas:", e);
  }
}

/**
 * Buscar e parsear fornecedores do arquivo fornecedor.js
 */
function fetchAndParseFornecedores() {
  var scriptCandidates = [
    "../compras/fornecedor.js",
    "/compras/fornecedor.js",
    "./compras/fornecedor.js",
    "compras/fornecedor.js",
    "./fornecedor.js",
    "fornecedor.js",
  ];

  function tryInject(i) {
    if (i >= scriptCandidates.length) return Promise.resolve(null);
    var src = scriptCandidates[i];
    return new Promise(function (resolve) {
      try {
        var s = document.createElement("script");
        s.src = src;
        s.async = true;
        var cleaned = false;
        var finish = function (res) {
          if (cleaned) return;
          cleaned = true;
          try {
            s.remove();
          } catch (e) {}
          resolve(res);
        };
        s.onload = function () {
          setTimeout(function () {
            try {
              if (
                window.fornecedoresData &&
                Array.isArray(window.fornecedoresData) &&
                window.fornecedoresData.length
              ) {
                resolve(
                  window.fornecedoresData.map((f) =>
                    f && (f.nome || f.descricao)
                      ? f.nome || f.descricao
                      : String(f),
                  ),
                );
              } else finish(null);
            } catch (e) {
              finish(null);
            }
          }, 120);
        };
        s.onerror = function () {
          finish(null);
        };
        (document.head || document.documentElement).appendChild(s);
        setTimeout(function () {
          if (!cleaned) finish(null);
        }, 1000);
      } catch (e) {
        resolve(null);
      }
    }).then(function (res) {
      if (res && res.length) return res;
      return tryInject(i + 1);
    });
  }

  function fetchFallback() {
    var jsCandidates = [
      "../compras/fornecedor.js",
      "/compras/fornecedor.js",
      "./compras/fornecedor.js",
      "compras/fornecedor.js",
      "./fornecedor.js",
      "fornecedor.js",
    ];
    function tryJs(j) {
      if (j >= jsCandidates.length) return Promise.resolve(null);
      var url = jsCandidates[j];
      return fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error("fetch failed");
          return r.text();
        })
        .then((txt) => {
          try {
            var m = txt.match(
              /(?:let|var|const)\s+fornecedoresData\s*=\s*\[([\s\S]*?)\]/m,
            );
            if (m && m[1]) {
              var arrText = "[" + m[1] + "]";
              var data = new Function("return " + arrText)();
              if (Array.isArray(data))
                return data.map((f) =>
                  f && (f.nome || f.descricao)
                    ? f.nome || f.descricao
                    : String(f),
                );
            }
          } catch (e) {}
          return tryJs(j + 1);
        })
        .catch(function () {
          return tryJs(j + 1);
        });
    }

    function tryHtml(k) {
      var htmlCandidates = [
        "../compras/fornecedor.html",
        "/compras/fornecedor.html",
        "./compras/fornecedor.html",
        "compras/fornecedor.html",
        "./fornecedor.html",
        "fornecedor.html",
      ];
      if (k >= htmlCandidates.length) return Promise.resolve([]);
      return fetch(htmlCandidates[k])
        .then((r) => {
          if (!r.ok) throw new Error("fetch failed");
          return r.text();
        })
        .then((txt) => {
          try {
            var parser = new DOMParser();
            var doc = parser.parseFromString(txt, "text/html");
            var rows = doc.querySelectorAll("#fornecedoresTableBody tr");
            var out = [];
            if (rows && rows.length) {
              rows.forEach(function (tr) {
                var td = tr.querySelector("td");
                if (td) out.push(td.textContent.trim());
              });
              return out;
            }
            var els = doc.querySelectorAll(
              ".fornecedor-nome, .nome-fornecedor",
            );
            els.forEach(function (el) {
              if (el && el.textContent) out.push(el.textContent.trim());
            });
            return out;
          } catch (e) {
            return tryHtml(k + 1);
          }
        })
        .catch(function () {
          return tryHtml(k + 1);
        });
    }
    return tryJs(0).then(function (r) {
      if (Array.isArray(r) && r.length) return r;
      return tryHtml(0);
    });
  }

  function mergeLocal(list) {
    var base = Array.isArray(list) ? Array.from(list) : [];
    try {
      var raw = localStorage.getItem("fornecedores_list");
      if (raw) {
        var la = JSON.parse(raw);
        if (Array.isArray(la))
          la.forEach(function (x) {
            var name =
              x && (x.nome || x.descricao)
                ? x.nome || x.descricao
                : typeof x === "string"
                  ? x
                  : String(x);
            if (name && base.indexOf(name) === -1) base.push(name);
          });
      }
    } catch (e) {}
    base = base.map((s) => (s || "").toString().trim()).filter(Boolean);
    var seen = {};
    return base.filter(function (it) {
      if (seen[it]) return false;
      seen[it] = true;
      return true;
    });
  }

  return tryInject(0).then(function (res) {
    if (res && res.length) return mergeLocal(res);
    return fetchFallback().then(function (r) {
      return mergeLocal(r);
    });
  });
}

/**
 * Popular filtro de Fornecedor
 */
async function populateFiltroFornecedor() {
  const sel = document.getElementById("filtroFornecedor");
  if (!sel) return;

  sel.innerHTML = "";
  const optTodos = document.createElement("option");
  optTodos.value = "todos";
  optTodos.text = "Todos";
  sel.appendChild(optTodos);
  sel.value = "todos";

  try {
    console.log("[populateFiltroFornecedor] Buscando fornecedores...");

    // Tentar buscar do arquivo fornecedor.js
    const paths = [
      "../compras/fornecedor.js",
      "/compras/fornecedor.js",
      "./compras/fornecedor.js",
      "compras/fornecedor.js",
    ];

    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (!response.ok) continue;

        const text = await response.text();

        // Extrair fornecedoresData do arquivo JS
        const match = text.match(
          /let\s+fornecedoresData\s*=\s*(\[[\s\S]*?\]);/,
        );
        if (match && match[1]) {
          const fornecedoresData = eval(match[1]);

          if (Array.isArray(fornecedoresData)) {
            const fornecedores = fornecedoresData.filter(
              (f) => f && f.ativo && f.nome,
            );
            fornecedores.forEach((fornecedor) => {
              const opt = document.createElement("option");
              opt.value = fornecedor.nome;
              opt.text = fornecedor.nome;
              sel.appendChild(opt);
            });
            console.log(
              `✅ ${fornecedores.length} fornecedores carregados de ${path}`,
            );
            // Atualizar multi-select caso já exista
            try {
              const sid = sel.id;
              if (
                typeof multiSelectData !== "undefined" &&
                multiSelectData[sid]
              ) {
                const newOptions = Array.from(sel.options).map((opt) => ({
                  value: opt.value,
                  text: opt.text,
                }));
                updateMultiSelectOptions(sid, newOptions);
              }
            } catch (e) {
              console.warn("Erro ao atualizar multi-select (fornecedores):", e);
            }
            return; // Sucesso, sair da função
          }
        }
      } catch (e) {
        console.debug(`Tentativa falhou para ${path}:`, e.message);
        continue;
      }
    }

    console.warn("⚠️ Nenhum fornecedor encontrado em nenhum caminho");
  } catch (e) {
    console.error("❌ Erro ao buscar fornecedores:", e);
  }
}

// ========================================
// MODAL ZERAR ESTOQUE
// ========================================

/**
 * Abrir modal de zerar estoque
 */
async function abrirModalZerarEstoque() {
  const modal = document.getElementById("modalZerarEstoque");
  if (!modal) {
    console.error("❌ Modal zerar estoque não encontrado");
    return;
  }

  // Carregar agrupamentos no select
  await carregarAgrupamentosZerarEstoque();

  // Mostrar modal
  modal.style.display = "flex";
  console.log("✅ Modal zerar estoque aberto");

  // Configurar event listeners (apenas uma vez)
  if (!modal.dataset.initialized) {
    configurarEventListenersModalZerar();
    modal.dataset.initialized = "true";
  }
}

/**
 * Carregar agrupamentos no select do modal
 */
async function carregarAgrupamentosZerarEstoque() {
  try {
    const select = document.getElementById("selectAgrupamentoZerar");
    if (!select) return;

    // Limpar select
    select.innerHTML = '<option value="">Todos</option>';

    // Buscar agrupamentos da API - tentar algumas estratégias de recuperação e normalização
    let agrupamentos = [];

    // Preferir helper local se existir (mais robusto)
    if (typeof window.getAgrupamentosAPI === "function") {
      try {
        agrupamentos = await window.getAgrupamentosAPI();
      } catch (e) {
        console.debug("getAgrupamentosAPI falhou:", e);
      }
    }

    // Caso não tenha vindo via helper, usar ApiClient e normalizar resposta
    if (!Array.isArray(agrupamentos) || agrupamentos.length === 0) {
      try {
        const resp = await ApiClient.getAgrupamentos();
        if (Array.isArray(resp)) {
          agrupamentos = resp;
        } else if (resp && Array.isArray(resp.agrupamentos)) {
          agrupamentos = resp.agrupamentos;
        } else if (resp && Array.isArray(resp.data)) {
          agrupamentos = resp.data;
        } else if (typeof resp === "string") {
          try {
            agrupamentos = JSON.parse(resp);
          } catch (e) {
            agrupamentos = [];
          }
        } else {
          // tentar extrair arrays em propriedades conhecidas
          agrupamentos = [];
          Object.keys(resp || {}).forEach((k) => {
            if (Array.isArray(resp[k]) && resp[k].length)
              agrupamentos = resp[k];
          });
        }
      } catch (e) {
        console.error("Erro ao chamar ApiClient.getAgrupamentos():", e);
      }
    }

    console.log(
      `📦 ${Array.isArray(agrupamentos) ? agrupamentos.length : 0} agrupamentos carregados`,
      agrupamentos,
    );

    // Popular select com agrupamentos e subgrupos (tolerante a formatos diferentes)
    (Array.isArray(agrupamentos) ? agrupamentos : []).forEach((agrup) => {
      const id = (agrup && (agrup.id || agrup._id || agrup.key)) || "";
      const nomeAgrup =
        (agrup &&
          (agrup.name || agrup.nome || agrup.title || agrup.descricao)) ||
        "";

      const option = document.createElement("option");
      option.value = id || nomeAgrup;
      option.textContent = nomeAgrup || String(id);
      select.appendChild(option);

      // Subgrupos podem vir como array ou string JSON
      let subs = [];
      if (Array.isArray(agrup && agrup.subgrupos)) subs = agrup.subgrupos;
      else if (typeof (agrup && agrup.subgrupos) === "string") {
        try {
          subs = JSON.parse(agrup.subgrupos);
        } catch (e) {
          subs = [];
        }
      }

      if (Array.isArray(subs) && subs.length) {
        subs.forEach((sub) => {
          const subId =
            (sub && (sub.id || sub._id)) ||
            (typeof sub === "string" ? sub : "");
          const subNome =
            (sub && (sub.name || sub.nome)) ||
            (typeof sub === "string" ? sub : "");
          const subOption = document.createElement("option");
          subOption.value = subId || subNome;
          subOption.textContent = `  └─ ${subNome || subId}`;
          subOption.style.paddingLeft = "20px";
          select.appendChild(subOption);
        });
      }
    });

    console.log(`✅ Select populado com ${select.options.length} opções`);
  } catch (error) {
    console.error("❌ Erro ao carregar agrupamentos:", error);
  }
}

/**
 * Configurar event listeners do modal
 */
function configurarEventListenersModalZerar() {
  const modal = document.getElementById("modalZerarEstoque");
  const btnFechar = document.getElementById("btnFecharModalZerar");
  const btnCancelar = document.getElementById("btnCancelarZerar");
  const btnConfirmar = document.getElementById("btnConfirmarZerar");

  // Fechar modal
  const fecharModal = () => {
    modal.style.display = "none";
  };

  btnFechar.addEventListener("click", fecharModal);
  btnCancelar.addEventListener("click", fecharModal);

  // Fechar ao clicar fora
  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      fecharModal();
    }
  });

  // Confirmar zerar estoque
  btnConfirmar.addEventListener("click", async function () {
    await zerarEstoque();
  });
}

/**
 * Zerar estoque dos produtos
 */
async function zerarEstoque() {
  try {
    // Obter valores selecionados
    const tipoRadio = document.querySelector(
      'input[name="tipoZerarEstoque"]:checked',
    );
    const selectAgrup = document.getElementById("selectAgrupamentoZerar");

    const tipo = tipoRadio ? tipoRadio.value : "todos";
    const agrupamentoId = selectAgrup ? selectAgrup.value : "";

    console.log("🧹 Zerando estoque:", { tipo, agrupamentoId });

    // Confirmar ação usando modal customizado (centralizado)
    const userConfirmed = await (function (message) {
      return new Promise(function (resolve) {
        try {
          // remover overlays antigos específicos desta função
          document
            .querySelectorAll(".sys-confirm-overlay")
            .forEach((e) => e.remove());

          const overlay = document.createElement("div");
          overlay.className = "sys-confirm-overlay";
          overlay.style.position = "fixed";
          overlay.style.left = "0";
          overlay.style.top = "0";
          overlay.style.width = "100%";
          overlay.style.height = "100%";
          overlay.style.background = "rgba(0,0,0,0.35)";
          overlay.style.display = "flex";
          overlay.style.alignItems = "center";
          overlay.style.justifyContent = "center";
          overlay.style.zIndex = "30000";

          const modal = document.createElement("div");
          modal.style.background = "#fff";
          modal.style.borderRadius = "12px";
          modal.style.boxShadow = "0 12px 36px rgba(0,0,0,0.18)";
          modal.style.padding = "22px";
          modal.style.maxWidth = "520px";
          modal.style.width = "min(92%,520px)";
          modal.style.fontFamily = "inherit";

          modal.innerHTML = `
                        <div style="font-weight:700;margin-bottom:8px;font-size:16px;color:#2b2b2b">Confirmação</div>
                        <div style="margin-bottom:18px;color:#444;white-space:pre-wrap">${escapeHtml(message)}</div>
                        <div style="text-align:right;display:flex;gap:12px;justify-content:flex-end">
                            <button class="sys-confirm-cancel" style="padding:10px 16px;border-radius:10px;border:1px solid #e6e6e6;background:#fff;color:#333;cursor:pointer">Cancelar</button>
                            <button class="sys-confirm-ok" style="padding:10px 18px;border-radius:12px;border:none;background:#8b3b41;color:#fff;font-weight:600;cursor:pointer">Sim</button>
                        </div>
                    `;

          overlay.appendChild(modal);
          document.body.appendChild(overlay);

          const btnCancel = modal.querySelector(".sys-confirm-cancel");
          const btnOk = modal.querySelector(".sys-confirm-ok");

          function cleanup(val) {
            try {
              overlay.remove();
            } catch (e) {}
            resolve(!!val);
          }

          btnCancel.addEventListener("click", function (e) {
            e.preventDefault();
            cleanup(false);
          });
          btnOk.addEventListener("click", function (e) {
            e.preventDefault();
            cleanup(true);
          });
          overlay.addEventListener("click", function (e) {
            if (e.target === overlay) cleanup(false);
          });
        } catch (e) {
          console.debug("sys confirm failed", e);
          confirmar(message).then(function (r) {
            resolve(r);
          });
        }
      });
    })(
      `Tem certeza que deseja zerar o estoque?\n\nTipo: ${tipo}\nAgrupamento: ${agrupamentoId || "Todos"}`,
    );
    if (!userConfirmed) return;

    // Buscar produtos para zerar
    const produtos = produtosLista || [];
    let produtosFiltrados = produtos.filter((p) => {
      // Filtrar por tipo de estoque
      const estoque = parseInt(p.estoqueAtual) || 0;
      let passaTipo = false;

      if (tipo === "todos") passaTipo = true;
      else if (tipo === "negativos") passaTipo = estoque < 0;
      else if (tipo === "positivos") passaTipo = estoque > 0;

      if (!passaTipo) return false;

      // Filtrar por agrupamento (comparações tolerantes a formatos diferentes)
      if (agrupamentoId) {
        const sel = (agrupamentoId || "").toString().trim();

        // coletar possíveis ids/nomes do produto
        const possibleIds = new Set();
        const possibleNames = new Set();

        // campos simples
        if (p.agrupamentoId) possibleIds.add(String(p.agrupamentoId));
        if (p.grupoId) possibleIds.add(String(p.grupoId));
        if (p.subgrupoId) possibleIds.add(String(p.subgrupoId));

        // campos objeto: agrupamento / grupo / subgrupo podem ser objetos
        try {
          if (p.agrupamento && typeof p.agrupamento === "object") {
            if (p.agrupamento.id) possibleIds.add(String(p.agrupamento.id));
            if (p.agrupamento._id) possibleIds.add(String(p.agrupamento._id));
            if (p.agrupamento.name)
              possibleNames.add(
                String(p.agrupamento.name).trim().toLowerCase(),
              );
            if (p.agrupamento.nome)
              possibleNames.add(
                String(p.agrupamento.nome).trim().toLowerCase(),
              );
          }
        } catch (e) {}
        try {
          if (p.grupo && typeof p.grupo === "object") {
            if (p.grupo.id) possibleIds.add(String(p.grupo.id));
            if (p.grupo._id) possibleIds.add(String(p.grupo._id));
            if (p.grupo.name)
              possibleNames.add(String(p.grupo.name).trim().toLowerCase());
            if (p.grupo.nome)
              possibleNames.add(String(p.grupo.nome).trim().toLowerCase());
          }
        } catch (e) {}
        try {
          if (p.subgrupo && typeof p.subgrupo === "object") {
            if (p.subgrupo.id) possibleIds.add(String(p.subgrupo.id));
            if (p.subgrupo._id) possibleIds.add(String(p.subgrupo._id));
            if (p.subgrupo.name)
              possibleNames.add(String(p.subgrupo.name).trim().toLowerCase());
            if (p.subgrupo.nome)
              possibleNames.add(String(p.subgrupo.nome).trim().toLowerCase());
          } else if (p.subgrupo && typeof p.subgrupo === "string") {
            possibleNames.add(String(p.subgrupo).trim().toLowerCase());
          }
        } catch (e) {}

        // nomes diretos em produto
        if (p.agrupamentoNome)
          possibleNames.add(String(p.agrupamentoNome).trim().toLowerCase());
        if (p.grupoNome)
          possibleNames.add(String(p.grupoNome).trim().toLowerCase());
        if (p.subgrupoNome)
          possibleNames.add(String(p.subgrupoNome).trim().toLowerCase());

        // também aceitar comparação por nome simples (campo grupo/agrupamento pode ser string)
        if (p.agrupamento && typeof p.agrupamento === "string")
          possibleNames.add(String(p.agrupamento).trim().toLowerCase());
        if (p.grupo && typeof p.grupo === "string")
          possibleNames.add(String(p.grupo).trim().toLowerCase());

        // normalizar seleção para comparação
        const selLower = sel.toLowerCase();

        // igualdade por id
        if (possibleIds.has(sel)) return true;

        // tentativa: comparar números (ex: sel '12' com id 12)
        try {
          if ([...possibleIds].some((x) => Number(x) === Number(sel)))
            return true;
        } catch (e) {}

        // comparar por nome (case-insensitive)
        if ([...possibleNames].some((n) => n === selLower)) return true;

        // fallback: comparar representação combinada (Group > Sub)
        try {
          const gName = (p.grupo && (p.grupo.name || p.grupo.nome)) || "";
          const sName =
            (p.subgrupo && (p.subgrupo.name || p.subgrupo.nome)) ||
            p.subgrupo ||
            "";
          const combined = `${gName} > ${sName}`.trim().toLowerCase();
          if (combined && combined === selLower) return true;
        } catch (e) {}

        return false;
      }

      return true;
    });

    if (produtosFiltrados.length === 0) {
      if (window.showToast) {
        window.showToast(
          "Nenhum produto encontrado com os critérios selecionados.",
          "warning",
          3000,
        );
      } else {
        alert("Nenhum produto encontrado com os critérios selecionados.");
      }
      return;
    }

    // Confirmar quantidade
    const confirmaQtd = await (function (message) {
      return new Promise(function (resolve) {
        try {
          // Reuse same sys-confirm overlay pattern
          document
            .querySelectorAll(".sys-confirm-overlay")
            .forEach((e) => e.remove());
          const overlay = document.createElement("div");
          overlay.className = "sys-confirm-overlay";
          overlay.style.position = "fixed";
          overlay.style.left = "0";
          overlay.style.top = "0";
          overlay.style.width = "100%";
          overlay.style.height = "100%";
          overlay.style.background = "rgba(0,0,0,0.35)";
          overlay.style.display = "flex";
          overlay.style.alignItems = "center";
          overlay.style.justifyContent = "center";
          overlay.style.zIndex = "30000";

          const modal = document.createElement("div");
          modal.style.background = "#fff";
          modal.style.borderRadius = "12px";
          modal.style.boxShadow = "0 12px 36px rgba(0,0,0,0.18)";
          modal.style.padding = "22px";
          modal.style.maxWidth = "520px";
          modal.style.width = "min(92%,520px)";
          modal.style.fontFamily = "inherit";

          modal.innerHTML = `
                        <div style="font-weight:700;margin-bottom:8px;font-size:16px;color:#2b2b2b">Confirmação</div>
                        <div style="margin-bottom:18px;color:#444">${escapeHtml(message)}</div>
                        <div style="text-align:right;display:flex;gap:12px;justify-content:flex-end">
                            <button class="sys-confirm-cancel" style="padding:10px 16px;border-radius:10px;border:1px solid #e6e6e6;background:#fff;color:#333;cursor:pointer">Cancelar</button>
                            <button class="sys-confirm-ok" style="padding:10px 18px;border-radius:12px;border:none;background:#8b3b41;color:#fff;font-weight:600;cursor:pointer">Sim</button>
                        </div>
                    `;

          overlay.appendChild(modal);
          document.body.appendChild(overlay);

          const btnCancel = modal.querySelector(".sys-confirm-cancel");
          const btnOk = modal.querySelector(".sys-confirm-ok");

          function cleanup(val) {
            try {
              overlay.remove();
            } catch (e) {}
            resolve(!!val);
          }

          btnCancel.addEventListener("click", function (e) {
            e.preventDefault();
            cleanup(false);
          });
          btnOk.addEventListener("click", function (e) {
            e.preventDefault();
            cleanup(true);
          });
          overlay.addEventListener("click", function (e) {
            if (e.target === overlay) cleanup(false);
          });
        } catch (e) {
          console.debug("sys confirm failed", e);
          confirmar(message).then(function (r) {
            resolve(r);
          });
        }
      });
    })(`${produtosFiltrados.length} produtos serão zerados. Continuar?`);
    if (!confirmaQtd) return;

    // Zerar estoque de cada produto via API
    let zerados = 0;
    let erros = 0;

    for (const produto of produtosFiltrados) {
      try {
        await ApiClient.atualizarProduto(produto.id, {
          ...produto,
          estoqueAtual: 0,
        });
        zerados++;
      } catch (error) {
        console.error(`❌ Erro ao zerar produto ${produto.id}:`, error);
        erros++;
      }
    }

    console.log(`✅ ${zerados} produtos zerados, ${erros} erros`);

    // Fechar modal
    document.getElementById("modalZerarEstoque").style.display = "none";

    // Mostrar resultado com toast estilizado (canto superior direito)
    const mensagem = `Produtos zerados com sucesso (${zerados} atualizados${erros > 0 ? `, ${erros} erros` : ""})`;
    if (window.showToast) {
      window.showToast(mensagem, "success", 3500);
    } else {
      alert(mensagem);
    }

    // Recarregar lista de produtos
    await inicializarProdutosLista();
    renderizarProdutos("todos");
  } catch (error) {
    console.error("❌ Erro ao zerar estoque:", error);
    alert("Erro ao zerar estoque: " + error.message);
  }
}

// ========================================
// CALENDÁRIOS DOS FILTROS
// ========================================

// Calendário para Preços Alterados
let calendarioPrecos = {
  mes: new Date().getMonth(),
  ano: new Date().getFullYear(),
  dataInicio: null,
  dataFim: null,
  selecionandoInicio: true,
};

// Calendário para Validade
let calendarioValidade = {
  mes: new Date().getMonth(),
  ano: new Date().getFullYear(),
  dataInicio: null,
  dataFim: null,
  selecionandoInicio: true,
};

function inicializarCalendarios() {
  inicializarCalendarioPrecos();
  inicializarCalendarioValidade();

  // Fecha popovers ao clicar fora
  document.addEventListener("click", function (e) {
    const pop1 = document.getElementById("calendarioPopupPrecos");
    const pop2 = document.getElementById("calendarioPopupValidade");
    const anchorPrecos = document.getElementById("periodoPrecos");
    const anchorValidade = document.getElementById("periodoValidade");

    if (pop1 && pop1.style.display === "block") {
      if (
        !pop1.contains(e.target) &&
        !(anchorPrecos && anchorPrecos.contains(e.target))
      ) {
        fecharCalendarioPrecos();
      }
    }

    if (pop2 && pop2.style.display === "block") {
      if (
        !pop2.contains(e.target) &&
        !(anchorValidade && anchorValidade.contains(e.target))
      ) {
        fecharCalendarioValidade();
      }
    }
  });
}

// ========== CALENDÁRIO PREÇOS ==========
function inicializarCalendarioPrecos() {
  const periodoPrecos = document.getElementById("periodoPrecos");
  const calendarioPopup = document.getElementById("calendarioPopupPrecos");

  if (periodoPrecos && calendarioPopup) {
    periodoPrecos.addEventListener("click", function (e) {
      e.stopPropagation();
      abrirCalendarioPrecos(periodoPrecos);
    });

    document
      .getElementById("btnMesAnteriorPrecos")
      .addEventListener("click", function () {
        calendarioPrecos.mes--;
        if (calendarioPrecos.mes < 0) {
          calendarioPrecos.mes = 11;
          calendarioPrecos.ano--;
        }
        gerarCalendarioPrecos();
      });

    document
      .getElementById("btnProximoMesPrecos")
      .addEventListener("click", function () {
        calendarioPrecos.mes++;
        if (calendarioPrecos.mes > 11) {
          calendarioPrecos.mes = 0;
          calendarioPrecos.ano++;
        }
        gerarCalendarioPrecos();
      });

    document
      .getElementById("btnCalendarioCancelarPrecos")
      .addEventListener("click", cancelarCalendarioPrecos);
    document
      .getElementById("btnCalendarioAplicarPrecos")
      .addEventListener("click", aplicarDatasCalendarioPrecos);
  }
}

function abrirCalendarioPrecos(anchor) {
  const popup = document.getElementById("calendarioPopupPrecos");
  popup.style.display = "block";
  // prepare data and render calendar first so popup has measured height
  calendarioPrecos.mes = new Date().getMonth();
  calendarioPrecos.ano = new Date().getFullYear();
  calendarioPrecos.selecionandoInicio = true;
  gerarCalendarioPrecos();

  // position popup above the anchor element if there's space, otherwise below
  if (anchor && anchor.getBoundingClientRect) {
    const rect = anchor.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
    const popupHeight = popup.offsetHeight || 260;
    const spaceAbove = rect.top;

    let left = rect.left + scrollLeft;
    const popupWidth = popup.offsetWidth || 420;
    if (left + popupWidth > window.innerWidth) {
      left = Math.max(8, window.innerWidth - popupWidth - 8);
    }

    if (spaceAbove > popupHeight + 12) {
      // place above
      let top = rect.top + scrollTop - popupHeight - 6;
      popup.style.top = top + "px";
      popup.style.left = left + "px";
    } else {
      // place below
      let top = rect.bottom + scrollTop + 6;
      popup.style.top = top + "px";
      popup.style.left = left + "px";
    }
  } else {
    // default center-top position
    popup.style.top = window.scrollY + 120 + "px";
    popup.style.left =
      window.innerWidth / 2 - (popup.offsetWidth || 210) + "px";
  }
}

function fecharCalendarioPrecos() {
  document.getElementById("calendarioPopupPrecos").style.display = "none";
}

function cancelarCalendarioPrecos() {
  try {
    calendarioPrecos.dataInicio = null;
    calendarioPrecos.dataFim = null;
    calendarioPrecos.selecionandoInicio = true;
    const inputInicio = document.getElementById("dataInicioPrecos");
    const inputFim = document.getElementById("dataFimPrecos");
    if (inputInicio) inputInicio.value = "";
    if (inputFim) inputFim.value = "";
    // re-render para limpar destaques
    try {
      gerarCalendarioPrecos();
    } catch (e) {}
  } catch (e) {
    console.debug("[cancelarCalendarioPrecos] erro ao limpar", e);
  }
  fecharCalendarioPrecos();
}

function gerarCalendarioPrecos() {
  const meses = [
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

  // primeiro e segundo mês (lado a lado)
  const mes1 = calendarioPrecos.mes;
  const ano1 = calendarioPrecos.ano;
  let mes2 = mes1 + 1;
  let ano2 = ano1;
  if (mes2 > 11) {
    mes2 = 0;
    ano2 = ano1 + 1;
  }

  const container1 = document.getElementById("mesContainerPrecos");
  const container2 = document.getElementById("mesContainerPrecos2");
  container1.innerHTML = "";
  container2.innerHTML = "";

  function buildMonth(container, m, y) {
    const header = document.createElement("div");
    header.style.cssText =
      "display:flex; justify-content:center; align-items:center; font-weight:600; margin-bottom:8px;";
    header.textContent = `${meses[m]} ${y}`;
    container.appendChild(header);

    const weekdays = document.createElement("div");
    weekdays.style.cssText =
      "display:grid; grid-template-columns:repeat(7,1fr); gap:4px; margin-bottom:6px; text-align:center; font-weight:600; font-size:12px; color:#666;";
    ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].forEach((w) => {
      const d = document.createElement("div");
      d.textContent = w;
      weekdays.appendChild(d);
    });
    container.appendChild(weekdays);

    const daysGrid = document.createElement("div");
    daysGrid.style.cssText =
      "display:grid; grid-template-columns:repeat(7,1fr); gap:4px;";

    const primeiroDia = new Date(y, m, 1).getDay();
    const diasNoMes = new Date(y, m + 1, 0).getDate();

    for (let i = 0; i < primeiroDia; i++) {
      const divVazio = document.createElement("div");
      divVazio.style.cssText = "padding:8px; text-align:center; color:#ccc;";
      daysGrid.appendChild(divVazio);
    }

    for (let dia = 1; dia <= diasNoMes; dia++) {
      const divDia = document.createElement("div");
      divDia.textContent = dia;
      divDia.style.cssText =
        "padding:6px; text-align:center; cursor:pointer; border-radius:6px; transition:all 0.12s; font-size:13px;";
      const dataAtual = new Date(y, m, dia);

      if (calendarioPrecos.dataInicio && calendarioPrecos.dataFim) {
        if (
          dataAtual >= calendarioPrecos.dataInicio &&
          dataAtual <= calendarioPrecos.dataFim
        ) {
          divDia.style.background = "#e8f5e9";
        }
        if (
          (calendarioPrecos.dataInicio &&
            dataAtual.getTime() === calendarioPrecos.dataInicio.getTime()) ||
          (calendarioPrecos.dataFim &&
            dataAtual.getTime() === calendarioPrecos.dataFim.getTime())
        ) {
          divDia.style.background = "#28a745";
          divDia.style.color = "#fff";
          divDia.style.fontWeight = "600";
        }
      } else if (
        calendarioPrecos.dataInicio &&
        dataAtual.getTime() === calendarioPrecos.dataInicio.getTime()
      ) {
        divDia.style.background = "#28a745";
        divDia.style.color = "#fff";
        divDia.style.fontWeight = "600";
      }

      divDia.addEventListener("click", function (e) {
        e.stopPropagation();
        if (calendarioPrecos.selecionandoInicio) {
          calendarioPrecos.dataInicio = dataAtual;
          calendarioPrecos.dataFim = null;
          calendarioPrecos.selecionandoInicio = false;
        } else {
          if (dataAtual < calendarioPrecos.dataInicio) {
            calendarioPrecos.dataFim = calendarioPrecos.dataInicio;
            calendarioPrecos.dataInicio = dataAtual;
          } else {
            calendarioPrecos.dataFim = dataAtual;
          }
          calendarioPrecos.selecionandoInicio = true;
        }
        // atualizar os inputs imediatamente para feedback
        try {
          const dataInicioInput = document.getElementById("dataInicioPrecos");
          const dataFimInput = document.getElementById("dataFimPrecos");
          if (calendarioPrecos.dataInicio && dataInicioInput)
            dataInicioInput.value = formatarData(calendarioPrecos.dataInicio);
          if (calendarioPrecos.dataFim && dataFimInput)
            dataFimInput.value = formatarData(calendarioPrecos.dataFim);
        } catch (err) {
          /* ignore */
        }
        gerarCalendarioPrecos();
      });

      divDia.addEventListener("mouseenter", function () {
        // only show hover background when this day is NOT selected
        const isSelected =
          (calendarioPrecos.dataInicio &&
            dataAtual.getTime() === calendarioPrecos.dataInicio.getTime()) ||
          (calendarioPrecos.dataFim &&
            dataAtual.getTime() === calendarioPrecos.dataFim.getTime()) ||
          (calendarioPrecos.dataInicio &&
            calendarioPrecos.dataFim &&
            dataAtual >= calendarioPrecos.dataInicio &&
            dataAtual <= calendarioPrecos.dataFim);
        if (!isSelected) divDia.style.background = "#f0f0f0";
      });
      divDia.addEventListener("mouseleave", function () {
        const isSelected =
          (calendarioPrecos.dataInicio &&
            dataAtual.getTime() === calendarioPrecos.dataInicio.getTime()) ||
          (calendarioPrecos.dataFim &&
            dataAtual.getTime() === calendarioPrecos.dataFim.getTime()) ||
          (calendarioPrecos.dataInicio &&
            calendarioPrecos.dataFim &&
            dataAtual >= calendarioPrecos.dataInicio &&
            dataAtual <= calendarioPrecos.dataFim);
        if (!isSelected) {
          divDia.style.background = "";
        }
      });

      daysGrid.appendChild(divDia);
    }

    container.appendChild(daysGrid);
  }

  buildMonth(container1, mes1, ano1);
  buildMonth(container2, mes2, ano2);

  const headerSpan = document.getElementById("mesAnoAtualPrecos");
  if (headerSpan)
    headerSpan.textContent = `${meses[mes1]} ${ano1} — ${meses[mes2]} ${ano2}`;
}

function aplicarDatasCalendarioPrecos() {
  if (calendarioPrecos.dataInicio) {
    const dataInicioInput = document.getElementById("dataInicioPrecos");
    const dataFimInput = document.getElementById("dataFimPrecos");

    dataInicioInput.value = formatarData(calendarioPrecos.dataInicio);
    dataFimInput.value = calendarioPrecos.dataFim
      ? formatarData(calendarioPrecos.dataFim)
      : formatarData(calendarioPrecos.dataInicio);

    fecharCalendarioPrecos();
  }
}

// ========== CALENDÁRIO VALIDADE ==========
function inicializarCalendarioValidade() {
  const periodoValidade = document.getElementById("periodoValidade");
  const calendarioPopup = document.getElementById("calendarioPopupValidade");

  if (periodoValidade && calendarioPopup) {
    periodoValidade.addEventListener("click", function (e) {
      e.stopPropagation();
      abrirCalendarioValidade(periodoValidade);
    });

    document
      .getElementById("btnMesAnteriorValidade")
      .addEventListener("click", function () {
        calendarioValidade.mes--;
        if (calendarioValidade.mes < 0) {
          calendarioValidade.mes = 11;
          calendarioValidade.ano--;
        }
        gerarCalendarioValidade();
      });

    document
      .getElementById("btnProximoMesValidade")
      .addEventListener("click", function () {
        calendarioValidade.mes++;
        if (calendarioValidade.mes > 11) {
          calendarioValidade.mes = 0;
          calendarioValidade.ano++;
        }
        gerarCalendarioValidade();
      });

    document
      .getElementById("btnCalendarioCancelarValidade")
      .addEventListener("click", cancelarCalendarioValidade);
    document
      .getElementById("btnCalendarioAplicarValidade")
      .addEventListener("click", aplicarDatasCalendarioValidade);
  }
}

function abrirCalendarioValidade(anchor) {
  const popup = document.getElementById("calendarioPopupValidade");
  popup.style.display = "block";
  // prepare data and render calendar first so popup has measured height
  calendarioValidade.mes = new Date().getMonth();
  calendarioValidade.ano = new Date().getFullYear();
  calendarioValidade.selecionandoInicio = true;
  gerarCalendarioValidade();

  // position popup above the anchor element if there's space, otherwise below
  if (anchor && anchor.getBoundingClientRect) {
    const rect = anchor.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
    const popupHeight = popup.offsetHeight || 260;
    const spaceAbove = rect.top;

    let left = rect.left + scrollLeft;
    const popupWidth = popup.offsetWidth || 420;
    if (left + popupWidth > window.innerWidth) {
      left = Math.max(8, window.innerWidth - popupWidth - 8);
    }

    if (spaceAbove > popupHeight + 12) {
      // place above
      let top = rect.top + scrollTop - popupHeight - 6;
      popup.style.top = top + "px";
      popup.style.left = left + "px";
    } else {
      // place below
      let top = rect.bottom + scrollTop + 6;
      popup.style.top = top + "px";
      popup.style.left = left + "px";
    }
  } else {
    popup.style.top = window.scrollY + 140 + "px";
    popup.style.left =
      window.innerWidth / 2 - (popup.offsetWidth || 210) + "px";
  }
}

function fecharCalendarioValidade() {
  const pop = document.getElementById("calendarioPopupValidade");
  if (pop) pop.style.display = "none";
}

function cancelarCalendarioValidade() {
  try {
    calendarioValidade.dataInicio = null;
    calendarioValidade.dataFim = null;
    calendarioValidade.selecionandoInicio = true;
    const inputInicio = document.getElementById("dataInicioValidade");
    const inputFim = document.getElementById("dataFimValidade");
    if (inputInicio) inputInicio.value = "";
    if (inputFim) inputFim.value = "";
    try {
      gerarCalendarioValidade();
    } catch (e) {}
  } catch (e) {
    console.debug("[cancelarCalendarioValidade] erro ao limpar", e);
  }
  fecharCalendarioValidade();
}

function gerarCalendarioValidade() {
  const meses = [
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

  const mes1 = calendarioValidade.mes;
  const ano1 = calendarioValidade.ano;
  let mes2 = mes1 + 1;
  let ano2 = ano1;
  if (mes2 > 11) {
    mes2 = 0;
    ano2 = ano1 + 1;
  }

  const container1 = document.getElementById("mesContainerValidade");
  const container2 = document.getElementById("mesContainerValidade2");
  container1.innerHTML = "";
  container2.innerHTML = "";

  function buildMonth(container, m, y) {
    const header = document.createElement("div");
    header.style.cssText =
      "display:flex; justify-content:center; align-items:center; font-weight:600; margin-bottom:8px;";
    header.textContent = `${meses[m]} ${y}`;
    container.appendChild(header);

    const weekdays = document.createElement("div");
    weekdays.style.cssText =
      "display:grid; grid-template-columns:repeat(7,1fr); gap:4px; margin-bottom:6px; text-align:center; font-weight:600; font-size:12px; color:#666;";
    ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].forEach((w) => {
      const d = document.createElement("div");
      d.textContent = w;
      weekdays.appendChild(d);
    });
    container.appendChild(weekdays);

    const daysGrid = document.createElement("div");
    daysGrid.style.cssText =
      "display:grid; grid-template-columns:repeat(7,1fr); gap:4px;";

    const primeiroDia = new Date(y, m, 1).getDay();
    const diasNoMes = new Date(y, m + 1, 0).getDate();

    for (let i = 0; i < primeiroDia; i++) {
      const divVazio = document.createElement("div");
      divVazio.style.cssText = "padding:6px; text-align:center; color:#ccc;";
      daysGrid.appendChild(divVazio);
    }

    for (let dia = 1; dia <= diasNoMes; dia++) {
      const divDia = document.createElement("div");
      divDia.textContent = dia;
      divDia.style.cssText =
        "padding:6px; text-align:center; cursor:pointer; border-radius:6px; transition:all 0.12s; font-size:13px;";
      const dataAtual = new Date(y, m, dia);

      if (calendarioValidade.dataInicio && calendarioValidade.dataFim) {
        if (
          dataAtual >= calendarioValidade.dataInicio &&
          dataAtual <= calendarioValidade.dataFim
        ) {
          divDia.style.background = "#e8f5e9";
        }
        if (
          (calendarioValidade.dataInicio &&
            dataAtual.getTime() === calendarioValidade.dataInicio.getTime()) ||
          (calendarioValidade.dataFim &&
            dataAtual.getTime() === calendarioValidade.dataFim.getTime())
        ) {
          divDia.style.background = "#28a745";
          divDia.style.color = "#fff";
          divDia.style.fontWeight = "600";
        }
      } else if (
        calendarioValidade.dataInicio &&
        dataAtual.getTime() === calendarioValidade.dataInicio.getTime()
      ) {
        divDia.style.background = "#28a745";
        divDia.style.color = "#fff";
        divDia.style.fontWeight = "600";
      }

      divDia.addEventListener("click", function (e) {
        e.stopPropagation();
        if (calendarioValidade.selecionandoInicio) {
          calendarioValidade.dataInicio = dataAtual;
          calendarioValidade.dataFim = null;
          calendarioValidade.selecionandoInicio = false;
        } else {
          if (dataAtual < calendarioValidade.dataInicio) {
            calendarioValidade.dataFim = calendarioValidade.dataInicio;
            calendarioValidade.dataInicio = dataAtual;
          } else {
            calendarioValidade.dataFim = dataAtual;
          }
          calendarioValidade.selecionandoInicio = true;
        }
        // atualizar os inputs imediatamente para feedback
        try {
          const dataInicioInput = document.getElementById("dataInicioValidade");
          const dataFimInput = document.getElementById("dataFimValidade");
          if (calendarioValidade.dataInicio && dataInicioInput)
            dataInicioInput.value = formatarData(calendarioValidade.dataInicio);
          if (calendarioValidade.dataFim && dataFimInput)
            dataFimInput.value = formatarData(calendarioValidade.dataFim);
        } catch (err) {
          /* ignore */
        }
        gerarCalendarioValidade();
      });

      divDia.addEventListener("mouseenter", function () {
        const isSelected =
          (calendarioValidade.dataInicio &&
            dataAtual.getTime() === calendarioValidade.dataInicio.getTime()) ||
          (calendarioValidade.dataFim &&
            dataAtual.getTime() === calendarioValidade.dataFim.getTime()) ||
          (calendarioValidade.dataInicio &&
            calendarioValidade.dataFim &&
            dataAtual >= calendarioValidade.dataInicio &&
            dataAtual <= calendarioValidade.dataFim);
        if (!isSelected) divDia.style.background = "#f0f0f0";
      });
      divDia.addEventListener("mouseleave", function () {
        const isSelected =
          (calendarioValidade.dataInicio &&
            dataAtual.getTime() === calendarioValidade.dataInicio.getTime()) ||
          (calendarioValidade.dataFim &&
            dataAtual.getTime() === calendarioValidade.dataFim.getTime()) ||
          (calendarioValidade.dataInicio &&
            calendarioValidade.dataFim &&
            dataAtual >= calendarioValidade.dataInicio &&
            dataAtual <= calendarioValidade.dataFim);
        if (!isSelected) {
          divDia.style.background = "";
        }
      });

      daysGrid.appendChild(divDia);
    }

    container.appendChild(daysGrid);
  }

  buildMonth(container1, mes1, ano1);
  buildMonth(container2, mes2, ano2);

  const headerSpan = document.getElementById("mesAnoAtualValidade");
  if (headerSpan)
    headerSpan.textContent = `${meses[mes1]} ${ano1} — ${meses[mes2]} ${ano2}`;
}

function aplicarDatasCalendarioValidade() {
  if (calendarioValidade.dataInicio) {
    const dataInicioInput = document.getElementById("dataInicioValidade");
    const dataFimInput = document.getElementById("dataFimValidade");

    dataInicioInput.value = formatarData(calendarioValidade.dataInicio);
    dataFimInput.value = calendarioValidade.dataFim
      ? formatarData(calendarioValidade.dataFim)
      : formatarData(calendarioValidade.dataInicio);

    fecharCalendarioValidade();
  }
}

// Função auxiliar para formatar data
function formatarData(data) {
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

// Inicializar calendários quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", function () {
  console.log("🗓️ Inicializando calendários dos filtros...");
  inicializarCalendarios();
});
