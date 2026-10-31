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

// ========================================
// FUNCIONALIDADES ESPECÍFICAS - MOVIMENTO DE CAIXA (SUPRIMENTO/SANGRIA)
// ========================================

class MovimentoCaixaManager {
  constructor() {
    this.movimentos = [];
    this.currentPage = 1;
    this.itemsPerPage = 6;
    this.caixaAtual = null;
    this.filtroAtivo = false;
    this.dataInicioFiltro = null;
    this.dataFimFiltro = null;
    this.resumo = null;
    this.loadCaixaInfo();
    this.loadMovimentos();
    this.initializeEventListeners();
  }

  async loadCaixaInfo() {
    try {
      const response = await fetch("/api/caixas/aberto");
      const caixa = await response.json();

      if (caixa && caixa.aberto) {
        this.caixaAtual = caixa;
        this.updateCaixaHeader(caixa);
      } else {
        console.warn("⚠️ Nenhum caixa aberto");
        this.updateCaixaHeader(null);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar informações do caixa:", error);
      this.updateCaixaHeader(null);
    }
  }

  updateCaixaHeader(caixa) {
    // Atualizar informações do cabeçalho
    const caixaNumeroEl = document.getElementById("caixaNumero");
    const dataAberturaEl = document.getElementById("dataAbertura");
    const usuarioEl = document.getElementById("usuarioNome");

    if (caixa) {
      const dataAbertura = new Date(caixa.dataAbertura);
      const dataFormatada = dataAbertura.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      if (caixaNumeroEl) caixaNumeroEl.textContent = caixa.numero || "-";
      if (dataAberturaEl) dataAberturaEl.textContent = dataFormatada;
      if (usuarioEl) usuarioEl.textContent = caixa.usuario || "-";

      console.log("✅ Informações do caixa atualizadas:", {
        numero: caixa.numero,
        dataAbertura: dataFormatada,
        usuario: caixa.usuario,
      });
    } else {
      if (caixaNumeroEl) caixaNumeroEl.textContent = "-";
      if (dataAberturaEl) dataAberturaEl.textContent = "-";
      if (usuarioEl) usuarioEl.textContent = "-";

      console.warn("⚠️ Nenhum caixa aberto - campos limpos");
    }
  }

  initializeEventListeners() {
    // Event listeners para modal
    const modal = document.getElementById("movimentoModal");
    const form = document.getElementById("movimentoForm");

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.adicionarMovimento();
      });
    }

    // Fechar modal ao clicar fora
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          this.fecharModal();
        }
      });
    }

    // Event listener para paginação
    this.setupPagination();

    // Filtro por período
    this.initializeFiltroCalendario();
  }

  setupPagination() {
    const prevBtn = document.querySelector(".pagination-btn:first-child");
    const nextBtn = document.querySelector(".pagination-btn:last-child");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.renderTable();
          this.updatePagination();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        const totalPages = Math.ceil(
          this.movimentos.length / this.itemsPerPage,
        );
        if (this.currentPage < totalPages) {
          this.currentPage++;
          this.renderTable();
          this.updatePagination();
        }
      });
    }
  }

  async loadMovimentos(dataInicio = null, dataFim = null) {
    try {
      let url = "/api/movimentos-caixa";
      if (dataInicio && dataFim) {
        url += `?dataInicio=${encodeURIComponent(dataInicio)}&dataFim=${encodeURIComponent(dataFim)}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (
          data &&
          typeof data === "object" &&
          !Array.isArray(data) &&
          data.movimentos !== undefined
        ) {
          this.movimentos = data.movimentos;
          this.resumo = data.resumo || null;
          this.filtroAtivo = data.filtroAtivo || false;
        } else if (Array.isArray(data)) {
          this.movimentos = data;
          this.resumo = null;
          this.filtroAtivo = false;
        } else {
          this.movimentos = [];
          this.resumo = null;
          this.filtroAtivo = false;
        }
        console.log(
          "✅ Movimentos carregados:",
          this.movimentos.length,
          "| filtroAtivo:",
          this.filtroAtivo,
        );
      } else {
        console.error("Erro ao carregar movimentos:", response.status);
        this.movimentos = [];
      }
    } catch (error) {
      console.error("❌ Erro ao carregar movimentos da API:", error);
      this.movimentos = [];
    }

    this.currentPage = 1;
    this.updateTableHeader();
    this.renderTable();
    this.updatePagination();
    this.renderResumo();
  }

  updateTableHeader() {
    const thead = document.querySelector(".movimento-table thead tr");
    if (!thead) return;
    if (this.filtroAtivo) {
      thead.innerHTML = `
                <th>ID</th>
                <th>Data</th>
                <th>Horário</th>
                <th>Movimento</th>
                <th>Observação</th>
                <th>Valor</th>`;
    } else {
      thead.innerHTML = `
                <th>ID</th>
                <th>Movimento</th>
                <th>Observação</th>
                <th>Valor</th>`;
    }
  }

  renderResumo() {
    const resumoEl = document.getElementById("resumoPeriodo");
    if (!resumoEl) return;
    if (this.filtroAtivo && this.resumo) {
      const { entradas, saidas, saldo } = this.resumo;
      const fmt = (v) => {
        const n = parseFloat(v) || 0;
        return "R$ " + n.toFixed(2).replace(".", ",");
      };
      const dataIni = this.dataInicioFiltro
        ? new Date(this.dataInicioFiltro + "T00:00:00").toLocaleDateString(
            "pt-BR",
          )
        : "-";
      const dataFimStr = this.dataFimFiltro
        ? new Date(this.dataFimFiltro + "T00:00:00").toLocaleDateString("pt-BR")
        : "-";
      resumoEl.innerHTML = `
                <div class="resumo-periodo-inner">
                    <div class="resumo-periodo-header">
                        <i class="fas fa-calendar-alt"></i>
                        <span>Período: <strong>${dataIni} até ${dataFimStr}</strong></span>
                        <span class="resumo-total-itens">${this.movimentos.length} movimento(s)</span>
                    </div>
                    <div class="resumo-valores">
                        <div class="resumo-item resumo-entradas">
                            <span class="resumo-label">Entradas</span>
                            <span class="resumo-value">${fmt(entradas)}</span>
                        </div>
                        <div class="resumo-item resumo-saidas">
                            <span class="resumo-label">Saídas</span>
                            <span class="resumo-value">${fmt(saidas)}</span>
                        </div>
                        <div class="resumo-item resumo-saldo ${parseFloat(saldo) >= 0 ? "positivo" : "negativo"}">
                            <span class="resumo-label">Saldo</span>
                            <span class="resumo-value">${fmt(saldo)}</span>
                        </div>
                    </div>
                </div>`;
      resumoEl.style.display = "block";
    } else {
      resumoEl.style.display = "none";
    }
  }

  initializeFiltroCalendario() {
    const btnCalendario = document.getElementById("btnFiltroCalendario");
    const painel = document.getElementById("filtroPeriodoPanel");
    const btnAplicar = document.getElementById("btnAplicarFiltro");
    const btnLimpar = document.getElementById("btnLimparFiltro");

    if (btnCalendario && painel) {
      btnCalendario.addEventListener("click", () => {
        const isOpen = painel.style.display !== "none";
        painel.style.display = isOpen ? "none" : "block";
        // Highlight button when panel is open
        btnCalendario.classList.toggle("ativo", !isOpen);
      });
    }
    if (btnAplicar) {
      btnAplicar.addEventListener("click", () => this.aplicarFiltroData());
    }
    if (btnLimpar) {
      btnLimpar.addEventListener("click", () => this.limparFiltroData());
    }
  }

  aplicarFiltroData() {
    const dataInicio = document.getElementById("dataInicioFiltro")?.value;
    const dataFim = document.getElementById("dataFimFiltro")?.value;
    if (!dataInicio || !dataFim) {
      this.showNotification("Selecione a data inicial e final", "warning");
      return;
    }
    if (new Date(dataInicio) > new Date(dataFim)) {
      this.showNotification(
        "A data inicial deve ser anterior à data final",
        "warning",
      );
      return;
    }
    this.dataInicioFiltro = dataInicio;
    this.dataFimFiltro = dataFim;
    this.loadMovimentos(dataInicio, dataFim);
    // Fechar painel
    const painel = document.getElementById("filtroPeriodoPanel");
    if (painel) painel.style.display = "none";
    const btnCalendario = document.getElementById("btnFiltroCalendario");
    if (btnCalendario) btnCalendario.classList.remove("ativo");
  }

  limparFiltroData() {
    this.dataInicioFiltro = null;
    this.dataFimFiltro = null;
    this.filtroAtivo = false;
    this.resumo = null;
    const dataInicioEl = document.getElementById("dataInicioFiltro");
    const dataFimEl = document.getElementById("dataFimFiltro");
    if (dataInicioEl) dataInicioEl.value = "";
    if (dataFimEl) dataFimEl.value = "";
    this.loadMovimentos();
  }

  renderTable() {
    const tbody = document.getElementById("movimentoTableBody");
    if (!tbody) return;

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const pageMovimentos = this.movimentos.slice(startIndex, endIndex);

    tbody.innerHTML = pageMovimentos
      .map((movimento) => {
        const valor = parseFloat(movimento.valor) || 0;
        const tipoClass =
          movimento.tipo === "entrada" ? "valor-positivo" : "valor-negativo";
        const tipoLabel = (movimento.tipo || "").toUpperCase();

        if (this.filtroAtivo) {
          const dataObj = movimento.data ? new Date(movimento.data) : null;
          const dataFormatada = dataObj
            ? dataObj.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
            : "-";
          const horaFormatada = dataObj
            ? dataObj.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-";
          return `
                <tr>
                    <td>${movimento.id}</td>
                    <td>${dataFormatada}</td>
                    <td>${horaFormatada}</td>
                    <td><span class="movimento-tipo ${movimento.tipo}">${tipoLabel}</span></td>
                    <td>${movimento.observacao || "-"}</td>
                    <td class="${tipoClass}">R$ ${valor.toFixed(2).replace(".", ",")}</td>
                </tr>`;
        }
        return `
            <tr>
                <td>${movimento.id}</td>
                <td><span class="movimento-tipo ${movimento.tipo}">${tipoLabel}</span></td>
                <td>${movimento.observacao || "-"}</td>
                <td class="${tipoClass}">R$ ${valor.toFixed(2).replace(".", ",")}</td>
            </tr>`;
      })
      .join("");
  }

  updatePagination() {
    const totalItems = this.movimentos.length;
    const totalPages = Math.ceil(totalItems / this.itemsPerPage);
    const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
    const endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);

    const paginationInfo = document.querySelector(".pagination-info");
    if (paginationInfo) {
      paginationInfo.textContent = `${startItem} - ${endItem} of ${totalItems}`;
    }

    const prevBtn = document.querySelector(".pagination-btn:first-child");
    const nextBtn = document.querySelector(".pagination-btn:last-child");

    if (prevBtn) {
      prevBtn.disabled = this.currentPage === 1;
    }

    if (nextBtn) {
      nextBtn.disabled = this.currentPage === totalPages || totalPages === 0;
    }
  }

  async adicionarMovimento() {
    const tipoSelect = document.getElementById("tipoMovimento");
    const valorInput = document.getElementById("valorMovimento");
    const observacaoTextarea = document.getElementById("observacaoMovimento");

    if (!tipoSelect.value || !valorInput.value) {
      this.showNotification(
        "Por favor, preencha todos os campos obrigatórios",
        "error",
      );
      return;
    }

    const valor = parseFloat(valorInput.value);
    if (valor <= 0) {
      this.showNotification("O valor deve ser maior que zero", "error");
      return;
    }

    // Buscar caixa aberto
    let caixaAberto = null;
    try {
      const response = await fetch("/api/caixas/aberto");
      caixaAberto = await response.json();

      if (!caixaAberto || !caixaAberto.aberto) {
        this.showNotification(
          "Nenhum caixa aberto. Abra um caixa antes de adicionar movimentos.",
          "warning",
        );
        return;
      }
    } catch (error) {
      console.error("Erro ao verificar caixa aberto:", error);
      this.showNotification("Erro ao verificar caixa aberto", "error");
      return;
    }

    const novoMovimento = {
      tipo: tipoSelect.value,
      observacao: observacaoTextarea.value.trim() || "-",
      valor: valor,
      data: new Date().toISOString(),
      caixaId: caixaAberto.id,
      usuarioId: caixaAberto.usuarioId,
    };

    try {
      // Salvar no backend via API
      const movimentoSalvo = await this.saveToAPI(novoMovimento);

      // Adicionar ao início da lista local para aparecer no topo
      this.movimentos.unshift(movimentoSalvo);

      // Atualizar tabela
      this.currentPage = 1; // Voltar para primeira página para ver o novo item
      this.renderTable();
      this.updatePagination();

      // Fechar modal e limpar formulário
      this.fecharModal();
      this.clearForm();

      // Mostrar notificação de sucesso
      const tipoText =
        tipoSelect.value === "entrada" ? "Suprimento" : "Sangria";
      this.showNotification(
        `${tipoText} de R$ ${valor.toFixed(2).replace(".", ",")} adicionado com sucesso!`,
        "success",
      );
    } catch (error) {
      this.showNotification(
        "Erro ao salvar movimento: " + error.message,
        "error",
      );
    }
  }

  generateNewId() {
    // Gerar ID único baseado no timestamp
    return Date.now();
  }

  async saveToAPI(movimento) {
    try {
      const movimentoSalvo = await ApiClient.criarMovimentoCaixa(movimento);
      console.log("✅ Movimento salvo no banco via API:", movimentoSalvo);
      return movimentoSalvo;
    } catch (error) {
      console.error("❌ Erro ao salvar movimento na API:", error);
      throw new Error("Erro HTTP: " + (error.status || 500));
    }
  }

  clearForm() {
    const form = document.getElementById("movimentoForm");
    if (form) {
      form.reset();
    }
  }

  fecharModal() {
    fecharModalMovimento();
  }

  showNotification(message, type = "info") {
    // Remover notificação existente
    const existingNotification = document.querySelector(".notification");
    if (existingNotification) {
      existingNotification.remove();
    }

    // Criar nova notificação
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;

    const colors = {
      success: "#27ae60",
      error: "#e74c3c",
      warning: "#f39c12",
      info: "#3498db",
    };

    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            background: ${colors[type]};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 14px;
            font-weight: 500;
            animation: slideInRight 0.3s ease;
        `;

    notification.textContent = message;
    document.body.appendChild(notification);

    // Remover após 4 segundos
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = "slideOutRight 0.3s ease";
        setTimeout(() => notification.remove(), 300);
      }
    }, 4000);
  }
}

// Cria/remove backdrop dedicado no body
function _criarBackdrop() {
  let bd = document.getElementById("modal-backdrop");
  if (!bd) {
    bd = document.createElement("div");
    bd.id = "modal-backdrop";
    bd.addEventListener("click", fecharModalMovimento);
    document.body.appendChild(bd);
  }
  bd.style.display = "block";
}

function _removerBackdrop() {
  const bd = document.getElementById("modal-backdrop");
  if (bd) bd.style.display = "none";
}

// Funções globais para serem chamadas pelo HTML
function abrirModalMovimento() {
  const modal = document.getElementById("movimentoModal");
  if (!modal) return;

  // Envolver o modal-content num wrapper centralizado que vai para o body
  let wrapper = document.getElementById("modal-wrapper");
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.id = "modal-wrapper";
    wrapper.className = "modal-wrapper";
    document.body.appendChild(wrapper);
  }

  // Mover o modal-content para dentro do wrapper (se ainda não estiver)
  const content = modal.querySelector(".modal-content");
  if (content && content.parentElement !== wrapper) {
    wrapper.appendChild(content);
  }

  wrapper.style.display = "flex";
  _criarBackdrop();
}

function fecharModalMovimento() {
  const wrapper = document.getElementById("modal-wrapper");
  if (wrapper) wrapper.style.display = "none";
  _removerBackdrop();
}

// Adicionar configuração do movimento de caixa ao DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
  // Aguardar um pouco para garantir que outros elementos carregaram
  setTimeout(() => {
    configurarSubmenuLateralCaixa();

    // Inicializar o gerenciador de movimento de caixa
    window.movimentoCaixaManager = new MovimentoCaixaManager();
    console.log("✅ MovimentoCaixaManager inicializado");
  }, 200);
});
