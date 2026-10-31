// Copiado de frontend/dashboard.js - funcionalidades do menu e header

console.log("🚀 menu.js carregado (snippet do dashboard)");

// Toast helper (leve) para esta página
function showToast(message, type = "info", timeout = 3000) {
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
    setTimeout(() => toast.classList.add("show"), 10);
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
    // armazenar em memória durante a sessão (não mais em localStorage)
    window.__estadoSubmenus = window.__estadoSubmenus || {};
    window.__estadoSubmenus[submenuId] = !!isOpen;
  } catch (error) {
    console.error(error);
  }
}

function obterEstadoSubmenu(submenuId) {
  try {
    return (
      (window.__estadoSubmenus && window.__estadoSubmenus[submenuId]) || false
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
    window.__estadoSubmenus = {};
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

// ========================================
// CARREGAR PRODUTO DA API
// ========================================

// Variável global para armazenar o produto atual
var produtoAtual = null;

async function carregarProduto() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");

    if (!id) {
      console.warn("ID do produto não encontrado na URL");
      showToast("Produto não encontrado", "error", 3000);
      return;
    }

    console.log("Carregando produto ID:", id);

    // Buscar produto via API
    const produto = await ApiClient.getProduto(id);

    if (!produto) {
      showToast("Produto não encontrado", "error", 3000);
      return;
    }

    produtoAtual = produto;
    preencherDadosProduto(produto);
  } catch (error) {
    console.error("Erro ao carregar produto:", error);
    showToast(
      "Erro ao carregar produto: " + (error.message || "Erro desconhecido"),
      "error",
      4000,
    );
  }
}

function preencherDadosProduto(produto) {
  try {
    // Header do produto
    document.getElementById("productName").textContent =
      produto.nome || "Sem nome";
    // Mostrar o código interno (`codigo`) como identificador; cair para `id` se não existir
    document.getElementById("productCode").textContent =
      produto.codigo || produto.id || "-";
    document.getElementById("productStock").textContent =
      (produto.estoqueAtual || 0) + " " + (produto.unidade || "UN");

    // Imagem do produto
    const productImage = document.getElementById("productImage");
    const productImagePlaceholderIcon = document.getElementById(
      "productImagePlaceholderIcon",
    );
    if (produto.imagem) {
      productImage.src = produto.imagem;
      productImage.style.display = "block";
      if (productImagePlaceholderIcon)
        productImagePlaceholderIcon.style.display = "none";
    } else {
      productImage.style.display = "none";
      if (productImagePlaceholderIcon)
        productImagePlaceholderIcon.style.display = "block";
    }

    // Detalhes do produto (aba DETALHES)
    document.getElementById("categoria").textContent = produto.categoria || "-";
    document.getElementById("agrupamento").textContent =
      produto.agrupamento || "0";
    // Suporta múltiplos códigos de barras: `codigosBarras` (array) ou retrocompatível `codigoBarras` (string)
    try {
      const cbEl = document.getElementById("codigoBarras");
      if (cbEl) {
        const list =
          Array.isArray(produto.codigosBarras) &&
          produto.codigosBarras.length > 0
            ? produto.codigosBarras
            : produto.codigoBarras
              ? [produto.codigoBarras]
              : [];
        cbEl.textContent = list.length > 0 ? list.join(", ") : "-";
      }
    } catch (e) {
      try {
        document.getElementById("codigoBarras").textContent =
          produto.codigoBarras || "-";
      } catch (_) {}
    }
    document.getElementById("marca").textContent = produto.marca || "-";
    document.getElementById("fatorCompra").textContent =
      produto.fatorCompra || "-";
    document.getElementById("curva").textContent = produto.curva || "-";
    document.getElementById("estoqueMinimo").textContent =
      (produto.estoqueMinimo || 0) + " " + (produto.unidade || "UN");
    document.getElementById("validade").textContent = produto.validade || "-";
    document.getElementById("estoqueIdeal").textContent =
      (produto.estoqueIdeal || 0) + " " + (produto.unidade || "UN");
    document.getElementById("ativo").textContent =
      produto.ativo === "sim" || produto.ativo === true ? "Sim" : "Não";
    document.getElementById("ncm").textContent = produto.ncm || "-";
    document.getElementById("cest").textContent = produto.cest || "-";
    document.getElementById("perfilTributacao").textContent =
      produto.perfilTributacao || "-";
    document.getElementById("perfilComissao").textContent =
      produto.perfilComissao || "-";
    document.getElementById("perfilDesconto").textContent =
      produto.perfilDesconto || "-";
    document.getElementById("estoqueNegativo").textContent =
      produto.permiteEstoqueNegativo ? "Sim" : "Não";
    document.getElementById("localizacao").textContent =
      produto.localizacao || "-";
    document.getElementById("tipoVacina").textContent =
      produto.tipoVacina || "-";
    document.getElementById("diasOportunidade").textContent =
      produto.diasOportunidade || "-";
    document.getElementById("observacao").textContent =
      produto.observacao || "-";
    document.getElementById("centroResultado").textContent =
      produto.centroResultado || "Loja - Venda de Produtos";

    // Precificação - Converter DECIMAL strings para números
    const custoBase = parseFloat(produto.custoBase) || 0;
    const preco = parseFloat(produto.preco) || 0;
    const margem = parseFloat(produto.margem) || 0;
    const margemValor = preco - custoBase;

    document.getElementById("precoCusto").textContent =
      "R$ " + custoBase.toFixed(2).replace(".", ",");
    document.getElementById("precoVenda").textContent =
      "R$ " + preco.toFixed(2).replace(".", ",");
    document.getElementById("margemLucro").textContent =
      "R$ " +
      margemValor.toFixed(2).replace(".", ",") +
      " (" +
      margem.toFixed(3) +
      "%)";

    // Atualizar modal de estoque
    document.getElementById("modalProdutoNome").textContent =
      produto.nome || "Produto";
    document.getElementById("modalEstoqueAtual").textContent =
      (produto.estoqueAtual || 0) + " " + (produto.unidade || "UN");
  } catch (error) {
    console.error("Erro ao preencher dados do produto:", error);
  }
}

// Chamar ao carregar a página
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", carregarProduto);
} else {
  carregarProduto();
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
    inicializarPaginaProduto();
    configurarBotoesAcao();
  }, 200);
});

/* ========================================
   PÁGINA DE PRODUTO - FUNCIONALIDADES
   ======================================== */

let chartPrecificacao = null;
let chartVendas = null;
// produtoAtual já declarado acima - removendo duplicata

/**
 * Configurar botões de ação do header
 */
function configurarBotoesAcao() {
  console.log("🔘 Configurando botões de ação...");

  // Botão Editar
  const btnEditar = document.getElementById("btnEditar");
  if (btnEditar) {
    btnEditar.addEventListener("click", function () {
      console.log("✏️ Botão Editar clicado");

      // Obter ID do produto atual
      const urlParams = new URLSearchParams(window.location.search);
      const produtoId = urlParams.get("id");

      if (produtoId) {
        // Redirecionar para página de edição com o ID do produto
        window.location.href = `./editar-produto.html?id=${produtoId}`;
      } else {
        alert("ID do produto não encontrado!");
      }
    });
  }

  // Botão Clonar
  const btnClonar = document.getElementById("btnClonar");
  if (btnClonar) {
    btnClonar.addEventListener("click", function () {
      console.log("📋 Botão Clonar clicado");
      if (!produtoAtual) {
        showToast("Produto não carregado", "warning");
        return;
      }
      if (!produtoAtual.id) {
        showToast("Produto sem ID", "warning");
        return;
      }
      // Redirecionar para editar-produto com parâmetro clonar
      window.location.href = `./editar-produto.html?clonar=${produtoAtual.id}`;
    });
  }

  // Botão Meus Itens (já tem onclick no HTML, mas podemos adicionar aqui também)
  console.log("✅ Botões de ação configurados");
}

/**
 * Configurar dropdown do botão Ativo (inativar item)
 */
function configurarDropdownAtivo() {
  const btn = document.getElementById("btnAtivo");
  const container = btn ? btn.closest(".dropdown") : null;
  if (!btn || !container) return;

  // (re)criar menu dinamicamente com base no estado atual do produto
  const existing = container.querySelector(".dropdown-menu[data-ativo]");
  if (existing) existing.remove();

  const isActive =
    produtoAtual === null || produtoAtual === undefined
      ? true
      : produtoAtual.ativo === undefined || produtoAtual.ativo === null
        ? true
        : typeof produtoAtual.ativo === "boolean"
          ? produtoAtual.ativo === true
          : String(produtoAtual.ativo).toLowerCase() === "sim";

  // ajustar classe do botão
  try {
    btn.classList.remove("btn-status-active", "btn-status-inactive");
    if (isActive) btn.classList.add("btn-status-active");
    else btn.classList.add("btn-status-inactive");
  } catch (e) {}

  const menu = document.createElement("div");
  menu.className = "dropdown-menu";
  menu.setAttribute("data-ativo", "1");
  menu.style.minWidth = "160px";
  if (isActive) {
    menu.innerHTML = `<div class="dropdown-item dropdown-item-danger" id="menuToggleAtivar"><i class="fas fa-times" style="color:#e74c3c; width:18px;"></i> Inativar</div>`;
  } else {
    menu.innerHTML = `<div class="dropdown-item" id="menuToggleAtivar"><i class="fas fa-check" style="color:var(--btn-success); width:18px;"></i> Ativar</div>`;
  }

  container.appendChild(menu);

  // abrir/fechar
  btn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    const was = container.classList.contains("open");
    document.querySelectorAll(".dropdown.open").forEach((d) => {
      if (d !== container) d.classList.remove("open");
    });
    container.classList.toggle("open", !was);
  });

  // fechar ao clicar fora
  document.addEventListener("click", function (e) {
    if (!container.contains(e.target)) container.classList.remove("open");
  });

  // ação de alternar (inativar / ativar)
  const toggleItem = menu.querySelector("#menuToggleAtivar");
  toggleItem.addEventListener("click", async function (e) {
    e.preventDefault();
    e.stopPropagation();

    if (!produtoAtual || !produtoAtual.id) {
      showToast("Produto não identificado", "warning");
      container.classList.remove("open");
      return;
    }

    try {
      // Alternar status via API
      const novoStatus = isActive ? "nao" : "sim";
      await ApiClient.atualizarProduto(produtoAtual.id, {
        ...produtoAtual,
        ativo: novoStatus,
      });

      // atualizar objeto local
      produtoAtual.ativo = novoStatus;

      // atualizar UI
      if (novoStatus === "nao") {
        btn.classList.remove("btn-status-active");
        btn.classList.add("btn-status-inactive");
        btn.innerHTML =
          '<i class="fas fa-times-circle"></i> Inativo <i class="fas fa-chevron-down"></i>';
        const ativoEl = document.getElementById("ativo");
        if (ativoEl) ativoEl.textContent = "Inativo";
        showToast("Produto inativado", "warning", 2000);
      } else {
        btn.classList.remove("btn-status-inactive");
        btn.classList.add("btn-status-active");
        btn.innerHTML =
          '<i class="fas fa-check-circle"></i> Ativo <i class="fas fa-chevron-down"></i>';
        const ativoEl = document.getElementById("ativo");
        if (ativoEl) ativoEl.textContent = "Sim";
        showToast("Produto ativado", "success", 2000);
      }

      container.classList.remove("open");
      // navegar para a lista para refletir mudança
      setTimeout(() => {
        window.location.href = "./meus-itens.html";
      }, 700);
    } catch (err) {
      console.error("Erro alternando produto", err);
      showToast("Erro ao atualizar produto: " + err.message, "error");
      container.classList.remove("open");
    }
  });
}

/**
 * Inicializar página de produto
 */
function inicializarPaginaProduto() {
  console.log("🔄 Inicializando Página de Produto...");

  // Obter ID do produto da URL
  const urlParams = new URLSearchParams(window.location.search);
  const produtoId = urlParams.get("id");

  console.log("🔍 Produto ID da URL:", produtoId);

  // Carregar dados do produto
  if (produtoId) {
    carregarDadosProduto(parseInt(produtoId));
  }

  // Configurar abas
  configurarAbasProduto();

  // Inicializar gráficos após delay
  setTimeout(async () => {
    await inicializarGraficos();
  }, 500);
  // configurar dropdown do botão Ativo
  try {
    configurarDropdownAtivo();
  } catch (e) {
    console.debug("configurarDropdownAtivo falhou", e);
  }

  console.log("✅ Página de Produto inicializada");
}

/**
 * Configurar sistema de abas
 */
function configurarAbasProduto() {
  const tabBtns = document.querySelectorAll(".product-tabs .tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      const targetTab = this.dataset.tab;

      // Remover active de todas as abas
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      // Adicionar active na aba clicada
      this.classList.add("active");
      document.getElementById(targetTab)?.classList.add("active");

      // Se abriu a aba de faturamento, renderizar o histórico
      try {
        if (targetTab === "faturamento") {
          renderFaturamento();
        } else if (targetTab === "compras") {
          renderCompras();
        } else if (targetTab === "estoque") {
          renderEstoque();
        }
      } catch (err) {
        console.debug("renderFaturamento falhou", err);
      }

      console.log(`📂 Aba selecionada: ${targetTab}`);
    });
  });
}

/**
 * Renderizar a aba de Faturamento com vendas do produto
 */
async function renderFaturamento() {
  try {
    const container = document.getElementById("faturamento");
    if (!container) return;

    // Limpar conteúdo anterior
    container.innerHTML =
      '<div class="tab-placeholder"><i class="fas fa-spinner fa-spin"></i><p>Carregando vendas...</p></div>';

    // Injetar estilos (uma vez)
    try {
      injectFaturamentoStyles();
    } catch (e) {
      console.debug("injectFaturamentoStyles erro", e);
    }

    if (!produtoAtual || !produtoAtual.id) {
      container.innerHTML = `<div class="tab-placeholder"><i class="fas fa-file-invoice-dollar"></i><p>Produto não identificado</p></div>`;
      return;
    }

    // Buscar vendas da API
    let vendas = [];
    try {
      vendas = await ApiClient.getVendas();
    } catch (error) {
      console.error("Erro ao buscar vendas da API:", error);
      container.innerHTML = `<div class="tab-placeholder"><i class="fas fa-exclamation-triangle"></i><p>Erro ao carregar vendas</p></div>`;
      return;
    }

    // Filtrar vendas que contenham o produto atual
    const vendasDoProduto = (vendas || []).filter(
      (v) =>
        Array.isArray(v.itens) &&
        v.itens.some(
          (i) =>
            (i.produto && String(i.produto.id) === String(produtoAtual.id)) ||
            (i.produto && i.produto.nome === produtoAtual.nome),
        ),
    );

    if (!vendasDoProduto || vendasDoProduto.length === 0) {
      container.innerHTML = `
                <div class="tab-placeholder">
                    <i class="fas fa-file-invoice-dollar"></i>
                    <h3>Nenhuma venda encontrada para este produto</h3>
                    <p>Quando este produto for vendido, as vendas aparecerão aqui.</p>
                </div>
            `;
      return;
    }

    // Construir tabela
    const table = document.createElement("table");
    table.className = "faturamento-table";
    table.innerHTML = `
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Qtd</th>
                    <th>Unitário</th>
                    <th>Desconto%</th>
                    <th>Total Faturado</th>
                    <th>CMV Unit.</th>
                    <th>CMV Total</th>
                    <th>Margem %</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

    const tbody = table.querySelector("tbody");

    // colocar dentro de um wrapper para espaçamento e possível cabeçalho
    const wrapper = document.createElement("div");
    wrapper.className = "faturamento-wrapper";

    // Helper: obter custo do produto buscando no backend (cache carregado abaixo)
    let __produtosCache_paraFaturamento = [];
    try {
      (async function () {
        try {
          __produtosCache_paraFaturamento = await ApiClient.getProdutos();
        } catch (e) {
          __produtosCache_paraFaturamento = [];
        }
      })();
    } catch (e) {
      __produtosCache_paraFaturamento = [];
    }

    function obterCustoProduto(prodId, prodNome) {
      try {
        const produtos = __produtosCache_paraFaturamento || [];
        let found = produtos.find((p) => String(p.id) === String(prodId));
        if (!found && prodNome)
          found = produtos.find((p) => p.nome === prodNome);
        if (found && found.custoBase !== undefined)
          return Number(found.custoBase) || Number(found.custo) || 0;
      } catch (e) {
        console.debug("obterCustoProduto erro", e);
      }
      return 0;
    }

    // Percorrer vendas e adicionar linhas para cada item do produto
    vendasDoProduto.forEach((v) => {
      const data = v.timestamp ? new Date(v.timestamp) : v.data || null;
      const dataTexto = data ? new Date(data).toLocaleString("pt-BR") : "-";
      const cliente = v.cliente || (v.cliente && v.cliente.nome) || "-";

      v.itens.forEach((item) => {
        const match =
          (item.produto &&
            String(item.produto.id) === String(produtoAtual.id)) ||
          (item.produto && item.produto.nome === produtoAtual.nome);
        if (!match) return;

        const qtd = Number(item.quantidade || item.qtd || 1);
        const unit = Number(
          item.valorUnitario ||
            item.valor ||
            (item.produto && (item.produto.preco || item.produto.venda)) ||
            0,
        );
        const desconto = Number(item.desconto || item.descontoPercent || 0);
        const totalFaturado = Number(
          item.totalFinal ||
            item.total ||
            qtd * unit * (1 - desconto / 100) ||
            0,
        );

        const custoUnit =
          obterCustoProduto(
            item.produto && item.produto.id,
            (item.produto && item.produto.nome) || produtoAtual.nome,
          ) || 0;
        const cmvTotal = custoUnit * qtd;
        const margemPerc =
          totalFaturado > 0
            ? ((totalFaturado - cmvTotal) / totalFaturado) * 100
            : 0;

        const tr = document.createElement("tr");
        tr.innerHTML = `
                    <td>${escapeHtml(dataTexto)}</td>
                    <td>${escapeHtml(cliente)}</td>
                    <td>${qtd}</td>
                    <td>${formatCurrencyBR(unit)}</td>
                    <td>${desconto}%</td>
                    <td>${formatCurrencyBR(totalFaturado)}</td>
                    <td>${formatCurrencyBR(custoUnit)}</td>
                    <td>${formatCurrencyBR(cmvTotal)}</td>
                    <td>${margemPerc.toFixed(2)}%</td>
                `;

        tbody.appendChild(tr);
      });
    });

    wrapper.appendChild(table);

    // Limpar o container e adicionar a tabela (remove o spinner)
    container.innerHTML = "";
    container.appendChild(wrapper);
  } catch (err) {
    console.error("Erro ao renderizar faturamento:", err);
    const container = document.getElementById("faturamento");
    if (container) {
      container.innerHTML = `<div class="tab-placeholder"><i class="fas fa-exclamation-triangle"></i><p>Erro ao carregar vendas</p></div>`;
    }
  }
}

// Pequenos utilitários
function formatCurrencyBR(value) {
  const num = Number(value) || 0;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function escapeHtml(str) {
  if (!str && str !== 0) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Renderizar aba de Compras (headers + estado vazio se não houver dados)
 */
function renderCompras() {
  try {
    const container = document.getElementById("compras");
    if (!container) return;

    container.innerHTML = "";
    injectFaturamentoStyles(); // reutilizar estilos

    const wrapper = document.createElement("div");
    wrapper.className = "faturamento-wrapper compras-wrapper";

    const table = document.createElement("table");
    table.className = "compras-table faturamento-table";
    table.innerHTML = `
            <thead>
                <tr>
                    <th class="date">Data</th>
                    <th class="client">Fornecedor</th>
                    <th class="qty right">Quantidade</th>
                    <th class="unit right">Preço de Compra</th>
                    <th class="unit right">Custo de Aquisição</th>
                    <th class="unit right">Preço de Custo</th>
                    <th class="total right">Preço de Venda</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;

    const tbody = table.querySelector("tbody");

    // Tentar carregar compras de localStorage (se existir alguma chave comum)
    const posiblesKeys = [
      "compras",
      "entradas",
      "historicoCompras",
      "notasCompra",
    ];
    let compras = [];
    for (const k of posiblesKeys) {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            compras = parsed;
            break;
          }
        }
      } catch (e) {}
    }

    if (!compras || compras.length === 0) {
      // corpo vazio (mensagem similar ao screenshot)
      const emptyRow = document.createElement("tr");
      emptyRow.innerHTML = `<td colspan="7"><div style="padding:18px 6px;color:#888">Nenhuma compra registrada</div></td>`;
      tbody.appendChild(emptyRow);
    } else {
      // por segurança, mapear e preencher linhas (implementação mínima)
      compras.forEach((c) => {
        const data = c.data || c.timestamp || c.date || "-";
        const fornecedor =
          c.fornecedor || (c.supplier && c.supplier.nome) || "-";
        // assumir que cada compra tem itens; somar quantidades e valores
        let qtdTotal = 0;
        let precoCompra = 0;
        let custoAquisicao = 0;
        let precoCusto = 0;
        let precoVenda = 0;
        if (Array.isArray(c.itens)) {
          c.itens.forEach((it) => {
            qtdTotal += Number(it.quantidade || it.qtd || 0);
            precoCompra += Number(it.precoCompra || it.valor || 0);
          });
        }
        const tr = document.createElement("tr");
        tr.innerHTML = `
                    <td class="date">${escapeHtml(String(data))}</td>
                    <td class="client">${escapeHtml(String(fornecedor))}</td>
                    <td class="qty right">${qtdTotal}</td>
                    <td class="unit right">${formatCurrencyBR(precoCompra)}</td>
                    <td class="unit right">${formatCurrencyBR(custoAquisicao)}</td>
                    <td class="unit right">${formatCurrencyBR(precoCusto)}</td>
                    <td class="total right">${formatCurrencyBR(precoVenda)}</td>
                `;
        tbody.appendChild(tr);
      });
    }

    // footer de paginação simples
    const footer = document.createElement("div");
    footer.style.display = "flex";
    footer.style.justifyContent = "flex-end";
    footer.style.padding = "8px 0 0 0";
    footer.innerHTML = `<small style="color:#999">0 de 0</small>`;

    wrapper.appendChild(table);
    wrapper.appendChild(footer);
    container.appendChild(wrapper);
  } catch (err) {
    console.error("Erro renderCompras", err);
  }
}

/**
 * Renderizar aba de Estoque mostrando histórico de movimentos para o produto atual.
 */
async function renderEstoque() {
  try {
    const container = document.getElementById("estoque");
    if (!container) return;

    container.innerHTML = "";
    injectFaturamentoStyles();

    const wrapper = document.createElement("div");
    wrapper.className = "faturamento-wrapper estoque-wrapper";

    // Cabeçalho com período e saldo anterior (simples)
    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.marginBottom = "12px";

    const periodo = document.createElement("div");
    // mostrar período baseado no calendário selecionado (se houver)
    try {
      let di =
        window.calendarioProduto && window.calendarioProduto.dataInicio
          ? new Date(window.calendarioProduto.dataInicio)
          : addMonths(new Date(), -1);
      let df =
        window.calendarioProduto && window.calendarioProduto.dataFim
          ? new Date(window.calendarioProduto.dataFim)
          : new Date();
      if (!di || isNaN(di)) di = addMonths(new Date(), -1);
      if (!df || isNaN(df)) df = new Date();
      periodo.innerHTML = `<small style="color:#666">Período de Análise: <strong>${formatDateShort(di)} - ${formatDateShort(df)}</strong></small>`;
    } catch (e) {
      periodo.innerHTML = `<small style="color:#666">Período de Análise: <strong>${formatDateShort(addMonths(new Date(), -1))} - ${formatDateShort(new Date())}</strong></small>`;
    }
    header.appendChild(periodo);

    // garantir que o small do período seja marcado como clicável imediatamente
    try {
      const periodoSmall =
        periodo.querySelector && periodo.querySelector("small");
      if (periodoSmall) {
        periodoSmall.classList.add("clickable-date");
        periodoSmall.setAttribute("role", "button");
        periodoSmall.setAttribute("tabindex", "0");
        periodoSmall.style.cursor = "pointer";
        periodoSmall.style.userSelect = "text";
        periodoSmall.title =
          periodoSmall.title || "Clique para alterar o período";

        // também marcar o <strong> interno
        const strong =
          periodoSmall.querySelector && periodoSmall.querySelector("strong");
        if (strong) {
          strong.classList.add("clickable-date");
          strong.style.cursor = "pointer";
          strong.setAttribute("role", "button");
          strong.setAttribute("tabindex", "0");
        }

        if (!periodoSmall._clickListenerAdded) {
          periodoSmall.addEventListener("click", function (ev) {
            ev.stopPropagation();
            abrirCalendarioProduto(periodoSmall);
          });
          periodoSmall.addEventListener("keydown", function (ev) {
            if (ev.key === "Enter" || ev.key === " ") {
              ev.preventDefault();
              abrirCalendarioProduto(periodoSmall);
            }
          });
          periodoSmall._clickListenerAdded = true;
        }
        try {
          periodoSmall.contentEditable = "false";
          if (strong) strong.contentEditable = "false";
        } catch (e) {}
      }
    } catch (e) {
      console.debug("Erro ao marcar periodo como clicavel", e);
    }

    const saldoAnteriorDiv = document.createElement("div");
    saldoAnteriorDiv.innerHTML = `<strong>Saldo Anterior: <span id="saldoAnteriorProduto">0</span></strong>`;
    header.appendChild(saldoAnteriorDiv);

    wrapper.appendChild(header);

    // garantir que o popup do calendário do produto exista e esteja inicializado
    ensureCalendarioProduto();
    const table = document.createElement("table");
    table.className = "faturamento-table estoque-table";
    table.innerHTML = `
            <thead>
                <tr>
                    <th class="date">Data</th>
                    <th class="client">Operação</th>
                    <th class="qty right">Quantidade</th>
                    <th class="total right">Saldo em Estoque</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

    const tbody = table.querySelector("tbody");

    // Buscar histórico da API
    let historico = [];
    if (produtoAtual && produtoAtual.id) {
      try {
        historico = await ApiClient.getHistoricoEstoque(produtoAtual.id);
        console.log(`📦 Histórico de estoque carregado da API:`, historico);
      } catch (err) {
        console.error("Erro ao buscar histórico:", err);
      }
    }

    // Aplicar filtro por período se o calendário do produto tiver datas selecionadas
    try {
      if (window.calendarioProduto && window.calendarioProduto.dataInicio) {
        const di = window.calendarioProduto.dataInicio;
        const df =
          window.calendarioProduto.dataFim ||
          window.calendarioProduto.dataInicio;
        historico = historico.filter((h) => {
          const d = parseDateLocal(h.dataMovimento || h.createdAt || 0);
          if (!d) return false;
          d.setHours(0, 0, 0, 0);
          return d.getTime() >= di.getTime() && d.getTime() <= df.getTime();
        });
      }
    } catch (e) {
      console.warn("Erro ao filtrar histórico por período:", e);
    }

    // Ordenar por data asc (mais antigo primeiro)
    function parseDateLocal(raw) {
      try {
        if (!raw && raw !== 0) return null;
        var s = String(raw);
        // reconhecer formato YYYY-MM-DD (data sem horário) e construir Date local
        var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) {
          var y = parseInt(m[1], 10);
          var mo = parseInt(m[2], 10) - 1;
          var d = parseInt(m[3], 10);
          return new Date(y, mo, d);
        }
        // timestamp numérico
        if (!isNaN(Number(s)) && String(s).length >= 9)
          return new Date(Number(s));
        // fallback para Date normal (ISO or other)
        var dt = new Date(s);
        if (isNaN(dt)) return null;
        return dt;
      } catch (e) {
        return null;
      }
    }

    historico.sort(function (a, b) {
      const da =
        parseDateLocal(a.dataMovimento || a.createdAt || 0) || new Date(0);
      const db =
        parseDateLocal(b.dataMovimento || b.createdAt || 0) || new Date(0);
      return da - db;
    });

    // Saldo anterior (usar primeiro registro estoqueAnterior se existir)
    let saldoAnterior = 0;
    if (historico.length > 0) {
      const first = historico[0];
      saldoAnterior = Number(first.estoqueAnterior || 0);
    }
    document.getElementById("saldoAnteriorProduto")?.remove();
    // recriar no header
    header.querySelector("div:last-child").innerHTML =
      `<strong>Saldo Anterior: <span id="saldoAnteriorProduto">${saldoAnterior}</span></strong>`;

    // se não há movimentos, mostrar estado vazio
    if (!historico || historico.length === 0) {
      const empty = document.createElement("div");
      empty.className = "tab-placeholder";
      empty.innerHTML = `<i class="fas fa-boxes"></i><h3>Nenhuma movimentação de estoque</h3><p>Quando você ajustar o estoque deste produto, os lançamentos aparecerão aqui.</p>`;
      wrapper.appendChild(empty);
      wrapper.appendChild(table);
      container.appendChild(wrapper);
      return;
    }

    // Construir linhas e manter saldo corrente
    let saldoCorrente = saldoAnterior;
    historico.forEach((it) => {
      const rawData = it.dataMovimento || it.createdAt || "";
      const data = parseDateLocal(rawData);
      const dataTexto = data ? formatDateShort(data) : rawData || "-";

      const operacao = it.operacao || "Ajuste";
      const diferenca = Number(it.quantidade || 0);

      // atualizar saldoCorrente
      saldoCorrente = Number(it.novoEstoque || saldoCorrente + diferenca);

      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td class="date">${escapeHtml(dataTexto)}</td>
                <td class="client">${escapeHtml(String(operacao))}</td>
                <td class="qty right">${diferenca >= 0 ? "+" + diferenca : diferenca}</td>
                <td class="total right">${escapeHtml(String(saldoCorrente))}</td>
            `;
      tbody.appendChild(tr);
    });

    wrapper.appendChild(table);

    // footer com paginação simplificada
    const footer = document.createElement("div");
    footer.style.display = "flex";
    footer.style.justifyContent = "flex-end";
    footer.style.padding = "8px 0 0 0";
    footer.innerHTML = `<small style="color:#999">1 - ${historico.length} de ${historico.length}</small>`;

    wrapper.appendChild(footer);
    container.appendChild(wrapper);
  } catch (err) {
    console.error("Erro ao renderEstoque", err);
  }
}

function formatDateShort(d) {
  try {
    // Se for string no formato YYYY-MM-DD, formatar diretamente (evita ambiguidade de timezone)
    if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const parts = d.split("-");
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt)) return "";
    // Usar Intl para formatar no timezone de Brasília
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "America/Sao_Paulo",
      }).format(dt);
    } catch (e) {
      const dia = String(dt.getDate()).padStart(2, "0");
      const mes = String(dt.getMonth() + 1).padStart(2, "0");
      const ano = dt.getFullYear();
      return `${dia}/${mes}/${ano}`;
    }
  } catch (e) {
    return "";
  }
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// Injetar estilos para a tabela de faturamento (somente uma vez)
function injectFaturamentoStyles() {
  if (document.getElementById("faturamento-styles")) return;
  const style = document.createElement("style");
  style.id = "faturamento-styles";
  style.textContent = `
    .faturamento-wrapper { padding: 12px 8px; }
    .faturamento-table { width: 100%; border-collapse: separate; font-size: 13px; color: #222; background: #fff; box-shadow: 0 0 0 1px rgba(0,0,0,0.02) inset; }
    .faturamento-table thead th { background: #f5f7f9; padding: 12px 10px; text-align: left; font-weight: 700; border-bottom: 1px solid #e6e9ec; color: #333; font-size: 13px; }
    .faturamento-table thead th.right { text-align: right; }
    .faturamento-table tbody tr { border-bottom: 1px solid #f0f0f0; }
    .faturamento-table tbody tr:nth-child(even) { background: #fbfbfc; }
    .faturamento-table td { padding: 10px; vertical-align: middle; color: #444; }
    .faturamento-table td.center { text-align: center; }
    .faturamento-table td.right { text-align: right; white-space: nowrap; }
    .faturamento-table th, .faturamento-table td { white-space: nowrap; }
    .faturamento-table th.date, .faturamento-table td.date { width: 220px; }
    .faturamento-table th.client, .faturamento-table td.client { width: 300px; }
    .faturamento-table th.qty, .faturamento-table td.qty { width: 70px; text-align: right; }
    .faturamento-table th.unit, .faturamento-table td.unit { width: 110px; text-align: right; }
    .faturamento-table th.total, .faturamento-table td.total { width: 120px; text-align: right; }
    .tab-placeholder { padding: 30px; text-align: center; color: #666; }
    .tab-placeholder i { display: block; font-size: 34px; margin-bottom: 6px; color: #c1c6ca; }
    @media (max-width: 900px) {
        .faturamento-table thead th, .faturamento-table td { padding: 8px; font-size: 12px; }
        .faturamento-table th.client, .faturamento-table td.client { width: 160px; }
    }
    `;
  document.head.appendChild(style);
}

/**
 * Inicializar gráficos Chart.js
 */
async function inicializarGraficos() {
  console.log("📊 Inicializando gráficos...");

  // Verificar se Chart.js está disponível
  if (typeof Chart === "undefined") {
    console.error("❌ Chart.js não carregado");
    return;
  }

  // Gráfico de Precificação
  criarGraficoPrecificacao();
  // Carregar histórico de preços salvo localmente e escutar atualizações
  try {
    if (produtoAtual && produtoAtual.id)
      loadPriceHistoryForProduct(produtoAtual.id);
  } catch (e) {
    console.debug("loadPriceHistoryForProduct failed", e);
  }

  // Gráfico de Vendas
  await criarGraficoVendas();
}

/**
 * Criar gráfico de precificação
 */
function criarGraficoPrecificacao() {
  const ctx = document.getElementById("chartPrecificacao");
  if (!ctx) {
    console.error("❌ Canvas de precificação não encontrado");
    return;
  }

  // Destruir gráfico anterior se existir
  if (chartPrecificacao) {
    chartPrecificacao.destroy();
  }

  chartPrecificacao = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["05/11/2025"],
      datasets: [
        {
          label: "Preço",
          data: [32],
          borderColor: "#4CAF50",
          backgroundColor: "rgba(76, 175, 80, 0.1)",
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: "#4CAF50",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
        },
        {
          label: "Custo",
          data: [21],
          borderColor: "#F44336",
          backgroundColor: "rgba(244, 67, 54, 0.1)",
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: "#F44336",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 12,
              weight: "600",
            },
          },
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          padding: 12,
          titleFont: {
            size: 13,
            weight: "600",
          },
          bodyFont: {
            size: 12,
          },
          callbacks: {
            label: function (context) {
              try {
                return (
                  context.dataset.label +
                  ": " +
                  formatCurrencyBR(context.parsed.y)
                );
              } catch (e) {
                return (
                  context.dataset.label +
                  ": R$ " +
                  (context.parsed.y || 0).toFixed(2)
                );
              }
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          min: 20,
          max: 33,
          ticks: {
            font: {
              size: 11,
            },
            stepSize: 2,
          },
          grid: {
            color: "rgba(0, 0, 0, 0.05)",
          },
        },
        x: {
          ticks: {
            font: {
              size: 11,
            },
          },
          grid: {
            display: false,
          },
        },
      },
    },
  });

  console.log("✅ Gráfico de Precificação criado");
}

// Carregar histórico de preços salvo em localStorage para um produto e aplicar no gráfico
function loadPriceHistoryForProduct(produtoId) {
  try {
    if (!produtoId) return;
    const key = "priceHistory:" + produtoId;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    let hist = [];
    try {
      hist = JSON.parse(raw);
    } catch (e) {
      hist = [];
    }
    if (!Array.isArray(hist)) return;
    applyPriceHistoryToChart(hist);
  } catch (e) {
    console.error("loadPriceHistoryForProduct failed", e);
  }
}

function applyPriceHistoryToChart(history) {
  try {
    if (!chartPrecificacao) return;
    if (!Array.isArray(history) || history.length === 0) return;

    // ordenar por data asc (tratar strings YYYY-MM-DD sem interpretar como UTC)
    function timeForDateString(ds) {
      try {
        if (typeof ds === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ds)) {
          const parts = ds.split("-").map(Number);
          return Date.UTC(parts[0], parts[1] - 1, parts[2]);
        }
        const dt = new Date(ds);
        return isNaN(dt) ? 0 : dt.getTime();
      } catch (e) {
        return 0;
      }
    }

    history.sort(
      (a, b) => timeForDateString(a.date) - timeForDateString(b.date),
    );

    const labels = history.map((p) => {
      if (typeof p.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.date))
        return formatDateShort(p.date);
      return formatDateShort(new Date(p.date));
    });
    const saleData = history.map((p) =>
      p.sale !== undefined && p.sale !== null ? Number(p.sale) : null,
    );
    const costData = history.map((p) =>
      p.cost !== undefined && p.cost !== null ? Number(p.cost) : null,
    );

    chartPrecificacao.data.labels = labels;
    chartPrecificacao.data.datasets[0].data = saleData;
    chartPrecificacao.data.datasets[1].data = costData;

    // ajustar escala Y
    const all = [].concat(
      saleData.filter((v) => v != null),
      costData.filter((v) => v != null),
    );
    if (all.length > 0) {
      const min = Math.min(...all);
      const max = Math.max(...all);
      chartPrecificacao.options.scales.y.min = Math.floor(
        Math.max(0, min - Math.abs(min * 0.1) - 1),
      );
      chartPrecificacao.options.scales.y.max = Math.ceil(
        max + Math.abs(max * 0.1) + 1,
      );
    }

    chartPrecificacao.update();
  } catch (e) {
    console.error("applyPriceHistoryToChart failed", e);
  }
}

// Escutar eventos de storage vindos de outras abas/janelas para atualizar o gráfico
window.addEventListener("storage", function (e) {
  try {
    if (!e || !e.key) return;
    if (e.key === "priceHistoryUpdate") {
      const payload = e.newValue ? JSON.parse(e.newValue) : null;
      if (
        payload &&
        produtoAtual &&
        String(payload.id) === String(produtoAtual.id)
      ) {
        loadPriceHistoryForProduct(produtoAtual.id);
      }
    }
  } catch (err) {
    console.debug("storage listener error", err);
  }
});

/**
 * Criar gráfico de vendas
 */
async function criarGraficoVendas() {
  const ctx = document.getElementById("chartVendas");
  if (!ctx) {
    console.error("❌ Canvas de vendas não encontrado");
    return;
  }

  // Destruir gráfico anterior se existir
  if (chartVendas) {
    chartVendas.destroy();
  }

  // Agregar vendas do produto atual por dia (últimos 10 dias)
  try {
    const dias = 10;
    const hoje = new Date();
    const dateList = [];
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        hoje.getDate() - i,
      );
      dateList.push(d);
    }

    // labels: 'DD/MM'
    const labels = dateList.map((d) => {
      const dia = String(d.getDate()).padStart(2, "0");
      const mes = String(d.getMonth() + 1).padStart(2, "0");
      return `${dia}/${mes}`;
    });

    // inicializar mapa de contagem
    const counts = {};
    labels.forEach((l) => (counts[l] = 0));

    // Buscar vendas da API
    let vendas = [];
    try {
      vendas = await ApiClient.getVendas();
    } catch (error) {
      console.error("Erro ao buscar vendas da API:", error);
      vendas = [];
    }
    if (
      Array.isArray(vendas) &&
      vendas.length &&
      produtoAtual &&
      produtoAtual.id
    ) {
      vendas.forEach((v) => {
        try {
          const itens = Array.isArray(v.itens) ? v.itens : [];
          // determinar data da venda (usar timestamp ou data)
          const raw = v.timestamp || v.data || v.date || v.createdAt || null;
          const d = raw ? new Date(raw) : null;
          const key = d
            ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
            : null;

          itens.forEach((it) => {
            const match =
              (it.produto &&
                (String(it.produto.id) === String(produtoAtual.id) ||
                  it.produto.nome === produtoAtual.nome)) ||
              (it.produto && String(it.produto) === String(produtoAtual.id)) ||
              (it.nome && produtoAtual.nome && it.nome === produtoAtual.nome);
            if (!match) return;
            const qtd =
              Number(it.quantidade || it.qtd || it.qt || it.amount || 1) || 0;
            if (key && counts[key] !== undefined) counts[key] += qtd;
          });
        } catch (e) {
          /* ignore item errors */
        }
      });
    }

    const data = labels.map((l) => counts[l] || 0);

    chartVendas = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Vendas",
            data: data,
            backgroundColor: "rgba(33, 150, 243, 0.7)",
            borderColor: "#2196F3",
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 12,
            titleFont: { size: 13, weight: "600" },
            bodyFont: { size: 12 },
            callbacks: {
              label: function (ctx) {
                try {
                  return (
                    ctx.dataset.label +
                    ": " +
                    (ctx.parsed.y || 0) +
                    (ctx.parsed.y == 1 ? " venda" : " vendas")
                  );
                } catch (e) {
                  return String(ctx.parsed.y || 0);
                }
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { font: { size: 11 }, precision: 0 },
            grid: { color: "rgba(0, 0, 0, 0.05)" },
          },
          x: { grid: { display: false } },
        },
      },
    });
  } catch (err) {
    console.error("Erro ao popular gráfico de vendas", err);
  }

  console.log("✅ Gráfico de Vendas criado");
}

/**
 * Base de dados de produtos (mesmo array de meus-itens.js)
 */
const produtosExemplo = [
  {
    id: 1,
    nome: "PA HIGIENICA CARA DE GATO AZUL",
    categoria: "Higiene",
    tipo: "produto",
    custoBase: 1.41,
    margem: 69,
    preco: 3.0,
    estoqueMinimo: 0,
    estoqueAtual: 0,
    codigo: "101",
    marca: "Cara de Gato",
  },
  {
    id: 2,
    nome: "BUTOX P CE 25 - 20ML",
    categoria: "Farmácia",
    tipo: "produto",
    custoBase: 4.31,
    margem: 160,
    preco: 7.0,
    estoqueMinimo: 0,
    estoqueAtual: 40,
    codigo: "102",
    marca: "Butox",
  },
  {
    id: 3,
    nome: "Ganadol Pomada Anti-infecciosa e Cicatrizante 50g",
    categoria: "Farmácia",
    tipo: "produto",
    custoBase: 16.32,
    margem: 69,
    preco: 40.0,
    estoqueMinimo: 0,
    estoqueAtual: 27,
    codigo: "103",
    marca: "Ganadol",
  },
  {
    id: 4,
    nome: "THUYA AVÍCOLA SIMÕES ORAL 20ML",
    categoria: "Farmácia",
    tipo: "produto",
    custoBase: 5.0,
    margem: 100,
    preco: 10.0,
    estoqueMinimo: 0,
    estoqueAtual: 5,
    codigo: "104",
    marca: "Simões",
  },
  {
    id: 5,
    nome: "GOLDEN ADULTO RAÇA PEQ FRANGO E ARROZ 15KG",
    categoria: "Rações",
    tipo: "produto",
    custoBase: 40.04,
    margem: 44,
    preco: 131.0,
    estoqueMinimo: 0,
    estoqueAtual: 4,
    codigo: "105",
    marca: "Golden",
  },
  {
    id: 6,
    nome: "GOLDEN COOKIE FILHOTE 400G",
    categoria: "Ossos e Petiscos",
    tipo: "produto",
    custoBase: 5.07,
    margem: 64,
    preco: 13.0,
    estoqueMinimo: 0,
    estoqueAtual: 0,
    codigo: "106",
    marca: "Golden",
  },
  {
    id: 7,
    nome: "Ração N&D PrimeCordeiro e Blueberry Cães Adultos",
    categoria: "Rações",
    tipo: "produto",
    custoBase: 40.0,
    margem: 15,
    preco: 314.99,
    estoqueMinimo: 5,
    estoqueAtual: 15,
    codigo: "107",
    marca: "N&D",
  },
  {
    id: 8,
    nome: "GOLDEN GATO CASTRADO SALMAO 10,1KG",
    categoria: "Rações",
    tipo: "produto",
    custoBase: 38.61,
    margem: 44,
    preco: 126.0,
    estoqueMinimo: 0,
    estoqueAtual: 4,
    codigo: "108",
    marca: "Golden",
  },
  {
    id: 9,
    nome: "GOLDEN GATO FILHOTE FRANGO 1KG",
    categoria: "Rações",
    tipo: "produto",
    custoBase: 8.38,
    margem: 62,
    preco: 22.0,
    estoqueMinimo: 0,
    estoqueAtual: 0,
    codigo: "109",
    marca: "Golden",
  },
  {
    id: 10,
    nome: "Banho e Tosa - Cães Pequeno Porte",
    categoria: "Serviços",
    tipo: "servico",
    custoBase: 0,
    margem: 0,
    preco: 50.0,
    estoqueMinimo: 0,
    estoqueAtual: 0,
    codigo: "201",
    marca: "-",
  },
  {
    id: 11,
    nome: "Consulta Veterinária",
    categoria: "Serviços",
    tipo: "servico",
    custoBase: 0,
    margem: 0,
    preco: 120.0,
    estoqueMinimo: 0,
    estoqueAtual: 0,
    codigo: "202",
    marca: "-",
  },
  {
    id: 12,
    nome: "Plano Mensal - Banho Ilimitado",
    categoria: "Planos",
    tipo: "plano",
    custoBase: 0,
    margem: 0,
    preco: 199.9,
    estoqueMinimo: 0,
    estoqueAtual: 0,
    codigo: "301",
    marca: "-",
  },
];

/**
 * Carregar dados do produto via API
 */
async function carregarDadosProduto(produtoId) {
  let apiErrorMessage = null;
  try {
    console.log("📡 Carregando dados do produto ID:", produtoId);

    // Buscar produto via API
    const produto = await ApiClient.getProduto(produtoId);

    if (produto) {
      produtoAtual = produto;
      console.log("✅ Produto encontrado:", produto);
      atualizarCamposProduto(produto);
      return;
    } else {
      console.warn("⚠️ Produto não encontrado com ID:", produtoId);
      apiErrorMessage = "Produto não encontrado";
    }
  } catch (error) {
    console.error("❌ Erro ao carregar produto:", error);
    apiErrorMessage = error && error.message ? error.message : String(error);
    // não mostrar toast aqui — tentar fallbacks primeiro
  }

  // Tentar localizar produto em chaves locais (localStorage) antes do fallback estático
  try {
    const localKeys = [
      "meusItens",
      "produtos",
      "produtosLista",
      "produtos_lista",
      "meusItensLista",
    ];
    let found = null;
    for (const k of localKeys) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) continue;
        found = arr.find((p) => String(p.id) === String(produtoId));
        if (found) {
          console.warn(
            `[pagina-produto] Produto encontrado em localStorage (key=${k})`,
          );
          break;
        }
      } catch (e) {
        /* ignore parse errors */
      }
    }

    if (found) {
      produtoAtual = found;
      atualizarCamposProduto(found);
      return;
    }
  } catch (e) {
    console.debug("[pagina-produto] erro buscando localStorage", e);
  }

  // Fallback final: tentar array de exemplo embutida
  console.warn("🔄 Usando fallback local estático...");
  const produto = (produtosExemplo || []).find(
    (p) => String(p.id) === String(produtoId),
  );
  if (produto) {
    produtoAtual = produto;
    atualizarCamposProduto(produto);
    return;
  }

  // Se chegamos aqui, não encontramos o produto em nenhum lugar — mostrar toast de erro
  const finalMsg = apiErrorMessage || "Produto não encontrado";
  showToast("Erro ao carregar produto: " + finalMsg, "error");
}

/**
 * Atualizar campos com dados do produto
 */
function atualizarCamposProduto(dados) {
  console.log("🔄 Atualizando campos do produto:", dados.nome);

  // Atualizar header
  if (dados.nome)
    document.getElementById("productName").textContent = dados.nome;
  if (dados.codigo)
    document.getElementById("productCode").textContent = dados.codigo;

  // Atualizar estoque
  const estoqueText =
    dados.tipo === "produto" ? `${dados.estoqueAtual} UN` : "-";
  document.getElementById("productStock").textContent = estoqueText;

  // Atualizar detalhes
  try {
    document.getElementById("centroResultado").textContent =
      dados.centroResultado || "Loja - Venda de Produtos";
  } catch (e) {}
  document.getElementById("categoria").textContent = dados.categoria || "-";
  document.getElementById("marca").textContent = dados.marca || "-";
  document.getElementById("estoqueMinimo").textContent =
    dados.tipo === "produto" ? `${dados.estoqueMinimo} UN` : "-";
  try {
    document.getElementById("estoqueIdeal").textContent =
      dados.estoqueIdeal !== undefined && dados.estoqueIdeal !== null
        ? `${dados.estoqueIdeal} UN`
        : "UN";
  } catch (e) {}
  try {
    document.getElementById("diasOportunidade").textContent =
      dados.diasOportunidadeVenda || "-";
  } catch (e) {}
  // Validade e perfil de desconto
  try {
    document.getElementById("validade").textContent = dados.validade || "-";
  } catch (e) {}
  try {
    document.getElementById("perfilDesconto").textContent =
      dados.perfilDesconto || "-";
  } catch (e) {}
  // mostrar estado Ativo / Inativo conforme o dado
  try {
    const ativoEl = document.getElementById("ativo");
    const btnAtivo = document.getElementById("btnAtivo");
    const isActive =
      dados.ativo === undefined || dados.ativo === null
        ? true
        : typeof dados.ativo === "boolean"
          ? dados.ativo === true
          : String(dados.ativo).toLowerCase() === "sim";
    if (ativoEl) ativoEl.textContent = isActive ? "Sim" : "Inativo";
    if (btnAtivo) {
      // atualizar conteúdo e classes para refletir o estado
      if (isActive) {
        btnAtivo.innerHTML =
          '<i class="fas fa-check-circle"></i> Ativo <i class="fas fa-chevron-down"></i>';
        btnAtivo.classList.remove("btn-status-inactive");
        btnAtivo.classList.add("btn-status-active");
      } else {
        btnAtivo.innerHTML =
          '<i class="fas fa-times-circle"></i> Inativo <i class="fas fa-chevron-down"></i>';
        btnAtivo.classList.remove("btn-status-active");
        btnAtivo.classList.add("btn-status-inactive");
      }
    }
  } catch (e) {
    console.debug("erro atualizando status ativo", e);
  }

  // Atualizar preços - Converter DECIMAL strings para números
  if (dados.tipo === "produto") {
    const custoBase = parseFloat(dados.custoBase) || 0;
    const preco = parseFloat(dados.preco) || 0;
    const margem = parseFloat(dados.margem) || 0;

    document.getElementById("precoCusto").textContent =
      formatCurrencyBR(custoBase);

    // Calcular margem em reais
    const margemReais = preco - custoBase;
    document.getElementById("margemLucro").textContent =
      `${formatCurrencyBR(margemReais)} (${margem}%)`;

    document.getElementById("precoVenda").textContent = formatCurrencyBR(preco);

    // Atualizar gráfico com valores reais
    if (chartPrecificacao) {
      chartPrecificacao.data.datasets[0].data = [preco];
      chartPrecificacao.data.datasets[1].data = [custoBase];
      chartPrecificacao.options.scales.y.min = Math.floor(custoBase - 5);
      chartPrecificacao.options.scales.y.max = Math.ceil(preco + 5);
      chartPrecificacao.update();
    }
    // Carregar histórico de preços salvo no localStorage (se houver)
    try {
      if (dados && dados.id) loadPriceHistoryForProduct(dados.id);
    } catch (e) {
      console.debug("loadPriceHistoryForProduct failed", e);
    }
  } else {
    // Para serviços e planos
    document.getElementById("precoCusto").textContent = formatCurrencyBR(0);
    document.getElementById("margemLucro").textContent =
      `${formatCurrencyBR(0)} (0%)`;
    document.getElementById("precoVenda").textContent = formatCurrencyBR(
      dados.preco,
    );
  }

  // Fornecedores: se houver, concatenar em Observação (apresentação simples)
  try {
    if (Array.isArray(dados.fornecedores) && dados.fornecedores.length > 0) {
      const obsEl = document.getElementById("observacao");
      const linhas = dados.fornecedores.map((f) => {
        const nome = f.fornecedor || f.nome || "";
        const ref = f.referencia || f.referencia || "";
        const fator = f.fatorCompra || f.fator || "";
        return `${nome}${ref ? " — " + ref : ""}${fator ? " (fator: " + fator + ")" : ""}`;
      });
      if (obsEl) {
        const existing =
          obsEl.textContent && obsEl.textContent.trim() !== "-"
            ? obsEl.textContent.trim() + "\n\n"
            : "";
        obsEl.textContent = existing + "Fornecedores:\n" + linhas.join("\n");
      }
    }
  } catch (e) {
    console.debug("erro mostrando fornecedores", e);
  }

  console.log("✅ Campos atualizados com sucesso");
  try {
    if (window.__refreshProductImage) window.__refreshProductImage(dados);
  } catch (e) {}
}

// ============================================
// SISTEMA DE AJUSTE DE ESTOQUE
// ============================================

let estoqueAtualProduto = 0;
let nomeProdutoAtual = "";
let codigoProdutoAtual = "";

function abrirModalEstoque(event) {
  event.preventDefault();

  // Buscar dados do produto da página
  const nomeElement = document.getElementById("productName");
  const codigoElement = document.getElementById("productCode");
  const estoqueElement = document.getElementById("productStock");

  if (nomeElement) {
    nomeProdutoAtual = nomeElement.textContent.trim();
    document.getElementById("modalProdutoNome").textContent = nomeProdutoAtual;
  }

  if (codigoElement) {
    codigoProdutoAtual = codigoElement.textContent.trim();
  }

  if (estoqueElement) {
    const estoqueTexto = estoqueElement.textContent;
    const match = estoqueTexto.match(/(\d+)/);
    if (match) {
      estoqueAtualProduto = parseInt(match[1]);
      document.getElementById("modalEstoqueAtual").textContent =
        `${estoqueAtualProduto} UN`;
    }
  }

  // Limpar input
  document.getElementById("novoEstoqueInput").value = "";
  document.getElementById("diferencaEstoque").textContent = "0 UN";

  // Definir data de hoje
  const hoje = new Date();
  const dataFormatada = hoje.toISOString().split("T")[0]; // Formato YYYY-MM-DD
  document.getElementById("dataEstoqueInput").value = dataFormatada;

  // Mostrar modal
  document.getElementById("modalEstoque").style.display = "flex";

  console.log("📦 Modal aberto:", {
    nome: nomeProdutoAtual,
    estoque: estoqueAtualProduto,
  });
}

function fecharModalEstoque() {
  document.getElementById("modalEstoque").style.display = "none";
}

function atualizarPreview() {
  const novoEstoque =
    parseInt(document.getElementById("novoEstoqueInput").value) || 0;
  const diferenca = novoEstoque - estoqueAtualProduto;
  const diferencaElement = document.getElementById("diferencaEstoque");

  if (diferenca > 0) {
    diferencaElement.textContent = `+${diferenca} UN`;
    diferencaElement.style.color = "#10b981";
  } else if (diferenca < 0) {
    diferencaElement.textContent = `${diferenca} UN`;
    diferencaElement.style.color = "#ef4444";
  } else {
    diferencaElement.textContent = "0 UN";
    diferencaElement.style.color = "#6b7280";
  }
}

async function salvarEstoque() {
  const novoEstoque = parseInt(
    document.getElementById("novoEstoqueInput").value,
  );
  const dataAjuste = document.getElementById("dataEstoqueInput").value;

  if (isNaN(novoEstoque) || novoEstoque < 0) {
    alert("⚠️ Por favor, digite um valor válido maior ou igual a zero.");
    return;
  }

  const diferenca = novoEstoque - estoqueAtualProduto;

  try {
    // Atualizar estoque via API
    if (produtoAtual && produtoAtual.id) {
      // Calcular operação baseada na diferença
      const quantidade = Math.abs(diferenca);
      const operacao = diferenca >= 0 ? "adicionar" : "reduzir";

      if (quantidade > 0) {
        await ApiClient.atualizarEstoque(
          produtoAtual.id,
          quantidade,
          operacao,
          dataAjuste,
        );
        console.log(
          `✅ Estoque atualizado via API: ${operacao} ${quantidade} unidades`,
        );
      } else {
        console.log("ℹ️ Nenhuma alteração no estoque");
      }
    } else {
      throw new Error("Produto não identificado");
    }

    // Atualizar na página
    const estoqueElement = document.getElementById("productStock");
    if (estoqueElement) {
      estoqueElement.textContent = `${novoEstoque} UN`;
    }

    // Fechar modal
    fecharModalEstoque();

    showToast("Estoque atualizado com sucesso", "success");

    // Atualizar valor local
    estoqueAtualProduto = novoEstoque;
  } catch (error) {
    console.error("Erro ao salvar estoque:", error);
    alert("❌ Erro ao atualizar estoque: " + error.message);
  }
}

// Event listeners
document.addEventListener("DOMContentLoaded", function () {
  // Preview em tempo real
  const inputEstoque = document.getElementById("novoEstoqueInput");
  if (inputEstoque) {
    inputEstoque.addEventListener("input", atualizarPreview);
  }

  // Fechar modal ao clicar fora
  const modal = document.getElementById("modalEstoque");
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        fecharModalEstoque();
      }
    });
  }
});

// ===== Imagem do Produto =====
function configurarImagemProduto() {
  console.log("📸 Configurando sistema de imagem do produto...");
  try {
    const editBtn = document.getElementById("productImageEditBtn");
    const inputFile = document.getElementById("productImageInput");
    const imgEl = document.getElementById("productImage");
    const box = document.getElementById("productImageBox");
    const placeholder = document.getElementById("productImagePlaceholderIcon");
    const actions = document.getElementById("productImageActions");
    const btnAlterar = document.getElementById("productImageAlterar");
    const btnExcluir = document.getElementById("productImageExcluir");

    console.log("🔍 Elementos encontrados:", {
      editBtn: !!editBtn,
      inputFile: !!inputFile,
      imgEl: !!imgEl,
      box: !!box,
      placeholder: !!placeholder,
      actions: !!actions,
      btnAlterar: !!btnAlterar,
      btnExcluir: !!btnExcluir,
    });

    if (!box || !inputFile || !editBtn || !imgEl) {
      console.error("❌ Elementos essenciais não encontrados!");
      return;
    }

    function openPicker() {
      inputFile.value = "";
      inputFile.click();
    }

    // edit button: if there's already an image, toggle actions; else open picker to add
    editBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      console.log(
        "🖊️ Lápis clicado - has-image:",
        box.classList.contains("has-image"),
      );
      if (box.classList.contains("has-image")) {
        // toggle visibility of actions
        if (actions) {
          actions.classList.toggle("show");
          const isShowing = actions.classList.contains("show");
          console.log("📋 Actions toggled - show:", isShowing);
          console.log("📋 Classes do actions:", actions.className);
          console.log(
            "📋 Style computado:",
            window.getComputedStyle(actions).display,
          );
        }
      } else {
        openPicker();
      }
    });

    // clicking placeholder icon opens picker when no image
    if (placeholder) {
      placeholder.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("📦 Placeholder clicado");
        if (!box.classList.contains("has-image")) {
          openPicker();
        } else if (actions) {
          actions.classList.toggle("show");
        }
      });
    }

    // Clicar na imagem também mostra os botões
    if (imgEl) {
      imgEl.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        console.log(
          "🖼️ Imagem clicada - has-image:",
          box.classList.contains("has-image"),
        );
        if (box.classList.contains("has-image") && actions) {
          actions.classList.toggle("show");
          console.log(
            "📋 Actions toggled via image - show:",
            actions.classList.contains("show"),
          );
        }
      });
    }

    // Clicar no box também mostra os botões quando tem imagem
    if (box) {
      box.addEventListener("click", function (e) {
        // Só ativar se clicar diretamente no box, não nos filhos
        if (
          e.target === box &&
          box.classList.contains("has-image") &&
          actions
        ) {
          e.preventDefault();
          e.stopPropagation();
          console.log("📦 Box clicado");
          actions.classList.toggle("show");
        }
      });
    }

    inputFile.addEventListener("change", function (ev) {
      const f = ev.target.files && ev.target.files[0];
      if (!f) return;

      // helper: aplicar preview otimista imediatamente
      function applyOptimisticPreview(dataUrl) {
        try {
          if (imgEl) {
            imgEl.src = dataUrl;
            imgEl.style.display = "block";
            imgEl.style.cursor = "pointer";
          }
          if (box) box.classList.add("has-image");
          if (placeholder) placeholder.style.display = "none";
        } catch (e) {
          console.debug("applyOptimisticPreview erro", e);
        }
      }

      // Redimensionar e comprimir para 800x800 e tentar manter abaixo de ~120KB (aceita até 200KB)
      resizeImageFile(f, 800, 800, 120)
        .then((dataUrl) => {
          // Mostrar preview imediato enquanto a imagem persiste em background
          applyOptimisticPreview(dataUrl);
          // salvar/atualizar no servidor em segundo plano
          setImagemProduto(dataUrl).catch((err) => {
            console.error("Falha ao salvar imagem (após preview):", err);
            mostrarNotificacao &&
              mostrarNotificacao("Erro ao salvar imagem", "error");
            // revert preview se falhar
            try {
              imgEl.style.display = "none";
              if (box) box.classList.remove("has-image");
              if (placeholder) placeholder.style.display = "block";
            } catch (e) {}
          });
          // after uploading, hide actions until user clicks pencil
          if (actions) actions.classList.remove("show");
        })
        .catch((err) => {
          console.debug("resizeImageFile erro, fallback para original", err);
          const reader = new FileReader();
          reader.onload = function (evt) {
            const data = evt.target.result;
            applyOptimisticPreview(data);
            setImagemProduto(data).catch((err) => {
              console.error("Falha ao salvar imagem (fallback):", err);
              mostrarNotificacao &&
                mostrarNotificacao("Erro ao salvar imagem", "error");
              try {
                imgEl.style.display = "none";
                if (box) box.classList.remove("has-image");
                if (placeholder) placeholder.style.display = "block";
              } catch (e) {}
            });
            if (actions) actions.classList.remove("show");
          };
          reader.readAsDataURL(f);
        });
    });

    if (btnAlterar) {
      btnAlterar.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("🔄 Botão Alterar clicado");
        openPicker();
        if (actions) actions.classList.remove("show");
      });
    }

    if (btnExcluir) {
      btnExcluir.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("🗑️ Botão Excluir clicado");
        excluirImagemProduto();
        if (actions) actions.classList.remove("show");
      });
    }

    // hide actions when clicking outside
    document.addEventListener("click", function (e) {
      if (
        actions &&
        actions.classList.contains("show") &&
        !box.contains(e.target)
      ) {
        actions.classList.remove("show");
      }
    });

    // atualizar UI conforme produtoAtual
    function refreshImageUI(prod) {
      try {
        if (!box) return;
        if (prod && prod.imagem) {
          // Se for base64, usar diretamente (preview temporário)
          if (prod.imagem.startsWith("data:image")) {
            imgEl.src = prod.imagem;
          } else {
            // Se for nome de arquivo, carregar do servidor
            const API_BASE =
              (window.__API_BASE__ && window.__API_BASE__.toString()) ||
              window.location.origin;
            imgEl.src = `${API_BASE}/uploads/${prod.imagem}`;
          }
          imgEl.style.display = "block";
          imgEl.style.cursor = "pointer";
          box.classList.add("has-image");
          if (actions) actions.classList.remove("show");
          if (placeholder)
            try {
              placeholder.style.display = "none";
            } catch (e) {}
        } else {
          imgEl.src = "";
          imgEl.style.display = "none";
          imgEl.style.cursor = "default";
          box.classList.remove("has-image");
          if (actions) actions.classList.remove("show");
          if (placeholder)
            try {
              placeholder.style.display = "block";
            } catch (e) {}
        }
      } catch (e) {
        console.debug("refreshImageUI erro", e);
      }
    }

    // expose to global for usage after loading product
    window.__refreshProductImage = refreshImageUI;
  } catch (err) {
    console.error("configurarImagemProduto falhou", err);
  }
}

async function setImagemProduto(dataUrl) {
  try {
    if (!produtoAtual || !produtoAtual.id) {
      showToast("Produto não identificado para salvar imagem", "error");
      return;
    }

    // Salvar imagem via API (backend vai processar e salvar arquivo)
    await ApiClient.atualizarProduto(produtoAtual.id, {
      ...produtoAtual,
      imagem: dataUrl, // Backend vai converter para arquivo
    });

    // Atualizar preview local
    produtoAtual.imagem = dataUrl;

    // atualizar UI
    try {
      if (window.__refreshProductImage)
        window.__refreshProductImage(produtoAtual);
    } catch (e) {}
    showToast("Imagem salva", "success", 1500);
  } catch (err) {
    console.error("setImagemProduto erro", err);
    showToast("Erro ao salvar imagem: " + err.message, "error");
  }
}

/**
 * Resize and compress image file to target dimensions and size (client-side)
 * Returns a Promise that resolves to a dataURL (JPEG).
 * Attempts to produce a file <= targetKB (best-effort), prefers 60-120KB range.
 */
function resizeImageFile(file, maxWidth, maxHeight, targetKB) {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onerror = (e) => reject(e);
      reader.onload = function (ev) {
        const img = new Image();
        img.onerror = function (e) {
          reject(new Error("Imagem inválida"));
        };
        img.onload = function () {
          // compute initial dimensions keeping aspect ratio
          let iw = img.naturalWidth || img.width;
          let ih = img.naturalHeight || img.height;
          if (!iw || !ih) return reject(new Error("Dimensões inválidas"));

          const clamp = (v, max) => Math.min(v, max);
          let scale = Math.min(
            1,
            clamp(maxWidth / iw, Infinity),
            clamp(maxHeight / ih, Infinity),
          );
          let width = Math.round(iw * scale);
          let height = Math.round(ih * scale);

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          // helper: draw with current width/height
          function drawAndCompress(q) {
            canvas.width = width;
            canvas.height = height;
            // clear
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // draw with smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, width, height);
            return new Promise((res) => {
              canvas.toBlob(
                function (blob) {
                  res(blob);
                },
                "image/jpeg",
                q,
              );
            });
          }

          // iterative quality/dimension reduction
          (async function attempt() {
            try {
              let quality = 0.92;
              const minQuality = 0.45;
              const targetBytes = (targetKB || 120) * 1024;
              let blob = await drawAndCompress(quality);

              // first try decreasing quality
              while (blob && blob.size > targetBytes && quality > minQuality) {
                quality -= 0.07;
                if (quality < minQuality) quality = minQuality;
                blob = await drawAndCompress(quality);
              }

              // if still too big, scale down dimensions and retry
              let reduceStep = 0;
              while (
                blob &&
                blob.size > targetBytes &&
                Math.max(width, height) > 200 &&
                reduceStep < 8
              ) {
                // reduce by 90%
                width = Math.max(100, Math.round(width * 0.9));
                height = Math.max(100, Math.round(height * 0.9));
                // reset quality a bit higher for new dimensions
                quality = Math.max(minQuality, quality);
                blob = await drawAndCompress(quality);
                // try decrease quality again
                while (
                  blob &&
                  blob.size > targetBytes &&
                  quality > minQuality
                ) {
                  quality -= 0.07;
                  if (quality < minQuality) quality = minQuality;
                  blob = await drawAndCompress(quality);
                }
                reduceStep++;
              }

              // final fallback: if still too big, accept best effort
              if (!blob) return reject(new Error("Erro ao comprimir imagem"));

              // convert blob to dataURL
              const fr = new FileReader();
              fr.onload = function (e) {
                resolve(e.target.result);
              };
              fr.onerror = function (e) {
                reject(e);
              };
              fr.readAsDataURL(blob);
            } catch (err) {
              reject(err);
            }
          })();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      reject(err);
    }
  });
}

async function excluirImagemProduto() {
  try {
    if (!produtoAtual || !produtoAtual.id) {
      showToast("Produto não identificado", "error");
      return;
    }

    // Remover imagem via API
    await ApiClient.atualizarProduto(produtoAtual.id, {
      ...produtoAtual,
      imagem: null,
    });

    // remover propriedade local
    try {
      delete produtoAtual.imagem;
    } catch (e) {}

    // atualizar UI
    try {
      if (window.__refreshProductImage)
        window.__refreshProductImage(produtoAtual);
    } catch (e) {}
    showToast("Imagem removida", "success", 1200);
  } catch (err) {
    console.error("excluirImagemProduto erro", err);
    showToast("Erro ao remover imagem: " + err.message, "error");
  }
}

// inicializar configuração de imagem na carga da página
document.addEventListener("DOMContentLoaded", function () {
  try {
    configurarImagemProduto();
  } catch (e) {
    console.debug("configurarImagemProduto falhou no DOMContentLoaded", e);
  }
});

console.log("📦 Sistema de ajuste de estoque carregado");

// ================================================================================================
// DROPDOWN ALTERAR TIPO (Produto/Serviço/Plano)
// ================================================================================================
(function setupDropdownAlterarTipo() {
  document.addEventListener("DOMContentLoaded", function () {
    const btnMais = document.getElementById("btnMais");
    const dropdown = document.getElementById("dropdownAlterarTipo");
    const btnProduto = document.getElementById("btnAlterarParaProduto");
    const btnServico = document.getElementById("btnAlterarParaServico");
    const btnPlano = document.getElementById("btnAlterarParaPlano");

    if (!btnMais || !dropdown || !btnProduto || !btnServico || !btnPlano) {
      console.warn("⚠️ Elementos do dropdown Alterar Tipo não encontrados");
      return;
    }

    // Toggle dropdown ao clicar em "Mais"
    btnMais.addEventListener("click", function (e) {
      e.stopPropagation();
      const isVisible = dropdown.style.display === "block";
      dropdown.style.display = isVisible ? "none" : "block";

      // Atualizar opções baseado no tipo atual - mostrar apenas tipos diferentes
      if (!isVisible && produtoAtual) {
        const tipoAtual = produtoAtual.tipo || "produto";

        // Mostrar todos por padrão
        btnProduto.style.display = "flex";
        btnServico.style.display = "flex";
        btnPlano.style.display = "flex";

        // Ocultar o tipo atual
        if (tipoAtual === "produto") {
          btnProduto.style.display = "none";
        } else if (tipoAtual === "servico") {
          btnServico.style.display = "none";
        } else if (tipoAtual === "plano") {
          btnPlano.style.display = "none";
        }
      }
    });

    // Fechar dropdown ao clicar fora
    document.addEventListener("click", function (e) {
      if (!btnMais.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = "none";
      }
    });

    // Hover effects
    [btnProduto, btnServico, btnPlano].forEach((btn) => {
      btn.addEventListener("mouseenter", function () {
        this.style.background = "#f5f5f5";
      });
      btn.addEventListener("mouseleave", function () {
        this.style.background = "transparent";
      });
    });

    // Alterar para Produto
    btnProduto.addEventListener("click", async function (e) {
      e.stopPropagation();
      dropdown.style.display = "none";

      if (!produtoAtual || !produtoAtual.id) {
        showToast("Nenhum produto carregado", "error");
        return;
      }

      if (produtoAtual.tipo === "produto") {
        return;
      }

      try {
        await ApiClient.atualizarProduto(produtoAtual.id, { tipo: "produto" });
        showToast("Item alterado para Produto com sucesso!", "success");

        // Atualizar localmente e recarregar
        produtoAtual.tipo = "produto";
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        console.error("Erro ao alterar tipo:", error);
        showToast("Erro ao alterar tipo: " + (error.message || error), "error");
      }
    });

    // Alterar para Serviço
    btnServico.addEventListener("click", async function (e) {
      e.stopPropagation();
      dropdown.style.display = "none";

      if (!produtoAtual || !produtoAtual.id) {
        showToast("Nenhum produto carregado", "error");
        return;
      }

      if (produtoAtual.tipo === "servico") {
        return;
      }

      try {
        await ApiClient.atualizarProduto(produtoAtual.id, { tipo: "servico" });
        showToast("Item alterado para Serviço com sucesso!", "success");

        // Atualizar localmente e recarregar
        produtoAtual.tipo = "servico";
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        console.error("Erro ao alterar tipo:", error);
        showToast("Erro ao alterar tipo: " + (error.message || error), "error");
      }
    });

    // Alterar para Plano
    btnPlano.addEventListener("click", async function (e) {
      e.stopPropagation();
      dropdown.style.display = "none";

      if (!produtoAtual || !produtoAtual.id) {
        showToast("Nenhum produto carregado", "error");
        return;
      }

      if (produtoAtual.tipo === "plano") {
        return;
      }

      try {
        await ApiClient.atualizarProduto(produtoAtual.id, { tipo: "plano" });
        showToast("Item alterado para Plano com sucesso!", "success");

        // Atualizar localmente e recarregar
        produtoAtual.tipo = "plano";
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        console.error("Erro ao alterar tipo:", error);
        showToast("Erro ao alterar tipo: " + (error.message || error), "error");
      }
    });

    console.log("✅ Dropdown Alterar Tipo configurado");
  });
})();

// ================================================================================================
// CALENDÁRIO COMPACTO PARA ABA DE ESTOQUE (Produto)
// ================================================================================================
window.calendarioProduto = window.calendarioProduto || {
  mes: new Date().getMonth(),
  ano: new Date().getFullYear(),
  dataInicio: null,
  dataFim: null,
  selecionandoInicio: true,
  hoverDate: null,
};

function ensureCalendarioProduto() {
  if (document.getElementById("calendarioPopupProduto")) return;

  // criar popup básico e inserir no body
  const popup = document.createElement("div");
  popup.id = "calendarioPopupProduto";
  popup.style.position = "absolute";
  popup.style.minWidth = "360px";
  popup.style.background = "#fff";
  popup.style.border = "1px solid #e6e9eb";
  popup.style.borderRadius = "8px";
  popup.style.boxShadow = "0 10px 30px rgba(0,0,0,0.12)";
  popup.style.padding = "12px";
  popup.style.display = "none";
  popup.style.zIndex = "1000500";

  popup.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
                    <button id="btnMesAnteriorProduto" type="button" style="background:none;border:none;cursor:pointer">‹</button>
                    <div id="mesAnoAtualProduto" style="font-weight:600"></div>
                    <button id="btnProximoMesProduto" type="button" style="background:none;border:none;cursor:pointer">›</button>
                </div>
                <div id="diasCalendarioProduto" style="display:flex;gap:12px;justify-content:center"></div>
                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px">
                    <button id="btnCalendarioCancelarProduto" type="button" class="btn btn-secondary">Cancelar</button>
                    <button id="btnCalendarioAplicarProduto" type="button" class="btn btn-primary">Aplicar</button>
                </div>
            `;

  document.body.appendChild(popup);

  // inicializar eventos
  configurarNavegacaoCalendarioProduto();
  configurarBotoesCalendarioProduto();
  gerarCalendarioProduto();
}

function configurarNavegacaoCalendarioProduto() {
  const btnAnt = document.getElementById("btnMesAnteriorProduto");
  const btnProx = document.getElementById("btnProximoMesProduto");
  if (btnAnt)
    btnAnt.addEventListener("click", function () {
      window.calendarioProduto.mes--;
      if (window.calendarioProduto.mes < 0) {
        window.calendarioProduto.mes = 11;
        window.calendarioProduto.ano--;
      }
      gerarCalendarioProduto();
    });
  if (btnProx)
    btnProx.addEventListener("click", function () {
      window.calendarioProduto.mes++;
      if (window.calendarioProduto.mes > 11) {
        window.calendarioProduto.mes = 0;
        window.calendarioProduto.ano++;
      }
      gerarCalendarioProduto();
    });
}

function configurarBotoesCalendarioProduto() {
  const btnCancelar = document.getElementById("btnCalendarioCancelarProduto");
  const btnAplicar = document.getElementById("btnCalendarioAplicarProduto");
  if (btnCancelar)
    btnCancelar.addEventListener("click", function () {
      fecharCalendarioProduto();
    });
  if (btnAplicar)
    btnAplicar.addEventListener("click", function () {
      aplicarDatasCalendarioProduto();
    });
}

function abrirCalendarioProduto(anchorEl) {
  ensureCalendarioProduto();
  const popup = document.getElementById("calendarioPopupProduto");
  if (!popup) return;

  // carregar datas atuais se existirem
  try {
    if (window.calendarioProduto.dataInicio) {
      window.calendarioProduto.dataInicio = new Date(
        window.calendarioProduto.dataInicio,
      );
    }
  } catch (e) {}
  try {
    if (window.calendarioProduto.dataFim) {
      window.calendarioProduto.dataFim = new Date(
        window.calendarioProduto.dataFim,
      );
    }
  } catch (e) {}
  window.calendarioProduto.selecionandoInicio = true;
  window.calendarioProduto.hoverDate = null;

  gerarCalendarioProduto();

  // posicionar abaixo do elemento anchorEl (ou centro da tela)
  requestAnimationFrame(() => {
    popup.style.display = "block";
    const rect = anchorEl
      ? anchorEl.getBoundingClientRect()
      : {
          left: window.innerWidth / 2,
          bottom: window.innerHeight / 2,
          width: 0,
        };
    const left = Math.max(
      12,
      Math.min(
        window.innerWidth - popup.offsetWidth - 12,
        Math.round(rect.left + rect.width / 2 - popup.offsetWidth / 2),
      ),
    );
    const top = Math.round(rect.bottom + window.pageYOffset + 8);
    popup.style.left = left + "px";
    popup.style.top = top + "px";
  });

  // adicionar listener para fechar ao clicar fora (adicionado com pequeno delay para não capturar o clique que abriu o calendário)
  setTimeout(() => {
    const clickOutsideHandler = function (ev) {
      try {
        const p = document.getElementById("calendarioPopupProduto");
        if (!p) return;
        if (p.contains(ev.target)) return; // clique dentro do popup
        if (anchorEl && anchorEl.contains && anchorEl.contains(ev.target))
          return; // clique no elemento que abriu
        // caso contrário, fechar e remover listener
        fecharCalendarioProduto();
        document.removeEventListener("click", clickOutsideHandler);
      } catch (e) {
        console.debug("clickOutsideHandler erro", e);
      }
    };
    document.addEventListener("click", clickOutsideHandler);
    // guardar referência para possível remoção direta
    popup.__clickOutsideHandler = clickOutsideHandler;
  }, 0);
}

function fecharCalendarioProduto() {
  const popup = document.getElementById("calendarioPopupProduto");
  if (popup) popup.style.display = "none";
  window.calendarioProduto.hoverDate = null;
  try {
    if (popup && popup.__clickOutsideHandler) {
      document.removeEventListener("click", popup.__clickOutsideHandler);
      delete popup.__clickOutsideHandler;
    }
  } catch (e) {
    console.debug("Erro removendo clickOutsideHandler", e);
  }
}

function gerarCalendarioProduto() {
  const mes = window.calendarioProduto.mes;
  const ano = window.calendarioProduto.ano;
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
  const mesAnoEl = document.getElementById("mesAnoAtualProduto");
  const diasCont = document.getElementById("diasCalendarioProduto");
  if (!mesAnoEl || !diasCont) return;
  diasCont.innerHTML = "";

  // mostrar cabeçalho combinando dois meses
  let mes1 = mes;
  let ano1 = ano;
  let mes2 = mes1 + 1;
  let ano2 = ano1;
  if (mes2 > 11) {
    mes2 = 0;
    ano2 = ano1 + 1;
  }
  mesAnoEl.textContent = `${nomesMeses[mes1]} ${ano1}  —  ${nomesMeses[mes2]} ${ano2}`;

  // wrapper para dois meses
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.gap = "18px";
  wrapper.style.justifyContent = "center";

  function gerarMes(m, a) {
    const container = document.createElement("div");
    container.className = "mes-container-produto";
    container.style.minWidth = "260px";

    const grid = document.createElement("div");
    grid.className = "mes-days-grid-produto";
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(7, 1fr)";
    grid.style.gap = "6px";

    const primeiroDia = new Date(a, m, 1);
    const ultimoDia = new Date(a, m + 1, 0);
    const diasAnterior = primeiroDia.getDay();
    const mesAnterior = new Date(a, m, 0);

    for (let i = diasAnterior - 1; i >= 0; i--) {
      const dia = mesAnterior.getDate() - i;
      criarDiaCalendarioProduto(dia, true, m - 1, a, grid);
    }

    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      criarDiaCalendarioProduto(dia, false, m, a, grid);
    }

    // preencher até 42 células
    const totalPreenchido = diasAnterior + ultimoDia.getDate();
    const restantes = Math.max(0, 42 - totalPreenchido);
    for (let d = 1; d <= restantes; d++) {
      criarDiaCalendarioProduto(d, true, m + 1, a, grid);
    }

    container.appendChild(grid);
    return container;
  }

  wrapper.appendChild(gerarMes(mes1, ano1));
  wrapper.appendChild(gerarMes(mes2, ano2));

  diasCont.appendChild(wrapper);
}

function criarDiaCalendarioProduto(numeroDia, outroMes, mes, ano, container) {
  const diasContainer =
    container || document.getElementById("diasCalendarioProduto");
  const diaElement = document.createElement("div");
  diaElement.className = "dia-produto";
  diaElement.textContent = numeroDia;
  diaElement.style.display = "flex";
  diaElement.style.alignItems = "center";
  diaElement.style.justifyContent = "center";
  diaElement.style.height = "28px";
  diaElement.style.cursor = "pointer";
  diaElement.style.borderRadius = "6px";

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

  if (outroMes) diaElement.style.opacity = "0.45";
  if (dataAtual.getTime() === hoje.getTime() && !outroMes) {
    diaElement.style.fontWeight = "600";
  }

  // destacar datas selecionadas
  if (
    window.calendarioProduto.dataInicio &&
    datasSaoIguaisProduto(dataAtual, window.calendarioProduto.dataInicio)
  ) {
    diaElement.style.background = "#2ecc71";
    diaElement.style.color = "#fff";
  }
  if (
    window.calendarioProduto.dataFim &&
    datasSaoIguaisProduto(dataAtual, window.calendarioProduto.dataFim)
  ) {
    diaElement.style.background = "#2ecc71";
    diaElement.style.color = "#fff";
  }

  // destacar período
  if (
    window.calendarioProduto.dataInicio &&
    window.calendarioProduto.dataFim &&
    dataAtual > window.calendarioProduto.dataInicio &&
    dataAtual < window.calendarioProduto.dataFim
  ) {
    diaElement.style.background = "#eaf8ed";
  }

  diaElement.dataset.dateIso = dataAtual.toISOString().slice(0, 10);

  diaElement.addEventListener("click", function (e) {
    e.stopPropagation();
    selecionarDataCalendarioProduto(dataAtual);
  });

  diaElement.addEventListener("mouseenter", function () {
    if (
      !window.calendarioProduto.selecionandoInicio &&
      window.calendarioProduto.dataInicio
    ) {
      window.calendarioProduto.hoverDate = dataAtual;
      atualizarHoverVisualProduto();
    }
  });

  diaElement.addEventListener("mouseleave", function () {
    if (window.calendarioProduto.hoverDate) {
      window.calendarioProduto.hoverDate = null;
      atualizarHoverVisualProduto();
    }
  });

  diasContainer.appendChild(diaElement);
}

function datasSaoIguaisProduto(a, b) {
  if (!a || !b) return false;
  const A = new Date(a);
  const B = new Date(b);
  A.setHours(0, 0, 0, 0);
  B.setHours(0, 0, 0, 0);
  return A.getTime() === B.getTime();
}

function atualizarHoverVisualProduto() {
  const dias = document.querySelectorAll("#diasCalendarioProduto .dia-produto");
  if (!dias || dias.length === 0) return;
  dias.forEach((d) => {
    d.classList.remove("hover-range");
    d.classList.remove("hover-target");
    d.style.background = d.style.background;
  });
  if (
    !window.calendarioProduto.dataInicio ||
    !window.calendarioProduto.hoverDate
  )
    return;

  const start =
    window.calendarioProduto.dataInicio.getTime() <=
    window.calendarioProduto.hoverDate.getTime()
      ? window.calendarioProduto.dataInicio
      : window.calendarioProduto.hoverDate;
  const end =
    window.calendarioProduto.dataInicio.getTime() >
    window.calendarioProduto.hoverDate.getTime()
      ? window.calendarioProduto.dataInicio
      : window.calendarioProduto.hoverDate;

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
      d.style.background = "#eaf8ed";
    }
    if (dt.getTime() === window.calendarioProduto.hoverDate.getTime()) {
      d.style.boxShadow = "inset 0 0 0 2px rgba(46,204,113,0.15)";
    }
  });
}

function sameDay(a, b) {
  if (!a || !b) return false;
  const A = new Date(a);
  const B = new Date(b);
  A.setHours(0, 0, 0, 0);
  B.setHours(0, 0, 0, 0);
  return A.getTime() === B.getTime();
}

function selecionarDataCalendarioProduto(data) {
  if (window.calendarioProduto.selecionandoInicio) {
    window.calendarioProduto.dataInicio = new Date(data);
    window.calendarioProduto.dataFim = null;
    window.calendarioProduto.selecionandoInicio = false;
  } else {
    if (data < window.calendarioProduto.dataInicio) {
      window.calendarioProduto.dataFim = window.calendarioProduto.dataInicio;
      window.calendarioProduto.dataInicio = new Date(data);
    } else {
      window.calendarioProduto.dataFim = new Date(data);
    }
    window.calendarioProduto.selecionandoInicio = true;
  }
  gerarCalendarioProduto();
  atualizarTextoPeriodoProduto();
  // se dataFim definida, fechar e aplicar automaticamente
  if (window.calendarioProduto.dataFim) {
    setTimeout(() => {
      aplicarDatasCalendarioProduto();
    }, 80);
  }
}

function atualizarTextoPeriodoProduto() {
  try {
    // procurar small do período dentro da aba Estoque de forma robusta
    let headerPeriodo = document.querySelector(
      "#estoque .faturamento-wrapper.estoque-wrapper small",
    );
    if (!headerPeriodo)
      headerPeriodo = document.querySelector(
        ".faturamento-wrapper.estoque-wrapper small",
      );
    if (!headerPeriodo)
      headerPeriodo = document.querySelector("#estoque small");
    if (!headerPeriodo) return;

    const di = window.calendarioProduto.dataInicio;
    const df =
      window.calendarioProduto.dataFim || window.calendarioProduto.dataInicio;
    if (!di) {
      headerPeriodo.innerHTML = `Período de Análise: <strong>${formatDateShort(addMonths(new Date(), -1))} - ${formatDateShort(new Date())}</strong>`;
    } else {
      headerPeriodo.innerHTML = `Período de Análise: <strong>${formatDateShort(di)} - ${formatDateShort(df)}</strong>`;
    }
    // marcar como clicável e fornecer dicas de acessibilidade
    try {
      headerPeriodo.classList.add("clickable-date");
      headerPeriodo.setAttribute("role", "button");
      headerPeriodo.setAttribute("tabindex", "0");
      // aplicar estilo inline como fallback caso regras de CSS anteriores anulem o cursor
      headerPeriodo.style.cursor = "pointer";
      headerPeriodo.style.userSelect = "text";
      if (!headerPeriodo.title)
        headerPeriodo.title = "Clique para alterar o período";

      // se houver <strong> interno, marcar também para garantir hover e cursor
      const strongInner = headerPeriodo.querySelector("strong");
      if (strongInner) {
        strongInner.classList.add("clickable-date");
        strongInner.style.cursor = "pointer";
        strongInner.setAttribute("role", "button");
        strongInner.setAttribute("tabindex", "0");
      }

      if (!headerPeriodo._keyboardListenerAdded) {
        headerPeriodo.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            abrirCalendarioProduto(headerPeriodo);
          }
        });
        headerPeriodo._keyboardListenerAdded = true;
      }
      // prevenir comportamento inesperado caso elemento esteja marcado contentEditable
      try {
        headerPeriodo.contentEditable = "false";
        if (strongInner) strongInner.contentEditable = "false";
      } catch (e) {}
    } catch (e) {
      console.debug("não foi possível marcar periodo como clicável", e);
    }
  } catch (e) {
    console.debug("atualizarTextoPeriodoProduto erro", e);
  }
}

function aplicarDatasCalendarioProduto() {
  // já atualizamos o texto; apenas fechar e re-renderizar a aba de estoque
  fecharCalendarioProduto();
  atualizarTextoPeriodoProduto();
  try {
    renderEstoque();
  } catch (e) {
    console.debug("Não foi possível re-renderizar estoque automaticamente", e);
  }
}

// abrir calendário ao clicar no texto do período — delegar evento global para quando a aba for renderizada
document.addEventListener("click", function (e) {
  // identificar se clicou no small do período dentro da aba de estoque
  const periodoSmall =
    e.target.closest &&
    e.target
      .closest(".faturamento-wrapper.estoque-wrapper")
      ?.querySelector("small");
  if (periodoSmall && periodoSmall.contains(e.target)) {
    e.stopPropagation();
    abrirCalendarioProduto(periodoSmall);
  }
});
