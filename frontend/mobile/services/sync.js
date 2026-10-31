/* ============================================================
   PetHub Mobile — Sincronização em Tempo Real
   Usa BroadcastChannel API para sincronizar dados entre abas/dispositivos.
   ============================================================ */

window.MobileSync = (function () {
  "use strict";

  let _channel = null;
  let _listeners = new Map();
  let _isOnline = navigator.onLine;

  /**
   * Inicializa o canal de sincronização.
   */
  function init() {
    if (!("BroadcastChannel" in window)) {
      console.warn("[Sync] BroadcastChannel não suportado");
      return;
    }

    try {
      _channel = new BroadcastChannel("pethub-sync");
      _channel.addEventListener("message", _handleMessage);
      console.log("[Sync] Canal de sincronização iniciado");

      // Detectar mudanças de conexão
      window.addEventListener("online", () => {
        _isOnline = true;
        _notifyListeners("connection-change", { online: true });
      });

      window.addEventListener("offline", () => {
        _isOnline = false;
        _notifyListeners("connection-change", { online: false });
      });
    } catch (err) {
      console.error("[Sync] Erro ao inicializar:", err);
    }
  }

  /**
   * Manipula mensagens recebidas do canal.
   */
  function _handleMessage(event) {
    const { type, data, timestamp, source } = event.data || {};

    // Ignorar mensagens próprias
    if (source === _getSourceId()) return;

    // Ignorar mensagens antigas (mais de 5 minutos)
    if (timestamp && Date.now() - timestamp > 5 * 60 * 1000) return;

    console.log(`[Sync] Mensagem recebida: ${type}`, data);

    // Notificar listeners específicos
    _notifyListeners(type, data);

    // Ações globais baseadas no tipo
    switch (type) {
      case "cliente-atualizado":
      case "cliente-criado":
      case "cliente-removido":
        // Recarregar lista de clientes se estiver na página
        if (MobileRouter.current() === "pets") {
          const page = window.PagePets;
          if (page?.refresh) page.refresh();
        }
        break;

      case "agendamento-atualizado":
      case "agendamento-criado":
      case "agendamento-cancelado":
        // Recarregar agenda se estiver na página
        if (MobileRouter.current() === "agenda") {
          const page = window.PageAgenda;
          if (page?.refresh) page.refresh();
        }
        break;

      case "venda-realizada":
        // Recarregar financeiro se estiver na página
        if (MobileRouter.current() === "financeiro") {
          const page = window.PageFinanceiro;
          if (page?.refresh) page.refresh();
        }
        break;

      case "logout":
        // Outra aba fez logout — forçar logout aqui também
        window.location.href = "/mobile/app.html?logout=1";
        break;

      case "empresa-bloqueada":
        // Empresa foi bloqueada — redirecionar
        window.location.href = "/painel-admin/sistema-bloqueado.html";
        break;

      default:
        break;
    }
  }

  /**
   * Notifica todos os listeners de um tipo específico.
   */
  function _notifyListeners(type, data) {
    const callbacks = _listeners.get(type) || [];
    callbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (err) {
        console.error(`[Sync] Erro no listener de ${type}:`, err);
      }
    });
  }

  /**
   * Gera ID único para esta instância.
   */
  function _getSourceId() {
    if (!_sourceId) {
      _sourceId =
        sessionStorage.getItem("sync_source_id") ||
        Date.now().toString(36) + Math.random().toString(36).slice(2);
      try {
        sessionStorage.setItem("sync_source_id", _sourceId);
      } catch (e) {}
    }
    return _sourceId;
  }
  let _sourceId = null;

  /**
   * Envia uma mensagem para todas as abas/dispositivos.
   */
  function broadcast(type, data = {}) {
    if (!_channel) return;

    try {
      _channel.postMessage({
        type,
        data,
        timestamp: Date.now(),
        source: _getSourceId(),
      });
      console.log(`[Sync] Mensagem enviada: ${type}`);
    } catch (err) {
      console.error("[Sync] Erro ao enviar mensagem:", err);
    }
  }

  /**
   * Registra um listener para um tipo de evento.
   */
  function on(type, callback) {
    if (!_listeners.has(type)) {
      _listeners.set(type, []);
    }
    _listeners.get(type).push(callback);

    // Retorna função para remover o listener
    return () => {
      const callbacks = _listeners.get(type) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    };
  }

  /**
   * Remove todos os listeners de um tipo.
   */
  function off(type) {
    _listeners.delete(type);
  }

  /**
   * Verifica se está online.
   */
  function isOnline() {
    return _isOnline;
  }

  /**
   * Força sincronização de todos os dados.
   */
  async function forceSync() {
    console.log("[Sync] Forçando sincronização...");

    // Recarregar página atual
    const currentPage = MobileRouter.current();
    if (currentPage && currentPage !== "login") {
      const page = window[`Page${currentPage.charAt(0).toUpperCase() + currentPage.slice(1)}`];
      if (page?.refresh) {
        await page.refresh();
      }
    }
  }

  /**
   * Helper: broadcast de cliente atualizado
   */
  function broadcastClienteAtualizado(clienteId) {
    broadcast("cliente-atualizado", { clienteId, timestamp: Date.now() });
  }

  /**
   * Helper: broadcast de cliente criado
   */
  function broadcastClienteCriado(clienteId) {
    broadcast("cliente-criado", { clienteId, timestamp: Date.now() });
  }

  /**
   * Helper: broadcast de cliente removido
   */
  function broadcastClienteRemovido(clienteId) {
    broadcast("cliente-removido", { clienteId, timestamp: Date.now() });
  }

  /**
   * Helper: broadcast de agendamento atualizado
   */
  function broadcastAgendamentoAtualizado(agendamentoId) {
    broadcast("agendamento-atualizado", { agendamentoId, timestamp: Date.now() });
  }

  /**
   * Helper: broadcast de agendamento criado
   */
  function broadcastAgendamentoCriado(agendamentoId) {
    broadcast("agendamento-criado", { agendamentoId, timestamp: Date.now() });
  }

  /**
   * Helper: broadcast de agendamento cancelado
   */
  function broadcastAgendamentoCancelado(agendamentoId) {
    broadcast("agendamento-cancelado", { agendamentoId, timestamp: Date.now() });
  }

  /**
   * Helper: broadcast de venda realizada
   */
  function broadcastVendaRealizada(vendaId) {
    broadcast("venda-realizada", { vendaId, timestamp: Date.now() });
  }

  /**
   * Limpa o canal de sincronização.
   */
  function destroy() {
    if (_channel) {
      _channel.removeEventListener("message", _handleMessage);
      _channel.close();
      _channel = null;
    }
    _listeners.clear();
  }

  return {
    init,
    broadcast,
    on,
    off,
    isOnline,
    forceSync,
    destroy,
    // Helpers para broadcast de eventos específicos
    broadcastClienteAtualizado,
    broadcastClienteCriado,
    broadcastClienteRemovido,
    broadcastAgendamentoAtualizado,
    broadcastAgendamentoCriado,
    broadcastAgendamentoCancelado,
    broadcastVendaRealizada,
  };
})();
