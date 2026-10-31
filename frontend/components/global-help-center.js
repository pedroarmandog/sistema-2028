// ================================================================
//  GLOBAL HELP CENTER — COMPONENTE GLOBAL PETHUB
//  Carregado automaticamente via sidebar-component/inject-sidebar.js
//  NÃO duplicar em páginas individuais.
// ================================================================

(function () {
  "use strict";

  // ── Guard: evitar dupla inicialização ───────────────────────
  if (window.__helpCenterInitialized) return;
  window.__helpCenterInitialized = true;

  // ── Utilitário: escape de HTML para evitar XSS ──────────────
  function esc(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ── Configuração (com fallbacks seguros) ────────────────────
  function cfg() {
    return window.HELP_CENTER_CONFIG || {};
  }

  function getPhraseOfDay() {
    var phrases = cfg().motivationalPhrases;
    if (!phrases || !phrases.length) return "Bom trabalho hoje! 🐾";
    var day = new Date().getDate();
    return phrases[day % phrases.length];
  }

  // ── Injetar CSS do componente ────────────────────────────────
  function injectStyles() {
    if (document.getElementById("global-help-center-styles")) return;
    var style = document.createElement("style");
    style.id = "global-help-center-styles";
    style.textContent = [
      // ── Botão do header ──────────────────────────────────────
      ".btn-help-center {",
      "  position: relative;",
      "  background: var(--bg-card, #fff);",
      "  border: 2px solid var(--border-primary, #dee2e6);",
      "  color: var(--text-primary, #333);",
      "  padding: 10px 12px;",
      "  border-radius: 8px;",
      "  cursor: pointer;",
      "  font-size: 16px;",
      "  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);",
      "  display: flex;",
      "  align-items: center;",
      "  justify-content: center;",
      "  min-width: 44px;",
      "  height: 44px;",
      "  flex-shrink: 0;",
      "}",
      ".btn-help-center:hover {",
      "  background: var(--btn-primary, #28a745);",
      "  color: #fff;",
      "  border-color: var(--btn-primary, #28a745);",
      "  transform: translateY(-2px);",
      "  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.25);",
      "}",
      ".btn-help-center:active {",
      "  transform: translateY(0);",
      "  box-shadow: 0 2px 6px rgba(40, 167, 69, 0.2);",
      "}",
      // ── Tooltip ──────────────────────────────────────────────
      ".btn-help-center .hc-tooltip {",
      "  position: absolute;",
      "  top: calc(100% + 12px);",
      "  left: 50%;",
      "  transform: translateX(-50%) translateY(-6px);",
      "  background: var(--bg-sidebar-start, #2c3e50);",
      "  color: #fff;",
      "  padding: 10px 14px;",
      "  border-radius: 10px;",
      "  font-size: 13px;",
      "  line-height: 1.5;",
      "  white-space: nowrap;",
      "  pointer-events: none;",
      "  opacity: 0;",
      "  visibility: hidden;",
      "  transition: opacity 0.22s ease, transform 0.22s ease, visibility 0.22s ease;",
      "  z-index: 99999;",
      "  box-shadow: 0 6px 20px rgba(0,0,0,0.18);",
      "  min-width: 220px;",
      "  text-align: left;",
      "}",
      ".btn-help-center .hc-tooltip::after {",
      '  content: "";',
      "  position: absolute;",
      "  bottom: 100%;",
      "  left: 50%;",
      "  transform: translateX(-50%);",
      "  border: 6px solid transparent;",
      "  border-bottom-color: var(--bg-sidebar-start, #2c3e50);",
      "}",
      ".btn-help-center .hc-tooltip .hc-tt-line1 {",
      "  font-weight: 700;",
      "  font-size: 13px;",
      "  margin-bottom: 4px;",
      "  display: block;",
      "}",
      ".btn-help-center .hc-tooltip .hc-tt-line2 {",
      "  font-size: 12px;",
      "  opacity: 0.85;",
      "  display: block;",
      "}",
      ".btn-help-center:hover .hc-tooltip {",
      "  opacity: 1;",
      "  visibility: visible;",
      "  transform: translateX(-50%) translateY(0);",
      "}",
      // ── Overlay ───────────────────────────────────────────────
      "#hc-overlay {",
      "  position: fixed;",
      "  inset: 0;",
      "  background: rgba(0,0,0,0.45);",
      "  z-index: 100000;",
      "  opacity: 0;",
      "  visibility: hidden;",
      "  transition: opacity 0.28s ease, visibility 0.28s ease;",
      "  backdrop-filter: blur(2px);",
      "  -webkit-backdrop-filter: blur(2px);",
      "}",
      "#hc-overlay.hc-open {",
      "  opacity: 1;",
      "  visibility: visible;",
      "}",
      // ── Modal ────────────────────────────────────────────────
      "#hc-modal {",
      "  position: fixed;",
      "  top: 50%;",
      "  left: 50%;",
      "  transform: translate(-50%, -50%) scale(0.92);",
      "  z-index: 100001;",
      "  width: 92%;",
      "  max-width: 560px;",
      "  background: #fff;",
      "  border-radius: 20px;",
      "  box-shadow: 0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08);",
      "  overflow: hidden;",
      "  opacity: 0;",
      "  visibility: hidden;",
      "  transition: opacity 0.3s cubic-bezier(0.34,1.56,0.64,1), transform 0.3s cubic-bezier(0.34,1.56,0.64,1), visibility 0.3s ease;",
      "}",
      "#hc-modal.hc-open {",
      "  opacity: 1;",
      "  visibility: visible;",
      "  transform: translate(-50%, -50%) scale(1);",
      "}",
      // ── Faixa do cabeçalho do modal ───────────────────────────
      ".hc-modal-header {",
      "  background: linear-gradient(135deg, #1a2a3a 0%, #2c3e50 60%, #3d5a73 100%);",
      "  padding: 28px 28px 20px;",
      "  position: relative;",
      "  text-align: center;",
      "}",
      ".hc-modal-header h2 {",
      "  margin: 0 0 6px;",
      "  font-size: 20px;",
      "  font-weight: 700;",
      "  color: #fff;",
      "  letter-spacing: -0.3px;",
      "}",
      ".hc-modal-header p {",
      "  margin: 0;",
      "  font-size: 13.5px;",
      "  color: rgba(255,255,255,0.78);",
      "  line-height: 1.5;",
      "}",
      // ── Botão fechar ─────────────────────────────────────────
      ".hc-close-btn {",
      "  position: absolute;",
      "  top: 14px;",
      "  right: 16px;",
      "  background: rgba(255,255,255,0.12);",
      "  border: none;",
      "  color: rgba(255,255,255,0.85);",
      "  width: 32px;",
      "  height: 32px;",
      "  border-radius: 50%;",
      "  cursor: pointer;",
      "  font-size: 16px;",
      "  display: flex;",
      "  align-items: center;",
      "  justify-content: center;",
      "  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;",
      "  line-height: 1;",
      "}",
      ".hc-close-btn:hover {",
      "  background: rgba(255,255,255,0.25);",
      "  color: #fff;",
      "  transform: rotate(90deg);",
      "}",
      // ── Corpo do modal ────────────────────────────────────────
      ".hc-modal-body {",
      "  padding: 28px 28px 24px;",
      "  display: flex;",
      "  flex-direction: column;",
      "  align-items: center;",
      "  gap: 18px;",
      "}",
      // ── Área do mascote ───────────────────────────────────────
      ".hc-mascot-area {",
      "  display: flex;",
      "  flex-direction: column;",
      "  align-items: center;",
      "  gap: 12px;",
      "  width: 100%;",
      "}",
      ".hc-mascot-wrap {",
      "  position: relative;",
      "  display: inline-flex;",
      "  align-items: flex-end;",
      "  justify-content: center;",
      "}",
      ".hc-mascot-wrap img {",
      "  height: 150px;",
      "  width: auto;",
      "  object-fit: contain;",
      "  filter: drop-shadow(0 8px 20px rgba(0,0,0,0.14));",
      "  transition: transform 0.3s ease;",
      "}",
      ".hc-mascot-wrap img:hover {",
      "  transform: translateY(-4px) scale(1.03);",
      "}",
      // ── Balão de fala ─────────────────────────────────────────
      ".hc-bubble {",
      "  background: linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 100%);",
      "  border: 1.5px solid #c8e0f4;",
      "  border-radius: 16px 16px 16px 4px;",
      "  padding: 12px 16px;",
      "  font-size: 13.5px;",
      "  color: #2c3e50;",
      "  line-height: 1.55;",
      "  text-align: center;",
      "  max-width: 420px;",
      "  width: 100%;",
      "  position: relative;",
      "  box-shadow: 0 2px 10px rgba(44,62,80,0.07);",
      "}",
      // ── Frase motivacional ────────────────────────────────────
      ".hc-phrase {",
      "  background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%);",
      "  border: 1.5px solid #ffd76e;",
      "  border-radius: 12px;",
      "  padding: 12px 18px;",
      "  font-size: 13.5px;",
      "  color: #7a5800;",
      "  text-align: center;",
      "  font-style: italic;",
      "  line-height: 1.5;",
      "  max-width: 420px;",
      "  width: 100%;",
      "  box-shadow: 0 2px 8px rgba(255,200,0,0.10);",
      "}",
      // ── Botão WhatsApp ────────────────────────────────────────
      ".hc-btn-whatsapp {",
      "  display: inline-flex;",
      "  align-items: center;",
      "  gap: 10px;",
      "  background: #28a745;",
      "  color: #fff;",
      "  border: none;",
      "  border-radius: 12px;",
      "  padding: 14px 32px;",
      "  font-size: 15px;",
      "  font-weight: 700;",
      "  cursor: pointer;",
      "  text-decoration: none;",
      "  transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;",
      "  box-shadow: 0 4px 16px rgba(40,167,69,0.28);",
      "  letter-spacing: 0.2px;",
      "  width: 100%;",
      "  max-width: 340px;",
      "  justify-content: center;",
      "}",
      ".hc-btn-whatsapp:hover {",
      "  background: #1e7e34;",
      "  transform: translateY(-2px);",
      "  box-shadow: 0 8px 24px rgba(40,167,69,0.35);",
      "}",
      ".hc-btn-whatsapp:active {",
      "  transform: translateY(0);",
      "  box-shadow: 0 3px 10px rgba(40,167,69,0.25);",
      "}",
      // ── Rodapé ────────────────────────────────────────────────
      ".hc-modal-footer {",
      "  padding: 0 28px 20px;",
      "  text-align: center;",
      "  font-size: 12.5px;",
      "  color: #999;",
      "}",
      // ── Responsivo ────────────────────────────────────────────
      "@media (max-width: 540px) {",
      "  #hc-modal { border-radius: 16px; }",
      "  .hc-modal-header { padding: 22px 18px 16px; }",
      "  .hc-modal-header h2 { font-size: 17px; }",
      "  .hc-modal-body { padding: 20px 18px 18px; gap: 14px; }",
      "  .hc-mascot-wrap img { height: 120px; }",
      "  .hc-modal-footer { padding: 0 18px 18px; }",
      "}",
    ].join("\n");
    document.head.appendChild(style);
  }

  // ── Construir HTML do botão do header ─────────────────────────
  function buildHeaderButton() {
    var c = cfg();
    var line1 = esc(c.tooltipLine1 || "🐾 Precisa de ajuda?");
    var line2 = esc(
      c.tooltipLine2 || "Clique aqui e entre em contato conosco pelo WhatsApp.",
    );

    var btn = document.createElement("button");
    btn.className = "btn-help-center";
    btn.id = "hcHeaderBtn";
    btn.setAttribute("aria-label", "Central de Ajuda");
    btn.setAttribute("type", "button");
    btn.innerHTML =
      '<i class="fas fa-headset"></i>' +
      '<span class="hc-tooltip">' +
      '<span class="hc-tt-line1">' +
      line1 +
      "</span>" +
      '<span class="hc-tt-line2">' +
      line2 +
      "</span>" +
      "</span>";

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      openModal();
    });

    return btn;
  }

  // ── Construir modal e overlay ─────────────────────────────────
  function buildModalDOM() {
    var c = cfg();
    var phrase = esc(getPhraseOfDay());
    var title = esc(c.headerTitle || "🐾 Central de Ajuda PetHub");
    var subtitle = esc(
      c.headerSubtitle ||
        "Estamos aqui para ajudar você a aproveitar ao máximo todos os recursos do sistema.",
    );
    var bubble = esc(
      c.mascotBubble ||
        "💭 Olá! Eu sou o Hub. Estou aqui para ajudar você a crescer seu pet shop.",
    );
    var btnText = esc(c.buttonText || "💬 Falar com Suporte");
    var footer = esc(
      c.footerText || "⚡ Nossa equipe costuma responder rapidamente.",
    );
    var imgSrc = c.mascotePath || "";
    var imgAlt = esc(c.mascoteAlt || "Mascote PetHub");
    var waNum = encodeURIComponent(c.whatsappNumber || "5527998538741");
    var waMsg = encodeURIComponent(
      c.whatsappMessage || "Olá! Preciso de ajuda com o sistema PetHub. 🐾",
    );
    var waUrl = "https://wa.me/" + waNum + "?text=" + waMsg;

    // Overlay
    var overlay = document.createElement("div");
    overlay.id = "hc-overlay";
    overlay.addEventListener("click", function () {
      closeModal();
    });

    // Modal
    var modal = document.createElement("div");
    modal.id = "hc-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Central de Ajuda PetHub");
    modal.innerHTML =
      '<div class="hc-modal-header">' +
      '<button class="hc-close-btn" id="hcCloseBtn" aria-label="Fechar" type="button">' +
      '<i class="fas fa-times"></i>' +
      "</button>" +
      "<h2>" +
      title +
      "</h2>" +
      "<p>" +
      subtitle +
      "</p>" +
      "</div>" +
      '<div class="hc-modal-body">' +
      '<div class="hc-mascot-area">' +
      '<div class="hc-mascot-wrap">' +
      (imgSrc
        ? '<img src="' + imgSrc + '" alt="' + imgAlt + '" loading="lazy" />'
        : '<i class="fas fa-headset" style="font-size:80px;color:#2c3e50;opacity:0.5;"></i>') +
      "</div>" +
      '<div class="hc-bubble">' +
      bubble +
      "</div>" +
      "</div>" +
      '<div class="hc-phrase">' +
      phrase +
      "</div>" +
      '<a class="hc-btn-whatsapp" id="hcWhatsappBtn" href="' +
      waUrl +
      '" target="_blank" rel="noopener noreferrer">' +
      '<i class="fab fa-whatsapp" style="font-size:18px;"></i>' +
      btnText +
      "</a>" +
      "</div>" +
      '<div class="hc-modal-footer">' +
      footer +
      "</div>";

    modal.querySelector("#hcCloseBtn").addEventListener("click", function () {
      closeModal();
    });

    document.body.appendChild(overlay);
    document.body.appendChild(modal);
  }

  // ── Abrir / Fechar modal ─────────────────────────────────────
  function openModal() {
    var overlay = document.getElementById("hc-overlay");
    var modal = document.getElementById("hc-modal");
    if (!overlay || !modal) return;
    // Atualizar URL do WhatsApp com o config mais recente (evita race condition)
    var waBtn = document.getElementById("hcWhatsappBtn");
    if (waBtn) {
      var c = cfg();
      var waNum = encodeURIComponent(c.whatsappNumber || "5527998538741");
      var waMsg = encodeURIComponent(
        c.whatsappMessage ||
          "Ol\u00e1! Preciso de ajuda com o sistema PetHub. \uD83D\uDC3E",
      );
      waBtn.href = "https://wa.me/" + waNum + "?text=" + waMsg;
    }
    overlay.classList.add("hc-open");
    modal.classList.add("hc-open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    var overlay = document.getElementById("hc-overlay");
    var modal = document.getElementById("hc-modal");
    if (!overlay || !modal) return;
    overlay.classList.remove("hc-open");
    modal.classList.remove("hc-open");
    document.body.style.overflow = "";
  }

  // ── Inserir botão no .header-right: após .calendar-widget se existir,
  //    senão como primeiro filho de .header-right ────────────────
  function mountHeaderButton() {
    // Evitar botão duplicado
    if (document.getElementById("hcHeaderBtn")) return;

    var headerRight = document.querySelector(".header-right");
    if (!headerRight) return;

    var btn = buildHeaderButton();
    var calendar = headerRight.querySelector(".calendar-widget");

    if (calendar) {
      // Inserir imediatamente ANTES do calendário
      headerRight.insertBefore(btn, calendar);
    } else {
      // Sem calendário: inserir como primeiro filho
      headerRight.insertBefore(btn, headerRight.firstChild);
    }
  }

  // ── Inicialização ─────────────────────────────────────────────
  function init() {
    injectStyles();
    buildModalDOM();
    mountHeaderButton();

    // ESC fecha o modal
    document.addEventListener("keydown", function (e) {
      if (
        (e.key === "Escape" || e.keyCode === 27) &&
        document.getElementById("hc-modal").classList.contains("hc-open")
      ) {
        closeModal();
      }
    });

    // MutationObserver de fallback: garante que o botão é inserido mesmo em
    // páginas que constroem o header-right dinamicamente após o carregamento.
    var observer = new MutationObserver(function () {
      if (
        !document.getElementById("hcHeaderBtn") &&
        document.querySelector(".header-right")
      ) {
        mountHeaderButton();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Para de observar após inserção bem-sucedida (cleanup de performance)
    var cleanup = setInterval(function () {
      if (document.getElementById("hcHeaderBtn")) {
        observer.disconnect();
        clearInterval(cleanup);
      }
    }, 1000);
  }

  // ── Entry point ───────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
