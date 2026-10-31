/* ============================================================
   PetHub Mobile — Auth Service
   Gerenciamento de sessão, heartbeat e estado do usuário.
   Usa o token JWT via Authorization header (mais confiável que
   cookie HttpOnly em PWA/iOS, que tem bugs de envio de cookie).
   ============================================================ */

window.MobileAuth = (function () {
  "use strict";

  // Estado em memória (primária) + localStorage (persistente).
  // O token é persistido em localStorage para que a sessão sobreviva a
  // fechar/minimizar o PWA, reiniciar o celular e abrir o app depois de
  // horas — a sessão só acaba com "Sair" explícito ou invalidação real
  // no servidor. (Trade-off: localStorage é legível por XSS, mesmo nível
  // do sessionStorage anterior, porém persistente; o backend também mantém
  // o cookie HttpOnly de 30 dias como camada de fallback.)
  let _currentUser = null;
  let _token = null; // JWT guardado em memória
  let _heartbeatTimer = null;
  let _heartbeatFalhas = 0;
  const HEARTBEAT_INTERVAL = 60_000; // 60s — igual ao desktop
  const MAX_FALHAS_HEARTBEAT = 2; // desloga apenas após 2 falhas consecutivas
  const TOKEN_STORAGE_KEY = "pethub_mobile_token";

  /**
   * Guarda o token em memória (primária) e localStorage (persistente).
   * O localStorage sobrevive ao fechamento/reabertura do PWA, ao reinício do
   * celular e a longos períodos sem uso — a sessão só acaba com "Sair"
   * explícito ou invalidação real no servidor.
   */
  function _setToken(token) {
    _token = token || null;
    try {
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        // Limpar chave legada (versões anteriores gravavam só em sessionStorage)
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch (_) {}
  }

  /**
   * Recupera o token (memória → localStorage → sessionStorage legado).
   */
  function _getToken() {
    if (_token) return _token;
    try {
      _token = localStorage.getItem(TOKEN_STORAGE_KEY) || null;
    } catch (_) {
      _token = null;
    }
    // Abas/instâncias antigas podem ter o token apenas no sessionStorage
    if (!_token) {
      try {
        _token = sessionStorage.getItem(TOKEN_STORAGE_KEY) || null;
      } catch (_) {
        _token = null;
      }
    }
    return _token;
  }

  /**
   * Verifica se há sessão ativa no servidor.
   * Usa o token JWT via Authorization header (se disponível).
   * @returns {Promise<{id, nome, empresaId, grupoUsuario} | null>}
   */
  async function verificarSessao() {
    const token = _getToken();
    try {
      // Usa noAutoRedirect para não redirecionar a página ao verificar a sessão
      const data = await MobileApi.request("/api/usuarios/me", {
        noAutoRedirect: true,
        headers: token ? { Authorization: "Bearer " + token } : {},
      });
      _currentUser = {
        id: data.id,
        nome: data.nome || "Usuário",
        empresaId: data.empresaId,
        grupoUsuario: data.grupoUsuario,
        empresaNome: data.empresaNome || "",
      };
      _heartbeatFalhas = 0;
      return _currentUser;
    } catch (err) {
      // Sem conexão com o servidor NÃO significa logout: mantém o token/sessão
      // e sinaliza ao boot que deve aguardar a rede — em vez de mostrar login.
      if (err.offline) {
        console.warn(
          "[MobileAuth] Sem conexão ao verificar sessão — sessão preservada",
        );
        return { __offline: true };
      }
      // Erro HTTP real (401 sem sessão válida, servidor recusando, etc.)
      _currentUser = null;
      return null;
    }
  }

  /**
   * Realiza o login.
   * Usa o mesmo endpoint do sistema desktop — sem alteração no backend.
   * Guarda o token JWT retornado para usar via Authorization header.
   * @param {string} usuario
   * @param {string} senha
   * @returns {Promise<{nome, empresaId, ...}>}
   */
  async function login(usuario, senha) {
    let deviceId = null;
    try {
      deviceId = localStorage.getItem("pethub_device_id");
      if (!deviceId) {
        deviceId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now().toString(36) + Math.random().toString(36);
        localStorage.setItem("pethub_device_id", deviceId);
      }
    } catch (_) {}

    const data = await MobileApi.post("/api/usuarios/login", {
      usuario,
      senha,
      device_id: deviceId,
    });

    if (data.bloqueado) {
      window.location.href = "/painel-admin/sistema-bloqueado.html";
      return;
    }

    // Guardar o token JWT retornado pelo backend
    const token = data.token || data.usuario?.token || null;
    if (token) {
      _setToken(token);
      console.log("[MobileAuth] Token JWT guardado para Authorization header");
    } else {
      console.warn("[MobileAuth] Login não retornou token — dependendo do cookie");
    }

    _currentUser = {
      id: data.id || data.usuario?.id,
      nome: data.nome || data.usuario?.nome || "Usuário",
      empresaId: data.empresaId || data.empresa_id || data.usuario?.empresaId,
      grupoUsuario: data.grupoUsuario || data.usuario?.grupoUsuario,
      empresaNome: data.empresaNome || data.empresa?.nome || "",
    };

    _heartbeatFalhas = 0;
    iniciarHeartbeat();
    return _currentUser;
  }

  /**
   * Realiza o logout.
   */
  async function logout() {
    pararHeartbeat();
    _currentUser = null;
    _heartbeatFalhas = 0;
    const token = _getToken();
    try {
      await MobileApi.post("/api/usuarios/logout", {
        device_id: _getDeviceId(),
        headers: token ? { Authorization: "Bearer " + token } : {},
      });
    } catch (_) {
      // Ignorar erros de rede no logout
    }
    _setToken(null); // limpar token
    window.location.href = "/mobile/app.html?logout=1";
  }

  /**
   * Retorna o usuário atual (cache em memória).
   * @returns {{id, nome, empresaId, grupoUsuario, empresaNome} | null}
   */
  function getUsuario() {
    return _currentUser;
  }

  /**
   * Define o usuário atual (chamado após login bem-sucedido).
   */
  function setUsuario(user) {
    _currentUser = user;
  }

  /**
   * Retorna o token JWT atual (usado pelo MobileApi para Authorization header).
   */
  function getToken() {
    return _getToken();
  }

  /**
   * Inicia o heartbeat — mantém a sessão ativa a cada 60s.
   * IMPORTANTE: não desloga em 401/erro transiente.
   * Só desloga após 2 falhas CONSECUTIVAS explícitas.
   */
  function iniciarHeartbeat() {
    pararHeartbeat();
    _heartbeatFalhas = 0;
    _heartbeatTimer = setInterval(async () => {
      const token = _getToken();
      try {
        const resp = await MobileApi.request("/api/usuarios/heartbeat", {
          method: "POST",
          body: { device_id: _getDeviceId() },
          noAutoRedirect: true, // controlamos o redirect aqui
          headers: token ? { Authorization: "Bearer " + token } : {},
        });

        // Servidor sinalizou sessão encerrada (HTTP 200 com ativa:false)
        if (resp && resp.ativa === false) {
          _heartbeatFalhas++;
          console.warn(
            `[MobileAuth] Heartbeat: sessão inativa (${_heartbeatFalhas}/${MAX_FALHAS_HEARTBEAT}) motivo:`,
            resp.motivo || "desconhecido",
          );
          if (_heartbeatFalhas >= MAX_FALHAS_HEARTBEAT) {
            _heartbeatFalhas = 0;
            _handleSessaoEncerrada();
          }
        } else {
          // Sessão ativa (ou motivo "no_record"/"db_error" — manter conectado)
          _heartbeatFalhas = 0;
        }
      } catch (err) {
        if (err.status === 401) {
          // 401 do heartbeat — só deslogar após 2 falhas consecutivas
          _heartbeatFalhas++;
          console.warn(
            `[MobileAuth] Heartbeat 401 (${_heartbeatFalhas}/${MAX_FALHAS_HEARTBEAT})`,
          );
          if (_heartbeatFalhas >= MAX_FALHAS_HEARTBEAT) {
            _heartbeatFalhas = 0;
            _handleSessaoEncerrada();
          }
        } else {
          // Erro de rede/offline/5xx — NÃO conta como falha de sessão
          _heartbeatFalhas = 0;
        }
      }
    }, HEARTBEAT_INTERVAL);
  }

  /**
   * Para o heartbeat.
   */
  function pararHeartbeat() {
    if (_heartbeatTimer) {
      clearInterval(_heartbeatTimer);
      _heartbeatTimer = null;
    }
  }

  /**
   * Obtém o device_id persistente (mesmo usado no login).
   */
  function _getDeviceId() {
    try {
      return localStorage.getItem("pethub_device_id") || null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Sessão encerrada de forma confirmada — navega para login.
   */
  function _handleSessaoEncerrada() {
    pararHeartbeat();
    _currentUser = null;
    _setToken(null);
    window.location.href = "/mobile/app.html?logout=1";
  }

  return {
    verificarSessao,
    login,
    logout,
    getUsuario,
    setUsuario,
    getToken,
    iniciarHeartbeat,
    pararHeartbeat,
  };
})();