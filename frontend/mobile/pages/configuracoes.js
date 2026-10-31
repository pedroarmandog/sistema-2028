/* ============================================================
   PetHub Mobile — Página: Configurações
   Perfil do usuário, notificações push e opções do app.
   ============================================================ */

window.PageConfiguracoes = (function () {
  "use strict";

  let _container = null;
  let _prefs = null;

  async function init(container) {
    _container = container;
    _renderShell(container);
    await _carregarDados(container);
  }

  function _renderShell(container) {
    const user = MobileAuth.getUsuario();
    const primeiroNome = (user?.nome || "").split(" ")[0] || "Usuário";
    const letraAvatar = (user?.nome || "U").charAt(0).toUpperCase();

    container.innerHTML = `
      <div class="page-wrapper" style="padding-top:12px">

        <!-- Perfil -->
        <div class="profile-card">
          <div class="profile-avatar">${escapeHtml(letraAvatar)}</div>
          <div>
            <div class="profile-name">${escapeHtml(user?.nome || "Usuário")}</div>
            ${user?.empresaNome ? `<div class="profile-empresa">${escapeHtml(user.empresaNome)}</div>` : ""}
            ${user?.grupoUsuario ? `<div class="profile-grupo">${escapeHtml(user.grupoUsuario)}</div>` : ""}
          </div>
        </div>

        <!-- Instalar App -->
        <div id="install-section" style="display:none;margin-bottom:20px">
          <div class="install-prompt">
            <span style="font-size:28px">📲</span>
            <div class="install-prompt-text">
              <div class="install-prompt-title">Instalar PetHub</div>
              <div class="install-prompt-sub">Adicione à tela inicial para acesso rápido sem abrir o navegador</div>
            </div>
          </div>
          <button class="btn btn-primary btn-full" id="btn-instalar" style="margin-top:10px">
            Instalar App
          </button>
        </div>

        <!-- Notificações Push -->
        <div class="card" style="margin-bottom:16px">
          <div class="card-title">🔔 Notificações</div>

          <div id="push-status-banner" style="margin-bottom:12px"></div>

          <div id="notif-toggle-master" class="settings-toggle">
            <div class="settings-toggle-info">
              <div class="settings-toggle-label">Ativar notificações</div>
              <div class="settings-toggle-sub">Receba alertas mesmo com o app fechado</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="toggle-notif-master">
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div id="notif-prefs-section" style="display:none">
            <div class="divider"></div>
            <p style="font-size:12px;color:var(--muted);margin-bottom:12px">Escolha quais eventos receber:</p>

            ${_renderPrefToggle("novo_agendamento", "📅 Novo agendamento", "Quando um agendamento é criado")}
            ${_renderPrefToggle("checkin_pet", "🐾 Pet chegou", "Quando um pet faz check-in")}
            ${_renderPrefToggle("servico_concluido", "✅ Serviço concluído", "Quando um serviço é finalizado")}
            ${_renderPrefToggle("pagamento_recebido", "💰 Pagamento recebido", "Quando um pagamento é registrado")}
            ${_renderPrefToggle("cancelamento", "❌ Cancelamento", "Quando um agendamento é cancelado")}
            ${_renderPrefToggle("meta_atingida", "🎯 Meta atingida", "Quando a meta diária é batida")}
            ${_renderPrefToggle("estoque_baixo", "📦 Estoque baixo", "Quando um produto atinge o mínimo")}
            ${_renderPrefToggle("novo_cliente", "👤 Novo cliente", "Quando um novo cliente se cadastra")}
          </div>
        </div>

        <!-- Informações do App -->
        <div class="card" style="margin-bottom:16px">
          <div class="card-title">ℹ️ Sobre</div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <div class="settings-toggle" style="padding:8px 0">
              <div class="settings-toggle-info">
                <div class="settings-toggle-label">Versão</div>
              </div>
              <span style="font-size:13px;color:var(--muted)">PetHub Mobile 1.0</span>
            </div>
            <div class="settings-toggle" style="padding:8px 0;border:none">
              <div class="settings-toggle-info">
                <div class="settings-toggle-label">Acessar sistema completo</div>
                <div class="settings-toggle-sub">Desktop com todas as funcionalidades</div>
              </div>
              <a href="/dashboard.html" style="font-size:13px;font-weight:600;color:var(--green)">Abrir →</a>
            </div>
          </div>
        </div>

        <!-- Sair -->
        <button class="btn btn-danger btn-full" id="btn-sair" style="margin-bottom:8px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sair da conta
        </button>

        <p class="version-tag">PetHub Mobile v1.0 · pethubflow.com.br</p>

      </div>
    `;

    _bindEvents(container);
  }

  async function _carregarDados(container) {
    // Verificar se o app pode ser instalado
    if (window.canInstallPWA && canInstallPWA()) {
      const installSection = container.querySelector("#install-section");
      if (installSection) installSection.style.display = "block";
    }

    window.addEventListener("pwa:installable", () => {
      const installSection = container?.querySelector("#install-section");
      if (installSection) installSection.style.display = "block";
    });

    // Verificar estado das notificações push
    await _atualizarEstadoPush(container);
  }

  async function _atualizarEstadoPush(container) {
    const masterToggle = container.querySelector("#toggle-notif-master");
    const prefsSection = container.querySelector("#notif-prefs-section");
    const banner = container.querySelector("#push-status-banner");
    if (!masterToggle) return;

    const suportado = MobilePush.isSupported();
    const permissao = MobilePush.getPermissionStatus();
    const subscrito = suportado ? await MobilePush.isSubscribed() : false;

    if (!suportado) {
      if (banner)
        banner.innerHTML = `
        <div style="background:rgba(255,183,77,0.1);border:1px solid rgba(255,183,77,0.3);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--warning)">
          ⚠️ Notificações push não são suportadas neste dispositivo/navegador.
          ${/safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent) ? "<br>No iPhone, adicione à tela inicial e use iOS 16.4+." : ""}
        </div>
      `;
      masterToggle.disabled = true;
      return;
    }

    if (permissao === "denied") {
      if (banner)
        banner.innerHTML = `
        <div style="background:rgba(255,77,109,0.1);border:1px solid rgba(255,77,109,0.3);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--danger)">
          ❌ Notificações bloqueadas. Ative nas configurações do navegador/dispositivo.
        </div>
      `;
      masterToggle.disabled = true;
      return;
    }

    masterToggle.checked = subscrito;
    if (prefsSection && subscrito) prefsSection.style.display = "block";

    // Carregar preferências
    if (subscrito) {
      _prefs = await MobilePush.getPreferencias();
      _aplicarPreferencias(container, _prefs);
    }
  }

  function _bindEvents(container) {
    // Instalar
    const btnInstalar = container.querySelector("#btn-instalar");
    if (btnInstalar) {
      btnInstalar.addEventListener("click", async () => {
        btnInstalar.disabled = true;
        const ok = await window.installPWA?.();
        if (!ok) {
          btnInstalar.disabled = false;
          MobileToast.info(
            "Use o menu do navegador para 'Adicionar à tela inicial'",
          );
        }
      });
    }

    // Toggle master de notificações
    const masterToggle = container.querySelector("#toggle-notif-master");
    const prefsSection = container.querySelector("#notif-prefs-section");
    if (masterToggle) {
      masterToggle.addEventListener("change", async () => {
        masterToggle.disabled = true;
        if (masterToggle.checked) {
          const result = await MobilePush.ativarNotificacoes();
          if (result.ok) {
            MobileToast.success(result.message);
            if (prefsSection) prefsSection.style.display = "block";
            _prefs = await MobilePush.getPreferencias();
            _aplicarPreferencias(container, _prefs);
          } else {
            MobileToast.error(result.message);
            masterToggle.checked = false;
          }
        } else {
          const result = await MobilePush.desativarNotificacoes();
          MobileToast[result.ok ? "success" : "error"](result.message);
          if (prefsSection) prefsSection.style.display = "none";
        }
        masterToggle.disabled = false;
      });
    }

    // Toggles de preferências individuais
    container.querySelectorAll(".pref-toggle").forEach((checkbox) => {
      checkbox.addEventListener("change", async () => {
        if (!_prefs) _prefs = {};
        _prefs[checkbox.dataset.pref] = checkbox.checked;
        try {
          await MobilePush.salvarPreferencias(_prefs);
        } catch (err) {
          MobileToast.error("Erro ao salvar preferência");
          checkbox.checked = !checkbox.checked; // reverter
        }
      });
    });

    // Sair
    const btnSair = container.querySelector("#btn-sair");
    if (btnSair) {
      btnSair.addEventListener("click", async () => {
        const confirmado = await _mostrarModalConfirmacao({
          icone: "🚪",
          titulo: "Sair da conta",
          mensagem: "Tem certeza que deseja sair?",
          textoConfirmar: "Sair",
          textoCancelar: "Cancelar",
          perigo: true,
        });

        if (confirmado) {
          await MobileAuth.logout();
        }
      });
    }
  }

  function _aplicarPreferencias(container, prefs) {
    if (!prefs) return;
    Object.entries(prefs).forEach(([key, value]) => {
      const el = container.querySelector(`[data-pref="${key}"]`);
      if (el) el.checked = !!value;
    });
  }

  function _mostrarModalConfirmacao({ icone, titulo, mensagem, textoConfirmar, textoCancelar, perigo }) {
    return new Promise((resolve) => {
      // Criar overlay
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";
      overlay.innerHTML = `
        <div class="modal-dialog">
          <div class="modal-icon">${icone}</div>
          <div class="modal-title">${escapeHtml(titulo)}</div>
          <div class="modal-message">${escapeHtml(mensagem)}</div>
          <div class="modal-actions">
            <button class="btn modal-btn-cancel" id="modal-cancelar">${escapeHtml(textoCancelar)}</button>
            <button class="btn modal-btn-confirm" id="modal-confirmar">${escapeHtml(textoConfirmar)}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      // Animar entrada
      requestAnimationFrame(() => {
        overlay.classList.add("modal-visible");
      });

      // Fechar ao clicar no overlay
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          _fecharModal(overlay, false, resolve);
        }
      });

      // Botões
      const btnCancelar = overlay.querySelector("#modal-cancelar");
      const btnConfirmar = overlay.querySelector("#modal-confirmar");

      btnCancelar.addEventListener("click", () => {
        _fecharModal(overlay, false, resolve);
      });

      btnConfirmar.addEventListener("click", () => {
        _fecharModal(overlay, true, resolve);
      });

      // Teclado ESC
      const handleEsc = (e) => {
        if (e.key === "Escape") {
          _fecharModal(overlay, false, resolve);
          document.removeEventListener("keydown", handleEsc);
        }
      };
      document.addEventListener("keydown", handleEsc);
    });
  }

  function _fecharModal(overlay, resultado, resolve) {
    overlay.classList.remove("modal-visible");
    setTimeout(() => {
      overlay.remove();
      resolve(resultado);
    }, 250);
  }

  function refresh() {}
  function destroy() {
    _container = null;
    _prefs = null;
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function _renderPrefToggle(key, label, sub) {
    return `
      <div class="settings-toggle">
        <div class="settings-toggle-info">
          <div class="settings-toggle-label">${label}</div>
          <div class="settings-toggle-sub">${sub}</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" class="pref-toggle" data-pref="${key}" checked>
          <span class="toggle-slider"></span>
        </label>
      </div>
    `;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  return { init, refresh, destroy };
})();
