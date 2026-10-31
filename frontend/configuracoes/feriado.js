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
    inicializarPaginaFeriados();
  }, 200);
});

/* ========================================
   FUNCIONALIDADES DA PÁGINA DE FERIADOS
   ======================================== */

let feriadoEditando = null;

function inicializarPaginaFeriados() {
  console.log("📅 Inicializando página de feriados...");

  // Configurar pesquisa
  const searchInput = document.getElementById("searchFeriados");
  if (searchInput) {
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        realizarPesquisaFeriados();
      }
    });
  }

  // Fechar modal ao clicar fora
  const modal = document.getElementById("modalFeriado");
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        fecharModalFeriado();
      }
    });
  }

  console.log("✅ Página de feriados inicializada!");
}

// Função para adicionar novo feriado
function adicionarFeriado() {
  feriadoEditando = null;
  document.getElementById("modalTitle").textContent = "Adicionar Feriado";

  // Limpar formulário
  document.getElementById("descricaoFeriado").value = "";
  document.getElementById("dataFeriado").value = "";
  document.getElementById("ativoFeriado").checked = true;

  // Mostrar modal
  const modal = document.getElementById("modalFeriado");
  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("show"), 10);

  console.log("➕ Modal de adicionar feriado aberto");
}

// Função para editar feriado
function editarFeriado(btn) {
  const row = btn.closest("tr");
  feriadoEditando = row;

  // Pegar dados da linha
  const descricao = row.cells[0].textContent;
  const data = row.cells[1].textContent;
  const ativo = row.cells[2].querySelector("i").classList.contains("fa-check");

  // Preencher formulário
  document.getElementById("modalTitle").textContent = "Editar Feriado";
  document.getElementById("descricaoFeriado").value = descricao;

  // Converter data do formato "DD de Mês" para YYYY-MM-DD
  const dataFormatada = converterDataParaInput(data);
  document.getElementById("dataFeriado").value = dataFormatada;
  document.getElementById("ativoFeriado").checked = ativo;

  // Mostrar modal
  const modal = document.getElementById("modalFeriado");
  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("show"), 10);

  console.log("✏️ Editando feriado:", descricao);
}

// Função para excluir feriado
async function excluirFeriado(btn) {
  const row = btn.closest("tr");
  const descricao = row.cells[0].textContent;

  if (await confirmar(`Deseja realmente excluir o feriado "${descricao}"?`)) {
    row.remove();
    atualizarContadorFeriados();
    showNotification("Feriado excluído com sucesso!", "success");
    console.log("🗑️ Feriado excluído:", descricao);
  }
}

// Função para salvar feriado
function salvarFeriado() {
  const descricao = document.getElementById("descricaoFeriado").value.trim();
  const data = document.getElementById("dataFeriado").value;
  const ativo = document.getElementById("ativoFeriado").checked;

  if (!descricao) {
    showNotification("Por favor, informe a descrição do feriado!", "error");
    return;
  }

  if (!data) {
    showNotification("Por favor, informe a data do feriado!", "error");
    return;
  }

  // Converter data para formato de exibição
  const dataFormatada = converterDataParaExibicao(data);

  if (feriadoEditando) {
    // Editar feriado existente
    feriadoEditando.cells[0].textContent = descricao;
    feriadoEditando.cells[1].textContent = dataFormatada;

    const statusIcon = feriadoEditando.cells[2].querySelector("i");
    if (ativo) {
      statusIcon.className = "fas fa-check status-active";
    } else {
      statusIcon.className = "fas fa-times";
      statusIcon.style.color = "#dc3545";
    }

    showNotification("Feriado atualizado com sucesso!", "success");
    console.log("📝 Feriado atualizado:", descricao);
  } else {
    // Adicionar novo feriado
    adicionarLinhaFeriado(descricao, dataFormatada, ativo);
    showNotification("Feriado adicionado com sucesso!", "success");
    console.log("➕ Novo feriado adicionado:", descricao);
  }

  fecharModalFeriado();
  atualizarContadorFeriados();
}

// Função para adicionar linha na tabela
function adicionarLinhaFeriado(descricao, data, ativo) {
  const tbody = document.querySelector(".feriados-table tbody");
  const newRow = document.createElement("tr");

  const statusIcon = ativo
    ? '<i class="fas fa-check status-active"></i>'
    : '<i class="fas fa-times" style="color: #dc3545;"></i>';

  newRow.innerHTML = `
        <td>${descricao}</td>
        <td>${data}</td>
        <td>${statusIcon}</td>
        <td><button class="btn-editar" onclick="editarFeriado(this)"><i class="fas fa-edit"></i></button></td>
        <td><button class="btn-excluir" onclick="excluirFeriado(this)"><i class="fas fa-trash"></i></button></td>
    `;

  tbody.appendChild(newRow);
}

// Função para fechar modal
function fecharModalFeriado() {
  const modal = document.getElementById("modalFeriado");
  modal.classList.remove("show");
  setTimeout(() => {
    modal.style.display = "none";
    feriadoEditando = null;
  }, 300);
}

// Função de pesquisa
function realizarPesquisaFeriados() {
  const termo = document.getElementById("searchFeriados").value.toLowerCase();
  const linhas = document.querySelectorAll(".feriados-table tbody tr");
  let encontrados = 0;

  linhas.forEach((linha) => {
    const descricao = linha.cells[0].textContent.toLowerCase();
    const data = linha.cells[1].textContent.toLowerCase();

    if (descricao.includes(termo) || data.includes(termo)) {
      linha.style.display = "";
      encontrados++;
    } else {
      linha.style.display = "none";
    }
  });

  console.log(`🔍 Pesquisa realizada: ${termo} - ${encontrados} resultados`);
  atualizarContadorFeriados(encontrados);
}

// Função para atualizar contador
function atualizarContadorFeriados(totalExibidos = null) {
  const contador = document.querySelector(".page-info");
  if (contador) {
    const linhasVisiveis =
      totalExibidos !== null
        ? totalExibidos
        : document.querySelectorAll(
            '.feriados-table tbody tr:not([style*="display: none"])',
          ).length;

    if (linhasVisiveis === 0) {
      contador.textContent = `0 de 0`;
    } else {
      contador.textContent = `1 - ${linhasVisiveis} de ${linhasVisiveis}`;
    }
  }
}

// Função para converter data de input (YYYY-MM-DD) para exibição (DD de Mês)
function converterDataParaExibicao(dataInput) {
  const meses = [
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

  const data = new Date(dataInput + "T00:00:00");
  const dia = data.getDate().toString().padStart(2, "0");
  const mes = meses[data.getMonth()];

  return `${dia} de ${mes}`;
}

// Função para converter data de exibição (DD de Mês) para input (YYYY-MM-DD)
function converterDataParaInput(dataExibicao) {
  const meses = {
    Janeiro: "01",
    Fevereiro: "02",
    Março: "03",
    Abril: "04",
    Maio: "05",
    Junho: "06",
    Julho: "07",
    Agosto: "08",
    Setembro: "09",
    Outubro: "10",
    Novembro: "11",
    Dezembro: "12",
  };

  // Extrair dia e mês da string (ex: "01 de Janeiro")
  const regex = /(\d{2}) de (\w+)/;
  const match = dataExibicao.match(regex);

  if (match) {
    const dia = match[1];
    const nomeMes = match[2];
    const mes = meses[nomeMes] || "01";
    const ano = new Date().getFullYear(); // Usar ano atual como padrão

    return `${ano}-${mes}-${dia}`;
  }

  return "";
}

// Função para mostrar notificações
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 9999;
        transition: all 0.3s ease;
        animation: slideInRight 0.3s ease;
    `;

  if (type === "success") {
    notification.style.background = "#28a745";
  } else if (type === "error") {
    notification.style.background = "#dc3545";
  } else {
    notification.style.background = "#007bff";
  }

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.transform = "translateX(100%)";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
