/**
 * System Modal — Substitui alert(), confirm() e prompt() nativos
 * por modais estilizados no padrão do sistema PetHub.
 *
 * Uso:
 *   alert("msg")                         → modal de alerta (override automático)
 *   await confirmar("msg")               → retorna true/false
 *   await confirmar("msg", "Titulo")     → com título customizado
 *   await solicitar("msg")               → retorna string ou null
 *   await solicitar("msg", "Titulo", "default") → com valor padrão
 */
(function () {
  "use strict";

  // ── CSS embutido ──
  const STYLE = `
    .sm-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      opacity: 0;
      transition: opacity 0.2s ease;
      backdrop-filter: blur(2px);
    }
    .sm-overlay.sm-show { opacity: 1; }
    .sm-overlay.sm-hide { opacity: 0; }

    .sm-box {
      background: #fff;
      border-radius: 12px;
      width: 420px;
      max-width: calc(100vw - 40px);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
      transform: scale(0.9) translateY(10px);
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      overflow: hidden;
    }
    .sm-overlay.sm-show .sm-box {
      transform: scale(1) translateY(0);
    }
    .sm-overlay.sm-hide .sm-box {
      transform: scale(0.9) translateY(10px);
    }

    .sm-header {
      padding: 20px 24px 0;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .sm-icon {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }
    .sm-icon-info { background: #ebf5ff; color: #3b82f6; }
    .sm-icon-warning { background: #fff8e1; color: #f59e0b; }
    .sm-icon-danger { background: #fef2f2; color: #ef4444; }
    .sm-icon-success { background: #ecfdf5; color: #10b981; }
    .sm-icon-input { background: #f0f4ff; color: #6366f1; }

    .sm-title {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
      margin: 0;
    }

    .sm-body {
      padding: 16px 24px 0;
    }
    .sm-message {
      font-size: 14px;
      color: #475569;
      line-height: 1.6;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .sm-input-wrap {
      margin-top: 14px;
    }
    .sm-input {
      width: 100%;
      padding: 10px 14px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      color: #1e293b;
      background: #f8fafc;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      box-sizing: border-box;
    }
    .sm-input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
      background: #fff;
    }

    .sm-actions {
      padding: 20px 24px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .sm-btn {
      padding: 9px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .sm-btn:active { transform: scale(0.97); }

    .sm-btn-cancel {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
    }
    .sm-btn-cancel:hover { background: #e2e8f0; }

    .sm-btn-ok {
      background: #6366f1;
      color: #fff;
    }
    .sm-btn-ok:hover { background: #4f46e5; }

    .sm-btn-danger {
      background: #ef4444;
      color: #fff;
    }
    .sm-btn-danger:hover { background: #dc2626; }

    .sm-btn-success {
      background: #10b981;
      color: #fff;
    }
    .sm-btn-success:hover { background: #059669; }
  `;

  // Injetar CSS uma vez
  if (!document.getElementById("sm-system-modal-css")) {
    var style = document.createElement("style");
    style.id = "sm-system-modal-css";
    style.textContent = STYLE;
    document.head.appendChild(style);
  }

  // ── Helpers ──
  function detectType(msg) {
    var s = (msg || "").toLowerCase();
    if (
      s.includes("excluir") ||
      s.includes("deletar") ||
      s.includes("remover") ||
      s.includes("apagar") ||
      s.includes("cancelar")
    )
      return "danger";
    if (
      s.includes("sucesso") ||
      s.includes("salvo") ||
      s.includes("criado") ||
      s.includes("atualizado")
    )
      return "success";
    if (
      s.includes("erro") ||
      s.includes("falha") ||
      s.includes("inválid") ||
      s.includes("obrigatório")
    )
      return "warning";
    return "info";
  }

  function iconForType(type) {
    var map = {
      info: "fa-info-circle",
      warning: "fa-exclamation-triangle",
      danger: "fa-trash-alt",
      success: "fa-check-circle",
      input: "fa-keyboard",
    };
    return map[type] || "fa-info-circle";
  }

  function titleForType(type) {
    var map = {
      info: "Aviso",
      warning: "Atenção",
      danger: "Confirmação",
      success: "Sucesso",
      input: "Entrada",
    };
    return map[type] || "Aviso";
  }

  function buildOverlay(content) {
    var overlay = document.createElement("div");
    overlay.className = "sm-overlay";
    overlay.innerHTML = content;
    document.body.appendChild(overlay);

    // Trigger animation
    requestAnimationFrame(function () {
      overlay.classList.add("sm-show");
    });

    return overlay;
  }

  function closeOverlay(overlay) {
    overlay.classList.remove("sm-show");
    overlay.classList.add("sm-hide");
    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 220);
  }

  // ── ALERT ──
  function systemAlert(msg) {
    var type = detectType(msg);
    var overlay = buildOverlay(
      '<div class="sm-box">' +
        '<div class="sm-header">' +
        '<div class="sm-icon sm-icon-' +
        type +
        '"><i class="fas ' +
        iconForType(type) +
        '"></i></div>' +
        '<h3 class="sm-title">' +
        titleForType(type) +
        "</h3>" +
        "</div>" +
        '<div class="sm-body"><p class="sm-message">' +
        escapeHtml(msg) +
        "</p></div>" +
        '<div class="sm-actions">' +
        '<button class="sm-btn sm-btn-ok" id="smAlertOk">OK</button>' +
        "</div>" +
        "</div>",
    );

    return new Promise(function (resolve) {
      var btnOk = overlay.querySelector("#smAlertOk");
      function done() {
        closeOverlay(overlay);
        resolve();
      }
      btnOk.addEventListener("click", done);
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) done();
      });
      btnOk.focus();
    });
  }

  // ── CONFIRM ──
  function systemConfirm(msg, titulo) {
    var type = detectType(msg);
    var t = titulo || titleForType(type);
    var btnClass = type === "danger" ? "sm-btn-danger" : "sm-btn-ok";

    var overlay = buildOverlay(
      '<div class="sm-box">' +
        '<div class="sm-header">' +
        '<div class="sm-icon sm-icon-' +
        type +
        '"><i class="fas ' +
        iconForType(type) +
        '"></i></div>' +
        '<h3 class="sm-title">' +
        escapeHtml(t) +
        "</h3>" +
        "</div>" +
        '<div class="sm-body"><p class="sm-message">' +
        escapeHtml(msg) +
        "</p></div>" +
        '<div class="sm-actions">' +
        '<button class="sm-btn sm-btn-cancel" id="smConfCancel">Cancelar</button>' +
        '<button class="sm-btn ' +
        btnClass +
        '" id="smConfOk">Confirmar</button>' +
        "</div>" +
        "</div>",
    );

    return new Promise(function (resolve) {
      var btnOk = overlay.querySelector("#smConfOk");
      var btnCancel = overlay.querySelector("#smConfCancel");

      function done(val) {
        closeOverlay(overlay);
        resolve(val);
      }
      btnOk.addEventListener("click", function () {
        done(true);
      });
      btnCancel.addEventListener("click", function () {
        done(false);
      });
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) done(false);
      });
      document.addEventListener("keydown", function handler(e) {
        if (e.key === "Escape") {
          done(false);
          document.removeEventListener("keydown", handler);
        }
        if (e.key === "Enter") {
          done(true);
          document.removeEventListener("keydown", handler);
        }
      });
      btnOk.focus();
    });
  }

  // ── PROMPT ──
  function systemPrompt(msg, titulo, valorPadrao) {
    var t = titulo || "Entrada";
    var overlay = buildOverlay(
      '<div class="sm-box">' +
        '<div class="sm-header">' +
        '<div class="sm-icon sm-icon-input"><i class="fas fa-keyboard"></i></div>' +
        '<h3 class="sm-title">' +
        escapeHtml(t) +
        "</h3>" +
        "</div>" +
        '<div class="sm-body">' +
        '<p class="sm-message">' +
        escapeHtml(msg) +
        "</p>" +
        '<div class="sm-input-wrap"><input class="sm-input" id="smPromptInput" type="text" value="' +
        escapeAttr(valorPadrao || "") +
        '" /></div>' +
        "</div>" +
        '<div class="sm-actions">' +
        '<button class="sm-btn sm-btn-cancel" id="smPromptCancel">Cancelar</button>' +
        '<button class="sm-btn sm-btn-ok" id="smPromptOk">Confirmar</button>' +
        "</div>" +
        "</div>",
    );

    return new Promise(function (resolve) {
      var input = overlay.querySelector("#smPromptInput");
      var btnOk = overlay.querySelector("#smPromptOk");
      var btnCancel = overlay.querySelector("#smPromptCancel");

      function done(val) {
        closeOverlay(overlay);
        resolve(val);
      }
      btnOk.addEventListener("click", function () {
        done(input.value);
      });
      btnCancel.addEventListener("click", function () {
        done(null);
      });
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) done(null);
      });
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          done(input.value);
        }
        if (e.key === "Escape") {
          done(null);
        }
      });
      setTimeout(function () {
        input.focus();
        input.select();
      }, 50);
    });
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str || ""));
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return (str || "")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ── Expor globalmente ──
  window.alertar = systemAlert;
  window.confirmar = systemConfirm;
  window.solicitar = systemPrompt;

  // Override do alert nativo
  window._alertOriginal = window.alert;
  window.alert = function (msg) {
    systemAlert(msg);
  };
})();
