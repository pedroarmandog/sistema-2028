/* ============================================================
   PetHub Mobile — Debug de Push Notifications
   Ferramenta de diagnóstico para verificar o fluxo completo
   ============================================================ */

window.PushDebug = (function () {
  "use strict";

  /**
   * Executa diagnóstico completo do sistema de push
   */
  async function runDiagnostics() {
    const results = {
      timestamp: new Date().toISOString(),
      tests: [],
    };

    console.log("🔍 ========== DIAGNÓSTICO DE PUSH NOTIFICATIONS ==========\n");

    // Teste 1: Verificar suporte do browser
    results.tests.push(await testBrowserSupport());

    // Teste 2: Verificar Service Worker
    results.tests.push(await testServiceWorker());

    // Teste 3: Verificar permissão de notificação
    results.tests.push(testNotificationPermission());

    // Teste 4: Verificar subscription ativa
    results.tests.push(await testActiveSubscription());

    // Teste 5: Verificar VAPID key no backend
    results.tests.push(await testVapidKey());

    // Teste 6: Verificar se há subscriptions no banco
    results.tests.push(await testSubscriptionsNoBanco());

    // Teste 7: Testar envio de notificação (se tudo estiver OK)
    if (results.tests.every((t) => t.success)) {
      results.tests.push(await testEnvioNotificacao());
    }

    // Resumo
    console.log("\n📊 ========== RESUMO DO DIAGNÓSTICO ==========");
    const total = results.tests.length;
    const sucesso = results.tests.filter((t) => t.success).length;
    const falhas = results.tests.filter((t) => !t.success).length;

    console.log(`Total: ${total} | Sucesso: ${sucesso} | Falhas: ${falhas}\n`);

    results.tests.forEach((test, index) => {
      const icon = test.success ? "✅" : "❌";
      console.log(`${icon} [${index + 1}/${total}] ${test.name}`);
      console.log(`   ${test.message}`);
      if (test.details) {
        console.log(`   Detalhes:`, test.details);
      }
      console.log("");
    });

    if (falhas > 0) {
      console.log("⚠️  ATENÇÃO: Alguns testes falharam. Verifique os detalhes acima.");
    } else {
      console.log("✅ Todos os testes passaram! O sistema de push está funcionando.");
    }

    console.log("🔍 ========== FIM DO DIAGNÓSTICO ==========\n");

    return results;
  }

  /**
   * Teste 1: Verificar suporte do browser
   */
  async function testBrowserSupport() {
    const hasServiceWorker = "serviceWorker" in navigator;
    const hasPushManager = "PushManager" in window;
    const hasNotification = "Notification" in window;

    const success = hasServiceWorker && hasPushManager && hasNotification;

    return {
      name: "Suporte do Browser",
      success,
      message: success
        ? "Browser suporta Push Notifications"
        : "Browser NÃO suporta Push Notifications",
      details: {
        serviceWorker: hasServiceWorker,
        pushManager: hasPushManager,
        notification: hasNotification,
      },
    };
  }

  /**
   * Teste 2: Verificar Service Worker
   */
  async function testServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return {
        name: "Service Worker",
        success: false,
        message: "Service Worker não suportado",
      };
    }

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        return {
          name: "Service Worker",
          success: false,
          message: "Service Worker NÃO registrado",
        };
      }

      const hasController = !!navigator.serviceWorker.controller;
      const swState = reg.active
        ? "active"
        : reg.installing
          ? "installing"
          : reg.waiting
            ? "waiting"
            : "unknown";

      return {
        name: "Service Worker",
        success: hasController,
        message: hasController
          ? "Service Worker ativo e controlando a página"
          : "Service Worker registrado mas NÃO está controlando a página",
        details: {
          scope: reg.scope,
          state: swState,
          hasController,
        },
      };
    } catch (err) {
      return {
        name: "Service Worker",
        success: false,
        message: "Erro ao verificar Service Worker",
        details: err.message,
      };
    }
  }

  /**
   * Teste 3: Verificar permissão de notificação
   */
  function testNotificationPermission() {
    const permission = Notification.permission;
    const success = permission === "granted";

    return {
      name: "Permissão de Notificação",
      success,
      message: success
        ? "Permissão concedida"
        : `Permissão: ${permission} (${permission === "denied" ? "Bloqueado pelo usuário" : "Não solicitado ainda"})`,
      details: { permission },
    };
  }

  /**
   * Teste 4: Verificar subscription ativa
   */
  async function testActiveSubscription() {
    if (!("serviceWorker" in navigator)) {
      return {
        name: "Subscription Ativa",
        success: false,
        message: "Service Worker não suportado",
      };
    }

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        return {
          name: "Subscription Ativa",
          success: false,
          message: "Service Worker não registrado",
        };
      }

      const subscription = await reg.pushManager.getSubscription();
      const success = !!subscription;

      return {
        name: "Subscription Ativa",
        success,
        message: success
          ? "Subscription ativa encontrada"
          : "Nenhuma subscription ativa",
        details: subscription
          ? {
              endpoint: subscription.endpoint?.substring(0, 100) + "...",
              keys: {
                auth: subscription.options?.applicationServerKey
                  ? "presente"
                  : "ausente",
              },
            }
          : null,
      };
    } catch (err) {
      return {
        name: "Subscription Ativa",
        success: false,
        message: "Erro ao verificar subscription",
        details: err.message,
      };
    }
  }

  /**
   * Teste 5: Verificar VAPID key no backend
   */
  async function testVapidKey() {
    try {
      const response = await fetch("/api/push/vapid-public-key", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          name: "VAPID Key",
          success: false,
          message: `Erro HTTP ${response.status}`,
          details: error,
        };
      }

      const data = await response.json();
      const hasKey = !!data.vapidPublicKey;

      return {
        name: "VAPID Key",
        success: hasKey,
        message: hasKey
          ? "VAPID key configurada no backend"
          : "VAPID key NÃO configurada",
        details: hasKey
          ? { keyLength: data.vapidPublicKey?.length }
          : null,
      };
    } catch (err) {
      return {
        name: "VAPID Key",
        success: false,
        message: "Erro ao consultar backend",
        details: err.message,
      };
    }
  }

  /**
   * Teste 6: Verificar subscriptions no banco
   */
  async function testSubscriptionsNoBanco() {
    try {
      // Tentar buscar subscriptions via API (requer autenticação)
      const response = await fetch("/api/push/preferences", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        return {
          name: "Subscriptions no Banco",
          success: false,
          message: `Erro HTTP ${response.status} - usuário não autenticado`,
        };
      }

      const data = await response.json();

      return {
        name: "Subscriptions no Banco",
        success: true,
        message: "Backend acessível e respondendo",
        details: data,
      };
    } catch (err) {
      return {
        name: "Subscriptions no Banco",
        success: false,
        message: "Erro ao consultar backend",
        details: err.message,
      };
    }
  }

  /**
   * Teste 7: Testar envio de notificação
   */
  async function testEnvioNotificacao() {
    try {
      // Simular evento de teste
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          evento: "teste",
          mensagem: "Teste de notificação",
        }),
      });

      if (!response.ok) {
        return {
          name: "Teste de Envio",
          success: false,
          message: `Erro HTTP ${response.status}`,
          details: await response.json(),
        };
      }

      const data = await response.json();

      return {
        name: "Teste de Envio",
        success: data.sucesso || false,
        message: data.mensagem || "Teste executado",
        details: data,
      };
    } catch (err) {
      return {
        name: "Teste de Envio",
        success: false,
        message: "Erro ao testar envio",
        details: err.message,
      };
    }
  }

  /**
   * Exibe o diagnóstico em uma página HTML
   */
  function showDiagnostics() {
    const results = runDiagnostics();

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Diagnóstico de Push Notifications</title>
        <style>
          body {
            font-family: monospace;
            padding: 20px;
            background: #1a1a1a;
            color: #fff;
          }
          .test {
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
            background: #2a2a2a;
          }
          .success {
            border-left: 4px solid #4caf50;
          }
          .failure {
            border-left: 4px solid #f44336;
          }
          .icon {
            font-size: 20px;
            margin-right: 10px;
          }
          pre {
            background: #000;
            padding: 10px;
            overflow-x: auto;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <h1>🔍 Diagnóstico de Push Notifications</h1>
        <p>Timestamp: ${results.timestamp}</p>
        ${results.tests
          .map(
            (test) => `
          <div class="test ${test.success ? "success" : "failure"}">
            <div>
              <span class="icon">${test.success ? "✅" : "❌"}</span>
              <strong>${test.name}</strong>
            </div>
            <div>${test.message}</div>
            ${test.details ? `<pre>${JSON.stringify(test.details, null, 2)}</pre>` : ""}
          </div>
        `,
          )
          .join("")}
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }

  return {
    runDiagnostics,
    showDiagnostics,
  };
})();