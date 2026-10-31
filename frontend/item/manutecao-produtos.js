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

// Abre dropdown do sistema para selecionar Fornecedor no filtro superior
async function abrirDropdownFornecedor(inputEl) {
  try {
    if (!inputEl) return;
    window.closeAllSelectDropdowns && window.closeAllSelectDropdowns(inputEl);

    const wrapper = document.createElement("div");
    wrapper.className = "select-wrapper";
    // Usar position: fixed com cálculo contínuo para manter alinhado
    wrapper.style.position = "fixed";
    wrapper.style.zIndex = 99999;
    wrapper.style.pointerEvents = "auto";

    // Calcular posição usando getBoundingClientRect (viewport coordinates)
    const rect = inputEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxWidth = 420;
    const maxHeight = 300;

    // Começar com posição ABAIXO do input
    let left = rect.left;
    let top = rect.bottom + 6;

    // Ajustar ESQUERDA se sair dos limites horizontais
    if (left + maxWidth > vw) {
      left = vw - maxWidth - 8;
      if (left < 0) left = 8;
    }

    // Ajustar ALTURA se sair dos limites verticais: abrir ACIMA ao invés
    if (top + maxHeight > vh) {
      top = rect.top - maxHeight - 6;
      if (top < 0) top = 8;
    }

    wrapper.style.left = left + "px";
    wrapper.style.top = top + "px";
    wrapper.style.minWidth = Math.max(200, rect.width) + "px";

    // Função para recalcular posição no caso de scroll
    function updatePosition() {
      try {
        const currentRect = inputEl.getBoundingClientRect();
        const currentVw = window.innerWidth;
        const currentVh = window.innerHeight;

        let newLeft = currentRect.left;
        let newTop = currentRect.bottom + 6;

        // Ajustar ESQUERDA
        if (newLeft + maxWidth > currentVw) {
          newLeft = currentVw - maxWidth - 8;
          if (newLeft < 0) newLeft = 8;
        }

        // Ajustar ALTURA: abrir ACIMA se necessário
        if (newTop + maxHeight > currentVh) {
          newTop = currentRect.top - maxHeight - 6;
          if (newTop < 0) newTop = 8;
        }

        wrapper.style.left = newLeft + "px";
        wrapper.style.top = newTop + "px";
      } catch (e) {
        /* silent */
      }
    }

    // Adicionar listeners para scroll e resize
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    // Helper para fechar o dropdown
    function closeWrapper() {
      try {
        window.removeEventListener("scroll", updatePosition, true);
      } catch (e) {}
      try {
        window.removeEventListener("resize", updatePosition);
      } catch (e) {}
      try {
        if (wrapper.parentElement) wrapper.parentElement.removeChild(wrapper);
      } catch (e) {}
    }

    const dropdown = document.createElement("div");
    dropdown.className = "select-dropdown";
    dropdown.style.background = "#fff";
    dropdown.style.border = "1px solid #ddd";
    dropdown.style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)";
    dropdown.style.borderRadius = "6px";
    dropdown.style.padding = "6px";
    dropdown.style.maxHeight = maxHeight + "px";
    dropdown.style.overflow = "auto";

    const title = document.createElement("div");
    title.textContent = "Selecionar Fornecedor";
    title.style.fontWeight = "600";
    title.style.padding = "6px 8px";
    title.style.borderBottom = "1px solid #eee";
    dropdown.appendChild(title);

    const searchBox = document.createElement("input");
    searchBox.type = "search";
    searchBox.placeholder = "Pesquisar fornecedor...";
    searchBox.style.width = "100%";
    searchBox.style.padding = "8px";
    searchBox.style.margin = "6px 0";
    searchBox.style.border = "1px solid #e6e9eb";
    searchBox.style.borderRadius = "6px";
    dropdown.appendChild(searchBox);

    const list = document.createElement("div");
    list.style.padding = "6px 4px";
    dropdown.appendChild(list);

    const footer = document.createElement("div");
    footer.style.padding = "6px 8px";
    footer.style.borderTop = "1px solid #eee";
    footer.style.display = "flex";
    footer.style.justifyContent = "flex-end";

    const btnFechar = document.createElement("button");
    btnFechar.textContent = "Fechar";
    btnFechar.style.padding = "6px 10px";
    btnFechar.style.borderRadius = "6px";
    btnFechar.style.border = "1px solid #c82333";
    btnFechar.style.background = "#dc3545";
    btnFechar.style.color = "#fff";
    btnFechar.style.cursor = "pointer";
    footer.appendChild(btnFechar);

    dropdown.appendChild(footer);
    wrapper.appendChild(dropdown);
    document.body.appendChild(wrapper);

    // Helper para fechar o dropdown
    function closeWrapper() {
      try {
        window.removeEventListener("scroll", updatePosition, true);
      } catch (e) {}
      try {
        window.removeEventListener("resize", updatePosition);
      } catch (e) {}
      try {
        if (wrapper.parentElement) wrapper.parentElement.removeChild(wrapper);
      } catch (e) {}
    }

    let fornecedores = [];
    try {
      fornecedores = await ApiClient.getFornecedores();
    } catch (e) {
      console.warn("[manutecao-produtos] falha ao buscar fornecedores:", e);
      fornecedores = [];
    }

    function renderList(arr) {
      list.innerHTML = "";
      if (!Array.isArray(arr) || arr.length === 0) {
        const empty = document.createElement("div");
        empty.textContent = "Nenhum fornecedor encontrado";
        empty.style.padding = "6px 8px";
        empty.style.color = "#666";
        list.appendChild(empty);
        return;
      }
      arr.forEach((f) => {
        const el = document.createElement("div");
        el.style.padding = "8px 10px";
        el.style.cursor = "pointer";
        el.style.borderRadius = "4px";
        el.textContent = f.nome || f.name || f.razaoSocial || f.codigo || "";
        el.title = el.textContent;
        el.addEventListener(
          "mouseenter",
          () => (el.style.background = "#f1f5fb"),
        );
        el.addEventListener(
          "mouseleave",
          () => (el.style.background = "transparent"),
        );
        el.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          inputEl.value = el.textContent;
          if (f.id) inputEl.dataset.fornecedorId = f.id;
          closeWrapper();
        });
        list.appendChild(el);
      });
    }

    renderList(fornecedores);

    searchBox.addEventListener("input", function () {
      const v = (this.value || "").trim().toLowerCase();
      if (!v) return renderList(fornecedores);
      const filtered = fornecedores.filter(
        (f) =>
          (f.nome || "").toString().toLowerCase().indexOf(v) !== -1 ||
          (f.razaoSocial || "").toString().toLowerCase().indexOf(v) !== -1,
      );
      renderList(filtered);
    });

    btnFechar.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      closeWrapper();
    });
  } catch (err) {
    console.error("[manutecao-produtos] abrirDropdownFornecedor falhou:", err);
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
  // No-op: evitar persistência em localStorage conforme requisito de segurança
  try {
    /* intentionally do nothing */
  } catch (e) {}
}

function obterEstadoSubmenu(submenuId) {
  // Não usar localStorage => sempre retornar false (submenus começam fechados)
  try {
    return false;
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
// Substituir limparEstadoSubmenus para não tocar no localStorage
function limparEstadoSubmenus() {
  try {
    /* no-op: não remover nada do localStorage */
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
// FUNCIONALIDADES DA PÁGINA DE MANUTENÇÃO DE PRODUTOS
// ========================================

// Dados de produtos (vazio inicialmente, como na imagem)
let produtosData = [];

let currentPage = 1;
let itemsPerPage = 50;
let filtros = {
  produto: "",
  fornecedor: "",
  agrupamento: "",
  categoria: "",
  centroResultado: "",
  marca: "",
  perfilComissao: "",
};
let filteredData = [...produtosData];

function inicializarManutencaoProdutos() {
  console.log("🛠️ Inicializando página de Manutenção de Produtos");

  // Configurar event listeners
  configurarEventListenersManutencao();

  // Renderizar tabela
  renderizarTabelaProdutos();

  // Atualizar paginação
  atualizarPaginacaoManutencao();

  console.log("✅ Página de Manutenção de Produtos inicializada");
}

function configurarEventListenersManutencao() {
  const btnMaisOpcoes = document.getElementById("btnMaisOpcoes");
  const btnFiltrar = document.getElementById("btnFiltrar");
  const btnPesquisar = document.getElementById("btnPesquisar");
  const linkColunas = document.getElementById("linkColunas");
  const filtroProduto = document.getElementById("filtroProduto");
  const filtroFornecedor = document.getElementById("filtroFornecedor");
  const filtroAgrupamento = document.getElementById("filtroAgrupamento");
  const btnPrevPage = document.getElementById("btnPrevPage");
  const btnNextPage = document.getElementById("btnNextPage");

  if (btnMaisOpcoes) {
    btnMaisOpcoes.addEventListener("click", () => {
      alert("Mais opções de filtro serão implementadas em breve!");
    });
  }

  if (btnFiltrar) {
    btnFiltrar.addEventListener("click", () => {
      alert("Filtros avançados serão implementados em breve!");
    });
  }

  if (btnPesquisar) {
    btnPesquisar.addEventListener("click", realizarPesquisaProdutos);
  }

  if (linkColunas) {
    linkColunas.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const dropdown = document.getElementById("colunasDropdown");
      if (dropdown) dropdown.classList.toggle("aberto");
    });
    // Fechar ao clicar fora
    document.addEventListener("click", (e) => {
      const dropdown = document.getElementById("colunasDropdown");
      const colunasDiv = document.querySelector(".colunas-selecionadas");
      if (dropdown && colunasDiv && !colunasDiv.contains(e.target)) {
        dropdown.classList.remove("aberto");
      }
    });
    // Configurar checkboxes do dropdown
    document
      .querySelectorAll('.colunas-checkbox-item input[type="checkbox"]')
      .forEach((cb) => {
        cb.addEventListener("change", () => {
          // Exclusividade m\u00fatua entre col-servico e col-produto
          if (cb.id === "col-servico" && cb.checked) {
            const cbProd = document.getElementById("col-produto");
            if (cbProd) cbProd.checked = false;
          } else if (cb.id === "col-produto" && cb.checked) {
            const cbServ = document.getElementById("col-servico");
            if (cbServ) cbServ.checked = false;
          }
          atualizarCabecalhosExtras();
          // Se alterou o filtro de tipo, refaz a pesquisa via API
          if (cb.id === "col-servico" || cb.id === "col-produto") {
            realizarPesquisaProdutos();
          } else {
            filteredData = produtosData.slice();
            currentPage = 1;
            renderizarTabelaProdutos();
            atualizarPaginacaoManutencao();
          }
        });
      });
  }

  // Enter nos campos de filtro
  [filtroProduto, filtroFornecedor, filtroAgrupamento].forEach((input) => {
    if (input) {
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          realizarPesquisaProdutos();
        }
      });
      // abrir dropdown de fornecedor ao clicar no campo
      try {
        if (input.id === "filtroFornecedor") {
          input.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            abrirDropdownFornecedor(input);
          });
          input.addEventListener("focus", function (e) {
            abrirDropdownFornecedor(input);
          });
        }
        // abrir dropdown de agrupamento ao clicar no campo de filtro
        if (input.id === "filtroAgrupamento") {
          input.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            abrirDropdownAgrupamentoFiltro(input);
          });
          input.addEventListener("focus", function (e) {
            abrirDropdownAgrupamentoFiltro(input);
          });
        }
      } catch (e) {
        console.debug("erro ao ligar dropdown fornecedor", e);
      }
    }
  });

  if (btnPrevPage) {
    btnPrevPage.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderizarTabelaProdutos();
        atualizarPaginacaoManutencao();
      }
    });
  }

  if (btnNextPage) {
    btnNextPage.addEventListener("click", () => {
      const totalPages = Math.ceil(filteredData.length / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderizarTabelaProdutos();
        atualizarPaginacaoManutencao();
      }
    });
  }

  // Delegação de evento para botões ⋮ das colunas
  const tabelaContainer = document.querySelector(".produtos-table-container");
  if (tabelaContainer) {
    tabelaContainer.addEventListener("click", function (e) {
      const btn = e.target.closest(".btn-column-menu");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      abrirDropdownColunaMenu(btn);
    });
  }

  console.log("✅ Event listeners configurados");
}

function realizarPesquisaProdutos() {
  const filtroProduto = document.getElementById("filtroProduto");
  const filtroFornecedor = document.getElementById("filtroFornecedor");
  const filtroAgrupamento = document.getElementById("filtroAgrupamento");

  filtros.produto = filtroProduto
    ? filtroProduto.value.trim().toLowerCase()
    : "";
  filtros.fornecedor = filtroFornecedor
    ? filtroFornecedor.value.trim().toLowerCase()
    : "";
  // também capturar id do fornecedor selecionado (se setado pelo dropdown)
  filtros.fornecedorId =
    filtroFornecedor &&
    filtroFornecedor.dataset &&
    filtroFornecedor.dataset.fornecedorId
      ? String(filtroFornecedor.dataset.fornecedorId)
      : "";
  filtros.agrupamento = filtroAgrupamento
    ? filtroAgrupamento.value.trim().toLowerCase()
    : "";

  // Logs de debug para inspecionar filtros antes da chamada API
  try {
    console.log(
      "[manutecao-produtos] filtros iniciais:",
      JSON.stringify(filtros),
    );
    console.log(
      "[manutecao-produtos] filtros.fornecedorId:",
      filtros.fornecedorId,
    );
  } catch (e) {
    console.debug("[manutecao-produtos] erro log filtros", e);
  }

  currentPage = 1;

  // Limpar filtros extras ao pesquisar (serão reaplicados depois do load)
  filtros.categoria = "";
  filtros.centroResultado = "";
  filtros.marca = "";
  filtros.perfilComissao = "";

  // Chamar API para obter produtos correspondentes (não persistir nada localmente)
  (async function () {
    try {
      const q = filtros.produto || "";
      const params = {};
      if (q) params.q = q;
      if (filtros.agrupamento) params.agrupamento = filtros.agrupamento;
      // enviando filtro de fornecedor para o backend (preferir id quando disponível)
      if (filtros.fornecedorId) params.fornecedorId = filtros.fornecedorId;
      else if (filtros.fornecedor) params.fornecedor = filtros.fornecedor;
      // manter comportamento padrão de excluir medicamentos
      params.excludeAgrupamento = "MEDICAMENTOS";
      // filtro por tipo (Serviço / Produto) via checkbox
      const cbServico = document.getElementById("col-servico");
      const cbProduto = document.getElementById("col-produto");
      if (cbServico && cbServico.checked) params.tipo = "servico";
      else if (cbProduto && cbProduto.checked) params.tipo = "produto";

      // ApiClient está disponível globalmente (veja api-client.js)
      let resp = await ApiClient.getProdutos(params);
      // Se pedimos por fornecedorId e não veio nada, tentar fallback server-side por nome do fornecedor
      try {
        if (
          params.fornecedorId &&
          Array.isArray(resp) &&
          resp.length === 0 &&
          filtros.fornecedor
        ) {
          console.log(
            "[manutecao-produtos] fallback: nenhum item retornado por fornecedorId, tentando por nome do fornecedor",
          );
          const paramsFallback = Object.assign({}, params);
          delete paramsFallback.fornecedorId;
          paramsFallback.fornecedor = filtros.fornecedor;
          resp = await ApiClient.getProdutos(paramsFallback);
          console.log(
            "[manutecao-produtos] fallback resposta (por fornecedor):",
            Array.isArray(resp) ? resp.length : resp,
          );
        }
      } catch (e) {
        console.debug(
          "[manutecao-produtos] erro no fallback por fornecedor",
          e,
        );
      }
      // Log da resposta da API para depuração
      try {
        console.log(
          "[manutecao-produtos] API /itens resposta (array):",
          Array.isArray(resp) ? resp.length : "não é array",
        );
        console.log(
          "[manutecao-produtos] amostra da resposta:",
          Array.isArray(resp) && resp.length > 0 ? resp.slice(0, 3) : resp,
        );
      } catch (e) {
        console.debug("[manutecao-produtos] erro ao logar resposta API", e);
      }
      if (!Array.isArray(resp)) {
        console.warn("[manutecao-produtos] resposta da API inesperada", resp);
        produtosData = [];
      } else {
        // Mapear campos do backend para os campos esperados pela tabela
        produtosData = resp.map((item) => {
          const fornecedor =
            item.fornecedores &&
            Array.isArray(item.fornecedores) &&
            item.fornecedores.length > 0
              ? typeof item.fornecedores[0] === "string"
                ? item.fornecedores[0]
                : item.fornecedores[0].nome || ""
              : item.fornecedor || "";
          // tentar obter id do fornecedor (quando disponível como objeto no backend)
          let fornecedorId = null;
          try {
            if (
              item.fornecedores &&
              Array.isArray(item.fornecedores) &&
              item.fornecedores.length > 0 &&
              typeof item.fornecedores[0] === "object" &&
              item.fornecedores[0].id
            ) {
              fornecedorId = String(item.fornecedores[0].id);
            } else if (item.fornecedorId || item.fornecedor_id) {
              fornecedorId = String(item.fornecedorId || item.fornecedor_id);
            }
          } catch (e) {
            fornecedorId = null;
          }
          return {
            backendId: item.id || item.codigo || "",
            codigo: item.codigo || item.id || "",
            descricao: item.nome || item.descricao || "",
            custo:
              item.custoBase !== undefined && item.custoBase !== null
                ? Number(item.custoBase)
                : item.custo || null,
            venda:
              item.preco !== undefined && item.preco !== null
                ? Number(item.preco)
                : item.venda || null,
            agrupamento: item.agrupamento || "",
            fornecedor: fornecedor,
            fornecedorId: fornecedorId,
            _raw: item,
          };
        });
        try {
          console.log(
            "[manutecao-produtos] produtosData após mapeamento:",
            produtosData.length,
          );
        } catch (e) {}
      }
      // O backend já aplica filtro por fornecedor quando informado. Usar os dados retornados.
      filteredData = produtosData.slice();

      // Atualizar cabeçalhos extras e re-renderizar
      atualizarCabecalhosExtras();
      filteredData = produtosData.slice();
      currentPage = 1;
      renderizarTabelaProdutos();
      atualizarPaginacaoManutencao();

      console.log(
        `🔍 Pesquisa realizada (API) - ${filteredData.length} produtos encontrados`,
      );
    } catch (e) {
      console.error("[manutecao-produtos] erro ao buscar produtos via API:", e);
      // Fallback local (vazio): manter comportamento anterior
      filteredData = produtosData.filter((produto) => {
        const matchProduto =
          !filtros.produto ||
          (produto.descricao &&
            produto.descricao.toLowerCase().includes(filtros.produto)) ||
          (produto.codigo &&
            produto.codigo.toString().includes(filtros.produto));
        const matchFornecedor =
          !filtros.fornecedor ||
          (produto.fornecedor &&
            produto.fornecedor.toLowerCase().includes(filtros.fornecedor));
        const matchAgrupamento =
          !filtros.agrupamento ||
          (produto.agrupamento &&
            produto.agrupamento.toLowerCase().includes(filtros.agrupamento));
        return matchProduto && matchFornecedor && matchAgrupamento;
      });

      currentPage = 1;
      renderizarTabelaProdutos();
      atualizarPaginacaoManutencao();
    }
  })();
}

// Retorna o valor de um campo extra do produto a partir de _raw
function getExtraField(produto, campo) {
  const raw = produto._raw || {};
  switch (campo) {
    case "categoria":
      return (raw.categoria || raw.grupo || raw.tipoItem || "")
        .toString()
        .trim();
    case "centroResultado":
      return (
        raw.centroResultado ||
        raw.centro_resultado ||
        raw.centroDeResultado ||
        ""
      )
        .toString()
        .trim();
    case "marca":
      return (raw.marca || "").toString().trim();
    case "perfilComissao":
      return (raw.perfilComissao || raw.comissao || raw.perfil_comissao || "")
        .toString()
        .trim();
    case "tipo":
      return (raw.tipo || "").toString().trim();
    default:
      return "";
  }
}

// Mapa de metadados dos filtros extras
const FILTROS_EXTRAS_META = [
  { id: "col-categoria", filtro: "categoria", label: "Categoria" },
  { id: "col-centro", filtro: "centroResultado", label: "Centro de Resultado" },
  { id: "col-marca", filtro: "marca", label: "Marca" },
  { id: "col-comissao", filtro: "perfilComissao", label: "Perfil de Comissão" },
  { id: "col-servico", filtro: "tipo", label: "Tipo", tipoValor: "servico" },
  { id: "col-produto", filtro: "tipo", label: "Tipo", tipoValor: "produto" },
];

// Atualiza cabeçalhos extras no <thead> conforme checkboxes marcados
function atualizarCabecalhosExtras() {
  const theadRow = document.querySelector(".produtos-table thead tr");
  if (!theadRow) return;

  // Remover <th> extras já existentes
  theadRow
    .querySelectorAll("th[data-coluna-extra]")
    .forEach((th) => th.remove());

  // Referência ao último <th> (Ações) para inserir antes dele
  const thAcoes = theadRow.querySelector("th:last-child");

  FILTROS_EXTRAS_META.forEach((meta) => {
    const cb = document.getElementById(meta.id);
    if (cb && cb.checked) {
      // N\u00e3o adicionar coluna "Tipo" duas vezes (col-servico e col-produto mapeiam para o mesmo campo)
      if (
        meta.filtro === "tipo" &&
        theadRow.querySelector('th[data-coluna-extra="tipo"]')
      )
        return;
      const th = document.createElement("th");
      th.dataset.colunaExtra = meta.filtro;
      th.dataset.coluna = meta.filtro;
      th.innerHTML = `${meta.label} <button class="btn-column-menu"><i class="fas fa-ellipsis-v"></i></button>`;
      theadRow.insertBefore(th, thAcoes);
    }
  });
}

// Config de cada coluna para alteração em massa
const COLUNAS_MASSA_CONFIG = {
  descricao: { label: "Descrição", apiField: "nome", tipo: "text" },
  custo: { label: "Custo", apiField: "custoBase", tipo: "numero" },
  venda: { label: "Venda", apiField: "preco", tipo: "numero" },
  agrupamento: {
    label: "Agrupamento",
    apiField: "agrupamento",
    tipo: "agrupamentos",
  },
  categoria: {
    label: "Categoria",
    apiField: "categoria",
    tipo: "lista-categoria",
  },
  centroResultado: {
    label: "Centro de Resultado",
    apiField: "centroResultado",
    tipo: "lista-centros",
  },
  marca: { label: "Marca", apiField: "marca", tipo: "lista-marcas" },
  perfilComissao: {
    label: "Perfil de Comiss\u00e3o",
    apiField: "perfilComissao",
    tipo: "lista-comissao",
  },
  tipo: { label: "Tipo", apiField: "tipo", tipo: "lista-tipo" },
};

// Abre mini-dropdown logo abaixo do bot\u00e3o \u22ee da coluna
function abrirDropdownColunaMenu(btnEl) {
  document.querySelectorAll(".coluna-menu-dropdown").forEach((d) => d.remove());

  const th = btnEl.closest("th");
  if (!th) return;
  const coluna = th.dataset.coluna;
  if (!coluna || !COLUNAS_MASSA_CONFIG[coluna]) return;

  const rect = btnEl.getBoundingClientRect();
  const dropdown = document.createElement("div");
  dropdown.className = "coluna-menu-dropdown";
  dropdown.style.cssText =
    "position:fixed;top:" +
    (rect.bottom + 4) +
    "px;left:" +
    Math.max(4, rect.right - 170) +
    "px;background:#fff;border:1px solid #e0e0e0;border-radius:8px;" +
    "box-shadow:0 4px 16px rgba(0,0,0,0.13);z-index:99998;min-width:170px;overflow:hidden;";

  const item = document.createElement("div");
  item.style.cssText =
    "padding:11px 16px;cursor:pointer;font-size:13px;color:#333;" +
    "display:flex;align-items:center;gap:8px;";
  item.innerHTML =
    "<i class='fas fa-layer-group' style='color:#71B27F;'></i> Alterar em Massa";
  item.addEventListener("mouseenter", () => {
    item.style.background = "#f5f9f6";
  });
  item.addEventListener("mouseleave", () => {
    item.style.background = "transparent";
  });
  item.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.remove();
    abrirModalAlteracaoEmMassa(coluna);
  });

  dropdown.appendChild(item);
  document.body.appendChild(dropdown);

  setTimeout(() => {
    document.addEventListener("click", function _close() {
      dropdown.remove();
      document.removeEventListener("click", _close);
    });
  }, 0);
}

// Modal de alteração em massa
async function abrirModalAlteracaoEmMassa(coluna) {
  const cfg = COLUNAS_MASSA_CONFIG[coluna];
  if (!cfg) return;

  const existing = document.getElementById("modal-massa-alterar");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "modal-massa-alterar";
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:99999;" +
    "display:flex;align-items:center;justify-content:center;";

  const modal = document.createElement("div");
  modal.style.cssText =
    "background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.2);" +
    "min-width:380px;max-width:480px;width:90%;display:flex;flex-direction:column;overflow:hidden;";

  // Header
  const header = document.createElement("div");
  header.style.cssText =
    "padding:16px 20px 14px;border-bottom:1px solid #f0f0f0;" +
    "display:flex;align-items:center;justify-content:space-between;";
  const titleEl = document.createElement("span");
  titleEl.innerHTML = "<strong>Alterar em Massa</strong> &mdash; " + cfg.label;
  titleEl.style.cssText = "font-size:15px;color:#333;";
  const closeX = document.createElement("button");
  closeX.innerHTML = "&times;";
  closeX.style.cssText =
    "background:none;border:none;font-size:22px;cursor:pointer;color:#999;line-height:1;padding:0 4px;";
  header.appendChild(titleEl);
  header.appendChild(closeX);
  modal.appendChild(header);

  const info = document.createElement("div");
  info.style.cssText =
    "padding:9px 20px;font-size:12px;color:#888;background:#fafafa;border-bottom:1px solid #f0f0f0;";
  info.textContent =
    filteredData.length + " produto(s) filtrado(s) ser\u00e3o alterados";
  modal.appendChild(info);

  const body = document.createElement("div");
  body.style.cssText = "padding:18px 20px;";
  const lbl = document.createElement("label");
  lbl.textContent = 'Novo valor para "' + cfg.label + '":';
  lbl.style.cssText =
    "font-size:13px;color:#555;font-weight:500;display:block;margin-bottom:10px;";
  body.appendChild(lbl);
  modal.appendChild(body);

  let inputEl = null;

  if (cfg.tipo === "text") {
    inputEl = document.createElement("input");
    inputEl.type = "text";
    inputEl.placeholder = "Novo valor...";
    inputEl.style.cssText =
      "width:100%;padding:9px 12px;border:1px solid #e0e0e0;border-radius:6px;font-size:14px;box-sizing:border-box;";
    body.appendChild(inputEl);
  } else if (cfg.tipo === "numero") {
    inputEl = document.createElement("input");
    inputEl.type = "number";
    inputEl.step = "0.01";
    inputEl.min = "0";
    inputEl.placeholder = "0,00";
    inputEl.style.cssText =
      "width:100%;padding:9px 12px;border:1px solid #e0e0e0;border-radius:6px;font-size:14px;box-sizing:border-box;";
    body.appendChild(inputEl);
  } else {
    const loading = document.createElement("div");
    loading.textContent = "Carregando op\u00e7\u00f5es...";
    loading.style.cssText = "font-size:13px;color:#aaa;margin-bottom:6px;";
    body.appendChild(loading);

    inputEl = document.createElement("select");
    inputEl.style.cssText =
      "width:100%;padding:9px 12px;border:1px solid #e0e0e0;border-radius:6px;" +
      "font-size:14px;box-sizing:border-box;background:#fafafa;display:none;";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "(Manter / sem valor)";
    inputEl.appendChild(opt0);
    body.appendChild(inputEl);

    (async () => {
      try {
        let opcoes = [];
        if (cfg.tipo === "agrupamentos") {
          const ag = await ApiClient.getAgrupamentos();
          opcoes = (Array.isArray(ag) ? ag : []).flatMap((a) => {
            const base = [
              {
                label: a.nome || a.name || "",
                value: a.nome || a.name || "",
              },
            ];
            if (Array.isArray(a.subgrupos)) {
              a.subgrupos.forEach((s) =>
                base.push({
                  label: (a.nome || "") + " / " + (s.nome || s),
                  value: s.nome || s,
                }),
              );
            }
            return base;
          });
        } else if (cfg.tipo === "lista-categoria") {
          opcoes = [
            ...new Set(
              produtosData
                .map((p) => getExtraField(p, "categoria"))
                .filter((v) => v),
            ),
          ]
            .sort()
            .map((v) => ({ label: v, value: v }));
        } else if (cfg.tipo === "lista-centros") {
          const centros = await ApiClient.request("/centros");
          opcoes = (Array.isArray(centros) ? centros : []).map((c) => ({
            label: c.descricao || c.display || String(c),
            value: c.descricao || c.display || String(c),
          }));
        } else if (cfg.tipo === "lista-marcas") {
          const marcas = await ApiClient.request("/marcas");
          opcoes = (Array.isArray(marcas) ? marcas : []).map((m) => ({
            label: typeof m === "string" ? m : m.nome || String(m),
            value: typeof m === "string" ? m : m.nome || String(m),
          }));
        } else if (cfg.tipo === "lista-comissao") {
          const perfis = await ApiClient.request(
            "/perfis-comissao?tipo=produto",
          );
          opcoes = (Array.isArray(perfis) ? perfis : []).map((p) => ({
            label: p.perfilVendedor || p.descricao || String(p),
            value: p.perfilVendedor || p.descricao || String(p),
          }));
        } else if (cfg.tipo === "lista-tipo") {
          opcoes = [
            { label: "Produto", value: "produto" },
            { label: "Serviço", value: "servico" },
          ];
        }
        opcoes.forEach((op) => {
          const opt = document.createElement("option");
          opt.value = op.value;
          opt.textContent = op.label;
          inputEl.appendChild(opt);
        });
        loading.remove();
        inputEl.style.display = "";
      } catch (e) {
        loading.textContent = "Erro ao carregar op\u00e7\u00f5es";
        console.warn("[modal-massa] erro:", e);
      }
    })();
  }

  const footer = document.createElement("div");
  footer.style.cssText =
    "padding:14px 20px;border-top:1px solid #f0f0f0;display:flex;gap:10px;justify-content:flex-end;";
  const btnCancelar = document.createElement("button");
  btnCancelar.textContent = "Fechar";
  btnCancelar.style.cssText =
    "padding:9px 20px;border-radius:6px;border:1px solid #c82333;background:#dc3545;color:#fff;cursor:pointer;font-size:13px;";
  const btnAplicar = document.createElement("button");
  btnAplicar.innerHTML =
    "<i class='fas fa-check' style='margin-right:6px;'></i>Aplicar e Alterar em Massa";
  btnAplicar.style.cssText =
    "padding:9px 20px;border-radius:6px;border:1px solid #28a745;background:#28a745;" +
    "color:#fff;cursor:pointer;font-size:13px;font-weight:600;";
  footer.appendChild(btnCancelar);
  footer.appendChild(btnAplicar);
  modal.appendChild(footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  function closeModal() {
    overlay.remove();
  }
  closeX.addEventListener("click", closeModal);
  btnCancelar.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  btnAplicar.addEventListener("click", async () => {
    let valorFinal = inputEl ? inputEl.value.trim() : "";

    if (cfg.tipo === "numero") {
      const n = parseFloat(String(valorFinal).replace(",", "."));
      if (isNaN(n)) {
        window.showToast && window.showToast("Valor inv\u00e1lido", "warning");
        return;
      }
      valorFinal = n;
    }

    const total = filteredData.length;
    if (total === 0) {
      window.showToast &&
        window.showToast("Nenhum produto filtrado", "warning");
      return;
    }

    btnAplicar.disabled = true;
    btnCancelar.disabled = true;
    info.textContent = "Processando...";

    let ok = 0,
      erros = 0;
    for (let i = 0; i < filteredData.length; i++) {
      const p = filteredData[i];
      const id = p.backendId;
      if (!id) {
        erros++;
        continue;
      }
      try {
        await ApiClient.atualizarProduto(String(id), {
          [cfg.apiField]: valorFinal,
        });
        if (!p._raw) p._raw = {};
        p._raw[coluna] = String(valorFinal);
        if (cfg.apiField === "nome") p.descricao = String(valorFinal);
        if (cfg.apiField === "custoBase") p.custo = Number(valorFinal);
        if (cfg.apiField === "preco") p.venda = Number(valorFinal);
        if (cfg.apiField === "agrupamento") p.agrupamento = String(valorFinal);
        ok++;
      } catch (e) {
        erros++;
        console.error("[massa] erro ao atualizar produto", id, e);
      }
      btnAplicar.textContent =
        "Salvando " + (ok + erros) + " / " + total + "...";
    }

    renderizarTabelaProdutos();
    atualizarPaginacaoManutencao();
    const msg =
      erros === 0
        ? ok + " produto(s) alterado(s) com sucesso!"
        : ok + " alterado(s), " + erros + " erro(s)";
    window.showToast &&
      window.showToast(msg, erros === 0 ? "success" : "warning");
    closeModal();
  });
}

// Abre modal centralizado para selecionar valor de um campo extra
async function abrirModalExtraColuna(tdElement, produto, campo, titulo) {
  // Remover modal anterior se existir
  const existing = document.getElementById("modal-extra-coluna");
  if (existing) existing.remove();

  // Overlay
  const overlay = document.createElement("div");
  overlay.id = "modal-extra-coluna";
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:99999;" +
    "display:flex;align-items:center;justify-content:center;";

  // Modal
  const modal = document.createElement("div");
  modal.style.cssText =
    "background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.2);" +
    "min-width:360px;max-width:460px;width:90%;max-height:78vh;" +
    "display:flex;flex-direction:column;overflow:hidden;";

  // Header
  const header = document.createElement("div");
  header.style.cssText =
    "padding:16px 20px 14px;border-bottom:1px solid #f0f0f0;" +
    "display:flex;align-items:center;justify-content:space-between;";
  const titleEl = document.createElement("span");
  titleEl.textContent = "Selecionar " + titulo;
  titleEl.style.cssText = "font-weight:600;font-size:15px;color:#333;";
  const closeX = document.createElement("button");
  closeX.innerHTML = "&times;";
  closeX.style.cssText =
    "background:none;border:none;font-size:22px;cursor:pointer;color:#999;line-height:1;padding:0 4px;";
  header.appendChild(titleEl);
  header.appendChild(closeX);
  modal.appendChild(header);

  // Lista de opções
  const list = document.createElement("div");
  list.style.cssText = "overflow-y:auto;flex:1;padding:6px 0;";
  const loadingEl = document.createElement("div");
  loadingEl.textContent = "Carregando...";
  loadingEl.style.cssText = "padding:14px 20px;color:#999;font-size:13px;";
  list.appendChild(loadingEl);
  modal.appendChild(list);

  // Footer
  const footer = document.createElement("div");
  footer.style.cssText =
    "padding:12px 20px;border-top:1px solid #f0f0f0;display:flex;justify-content:flex-end;";
  const btnFechar = document.createElement("button");
  btnFechar.textContent = "Fechar";
  btnFechar.style.cssText =
    "padding:8px 22px;border-radius:6px;border:1px solid #c82333;" +
    "background:#dc3545;color:#fff;cursor:pointer;font-size:13px;";
  footer.appendChild(btnFechar);
  modal.appendChild(footer);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  function closeModal() {
    overlay.remove();
  }
  closeX.addEventListener("click", closeModal);
  btnFechar.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  // Buscar opções da API
  let opcoes = [];
  try {
    if (campo === "categoria") {
      // Sem endpoint dedicado — usar valores únicos dos produtos carregados
      opcoes = [
        ...new Set(
          produtosData
            .map((p) => getExtraField(p, "categoria"))
            .filter((v) => v),
        ),
      ]
        .sort()
        .map((v) => ({ label: v, value: v }));
    } else if (campo === "centroResultado") {
      const centros = await ApiClient.request("/centros");
      opcoes = (Array.isArray(centros) ? centros : []).map((c) => ({
        label: c.descricao || c.display || String(c),
        value: c.descricao || c.display || String(c),
      }));
    } else if (campo === "marca") {
      const marcas = await ApiClient.request("/marcas");
      opcoes = (Array.isArray(marcas) ? marcas : []).map((m) => ({
        label: typeof m === "string" ? m : m.nome || String(m),
        value: typeof m === "string" ? m : m.nome || String(m),
      }));
    } else if (campo === "perfilComissao") {
      const perfis = await ApiClient.request("/perfis-comissao?tipo=produto");
      opcoes = (Array.isArray(perfis) ? perfis : []).map((p) => ({
        label: p.perfilVendedor || p.descricao || String(p),
        value: p.perfilVendedor || p.descricao || String(p),
      }));
    } else if (campo === "tipo") {
      opcoes = [
        { label: "Produto", value: "produto" },
        { label: "Serviço", value: "servico" },
      ];
    }
  } catch (e) {
    console.warn("[modal-extra-coluna] erro ao buscar opções para", campo, e);
    // fallback: valores únicos dos produtos já carregados
    opcoes = [
      ...new Set(
        produtosData.map((p) => getExtraField(p, campo)).filter((v) => v),
      ),
    ]
      .sort()
      .map((v) => ({ label: v, value: v }));
  }

  // Renderizar lista
  list.innerHTML = "";
  if (!opcoes.length) {
    const empty = document.createElement("div");
    empty.textContent = "Nenhuma opção encontrada";
    empty.style.cssText = "padding:14px 20px;color:#999;font-size:13px;";
    list.appendChild(empty);
  } else {
    // Opção para limpar o campo
    const clearEl = document.createElement("div");
    clearEl.textContent = "(Nenhum)";
    clearEl.style.cssText =
      "padding:10px 20px;cursor:pointer;font-size:13px;color:#aaa;font-style:italic;";
    clearEl.addEventListener("mouseenter", () => {
      clearEl.style.background = "#fafafa";
    });
    clearEl.addEventListener("mouseleave", () => {
      clearEl.style.background = "transparent";
    });
    clearEl.addEventListener("click", () => {
      tdElement.textContent = "";
      const rowEl = tdElement.parentElement;
      const btn = rowEl && rowEl.querySelector(".btn-salvar");
      if (btn) markRowDirty(btn);
      closeModal();
    });
    list.appendChild(clearEl);

    const sep = document.createElement("div");
    sep.style.cssText = "height:1px;background:#f0f0f0;margin:4px 0;";
    list.appendChild(sep);

    opcoes.forEach((item) => {
      const el = document.createElement("div");
      el.textContent = item.label;
      el.style.cssText =
        "padding:10px 20px;cursor:pointer;font-size:14px;color:#333;transition:background 0.12s;";
      // Destacar valor atual
      if (item.value === tdElement.textContent.trim()) {
        el.style.background = "#f0f8f1";
        el.style.fontWeight = "600";
      }
      el.addEventListener("mouseenter", () => {
        el.style.background = "#f5f9f6";
        el.style.fontWeight = "";
      });
      el.addEventListener("mouseleave", () => {
        el.style.background = "transparent";
        el.style.fontWeight = "";
      });
      el.addEventListener("click", () => {
        tdElement.textContent = item.value;
        const rowEl = tdElement.parentElement;
        const btn = rowEl && rowEl.querySelector(".btn-salvar");
        if (btn) markRowDirty(btn);
        closeModal();
      });
      list.appendChild(el);
    });
  }
}

function renderizarTabelaProdutos() {
  const tbody = document.getElementById("produtosTableBody");

  if (!tbody) {
    console.error("❌ Tbody não encontrado");
    return;
  }

  // Limpar tabela
  tbody.innerHTML = "";

  if (filteredData.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `
            <td colspan="5" style="text-align: center; padding: 40px; color: #999;">
                Nenhum produto encontrado
            </td>
        `;
    tbody.appendChild(emptyRow);
    console.log("📋 Tabela vazia - 0 produtos");
    return;
  }

  // Calcular índices de paginação
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const dadosPaginados = filteredData.slice(startIndex, endIndex);

  // Renderizar linhas com células editáveis (exceto código)
  dadosPaginados.forEach((produto) => {
    const row = document.createElement("tr");
    row.dataset.backendId = produto.backendId || "";

    const tdCodigo = document.createElement("td");
    tdCodigo.textContent = produto.codigo || "-";

    const tdDescricao = document.createElement("td");
    tdDescricao.className = "editable";
    tdDescricao.contentEditable = true;
    tdDescricao.spellcheck = false;
    tdDescricao.textContent = produto.descricao || "";

    const tdCusto = document.createElement("td");
    tdCusto.className = "editable numeric";
    tdCusto.contentEditable = true;
    tdCusto.spellcheck = false;
    tdCusto.textContent =
      produto.custo !== null && produto.custo !== undefined
        ? formatCurrency(produto.custo)
        : "";

    const tdVenda = document.createElement("td");
    tdVenda.className = "editable numeric";
    tdVenda.contentEditable = true;
    tdVenda.spellcheck = false;
    tdVenda.textContent =
      produto.venda !== null && produto.venda !== undefined
        ? formatCurrency(produto.venda)
        : "";

    const tdAgrup = document.createElement("td");
    tdAgrup.className = "editable";
    tdAgrup.contentEditable = true;
    tdAgrup.spellcheck = false;
    tdAgrup.textContent = produto.agrupamento || "";

    // Attach save handlers and change detection
    [tdDescricao, tdCusto, tdVenda, tdAgrup].forEach((td) => {
      td.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          td.blur();
        }
      });
      td.addEventListener("blur", function (e) {
        salvarCelulaAlterada(row.dataset.backendId, td, produto);
      });
      td.addEventListener("input", function () {
        // marcar a linha como modificada (reverter botão para estado 'Salvar')
        const btn = row.querySelector(".btn-salvar");
        if (btn) markRowDirty(btn);
      });
    });

    // abrir dropdown ao clicar em agrupamento
    tdAgrup.addEventListener("click", function (e) {
      e.stopPropagation();
      abrirDropdownAgrupamento(tdAgrup, produto);
    });

    row.appendChild(tdCodigo);
    row.appendChild(tdDescricao);
    row.appendChild(tdCusto);
    row.appendChild(tdVenda);
    row.appendChild(tdAgrup);

    // Colunas extras selecionadas
    FILTROS_EXTRAS_META.forEach((meta) => {
      const cb = document.getElementById(meta.id);
      if (cb && cb.checked) {
        const tdExtra = document.createElement("td");
        tdExtra.dataset.campoExtra = meta.filtro;
        tdExtra.textContent = getExtraField(produto, meta.filtro) || "";
        tdExtra.style.cursor = "pointer";
        tdExtra.title = "Clique para alterar";
        tdExtra.addEventListener("click", (e) => {
          e.stopPropagation();
          abrirModalExtraColuna(tdExtra, produto, meta.filtro, meta.label);
        });
        row.appendChild(tdExtra);
      }
    });

    // Ações: botão Salvar (envia todos os campos de uma vez para o backend)
    const tdAcoes = document.createElement("td");
    const btnSalvar = document.createElement("button");
    btnSalvar.className = "btn-salvar";
    btnSalvar.textContent = "Salvar";
    btnSalvar.style.padding = "6px 10px";
    btnSalvar.style.borderRadius = "6px";
    btnSalvar.style.border = "1px solid #2b8cff";
    btnSalvar.style.background = "#2b8cff";
    btnSalvar.style.color = "#fff";
    btnSalvar.style.cursor = "pointer";
    btnSalvar.addEventListener("click", async function (e) {
      e.preventDefault();
      await salvarLinhaCompleta(row, produto);
    });
    tdAcoes.appendChild(btnSalvar);
    row.appendChild(tdAcoes);

    tbody.appendChild(row);
  });

  console.log(
    `✅ Tabela renderizada com ${dadosPaginados.length} produtos (página ${currentPage})`,
  );
}

function atualizarPaginacaoManutencao() {
  const paginationText = document.getElementById("paginationText");
  const btnPrevPage = document.getElementById("btnPrevPage");
  const btnNextPage = document.getElementById("btnNextPage");

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startItem =
    filteredData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, filteredData.length);

  if (paginationText) {
    paginationText.textContent = `${startItem} de ${filteredData.length}`;
  }

  if (btnPrevPage) {
    btnPrevPage.disabled = currentPage === 1;
  }

  if (btnNextPage) {
    btnNextPage.disabled =
      currentPage >= totalPages || filteredData.length === 0;
  }
}

// Helper: formata número para 'R$ 0.00'
function formatCurrency(value) {
  try {
    const n = Number(value) || 0;
    return "R$ " + n.toFixed(2).replace(".", ",");
  } catch (e) {
    return "" + value;
  }
}

// Helper: converte texto editado para número float (aceita R$ e vírgula)
function parseCurrencyText(text) {
  if (!text && text !== 0) return null;
  try {
    let s = String(text).trim();
    s = s.replace(/R\$|\s/g, "");
    s = s.replace(/\./g, "");
    s = s.replace(/,/g, ".");
    const v = parseFloat(s);
    return isNaN(v) ? null : v;
  } catch (e) {
    return null;
  }
}

// Abre um dropdown pequeno para selecionar ou criar agrupamentos
async function abrirDropdownAgrupamento(tdElement, produtoRow) {
  try {
    console.log(
      "[manutecao-produtos] abrirDropdownAgrupamento chamado para id=",
      produtoRow && produtoRow.backendId,
    );
    // fechar outros dropdowns (helper global)
    window.closeAllSelectDropdowns && window.closeAllSelectDropdowns(tdElement);

    // construir wrapper para o dropdown
    const wrapper = document.createElement("div");
    wrapper.className = "select-wrapper";
    wrapper.style.position = "fixed";
    wrapper.style.zIndex = 99999;
    wrapper.style.pointerEvents = "auto";

    // Calcular posição usando getBoundingClientRect (viewport coordinates)
    const rect = tdElement.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxWidth = 320;
    const maxHeight = 300;

    // Começar com posição ABAIXO da célula
    let left = rect.left;
    let top = rect.bottom + 6;

    // Ajustar ESQUERDA se sair dos limites horizontais
    if (left + maxWidth > vw) {
      left = vw - maxWidth - 8;
      if (left < 0) left = 8;
    }

    // Ajustar ALTURA se sair dos limites verticais: abrir ACIMA ao invés
    if (top + maxHeight > vh) {
      top = rect.top - maxHeight - 6;
      if (top < 0) top = 8;
    }

    wrapper.style.left = left + "px";
    wrapper.style.top = top + "px";
    wrapper.style.minWidth = "220px";

    // Função para recalcular posição no caso de scroll
    function updatePosition() {
      try {
        const currentRect = tdElement.getBoundingClientRect();
        const currentVw = window.innerWidth;
        const currentVh = window.innerHeight;

        let newLeft = currentRect.left;
        let newTop = currentRect.bottom + 6;

        // Ajustar ESQUERDA
        if (newLeft + maxWidth > currentVw) {
          newLeft = currentVw - maxWidth - 8;
          if (newLeft < 0) newLeft = 8;
        }

        // Ajustar ALTURA: abrir ACIMA se necessário
        if (newTop + maxHeight > currentVh) {
          newTop = currentRect.top - maxHeight - 6;
          if (newTop < 0) newTop = 8;
        }

        wrapper.style.left = newLeft + "px";
        wrapper.style.top = newTop + "px";
      } catch (e) {
        /* silent */
      }
    }

    // Adicionar listeners para scroll e resize
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    // Helper para fechar o dropdown
    function closeWrapper() {
      try {
        window.removeEventListener("scroll", updatePosition, true);
      } catch (e) {}
      try {
        window.removeEventListener("resize", updatePosition);
      } catch (e) {}
      try {
        if (wrapper.parentElement) wrapper.parentElement.removeChild(wrapper);
      } catch (e) {}
    }

    const dropdown = document.createElement("div");
    dropdown.className = "select-dropdown";
    dropdown.style.background = "#fff";
    dropdown.style.border = "1px solid #ddd";
    dropdown.style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)";
    dropdown.style.borderRadius = "6px";
    dropdown.style.padding = "6px";
    dropdown.style.maxHeight = maxHeight + "px";
    dropdown.style.overflow = "auto";

    const title = document.createElement("div");
    title.textContent = "Selecionar Agrupamento";
    title.style.fontWeight = "600";
    title.style.padding = "6px 8px";
    title.style.borderBottom = "1px solid #eee";
    dropdown.appendChild(title);

    const list = document.createElement("div");
    list.style.padding = "6px 4px";
    dropdown.appendChild(list);

    const footer = document.createElement("div");
    footer.style.padding = "6px 8px";
    footer.style.borderTop = "1px solid #eee";
    footer.style.display = "flex";
    footer.style.gap = "6px";

    const btnNovo = document.createElement("button");
    btnNovo.textContent = "Adicionar novo";
    btnNovo.style.flex = "1";
    btnNovo.style.padding = "6px";
    btnNovo.style.borderRadius = "4px";
    btnNovo.style.border = "1px solid #2b8cff";
    btnNovo.style.background = "#2b8cff";
    btnNovo.style.color = "#fff";
    btnNovo.style.cursor = "pointer";
    btnNovo.style.transition = "background 0.12s ease, transform 0.08s ease";
    btnNovo.addEventListener("mouseenter", () => {
      btnNovo.style.background = "#1a73e8";
      btnNovo.style.transform = "translateY(-1px)";
    });
    btnNovo.addEventListener("mouseleave", () => {
      btnNovo.style.background = "#2b8cff";
      btnNovo.style.transform = "none";
    });
    footer.appendChild(btnNovo);

    const btnFechar = document.createElement("button");
    btnFechar.textContent = "Fechar";
    btnFechar.style.padding = "6px";
    btnFechar.style.borderRadius = "4px";
    btnFechar.style.border = "1px solid #c82333";
    btnFechar.style.background = "#dc3545";
    btnFechar.style.color = "#fff";
    btnFechar.style.cursor = "pointer";
    btnFechar.style.transition = "background 0.12s ease, transform 0.08s ease";
    btnFechar.addEventListener("mouseenter", () => {
      btnFechar.style.background = "#c82333";
      btnFechar.style.transform = "translateY(-1px)";
    });
    btnFechar.addEventListener("mouseleave", () => {
      btnFechar.style.background = "#dc3545";
      btnFechar.style.transform = "none";
    });
    footer.appendChild(btnFechar);

    dropdown.appendChild(footer);
    wrapper.appendChild(dropdown);
    document.body.appendChild(wrapper);

    console.log(
      "[manutecao-produtos] dropdown adicionado ao DOM em fixed position left=" +
        left +
        "px top=" +
        top +
        "px",
    );

    // Helper para fechar o dropdown
    function closeWrapper() {
      try {
        window.removeEventListener("scroll", updatePosition, true);
      } catch (e) {}
      try {
        window.removeEventListener("resize", updatePosition);
      } catch (e) {}
      try {
        if (wrapper.parentElement) wrapper.parentElement.removeChild(wrapper);
      } catch (e) {}
    }

    // buscar agrupamentos do backend
    let agrupamentos = [];
    try {
      agrupamentos = await ApiClient.getAgrupamentos();
    } catch (e) {
      console.warn("[manutecao-produtos] falha ao buscar agrupamentos:", e);
      agrupamentos = [];
    }

    function renderList(data) {
      list.innerHTML = "";
      if (!Array.isArray(data) || data.length === 0) {
        const empty = document.createElement("div");
        empty.textContent = "Nenhum agrupamento encontrado";
        empty.style.padding = "6px 8px";
        empty.style.color = "#666";
        list.appendChild(empty);
        return;
      }

      data.forEach((item) => {
        const itemEl = document.createElement("div");
        itemEl.style.padding = "6px 8px";
        itemEl.style.cursor = "pointer";
        itemEl.style.borderRadius = "4px";
        itemEl.textContent = item.nome || item.name || String(item);
        itemEl.title = item.nome || item.name || "";
        itemEl.addEventListener("mouseenter", () => {
          itemEl.style.background = "#f1f5fb";
        });
        itemEl.addEventListener("mouseleave", () => {
          itemEl.style.background = "transparent";
        });
        itemEl.addEventListener("click", function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          if (Array.isArray(item.subgrupos) && item.subgrupos.length > 0) {
            list.innerHTML = "";
            const back = document.createElement("div");
            back.textContent = "← Voltar";
            back.style.padding = "6px 8px";
            back.style.cursor = "pointer";
            back.style.color = "#2b8cff";
            back.addEventListener("click", () => renderList(agrupamentos));
            list.appendChild(back);

            // opção do agrupamento pai (seleciona para todos os subgrupos)
            const parentEl = document.createElement("div");
            parentEl.style.padding = "6px 8px";
            parentEl.style.cursor = "pointer";
            parentEl.style.borderRadius = "4px";
            parentEl.style.fontWeight = "600";
            parentEl.textContent = item.nome || item.name || "";
            parentEl.addEventListener("mouseenter", () => {
              parentEl.style.background = "#f1f5fb";
            });
            parentEl.addEventListener("mouseleave", () => {
              parentEl.style.background = "transparent";
            });
            parentEl.addEventListener("click", function (evParent) {
              evParent.preventDefault();
              evParent.stopPropagation();
              tdElement.textContent = item.nome || item.name || "";
              const row = tdElement.parentElement;
              const btn = row ? row.querySelector(".btn-salvar") : null;
              if (btn) markRowDirty(btn);
              if (item.id) row.dataset.agrupamentoId = item.id;
              closeWrapper();
            });
            list.appendChild(parentEl);

            // pequena separação visual
            const sep = document.createElement("div");
            sep.style.height = "6px";
            list.appendChild(sep);

            item.subgrupos.forEach((sub) => {
              const subEl = document.createElement("div");
              subEl.style.padding = "6px 12px";
              subEl.style.cursor = "pointer";
              subEl.textContent =
                (item.nome || "") + " / " + (sub.nome || sub.name || sub);
              subEl.addEventListener("mouseenter", () => {
                subEl.style.background = "#f1f5fb";
              });
              subEl.addEventListener("mouseleave", () => {
                subEl.style.background = "transparent";
              });
              subEl.addEventListener("click", function (e2) {
                e2.preventDefault();
                e2.stopPropagation();
                tdElement.textContent = sub.nome || sub.name || sub;
                const row = tdElement.parentElement;
                const btn = row ? row.querySelector(".btn-salvar") : null;
                if (btn) markRowDirty(btn);
                if (sub.id) row.dataset.agrupamentoId = sub.id;
                closeWrapper();
              });
              list.appendChild(subEl);
            });
          } else {
            tdElement.textContent = item.nome || item.name || item;
            const row = tdElement.parentElement;
            const btn = row ? row.querySelector(".btn-salvar") : null;
            if (btn) markRowDirty(btn);
            if (item.id) row.dataset.agrupamentoId = item.id;
            closeWrapper();
          }
        });
        list.appendChild(itemEl);
      });
    }

    renderList(agrupamentos);

    btnFechar.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      closeWrapper();
    });

    btnNovo.addEventListener("click", async function (e) {
      e.preventDefault();
      e.stopPropagation();
      try {
        // Preferir o modal do sistema se disponível
        async function openModalAndRefresh() {
          try {
            // abrir modal (o próprio modal persiste na API via saveAgrupamentoAPI)
            openAdicionarAgrupamentoModal();

            // observar fechamento do modal para recarregar agrupamentos
            const observer = new MutationObserver(async function (muts, obs) {
              try {
                if (!document.querySelector(".modal-overlay")) {
                  obs.disconnect();
                  agrupamentos = await ApiClient.getAgrupamentos();
                  renderList(agrupamentos);
                  // tentar selecionar por último criado
                  const last =
                    Array.isArray(agrupamentos) && agrupamentos.length
                      ? agrupamentos[agrupamentos.length - 1]
                      : null;
                  if (last) {
                    tdElement.textContent = last.nome || last.name || last;
                    const row = tdElement.parentElement;
                    const btn = row ? row.querySelector(".btn-salvar") : null;
                    if (btn) markRowDirty(btn);
                    if (last.id) row.dataset.agrupamentoId = last.id;
                    closeWrapper();
                  }
                }
              } catch (inner) {
                console.debug("[manutecao-produtos] observer error", inner);
              }
            });
            observer.observe(document.body, { childList: true, subtree: true });
          } catch (e) {
            console.debug("[manutecao-produtos] openModalAndRefresh error", e);
          }
        }

        if (typeof openAdicionarAgrupamentoModal === "function") {
          openModalAndRefresh();
          return;
        }

        // tentar carregar dinamicamente o script do modal se não estiver presente
        try {
          const existing = Array.from(document.scripts).find(
            (s) => (s.src || "").indexOf("agrupamento.js") !== -1,
          );
          if (!existing) {
            const script = document.createElement("script");
            script.src = "./agrupamento.js";
            script.async = true;
            script.onload = function () {
              try {
                if (typeof openAdicionarAgrupamentoModal === "function")
                  openModalAndRefresh();
              } catch (e) {
                console.debug("onload open modal failed", e);
              }
            };
            script.onerror = function (err) {
              console.error(
                "[manutecao-produtos] falha ao carregar agrupamento.js",
                err,
              );
            };
            document.head.appendChild(script);
            return;
          } else {
            // já tem script tag mas função ainda não disponível (aguardar brevemente)
            const waitFor = function (resolve, reject, attempts) {
              if (typeof openAdicionarAgrupamentoModal === "function")
                return resolve(true);
              if (attempts <= 0)
                return reject(new Error("timeout waiting for modal function"));
              setTimeout(() => waitFor(resolve, reject, attempts - 1), 150);
            };
            await new Promise((res, rej) => waitFor(res, rej, 10))
              .then(() => openModalAndRefresh())
              .catch((err) => {
                console.debug(
                  "[manutecao-produtos] modal not available after load",
                  err,
                );
              });
          }
        } catch (err) {
          console.debug("[manutecao-produtos] dynamic load failed", err);
        }

        // fallback antigo (solicitar) caso o modal não exista
        const nome = await solicitar("Nome do novo agrupamento:");
        if (!nome) return;
        try {
          const criado = await ApiClient.criarAgrupamento({ nome: nome });
          agrupamentos = await ApiClient.getAgrupamentos();
          renderList(agrupamentos);
          if (criado && criado.nome) {
            const encontrado = agrupamentos.find(
              (a) =>
                (a.id && String(a.id) === String(criado.id)) ||
                (a.nome && a.nome === criado.nome),
            );
            if (encontrado) {
              tdElement.textContent = encontrado.nome || criado.nome;
              const row = tdElement.parentElement;
              const btn = row ? row.querySelector(".btn-salvar") : null;
              if (btn) markRowDirty(btn);
              if (encontrado.id) row.dataset.agrupamentoId = encontrado.id;
              closeWrapper();
            }
          }
        } catch (err) {
          console.error(
            "[manutecao-produtos] erro ao criar agrupamento (fallback):",
            err,
          );
          try {
            window.showToast &&
              window.showToast("Erro ao criar agrupamento", "error");
          } catch (e) {}
        }
      } catch (err) {
        console.error("[manutecao-produtos] btnNovo handler falhou:", err);
      }
    });
  } catch (err) {
    console.error("[manutecao-produtos] abrirDropdownAgrupamento falhou:", err);
  }
}
// Abre dropdown de Agrupamento para o campo de filtro superior
async function abrirDropdownAgrupamentoFiltro(inputEl) {
  try {
    if (!inputEl) return;
    window.closeAllSelectDropdowns && window.closeAllSelectDropdowns(inputEl);

    const wrapper = document.createElement("div");
    wrapper.className = "select-wrapper";
    wrapper.style.position = "fixed";
    wrapper.style.zIndex = 99999;
    wrapper.style.pointerEvents = "auto";

    const rect = inputEl.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 6;
    const vw = Math.max(
      document.documentElement.clientWidth || 0,
      window.innerWidth || 0,
    );
    const vh = Math.max(
      document.documentElement.clientHeight || 0,
      window.innerHeight || 0,
    );
    const maxWidth = 420;
    const maxHeight = 360;
    if (left + maxWidth > vw) left = Math.max(8, vw - maxWidth - 8);
    if (top + maxHeight > vh) top = Math.max(8, rect.top - maxHeight - 8);

    wrapper.style.left = left + "px";
    wrapper.style.top = top + "px";
    wrapper.style.minWidth = Math.max(200, rect.width) + "px";

    const dropdown = document.createElement("div");
    dropdown.className = "select-dropdown";
    dropdown.style.background = "#fff";
    dropdown.style.border = "1px solid #ddd";
    dropdown.style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)";
    dropdown.style.borderRadius = "6px";
    dropdown.style.padding = "6px";
    dropdown.style.maxHeight = maxHeight + "px";
    dropdown.style.overflow = "auto";

    const title = document.createElement("div");
    title.textContent = "Selecionar Agrupamento";
    title.style.fontWeight = "600";
    title.style.padding = "6px 8px";
    title.style.borderBottom = "1px solid #eee";
    dropdown.appendChild(title);

    const searchBox = document.createElement("input");
    searchBox.type = "search";
    searchBox.placeholder = "Pesquisar agrupamento...";
    searchBox.style.width = "100%";
    searchBox.style.padding = "8px";
    searchBox.style.margin = "6px 0";
    searchBox.style.border = "1px solid #e6e9eb";
    searchBox.style.borderRadius = "6px";
    dropdown.appendChild(searchBox);

    const list = document.createElement("div");
    list.style.padding = "6px 4px";
    dropdown.appendChild(list);

    const footer = document.createElement("div");
    footer.style.padding = "6px 8px";
    footer.style.borderTop = "1px solid #eee";
    footer.style.display = "flex";
    footer.style.justifyContent = "flex-end";

    const btnFechar = document.createElement("button");
    btnFechar.textContent = "Fechar";
    btnFechar.style.padding = "6px 10px";
    btnFechar.style.borderRadius = "6px";
    btnFechar.style.border = "1px solid #c82333";
    btnFechar.style.background = "#dc3545";
    btnFechar.style.color = "#fff";
    btnFechar.style.cursor = "pointer";
    footer.appendChild(btnFechar);

    dropdown.appendChild(footer);
    wrapper.appendChild(dropdown);
    document.body.appendChild(wrapper);

    let agrupamentos = [];
    try {
      agrupamentos = await ApiClient.getAgrupamentos();
    } catch (e) {
      console.warn(
        "[manutecao-produtos] falha ao buscar agrupamentos (filtro):",
        e,
      );
      agrupamentos = [];
    }

    function render(data) {
      list.innerHTML = "";
      if (!Array.isArray(data) || data.length === 0) {
        const empty = document.createElement("div");
        empty.textContent = "Nenhum agrupamento encontrado";
        empty.style.padding = "6px 8px";
        empty.style.color = "#666";
        list.appendChild(empty);
        return;
      }
      data.forEach((item) => {
        const el = document.createElement("div");
        el.style.padding = "8px 10px";
        el.style.cursor = "pointer";
        el.style.borderRadius = "4px";
        el.textContent = item.nome || item.name || String(item);
        el.title = el.textContent;
        el.addEventListener(
          "mouseenter",
          () => (el.style.background = "#f1f5fb"),
        );
        el.addEventListener(
          "mouseleave",
          () => (el.style.background = "transparent"),
        );
        el.addEventListener("click", function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          // se houver subgrupos, mostrar estrutura hierárquica similar ao dropdown de célula
          if (Array.isArray(item.subgrupos) && item.subgrupos.length > 0) {
            list.innerHTML = "";
            const back = document.createElement("div");
            back.textContent = "← Voltar";
            back.style.padding = "6px 8px";
            back.style.cursor = "pointer";
            back.style.color = "#2b8cff";
            back.addEventListener("click", () => render(agrupamentos));
            list.appendChild(back);

            const parentEl = document.createElement("div");
            parentEl.style.padding = "6px 8px";
            parentEl.style.cursor = "pointer";
            parentEl.style.fontWeight = "600";
            parentEl.textContent = item.nome || item.name || "";
            parentEl.addEventListener("click", function () {
              inputEl.value = item.nome || item.name || "";
              if (item.id) inputEl.dataset.agrupamentoId = item.id;
              closeWrapper();
            });
            list.appendChild(parentEl);
            const sep = document.createElement("div");
            sep.style.height = "6px";
            list.appendChild(sep);
            item.subgrupos.forEach((sub) => {
              const s = document.createElement("div");
              s.style.padding = "6px 12px";
              s.style.cursor = "pointer";
              s.textContent =
                (item.nome || "") + " / " + (sub.nome || sub.name || sub);
              s.addEventListener("click", function () {
                inputEl.value = sub.nome || sub.name || sub;
                if (sub.id) inputEl.dataset.agrupamentoId = sub.id;
                closeWrapper();
              });
              list.appendChild(s);
            });
          } else {
            inputEl.value = item.nome || item.name || "";
            if (item.id) inputEl.dataset.agrupamentoId = item.id;
            closeWrapper();
          }
        });
        list.appendChild(el);
      });
    }

    render(agrupamentos);

    searchBox.addEventListener("input", function () {
      const v = (this.value || "").trim().toLowerCase();
      if (!v) return render(agrupamentos);
      const filtered = agrupamentos.filter(
        (a) =>
          (a.nome || "").toString().toLowerCase().indexOf(v) !== -1 ||
          (a.subgrupos || []).some(
            (s) => (s.nome || "").toString().toLowerCase().indexOf(v) !== -1,
          ),
      );
      render(filtered);
    });

    function closeWrapper() {
      try {
        wrapper.parentElement && wrapper.parentElement.removeChild(wrapper);
      } catch (e) {}
    }
    btnFechar.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      closeWrapper();
    });
  } catch (err) {
    console.error(
      "[manutecao-produtos] abrirDropdownAgrupamentoFiltro falhou:",
      err,
    );
  }
}

// Salva célula alterada no backend (chamada via ApiClient.atualizarProduto)
async function salvarCelulaAlterada(backendId, tdElement, produtoRow) {
  try {
    if (!backendId) return;
    // Determinar campo alterado
    const colIndex = Array.from(tdElement.parentElement.children).indexOf(
      tdElement,
    );
    const payload = {};
    if (colIndex === 1) {
      // descricao -> nome
      const novo = tdElement.textContent.trim();
      if (novo === (produtoRow.descricao || "").trim()) return;
      payload.nome = novo;
    } else if (colIndex === 2) {
      // custo
      const novoTexto = tdElement.textContent.trim();
      const novoNum = parseCurrencyText(novoTexto);
      if (novoNum === null) {
        // invalid number, revert
        tdElement.textContent =
          produtoRow.custo !== null && produtoRow.custo !== undefined
            ? formatCurrency(produtoRow.custo)
            : "";
        return;
      }
      if (novoNum === produtoRow.custo) return;
      payload.custoBase = novoNum;
    } else if (colIndex === 3) {
      // venda
      const novoTexto = tdElement.textContent.trim();
      const novoNum = parseCurrencyText(novoTexto);
      if (novoNum === null) {
        tdElement.textContent =
          produtoRow.venda !== null && produtoRow.venda !== undefined
            ? formatCurrency(produtoRow.venda)
            : "";
        return;
      }
      if (novoNum === produtoRow.venda) return;
      payload.preco = novoNum;
    } else if (colIndex === 4) {
      // agrupamento
      const novo = tdElement.textContent.trim();
      if (novo === (produtoRow.agrupamento || "").trim()) return;
      payload.agrupamento = novo;
    } else return;

    // visual feedback
    tdElement.classList.add("saving");

    // chamar API
    await ApiClient.atualizarProduto(backendId, payload);

    // atualizar objeto local produtoRow para refletir novo valor
    if (payload.nome !== undefined) produtoRow.descricao = payload.nome;
    if (payload.custoBase !== undefined)
      produtoRow.custo = Number(payload.custoBase);
    if (payload.preco !== undefined) produtoRow.venda = Number(payload.preco);
    if (payload.agrupamento !== undefined)
      produtoRow.agrupamento = payload.agrupamento;

    // normalizar exibição (formatar moeda)
    if (colIndex === 2)
      tdElement.textContent = formatCurrency(produtoRow.custo);
    if (colIndex === 3)
      tdElement.textContent = formatCurrency(produtoRow.venda);

    tdElement.classList.remove("saving");

    // também marcar o botão da linha como "Salvo" para feedback consistente
    try {
      const row = tdElement.parentElement;
      const btn = row ? row.querySelector(".btn-salvar") : null;
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Salvo";
        btn.style.background = "#28a745";
        btn.style.border = "1px solid #28a745";
        btn.style.color = "#fff";
        btn.style.opacity = "1";
        btn.dataset.saved = "true";
      }
    } catch (e) {
      /* silent */
    }
  } catch (e) {
    console.error("[manutecao-produtos] falha ao salvar célula:", e);
    tdElement.classList.remove("saving");
    // opcional: exibir toast
    try {
      window.showToast &&
        window.showToast("Falha ao salvar alteração", "error");
    } catch (e) {}
  }
}

// Salva todos os campos editáveis da linha (quando usuário clica em 'Salvar')
async function salvarLinhaCompleta(rowElement, produtoRow) {
  try {
    const backendId = rowElement.dataset.backendId;
    if (!backendId) return;

    const tds = rowElement.querySelectorAll("td");
    // índices: 0=codigo,1=descricao,2=custo,3=venda,4=agrup,5=acoes
    const descricao = (tds[1]?.textContent || "").trim();
    const custo = parseCurrencyText(tds[2]?.textContent || "");
    const venda = parseCurrencyText(tds[3]?.textContent || "");
    const agrupamento = (tds[4]?.textContent || "").trim();

    const payload = {};
    if (descricao !== (produtoRow.descricao || "").trim())
      payload.nome = descricao;
    if (custo !== null && custo !== produtoRow.custo) payload.custoBase = custo;
    if (venda !== null && venda !== produtoRow.venda) payload.preco = venda;
    if (agrupamento !== (produtoRow.agrupamento || "").trim())
      payload.agrupamento = agrupamento;

    // Campos extras (categoria, centroResultado, marca, perfilComissao)
    rowElement.querySelectorAll("td[data-campo-extra]").forEach((tdEx) => {
      const campo = tdEx.dataset.campoExtra;
      const valor = tdEx.textContent.trim();
      const rawAtual = produtoRow._raw
        ? (produtoRow._raw[campo] || "").trim()
        : getExtraField(produtoRow, campo);
      if (valor !== rawAtual) {
        payload[campo] = valor;
      }
    });

    if (Object.keys(payload).length === 0) {
      try {
        window.showToast &&
          window.showToast("Nenhuma alteração para salvar", "info");
      } catch (e) {}
      return;
    }

    const btn = rowElement.querySelector(".btn-salvar");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Salvando...";
      btn.style.opacity = "0.7";
    }

    console.log("[manutecao-produtos] salvando produto:", backendId, payload);
    await ApiClient.atualizarProduto(backendId, payload);
    console.log(
      "[manutecao-produtos] resposta sucesso para produto:",
      backendId,
    );

    // atualizar produtoRow local
    if (payload.nome !== undefined) produtoRow.descricao = payload.nome;
    if (payload.custoBase !== undefined)
      produtoRow.custo = Number(payload.custoBase);
    if (payload.preco !== undefined) produtoRow.venda = Number(payload.preco);
    if (payload.agrupamento !== undefined)
      produtoRow.agrupamento = payload.agrupamento;
    // Atualizar _raw para campos extras
    ["categoria", "centroResultado", "marca", "perfilComissao"].forEach((c) => {
      if (payload[c] !== undefined) {
        if (!produtoRow._raw) produtoRow._raw = {};
        produtoRow._raw[c] = payload[c];
      }
    });

    if (btn) {
      btn.disabled = false;
      btn.textContent = "Salvo";
      // aplicar estilo verde de sucesso
      btn.style.background = "#28a745";
      btn.style.border = "1px solid #28a745";
      btn.style.color = "#fff";
      btn.style.opacity = "1";
      btn.dataset.saved = "true";
    }
    try {
      window.showToast && window.showToast("Alterações salvas", "success");
    } catch (e) {}
  } catch (e) {
    console.error(
      "[manutecao-produtos] erro ao salvar linha (id=" +
        (rowElement.dataset.backendId || "") +
        "):",
      e,
    );
    const btn = rowElement.querySelector("button.btn-salvar");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Salvar";
      btn.style.opacity = "1";
    }
    try {
      window.showToast &&
        window.showToast("Erro ao salvar alterações", "error");
    } catch (e) {}
  }
}

// Marca o botão como sujo (retorna ao estado 'Salvar' com estilo padrão)
function markRowDirty(btn) {
  try {
    btn.disabled = false;
    btn.textContent = "Salvar";
    btn.style.background = "#2b8cff";
    btn.style.border = "1px solid #2b8cff";
    btn.style.color = "#fff";
    btn.style.opacity = "1";
  } catch (e) {
    /* silent */
  }
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializarManutencaoProdutos);
} else {
  inicializarManutencaoProdutos();
}
