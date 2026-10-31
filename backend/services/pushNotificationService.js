/* ============================================================
   PetHub — Push Notification Service
   Envia notificações Web Push para subscriptions cadastradas.
   Usa o pacote `web-push` com chaves VAPID do .env.
   
   Dependência: npm install web-push
   Gerar chaves: npx web-push generate-vapid-keys
   ============================================================ */

let webpush;

try {
  webpush = require("web-push");
  console.log("[Push] ✅ web-push carregado");
} catch (err) {
  console.error("========== ERRO AO IMPORTAR WEB-PUSH ==========");
  console.error(err);
  console.error(err.stack);
  console.error("===============================================");

  webpush = null;
}

const { PushSubscription } = require("../models");
const { Op } = require("sequelize");

// ── Configurar VAPID ──────────────────────────────────────
function _configurarVAPID() {
  if (!webpush) return false;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject =
    process.env.VAPID_SUBJECT || "mailto:contato@pethubflow.com.br";

  if (!publicKey || !privateKey) {
    console.warn(
      "[Push] VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY não definidas no .env",
    );
    console.warn("[Push] Gere com: npx web-push generate-vapid-keys");
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

// Configurar ao carregar o módulo
const _vapidConfigurado = _configurarVAPID();

// ── Helpers auxiliares ────────────────────────────────────

/**
 * Formata uma data/instante no fuso de Brasília (America/Sao_Paulo).
 * Usa Intl com timeZone explícito — nunca soma/subtrai horas manualmente.
 * @param {Date|string|number|null|undefined} data Instante a formatar
 * @param {boolean} comSegundos true = HH:MM:SS, false = HH:MM
 * @returns {string} horário formatado ou "" quando inválido/ausente
 */
function formatarHorarioBrasilia(data, comSegundos = true) {
  if (!data) return "";
  const d = new Date(data);
  if (isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      ...(comSegundos ? { second: "2-digit" } : {}),
      hourCycle: "h23",
    }).format(d);
  } catch (e) {
    return "";
  }
}

// ── Payloads por evento ───────────────────────────────────
const PAYLOADS = {
  novo_agendamento: (dados) => ({
    title: "📅 Novo Agendamento",
    body: dados.petNome
      ? `Pet: ${dados.petNome}${dados.clienteNome ? "\nTutor: " + dados.clienteNome : ""}${dados.dataAgendamento ? "\nData: " + dados.dataAgendamento : ""}${dados.horario ? "\nHorário: " + dados.horario : ""}${dados.servico ? "\nServiço: " + dados.servico : ""}`
      : "Um novo agendamento foi criado",
    tag: "novo_agendamento",
    data: { page: "agenda" },
    requireInteraction: true,
  }),

  checkin_pet: (dados) => ({
    title: "🐾 Pet chegou!",
    body: dados.petNome
      ? `${dados.petNome} fez check-in${dados.horario ? " às " + dados.horario : ""}`
      : "Um pet fez check-in",
    tag: "checkin_pet",
    data: { page: "pets" },
    requireInteraction: true,
  }),

  checkout: (dados) => {
    const linhaValor = dados.valor
      ? `\nValor: R$ ${Number(dados.valor).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : "";
    return {
      title: "✅ Check-out Realizado",
      body: dados.petNome
        ? `${dados.petNome} realizou check-out${dados.horario ? " às " + dados.horario : ""}${linhaValor}`
        : "Um pet realizou check-out",
      tag: "checkout",
      data: { page: "agenda" },
      requireInteraction: true,
    };
  },

  servico_concluido: (dados) => ({
    title: "✅ Serviço Concluído",
    body: dados.petNome
      ? `${dados.petNome} está pronto para retirada`
      : "Um serviço foi finalizado",
    tag: "servico_concluido",
    data: { page: "agenda" },
    requireInteraction: true,
  }),

  nova_venda: (dados) => ({
    title: "💰 Nova Venda Realizada",
    body: dados.clienteNome
      ? `Cliente: ${dados.clienteNome}${dados.pagamento ? "\nPagamento: " + dados.pagamento : ""}${dados.horario ? "\nHorário: " + dados.horario : ""}`
      : "Uma nova venda foi realizada",
    tag: "nova_venda",
    data: { page: "financeiro" },
    requireInteraction: true,
  }),

  pagamento_recebido: (dados) => ({
    title: "💰 Pagamento Recebido",
    body: dados.valor
      ? `R$ ${Number(dados.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} recebido`
      : "Um pagamento foi registrado",
    tag: "pagamento_recebido",
    data: { page: "financeiro" },
    requireInteraction: true,
  }),

  cancelamento: (dados) => ({
    title: "❌ Agendamento Cancelado",
    body: dados.petNome
      ? `Agendamento de ${dados.petNome} foi cancelado`
      : "Um agendamento foi cancelado",
    tag: "cancelamento",
    data: { page: "agenda" },
    requireInteraction: true,
  }),

  meta_atingida: (dados) => ({
    title: "🎯 Meta Atingida!",
    body: dados.meta
      ? `Parabéns! Meta de R$ ${Number(dados.meta).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} atingida`
      : "A meta diária foi atingida!",
    tag: "meta_atingida",
    data: { page: "financeiro" },
    requireInteraction: true,
  }),

  estoque_baixo: (dados) => ({
    title: "📦 Estoque Baixo",
    body: dados.produto
      ? `${dados.produto} está com estoque abaixo do mínimo`
      : "Produtos com estoque baixo detectados",
    tag: "estoque_baixo",
    data: { page: "dashboard" },
    requireInteraction: true,
  }),

  novo_cliente: (dados) => ({
    title: "👤 Novo Cliente",
    body: dados.nome
      ? `${dados.nome} se cadastrou`
      : "Um novo cliente foi cadastrado",
    tag: "novo_cliente",
    data: { page: "dashboard" },
    requireInteraction: true,
  }),
};

// ── API Pública ───────────────────────────────────────────

/**
 * Envia notificação push para todos os dispositivos de uma empresa.
 * Filtra por preferências de cada usuário.
 *
 * @param {number} empresaId
 * @param {string} evento — chave do evento (ex: "novo_agendamento")
 * @param {object} dados  — dados do evento para montar o payload
 */
async function notificarEmpresa(empresaId, evento, dados = {}) {
  // Log inicial
  console.log(`[Push] ========== INÍCIO notificarEmpresa ==========`);
  console.log(`[Push] Evento: ${evento}, Empresa: ${empresaId}`);
  console.log(`[Push] Dados:`, JSON.stringify(dados));

  // Verificar pré-requisitos
  if (!webpush) {
    console.error("[Push] ❌ web-push NÃO está instalado/importado");
    return;
  }
  console.log("[Push] ✅ web-push disponível");

  if (!_vapidConfigurado) {
    console.error("[Push] ❌ VAPID NÃO está configurado");
    return;
  }
  console.log("[Push] ✅ VAPID configurado");

  if (!PushSubscription) {
    console.error("[Push] ❌ Modelo PushSubscription NÃO encontrado");
    return;
  }
  console.log("[Push] ✅ Modelo PushSubscription disponível");

  // Buscar subscriptions
  let subscriptions;
  try {
    subscriptions = await PushSubscription.findAll({
      where: { empresa_id: empresaId, ativo: true },
    });
    console.log(`[Push] ✅ Encontradas ${subscriptions.length} subscription(s) ativa(s) para empresa ${empresaId}`);
  } catch (err) {
    console.error(`[Push] ❌ Erro ao buscar subscriptions:`, err?.message);
    console.error(err?.stack);
    return;
  }

  if (!subscriptions.length) {
    console.log(`[Push] ⚠️ Nenhuma subscription ativa para empresa ${empresaId} - não há nada para notificar`);
    return;
  }

  // Verificar se o evento é válido
  const payloadFactory = PAYLOADS[evento];
  if (!payloadFactory) {
    console.error(`[Push] ❌ Evento desconhecido: "${evento}". Eventos disponíveis:`, Object.keys(PAYLOADS));
    return;
  }
  console.log(`[Push] ✅ Evento "${evento}" é válido`);

  // Montar payload
  const payload = payloadFactory(dados);
  const payloadStr = JSON.stringify(payload);
  console.log(`[Push] Payload montado:`, payload);

  const expiradas = [];
  let sucesso = 0;
  let falhas = 0;
  let ignoradas = 0;

  // Enviar para cada subscription
  console.log(`[Push] Iniciando envio para ${subscriptions.length} dispositivo(s)...`);
  
  await Promise.allSettled(
    subscriptions.map(async (sub, index) => {
      const prefs = sub.preferencias || {};
      
      // Verificar preferências do usuário
      if (prefs[evento] === false) {
        console.log(`[Push] ⏭️  [${index + 1}/${subscriptions.length}] Usuário ${sub.usuario_id} desativou notificações para "${evento}"`);
        ignoradas++;
        return;
      }

      console.log(`[Push] 📤 [${index + 1}/${subscriptions.length}] Enviando para usuário ${sub.usuario_id} (endpoint: ${sub.endpoint?.substring(0, 50)}...)`);

      const subscriptionData = {
        endpoint: sub.endpoint,
        keys: sub.keys,
      };

      try {
        await webpush.sendNotification(subscriptionData, payloadStr, {
          TTL: 0,
          urgency: "high",
        });
        console.log(`[Push] ✅ [${index + 1}/${subscriptions.length}] Notificação enviada com sucesso para usuário ${sub.usuario_id}`);
        sucesso++;
        
        // Atualizar último uso em background
        sub.update({ ultimo_uso: new Date() }).catch((err) => {
          console.warn(`[Push] ⚠️ Erro ao atualizar ultimo_uso:`, err?.message);
        });
      } catch (err) {
        console.error(`[Push] ❌ [${index + 1}/${subscriptions.length}] Falha ao enviar para usuário ${sub.usuario_id}:`, err?.message);
        console.error(`[Push]    Status Code: ${err?.statusCode}`);
        console.error(`[Push]    Endpoint: ${sub.endpoint}`);
        
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`[Push] 🗑️  Subscription expirada (${err.statusCode}) - marcando para remoção`);
          expiradas.push(sub.id);
        } else {
          falhas++;
        }
      }
    }),
  );

  // Log final
  console.log(`[Push] ========== RESUMO DO ENVIO ==========`);
  console.log(`[Push] Total: ${subscriptions.length} | Sucesso: ${sucesso} | Falhas: ${falhas} | Ignoradas: ${ignoradas} | Expiradas: ${expiradas.length}`);

  // Remover subscriptions expiradas
  if (expiradas.length) {
    console.log(`[Push] Removendo ${expiradas.length} subscription(s) expirada(s)...`);
    await PushSubscription.update(
      { ativo: false },
      { where: { id: { [Op.in]: expiradas } } },
    ).catch((err) => {
      console.error(`[Push] ❌ Erro ao remover subscriptions expiradas:`, err?.message);
    });
    console.log(`[Push] ✅ ${expiradas.length} subscription(s) removidas`);
  }

  console.log(`[Push] ========== FIM notificarEmpresa ==========\n`);
}

/**
 * Envia notificação push para um usuário específico.
 * @param {number} usuarioId
 * @param {string} evento
 * @param {object} dados
 */
async function notificarUsuario(usuarioId, evento, dados = {}) {
  if (!webpush || !_vapidConfigurado) return;
  if (!PushSubscription) return;

  let subscriptions;
  try {
    subscriptions = await PushSubscription.findAll({
      where: { usuario_id: usuarioId, ativo: true },
    });
  } catch (err) {
    console.error("[Push] Erro ao buscar subscriptions:", err?.message);
    return;
  }

  if (!subscriptions.length) return;

  // Reutilizar lógica de envio
  const mockEmpresaId = subscriptions[0].empresa_id;
  await notificarEmpresa(mockEmpresaId, evento, dados);
}

/**
 * Retorna a chave pública VAPID para uso no frontend.
 * @returns {string|null}
 */
function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

module.exports = {
  notificarEmpresa,
  notificarUsuario,
  getVapidPublicKey,
  formatarHorarioBrasilia,
};
