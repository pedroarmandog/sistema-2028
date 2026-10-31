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

  // Inicializar funcionalidades da página de novo contrato
  inicializarNovoContrato();
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
  window.location.href = "/atendimento/novo-contrato.html";
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

// ========================================
// FUNCIONALIDADES DA PÁGINA NOVO CONTRATO
// ========================================

function inicializarNovoContrato() {
  console.log("🚀 Inicializando página Novo Contrato");

  // Configurar formatação de valores monetários
  configurarCamposMonetarios();

  // Configurar cálculo automático do valor total
  configurarCalculoValorTotal();

  // Configurar formulário
  configurarFormulario();

  // Configurar botões de pesquisa
  configurarBotoesPesquisa();

  // Configurar validações
  configurarValidacoes();
}

function configurarCamposMonetarios() {
  const camposMonetarios = document.querySelectorAll(".money-input");

  camposMonetarios.forEach((campo) => {
    // Formatação ao digitar
    campo.addEventListener("input", function (e) {
      let valor = e.target.value.replace(/\D/g, "");
      if (valor === "") {
        e.target.value = "0,00";
        return;
      }

      valor = (parseInt(valor) / 100).toFixed(2);
      valor = valor.replace(".", ",");
      valor = valor.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      e.target.value = valor;

      // Recalcular valor total se for o campo valor
      if (e.target.id === "valor") {
        calcularValorTotal();
      }
    });

    // Formatar ao sair do campo
    campo.addEventListener("blur", function (e) {
      if (e.target.value === "" || e.target.value === "0") {
        e.target.value = "0,00";
      }
    });
  });
}

function configurarCalculoValorTotal() {
  const campoValor = document.getElementById("valor");
  const campoTipo = document.getElementById("tipo");

  if (campoValor && campoTipo) {
    campoTipo.addEventListener("change", calcularValorTotal);
    campoValor.addEventListener("input", calcularValorTotal);
  }
}

function calcularValorTotal() {
  const valor = document.getElementById("valor");
  const tipo = document.getElementById("tipo");
  const valorTotal = document.getElementById("valorTotal");

  if (!valor || !tipo || !valorTotal) return;

  const valorNumerico =
    parseFloat(valor.value.replace(/\./g, "").replace(",", ".")) || 0;
  let multiplicador = 1;

  switch (tipo.value) {
    case "Por Mês":
      multiplicador = 1;
      break;
    case "Por Semana":
      multiplicador = 4; // Aproximadamente 4 semanas por mês
      break;
    case "Por Dia":
      multiplicador = 30; // Aproximadamente 30 dias por mês
      break;
  }

  const total = valorNumerico * multiplicador;
  valorTotal.value = formatarMoeda(total);
}

function formatarMoeda(valor) {
  return valor
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function configurarFormulario() {
  const form = document.getElementById("contratoForm");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      salvarContrato();
    });
  }
}

function configurarBotoesPesquisa() {
  const btnPesquisarPet = document.querySelector(
    "#petCliente + .btn-search-input",
  );
  const btnPesquisarPlano = document.querySelector(
    "#plano + .btn-search-input",
  );

  if (btnPesquisarPet) {
    btnPesquisarPet.addEventListener("click", function () {
      pesquisarPetCliente();
    });
  }

  if (btnPesquisarPlano) {
    btnPesquisarPlano.addEventListener("click", function () {
      pesquisarPlano();
    });
  }
}

function configurarValidacoes() {
  // Validação em tempo real dos campos obrigatórios
  const camposObrigatorios = document.querySelectorAll(
    "input[required], select[required]",
  );

  camposObrigatorios.forEach((campo) => {
    campo.addEventListener("blur", function () {
      validarCampo(this);
    });

    campo.addEventListener("input", function () {
      if (this.classList.contains("error")) {
        validarCampo(this);
      }
    });
  });
}

function validarCampo(campo) {
  const valor = campo.value.trim();
  const isValid = valor !== "" && valor !== "0,00";

  if (isValid) {
    campo.classList.remove("error");
    removerMensagemErro(campo);
  } else {
    campo.classList.add("error");
    mostrarMensagemErro(campo, "Este campo é obrigatório");
  }

  return isValid;
}

function mostrarMensagemErro(campo, mensagem) {
  removerMensagemErro(campo);

  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.textContent = mensagem;

  campo.parentNode.appendChild(errorDiv);
}

function removerMensagemErro(campo) {
  const errorMessage = campo.parentNode.querySelector(".error-message");
  if (errorMessage) {
    errorMessage.remove();
  }
}

// Funções de ação

function pesquisarPetCliente() {
  console.log("🔍 Pesquisando Pet/Cliente");
  // Implementar modal ou dropdown de seleção
  alert(
    "Funcionalidade de pesquisa de Pet/Cliente será implementada em breve!",
  );
}

function pesquisarPlano() {
  console.log("🔍 Pesquisando Plano");
  // Implementar modal ou dropdown de seleção
  alert("Funcionalidade de pesquisa de Plano será implementada em breve!");
}

function salvarContrato() {
  console.log("💾 Salvando contrato");

  // Validar todos os campos obrigatórios
  const camposObrigatorios = document.querySelectorAll("[required]");
  let todosValidos = true;

  camposObrigatorios.forEach((campo) => {
    if (!validarCampo(campo)) {
      todosValidos = false;
    }
  });

  if (!todosValidos) {
    alert("Por favor, preencha todos os campos obrigatórios.");
    return;
  }

  // Coletar dados do formulário
  const dadosContrato = coletarDadosFormulario();

  console.log("Dados do contrato:", dadosContrato);

  // Aqui você implementaria a chamada para a API
  // Por enquanto, simula o salvamento
  setTimeout(() => {
    alert("Contrato salvo com sucesso!");
    // Redirecionar para a lista de contratos
    window.location.href = "/atendimento/contratos.html";
  }, 500);
}

function coletarDadosFormulario() {
  return {
    petCliente: document.getElementById("petCliente").value,
    plano: document.getElementById("plano").value,
    tipo: document.getElementById("tipo").value,
    levaTraz: document.getElementById("levaTraz").value,
    recorrente: document.getElementById("recorrente").checked,
    valor: document.getElementById("valor").value,
    valorTotal: document.getElementById("valorTotal").value,
    vencimento: document.getElementById("vencimento").value,
  };
}

function limparFormulario() {
  console.log("🆕 Limpando formulário para novo contrato");

  const form = document.getElementById("contratoForm");
  if (form) {
    form.reset();

    // Resetar campos monetários
    document.getElementById("valor").value = "0,00";
    document.getElementById("valorTotal").value = "0,00";

    // Remover mensagens de erro
    const errorMessages = document.querySelectorAll(".error-message");
    errorMessages.forEach((msg) => msg.remove());

    // Remover classes de erro
    const camposComErro = document.querySelectorAll(".error");
    camposComErro.forEach((campo) => campo.classList.remove("error"));

    // Focar no primeiro campo
    const primeiroInput = document.getElementById("petCliente");
    if (primeiroInput) {
      primeiroInput.focus();
    }
  }
}

async function cancelarContrato() {
  console.log("❌ Cancelando criação de contrato");

  if (
    await confirmar(
      "Tem certeza que deseja cancelar? Todos os dados preenchidos serão perdidos.",
    )
  ) {
    window.location.href = "/atendimento/contratos.html";
  }
}

console.log("✅ Funcionalidades de novo contrato carregadas");

// =====================================================
// FUNCIONALIDADES ESPECÍFICAS DA PÁGINA NOVA DEVOLUÇÃO
// =====================================================

// Dados mock para simular vendas/atendimentos
const vendasMock = [
  {
    id: "V001",
    tipo: "venda",
    cliente: "Maria Silva",
    emissao: "15/12/2024",
    valor: "R$ 150,00",
    itens: [
      {
        codigo: "PROD001",
        descricao: "Banho e Tosa",
        uni: "UN",
        unitario: "R$ 80,00",
        quantidade: 1,
        qtdDevolvida: 0,
        total: "R$ 80,00",
      },
      {
        codigo: "PROD002",
        descricao: "Corte de Unha",
        uni: "UN",
        unitario: "R$ 35,00",
        quantidade: 2,
        qtdDevolvida: 0,
        total: "R$ 70,00",
      },
    ],
  },
  {
    id: "A001",
    tipo: "atendimento",
    cliente: "João Santos",
    emissao: "14/12/2024",
    valor: "R$ 120,00",
    itens: [
      {
        codigo: "SERV001",
        descricao: "Consulta Veterinária",
        uni: "UN",
        unitario: "R$ 120,00",
        quantidade: 1,
        qtdDevolvida: 0,
        total: "R$ 120,00",
      },
    ],
  },
];

// Estado da aplicação
let currentRecord = null;
let currentType = "venda";

// Verificar se estamos na página de Nova Devolução e inicializar
document.addEventListener("DOMContentLoaded", function () {
  // Aguardar um pouco para garantir que outros scripts carregaram
  setTimeout(() => {
    const novaDevolucaoContainer = document.querySelector(
      ".nova-devolucao-container",
    );
    if (novaDevolucaoContainer) {
      initializeNovaDevolucao();
    }
  }, 100);
});

// Inicializar página Nova Devolução
function initializeNovaDevolucao() {
  console.log("🚀 Inicializando Nova Devolução...");

  // Event listeners para tipos de devolução
  const porVenda = document.getElementById("porVenda");
  const porAtendimento = document.getElementById("porAtendimento");

  if (porVenda && porAtendimento) {
    porVenda.addEventListener("click", () => setTipoDevolucao("venda"));
    porAtendimento.addEventListener("click", () =>
      setTipoDevolucao("atendimento"),
    );
  }

  // Event listener para pesquisa
  const searchInput = document.getElementById("searchNumber");
  const searchBtn = document.querySelector(".search-icon-btn");

  if (searchInput) {
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        performSearch();
      }
    });

    searchInput.addEventListener("input", function () {
      if (!this.value.trim()) {
        clearForm();
      }
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener("click", performSearch);
  }

  // Event listeners para botões de ação
  const finalizarBtn = document.getElementById("finalizarBtn");
  const novaBtn = document.getElementById("novaBtn");
  const voltarListaBtn = document.getElementById("voltarListaBtn");

  if (finalizarBtn) {
    finalizarBtn.addEventListener("click", finalizarDevolucao);
  }

  if (novaBtn) {
    novaBtn.addEventListener("click", novaDevolucao);
  }

  if (voltarListaBtn) {
    voltarListaBtn.addEventListener("click", () => {
      window.location.href = "/atendimento/devolucao-venda.html";
    });
  }

  // Inicializar tabela vazia
  showEmptyTable();
}

// Definir tipo de devolução
function setTipoDevolucao(tipo) {
  currentType = tipo;
  clearForm();

  const searchInput = document.getElementById("searchNumber");
  if (searchInput) {
    searchInput.placeholder =
      tipo === "venda"
        ? "Digite o número da venda"
        : "Digite o número do atendimento";
  }
}

// Realizar pesquisa
function performSearch() {
  const searchInput = document.getElementById("searchNumber");
  const searchValue = searchInput ? searchInput.value.trim() : "";

  if (!searchValue) {
    alert("Por favor, digite um número para pesquisar.");
    return;
  }

  // Simular busca nos dados mock
  const record = vendasMock.find(
    (item) => item.id === searchValue && item.tipo === currentType,
  );

  if (record) {
    loadRecord(record);
  } else {
    alert(
      `${currentType === "venda" ? "Venda" : "Atendimento"} não encontrado(a).`,
    );
    clearForm();
  }
}

// Carregar dados do registro
function loadRecord(record) {
  currentRecord = record;

  // Preencher campos
  const clienteInput = document.getElementById("clienteInput");
  const emissaoInput = document.getElementById("emissaoInput");
  const valorInput = document.getElementById("valorInput");

  if (clienteInput) clienteInput.value = record.cliente;
  if (emissaoInput) emissaoInput.value = record.emissao;
  if (valorInput) valorInput.value = record.valor;

  // Carregar tabela de itens
  loadItemsTable(record.itens);

  // Atualizar total
  updateTotal();
}

// Carregar tabela de itens
function loadItemsTable(itens) {
  const tbody = document.getElementById("itemsTableBody");
  if (!tbody) return;

  tbody.innerHTML = itens
    .map(
      (item, index) => `
    <tr>
      <td>${item.codigo}</td>
      <td>${item.descricao}</td>
      <td>${item.uni}</td>
      <td>${item.unitario}</td>
      <td>${item.quantidade}</td>
      <td>
        <input type="number" 
               class="qtd-devolvida-input" 
               data-index="${index}"
               min="0" 
               max="${item.quantidade}" 
               value="${item.qtdDevolvida}"
               style="width: 80px; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px;">
      </td>
      <td class="item-total">${item.total}</td>
    </tr>
  `,
    )
    .join("");

  // Adicionar event listeners para inputs de quantidade
  tbody.querySelectorAll(".qtd-devolvida-input").forEach((input) => {
    input.addEventListener("change", updateItemTotal);
  });
}

// Mostrar tabela vazia
function showEmptyTable() {
  const tbody = document.getElementById("itemsTableBody");
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="empty-table">
        <i class="fas fa-search"></i>
        <h3>Pesquise por uma venda ou atendimento</h3>
        <p>Digite o número da venda ou atendimento para carregar os itens</p>
      </td>
    </tr>
  `;
}

// Atualizar total do item
function updateItemTotal(event) {
  const input = event.target;
  const index = parseInt(input.dataset.index);
  const qtdDevolvida = parseInt(input.value) || 0;

  if (!currentRecord || !currentRecord.itens[index]) return;

  const item = currentRecord.itens[index];
  const unitarioValue = parseFloat(
    item.unitario.replace("R$", "").replace(",", ".").trim(),
  );
  const novoTotal = unitarioValue * qtdDevolvida;

  // Atualizar quantidade devolvida no item
  item.qtdDevolvida = qtdDevolvida;

  // Atualizar total na tabela
  const totalCell = input.closest("tr").querySelector(".item-total");
  if (totalCell) {
    totalCell.textContent = `R$ ${novoTotal.toFixed(2).replace(".", ",")}`;
  }

  // Atualizar total geral
  updateTotal();
}

// Atualizar total da devolução
function updateTotal() {
  if (!currentRecord) return;

  let total = 0;
  currentRecord.itens.forEach((item) => {
    if (item.qtdDevolvida > 0) {
      const unitarioValue = parseFloat(
        item.unitario.replace("R$", "").replace(",", ".").trim(),
      );
      total += unitarioValue * item.qtdDevolvida;
    }
  });

  const totalElement = document.getElementById("totalDevolucao");
  if (totalElement) {
    totalElement.textContent = `R$ ${total.toFixed(2).replace(".", ",")}`;
  }
}

// Limpar formulário
function clearForm() {
  currentRecord = null;

  const clienteInput = document.getElementById("clienteInput");
  const emissaoInput = document.getElementById("emissaoInput");
  const valorInput = document.getElementById("valorInput");
  const totalElement = document.getElementById("totalDevolucao");

  if (clienteInput) clienteInput.value = "";
  if (emissaoInput) emissaoInput.value = "";
  if (valorInput) valorInput.value = "0,00";
  if (totalElement) totalElement.textContent = "R$ 0,00";

  showEmptyTable();
}

// Finalizar devolução
async function finalizarDevolucao() {
  if (!currentRecord) {
    alert("Nenhuma venda ou atendimento carregado.");
    return;
  }

  const itensDevolvidos = currentRecord.itens.filter(
    (item) => item.qtdDevolvida > 0,
  );

  if (itensDevolvidos.length === 0) {
    alert("Selecione pelo menos um item para devolução.");
    return;
  }

  // Simular processamento
  const totalDevolucao = document.getElementById("totalDevolucao").textContent;

  if (await confirmar(`Confirmar devolução no valor de ${totalDevolucao}?`)) {
    alert("Devolução processada com sucesso!");
    // Redirecionar para lista de devoluções
    window.location.href = "/atendimento/devolucao-venda.html";
  }
}

// Nova devolução
function novaDevolucao() {
  clearForm();
  const searchInput = document.getElementById("searchNumber");
  if (searchInput) {
    searchInput.value = "";
    searchInput.focus();
  }
}
