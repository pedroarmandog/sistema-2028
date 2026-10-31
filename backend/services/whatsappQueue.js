/**
 * WhatsApp Queue Service (node-cron)
 * -----------------------------------
 * Processa a fila de envios agendados no banco de dados.
 * Executa a cada minuto verificando mensagens pendentes.
 *
 * Regras anti-spam:
 * - Delay aleatório entre envios (3s a 10s)
 * - Máximo de 10 mensagens por minuto por empresa
 * - Máximo de 3 tentativas por envio
 */

const cron = require("node-cron");
const whatsappService = require("./whatsappService");

const MAX_TENTATIVAS = 3;
let cronJob = null;
let processando = false;
const BATCH_SIZE = 10; // buscar 10 mensagens por vez
let queueBuffer = [];
let lastRunAt = 0;

/**
 * Inicia o agendador de mensagens.
 * Deve ser chamado uma única vez na inicialização do servidor.
 */
function iniciarAgendador() {
  if (cronJob) {
    console.log("[Queue] Agendador já está rodando");
    return;
  }

  // Executa a cada 5 minutos
  cronJob = cron.schedule("*/5 * * * *", async () => {
    if (processando) {
      console.log("[Queue] Ciclo anterior ainda em andamento, pulando...");
      return;
    }
    processando = true;
    try {
      await processarFila();
    } catch (err) {
      console.error("[Queue] Erro no processamento da fila:", err.message);
    } finally {
      processando = false;
      lastRunAt = Date.now();
    }
  });

  console.log(
    "✅ [Queue] Agendador de mensagens WhatsApp iniciado (executa a cada 5 minutos)",
  );
}

/**
 * Processa todos os envios pendentes que já passaram da data agendada.
 */
async function processarFila() {
  const { EnvioAgendado, LogEnvio } = require("../models");
  const { Op } = require("sequelize");

  const agora = new Date();
  // contador estimado de queries desta execução
  const queriesThisRun = { count: 0 };

  // Recuperar envios presos em "enviando" há mais de 5 minutos
  const cincoMinAtras = new Date(agora.getTime() - 5 * 60 * 1000);
  // recuperar envios que ficaram presos (1 query)
  try {
    queriesThisRun.count++;
    await EnvioAgendado.update(
      { status: "pendente" },
      {
        where: {
          status: "enviando",
          updatedAt: { [Op.lt]: cincoMinAtras },
        },
      },
    );
  } catch (_) {}

  // Buscar em lote apenas quando o buffer estiver vazio
  let pendentes = [];
  if (queueBuffer.length === 0) {
    queriesThisRun.count++;
    const fetched = await EnvioAgendado.findAll({
      where: {
        status: "pendente",
        dataAgendada: { [Op.lte]: agora },
        tentativas: { [Op.lt]: MAX_TENTATIVAS },
      },
      order: [["dataAgendada", "ASC"]],
      limit: BATCH_SIZE,
    });
    if (!fetched || fetched.length === 0) {
      console.log("[Queue] Nenhum envio pendente encontrado.");
      console.log(
        `[Queue] Queries estimadas nesta execução: ${queriesThisRun.count}`,
      );
      return;
    }
    queueBuffer = fetched;
  }

  // Processar o lote atual (até BATCH_SIZE) sem consultar o DB novamente
  pendentes = queueBuffer.splice(0, BATCH_SIZE);
  if (pendentes.length === 0) return;

  console.log(`[Queue] Processando lote de ${pendentes.length} envio(s)`);

  // Tentar reconexão uma única vez por empresa (não por envio)
  const empresasVerificadas = new Set();

  for (const envio of pendentes) {
    const empId = String(envio.empresaId || 1);
    if (!empresasVerificadas.has(empId)) {
      empresasVerificadas.add(empId);
      await tentarReconectar(empId);
    }
    console.log(
      `[Queue] Iniciando processamento do envio #${envio.id} (empresa ${empId})`,
    );
    await processarEnvio(envio, LogEnvio, queriesThisRun);
    // Delay mínimo entre envios para evitar bursts
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(
    `[Queue] Processado lote de ${pendentes.length} envio(s). Queries estimadas nesta execução: ${queriesThisRun.count}`,
  );
}

/**
 * Tenta reconectar o WhatsApp de uma empresa (chamado 1x por empresa por ciclo).
 */
async function tentarReconectar(empresaId) {
  if (whatsappService.isConectado(empresaId)) return;

  const fs = require("fs");
  const path = require("path");
  const SESSION_DIR = path.join(__dirname, "../../tmp/whatsapp-sessions");
  const sessionDir = [
    path.join(SESSION_DIR, `session-empresa_${empresaId}`),
    path.join(SESSION_DIR, `empresa_${empresaId}`),
  ].find((d) => fs.existsSync(d));

  if (!sessionDir) {
    console.warn(
      `[Queue] WhatsApp empresa ${empresaId} nunca foi conectado. Conecte pelo painel de Marketing.`,
    );
    return;
  }

  try {
    const status = whatsappService.obterStatus(empresaId);
    if (
      !status ||
      status.status === "desconectado" ||
      status.status === "erro"
    ) {
      console.log(
        `[Queue] Tentando reconectar empresa ${empresaId} automaticamente...`,
      );
      // Dispara reconexão em background — não bloqueia o ciclo da fila.
      // As mensagens pendentes serão processadas no próximo ciclo (5 min),
      // quando a reconexão já terá concluído.
      whatsappService.inicializarCliente(empresaId).catch((e) => {
        console.warn(
          `[Queue] Falha ao reconectar empresa ${empresaId}:`,
          e.message,
        );
      });
    }
  } catch (e) {
    console.warn(
      `[Queue] Falha ao reconectar empresa ${empresaId}:`,
      e.message,
    );
  }
}

/**
 * Processa um único envio da fila.
 */
async function processarEnvio(envio, LogEnvio, queriesCounter = { count: 0 }) {
  const empresaId = String(envio.empresaId || 1);

  if (!whatsappService.isConectado(empresaId)) {
    // Silencioso — o frontend mostra o alerta de fila pendente
    return;
  }

  // Marcar como "enviando" para evitar processamento duplicado
  try {
    queriesCounter.count++;
    await envio.update({
      status: "enviando",
      tentativas: envio.tentativas + 1,
    });
  } catch (_) {}

  try {
    // Registrar log de início (não-crítico)
    try {
      queriesCounter.count++;
      await LogEnvio.create({
        empresaId: envio.empresaId,
        envioAgendadoId: envio.id,
        evento: "envio_iniciado",
        detalhes: {
          telefone: envio.telefoneDestino,
          tentativa: envio.tentativas,
        },
        mensagem: `Iniciando envio #${envio.id} para ${envio.telefoneDestino}`,
      }).catch(() => {});
    } catch (_) {}

    // Enviar mensagem
    const resultado = await whatsappService.enviarMensagem(
      empresaId,
      envio.telefoneDestino,
      envio.conteudoFinal,
      envio.imagemPath || null,
    );

    if (resultado.sucesso) {
      try {
        queriesCounter.count++;
        await envio.update({ status: "enviado", dataEnvio: new Date() });
      } catch (_) {}

      try {
        queriesCounter.count++;
        await LogEnvio.create({
          empresaId: envio.empresaId,
          envioAgendadoId: envio.id,
          evento: "envio_sucesso",
          detalhes: { telefone: envio.telefoneDestino },
          mensagem: `Mensagem enviada com sucesso para ${envio.telefoneDestino}`,
        }).catch(() => {});
      } catch (_) {}

      console.log(
        `[Queue] ✅ Envio #${envio.id} enviado para ${envio.telefoneDestino}`,
      );
    } else {
      // Verificar se deve cancelar (máximo de tentativas)
      const novoStatus =
        envio.tentativas >= MAX_TENTATIVAS ? "erro" : "pendente";
      try {
        queriesCounter.count++;
        await envio.update({
          status: novoStatus,
          erroMensagem: resultado.erro,
        });
      } catch (_) {}

      try {
        queriesCounter.count++;
        await LogEnvio.create({
          empresaId: envio.empresaId,
          envioAgendadoId: envio.id,
          evento: "envio_erro",
          detalhes: { telefone: envio.telefoneDestino, erro: resultado.erro },
          mensagem: `Falha no envio #${envio.id}: ${resultado.erro}`,
        }).catch(() => {});
      } catch (_) {}

      console.error(
        `[Queue] ❌ Falha no envio #${envio.id}: ${resultado.erro}`,
      );
    }
  } catch (err) {
    const novoStatus = envio.tentativas >= MAX_TENTATIVAS ? "erro" : "pendente";
    try {
      queriesCounter.count++;
      await envio.update({ status: novoStatus, erroMensagem: err.message });
    } catch (_) {}

    try {
      queriesCounter.count++;
      await LogEnvio.create({
        empresaId: envio.empresaId,
        envioAgendadoId: envio.id,
        evento: "envio_erro",
        detalhes: { erro: err.message },
        mensagem: `Exceção no envio #${envio.id}: ${err.message}`,
      }).catch(() => {});
    } catch (_) {}

    console.error(`[Queue] Exceção no envio #${envio.id}:`, err.message);
  }
}

/**
 * Agenda um envio imediato (ex: boas-vindas ao cadastrar cliente).
 * @param {object} params
 * @param {number} params.empresaId
 * @param {number} params.mensagemAutomaticaId
 * @param {string} params.telefone
 * @param {string} params.conteudoFinal - texto com variáveis já substituídas
 * @param {string|null} params.imagemPath
 * @param {Date} params.dataAgendada
 * @param {object} params.contexto - { clienteId, petId, agendamentoId }
 */
async function agendarEnvio(params) {
  try {
    // ISOLAMENTO MULTI-TENANT: a empresa é obrigatória — nunca usar fallback || 1
    if (!params.empresaId) {
      console.error(
        "[Queue] agendarEnvio rejeitado: empresaId ausente (telefone:",
        params && params.telefone,
        ")",
      );
      return null;
    }
    const { EnvioAgendado } = require("../models");

    // Evitar duplicata: checar se já existe envio pendente/enviado para o mesmo contexto + mensagem
    if (params.contexto && params.mensagemAutomaticaId) {
      const { Op } = require("sequelize");
      const sequelize = require("../models").sequelize;

      // Montar WHERE incluindo o contexto (clienteId/petId/agendamentoId) para
      // permitir envios do mesmo tipo para telefones iguais de clientes diferentes.
      const whereClause = {
        mensagemAutomaticaId: params.mensagemAutomaticaId,
        telefoneDestino: String(params.telefone).replace(/\D/g, ""),
        status: { [Op.in]: ["enviado", "pendente", "enviando"] },
      };

      // Se o contexto contiver clienteId ou agendamentoId, usar para diferenciar
      const ctx =
        typeof params.contexto === "string"
          ? JSON.parse(params.contexto)
          : params.contexto;

      const conditions = [];

      if (ctx.clienteId) {
        conditions.push(
          sequelize.literal(
            `JSON_EXTRACT(contexto, '$.clienteId') = ${Number(ctx.clienteId)}`,
          ),
        );
      } else if (ctx.agendamentoId) {
        conditions.push(
          sequelize.literal(
            `JSON_EXTRACT(contexto, '$.agendamentoId') = ${Number(ctx.agendamentoId)}`,
          ),
        );
      }

      // Diferenciar envios de dias distintos (multi-day)
      if (ctx.diasAntes !== undefined && ctx.diasAntes !== null) {
        conditions.push(
          sequelize.literal(
            `JSON_EXTRACT(contexto, '$.diasAntes') = ${Number(ctx.diasAntes)}`,
          ),
        );
      }

      // Lembretes recorrentes: cada ciclo tem data única — não bloquear ciclos futuros
      if (ctx.cicloData) {
        conditions.push(
          sequelize.literal(
            `JSON_EXTRACT(contexto, '$.cicloData') = '${ctx.cicloData}'`,
          ),
        );
      }

      if (conditions.length > 0) {
        whereClause[Op.and] = conditions;
      }

      const jaExiste = await EnvioAgendado.findOne({ where: whereClause });

      if (jaExiste) {
        console.log(
          `[Queue] Envio duplicado ignorado para ${params.telefone} (mensagem #${params.mensagemAutomaticaId})`,
        );
        return null;
      }
    }

    const envio = await EnvioAgendado.create({
      empresaId: params.empresaId,
      mensagemAutomaticaId: params.mensagemAutomaticaId,
      telefoneDestino: String(params.telefone).replace(/\D/g, ""),
      conteudoFinal: params.conteudoFinal,
      imagemPath: params.imagemPath || null,
      status: "pendente",
      dataAgendada: params.dataAgendada || new Date(),
      contexto: params.contexto || null,
    });

    console.log(
      `[Queue] Envio #${envio.id} agendado para ${params.telefone} em ${params.dataAgendada}`,
    );

    // Tentar processar imediatamente (respeitando o lock global)
    if (envio.dataAgendada <= new Date()) {
      setImmediate(async () => {
        if (processando) return; // ciclo já em andamento
        processando = true;
        try {
          await processarFila();
        } catch (e) {
          console.warn(
            `[Queue] Falha no disparo imediato #${envio.id}:`,
            e.message,
          );
        } finally {
          processando = false;
          lastRunAt = Date.now();
        }
      });
    }

    return envio;
  } catch (err) {
    console.error("[Queue] Erro ao agendar envio:", err.message);
    return null;
  }
}

/**
 * Para o agendador (útil em testes).
 */
function pararAgendador() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log("[Queue] Agendador parado");
  }
}

module.exports = {
  iniciarAgendador,
  agendarEnvio,
  pararAgendador,
  processarFila,
};
