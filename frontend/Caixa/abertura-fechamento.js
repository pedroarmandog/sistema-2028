// Copiado de frontend/dashboard.js - funcionalidades do menu e header

console.log("🚀 menu.js carregado (snippet do dashboard)");

function detectarIDsDuplicados() {
  const idsParaVerificar = [
    "clienteMenuItem",
    "clienteSubmenu",
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
// FUNCIONALIDADES ESPECÍFICAS - ABERTURA/FECHAMENTO CAIXA
// ========================================

// Função auxiliar para obter cookie
function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

// Função para formatar moeda
function formatarMoeda(valor) {
  if (!valor) return "R$ 0,00";
  const numero =
    typeof valor === "string"
      ? parseFloat(valor.replace(/[^\d,.-]/g, "").replace(",", "."))
      : valor;
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Função para converter moeda em número
function converterMoedaParaNumero(valorString) {
  if (!valorString) return 0;
  return parseFloat(valorString.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
}

class CaixaManager {
  constructor() {
    this.caixaAberto = false;
    this.caixaAtual = null;
    this.usuarioLogado = null;
    this.terminalSelecionado = "Caixa 01";
    this.fundoTroco = 0;

    this.initializeEventListeners();
    this.loadUsuarioLogado();
    this.loadCaixaStatus();
  }

  async loadUsuarioLogado() {
    try {
      const usuarioId = getCookie("usuarioLogadoId");
      const usuarioNome = getCookie("usuarioLogadoNome");

      if (usuarioId && usuarioNome) {
        this.usuarioLogado = {
          id: parseInt(usuarioId),
          nome: usuarioNome,
        };

        // Atualizar interface
        const usuarioElement = document.getElementById("usuarioNome");
        if (usuarioElement) {
          usuarioElement.textContent = usuarioNome;
        }

        console.log("✅ Usuário logado:", usuarioNome);
      } else {
        console.warn("⚠️ Usuário não encontrado nos cookies");
        this.showNotification(
          "Usuário não identificado. Faça login novamente.",
          "warning",
        );
      }
    } catch (error) {
      console.error("Erro ao carregar usuário:", error);
    }
  }

  initializeEventListeners() {
    // Configurar dropdown de terminal
    const terminalOptionsBtn = document.querySelector(".terminal-options-btn");
    const terminalDropdown = document.querySelector(".terminal-dropdown");

    if (terminalOptionsBtn && terminalDropdown) {
      terminalOptionsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        terminalDropdown.classList.toggle("show");
      });

      // Fechar dropdown ao clicar fora
      document.addEventListener("click", () => {
        terminalDropdown.classList.remove("show");
      });

      // Configurar opções do terminal
      const terminalOptions =
        terminalDropdown.querySelectorAll(".terminal-option");
      terminalOptions.forEach((option) => {
        option.addEventListener("click", (e) => {
          e.stopPropagation();
          this.selectTerminal(option.textContent.trim());
          terminalDropdown.classList.remove("show");
        });
      });
    }

    // Configurar botão de ação (abrir/fechar)
    const acaoCaixaBtn = document.getElementById("acaoCaixaBtn");
    if (acaoCaixaBtn) {
      acaoCaixaBtn.addEventListener("click", () => {
        if (this.caixaAberto) {
          this.handleFecharCaixa();
        } else {
          this.handleAbrirCaixa();
        }
      });
    }

    // Configurar validação em tempo real
    const senhaInput = document.getElementById("senhaInput");
    const fundoTrocoInput = document.getElementById("fundoTrocoInput");

    if (senhaInput) {
      senhaInput.addEventListener("input", () => {
        this.validateForm();
      });
    }

    if (fundoTrocoInput) {
      // Formatar valor como moeda
      fundoTrocoInput.addEventListener("blur", () => {
        const valor = converterMoedaParaNumero(fundoTrocoInput.value);
        fundoTrocoInput.value = formatarMoeda(valor);
      });

      fundoTrocoInput.addEventListener("input", () => {
        this.validateForm();
      });
    }
  }

  selectTerminal(terminalName) {
    this.terminalSelecionado = terminalName;
    const terminalInput = document.getElementById("terminalInput");
    if (terminalInput) {
      terminalInput.value = terminalName;
    }
    this.validateForm();
    console.log(`Terminal selecionado: ${terminalName}`);
    // Atualizar status do caixa para o terminal selecionado
    this.loadCaixaStatus();
  }

  validateForm() {
    const senhaInput = document.getElementById("senhaInput");
    const terminalInput = document.getElementById("terminalInput");
    const fundoTrocoInput = document.getElementById("fundoTrocoInput");
    const acaoCaixaBtn = document.getElementById("acaoCaixaBtn");

    if (senhaInput && terminalInput && acaoCaixaBtn) {
      const senhaValida = senhaInput.value.length >= 3;
      const terminalSelecionado = terminalInput.value.trim() !== "";

      let formValido = senhaValida && terminalSelecionado;

      // Se não está aberto, precisa do fundo de troco
      if (!this.caixaAberto && fundoTrocoInput) {
        const fundoTroco = converterMoedaParaNumero(fundoTrocoInput.value);
        formValido = formValido && fundoTroco >= 0;
      }

      acaoCaixaBtn.disabled = !formValido;

      if (acaoCaixaBtn.disabled) {
        acaoCaixaBtn.style.opacity = "0.6";
        acaoCaixaBtn.style.cursor = "not-allowed";
      } else {
        acaoCaixaBtn.style.opacity = "1";
        acaoCaixaBtn.style.cursor = "pointer";
      }
    }
  }

  async handleAbrirCaixa() {
    const senhaInput = document.getElementById("senhaInput");
    const terminalInput = document.getElementById("terminalInput");
    const fundoTrocoInput = document.getElementById("fundoTrocoInput");

    if (!senhaInput.value || !terminalInput.value) {
      this.showNotification(
        "Por favor, preencha todos os campos obrigatórios",
        "error",
      );
      return;
    }

    const fundoTroco = converterMoedaParaNumero(fundoTrocoInput.value);

    // Validar senha do usuário
    const senhaValida = await this.validarSenhaUsuario(senhaInput.value);
    if (!senhaValida) {
      this.showNotification("Senha incorreta", "error");
      return;
    }

    try {
      this.showNotification("Abrindo caixa...", "info");

      // Abrir caixa via API
      const response = await fetch("/api/caixas/abrir", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          numero: terminalInput.value,
          usuarioId: this.usuarioLogado?.id,
          usuario: this.usuarioLogado?.nome,
          saldoInicial: fundoTroco,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.erro || "Erro ao abrir caixa");
      }

      const caixa = await response.json();

      this.showNotification("Caixa aberto com sucesso!", "success");
      this.caixaAtual = caixa;
      this.fundoTroco = fundoTroco;
      this.updateCaixaStatus(true, caixa);

      // Limpar senha
      senhaInput.value = "";
      this.validateForm();
    } catch (error) {
      console.error("Erro ao abrir caixa:", error);
      this.showNotification(
        error.message || "Erro ao abrir caixa. Tente novamente.",
        "error",
      );
    }
  }

  async handleFecharCaixa() {
    const senhaInput = document.getElementById("senhaInput");

    if (!senhaInput.value) {
      this.showNotification(
        "Por favor, digite sua senha para fechar o caixa",
        "error",
      );
      return;
    }

    // Validar senha do usuário
    const senhaValida = await this.validarSenhaUsuario(senhaInput.value);
    if (!senhaValida) {
      this.showNotification("Senha incorreta", "error");
      return;
    }

    // Confirmar fechamento
    const confirmacao = await this.showConfirmModal(
      "Deseja realmente fechar o caixa?",
      `Deseja realmente fechar o caixa ${this.caixaAtual.numero}?`,
    );
    if (!confirmacao) return;

    try {
      this.showNotification("Fechando caixa...", "info");

      // Calcular saldo final (saldo inicial + fundo de troco)
      const saldoFinal = this.fundoTroco;

      // Fechar caixa via API
      const response = await fetch(`/api/caixas/${this.caixaAtual.id}/fechar`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          saldoFinal: saldoFinal,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.erro || "Erro ao fechar caixa");
      }

      this.showNotification("Caixa fechado com sucesso!", "success");
      this.updateCaixaStatus(false);

      // Limpar formulário
      senhaInput.value = "";
      const fundoTrocoInput = document.getElementById("fundoTrocoInput");
      if (fundoTrocoInput) {
        fundoTrocoInput.value = "";
      }
      this.validateForm();
    } catch (error) {
      console.error("Erro ao fechar caixa:", error);
      this.showNotification(
        error.message || "Erro ao fechar caixa. Tente novamente.",
        "error",
      );
    }
  }

  async validarSenhaUsuario(senha) {
    try {
      // Validar senha via API
      const response = await fetch("/api/usuarios/validar-senha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usuarioId: this.usuarioLogado?.id,
          senha: senha,
        }),
      });

      const data = await response.json();
      return data.valida === true;
    } catch (error) {
      console.error("Erro ao validar senha:", error);
      return false;
    }
  }

  async loadCaixaStatus() {
    try {
      // Solicitar status do caixa especificamente para o terminal selecionado
      const query = this.terminalSelecionado
        ? `?numero=${encodeURIComponent(this.terminalSelecionado)}`
        : "";
      const response = await fetch(`/api/caixas/aberto${query}`);
      const data = await response.json();

      if (data && data.aberto === true) {
        this.caixaAtual = data;
        this.fundoTroco = parseFloat(data.saldoInicial || 0);
        this.updateCaixaStatus(true, data);
      } else {
        this.updateCaixaStatus(false);
      }
    } catch (error) {
      console.error("Erro ao carregar status do caixa:", error);
      this.updateCaixaStatus(false);
    }
  }

  updateCaixaStatus(aberto, caixa = null) {
    this.caixaAberto = aberto;

    const acaoCaixaBtn = document.getElementById("acaoCaixaBtn");
    const statusCaixa = document.getElementById("statusCaixa");
    const numeroCaixa = document.getElementById("numeroCaixa");
    const dataAbertura = document.getElementById("dataAbertura");
    const fundoTrocoInput = document.getElementById("fundoTrocoInput");

    if (aberto && caixa) {
      // Caixa aberto
      if (statusCaixa) {
        statusCaixa.textContent = "Aberto";
        statusCaixa.style.color = "#27ae60";
      }

      if (numeroCaixa) {
        numeroCaixa.textContent = caixa.numero;
      }

      if (dataAbertura) {
        const data = new Date(caixa.dataAbertura);
        dataAbertura.textContent = data.toLocaleString("pt-BR");
      }

      if (fundoTrocoInput) {
        fundoTrocoInput.value = formatarMoeda(caixa.saldoInicial);
        fundoTrocoInput.disabled = true;
      }

      if (acaoCaixaBtn) {
        acaoCaixaBtn.innerHTML = '<i class="fas fa-lock"></i> Fechar o Caixa';
        acaoCaixaBtn.style.background = "#e74c3c";
      }
    } else {
      // Caixa fechado
      if (statusCaixa) {
        statusCaixa.textContent = "Fechado";
        statusCaixa.style.color = "#e74c3c";
      }

      if (numeroCaixa) {
        numeroCaixa.textContent = "-";
      }

      if (dataAbertura) {
        dataAbertura.textContent = "-";
      }

      if (fundoTrocoInput) {
        fundoTrocoInput.disabled = false;
      }

      if (acaoCaixaBtn) {
        acaoCaixaBtn.innerHTML =
          '<i class="fas fa-lock-open"></i> Abrir o Caixa';
        acaoCaixaBtn.style.background = "#27ae60";
      }
    }

    this.validateForm();
  }

  showConfirmModal(title, message) {
    return new Promise((resolve) => {
      const modal = document.getElementById("confirmModal");
      const modalTitle = document.getElementById("confirmModalTitle");
      const modalMessage = document.getElementById("confirmModalMessage");
      const btnOk = document.getElementById("confirmModalOk");
      const btnCancel = document.getElementById("confirmModalCancel");
      const overlay = modal.querySelector(".modal-confirm-overlay");

      if (!modal) {
        console.error("Modal de confirmação não encontrado");
        resolve(false);
        return;
      }

      // Configurar conteúdo
      if (modalTitle) modalTitle.textContent = title;
      if (modalMessage) modalMessage.textContent = message;

      // Mostrar modal
      modal.style.display = "flex";

      // Handler para OK
      const handleOk = () => {
        modal.style.display = "none";
        cleanup();
        resolve(true);
      };

      // Handler para Cancelar
      const handleCancel = () => {
        modal.style.display = "none";
        cleanup();
        resolve(false);
      };

      // Handler para clicar no overlay
      const handleOverlayClick = () => {
        modal.style.display = "none";
        cleanup();
        resolve(false);
      };

      // Limpar event listeners
      const cleanup = () => {
        if (btnOk) btnOk.removeEventListener("click", handleOk);
        if (btnCancel) btnCancel.removeEventListener("click", handleCancel);
        if (overlay) overlay.removeEventListener("click", handleOverlayClick);
      };

      // Adicionar event listeners
      if (btnOk) btnOk.addEventListener("click", handleOk);
      if (btnCancel) btnCancel.addEventListener("click", handleCancel);
      if (overlay) overlay.addEventListener("click", handleOverlayClick);
    });
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
            z-index: 9999;
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

  // Método para atualizar fundo de troco quando houver venda em dinheiro
  async atualizarFundoTroco(valorDinheiro) {
    if (!this.caixaAberto || !this.caixaAtual) {
      console.warn("Caixa não está aberto");
      return;
    }

    this.fundoTroco += valorDinheiro;

    // Atualizar no campo visual
    const fundoTrocoInput = document.getElementById("fundoTrocoInput");
    if (fundoTrocoInput) {
      fundoTrocoInput.value = formatarMoeda(this.fundoTroco);
    }

    console.log(
      `💰 Fundo de troco atualizado: ${formatarMoeda(this.fundoTroco)}`,
    );
  }
}

// Adicionar configuração do caixa ao DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
  // Aguardar um pouco para garantir que outros elementos carregaram
  setTimeout(() => {
    configurarSubmenuLateralCaixa();

    // Inicializar o gerenciador de caixa
    window.caixaManager = new CaixaManager();
    console.log("✅ CaixaManager inicializado");
  }, 200);
});
