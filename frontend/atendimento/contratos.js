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

  // Inicializar funcionalidades da página de contratos
  inicializarPaginaContratos();
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
// FUNCIONALIDADES DA PÁGINA DE CONTRATOS
// ========================================

function inicializarPaginaContratos() {
  console.log("🚀 Inicializando página de contratos");

  // Configurar navegação das abas
  configurarNavegacaoAbas();

  // Configurar pesquisa e filtros
  configurarPesquisaContratos();

  // Configurar botões de ação
  configurarBotoesAcao();

  // Configurar botão "Novo Contrato"
  configurarNovoContrato();
}

function configurarNavegacaoAbas() {
  const tabs = document.querySelectorAll(".nav-tab");

  tabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      // Remove classe active de todas as abas
      tabs.forEach((t) => t.classList.remove("active"));

      // Adiciona classe active na aba clicada
      this.classList.add("active");

      // Aqui você pode adicionar lógica para mudar o conteúdo baseado na aba
      const tabText = this.textContent.trim();
      console.log(`Aba selecionada: ${tabText}`);

      if (tabText === "Lista") {
        mostrarListaContratos();
      } else if (tabText === "Faturamento") {
        mostrarFaturamento();
      } else if (tabText === "+ Novo Contrato") {
        criarNovoContrato();
      }
    });
  });
}

function configurarPesquisaContratos() {
  const searchInput = document.querySelector(".search-input");
  const btnSearch = document.querySelector(".btn-search");
  const btnFilter = document.querySelector(".btn-filter");

  if (searchInput && btnSearch) {
    // Pesquisar ao clicar no botão
    btnSearch.addEventListener("click", function () {
      realizarPesquisa(searchInput.value);
    });

    // Pesquisar ao pressionar Enter
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        realizarPesquisa(this.value);
      }
    });
  }

  if (btnFilter) {
    btnFilter.addEventListener("click", function () {
      abrirFiltrosAvancados();
    });
  }
}

function configurarBotoesAcao() {
  const btnEmail = document.querySelector(".btn-email");
  const btnExport = document.querySelector(".btn-export");

  if (btnEmail) {
    btnEmail.addEventListener("click", function () {
      emitirCarne();
    });
  }

  if (btnExport) {
    btnExport.addEventListener("click", function () {
      exportarContratos();
    });
  }
}

function configurarNovoContrato() {
  const btnNewContract = document.querySelector(".btn-new-contract");

  if (btnNewContract) {
    btnNewContract.addEventListener("click", function () {
      criarNovoContrato();
    });
  }
}

// Funções de ação

function mostrarListaContratos() {
  console.log("📋 Exibindo lista de contratos");

  // Ocultar conteúdo de faturamento e mostrar lista
  const listaContent = document.getElementById("lista-content");
  const faturamentoContent = document.getElementById("faturamento-content");

  if (listaContent && faturamentoContent) {
    listaContent.classList.add("active");
    faturamentoContent.classList.remove("active");
  }
}

function mostrarFaturamento() {
  console.log("💰 Exibindo faturamento");

  // Ocultar conteúdo de lista e mostrar faturamento
  const listaContent = document.getElementById("lista-content");
  const faturamentoContent = document.getElementById("faturamento-content");

  if (listaContent && faturamentoContent) {
    listaContent.classList.remove("active");
    faturamentoContent.classList.add("active");
  }

  // Configurar funcionalidades específicas do faturamento
  configurarFaturamento();
}

function criarNovoContrato() {
  console.log("➕ Criando novo contrato");
  // Redirecionar para página de criação de contrato
  window.location.href = "/atendimento/novo-contrato.html";
}

function realizarPesquisa(termo) {
  console.log(`🔍 Pesquisando por: "${termo}"`);

  if (!termo || termo.trim() === "") {
    console.log("Termo de pesquisa vazio");
    return;
  }

  // Aqui você implementaria a lógica de pesquisa
  // Por enquanto, apenas simula a pesquisa
  console.log("Realizando pesquisa...");

  // Simular um delay de pesquisa
  setTimeout(() => {
    console.log("Pesquisa concluída - nenhum resultado encontrado");
    // Manter o estado vazio por enquanto
  }, 500);
}

function abrirFiltrosAvancados() {
  console.log("🔽 Abrindo filtros avançados");
  // Implementar modal ou expansão de filtros
  alert("Filtros avançados serão implementados em breve!");
}

function emitirCarne() {
  console.log("📧 Emitindo carnê");
  // Implementar funcionalidade de emissão de carnê
  alert("Funcionalidade de emitir carnê será implementada em breve!");
}

function exportarContratos() {
  console.log("📤 Exportando contratos");
  // Gerar e abrir relatório PDF
  gerarRelatorioContratos();
}

// Função para simular dados futuros (quando houver contratos)
function simularDadosContratos() {
  // Esta função pode ser usada para testar a interface com dados fictícios
  const contratosFicticios = [
    {
      codigo: 728,
      pet: "Maresia",
      cliente: "Luciano",
      dia: "Sáb às 13:00",
      plano: "Assinatura 4 Banhos/Mês - Maresia - Luciano",
      valor: 460.9,
      ativo: true,
    },
    // Adicionar mais contratos fictícios conforme necessário
  ];

  return contratosFicticios;
}

// ========================================
// FUNCIONALIDADES DO FATURAMENTO
// ========================================

function configurarFaturamento() {
  console.log("💰 Configurando funcionalidades de faturamento");

  // Configurar filtros de faturamento
  configurarFiltrosFaturamento();

  // Configurar botões de ação do faturamento
  configurarBotoesFaturamento();

  // Configurar radio buttons
  configurarRadioButtons();
}

function configurarFiltrosFaturamento() {
  const tipoPlano = document.getElementById("tipoPlano");
  const mesFaturamento = document.getElementById("mesFaturamento");

  if (tipoPlano) {
    tipoPlano.addEventListener("change", function () {
      console.log(`Tipo de plano selecionado: ${this.value}`);
      atualizarFaturamento();
    });
  }

  if (mesFaturamento) {
    mesFaturamento.addEventListener("change", function () {
      console.log(`Mês selecionado: ${this.value}`);
      atualizarFaturamento();
      atualizarBotoesFaturamento(this.value);
    });
  }
}

function configurarBotoesFaturamento() {
  const btnFaturar = document.querySelector(".btn-faturar");
  const btnCancelar = document.querySelector(".btn-cancelar");

  if (btnFaturar) {
    btnFaturar.addEventListener("click", function () {
      const mes = document.getElementById("mesFaturamento").value;
      faturarMes(mes);
    });
  }

  if (btnCancelar) {
    btnCancelar.addEventListener("click", function () {
      const mes = document.getElementById("mesFaturamento").value;
      cancelarFaturamento(mes);
    });
  }
}

function configurarRadioButtons() {
  const radioButtons = document.querySelectorAll('input[name="listar"]');

  radioButtons.forEach((radio) => {
    radio.addEventListener("change", function () {
      // Atualizar labels visuais
      const labels = document.querySelectorAll(".radio-label");
      labels.forEach((label) => label.classList.remove("active"));

      if (this.checked) {
        this.nextElementSibling.classList.add("active");
        console.log(`Filtro selecionado: ${this.value}`);
        filtrarContratosFaturamento(this.value);
      }
    });
  });
}

function atualizarBotoesFaturamento(mes) {
  const btnFaturar = document.querySelector(".btn-faturar");
  const btnCancelar = document.querySelector(".btn-cancelar");

  if (btnFaturar) {
    btnFaturar.textContent = `Faturar ${mes}`;
  }

  if (btnCancelar) {
    btnCancelar.textContent = `Cancelar ${mes}`;
  }
}

function atualizarFaturamento() {
  console.log("🔄 Atualizando dados de faturamento");
  // Aqui você implementaria a lógica para carregar os dados baseados nos filtros
  // Por enquanto, mantém o estado vazio
}

function filtrarContratosFaturamento(filtro) {
  console.log(`🔍 Filtrando contratos por: ${filtro}`);
  // Implementar lógica de filtragem
  switch (filtro) {
    case "todos":
      console.log("Mostrando todos os contratos");
      break;
    case "faturados":
      console.log("Mostrando apenas contratos faturados");
      break;
    case "nao-faturados":
      console.log("Mostrando apenas contratos não faturados");
      break;
  }
}

async function faturarMes(mes) {
  console.log(`💸 Faturando mês: ${mes}`);

  if (
    await confirmar(
      `Tem certeza que deseja faturar todos os contratos de ${mes}?`,
    )
  ) {
    // Simular processo de faturamento
    console.log("Processando faturamento...");

    setTimeout(() => {
      alert(`Faturamento de ${mes} realizado com sucesso!`);
      atualizarFaturamento();
    }, 1000);
  }
}

async function cancelarFaturamento(mes) {
  console.log(`❌ Cancelando faturamento do mês: ${mes}`);

  if (
    await confirmar(`Tem certeza que deseja cancelar o faturamento de ${mes}?`)
  ) {
    // Simular processo de cancelamento
    console.log("Cancelando faturamento...");

    setTimeout(() => {
      alert(`Faturamento de ${mes} cancelado com sucesso!`);
      atualizarFaturamento();
    }, 1000);
  }
}

// ========================================
// FUNCIONALIDADES DE EXPORTAÇÃO
// ========================================

function gerarRelatorioContratos() {
  console.log("📄 Gerando relatório de contratos em PDF");

  // Verificar se há dados de contratos reais
  const dadosReais = obterDadosContratosReais();

  if (dadosReais.length === 0) {
    alert("Não há contratos para exportar.");
    return;
  }

  // Gerar HTML do relatório
  const htmlRelatorio = gerarHTMLRelatorio(dadosReais);

  // Criar janela popup com o relatório
  criarJanelaRelatorio(htmlRelatorio);
}

function gerarHTMLRelatorio(dados) {
  // Dados fictícios baseados exatamente na imagem do PDF para demonstração
  // Quando houver contratos reais, esta função pode ser substituída por obterDadosContratosReais()
  return [
    {
      numero: 167,
      ativo: "Sim",
      cliente: "328 - Wellington",
      pet: "78 - Fred (Canina: Shih-Tzu)",
      plano: "247 - Banho Pacote - Porte Pequeno - Escovação Dental",
      dia: "Sexta",
      levaTraz: "Não",
      valorLeva: 0.0,
      valor: 220.0,
    },
    {
      numero: 233,
      ativo: "Sim",
      cliente: "32 - Viviane Lisboa",
      pet: "28 - Luna (Cachorro: Vira Lata)",
      plano: "271 - Assinatura Quinzenal - 2 Banhos",
      dia: "Quinta",
      levaTraz: "Não",
      valorLeva: 0.0,
      valor: 240.0,
    },
    {
      numero: 268,
      ativo: "Sim",
      cliente: "396 - Rafael",
      pet: "168 - Eros (Canina: Srd)",
      plano: "246 - Plano - Banho Porte Médio",
      dia: "Sábado",
      levaTraz: "Não",
      valorLeva: 0.0,
      valor: 160.0,
    },
    {
      numero: 596,
      ativo: "Sim",
      cliente: "506 - Lucas Oti Tavares",
      pet: "275 - Dohko (Canina: Srd)",
      plano: "366 - Assinatura Porte Grande/Médio - Dohko - Lucas",
      dia: "Quarta",
      levaTraz: "Não",
      valorLeva: 0.0,
      valor: 123.4,
    },
    {
      numero: 597,
      ativo: "Sim",
      cliente: "506 - Lucas Oti Tavares",
      pet: "276 - Hyoga (Canina: Golden Retriever)",
      plano: "365 - Assinatura Porte Grande/Médio - Hyoga - Lucas",
      dia: "Quarta",
      levaTraz: "Não",
      valorLeva: 0.0,
      valor: 123.4,
    },
    {
      numero: 365,
      ativo: "Sim",
      cliente: "357 - Isabella Rocha Goulart",
      pet: "111 - Teddy (Sem espécie: Sem raça)",
      plano:
        "301 - Assinatura Teddy - 2 Banhos/Mês - Hidratação e Escovação Dental",
      dia: "Quarta",
      levaTraz: "Não",
      valorLeva: 0.0,
      valor: 120.0,
    },
    {
      numero: 629,
      ativo: "Sim",
      cliente: "355 - Valeria Cabral",
      pet: "109 - Bebel (Canina: Shih-Tzu)",
      plano: "367 - Assinatura 2 Banhos/Mês Porte Pequeno - Bebel - Valeria",
      dia: "Sexta",
      levaTraz: "Não",
      valorLeva: 0.0,
      valor: 123.9,
    },
    {
      numero: 497,
      ativo: "Sim",
      cliente: "403 - Guilherme",
      pet: "175 - Lara (Canina: Schnauzer)",
      plano: "360 - Assinatura 2 Banhos/Mês - Lara Guilherme",
      dia: "Sábado",
      levaTraz: "Não",
      valorLeva: 0.0,
      valor: 205.0,
    },
    {
      numero: 530,
      ativo: "Sim",
      cliente: "485 - Ana Carolina Ferreira Künsch",
      pet: "261 - Meg (Canina: Yorkshire Terrier)",
      plano: "361 - Assinatura 2 Banhos/Mês - Ana - Meg",
      dia: "Segunda",
      levaTraz: "Não",
      valorLeva: 0.0,
      valor: 121.8,
    },
    {
      numero: 695,
      ativo: "Sim",
      cliente: "29 - Claudio",
      pet: "25 - Scott (Canina: Shih-Tzu)",
      plano: "368 - Assinatura 4 Banhos/mês - Scott - Claudio",
      dia: "Sábado",
      levaTraz: "Não",
      valorLeva: 0.0,
      valor: 200.0,
    },
    {
      numero: 728,
      ativo: "Sim",
      cliente: "28 - Luciano",
      pet: "24 - Maresia (Canina: Border Collie)",
      plano: "369 - Assinatura 4 Banhos/Mês - Maresia - Luciano",
      dia: "Sábado",
      levaTraz: "Não",
      valorLeva: 0.0,
      valor: 460.9,
    },
  ];
}

// Função para quando houver contratos reais no futuro
function obterDadosContratosReais() {
  // Esta função seria implementada quando houver integração com backend
  // Por enquanto retorna array vazio
  return [];
}

function gerarHTMLRelatorio(dados) {
  const totalContratos = dados.length;
  const valorTotal = dados.reduce((sum, contrato) => sum + contrato.valor, 0);

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Contratos</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            background: white;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        
        .logo {
            margin-bottom: 15px;
        }
        
        .logo img {
            max-height: 60px;
            max-width: 200px;
        }
        
        .title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .subtitle {
            font-size: 14px;
            color: #666;
        }
        
        .relatorio-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        
        .relatorio-table th,
        .relatorio-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            font-size: 10px;
        }
        
        .relatorio-table th {
            background-color: #f5f5f5;
            font-weight: bold;
            text-align: center;
        }
        
        .relatorio-table td.center {
            text-align: center;
        }
        
        .relatorio-table td.right {
            text-align: right;
        }
        
        .footer-stats {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 5px;
        }
        
        .stat-box {
            text-align: center;
            padding: 10px;
        }
        
        .stat-box.inativos {
            background-color: #fff3cd;
            border-radius: 5px;
        }
        
        .stat-box.ativos {
            background-color: #d1edff;
            border-radius: 5px;
        }
        
        .stat-number {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 12px;
            color: #666;
        }
        
        .export-controls {
            position: fixed;
            top: 10px;
            right: 10px;
            background: white;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .btn {
            padding: 8px 15px;
            margin: 0 5px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            text-decoration: none;
            display: inline-block;
        }
        
        .btn-success {
            background-color: #28a745;
            color: white;
        }
        
        .btn-primary {
            background-color: #007bff;
            color: white;
        }
        
        .btn:hover {
            opacity: 0.8;
        }
        
        @media print {
            .export-controls {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="export-controls">
        <a href="#" onclick="window.print()" class="btn btn-success">PDF</a>
        <a href="#" onclick="exportarParaExcel()" class="btn btn-primary">XLS</a>
    </div>

    <div class="header">
        <div class="logo" id="relatorio-logo-container">
        </div>
        <div class="title">RELATÓRIO DE CONTRATOS</div>
        <div class="subtitle" id="relatorio-empresa-nome"></div>
    </div>
    <script>
    (async function(){
      try{
        const resp = await fetch('/api/empresas', { credentials: 'include' });
        if(resp.ok){
          const data = await resp.json();
          const emp = Array.isArray(data) ? data[0] : data;
          if(emp){
            const nome = emp.razaoSocial || emp.nome || '';
            document.getElementById('relatorio-empresa-nome').textContent = nome;
            if(emp.logo){
              const img = document.createElement('img');
              img.src = '/uploads/' + emp.logo;
              img.alt = nome;
              document.getElementById('relatorio-logo-container').appendChild(img);
            }
          }
        }
      }catch(e){}
    })();
    </script>

    <table class="relatorio-table">
        <thead>
            <tr>
                <th>Nº</th>
                <th>Ativo</th>
                <th>Cliente</th>
                <th>Pet</th>
                <th>Plano</th>
                <th>Dia da Semana</th>
                <th>Taxi Dog</th>
                <th>Vlr Leva &</th>
                <th>Valor</th>
            </tr>
        </thead>
        <tbody>
            ${dados
              .map(
                (contrato) => `
            <tr>
                <td class="center">${contrato.numero}</td>
                <td class="center">${contrato.ativo}</td>
                <td>${contrato.cliente}</td>
                <td>${contrato.pet}</td>
                <td>${contrato.plano}</td>
                <td class="center">${contrato.dia}</td>
                <td class="center">${contrato.levaTraz}</td>
                <td class="right">${contrato.valorLeva.toFixed(2)}</td>
                <td class="right">${contrato.valor.toFixed(2)}</td>
            </tr>
            `,
              )
              .join("")}
        </tbody>
    </table>

    <div class="footer-stats">
        <div class="stat-box inativos">
            <div class="stat-number">0</div>
            <div class="stat-label">Contratos INATIVOS:</div>
            <div class="stat-label">Quantidade:</div>
            <div class="stat-label">Total: 0,00</div>
        </div>
        
        <div class="stat-box ativos">
            <div class="stat-number">${totalContratos}</div>
            <div class="stat-label">Contratos ATIVOS:</div>
            <div class="stat-label">Quantidade:</div>
            <div class="stat-label">Total: ${valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
        </div>
    </div>

    <script>
        function exportarParaExcel() {
            const dados = ${JSON.stringify(dados)};
            
            // Criar workbook
            const wb = XLSX.utils.book_new();
            
            // Preparar dados para o Excel
            const wsData = [
                ['Nº', 'Ativo', 'Cliente', 'Pet', 'Plano', 'Dia da Semana', 'Taxi Dog', 'Vlr Taxi', 'Valor'],
                ...dados.map(contrato => [
                    contrato.numero,
                    contrato.ativo,
                    contrato.cliente,
                    contrato.pet,
                    contrato.plano,
                    contrato.dia,
                    contrato.levaTraz,
                    contrato.valorLeva,
                    contrato.valor
                ])
            ];
            
            // Criar worksheet
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            
            // Definir larguras das colunas
            ws['!cols'] = [
                {wch: 10}, // Nº
                {wch: 8},  // Ativo
                {wch: 25}, // Cliente
                {wch: 30}, // Pet
                {wch: 50}, // Plano
                {wch: 15}, // Dia da Semana
                {wch: 12}, // Taxi Dog
                {wch: 12}, // Vlr Leva &
                {wch: 12}  // Valor
            ];
            
            // Adicionar worksheet ao workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Contratos');
            
            // Salvar arquivo
            XLSX.writeFile(wb, 'relatorio_contratos_petcria.xlsx');
        }
        
        // Carregar biblioteca XLSX se não estiver carregada
        if (typeof XLSX === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
            document.head.appendChild(script);
        }
    </script>
</body>
</html>
    `;
}

function criarJanelaRelatorio(htmlContent) {
  // Calcular posição central da tela
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;
  const popupWidth = 1200;
  const popupHeight = 800;

  const left = (screenWidth - popupWidth) / 2;
  const top = (screenHeight - popupHeight) / 2;

  // Criar nova janela popup centralizada
  const popup = window.open(
    "",
    "RelatorioContratos",
    `width=${popupWidth},height=${popupHeight},left=${left},top=${top},scrollbars=yes,resizable=yes`,
  );

  if (popup) {
    popup.document.write(htmlContent);
    popup.document.close();
    popup.focus();

    console.log("✅ Relatório aberto em nova janela centralizada");
  } else {
    // Fallback se popup foi bloqueado
    alert(
      "Pop-up bloqueado! Por favor, permita pop-ups para este site e tente novamente.",
    );
  }
}

console.log("✅ Funcionalidades de contratos carregadas");
