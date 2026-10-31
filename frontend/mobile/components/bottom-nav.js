/* ============================================================
   PetHub Mobile — Bottom Navigation Component
   Gerencia a barra de navegação inferior e o roteamento de páginas.
   ============================================================ */

window.MobileBottomNav = (function () {
  "use strict";

  let _currentPage = null;
  let _onNavigate = null;

  /**
   * Inicializa a navegação inferior.
   * @param {function} onNavigate — callback(pageName) chamado ao trocar de página
   */
  function init(onNavigate) {
    _onNavigate = onNavigate;
    const nav = document.getElementById("bottom-nav");
    if (!nav) return;

    nav.querySelectorAll(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const page = btn.dataset.page;
        if (page && page !== _currentPage) {
          navigate(page);
        }
      });
    });
  }

  /**
   * Navega para uma página, atualizando o estado visual do nav.
   * @param {string} page
   */
  function navigate(page) {
    if (page === _currentPage) return;
    _currentPage = page;
    _updateActiveState(page);
    if (_onNavigate) _onNavigate(page);
  }

  /**
   * Exibe a barra de navegação.
   */
  function show() {
    const nav = document.getElementById("bottom-nav");
    if (nav) nav.hidden = false;
  }

  /**
   * Oculta a barra de navegação (tela de login).
   */
  function hide() {
    const nav = document.getElementById("bottom-nav");
    if (nav) nav.hidden = true;
  }

  /**
   * Atualiza o badge de um item do nav.
   * @param {string} page — "agenda" | "pets"
   * @param {number|string|null} count — null para ocultar
   */
  function setBadge(page, count) {
    const badge = document.getElementById(`nav-badge-${page}`);
    if (!badge) return;
    if (count === null || count === undefined || count === 0) {
      badge.hidden = true;
    } else {
      badge.textContent = count > 99 ? "99+" : String(count);
      badge.hidden = false;
    }
  }

  function _updateActiveState(activePage) {
    const nav = document.getElementById("bottom-nav");
    if (!nav) return;
    nav.querySelectorAll(".nav-item").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.page === activePage);
    });
  }

  return { init, navigate, show, hide, setBadge };
})();
