/* ============================================================
   PetHub Mobile — App Bootstrap & Router
   - Registra o Service Worker
   - Verifica autenticação
   - Inicializa componentes
   - Gerencia navegação entre páginas
   ============================================================ */

(function () {
  "use strict";

  /* ── Estado global ──────────────────────────────────────── */
  const _state = {
    currentPage: null,
    isLoading: false,
    swRegistration: null,
    refreshTimer: null,
    installPrompt: null, // beforeinstallprompt event
  };

  /* ── Mapa de páginas ────────────────────────────────────── */
  // Cada página implementa: { init(container), refresh(), destroy() }
  const PAGES = {
    login: () => window.PageLogin,
    dashboard: () => window.PageDashboard,
    agenda: () => window.PageAgenda,
    pets: () => window.PagePets,
    financeiro: () => window.PageFinanceiro,
    configuracoes: () => window.PageConfiguracoes,
  };

  /* ── Router ─────────────────────────────────────────────── */
  window.MobileRouter = {
    navigate(page) {
      if (page === _state.currentPage) {
        // Mesma página: apenas atualiza dados
        const pageObj = PAGES[page]?.();
        if (pageObj?.refresh) pageObj.refresh();
        return;
      }
      _loadPage(page);
    },
    current() {
      return _state.currentPage;
    },
  };

  /* ── Boot ───────────────────────────────────────────────── */
  async function boot() {
    console.log("[App] Iniciando PetHub Mobile");
    console.log("[App] URL:", window.location.href);
    console.log("[App] VPS_URL:", window.VPS_URL);
    console.log("[App] API_URL:", window.API_URL);
    console.log("[App] Cookies:", document.cookie);

    // 1. Capturar evento de instalação PWA
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      _state.installPrompt = e;
      window.dispatchEvent(new CustomEvent("pwa:installable"));
    });

    window.addEventListener("appinstalled", () => {
      _state.installPrompt = null;
    });

    // 2. Registrar Service Worker
    await _registerServiceWorker();

    // 3. Verificar URL params (ex: ?logout=1 ou ?page=agenda)
    const params = new URLSearchParams(window.location.search);
    const forceLogout = params.get("logout") === "1";
    const targetPage = params.get("page") || "dashboard";
    console.log("[App] Params:", { forceLogout, targetPage });

    // Limpar params da URL sem recarregar
    if (window.history?.replaceState) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    // 4. Se veio de logout, verificar se a sessão REALMENTE foi encerrada.
    //    O parâmetro ?logout=1 pode estar preso na URL do PWA (cache do SW)
    //    mesmo com o cookie ainda válido. Nesse caso, seguir direto para o app.
    if (forceLogout) {
      console.log("[App] forceLogout=true — verificando sessão real antes de mostrar login");
      const usuarioLogout = await MobileAuth.verificarSessao();
      if (usuarioLogout && usuarioLogout.__offline) {
        // Sem conexão não dá para confirmar o logout — preservar a sessão
        console.log("[App] Sem conexão no forceLogout — preservando estado, aguardando rede…");
        await _iniciarModoReconectando(targetPage);
        return;
      }
      if (usuarioLogout) {
        console.log("[App] Sessão ainda válida apesar do ?logout=1 — iniciando app:", usuarioLogout.nome);
        await _initApp(usuarioLogout, targetPage);
        return;
      }
      console.log("[App] forceLogout=true e sessão realmente encerrada — indo para login");
      _showLogin();
      return;
    }

    // 5. Verificar sessão
    console.log("[App] Verificando sessão...");
    const usuario = await MobileAuth.verificarSessao();
    if (usuario && usuario.__offline) {
      // Sem conexão na abertura NÃO é logout: entrar em modo "reconectando"
      // e reverificar automaticamente quando a rede voltar.
      console.log("[App] Sem conexão na abertura — sessão preservada, modo reconectando");
      await _iniciarModoReconectando(targetPage);
      return;
    }
    console.log("[App] Resultado verificarSessao:", usuario ? `OK: ${usuario.nome} (id=${usuario.id})` : "NULL — sem sessão");
    if (!usuario) {
      console.log("[App] Sem sessão — mostrando login");
      _showLogin();
      return;
    }

    // 6. Usuário autenticado — iniciar app
    console.log("[App] Usuário autenticado — iniciando app, targetPage:", targetPage);
    await _initApp(usuario, targetPage);
  }

  /* ── Registrar SW ───────────────────────────────────────── */
  async function _registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      console.warn("[App] Service Worker não suportado neste navegador");
      return;
    }

    try {
      const reg = await navigator.serviceWorker.register(
        "/mobile/service-worker.js",
        {
          scope: "/mobile/",
        },
      );
      _state.swRegistration = reg;
      MobilePush.setRegistration(reg);
      console.log("[App] Service Worker registrado (scope:", reg.scope, ")");

      // Aguardar SW estar ativo antes de continuar
      if (reg.active) {
        console.log("[App] SW já está ativo");
      } else {
        console.log("[App] Aguardando SW ficar ativo...");
        await new Promise((resolve) => {
          const checkController = () => {
            if (navigator.serviceWorker.controller) {
              console.log("[App] SW ativado com sucesso");
              resolve();
            } else {
              setTimeout(checkController, 100);
            }
          };
          checkController();
        });
      }

      // Detectar atualizações do SW
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // Nova versão disponível — notificar usuário
            _notifyUpdate();
          }
        });
      });
    } catch (err) {
      console.error("[App] Falha ao registrar Service Worker:", err);
    }
  }

  /* ── Inicializar App Autenticado ────────────────────────── */
  async function _initApp(usuario, targetPage) {
    console.log("[App] ===== _initApp() INICIADO =====", targetPage);
    console.log("[App] Tipo de usuario:", typeof usuario, usuario?.nome);
    
    // Configurar cabeçalho
    console.log("[App] Chamando MobileHeader.render()...");
    MobileHeader.render(usuario);
    MobileHeader.show({
      onRefresh: () => {
        const page = PAGES[_state.currentPage]?.();
        if (page?.refresh) page.refresh();
      },
    });
    console.log("[App] Header configurado");

    // Configurar navegação inferior
    MobileBottomNav.show();
    MobileBottomNav.init((page) => _loadPage(page));
    console.log("[App] Bottom nav configurada");

    // Iniciar heartbeat de sessão
    MobileAuth.iniciarHeartbeat();
    console.log("[App] Heartbeat iniciado");

    // Iniciar sincronização em tempo real
    if (typeof MobileSync !== "undefined" && MobileSync.init) {
      MobileSync.init();
      console.log("[App] MobileSync iniciado");
    }

    // Ocultar splash
    _hideSplash();
    console.log("[App] Splash ocultado");

    // Navegar para a página de destino
    console.log("[App] Chamando _loadPage('" + targetPage + "')...");
    await _loadPage(targetPage);
    console.log("[App] _loadPage() concluído");
  }

  /* ── Tela de Login ──────────────────────────────────────── */
  function _showLogin() {
    MobileHeader.hide();
    MobileBottomNav.hide();
    _hideSplash();
    _loadPage("login");
  }

  /* ── Modo offline / reconexão ─────────────────────────────────
     Sem conexão NÃO é logout. Entramos no app com um usuário place-
     holder e aguardamos o evento `online` para revalidar a sessão. */
  async function _iniciarModoReconectando(targetPage) {
    _hideSplash();
    const placeholder = {
      id: null,
      nome: "Reconectando…",
      empresaId: null,
      grupoUsuario: null,
      empresaNome: "",
    };
    await _initApp(placeholder, targetPage);
    _aguardarReconexao(targetPage);
  }

  async function _aguardarReconexao(targetPage) {
    const onOnline = async () => {
      window.removeEventListener("online", onOnline);
      const u = await MobileAuth.verificarSessao();
      if (u && !u.__offline) {
        console.log("[App] Conexão restaurada — sessão reconfirmada:", u.nome);
        await _initApp(u, targetPage);
      } else if (u && u.__offline) {
        // Ainda sem rede — continuar aguardando
        _aguardarReconexao(targetPage);
      } else {
        // Sessão realmente inválida (sem token/cookie e servidor confirmou)
        _showLogin();
      }
    };
    window.addEventListener("online", onOnline);
  }

  /* ── Carregar Página ────────────────────────────────────── */
  async function _loadPage(pageName) {
    console.log("[App] _loadPage() chamado com:", pageName);
    const pageFactory = PAGES[pageName];
    if (!pageFactory) {
      console.warn("[App] Página desconhecida:", pageName);
      return;
    }

    const pageObj = pageFactory();
    console.log("[App] pageObj para", pageName, ":", !!pageObj);
    if (!pageObj) {
      console.warn("[App] Módulo de página não carregado:", pageName);
      return;
    }

    // Destruir página anterior
    const prevPageObj = _state.currentPage
      ? PAGES[_state.currentPage]?.()
      : null;
    if (prevPageObj?.destroy) prevPageObj.destroy();

    _state.currentPage = pageName;

    // Atualizar nav
    if (pageName !== "login") {
      MobileBottomNav.navigate(pageName);
    }

    // Renderizar página
    const container = document.getElementById("page-content");
    console.log("[App] Container encontrado:", !!container);
    if (!container) return;

    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "page-enter page-scroll";
    container.appendChild(wrapper);
    console.log("[App] Wrapper criado, chamando pageObj.init()...");

    try {
      await pageObj.init(wrapper);
      console.log("[App] pageObj.init() concluído com sucesso");
    } catch (err) {
      console.error(`[App] Erro ao inicializar página "${pageName}":`, err);
      wrapper.innerHTML = `
        <div class="state-error" style="padding:60px 24px">
          <div class="state-icon">⚠️</div>
          <div class="state-title">Erro ao carregar</div>
          <div class="state-sub">${_escapeHtml(err.message || "Tente novamente")}</div>
          <button class="btn btn-secondary" style="margin-top:16px"
            onclick="MobileRouter.navigate('${pageName}')">
            Tentar novamente
          </button>
        </div>
      `;
    }
  }

  /* ── Splash ─────────────────────────────────────────────── */
  function _hideSplash() {
    const splash = document.getElementById("splash-screen");
    if (splash) {
      splash.classList.add("hidden");
      setTimeout(() => splash.remove(), 500);
    }
  }

  /* ── Notificar Atualização ──────────────────────────────── */
  function _notifyUpdate() {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const banner = document.createElement("div");
    banner.className = "toast toast-info toast-visible";
    banner.style.cssText = "pointer-events:auto;cursor:pointer;";
    banner.innerHTML = `
      <span class="toast-icon">🔄</span>
      <span class="toast-message"><strong>Nova versão disponível!</strong><br>Toque para atualizar</span>
    `;
    banner.addEventListener("click", () => {
      if (_state.swRegistration?.waiting) {
        _state.swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
      }
      window.location.reload();
    });
    container.appendChild(banner);
  }

  /* ── Instalar PWA (chamado pela página de configurações) ── */
  window.installPWA = async function () {
    if (!_state.installPrompt) return false;
    _state.installPrompt.prompt();
    const { outcome } = await _state.installPrompt.userChoice;
    _state.installPrompt = null;
    return outcome === "accepted";
  };

  window.canInstallPWA = function () {
    return !!_state.installPrompt;
  };

  /* ── Helper ─────────────────────────────────────────────── */
  function _escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /* ── Iniciar ────────────────────────────────────────────── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
