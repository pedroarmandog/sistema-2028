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

  // Inicializar funcionalidades do relatório de atendimento
  inicializarRelatorioAtendimento();
});

// ========================================
// FUNCIONALIDADES DO RELATÓRIO DE ATENDIMENTO NO PERÍODO
// ========================================

let _filtrosRelatorio = null;

function inicializarRelatorioAtendimento() {
  configurarBotoesRelatorio();
  inicializarCalendarioPersonalizado();
  configurarDataPadrao();
}

function configurarBotoesRelatorio() {
  const btnVisualizar = document.getElementById("btnVisualizar");
  const btnLimpar = document.getElementById("btnLimpar");
  if (btnVisualizar)
    btnVisualizar.addEventListener("click", visualizarRelatorio);
  if (btnLimpar) btnLimpar.addEventListener("click", limparFiltros);
}

function configurarDataPadrao() {
  const dataInicio = document.getElementById("dataInicio");
  const dataFim = document.getElementById("dataFim");
  if (dataInicio && dataFim) {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    dataInicio.value = formatarData(inicioMes);
    dataFim.value = formatarData(hoje);
  }
}

// ========================================
// CALENDÁRIO PERSONALIZADO (DUPLO)
// ========================================

let calendarioAtual = {
  mes: new Date().getMonth(),
  ano: new Date().getFullYear(),
  dataInicio: null,
  dataFim: null,
  selecionandoInicio: true,
  _hoverDate: null,
};

function inicializarCalendarioPersonalizado() {
  const periodoEmissao = document.getElementById("periodoEmissao");
  const calendarioPopup = document.getElementById("calendarioPopup");
  if (!periodoEmissao || !calendarioPopup) return;

  periodoEmissao.addEventListener("click", function (e) {
    e.stopPropagation();
    abrirCalendario();
  });
  calendarioPopup.addEventListener("click", function (e) {
    e.stopPropagation();
  });
  document.addEventListener("click", function (e) {
    if (
      !calendarioPopup.contains(e.target) &&
      !periodoEmissao.contains(e.target)
    ) {
      fecharCalendario();
    }
  });
  calendarioPopup.addEventListener("mouseleave", function () {
    if (calendarioAtual._hoverDate) {
      calendarioAtual._hoverDate = null;
      atualizarClassesDias();
    }
  });
  // Delegação de mouseover nos containers de dias (não reconstrói DOM)
  ["diasCalendario", "diasCalendario2"].forEach(function (id) {
    const cont = document.getElementById(id);
    if (!cont) return;
    cont.addEventListener("mouseover", function (e) {
      const dia = e.target.closest(".dia");
      if (!dia || !dia.dataset.ts) return;
      if (!calendarioAtual.selecionandoInicio && !calendarioAtual.dataFim) {
        const ts = parseInt(dia.dataset.ts);
        if (
          calendarioAtual._hoverDate &&
          calendarioAtual._hoverDate.getTime() === ts
        )
          return;
        calendarioAtual._hoverDate = new Date(ts);
        atualizarClassesDias();
      }
    });
  });
  configurarNavegacaoCalendario();
  configurarBotoesCalendario();
  gerarCalendario();
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
  if (btnCancelar) btnCancelar.addEventListener("click", fecharCalendario);
  if (btnAplicar) btnAplicar.addEventListener("click", aplicarDatasCalendario);
}

function abrirCalendario() {
  const calendarioPopup = document.getElementById("calendarioPopup");
  const dataInicio = document.getElementById("dataInicio");
  // Posicionar no mês do campo dataInicio (apenas para navegação)
  if (dataInicio.value) {
    const d = parseData(dataInicio.value);
    calendarioAtual.mes = d.getMonth();
    calendarioAtual.ano = d.getFullYear();
  }
  // Limpar seleção para o usuário clicar do zero
  calendarioAtual.dataInicio = null;
  calendarioAtual.dataFim = null;
  calendarioAtual.selecionandoInicio = true;
  calendarioAtual._hoverDate = null;
  atualizarHintCalendario();
  if (calendarioPopup) {
    calendarioPopup.classList.add("show");
    gerarCalendario();
  }
}

function fecharCalendario() {
  const calendarioPopup = document.getElementById("calendarioPopup");
  if (calendarioPopup) calendarioPopup.classList.remove("show");
}

function gerarCalendario() {
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
  let mes2 = calendarioAtual.mes + 1;
  let ano2 = calendarioAtual.ano;
  if (mes2 > 11) {
    mes2 = 0;
    ano2++;
  }

  const mesAno1 = document.getElementById("mesAnoAtual");
  const mesAno2 = document.getElementById("mesAnoAtual2");
  if (mesAno1)
    mesAno1.textContent =
      nomesMeses[calendarioAtual.mes] + " " + calendarioAtual.ano;
  if (mesAno2) mesAno2.textContent = nomesMeses[mes2] + " " + ano2;

  gerarMesCalendario(
    "diasCalendario",
    calendarioAtual.mes,
    calendarioAtual.ano,
  );
  gerarMesCalendario("diasCalendario2", mes2, ano2);
}

function gerarMesCalendario(containerId, mes, ano) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const diasAnterior = primeiroDia.getDay();
  const mesAnteriorObj = new Date(ano, mes, 0);
  for (let i = diasAnterior - 1; i >= 0; i--) {
    criarDiaCalendario(
      containerId,
      mesAnteriorObj.getDate() - i,
      true,
      mes - 1,
      ano,
    );
  }
  for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
    criarDiaCalendario(containerId, dia, false, mes, ano);
  }
  const diasRestantes = 42 - (diasAnterior + ultimoDia.getDate());
  for (let dia = 1; dia <= diasRestantes; dia++) {
    criarDiaCalendario(containerId, dia, true, mes + 1, ano);
  }
}

function criarDiaCalendario(containerId, numeroDia, outroMes, mes, ano) {
  const container = document.getElementById(containerId);
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
  // Guardar timestamp para delegate hover
  diaElement.dataset.ts = dataAtual.getTime();
  if (outroMes) diaElement.classList.add("outros-mes");
  aplicarClassesDia(diaElement, dataAtual, outroMes);
  diaElement.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    selecionarDataCalendario(dataAtual);
  });
  container.appendChild(diaElement);
}

// Aplica as classes de seleção/range em um elemento de dia
function aplicarClassesDia(el, dataAtual, outroMes) {
  el.classList.remove("hoje", "inicio-periodo", "fim-periodo", "periodo-range");
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (dataAtual.getTime() === hoje.getTime() && !outroMes)
    el.classList.add("hoje");
  if (
    calendarioAtual.dataInicio &&
    datasSaoIguais(dataAtual, calendarioAtual.dataInicio)
  )
    el.classList.add("inicio-periodo");
  const dataFimEfetiva =
    calendarioAtual.dataFim ||
    (!calendarioAtual.dataFim &&
    !calendarioAtual.selecionandoInicio &&
    calendarioAtual._hoverDate
      ? calendarioAtual._hoverDate
      : null);
  if (dataFimEfetiva && datasSaoIguais(dataAtual, dataFimEfetiva))
    el.classList.add("fim-periodo");
  if (calendarioAtual.dataInicio && dataFimEfetiva) {
    const [dMin, dMax] =
      calendarioAtual.dataInicio <= dataFimEfetiva
        ? [calendarioAtual.dataInicio, dataFimEfetiva]
        : [dataFimEfetiva, calendarioAtual.dataInicio];
    if (dataAtual > dMin && dataAtual < dMax) el.classList.add("periodo-range");
  }
}

// Atualiza apenas as classes dos dias existentes (sem reconstruir o DOM)
function atualizarClassesDias() {
  ["diasCalendario", "diasCalendario2"].forEach(function (id) {
    const cont = document.getElementById(id);
    if (!cont) return;
    cont.querySelectorAll(".dia").forEach(function (el) {
      const ts = parseInt(el.dataset.ts);
      if (isNaN(ts)) return;
      const dataAtual = new Date(ts);
      const outroMes = el.classList.contains("outros-mes");
      aplicarClassesDia(el, dataAtual, outroMes);
    });
  });
}

function selecionarDataCalendario(data) {
  if (calendarioAtual.selecionandoInicio) {
    calendarioAtual.dataInicio = data;
    calendarioAtual.dataFim = null;
    calendarioAtual.selecionandoInicio = false;
    calendarioAtual._hoverDate = null;
    atualizarHintCalendario();
    atualizarClassesDias();
  } else {
    if (data < calendarioAtual.dataInicio) {
      calendarioAtual.dataFim = calendarioAtual.dataInicio;
      calendarioAtual.dataInicio = data;
    } else {
      calendarioAtual.dataFim = data;
    }
    calendarioAtual.selecionandoInicio = true;
    calendarioAtual._hoverDate = null;
    // Aplicar nos campos e fechar
    const elInicio = document.getElementById("dataInicio");
    const elFim = document.getElementById("dataFim");
    if (elInicio) elInicio.value = formatarData(calendarioAtual.dataInicio);
    if (elFim) elFim.value = formatarData(calendarioAtual.dataFim);
    const popup = document.getElementById("calendarioPopup");
    if (popup) popup.classList.remove("show");
  }
}

function atualizarHintCalendario() {
  const hint = document.getElementById("calendarioHint");
  if (!hint) return;
  if (calendarioAtual.selecionandoInicio) {
    hint.textContent = "Clique para selecionar a data inicial";
  } else {
    hint.textContent = "Clique para selecionar a data final";
  }
}

function aplicarDatasCalendario() {
  const dataInicio = document.getElementById("dataInicio");
  const dataFim = document.getElementById("dataFim");
  if (calendarioAtual.dataInicio)
    dataInicio.value = formatarData(calendarioAtual.dataInicio);
  if (calendarioAtual.dataFim)
    dataFim.value = formatarData(calendarioAtual.dataFim);
  else if (calendarioAtual.dataInicio)
    dataFim.value = formatarData(calendarioAtual.dataInicio);
  fecharCalendario();
}

// ========================================
// VISUALIZAR RELATÓRIO (PDF)
// ========================================

async function visualizarRelatorio() {
  const dataInicio = document.getElementById("dataInicio")?.value;
  const dataFim = document.getElementById("dataFim")?.value;
  if (!dataInicio || !dataFim) {
    mostrarNotificacao("Por favor, selecione o período.", "warning");
    return;
  }
  const dataInicioObj = parseData(dataInicio);
  const dataFimObj = parseData(dataFim);
  if (dataInicioObj > dataFimObj) {
    mostrarNotificacao(
      "A data de início não pode ser maior que a data final.",
      "error",
    );
    return;
  }

  _filtrosRelatorio = { dataInicio, dataFim };
  mostrarNotificacao("Gerando relatório...", "info");

  try {
    const resp = await fetch("/api/relatorios/atendimento-periodo/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ dataInicio, dataFim }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || "HTTP " + resp.status);
    }
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    abrirModalPdf(
      blobUrl,
      "Relatório de Atendimento — " + dataInicio + " a " + dataFim,
    );
    mostrarNotificacao("Relatório gerado com sucesso!", "success");
  } catch (err) {
    console.error("Erro ao gerar relatório:", err);
    mostrarNotificacao("Erro: " + err.message, "error");
  }
}

function abrirModalPdf(blobUrl, titulo) {
  const existing = document.getElementById("pdfModalOverlay");
  if (existing) existing.remove();
  const overlay = document.createElement("div");
  overlay.id = "pdfModalOverlay";
  Object.assign(overlay.style, {
    position: "fixed",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.65)",
    zIndex: 12060,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });
  const modal = document.createElement("div");
  Object.assign(modal.style, {
    width: "90%",
    height: "90%",
    maxWidth: "1100px",
    background: "#fff",
    borderRadius: "8px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
  });
  const header = document.createElement("div");
  Object.assign(header.style, {
    padding: "10px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#f6f6f6",
    borderBottom: "1px solid #e0e0e0",
  });
  const titleEl = document.createElement("span");
  titleEl.textContent = titulo;
  titleEl.style.fontWeight = "600";
  titleEl.style.fontSize = "14px";
  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "8px";
  const openNewBtn = document.createElement("button");
  openNewBtn.textContent = "Ver em uma nova aba";
  Object.assign(openNewBtn.style, {
    padding: "6px 12px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    background: "#fff",
    cursor: "pointer",
    fontSize: "13px",
  });
  openNewBtn.addEventListener("click", () => window.open(blobUrl, "_blank"));
  const downloadBtn = document.createElement("button");
  downloadBtn.textContent = "Baixar PDF";
  Object.assign(downloadBtn.style, {
    padding: "6px 12px",
    border: "none",
    borderRadius: "4px",
    background: "#2c3e6b",
    color: "#fff",
    cursor: "pointer",
    fontSize: "13px",
  });
  downloadBtn.addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download =
      "relatorio_atendimento_" +
      (_filtrosRelatorio?.dataInicio || "").replace(/\//g, "-") +
      ".pdf";
    a.click();
  });
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕";
  Object.assign(closeBtn.style, {
    padding: "6px 10px",
    border: "none",
    borderRadius: "4px",
    background: "#e74c3c",
    color: "#fff",
    cursor: "pointer",
    fontSize: "16px",
    lineHeight: "1",
  });
  closeBtn.addEventListener("click", () => {
    overlay.remove();
    URL.revokeObjectURL(blobUrl);
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.remove();
      URL.revokeObjectURL(blobUrl);
    }
  });
  actions.appendChild(openNewBtn);
  actions.appendChild(downloadBtn);
  actions.appendChild(closeBtn);
  header.appendChild(titleEl);
  header.appendChild(actions);
  const iframe = document.createElement("iframe");
  iframe.src = blobUrl;
  iframe.type = "application/pdf";
  Object.assign(iframe.style, { border: "none", width: "100%", flex: "1" });
  modal.appendChild(header);
  modal.appendChild(iframe);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function limparFiltros() {
  configurarDataPadrao();
  _filtrosRelatorio = null;
  mostrarNotificacao("Filtros limpos!", "success");
}

// ========================================
// UTILITÁRIOS
// ========================================

function formatarData(data) {
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  return dia + "/" + mes + "/" + data.getFullYear();
}

function parseData(dataString) {
  const partes = dataString.split("/");
  if (partes.length === 3)
    return new Date(
      parseInt(partes[2]),
      parseInt(partes[1]) - 1,
      parseInt(partes[0]),
    );
  return new Date();
}

function datasSaoIguais(data1, data2) {
  return (
    data1.getDate() === data2.getDate() &&
    data1.getMonth() === data2.getMonth() &&
    data1.getFullYear() === data2.getFullYear()
  );
}

function mostrarNotificacao(mensagem, tipo) {
  const notifExistente = document.querySelector(".notification");
  if (notifExistente) notifExistente.remove();
  const notification = document.createElement("div");
  notification.className = "notification notification-" + tipo;
  const cores = {
    success: "#28a745",
    error: "#dc3545",
    warning: "#ffc107",
    info: "#17a2b8",
  };
  Object.assign(notification.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: 9999,
    minWidth: "300px",
    maxWidth: "500px",
    padding: "15px 20px",
    borderRadius: "8px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "14px",
    fontWeight: "500",
    background: cores[tipo] || cores.info,
    color: "#fff",
  });
  const icons = {
    success: "fa-check-circle",
    error: "fa-exclamation-circle",
    warning: "fa-exclamation-triangle",
    info: "fa-info-circle",
  };
  notification.innerHTML =
    '<i class="fas ' +
    (icons[tipo] || icons.info) +
    '"></i><span>' +
    mensagem +
    "</span>";
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transition = "opacity 0.3s";
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}
