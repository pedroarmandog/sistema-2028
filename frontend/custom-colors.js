// Script global para aplicar cores personalizadas do sistema
// PRIORIDADE: servidor > localStorage (fallback temporário)
(function () {
  "use strict";
  try {
    console.log(
      "custom-colors.js executing on",
      window.location.origin,
      window.location.pathname,
    );
  } catch (e) {}

  // Aplicar cores a partir de um objeto de cores (evita duplicação de lógica)
  function applyColorsFromObj(colors) {
    if (!colors) return;
    try {
      const root = document.documentElement;
      Object.values(colors).forEach((category) => {
        if (Array.isArray(category)) {
          category.forEach((color) => {
            if (color.var && color.hex) {
              root.style.setProperty(color.var, color.hex);
            }
          });
        }
      });

      // Atualizar gradiente do sidebar
      const sidebarStart =
        colors.sidebar?.find((c) => c.id === "sidebar-start")?.hex ||
        "#2c3e50";
      const sidebarEnd =
        colors.sidebar?.find((c) => c.id === "sidebar-end")?.hex || "#34495e";
      root.style.setProperty(
        "--bg-sidebar",
        `linear-gradient(180deg, ${sidebarStart} 0%, ${sidebarEnd} 100%)`,
      );
    } catch (error) {
      console.error("❌ Erro ao aplicar cores do objeto:", error);
    }
  }

  // Verificar se o usuário está autenticado (cookie JWT ou legado)
  function isAuthenticated() {
    return (
      document.cookie.indexOf("pethub_token=") !== -1 ||
      document.cookie.indexOf("usuarioLogadoId=") !== -1
    );
  }

  // Buscar cores do servidor com timeout
  async function fetchColorsFromServer(timeoutMs) {
    return new Promise((resolve) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      fetch("/api/usuarios/preferencias", {
        credentials: "include",
        signal: controller.signal,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          clearTimeout(timer);
          if (data && data.systemColors) {
            resolve(data.systemColors);
          } else {
            resolve(null);
          }
        })
        .catch(() => {
          clearTimeout(timer);
          resolve(null);
        });
    });
  }

  // Aplicar cores salvas ao carregar a página
  async function applyCustomColors() {
    // Se autenticado, priorizar servidor com timeout de 300ms
    if (isAuthenticated()) {
      const serverColors = await fetchColorsFromServer(300);
      if (serverColors) {
        // Servidor respondeu dentro do timeout → usar dados do servidor
        localStorage.setItem("systemColors", JSON.stringify(serverColors));
        applyColorsFromObj(serverColors);
        updateInlineStylesFromObj(serverColors);
        console.log("✅ Cores carregadas do servidor (prioridade)");
        return;
      }
    }

    // Fallback: localStorage (offline, timeout, ou não autenticado)
    const savedColors = localStorage.getItem("systemColors");
    if (savedColors) {
      try {
        const colors = JSON.parse(savedColors);
        applyColorsFromObj(colors);
        console.log("✅ Cores aplicadas do localStorage (fallback)");
      } catch (error) {
        console.error("❌ Erro ao aplicar cores do localStorage:", error);
      }
    }

    // Se autenticado mas o servidor não respondeu a tempo, tentar novamente em background
    // para reaplicar quando a resposta chegar
    if (isAuthenticated()) {
      fetchColorsFromServer(10000).then((serverColors) => {
        if (serverColors) {
          localStorage.setItem("systemColors", JSON.stringify(serverColors));
          applyColorsFromObj(serverColors);
          updateInlineStylesFromObj(serverColors);
          console.log("✅ Cores reaplicadas do servidor (resposta tardia)");
        }
      });
    }
  }

  // Aplicar cores imediatamente
  applyCustomColors();

  // Aplica estilos inline a partir de um objeto de cores (usado após fetch da API)
  function updateInlineStylesFromObj(colors) {
    if (!colors) return;
    try {
      const primaryBlue =
        colors.primary?.find((c) => c.id === "primary-blue")?.hex || "#007bff";
      const primaryBlueHover =
        colors.primary?.find((c) => c.id === "primary-blue-hover")?.hex ||
        "#0056b3";
      const successColor =
        colors.status?.find((c) => c.id === "status-success")?.hex || "#28a745";
      const dangerColor =
        colors.status?.find((c) => c.id === "status-danger")?.hex || "#dc3545";
      const btnPrimary =
        colors.buttons?.find((c) => c.id === "btn-primary")?.hex || "#28a745";
      const btnPrimaryHover =
        colors.buttons?.find((c) => c.id === "btn-primary-hover")?.hex ||
        "#1e7e34";
      const sidebarStart =
        colors.sidebar?.find((c) => c.id === "sidebar-start")?.hex || "#2c3e50";
      const sidebarEnd =
        colors.sidebar?.find((c) => c.id === "sidebar-end")?.hex || "#34495e";

      let styleEl = document.getElementById("custom-colors-override");
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "custom-colors-override";
        document.head.appendChild(styleEl);
      }

      styleEl.textContent = `
                .btn-primary, .button-primary { background: ${btnPrimary} !important; }
                .btn-primary:hover, .button-primary:hover { background: ${btnPrimaryHover} !important; }
                .text-primary { color: ${primaryBlue} !important; }
                .bg-primary { background-color: ${primaryBlue} !important; }
                .border-primary { border-color: ${primaryBlue} !important; }
                .text-success, .notification.success { color: ${successColor} !important; }
                .bg-success { background-color: ${successColor} !important; }
                .text-danger, .text-error, .notification.error { color: ${dangerColor} !important; }
                .bg-danger, .bg-error { background-color: ${dangerColor} !important; }
                .sidebar {
                    background: linear-gradient(180deg, ${sidebarStart} 0%, ${sidebarEnd} 100%) !important;
                }
            `;
    } catch (error) {
      console.error("Erro ao atualizar estilos inline do objeto:", error);
    }
  }

  // Replicar cores para também aplicar aos estilos inline comuns
  function updateInlineStyles() {
    const savedColors = localStorage.getItem("systemColors");
    if (!savedColors) return;

    try {
      const colors = JSON.parse(savedColors);

      // Mapear cores para elementos comuns
      const primaryBlue =
        colors.primary?.find((c) => c.id === "primary-blue")?.hex || "#007bff";
      const primaryBlueHover =
        colors.primary?.find((c) => c.id === "primary-blue-hover")?.hex ||
        "#0056b3";
      const successColor =
        colors.status?.find((c) => c.id === "status-success")?.hex || "#28a745";
      const dangerColor =
        colors.status?.find((c) => c.id === "status-danger")?.hex || "#dc3545";
      const btnPrimary =
        colors.buttons?.find((c) => c.id === "btn-primary")?.hex || "#28a745";
      const btnPrimaryHover =
        colors.buttons?.find((c) => c.id === "btn-primary-hover")?.hex ||
        "#1e7e34";
      const sidebarStart =
        colors.sidebar?.find((c) => c.id === "sidebar-start")?.hex || "#2c3e50";
      const sidebarEnd =
        colors.sidebar?.find((c) => c.id === "sidebar-end")?.hex || "#34495e";

      // Injetar estilos globais
      let styleEl = document.getElementById("custom-colors-override");
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "custom-colors-override";
        document.head.appendChild(styleEl);
      }

      styleEl.textContent = `
                /* Cores personalizadas aplicadas globalmente */
                .btn-primary, .button-primary { background: ${btnPrimary} !important; }
                .btn-primary:hover, .button-primary:hover { background: ${btnPrimaryHover} !important; }
                .text-primary { color: ${primaryBlue} !important; }
                .bg-primary { background-color: ${primaryBlue} !important; }
                .border-primary { border-color: ${primaryBlue} !important; }
                
                .text-success, .notification.success { color: ${successColor} !important; }
                .bg-success { background-color: ${successColor} !important; }
                
                .text-danger, .text-error, .notification.error { color: ${dangerColor} !important; }
                .bg-danger, .bg-error { background-color: ${dangerColor} !important; }
                
                /* Sidebar com gradiente personalizado */
                .sidebar {
                    background: linear-gradient(180deg, ${sidebarStart} 0%, ${sidebarEnd} 100%) !important;
                }
            `;
    } catch (error) {
      console.error("Erro ao atualizar estilos inline:", error);
    }
  }

  // Aplicar também aos estilos inline
  updateInlineStyles();

  // Observar mudanças no localStorage (para sincronizar entre abas)
  window.addEventListener("storage", function (e) {
    if (e.key === "systemColors") {
      applyCustomColors();
      updateInlineStyles();
    }
  });
})();

// ========================================
// INTERCEPTOR GLOBAL: Verificação de bloqueio em tempo real
// Sobrescreve fetch para redirecionar se a empresa está bloqueada (403 + bloqueado)
// ========================================
(function () {
  "use strict";
  var path = window.location.pathname;
  // Não interceptar na página de bloqueio, login ou painel-admin
  if (
    path.indexOf("sistema-bloqueado") !== -1 ||
    path.indexOf("/login/") !== -1 ||
    path.indexOf("painel-admin") !== -1
  )
    return;

  // 1. CHECK INSTANTÂNEO: se já foi detectado bloqueio anteriormente, redirecionar AGORA
  //    (cobre: voltar com setinha, bfcache, reload de cache)
  try {
    if (sessionStorage.getItem("empresa_bloqueada") === "1") {
      document.documentElement.style.display = "none"; // esconder tudo imediatamente
      window.location.replace("/painel-admin/sistema-bloqueado.html");
      return;
    }
  } catch (e) {}

  function redirecionarBloqueio() {
    try {
      sessionStorage.setItem("empresa_bloqueada", "1");
    } catch (e) {}
    document.documentElement.style.display = "none";
    window.location.replace("/painel-admin/sistema-bloqueado.html");
  }

  // 2. Interceptar TODOS os fetch — detectar 403+bloqueado
  var _originalFetch = window.fetch;
  window.fetch = function () {
    return _originalFetch.apply(this, arguments).then(function (response) {
      if (response.status === 403) {
        var clone = response.clone();
        clone
          .json()
          .then(function (data) {
            if (data && data.bloqueado) redirecionarBloqueio();
          })
          .catch(function () {});
      }
      return response;
    });
  };

  // 3. CHECK IMEDIATO ao carregar a página (não esperar 30s)
  function checkBloqueio() {
    _originalFetch("/api/dashboard/vendas-hoje", { credentials: "include" })
      .then(function (r) {
        if (r.status === 403) {
          r.json()
            .then(function (d) {
              if (d && d.bloqueado) redirecionarBloqueio();
            })
            .catch(function () {});
        }
      })
      .catch(function () {});
  }

  // Executar check imediato + polling a cada 30s
  checkBloqueio();
  setInterval(checkBloqueio, 30000);

  // 4. Tratar botão VOLTAR do navegador (bfcache)
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) {
      // Página veio do bfcache — checar flag e verificar na API
      try {
        if (sessionStorage.getItem("empresa_bloqueada") === "1") {
          redirecionarBloqueio();
          return;
        }
      } catch (ex) {}
      checkBloqueio();
    }
  });
})();