// Dashboard JavaScript
/* ========================================
   DASHBOARD JS - PET CRIA
   ======================================== */

// Verificação periódica de sessão — detecta encerramento pelo admin
// SÓ redireciona quando motivo === "sessao_encerrada" (admin encerrou explicitamente)
// Erros de rede, DB, inatividade ou 401 transientes NÃO causam redirect
(function () {
  const _API = (window.VPS_URL || "") + "/api";
  var _sessaoChecking = false;
  var _encerradasConsecutivas = 0;

  async function _verificarSessao() {
    if (_sessaoChecking) return;
    _sessaoChecking = true;
    try {
      const r = await fetch(_API + "/usuarios/sessao-ativa", {
        credentials: "include",
        cache: "no-store",
      });
      if (!r.ok) {
        // Erro HTTP (401, 500 etc) — não deslogar por erro transiente
        _encerradasConsecutivas = 0;
        return;
      }
      const data = await r.json().catch(() => null);
      // Só conta como encerramento se o motivo for explicitamente sessao_encerrada
      if (data && data.ativa === false && data.motivo === "sessao_encerrada") {
        _encerradasConsecutivas++;
      } else {
        _encerradasConsecutivas = 0;
      }
      if (_encerradasConsecutivas >= 2) {
        window.location.replace("/login/login.html");
      }
    } catch (_) {
      // erro de rede — não deslogar
    } finally {
      _sessaoChecking = false;
    }
  }

  // Iniciar polling após 30s (evita race condition na navegação entre páginas)
  // Intervalo de 20s: detecta encerramento em até ~70s (30s inicial + 2×20s)
  setTimeout(function () {
    setInterval(_verificarSessao, 20000);
  }, 30000);
})();

console.log("🚀 Dashboard.js carregado - versão debug");
console.log("📅 Timestamp:", new Date().toISOString());
console.log("🌐 Location:", window.location.href);

// Global flags to avoid concurrent refreshes and double-init
let isRefreshing = false;
let initialized = false;

// Helper delay
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  // Garantir itens fiscais no menu (Central Fiscal e Configuração Fiscal) — global
  garantirItensFiscaisNoMenu();

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
    });
  });

  // Inicializar o DashboardApp
  DashboardApp.init();

  // Atualizar dados a cada 30 segundos (só se não estiver atualizando)
  setInterval(() => {
    if (!isRefreshing) {
      DashboardApp.refreshAll();
    }
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

  // Remover href de itens que apenas abrem submenus para evitar que o
  // navegador exiba a URL na barra de status ao passar o mouse.
  try {
    document
      .querySelectorAll(".nav-item-with-submenu > .nav-item")
      .forEach(function (a) {
        try {
          if (a.hasAttribute("href")) {
            a.dataset._origHref = a.getAttribute("href");
            a.removeAttribute("href");
            a.setAttribute("role", "button");
            a.style.cursor = "pointer";
          }
        } catch (e) {}
      });
  } catch (e) {}

  // Remover também o href do item Marketing se existir (placeholder)
  try {
    document
      .querySelectorAll('.nav-item[href$="marketing.html"]')
      .forEach(function (a) {
        try {
          if (a.hasAttribute("href")) {
            a.dataset._origHref = a.getAttribute("href");
            a.removeAttribute("href");
            a.setAttribute("role", "button");
            a.style.cursor = "pointer";
          }
        } catch (e) {}
      });
  } catch (e) {}

  // Interceptar cliques em links que abrem o formulário de novo produto
  // e anexar o parâmetro `tipo` baseado no texto clicado (Produto/Serviço/Plano).
  try {
    document.querySelectorAll("a.submenu-item").forEach(function (a) {
      try {
        const href = a.getAttribute("href") || "";
        if (!href) return;
        if (href.indexOf("novo-produto.html") !== -1) {
          // evitar múltiplos handlers
          if (a.getAttribute("data-novo-tipo-listener") === "true") return;
          a.setAttribute("data-novo-tipo-listener", "true");
          a.addEventListener("click", function (ev) {
            try {
              ev.preventDefault();
              ev.stopPropagation();
              const txt = (a.textContent || "").toString().trim().toLowerCase();
              let tipo = "produto";
              if (txt.indexOf("serv") !== -1) tipo = "servico";
              else if (txt.indexOf("plan") !== -1) tipo = "plano";
              // construir URL absoluta preservando caminho base
              const targetUrl = new URL(a.href, window.location.href);
              targetUrl.searchParams.set("tipo", tipo);
              window.location.href = targetUrl.toString();
            } catch (e) {
              console.debug("erro interceptar novo-produto link", e);
              window.location.href = a.href;
            }
          });
        }
      } catch (e) {}
    });
  } catch (e) {
    console.debug("falha configurar interceptador novo-produto", e);
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

function handleTabChange(activeTab) {
  const tabText = activeTab.textContent;
  console.log("Tab ativa:", tabText);
}

// ========================================
// DASHBOARD APP - Integração completa com APIs
// ========================================
const DashboardApp = {
  // Usar VPS_URL quando definido (acesso via domínio separado, ex: Hostinger);
  // caso contrário same-origin (acesso direto ao backend via IP ou porta)
  API_BASE: (window.VPS_URL || "") + "/api",
  _aniversariantesData: null,
  _currentAniversarianteTab: "pets",

  // Proteção contra execuções concorrentes do refresh
  _refreshRunning: false,

  // Utilitário: executar funções assíncronas em batches com limite de concorrência
  // funcs: array de funções que retornam Promise
  // batchSize: máximo de funções executadas em paralelo por batch
  // delayMs: tempo (ms) de espera entre batches
  async _runFunctionsInBatches(funcs, batchSize = 3, delayMs = 300) {
    if (!Array.isArray(funcs) || funcs.length === 0) return [];
    const results = [];
    for (let i = 0; i < funcs.length; i += batchSize) {
      const batchFuncs = funcs.slice(i, i + batchSize);
      console.debug(
        `[requestLimiter] Executando batch ${Math.floor(i / batchSize) + 1} com ${batchFuncs.length} tarefa(s)`,
      );
      const promises = batchFuncs.map((f) => {
        try {
          return Promise.resolve(f());
        } catch (e) {
          return Promise.reject(e);
        }
      });
      const settled = await Promise.allSettled(promises);
      results.push(...settled);
      if (i + batchSize < funcs.length && delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    return results;
  },

  async init() {
    if (initialized) return;
    initialized = true;
    try {
      await this.refreshAll();
    } catch (e) {
      console.error("[DashboardApp.init] erro:", e);
    }
  },

  async refreshAll() {
    // Proteção contra execuções concorrentes global
    if (isRefreshing) {
      console.debug(
        "[DashboardApp] refreshAll já em execução — ignorando chamada concorrente",
      );
      return;
    }

    isRefreshing = true;

    try {
      await this.loadStats();
      await delay(300);

      await this.loadIndicadores();
      await delay(300);

      await this.loadPeriodicos();
      await delay(300);

      await this.loadContasAPagar();
      await delay(300);

      await this.loadEstoqueBaixo();
      await delay(300);

      await this.loadAniversariantes();
      await delay(300);

      await this.loadOportunidades();
      await delay(300);

      await this.loadTaxiDog();
      await delay(300);

      await this.loadValidade();
    } catch (err) {
      console.error("Erro no refreshAll:", err);
    } finally {
      isRefreshing = false;
    }
  },

  async apiFetch(endpoint, options = {}, retries = 2) {
    // Monitorar requisições em voo para debug
    window.__OUTGOING_REQUESTS__ = (window.__OUTGOING_REQUESTS__ || 0) + 1;
    console.debug(
      `[apiFetch] start ${endpoint} inFlight=${window.__OUTGOING_REQUESTS__}`,
    );
    try {
      const res = await fetch(`${this.API_BASE}${endpoint}`, {
        credentials: "include",
        ...options,
      });

      if (res.status === 429 && retries > 0) {
        console.warn("429 recebido, tentando novamente...");
        await delay(1000);
        return this.apiFetch(endpoint, options, retries - 1);
      }

      if (res.status === 401) {
        // Redirecionar apenas quando o backend sinaliza sessão encerrada/expirada
        // 401 genéricos (permissão, erro transiente) não devem derrubar o usuário
        let _body401 = null;
        try {
          _body401 = await res.clone().json();
        } catch (_) {}
        const _deveRedirecionar =
          !_body401 ||
          _body401.encerrado === true ||
          _body401.expirado === true ||
          (typeof _body401.mensagem === "string" &&
            _body401.mensagem.toLowerCase().includes("autenticad"));
        if (_deveRedirecionar) {
          const _cookieDomain = window.location.hostname.includes(".")
            ? "; domain=." +
              window.location.hostname.split(".").slice(-2).join(".")
            : "";
          const _exp = "; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
          document.cookie = "usuarioLogadoId=" + _exp + _cookieDomain;
          document.cookie = "usuarioLogadoNome=" + _exp + _cookieDomain;
          document.cookie = "usuarioLogadoId=" + _exp;
          document.cookie = "usuarioLogadoNome=" + _exp;
          window.location.href = "/login/login.html";
          throw new Error(`Não autenticado — redirecionando ao login`);
        }
        throw new Error(`Não autorizado (401)`);
      }

      if (!res.ok) {
        throw new Error(`API ${endpoint}: ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      console.error("Erro no apiFetch:", err);
      throw err;
    } finally {
      window.__OUTGOING_REQUESTS__ = Math.max(
        0,
        (window.__OUTGOING_REQUESTS__ || 1) - 1,
      );
      console.debug(
        `[apiFetch] end ${endpoint} inFlight=${window.__OUTGOING_REQUESTS__}`,
      );
    }
  },

  dateStr() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  },

  formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  },

  formatDate(dateStr) {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr + (dateStr.includes("T") ? "" : "T12:00:00"));
    return d.toLocaleDateString("pt-BR");
  },

  emptyHTML(message) {
    return `<div class="empty-state"><i class="fas fa-inbox"></i><p>${message}</p></div>`;
  },

  errorHTML(message) {
    return `<div class="error-state"><i class="fas fa-exclamation-triangle"></i><p>${message}</p></div>`;
  },

  // === STATS CARDS ===
  async loadStats() {
    try {
      // Usar endpoint consolidado para reduzir número de requests
      const data = await this.apiFetch("/dashboard/resumo");
      const elAg = document.getElementById("statAgendamentos");
      if (elAg) elAg.textContent = data.agendamentosHoje || 0;

      const elV = document.getElementById("statVendas");
      if (elV) elV.textContent = data.vendasHoje || 0;

      const elT = document.getElementById("statTicket");
      if (elT) elT.textContent = this.formatCurrency(data.ticketMedio || 0);

      const elC = document.getElementById("statClientes");
      if (elC) elC.textContent = data.clientesMes || data.clientes || 0;
    } catch (err) {
      console.error("Erro ao carregar stats:", err);
    }
  },

  // === INDICADORES DO ATENDIMENTO ===
  // Usa o mesmo endpoint do Mobile (pets-no-estabelecimento) que possui a lógica
  // correta com filtro de cancelados e obrigatoriedade de empresaId.
  // Fallback para indicadores-atendimento caso o endpoint principal falhe.
  async loadIndicadores() {
    try {
      // Tenta primeiro o endpoint usado pelo Mobile (já tem cache e filtro de cancelados)
      const data = await this.apiFetch("/dashboard/pets-no-estabelecimento");
      const indA = document.getElementById("indAgendados");
      if (indA) indA.textContent = data.agendados || 0;
      const indC = document.getElementById("indCheckin");
      if (indC) indC.textContent = data.checkin || 0;
      const indP = document.getElementById("indProntos");
      if (indP) indP.textContent = data.pronto || 0;
    } catch (err) {
      // Fallback: se o endpoint principal falhar (ex: empresa não identificada),
      // usa o endpoint secundário que também foi corrigido
      try {
        const data = await this.apiFetch("/dashboard/indicadores-atendimento");
        const indA = document.getElementById("indAgendados");
        if (indA) indA.textContent = data.agendados || 0;
        const indC = document.getElementById("indCheckin");
        if (indC) indC.textContent = data.checkin || 0;
        const indP = document.getElementById("indProntos");
        if (indP) indP.textContent = data.prontos || 0;
      } catch (err2) {
        console.error("Erro indicadores (ambos endpoints):", err2);
      }
    }
  },

  // === PERIÓDICOS ===
  async loadPeriodicos() {
    const el = document.getElementById("periodicosContent");
    if (!el) {
      console.warn(
        "[DashboardApp] loadPeriodicos: elemento #periodicosContent não encontrado, pulando carregamento.",
      );
      return;
    }
    try {
      const data = await this.apiFetch("/dashboard/periodicos");
      if (!data || data.length === 0) {
        el.innerHTML = this.emptyHTML(
          "Não há lembrete de periódico pelos próximos 7 dias!",
        );
        return;
      }
      el.innerHTML = data
        .map(
          (p) => `
                <a href="/pets/pet-details.html?id=${p.petId}" class="widget-list-item periodico-item">
                    <div class="widget-list-icon"><i class="fas fa-redo"></i></div>
                    <div class="widget-list-info">
                        <strong>${this.escapeHtml(p.petNome)}</strong>
                        <span class="widget-list-sub">${this.escapeHtml(p.clienteNome)} &bull; ${this.escapeHtml(p.servico)}</span>
                    </div>
                    <div class="widget-list-badge">${this.formatDate(p.dataRenovacao)}</div>
                </a>
            `,
        )
        .join("");
    } catch (err) {
      try {
        el.innerHTML = this.errorHTML("Erro ao carregar periódicos");
      } catch (e) {}
      console.error("Erro periódicos:", err);
    }
  },

  // === CONTAS A PAGAR ===
  async loadContasAPagar() {
    const el = document.getElementById("contasContent");
    if (!el) {
      console.warn(
        "[DashboardApp] loadContasAPagar: elemento #contasContent não encontrado, pulando carregamento.",
      );
      return;
    }
    try {
      const data = await this.apiFetch("/dashboard/contas-a-pagar-hoje");
      if (!data || data.length === 0) {
        el.innerHTML = this.emptyHTML("Nenhuma conta vencendo hoje");
        return;
      }
      el.innerHTML = data
        .map(
          (c) => `
                <div class="widget-list-item conta-item">
                    <div class="widget-list-icon"><i class="fas fa-file-invoice-dollar"></i></div>
                    <div class="widget-list-info">
                        <strong>${this.escapeHtml(c.fornecedor)}</strong>
                        <span class="widget-list-sub">NF: ${c.numero || "N/A"} &bull; ${c.situacao}</span>
                    </div>
                    <div class="widget-list-value">${this.formatCurrency(c.valorTotal)}</div>
                </div>
            `,
        )
        .join("");
    } catch (err) {
      try {
        el.innerHTML = this.errorHTML("Erro ao carregar contas a pagar");
      } catch (e) {}
      console.error("Erro contas a pagar:", err);
    }
  },

  // === ESTOQUE BAIXO ===
  async loadEstoqueBaixo() {
    const el = document.getElementById("estoqueContent");
    if (!el) {
      console.warn(
        "[DashboardApp] loadEstoqueBaixo: elemento #estoqueContent não encontrado, pulando carregamento.",
      );
      return;
    }
    try {
      const data = await this.apiFetch("/dashboard/produtos-estoque-baixo");
      if (!data || data.length === 0) {
        el.innerHTML = this.emptyHTML("Nenhum produto com estoque baixo");
        return;
      }
      el.innerHTML = `
                <div class="table-container estoque-scroll-wrap">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Estoque</th>
                                <th>Mínimo</th>
                                <th>Ideal</th>
                                <th>Sugestão de compra</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data
                              .map((p) => {
                                const sugestao = Math.max(
                                  0,
                                  (p.estoqueIdeal || p.estoqueMinimo || 0) -
                                    (p.estoqueAtual || 0),
                                );
                                const estoqueClass =
                                  p.estoqueAtual === 0
                                    ? "estoque-zerado"
                                    : "estoque-baixo";
                                return `<tr class="${estoqueClass}">
                                    <td>${this.escapeHtml(p.nome || "Sem nome")}</td>
                                    <td><span class="badge-estoque ${estoqueClass}">${p.estoqueAtual || 0}</span></td>
                                    <td>${p.estoqueMinimo || 0}</td>
                                    <td>${p.estoqueIdeal || 0}</td>
                                    <td>${sugestao}</td>
                                </tr>`;
                              })
                              .join("")}
                        </tbody>
                    </table>
                </div>
            `;
    } catch (err) {
      try {
        el.innerHTML = this.errorHTML("Erro ao carregar estoque");
      } catch (e) {}
      console.error("Erro estoque:", err);
    }
  },

  // === ANIVERSARIANTES ===
  async loadAniversariantes() {
    const el = document.getElementById("aniversariantesContent");
    if (!el) {
      console.warn(
        "[DashboardApp] loadAniversariantes: elemento #aniversariantesContent não encontrado, pulando carregamento.",
      );
      return;
    }
    try {
      this._aniversariantesData = await this.apiFetch(
        "/dashboard/aniversariantes",
      );
      this.renderAniversariantes();
    } catch (err) {
      try {
        el.innerHTML = this.errorHTML("Erro ao carregar aniversariantes");
      } catch (e) {}
      console.error("Erro aniversariantes:", err);
    }
  },

  switchAniversarianteTab(tab) {
    this._currentAniversarianteTab = tab;
    document
      .querySelectorAll("#widgetAniversariantes .tab-btn")
      .forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.tab === tab);
      });
    this.renderAniversariantes();
  },

  renderAniversariantes() {
    const el = document.getElementById("aniversariantesContent");
    const data = this._aniversariantesData;
    if (!data) return;

    const list =
      this._currentAniversarianteTab === "pets"
        ? data.pets || []
        : data.clientes || [];
    if (list.length === 0) {
      el.innerHTML = this.emptyHTML(
        `Não há aniversariantes (${this._currentAniversarianteTab}) pelos próximos 7 dias!`,
      );
      return;
    }
    el.innerHTML = list
      .map(
        (item) => `
            <div class="widget-list-item aniversariante-item">
                <div class="widget-list-icon"><i class="fas fa-birthday-cake"></i></div>
                <div class="widget-list-info">
                    <strong>${this.escapeHtml(item.nome)}</strong>
                    ${item.clienteNome ? `<span class="widget-list-sub">Tutor: ${this.escapeHtml(item.clienteNome)}</span>` : ""}
                </div>
                <div class="widget-list-badge">${this.formatDate(item.dataNascimento)}</div>
            </div>
        `,
      )
      .join("");
  },

  // === OPORTUNIDADES DE VENDA ===
  async loadOportunidades() {
    const el = document.getElementById("oportunidadesContent");
    if (!el) {
      console.warn(
        "[DashboardApp] loadOportunidades: elemento #oportunidadesContent não encontrado, pulando carregamento.",
      );
      return;
    }
    try {
      const data = await this.apiFetch("/dashboard/oportunidades-venda");
      if (!data || data.length === 0) {
        el.innerHTML = this.emptyHTML(
          "Nenhuma oportunidade encontrada no momento",
        );
        return;
      }
      el.innerHTML = data
        .map(
          (o) => `
                <div class="widget-list-item oportunidade-item">
                    <div class="widget-list-icon"><i class="fas fa-lightbulb"></i></div>
                    <div class="widget-list-info">
                        <strong>${this.escapeHtml(o.clienteNome)}</strong>
                        <span class="widget-list-sub">${this.escapeHtml(o.produtoNome)} &bull; Qtd: ${o.quantidade}</span>
                    </div>
                    <div class="widget-list-badge badge-warning">${o.diasDesdeCompra} dias atrás</div>
                </div>
            `,
        )
        .join("");
    } catch (err) {
      try {
        el.innerHTML = this.errorHTML("Erro ao carregar oportunidades");
      } catch (e) {}
      console.error("Erro oportunidades:", err);
    }
  },

  // === TAXI DOG ===
  async loadTaxiDog() {
    const el = document.getElementById("taxiDogContent");
    if (!el) {
      console.warn(
        "[DashboardApp] loadTaxiDog: elemento #taxiDogContent não encontrado, pulando carregamento.",
      );
      return;
    }
    try {
      const data = await this.apiFetch("/dashboard/leva-traz");
      if (!data || data.length === 0) {
        el.innerHTML = this.emptyHTML(
          "Nenhum pet com Taxi Dog agendado para hoje",
        );
        return;
      }
      el.innerHTML = data
        .map((t, idx) => {
          // mostrar versão curta do endereço no widget (evita poluir layout)
          const fullAddr = t.endereco || "";
          const shortAddr =
            fullAddr.length > 50 ? fullAddr.slice(0, 47) + "..." : fullAddr;
          return `
                <div class="widget-list-item taxidog-item" data-idx="${idx}" data-pet="${this.escapeHtml(
                  t.petNome,
                )}" data-cliente="${this.escapeHtml(t.clienteNome)}" data-endereco="${this.escapeHtml(
                  fullAddr,
                )}">
                    <div class="widget-list-icon"><i class="fas fa-shuttle-van"></i></div>
                    <div class="widget-list-info">
                        <strong>${this.escapeHtml(t.petNome)}</strong>
                        <span class="widget-list-sub">${this.escapeHtml(t.clienteNome)} &bull; ${this.escapeHtml(
                          shortAddr,
                        )}</span>
                    </div>
                    <div class="widget-list-badge">${t.horario}</div>
                </div>
            `;
        })
        .join("");

      // Anexar listeners para abrir modal com detalhes completos ao clicar
      try {
        el.querySelectorAll(".taxidog-item").forEach((item) => {
          item.style.cursor = "pointer";
          item.addEventListener("click", function () {
            const pet = this.getAttribute("data-pet") || "";
            const cliente = this.getAttribute("data-cliente") || "";
            const endereco = this.getAttribute("data-endereco") || "";
            try {
              DashboardApp.showTaxiDogModal({ pet, cliente, endereco });
            } catch (e) {
              alert(`${cliente} — ${endereco}`);
            }
          });
        });
      } catch (e) {
        console.warn("Não foi possível anexar handlers de Taxi Dog:", e);
      }
    } catch (err) {
      try {
        el.innerHTML = this.errorHTML("Erro ao carregar Taxi Dog");
      } catch (e) {}
      console.error("Erro taxi dog:", err);
    }
  },

  // Mostra modal compacto com dados do Taxi Dog ao clicar no item do dashboard
  showTaxiDogModal(details) {
    const pet = details.pet || "";
    const cliente = details.cliente || "";
    const endereco = details.endereco || "Endereço não cadastrado";

    // remover modal anterior
    const existing = document.getElementById("taxiDogModalOverlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "taxiDogModalOverlay";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:16000;";

    const modal = document.createElement("div");
    modal.style.cssText =
      "background:#fff;border-radius:10px;max-width:460px;width:92%;padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,0.25);font-family:inherit;color:#222;";

    modal.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <strong style="font-size:16px">${this.escapeHtml(pet)} — ${this.escapeHtml(cliente)}</strong>
        <button id="closeTaxiDogModal" style="background:#fff;border:0;font-size:18px;cursor:pointer">✕</button>
      </div>
      <div style="font-size:14px;color:#444;line-height:1.4">${this.escapeHtml(endereco)}</div>
      <div style="margin-top:14px;text-align:right"><button id="okTaxiDogModal" class="btn" style="background:#1976d2;color:#fff;border:0;padding:8px 14px;border-radius:6px;cursor:pointer">Fechar</button></div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById("closeTaxiDogModal").onclick = () =>
      overlay.remove();
    document.getElementById("okTaxiDogModal").onclick = () => overlay.remove();
  },

  // === CONTROLE DE VALIDADE ===
  async loadValidade() {
    const el = document.getElementById("validadeContent");
    if (!el) {
      console.warn(
        "[DashboardApp] loadValidade: elemento #validadeContent não encontrado, pulando carregamento.",
      );
      return;
    }
    try {
      const data = await this.apiFetch("/dashboard/produtos-vencimento");
      if (!data || data.length === 0) {
        el.innerHTML = this.emptyHTML("Nenhum produto próximo do vencimento");
        return;
      }
      el.innerHTML = data
        .map((p) => {
          let urgenciaClass = "validade-ok";
          let urgenciaLabel = "Baixo risco";
          if (p.diasRestantes <= 7) {
            urgenciaClass = "validade-critica";
            urgenciaLabel = "Crítico";
          } else if (p.diasRestantes <= 30) {
            urgenciaClass = "validade-alta";
            urgenciaLabel = "Alto risco";
          } else if (p.diasRestantes <= 60) {
            urgenciaClass = "validade-media";
            urgenciaLabel = "Atenção";
          }

          return `
                    <div class="widget-list-item validade-item ${urgenciaClass}">
                        <div class="widget-list-icon"><i class="fas fa-hourglass-half"></i></div>
                        <div class="widget-list-info">
                            <strong>${this.escapeHtml(p.nome)}</strong>
                            <span class="widget-list-sub">Estoque: ${p.estoqueAtual} &bull; Validade: ${this.formatDate(p.validade)}</span>
                        </div>
                        <div class="widget-list-badge ${urgenciaClass}">${p.diasRestantes}d - ${urgenciaLabel}</div>
                    </div>
                `;
        })
        .join("");
    } catch (err) {
      try {
        el.innerHTML = this.errorHTML("Erro ao carregar controle de validade");
      } catch (e) {}
      console.error("Erro validade:", err);
    }
  },

  escapeHtml(text) {
    if (!text) return "";
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return String(text).replace(/[&<>"']/g, (c) => map[c]);
  },
};

// Expor DashboardApp globalmente
window.DashboardApp = DashboardApp;

// Função para formatar números
function formatNumber(num) {
  return num.toLocaleString("pt-BR");
}

// Função para formatar moeda
function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
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
  closeDropdown();
  alert("Esta funcionalidade ainda está em desenvolvimento.");
}

function novaVenda() {
  console.log("Nova Venda");
  window.location.href = "/atendimento/nova-venda.html";
  closeDropdown();
}

function novaContaPagar() {
  console.log("Nova Conta a Pagar");
  window.location.href =
    "/financeiro/contas-a-receber/contas-a-pagar/pagamento-fornecedor.html";
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
  // Estado mantido apenas em memória (sem localStorage)
}

function obterEstadoSubmenu(submenuId) {
  return false;
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
  // Estado mantido apenas em memória (sem localStorage)
}

// ── Itens fiscais no menu (integração Central Fiscal + Configuração Fiscal) ──
// Inseridos abaixo de "Cores" em TODOS os #configuracaoSubmenu, de forma
// idempotente — esse é o ponto único que mantém o menu global consistente,
// sem duplicar código em cada página.
function garantirItensFiscaisNoMenu() {
  try {
    const itensFiscais = [
      { href: "/fiscal/central-fiscal.html", label: "Central Fiscal" },
      { href: "/configuracoes/configuracao-fiscal.html", label: "Configuração Fiscal" },
    ];

    document.querySelectorAll("#configuracaoSubmenu").forEach((submenu) => {
      if (submenu.dataset.fiscalItensInjetados === "1") return;

      const links = Array.prototype.slice.call(submenu.querySelectorAll("a"));
      const temCentral = links.some((a) =>
        (a.getAttribute("href") || "").includes("central-fiscal"),
      );
      const temConfig = links.some((a) =>
        (a.getAttribute("href") || "").includes("configuracao-fiscal"),
      );
      if (temCentral && temConfig) {
        submenu.dataset.fiscalItensInjetados = "1";
        return;
      }

      // Inserir logo abaixo do item "Cores" (ou no fim, se "Cores" não existir)
      let refItem = null;
      links.forEach((a) => {
        if (/^Cores$/i.test((a.textContent || "").trim())) refItem = a;
      });

      itensFiscais.forEach((item) => {
        const a = document.createElement("a");
        a.className = "submenu-item";
        a.href = item.href;

        const icone = document.createElement("i");
        icone.className = item.href.includes("central-fiscal")
          ? "fas fa-file-invoice"
          : "fas fa-gears";
        icone.style.marginRight = "8px";

        const sp = document.createElement("span");
        sp.textContent = item.label;

        a.appendChild(icone);
        a.appendChild(sp);

        if (refItem) {
          refItem.parentNode.insertBefore(a, refItem.nextSibling);
          refItem = a;
        } else {
          submenu.appendChild(a);
        }
      });

      submenu.dataset.fiscalItensInjetados = "1";
    });
  } catch (e) {
    console.warn("garantirItensFiscaisNoMenu:", e && e.message);
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

    // Módulo Fiscal
    "central-fiscal.html": "configuracao",
    "configuracao-fiscal.html": "configuracao",
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

    // Módulo Fiscal
    "central-fiscal.html": "configuracaoMenuItem",
    "configuracao-fiscal.html": "configuracaoMenuItem",
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

  // Páginas fiscais: abrir a seção Configuração e destacar o subitem específico
  if (paginaAtual === "central-fiscal.html" || paginaAtual === "configuracao-fiscal.html") {
    try {
      abrirSubmenuEspecifico("configuracao");
    } catch (e) {
      console.warn("Erro ao abrir submenu Configuração", e);
    }
    try {
      const linkSub = document.querySelector(
        '#configuracaoSubmenu a[href*="' + paginaAtual + '"]',
      );
      if (linkSub) {
        document.querySelectorAll(".submenu-item").forEach((el) => {
          el.classList.remove("active");
        });
        linkSub.classList.add("active");
        console.log(`Subitem fiscal ${paginaAtual} marcado como ativo`);
      }
    } catch (e) {
      console.warn("Erro ao destacar item fiscal", e);
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

// ==========================================
// USER PROFILE DROPDOWN - GLOBAL
// ==========================================
(function () {
  "use strict";

  if (window.__userProfileDropdownInitialized) return;
  window.__userProfileDropdownInitialized = true;

  // Funções de sessão (usando cookies)
  function setCookie(name, value, days = 30) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
  }

  function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  function deleteCookie(name) {
    document.cookie =
      name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  }

  // Carregar dados do usuário logado
  async function carregarUsuarioLogado() {
    const usuarioId = getCookie("usuarioLogadoId");
    if (!usuarioId)
      return { nome: "Usuário", nomeEmpresa: "Nenhuma empresa cadastrada" };

    try {
      // Por padrão usar caminhos relativos (mesma origem) para evitar problemas
      // de mixed-content / SSL ao servir o frontend via HTTPS.
      const API_BASE =
        (window.__API_BASE__ && window.__API_BASE__.toString()) || "";

      // Buscar dados do usuário
      const responseUsuario = await fetch(
        API_BASE + "/api/usuarios/" + usuarioId,
      );
      if (!responseUsuario.ok) throw new Error("Usuário não encontrado");

      const usuario = await responseUsuario.json();

      // Buscar dados da empresa (primeira empresa do usuário)
      let nomeEmpresa = "Nenhuma empresa cadastrada";
      if (usuario.empresas && usuario.empresas.length > 0) {
        const empresaObj = usuario.empresas[0];
        let empresaId = null;
        // aceitar formatos: number, string id, ou objeto com id/ID/companyId
        if (typeof empresaObj === "number") {
          empresaId = empresaObj;
        } else if (typeof empresaObj === "string") {
          empresaId = parseInt(empresaObj, 10) || null;
        } else if (typeof empresaObj === "object" && empresaObj !== null) {
          empresaId =
            empresaObj.id || empresaObj.ID || empresaObj.companyId || null;
        }

        if (!empresaId) {
          console.warn(
            "carregarUsuarioLogado: empresaId indefinido em usuario.empresas[0]",
            empresaObj,
          );
          // Fallback: tentar obter empresa via endpoint protegido /api/empresas/whoami
          try {
            const respWho = await fetch(API_BASE + "/api/empresas/whoami", {
              credentials: "include",
            });
            if (respWho.ok) {
              const who = await respWho.json().catch(() => null);
              const empresaIdFromReq = who?.reqUser?.empresaId || null;
              const empresaFromUsuarioDb = who?.usuarioDb?.empresas
                ? who.usuarioDb.empresas[0]
                : null;
              let fallbackId = null;
              if (empresaIdFromReq) fallbackId = empresaIdFromReq;
              else if (empresaFromUsuarioDb) {
                if (typeof empresaFromUsuarioDb === "number")
                  fallbackId = empresaFromUsuarioDb;
                else if (typeof empresaFromUsuarioDb === "string")
                  fallbackId = parseInt(empresaFromUsuarioDb, 10) || null;
                else if (
                  typeof empresaFromUsuarioDb === "object" &&
                  empresaFromUsuarioDb !== null
                ) {
                  fallbackId =
                    empresaFromUsuarioDb.id ||
                    empresaFromUsuarioDb.ID ||
                    empresaFromUsuarioDb.companyId ||
                    null;
                }
              }
              if (fallbackId) {
                const respEmp = await fetch(
                  API_BASE + "/api/empresas/" + fallbackId,
                  {
                    credentials: "include",
                  },
                );
                if (respEmp.ok) {
                  const empresa = await respEmp.json();
                  nomeEmpresa =
                    empresa.nomeFantasia || empresa.razaoSocial || nomeEmpresa;
                }
              }
            }
          } catch (e) {
            // silencioso
          }
        } else {
          const responseEmpresa = await fetch(
            API_BASE + "/api/empresas/" + empresaId,
          );
          if (responseEmpresa.ok) {
            const empresa = await responseEmpresa.json();
            nomeEmpresa =
              empresa.nomeFantasia ||
              empresa.razaoSocial ||
              "Nenhuma empresa cadastrada";
          } else {
            console.warn(
              "carregarUsuarioLogado: empresa fetch falhou",
              responseEmpresa.status,
            );
          }
        }
      }

      return {
        nome: usuario.nome,
        nomeEmpresa: nomeEmpresa,
      };
    } catch (error) {
      console.error("Erro ao carregar usuário logado:", error);
      return { nome: "Usuário", nomeEmpresa: "Nenhuma empresa cadastrada" };
    }
  }

  // Injetar CSS
  const style = document.createElement("style");
  style.id = "user-profile-dropdown-styles";
  style.textContent = `
        .user-menu { position: relative; cursor: pointer; user-select: none; }
        .user-profile-dropdown {
            position: absolute; top: calc(100% + 10px); right: 0;
            background: white; border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            min-width: 220px; z-index: 9999;
            opacity: 0; visibility: hidden; transform: translateY(-10px);
            transition: all 0.2s ease;
        }
        .user-profile-dropdown.active { opacity: 1; visibility: visible; transform: translateY(0); }
        .user-profile-dropdown::before {
            content: ''; position: absolute; top: -6px; right: 20px;
            width: 12px; height: 12px; background: white; transform: rotate(45deg);
        }
        .user-profile-header { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center; }
        .user-profile-avatar {
            width: 36px; height: 36px; border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; display: flex; align-items: center; justify-content: center;
            font-size: 16px; font-weight: 600; margin: 0 auto 8px;
        }
        .user-profile-name { font-size: 14px; font-weight: 600; color: #1f2937; margin-bottom: 2px; }
        .user-profile-company { font-size: 12px; color: #6b7280; }
        .user-profile-section { padding: 4px 0; }
        .user-profile-section-title {
            padding: 6px 16px; font-size: 10px; font-weight: 600;
            color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .user-profile-item {
            display: flex; align-items: center; padding: 8px 16px;
            color: #374151; text-decoration: none; transition: background 0.15s ease; cursor: pointer;
        }
        .user-profile-item:hover { background: #f3f4f6; }
        .user-profile-item i { width: 18px; margin-right: 10px; color: #6b7280; font-size: 13px; }
        .user-profile-item span { font-size: 13px; font-weight: 500; }
        .user-profile-divider { height: 1px; background: #e5e7eb; margin: 4px 0; }
        .user-profile-item.logout { color: #dc2626; }
        .user-profile-item.logout i { color: #dc2626; }
        .user-profile-item.logout:hover { background: #fee2e2; }

        /* Modal de confirmação de logout */
        .logout-modal-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            animation: fadeIn 0.2s ease;
        }

        .logout-modal-overlay.active {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .logout-modal {
            background: white;
            border-radius: 12px;
            padding: 0;
            width: 90%;
            max-width: 420px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease;
            overflow: hidden;
        }

        .logout-modal-header {
            background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
            color: white;
            padding: 24px;
            text-align: center;
        }

        .logout-modal-icon {
            width: 64px;
            height: 64px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
        }

        .logout-modal-icon i {
            font-size: 32px;
            color: white;
        }

        .logout-modal-header h3 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }

        .logout-modal-body {
            padding: 32px 24px;
            text-align: center;
        }

        .logout-modal-body p {
            margin: 0;
            font-size: 16px;
            color: #64748b;
            line-height: 1.6;
        }

        .logout-modal-footer {
            padding: 20px 24px;
            background: #f8fafc;
            display: flex;
            gap: 12px;
            justify-content: center;
        }

        .logout-modal-btn {
            padding: 12px 32px;
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            min-width: 120px;
        }

        .logout-modal-btn-cancel {
            background: white;
            color: #64748b;
            border: 2px solid #e2e8f0;
        }

        .logout-modal-btn-cancel:hover {
            background: #f8fafc;
            border-color: #cbd5e1;
            transform: translateY(-1px);
        }

        .logout-modal-btn-confirm {
            background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
            color: white;
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
        }

        .logout-modal-btn-confirm:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(220, 38, 38, 0.4);
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
  document.head.appendChild(style);

  function createDropdownHTML() {
    return `
            <div class="user-profile-dropdown">
                <div class="user-profile-header">
                    <div class="user-profile-avatar"><i class="fas fa-user"></i></div>
                    <div class="user-profile-name" id="userDropdownEmpresa">Carregando...</div>
                    <div class="user-profile-company" id="userDropdownNome">Carregando...</div>
                </div>
                <div class="user-profile-section">
                    <a href="#" class="user-profile-item" data-action="switch-company">
                        <i class="fas fa-building"></i><span>Acessar outra empresa</span>
                    </a>
                </div>
                <div class="user-profile-divider"></div>
                <div class="user-profile-section">
                    <div class="user-profile-section-title">Configurações Pessoais</div>
                    <a href="#" class="user-profile-item" data-action="my-profile">
                        <i class="fas fa-user-circle"></i><span>Meu perfil</span>
                    </a>
                </div>
                <div class="user-profile-divider"></div>
                <div class="user-profile-section">
                    <div class="user-profile-section-title">Administração</div>
                    <a href="#" class="user-profile-item" data-action="billing">
                        <i class="fas fa-file-invoice-dollar"></i><span>Cobrança</span>
                    </a>
                </div>
                <div class="user-profile-divider"></div>
                <div class="user-profile-section">
                    <a href="#" class="user-profile-item" data-action="about">
                        <i class="fas fa-info-circle"></i><span>Sobre</span>
                    </a>
                    <a href="#" class="user-profile-item logout" data-action="logout">
                        <i class="fas fa-sign-out-alt"></i><span>Sair</span>
                    </a>
                </div>
            </div>
        `;
  }

  function initUserProfileDropdown() {
    const userMenus = document.querySelectorAll(".user-menu");
    userMenus.forEach((userMenu) => {
      if (userMenu.hasAttribute("data-dropdown-initialized")) return;
      userMenu.setAttribute("data-dropdown-initialized", "true");
      userMenu.insertAdjacentHTML("beforeend", createDropdownHTML());
      const dropdown = userMenu.querySelector(".user-profile-dropdown");

      // Carregar dados do usuário logado
      carregarUsuarioLogado().then((dados) => {
        const empresaEl = dropdown.querySelector("#userDropdownEmpresa");
        const nomeEl = dropdown.querySelector("#userDropdownNome");
        if (empresaEl) empresaEl.textContent = dados.nome;
        if (nomeEl) nomeEl.textContent = dados.nomeEmpresa;

        // Atualizar o nome do usuário no header — substituir placeholders
        const userNameSpan = userMenu.querySelector("span");
        if (userNameSpan) {
          const current = (userNameSpan.textContent || "").trim();
          const lower = current.toLowerCase();
          const isPlaceholder =
            current === "" ||
            current === "..." ||
            current === "Pedro" ||
            lower === "usuário" ||
            lower === "usuario" ||
            current === "-";
          if (isPlaceholder) {
            const primeiroNome = (dados.nome || "Usuário").split(" ")[0];
            userNameSpan.textContent = primeiroNome;
          }
        }
      });

      userMenu.addEventListener("click", function (e) {
        e.stopPropagation();
        document
          .querySelectorAll(".user-profile-dropdown.active")
          .forEach((d) => {
            if (d !== dropdown) d.classList.remove("active");
          });
        dropdown.classList.toggle("active");
      });

      dropdown.addEventListener("click", function (e) {
        const item = e.target.closest(".user-profile-item");
        if (!item) return;
        e.preventDefault();
        e.stopPropagation();
        const action = item.getAttribute("data-action");

        switch (action) {
          case "switch-company":
            alert('Funcionalidade "Acessar outra empresa" em desenvolvimento');
            break;
          case "my-profile":
            alert('Funcionalidade "Meu perfil" em desenvolvimento');
            break;
          case "billing":
            alert('Funcionalidade "Cobrança" em desenvolvimento');
            break;
          case "about":
            alert("Sistema PetHub - Versão 1.0.0");
            break;
          case "logout":
            showLogoutModal();
            break;
        }
        dropdown.classList.remove("active");
      });
    });

    document.addEventListener("click", function (e) {
      if (!e.target.closest(".user-menu")) {
        document
          .querySelectorAll(".user-profile-dropdown.active")
          .forEach((d) => {
            d.classList.remove("active");
          });
      }
    });
  }

  // Função para mostrar modal de logout
  function showLogoutModal() {
    // Criar modal se não existir
    let modal = document.getElementById("logoutModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "logoutModal";
      modal.className = "logout-modal-overlay";
      modal.innerHTML = `
                <div class="logout-modal">
                    <div class="logout-modal-header">
                        <div class="logout-modal-icon">
                            <i class="fas fa-sign-out-alt"></i>
                        </div>
                        <h3>Confirmar Saída</h3>
                    </div>
                    <div class="logout-modal-body">
                        <p>Tem certeza que deseja sair do sistema?</p>
                    </div>
                    <div class="logout-modal-footer">
                        <button class="logout-modal-btn logout-modal-btn-cancel" onclick="closeLogoutModal()">
                            Não
                        </button>
                        <button class="logout-modal-btn logout-modal-btn-confirm" onclick="confirmLogout()">
                            Sim, sair
                        </button>
                    </div>
                </div>
            `;
      document.body.appendChild(modal);

      // Fechar ao clicar no overlay
      modal.addEventListener("click", function (e) {
        if (e.target === modal) {
          closeLogoutModal();
        }
      });

      // Fechar com ESC
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && modal.classList.contains("active")) {
          closeLogoutModal();
        }
      });
    }

    // Mostrar modal
    modal.classList.add("active");
  }

  // Funções globais para os botões do modal
  window.closeLogoutModal = function () {
    const modal = document.getElementById("logoutModal");
    if (modal) {
      modal.classList.remove("active");
    }
  };

  window.confirmLogout = async function () {
    // Encerrar sessão no backend
    try {
      const _base = window.VPS_URL || window.API_URL || "";
      const _deviceId = (() => {
        try {
          return localStorage.getItem("pethub_device_id");
        } catch (e) {
          return null;
        }
      })();
      await fetch(_base + "/api/usuarios/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        keepalive: true,
        body: JSON.stringify({ device_id: _deviceId }),
      });
    } catch (e) {
      // Ignorar erro — prosseguir com logout local
    }
    // Limpar cores personalizadas do cache local ao sair
    try { localStorage.removeItem("systemColors"); } catch (e) {}
    deleteCookie("usuarioLogadoId");
    deleteCookie("usuarioLogadoNome");
    window.location.href = "/login/login.html";
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initUserProfileDropdown);
  } else {
    initUserProfileDropdown();
  }
})();

// ── Central de Ajuda Global ─────────────────────────────────────────────────
// Garante carregamento em todas as páginas que usam dashboard.js, independente
// de passarem ou não pelo inject-sidebar. Usa script tags absolutas para que
// ensureJs (no inject-sidebar) detecte duplicatas e não re-adicione.
(function () {
  function _ensureScript(src, delay) {
    setTimeout(function () {
      if (document.querySelector('script[src="' + src + '"]')) return;
      var s = document.createElement("script");
      s.src = src;
      s.defer = true;
      s.dataset.injected = "help-center";
      document.head.appendChild(s);
    }, delay || 0);
  }
  _ensureScript("/config/help-center-config.js", 0);
  _ensureScript("/components/global-help-center.js", 200);
})();
