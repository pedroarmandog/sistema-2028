// Dashboard JavaScript
/* ========================================
   DASHBOARD JS - PETHUB
   ======================================== */

console.log("🚀 Dashboard.js carregado - versão debug");
console.log("📅 Timestamp:", new Date().toISOString());
console.log("🌐 Location:", window.location.href);

// Função de debug para detectar IDs duplicados
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

document.addEventListener("DOMContentLoaded", function () {
  console.log("🎯 DOMContentLoaded disparado em dashboard.js");
  console.log("🚀 Inicializando Dashboard Pet Cria...");
  console.log("📍 URL atual:", window.location.pathname);

  // Verificar IDs duplicados primeiro
  detectarIDsDuplicados();
  console.log("Dashboard JavaScript carregado");

  // Limpar estado anterior para evitar conflitos
  limparEstadoSubmenus();

  // Menu toggle para sidebar
  const menuToggle = document.querySelector(".menu-toggle");
  const sidebar = document.querySelector(".sidebar");
  const mainContent = document.querySelector(".main-content");

  console.log("Elementos encontrados:", {
    menuToggle: !!menuToggle,
    sidebar: !!sidebar,
    mainContent: !!mainContent,
  });

  if (menuToggle && sidebar && mainContent) {
    // Verificar se já tem listener para evitar duplicação
    if (!menuToggle.hasAttribute("data-toggle-configured")) {
      menuToggle.setAttribute("data-toggle-configured", "true");

      menuToggle.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        sidebar.classList.toggle("collapsed");
        mainContent.classList.toggle("sidebar-collapsed");
      });

      console.log("✅ Event listener do menu toggle configurado");
    } else {
      console.log("⚠️  Event listener do menu toggle já estava configurado");
    }
  } else {
    console.error("❌ Elementos não encontrados para o menu toggle:", {
      menuToggle: !!menuToggle,
      sidebar: !!sidebar,
      mainContent: !!mainContent,
    });
  }

  // Fechar sidebar ao clicar fora (mobile)
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

  // Configurar dropdown "Início Rápido" apenas se não foi configurado ainda
  configurarDropdownInicioRapido();

  // Configurar submenus com persistência
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

  // Destacar seção ativa baseada na página atual
  destacarSecaoAtiva();

  // Tabs funcionais
  const tabButtons = document.querySelectorAll(".tab-btn");
  tabButtons.forEach((button) => {
    button.addEventListener("click", function () {
      // Remove a classe ativa de todas as abas no mesmo grupo
      const parentTabs = this.parentElement;
      parentTabs.querySelectorAll(".tab-btn").forEach((tab) => {
        tab.classList.remove("active");
      });

      // Adiciona a classe ativa à aba clicada
      this.classList.add("active");

      // Aqui você pode adicionar lógica para mostrar/ocultar conteúdo com base na aba ativa
      handleTabChange(this);
    });
  });

  // Simular carregamento de dados
  setTimeout(() => {
    loadDashboardData();
  }, 2000);

  // Carregar estatísticas imediatamente
  updateStatistics();

  // Atualizar dados a cada 30 segundos
  setInterval(() => {
    updateStatistics();
  }, 30000);

  // Garantir que submenus abram por clique (painel lateral) mesmo que a função de persistência não exista
  try {
    setupSubmenuClickHandlers();
  } catch (e) {
    console.warn("setupSubmenuClickHandlers error", e);
  }

  // Aplicar comportamento simples inspirado em testedrop.html para abrir submenus como painéis fixos
  try {
    applyTestedropBehavior();
  } catch (e) {
    console.warn("applyTestedropBehavior error", e);
  }
});

function applyTestedropBehavior() {
  const containers = document.querySelectorAll(".nav-item-with-submenu");
  if (!containers || containers.length === 0) return;
  containers.forEach((container) => {
    if (container.dataset.testedrop === "true") return; // já configurado
    const menuItem = container.querySelector(".nav-item");
    const submenu = container.querySelector(".submenu");
    if (!menuItem || !submenu) return;

    menuItem.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      // fecha qualquer outro aberto
      document.querySelectorAll(".submenu").forEach((s) => {
        if (s !== submenu) {
          s.style.display = "none";
          s.classList.remove("open");
          try {
            restoreSubmenu(s);
          } catch (e) {}
        }
      });

      const isOpen =
        submenu.style.display === "flex" || submenu.classList.contains("open");
      if (isOpen) {
        submenu.style.display = "none";
        submenu.classList.remove("open");
        try {
          restoreSubmenu(submenu);
        } catch (e) {}
      } else {
        // mover para body e exibir como painel fixo (com estilo similar ao testedrop)
        try {
          moveSubmenuToBody(submenu);
        } catch (e) {
          console.warn("moveSubmenuToBody failed", e);
        }
        submenu.style.display = "flex";
        submenu.style.flexDirection = "column";
        submenu.classList.add("open");
      }
    });
    container.dataset.testedrop = "true";
  });

  // fechar ao clicar fora
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".submenu") && !e.target.closest(".nav-item")) {
      document.querySelectorAll(".submenu.open").forEach((s) => {
        s.style.display = "none";
        s.classList.remove("open");
        try {
          restoreSubmenu(s);
        } catch (e) {}
      });
    }
  });
}

// Abre/fecha submenus ao clicar, aplicando/removendo a classe .open no container e no submenu
function setupSubmenuClickHandlers() {
  const containers = document.querySelectorAll(".nav-item-with-submenu");
  if (!containers || containers.length === 0) return;
  containers.forEach((container) => {
    const menuItem = container.querySelector(".nav-item");
    const submenu = container.querySelector(".submenu");
    if (!menuItem || !submenu) return;

    // impedir múltiplos listeners
    if (menuItem.getAttribute("data-submenu-listener") === "true") return;
    menuItem.setAttribute("data-submenu-listener", "true");

    // --- NOVA LÓGICA: toggle igual testedrop ---
    menuItem.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.target.closest(".submenu")) return;

      // Fecha todos os outros submenus abertos
      document
        .querySelectorAll(".nav-item-with-submenu .submenu.open")
        .forEach((s) => {
          if (s !== submenu) {
            s.classList.remove("open");
            try {
              restoreSubmenu(s);
            } catch (e) {}
          }
        });

      // Toggle: se já está aberto, fecha; se está fechado, abre
      const isOpen = submenu.classList.contains("open");
      if (isOpen) {
        submenu.classList.remove("open");
        try {
          restoreSubmenu(submenu);
        } catch (e) {}
      } else {
        try {
          moveSubmenuToBody(submenu);
        } catch (e) {}
        submenu.classList.add("open");
      }
    });
  });

  // Fechar ao clicar fora (igual testedrop)
  document.addEventListener("click", function (ev) {
    if (!ev.target.closest(".submenu") && !ev.target.closest(".nav-item")) {
      document
        .querySelectorAll(".nav-item-with-submenu .submenu.open")
        .forEach((s) => {
          s.classList.remove("open");
          try {
            restoreSubmenu(s);
          } catch (e) {}
        });
    }
  });
}

// Funções do menu Início Rápido
function novoAtendimento() {
  console.log("Novo Atendimento");
  // Redirecionar para página de agendamentos
  // usar caminho absoluto para a pasta frontend para funcionar em páginas dentro de subpastas
  window.location.href = "/agendamentos-novo.html";
  closeDropdown();
}

function novoPet() {
  console.log("Novo Pet");
  // Abrir modal de cadastro de pet ou redirecionar
  // direcionar para o cadastro de pet (pasta frontend/pets)
  window.location.href = "/pets/cadastro-pet.html";
  closeDropdown();
}

function novoCliente() {
  console.log("Novo Cliente");
  // Redirecionar para página de clientes
  window.location.href = "/clientes.html";
  closeDropdown();
}

function novoContrato() {
  console.log("Novo Contrato");
  window.location.href = "/contrato-novo.html";
  closeDropdown();
}

function novaVenda() {
  console.log("Nova Venda");
  window.location.href = "/venda-nova.html";
  closeDropdown();
}

function novaContaPagar() {
  console.log("Nova Conta a Pagar");
  window.location.href = "/contas-pagar-nova.html";
  closeDropdown();
}

function closeDropdown() {
  const dropdown = document.querySelector(".dropdown");
  if (dropdown) {
    dropdown.classList.remove("open");
  }
}

// Sistema de notificações
function showNotification(message, type = "info") {
  // Criar elemento de notificação
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
        <i class="fas ${getIconByType(type)}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;

  // Adicionar estilos se não existirem
  if (!document.getElementById("notification-styles")) {
    const style = document.createElement("style");
    style.id = "notification-styles";
    style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 6px;
                color: white;
                display: flex;
                align-items: center;
                gap: 10px;
                z-index: 3000;
                animation: slideIn 0.3s ease;
                max-width: 400px;
            }
            
            .notification-success { background: #27ae60; }
            .notification-error { background: #e74c3c; }
            .notification-info { background: #3498db; }
            
            .notification button {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                margin-left: auto;
                padding: 0;
                width: 20px;
                height: 20px;
            }
            
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  // Auto remover após 4 segundos
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.animation = "slideOut 0.3s ease forwards";
      setTimeout(() => notification.remove(), 300);
    }
  }, 4000);
}

function getIconByType(type) {
  switch (type) {
    case "success":
      return "fa-check-circle";
    case "error":
      return "fa-exclamation-circle";
    case "info":
      return "fa-info-circle";
    default:
      return "fa-info-circle";
  }
}

// ============================================
// CONFIGURAÇÃO DO DROPDOWN "INÍCIO RÁPIDO"
// ============================================

function configurarDropdownInicioRapido() {
  // Verificar se já foi configurado para evitar duplicação
  if (window.dropdownConfigurado) {
    console.log("Dropdown já configurado, pulando...");
    return;
  }

  console.log("Configurando dropdown Início Rápido no Dashboard...");

  const dropdownBtn = document.getElementById("inicioRapidoBtn");
  const dropdown = document.querySelector(".dropdown");

  console.log("Elementos encontrados:", {
    dropdownBtn: !!dropdownBtn,
    dropdown: !!dropdown,
    dropdownClasses: dropdown ? dropdown.className : "N/A",
  });

  if (dropdownBtn && dropdown) {
    dropdownBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      console.log("Clique no botão Início Rápido detectado! (Dashboard)");

      const wasOpen = dropdown.classList.contains("open");
      dropdown.classList.toggle("open");

      console.log("Estado anterior:", wasOpen ? "aberto" : "fechado");
      console.log(
        "Estado atual:",
        dropdown.classList.contains("open") ? "aberto" : "fechado",
      );
      console.log("Classes do dropdown:", dropdown.className);
    });

    // Fechar dropdown ao clicar fora
    document.addEventListener("click", function (e) {
      if (!dropdown.contains(e.target)) {
        if (dropdown.classList.contains("open")) {
          console.log("Fechando dropdown (clique fora)");
          dropdown.classList.remove("open");
        }
      }
    });

    // Marcar como configurado
    window.dropdownConfigurado = true;
    console.log("Dropdown Início Rápido configurado com sucesso no Dashboard");
  } else {
    console.error(
      "ERRO: Elementos do dropdown Início Rápido não encontrados no Dashboard:",
      {
        dropdownBtn: !!dropdownBtn,
        dropdown: !!dropdown,
      },
    );
  }
}

// ============================================
// SISTEMA DE PERSISTÊNCIA DE SUBMENUS
// ============================================

function salvarEstadoSubmenu(submenuId, isOpen) {
  try {
    const estadoSubmenus = JSON.parse(
      localStorage.getItem("estadoSubmenus") || "{}",
    );
    estadoSubmenus[submenuId] = isOpen;
    localStorage.setItem("estadoSubmenus", JSON.stringify(estadoSubmenus));
    console.log(`Estado do submenu ${submenuId} salvo:`, isOpen);
  } catch (error) {
    console.error("Erro ao salvar estado do submenu:", error);
  }
}

function obterEstadoSubmenu(submenuId) {
  try {
    const estadoSubmenus = JSON.parse(
      localStorage.getItem("estadoSubmenus") || "{}",
    );
    return estadoSubmenus[submenuId] || false;
  } catch (error) {
    console.error("Erro ao obter estado do submenu:", error);
    return false;
  }
}

function restaurarEstadoSubmenus() {
  console.log("Restaurando estado dos submenus...");

  // Lista de submenus para restaurar
  const submenus = [
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
  ];

  submenus.forEach(({ container, submenu, id }) => {
    const isOpen = obterEstadoSubmenu(id);
    if (isOpen) {
      // Aguardar um pouco para garantir que os elementos existam
      setTimeout(() => {
        const containerElement =
          document.getElementById(container)?.parentElement;
        const submenuElement = document.getElementById(submenu);

        if (containerElement && submenuElement) {
          containerElement.classList.add("open");
          submenuElement.classList.add("open");
          console.log(`Submenu ${id} restaurado como aberto`);
        }
      }, 100);
    }
  });
}

function configurarPersistenciaSubmenu(menuItemId, submenuId, submenuName) {
  // Verificar se há elementos duplicados e alertar
  const menuItems = document.querySelectorAll(`#${menuItemId}`);
  const submenus = document.querySelectorAll(`#${submenuId}`);

  if (menuItems.length > 1) {
    console.warn(
      `⚠️  AVISO: Encontrados ${menuItems.length} elementos com ID '${menuItemId}'. IDs devem ser únicos!`,
    );
    // Remover elementos duplicados (manter apenas o primeiro)
    for (let i = 1; i < menuItems.length; i++) {
      const duplicateElement = menuItems[i].closest(".nav-item-with-submenu");
      if (duplicateElement) {
        console.log(
          `🗑️  Removendo elemento duplicado: ${menuItemId} (${i + 1})`,
        );
        duplicateElement.remove();
      }
    }
  }

  if (submenus.length > 1) {
    console.warn(
      `⚠️  AVISO: Encontrados ${submenus.length} elementos com ID '${submenuId}'. IDs devem ser únicos!`,
    );
    // Remover submenus duplicados (manter apenas o primeiro)
    for (let i = 1; i < submenus.length; i++) {
      console.log(`🗑️  Removendo submenu duplicado: ${submenuId} (${i + 1})`);
      submenus[i].remove();
    }
  }

  // Agora pegar o primeiro (e único) elemento
  const menuItem = document.getElementById(menuItemId);
  const submenu = document.getElementById(submenuId);
  const menuContainer = menuItem?.parentElement;

  if (menuItem && submenu && menuContainer) {
    // Remover event listener existente se houver
    const existingListener = menuItem.getAttribute("data-listener-added");
    if (existingListener) {
      console.log(`ℹ️  Event listener já configurado para: ${submenuName}`);
      return;
    }

    menuItem.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      console.log(`Clique detectado no submenu: ${submenuName}`);

      // Verificar se o clique foi no próprio item do menu, não em um submenu-item
      if (e.target.closest(".submenu-item")) {
        console.log("Clique em submenu-item detectado, ignorando toggle");
        return;
      }

      // Verificar se há conflitos - fechar outros submenus abertos
      fecharOutrosSubmenus(submenuName);

      // Toggle submenu atual
      const isCurrentlyOpen = menuContainer.classList.contains("open");
      menuContainer.classList.toggle("open");
      submenu.classList.toggle("open");

      // Salvar estado
      const isNowOpen = menuContainer.classList.contains("open");
      salvarEstadoSubmenu(submenuName, isNowOpen);

      // DEBUG: log de estilos computados após toggle para investigar visibilidade
      try {
        const cs = window.getComputedStyle(submenu);
        console.log("DEBUG submenu computed styles:", {
          id: submenu.id,
          display: cs.display,
          visibility: cs.visibility,
          opacity: cs.opacity,
          left: cs.left,
          top: cs.top,
          width: cs.width,
          height: cs.height,
          zIndex: cs.zIndex,
          background: cs.backgroundColor,
          offsetWidth: submenu.offsetWidth,
          offsetHeight: submenu.offsetHeight,
        });
      } catch (err) {
        console.warn("DEBUG: erro ao obter estilos do submenu", err);
      }

      // DEBUG adicional: bounding rect, children count, snippet e element at point
      try {
        const rect = submenu.getBoundingClientRect();
        const childrenCount = submenu.children.length;
        const snippet = submenu.innerHTML
          ? submenu.innerHTML.trim().slice(0, 300)
          : "[empty]";
        // pick a point slightly inside the submenu (left + 10, top + 40)
        const testX = Math.round(rect.left + 10);
        const testY = Math.round(rect.top + 40);
        const elemsAtPoint = document
          .elementsFromPoint(testX, testY)
          .map((e) => ({
            tag: e.tagName,
            cls: e.className,
            id: e.id,
            z: window.getComputedStyle(e).zIndex || "auto",
          }));
        console.log("DEBUG submenu bbox:", {
          rect,
          childrenCount,
          snippet,
          testPoint: { x: testX, y: testY },
          elemsAtPoint,
        });
        try {
          console.log(
            "DEBUG elemsAtPoint (json):",
            JSON.stringify(elemsAtPoint),
          );
        } catch (e) {
          console.log("DEBUG elemsAtPoint stringify failed", e);
        }
      } catch (err) {
        console.warn("DEBUG adicional falhou", err);
      }

      // Fallback automático: forçar posicionamento e z-index para garantir visibilidade
      try {
        const sidebarEl = document.querySelector(".sidebar");
        if (sidebarEl) {
          const sbRect = sidebarEl.getBoundingClientRect();
          // posicionar o submenu colado à direita da sidebar
          submenu.style.position = "fixed";
          submenu.style.left = Math.round(sbRect.right) + 0 + "px";
          submenu.style.top = "0px";
          submenu.style.zIndex = "99999";
          submenu.style.display = "block";
          submenu.style.visibility = "visible";
          submenu.style.pointerEvents = "auto";
          // usar o mesmo background (gradient) do sidebar para manter a aparência
          try {
            const sidebarStyle = window.getComputedStyle(sidebarEl);
            if (sidebarStyle && sidebarStyle.background)
              submenu.style.background = sidebarStyle.background;
            else submenu.style.background = "var(--bg-sidebar)";
          } catch (bgErr) {
            submenu.style.background = "var(--bg-sidebar)";
          }

          // relogar elementos no ponto testado após aplicar mudanças
          const rect2 = submenu.getBoundingClientRect();
          const tx = Math.round(rect2.left + 10);
          const ty = Math.round(rect2.top + 40);
          const elems2 = document
            .elementsFromPoint(tx, ty)
            .map((e) => ({
              tag: e.tagName,
              cls: e.className,
              id: e.id,
              z: window.getComputedStyle(e).zIndex || "auto",
            }));
          console.log("DEBUG pós-fallback - submenu bbox:", {
            rect: rect2,
            elemsAtPointAfterFallback: elems2,
          });
          try {
            console.log(
              "DEBUG elemsAtPointAfterFallback (json):",
              JSON.stringify(elems2),
            );
          } catch (e) {
            console.log("DEBUG elemsAtPointAfterFallback stringify failed", e);
          }
        }
      } catch (fbErr) {
        console.warn("DEBUG fallback falhou", fbErr);
      }

      // remover qualquer outline de depuração (limpeza)
      try {
        submenu.style.outline = "";
      } catch (e) {}

      console.log(`Submenu ${submenuName} ${isNowOpen ? "aberto" : "fechado"}`);
    });

    // Adicionar event listeners para os itens do submenu para permitir navegação
    const submenuItems = submenu.querySelectorAll(".submenu-item[href]");
    submenuItems.forEach((item) => {
      item.addEventListener("click", function (e) {
        e.stopPropagation();
        console.log(`Navegando para: ${this.getAttribute("href")}`);

        // Fechar o submenu após clique em um item
        setTimeout(() => {
          menuContainer.classList.remove("open");
          submenu.classList.remove("open");
          salvarEstadoSubmenu(submenuName, false);
          console.log(`Submenu ${submenuName} fechado após navegação`);
        }, 150); // Pequeno delay para permitir a navegação

        // Permitir navegação normal
      });
    });

    // Adicionar event listeners para itens sem href (que não navegam)
    const submenuItemsSemHref = submenu.querySelectorAll(
      ".submenu-item:not([href])",
    );
    submenuItemsSemHref.forEach((item) => {
      item.addEventListener("click", function (e) {
        e.stopPropagation();
        console.log(`Clique em item sem navegação: ${this.textContent.trim()}`);

        // Fechar o submenu após clique
        menuContainer.classList.remove("open");
        submenu.classList.remove("open");
        salvarEstadoSubmenu(submenuName, false);
        console.log(`Submenu ${submenuName} fechado após clique em item`);
      });
    });

    // Marcar como configurado
    menuItem.setAttribute("data-listener-added", "true");
    console.log(`Persistência configurada para submenu ${submenuName}`);
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
        const wasOpen = containerElement.classList.contains("open");
        if (wasOpen) {
          containerElement.classList.remove("open");
          submenuElement.classList.remove("open");
          salvarEstadoSubmenu(id, false);
          console.log(`Submenu ${id} fechado para evitar conflito`);
        }
      }
    }
  });
}

function limparEstadoSubmenus() {
  try {
    localStorage.removeItem("estadoSubmenus");
    console.log("Estado dos submenus limpo");
  } catch (error) {
    console.error("Erro ao limpar estado dos submenus:", error);
  }
}

function detectarEAbrirSubmenuAtual() {
  const paginaAtual = window.location.pathname.split("/").pop() || "index.html";
  console.log("Página atual detectada:", paginaAtual);

  // Mapeamento de páginas para submenus
  const mapeamentoPaginas = {
    // Páginas do Cliente
    "clientes.html": "cliente",
    "novo-cliente.html": "cliente",
    "grupos-clientes.html": "cliente",
    "meus-clientes.html": "cliente",

    // Páginas do Atendimento
    "agendamentos-novo.html": "atendimento",
    "agendamentos.html": "atendimento",
    "minha-agenda.html": "atendimento",

    // Páginas do Pet (futuras)
    "meus-pets.html": "pet",
    "novo-pet.html": "pet",

    // Páginas do Painel
    "dashboard.html": "painel",
  };

  const submenuParaAbrir = mapeamentoPaginas[paginaAtual];

  if (submenuParaAbrir) {
    console.log(
      `Abrindo submenu ${submenuParaAbrir} para página ${paginaAtual}`,
    );
    setTimeout(() => {
      abrirSubmenuEspecifico(submenuParaAbrir);
    }, 100);
  }
}

function abrirSubmenuEspecifico(submenuNome) {
  const submenuMap = {
    cliente: { container: "clienteMenuItem", submenu: "clienteSubmenu" },
    pet: { container: "petMenuItem", submenu: "petSubmenu" },
    atendimento: {
      container: "atendimentoMenuItem",
      submenu: "atendimentoSubmenu",
    },
    financeiro: {
      container: "financeiroMenuItem",
      submenu: "financeiroSubmenu",
    },
    configuracao: {
      container: "configuracaoMenuItem",
      submenu: "configuracaoSubmenu",
    },
    painel: { container: "painelMenuItem", submenu: "painelSubmenu" },
    compras: { container: "comprasMenuItem", submenu: "comprasSubmenu" },
  };

  const config = submenuMap[submenuNome];
  if (config) {
    const containerElement = document.getElementById(
      config.container,
    )?.parentElement;
    const submenuElement = document.getElementById(config.submenu);

    if (containerElement && submenuElement) {
      // Fechar outros submenus primeiro
      fecharOutrosSubmenus(submenuNome);

      // Abrir o submenu atual
      containerElement.classList.add("open");
      submenuElement.classList.add("open");

      // Salvar estado
      salvarEstadoSubmenu(submenuNome, true);

      console.log(`Submenu ${submenuNome} aberto automaticamente`);
    }
  }
}

function destacarSecaoAtiva() {
  const paginaAtual = window.location.pathname.split("/").pop() || "index.html";
  console.log("Destacando seção ativa para página:", paginaAtual);

  // Mapeamento de páginas para itens de menu
  const mapeamentoPaginas = {
    // Páginas do Cliente
    "clientes.html": "clienteMenuItem",
    "novo-cliente.html": "clienteMenuItem",
    "grupos-clientes.html": "clienteMenuItem",
    "meus-clientes.html": "clienteMenuItem",

    // Páginas do Atendimento
    "agendamentos-novo.html": "atendimentoMenuItem",
    "agendamentos.html": "atendimentoMenuItem",
    "minha-agenda.html": "atendimentoMenuItem",

    // Páginas do Pet
    "meus-pets.html": "petMenuItem",
    "novo-pet.html": "petMenuItem",

    // Dashboard
    "dashboard.html": "dashboard",
  };

  const itemParaDestacar = mapeamentoPaginas[paginaAtual];

  if (itemParaDestacar && itemParaDestacar !== "dashboard") {
    const menuItem = document.getElementById(itemParaDestacar);
    if (menuItem) {
      // Remover classe active de todos os itens de menu
      document.querySelectorAll(".nav-item").forEach((item) => {
        item.classList.remove("active");
      });

      // Adicionar classe active ao item atual
      menuItem.classList.add("active");
      console.log(`Item ${itemParaDestacar} marcado como ativo`);
    }
  }
}

// Helpers: mover submenu para body e restaurar ao seu lugar original
function moveSubmenuToBody(submenu) {
  if (!submenu) return;
  if (submenu.dataset.moved === "true") return;
  const originalParent = submenu.parentElement;
  const nextSibling = submenu.nextElementSibling;
  submenu.dataset.originalParentSelector = originalParent
    ? originalParent.getAttribute("data-submenu-container-id") || ""
    : "";
  submenu.dataset.originalParent = originalParent ? "" : "";
  submenu.dataset._orig_parent = ""; // marker (we won't serialize the element)
  // store reference via WeakMap would be ideal, but dataset suffices for this runtime
  submenu.dataset._stored_next = nextSibling ? "1" : "0";
  // move to body
  document.body.appendChild(submenu);
  // apply fixed positioning and position it right after sidebar
  const sidebarEl = document.querySelector(".sidebar");
  const sbRect = sidebarEl ? sidebarEl.getBoundingClientRect() : { right: 140 };
  submenu.classList.add("submenu-fixed");
  submenu.style.left = Math.round(sbRect.right) + "px";
  submenu.style.zIndex = "99999";
  submenu.style.display = "flex";
  submenu.style.visibility = "visible";
  submenu.style.pointerEvents = "auto";
  submenu.dataset.moved = "true";

  // inserir cabeçalho com o título do menu (ex: 'Painel') para aparecer acima dos itens
  try {
    if (!submenu.querySelector(".submenu-fixed-header")) {
      const id = submenu.id || "";
      const menuItemId = id.replace("Submenu", "MenuItem");
      const menuItem = document.getElementById(menuItemId);
      let titleText = "";
      if (menuItem) {
        const span = menuItem.querySelector("span");
        titleText =
          span && span.textContent
            ? span.textContent.trim()
            : menuItem.textContent.trim();
      }
      if (!titleText) {
        titleText = id.replace(/Submenu$/i, "");
      }
      const header = document.createElement("div");
      header.className = "submenu-fixed-header";
      header.innerHTML = `<div class="submenu-fixed-header-title">${escapeHtml(titleText)}</div>`;
      submenu.insertBefore(header, submenu.firstChild);
    }
  } catch (e) {
    console.warn("Erro ao inserir header do submenu", e);
  }
}

function restoreSubmenu(submenu) {
  if (!submenu) return;
  if (submenu.dataset.moved !== "true") return;
  // find the original container by id: submenu id is like painelSubmenu, find corresponding nav-item-with-submenu by matching child
  const id = submenu.id;
  const menuItemId = id.replace("Submenu", "MenuItem");
  const menuItem = document.getElementById(menuItemId);
  const menuContainer = menuItem ? menuItem.parentElement : null;
  if (menuContainer) {
    // append back into container
    menuContainer.appendChild(submenu);
  } else {
    // fallback: append to sidebar
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) sidebar.appendChild(submenu);
  }
  // remove inline styles and class we added
  submenu.classList.remove("submenu-fixed");
  submenu.style.left = "";
  submenu.style.top = "";
  submenu.style.zIndex = "";
  submenu.style.display = "";
  submenu.style.visibility = "";
  submenu.style.pointerEvents = "";
  submenu.dataset.moved = "false";
  try {
    submenu.style.outline = "";
  } catch (e) {}
  // remover header se existir
  try {
    const hdr = submenu.querySelector(".submenu-fixed-header");
    if (hdr) hdr.remove();
  } catch (e) {}
}

// util: escape text for safe insertion
function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Minimal 'Pedido de Venda' toast (lightweight, global)
(function () {
  if (window.__pedidoToastInstalled) return;
  window.__pedidoToastInstalled = true;

  // inject styles if not present
  if (!document.getElementById("pedido-toast-styles")) {
    var s = document.createElement("style");
    s.id = "pedido-toast-styles";
    s.textContent =
      "\n.pedido-toast-container{position:fixed;top:18px;right:18px;display:flex;flex-direction:column;gap:8px;z-index:99999;pointer-events:none}\n.pedido-toast{pointer-events:auto;background:linear-gradient(180deg,#e8f6ff,#d3efff);color:#023047;padding:10px 14px;border-radius:8px;box-shadow:0 8px 24px rgba(2,16,26,0.12);min-width:220px;max-width:380px;font-weight:700;opacity:0;transform:translateY(-6px) scale(0.98);transition:opacity .18s,transform .18s}\n";
    document.head.appendChild(s);
  }

  function showPedidoToast(message) {
    try {
      var c = document.querySelector(".pedido-toast-container");
      if (!c) {
        c = document.createElement("div");
        c.className = "pedido-toast-container";
        document.body.appendChild(c);
      }
      var t = document.createElement("div");
      t.className = "pedido-toast";
      t.textContent = message;
      c.appendChild(t);
      requestAnimationFrame(function () {
        t.style.opacity = "1";
        t.style.transform = "none";
      });
      setTimeout(function () {
        t.style.opacity = "0";
        t.style.transform = "translateY(-6px) scale(0.98)";
        setTimeout(function () {
          try {
            t.remove();
          } catch (e) {}
        }, 220);
      }, 5000);
    } catch (e) {
      /* silent */
    }
  }

  document.addEventListener(
    "click",
    function (ev) {
      try {
        var el = ev.target;
        var a = el && el.closest ? el.closest("a") : null;
        var txt = "";
        if (a) txt = (a.textContent || "").trim();
        else txt = (el.textContent || "").trim();

        var href = a && a.getAttribute ? a.getAttribute("href") || "" : "";
        if (
          txt === "Pedido de Venda" ||
          (href && href.indexOf("pedido-venda") !== -1)
        ) {
          ev.preventDefault();
          ev.stopPropagation();
          showPedidoToast("Pedido de Venda ainda está sendo desenvolvido");
        }
      } catch (e) {}
    },
    true,
  );
})();
