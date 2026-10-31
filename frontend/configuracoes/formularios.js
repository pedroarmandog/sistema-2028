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
    inicializarFormularios();
  }, 200);
});

/* ========================================
   FUNCIONALIDADES DA PÁGINA DE FORMULÁRIOS
   ======================================== */

let formularioAtual = "atestado-sanitario";
let formularios = {
  "atestado-sanitario": {
    titulo: "Atestado sanitário para o trânsito de cães e gatos",
    conteudo: `
            <p style="text-align: center;"><strong>ATESTADO SANITÁRIO PARA O TRÂNSITO DE CÃES E GATOS</strong></p>
            <br>
            <p>Declaro que o animal de nome {nomepet}, espécie {especiepet}, raça {racapet}, gênero {generopet} e idade {idadepet} foi por mim examinado, está clinicamente sadio, com a vacinação em dia (polivalente e anti-rábica), isento de ectoparasitas, míase e doenças infectocontagiosas e</p>
            <br>
            <p><strong>Identificação do responsável pelo animal:</strong></p>
            <p>Cód./Nome: {codigocliente} - {nomecliente}</p>
            <p>CPF: {cpfcnpjcliente} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; RG: {rgcliente}</p>
            <p>Endereço: {enderecocliente}</p>
            <p>Telefone: {fonecliente}</p>
            <p>Email: {emailcliente}</p>
            <br>
            <p><strong>Identificação do médico veterinário:</strong></p>
            <p>Nome: {nomeprofissional}</p>
            <p>CRMV: {crmv}</p>
        `,
  },
  "termo-autorizacao-exames": {
    titulo: "Termo de autorização para exames",
    conteudo: `
            <p style="text-align: center;"><strong>TERMO DE AUTORIZAÇÃO PARA EXAMES</strong></p>
            <br>
            <p>Eu, {nomecliente}, portador do CPF {cpfcnpjcliente}, responsável pelo animal {nomepet}, da espécie {especiepet}, autorizo a realização dos exames necessários para o diagnóstico e tratamento do referido animal.</p>
            <br>
            <p>Declaro estar ciente dos riscos envolvidos nos procedimentos e concordo com a realização dos mesmos.</p>
            <br>
            <p>Data: {dataatual}</p>
            <br>
            <p>Responsável: _________________________________</p>
            <p>Médico Veterinário: _________________________</p>
        `,
  },
  // Adicionar outros formulários conforme necessário
};

function inicializarFormularios() {
  console.log("🚀 Inicializando página de formulários...");

  // Configurar eventos dos itens da lista
  configurarListaFormularios();

  // Configurar editor de texto
  configurarEditor();

  // Configurar variáveis
  configurarVariaveis();

  // Configurar pesquisa
  configurarPesquisa();

  // Carregar formulário inicial
  carregarFormulario(formularioAtual);

  console.log("✅ Página de formulários inicializada!");
}

function configurarListaFormularios() {
  const items = document.querySelectorAll(".formulario-item");

  items.forEach((item) => {
    item.addEventListener("click", function () {
      // Remover active de todos os items
      items.forEach((i) => i.classList.remove("active"));

      // Adicionar active ao item clicado
      this.classList.add("active");

      // Carregar formulário
      const formId = this.getAttribute("data-form");
      carregarFormulario(formId);
    });

    // Configurar botão de remover
    const removeBtn = item.querySelector(".remove-btn");
    if (removeBtn) {
      removeBtn.addEventListener("click", async function (e) {
        e.stopPropagation();
        if (await confirmar("Deseja remover este formulário?")) {
          item.remove();
          showNotification("Formulário removido com sucesso!", "success");
        }
      });
    }
  });
}

function configurarEditor() {
  const toolbarBtns = document.querySelectorAll(".toolbar-btn");

  toolbarBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      const action = this.getAttribute("data-action");
      if (action) {
        formatDoc(action);
      }
    });
  });
}

function formatDoc(cmd, value = null) {
  if (value) {
    document.execCommand(cmd, false, value);
  } else {
    document.execCommand(cmd, false, null);
  }

  // Focar no editor após a formatação
  document.getElementById("editorFormulario").focus();
}

function configurarVariaveis() {
  // Configurar grupos expansíveis
  const groupHeaders = document.querySelectorAll(".group-header");
  groupHeaders.forEach((header) => {
    header.addEventListener("click", function () {
      toggleVariaveisGroup(this);
    });
  });

  // Configurar itens de variáveis
  const variaveisItems = document.querySelectorAll(".variavel-item");
  variaveisItems.forEach((item) => {
    item.addEventListener("click", function () {
      const variable = this.getAttribute("data-variable");
      inserirVariavel(variable);
    });
  });
}

function toggleVariaveisGroup(header) {
  const group = header.parentElement;
  const content = group.querySelector(".group-content");
  const icon = header.querySelector("i");

  if (content.style.display === "none") {
    content.style.display = "block";
    icon.style.transform = "rotate(0deg)";
    header.classList.remove("collapsed");
  } else {
    content.style.display = "none";
    icon.style.transform = "rotate(-90deg)";
    header.classList.add("collapsed");
  }
}

function inserirVariavel(variable) {
  const editor = document.getElementById("editorFormulario");

  // Inserir variável na posição do cursor
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    range.deleteContents();

    const span = document.createElement("span");
    span.style.color = "#007bff";
    span.style.fontWeight = "bold";
    span.textContent = variable;

    range.insertNode(span);
    range.setStartAfter(span);
    range.setEndAfter(span);
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    // Se não há seleção, inserir no final
    const span = document.createElement("span");
    span.style.color = "#007bff";
    span.style.fontWeight = "bold";
    span.textContent = variable;
    editor.appendChild(span);
  }

  editor.focus();
  showNotification(`Variável ${variable} inserida!`, "success");
}

function configurarPesquisa() {
  const searchInput = document.getElementById("searchFormularios");
  const searchBtn = document.querySelector(".btn-pesquisar");

  if (searchInput && searchBtn) {
    searchBtn.addEventListener("click", realizarPesquisa);
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        realizarPesquisa();
      }
    });
  }
}

function realizarPesquisa() {
  const termo = document
    .getElementById("searchFormularios")
    .value.toLowerCase();
  const items = document.querySelectorAll(".formulario-item");

  items.forEach((item) => {
    const titulo = item.querySelector(".titulo").textContent.toLowerCase();
    if (titulo.includes(termo)) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });

  console.log(`🔍 Pesquisa realizada: ${termo}`);
}

function carregarFormulario(formId) {
  formularioAtual = formId;

  if (formularios[formId]) {
    const form = formularios[formId];

    // Atualizar título
    document.getElementById("tituloFormulario").value = form.titulo;

    // Atualizar conteúdo do editor
    document.getElementById("editorFormulario").innerHTML = form.conteudo;

    console.log(`📝 Formulário carregado: ${form.titulo}`);
  }
}

function salvarFormulario() {
  const titulo = document.getElementById("tituloFormulario").value;
  const conteudo = document.getElementById("editorFormulario").innerHTML;

  if (!titulo.trim()) {
    showNotification("Por favor, insira um título para o formulário!", "error");
    return;
  }

  // Salvar no objeto formulários
  formularios[formularioAtual] = {
    titulo: titulo,
    conteudo: conteudo,
  };

  // Atualizar título na lista se necessário
  const activeItem = document.querySelector(".formulario-item.active .titulo");
  if (activeItem) {
    activeItem.textContent = titulo;
  }

  console.log("💾 Formulário salvo:", { titulo, conteudo });
  showNotification("Formulário salvo com sucesso!", "success");
}

function visualizarFormulario() {
  const titulo = document.getElementById("tituloFormulario").value;
  const conteudo = document.getElementById("editorFormulario").innerHTML;
  const mostrarLogo = document.getElementById("mostrarLogoTopo").checked;
  const mostrarDados = document.getElementById("mostrarLogoDados").checked;

  if (!titulo.trim()) {
    showNotification("Por favor, insira um título para visualizar!", "error");
    return;
  }

  // Gerar conteúdo do PDF
  let htmlContent = "";

  if (mostrarLogo || mostrarDados) {
    htmlContent += `
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
                    <img src="/fivecon/Design sem nome (17).png" style="height: 60px;">
                    <div>
                        <h2 style="margin: 0; color: #007bff;">PET CRIA</h2>
                        ${
                          mostrarDados
                            ? `
                            <p style="margin: 2px 0; font-size: 12px;">{nomeempresa}</p>
                            <p style="margin: 2px 0; font-size: 12px;">{enderecoempresa}</p>
                            <p style="margin: 2px 0; font-size: 12px;">CNPJ: {cpfcnpjempresa}</p>
                        `
                            : ""
                        }
                    </div>
                </div>
            </div>
        `;
  }

  htmlContent += conteudo;

  // Simular visualização (na implementação real, seria gerado um PDF)
  const modal = document.getElementById("modalVisualizacao");
  const iframe = document.getElementById("pdfViewer");

  // Criar URL do "PDF" simulado
  const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
                h2 { color: #007bff; }
                p { margin-bottom: 10px; }
                strong { color: #333; }
            </style>
        </head>
        <body>
            ${htmlContent}
        </body>
        </html>
    `;

  const blob = new Blob([pdfContent], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  iframe.src = url;
  modal.classList.add("show");
  modal.style.display = "flex";

  console.log("👁️ Visualizando formulário:", titulo);
}

function fecharModal() {
  const modal = document.getElementById("modalVisualizacao");
  modal.classList.remove("show");
  setTimeout(() => {
    modal.style.display = "none";
    document.getElementById("pdfViewer").src = "";
  }, 300);
}

function downloadPDF() {
  const titulo = document.getElementById("tituloFormulario").value;

  // Simular download (na implementação real, seria gerado um PDF real)
  const link = document.createElement("a");
  link.href = document.getElementById("pdfViewer").src;
  link.download = `${titulo.replace(/[^a-zA-Z0-9]/g, "_")}.html`;
  link.click();

  showNotification("Download iniciado!", "success");
  console.log("⬇️ Download do formulário:", titulo);
}

// Função de notificação
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

// Fechar modal ao clicar fora
document.addEventListener("click", function (e) {
  const modal = document.getElementById("modalVisualizacao");
  if (e.target === modal) {
    fecharModal();
  }
});
