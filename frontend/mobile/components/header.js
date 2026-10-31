/* ============================================================
   PetHub Mobile — Header Component
   Gerencia o cabeçalho do app: saudação, botão de refresh e logout.
   ============================================================ */

window.MobileHeader = (function () {
  "use strict";

  function getHoraSaudacao() {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  }

  /**
   * Renderiza o cabeçalho com a saudação do usuário.
   * @param {object} usuario — { nome, empresaNome }
   */
  function render(usuario) {
    const headerContent = document.getElementById("header-content");
    if (!headerContent) return;

    const primeiroNome = (usuario?.nome || "").split(" ")[0] || "Usuário";
    const empresaNome = usuario?.empresaNome || "";

    headerContent.innerHTML = `
      <div class="header-greeting">
        <span class="header-saudacao">${getHoraSaudacao()},</span>
        <span class="header-nome">${escapeHtml(primeiroNome)} 👋</span>
        ${empresaNome ? `<span class="header-empresa">${escapeHtml(empresaNome)}</span>` : ""}
      </div>
    `;
  }

  /**
   * Mostra o cabeçalho e configura eventos.
   * @param {object} opts — { onRefresh, onLogout }
   */
  function show({ onRefresh, onLogout } = {}) {
    const header = document.getElementById("app-header");
    if (header) header.hidden = false;

    const btnRefresh = document.getElementById("btn-refresh");
    if (btnRefresh && onRefresh) {
      btnRefresh.addEventListener("click", () => {
        // Animação de giro no botão
        btnRefresh.querySelector("svg").style.transition = "transform 0.6s";
        btnRefresh.querySelector("svg").style.transform = "rotate(360deg)";
        setTimeout(() => {
          if (btnRefresh.querySelector("svg")) {
            btnRefresh.querySelector("svg").style.transition = "";
            btnRefresh.querySelector("svg").style.transform = "";
          }
        }, 700);
        onRefresh();
      });
    }

    const btnLogout = document.getElementById("btn-notifications");
    // btn-notifications abre configuracoes por ora
    if (btnLogout) {
      btnLogout.addEventListener("click", () => {
        if (window.MobileRouter) MobileRouter.navigate("configuracoes");
      });
    }
  }

  /** Oculta o cabeçalho (usado na tela de login). */
  function hide() {
    const header = document.getElementById("app-header");
    if (header) header.hidden = true;
  }

  /** Mostra badge de notificação não lida. */
  function setBadge(visible) {
    const badge = document.getElementById("notif-badge");
    if (badge) badge.hidden = !visible;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  return { render, show, hide, setBadge, getHoraSaudacao };
})();
