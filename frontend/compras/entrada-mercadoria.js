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
      sessionStorage.getItem("estadoSubmenus") || "{}",
    );
    estadoSubmenus[submenuId] = isOpen;
    sessionStorage.setItem("estadoSubmenus", JSON.stringify(estadoSubmenus));
  } catch (error) {
    console.error(error);
  }
}

function obterEstadoSubmenu(submenuId) {
  try {
    return (
      JSON.parse(sessionStorage.getItem("estadoSubmenus") || "{}")[submenuId] ||
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
    sessionStorage.removeItem("estadoSubmenus");
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

  console.log("🔍 DOMContentLoaded - verificando sessionStorage");

  // Se não tem openMapping=1 (fluxo normal de import XML), verificar se há entrada importada em sessão
  const params = new URLSearchParams(window.location.search || "");
  const shouldOpenMapping = params.get("openMapping") === "1";

  if (!shouldOpenMapping) {
    console.log(
      "ℹ️ openMapping não detectado - verificando entradaImported normal",
    );
    try {
      const raw = sessionStorage.getItem("entradaImported");
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          console.log("📦 entradaImported encontrado (fluxo normal)");
          // buscar candidatos e abrir o modal (não remover entradaImported aqui)
          try {
            findCandidatesForItems(parsed.items || [])
              .then((cands) => {
                try {
                  showProductMappingModal(parsed, cands || []);
                } catch (e) {
                  console.error("Erro abrindo modal de mapeamento (auto):", e);
                }
              })
              .catch((e) => {
                try {
                  showProductMappingModal(parsed, []);
                } catch (e) {
                  console.error(
                    "Erro abrindo modal de mapeamento (fallback):",
                    e,
                  );
                }
              });
          } catch (e) {
            try {
              showProductMappingModal(parsed, []);
            } catch (e) {}
          }
        } catch (e) {
          console.debug("entradaImported parse failed", e);
        }
      }
    } catch (e) {}
  }
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
// FUNCIONALIDADES DA PÁGINA DE ENTRADA DE MERCADORIA
// ========================================

// Dados de entradas (vazio inicialmente)
let entradasData = [];

let currentPage = 1;
let itemsPerPage = 50;
let searchTerm = "";
let currentStatus = "todas";
let filteredData = [...entradasData];
// Helper: extrai nome legível do campo fornecedor que pode ser string ou objeto
function obterNomeFornecedor(fornecedor) {
  try {
    if (!fornecedor && fornecedor !== 0) return "-";
    if (typeof fornecedor === "string") return fornecedor;
    if (typeof fornecedor === "number") return String(fornecedor);
    // objeto: tentar campos comuns
    if (typeof fornecedor === "object") {
      return (
        fornecedor.nome ||
        fornecedor.xNome ||
        fornecedor.razaoSocial ||
        fornecedor.fantasia ||
        fornecedor.nomeFantasia ||
        fornecedor.displayName ||
        fornecedor.companyName ||
        fornecedor.nomeFornecedor ||
        JSON.stringify(fornecedor)
          .replace(/[{}\"]+/g, "")
          .split(",")[0] ||
        "-"
      );
    }
  } catch (e) {
    /* fallback */
  }
  return "-";
}
// Armazena consultas Sefaz realizadas durante a sessão (in-memory)
let sefazConsultas = [];

async function inicializarEntradaMercadoria() {
  console.log("📦 Inicializando página de Entrada de Mercadoria");
  console.log("📊 entradasData inicial:", entradasData.length, "entradas");

  // Carregar entradas do banco de dados
  await carregarRascunhos();

  console.log(
    "📊 entradasData após carregar entradas:",
    entradasData.length,
    "entradas",
  );
  console.log("📋 Dados:", entradasData);

  // Se houver uma entrada importada na sessão (ex. import XML), mostrá-la temporariamente
  try {
    const rawImported = sessionStorage.getItem("entradaImported");
    if (rawImported) {
      try {
        const imported = JSON.parse(rawImported);
        // construir um objeto que combine com o formato usado na listagem
        const tempId = "imported-" + (imported.numero || Date.now());
        const entradaTemp = {
          id: tempId,
          fornecedor:
            obterNomeFornecedor(imported.fornecedor) ||
            imported.fornecedorNome ||
            "-",
          numero: imported.numero || imported.serie || "-",
          emissao: imported.dataEmissao
            ? formatarData(imported.dataEmissao)
            : imported.dataEmissao || "-",
          valor:
            imported.totals && imported.totals.vProd
              ? Number(imported.totals.vProd)
              : imported.valorTotal || 0,
          situacao: "pendente",
          relProdutos: imported.items && imported.items.length > 0 ? "✓" : "-",
          _importedData: imported,
        };
        // evitar duplicação
        const exists = entradasData.find(
          (e) =>
            e.id === entradaTemp.id ||
            (e.numero &&
              e.numero === entradaTemp.numero &&
              e.fornecedor === entradaTemp.fornecedor),
        );
        if (!exists) {
          entradasData.unshift(entradaTemp);
          filteredData = [...entradasData];
          console.log(
            "📥 Entrada importada (temporária) adicionada à lista:",
            entradaTemp,
          );
        } else {
          console.log("⚠️ Entrada importada já presente na lista, ignorando");
        }
      } catch (e) {
        console.debug("entradaImported parse failed", e);
      }
    }
  } catch (e) {
    console.debug("Erro ao verificar entradaImported na sessão", e);
  }

  // Se houve uma entrada salva recentemente (finalizada), injetá-la para garantir visibilidade
  try {
    const rawSaved = sessionStorage.getItem("injectedSavedEntrada");
    if (rawSaved) {
      try {
        const saved = JSON.parse(rawSaved);
        const tempId = saved.id || "saved-" + Date.now();
        const entradaTemp = {
          id: tempId,
          fornecedor:
            obterNomeFornecedor(saved.fornecedor) ||
            saved.fornecedorNome ||
            "-",
          numero: saved.numero || saved.serie || "-",
          emissao: saved.dataEmissao
            ? formatarData(saved.dataEmissao)
            : saved.dataEmissao || "-",
          valor: saved.valorTotal || saved.totalProdutos || 0,
          situacao: saved.situacao || "concluido",
          relProdutos: saved.itens && saved.itens.length > 0 ? "✓" : "-",
          _data: saved,
        };
        const exists = entradasData.find(
          (e) =>
            String(e.id) === String(entradaTemp.id) ||
            (e.numero &&
              e.numero === entradaTemp.numero &&
              e.fornecedor === entradaTemp.fornecedor),
        );
        if (!exists) {
          // inserir no topo
          entradasData.unshift(entradaTemp);
          filteredData = [...entradasData];
          console.log(
            "📥 Entrada finalizada (injetada) adicionada à lista:",
            entradaTemp,
          );
        } else {
          // se existe, atualizar o registro existente
          entradasData = entradasData.map((e) =>
            String(e.id) === String(entradaTemp.id) ? entradaTemp : e,
          );
          filteredData = [...entradasData];
          console.log(
            "♻️ Entrada finalizada já presente — atualizada na lista",
          );
        }
      } catch (e) {
        console.debug("injectedSavedEntrada parse failed", e);
      }
      try {
        sessionStorage.removeItem("injectedSavedEntrada");
      } catch (e) {}
    }
  } catch (e) {
    console.debug("Erro ao aplicar injectedSavedEntrada", e);
  }
  // Configurar event listeners
  configurarEventListenersEntrada();

  // Renderizar tabela
  renderizarTabelaEntradas();

  // Atualizar paginação
  atualizarPaginacaoEntrada();

  console.log("✅ Página de Entrada de Mercadoria inicializada");
}

// Função global para acessar nota consultada via modal Sefaz
window.acessarNotaConsultada = async function (entradaId, isTemp) {
  console.log(
    "📋 Acessando nota consultada:",
    entradaId,
    "temporária:",
    isTemp,
  );

  // Fechar modal Sefaz
  const modalSefaz = document.getElementById("consultaSefazModal");
  if (modalSefaz) {
    modalSefaz.style.display = "none";
    modalSefaz.remove();
  }

  if (isTemp) {
    // Se é temporária, buscar na lista e abrir modal de mapeamento
    const entrada = entradasData.find((e) => e.id === entradaId);
    if (entrada && entrada._parsed) {
      console.log("🔄 Abrindo modal de mapeamento para nota temporária...");
      const parsed = entrada._parsed;
      const candidates = await window.__findCandidatesForItems(
        parsed.items || [],
      );
      window.__showProductMappingModal(parsed, candidates);
    } else {
      alert(
        "Entrada temporária não encontrada. Tente importar o XML novamente.",
      );
    }
  } else {
    // Obter dados da nota do resultado da última consulta Sefaz
    const bodyResult = window.__sefazLastConsultaBody;
    const dbItens =
      (bodyResult && (bodyResult.itens || bodyResult.items)) || [];

    if (
      dbItens.length > 0 &&
      typeof window.__findCandidatesForItems === "function" &&
      typeof window.__showProductMappingModal === "function"
    ) {
      // Normalizar itens do DB para o formato esperado pelo modal de mapeamento
      const parsedFromDB = {
        fornecedor:
          bodyResult.fornecedor && typeof bodyResult.fornecedor === "object"
            ? bodyResult.fornecedor.nome || ""
            : bodyResult.fornecedor || "",
        numero: bodyResult.numero || "",
        dataEmissao: bodyResult.dataEmissao || "",
        chaveAcesso: bodyResult.chaveAcesso || "",
        valorTotal: bodyResult.valorTotal || 0,
        items: dbItens.map((it) => ({
          codigo: it.codigo || it.cProd || "",
          descricao: it.descricao || it.xProd || it.nome || "",
          quantidade:
            Number(it.quantidade || it.qtd || it.qty || it.qCom || 1) || 1,
          unitario: Number(it.unitario || it.vUnCom || it.preco || 0) || 0,
          total: Number(it.total || it.vProd || 0) || 0,
          ncm: it.ncm || it.NCM || "",
          lote: it.lote || "",
          validade: it.validade || "",
          matchedId: it.matchedId || it.produtoSistemaId || null,
        })),
        _entradaId: entradaId,
      };
      console.log(
        "🔄 Abrindo modal de mapeamento para nota do banco:",
        parsedFromDB,
      );
      try {
        const candidates = await window.__findCandidatesForItems(
          parsedFromDB.items,
        );
        window.__showProductMappingModal(parsedFromDB, candidates);
      } catch (e) {
        console.warn("Erro abrindo modal de mapeamento:", e);
        window.location.href = `./entrada-manual.html?id=${entradaId}`;
      }
    } else {
      // Sem itens disponíveis: abrir diretamente na entrada-manual
      window.location.href = `./entrada-manual.html?id=${entradaId}`;
    }
  }
};

// Cria um rascunho no servidor a partir do objeto parsed (retorna o objeto criado ou null)
async function criarRascunhoNoServidor(parsed) {
  try {
    const payload = Object.assign({}, parsed, {
      rascunho: true,
      situacao: "pendente",
    });
    // Garantir que itens sejam enviados no campo correto do modelo DB
    payload.itens = payload.itens || payload.items || [];
    // Normalizar itens: garantir que totalBruto/totalAquisicao/fator/entEstoque estejam presentes
    if (Array.isArray(payload.itens)) {
      payload.itens = payload.itens.map(function (it) {
        const quantidade = Number(it.quantidade || it.qCom || 0) || 0;
        const unitario = Number(it.unitario || it.vUnCom || it.preco || 0) || 0;
        const total =
          Number(it.totalBruto || it.total || it.vProd || 0) ||
          quantidade * unitario ||
          0;
        return Object.assign({}, it, {
          quantidade: quantidade,
          unitario: unitario,
          fator: Number(it.fator) || 1,
          entEstoque: Number(it.entEstoque) || quantidade,
          totalBruto: total,
          totalAquisicao: Number(it.totalAquisicao) || total,
        });
      });
    }
    // Normalizar fornecedor: evitar enviar objeto (que vira "[object Object]" no DB)
    try {
      if (payload.fornecedor && typeof payload.fornecedor === "object") {
        payload.fornecedor =
          payload.fornecedor.nome ||
          payload.fornecedor.xNome ||
          payload.fornecedor.razaoSocial ||
          payload.fornecedor.fantasia ||
          payload.fornecedor.nomeFantasia ||
          payload.fornecedor.displayName ||
          payload.fornecedor.companyName ||
          JSON.stringify(payload.fornecedor);
      }
    } catch (e) {
      /* noop */
    }
    const res = await fetch("/api/entrada/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(
        "criarRascunhoNoServidor: resposta não ok",
        res.status,
        res.statusText,
      );
      return null;
    }
    const body = await res.json().catch(() => null);
    // Normalizar formatos de resposta do servidor:
    // - { id: ..., ... }
    // - { saved: { id: ..., ... } }
    // - { ok: true, saved: { ... } }
    if (!body) return null;
    if (body.saved && typeof body.saved === "object") return body.saved;
    if (body.data && typeof body.data === "object") return body.data;
    if (body.id) return body;
    // algumas APIs retornam { ok: true, saved: {...} }
    if (body.ok && body.saved) return body.saved;
    // fallback: retornar body inteiro
    return body;
  } catch (e) {
    console.warn("criarRascunhoNoServidor erro", e);
    return null;
  }
}

async function carregarRascunhos() {
  try {
    console.log("🔍 Carregando entradas do banco de dados...");

    const res = await fetch("/api/entrada/manual");

    if (!res.ok) {
      console.error("❌ Erro ao carregar entradas:", res.statusText);
      return;
    }

    let entradas = await res.json();
    // Normalizar formatos comuns: array, { rows: [...] }, { data: [...] }
    try {
      if (!Array.isArray(entradas)) {
        if (entradas && Array.isArray(entradas.rows)) entradas = entradas.rows;
        else if (entradas && Array.isArray(entradas.data))
          entradas = entradas.data;
        else if (entradas && typeof entradas === "object") {
          // às vezes o backend retorna um objeto único
          entradas = [entradas];
        } else {
          entradas = [];
        }
      }
    } catch (e) {
      entradas = [];
    }

    console.log(
      `📦 ${entradas.length} entrada(s) encontrada(s) no banco`,
      entradas,
    );

    // Adicionar entradas à lista
    entradas.forEach((entrada) => {
      // Calcular valor a partir dos itens se valorTotal/totalProdutos estiverem zerados
      let valorCalculado =
        Number(entrada.valorTotal) || Number(entrada.totalProdutos) || 0;
      if (
        !valorCalculado &&
        Array.isArray(entrada.itens) &&
        entrada.itens.length > 0
      ) {
        valorCalculado = entrada.itens.reduce((sum, it) => {
          return (
            sum +
            (Number(it.totalBruto) || Number(it.total) || Number(it.vProd) || 0)
          );
        }, 0);
      }

      const entradaFormatada = {
        id: entrada.id,
        fornecedor:
          obterNomeFornecedor(entrada.fornecedor) ||
          entrada.fornecedorNome ||
          "-",
        numero: entrada.numero || "-",
        emissao: entrada.dataEmissao ? formatarData(entrada.dataEmissao) : "-",
        valor: valorCalculado,
        situacao: entrada.situacao || "pendente",
        relProdutos: entrada.itens && entrada.itens.length > 0 ? "✓" : "-",
        _data: entrada,
      };

      entradasData.push(entradaFormatada);
    });

    // Atualizar dados filtrados
    filteredData = [...entradasData];
    console.log(`📊 Total de entradas carregadas: ${entradasData.length}`);
  } catch (e) {
    console.error("❌ Erro ao carregar entradas:", e);
  }
}

function formatarData(dataISO) {
  if (!dataISO) return "-";
  try {
    const date = new Date(dataISO);
    const dia = String(date.getDate()).padStart(2, "0");
    const mes = String(date.getMonth() + 1).padStart(2, "0");
    const ano = date.getFullYear();
    return `${dia}/${mes}/${ano}`;
  } catch (e) {
    return dataISO;
  }
}

function configurarEventListenersEntrada() {
  const btnImportarXML = document.getElementById("btnImportarXML");
  const btnConsultarSefaz = document.getElementById("btnConsultarSefaz");
  const btnConsultarSefaz2 = document.getElementById("btnConsultarSefaz2");
  const btnEntradaManual = document.getElementById("btnEntradaManual");
  const btnConfiguracoes = document.getElementById("btnConfiguracoes");
  const btnPesquisar = document.getElementById("btnPesquisar");
  const searchInput = document.getElementById("searchEntrada");
  const selectAll = document.getElementById("selectAll");
  const tabButtons = document.querySelectorAll(".tab-button-entrada");
  const btnPrevPage = document.getElementById("btnPrevPage");
  const btnNextPage = document.getElementById("btnNextPage");
  const btnIgnorar = document.getElementById("btnIgnorar");
  const btnDANFE = document.getElementById("btnDANFE");
  const btnDownloadXML = document.getElementById("btnDownloadXML");
  const btnEspelho = document.getElementById("btnEspelho");

  if (btnImportarXML) {
    btnImportarXML.addEventListener("click", () => {
      try {
        // criar input de arquivo oculto se não existir
        let fileInput = document.getElementById("entradaImportFile");
        if (!fileInput) {
          fileInput = document.createElement("input");
          fileInput.type = "file";
          fileInput.accept = ".xml,application/xml,text/xml";
          fileInput.id = "entradaImportFile";
          fileInput.style.display = "none";
          document.body.appendChild(fileInput);
          fileInput.addEventListener("change", async function () {
            const f = this.files && this.files[0];
            if (!f) return;
            const text = await f.text();
            // tentar parsear o XML no cliente (mais rápido e evita idas desnecessárias ao servidor)
            try {
              const parsed = parseNFeXml(text);
              if (parsed && parsed.items && parsed.items.length > 0) {
                // VALIDAÇÃO ANTI-DUPLICAÇÃO: verificar se já existe entrada com mesmo número+chave
                try {
                  const checkRes = await fetch("/api/entrada/manual");
                  if (checkRes.ok) {
                    const entradas = await checkRes.json();
                    const numero = parsed.nNF || parsed.numero || "";
                    const chave = parsed.chNFe || parsed.chaveAcesso || "";

                    const duplicada = entradas.find((e) => {
                      const numMatch =
                        e.numero &&
                        numero &&
                        String(e.numero).trim() === String(numero).trim();
                      const chaveMatch =
                        e.chaveAcesso &&
                        chave &&
                        String(e.chaveAcesso).trim() === String(chave).trim();
                      return numMatch || (chave && chaveMatch);
                    });

                    if (duplicada) {
                      showEntradaToast(
                        `⚠️ Esta nota fiscal (${numero}) já foi importada! Abrindo entrada existente...`,
                        5000,
                      );
                      setTimeout(() => {
                        window.location.href =
                          "./entrada-manual.html?id=" +
                          encodeURIComponent(duplicada.id);
                      }, 1500);
                      return;
                    }
                  }
                } catch (err) {
                  console.warn("Erro ao verificar duplicação:", err);
                }

                // checar correspondências para cada item
                try {
                  const candidates = await findCandidatesForItems(parsed.items);
                  const anyMissing = candidates.some(
                    (arr) => !arr || arr.length === 0,
                  );
                  if (anyMissing) {
                    // abrir modal para relacionar produtos
                    showProductMappingModal(parsed, candidates);
                    return;
                  } else {
                    // todos com correspondência -> substituir dados pelos primeiros candidatos e redirecionar
                    for (let i = 0; i < parsed.items.length; i++) {
                      const cand = candidates[i] && candidates[i][0];
                      if (cand) {
                        parsed.items[i].matched = cand;
                        parsed.items[i].matchedId = cand.id;
                        parsed.items[i].unitario =
                          parsed.items[i].unitario || Number(cand.preco) || 0;
                      }
                    }
                    // tentar criar rascunho no servidor para que apareça imediatamente na listagem
                    try {
                      const created = await criarRascunhoNoServidor(parsed);
                      if (created && created.id) {
                        window.location.href =
                          "./entrada-manual.html?id=" +
                          encodeURIComponent(created.id);
                        return;
                      } else {
                        showEntradaToast(
                          "Erro ao salvar rascunho no servidor. Tente novamente.",
                        );
                        return;
                      }
                    } catch (e) {
                      console.warn("criarRascunhoNoServidor falhou", e);
                    }
                    // fallback para sessionStorage se servidor não responder
                    try {
                      sessionStorage.setItem(
                        "entradaImported",
                        JSON.stringify(parsed),
                      );
                    } catch (e) {
                      console.warn("sessionStorage set failed", e);
                    }
                    window.location.href = "./entrada-manual.html";
                    return;
                  }
                } catch (err) {
                  console.warn("findCandidates failed", err);
                }
              }
            } catch (err) {
              console.warn(
                "Parsing client-side falhou, tentando servidor",
                err,
              );
            }

            // fallback: enviar ao servidor para parsing/validação
            try {
              const res = await fetch("/api/entrada/import-xml", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename: f.name, content: text }),
              });
              const body = await res.json().catch(() => null);
              if (!res.ok) {
                showEntradaToast(
                  "Erro ao importar XML: " +
                    (body && body.error ? body.error : res.statusText),
                );
                return;
              }
              // servidor retornou JSON parseado -> armazenar e redirecionar apenas se trouxer itens
              if (body && Array.isArray(body.items) && body.items.length > 0) {
                // tentar criar rascunho no servidor usando o objeto retornado
                try {
                  const created = await criarRascunhoNoServidor(body);
                  if (created && created.id) {
                    window.location.href =
                      "./entrada-manual.html?id=" +
                      encodeURIComponent(created.id);
                    return;
                  }
                } catch (e) {
                  console.warn("criarRascunhoNoServidor falhou (fallback)", e);
                }
                showEntradaToast(
                  "XML importado, mas não foi possível salvar no servidor. Verifique o servidor e tente novamente.",
                );
                return;
                return;
              }
              // servidor não retornou items - avisar e mostrar mensagem retornada
              const msg =
                (body && (body.message || (body.ok && JSON.stringify(body)))) ||
                "XML importado, mas nenhum item foi extraído pelo servidor.";
              showEntradaToast(msg);
            } catch (err) {
              console.error("import xml error", err);
              showEntradaToast(
                "Erro ao enviar XML: " +
                  (err && err.message ? err.message : String(err)),
              );
            }

            // limpar input
            this.value = "";
          });
        }
        fileInput.click();
      } catch (err) {
        console.error("btnImportarXML handler", err);
        alert("Erro interno");
      }
    });
  }

  // toast helper específico desta página (não depende de entrada-manual.js)
  function showEntradaToast(message) {
    try {
      let c = document.querySelector(".entrada-toast-container");
      if (!c) {
        c = document.createElement("div");
        c.className = "entrada-toast-container";
        c.style.position = "fixed";
        c.style.top = "18px";
        c.style.right = "18px";
        c.style.zIndex = "99999";
        document.body.appendChild(c);
      }
      const t = document.createElement("div");
      t.className = "entrada-toast";
      t.textContent = message;
      t.style.background = "#ffe58a";
      t.style.color = "#222";
      t.style.padding = "10px 14px";
      t.style.borderRadius = "8px";
      t.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
      t.style.marginTop = "8px";
      t.style.opacity = "0";
      t.style.transition = "opacity .18s,transform .18s";
      c.appendChild(t);
      requestAnimationFrame(() => {
        t.style.opacity = "1";
        t.style.transform = "none";
      });
      setTimeout(() => {
        t.style.opacity = "0";
        setTimeout(() => {
          try {
            t.remove();
          } catch (e) {}
        }, 220);
      }, 7000);
    } catch (e) {
      console.warn("showEntradaToast error", e);
    }
  }

  // Toast azul informativo (canto superior direito)
  function showInfoToast(message, duration) {
    try {
      duration = typeof duration === "number" ? duration : 4200;
      let c = document.querySelector(".info-toast-container");
      if (!c) {
        c = document.createElement("div");
        c.className = "info-toast-container";
        c.style.position = "fixed";
        c.style.top = "18px";
        c.style.right = "18px";
        c.style.zIndex = "999999999";
        c.style.display = "flex";
        c.style.flexDirection = "column";
        c.style.gap = "10px";
        document.body.appendChild(c);
      }
      const t = document.createElement("div");
      t.className = "info-toast";
      t.textContent = message;
      t.style.background = "linear-gradient(180deg,#e6f0ff,#d7eaff)";
      t.style.color = "#05386b";
      t.style.padding = "10px 14px";
      t.style.borderRadius = "8px";
      t.style.boxShadow = "0 8px 24px rgba(2,6,23,0.12)";
      t.style.border = "1px solid rgba(3,102,214,0.12)";
      t.style.marginTop = "8px";
      t.style.opacity = "0";
      t.style.transition = "opacity .18s,transform .18s";
      c.appendChild(t);
      requestAnimationFrame(() => {
        t.style.opacity = "1";
        t.style.transform = "none";
      });
      setTimeout(() => {
        t.style.opacity = "0";
        setTimeout(() => {
          try {
            t.remove();
          } catch (e) {}
        }, 220);
      }, duration);
    } catch (e) {
      console.warn("showInfoToast error", e);
    }
  }

  // Modal de confirmação centralizado (retorna Promise<boolean>)
  function showConfirmModal(message, okLabel = "Ok", cancelLabel = "Cancelar") {
    return new Promise((resolve) => {
      try {
        // remover modal anterior se existir
        const prev = document.getElementById("entradaConfirmModal");
        if (prev) prev.remove();
        const overlay = document.createElement("div");
        overlay.id = "entradaConfirmModal";
        overlay.className = "entrada-confirm-modal";
        overlay.style.position = "fixed";
        overlay.style.inset = "0";
        overlay.style.display = "flex";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.background = "rgba(0,0,0,0.36)";
        overlay.style.zIndex = "9999999";

        const box = document.createElement("div");
        box.style.maxWidth = "520px";
        box.style.width = "88%";
        box.style.background = "#fff";
        box.style.borderRadius = "10px";
        box.style.padding = "18px";
        box.style.boxShadow = "0 12px 36px rgba(2,6,23,0.24)";
        box.style.display = "flex";
        box.style.flexDirection = "column";

        const txt = document.createElement("div");
        txt.style.marginBottom = "14px";
        txt.style.color = "#222";
        txt.style.fontSize = "15px";
        txt.textContent = message || "";

        const footer = document.createElement("div");
        footer.style.display = "flex";
        footer.style.justifyContent = "flex-end";
        footer.style.gap = "10px";
        const btnCancel = document.createElement("button");
        btnCancel.textContent = cancelLabel;
        btnCancel.className = "btn-secondary";
        const btnOk = document.createElement("button");
        btnOk.textContent = okLabel;
        btnOk.className = "btn-primary";
        // estilos mínimos para parecer com o sistema
        [btnCancel, btnOk].forEach((b) => {
          b.style.cursor = "pointer";
          b.style.padding = "8px 14px";
          b.style.borderRadius = "8px";
          b.style.border = "none";
          b.style.fontWeight = "600";
        });
        btnCancel.style.background = "#fff";
        btnCancel.style.color = "#495057";
        btnCancel.style.border = "1px solid #ced4da";
        btnOk.style.background = "#0d6efd";
        btnOk.style.color = "#fff";
        btnOk.style.boxShadow = "0 6px 18px rgba(13,110,253,0.12)";

        footer.appendChild(btnCancel);
        footer.appendChild(btnOk);
        box.appendChild(txt);
        box.appendChild(footer);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        function cleanup() {
          try {
            overlay.remove();
          } catch (e) {}
          document.removeEventListener("keydown", kd);
        }
        btnCancel.addEventListener("click", function () {
          cleanup();
          resolve(false);
        });
        btnOk.addEventListener("click", function () {
          cleanup();
          resolve(true);
        });
        overlay.addEventListener("click", function (e) {
          if (e.target === overlay) {
            cleanup();
            resolve(false);
          }
        });
        function kd(e) {
          if (e.key === "Escape") {
            cleanup();
            resolve(false);
          }
          if (e.key === "Enter") {
            cleanup();
            resolve(true);
          }
        }
        document.addEventListener("keydown", kd);
        // foco no botão ok por padrão
        setTimeout(() => {
          try {
            btnOk.focus();
          } catch (e) {}
        }, 50);
      } catch (e) {
        console.error("showConfirmModal error", e);
        resolve(false);
      }
    });
  }

  // Função utilitária para tentar extrair dados de uma NFe XML
  function parseNFeXml(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "application/xml");
    // detectar erros básicos de parse
    if (doc.querySelector("parsererror")) throw new Error("XML inválido");

    // localizar <infNFe>
    let inf = doc.getElementsByTagName("infNFe")[0];
    if (!inf) {
      // talvez esteja dentro de NFe > infNFe
      const NFe = doc.getElementsByTagName("NFe")[0];
      if (NFe) inf = NFe.getElementsByTagName("infNFe")[0];
    }

    const getText = (el, tag) => {
      try {
        const t = (el.getElementsByTagName(tag)[0] || {}).textContent || "";
        return t.trim();
      } catch (e) {
        return "";
      }
    };

    const result = { fornecedor: {}, items: [], totals: {} };

    // chave de acesso: pode estar como atributo Id em infNFe (ex: Id="NFe..."), ou em tag chNFe
    try {
      const idAttr = inf && inf.getAttribute && inf.getAttribute("Id");
      if (idAttr) result.chaveAcesso = String(idAttr).replace(/^NFe/i, "");
    } catch (e) {}
    if (!result.chaveAcesso) {
      result.chaveAcesso = getText(doc, "chNFe") || "";
    }

    const ide = inf
      ? inf.getElementsByTagName("ide")[0] || {}
      : doc.getElementsByTagName("ide")[0] || {};
    result.numero = getText(ide, "nNF") || "";
    result.serie = getText(ide, "serie") || "";
    result.dataEmissao = getText(ide, "dhEmi") || getText(ide, "dEmi") || "";

    const emit = inf
      ? inf.getElementsByTagName("emit")[0] || {}
      : doc.getElementsByTagName("emit")[0] || {};
    result.fornecedor = {
      cnpj: getText(emit, "CNPJ") || getText(emit, "CPF") || "",
      nome: getText(emit, "xNome") || getText(emit, "xFant") || "",
    };

    // itens: tags <det>
    const dets = inf
      ? inf.getElementsByTagName("det")
      : doc.getElementsByTagName("det");
    for (let i = 0; i < dets.length; i++) {
      try {
        const det = dets[i];
        const prod = det.getElementsByTagName("prod")[0] || {};
        const cProd = getText(prod, "cProd") || "";
        const xProd = getText(prod, "xProd") || "";
        const qCom =
          parseFloat(
            (getText(prod, "qCom") || getText(prod, "qtd") || "").replace(
              ",",
              ".",
            ) || "0",
          ) || 0;
        const vUnCom =
          parseFloat(
            (
              getText(prod, "vUnCom") ||
              getText(prod, "vUn") ||
              getText(prod, "vUnComercial") ||
              ""
            ).replace(",", ".") || "0",
          ) || 0;
        const vProd =
          parseFloat((getText(prod, "vProd") || "").replace(",", ".") || "0") ||
          qCom * vUnCom;

        // tentar extrair data de validade a partir de locais comuns
        let validade = "";
        let lote = "";

        // 1) tags <med> (usado para medicamentos): dFab, dVal, dVenc, nLote
        const med = det.getElementsByTagName("med")[0];
        if (med) {
          validade =
            getText(med, "dVal") ||
            getText(med, "dVenc") ||
            getText(med, "dFab") ||
            "";
          lote = getText(med, "nLote") || "";
        }

        // 1b) tags <rastro> (rastreabilidade — padrão NF-e para lote/validade em rações, alimentos, etc.)
        if (!validade) {
          const rastros = prod.getElementsByTagName
            ? prod.getElementsByTagName("rastro")
            : [];
          for (let r = 0; r < rastros.length; r++) {
            const rastro = rastros[r];
            const dVal =
              getText(rastro, "dVal") || getText(rastro, "dVenc") || "";
            if (dVal) {
              validade = dVal;
              lote = lote || getText(rastro, "nLote") || "";
              break;
            }
          }
          // fallback: procurar rastro diretamente em <det>
          if (!validade) {
            const rastrosDet = det.getElementsByTagName
              ? det.getElementsByTagName("rastro")
              : [];
            for (let r = 0; r < rastrosDet.length; r++) {
              const rastro = rastrosDet[r];
              const dVal =
                getText(rastro, "dVal") || getText(rastro, "dVenc") || "";
              if (dVal) {
                validade = dVal;
                lote = lote || getText(rastro, "nLote") || "";
                break;
              }
            }
          }
        }

        // 2) procurar tags diretamente em <det> ou em <prod>
        validade =
          validade ||
          getText(det, "dVenc") ||
          getText(det, "dVal") ||
          getText(prod, "dVenc") ||
          getText(prod, "dVal") ||
          "";
        lote = lote || getText(det, "nLote") || getText(prod, "nLote") || "";

        // 3) procurar em elementos de informação adicional (<infAdProd>, <obsFisco>, texto livre)
        // Extrair APENAS datas do texto, não usar o texto inteiro como validade
        if (!validade) {
          const cand =
            getText(det, "infAdProd") ||
            getText(det, "infAd") ||
            getText(det, "obsFisco") ||
            getText(prod, "infAdProd") ||
            "";
          if (cand) {
            // Tentar extrair data de validade do texto livre
            // Procurar padrões como "VAL: DD/MM/YYYY", "VALIDADE: YYYY-MM-DD", "DT.VAL", etc.
            const valPatterns = [
              /(?:val(?:idade)?|dt\.?\s*val|venc(?:imento)?)[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
              /(?:val(?:idade)?|dt\.?\s*val|venc(?:imento)?)[:\s]*(\d{4}[\/\-]\d{2}[\/\-]\d{2})/i,
              /(?:val(?:idade)?|dt\.?\s*val|venc(?:imento)?)[:\s]*(\d{2}[\/\-]\d{4})/i,
              /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/,
              /(\d{4}-\d{2}-\d{2})/,
            ];
            for (const p of valPatterns) {
              const m = cand.match(p);
              if (m) {
                validade = m[1] || m[0];
                break;
              }
            }
          }
        }

        // 4) se ainda não achou, tentar extrair pela procura de padrões de data formatada no conteúdo do <det>
        // NÃO usar /\d{8}/ pois pega NCM, códigos de produto etc.
        if (!validade) {
          const txt = det.textContent || "";
          const patterns = [
            /\d{4}-\d{2}-\d{2}/,
            /\d{2}\/\d{2}\/\d{4}/,
            /\d{2}-\d{2}-\d{4}/,
          ];
          for (const p of patterns) {
            const m = txt.match(p);
            if (m) {
              validade = m[0];
              break;
            }
          }
        }

        // tentar extrair NCM (tag comum: <NCM>) ou variações; como fallback procurar 8 dígitos no conteúdo do det
        let ncm =
          getText(prod, "NCM") ||
          getText(prod, "Ncm") ||
          getText(prod, "NCMTrib") ||
          getText(prod, "cNCM") ||
          "";
        if (!ncm) {
          // procurar no conteúdo do <prod> / <det> um número de 8 dígitos (formato comum do NCM)
          const txtDet =
            (det.textContent || "") + " " + (prod.textContent || "");
          const m = txtDet.match(/\b(\d{8})\b/);
          if (m) ncm = m[1];
        }

        // normalizar validade para formato ISO (YYYY-MM-DD) usando função local
        const validadeISO = normalizeDateToISO(validade || "");

        result.items.push({
          codigo: cProd,
          descricao: xProd,
          quantidade: qCom,
          unitario: vUnCom,
          total: vProd,
          validade: validadeISO,
          lote: lote,
          ncm: ncm || "",
        });
      } catch (e) {
        continue;
      }
    }

    // totais
    const totalsTag = inf
      ? inf.getElementsByTagName("ICMSTot")[0] || {}
      : doc.getElementsByTagName("ICMSTot")[0] || {};
    result.totals.vProd =
      parseFloat(
        (
          (totalsTag &&
            (totalsTag.getElementsByTagName("vProd")[0] || {}).textContent) ||
          "0"
        ).replace(",", "."),
      ) || 0;
    result.totals.vNF =
      parseFloat(
        (
          (totalsTag &&
            (totalsTag.getElementsByTagName("vNF")[0] || {}).textContent) ||
          "0"
        ).replace(",", "."),
      ) || 0;

    return result;
  }

  // Para cada item parsed, tentar obter candidatos do servidor (/api/itens?q=)
  async function findCandidatesForItems(items) {
    const results = [];
    for (const it of items) {
      try {
        const query = encodeURIComponent(
          (it.codigo || it.descricao || it.xProd || it.cProd || "").toString(),
        );
        if (!query) {
          results.push([]);
          continue;
        }
        const res = await fetch("/api/itens?q=" + query);
        if (!res.ok) {
          results.push([]);
          continue;
        }
        const data = await res.json();
        results.push(Array.isArray(data) ? data : []);
      } catch (e) {
        console.warn("candidate fetch error", e);
        results.push([]);
      }
    }
    return results;
  }

  // small debounce helper (local)
  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // Modal de relacionamento de produtos
  function showProductMappingModal(parsed, candidates) {
    try {
      // Persistir parsed em sessionStorage para permitir reabertura após navegação
      try {
        sessionStorage.setItem("entradaImported", JSON.stringify(parsed));
      } catch (e) {
        console.debug("Erro ao persistir entradaImported", e);
      }
      // remover modal anterior
      const prev = document.getElementById("mappingModal");
      if (prev) prev.remove();
      const overlay = document.createElement("div");
      overlay.id = "mappingModal";
      overlay.classList.add("mapping-modal");
      overlay.style.position = "fixed";
      overlay.style.left = "0";
      overlay.style.top = "0";
      overlay.style.right = "0";
      overlay.style.bottom = "0";
      overlay.style.background = "rgba(0,0,0,0.4)";
      overlay.style.zIndex = "100000";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      const box = document.createElement("div");
      box.style.width = "90%";
      box.style.maxWidth = "1100px";
      box.style.maxHeight = "80%";
      box.style.overflow = "auto";
      box.style.background = "#fff";
      box.style.borderRadius = "8px";
      box.style.padding = "18px";
      box.style.boxShadow = "0 12px 40px rgba(0,0,0,0.3)";
      const title = document.createElement("h3");
      title.textContent = "Produtos sendo comprados pela primeira vez!";
      title.style.marginTop = "0";
      box.appendChild(title);

      // injetar CSS específico do modal (escopado para .mapping-modal)
      if (!document.getElementById("mappingModalStyle")) {
        const style = document.createElement("style");
        style.id = "mappingModalStyle";
        style.textContent = `
                .mapping-modal .btn-primary-blue { background: #0d6efd !important; color: #fff !important; border: 1px solid #0b5ed7 !important; }
                .mapping-modal .btn-primary-blue:hover { background: #0b5ed7 !important; }
                .mapping-modal .modal-content { box-shadow: 0 12px 40px rgba(2,6,23,0.2); }
                .mapping-modal select.impressora-select { min-width:320px; }
                .mapping-modal .modal-footer { gap: var(--mapping-btn-gap, 12px); }
                .mapping-modal .modal-footer .btn { padding: var(--mapping-btn-padding, 8px 14px); }
                .mapping-modal .btn.creating { box-shadow: 0 6px 18px rgba(13,110,253,0.12); }
                `;
        document.head.appendChild(style);
      }

      const info = document.createElement("div");
      info.style.color = "#b02a37";
      info.style.marginBottom = "12px";
      info.innerHTML =
        'Caso você já tenha o produto comprado em seu cadastro, clique em "Já tenho o produto cadastrado" e indique qual é o produto. Caso ainda não tiver o produto cadastrado, clique em "Novo Produto" para efetuar o cadastro.';
      box.appendChild(info);

      const table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      const thead = document.createElement("thead");
      thead.innerHTML =
        '<tr><th style="text-align:left;padding:8px;border-bottom:1px solid #eee">N°</th><th style="text-align:left;padding:8px;border-bottom:1px solid #eee">Ref. Fornecedor</th><th style="text-align:left;padding:8px;border-bottom:1px solid #eee">Descrição Fornecedor</th><th style="text-align:left;padding:8px;border-bottom:1px solid #eee">Produto</th></tr>';
      table.appendChild(thead);
      const tbody = document.createElement("tbody");

      parsed.items.forEach((it, idx) => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #f0f0f0";
        const tdNum = document.createElement("td");
        tdNum.style.padding = "8px";
        tdNum.textContent = String(idx + 1);
        const tdRef = document.createElement("td");
        tdRef.style.padding = "8px";
        tdRef.textContent = it.codigo || it.cProd || "";
        const tdDesc = document.createElement("td");
        tdDesc.style.padding = "8px";
        tdDesc.textContent = it.descricao || it.xProd || "";
        const tdProd = document.createElement("td");
        tdProd.style.padding = "8px";
        // garantir que a célula seja um flex container para manter o botão à direita
        tdProd.style.display = "flex";
        tdProd.style.alignItems = "center";
        tdProd.style.gap = "12px";

        // criar um campo pesquisável que funciona como 'Escolher produto existente...'
        const searchWrapper = document.createElement("div");
        searchWrapper.style.display = "flex";
        searchWrapper.style.alignItems = "center";
        searchWrapper.style.position = "relative";
        searchWrapper.style.flex = "1 1 auto";
        const inputSearch = document.createElement("input");
        inputSearch.type = "search";
        inputSearch.className = "mapping-search-input impressora-select";
        inputSearch.dataset.idx = idx;
        inputSearch.placeholder = "Escolher produto existente...";
        inputSearch.style.minWidth = "320px";
        inputSearch.style.width = "100%";
        inputSearch.style.background = "#fff";
        inputSearch.style.borderRadius = "6px";
        inputSearch.style.border = "1px solid #e6eef8";
        inputSearch.style.padding = "6px 10px";
        inputSearch.style.boxShadow = "0 4px 12px rgba(2,6,23,0.04)";
        inputSearch.autocomplete = "off";
        searchWrapper.appendChild(inputSearch);

        // Se o caller forneceu candidatos, auto-preencher com o primeiro candidato disponível
        try {
          if (
            Array.isArray(candidates) &&
            Array.isArray(candidates[idx]) &&
            candidates[idx].length > 0
          ) {
            const cand0 = candidates[idx][0];
            const codigoParte = cand0.codigo ? String(cand0.codigo).trim() : "";
            const nomeParte = (
              cand0.nome ||
              cand0.descricao ||
              cand0.nomeProduto ||
              cand0.nomeItem ||
              ""
            ).trim();
            inputSearch.value = codigoParte
              ? `${codigoParte} — ${nomeParte}`
              : nomeParte;
            inputSearch.dataset.selectedId = cand0.id;
            // esconder o botão Novo Produto porque já existe correspondência
            try {
              if (btnNovo) btnNovo.style.display = "none";
            } catch (e) {}
          }
        } catch (e) {
          /* noop */
        }

        // Se candidatos foram fornecidos ao modal, pré-selecionar o primeiro candidato disponível
        try {
          if (
            Array.isArray(candidates) &&
            candidates[idx] &&
            candidates[idx].length > 0
          ) {
            const cand = candidates[idx][0];
            if (cand) {
              inputSearch.value =
                (cand.codigo ? String(cand.codigo).trim() + " — " : "") +
                (cand.nome || cand.descricao || "");
              inputSearch.dataset.selectedId = cand.id;
              // esconder botão Novo Produto pois já foi selecionado
              try {
                if (btnNovo) btnNovo.style.display = "none";
              } catch (e) {}
            }
          }
        } catch (e) {}

        // dropdown de resultados (invisível até ter resultados)
        const resultsList = document.createElement("ul");
        resultsList.className = "mapping-results-list";
        resultsList.style.position = "absolute";
        resultsList.style.top = "100%";
        resultsList.style.left = "0";
        resultsList.style.right = "0";
        resultsList.style.maxHeight = "220px";
        resultsList.style.overflow = "auto";
        resultsList.style.background = "#fff";
        resultsList.style.border = "1px solid #e6eef8";
        resultsList.style.borderRadius = "6px";
        resultsList.style.boxShadow = "0 8px 24px rgba(2,6,23,0.08)";
        resultsList.style.zIndex = "2000";
        resultsList.style.display = "none";
        resultsList.style.margin = "6px 0 0 0";
        resultsList.style.padding = "6px 0";
        searchWrapper.appendChild(resultsList);

        tdProd.appendChild(searchWrapper);

        const btnNovo = document.createElement("button");
        btnNovo.type = "button";
        btnNovo.textContent = "Novo Produto";
        btnNovo.style.marginLeft = "12px";
        btnNovo.style.flex = "0 0 auto";
        // usar classe azul específica do modal para garantir tom azul (não sobrescrito por tema)
        btnNovo.className = "btn btn-primary-blue btn-novo-produto";
        btnNovo.dataset.idx = idx;
        tdProd.appendChild(btnNovo);

        // helper para popular lista de resultados
        async function populateResults(q) {
          resultsList.innerHTML = "";
          if (!q) {
            resultsList.style.display = "none";
            return;
          }
          try {
            let res = await fetch("/api/meus-itens?q=" + encodeURIComponent(q));
            if (!res.ok) {
              res = await fetch("/api/itens?q=" + encodeURIComponent(q));
            }
            if (!res.ok) {
              resultsList.style.display = "none";
              return;
            }
            const arr = await res.json();
            (arr || []).forEach((c) => {
              const li = document.createElement("li");
              li.style.listStyle = "none";
              li.style.padding = "8px 12px";
              li.style.cursor = "pointer";
              li.style.borderBottom = "1px solid #f1f5f9";
              const codigoParte = c.codigo ? String(c.codigo).trim() : "";
              const nomeParte = (c.nome || c.descricao || "").trim();
              li.textContent = codigoParte
                ? `${codigoParte} — ${nomeParte}`
                : nomeParte;
              li.dataset.id = c.id;
              li.addEventListener("mousedown", function (e) {
                // use mousedown para evitar blur antes do click
                e.preventDefault();
                inputSearch.value = this.textContent;
                inputSearch.dataset.selectedId = this.dataset.id;
                // garantir que o campo esteja habilitado (caso Novo Produto tenha sido clicado antes)
                inputSearch.disabled = false;
                // esconder o botão 'Novo Produto' para essa linha, pois já foi escolhido um produto existente
                try {
                  if (btnNovo) btnNovo.style.display = "none";
                } catch (err) {}
                resultsList.style.display = "none";
              });
              resultsList.appendChild(li);
            });
            resultsList.style.display = arr && arr.length ? "block" : "none";
          } catch (e) {
            console.warn("populateResults error", e);
            resultsList.style.display = "none";
          }
        }

        // evento de input: buscar e popular
        inputSearch.addEventListener(
          "input",
          debounce(function () {
            const q = this.value.trim();
            // limpar seleção previamente armazenada
            delete this.dataset.selectedId;
            if (!q) {
              resultsList.style.display = "none";
              return;
            }
            populateResults(q);
          }, 300),
        );

        // foco/blur: esconder lista com leve atraso para permitir click
        inputSearch.addEventListener("focus", function () {
          if (resultsList.children.length) resultsList.style.display = "block";
        });
        inputSearch.addEventListener("blur", function () {
          setTimeout(() => {
            resultsList.style.display = "none";
          }, 180);
        });

        // quando clicar em Novo Produto, abrir a página de novo-produto com os dados preenchidos
        btnNovo.addEventListener("click", function () {
          try {
            const dadosParaNovo = {
              nome: it.descricao || it.xProd || "",
              ncm: it.ncm || it.NCM || "",
              codigo: it.codigo || it.cProd || "",
              preco: Number(it.unitario || it.vUnCom || it.preco || 0) || 0,
              validade:
                it.validade || it.dVenc || it.dVal || it.dataValidade || "",
              // manter referência original para eventual retorno
              _orig_parsed_index: idx,
            };
            try {
              sessionStorage.setItem(
                "novoProdutoFromXML",
                JSON.stringify(dadosParaNovo),
              );
            } catch (e) {
              console.warn("sessionStorage set failed", e);
            }

            // SALVAR SELEÇÕES ATUAIS antes de fechar o modal
            try {
              const allRows = tbody.querySelectorAll("tr");
              const selections = {};
              allRows.forEach((tr) => {
                const inp = tr.querySelector(".mapping-search-input");
                if (inp && inp.dataset.selectedId) {
                  const rowIdx = inp.dataset.idx;
                  selections[rowIdx] = {
                    selectedId: inp.dataset.selectedId,
                    displayText: inp.value,
                  };
                }
              });
              if (Object.keys(selections).length > 0) {
                sessionStorage.setItem(
                  "mappingSelections",
                  JSON.stringify(selections),
                );
                console.log("💾 Seleções salvas antes de navegar:", selections);
              }
            } catch (e) {
              console.warn("Erro ao salvar seleções", e);
            }

            // fechar modal antes de navegar
            const overlayEl = document.getElementById("mappingModal");
            if (overlayEl) overlayEl.remove();
            // navegar para a página de novo produto (mesmo layout)
            window.location.href = "../item/novo-produto.html?from=xml";
          } catch (e) {
            console.warn("Erro ao abrir novo produto", e);
          }
        });

        // Se voltamos da criação de um produto, aplicar automaticamente ao row correspondente
        try {
          const lastRaw = sessionStorage.getItem("lastCreatedProduct");
          if (lastRaw) {
            try {
              const last = JSON.parse(lastRaw);
              if (
                last &&
                last._orig_parsed_index !== undefined &&
                Number(last._orig_parsed_index) === Number(idx)
              ) {
                // aplicar dados ao input e esconder botão Novo Produto
                try {
                  inputSearch.value =
                    (last.codigo ? String(last.codigo).trim() + " — " : "") +
                    (last.nome || "");
                  inputSearch.dataset.selectedId = last.id;
                  if (btnNovo) btnNovo.style.display = "none";
                } catch (e) {}
                // limpar chave para não reaplicar em outras linhas
                try {
                  sessionStorage.removeItem("lastCreatedProduct");
                } catch (e) {}
              }
            } catch (e) {
              console.debug("failed parsing lastCreatedProduct", e);
            }
          }
        } catch (e) {
          /* noop */
        }

        // RESTAURAR SELEÇÕES ANTERIORES (se existirem)
        try {
          const selectionsRaw = sessionStorage.getItem("mappingSelections");
          if (selectionsRaw) {
            const selections = JSON.parse(selectionsRaw);
            if (selections[idx]) {
              inputSearch.value = selections[idx].displayText || "";
              inputSearch.dataset.selectedId = selections[idx].selectedId || "";
              if (btnNovo && selections[idx].selectedId)
                btnNovo.style.display = "none";
              console.log(
                "✅ Seleção restaurada para linha",
                idx,
                selections[idx],
              );
            }
          }
        } catch (e) {
          console.debug("failed restoring selections", e);
        }

        tr.appendChild(tdNum);
        tr.appendChild(tdRef);
        tr.appendChild(tdDesc);
        tr.appendChild(tdProd);
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      box.appendChild(table);

      const footer = document.createElement("div");
      footer.className = "modal-footer";
      footer.style.display = "flex";
      footer.style.justifyContent = "flex-end";
      footer.style.marginTop = "12px";
      const btnSave = document.createElement("button");
      btnSave.textContent = "Salvar";
      btnSave.className = "btn btn-primary";
      btnSave.style.padding = "8px 14px";
      btnSave.style.borderRadius = "4px";
      const btnCancel = document.createElement("button");
      btnCancel.textContent = "Cancelar";
      btnCancel.className = "btn btn-secondary";
      btnCancel.style.padding = "8px 14px";
      btnCancel.style.borderRadius = "4px";
      footer.appendChild(btnCancel);
      footer.appendChild(btnSave);
      box.appendChild(footer);

      overlay.appendChild(box);
      document.body.appendChild(overlay);

      btnCancel.addEventListener("click", function () {
        overlay.remove();
      });

      btnSave.addEventListener("click", async function () {
        // validação: garantir que todas as linhas estejam preenchidas (selecionado ou criado)
        try {
          const rowsCheck = tbody.querySelectorAll("tr");
          for (let r = 0; r < rowsCheck.length; r++) {
            const row = rowsCheck[r];
            const inputSearch = row.querySelector(".mapping-search-input");
            const btn = row.querySelector(".btn-novo-produto");
            const hasSelected =
              inputSearch &&
              inputSearch.dataset &&
              inputSearch.dataset.selectedId;
            const createdFlag =
              btn && btn.dataset && btn.dataset.create === "true";
            if (!hasSelected && !createdFlag) {
              showEntradaToast(
                "Todos os produtos devem ser preenchidos antes de salvar",
              );
              return;
            }
          }
        } catch (e) {
          console.warn("validation check failed", e);
        }

        // para cada item, se select.value preenchido => buscar produto e substituir campos
        const rows = tbody.querySelectorAll("tr");
        const finalItems = [];
        for (let r = 0; r < rows.length; r++) {
          const row = rows[r];
          const inputSearch = row.querySelector(".mapping-search-input");
          const btn = row.querySelector(".btn-novo-produto");
          const idx = Number((inputSearch && inputSearch.dataset.idx) || r);
          const original = parsed.items[idx];
          if (btn && btn.dataset.create === "true") {
            // criar novo produto no servidor
            try {
              const payload = {
                nome: original.descricao || original.xProd || "",
                codigo: original.codigo || original.cProd || "",
                preco: original.unitario || original.vUnCom || 0,
              };
              const res = await fetch("/api/itens", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              if (res.ok) {
                const created = await res.json();
                finalItems.push({
                  ...original,
                  matchedId: created.id,
                  codigo: created.codigo || created.id,
                  descricao:
                    created.nome || created.descricao || original.descricao,
                  unitario: Number(created.preco) || original.unitario,
                });
                continue;
              }
            } catch (e) {
              console.warn("create product failed", e);
            }
            // se falhar criação, fallback para original
            finalItems.push(original);
          } else if (inputSearch && inputSearch.dataset.selectedId) {
            // selecionou produto existente via dropdown
            try {
              const selId = inputSearch.dataset.selectedId;
              const res = await fetch("/api/itens/" + selId);
              if (res.ok) {
                const prod = await res.json();
                finalItems.push({
                  ...original,
                  matchedId: prod.id,
                  codigo: prod.codigo || prod.id,
                  descricao: prod.nome || prod.descricao || original.descricao,
                  unitario: Number(prod.preco) || original.unitario,
                });
                continue;
              }
            } catch (e) {
              console.warn("fetch product by id failed", e);
            }
            finalItems.push(original);
          } else if (inputSearch && inputSearch.value) {
            // usuário digitou algo mas não selecionou explicitamente: tentar buscar pelo texto e usar o primeiro resultado
            try {
              const q = encodeURIComponent(inputSearch.value.trim());
              const res = await fetch("/api/meus-itens?q=" + q);
              let arr = [];
              if (res.ok) arr = await res.json();
              if (!res.ok || !arr || arr.length === 0) {
                const r2 = await fetch("/api/itens?q=" + q);
                if (r2.ok) arr = await r2.json();
              }
              if (arr && arr.length > 0) {
                const prod = arr[0];
                finalItems.push({
                  ...original,
                  matchedId: prod.id,
                  codigo: prod.codigo || prod.id,
                  descricao: prod.nome || prod.descricao || original.descricao,
                  unitario: Number(prod.preco) || original.unitario,
                });
                continue;
              }
            } catch (e) {
              console.warn("search fallback failed", e);
            }
            finalItems.push(original);
          } else {
            // nenhum selecionado - manter original
            finalItems.push(original);
          }
        }

        // salvar no sessionStorage e redirecionar para entrada-manual com itens atualizados
        parsed.items = finalItems;

        // Se a entrada já existe (reabertura de modal), ATUALIZAR via PUT
        const entradaExistenteId = parsed._entradaId;
        if (entradaExistenteId) {
          try {
            // Atualizar entrada existente via PUT
            const payload = Object.assign({}, parsed, {
              itens: finalItems,
              situacao: "pendente",
            });
            // Remover campos de controle interno
            delete payload._entradaId;
            delete payload.candidates;
            const res = await fetch("/api/entrada/manual/" + encodeURIComponent(entradaExistenteId), {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (res.ok) {
              try {
                sessionStorage.removeItem("mappingSelections");
                console.log("🧹 Seleções limpas após atualizar");
              } catch (e) {}
              overlay.remove();
              window.location.href =
                "./entrada-manual.html?id=" + encodeURIComponent(entradaExistenteId);
              return;
            } else {
              console.warn("Falha ao atualizar entrada existente:", res.status, res.statusText);
            }
          } catch (e) {
            console.warn("Erro ao atualizar entrada existente:", e);
          }
        }

        // Se não tem _entradaId ou falhou atualização, tentar criar novo rascunho
        try {
          const created = await criarRascunhoNoServidor(parsed);
          if (created && created.id) {
            try {
              sessionStorage.removeItem("mappingSelections");
              console.log("🧹 Seleções limpas após salvar");
            } catch (e) {}
            overlay.remove();
            window.location.href =
              "./entrada-manual.html?id=" + encodeURIComponent(created.id);
            return;
          }
        } catch (e) {
          console.warn("criarRascunhoNoServidor falhou", e);
        }

        // Se não foi possível salvar no servidor, informar o usuário
        try {
          sessionStorage.removeItem("mappingSelections");
          console.log("🧹 Seleções limpas após tentativa falha");
        } catch (e) {}
        overlay.remove();
        showEntradaToast(
          "Não foi possível salvar a entrada no servidor. Verifique o servidor e tente novamente.",
        );
        return;
      });
    } catch (e) {
      console.error("showProductMappingModal error", e);
    }
  }

  // Expor funções de mapeamento globalmente para uso em acessarNotaConsultada (definida fora deste escopo)
  window.__showProductMappingModal = showProductMappingModal;
  window.__findCandidatesForItems = findCandidatesForItems;

  // ============================================================
  // VERIFICAR SE DEVE REABRIR O MODAL (vindo de novo-produto)
  // ============================================================
  (function checkAndReopenModal() {
    const params = new URLSearchParams(window.location.search || "");
    const shouldOpenMapping = params.get("openMapping") === "1";

    console.log("🔍 checkAndReopenModal executado:", {
      shouldOpenMapping,
      hasEntradaImported: !!sessionStorage.getItem("entradaImported"),
      hasLastCreatedProduct: !!sessionStorage.getItem("lastCreatedProduct"),
    });

    if (shouldOpenMapping) {
      console.log("✅ openMapping=1 detectado - preparando para abrir modal");
      setTimeout(() => {
        console.log("⏰ Timeout executado - tentando abrir modal");
        try {
          const raw = sessionStorage.getItem("entradaImported");
          if (raw) {
            console.log("📦 Dados entradaImported encontrados");
            const parsed = JSON.parse(raw);
            console.log("📋 Items parsed:", parsed.items?.length || 0);
            showProductMappingModal(parsed, []);
            console.log("✅ Modal de mapeamento aberto com entradaImported");
          } else {
            console.log(
              "⚠️ entradaImported não encontrado - tentando lastCreatedProduct",
            );
            const lastRaw = sessionStorage.getItem("lastCreatedProduct");
            if (lastRaw) {
              console.log("📦 lastCreatedProduct encontrado");
              const last = JSON.parse(lastRaw);
              const parsed = {
                items: [
                  {
                    descricao: last.nome || "",
                    codigo: last.codigo || "",
                    unitario: last.preco || 0,
                  },
                ],
              };
              showProductMappingModal(parsed, []);
              console.log(
                "✅ Modal de mapeamento aberto com lastCreatedProduct",
              );
            } else {
              console.error("❌ Nenhum dado encontrado no sessionStorage");
            }
          }
          // Limpar query param da URL para evitar reaberturas acidentais
          try {
            const newUrl = window.location.pathname;
            window.history.replaceState({}, "", newUrl);
            console.log("🧹 Query params limpos da URL");
          } catch (e) {
            console.debug("Erro ao limpar query param", e);
          }
        } catch (e) {
          console.error("❌ Erro ao abrir modal via openMapping:", e);
          console.error("Stack trace:", e.stack);
        }
      }, 500);
    }
  })();

  // Converte várias formas de data (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, YYYYMMDD, DDMMYYYY, timestamps) para YYYY-MM-DD
  // Valida se uma data ISO YYYY-MM-DD é plausível (mês 1-12, dia 1-31, ano 2000-2099)
  function isPlausibleDate(iso) {
    if (!iso || iso.length < 10) return false;
    const y = parseInt(iso.substring(0, 4), 10);
    const m = parseInt(iso.substring(5, 7), 10);
    const d = parseInt(iso.substring(8, 10), 10);
    return y >= 2000 && y <= 2099 && m >= 1 && m <= 12 && d >= 1 && d <= 31;
  }

  function normalizeDateToISO(s) {
    if (!s) return "";
    s = String(s).trim();
    let result = "";
    // já no formato ISO (YYYY-MM-DD) — pode estar dentro de texto maior
    const isoMatch = s.match(/(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) {
      result = isoMatch[1];
      if (isPlausibleDate(result)) return result;
    }
    // formato DD/MM/YYYY ou DD-MM-YYYY — pode estar dentro de texto maior
    const dmy = s.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    if (dmy) {
      const [_, d, m, y] = dmy;
      result = `${y}-${m}-${d}`;
      if (isPlausibleDate(result)) return result;
    }
    // formato parcial MM/YYYY (comum em rações: "VAL 07/2026") — assume dia 01
    const mmyyyy = s.match(/(\d{2})[\/\-](\d{4})/);
    if (mmyyyy) {
      const [_, m, y] = mmyyyy;
      result = `${y}-${m}-01`;
      if (isPlausibleDate(result)) return result;
    }
    // formatos compactos: YYYYMMDD ou DDMMYYYY (string inteira, exatamente 8 dígitos)
    const compact = s.match(/^(\d{8})$/);
    if (compact) {
      const v = compact[1];
      const first4 = parseInt(v.substring(0, 4), 10);
      if (first4 > 31) {
        result = `${v.substring(0, 4)}-${v.substring(4, 6)}-${v.substring(6, 8)}`;
      } else {
        result = `${v.substring(4, 8)}-${v.substring(2, 4)}-${v.substring(0, 2)}`;
      }
      if (isPlausibleDate(result)) return result;
    }
    // tentar interpretar como Date
    const parsed = Date.parse(s);
    if (!isNaN(parsed)) {
      const dt = new Date(parsed);
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      const dd = String(dt.getDate()).padStart(2, "0");
      result = `${yyyy}-${mm}-${dd}`;
      if (isPlausibleDate(result)) return result;
    }
    return "";
  }

  // Armazena consultas realizadas via "Consultar Sefaz Por Chave" (in-memory, não-persistente)
  // (usa a variável global `sefazConsultas` definida fora desta função)

  // showConsultaSefazModal suporta dois modos:
  // - 'byKey' (padrão): modal pequeno para consultar por chave
  // - 'list': modal centralizado que lista consultas realizadas (layout solicitado)
  function showConsultaSefazModal(mode = "byKey", initialChave) {
    // remover modal anterior se existir
    const prev = document.getElementById("consultaSefazModal");
    if (prev) prev.remove();

    // Injetar CSS com !important para forçar overlay fullscreen
    const styleId = "consultaSefazModalStyle";
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
            #consultaSefazModal {
                position: fixed !important;
                inset: 0 !important;
                left: 0 !important;
                top: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                max-width: 100vw !important;
                max-height: 100vh !important;
                background: rgba(0,0,0,0.36) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                z-index: 999999999 !important;
                overflow: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
            }
            html.sefaz-modal-open, body.sefaz-modal-open {
                overflow: hidden !important;
                height: 100vh !important;
                width: 100vw !important;
            }
            /* Garantir que sidebar fique abaixo do overlay */
            .sidebar { z-index: 1000 !important; }
            #consultaSefazModal { z-index: 999999999 !important; }
        `;

    const overlay = document.createElement("div");
    overlay.id = "consultaSefazModal";
    overlay.className = "modal";

    if (mode === "list") {
      // Montar modal de listagem (pequeno, centralizado conforme imagem)
      const has = sefazConsultas.length > 0;
      overlay.innerHTML = `
                <div class="modal-content" style="max-width:720px; width: 80%;">
                    <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e9ecef;padding:12px 18px;">
                        <h3 style="margin:0;font-size:16px;font-weight:600;color:#333;">Consulta de Notas na Sefaz</h3>
                        <button class="modal-close" style="background:#6c757d;color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;">Fechar</button>
                    </div>
                    <div class="modal-body" style="padding:16px 18px;">
                        ${has ? '<div id="sefazList" style="display:block;max-height:360px;overflow:auto;padding:6px 0;">' + sefazConsultas.map((c) => `<div style="padding:10px;border-bottom:1px solid #f1f1f1"><strong>Chave:</strong> ${c.chave || "-"}<br><small>${c.timestamp || ""}</small><pre style="white-space:pre-wrap;background:#fff;padding:8px;border-radius:6px;border:1px solid #eee;margin-top:8px;">${JSON.stringify(c.result || { message: "Nenhuma nota localizada" }, null, 2)}</pre></div>`).join("") + "</div>" : '<div style="color:#666; padding:18px 6px;">Nenhuma nota localizada!</div>'}
                    </div>
                </div>
            `;
    } else {
      // Montar modal de consulta por chave (pequeno)
      overlay.innerHTML = `
                <div class="modal-content" style="max-width:640px; width:90%; max-height:90vh; display:flex; flex-direction:column;">
                    <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e9ecef;padding:12px 18px;flex-shrink:0;">
                        <h3 style="margin:0;font-size:16px;font-weight:600;color:#333;">Consulta na Sefaz por Chave de Acesso</h3>
                        <button class="modal-close" style="background:#6c757d;color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;">Fechar</button>
                    </div>
                    <div class="modal-body" style="padding:16px 18px;flex:1;overflow:visible;display:flex;flex-direction:column;">
                        <label style="display:block;margin-bottom:8px;color:#555;font-weight:600;">Chave de Acesso</label>
                        <input id="consultaSefazChave" type="text" placeholder="Informe a chave de acesso" style="width:100%;padding:10px 12px;border:1px solid #dee2e6;border-radius:8px;font-size:14px;flex-shrink:0;" value="${initialChave || ""}" data-sefaz-input />
                        <div id="consultaSefazResult" style="margin-top:16px;color:#333;font-size:13px;display:none;overflow:visible;" data-sefaz-result></div>
                    </div>
                    <div class="modal-footer" style="padding:12px 18px;display:flex;justify-content:flex-end;gap:10px;border-top:1px solid #f1f1f1;flex-shrink:0;">
                        <button id="consultaSefazBtn" class="btn-primary" style="background:#2c7be5;color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;">Consultar</button>
                        <button id="consultaSefazClose" class="btn-secondary" style="background:white;color:#495057;border:1px solid #6c757d;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;">Fechar</button>
                    </div>
                </div>
            `;
    }

    // anexar ao body e adicionar classes para bloquear scroll
    document.body.appendChild(overlay);
    document.documentElement.classList.add("sefaz-modal-open");
    document.body.classList.add("sefaz-modal-open");

    const closeModal = () => {
      try {
        overlay.remove();
      } catch (e) {}
      // remover classes e style injetado
      document.documentElement.classList.remove("sefaz-modal-open");
      document.body.classList.remove("sefaz-modal-open");
      const st = document.getElementById(styleId);
      if (st) st.remove();
    };
    const closeBtnEl = overlay.querySelector(".modal-close");
    if (closeBtnEl) {
      closeBtnEl.style.padding = "6px 10px";
      closeBtnEl.style.fontSize = "13px";
      closeBtnEl.style.lineHeight = "1";
      closeBtnEl.style.height = "32px";
      closeBtnEl.style.minWidth = "64px";
      closeBtnEl.style.borderRadius = "6px";
      closeBtnEl.style.boxSizing = "border-box";
      closeBtnEl.addEventListener("click", closeModal);
    }
    const closeFooter = overlay.querySelector("#consultaSefazClose");
    if (closeFooter) {
      closeFooter.style.padding = "6px 10px";
      closeFooter.style.fontSize = "13px";
      closeFooter.addEventListener("click", closeModal);
    }
    // rastrear seleção de texto recente para evitar fechar o modal inadvertidamente
    // atualizar timestamp quando houver seleção (selectionchange)
    let __sefaz_lastSelectionAt = 0;
    try {
      document.addEventListener("selectionchange", function () {
        try {
          const s =
            window.getSelection && window.getSelection().toString
              ? window.getSelection().toString()
              : "";
          if (s && s.length > 0) {
            __sefaz_lastSelectionAt = Date.now();
          }
        } catch (e) {
          /* noop */
        }
      });
    } catch (e) {
      /* noop */
    }

    // fechar somente quando clicar explicitamente no backdrop (overlay)
    // Não fechar ao clicar no backdrop (overlay) — modal permanece aberto até o usuário clicar em 'Fechar'
    // Ignorar cliques no overlay para evitar fechamentos acidentais durante seleção/copiar de texto
    overlay.addEventListener("click", (e) => {
      try {
        /* intencionalmente vazio: clique no backdrop não fecha o modal */
      } catch (_) {}
    });

    // Não fechar com a tecla Escape — fechamento apenas via botão 'Fechar' ou ações explícitas
    // Não registrar listener de Escape aqui para evitar fechamentos indesejados

    if (mode === "byKey") {
      const input = overlay.querySelector("#consultaSefazChave");
      const resultEl = overlay.querySelector("#consultaSefazResult");
      const btn = overlay.querySelector("#consultaSefazBtn");

      btn.addEventListener("click", async () => {
        const chave = (input.value || "").trim();
        if (!chave) {
          alert("Informe a chave de acesso.");
          return;
        }
        try {
          resultEl.style.display = "none";
          resultEl.textContent = "";
          btn.disabled = true;
          btn.textContent = "Consultando...";

          // Primeiro tentar buscar no banco local
          const res = await fetch(
            `/api/entrada?chave=${encodeURIComponent(chave)}`,
          );
          let body = await res.json().catch(() => null);
          let notaTemporaria = null;

          // Se não encontrou no banco (404), buscar XML via API externa
          if (!res.ok && res.status === 404) {
            console.log(
              "📡 Nota não encontrada no banco, buscando XML via API externa...",
            );
            try {
              // Tentar buscar XML de uma API de consulta (ajuste a URL conforme sua API)
              const xmlRes = await fetch(
                `https://api.sefaz.exemplo.com.br/xml?chave=${chave}`,
              ).catch(() => null);
              if (xmlRes && xmlRes.ok) {
                const xmlText = await xmlRes.text();
                const parsed = parseNFeXml(xmlText);

                // Criar objeto temporário da nota
                notaTemporaria = {
                  id: `temp-${Date.now()}`,
                  fornecedor:
                    parsed.fornecedor?.nome || "Fornecedor não informado",
                  numero: parsed.numero || "S/N",
                  serie: parsed.serie || "",
                  dataEmissao:
                    parsed.dataEmissao?.split("T")[0] ||
                    new Date().toISOString().split("T")[0],
                  chaveAcesso: chave,
                  valorTotal: parsed.totals?.vNF || parsed.totals?.vProd || 0,
                  situacao: "pendente",
                  items: parsed.items || [],
                  _isTemp: true,
                  _parsed: parsed,
                };

                // Adicionar à lista de entradas temporariamente
                entradasData.unshift(notaTemporaria);
                renderizarTabelaEntradas();
                atualizarPaginacaoEntrada();

                body = notaTemporaria;
                console.log(
                  "✅ Nota temporária adicionada à lista:",
                  notaTemporaria,
                );
              }
            } catch (xmlErr) {
              console.warn("Erro ao buscar XML externo:", xmlErr);
            }
          }

          // armazenar a consulta para histórico
          sefazConsultas.unshift({
            chave,
            result: body,
            timestamp: new Date().toLocaleString(),
          });

          if (!body) {
            // Renderizar card de erro
            resultEl.style.display = "block";
            resultEl.innerHTML = `
                            <div style="background: #fee; border: 2px solid #c33; border-radius: 8px; padding: 20px; text-align: center;">
                                <div style="font-size: 48px; margin-bottom: 10px;">❌</div>
                                <h3 style="margin: 0 0 10px 0; color: #c33;">Nota não localizada</h3>
                                <p style="margin: 0; color: #666;">A chave de acesso informada não foi encontrada no sistema nem no serviço externo.</p>
                                <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">Verifique se a chave está correta.</p>
                            </div>
                        `;
          } else {
            // Armazenar body para uso em acessarNotaConsultada
            window.__sefazLastConsultaBody = body;
            // Renderizar card verde de sucesso
            resultEl.style.display = "block";
            const fornecedor =
              body.fornecedor && typeof body.fornecedor === "object"
                ? body.fornecedor.nome || "Fornecedor não informado"
                : body.fornecedor || "Fornecedor não informado";
            const dataEmissao = body.dataEmissao
              ? new Date(body.dataEmissao + "T00:00:00").toLocaleDateString(
                  "pt-BR",
                )
              : "Data não informada";
            const numero = body.numero || "S/N";
            const valorTotal = body.valorTotal
              ? parseFloat(body.valorTotal).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })
              : "R$ 0,00";
            const entradaId = body._isTemp ? `'${body.id}'` : body.id;
            const isTemp = body._isTemp ? "true" : "false";

            resultEl.innerHTML = `
                            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 12px; padding: 24px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                                <div style="display: flex; align-items: center; margin-bottom: 16px;">
                                    <div style="font-size: 32px; margin-right: 12px;">✓</div>
                                    <h3 style="margin: 0; font-size: 18px; font-weight: 600;">XML localizado!</h3>
                                </div>
                                <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                                    <div style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">${fornecedor}</div>
                                    <div style="font-size: 14px; opacity: 0.95; margin-bottom: 4px;">Emitido em ${dataEmissao}</div>
                                    <div style="font-size: 14px; opacity: 0.95; margin-bottom: 4px;">Nº ${numero}</div>
                                    <div style="font-size: 24px; font-weight: bold; margin-top: 12px;">${valorTotal}</div>
                                </div>
                                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                                    <button onclick="window.acessarNotaConsultada(${entradaId}, ${isTemp})" style="flex: 1; min-width: 150px; background: white; color: #059669; border: none; padding: 12px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px; transition: all 0.2s;" onmouseover="this.style.background='#f0fdf4'" onmouseout="this.style.background='white'">
                                        📋 Acessar a Nota
                                    </button>
                                    <button onclick="document.querySelector('[data-sefaz-input]').value=''; document.querySelector('[data-sefaz-input]').focus(); document.querySelector('[data-sefaz-result]').style.display='none';" style="flex: 1; min-width: 150px; background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 12px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                                        🔄 Nova consulta por chave
                                    </button>
                                </div>
                            </div>
                        `;
          }
        } catch (err) {
          console.error("consulta sefaz modal error", err);
          resultEl.style.display = "block";
          resultEl.innerHTML = `
                        <div style="background: #fee; border: 2px solid #c33; border-radius: 8px; padding: 20px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 10px;">❌</div>
                            <h3 style="margin: 0 0 10px 0; color: #c33;">Erro na consulta</h3>
                            <p style="margin: 0; color: #666;">${err && err.message ? err.message : String(err)}</p>
                        </div>
                    `;
        } finally {
          btn.disabled = false;
          btn.textContent = "Consultar";
        }
      });
    }
  }

  if (btnConsultarSefaz) {
    // Restaurado: abrir modal de consulta por chave normalmente
    btnConsultarSefaz.addEventListener("click", () => showConsultaSefazModal());
  }

  if (btnConsultarSefaz2) {
    btnConsultarSefaz2.addEventListener("click", (e) => {
      try {
        e.preventDefault();
        e.stopPropagation();
        const label = (
          btnConsultarSefaz2.textContent || "Consulta Sefaz"
        ).trim();
        showInfoToast(label + " — serão implementadas em breve!");
      } catch (err) {
        console.warn(err);
      }
    });
  }

  if (btnEntradaManual) {
    btnEntradaManual.addEventListener("click", () => {
      window.location.href = "./entrada-manual.html";
    });
  }

  if (btnConfiguracoes) {
    btnConfiguracoes.addEventListener("click", (e) => {
      try {
        e.preventDefault();
        e.stopPropagation();
        const label = (
          btnConfiguracoes.getAttribute("title") ||
          btnConfiguracoes.textContent ||
          "Configurações"
        ).trim();
        showInfoToast(label + " — serão implementadas em breve!");
      } catch (err) {
        console.warn(err);
      }
    });
  }

  if (btnPesquisar) {
    btnPesquisar.addEventListener("click", realizarPesquisaEntrada);
  }

  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        realizarPesquisaEntrada();
      }
    });
  }

  if (selectAll) {
    selectAll.addEventListener("change", (e) => {
      const checkboxes = document.querySelectorAll(
        '.entradas-table tbody input[type="checkbox"]',
      );
      checkboxes.forEach((cb) => (cb.checked = e.target.checked));
    });
  }

  // Tabs de status
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Remover active de todos
      tabButtons.forEach((b) => b.classList.remove("active"));
      // Adicionar active no clicado
      btn.classList.add("active");
      // Mapear status da aba (plural) para valor de `situacao` no registro (singular)
      const statusMap = {
        todas: "todas",
        pendentes: "pendente",
        ignoradas: "ignorada",
        finalizadas: "concluido",
      };
      currentStatus = statusMap[btn.dataset.status] || btn.dataset.status;
      currentPage = 1;
      realizarPesquisaEntrada();
    });
  });

  if (btnPrevPage) {
    btnPrevPage.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderizarTabelaEntradas();
        atualizarPaginacaoEntrada();
      }
    });
  }

  if (btnNextPage) {
    btnNextPage.addEventListener("click", () => {
      const totalPages = Math.ceil(filteredData.length / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderizarTabelaEntradas();
        atualizarPaginacaoEntrada();
      }
    });
  }

  // Botões de ação
  if (btnIgnorar) {
    btnIgnorar.addEventListener("click", async () => {
      const selecionados = obterItensSelecionados();
      if (selecionados.length === 0) {
        // Modal informativo — mais visível que toast
        const infoOverlay = document.createElement("div");
        infoOverlay.style.cssText =
          "position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:99999;display:flex;align-items:center;justify-content:center;";
        infoOverlay.innerHTML = `
          <div style="background:#fff;border-radius:10px;padding:28px 24px;max-width:380px;width:88%;box-shadow:0 6px 24px rgba(0,0,0,0.2);text-align:center;font-family:inherit;">
            <div style="font-size:36px;margin-bottom:10px;">☑️</div>
            <h3 style="margin:0 0 8px;font-size:16px;color:#333;">Selecione uma entrada</h3>
            <p style="margin:0 0 18px;color:#555;font-size:14px;line-height:1.5;">Marque o <strong>checkbox ☐</strong> à esquerda da linha que deseja excluir e clique em <strong>Excluir</strong> novamente.</p>
            <button id="__btnInfoOk" style="padding:8px 22px;border-radius:6px;border:none;background:#1976d2;color:#fff;cursor:pointer;font-size:14px;">Entendido</button>
          </div>
        `;
        document.body.appendChild(infoOverlay);
        infoOverlay
          .querySelector("#__btnInfoOk")
          .addEventListener("click", () => infoOverlay.remove());
        infoOverlay.addEventListener("click", (e) => {
          if (e.target === infoOverlay) infoOverlay.remove();
        });
        return;
      }

      // Modal de confirmação centralizado
      const confirmed = await new Promise((resolve) => {
        // overlay
        const overlay = document.createElement("div");
        overlay.style.cssText =
          "position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:99999;display:flex;align-items:center;justify-content:center;";

        // caixa
        const box = document.createElement("div");
        box.style.cssText =
          "background:#fff;border-radius:10px;padding:32px 28px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.22);text-align:center;font-family:inherit;";

        box.innerHTML = `
          <div style="font-size:44px;margin-bottom:12px;">🗑️</div>
          <h3 style="margin:0 0 10px;font-size:18px;color:#b71c1c;">Excluir entrada(s)?</h3>
          <p style="margin:0 0 22px;color:#444;font-size:14px;line-height:1.5;">
            Os dados de <strong>${selecionados.length} entrada(s)</strong> serão <strong>excluídos permanentemente</strong> do sistema e do banco de dados.<br><br>
            <span style="color:#666;">Os produtos cadastrados <strong>não serão removidos</strong>.</span>
          </p>
          <div style="display:flex;gap:12px;justify-content:center;">
            <button id="__btnCancelarExcluir" style="padding:10px 24px;border-radius:6px;border:1px solid #ccc;background:#f5f5f5;cursor:pointer;font-size:14px;">Cancelar</button>
            <button id="__btnConfirmarExcluir" style="padding:10px 24px;border-radius:6px;border:none;background:#d32f2f;color:#fff;cursor:pointer;font-size:14px;font-weight:600;">Sim, excluir</button>
          </div>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        const cleanup = (val) => {
          overlay.remove();
          resolve(val);
        };
        box
          .querySelector("#__btnConfirmarExcluir")
          .addEventListener("click", () => cleanup(true));
        box
          .querySelector("#__btnCancelarExcluir")
          .addEventListener("click", () => cleanup(false));
        overlay.addEventListener("click", (e) => {
          if (e.target === overlay) cleanup(false);
        });
      });

      if (!confirmed) return;

      // Excluir cada entrada do banco via DELETE
      const apiResults = await Promise.all(
        selecionados.map(async (id) => {
          try {
            const res = await fetch("/api/entrada/manual/" + id, {
              method: "DELETE",
            });
            if (!res.ok) throw new Error("Status " + res.status);
            return { id, ok: true };
          } catch (err) {
            console.error("Erro ao excluir entrada", id, err);
            return { id, ok: false, err: String(err) };
          }
        }),
      );

      // SEMPRE remover do cache local — o usuário já confirmou a exclusão
      selecionados.forEach((id) => {
        entradasData = entradasData.filter((e) => String(e.id) !== String(id));
      });

      const failed = apiResults.filter((r) => !r.ok);
      if (failed.length) {
        console.warn("Entradas que falharam no servidor:", failed);
        try {
          showEntradaToast(
            `Removido da lista. ${failed.length} entrada(s) podem não ter sido excluídas do banco — verifique se o servidor está ativo.`,
            5200,
          );
        } catch (e) {
          alert(
            `Removido da lista. ${failed.length} entrada(s) podem não ter sido excluídas do banco.`,
          );
        }
      } else {
        try {
          showEntradaToast(
            `${selecionados.length} entrada(s) excluída(s) com sucesso.`,
          );
        } catch (e) {}
      }

      // Reaplicar filtro/pesquisa e renderizar
      realizarPesquisaEntrada();
      renderizarTabelaEntradas();
      atualizarPaginacaoEntrada();
    });
  }

  if (btnDANFE) {
    btnDANFE.addEventListener("click", () => {
      const selecionados = obterItensSelecionados();
      if (selecionados.length === 0) {
        alert("Selecione ao menos uma entrada para visualizar o DANFE.");
        return;
      }

      // Abrir uma nova aba para cada entrada selecionada apontando para o endpoint
      // que gera/retorna o PDF: GET /api/entrada/:id/danfe
      try {
        selecionados.forEach((id, idx) => {
          const url = `/api/entrada/${encodeURIComponent(id)}/danfe`;
          // Para evitar pop-up blocking, primeiro abra em branco e depois defina a location
          const win = window.open("about:blank", "_blank");
          if (win) {
            // Navegar para o endpoint (o backend deve retornar o PDF com cabeçalho adequado)
            win.location.href = url;
          } else {
            // Fallback: navegar na própria janela se bloqueado
            window.location.href = url;
          }
        });
      } catch (err) {
        console.error("Erro abrindo DANFE:", err);
        alert("Erro ao abrir DANFE. Veja o console para detalhes.");
      }
    });
  }

  if (btnDownloadXML) {
    btnDownloadXML.addEventListener("click", () => {
      const selecionados = obterItensSelecionados();
      if (selecionados.length === 0) {
        alert("Selecione ao menos uma entrada para baixar o XML.");
        return;
      }
      alert("Baixando XML...");
    });
  }

  if (btnEspelho) {
    btnEspelho.addEventListener("click", () => {
      const selecionados = obterItensSelecionados();
      if (selecionados.length === 0) {
        alert("Selecione ao menos uma entrada para visualizar o espelho.");
        return;
      }
      alert("Abrindo espelho da nota fiscal...");
    });
  }

  console.log("✅ Event listeners configurados");
}

function obterItensSelecionados() {
  const checkboxes = document.querySelectorAll(
    '.entradas-table tbody input[type="checkbox"]:checked',
  );
  return Array.from(checkboxes).map((cb) => parseInt(cb.dataset.id));
}

function realizarPesquisaEntrada() {
  const searchInput = document.getElementById("searchEntrada");
  searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";

  currentPage = 1;

  // Filtrar dados
  filteredData = entradasData.filter((entrada) => {
    // Filtro de busca
    const matchSearch =
      !searchTerm ||
      (entrada.fornecedor &&
        entrada.fornecedor.toLowerCase().includes(searchTerm)) ||
      (entrada.numero && entrada.numero.toString().includes(searchTerm)) ||
      (entrada.chaveAcesso && entrada.chaveAcesso.includes(searchTerm));

    // Filtro de status
    let matchStatus = true;
    if (currentStatus !== "todas") {
      matchStatus =
        entrada.situacao && entrada.situacao.toLowerCase() === currentStatus;
    }

    return matchSearch && matchStatus;
  });

  renderizarTabelaEntradas();
  atualizarPaginacaoEntrada();

  console.log(
    `🔍 Pesquisa realizada - ${filteredData.length} entradas encontradas`,
  );
}

function renderizarTabelaEntradas() {
  const tbody = document.getElementById("entradasTableBody");

  if (!tbody) {
    console.error("❌ Tbody não encontrado");
    return;
  }

  // Limpar tabela
  tbody.innerHTML = "";

  if (filteredData.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `
            <td colspan="7" style="text-align: center; padding: 40px; color: #999;">
                Nenhuma entrada encontrada
            </td>
        `;
    tbody.appendChild(emptyRow);
    console.log("📋 Tabela vazia - 0 entradas");
    return;
  }

  // Calcular índices de paginação
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const dadosPaginados = filteredData.slice(startIndex, endIndex);

  function capitalizeStatus(s) {
    if (!s) return "-";
    try {
      s = String(s);
      return s.charAt(0).toUpperCase() + s.slice(1);
    } catch (e) {
      return s;
    }
  }

  // Renderizar linhas
  dadosPaginados.forEach((entrada) => {
    const row = document.createElement("tr");
    // Tornar toda linha clicável (mostrar cursor de mão)
    try {
      row.style.cursor = "pointer";
    } catch (e) {}

    // Adicionar classe/estilo especial apenas para entradas pendentes
    if ((entrada.situacao || "").toString().toLowerCase() === "pendente") {
      row.classList.add("pendente-row");
      row.style.backgroundColor = "#fffbf0";
      row.title = "Clique para editar esta entrada";
    }

    // Garantir que `valor` seja número antes de formatar (Sequelize DECIMAL pode vir como string)
    let valorNum = Number(entrada.valor);
    const valorDisplay =
      !isNaN(valorNum) && isFinite(valorNum)
        ? "R$ " + valorNum.toFixed(2)
        : "-";

    row.innerHTML = `
            <td>
                <input type="checkbox" data-id="${entrada.id}">
            </td>
            <td>${entrada.fornecedor || "-"}</td>
            <td>${entrada.numero || "-"}</td>
            <td>${entrada.emissao || "-"}</td>
            <td>${valorDisplay}</td>
            <td>${capitalizeStatus(entrada.situacao)}</td>
            <td>${entrada.relProdutos || "-"}</td>
        `;

    // Adicionar evento de clique para abrir entrada
    row.addEventListener("click", function (e) {
      // Não abrir se clicar no checkbox
      if (e.target.type === "checkbox") return;

      abrirRascunho(entrada);
    });

    tbody.appendChild(row);
  });

  console.log(
    `✅ Tabela renderizada com ${dadosPaginados.length} entradas (página ${currentPage})`,
  );
}

async function abrirRascunho(entrada) {
  try {
    console.log("📝 Abrindo entrada para edição:", entrada);
    // permitir entrar com dados vindos do banco ou com dados importados temporários
    const dadosParaEditar =
      entrada._data ||
      entrada._importedData ||
      entrada._draftData ||
      entrada._parsed ||
      entrada;
    if (!dadosParaEditar) {
      alert("Dados da entrada não encontrados.");
      return;
    }

    // Se já temos um ID, verificar se é uma importação XML pendente
    const existingId = dadosParaEditar && (dadosParaEditar.id || entrada.id);
    if (existingId) {
      // Verificar se a entrada veio de XML e possui itens pendentes de mapeamento
      const xmlPendente = await verificarEntradaXmlPendente(existingId);
      if (xmlPendente) {
        return; // verificarEntradaXmlPendente já tratou o redirecionamento/modal
      }

      // Se não for XML pendente, segue fluxo normal
      window.location.href =
        "./entrada-manual.html?id=" + encodeURIComponent(existingId);
      return;
    }

    // Caso não exista ID, tentar criar um rascunho no servidor e abrir a entrada retornada
    try {
      const created = await criarRascunhoNoServidor(dadosParaEditar);
      if (created && created.id) {
        window.location.href =
          "./entrada-manual.html?id=" + encodeURIComponent(created.id);
        return;
      }
    } catch (err) {
      console.warn(
        "Falha ao criar rascunho no servidor ao abrir rascunho:",
        err,
      );
    }

    // Se tudo falhar, informar o usuário (não gravar em local/session storage por política)
    alert(
      "Não foi possível abrir a entrada. Verifique a conexão com o servidor e tente novamente.",
    );
  } catch (e) {
    console.error("Erro ao abrir entrada:", e);
    alert("Erro ao abrir entrada: " + e.message);
  }
}

/**
 * Verifica se a entrada com o ID informado é uma importação XML pendente.
 * Se for, reabre o modal de mapeamento e retorna true.
 * Caso contrário, retorna false.
 */
async function verificarEntradaXmlPendente(entradaId) {
  try {
    // Buscar entrada completa no servidor
    const res = await fetch("/api/entrada/manual/" + encodeURIComponent(entradaId));
    if (!res.ok) return false;
    const entradaCompleta = await res.json();
    if (!entradaCompleta) return false;

    // Critérios para identificar importação XML pendente:
    // 1. Situação é "pendente"
    // 2. Possui chaveAcesso (indica que veio de XML/NF-e)
    // 3. Possui itens
    const situacao = (entradaCompleta.situacao || entradaCompleta.status || "").toLowerCase();
    const chaveAcesso = entradaCompleta.chaveAcesso || entradaCompleta.chNFe || "";
    const itens = entradaCompleta.itens || entradaCompleta.items || [];

    if (situacao !== "pendente" || !chaveAcesso || itens.length === 0) {
      return false;
    }

    // Verificar se há itens NÃO mapeados (sem matchedId)
    const itensNaoMapeados = itens.filter(function(it) {
      return !it.matchedId && !it.produtoSistemaId;
    });

    if (itensNaoMapeados.length === 0) {
      // Todos os itens já estão mapeados, pode seguir para entrada-manual
      return false;
    }

    // Construir objeto parsed a partir dos dados do banco
    const parsed = {
      fornecedor: entradaCompleta.fornecedor || entradaCompleta.fornecedorNome || "",
      numero: entradaCompleta.numero || "",
      dataEmissao: entradaCompleta.dataEmissao || "",
      chaveAcesso: chaveAcesso,
      valorTotal: entradaCompleta.valorTotal || 0,
      items: itens,
      _entradaId: entradaId, // marcar para saber que é atualização, não criação
    };

    console.log("🔄 Reabrindo modal de mapeamento para entrada XML pendente:", parsed);

    // Buscar candidatos para os itens não mapeados
    try {
      const candidates = await findCandidatesForItems(parsed.items);
      // Abrir modal com os dados da entrada existente
      showProductMappingModal(parsed, candidates || []);
      return true;
    } catch (e) {
      console.warn("Erro ao buscar candidatos para reabertura:", e);
      // Fallback: abrir modal sem candidatos
      showProductMappingModal(parsed, []);
      return true;
    }
  } catch (e) {
    console.warn("Erro ao verificar entrada XML pendente:", e);
    return false;
  }
}

function atualizarPaginacaoEntrada() {
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

// Inicializar quando o DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializarEntradaMercadoria);
} else {
  inicializarEntradaMercadoria();
}
