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

// Funções para salvar rascunhos
function coletarPayloadRascunho() {
  try {
    const fornecedor =
      document.getElementById("fornecedor")?.value.trim() || "";
    const numero = document.getElementById("numero")?.value.trim() || "";
    const serie = document.getElementById("serie")?.value.trim() || "";
    const dataEmissao = document.getElementById("dataEmissao")?.value || "";
    const dataEntrada = document.getElementById("dataEntrada")?.value || "";
    const chaveAcesso =
      document.getElementById("chaveAcesso")?.value.trim() || "";
    const centroResultado =
      document.getElementById("centroResultado")?.value.trim() || "";
    const categoriaFinanceira =
      document.getElementById("categoriaFinanceira")?.value.trim() || "";

    // Calcular totais dos itens
    const totalProdutos = (window.itensEntrada || []).reduce(
      (sum, item) => sum + (item.totalBruto || 0),
      0,
    );
    const valorTotal =
      parseFloat(
        (document.getElementById("valorTotal")?.value || "0")
          .toString()
          .replace(".", "")
          .replace(",", "."),
      ) || 0;

    const payload = {
      fornecedor,
      numero,
      serie,
      dataEmissao,
      dataEntrada,
      chaveAcesso,
      itens: window.itensEntrada || [],
      totalProdutos,
      valorTotal,
      centroResultado,
      categoriaFinanceira,
      situacao: "pendente",
    };

    return payload;
  } catch (e) {
    console.error("Erro ao coletar payload do rascunho:", e);
    return null;
  }
}

// Toast helpers específicos para esta página
function showSuccessToast(message, duration) {
  try {
    duration = typeof duration === "number" ? duration : 4200;
    let c = document.getElementById("entradaManualToastContainer");
    if (!c) {
      c = document.createElement("div");
      c.id = "entradaManualToastContainer";
      c.style.position = "fixed";
      c.style.top = "18px";
      c.style.right = "18px";
      c.style.zIndex = "2147483647";
      c.style.display = "flex";
      c.style.flexDirection = "column";
      c.style.gap = "10px";
      document.body.appendChild(c);
    }
    const t = document.createElement("div");
    t.className = "entrada-manual-toast success";
    t.textContent = message;
    t.style.background = "linear-gradient(180deg,#e6fff2,#d4f7df)";
    t.style.color = "#0f5132";
    t.style.padding = "10px 14px";
    t.style.borderRadius = "8px";
    t.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
    t.style.border = "1px solid rgba(34,197,94,0.12)";
    t.style.marginTop = "8px";
    t.style.opacity = "0";
    t.style.transition = "opacity .18s,transform .18s";
    c.appendChild(t);
    requestAnimationFrame(() => {
      t.style.opacity = "1";
      t.style.transform = "none";
    });
    setTimeout(() => {
      t.style.opacity = "0";
      setTimeout(() => {
        try {
          t.remove();
        } catch (e) {}
      }, 220);
    }, duration);
  } catch (e) {
    try {
      console.warn("showSuccessToast error", e);
    } catch (_) {}
  }
}

function showErrorToast(message, duration) {
  try {
    duration = typeof duration === "number" ? duration : 5200;
    let c = document.getElementById("entradaManualToastContainer");
    if (!c) {
      c = document.createElement("div");
      c.id = "entradaManualToastContainer";
      c.style.position = "fixed";
      c.style.top = "18px";
      c.style.right = "18px";
      c.style.zIndex = "2147483647";
      c.style.display = "flex";
      c.style.flexDirection = "column";
      c.style.gap = "10px";
      document.body.appendChild(c);
    }
    const t = document.createElement("div");
    t.className = "entrada-manual-toast error";
    t.textContent = message;
    t.style.background = "linear-gradient(180deg,#fff0f0,#ffe6e6)";
    t.style.color = "#6b1f1f";
    t.style.padding = "10px 14px";
    t.style.borderRadius = "8px";
    t.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
    t.style.border = "1px solid rgba(220,38,38,0.12)";
    t.style.marginTop = "8px";
    t.style.opacity = "0";
    t.style.transition = "opacity .18s,transform .18s";
    c.appendChild(t);
    requestAnimationFrame(() => {
      t.style.opacity = "1";
      t.style.transform = "none";
    });
    setTimeout(() => {
      t.style.opacity = "0";
      setTimeout(() => {
        try {
          t.remove();
        } catch (e) {}
      }, 220);
    }, duration);
  } catch (e) {
    try {
      console.warn("showErrorToast error", e);
    } catch (_) {}
  }
}

async function salvarRascunho() {
  try {
    const payload = coletarPayloadRascunho();
    if (!payload) {
      try {
        showErrorToast("Nada para salvar como rascunho.");
      } catch (e) {
        alert("Nada para salvar como rascunho.");
      }
      return;
    }

    const success = await salvarRascunhoInterno(payload, false);
    if (success) {
      try {
        showSuccessToast(
          "Rascunho salvo com sucesso! Você encontrará a entrada na lista de Pendentes.",
        );
      } catch (e) {
        alert(
          "Rascunho salvo com sucesso! Você encontrará a entrada na lista de Pendentes.",
        );
      }
    }
  } catch (e) {
    console.error("Erro ao salvar rascunho:", e);
    try {
      showErrorToast(
        "Erro ao salvar rascunho: " + (e && e.message ? e.message : String(e)),
      );
    } catch (_) {
      alert("Erro ao salvar rascunho: " + e.message);
    }
  }
}

async function salvarRascunhoSilencioso() {
  try {
    const payload = coletarPayloadRascunho();
    if (!payload) return false;
    return await salvarRascunhoInterno(payload, true);
  } catch (e) {
    console.debug("Erro ao salvar rascunho silencioso:", e);
    return false;
  }
}

async function salvarRascunhoInterno(payload, silencioso = false) {
  try {
    // Adicionar flag de rascunho
    payload.situacao = "pendente";
    payload.rascunho = true;

    // Verificar se já existe um ID de entrada sendo editada
    const entradaId = window.currentEntradaId;

    let res;
    if (entradaId) {
      // Atualizar entrada existente
      res = await fetch(`/api/entrada/manual/${entradaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      // Criar nova entrada
      res = await fetch("/api/entrada/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      if (!silencioso) {
        console.error("Erro ao salvar no banco:", body);
      }
      return false;
    }

    // Guardar ID da entrada para futuras atualizações
    if (body && body.id) {
      window.currentEntradaId = body.id;
    }

    console.log("💾 Entrada salva no banco:", body);

    // Sincronizar validades dos itens com produtos correspondentes
    try {
      const itemsToSync = payload.itens || window.itensEntrada || [];
      for (const it of itemsToSync) {
        const prodId = it.matchedId || it.matched || null;
        const rawVal = it.validade || it.dataValidade || it.dVenc || "";
        if (!prodId || !rawVal) continue;

        const normalize = (s) => {
          if (!s) return null;
          if (typeof s === "string" && s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;
          const m = String(s)
            .trim()
            .match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
          if (m) return `${m[3]}-${m[2]}-${m[1]}`;
          const d = new Date(s);
          if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
          return null;
        };
        const iso = normalize(rawVal);
        if (!iso) continue;

        console.log("🔄 Sync após salvar: produto", prodId, "validade:", iso);
        fetch(`/api/itens/${encodeURIComponent(prodId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ validade: iso }),
        }).catch((err) =>
          console.debug("Erro sync validade após salvar:", err),
        );
      }
    } catch (e) {
      console.debug("Erro na sincronização de validades:", e);
    }

    return true;
  } catch (e) {
    if (!silencioso) {
      console.error("Erro ao salvar rascunho no banco:", e);
    }
    return false;
  }
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

// ========================================
// ENTRADA MANUAL - LÓGICA DO FORMULÁRIO
// ========================================

let itensEntrada = [];
let itemCounter = 1;
// estado temporário para preservar foco/seleção durante re-renders
let __editingState = null;

function inicializarEntradaManual() {
  console.log("📦 Inicializando formulário de entrada manual");

  // Tornar itensEntrada acessível globalmente para coletarPayloadRascunho
  window.itensEntrada = itensEntrada;

  // Configurar autosave a cada 30 segundos
  setInterval(() => {
    try {
      const fornecedor = document.getElementById("fornecedor")?.value.trim();
      const numero = document.getElementById("numero")?.value.trim();
      // Só salvar se houver dados relevantes
      if (fornecedor || numero || itensEntrada.length > 0) {
        salvarRascunhoSilencioso();
      }
    } catch (e) {
      console.debug("Erro no autosave:", e);
    }
  }, 30000);

  // Definir datas padrão
  const hoje = new Date().toISOString().split("T")[0];
  const dataEmissaoEl = document.getElementById("dataEmissao");
  const dataEntradaEl = document.getElementById("dataEntrada");
  if (dataEmissaoEl) dataEmissaoEl.value = hoje;
  if (dataEntradaEl) dataEntradaEl.value = hoje;

  // Configurar event listeners
  configurarEventListenersEntradaManual();

  // configurar dropdowns tipo typeahead para Centro de Resultado e Categoria Financeira
  try {
    configurarDropdownCentroResultado();
  } catch (e) {
    console.warn("configurarDropdownCentroResultado failed", e);
  }
  try {
    configurarDropdownCategoriaFinanceira();
  } catch (e) {
    console.warn("configurarDropdownCategoriaFinanceira failed", e);
  }

  // Só popular o formulário automaticamente se houver um ID explícito na URL
  // ou se existir dado importado/rascunho na sessionStorage
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const entradaId = urlParams.get("id");
    // Só considerar import automático se a flag explícita 'entradaImported_auto' estiver presente e igual a '1'
    const importedRaw = sessionStorage.getItem("entradaImported");
    const editingRaw = sessionStorage.getItem("editingEntrada");
    const importedAutoFlag = sessionStorage.getItem("entradaImported_auto");
    const hasImportedData =
      Boolean(editingRaw) ||
      (Boolean(importedRaw) && String(importedAutoFlag) === "1");

    if (entradaId || hasImportedData) {
      // populate imported entrada (se houver)
      try {
        setTimeout(() => {
          try {
            checkAndPopulateImportedEntrada();
          } catch (e) {
            console.warn("populate imported failed", e);
          }
        }, 50);
      } catch (e) {}
      // populate draft/editing entrada (se houver)
      try {
        setTimeout(() => {
          try {
            checkAndPopulateDraft();
          } catch (e) {
            console.warn("populate draft failed", e);
          }
        }, 60);
      } catch (e) {}

      // Se um id foi passado, tentar carregar do servidor (caso o usuário tenha aberto ?id=123)
      if (entradaId) {
        (async function () {
          try {
            const r = await fetch(
              "/api/entrada/manual/" + encodeURIComponent(entradaId),
            );
            if (r.ok) {
              const data = await r.json().catch(() => null);
              if (data) {
                try {
                  applyDraftData(data);
                } catch (e) {
                  console.warn("applyDraftData failed", e);
                }
              }
            }
          } catch (e) {
            console.warn("carregar entrada por id falhou", e);
          }
        })();
      }
    } else {
      console.log("✨ Iniciando nova entrada manual (formulário vazio)");
    }
  } catch (e) {
    console.warn("Erro ao decidir popular formulário automaticamente", e);
  }

  console.log("✅ Formulário de entrada manual inicializado");
}

function configurarEventListenersEntradaManual() {
  const btnAdicionarItem = document.getElementById("btnAdicionarItem");
  const btnFinalizar = document.getElementById("btnFinalizar");
  const btnVoltar = document.getElementById("btnVoltar");
  const btnExcluir = document.getElementById("btnExcluir");
  const btnTruckToggle = document.getElementById("btnTruckToggle");

  // Campos de totais que recalculam (IPI e ICMS ST serão preenchidos pela API e são somente leitura)
  const camposTotais = [
    "desconto",
    "seguro",
    "despesa",
    "frete",
    "despesaExtra",
  ];
  camposTotais.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", calcularTotais);
    }
  });

  // Tornar IPI e ICMS ST somente leitura (serão preenchidos pela API posteriormente)
  ["ipi", "icmsST"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.readOnly = true;
      el.classList.add("input-readonly");
    }
  });

  if (btnAdicionarItem) {
    btnAdicionarItem.addEventListener("click", (e) => {
      e.preventDefault();
      adicionarItem();
    });
  }

  if (btnFinalizar) {
    btnFinalizar.addEventListener("click", finalizarEntrada);
  }

  // Configurar botão Salvar rascunho
  const btnSalvarRascunho = document.getElementById("btnSalvarRascunho");
  if (btnSalvarRascunho) {
    btnSalvarRascunho.addEventListener("click", function (e) {
      e.preventDefault();
      salvarRascunho();
    });
  }

  if (btnVoltar) {
    btnVoltar.addEventListener("click", () => {
      window.location.href = "./entrada-mercadoria.html";
    });
  }

  if (btnExcluir) {
    btnExcluir.addEventListener("click", excluirNota);
  }

  if (btnTruckToggle) {
    btnTruckToggle.addEventListener("click", toggleTransportFields);
  }

  // configurar dropdown custom do frete por conta
  try {
    setupFreteDropdown();
  } catch (e) {
    console.warn("setupFreteDropdown error", e);
  }

  // configurar autocompletes para fornecedor e transportador
  try {
    setupFornecedorAutocomplete("fornecedor", "fornecedorId", "fornecedorList");
  } catch (e) {
    console.warn("setupFornecedorAutocomplete error", e);
  }
  try {
    setupFornecedorAutocomplete(
      "transportador",
      "transportadorId",
      "transportadorList",
    );
  } catch (e) {
    console.warn("setupTransportadorAutocomplete error", e);
  }
}

function toggleTransportFields() {
  const container = document.getElementById("transportFieldsContainer");
  if (container) {
    if (container.style.display === "none") {
      container.style.display = "flex";
    } else {
      container.style.display = "none";
    }
  }
}

// Configura o dropdown customizado do campo 'Frete por conta'
function setupFreteDropdown() {
  const dropdown = document.getElementById("freteDropdown");
  if (!dropdown) return;
  if (dropdown.dataset.freteConfigured === "true") return;

  const hidden = document.getElementById("fretePorConta");
  const toggle = dropdown.querySelector(".custom-dropdown-toggle");
  const list = dropdown.querySelector(".custom-dropdown-list");
  const items = list.querySelectorAll(".custom-dropdown-item");

  function openList() {
    dropdown.classList.add("open");
    dropdown.setAttribute("aria-expanded", "true");
    list.style.display = "block";
  }
  function closeList() {
    dropdown.classList.remove("open");
    dropdown.setAttribute("aria-expanded", "false");
    list.style.display = "none";
  }

  toggle.addEventListener("click", function (e) {
    e.stopPropagation();
    const open = dropdown.classList.contains("open");
    if (open) closeList();
    else openList();
  });

  items.forEach((it) => {
    it.tabIndex = 0;
    it.addEventListener("click", function (e) {
      e.stopPropagation();
      const v = this.dataset.value;
      const txt = this.textContent.trim();
      if (hidden) hidden.value = v;
      const label = dropdown.querySelector(".custom-dropdown-selected");
      if (label) {
        label.textContent = txt;
        label.classList.add("selected");
      }
      closeList();
    });
    it.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.click();
      }
    });
  });

  // fechar ao clicar fora
  document.addEventListener("click", function (e) {
    if (!dropdown.contains(e.target)) {
      try {
        closeList();
      } catch (e) {}
    }
  });

  // keyboard support on dropdown container
  dropdown.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeList();
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      openList();
      const first = list.querySelector(".custom-dropdown-item");
      if (first) first.focus();
    }
  });

  dropdown.dataset.freteConfigured = "true";
}

// Autocomplete genérico que busca fornecedores da API e popula lista
function setupFornecedorAutocomplete(inputId, hiddenId, listId) {
  const input = document.getElementById(inputId);
  const hidden = document.getElementById(hiddenId);
  const list = document.getElementById(listId);
  if (!input || !list) return;
  if (input.dataset.autocomplete === "true") return;

  let controller = null;
  let activeIndex = -1;
  let items = [];

  function renderList(arr) {
    list.innerHTML = "";
    if (!arr || arr.length === 0) {
      list.style.display = "none";
      return;
    }
    const top = document.createElement("div");
    top.className = "autocomplete-topline";
    list.appendChild(top);
    arr.forEach((f, idx) => {
      const it = document.createElement("div");
      it.className = "autocomplete-item";
      it.tabIndex = 0;
      it.dataset.idx = idx;
      it.dataset.id = f.id;
      it.dataset.nome = f.nome || f.razaoSocial || "";
      it.innerHTML =
        `<div class="autocomplete-main">${escapeHtml(f.nome || f.razaoSocial || "")}</div>` +
        (f.codigo
          ? `<div class="autocomplete-sub">${escapeHtml(f.codigo)}</div>`
          : "");
      it.addEventListener("click", function (e) {
        e.stopPropagation();
        selectItem(idx);
      });
      it.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectItem(idx);
        }
      });
      list.appendChild(it);
    });
    list.style.display = "block";
  }

  function selectItem(idx) {
    const f = items[idx];
    if (!f) return;
    input.value = f.nome || f.razaoSocial || "";
    if (hidden) hidden.value = f.id || "";
    list.style.display = "none";
  }

  const debouncedFetch = debounce(async function (q) {
    try {
      if (controller) controller.abort();
      controller = new AbortController();
      const res = await fetch("/api/fornecedores?q=" + encodeURIComponent(q), {
        signal: controller.signal,
      });
      const data = await res.json();
      items = Array.isArray(data) ? data : [];
      renderList(items);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.warn("autocomplete fetch error", err);
    }
  }, 300);

  input.addEventListener("input", function (e) {
    const v = this.value.trim();
    if (!v) {
      list.style.display = "none";
      return;
    }
    debouncedFetch(v);
  });
  input.addEventListener("focus", function (e) {
    const v = this.value.trim();
    if (v) debouncedFetch(v);
  });

  // keyboard navigation
  input.addEventListener("keydown", function (e) {
    const visible = list.style.display !== "none";
    const itemsEls = list.querySelectorAll(".autocomplete-item");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!visible) {
        if (this.value) debouncedFetch(this.value);
        return;
      }
      activeIndex = Math.min(activeIndex + 1, itemsEls.length - 1);
      itemsEls[activeIndex]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      itemsEls[activeIndex]?.focus();
    } else if (e.key === "Enter") {
      if (
        document.activeElement &&
        document.activeElement.classList.contains("autocomplete-item")
      ) {
        document.activeElement.click();
        e.preventDefault();
      }
    } else if (e.key === "Escape") {
      list.style.display = "none";
    }
  });

  // fechar ao clicar fora
  document.addEventListener("click", function (e) {
    if (!input.contains(e.target) && !list.contains(e.target)) {
      list.style.display = "none";
    }
  });

  input.dataset.autocomplete = "true";
}

// small debounce helper
function debounce(fn, wait) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function adicionarItem() {
  const item = {
    id: Date.now(),
    numero: itemCounter++,
    codigo: "",
    descricao: "",
    validade: "",
    quantidade: 1,
    fator: 1,
    entEstoque: 1,
    unitario: 0,
    totalBruto: 0,
    totalAquisicao: 0,
  };

  itensEntrada.push(item);
  renderizarItens();
  calcularTotais();

  // Salvar rascunho automaticamente após adicionar item
  setTimeout(() => {
    try {
      salvarRascunhoSilencioso();
    } catch (e) {
      console.debug("Erro ao autosave após adicionar item:", e);
    }
  }, 500);
}

function renderizarItens() {
  const tbody = document.getElementById("itemsTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (itensEntrada.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="10" style="text-align:center;color:#999;padding:20px;">Nenhum item adicionado</td></tr>';
    return;
  }

  console.log("📋 Renderizando", itensEntrada.length, "itens:");
  itensEntrada.forEach((item, idx) => {
    console.log(`  Item ${idx + 1}:`, {
      id: item.id,
      codigo: item.codigo,
      descricao: item.descricao?.substring(0, 30),
      validade: item.validade,
      matchedId: item.matchedId,
      matched: item.matched,
      "TEM MATCH?": !!(item.matchedId || item.matched),
    });
  });

  itensEntrada.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>${item.numero}</td>
            <td><input type="text" value="${item.codigo || ""}" data-id="${item.id}" data-field="codigo" class="input-readonly" readonly style="width:80px;padding:4px;border:1px solid #dee2e6;border-radius:4px;" /></td>
            <td><input type="text" value="${item.descricao || ""}" data-id="${item.id}" data-field="descricao" style="width:150px;padding:4px;border:1px solid #dee2e6;border-radius:4px;" /></td>
            <td><input type="date" value="${item.validade || ""}" data-id="${item.id}" data-field="validade" style="width:130px;padding:4px;border:1px solid #dee2e6;border-radius:4px;" /></td>
            <td><input type="number" value="${item.quantidade || ""}" data-id="${item.id}" data-field="quantidade" style="width:80px;padding:4px;border:1px solid #dee2e6;border-radius:4px;" step="0.01" /></td>
            <td><input type="number" value="${item.fator || ""}" data-id="${item.id}" data-field="fator" style="width:60px;padding:4px;border:1px solid #dee2e6;border-radius:4px;" step="0.01" /></td>
            <td><input type="number" value="${item.entEstoque || ""}" data-id="${item.id}" data-field="entEstoque" style="width:80px;padding:4px;border:1px solid #dee2e6;border-radius:4px;" step="0.01" /></td>
            <td><input type="number" value="${item.unitario || ""}" data-id="${item.id}" data-field="unitario" style="width:90px;padding:4px;border:1px solid #dee2e6;border-radius:4px;" step="0.01" /></td>
            <td>${formatarMoeda(item.totalBruto)}</td>
            <td>${formatarMoeda(item.totalAquisicao)}</td>
            <td style="width:56px;text-align:center;"><button type="button" class="item-remove-btn" data-id="${item.id}" title="Remover item">×</button></td>
        `;
    tbody.appendChild(tr);
  });

  // Adicionar event listeners aos inputs
  tbody.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", (e) => {
      const id = parseInt(e.target.dataset.id);
      const field = e.target.dataset.field;
      const value = e.target.value;
      try {
        __editingState = {
          id,
          field,
          selStart: e.target.selectionStart,
          selEnd: e.target.selectionEnd,
          value: e.target.value,
        };
      } catch (err) {
        __editingState = { id, field, value: e.target.value };
      }
      atualizarItem(id, field, value);
    });
  });

  // após renderizar todos os inputs, tentar restaurar foco/seleção se havia edição em andamento
  try {
    if (__editingState) {
      const restoring = __editingState;
      // procurar o input correspondente
      const selector = `input[data-id="${restoring.id}"][data-field="${restoring.field}"]`;
      const newInput = tbody.querySelector(selector);
      if (newInput) {
        newInput.focus();
        // restaurar valor (já definido) e seleção
        if (
          typeof restoring.selStart === "number" &&
          typeof restoring.selEnd === "number"
        ) {
          try {
            newInput.selectionStart = restoring.selStart;
            newInput.selectionEnd = restoring.selEnd;
          } catch (e) {}
        }
      }
      __editingState = null;
    }
  } catch (err) {
    console.warn("Erro ao restaurar foco de edição", err);
  }

  // garantir autocomplete em campos descrição (delegação via tbody)
  const descricaoInputs = tbody.querySelectorAll(
    'input[data-field="descricao"]',
  );
  descricaoInputs.forEach((inp) => {
    // evitar múltiplos listeners
    if (inp.dataset.descConfigured === "true") return;
    inp.dataset.descConfigured = "true";

    // Antes de criar, remover qualquer dropdown antigo deste input (evitar instâncias órfãs)
    try {
      const ownerId = inp.dataset.id || String(Date.now());
      const existing = document.querySelector(
        '.autocomplete-list[data-autocomplete-owner="' + ownerId + '"]',
      );
      if (existing) existing.remove();
    } catch (e) {
      /* ignore */
    }

    // criar container dropdown por input (posicionado absolute no body)
    let dropdown = document.createElement("div");
    dropdown.className = "autocomplete-list";
    dropdown.setAttribute("data-autocomplete-owner", inp.dataset.id || "");
    // usar absolute + coordenadas com scroll para evitar problemas de transform/stacking
    dropdown.style.position = "absolute";
    dropdown.style.display = "none";
    dropdown.style.zIndex = 2600;
    dropdown.style.boxSizing = "border-box";
    dropdown.style.willChange = "transform, top, left";
    document.body.appendChild(dropdown);

    const debounced = debounce(async function (q) {
      console.debug("[autocomplete] query:", q, "for input id", inp.dataset.id);
      if (!q) {
        dropdown.style.display = "none";
        return;
      }
      try {
        const res = await fetch("/api/itens?q=" + encodeURIComponent(q));
        if (!res.ok) {
          console.warn("[autocomplete] fetch non-ok", res.status);
          dropdown.style.display = "none";
          return;
        }
        const data = await res.json();
        console.debug(
          "[autocomplete] results count:",
          Array.isArray(data) ? data.length : 0,
        );
        // render
        dropdown.innerHTML = "";
        const top = document.createElement("div");
        top.className = "autocomplete-topline";
        dropdown.appendChild(top);
        (data || []).slice(0, 20).forEach((p, idx) => {
          const it = document.createElement("div");
          it.className = "autocomplete-item";
          it.dataset.id = p.id;
          it.dataset.idx = idx;
          it.innerHTML =
            `<div>${escapeHtml(p.nome || p.descricao || "")}</div>` +
            (p.codigo
              ? `<div class="autocomplete-sub">${escapeHtml(p.codigo)}</div>`
              : "");
          it.addEventListener("click", function (ev) {
            ev.stopPropagation();
            selectProduto(p, inp, dropdown);
          });
          dropdown.appendChild(it);
        });
        // position dropdown below input (convert viewport coords to page coords)
        const r = inp.getBoundingClientRect();
        const pageLeft = r.left + (window.scrollX || window.pageXOffset || 0);
        const pageTop =
          r.bottom + (window.scrollY || window.pageYOffset || 0) + 6;
        // ajustar largura para não sair da viewport
        const preferredWidth = Math.max(r.width, 220);
        const maxAvailable = Math.max(window.innerWidth - pageLeft - 12, 120);
        const finalWidth = Math.min(preferredWidth, maxAvailable);
        dropdown.style.left = pageLeft + "px";
        dropdown.style.top = pageTop + "px";
        dropdown.style.width = finalWidth + "px";
        dropdown.style.display =
          dropdown.children.length > 0 ? "block" : "none";
        // força repaint para evitar ficar preso no canto
        dropdown.getBoundingClientRect();
      } catch (err) {
        console.warn("erro itens autocomplete", err);
        dropdown.style.display = "none";
      }
    }, 250);

    inp.addEventListener("input", function (e) {
      debounced(this.value.trim());
    });
    inp.addEventListener("focus", function (e) {
      if (this.value.trim()) debounced(this.value.trim());
    });
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        dropdown.style.display = "none";
      }
    });

    // fechar ao clicar fora
    document.addEventListener("click", function (ev) {
      if (!dropdown.contains(ev.target) && ev.target !== inp) {
        dropdown.style.display = "none";
      }
    });
  });

  // adicionar listeners aos botões de remover item
  try {
    const removeBtns = tbody.querySelectorAll(".item-remove-btn");
    removeBtns.forEach((btn) => {
      if (btn.dataset.removeConfigured === "true") return;
      btn.dataset.removeConfigured = "true";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const id = this.dataset.id;
        if (id) {
          removerItem(id);
        }
      });
    });
  } catch (e) {
    console.warn("Erro ao configurar botões remover", e);
  }
}

function removerItem(id) {
  const numericId = parseInt(id, 10);
  itensEntrada = itensEntrada.filter((i) => i.id !== numericId);
  // Sincronizar window.itensEntrada após filtrar (evita referência obsoleta)
  window.itensEntrada = itensEntrada;
  // recalcular numeracao sequencial
  let counter = 1;
  itensEntrada.forEach((i) => {
    i.numero = counter++;
  });
  itemCounter = counter;
  renderizarItens();
  calcularTotais();
}

function selectProduto(produto, inputEl, dropdownEl) {
  // preencher input e atualizar item correspondente
  inputEl.value = produto.nome || produto.descricao || "";
  const id = parseInt(inputEl.dataset.id);
  // encontrar no array de itensEntrada e atualizar campos básicos
  const item = itensEntrada.find((i) => i.id === id);
  if (item) {
    item.codigo = produto.codigo || "";
    item.descricao = produto.nome || produto.descricao || "";
    item.unitario = Number(produto.preco) || item.unitario || 0;
    item.totalBruto = item.quantidade * item.unitario;
    item.totalAquisicao = item.totalBruto;
    renderizarItens();
    calcularTotais();
  }
  dropdownEl.style.display = "none";
}

// debounce helper (used locally too)
function debounce(fn, wait) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function atualizarItem(id, field, value) {
  const item = itensEntrada.find((i) => i.id === id);
  if (!item) return;
  // Atualizar valor no modelo. Para o campo 'descricao' NÃO re-renderizamos a tabela
  // durante a digitação — isso evita que o input seja recriado e o dropdown desapareça.
  if (["quantidade", "fator", "entEstoque", "unitario"].includes(field)) {
    item[field] = parseFloat(value) || 0;
    // Recalcular totais do item
    item.totalBruto = item.quantidade * item.unitario;
    item.totalAquisicao = item.totalBruto; // Simplificado
    // Para alterações numéricas que afetam totais, re-renderizamos para manter a UI consistente
    renderizarItens();
    calcularTotais();
  } else {
    // Para campos textuais (como descricao, codigo), apenas atualizar o modelo sem re-render
    item[field] = value;

    // Se for validade, sincronizar imediatamente com o produto (se tiver matchedId)
    if (field === "validade") {
      const prodId = item.matchedId || item.matched || null;
      console.log("🔍 TENTANDO SINCRONIZAR VALIDADE:", {
        itemId: item.id,
        itemCodigo: item.codigo,
        itemDescricao: item.descricao?.substring(0, 30),
        matchedId: item.matchedId,
        matched: item.matched,
        prodId: prodId,
        value: value,
        "TEM PROD ID?": !!prodId,
        "TEM VALUE?": !!value,
      });

      if (prodId && value) {
        // Normalizar data para ISO YYYY-MM-DD
        const normalize = (s) => {
          if (!s) return null;
          if (typeof s === "string" && s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;
          const m = String(s)
            .trim()
            .match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
          if (m) return `${m[3]}-${m[2]}-${m[1]}`;
          const d = new Date(s);
          if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
          return null;
        };
        const iso = normalize(value);
        console.log("📅 Data normalizada:", { original: value, iso: iso });

        if (iso) {
          console.log(
            "🔄 Sincronizando validade para produto",
            prodId,
            "valor:",
            iso,
          );
          fetch(`/api/itens/${encodeURIComponent(prodId)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ validade: iso }),
          })
            .then(async (resp) => {
              if (resp.ok) {
                console.log("✅ Validade atualizada no produto", prodId);
              } else {
                const txt = await resp.text().catch(() => "");
                console.warn(
                  "⚠️ Falha ao atualizar validade:",
                  resp.status,
                  txt,
                );
              }
            })
            .catch((err) =>
              console.warn("❌ Erro ao sincronizar validade:", err),
            );
        } else {
          console.warn("⚠️ Não foi possível normalizar a data:", value);
        }
      } else {
        console.warn(
          "⚠️ Sincronização não realizada:",
          prodId ? "sem valor" : "sem matchedId",
        );
      }
    }
  }
}

function calcularTotais() {
  const totalProdutos = itensEntrada.reduce(
    (sum, item) => sum + item.totalBruto,
    0,
  );

  const desconto = parseFloat(document.getElementById("desconto")?.value) || 0;
  const seguro = parseFloat(document.getElementById("seguro")?.value) || 0;
  const despesa = parseFloat(document.getElementById("despesa")?.value) || 0;
  const icmsST = parseFloat(document.getElementById("icmsST")?.value) || 0;
  const frete = parseFloat(document.getElementById("frete")?.value) || 0;
  const ipi = parseFloat(document.getElementById("ipi")?.value) || 0;
  const despesaExtra =
    parseFloat(document.getElementById("despesaExtra")?.value) || 0;

  const valorTotal =
    totalProdutos -
    desconto +
    seguro +
    despesa +
    icmsST +
    frete +
    ipi +
    despesaExtra;

  const totalProdutosEl = document.getElementById("totalProdutos");
  const valorTotalEl = document.getElementById("valorTotal");
  if (totalProdutosEl) totalProdutosEl.value = formatarMoeda(totalProdutos);
  if (valorTotalEl) valorTotalEl.value = formatarMoeda(valorTotal);
}

// Verifica se existe uma entrada importada (sessionStorage) e popula o formulário
function checkAndPopulateImportedEntrada() {
  try {
    const raw = sessionStorage.getItem("entradaImported");
    if (!raw) return;
    let data = null;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.warn("entradaImported JSON parse failed", e);
      return;
    }
    if (!data) return;
    populateFromImported(data);
    // manter `entradaImported` na sessão para que a listagem possa exibir a nota
    // (não removemos aqui; será limpa apenas quando o usuário finalizar ou explicitamente descartar)
    showSimpleToast("XML importado: formulário preenchido");
  } catch (e) {
    console.warn("checkAndPopulateImportedEntrada error", e);
  }
}

// Verifica se há uma entrada sendo editada e popula o formulário
function checkAndPopulateDraft() {
  try {
    const raw = sessionStorage.getItem("editingEntrada");
    if (!raw) return;

    let entrada = null;
    try {
      entrada = JSON.parse(raw);
    } catch (e) {
      console.warn("editingEntrada JSON parse failed", e);
      return;
    }

    if (!entrada) return;

    console.log("📝 Restaurando entrada no formulário:", entrada);

    // Salvar ID da entrada para atualizações
    if (entrada.id) {
      window.currentEntradaId = entrada.id;
    }

    // Popular campos básicos
    if (entrada.fornecedor && document.getElementById("fornecedor")) {
      const fEl = document.getElementById("fornecedor");
      const fIdEl = document.getElementById("fornecedorId");
      try {
        if (typeof entrada.fornecedor === "string") {
          // pode ser um nome simples ou uma string JSON serializada
          try {
            const parsed = JSON.parse(entrada.fornecedor);
            if (parsed && typeof parsed === "object") {
              fEl.value = parsed.nome || parsed.xNome || JSON.stringify(parsed);
              if (fIdEl && parsed.id) fIdEl.value = parsed.id;
            } else {
              fEl.value = entrada.fornecedor;
            }
          } catch (e) {
            fEl.value = entrada.fornecedor;
          }
        } else if (typeof entrada.fornecedor === "object") {
          fEl.value = entrada.fornecedor.nome || entrada.fornecedor.xNome || "";
          if (fIdEl && entrada.fornecedor.id)
            fIdEl.value = entrada.fornecedor.id;
        } else {
          fEl.value = String(entrada.fornecedor);
        }
      } catch (e) {
        console.warn("Erro ao aplicar fornecedor:", e);
        document.getElementById("fornecedor").value = entrada.fornecedor;
      }
    }
    if (entrada.numero && document.getElementById("numero")) {
      document.getElementById("numero").value = entrada.numero;
    }
    if (entrada.serie && document.getElementById("serie")) {
      document.getElementById("serie").value = entrada.serie;
    }
    if (entrada.dataEmissao && document.getElementById("dataEmissao")) {
      document.getElementById("dataEmissao").value =
        entrada.dataEmissao.split("T")[0] || entrada.dataEmissao;
    }
    if (entrada.dataEntrada && document.getElementById("dataEntrada")) {
      document.getElementById("dataEntrada").value =
        entrada.dataEntrada.split("T")[0] || entrada.dataEntrada;
    }
    if (entrada.chaveAcesso && document.getElementById("chaveAcesso")) {
      document.getElementById("chaveAcesso").value = entrada.chaveAcesso;
    }
    if (entrada.centroResultado && document.getElementById("centroResultado")) {
      document.getElementById("centroResultado").value =
        entrada.centroResultado;
    }
    if (
      entrada.categoriaFinanceira &&
      document.getElementById("categoriaFinanceira")
    ) {
      document.getElementById("categoriaFinanceira").value =
        entrada.categoriaFinanceira;
    }

    // Restaurar itens
    if (
      entrada.itens &&
      Array.isArray(entrada.itens) &&
      entrada.itens.length > 0
    ) {
      let _num = 1;
      itensEntrada = entrada.itens.map((it) => {
        const quantidade = Number(it.quantidade || it.qCom || 0) || 0;
        const unitario = Number(it.unitario || it.vUnCom || it.preco || 0) || 0;
        const total =
          Number(it.totalBruto || it.total || it.vProd || 0) ||
          quantidade * unitario ||
          0;
        return {
          ...it,
          id: it.id || Date.now() + _num,
          numero: it.numero || _num,
          quantidade: quantidade,
          unitario: unitario,
          fator: Number(it.fator) || 1,
          entEstoque: Number(it.entEstoque) || quantidade,
          totalBruto: total,
          totalAquisicao: Number(it.totalAquisicao) || total,
          validade:
            normalizeDateToISO(
              it.validade || it.dataValidade || it.dVenc || "",
            ) || "",
        };
      });
      let _c = 1;
      itensEntrada.forEach((i) => {
        i.numero = _c++;
      });
      itemCounter = _c;
      window.itensEntrada = itensEntrada;
      renderizarItens();
      calcularTotais();
    }

    // Limpar sessionStorage para não popular novamente
    sessionStorage.removeItem("editingEntrada");

    showSimpleToast("Entrada restaurada para edição");
  } catch (e) {
    console.warn("checkAndPopulateDraft error", e);
  }
}

// Popula o formulário a partir de um objeto de entrada (sem usar sessionStorage)
function applyDraftData(entrada) {
  try {
    if (!entrada) return;
    console.log(
      "📝 Aplicando dados da entrada (servidor) no formulário:",
      entrada,
    );
    // Salvar ID da entrada para futuras atualizações
    if (entrada.id) {
      window.currentEntradaId = entrada.id;
    }

    if (entrada.fornecedor && document.getElementById("fornecedor")) {
      document.getElementById("fornecedor").value = entrada.fornecedor;
    }
    if (entrada.numero && document.getElementById("numero")) {
      document.getElementById("numero").value = entrada.numero;
    }
    if (entrada.serie && document.getElementById("serie")) {
      document.getElementById("serie").value = entrada.serie;
    }
    if (entrada.dataEmissao && document.getElementById("dataEmissao")) {
      document.getElementById("dataEmissao").value =
        entrada.dataEmissao.split("T")[0] || entrada.dataEmissao;
    }
    if (entrada.dataEntrada && document.getElementById("dataEntrada")) {
      document.getElementById("dataEntrada").value =
        entrada.dataEntrada.split("T")[0] || entrada.dataEntrada;
    }
    if (entrada.chaveAcesso && document.getElementById("chaveAcesso")) {
      document.getElementById("chaveAcesso").value = entrada.chaveAcesso;
    }
    if (entrada.centroResultado && document.getElementById("centroResultado")) {
      document.getElementById("centroResultado").value =
        entrada.centroResultado;
    }
    if (
      entrada.categoriaFinanceira &&
      document.getElementById("categoriaFinanceira")
    ) {
      document.getElementById("categoriaFinanceira").value =
        entrada.categoriaFinanceira;
    }

    // Normalizar itens: suportar tanto 'itens' quanto 'items'
    const rawItens =
      entrada.itens && Array.isArray(entrada.itens) && entrada.itens.length > 0
        ? entrada.itens
        : entrada.items &&
            Array.isArray(entrada.items) &&
            entrada.items.length > 0
          ? entrada.items
          : typeof entrada.itens === "string"
            ? (function () {
                try {
                  const p = JSON.parse(entrada.itens);
                  return Array.isArray(p) ? p : [];
                } catch (e) {
                  return [];
                }
              })()
            : [];
    if (rawItens.length > 0) {
      // Normalizar validade e garantir id/numero em cada item
      let _num = 1;
      itensEntrada = rawItens.map((it) => {
        const quantidade = Number(it.quantidade || it.qCom || 0) || 0;
        const unitario = Number(it.unitario || it.vUnCom || it.preco || 0) || 0;
        const total =
          Number(it.totalBruto || it.total || it.vProd || 0) ||
          quantidade * unitario ||
          0;
        return {
          ...it,
          id: it.id || Date.now() + _num,
          numero: it.numero || _num,
          quantidade: quantidade,
          unitario: unitario,
          fator: Number(it.fator) || 1,
          entEstoque: Number(it.entEstoque) || quantidade,
          totalBruto: total,
          totalAquisicao: Number(it.totalAquisicao) || total,
          validade:
            normalizeDateToISO(
              it.validade || it.dataValidade || it.dVenc || "",
            ) || "",
        };
      });
      // Recalcular numeração sequencial e itemCounter
      let _c = 1;
      itensEntrada.forEach((i) => {
        i.numero = _c++;
      });
      itemCounter = _c;
      window.itensEntrada = itensEntrada;
      renderizarItens();
      calcularTotais();
    }

    // Recalcular totais a partir dos itens (não usar valores salvos no DB que podem estar zerados)
    // calcularTotais() já foi chamado acima após renderizarItens()

    showSimpleToast("Entrada carregada do servidor");
  } catch (e) {
    console.warn("applyDraftData error", e);
  }
}

function populateFromImported(obj) {
  try {
    if (obj.fornecedor) {
      const fEl = document.getElementById("fornecedor");
      const fIdEl = document.getElementById("fornecedorId");
      if (fEl) fEl.value = obj.fornecedor.nome || obj.fornecedor.xNome || "";
      if (fIdEl && obj.fornecedor.id) fIdEl.value = obj.fornecedor.id;
    }
    if (obj.numero && document.getElementById("numero"))
      document.getElementById("numero").value = obj.numero;
    if (obj.serie && document.getElementById("serie"))
      document.getElementById("serie").value = obj.serie;
    if (obj.dataEmissao && document.getElementById("dataEmissao"))
      document.getElementById("dataEmissao").value =
        obj.dataEmissao.split("T")[0] || obj.dataEmissao;
    if (obj.chaveAcesso && document.getElementById("chaveAcesso"))
      document.getElementById("chaveAcesso").value = obj.chaveAcesso;

    // itens
    if (Array.isArray(obj.items) && obj.items.length > 0) {
      itensEntrada = [];
      itemCounter = 1;
      obj.items.forEach((it, idx) => {
        const quantidade = Number(it.quantidade) || Number(it.qCom) || 0;
        const unitario =
          Number(it.unitario) ||
          Number(it.vUnCom) ||
          Number(it.vUnit) ||
          Number(it.preco) ||
          0;
        const total =
          Number(it.total) || Number(it.vProd) || quantidade * unitario || 0;
        // normalizar validade para formato YYYY-MM-DD usado por <input type="date">
        const validadeRaw =
          it.validade || it.dVenc || it.dVal || it.dataValidade || "";
        const validadeISO = normalizeDateToISO(validadeRaw);

        const item = {
          id: Date.now() + idx,
          numero: itemCounter++,
          codigo: it.codigo || it.cProd || "",
          descricao: it.descricao || it.xProd || "",
          validade: validadeISO || "",
          quantidade: quantidade,
          fator: 1,
          entEstoque: quantidade,
          unitario: unitario,
          totalBruto: total,
          totalAquisicao: total,
        };
        itensEntrada.push(item);
      });
      // Sincronizar window.itensEntrada após popular (evita referência obsoleta)
      window.itensEntrada = itensEntrada;
      renderizarItens();
      calcularTotais();
    }
    // totais se fornecidos
    if (obj.totals) {
      if (document.getElementById("totalProdutos"))
        document.getElementById("totalProdutos").value = formatarMoeda(
          Number(obj.totals.vProd || 0),
        );
      if (document.getElementById("valorTotal"))
        document.getElementById("valorTotal").value = formatarMoeda(
          Number(obj.totals.vNF || obj.totals.vProd || 0),
        );
    }
  } catch (e) {
    console.warn("populateFromImported error", e);
  }
}

// Converte várias formas de data (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, timestamps) para YYYY-MM-DD
// Valida se uma data ISO YYYY-MM-DD é plausível (mês 1-12, dia 1-31, ano 2000-2099)
function isPlausibleDate(iso) {
  if (!iso || iso.length < 10) return false;
  const y = parseInt(iso.substring(0, 4), 10);
  const m = parseInt(iso.substring(5, 7), 10);
  const d = parseInt(iso.substring(8, 10), 10);
  return y >= 2000 && y <= 2099 && m >= 1 && m <= 12 && d >= 1 && d <= 31;
}

function normalizeDateToISO(s) {
  if (!s) return "";
  s = String(s).trim();
  let result = "";
  // já no formato ISO (YYYY-MM-DD) — pode estar dentro de texto maior
  const isoMatch = s.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    result = isoMatch[1];
    if (isPlausibleDate(result)) return result;
  }
  // formato DD/MM/YYYY ou DD-MM-YYYY — pode estar dentro de texto maior
  const dmy = s.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (dmy) {
    const [_, d, m, y] = dmy;
    result = `${y}-${m}-${d}`;
    if (isPlausibleDate(result)) return result;
  }
  // formato parcial MM/YYYY (comum em rações: "VAL 07/2026") — assume dia 01
  const mmyyyy = s.match(/(\d{2})[\/\-](\d{4})/);
  if (mmyyyy) {
    const [_, m, y] = mmyyyy;
    result = `${y}-${m}-01`;
    if (isPlausibleDate(result)) return result;
  }
  // tentar interpretar como timestamp ou Date parse
  const parsed = Date.parse(s);
  if (!isNaN(parsed)) {
    const dt = new Date(parsed);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    result = `${yyyy}-${mm}-${dd}`;
    if (isPlausibleDate(result)) return result;
  }
  return "";
}

// toast simples
function showSimpleToast(message) {
  try {
    let c = document.querySelector(".entrada-toast-container");
    if (!c) {
      c = document.createElement("div");
      c.className = "entrada-toast-container";
      c.style.position = "fixed";
      c.style.top = "18px";
      c.style.right = "18px";
      c.style.zIndex = "99999";
      document.body.appendChild(c);
    }
    const t = document.createElement("div");
    t.className = "entrada-toast";
    t.textContent = message;
    t.style.background = "#ffe58a";
    t.style.color = "#222";
    t.style.padding = "10px 14px";
    t.style.borderRadius = "8px";
    t.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
    t.style.marginTop = "8px";
    t.style.opacity = "0";
    t.style.transition = "opacity .18s,transform .18s";
    c.appendChild(t);
    requestAnimationFrame(() => {
      t.style.opacity = "1";
      t.style.transform = "none";
    });
    setTimeout(() => {
      t.style.opacity = "0";
      setTimeout(() => {
        try {
          t.remove();
        } catch (e) {}
      }, 220);
    }, 5000);
  } catch (e) {
    console.warn("showSimpleToast error", e);
  }
}

// -------------------------
// Dropdowns: Centro de Resultado + Categoria Financeira (typeahead)
// -------------------------
async function fetchCentroResultadosEntrada() {
  try {
    if (typeof ApiClient !== "undefined" && ApiClient.getCentrosResultado) {
      const resp = await ApiClient.getCentrosResultado();
      if (!Array.isArray(resp)) return [];
      return resp
        .map((c) => ({
          descricao: c.descricao || c.display || c.name || "",
          unidade: c.unidade || c.unidadeNegocio || c.unidade_negocio || "",
        }))
        .filter((x) => x.descricao);
    }
  } catch (e) {
    console.warn("fetchCentroResultadosEntrada api error", e);
  }
  // fallback para endpoint REST
  try {
    const r = await fetch("/api/centros");
    if (!r.ok) return [];
    const data = await r.json();
    if (!Array.isArray(data)) return [];
    return data
      .map((c) => ({
        descricao: c.descricao || c.name || "",
        unidade: c.unidade || "",
      }))
      .filter((x) => x.descricao);
  } catch (e) {
    console.warn("fetchCentroResultadosEntrada fallback error", e);
    return [];
  }
}

function configurarDropdownCentroResultado() {
  const input = document.getElementById("centroResultado");
  if (!input) return;
  let wrapper = input.closest(".input-with-icon") || input.parentElement;
  if (!wrapper.classList.contains("select-wrapper")) {
    const wrap = document.createElement("div");
    wrap.className = "select-wrapper";
    try {
      wrapper.replaceChild(wrap, input);
      wrap.appendChild(input);
      wrapper = wrap;
    } catch (e) {
      wrapper = input.parentElement;
    }
  }
  try {
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
  } catch (e) {}

  let dropdown = null;
  let cached = null;
  let suppressOpen = false;
  input.addEventListener("focus", showDropdown);
  input.addEventListener("click", showDropdown);
  input.addEventListener("input", function () {
    const q = (input.value || "").toLowerCase().trim();
    if (!cached) return;
    const filtered = cached.filter(
      (it) =>
        (it.descricao || "").toLowerCase().includes(q) ||
        (it.unidade || "").toLowerCase().includes(q),
    );
    renderFiltered(filtered);
  });

  function renderFiltered(items) {
    if (!dropdown) {
      dropdown = document.createElement("div");
      dropdown.className = "select-dropdown";
      // ensure absolute positioning and scrolling inside the dropdown
      dropdown.style.position = "absolute";
      dropdown.style.boxSizing = "border-box";
      dropdown.style.maxHeight = "260px";
      dropdown.style.overflowY = "auto";
      dropdown.style.overflowX = "hidden";
      dropdown.style.zIndex = "2147483647";
      dropdown.style.background = "#fff";
      dropdown.style.border = "1px solid rgba(0,0,0,0.08)";
      dropdown.style.borderRadius = "6px";
      dropdown.style.boxShadow = "0 8px 24px rgba(19,24,28,0.12)";
      // append to body so absolute page coordinates work reliably
      document.body.appendChild(dropdown);
    }
    dropdown.innerHTML = "";
    if (!items || items.length === 0) {
      const el = document.createElement("div");
      el.className = "select-item no-results";
      el.textContent = "Nenhum resultado";
      dropdown.appendChild(el);
      return;
    }
    items.forEach((it) => {
      const el = document.createElement("div");
      el.className = "select-item";
      el.textContent = (it.unidade ? it.unidade + " - " : "") + it.descricao;
      el.addEventListener("click", () => {
        input.value = it.descricao;
        close();
        try {
          input.blur();
        } catch (e) {}
      });
      dropdown.appendChild(el);
    });
    // position the dropdown relative to the page so it doesn't stretch the document
    const rect = input.getBoundingClientRect();
    const pageLeft = rect.left + (window.scrollX || window.pageXOffset || 0);
    const pageTop =
      rect.bottom + (window.scrollY || window.pageYOffset || 0) + 6;
    dropdown.style.left = pageLeft + "px";
    dropdown.style.top = pageTop + "px";
    dropdown.style.minWidth = input.offsetWidth + "px";
  }

  function showDropdown(e) {
    try {
      if (e && e.stopPropagation) e.stopPropagation();
    } catch (e) {}
    if (suppressOpen || dropdown) return;
    if (cached) {
      renderFiltered(cached);
      return;
    }
    fetchCentroResultadosEntrada()
      .then((items) => {
        cached = items || [];
        renderFiltered(cached);
      })
      .catch(() => {});
  }
  function close() {
    if (dropdown && dropdown.parentElement)
      dropdown.parentElement.removeChild(dropdown);
    dropdown = null;
    suppressOpen = true;
    setTimeout(() => {
      suppressOpen = false;
    }, 120);
  }
  document.addEventListener("click", function (e) {
    try {
      if (
        dropdown &&
        (wrapper.contains(e.target) || dropdown.contains(e.target))
      )
        return;
    } catch (err) {}
    close();
  });
}

async function fetchCategoriaFinanceiras() {
  try {
    // tentar API caso exista
    if (typeof ApiClient !== "undefined" && ApiClient.getCategoriaFinanceira) {
      const list = await ApiClient.getCategoriaFinanceira();
      if (Array.isArray(list))
        return list
          .map((c) => ({ descricao: c.descricao || c.name || "" }))
          .filter((x) => x.descricao);
    }
  } catch (e) {
    console.debug("fetchCategoriaFinanceiras api error", e);
  }
  // fallback: ler página de configuração e extrair tabela (tenta caminhos relativos corretos)
  try {
    let html = null;
    const candidates = [
      "../configuracoes/categoria-financeira.html",
      "./configuracoes/categoria-financeira.html",
      "/configuracoes/categoria-financeira.html",
    ];
    let loadedFrom = null;
    for (const url of candidates) {
      try {
        const r = await fetch(url);
        if (!r.ok) {
          console.debug(
            "fetchCategoriaFinanceiras: fallback url not ok",
            url,
            r.status,
          );
          continue;
        }
        html = await r.text();
        loadedFrom = url;
        break;
      } catch (e) {
        console.debug("fetchCategoriaFinanceiras: fetch error for", url, e);
      }
    }
    if (!html) {
      console.warn(
        "fetchCategoriaFinanceiras: none of the candidate urls returned HTML",
      );
      return [];
    }
    console.debug("fetchCategoriaFinanceiras: loaded HTML from", loadedFrom);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const rows = Array.from(
      doc.querySelectorAll(".categoria-financeira-table tbody tr"),
    );
    const items = rows
      .map((tr) => ({
        descricao: ((tr.cells[0] && tr.cells[0].textContent) || "")
          .toString()
          .trim(),
      }))
      .filter((x) => x.descricao);
    // dedupe
    const seen = new Set();
    const out = [];
    items.forEach((i) => {
      if (!seen.has(i.descricao)) {
        seen.add(i.descricao);
        out.push(i);
      }
    });
    return out;
  } catch (e) {
    console.warn("fetchCategoriaFinanceiras fallback error", e);
    return [];
  }
}

function configurarDropdownCategoriaFinanceira() {
  const input = document.getElementById("categoriaFinanceira");
  if (!input) return;
  let wrapper = input.closest(".input-with-icon") || input.parentElement;
  if (!wrapper.classList.contains("select-wrapper")) {
    const wrap = document.createElement("div");
    wrap.className = "select-wrapper";
    try {
      wrapper.replaceChild(wrap, input);
      wrap.appendChild(input);
      wrapper = wrap;
    } catch (e) {
      wrapper = input.parentElement;
    }
  }
  try {
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
  } catch (e) {}
  let dropdown = null;
  let cached = null;
  let suppressOpen = false;
  input.addEventListener("focus", showDropdown);
  input.addEventListener("click", showDropdown);
  input.addEventListener("input", function () {
    const q = (input.value || "").toLowerCase().trim();
    if (!cached) return;
    const filtered = cached.filter((it) =>
      (it.descricao || "").toLowerCase().includes(q),
    );
    renderFiltered(filtered);
  });

  function renderFiltered(items) {
    if (!dropdown) {
      dropdown = document.createElement("div");
      dropdown.className = "select-dropdown";
      dropdown.style.position = "absolute";
      dropdown.style.boxSizing = "border-box";
      dropdown.style.maxHeight = "260px";
      dropdown.style.overflowY = "auto";
      dropdown.style.overflowX = "hidden";
      dropdown.style.zIndex = "2147483647";
      dropdown.style.background = "#fff";
      dropdown.style.border = "1px solid rgba(0,0,0,0.08)";
      dropdown.style.borderRadius = "6px";
      dropdown.style.boxShadow = "0 8px 24px rgba(19,24,28,0.12)";
      // append to body so absolute page coordinates work reliably
      document.body.appendChild(dropdown);
    }
    dropdown.innerHTML = "";
    if (!items || items.length === 0) {
      const el = document.createElement("div");
      el.className = "select-item no-results";
      el.textContent = "Nenhum resultado";
      dropdown.appendChild(el);
      return;
    }
    items.forEach((it) => {
      const el = document.createElement("div");
      el.className = "select-item";
      el.textContent = it.descricao;
      el.addEventListener("click", () => {
        input.value = it.descricao;
        close();
        try {
          input.blur();
        } catch (e) {}
      });
      dropdown.appendChild(el);
    });
    const rect = input.getBoundingClientRect();
    const pageLeft = rect.left + (window.scrollX || window.pageXOffset || 0);
    const pageTop =
      rect.bottom + (window.scrollY || window.pageYOffset || 0) + 6;
    dropdown.style.left = pageLeft + "px";
    dropdown.style.top = pageTop + "px";
    dropdown.style.minWidth = input.offsetWidth + "px";
  }

  function showDropdown(e) {
    try {
      if (e && e.stopPropagation) e.stopPropagation();
    } catch (e) {}
    if (suppressOpen || dropdown) return;
    if (cached) {
      renderFiltered(cached);
      return;
    }
    fetchCategoriaFinanceiras()
      .then((items) => {
        cached = items || [];
        renderFiltered(cached);
      })
      .catch(() => {});
  }
  function close() {
    if (dropdown && dropdown.parentElement)
      dropdown.parentElement.removeChild(dropdown);
    dropdown = null;
    suppressOpen = true;
    setTimeout(() => {
      suppressOpen = false;
    }, 120);
  }
  document.addEventListener("click", function (e) {
    try {
      if (
        dropdown &&
        (wrapper.contains(e.target) || dropdown.contains(e.target))
      )
        return;
    } catch (err) {}
    close();
  });
}

function formatarMoeda(valor) {
  const num = Number(valor) || 0;
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function finalizarEntrada() {
  try {
    // Validações básicas
    const fornecedor = document.getElementById("fornecedor")?.value.trim();
    const numero = document.getElementById("numero")?.value.trim();
    const serie = document.getElementById("serie")?.value.trim();
    const dataEmissao = document.getElementById("dataEmissao")?.value;
    const dataEntrada = document.getElementById("dataEntrada")?.value;

    if (!fornecedor || !numero || !serie || !dataEmissao || !dataEntrada) {
      try {
        showErrorToast("Preencha todos os campos obrigatórios (*).");
      } catch (e) {
        alert("Preencha todos os campos obrigatórios (*).");
      }
      return;
    }

    if (itensEntrada.length === 0) {
      try {
        showErrorToast("Adicione ao menos um item à entrada.");
      } catch (e) {
        alert("Adicione ao menos um item à entrada.");
      }
      return;
    }

    const transportador =
      document.getElementById("transportador")?.value.trim() || "";
    const fretePorConta =
      document.getElementById("fretePorConta")?.value.trim() || "";

    const payload = {
      fornecedor,
      numero,
      serie,
      dataEmissao,
      dataEntrada,
      chaveAcesso: document.getElementById("chaveAcesso")?.value.trim() || "",
      transportador,
      fretePorConta,
      itens: itensEntrada,
      desconto: parseFloat(document.getElementById("desconto")?.value) || 0,
      seguro: parseFloat(document.getElementById("seguro")?.value) || 0,
      despesa: parseFloat(document.getElementById("despesa")?.value) || 0,
      icmsST: parseFloat(document.getElementById("icmsST")?.value) || 0,
      frete: parseFloat(document.getElementById("frete")?.value) || 0,
      ipi: parseFloat(document.getElementById("ipi")?.value) || 0,
      despesaExtra:
        parseFloat(document.getElementById("despesaExtra")?.value) || 0,
      totalProdutos: itensEntrada.reduce(
        (sum, item) => sum + (Number(item.totalBruto) || 0),
        0,
      ),
      valorTotal: (function () {
        // Calcular valor total a partir dos itens + taxas (evitar salvar 0 no banco)
        const tp = itensEntrada.reduce(
          (s, i) => s + (Number(i.totalBruto) || 0),
          0,
        );
        const desc =
          parseFloat(document.getElementById("desconto")?.value) || 0;
        const seg = parseFloat(document.getElementById("seguro")?.value) || 0;
        const desp = parseFloat(document.getElementById("despesa")?.value) || 0;
        const icms = parseFloat(document.getElementById("icmsST")?.value) || 0;
        const fr = parseFloat(document.getElementById("frete")?.value) || 0;
        const ip = parseFloat(document.getElementById("ipi")?.value) || 0;
        const de =
          parseFloat(document.getElementById("despesaExtra")?.value) || 0;
        return tp - desc + seg + desp + icms + fr + ip + de;
      })(),
      centroResultado:
        document.getElementById("centroResultado")?.value.trim() || "",
      categoriaFinanceira:
        document.getElementById("categoriaFinanceira")?.value.trim() || "",
    };
    // Quando finalizar, marcar situação como concluido
    payload.situacao = "concluido";

    // Usar PUT se já existe uma entrada (rascunho/XML carregado por ?id=), POST para entradas novas
    const entradaIdExistente = window.currentEntradaId;
    const fetchUrl = entradaIdExistente
      ? `/api/entrada/manual/${encodeURIComponent(entradaIdExistente)}`
      : "/api/entrada/manual";
    const fetchMethod = entradaIdExistente ? "PUT" : "POST";

    const res = await fetch(fetchUrl, {
      method: fetchMethod,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      try {
        showErrorToast(
          "Erro ao salvar entrada: " +
            (body && body.error ? body.error : res.statusText),
        );
      } catch (e) {
        alert(
          "Erro ao salvar entrada: " +
            (body && body.error ? body.error : res.statusText),
        );
      }
      return;
    }
    // Limpar ID da entrada atual
    window.currentEntradaId = null;
    // remover entradaImported da sessão se existir (já foi persistida no banco)
    try {
      sessionStorage.removeItem("entradaImported");
    } catch (e) {}

    // Se o servidor retornou o objeto criado (ou não retornou JSON), tentar criar itens em meus-itens
    try {
      // fallback: se body for null, construir um objeto a partir do payload e do header Location
      let created = body || null;
      if (!created) {
        try {
          const loc =
            res.headers && res.headers.get ? res.headers.get("Location") : null;
          const inferredId = loc ? loc.split("/").pop() : "tmp-" + Date.now();
          created = Object.assign({}, payload, { id: inferredId });
          console.warn(
            "finalizarEntrada: servidor não retornou JSON, usando payload como fallback (id:",
            inferredId,
            ")",
          );
        } catch (e) {
          created = Object.assign({}, payload, { id: "tmp-" + Date.now() });
        }
      }
      if (created && created.id) {
        // O backend já cria/atualiza produtos e estoque quando situacao = "concluido".
        // Aqui fazemos apenas fallback para itens sem matchedId caso o backend não tenha processado.
        const updatedIds = new Set(
          (created.updatedProducts || []).map((p) => String(p.id)),
        );
        for (const it of itensEntrada) {
          try {
            // Se o backend já processou este item (está em updatedProducts), pular
            if (it.matchedId && updatedIds.has(String(it.matchedId))) continue;

            const fatorVal = parseInt(it.fator || 1, 10) || 1;
            const qtdEstoque = parseInt(it.entEstoque || 0, 10) || 0;
            const qtdFinal =
              qtdEstoque ||
              Math.round(parseInt(it.quantidade || 0, 10) * fatorVal);

            if (it.matchedId) {
              // Produto existente — incrementar estoque (fallback se backend não fez)
              if (qtdFinal > 0) {
                await fetch(
                  "/api/itens/" + encodeURIComponent(it.matchedId) + "/estoque",
                  {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      quantidade: qtdFinal,
                      operacao: "adicionar",
                      dataAjuste:
                        created.dataEntrada || new Date().toISOString(),
                    }),
                  },
                );
              }
            } else {
              // Produto novo — criar no catálogo (fallback se backend não fez)
              const nomeItem = (it.descricao || it.nome || "").trim();
              if (!nomeItem) continue;
              await fetch("/api/itens", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  codigo: it.codigo || "",
                  nome: nomeItem,
                  preco: Number(it.unitario || it.preco || 0) || 0,
                  custoBase: Number(it.unitario || it.preco || 0) || 0,
                  ncm: it.ncm || it.NCM || "",
                  validade: it.validade || "",
                  estoqueAtual: qtdFinal,
                  fatorCompra: String(fatorVal),
                }),
              });
            }
          } catch (e) {
            console.warn("Erro processando item em meus-itens (fallback)", e);
          }
        }

        // Garantir que a entrada esteja com status 'concluido' no servidor
        try {
          if ((created.situacao || "").toLowerCase() !== "concluido") {
            await fetch(
              "/api/entrada/manual/" + encodeURIComponent(created.id),
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ situacao: "concluido" }),
              },
            );
          }
        } catch (e) {
          console.warn("Erro atualizando situacao da entrada", e);
        }
        // sinalizar para a listagem injetar/mostrar esta entrada ao voltar
        try {
          sessionStorage.setItem(
            "injectedSavedEntrada",
            JSON.stringify(created),
          );
        } catch (e) {
          console.warn("sessionStorage set failed", e);
        }
      }
    } catch (e) {
      console.warn("finalizarEntrada: pós-criação falhou", e);
    }

    // Garantir que o fornecedor esteja cadastrado no sistema
    try {
      const nomeFornecedor = (
        document.getElementById("fornecedor")?.value || ""
      ).trim();
      if (nomeFornecedor) {
        const checkRes = await fetch(
          "/api/fornecedores?q=" + encodeURIComponent(nomeFornecedor),
        );
        const checkData = checkRes.ok
          ? await checkRes.json().catch(() => [])
          : [];
        const jaExiste =
          Array.isArray(checkData) &&
          checkData.some(
            (f) =>
              (f.nome || "").toLowerCase() === nomeFornecedor.toLowerCase() ||
              (f.razaoSocial || "").toLowerCase() ===
                nomeFornecedor.toLowerCase(),
          );
        if (!jaExiste) {
          await fetch("/api/fornecedores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome: nomeFornecedor, ativo: true }),
          });
          console.log(
            "✅ Fornecedor cadastrado automaticamente:",
            nomeFornecedor,
          );
        }
      }
    } catch (e) {
      console.warn("Erro ao verificar/criar fornecedor", e);
    }

    try {
      showSuccessToast("Entrada manual salva com sucesso!");
      // Dar um pequeno atraso para o usuário ver o toast antes de navegar
      setTimeout(() => {
        window.location.href = "./entrada-mercadoria.html";
      }, 700);
    } catch (e) {
      alert("Entrada manual salva com sucesso!");
      window.location.href = "./entrada-mercadoria.html";
    }
  } catch (err) {
    console.error("Erro ao finalizar entrada:", err);
    try {
      showErrorToast(
        "Erro ao salvar entrada: " +
          (err && err.message ? err.message : String(err)),
      );
    } catch (e) {
      alert(
        "Erro ao salvar entrada: " +
          (err && err.message ? err.message : String(err)),
      );
    }
  }
}

async function excluirNota() {
  if (await confirmar("Tem certeza que deseja excluir esta nota?")) {
    // Excluir do banco de dados via API
    const entradaId =
      window.currentEntradaId ||
      new URLSearchParams(window.location.search).get("id");
    if (entradaId) {
      try {
        const res = await fetch(
          "/api/entrada/manual/" + encodeURIComponent(entradaId),
          {
            method: "DELETE",
          },
        );
        if (!res.ok) {
          console.warn("Excluir nota falhou:", res.status, res.statusText);
        } else {
          console.log("✅ Nota", entradaId, "excluída do banco");
        }
      } catch (e) {
        console.error("Erro ao excluir nota do banco:", e);
      }
    }
    // Limpar sessionStorage
    try {
      sessionStorage.removeItem("entradaImported");
      sessionStorage.removeItem("entradaImported_auto");
      sessionStorage.removeItem("editingEntrada");
      sessionStorage.removeItem("mappingSelections");
    } catch (e) {}
    // Limpar formulário
    itensEntrada = [];
    window.itensEntrada = itensEntrada;
    itemCounter = 1;
    window.currentEntradaId = null;
    renderizarItens();
    calcularTotais();
    if (document.getElementById("fornecedor"))
      document.getElementById("fornecedor").value = "";
    if (document.getElementById("numero"))
      document.getElementById("numero").value = "";
    if (document.getElementById("serie"))
      document.getElementById("serie").value = "";
    if (document.getElementById("dataEmissao"))
      document.getElementById("dataEmissao").value = "";
    if (document.getElementById("dataEntrada"))
      document.getElementById("dataEntrada").value = "";
    if (document.getElementById("chaveAcesso"))
      document.getElementById("chaveAcesso").value = "";
    if (document.getElementById("centroResultado"))
      document.getElementById("centroResultado").value = "";
    if (document.getElementById("categoriaFinanceira"))
      document.getElementById("categoriaFinanceira").value = "";
    showSimpleToast("Nota excluída com sucesso");
    // Redirecionar para a listagem
    setTimeout(() => {
      window.location.href = "./entrada-mercadoria.html";
    }, 800);
  }
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializarEntradaManual);
} else {
  // Se já carregou, inicializar imediatamente
  setTimeout(inicializarEntradaManual, 100);
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
          const elems2 = document.elementsFromPoint(tx, ty).map((e) => ({
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
