/* ============================================================
   PetHub Mobile — Push Notification Service
   Gerencia Web Push API: permissão, subscription e preferências.
   Usa VAPID keys do backend para segurança.
   ============================================================ */

window.MobilePush = (function () {
  "use strict";

  let _swRegistration = null;

  /**
   * Configura o service worker registration (chamado pelo app.js).
   */
  function setRegistration(reg) {
    _swRegistration = reg;
  }

  /**
   * Verifica se o browser suporta Push Notifications.
   */
  function isSupported() {
    return (
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  }

  /**
   * Retorna o status atual de permissão.
   * @returns {"default"|"granted"|"denied"|"unsupported"}
   */
  function getPermissionStatus() {
    if (!isSupported()) return "unsupported";
    return Notification.permission;
  }

  /**
   * Solicita permissão e registra a subscription no backend.
   * @returns {Promise<{ok: boolean, message: string}>}
   */
  async function ativarNotificacoes() {
    if (!isSupported()) {
      return {
        ok: false,
        message: "Notificações push não suportadas neste dispositivo",
      };
    }

    if (!_swRegistration) {
      return { ok: false, message: "Service Worker não inicializado" };
    }

    // Verificar se o Service Worker está ativo (controlador da página)
    if (!navigator.serviceWorker.controller) {
      return {
        ok: false,
        message: "Service Worker não está ativo. Recarregue o app e tente novamente.",
      };
    }

    // Solicitar permissão ao usuário
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, message: "Permissão de notificação negada" };
    }

    try {
      console.log("[Push Front] ✅ Permissão concedida");
      console.log("[Push Front] ✅ Service Worker ativo");
      
      // Buscar chave pública VAPID do servidor
      console.log("[Push Front] 🔄 Buscando VAPID key...");
      const { vapidPublicKey } = await MobileApi.get(
        "/api/push/vapid-public-key",
      );
      if (!vapidPublicKey) throw new Error("VAPID key não disponível");
      console.log("[Push Front] ✅ VAPID key recebida:", vapidPublicKey.substring(0, 20) + "...");

      // Converter chave VAPID de Base64 para Uint8Array
      console.log("[Push Front] 🔄 Convertendo VAPID key...");
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      console.log("[Push Front] ✅ VAPID convertida:", applicationServerKey.length, "bytes");

      // Criar subscription
      console.log("[Push Front] 🔄 Chamando pushManager.subscribe()...");
      const subscription = await _swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      console.log("[Push Front] ✅ Subscription criada:", subscription.endpoint.substring(0, 60) + "...");

      // Detectar plataforma
      const plataforma = detectarPlataforma();
      console.log("[Push Front] ✅ Plataforma:", plataforma);

      // Enviar subscription para o backend
      console.log("[Push Front] 🔄 Enviando subscription para backend...");
      await MobileApi.post("/api/push/subscribe", {
        ...subscription.toJSON(),
        plataforma,
      });
      console.log("[Push Front] ✅ Subscription salva no backend");

      return { ok: true, message: "Notificações ativadas com sucesso" };
    } catch (err) {
      console.error("[Push Front] ❌ Erro ao ativar notificações:", err);
      console.error("[Push Front] ❌ Nome do erro:", err.name);
      console.error("[Push Front] ❌ Mensagem:", err.message);
      console.error("[Push Front] ❌ Stack:", err.stack);
      console.error("[Push Front] ❌ Objeto completo:", err);
      
      // Mostrar erro detalhado para diagnóstico
      const erroCompleto = `Erro: ${err.name}\nMensagem: ${err.message}\n\nVerifique o console do navegador para mais detalhes.`;
      alert(erroCompleto);
      
      return {
        ok: false,
        message: err.message || "Erro ao ativar notificações",
      };
    }
  }

  /**
   * Remove a subscription e desregistra no backend.
   */
  async function desativarNotificacoes() {
    if (!_swRegistration)
      return { ok: false, message: "Service Worker não inicializado" };

    try {
      const subscription = await _swRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await MobileApi.del("/api/push/unsubscribe");
      }
      return { ok: true, message: "Notificações desativadas" };
    } catch (err) {
      console.error("[Push] Erro ao desativar:", err);
      return { ok: false, message: err.message };
    }
  }

  /**
   * Verifica se há uma subscription ativa.
   */
  async function isSubscribed() {
    if (!_swRegistration) return false;
    try {
      const sub = await _swRegistration.pushManager.getSubscription();
      return !!sub;
    } catch (_) {
      return false;
    }
  }

  /**
   * Busca preferências de notificação do usuário.
   */
  async function getPreferencias() {
    try {
      return await MobileApi.get("/api/push/preferences");
    } catch (_) {
      return _defaultPreferencias();
    }
  }

  /**
   * Salva preferências de notificação.
   */
  async function salvarPreferencias(prefs) {
    return MobileApi.put("/api/push/preferences", { preferencias: prefs });
  }

  /** Preferências padrão */
  function _defaultPreferencias() {
    return {
      novo_agendamento: true,
      checkin_pet: true,
      servico_concluido: true,
      pagamento_recebido: true,
      cancelamento: true,
      estoque_baixo: false,
      meta_atingida: true,
      novo_cliente: false,
    };
  }

  /** Detecta plataforma do dispositivo */
  function detectarPlataforma() {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return "ios";
    if (/android/.test(ua)) return "android";
    return "desktop";
  }

  /** Converte Base64 URL-safe para Uint8Array (necessário para VAPID) */
  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  return {
    setRegistration,
    isSupported,
    getPermissionStatus,
    ativarNotificacoes,
    desativarNotificacoes,
    isSubscribed,
    getPreferencias,
    salvarPreferencias,
  };
})();