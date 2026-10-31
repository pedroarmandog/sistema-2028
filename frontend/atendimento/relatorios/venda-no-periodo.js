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
  inicializarRelatorio();
});

// ========================================
// FUNCIONALIDADES DO RELATÓRIO DE VENDA NO PERÍODO
// ========================================

function inicializarRelatorio() {
  console.log(
    "🚀 Inicializando funcionalidades do Relatório de Venda no Período",
  );

  // Configurar eventos dos botões
  configurarBotoesRelatorio();

  // Configurar filtros
  configurarFiltros();

  // Configurar calendário personalizado
  inicializarCalendarioPersonalizado();

  // Configurar data padrão
  configurarDataPadrao();
}

function configurarBotoesRelatorio() {
  const btnVisualizar = document.getElementById("btnVisualizar");
  const btnLimpar = document.getElementById("btnLimpar");

  if (btnVisualizar) {
    btnVisualizar.addEventListener("click", function () {
      console.log("📊 Botão Visualizar clicado");
      visualizarRelatorio();
    });
  }

  if (btnLimpar) {
    btnLimpar.addEventListener("click", function () {
      console.log("🧹 Botão Limpar clicado");
      limparFiltros();
    });
  }
}

function configurarFiltros() {
  // Configurar eventos de mudança nos filtros
  const filtros = [
    "cliente",
    "grupoCliente",
    "profissional",
    "grupo",
    "subgrupo",
    "marca",
    "produto",
    "numeroVenda",
    "documentoFiscal",
  ];

  filtros.forEach((filtroId) => {
    const elemento = document.getElementById(filtroId);
    if (elemento) {
      elemento.addEventListener("change", function () {
        console.log(`🔍 Filtro ${filtroId} alterado:`, this.value);
      });
    }
  });

  // Configurar checkboxes
  const checkboxes = [
    "listarProdutos",
    "apresentarCusto",
    "listarFormasPagamento",
  ];
  checkboxes.forEach((checkboxId) => {
    const elemento = document.getElementById(checkboxId);
    if (elemento) {
      elemento.addEventListener("change", function () {
        console.log(
          `☑️ Checkbox ${checkboxId}:`,
          this.checked ? "marcado" : "desmarcado",
        );
      });
    }
  });
}

function configurarDataPadrao() {
  const dataInicio = document.getElementById("dataInicio");
  const dataFim = document.getElementById("dataFim");

  if (dataInicio && dataFim) {
    const hoje = new Date();
    const dataFormatada = formatarData(hoje);
    dataInicio.value = dataFormatada;
    dataFim.value = dataFormatada;
  }
}

// ========================================
// CALENDÁRIO PERSONALIZADO
// ========================================

let calendarioAtual = {
  mes: new Date().getMonth(),
  ano: new Date().getFullYear(),
  dataInicio: null,
  dataFim: null,
  selecionandoInicio: true,
};

function inicializarCalendarioPersonalizado() {
  console.log("📅 Inicializando calendário personalizado");

  const periodoEmissao = document.getElementById("periodoEmissao");
  const calendarioPopup = document.getElementById("calendarioPopup");

  if (periodoEmissao && calendarioPopup) {
    // Abrir calendário ao clicar no período
    periodoEmissao.addEventListener("click", function (e) {
      e.stopPropagation();
      abrirCalendario();
    });

    // Fechar calendário ao clicar fora
    document.addEventListener("click", function (e) {
      if (
        !calendarioPopup.contains(e.target) &&
        !periodoEmissao.contains(e.target)
      ) {
        fecharCalendario();
      }
    });

    // Configurar navegação do calendário
    configurarNavegacaoCalendario();

    // Configurar botões do calendário
    configurarBotoesCalendario();

    // Gerar calendário inicial
    gerarCalendario();
  }
}

function configurarNavegacaoCalendario() {
  const btnMesAnterior = document.getElementById("btnMesAnterior");
  const btnProximoMes = document.getElementById("btnProximoMes");

  if (btnMesAnterior) {
    btnMesAnterior.addEventListener("click", function () {
      calendarioAtual.mes--;
      if (calendarioAtual.mes < 0) {
        calendarioAtual.mes = 11;
        calendarioAtual.ano--;
      }
      gerarCalendario();
    });
  }

  if (btnProximoMes) {
    btnProximoMes.addEventListener("click", function () {
      calendarioAtual.mes++;
      if (calendarioAtual.mes > 11) {
        calendarioAtual.mes = 0;
        calendarioAtual.ano++;
      }
      gerarCalendario();
    });
  }
}

function configurarBotoesCalendario() {
  const btnCancelar = document.getElementById("btnCalendarioCancelar");
  const btnAplicar = document.getElementById("btnCalendarioAplicar");

  if (btnCancelar) {
    btnCancelar.addEventListener("click", function () {
      fecharCalendario();
    });
  }

  if (btnAplicar) {
    btnAplicar.addEventListener("click", function () {
      aplicarDatasCalendario();
    });
  }
}

function abrirCalendario() {
  const calendarioPopup = document.getElementById("calendarioPopup");
  const dataInicio = document.getElementById("dataInicio");
  const dataFim = document.getElementById("dataFim");

  // Carregar datas atuais
  if (dataInicio && dataInicio.value) {
    calendarioAtual.dataInicio = parseData(dataInicio.value);
  }
  if (dataFim && dataFim.value) {
    calendarioAtual.dataFim = parseData(dataFim.value);
  }

  calendarioAtual.selecionandoInicio = true;

  if (calendarioPopup) {
    // Garantir que o popup esteja em <body> para evitar clipping/z-index
    try {
      if (calendarioPopup.parentElement !== document.body) {
        document.body.appendChild(calendarioPopup);
      }
    } catch (e) {}

    // Posicionar popup abaixo do campo de período
    try {
      const periodoEl = document.getElementById("periodoEmissao");
      if (periodoEl) {
        const rect = periodoEl.getBoundingClientRect();
        calendarioPopup.style.position = "absolute";
        calendarioPopup.style.left = rect.left + window.scrollX + "px";
        calendarioPopup.style.top = rect.bottom + window.scrollY + 8 + "px";
      }
    } catch (e) {}

    calendarioPopup.classList.add("show");
    gerarCalendario();
  }
}

function fecharCalendario() {
  const calendarioPopup = document.getElementById("calendarioPopup");
  if (calendarioPopup) {
    calendarioPopup.classList.remove("show");
  }
}

function gerarCalendario() {
  const mesAnoLeft = document.getElementById("mesAnoLeft");
  const mesAnoRight = document.getElementById("mesAnoRight");
  const diasLeft = document.getElementById("diasCalendarioLeft");
  const diasRight = document.getElementById("diasCalendarioRight");

  if (!mesAnoLeft || !mesAnoRight || !diasLeft || !diasRight) return;

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

  const mes = calendarioAtual.mes;
  const ano = calendarioAtual.ano;
  const next = new Date(ano, mes + 1, 1);
  const mesRight = next.getMonth();
  const anoRight = next.getFullYear();

  mesAnoLeft.textContent = `${nomesMeses[mes]} ${ano}`;
  mesAnoRight.textContent = `${nomesMeses[mesRight]} ${anoRight}`;

  // Limpar contêineres
  diasLeft.innerHTML = "";
  diasRight.innerHTML = "";

  // Gerar ambos os meses (esquerdo = mes/ano atual, direito = próximo mês)
  gerarCalendarioMes(mes, ano, diasLeft);
  gerarCalendarioMes(mesRight, anoRight, diasRight);
}

function gerarCalendarioMes(mes, ano, diasContainer) {
  // Primeiro dia do mês
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);

  // Dias da semana anterior
  const diasAnterior = primeiroDia.getDay();
  const mesAnterior = new Date(ano, mes, 0);

  for (let i = diasAnterior - 1; i >= 0; i--) {
    const dia = mesAnterior.getDate() - i;
    criarDiaCalendario(dia, true, mes - 1, ano, diasContainer);
  }

  // Dias do mês atual
  for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
    criarDiaCalendario(dia, false, mes, ano, diasContainer);
  }

  // Dias do próximo mês para completar a grade
  const diasRestantes = 42 - (diasAnterior + ultimoDia.getDate());
  for (let dia = 1; dia <= diasRestantes; dia++) {
    criarDiaCalendario(dia, true, mes + 1, ano, diasContainer);
  }
}

function criarDiaCalendario(numeroDia, outroMes, mes, ano, diasContainer) {
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
    calendarioAtual.dataInicio &&
    datasSaoIguais(dataAtual, calendarioAtual.dataInicio)
  ) {
    diaElement.classList.add("inicio-periodo");
  }

  if (
    calendarioAtual.dataFim &&
    datasSaoIguais(dataAtual, calendarioAtual.dataFim)
  ) {
    diaElement.classList.add("fim-periodo");
  }

  // Destacar período
  if (
    calendarioAtual.dataInicio &&
    calendarioAtual.dataFim &&
    dataAtual > calendarioAtual.dataInicio &&
    dataAtual < calendarioAtual.dataFim
  ) {
    diaElement.classList.add("periodo-range");
  }

  // Evento de clique — evitar que o evento suba ao document (feche o popup)
  diaElement.addEventListener("click", function (e) {
    e.stopPropagation();
    selecionarDataCalendario(dataAtual);
  });

  diasContainer.appendChild(diaElement);
}

function selecionarDataCalendario(data) {
  if (calendarioAtual.selecionandoInicio) {
    calendarioAtual.dataInicio = new Date(data);
    calendarioAtual.dataFim = null;
    // ao selecionar o início, agora aguardamos a seleção do fim
    calendarioAtual.selecionandoInicio = false;
    gerarCalendario();
    return;
  } else {
    if (data < calendarioAtual.dataInicio) {
      // Se a data final for anterior à inicial, trocar
      calendarioAtual.dataFim = calendarioAtual.dataInicio;
      calendarioAtual.dataInicio = new Date(data);
    } else {
      calendarioAtual.dataFim = new Date(data);
    }
    calendarioAtual.selecionandoInicio = true;
    // Auto-aplicar e fechar quando as duas datas estiverem selecionadas
    aplicarDatasCalendario();
  }

  gerarCalendario();
}

function aplicarDatasCalendario() {
  const dataInicio = document.getElementById("dataInicio");
  const dataFim = document.getElementById("dataFim");

  if (calendarioAtual.dataInicio && dataInicio) {
    dataInicio.value = formatarData(calendarioAtual.dataInicio);
  }

  if (calendarioAtual.dataFim && dataFim) {
    dataFim.value = formatarData(calendarioAtual.dataFim);
  } else if (calendarioAtual.dataInicio && dataFim) {
    // Se só uma data foi selecionada, usar como início e fim
    dataFim.value = formatarData(calendarioAtual.dataInicio);
  }

  fecharCalendario();
  mostrarNotificacao("Período selecionado com sucesso!", "success");
}

function formatarData(data) {
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

function parseData(dataString) {
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

function datasSaoIguais(data1, data2) {
  return (
    data1.getDate() === data2.getDate() &&
    data1.getMonth() === data2.getMonth() &&
    data1.getFullYear() === data2.getFullYear()
  );
}

async function visualizarRelatorio() {
  // Coletar dados dos filtros
  const filtros = coletarFiltros();
  console.log("📊 Gerando relatório com filtros:", filtros);

  // Validar período
  if (!filtros.dataInicio || !filtros.dataFim) {
    mostrarNotificacao("Por favor, selecione o período de emissão.", "warning");
    return;
  }

  // Converter datas para comparação
  const dataInicioObj = parseData(filtros.dataInicio);
  const dataFimObj = parseData(filtros.dataFim);

  if (dataInicioObj > dataFimObj) {
    mostrarNotificacao(
      "A data de início não pode ser maior que a data final.",
      "error",
    );
    return;
  }

  // Construir URL do PDF com parâmetros (aceita via query)
  const params = new URLSearchParams();
  params.set("dataInicio", filtros.dataInicio);
  params.set("dataFim", filtros.dataFim);

  // Tentar obter dados da empresa via API para garantir razão social e logo
  try {
    // endpoint correto é /api/empresas (rota montada em app.js)
    const resp = await fetch("/api/empresas", { credentials: "same-origin" });
    if (resp && resp.ok) {
      const empresas = await resp.json();
      const emp =
        Array.isArray(empresas) && empresas.length ? empresas[0] : null;
      if (emp) {
        if (emp.razaoSocial) params.set("companyName", emp.razaoSocial);
        else if (emp.nome) params.set("companyName", emp.nome);
        if (emp.logo) params.set("logoFilename", emp.logo);
      }
    }
  } catch (e) {
    console.warn("Erro ao buscar empresa para header do PDF:", e);
  }

  const pdfUrl = `/api/relatorios/venda-no-periodo/pdf?${params.toString()}`;

  // Abrir no reportViewer se disponível (reaproveita modal existente)
  if (
    window.reportViewer &&
    window.reportViewer.iframe &&
    window.reportViewer.modal
  ) {
    window.reportViewer.iframe.src = pdfUrl;
    window.reportViewer.modal.classList.add("active");
    window.reportViewer.modal.style.display = "block";
    window.reportViewer.isOpen = true;
    document.body.style.overflow = "hidden";
    return;
  }

  // Fallback: modal simples embutida
  let modal = document.getElementById("customPdfModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "customPdfModal";
    modal.innerHTML = `
      <div id="customPdfOverlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99998;"></div>
      <div id="customPdfContent" style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:80%;height:80%;background:white;border-radius:8px;z-index:99999;box-shadow:0 20px 50px rgba(0,0,0,.5);overflow:hidden;display:flex;flex-direction:column;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#2c3e50;color:white;">
          <div style="font-weight:600"><i class="fas fa-file-pdf"></i> Relatório de Venda no Período</div>
          <button id="customPdfClose" style="background:none;border:none;color:white;font-size:20px;cursor:pointer;">×</button>
        </div>
        <iframe id="customPdfIframe" src="" style="width:100%;height:100%;border:0;flex:1"></iframe>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById("customPdfClose").addEventListener("click", () => {
      document.getElementById("customPdfIframe").src = "";
      modal.style.display = "none";
      document.body.style.overflow = "";
    });
    document
      .getElementById("customPdfOverlay")
      .addEventListener("click", () => {
        document.getElementById("customPdfIframe").src = "";
        modal.style.display = "none";
        document.body.style.overflow = "";
      });
  }

  const iframe = document.getElementById("customPdfIframe");
  iframe.src = pdfUrl;
  modal.style.display = "block";
  document.body.style.overflow = "hidden";
}

function coletarFiltros() {
  return {
    dataInicio: document.getElementById("dataInicio")?.value,
    dataFim: document.getElementById("dataFim")?.value,
    numeroCaixa: document.getElementById("numeroCaixa")?.value,
    tipoRelatorio: document.getElementById("tipoRelatorio")?.value,
    cliente: document.getElementById("cliente")?.value,
    grupoCliente: document.getElementById("grupoCliente")?.value,
    profissional: document.getElementById("profissional")?.value,
    grupo: document.getElementById("grupo")?.value,
    subgrupo: document.getElementById("subgrupo")?.value,
    marca: document.getElementById("marca")?.value,
    produto: document.getElementById("produto")?.value,
    numeroVenda: document.getElementById("numeroVenda")?.value,
    documentoFiscal: document.getElementById("documentoFiscal")?.value,
    listarProdutos: document.getElementById("listarProdutos")?.checked,
    apresentarCusto: document.getElementById("apresentarCusto")?.checked,
    listarFormasPagamento: document.getElementById("listarFormasPagamento")
      ?.checked,
  };
}

function limparFiltros() {
  console.log("🧹 Limpando todos os filtros");

  // Limpar campos de texto
  const camposTexto = ["numeroCaixa", "grupoCliente", "produto", "numeroVenda"];
  camposTexto.forEach((campo) => {
    const elemento = document.getElementById(campo);
    if (elemento) elemento.value = "";
  });

  // Resetar selects para primeira opção
  const selects = [
    "tipoRelatorio",
    "cliente",
    "profissional",
    "grupo",
    "subgrupo",
    "marca",
    "documentoFiscal",
  ];
  selects.forEach((select) => {
    const elemento = document.getElementById(select);
    if (elemento) elemento.selectedIndex = 0;
  });

  // Desmarcar checkboxes
  const checkboxes = [
    "listarProdutos",
    "apresentarCusto",
    "listarFormasPagamento",
  ];
  checkboxes.forEach((checkbox) => {
    const elemento = document.getElementById(checkbox);
    if (elemento) elemento.checked = false;
  });

  // Manter data atual
  configurarDataPadrao();

  mostrarNotificacao("Filtros limpos com sucesso!", "success");
}

function processarRelatorio(filtros) {
  // Aqui você faria a integração com o backend
  console.log("🔄 Processando relatório no backend...", filtros);

  // Simulação de dados de exemplo
  const dadosRelatorio = {
    periodo: `${filtros.dataInicio} à ${filtros.dataFim}`,
    totalVendas: 15,
    valorTotal: 2850.5,
    itens: [
      { produto: "Ração Premium", quantidade: 5, valor: 450.0 },
      { produto: "Shampoo Pet", quantidade: 3, valor: 89.9 },
      { produto: "Consulta Veterinária", quantidade: 7, valor: 2310.6 },
    ],
  };

  console.log("📈 Dados do relatório:", dadosRelatorio);

  // Aqui você poderia abrir uma nova janela com o relatório ou
  // navegar para uma página de visualização
}

function mostrarNotificacao(mensagem, tipo = "info") {
  // Remove notificação existente se houver
  const existente = document.querySelector(".notification");
  if (existente) {
    existente.remove();
  }

  // Criar nova notificação
  const notification = document.createElement("div");
  notification.className = "notification";

  // Definir cor baseada no tipo
  const cores = {
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
  };

  notification.style.background = cores[tipo] || cores.info;
  notification.style.color = "white";

  // Adicionar ícone baseado no tipo
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

  document.body.appendChild(notification);

  // Remover após 4 segundos
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 4000);
}

console.log("✅ Funcionalidades do Relatório de Venda no Período carregadas");
