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
    inicializarPaginaIP();
  }, 200);
});

/* ========================================
   FUNCIONALIDADES DA PÁGINA DE CONFIGURAÇÕES DE IP
   ======================================== */

let ipEditando = null;
let configuracoes = [];

function inicializarPaginaIP() {
  console.log("🌐 Inicializando página de Configurações de IP...");

  // Configurar eventos do modal
  const modal = document.getElementById("modalIP");
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        fecharModalIP();
      }
    });
  }

  // Definir data atual como padrão
  const dataAtual = new Date().toISOString().split("T")[0];
  const dataLiberacao = document.getElementById("dataLiberacao");
  if (dataLiberacao) {
    dataLiberacao.value = dataAtual;
  }

  console.log("✅ Página de Configurações de IP inicializada!");
}

// Função para adicionar nova configuração de IP
function adicionarIP() {
  ipEditando = null;
  document.getElementById("modalIPTitle").textContent =
    "Adicionar Configuração de IP";

  // Limpar formulário
  document.getElementById("descricaoIP").value = "";
  document.getElementById("ipInicial").value = "";
  document.getElementById("ipFinal").value = "";
  document.getElementById("usuarioIP").value = "";
  document.getElementById("dataLiberacao").value = new Date()
    .toISOString()
    .split("T")[0];
  document.getElementById("liberadoIP").checked = true;

  // Mostrar modal
  const modal = document.getElementById("modalIP");
  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("show"), 10);

  console.log("➕ Modal de adicionar IP aberto");
}

// Função para editar configuração de IP
function editarIP(index) {
  const config = configuracoes[index];
  ipEditando = index;

  // Preencher formulário
  document.getElementById("modalIPTitle").textContent =
    "Editar Configuração de IP";
  document.getElementById("descricaoIP").value = config.descricao;
  document.getElementById("ipInicial").value = config.ipInicial;
  document.getElementById("ipFinal").value = config.ipFinal;
  document.getElementById("usuarioIP").value = config.usuario;
  document.getElementById("dataLiberacao").value = config.dataLiberacao;
  document.getElementById("liberadoIP").checked = config.liberado;

  // Mostrar modal
  const modal = document.getElementById("modalIP");
  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("show"), 10);

  console.log("✏️ Editando configuração de IP:", config.descricao);
}

// Função para excluir configuração de IP
async function excluirIP(index) {
  const config = configuracoes[index];

  if (
    await confirmar(
      `Deseja realmente excluir a configuração "${config.descricao}"?`,
    )
  ) {
    configuracoes.splice(index, 1);
    renderizarTabelaIP();
    showNotification("Configuração de IP excluída com sucesso!", "success");
    console.log("🗑️ Configuração de IP excluída:", config.descricao);
  }
}

// Função para salvar configuração de IP
function salvarIP() {
  const descricao = document.getElementById("descricaoIP").value.trim();
  const ipInicial = document.getElementById("ipInicial").value.trim();
  const ipFinal = document.getElementById("ipFinal").value.trim();
  const usuario = document.getElementById("usuarioIP").value.trim();
  const dataLiberacao = document.getElementById("dataLiberacao").value;
  const liberado = document.getElementById("liberadoIP").checked;

  // Validações
  if (!descricao) {
    showNotification("Por favor, informe a descrição!", "error");
    return;
  }

  if (!ipInicial) {
    showNotification("Por favor, informe o IP inicial!", "error");
    return;
  }

  if (!ipFinal) {
    showNotification("Por favor, informe o IP final!", "error");
    return;
  }

  if (!usuario) {
    showNotification("Por favor, informe o usuário!", "error");
    return;
  }

  if (!dataLiberacao) {
    showNotification("Por favor, informe a data de liberação!", "error");
    return;
  }

  // Validar formato de IP
  if (!validarIP(ipInicial)) {
    showNotification(
      "IP inicial inválido! Use o formato: 192.168.1.1",
      "error",
    );
    return;
  }

  if (!validarIP(ipFinal)) {
    showNotification(
      "IP final inválido! Use o formato: 192.168.1.255",
      "error",
    );
    return;
  }

  const novaConfig = {
    descricao,
    ipInicial,
    ipFinal,
    usuario,
    dataLiberacao,
    liberado,
  };

  if (ipEditando !== null) {
    // Editar configuração existente
    configuracoes[ipEditando] = novaConfig;
    showNotification("Configuração de IP atualizada com sucesso!", "success");
    console.log("📝 Configuração de IP atualizada:", descricao);
  } else {
    // Adicionar nova configuração
    configuracoes.push(novaConfig);
    showNotification("Configuração de IP adicionada com sucesso!", "success");
    console.log("➕ Nova configuração de IP adicionada:", descricao);
  }

  fecharModalIP();
  renderizarTabelaIP();
}

// Função para validar formato de IP
function validarIP(ip) {
  const regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  if (!regex.test(ip)) return false;

  const parts = ip.split(".");
  return parts.every((part) => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

// Função para fechar modal
function fecharModalIP() {
  const modal = document.getElementById("modalIP");
  modal.classList.remove("show");
  setTimeout(() => {
    modal.style.display = "none";
    ipEditando = null;
  }, 300);
}

// Função para renderizar tabela de IPs
function renderizarTabelaIP() {
  const tableContent = document.querySelector(".table-content");

  if (configuracoes.length === 0) {
    tableContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-network-wired"></i>
                <p>Nenhuma configuração de IP encontrada</p>
                <p class="subtitle">Clique em "Adicionar IP" para começar</p>
            </div>
        `;
    return;
  }

  let html = "";
  configuracoes.forEach((config, index) => {
    const statusIcon = config.liberado
      ? '<i class="fas fa-check ip-status-active"></i>'
      : '<i class="fas fa-times ip-status-inactive"></i>';

    const dataFormatada = formatarData(config.dataLiberacao);

    html += `
            <div class="ip-row">
                <div>${config.descricao}</div>
                <div>${config.ipInicial}</div>
                <div>${config.ipFinal}</div>
                <div>${config.usuario}</div>
                <div>${dataFormatada}</div>
                <div>${statusIcon}</div>
                <div class="ip-actions">
                    <button class="btn-edit-ip" onclick="editarIP(${index})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete-ip" onclick="excluirIP(${index})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
  });

  tableContent.innerHTML = html;
}

// Função para formatar data
function formatarData(dataISO) {
  const data = new Date(dataISO + "T00:00:00");
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Função para salvar todas as configurações
function salvarConfiguracoes() {
  if (configuracoes.length === 0) {
    showNotification("Nenhuma configuração para salvar!", "warning");
    return;
  }

  // Simular salvamento (aqui seria feita uma requisição para o backend)
  console.log("💾 Salvando configurações:", configuracoes);
  showNotification("Configurações salvas com sucesso!", "success");
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
  } else if (type === "warning") {
    notification.style.background = "#ffc107";
    notification.style.color = "#212529";
  } else {
    notification.style.background = "#007bff";
  }

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.transform = "translateX(100%)";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
