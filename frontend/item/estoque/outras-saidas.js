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
  // Intencional: não persistir em localStorage por segurança.
  // Persistência de submenus é desativada neste arquivo.
  try {
    /* noop */
  } catch (e) {}
}

function obterEstadoSubmenu(submenuId) {
  // Não usar localStorage — sempre retornar false (sem persistência)
  return false;
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

// substituir limpeza por noop para evitar uso de localStorage
function limparEstadoSubmenus() {
  try {
    /* noop - localStorage proibido */
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
// FUNCIONALIDADES DA PÁGINA SAÍDAS
// ========================================

// Dados mock de entradas
let entradasData = [];

// Estado da aplicação
let currentPage = 1;
let itemsPerPage = 50;
let currentStatus = "pendentes";
let searchTerm = "";

function inicializarEntradas() {
  console.log("📦 Inicializando página de Saídas");

  // Configurar event listeners
  configurarEventListeners();

  // Renderizar tabela inicial (vazia)
  renderizarTabela();

  // Carregar opções de Tipo de Entrada do servidor para popular o dropdown
  try {
    loadTipoEntradaOptionsFromServer();
  } catch (e) {
    console.warn("Falha ao carregar tipos do servidor na inicialização", e);
  }
  // carregar entradas (inclui rascunhos pendentes)
  try {
    loadEntradasFromServer();
  } catch (e) {
    console.warn("Falha ao carregar entradas na inicialização", e);
  }

  console.log("✅ Página de Saídas inicializada");
}

function configurarEventListeners() {
  // Botões de ação
  const btnNovaEntrada = document.getElementById("btnNovaEntrada");
  const btnCompartilhar = document.getElementById("btnCompartilhar");
  const btnMaisFiltros = document.getElementById("btnMaisFiltros");
  const btnPesquisar = document.getElementById("btnPesquisar");

  if (btnNovaEntrada) {
    btnNovaEntrada.addEventListener("click", abrirModalNovaEntrada);
  }

  if (btnCompartilhar) {
    btnCompartilhar.addEventListener("click", async () => {
      try {
        console.log("📤 Compartilhar: Gerando PDF de Saídas");

        // obter entradas filtradas e apenas a página atual (respeitar paginação)
        const dadosFiltrados = filtrarDados();
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const dadosDaPagina = Array.isArray(dadosFiltrados)
          ? dadosFiltrados.slice(startIndex, endIndex)
          : [];
        if (!Array.isArray(dadosDaPagina) || dadosDaPagina.length === 0) {
          if (window.showToast)
            window.showToast(
              "Nenhuma entrada encontrada para exportar",
              "info",
            );
          else alert("Nenhuma entrada encontrada para exportar");
          return;
        }

        // mapear entradas da página -> formato de "produtos" esperado pelo backend/template
        const produtosMapeados = [];
        dadosDaPagina.forEach((ent) => {
          const entId = ent.id || ent.ID || "";
          const itens = Array.isArray(ent.itens)
            ? ent.itens
            : Array.isArray(ent.items)
              ? ent.items
              : [];
          if (!itens || itens.length === 0) {
            const custo =
              Number(ent.valor || ent.preco_custo || ent.custo || 0) || 0;
            produtosMapeados.push({
              codigo: String(entId),
              descricao: String(
                ent.tipoEntrada || ent.observacao || ent.observacoes || "",
              ),
              unidade: "",
              grupo: ent.tipoEntrada || "",
              marca: "",
              preco_custo: custo,
              preco_venda:
                Number(ent.valorTotal || ent.total || custo) || custo,
              dataEntrada: ent.dataEmissao || ent.data || ent.createdAt || "",
            });
          } else {
            itens.forEach((it) => {
              const quantidade =
                Number(it.quantidade || it.qty || it.qtd || 1) || 1;
              const custo =
                Number(it.custo || it.preco_custo || it.valor || 0) || 0;
              const total = Number(it.total || custo * quantidade || 0) || 0;
              const unidadeBase = it.unidade || it.unidadeMedida || "";
              const unidadeCom =
                unidadeBase + (quantidade ? "\nQtd: " + quantidade : "");

              produtosMapeados.push({
                codigo: String(entId),
                descricao: String(it.produto || it.descricao || it.nome || ""),
                unidade: unidadeCom,
                grupo: it.categoria || ent.tipoEntrada || "",
                marca: it.marca || "",
                preco_custo: custo,
                preco_venda: total,
                dataEntrada: ent.dataEmissao || ent.data || ent.createdAt || "",
              });
            });
          }
        });

        // obter dados da empresa (logo/razão) similar ao que outros relatórios fazem
        let companyRazao = "PET CRIA LTDA";
        let companyLogo = null;
        try {
          let empArr = [];
          if (window.ApiClient && typeof ApiClient.getEmpresas === "function") {
            empArr = await ApiClient.getEmpresas();
          } else {
            try {
              empArr = JSON.parse(
                localStorage.getItem("empresasData_v1") || "[]",
              );
            } catch (e) {
              empArr = [];
            }
          }
          if (Array.isArray(empArr) && empArr.length > 0) {
            const e0 = empArr[0] || {};
            companyRazao =
              e0.razaoSocial || e0.nome || e0.razao || companyRazao;
            companyLogo =
              e0.logoDataUrl || e0.logoDataUrl || e0.logo || e0.imagem || null;
          }
        } catch (e) {
          /* ignore */
        }

        // chamada para backend
        const API_BASE =
          (window.__API_BASE__ && window.__API_BASE__.toString()) ||
          window.location.origin;
        const apiUrl =
          API_BASE.replace(/\/$/, "") + "/api/relatorios/entradas/pdf";

        // evitar enviar logo gigante (mesma heurística utilizada em outros relatórios)
        let logoToSend = companyLogo;
        if (logoToSend && typeof logoToSend === "string") {
          const estimatedSize = (logoToSend.length * 3) / 4;
          if (estimatedSize > 150000) {
            logoToSend = null;
          }
        }

        // enviar largura da logo em pontos (pt). Ajuste padrão para 90 (menor que o relatório de produtos original).
        const payload = {
          entradas: dadosDaPagina,
          produtos: produtosMapeados,
          companyLogo: logoToSend,
          companyRazao,
          companyLogoWidth: 90,
        };
        let resp = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!resp.ok && resp.status === 413 && logoToSend) {
          // tentar novamente sem logo
          const payload2 = {
            entradas: dadosFiltrados,
            produtos: produtosMapeados,
            companyLogo: null,
            companyRazao,
          };
          resp = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload2),
          });
        }
        if (!resp.ok) throw new Error("Resposta do servidor: " + resp.status);

        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        // Abrir em modal com visualizador de PDF (reaproveitar função existente)
        if (typeof openPdfModal === "function") {
          openPdfModal(url, "Cadastro detalhado de saídas");
        } else if (typeof openPdfModalFallback === "function") {
          openPdfModalFallback(url, "Cadastro detalhado de saídas");
        } else {
          // criar fallback local (modal centralizado) para garantir abertura na mesma aba
          (function createLocalPdfModal(blobUrl, title) {
            if (document.getElementById("pdfModalOverlay_local")) return;
            const styleId = "pdfModalStyles_local";
            if (!document.getElementById(styleId)) {
              const style = document.createElement("style");
              style.id = styleId;
              style.innerHTML = `
                                .pdf-modal-overlay-local{position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:14000}
                                .pdf-modal-local{width:92%;max-width:1150px;height:86%;background:#fff;border-radius:6px;box-shadow:0 12px 40px rgba(2,6,23,0.45);overflow:hidden;display:flex;flex-direction:column}
                                .pdf-modal-header-local{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e6e6e6;background:#f7f7f8}
                                .pdf-modal-title-local{font-weight:600;color:#222}
                                .pdf-modal-iframe-local{flex:1;border:0;width:100%;height:100%}
                                .pdf-modal-close-local{background:#fff;border:1px solid #ddd;padding:6px 10px;border-radius:6px}
                            `;
              document.head.appendChild(style);
            }

            const overlay = document.createElement("div");
            overlay.id = "pdfModalOverlay_local";
            overlay.className = "pdf-modal-overlay-local";
            const modal = document.createElement("div");
            modal.className = "pdf-modal-local";
            const header = document.createElement("div");
            header.className = "pdf-modal-header-local";
            const hTitle = document.createElement("div");
            hTitle.className = "pdf-modal-title-local";
            hTitle.textContent = title || "Relatório";
            const toolbar = document.createElement("div");
            toolbar.style.display = "flex";
            toolbar.style.gap = "8px";
            toolbar.style.alignItems = "center";
            const viewBtn = document.createElement("a");
            viewBtn.href = "#";
            viewBtn.textContent = "Ver em uma nova aba";
            viewBtn.onclick = function (e) {
              e.preventDefault();
              window.open(blobUrl, "_blank");
            };
            const closeBtn = document.createElement("button");
            closeBtn.className = "pdf-modal-close-local";
            closeBtn.textContent = "✕";
            closeBtn.onclick = closeLocal;
            toolbar.appendChild(viewBtn);
            toolbar.appendChild(closeBtn);
            header.appendChild(hTitle);
            header.appendChild(toolbar);
            const iframe = document.createElement("iframe");
            iframe.className = "pdf-modal-iframe-local";
            iframe.src = blobUrl;
            iframe.type = "application/pdf";
            modal.appendChild(header);
            modal.appendChild(iframe);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            function onKey(e) {
              if (e.key === "Escape") closeLocal();
            }
            document.addEventListener("keydown", onKey);
            overlay.addEventListener("click", function (ev) {
              if (ev.target === overlay) closeLocal();
            });
            function closeLocal() {
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
          })(url, "Cadastro detalhado de saídas");
        }
      } catch (err) {
        console.error("[outras-saidas] erro ao gerar PDF de saídas", err);
        if (window.showToast)
          window.showToast(
            "Erro ao gerar PDF: " + (err && err.message ? err.message : err),
            "error",
            5000,
          );
        else
          alert(
            "Erro ao gerar PDF: " + (err && err.message ? err.message : err),
          );
      }
    });
  }

  if (btnMaisFiltros) {
    btnMaisFiltros.addEventListener("click", toggleMaisFiltros);
  }

  if (btnPesquisar) {
    btnPesquisar.addEventListener("click", () => {
      realizarPesquisa();
    });
  }

  // Campo de pesquisa
  const searchInput = document.getElementById("searchEntradas");
  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        realizarPesquisa();
      }
    });
  }

  // Tabs de status
  const statusTabs = document.querySelectorAll(".status-tab");
  statusTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      statusTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentStatus = tab.dataset.status;
      currentPage = 1;
      renderizarTabela();
      console.log(`📊 Filtro de status alterado para: ${currentStatus}`);
    });
  });

  // Items per page
  const itemsPerPageSelect = document.getElementById("itemsPerPage");
  if (itemsPerPageSelect) {
    itemsPerPageSelect.addEventListener("change", (e) => {
      itemsPerPage = parseInt(e.target.value);
      currentPage = 1;
      renderizarTabela();
      console.log(`📄 Items por página alterado para: ${itemsPerPage}`);
    });
  }

  // Paginação
  const btnPrevPage = document.getElementById("btnPrevPage");
  const btnNextPage = document.getElementById("btnNextPage");

  if (btnPrevPage) {
    btnPrevPage.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderizarTabela();
      }
    });
  }

  if (btnNextPage) {
    btnNextPage.addEventListener("click", () => {
      const totalPages = Math.ceil(entradasData.length / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderizarTabela();
      }
    });
  }

  console.log("✅ Event listeners configurados");
}

function realizarPesquisa() {
  const searchInput = document.getElementById("searchEntradas");
  if (searchInput) {
    searchTerm = searchInput.value.trim();
    currentPage = 1;
    renderizarTabela();
    console.log(`🔍 Pesquisando por: "${searchTerm}"`);
  }
}

// Formata data para dd/mm/aaaa (aceita ISO, timestamp ou string)
function formatDateBR(value) {
  if (!value && value !== 0) return "";
  try {
    // aceitar objetos Date ou usar parser robusto
    let d;
    if (value instanceof Date) d = value;
    else if (typeof value === "number") d = new Date(value);
    else d = parseDateValue(value);

    if (isNaN(d.getTime())) return String(value);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return String(value);
  }
}

// Formata data como YYYY-MM-DD (local)
function formatDateYMD(value) {
  let d = value instanceof Date ? value : parseDateValue(value);
  if (!d || isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function renderizarTabela() {
  const tbody = document.getElementById("entradasTableBody");

  if (!tbody) {
    console.error("❌ Tbody não encontrado");
    return;
  }

  // Limpar tabela
  tbody.innerHTML = "";

  // Se não há dados, mostrar mensagem
  if (entradasData.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.className = "empty-row";
    emptyRow.innerHTML = `
            <td colspan="6">Nenhuma entrada encontrada</td>
        `;
    tbody.appendChild(emptyRow);

    // Atualizar paginação
    atualizarPaginacao(0);
    return;
  }

  // Filtrar dados
  let dadosFiltrados = filtrarDados();

  // Calcular paginação
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const dadosPaginados = dadosFiltrados.slice(startIndex, endIndex);

  // Renderizar linhas
  dadosPaginados.forEach((entrada) => {
    const row = document.createElement("tr");
    const displayValor =
      typeof entrada.valor === "number"
        ? entrada.valor
        : Number(entrada.valor || 0);
    const valorText = "R$ " + displayValor.toFixed(2).replace(".", ",");
    const dataText = formatDateBR(entrada.dataEmissao);
    const obsText = entrada.observacao || entrada.observacoes || "";
    const situText = entrada.situacao || entrada.status || "Pendente";

    // Format display ID: show only last 6 digits for readability, keep full id in data-id and title
    const rawId = String(entrada.id || "");
    let displayId = rawId;
    if (/^sim-\d+$/.test(rawId)) {
      displayId = rawId.replace(/^sim-/, "").slice(-6);
    }

    row.innerHTML = `
            <td title="${escapeHtml(rawId)}">${escapeHtml(displayId)}</td>
            <td>${escapeHtml(String(entrada.tipoEntrada || ""))}</td>
            <td>${escapeHtml(String(dataText))}</td>
            <td>${escapeHtml(String(obsText))}</td>
            <td>${escapeHtml(String(valorText))}</td>
            <td><span class="badge badge-${escapeHtml(String(situText).toLowerCase())}">${escapeHtml(String(situText))}</span></td>
            <td class="cell-actions"><button class="btn-delete-entry" data-id="${escapeHtml(rawId)}" title="Excluir entrada">✖</button></td>
        `;
    // tornar linha clicável para abrir rascunho
    row.classList.add("clickable-row");
    row.addEventListener("click", function () {
      try {
        openDraftEntrada(entrada.id);
      } catch (e) {
        console.warn("Erro ao abrir rascunho", e);
      }
    });

    // configurar botão de excluir (parar propagation para não abrir modal)
    const btnDel = row.querySelector(".btn-delete-entry");
    if (btnDel) {
      btnDel.addEventListener("click", function (ev) {
        ev.stopPropagation();
        const id = this.getAttribute("data-id");
        if (!id) return;
        showConfirmModal("Deseja realmente excluir esta entrada?", async () => {
          try {
            const url = "/api/saida/manual/" + encodeURIComponent(id);
            const res = await fetch(url, { method: "DELETE" });
            if (!res.ok) {
              const txt = await res.text().catch(() => null);
              throw new Error(txt || res.status);
            }
            // remover do cache local
            entradasData = entradasData.filter(
              (e) => String(e.id) !== String(id),
            );
            // remover a linha do DOM
            try {
              row.remove();
            } catch (e) {}
            renderizarTabela();
            console.log("[outras-entradas] entrada excluída id=", id);
          } catch (err) {
            console.error("[outras-entradas] erro ao excluir entrada", err);
            showConfirmModal(
              "Erro ao excluir entrada: " +
                (err && err.message ? err.message : err),
            );
          }
        });
      });
    }
    // ajustar visual da coluna de situação (ícone para finalizadas)
    try {
      const situCell = row.querySelector("td:nth-child(6)");
      if (situCell) {
        const s = String(entrada.situacao || "");
        const isFinal = s.toLowerCase().includes("final");
        if (isFinal) {
          situCell.innerHTML = `<span class="status-cell"><span class="status-icon">✔</span><span class="status-text">${escapeHtml(s)}</span></span>`;
        } else {
          situCell.innerHTML = `<span class="badge badge-${escapeHtml(s.toLowerCase())}">${escapeHtml(s)}</span>`;
        }
      }
    } catch (e) {
      /* noop */
    }

    tbody.appendChild(row);
  });

  // Atualizar paginação
  atualizarPaginacao(dadosFiltrados.length);
}

// Converte diferentes formatos comuns (ISO, YYYY-MM-DD, DD/MM/YYYY, timestamp) para Date
function parseDateValue(value) {
  if (!value) return new Date("");
  try {
    if (value instanceof Date) return value;
    if (typeof value === "number") return new Date(value);
    if (typeof value === "string") {
      const s = value.trim();
      // ISO-like (contains T) or YYYY-MM-DD
      if (s.indexOf("T") !== -1) return new Date(s);
      // try ISO yyyy-mm-dd (treat as local date to avoid timezone shift)
      const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoMatch) {
        const year = parseInt(isoMatch[1], 10);
        const month = parseInt(isoMatch[2], 10) - 1;
        const day = parseInt(isoMatch[3], 10);
        return new Date(year, month, day);
      }
      // try dd/mm/yyyy
      const brMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (brMatch) {
        const day = parseInt(brMatch[1], 10);
        const month = parseInt(brMatch[2], 10) - 1;
        const year = parseInt(brMatch[3], 10);
        return new Date(year, month, day);
      }
      // fallback
      const d = new Date(s);
      return d;
    }
    return new Date(value);
  } catch (e) {
    return new Date("");
  }
}

function filtrarDados() {
  let dados = [...entradasData];

  // Filtrar por status
  if (currentStatus !== "todas") {
    dados = dados.filter((entrada) => {
      const situ = String(entrada.situacao || "").toLowerCase();
      if (currentStatus === "pendentes") {
        return situ.indexOf("pend") === 0 || situ === "pendente";
      } else if (currentStatus === "finalizadas") {
        // aceitar 'Finalizada' ou 'Finalizado' ou variações
        return situ.includes("final");
      }
      return true;
    });
  }

  // Filtrar por termo de pesquisa
  if (searchTerm) {
    dados = dados.filter((entrada) => {
      return (
        entrada.id.toString().includes(searchTerm) ||
        entrada.tipoEntrada.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }

  // Filtrar por Tipo de Entrada (se o usuário aplicou um filtro)
  try {
    let tipoFilterVal = "";
    if (Array.isArray(selectedTipoFilters) && selectedTipoFilters.length > 0) {
      tipoFilterVal = String(selectedTipoFilters[0] || "").trim();
    } else {
      const filtroEl = document.getElementById("tipoEntradaFilter");
      tipoFilterVal = filtroEl ? String(filtroEl.value || "").trim() : "";
    }
    if (tipoFilterVal) {
      dados = dados.filter((entrada) => {
        try {
          return String(entrada.tipoEntrada || "")
            .toLowerCase()
            .includes(tipoFilterVal.toLowerCase());
        } catch (e) {
          return false;
        }
      });
    }
  } catch (e) {
    console.warn("Erro ao filtrar por tipoEntrada", e);
  }

  // Filtrar por período (se houver)
  try {
    const periodoInput = document.querySelector(".periodo-input");
    if (
      periodoInput &&
      periodoInput.dataset.start &&
      periodoInput.dataset.end
    ) {
      const s = parseDateValue(periodoInput.dataset.start);
      const e = parseDateValue(periodoInput.dataset.end);
      s.setHours(0, 0, 0, 0);
      e.setHours(23, 59, 59, 999);
      dados = dados.filter((entrada) => {
        const d = parseDateValue(entrada.dataEmissao);
        if (isNaN(d.getTime())) return false;
        return d >= s && d <= e;
      });
    }
  } catch (err) {
    console.warn("Erro ao filtrar por período", err);
  }

  return dados;
}

// Normaliza um registro retornado pelo servidor para a forma que a UI espera
function normalizeServerEntry(d) {
  const idVal = d.id || d.ID || d._id || d.idEntrada || null;
  // normalize tipoEntrada
  const possibleTipoFields = [
    "tipoEntrada",
    "tipo",
    "tipoDescricao",
    "descricao",
    "tipo_id",
    "tipoId",
    "tipoEntradaId",
    "tipo_entrada_id",
    "tipo_entrada",
  ];
  let tipoRaw = "";
  for (const key of possibleTipoFields) {
    if (d[key] != null) {
      tipoRaw = d[key];
      break;
    }
  }
  let tipoNormalized = "";
  try {
    if (typeof tipoRaw === "object" && tipoRaw !== null) {
      const desc =
        tipoRaw.descricao ||
        tipoRaw.nome ||
        tipoRaw.label ||
        tipoRaw.labelName ||
        "";
      const tid =
        tipoRaw.id || tipoRaw.ID || tipoRaw._id || tipoRaw.codigo || "";
      tipoNormalized = tid ? `${tid} - ${desc}` : desc;
    } else {
      const s = String(tipoRaw || "").trim();
      const foundById = tipoEntradaOptions.find(
        (t) => t.id != null && String(t.id) === s,
      );
      if (foundById) {
        tipoNormalized = foundById.id
          ? `${foundById.id} - ${foundById.descricao}`
          : foundById.descricao;
      } else if (s) {
        tipoNormalized = s;
      } else {
        tipoNormalized = d.categoriaFinanceira || d.categoria || "";
      }
    }
  } catch (e) {
    tipoNormalized = String(tipoRaw || "");
  }

  // tentar ler valor diretamente (prioridade: valor, total, valorTotal)
  let valor = Number(d.valor || d.total || d.valorTotal || 0) || 0;

  const itens = d.itens || d.items || [];
  // se servidor não forneceu um valor válido, calcular somando os itens (fallback)
  if ((!valor || valor === 0) && Array.isArray(itens) && itens.length > 0) {
    try {
      const sum = itens.reduce((s, it) => {
        const t =
          Number(
            it.total ||
              (it.custo && it.quantidade
                ? Number(it.custo) * Number(it.quantidade)
                : 0) ||
              0,
          ) || 0;
        return s + t;
      }, 0);
      if (sum && sum > 0) valor = sum;
    } catch (e) {
      /* noop - manter valor como está */
    }
  }

  const situacao = (function () {
    const raw = d.situacao || d.status || "Pendente";
    try {
      const s = String(raw).trim();
      if (!s) return "Pendente";
      return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    } catch (e) {
      return "Pendente";
    }
  })();

  return {
    id: idVal,
    tipoEntrada: tipoNormalized || d.categoriaFinanceira || d.categoria || "",
    dataEmissao: d.dataEmissao || d.createdAt || d.data || d.dataCriacao || "",
    observacao: d.observacao || d.observacaoEntrada || d.observacoes || "",
    valor: valor,
    itens: Array.isArray(itens) ? itens : [],
    situacao: situacao,
  };
}

async function openDraftEntrada(id) {
  if (!id) return;
  // localizar entrada
  // Sempre buscar a versão mais atualizada do servidor para garantir itens e situação
  let entrada = null;
  try {
    const res = await fetch("/api/saida/manual/" + encodeURIComponent(id));
    if (res.ok) {
      entrada = await res.json();
      // atualizar cache local
      const idx = entradasData.findIndex(
        (e) => String(e.id) === String(entrada.id),
      );
      if (idx !== -1)
        entradasData[idx] = Object.assign({}, entradasData[idx], entrada);
      else entradasData.unshift(entrada);
    } else {
      // fallback para cache local
      entrada = entradasData.find((e) => String(e.id) === String(id));
    }
  } catch (e) {
    console.warn(
      "[outras-entradas] falha ao buscar rascunho do servidor, usando cache local",
      e,
    );
    entrada = entradasData.find((e) => String(e.id) === String(id));
  }
  if (!entrada) {
    console.warn("[outras-entradas] rascunho não encontrado id=", id);
    return;
  }

  // preencher campos do modal
  try {
    // abrir modal primeiro (limpa formulário) e depois popular para evitar sobrescrever valores
    abrirModalNovaEntrada();
    // sinalizar que estamos populando campos para não disparar autosave
    isPopulatingForm = true;

    const tipoInput = document.getElementById("tipoEntrada");
    const observacoes = document.getElementById("observacoes");
    const estoqueInput = document.getElementById("estoqueItem");
    const custoInput = document.getElementById("custoItem");
    const produtoInput = document.getElementById("produtoItem");

    // tipoEntrada pode estar em categoriaFinanceira ou tipoEntrada
    let tipoVal = entrada.tipoEntrada || entrada.categoriaFinanceira || "";
    if (typeof tipoVal === "string" && tipoVal.indexOf(" - ") >= 0) {
      tipoVal = tipoVal.split(" - ").slice(1).join(" - ").trim();
    }
    if (tipoInput) {
      tipoInput.value = tipoVal;
      tipoInput.dispatchEvent(new Event("input"));
    }
    if (observacoes)
      observacoes.value = entrada.observacao || entrada.observacoes || "";

    // carregar itens (tentar várias chaves comuns)
    const rawItens =
      entrada.itens ||
      entrada.items ||
      entrada.itensEntrada ||
      entrada.itens ||
      [];
    itensAdicionados = Array.isArray(rawItens)
      ? rawItens.map((it) => ({
          id: it.id || it.codigo || Date.now(),
          produto: it.produto || it.descricao || it.nome || "",
          codigo: it.codigo || it.id || it.codigoProduto || "",
          estoque: it.estoque || it.estoqueAtual || "",
          custo: Number(it.custo || it.valor || it.preco || 0) || 0,
          quantidade: Number(it.quantidade || it.qty || it.qtd || 1) || 1,
          total:
            Number(
              it.total || (it.custo ? it.custo * (it.quantidade || 1) : 0),
            ) || 0,
        }))
      : [];

    // recalcular total
    totalEntradaValor = itensAdicionados.reduce(
      (s, it) => s + (Number(it.total) || 0),
      0,
    );
    renderizarItensAdicionados();
    atualizarTotalEntrada();

    // preencher data de emissão e situação no modal
    try {
      const dataEmissaoEl = document.getElementById("dataEmissao");
      if (dataEmissaoEl)
        dataEmissaoEl.textContent = formatDateBR(
          entrada.dataEmissao ||
            entrada.createdAt ||
            entrada.data ||
            entrada.dataCriacao,
        );
    } catch (e) {
      /*noop*/
    }
    try {
      const situacaoEl = document.getElementById("situacaoEntrada");
      if (situacaoEl)
        situacaoEl.textContent =
          entrada.situacao || entrada.status || "Pendente";
    } catch (e) {
      /*noop*/
    }

    // set draft id
    draftEntradaId = entrada.id;

    // permitir autosave após pequena latência — evita salvar campos que foram populados programaticamente
    setTimeout(() => {
      isPopulatingForm = false;
    }, 80);

    console.log("[outras-entradas] abriu rascunho id=", draftEntradaId);
  } catch (e) {
    console.error("[outras-entradas] erro ao popular modal com rascunho", e);
  }
}

function atualizarPaginacao(totalItems) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginationText = document.getElementById("paginationText");
  const btnPrevPage = document.getElementById("btnPrevPage");
  const btnNextPage = document.getElementById("btnNextPage");

  if (paginationText) {
    paginationText.textContent = `${totalItems > 0 ? currentPage : 0} of ${totalPages}`;
  }

  if (btnPrevPage) {
    btnPrevPage.disabled = currentPage <= 1;
  }

  if (btnNextPage) {
    btnNextPage.disabled = currentPage >= totalPages || totalPages === 0;
  }
}

// Atualiza a aba de status ativa programaticamente
function setCurrentStatus(status) {
  try {
    currentStatus = status || "todas";
    const tabs = document.querySelectorAll(".status-tab");
    tabs.forEach((t) => {
      if (t.dataset && t.dataset.status === currentStatus)
        t.classList.add("active");
      else t.classList.remove("active");
    });
    currentPage = 1;
    renderizarTabela();
  } catch (e) {
    console.warn("setCurrentStatus error", e);
  }
}

// ========================================
// MODAL NOVA SAÍDA
// ========================================

let itensAdicionados = [];
let totalEntradaValor = 0;
let selectedProduto = null; // objeto selecionado pelo autocomplete
let draftEntradaId = null; // id do rascunho salvo no servidor
// trava para evitar múltiplos saves concorrentes
let _savingDraft = false;
// trava para evitar autosave enquanto populamos o formulário programaticamente
let isPopulatingForm = false;

function abrirModalNovaEntrada() {
  const container = document.getElementById("novaEntradaContainer");
  if (!container) return;

  // criar backdrop se não existir
  let backdrop = document.getElementById("novaEntradaBackdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "novaEntradaBackdrop";
    backdrop.className = "modal-backdrop";
    document.body.appendChild(backdrop);
    backdrop.addEventListener("click", fecharModalNovaEntrada);
  }

  // remover qualquer estilo inline que force display:none e mostrar modal
  try {
    container.style.removeProperty("display");
  } catch (e) {}
  requestAnimationFrame(() => {
    backdrop.classList.add("show");
    container.classList.add("open");
    document.body.style.overflow = "hidden";
  });

  // limpar e preparar formulário
  limparFormularioEntrada();

  const hoje = new Date();
  const dataFormatada = hoje.toLocaleDateString("pt-BR");
  const dataEmissaoElement = document.getElementById("dataEmissao");
  if (dataEmissaoElement) dataEmissaoElement.textContent = dataFormatada;

  // foco no primeiro campo
  setTimeout(() => {
    const primeiro = document.getElementById("tipoEntrada");
    if (primeiro) primeiro.focus();
  }, 120);

  console.log("📋 Modal Nova Saida aberto (centralizado)");
}

function fecharModalNovaEntrada() {
  const container = document.getElementById("novaEntradaContainer");
  const backdrop = document.getElementById("novaEntradaBackdrop");
  if (container) {
    container.classList.remove("open");
  }
  // garantir remoção segura do backdrop mesmo que variáveis intermediárias não existam
  try {
    if (backdrop) {
      backdrop.classList.remove("show");
      setTimeout(() => {
        try {
          backdrop.remove();
        } catch (e) {}
      }, 220);
    }
  } catch (e) {
    console.warn("Erro ao remover backdrop do modal", e);
  }
  // restaurar rolagem da página
  document.body.style.overflow = "";

  // rolar para a tabela para manter contexto (opcional)
  const tabelaContainer = document.querySelector(".entradas-table-container");
  if (tabelaContainer)
    tabelaContainer.scrollIntoView({ behavior: "smooth", block: "start" });
  try {
    // remover classe do container para restaurar overflow/padding
    if (container && container.classList)
      container.classList.remove("mais-filtros-open");
  } catch (e) {}
  try {
    const panelEl = document.getElementById("maisFiltrosPanel");
    if (panelEl) {
      // se houver handlers de posicionamento armazenados, removê-los com segurança
      if (panelEl._positionHandler) {
        try {
          window.removeEventListener("resize", panelEl._positionHandler);
        } catch (e) {}
        try {
          window.removeEventListener("scroll", panelEl._positionHandler);
        } catch (e) {}
      }
      try {
        panelEl.remove();
      } catch (e) {}
    }
  } catch (e) {}
  const produtoItem = document.getElementById("produtoItem");
  const estoqueItem = document.getElementById("estoqueItem");
  const custoItem = document.getElementById("custoItem");
  const quantidadeItem = document.getElementById("quantidadeItem");
  const tipoEntradaEl = document.getElementById("tipoEntrada");
  const observacoesEl = document.getElementById("observacoes");

  if (tipoEntradaEl) tipoEntradaEl.value = "";
  if (observacoesEl) observacoesEl.value = "";
  if (produtoItem) produtoItem.value = "";
  if (estoqueItem) estoqueItem.value = "";
  if (custoItem) custoItem.value = "0,00";
  if (quantidadeItem) quantidadeItem.value = "1";

  // Limpar itens adicionados
  itensAdicionados = [];
  totalEntradaValor = 0;
  atualizarTotalEntrada();
  renderizarItensAdicionados();
  draftEntradaId = null;
}

// Toggle painel 'Mais filtros' (insere painel inline e anima altura)
function toggleMaisFiltros() {
  const btn = document.getElementById("btnMaisFiltros");
  const container = document.querySelector(".entradas-filters");
  if (!container) return;

  let panel = document.getElementById("maisFiltrosPanel");
  if (panel) {
    // fechar
    panel.style.maxHeight = panel.scrollHeight + "px";
    // pequeno delay para forçar recalculo antes de animar para 0
    requestAnimationFrame(() => {
      panel.classList.remove("show");
      panel.style.maxHeight = "0px";
    });
    updateMaisFiltrosButtonIcon(btn, false);
    // remover do DOM após transição
    panel.addEventListener("transitionend", function onEnd() {
      try {
        panel.remove();
      } catch (e) {}
      panel.removeEventListener("transitionend", onEnd);
    });
    return;
  }

  // criar painel
  panel = document.createElement("div");
  panel.id = "maisFiltrosPanel";
  panel.className = "mais-filtros-panel";
  panel.innerHTML = `
            <div class="mais-filtros-content">
            <div class="mais-filtros-field">
                <label class="mais-filtros-label">Tipo de Entrada</label>
                <div class="input-with-icon">
                    <input type="text" id="tipoEntradaFilter" class="form-input-modal mais-filtros-input" placeholder="Selecione um tipo" readonly>
                </div>
            </div>
            <div class="mais-filtros-actions">
                <button id="btnAplicarFiltros" class="btn btn-primary">Aplicar</button>
            </div>
        </div>
    `;

  container.appendChild(panel);
  // adicionar classe no container para garantir overflow visível e padding inferior
  try {
    if (container && container.classList)
      container.classList.add("mais-filtros-open");
  } catch (e) {}

  // popular tipos (se já carregados) — criar dropdown customizado para manter estilo do modal
  try {
    const input = document.getElementById("tipoEntradaFilter");
    if (input && Array.isArray(tipoEntradaOptions)) {
      const containerInput =
        input.closest(".input-with-icon") || input.parentElement;
      if (containerInput)
        containerInput.style.position =
          containerInput.style.position || "relative";

      // remover dropdown antigo se existir
      let dropdown = containerInput.querySelector(".input-select-dropdown");
      if (dropdown) dropdown.remove();

      dropdown = document.createElement("div");
      dropdown.className = "input-select-dropdown";
      tipoEntradaOptions.forEach((opt) => {
        const el = document.createElement("div");
        el.className = "item";
        el.textContent = opt.descricao || opt.nome || String(opt.id || "");
        el.addEventListener("click", function (e) {
          e.stopPropagation();
          // seleção única: substituir por novo valor
          const val = (el.textContent || "").trim();
          if (val) {
            selectedTipoFilters = [val];
            renderSelectedTipoTags();
            // aplicar filtro imediatamente ao selecionar uma opção
            try {
              currentPage = 1;
              renderizarTabela();
            } catch (e) {
              console.warn("Erro ao aplicar filtro imediatamente", e);
            }
            // fechar dropdown após seleção (não tocar em style.display para permitir reabrir)
            try {
              dropdown.classList.remove("show");
            } catch (e) {}
          }
        });
        dropdown.appendChild(el);
      });
      containerInput.appendChild(dropdown);

      // toggle dropdown on input click
      input.addEventListener("click", function (e) {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains("show");
        document
          .querySelectorAll(".input-select-dropdown.show")
          .forEach((d) => d.classList.remove("show"));
        if (!isOpen) dropdown.classList.add("show");
      });
      document.addEventListener("click", function (e) {
        if (!containerInput.contains(e.target))
          dropdown.classList.remove("show");
      });
    }
  } catch (e) {
    console.warn("Erro ao popular tipos no painel:", e);
  }

  // animar expandindo para altura do conteúdo
  requestAnimationFrame(() => {
    panel.classList.add("show");
    panel.style.maxHeight = panel.scrollHeight + "px";
  });

  updateMaisFiltrosButtonIcon(btn, true);

  // aplicar botão - aplica os filtros selecionados
  const btnAplicar = document.getElementById("btnAplicarFiltros");
  if (btnAplicar) {
    btnAplicar.addEventListener("click", () => {
      applyTipoFilter();
    });
  }
}

function updateMaisFiltrosButtonIcon(btn, isOpen) {
  if (!btn) return;
  // manter o ícone do filtro e adicionar chevron à direita
  let chevron = btn.querySelector(".chevron-icon");
  if (!chevron) {
    chevron = document.createElement("i");
    chevron.className = "chevron-icon fas";
    chevron.style.marginLeft = "8px";
    btn.appendChild(chevron);
  }
  chevron.className =
    "chevron-icon fas " + (isOpen ? "fa-chevron-up" : "fa-chevron-down");
}

function adicionarItem() {
  // exigir que tipo de entrada esteja selecionado antes de adicionar
  const tipoEntradaEl = document.getElementById("tipoEntrada");
  if (!tipoEntradaEl || !String(tipoEntradaEl.value || "").trim()) {
    alert("Por favor, selecione um Tipo de Entrada antes de adicionar itens!");
    try {
      const primeiro = document.getElementById("tipoEntrada");
      if (primeiro) primeiro.focus();
    } catch (e) {}
    return;
  }
  const produtoInput = document.getElementById("produtoItem");
  const estoqueInput = document.getElementById("estoqueItem");
  const custoInput = document.getElementById("custoItem");
  const quantidadeInput = document.getElementById("quantidadeItem");

  if (!produtoInput || !produtoInput.value.trim()) {
    alert("Por favor, selecione um produto!");
    return;
  }

  const quantidade = parseInt(quantidadeInput.value) || 1;
  const custo =
    parseFloat((custoInput.value || "0").toString().replace(",", ".")) || 0;

  const novoItem = {
    id: selectedProduto && selectedProduto.id ? selectedProduto.id : Date.now(),
    produto:
      selectedProduto && selectedProduto.nome
        ? selectedProduto.nome || selectedProduto.nome
        : produtoInput.value,
    codigo:
      selectedProduto && (selectedProduto.codigo || selectedProduto.id)
        ? selectedProduto.codigo || selectedProduto.id
        : null,
    estoque:
      estoqueInput.value ||
      (selectedProduto && selectedProduto.estoqueAtual != null
        ? selectedProduto.estoqueAtual
        : "-"),
    custo: custo,
    quantidade: quantidade,
    total: custo * quantidade,
  };

  itensAdicionados.push(novoItem);
  totalEntradaValor += novoItem.total;

  // Atualizar interface
  renderizarItensAdicionados();
  atualizarTotalEntrada();

  // Limpar campos do item
  produtoInput.value = "";
  estoqueInput.value = "";
  custoInput.value = "0,00";
  quantidadeInput.value = "1";

  console.log("✅ Item adicionado:", novoItem);
  // salvar rascunho no servidor (situação: Pendente)
  try {
    saveDraftEntrada("Pendente").catch((e) =>
      console.warn("Falha ao salvar rascunho", e),
    );
  } catch (e) {
    console.warn(e);
  }
}

function removerItem(itemId) {
  const itemIndex = itensAdicionados.findIndex(
    (item) => String(item.id) === String(itemId),
  );

  if (itemIndex !== -1) {
    const item = itensAdicionados[itemIndex];
    totalEntradaValor -= item.total;
    itensAdicionados.splice(itemIndex, 1);

    renderizarItensAdicionados();
    atualizarTotalEntrada();

    console.log("🗑️ Item removido:", item);
    try {
      saveDraftEntrada("Pendente").catch((e) =>
        console.warn("Falha ao salvar rascunho após remoção de item", e),
      );
    } catch (e) {
      console.warn(e);
    }
  }
}

function renderizarItensAdicionados() {
  const tbody = document.getElementById("itensTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (itensAdicionados.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `
            <td colspan="5" style="text-align: center; color: #999; padding: 20px;">
                Nenhum item adicionado
            </td>
        `;
    tbody.appendChild(emptyRow);
    return;
  }

  // Render items as cards similar to the provided design
  itensAdicionados.forEach((item) => {
    const tr = document.createElement("tr");
    tr.className = "added-item-row";
    tr.innerHTML = `
            <td colspan="5">
                <div class="added-item-card">
                    <div class="added-item-left"><div class="circle">1</div></div>
                    <div class="added-item-body">
                        <div class="added-item-title">${escapeHtml(item.produto)}</div>
                        <div class="added-item-sub">Código: ${escapeHtml(item.codigo || "")} &nbsp; Custo total: R$ ${(item.total || 0).toFixed(2).replace(".", ",")}</div>
                    </div>
                    <div class="added-item-right">${item.quantidade} UN <button class="btn-remove-item" data-id="${item.id}"><i class="fas fa-times"></i></button></div>
                </div>
            </td>
        `;
    tbody.appendChild(tr);
  });

  // attach remove handlers
  tbody.querySelectorAll(".btn-remove-item").forEach((b) =>
    b.addEventListener("click", function (e) {
      const id = this.getAttribute("data-id");
      if (id) removerItem(id);
    }),
  );
}

function atualizarTotalEntrada() {
  const totalElement = document.getElementById("totalEntrada");
  if (totalElement) {
    totalElement.textContent = totalEntradaValor.toFixed(2).replace(".", ",");
  }
}

// Limpa e prepara o formulário do modal Nova Saída
function limparFormularioEntrada() {
  try {
    const tipo = document.getElementById("tipoEntrada");
    const observacoes = document.getElementById("observacoes");
    const produto = document.getElementById("produtoItem");
    const estoque = document.getElementById("estoqueItem");
    const custo = document.getElementById("custoItem");
    const quantidade = document.getElementById("quantidadeItem");
    const dataEl = document.getElementById("dataEmissao");
    const situacaoEl = document.getElementById("situacaoEntrada");

    if (tipo) tipo.value = "";
    if (observacoes) observacoes.value = "";
    if (produto) produto.value = "";
    if (estoque) estoque.value = "";
    if (custo) custo.value = "0,00";
    if (quantidade) quantidade.value = "1";

    const hoje = new Date();
    if (dataEl) dataEl.textContent = formatDateBR(hoje);
    if (situacaoEl) situacaoEl.textContent = "Pendente";

    itensAdicionados = [];
    totalEntradaValor = 0;
    draftEntradaId = null;
    atualizarTotalEntrada();
    renderizarItensAdicionados();
  } catch (e) {
    console.warn("limparFormularioEntrada error", e);
  }
}

// --- Persistência de rascunho (servidor) ---
async function saveDraftEntrada(desiredSituacao) {
  if (_savingDraft) {
    console.log("[outras-entradas] saveDraftEntrada skipped: already saving");
    return;
  }
  _savingDraft = true;
  const tipoEntradaEl = document.getElementById("tipoEntrada");
  const observacoesEl = document.getElementById("observacoes");
  const payload = {
    tipoEntrada: tipoEntradaEl ? tipoEntradaEl.value : "",
    observacao: observacoesEl ? observacoesEl.value : "",
    itens: itensAdicionados || [],
    valor: totalEntradaValor || 0,
    dataEmissao: formatDateYMD(new Date()),
  };
  // Preservar situação existente quando não for intenção explícita de alterar
  let computedSituacao = desiredSituacao;
  if (!computedSituacao) {
    if (draftEntradaId) {
      const existing = entradasData.find(
        (e) => String(e.id) === String(draftEntradaId),
      );
      if (existing && existing.situacao) computedSituacao = existing.situacao;
    }
  }
  // Se ainda não tiver situação e não existe rascunho (criação), default para Pendente
  if (!computedSituacao && !draftEntradaId) computedSituacao = "Pendente";
  if (computedSituacao) payload.situacao = computedSituacao;
  // persistir também em um campo existente no modelo do backend
  // (Entrada não possui campo tipoEntrada no modelo; usamos `categoriaFinanceira` para armazenar a escolha)
  payload.categoriaFinanceira = payload.tipoEntrada;

  try {
    if (!draftEntradaId) {
      // se não há tipo e não há itens, evitar criar rascunho vazio
      if (
        (!payload.tipoEntrada || !String(payload.tipoEntrada).trim()) &&
        (!Array.isArray(payload.itens) || payload.itens.length === 0)
      ) {
        console.log(
          "[outras-entradas] rascunho não criado: sem tipo e sem itens",
        );
        return null;
      }
      console.log(
        "[outras-saidas] saveDraftEntrada payload (create):",
        payload,
      );
      const res = await fetch("/api/saida/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = await res.json();
        console.log(
          "[outras-entradas] saveDraftEntrada response (create):",
          created,
        );
        // usar o objeto retornado pelo servidor como fonte da verdade
        const normalized = normalizeServerEntry(created);
        draftEntradaId =
          created.id || created.ID || created._id || draftEntradaId;
        const existingIdx = entradasData.findIndex(
          (e) => String(e.id) === String(draftEntradaId),
        );
        if (existingIdx !== -1) entradasData[existingIdx] = normalized;
        else entradasData.unshift(normalized);
        renderizarTabela();
        console.log(
          "[outras-entradas] rascunho criado id=",
          draftEntradaId,
          "itensCount=",
          (normalized.itens || []).length,
        );
        return created;
      } else {
        const txt = await res.text().catch(() => null);
        throw new Error("Erro ao criar rascunho: " + (txt || res.status));
      }
    } else {
      console.log(
        "[outras-saidas] saveDraftEntrada payload (update):",
        payload,
        "draftId=",
        draftEntradaId,
      );
      const res = await fetch(
        "/api/saida/manual/" + encodeURIComponent(draftEntradaId),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (res.ok) {
        const updated = await res.json();
        console.log(
          "[outras-entradas] saveDraftEntrada response (update):",
          updated,
        );
        const normalized = normalizeServerEntry(updated);
        const idx = entradasData.findIndex(
          (e) => String(e.id) === String(draftEntradaId),
        );
        if (idx !== -1) {
          entradasData[idx] = normalized;
        } else {
          entradasData.unshift(normalized);
        }
        renderizarTabela();
        console.log(
          "[outras-entradas] rascunho atualizado id=",
          draftEntradaId,
          "itensCount=",
          (normalized.itens || []).length,
          "situacao=",
          normalized.situacao || "undefined",
        );
        return updated;
      } else {
        const txt = await res.text().catch(() => null);
        throw new Error("Erro ao atualizar rascunho: " + (txt || res.status));
      }
    }
  } catch (e) {
    console.warn("[outras-entradas] saveDraftEntrada error", e);
    throw e;
  } finally {
    _savingDraft = false;
  }
}

async function loadEntradasFromServer() {
  try {
    console.log("[outras-saidas] carregando saídas do servidor...");
    const res = await fetch("/api/saida/manual");
    console.log("[outras-saidas] GET /api/saida/manual status=", res.status);
    if (res.ok) {
      const data = await res.json();
      console.log("[outras-saidas] resposta raw:", data);
      try {
        if (Array.isArray(data) && data.length > 0) {
          console.log(
            "[outras-saidas] amostra raw[0]:",
            JSON.stringify(data[0], null, 2),
          );
          console.log("[outras-saidas] chaves raw[0]:", Object.keys(data[0]));
        }
      } catch (e) {
        console.warn(
          "[outras-entradas] não foi possível serializar amostra raw",
          e,
        );
      }
      if (Array.isArray(data)) {
        // normalizar campos esperados pela UI — servidor é a fonte da verdade
        entradasData = data.map((d) => normalizeServerEntry(d));
        console.log(
          "[outras-saidas] carregadas saídas do servidor (normalizadas):",
          entradasData.length,
        );
        // se houver entradas finalizadas e o filtro atual estiver em 'pendentes', mostrar todas automaticamente
        try {
          const hasFinalizadas = entradasData.some((e) =>
            String(e.situacao || "")
              .toLowerCase()
              .includes("final"),
          );
          if (hasFinalizadas && currentStatus === "pendentes") {
            console.log(
              "[outras-saidas] saídas finalizadas detectadas — alternando filtro para todas",
            );
            setCurrentStatus("todas");
            return;
          }
        } catch (e) {
          console.warn("Erro ao verificar situações ao carregar entradas", e);
        }
        renderizarTabela();
      } else {
        console.warn(
          "[outras-saidas] GET /api/saida/manual retornou não-array",
        );
      }
    } else {
      const txt = await res.text().catch(() => null);
      console.warn(
        "[outras-entradas] erro ao buscar entradas:",
        res.status,
        txt,
      );
    }
  } catch (e) {
    console.warn("Erro ao carregar entradas do servidor", e);
  }
}

async function finalizarEntrada() {
  const tipoEntrada = document.getElementById("tipoEntrada");

  if (!tipoEntrada || !tipoEntrada.value.trim()) {
    try {
      showToast("Por favor, selecione um Tipo de Entrada!", "error");
    } catch (e) {
      alert("Por favor, selecione um Tipo de Entrada!");
    }
    try {
      const primeiro = document.getElementById("tipoEntrada");
      if (primeiro) primeiro.focus();
    } catch (e) {}
    return;
  }

  // Se não houver itens carregados localmente, tentar buscar do servidor (caso seja rascunho recarregado)
  if (itensAdicionados.length === 0 && draftEntradaId) {
    try {
      const res = await fetch(
        "/api/saida/manual/" + encodeURIComponent(draftEntradaId),
      );
      if (res.ok) {
        const remote = await res.json();
        const rawItens =
          remote.itens || remote.items || remote.itensEntrada || [];
        if (Array.isArray(rawItens) && rawItens.length > 0) {
          itensAdicionados = rawItens.map((it) => ({
            id: it.id || it.codigo || Date.now(),
            produto: it.produto || it.descricao || it.nome || "",
            codigo: it.codigo || it.id || it.codigoProduto || "",
            estoque: it.estoque || it.estoqueAtual || "",
            custo: Number(it.custo || it.valor || it.preco || 0) || 0,
            quantidade: Number(it.quantidade || it.qty || it.qtd || 1) || 1,
            total:
              Number(
                it.total || (it.custo ? it.custo * (it.quantidade || 1) : 0),
              ) || 0,
          }));
          totalEntradaValor = itensAdicionados.reduce(
            (s, it) => s + (Number(it.total) || 0),
            0,
          );
          renderizarItensAdicionados();
          atualizarTotalEntrada();
        }
      }
    } catch (e) {
      console.warn("Erro ao buscar rascunho do servidor antes de finalizar", e);
    }
  }

  if (itensAdicionados.length === 0) {
    try {
      showToast("Por favor, adicione pelo menos um item!", "error");
    } catch (e) {
      alert("Por favor, adicione pelo menos um item!");
    }
    return;
  }

  // Persistir no servidor marcando como Finalizado
  (async () => {
    try {
      const saved = await saveDraftEntrada("Finalizado");

      // Se o backend retornou produtos atualizados, tentar atualizar UI local
      try {
        if (
          saved &&
          Array.isArray(saved.updatedProducts) &&
          saved.updatedProducts.length > 0
        ) {
          console.log(
            "[outras-entradas] backend retornou produtos atualizados:",
            saved.updatedProducts,
          );
          // para cada produto atualizado, tentar obter versão mais recente e atualizar UI se possível
          if (
            window.ApiClient &&
            typeof window.ApiClient.getProduto === "function"
          ) {
            for (const p of saved.updatedProducts) {
              try {
                const pidCandidate =
                  p.id ||
                  p.ID ||
                  p.idProduto ||
                  p.codigo ||
                  p.codigoProduto ||
                  p.codigo;
                if (!pidCandidate) continue;
                // Tentar buscar produto atualizado do backend
                let fresh = null;
                try {
                  fresh = await window.ApiClient.getProduto(pidCandidate);
                } catch (e) {
                  // tentar buscar por codigo via list
                  try {
                    const list = await window.ApiClient.getProdutos({
                      q: String(pidCandidate),
                    });
                    if (Array.isArray(list) && list.length > 0)
                      fresh = list.find(
                        (x) =>
                          String(x.id) === String(pidCandidate) ||
                          String(x.codigo) === String(pidCandidate),
                      );
                  } catch (e2) {}
                }
                if (fresh) {
                  // atualizar cache produtosLista se presente
                  try {
                    if (
                      window.produtosLista &&
                      Array.isArray(window.produtosLista)
                    ) {
                      const idx = window.produtosLista.findIndex(
                        (pp) =>
                          String(pp.id) === String(fresh.id) ||
                          String(pp.codigo) === String(fresh.codigo),
                      );
                      if (idx !== -1) {
                        window.produtosLista[idx] = Object.assign(
                          {},
                          window.produtosLista[idx],
                          fresh,
                        );
                      } else {
                        window.produtosLista.unshift(fresh);
                      }
                    } else if (
                      typeof produtosLista !== "undefined" &&
                      Array.isArray(produtosLista)
                    ) {
                      const idx = produtosLista.findIndex(
                        (pp) =>
                          String(pp.id) === String(fresh.id) ||
                          String(pp.codigo) === String(fresh.codigo),
                      );
                      if (idx !== -1) {
                        produtosLista[idx] = Object.assign(
                          {},
                          produtosLista[idx],
                          fresh,
                        );
                      } else {
                        produtosLista.unshift(fresh);
                      }
                    }
                  } catch (e) {
                    console.warn(
                      "Erro ao atualizar produtosLista com produto fresco",
                      e,
                    );
                  }
                }
              } catch (e) {
                console.warn("Erro ao processar produto atualizado", e);
              }
            }
          }
          // re-renderizar a lista de produtos para refletir mudanças
          try {
            if (typeof renderizarProdutos === "function")
              renderizarProdutos("todos");
            else if (typeof inicializarMeusItens === "function")
              inicializarMeusItens();
          } catch (e) {
            console.warn(
              "Falha ao recarregar meus-itens após resposta do backend",
              e,
            );
          }
        }
      } catch (e) {
        console.warn("Erro processando saved.updatedProducts", e);
      }
      // garantir que a situação do cache seja a retornada pelo servidor
      const idx = entradasData.findIndex(
        (e) =>
          String(e.id) ===
          String(saved.id || saved.ID || saved._id || draftEntradaId),
      );
      const finalSituacao =
        saved && (saved.situacao || saved.status)
          ? saved.situacao || saved.status
          : "Finalizado";
      if (idx !== -1) {
        entradasData[idx] = Object.assign({}, entradasData[idx], saved, {
          situacao: finalSituacao,
        });
      }
      // recarregar lista do servidor para garantir consistência
      try {
        await loadEntradasFromServer();
      } catch (e) {
        console.warn("Falha ao recarregar entradas após finalizar", e);
      }
      // Atualizar estoque dos produtos relacionados à entrada (cliente pediu atualização imediata)
      try {
        const itensParaAtualizar =
          saved && Array.isArray(saved.itens) && saved.itens.length > 0
            ? saved.itens
            : itensAdicionados;
        if (
          window.ApiClient &&
          Array.isArray(itensParaAtualizar) &&
          itensParaAtualizar.length > 0
        ) {
          const dataAjuste =
            saved && (saved.dataEmissao || saved.data)
              ? saved.dataEmissao || saved.data
              : new Date().toISOString();
          // resolver ID do produto (pode ser enviado apenas 'codigo' pelo frontend)
          const promises = itensParaAtualizar.map(async (it) => {
            const rawIdent = it.codigo || it.id || it.codigoProduto || null;
            const quantidade =
              Number(it.quantidade || it.qty || it.qtd || 0) || 0;
            if (!rawIdent || quantidade === 0)
              return { skipped: true, produtoIdent: rawIdent, quantidade };
            // tentar tratar rawIdent como id primeiro
            let resolvedId = null;
            try {
              // se existir produto com esse id, aceitar
              await window.ApiClient.getProduto(rawIdent);
              resolvedId = rawIdent;
            } catch (e) {
              // buscar por codigo/texto
              try {
                const list = await window.ApiClient.getProdutos({
                  q: String(rawIdent),
                });
                if (Array.isArray(list) && list.length > 0) {
                  const found = list.find(
                    (p) =>
                      String(p.codigo) === String(rawIdent) ||
                      String(p.id) === String(rawIdent),
                  );
                  if (found)
                    resolvedId = found.id || found.ID || found._id || null;
                }
              } catch (e2) {
                /* noop */
              }
            }
            if (!resolvedId)
              return { skipped: true, produtoIdent: rawIdent, quantidade };
            try {
              const res = await window.ApiClient.atualizarEstoque(
                resolvedId,
                quantidade,
                "adicionar",
                dataAjuste,
              );
              return { ok: true, produtoId: resolvedId, quantidade, res };
            } catch (err) {
              return { ok: false, produtoId: resolvedId, quantidade, err };
            }
          });
          console.log(
            "[outras-entradas] iniciando ajustes de estoque para itens:",
            itensParaAtualizar,
          );
          const results = await Promise.allSettled(promises);
          console.log("[outras-entradas] resultados ajustes estoque:", results);
          const failed = results
            .filter(
              (r) =>
                r.status === "fulfilled" && r.value && r.value.ok === false,
            )
            .concat(results.filter((r) => r.status === "rejected"));
          if (failed.length > 0) {
            console.warn(
              "[outras-entradas] alguns ajustes de estoque falharam",
              failed,
            );
            try {
              showToast(
                "Saída finalizada, porém falha ao atualizar estoque de alguns produtos",
                "warning",
              );
            } catch (e) {}
          } else {
            try {
              showToast("Estoque atualizado com sucesso", "success");
            } catch (e) {}
          }
          // tentar recarregar a tela de Meus Itens para refletir mudanças imediatas
          try {
            if (typeof inicializarMeusItens === "function")
              inicializarMeusItens();
            else if (typeof renderizarProdutos === "function")
              renderizarProdutos("todos");
          } catch (e) {
            console.warn(
              "Falha ao recarregar meus-itens após ajuste de estoque",
              e,
            );
          }
        }
      } catch (e) {
        console.warn(
          "Erro ao tentar atualizar estoque após finalizar entrada",
          e,
        );
      }
      // após finalizar, mostrar todas as entradas para o usuário ver o resultado
      try {
        setCurrentStatus("todas");
      } catch (e) {
        renderizarTabela();
      }
      showToast("Saídafinalizada com sucesso!", "success");
      fecharModalNovaEntrada();
    } catch (err) {
      console.error("Erro ao finalizar entrada", err);
      try {
        showToast(
          "Erro ao finalizar entrada: " +
            (err && err.message ? err.message : err),
          "error",
          6000,
        );
      } catch (e) {
        alert(
          "Erro ao finalizar entrada: " +
            (err && err.message ? err.message : err),
        );
      }
    }
  })();
}

function excluirEntrada() {
  const id = draftEntradaId;
  if (!id) {
    try {
      showToast("Nenhuma entrada selecionada para exclusão", "error");
    } catch (e) {
      alert("Nenhuma entrada selecionada para exclusão");
    }
    return;
  }
  showConfirmModal("Deseja realmente excluir esta entrada?", async () => {
    try {
      const url = "/api/saida/manual/" + encodeURIComponent(id);
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error(txt || res.status);
      }
      // remover do cache local
      entradasData = entradasData.filter((e) => String(e.id) !== String(id));
      renderizarTabela();
      fecharModalNovaEntrada();
      try {
        showToast("Entrada excluída com sucesso", "success");
      } catch (e) {}
    } catch (err) {
      console.error("Erro ao excluir entrada", err);
      try {
        showToast(
          "Erro ao excluir entrada: " +
            (err && err.message ? err.message : err),
          "error",
          6000,
        );
      } catch (e) {
        alert("Erro ao excluir entrada");
      }
    }
  });
}

function novaEntradaLimpa() {
  limparFormularioEntrada();
  console.log("🆕 Nova saída limpa");
}

function configurarEventosModal() {
  const btnNovaEntrada = document.getElementById("btnNovaEntrada");
  const btnAdicionarItem = document.getElementById("btnAdicionarItem");
  const btnFinalizar = document.getElementById("btnFinalizar");
  const btnExcluir = document.getElementById("btnExcluir");
  const btnNova = document.getElementById("btnNova");
  const btnVoltarLista = document.getElementById("btnVoltarLista");

  if (btnNovaEntrada) {
    btnNovaEntrada.removeEventListener("click", abrirModalNovaEntrada);
    btnNovaEntrada.addEventListener("click", abrirModalNovaEntrada);
  }

  if (btnAdicionarItem) {
    try {
      btnAdicionarItem.removeEventListener("click", adicionarItem);
    } catch (e) {}
    btnAdicionarItem.addEventListener("click", adicionarItem);
  }

  if (btnFinalizar) {
    try {
      btnFinalizar.removeEventListener("click", finalizarEntrada);
    } catch (e) {}
    btnFinalizar.addEventListener("click", finalizarEntrada);
  }

  if (btnExcluir) {
    try {
      btnExcluir.removeEventListener("click", excluirEntrada);
    } catch (e) {}
    btnExcluir.addEventListener("click", excluirEntrada);
  }

  if (btnNova) {
    try {
      btnNova.removeEventListener("click", novaEntradaLimpa);
    } catch (e) {}
    btnNova.addEventListener("click", novaEntradaLimpa);
  }

  if (btnVoltarLista) {
    try {
      btnVoltarLista.removeEventListener("click", fecharModalNovaEntrada);
    } catch (e) {}
    btnVoltarLista.addEventListener("click", fecharModalNovaEntrada);
  }

  console.log("✅ Eventos do formulário configurados");

  // configurar dropdown do campo Tipo de Entrada
  try {
    setupTipoEntradaDropdown();
  } catch (e) {
    console.warn("Erro ao configurar dropdown Tipo de Entrada", e);
  }
  // configurar popover de opções (ícone ...)
  try {
    setupTipoEntradaOptionsPopover();
  } catch (e) {
    console.warn("Erro ao configurar popover Tipo de Entrada", e);
  }
  // configurar autocomplete de produtos
  try {
    setupProdutoAutocomplete();
  } catch (e) {
    console.warn("Erro ao configurar autocomplete Produto", e);
  }

  // salvar automaticamente o tipo de entrada quando alterado (debounced)
  try {
    const tipoInput = document.getElementById("tipoEntrada");
    if (tipoInput) {
      const debouncedSave = debounce(function () {
        try {
          if (isPopulatingForm) return;
          saveDraftEntrada("Pendente").catch((e) =>
            console.warn("Falha ao salvar rascunho (tipo change)", e),
          );
        } catch (e) {
          console.warn(e);
        }
      }, 700);
      tipoInput.addEventListener("input", function () {
        if (isPopulatingForm) return;
        debouncedSave();
      });
      tipoInput.addEventListener("change", function () {
        if (isPopulatingForm) return;
        debouncedSave();
      });
    }
  } catch (e) {
    console.warn("Erro ao configurar autosave do tipoEntrada", e);
  }

  // salvar automaticamente as observações quando alteradas (debounced)
  try {
    const observacoesEl = document.getElementById("observacoes");
    if (observacoesEl) {
      const debouncedObsSave = debounce(function () {
        try {
          if (isPopulatingForm) return;
          saveDraftEntrada("Pendente").catch((e) =>
            console.warn("Falha ao salvar rascunho (observacoes)", e),
          );
        } catch (e) {
          console.warn(e);
        }
      }, 700);
      observacoesEl.addEventListener("input", function () {
        if (isPopulatingForm) return;
        debouncedObsSave();
      });
      observacoesEl.addEventListener("change", function () {
        if (isPopulatingForm) return;
        debouncedObsSave();
      });
    }
  } catch (e) {
    console.warn("Erro ao configurar autosave das observacoes", e);
  }
}

function setupTipoEntradaOptionsPopover() {
  const input = document.getElementById("tipoEntrada");
  if (!input) return;
  const container = input.closest(".input-with-icon") || input.parentElement;
  if (container)
    container.style.position = container.style.position || "relative";

  let pop = container.querySelector(".popover-menu");
  if (!pop) {
    pop = document.createElement("div");
    pop.className = "popover-menu";
    const novo = document.createElement("div");
    novo.className = "item";
    novo.innerHTML = '<i class="fas fa-plus"></i><span>Novo</span>';
    const editar = document.createElement("div");
    editar.className = "item";
    editar.innerHTML = '<i class="fas fa-pencil-alt"></i><span>Editar</span>';

    novo.addEventListener("click", function (e) {
      e.stopPropagation();
      pop.classList.remove("show");
      // abrir modal de novo tipo e preencher o campo quando salvo
      openNewTipoModal(async function (created) {
        try {
          if (created && created.descricao) {
            input.value = created.descricao;
            input.dispatchEvent(new Event("input"));
          }
        } catch (e) {
          console.warn(e);
        }
      });
    });

    editar.addEventListener("click", function (e) {
      e.stopPropagation();
      pop.classList.remove("show");
      // abrir modal de listagem/edição
      openModalListaTipoEntradas();
    });

    pop.appendChild(novo);
    pop.appendChild(editar);
    container.appendChild(pop);
  }

  const icon = container.querySelector(".options-icon-modal");
  if (!icon) return;

  icon.addEventListener("click", function (e) {
    e.stopPropagation();
    // fechar outros popovers
    document
      .querySelectorAll(".popover-menu.show")
      .forEach((p) => p.classList.remove("show"));
    const wasOpen = pop.classList.contains("show");
    if (wasOpen) pop.classList.remove("show");
    else pop.classList.add("show");
  });

  // fechar ao clicar fora
  document.addEventListener("click", function (ev) {
    if (!container.contains(ev.target)) pop.classList.remove("show");
  });
}

// Toast helper (canto superior direito)
function showToast(message, type = "success", timeout = 4000) {
  try {
    if (!document.getElementById("app-toast-container")) {
      const container = document.createElement("div");
      container.id = "app-toast-container";
      container.style.position = "fixed";
      container.style.top = "20px";
      container.style.right = "20px";
      container.style.zIndex = "200000";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.gap = "10px";
      document.body.appendChild(container);
    }

    const cont = document.getElementById("app-toast-container");
    const toast = document.createElement("div");
    toast.className = "app-toast " + (type || "success");
    toast.style.minWidth = "260px";
    toast.style.maxWidth = "380px";
    toast.style.padding = "12px 16px";
    toast.style.borderRadius = "8px";
    toast.style.boxShadow = "0 6px 18px rgba(0,0,0,0.12)";
    toast.style.display = "flex";
    toast.style.alignItems = "center";
    toast.style.gap = "12px";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-6px)";
    toast.style.transition = "all 260ms ease";
    // tipo: success -> verde claro, error -> vermelho claro, info -> azul
    if (type === "error") {
      toast.style.background = "#ffecec";
      toast.style.color = "#0b3b2e";
      toast.style.border = "1px solid #f5c6cb";
    } else {
      toast.style.background = "#e9f9f0";
      toast.style.color = "#114b2f";
      toast.style.border = "1px solid #bfe9cc";
    }

    const icon = document.createElement("div");
    icon.style.width = "28px";
    icon.style.height = "28px";
    icon.style.flex = "0 0 28px";
    icon.style.display = "flex";
    icon.style.alignItems = "center";
    icon.style.justifyContent = "center";
    icon.style.borderRadius = "50%";
    icon.style.background =
      type === "error" ? "rgba(255,0,0,0.08)" : "rgba(0,128,64,0.08)";
    icon.innerHTML = type === "error" ? "&#10060;" : "&#10004;";
    icon.style.fontSize = "14px";

    const txt = document.createElement("div");
    txt.style.flex = "1";
    txt.style.fontSize = "13px";
    txt.style.lineHeight = "1.2";
    txt.textContent = message || "";

    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "✖";
    closeBtn.style.background = "transparent";
    closeBtn.style.border = "none";
    closeBtn.style.cursor = "pointer";
    closeBtn.style.color = "inherit";
    closeBtn.style.fontSize = "12px";

    closeBtn.addEventListener("click", function () {
      try {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-6px)";
        setTimeout(() => {
          try {
            toast.remove();
          } catch (e) {}
        }, 260);
      } catch (e) {}
    });

    toast.appendChild(icon);
    toast.appendChild(txt);
    toast.appendChild(closeBtn);
    cont.insertBefore(toast, cont.firstChild);

    // anima entrada
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    if (timeout && timeout > 0) {
      setTimeout(() => {
        try {
          toast.style.opacity = "0";
          toast.style.transform = "translateY(-6px)";
          setTimeout(() => {
            try {
              toast.remove();
            } catch (e) {}
          }, 260);
        } catch (e) {}
      }, timeout);
    }
    return toast;
  } catch (e) {
    console.warn("showToast error", e);
  }
}

// --- Gerenciamento dos Tipos via modal (busca/edição/exclusão) ---
let tipoEntradaOptions = [];
// filtros selecionados (multi-select)
let selectedTipoFilters = [];

async function loadTipoEntradaOptionsFromServer() {
  try {
    const res = await fetch("/api/tipo-entradas");
    if (res.ok) {
      const data = await res.json();
      // pressupõe array de objetos { id, descricao, ativo }
      tipoEntradaOptions = data.map((d) => ({
        id: d.id,
        descricao: d.descricao,
        ativo: !!d.ativo,
      }));
    } else {
      console.warn("API retornou erro ao buscar tipos:", res.status);
    }
  } catch (e) {
    console.warn("Erro ao buscar tipos do servidor:", e);
  }
  // fallback: se estiver vazio, manter valores padrão
  if (!tipoEntradaOptions || tipoEntradaOptions.length === 0) {
    tipoEntradaOptions = [
      { id: null, descricao: "SEM CUSTO", ativo: true },
      { id: null, descricao: "BRINDE", ativo: true },
      { id: null, descricao: "ROMANEIO", ativo: true },
      { id: null, descricao: "ENTRADA DE TRANSFERENCIA", ativo: true },
      { id: null, descricao: "ACERTO DE ESTOQUE", ativo: true },
      { id: null, descricao: "GRANEL - ENTRADA", ativo: true },
    ];
  }
  updateDropdownOptions();
}

function updateDropdownOptions() {
  const input = document.getElementById("tipoEntrada");
  if (!input) return;
  const container = input.closest(".input-with-icon") || input.parentElement;
  const dropdown =
    container && container.querySelector(".input-select-dropdown");
  if (!dropdown) return;
  dropdown.innerHTML = "";
  tipoEntradaOptions.forEach((opt) => {
    const el = document.createElement("div");
    el.className = "item";
    el.textContent = opt.descricao;
    el.addEventListener("click", function (e) {
      e.stopPropagation();
      input.value = opt.descricao;
      dropdown.classList.remove("show");
      input.dispatchEvent(new Event("input"));
    });
    dropdown.appendChild(el);
  });
}

// Render selected tipo in input (single selection)
function renderSelectedTipoTags() {
  try {
    const input = document.getElementById("tipoEntradaFilter");
    if (!input) return;
    // mostrar apenas a seleção atual no input
    if (selectedTipoFilters.length > 0) {
      input.value = selectedTipoFilters[0];
    } else {
      input.value = "";
    }
  } catch (e) {
    console.warn("renderSelectedTipoTags error", e);
  }
}

function applyTipoFilter() {
  try {
    // fechar painel
    toggleMaisFiltros();
    console.log(
      "[outras-entradas] aplicando filtro tipos:",
      selectedTipoFilters,
    );
    currentPage = 1;
    renderizarTabela();
  } catch (e) {
    console.warn("applyTipoFilter error", e);
  }
}

function openModalListaTipoEntradas() {
  // criar backdrop/modal se necessário
  let backdrop = document.getElementById("listaTiposBackdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "listaTiposBackdrop";
    backdrop.className = "modal-backdrop";
    document.body.appendChild(backdrop);
    backdrop.addEventListener("click", closeModalListaTipoEntradas);
  }

  let modal = document.getElementById("modalListaTipoEntradas");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modalListaTipoEntradas";
    modal.className = "modal-tipos-container";
    modal.innerHTML = `
            <div class="modal-tipos-header">
                <div class="modal-tipos-title">Lista Tipo Outras Entradas</div>
                <button class="btn-small" id="closeListaTiposBtn">Fechar</button>
            </div>
            <div class="modal-tipos-body">
                <div style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                    <button class="btn-small" id="btnNovoTipo">Novo</button>
                </div>
                <table class="modal-tipos-table"><thead><tr><th>Descrição</th><th>Ativo</th><th></th></tr></thead><tbody id="listaTiposTbody"></tbody></table>
            </div>
            <div class="modal-tipos-footer"><button class="btn-small" id="btnFecharModalLista">Fechar</button></div>
        `;
    document.body.appendChild(modal);

    // eventos de fechamento
    modal
      .querySelector("#closeListaTiposBtn")
      .addEventListener("click", closeModalListaTipoEntradas);
    modal
      .querySelector("#btnFecharModalLista")
      .addEventListener("click", closeModalListaTipoEntradas);
    modal.querySelector("#btnNovoTipo").addEventListener("click", function () {
      openNewTipoModal();
    });
  }

  // mostrar
  backdrop.classList.add("show");
  modal.classList.add("open");
  document.body.style.overflow = "hidden";

  // carregar lista atualizada do servidor e renderizar
  loadTipoEntradaOptionsFromServer().then(() => renderListaTipos());
}

function closeModalListaTipoEntradas() {
  const modal = document.getElementById("modalListaTipoEntradas");
  const backdrop = document.getElementById("listaTiposBackdrop");
  if (modal) modal.classList.remove("open");
  if (backdrop) {
    backdrop.classList.remove("show");
    setTimeout(() => {
      try {
        backdrop.remove();
      } catch (e) {}
    }, 200);
  }
  document.body.style.overflow = "";
}

function renderListaTipos() {
  const tbody = document.getElementById("listaTiposTbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  tipoEntradaOptions.forEach((t, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td><span class="txt">${escapeHtml(t.descricao)}</span></td>
            <td>${t.ativo ? '<span class="badge-active">Sim</span>' : '<span class="badge-inactive">Não</span>'}</td>
            <td class="modal-tipos-actions"><button type="button" class="btn-small edit" data-idx="${idx}">✎</button><button type="button" class="btn-small delete" data-idx="${idx}">✖</button></td>
        `;
    tbody.appendChild(tr);
  });

  // delegação de eventos para editar/excluir (usando índice para suportar itens sem id)
  tbody.querySelectorAll(".btn-small.edit").forEach((b) =>
    b.addEventListener("click", function (e) {
      const idx = parseInt(this.getAttribute("data-idx"), 10);
      if (!isNaN(idx)) openEditTipoModal(tipoEntradaOptions[idx]);
    }),
  );
  tbody.querySelectorAll(".btn-small.delete").forEach((b) =>
    b.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const idx = parseInt(this.getAttribute("data-idx"), 10);
      console.log("[outras-entradas] delete button clicked, idx=", idx);
      if (!isNaN(idx)) confirmDeleteTipoByIndex(idx);
    }),
  );
}

function renderNewTipoRow() {
  // compat shim: abrir modal de novo tipo
  openNewTipoModal();
}

function openNewTipoModal(onSaved) {
  // criar backdrop/modal se necessário
  let backdrop = document.getElementById("newTipoBackdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "newTipoBackdrop";
    backdrop.className = "modal-backdrop";
    document.body.appendChild(backdrop);
    backdrop.addEventListener("click", closeNewTipoModal);
  }

  let modal = document.getElementById("modalNewTipoEntrada");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modalNewTipoEntrada";
    modal.className = "modal-tipos-container";
    modal.innerHTML = `
            <div class="modal-tipos-header">
                <div class="modal-tipos-title">Novo Tipo de Entrada</div>
                <button class="btn-small" id="closeNewTipoBtn">Fechar</button>
            </div>
            <div class="modal-tipos-body">
                <label>Descrição: <span style="color:#e74c3c">*</span></label>
                <input class="input-inline" id="newTipoModalDescricao">
                <div style="margin-top:12px;"><label><input type="checkbox" id="newTipoModalAtivo" checked> Ativo</label></div>
            </div>
            <div class="modal-tipos-footer"><button class="btn-small" id="saveNewTipoModalBtn">Salvar</button></div>
        `;
    document.body.appendChild(modal);
    modal
      .querySelector("#closeNewTipoBtn")
      .addEventListener("click", closeNewTipoModal);
    modal
      .querySelector("#saveNewTipoModalBtn")
      .addEventListener("click", async function () {
        const desc = document
          .getElementById("newTipoModalDescricao")
          .value.trim();
        const ativo = document.getElementById("newTipoModalAtivo").checked;
        if (!desc) {
          alert("Descrição obrigatória");
          return;
        }
        const created = await upsertTipoOnServer({
          descricao: desc,
          ativo: ativo,
        });
        // garantir que carregue do servidor e atualize UI
        await loadTipoEntradaOptionsFromServer();
        renderListaTipos();
        updateDropdownOptions();
        if (typeof onSaved === "function") {
          try {
            onSaved(created);
          } catch (e) {
            console.warn(e);
          }
        }
        closeNewTipoModal();
      });
  }

  // limpar campos
  document.getElementById("newTipoModalDescricao").value = "";
  document.getElementById("newTipoModalAtivo").checked = true;

  // mostrar
  backdrop.classList.add("show");
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
  // focus campo descrição
  setTimeout(() => {
    try {
      const f = document.getElementById("newTipoModalDescricao");
      if (f) f.focus();
    } catch (e) {}
  }, 50);
}

function closeNewTipoModal() {
  const modal = document.getElementById("modalNewTipoEntrada");
  const backdrop = document.getElementById("newTipoBackdrop");
  if (modal) modal.classList.remove("open");
  if (backdrop) {
    backdrop.classList.remove("show");
    setTimeout(() => {
      try {
        backdrop.remove();
      } catch (e) {}
    }, 200);
  }
  document.body.style.overflow = "";
}

function startEditTipo(id) {
  // mantido para compatibilidade, redireciona para modal
  const idx = tipoEntradaOptions.findIndex(
    (t) =>
      (t.id != null && t.id.toString() === id) ||
      (t.id == null && t.descricao === id),
  );
  const tipo = idx >= 0 ? tipoEntradaOptions[idx] : null;
  if (tipo) openEditTipoModal(tipo);
}

function openEditTipoModal(tipo) {
  if (!tipo) return;
  // criar backdrop/modal se necessário
  let backdrop = document.getElementById("editTipoBackdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "editTipoBackdrop";
    backdrop.className = "modal-backdrop";
    document.body.appendChild(backdrop);
    backdrop.addEventListener("click", closeEditTipoModal);
  }

  let modal = document.getElementById("modalEditTipoEntrada");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modalEditTipoEntrada";
    modal.className = "modal-tipos-container";
    modal.innerHTML = `
            <div class="modal-tipos-header">
                <div class="modal-tipos-title">Editando Tipo de Entrada</div>
                <button class="btn-small" id="closeEditTipoBtn">Fechar</button>
            </div>
            <div class="modal-tipos-body">
                <label>Descrição: <span style="color:#e74c3c">*</span></label>
                <input class="input-inline" id="editTipoDescricao">
                <div style="margin-top:12px;"><label><input type="checkbox" id="editTipoAtivo"> Ativo</label></div>
            </div>
            <div class="modal-tipos-footer"><button class="btn-small" id="saveEditTipoBtn">Salvar</button></div>
        `;
    document.body.appendChild(modal);
    modal
      .querySelector("#closeEditTipoBtn")
      .addEventListener("click", closeEditTipoModal);
    modal
      .querySelector("#saveEditTipoBtn")
      .addEventListener("click", async function () {
        const desc = document.getElementById("editTipoDescricao").value.trim();
        const ativo = document.getElementById("editTipoAtivo").checked;
        if (!desc) {
          alert("Descrição obrigatória");
          return;
        }
        await upsertTipoOnServer({
          id: tipo.id,
          descricao: desc,
          ativo: ativo,
        });
        await loadTipoEntradaOptionsFromServer();
        renderListaTipos();
        updateDropdownOptions();
        closeEditTipoModal();
      });
  }

  // preencher campos
  document.getElementById("editTipoDescricao").value = tipo.descricao || "";
  document.getElementById("editTipoAtivo").checked = !!tipo.ativo;

  // mostrar
  backdrop.classList.add("show");
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeEditTipoModal() {
  const modal = document.getElementById("modalEditTipoEntrada");
  const backdrop = document.getElementById("editTipoBackdrop");
  if (modal) modal.classList.remove("open");
  if (backdrop) {
    backdrop.classList.remove("show");
    setTimeout(() => {
      try {
        backdrop.remove();
      } catch (e) {}
    }, 200);
  }
  document.body.style.overflow = "";
}

// Função de modal de confirmação (caso não exista globalmente)
function showConfirmModal(message, onConfirm, onCancel) {
  // build modal using global system classes so styles match other pages
  const backdrop = document.createElement("div");
  backdrop.className = "confirm-backdrop";
  backdrop.style.zIndex = 39999;

  const modal = document.createElement("div");
  modal.className = "confirm-modal";
  modal.style.zIndex = 40000;
  modal.innerHTML = `
        <div class="icon"><i class="fas fa-exclamation-circle" style="color:#e74c3c"></i></div>
        <h4>Confirmação</h4>
        <p class="confirm-text">${message || ""}</p>
        <div class="confirm-actions">
            <button type="button" class="btn secondary cancel-btn">Cancelar</button>
            <button type="button" class="btn danger confirm-btn">OK</button>
        </div>
    `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  // handlers
  modal.querySelector(".cancel-btn").addEventListener("click", function () {
    try {
      backdrop.remove();
    } catch (e) {}
    if (typeof onCancel === "function") onCancel();
  });
  modal.querySelector(".confirm-btn").addEventListener("click", function () {
    try {
      onConfirm && onConfirm();
    } catch (e) {
      console.error(e);
    }
    try {
      backdrop.remove();
    } catch (e) {}
  });

  // lock scroll
  try {
    document.body.style.overflow = "hidden";
  } catch (e) {}
}

function closeConfirmModal() {
  // try remove any existing confirm-backdrop
  document.querySelectorAll(".confirm-backdrop").forEach((el) => {
    try {
      el.remove();
    } catch (e) {}
  });
  try {
    document.body.style.overflow = "";
  } catch (e) {}
}

async function confirmDeleteTipo(id) {
  showConfirmModal("Tem certeza que deseja excluir este tipo?", async () => {
    try {
      console.log("[outras-entradas] confirmDeleteTipo for id=", id);
      const tipo = tipoEntradaOptions.find(
        (t) => t.id != null && String(t.id) === String(id),
      );
      if (!tipo) {
        console.warn(
          "[outras-entradas] tipo não encontrado localmente id=",
          id,
        );
      }
      const url = "/api/tipo-entradas/" + encodeURIComponent(id);
      console.log("[outras-entradas] Enviando DELETE", url);
      const res = await fetch(url, { method: "DELETE" });
      console.log(
        "[outras-entradas] DELETE response",
        res.status,
        "ok=",
        res.ok,
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error("Erro ao excluir: " + (txt || res.status));
      }
      // remover do array local e atualizar UI
      tipoEntradaOptions = tipoEntradaOptions.filter(
        (t) => !(t.id != null && String(t.id) === String(id)),
      );
      renderListaTipos();
      updateDropdownOptions();
      console.log("[outras-entradas] excluído localmente id=", id);
    } catch (e) {
      console.error("[outras-entradas] erro ao excluir", e);
      showConfirmModal("Erro ao excluir: " + (e.message || e));
    }
  });
}

function confirmDeleteTipoByIndex(idx) {
  const tipo = tipoEntradaOptions[idx];
  if (!tipo) return;
  // Se não tem id, remover localmente
  if (!tipo.id) {
    tipoEntradaOptions.splice(idx, 1);
    renderListaTipos();
    updateDropdownOptions();
    return;
  }
  // Se tem id, usar a função que dispara a modal e faz o DELETE
  confirmDeleteTipo(tipo.id);
}

async function upsertTipoOnServer(obj) {
  try {
    let result = null;
    if (obj.id) {
      const res = await fetch("/api/tipo-entradas/" + obj.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(obj),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
      const updated = await res.json();
      // atualizar localmente
      const idx = tipoEntradaOptions.findIndex(
        (t) => Number(t.id) === Number(updated.id),
      );
      if (idx !== -1) {
        tipoEntradaOptions[idx] = {
          id: updated.id,
          descricao: updated.descricao,
          ativo: !!updated.ativo,
        };
      }
      result = updated;
    } else {
      const res = await fetch("/api/tipo-entradas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(obj),
      });
      if (!res.ok) throw new Error("Erro ao criar");
      const created = await res.json();
      // adicionar ao array local
      tipoEntradaOptions.push({
        id: created.id,
        descricao: created.descricao,
        ativo: !!created.ativo,
      });
      result = created;
    }
    // atualizar UI
    renderListaTipos();
    updateDropdownOptions();
    return result;
  } catch (e) {
    alert("Falha ao salvar no servidor. Verifique a conexão.");
    console.warn(e);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setupTipoEntradaDropdown() {
  const input = document.getElementById("tipoEntrada");
  if (!input) return;
  const container = input.closest(".input-with-icon") || input.parentElement;
  if (container)
    container.style.position = container.style.position || "relative";

  let dropdown = container.querySelector(".input-select-dropdown");
  const options = [
    "SEM CUSTO",
    "BRINDE",
    "ROMANEIO",
    "ENTRADA DE TRANSFERENCIA",
    "ACERTO DE ESTOQUE",
    "GRANEL - ENTRADA",
  ];

  if (!dropdown) {
    dropdown = document.createElement("div");
    dropdown.className = "input-select-dropdown";
    options.forEach((opt) => {
      const el = document.createElement("div");
      el.className = "item";
      el.textContent = opt;
      el.addEventListener("click", function (e) {
        e.stopPropagation();
        input.value = opt;
        dropdown.classList.remove("show");
        input.dispatchEvent(new Event("input"));
      });
      dropdown.appendChild(el);
    });
    container.appendChild(dropdown);
  }

  // abrir/fechar no click do input
  input.addEventListener("click", function (e) {
    e.stopPropagation();
    // alterna visibilidade
    const isOpen = dropdown.classList.contains("show");
    // fechar outros dropdowns globais
    document
      .querySelectorAll(".input-select-dropdown.show")
      .forEach((d) => d.classList.remove("show"));
    if (!isOpen) dropdown.classList.add("show");
  });

  // fechar ao clicar fora
  document.addEventListener("click", function (e) {
    if (!container.contains(e.target)) dropdown.classList.remove("show");
  });

  // fechar ao apertar Esc
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") dropdown.classList.remove("show");
  });
}

function debounce(fn, wait) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function setupProdutoAutocomplete() {
  const input = document.getElementById("produtoItem");
  if (!input) return;
  const container = input.parentElement;
  if (container)
    container.style.position = container.style.position || "relative";

  let dropdown = container.querySelector(".produto-select-dropdown");
  if (!dropdown) {
    dropdown = document.createElement("div");
    dropdown.className = "produto-select-dropdown";
    dropdown.style.minWidth = "320px";
    // esconder por padrão — exibiremos via style.display
    dropdown.style.display = "none";
    container.appendChild(dropdown);
  }

  // flag to avoid immediate reopen when an item is clicked
  let ignoreNextInputClick = false;

  async function fetchItems(q) {
    try {
      const res = await fetch("/api/itens?q=" + encodeURIComponent(q));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("Erro buscar itens", e);
      return [];
    }
  }

  const doSearch = debounce(async function () {
    const q = input.value.trim();
    if (!q) {
      dropdown.innerHTML = "";
      dropdown.classList.remove("show");
      dropdown.style.display = "none";
      return;
    }
    dropdown.innerHTML = '<div class="item">Buscando...</div>';
    // garantir visibilidade
    dropdown.style.display = "block";
    dropdown.classList.add("show");
    const items = await fetchItems(q);
    dropdown.innerHTML = "";
    if (!items || items.length === 0) {
      dropdown.innerHTML = '<div class="item">Nenhum resultado</div>';
      return;
    }
    items.forEach((it) => {
      const el = document.createElement("div");
      el.className = "item";
      const nome = it.nome || it.descricao || it.name || "";
      const codigo = it.codigo || it.id || "";
      el.innerHTML = `<div style="font-weight:600">${escapeHtml(nome)}</div><div style="font-size:12px;color:#666">${escapeHtml(String(codigo))}</div>`;
      el.addEventListener("click", function (e) {
        e.stopPropagation();
        selectedProduto = {
          id: it.id || it.codigo || it.ID || null,
          nome: nome,
          codigo: codigo,
          estoqueAtual: it.estoqueAtual || it.estoque || null,
        };
        input.value = nome;
        const estoqueInput = document.getElementById("estoqueItem");
        if (estoqueInput)
          estoqueInput.value =
            selectedProduto.estoqueAtual != null
              ? selectedProduto.estoqueAtual
              : "";
        const custoInput = document.getElementById("custoItem");
        if (custoInput)
          custoInput.value = (it.custoBase || it.custo || 0).toFixed
            ? Number(it.custoBase || it.custo || 0)
                .toFixed(2)
                .replace(".", ",")
            : it.custoBase || it.custo || "0,00";
        // fechar qualquer dropdown de produtos visível (em caso de múltiplas instâncias)
        document
          .querySelectorAll(".produto-select-dropdown.show")
          .forEach((d) => {
            d.classList.remove("show");
            d.style.display = "none";
          });
        // prevenir que o clique no input reabra o dropdown imediatamente
        ignoreNextInputClick = true;
        // remover foco do input para evitar reabertura por :focus ou handlers
        try {
          input.blur();
        } catch (e) {}
      });
      dropdown.appendChild(el);
    });
  }, 250);

  input.addEventListener("input", function (e) {
    selectedProduto = null;
    doSearch();
  });
  input.addEventListener("click", function (e) {
    e.stopPropagation();
    if (ignoreNextInputClick) {
      // consumir apenas o primeiro click gerado após seleção e não reabrir
      ignoreNextInputClick = false;
      return;
    }
    doSearch();
  });
  document.addEventListener("click", function (e) {
    if (!container.contains(e.target)) {
      dropdown.classList.remove("show");
      dropdown.style.display = "none";
    }
  });
}

/* Compact Date Range Picker
   - Attaches to the first element with class `periodo-input`
   - Renders two months side-by-side below the input
   - Allows selecting start and end dates, has Cancel/Apply, closes on outside click
*/
function setupCompactDateRangePicker() {
  const input = document.querySelector(".periodo-input");
  if (!input) return;
  const container = input.parentElement || document.body;
  if (container)
    container.style.position = container.style.position || "relative";

  // Definir valor padrão do Período para hoje (horário oficial de Brasília)
  try {
    const now = new Date();
    // obter partes da data no fuso de São Paulo
    const parts = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).formatToParts(now);
    const day = parts.find((p) => p.type === "day").value;
    const month = parts.find((p) => p.type === "month").value;
    const year = parts.find((p) => p.type === "year").value;
    const display = `${day}/${month}/${year}`;
    // armazenar dataset.start/end como YYYY-MM-DD (data local) para evitar ambiguidade de timezone
    const y = String(year);
    const m = String(month).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    const ymd = `${y}-${m}-${d}`;
    input.value = `${display} - ${display}`;
    input.dataset.start = ymd;
    input.dataset.end = ymd;
    try {
      renderizarTabela();
    } catch (e) {
      console.warn("erro ao atualizar tabela apos set periodo padrao", e);
    }
  } catch (e) {
    console.warn("Erro ao definir período padrão (Brasília)", e);
  }

  let picker = null;
  let state = { start: null, end: null, viewMonth: new Date() };

  function formatBR(d) {
    if (!d) return "";
    const dd = ("0" + d.getDate()).slice(-2);
    const mm = ("0" + (d.getMonth() + 1)).slice(-2);
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }
  function formatYMD(d) {
    if (!d) return "";
    const yyyy = d.getFullYear();
    const mm = ("0" + (d.getMonth() + 1)).slice(-2);
    const dd = ("0" + d.getDate()).slice(-2);
    return `${yyyy}-${mm}-${dd}`;
  }

  function createPicker() {
    picker = document.createElement("div");
    picker.className = "drp-container";
    picker.innerHTML = `
            <div class="daterange-picker" role="dialog">
                <div class="drp-month left">
                    <div class="drp-header"><div class="drp-nav drp-prev">‹</div><div class="drp-title-left"></div><div></div></div>
                    <div class="drp-grid drp-grid-left"></div>
                </div>
                <div class="drp-month right">
                    <div class="drp-header"><div></div><div class="drp-title-right"></div><div class="drp-nav drp-next">›</div></div>
                    <div class="drp-grid drp-grid-right"></div>
                </div>
                <!-- footer removed: Cancel/Apply buttons omitted as requested -->
            </div>
        `;
    // append to body and use fixed positioning to avoid page overflow
    document.body.appendChild(picker);
    picker.style.position = "fixed";
    picker.style.left = "0px";
    picker.style.top = "0px";

    picker.addEventListener("click", (e) => e.stopPropagation());
    picker.querySelector(".drp-prev").addEventListener("click", () => {
      state.viewMonth = addMonths(state.viewMonth, -1);
      render();
      positionPicker();
    });
    picker.querySelector(".drp-next").addEventListener("click", () => {
      state.viewMonth = addMonths(state.viewMonth, 1);
      render();
      positionPicker();
    });
    render();
  }

  function addMonths(d, n) {
    const nd = new Date(d.getFullYear(), d.getMonth() + n, 1);
    return nd;
  }

  function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  function endOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
  }

  function render() {
    if (!picker) return;
    const leftMonth = new Date(
      state.viewMonth.getFullYear(),
      state.viewMonth.getMonth(),
      1,
    );
    const rightMonth = addMonths(leftMonth, 1);

    picker.querySelector(".drp-title-left").textContent = leftMonth
      .toLocaleString("pt-BR", { month: "long", year: "numeric" })
      .replace(" de ", " — ");
    picker.querySelector(".drp-title-right").textContent = rightMonth
      .toLocaleString("pt-BR", { month: "long", year: "numeric" })
      .replace(" de ", " — ");

    buildGrid(picker.querySelector(".drp-grid-left"), leftMonth);
    buildGrid(picker.querySelector(".drp-grid-right"), rightMonth);
  }

  function buildGrid(gridEl, monthDate) {
    gridEl.innerHTML = "";
    // weekdays header (use distinct class so styling differs from day cells)
    const weekNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    weekNames.forEach((w) => {
      const el = document.createElement("div");
      el.className = "drp-week";
      el.textContent = w;
      gridEl.appendChild(el);
    });

    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    // leading blanks (preserve 7-column grid)
    const lead = start.getDay();
    for (let i = 0; i < lead; i++) {
      const blank = document.createElement("div");
      blank.className = "drp-day disabled";
      blank.textContent = "";
      gridEl.appendChild(blank);
    }

    for (let d = 1; d <= end.getDate(); d++) {
      const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), d);
      const el = document.createElement("div");
      el.className = "drp-day";
      // put number inside a span to avoid wrapping side-effects
      const span = document.createElement("span");
      span.textContent = d;
      span.style.pointerEvents = "none";
      el.appendChild(span);
      if (state.start && sameDay(date, state.start))
        el.classList.add("selected");
      if (state.end && sameDay(date, state.end)) el.classList.add("selected");
      if (state.start && state.end && date > state.start && date < state.end)
        el.classList.add("in-range");
      el.addEventListener("click", () => {
        onDateClick(date);
      });
      gridEl.appendChild(el);
    }

    // fill trailing blanks so grid stays rectangular (weeks complete)
    const totalCells = lead + end.getDate();
    const trailing = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < trailing; i++) {
      const blank = document.createElement("div");
      blank.className = "drp-day disabled";
      blank.textContent = "";
      gridEl.appendChild(blank);
    }
  }

  function sameDay(a, b) {
    return (
      a &&
      b &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function onDateClick(date) {
    if (!state.start || (state.start && state.end)) {
      state.start = date;
      state.end = null;
    } else if (state.start && !state.end) {
      if (date < state.start) {
        state.end = state.start;
        state.start = date;
      } else {
        state.end = date;
      }
    }
    render();
    // if a complete range was selected, update the input value immediately
    if (state.start && state.end) {
      input.value = `${formatBR(state.start)} - ${formatBR(state.end)}`;
      input.dataset.start = formatYMD(state.start);
      input.dataset.end = formatYMD(state.end);
      // refresh table to reflect selected period
      try {
        renderizarTabela();
      } catch (e) {
        console.warn("erro ao atualizar tabela após seleção de período", e);
      }
    }
  }

  function applyAndClose() {
    if (state.start && state.end) {
      input.value = `${formatBR(state.start)} - ${formatBR(state.end)}`;
      input.dataset.start = formatYMD(state.start);
      input.dataset.end = formatYMD(state.end);
    }
    close();
  }

  function open() {
    if (picker) return;
    createPicker();
    positionPicker();
    window.addEventListener("resize", positionPicker);
    document.addEventListener("click", outsideClickHandler);
  }

  function close() {
    if (!picker) return;
    try {
      picker.remove();
    } catch (e) {}
    picker = null;
    window.removeEventListener("resize", positionPicker);
    document.removeEventListener("click", outsideClickHandler);
  }

  function outsideClickHandler(e) {
    if (!picker) return;
    if (!picker.contains(e.target) && e.target !== input) close();
  }

  function positionPicker() {
    if (!picker) return;
    const rect = input.getBoundingClientRect();
    // ensure picker width fits viewport
    const maxW = Math.min(360, window.innerWidth - 24);
    picker.querySelector(".daterange-picker").style.width = maxW + "px";
    const pw = picker.querySelector(".daterange-picker").offsetWidth || maxW;

    // default position: left aligned to input
    let left = rect.left;
    let top = rect.bottom + 8;
    // if overflow right, try align to input right
    if (left + pw > window.innerWidth - 8) {
      left = Math.max(8, rect.right - pw);
    }
    // ensure not offscreen left
    if (left < 8) left = 8;
    // if bottom would overflow, position above
    const ph =
      picker.offsetHeight ||
      picker.querySelector(".daterange-picker").offsetHeight ||
      220;
    if (top + ph > window.innerHeight - 8) {
      top = rect.top - ph - 8;
    }
    // apply
    picker.style.left = Math.round(left) + "px";
    picker.style.top = Math.round(top) + "px";
  }

  input.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!picker) open();
    else close();
  });

  // fechar a função setupCompactDateRangePicker
}

try {
  setupCompactDateRangePicker();
} catch (e) {
  console.warn("Erro iniciando date range picker", e);
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    inicializarEntradas();
    configurarEventosModal();
  });
} else {
  inicializarEntradas();
  configurarEventosModal();
}
