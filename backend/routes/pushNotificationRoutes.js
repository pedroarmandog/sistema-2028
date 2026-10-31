const express = require("express");
const router = express.Router();
const { authUser } = require("../middleware/authUser");
const pushService = require("../services/pushNotificationService");

// Todas as rotas requerem autenticação
router.use(authUser);

// ── GET /api/push/vapid-public-key ────────────────────────
// Retorna a chave pública VAPID para uso no frontend.
// Não é informação sensível — a chave pública pode ser exposta.
router.get("/vapid-public-key", (req, res) => {
  console.log("[Push] GET /vapid-public-key - Solicitada chave pública VAPID");
  const key = pushService.getVapidPublicKey();
  if (!key) {
    console.warn("[Push] ⚠️ VAPID key não disponível");
    return res.status(503).json({
      erro: "Push notifications não configuradas",
      code: "VAPID_NOT_CONFIGURED",
    });
  }
  console.log("[Push] ✅ VAPID key retornada com sucesso");
  res.json({ vapidPublicKey: key });
});

// ── POST /api/push/test ────────────────────────────────────
// Endpoint de teste para enviar notificação de debug
router.post("/test", authUser, async (req, res) => {
  try {
    const { evento, mensagem } = req.body;
    const empresaId = req.user.empresaId;
    const usuarioId = req.user.id;

    console.log(`[Push] 🧪 TESTE DE NOTIFICAÇÃO`);
    console.log(`[Push]    Usuário: ${usuarioId}, Empresa: ${empresaId}`);
    console.log(`[Push]    Evento: ${evento}, Mensagem: ${mensagem}`);

    if (!empresaId) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Usuário não possui empresa_id",
      });
    }

    // Buscar subscriptions ativas
    const { PushSubscription } = require("../models");
    const subscriptions = await PushSubscription.findAll({
      where: { empresa_id: empresaId, ativo: true },
    });

    console.log(`[Push]    Subscriptions encontradas: ${subscriptions.length}`);

    if (subscriptions.length === 0) {
      return res.json({
        sucesso: false,
        mensagem: "Nenhuma subscription ativa para esta empresa",
        empresaId,
        totalSubscriptions: 0,
      });
    }

    // Enviar notificação de teste
    await pushService.notificarEmpresa(empresaId, evento || "novo_agendamento", {
      petNome: mensagem || "Teste",
      horario: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      servico: "Teste de notificação",
    });

    res.json({
      sucesso: true,
      mensagem: "Notificação de teste enviada",
      empresaId,
      totalSubscriptions: subscriptions.length,
    });
  } catch (err) {
    console.error("[Push] ❌ Erro no teste:", err);
    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao enviar notificação de teste",
      erro: err.message,
    });
  }
});

// ── POST /api/push/subscribe ──────────────────────────────
// Registra ou atualiza uma subscription de push notifications.
router.post("/subscribe", async (req, res) => {
  try {
    const { PushSubscription } = require("../models");
    const { endpoint, keys, expirationTime, plataforma } = req.body;

    if (!endpoint || !keys?.auth || !keys?.p256dh) {
      return res.status(400).json({
        erro: "Dados de subscription inválidos",
        code: "INVALID_SUBSCRIPTION",
      });
    }

    const usuarioId = req.user.id;
    const empresaId = req.user.empresaId;

    if (!empresaId) {
      return res.status(403).json({
        erro: "Empresa não identificada",
        code: "EMPRESA_NAO_IDENTIFICADA",
      });
    }

    // Upsert: atualizar se já existe, criar se não existe
    const [subscription, created] = await PushSubscription.findOrCreate({
      where: { endpoint },
      defaults: {
        usuario_id: usuarioId,
        empresa_id: empresaId,
        endpoint,
        keys: { auth: keys.auth, p256dh: keys.p256dh },
        plataforma: plataforma || "android",
        ativo: true,
      },
    });

    if (!created) {
      // Atualizar dados da subscription existente
      await subscription.update({
        usuario_id: usuarioId,
        empresa_id: empresaId,
        keys: { auth: keys.auth, p256dh: keys.p256dh },
        plataforma: plataforma || subscription.plataforma,
        ativo: true,
      });
    }

    console.log(
      `[Push] Subscription ${created ? "criada" : "atualizada"} para usuario=${usuarioId} empresa=${empresaId} plataforma=${plataforma}`,
    );

    res.json({
      ok: true,
      message: "Subscription registrada com sucesso",
      id: subscription.id,
    });
  } catch (err) {
    console.error("[Push] Erro ao registrar subscription:", err?.message);
    res
      .status(500)
      .json({ erro: "Erro ao registrar subscription", mensagem: err?.message });
  }
});

// ── DELETE /api/push/unsubscribe ──────────────────────────
// Remove a subscription do usuário atual.
router.delete("/unsubscribe", async (req, res) => {
  try {
    const { PushSubscription } = require("../models");
    const usuarioId = req.user.id;
    const empresaId = req.user.empresaId;

    // Marcar todas as subscriptions do usuário como inativas
    const count = await PushSubscription.update(
      { ativo: false },
      { where: { usuario_id: usuarioId, empresa_id: empresaId } },
    );

    console.log(
      `[Push] ${count[0]} subscription(s) desativadas para usuario=${usuarioId}`,
    );

    res.json({ ok: true, message: "Subscriptions removidas" });
  } catch (err) {
    console.error("[Push] Erro ao remover subscription:", err?.message);
    res
      .status(500)
      .json({ erro: "Erro ao remover subscription", mensagem: err?.message });
  }
});

// ── GET /api/push/preferences ────────────────────────────
// Retorna as preferências de notificação do usuário atual.
router.get("/preferences", async (req, res) => {
  try {
    const { PushSubscription } = require("../models");
    const usuarioId = req.user.id;
    const empresaId = req.user.empresaId;

    const subscription = await PushSubscription.findOne({
      where: { usuario_id: usuarioId, empresa_id: empresaId, ativo: true },
      order: [["updated_at", "DESC"]],
    });

    if (!subscription) {
      // Retornar preferências padrão se não houver subscription
      return res.json(_defaultPreferencias());
    }

    res.json(subscription.preferencias || _defaultPreferencias());
  } catch (err) {
    console.error("[Push] Erro ao buscar preferências:", err?.message);
    res
      .status(500)
      .json({ erro: "Erro ao buscar preferências", mensagem: err?.message });
  }
});

// ── PUT /api/push/preferences ─────────────────────────────
// Salva as preferências de notificação do usuário atual.
router.put("/preferences", async (req, res) => {
  try {
    const { PushSubscription } = require("../models");
    const { preferencias } = req.body;

    if (!preferencias || typeof preferencias !== "object") {
      return res.status(400).json({ erro: "Preferências inválidas" });
    }

    const usuarioId = req.user.id;
    const empresaId = req.user.empresaId;

    // Atualizar todas as subscriptions ativas do usuário
    const [count] = await PushSubscription.update(
      { preferencias },
      { where: { usuario_id: usuarioId, empresa_id: empresaId, ativo: true } },
    );

    res.json({
      ok: true,
      message: "Preferências salvas",
      atualizadas: count,
    });
  } catch (err) {
    console.error("[Push] Erro ao salvar preferências:", err?.message);
    res
      .status(500)
      .json({ erro: "Erro ao salvar preferências", mensagem: err?.message });
  }
});

// ── Helpers ───────────────────────────────────────────────
function _defaultPreferencias() {
  return {
    novo_agendamento: true,
    checkin_pet: true,
    servico_concluido: true,
    nova_venda: true,
    pagamento_recebido: true,
    checkout: true,
    cancelamento: true,
    meta_atingida: true,
    estoque_baixo: false,
    novo_cliente: false,
  };
}

module.exports = router;
