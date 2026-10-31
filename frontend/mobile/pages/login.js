/* ============================================================
   PetHub Mobile — Página: Login
   Interface de login exclusiva para mobile.
   Reutiliza o endpoint POST /api/usuarios/login sem alterações.
   ============================================================ */

window.PageLogin = (function () {
  "use strict";

  let _container = null;

  async function init(container) {
    _container = container;
    container.innerHTML = `
      <div class="login-page">

        <div class="login-logo">
          <div class="login-logo-img">
            <img src="/mobile/icons/icon-lampada.svg" alt="PetHub" onerror="this.style.display='none'">
          </div>
          <h1 class="login-title">PetHub</h1>
          <p class="login-subtitle">Gestão na palma da mão</p>
        </div>

        <form id="login-form" class="login-form" novalidate>

          <div class="form-group">
            <label class="form-label" for="login-usuario">Usuário ou e-mail</label>
            <input
              id="login-usuario"
              type="text"
              class="form-input"
              placeholder="Digite seu usuário"
              autocomplete="username"
              autocorrect="off"
              autocapitalize="none"
              spellcheck="false"
              inputmode="text"
            >
          </div>

          <div class="form-group">
            <label class="form-label" for="login-senha">Senha</label>
            <div class="form-input-wrap">
              <input
                id="login-senha"
                type="password"
                class="form-input"
                placeholder="Digite sua senha"
                autocomplete="current-password"
              >
              <button
                type="button"
                class="form-input-toggle"
                id="btn-toggle-senha"
                aria-label="Mostrar/ocultar senha"
              >
                <svg id="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
          </div>

          <div id="login-error" class="login-error" style="display:none;color:var(--danger);font-size:13px;text-align:center;padding:8px;background:rgba(255,77,109,0.08);border-radius:8px;border:1px solid rgba(255,77,109,0.2)"></div>

          <button type="submit" id="btn-login" class="btn btn-primary btn-full" style="margin-top:4px">
            <span id="btn-login-text">Entrar</span>
          </button>

        </form>

        <p class="login-footer">
          Acesse também pelo computador em<br>
          <strong style="color:var(--text-2)">pethubflow.com.br</strong>
        </p>

      </div>
    `;

    _bindEvents(container);
  }

  function _bindEvents(container) {
    // Toggle senha
    const btnToggle = container.querySelector("#btn-toggle-senha");
    const inputSenha = container.querySelector("#login-senha");
    const eyeIcon = container.querySelector("#eye-icon");
    const eyeOffSvg = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;
    const eyeOnSvg = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;

    let senhaVisivel = false;
    btnToggle.addEventListener("click", () => {
      senhaVisivel = !senhaVisivel;
      inputSenha.type = senhaVisivel ? "text" : "password";
      eyeIcon.innerHTML = senhaVisivel ? eyeOffSvg : eyeOnSvg;
    });

    // Formulário
    const form = container.querySelector("#login-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await _handleLogin(container);
    });

    // Focar campo de senha ao pressionar Enter no usuário
    container
      .querySelector("#login-usuario")
      .addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          container.querySelector("#login-senha").focus();
        }
      });
  }

  async function _handleLogin(container) {
    const usuario = container.querySelector("#login-usuario").value.trim();
    const senha = container.querySelector("#login-senha").value;
    const errorEl = container.querySelector("#login-error");
    const btn = container.querySelector("#btn-login");
    const btnText = container.querySelector("#btn-login-text");

    // Validação
    if (!usuario) {
      _showError(errorEl, "Informe o usuário ou e-mail");
      container.querySelector("#login-usuario").focus();
      return;
    }
    if (!senha) {
      _showError(errorEl, "Informe a senha");
      container.querySelector("#login-senha").focus();
      return;
    }

    // Loading
    btn.disabled = true;
    btnText.innerHTML = `<div class="spinner" style="width:18px;height:18px;border-width:2px;border-color:rgba(255,255,255,0.3);border-top-color:#fff"></div>`;
    errorEl.style.display = "none";

    try {
      console.log("[Login] Enviando credenciais...");
      const user = await MobileAuth.login(usuario, senha);
      console.log("[Login] Login retornou:", user ? `OK: ${user.nome}` : "NULL (redirecionado)");
      if (!user) return; // redirecionado (empresa bloqueada)

      // Diagnóstico: verificar se o cookie JWT foi setado e se está sendo enviado
      console.log("[Login] Cookies após login:", document.cookie);
      console.log("[Login] Cookie pethub_token presente:", document.cookie.includes("pethub_token"));
      try {
        // Verificar se a sessão é reconhecida pelo backend (mesmo endpoint do boot)
        const me = await MobileApi.request("/api/usuarios/me", { noAutoRedirect: true });
        console.log("[Login] /api/usuarios/me reconheceu sessão:", me ? `OK: ${me.nome}` : "FALHOU");
      } catch (meErr) {
        console.warn("[Login] /api/usuarios/me NÃO reconheceu sessão:", meErr.message);
      }

      // Sucesso — iniciar app
      MobileHeader.render(user);
      MobileHeader.show({
        onRefresh: () => {
          const page = window.PageDashboard;
          if (page?.refresh) page.refresh();
        },
      });
      MobileBottomNav.show();
      MobileBottomNav.init((page) => MobileRouter.navigate(page));
      MobileAuth.iniciarHeartbeat();
      MobileRouter.navigate("dashboard");
    } catch (err) {
      _showError(errorEl, err.message || "Usuário ou senha incorretos");
      btn.disabled = false;
      btnText.textContent = "Entrar";
    }
  }

  function _showError(el, msg) {
    el.textContent = msg;
    el.style.display = "block";
    el.style.animation = "none";
    requestAnimationFrame(() => {
      el.style.animation = "page-in 0.2s ease";
    });
  }

  function refresh() {}
  function destroy() {
    _container = null;
  }

  return { init, refresh, destroy };
})();
