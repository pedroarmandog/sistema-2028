/* ============================================================
   PetHub Mobile — API Service
   Cliente HTTP centralizado para todas as chamadas à API.
   Reutiliza a lógica de autenticação do sistema desktop:
   - Cookies HttpOnly (JWT) enviados automaticamente via same-origin
   - Trata 401/403 com redirecionamento inteligente
   - NÃO derruba a sessão em 401 transiente — exige 2 falhas
     consecutivas com sinalização explícita do servidor
   ============================================================ */

window.MobileApi = (function () {
  "use strict";

  // Base URL: segue a mesma lógica do api-config.js do desktop
  function getBase() {
    return window.VPS_URL || window.API_URL || "";
  }

  // Contador de 401 consecutivos (evita deslogar por erro transiente/rede)
  let _falhas401Consecutivas = 0;
  const MAX_FALHAS_401 = 2; // mesmo comportamento do desktop

  /**
   * Decide se um 401 deve derrubar a sessão.
   * Só redireciona quando o servidor sinaliza EXPLICITAMENTE:
   *   - encerrado: true   (admin encerrou / sessão derrubada)
   *   - expirado: true    (inatividade de 8h)
   *   - mensagem contém "autenticad" (Não autenticado)
   * 401 genéricos (permissão, token expirado transiente) NÃO derrubam.
   */
  function _deveDeslogar(body) {
    if (!body) return true; // sem corpo = não autenticado
    if (body.encerrado === true) return true;
    if (body.expirado === true) return true;
    if (typeof body.mensagem === "string" && body.mensagem.toLowerCase().includes("autenticad")) {
      return true;
    }
    // 401 com corpo porém sem sinalização explícita — não derrubar
    return false;
  }

  /**
   * Redireciona para a tela de login limpando o estado local.
   * Usa replace para não poluir o histórico.
   */
  function _forcarLogout() {
    // Limpar cookies legados de sessão (best-effort)
    try {
      const _cookieDomain = window.location.hostname.includes(".")
        ? "; domain=." + window.location.hostname.split(".").slice(-2).join(".")
        : "";
      const _exp = "; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
      document.cookie = "usuarioLogadoId=" + _exp + _cookieDomain;
      document.cookie = "usuarioLogadoNome=" + _exp + _cookieDomain;
      document.cookie = "usuarioLogadoId=" + _exp;
      document.cookie = "usuarioLogadoNome=" + _exp;
    } catch (_) {}
    window.location.href = "/mobile/app.html?logout=1";
  }

  /**
   * Requisição genérica com tratamento de erros.
   * @param {string} endpoint  — ex: "/api/dashboard/resumo"
   * @param {object} options   — opções do fetch (method, body, etc.)
   * @returns {Promise<any>}   — JSON parsado ou throws Error
   */
  async function request(endpoint, options = {}) {
    const url = getBase() + endpoint;

    // Adicionar Authorization header com o token JWT (se disponível).
    // Isso contorna o problema do cookie HttpOnly não ser enviado em PWA/iOS.
    // O backend (authUser) já aceita o token via header como fallback.
    let authHeaders = {};
    try {
      if (window.MobileAuth && typeof window.MobileAuth.getToken === "function") {
        const token = window.MobileAuth.getToken();
        if (token) {
          authHeaders = { Authorization: "Bearer " + token };
        }
      }
    } catch (_) {}

    const config = {
      // Começar com options para que os defaults NÃO sobrescrevam as configurações
      // importantes como credentials e headers
      ...options,
      method: options.method || "GET",
      credentials: "include", // envia cookies HttpOnly JWT (fallback)
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...authHeaders,
        ...(options.headers || {}),
      },
    };

    if (options.body && typeof options.body === "object") {
      config.body = JSON.stringify(options.body);
    }

    let response;
    try {
      response = await fetch(url, config);
    } catch (networkErr) {
      // Erro de rede NÃO é motivo para deslogar
      _falhas401Consecutivas = 0;
      throw Object.assign(new Error("Sem conexão com o servidor"), {
        offline: true,
        originalError: networkErr,
      });
    }

    // Extrair corpo JSON (se houver)
    let body = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        body = await response.json();
      } catch (_) {
        body = null;
      }
    }

    // Empresa bloqueada
    if (response.status === 403 && body?.bloqueado) {
      _falhas401Consecutivas = 0;
      window.location.href = "/painel-admin/sistema-bloqueado.html";
      return;
    }

    // Sessão expirada / não autenticado
    if (response.status === 401) {
      const deveDeslogar = _deveDeslogar(body);

      // noAutoRedirect: usado em verificarSessao para não redirecionar ao checar sessão
      if (options.noAutoRedirect) {
        // Não alterar o contador — apenas lançar o erro para quem chamou decidir
        throw Object.assign(new Error(body?.mensagem || "Não autorizado"), {
          status: 401,
          body,
        });
      }

      if (deveDeslogar) {
        _falhas401Consecutivas++;
        console.warn(
          `[MobileApi] 401 detectado (${_falhas401Consecutivas}/${MAX_FALHAS_401}) — mensagem:`,
          body?.mensagem || "(sem mensagem)",
        );
        if (_falhas401Consecutivas >= MAX_FALHAS_401) {
          _falhas401Consecutivas = 0;
          _forcarLogout();
          return;
        }
      } else {
        // 401 transiente (sem sinalização explícita): resetar contador
        _falhas401Consecutivas = 0;
      }

      throw Object.assign(new Error(body?.mensagem || "Não autorizado"), {
        status: 401,
        body,
      });
    }

    // Qualquer outra resposta HTTP é sucesso/erro normal — resetar contador de 401
    if (response.status >= 200 && response.status < 400) {
      _falhas401Consecutivas = 0;
    }

    if (!response.ok) {
      const msg =
        body?.mensagem ||
        body?.erro ||
        body?.error ||
        `Erro HTTP ${response.status}`;
      throw Object.assign(new Error(msg), { status: response.status, body });
    }

    return body;
  }

  /** GET simplificado */
  async function get(endpoint, params = {}) {
    const qs = Object.keys(params).length
      ? "?" + new URLSearchParams(params).toString()
      : "";
    return request(endpoint + qs);
  }

  /** POST simplificado */
  async function post(endpoint, data = {}) {
    return request(endpoint, { method: "POST", body: data });
  }

  /** PUT simplificado */
  async function put(endpoint, data = {}) {
    return request(endpoint, { method: "PUT", body: data });
  }

  /** DELETE simplificado */
  async function del(endpoint) {
    return request(endpoint, { method: "DELETE" });
  }

  return { request, get, post, put, del };
})();