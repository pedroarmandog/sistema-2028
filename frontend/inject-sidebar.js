// Proxy shim: serve como compatibilidade para includes que usam
// `/frontend/inject-sidebar.js` enquanto o arquivo original vive em
// `/frontend/sidebar-component/inject-sidebar.js`.
(function () {
  // ── Carregar system-modal.js SINCRONAMENTE (antes de qualquer alert) ──
  if (
    !document.querySelector("script[data-system-modal]") &&
    typeof window.confirmar === "undefined"
  ) {
    document.write(
      '<script src="/components/system-modal.js" data-system-modal="1"><\/script>',
    );
  }

  if (document.currentScript && document.currentScript.dataset.injectedShim)
    return;
  if (document.querySelector("script[data-inject-sidebar-proxy]")) return;
  try {
    var s = document.createElement("script");
    s.src = "/sidebar-component/inject-sidebar.js";
    s.defer = true;
    s.dataset.injectSidebarProxy = "1";
    document.head.appendChild(s);
  } catch (e) {
    console.warn("inject-sidebar shim failed", e);
  }
})();
