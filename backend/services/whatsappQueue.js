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
async function processarFila(empresaId) {
  const { EnvioAgendado, LogEnvio } = require("../models");
  const { Op, literal } = require("sequelize");
  const filtro = {
    [Op.and]: literal("JSON_EXTRACT(contexto, '$.campanhaId') IS NULL"),
    empresaId: empresaId || { [Op.in]: whatsappService.empresasConectadas() }
  };
  await EnvioAgendado.update({ status: "pendente" }, { where: {
    ...filtro, status: "enviando", updatedAt: { [Op.lt]: new Date(Date.now() - 300000) }
  } });
  const pendentes = await EnvioAgendado.findAll({ where: {
    ...filtro, status: "pendente", dataAgendada: { [Op.lte]: new Date() },
    tentativas: { [Op.lt]: MAX_TENTATIVAS }
  }, order: [["dataAgendada", "ASC"]], limit: BATCH_SIZE });
  for (const envio of pendentes) {
    await processarEnvio(envio, LogEnvio);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

async function processarEnvio(envio, LogEnvio) {
  const empresaId = envio.empresaId;
  if (!empresaId || !whatsappService.isConectado(empresaId)) {
    return { sucesso: false, erro: "WhatsApp não está conectado." };
  }
  const anteriores = envio.tentativas;
  const [reservado] = await envio.constructor.update({
    status: "enviando", tentativas: anteriores + 1
  }, { where: { id: envio.id, empresaId, status: "pendente", tentativas: anteriores } });
  if (!reservado) return { sucesso: false, erro: "Envio já processado ou em andamento." };
  const resultado = await whatsappService.enviarMensagem(empresaId, envio.telefoneDestino, envio.conteudoFinal, envio.imagemPath);
  if (resultado.sucesso) {
    await envio.update({ status: "enviado", dataEnvio: new Date(), tentativas: anteriores + 1 });
  } else {
    const tentativas = resultado.temporario ? anteriores : anteriores + 1;
    await envio.update({ status: tentativas >= MAX_TENTATIVAS ? "erro" : "pendente",
      tentativas, erroMensagem: resultado.erro });
  }
  await LogEnvio.create({ empresaId, envioAgendadoId: envio.id,
    evento: resultado.sucesso ? "envio_sucesso" : "envio_erro",
    mensagem: resultado.sucesso ? "Enviado pelo WhatsApp" : resultado.erro
  }).catch(() => {});
  return resultado;
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
        empresaId: params.empresaId,
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
  processarEnvio,
};
