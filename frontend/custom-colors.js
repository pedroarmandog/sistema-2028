// Carregamento centralizado da paleta da empresa.
(function(){if(window.PetHubTema||document.querySelector('script[data-tema-bootstrap]'))return;const s=document.createElement('script');s.src='/tema-bootstrap.js';s.dataset.temaBootstrap='1';document.head.appendChild(s);})();

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