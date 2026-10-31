const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const {
  Campanha,
  Contato,
  EnvioAgendado,
  LogEnvio,
  WhatsappSession,
} = require("../models");
const whatsappService = require("../services/whatsappService");
const { DISP_PREFIX } = require("./instanciaController");

function normalizeNumber(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length >= 11 && digits.startsWith("55")) return digits;
  if (digits.length === 11 || digits.length === 10) return "55" + digits;
  return digits;
}

// ── Mapa de workers ativos (campanhaId → timer) ──
const activeWorkers = new Map();

// SSE listeners por campanhaId: Set de response objects
const sseListeners = new Map();

function adicionarListenerSSE(campId, res) {
  const chave = String(campId);
  if (!sseListeners.has(chave)) sseListeners.set(chave, new Set());
  sseListeners.get(chave).add(res);

  res.on("close", () => {
    const s = sseListeners.get(chave);
    if (s) s.delete(res);
  });
}

function enviarEventoCampanha(campId, payload) {
  try {
    const chave = String(campId);
    const set = sseListeners.get(chave);
    if (!set || set.size === 0) return;
    const data = JSON.stringify(payload);
    for (const res of set) {
      try {
        res.write(`data: ${data}\n\n`);
      } catch (e) {
        set.delete(res);
      }
    }
  } catch (_) {}
}

function replacePlaceholders(template, contato, phone) {
  if (!template) return "";
  let out = String(template);
  const fullname = contato && contato.nome ? String(contato.nome).trim() : "";
  const firstname = fullname ? fullname.split(/\s+/)[0] : "";
  const phoneVal = contato && contato.numero ? contato.numero : phone || "";
  out = out.replace(/\[\[firstname\]\]/gi, firstname || "cliente");
  out = out.replace(/\[\[fullname\]\]/gi, fullname || "cliente");
  out = out.replace(/\[\[phone\]\]/gi, phoneVal || "");
  return out;
}

async function criarCampanha(req, res) {
  try {
    // ISOLAMENTO MULTI-TENANT: a empresa é SEMPRE a do usuário autenticado.
    // Nunca confiar em empresaId vindo do body e nunca usar fallback || 1.
    const empresaId =
      req.user && req.user.empresaId ? Number(req.user.empresaId) : null;
    if (!empresaId) {
      return res.status(403).json({ error: "Empresa não identificada" });
    }
    const nome = req.body.nome || "Campanha " + Date.now();
    const mensagemTemplate = req.body.mensagemTemplate || "";
    const configuracao = req.body.configuracao
      ? JSON.parse(req.body.configuracao)
      : {};

    let imagemPath = null;
    if (req.files && req.files.imagem && req.files.imagem[0]) {
      imagemPath = path.join(
        "/uploads/disparador",
        path.basename(req.files.imagem[0].path),
      );
    }

    const camp = await Campanha.create({
      empresaId,
      nome,
      mensagemTemplate,
      imagemPath,
      configuracao,
      status: "pronta",
    });

    // Ler arquivo enviado e parsear contatos
    const arquivo = req.files && req.files.arquivo && req.files.arquivo[0];
    let contatos = [];

    if (arquivo) {
      const ext = path.extname(arquivo.originalname).toLowerCase();
      if (ext === ".csv") {
        const text = fs.readFileSync(arquivo.path, "utf8");
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length > 0) {
          const firstCols = lines[0]
            .split(/[,;\t]/)
            .map((c) => c.trim().replace(/^"|"$/g, "").toLowerCase());
          const isHeader =
            /^(nome|name|cliente|tutor)/.test(firstCols[0] || "") ||
            /^(numero|number|telefone|tel|whatsapp|celular)/.test(
              firstCols[1] || "",
            );
          const startIdx = isHeader ? 1 : 0;
          for (let i = startIdx; i < lines.length; i++) {
            const cols = lines[i]
              .split(/[,;\t]/)
              .map((c) => c.trim().replace(/^"|"$/g, ""));
            const nomeContato = cols[0] || null;
            const numero = cols[1] || null;
            if (!numero) continue;
            contatos.push({ nome: nomeContato, numero });
          }
        }
      } else {
        const wb = xlsx.readFile(arquivo.path);
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        let startIdx = 0;
        if (data.length > 0 && Array.isArray(data[0]) && data[0].length >= 2) {
          const h0 = String(data[0][0] || "").toLowerCase();
          const h1 = String(data[0][1] || "").toLowerCase();
          if (
            /^(nome|name|cliente|tutor)/.test(h0) ||
            /^(numero|number|telefone|tel|whatsapp|celular)/.test(h1)
          ) {
            startIdx = 1;
          }
        }
        for (let i = startIdx; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;
          const nomeContato = row[0] ? String(row[0]).trim() : null;
          const numero = row[1] ? String(row[1]).trim() : null;
          if (!numero) continue;
          contatos.push({ nome: nomeContato, numero });
        }
      }
    }

    // Fallback: contatos via JSON
    if (contatos.length === 0 && req.body && req.body.contatos) {
      try {
        const parsed =
          typeof req.body.contatos === "string"
            ? JSON.parse(req.body.contatos)
            : req.body.contatos;
        if (Array.isArray(parsed) && parsed.length > 0) {
          contatos = parsed.map((c) => ({
            nome: c.nome || null,
            numero: c.numero || null,
          }));
        }
      } catch (e) {
        // ignorar
      }
    }

    // Filtrar contatos com números válidos
    const contatosToCreate = contatos
      .map((c) => ({
        empresaId,
        campanhaId: camp.id,
        nome: c.nome || null,
        numero: normalizeNumber(c.numero),
      }))
      .filter((c) => c.numero);

    let createdContatos = [];
    if (contatosToCreate.length > 0) {
      createdContatos = await Contato.bulkCreate(contatosToCreate);
    }

    // Criar envios agendados
    const delayInicial = Number(configuracao.delayInicial || 2) || 2;
    const intervalo = Number(configuracao.intervalo || 5) || 5;
    const now = Date.now();
    let offset = delayInicial * 1000;

    const envios = [];
    for (const ct of createdContatos) {
      const conteudoFinal = (mensagemTemplate || "")
        .replace(/\{nome\}/gi, ct.nome || "")
        .replace(/\{numero\}/gi, ct.numero || "");
      const dataAgendada = new Date(now + offset);
      offset += intervalo * 1000;

      envios.push({
        empresaId,
        mensagemAutomaticaId: 0,
        telefoneDestino: ct.numero,
        conteudoFinal,
        imagemPath,
        status: "pendente",
        dataAgendada,
        contexto: { campanhaId: camp.id, contatoId: ct.id },
      });
    }

    if (envios.length > 0) {
      await EnvioAgendado.bulkCreate(envios);
    }

    return res.json({
      success: true,
      campanha: camp.toJSON(),
      contatos: createdContatos.length,
      agendados: envios.length,
    });
  } catch (err) {
    console.error("criarCampanha error", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
}

/**
 * Aguarda até que uma instância WhatsApp esteja conectada.
 * Se não estiver conectada, reinicializa (abre Chrome) e aguarda até 25s.
 * Retorna true se conectou, false se timeout.
 */
async function aguardarConexao(chaveWpp, opts = {}) {
  // Já conectado? Retorna imediatamente
  if (whatsappService.isConectado(chaveWpp)) return true;

  console.log(
    `[Disparador] Instância ${chaveWpp} não conectada. Reinicializando...`,
  );

  // Reinicializar (abre Chrome e tenta usar sessão salva)
  try {
    const result = await whatsappService.inicializarCliente(chaveWpp, opts);
    console.log(
      `[Disparador] inicializarCliente retornou:`,
      JSON.stringify(result),
    );
  } catch (err) {
    console.error(
      `[Disparador] Erro ao reinicializar ${chaveWpp}:`,
      err && err.message,
    );
    return false;
  }

  // Aguardar até 90 segundos pela conexão (polling a cada 2s)
  const MAX_ESPERA = 90000;
  const INTERVALO = 2000;
  let esperado = 0;
  while (esperado < MAX_ESPERA) {
    await new Promise((r) => setTimeout(r, INTERVALO));
    esperado += INTERVALO;
    const statusAtual = whatsappService.obterStatus(chaveWpp);
    console.log(
      `[Disparador] Polling ${chaveWpp}: ${esperado}ms - status: ${statusAtual.status}`,
    );
    if (whatsappService.isConectado(chaveWpp)) {
      console.log(
        `[Disparador] Instância ${chaveWpp} reconectada após ${esperado}ms`,
      );
      return true;
    }
    // Se status virou 'erro', desistir imediatamente
    if (statusAtual.status === "erro") {
      console.warn(`[Disparador] Instância ${chaveWpp} com erro. Desistindo.`);
      return false;
    }
  }

  console.warn(`[Disparador] Timeout aguardando conexão de ${chaveWpp}`);
  return false;
}

/**
 * Inicia o worker de disparo para uma campanha.
 * Recebe opcionalmente instanciaId no body para escolher sessão WhatsApp.
 * Se o WhatsApp não estiver conectado, reinicializa automaticamente.
 */
async function iniciarCampanha(req, res) {
  try {
    const id = req.params.id;
    const instanciaId = req.body.instanciaId || null;

    // ISOLAMENTO MULTI-TENANT: empresa sempre do contexto autenticado
    const empresaAuth =
      req.user && req.user.empresaId ? Number(req.user.empresaId) : null;
    if (!empresaAuth) {
      return res.status(403).json({ error: "Empresa não identificada" });
    }

    const camp = await Campanha.findByPk(id);
    if (!camp)
      return res.status(404).json({ error: "Campanha não encontrada" });

    // A campanha deve pertencer à empresa autenticada
    if (Number(camp.empresaId) !== empresaAuth) {
      return res
        .status(403)
        .json({ error: "Campanha não pertence à sua empresa" });
    }

    // A instância WhatsApp informada deve pertencer à empresa autenticada.
    // Sem instância válida da própria empresa, o disparo é recusado
    // (nunca usar sessão de outra empresa nem fallback || 1).
    let instanciaValida = null;
    if (instanciaId) {
      instanciaValida = await WhatsappSession.findOne({
        where: { id: Number(instanciaId), empresaId: empresaAuth },
      });
      if (!instanciaValida) {
        return res.status(403).json({
          error: "Instância não pertence à sua empresa",
        });
      }
    } else {
      instanciaValida = await WhatsappSession.findOne({
        where: { empresaId: empresaAuth },
      });
      if (!instanciaValida) {
        return res.status(400).json({
          error:
            "Nenhuma instância WhatsApp encontrada para sua empresa. Crie uma instância primeiro.",
        });
      }
    }

    // Verificar/reconectar o cliente WhatsApp (chave validada)
    const chaveWpp = DISP_PREFIX + String(instanciaValida.id);
    // Ao iniciar campanha manualmente, abrir o Chrome (headful) para monitoramento
    const conectado = await aguardarConexao(chaveWpp, { headless: false });
    if (!conectado) {
      return res.status(400).json({
        error:
          "Não foi possível conectar ao WhatsApp. Verifique se a instância ainda está autenticada.",
      });
    }

    camp.status = "rodando";
    await camp.save();

    // Iniciar worker em background — SEMPRE com a instância validada
    startWorker(camp, String(instanciaValida.id));

    return res.json({ success: true });
  } catch (err) {
    console.error("iniciarCampanha error", err && err.stack);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
}

/**
 * Worker que processa a fila de envios pendentes de uma campanha.
 * Respeita as configurações: intervalo, delayInicial, delayRand, limite.
 */
function startWorker(campanha, instanciaId) {
  const campId = campanha.id;
  // ISOLAMENTO MULTI-TENANT: worker só roda com instância explicitamente
  // validada pelo controller (pertencente à empresa autenticada).
  if (!instanciaId) {
    console.error(
      `[Disparador] Worker da campanha ${campId} abortado: nenhuma instância validada.`,
    );
    return;
  }
  const empresaId = DISP_PREFIX + String(instanciaId);

  if (activeWorkers.has(campId)) return;

  // Ler configuração da campanha
  const cfg =
    typeof campanha.configuracao === "string"
      ? JSON.parse(campanha.configuracao)
      : campanha.configuracao || {};
  const intervaloMs = (Number(cfg.intervalo) || 10) * 1000;
  const delayInicialMs = (Number(cfg.delayInicial) || 2) * 1000;
  const delayRandMax = (Number(cfg.delayRand) || 0) * 1000;
  const limitePorCiclo = Number(cfg.limite) || 0; // 0 = sem limite

  console.log(
    `[Disparador] Worker iniciado para campanha ${campId}, instância=${empresaId}, intervalo=${intervaloMs}ms, delayInicial=${delayInicialMs}ms, delayRand=${delayRandMax}ms, limite=${limitePorCiclo}`,
  );

  // Flag para controlar parada
  let parado = false;
  activeWorkers.set(campId, {
    stop: () => {
      parado = true;
    },
  });

  // Função principal do worker (async loop em vez de setInterval)
  (async function workerLoop() {
    // Delay inicial antes do primeiro envio
    if (delayInicialMs > 0) {
      console.log(
        `[Disparador] Aguardando delay inicial de ${delayInicialMs}ms...`,
      );
      await new Promise((r) => setTimeout(r, delayInicialMs));
    }

    let enviadosNoCiclo = 0;
    let desconectadoRetries = 0;
    const MAX_DESCONECTADO_RETRIES = 10;

    // Enviar estado inicial de progresso (snapshot)
    try {
      const total = await Contato.count({ where: { campanhaId: campId } });
      const enviados = await Contato.count({
        where: { campanhaId: campId, status: "enviado" },
      });
      const erros = await Contato.count({
        where: { campanhaId: campId, status: "erro" },
      });
      const pendentes = Math.max(0, total - enviados - erros);
      const percent = total > 0 ? Math.round((enviados / total) * 100) : 0;
      enviarEventoCampanha(campId, {
        evento: "progress",
        total,
        enviados,
        pendentes,
        erros,
        percent,
      });
    } catch (e) {}

    while (!parado) {
      try {
        // Verificar se campanha ainda está rodando
        const campAtual = await Campanha.findByPk(campId);
        if (!campAtual || campAtual.status !== "rodando") {
          console.log(
            `[Disparador] Campanha ${campId} não está mais rodando. Parando worker.`,
          );
          break;
        }

        // Verificar se o WhatsApp está conectado
        if (!whatsappService.isConectado(empresaId)) {
          desconectadoRetries++;
          if (desconectadoRetries === 1) {
            console.log(
              `[Disparador] WhatsApp ${empresaId} desconectado. Tentando reinicializar...`,
            );
            try {
              await whatsappService.inicializarCliente(empresaId);
            } catch (err) {
              console.error(
                `[Disparador] Erro ao reinicializar:`,
                err && err.message,
              );
            }
          }
          if (desconectadoRetries >= MAX_DESCONECTADO_RETRIES) {
            console.warn(
              `[Disparador] WhatsApp desconectado por muito tempo. Pausando campanha ${campId}.`,
            );
            campAtual.status = "pausada";
            await campAtual.save();
            break;
          }
          console.warn(
            `[Disparador] Aguardando reconexão... (${desconectadoRetries}/${MAX_DESCONECTADO_RETRIES})`,
          );
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
        desconectadoRetries = 0;

        // Verificar limite por ciclo
        if (limitePorCiclo > 0 && enviadosNoCiclo >= limitePorCiclo) {
          console.log(
            `[Disparador] Limite de ${limitePorCiclo} mensagens por ciclo atingido. Pausando campanha ${campId}.`,
          );
          campAtual.status = "pausada";
          await campAtual.save();
          break;
        }

        // Buscar próximo envio pendente DESTA campanha
        const { Op, literal } = require("sequelize");
        const envio = await EnvioAgendado.findOne({
          where: {
            status: "pendente",
            [Op.and]: literal(
              `JSON_EXTRACT(contexto, '$.campanhaId') = ${Number(campId)}`,
            ),
          },
          order: [["dataAgendada", "ASC"]],
        });

        if (!envio) {
          console.log(
            `[Disparador] Campanha ${campId} concluída (sem envios restantes).`,
          );
          campAtual.status = "finalizada";
          await campAtual.save();
          // enviar evento final
          enviarEventoCampanha(campId, { evento: "finished" });
          break;
        }

        // Verificar se dataAgendada já passou
        if (new Date(envio.dataAgendada) > new Date()) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }

        const ctx =
          typeof envio.contexto === "string"
            ? JSON.parse(envio.contexto)
            : envio.contexto || {};

        // Marcar como enviando
        envio.status = "enviando";
        envio.tentativas = (envio.tentativas || 0) + 1;
        await envio.save();

        // Marcar contato como enviando (se aplicável) e notificar
        let contato = null;
        if (ctx.contatoId) {
          contato = await Contato.findByPk(ctx.contatoId);
          try {
            await Contato.update(
              { status: "enviando" },
              { where: { id: ctx.contatoId } },
            );
          } catch (e) {}
          enviarEventoCampanha(campId, {
            evento: "contact",
            contatoId: ctx.contatoId,
            status: "enviando",
            numero: envio.telefoneDestino,
          });
        }

        // Preparar mensagem com placeholders
        const template = envio.conteudoFinal || campanha.mensagemTemplate || "";
        const textoEnvio = replacePlaceholders(
          template,
          contato,
          envio.telefoneDestino,
        );

        // Enviar via whatsappService
        const resultado = await whatsappService.enviarMensagem(
          empresaId,
          envio.telefoneDestino,
          textoEnvio,
          envio.imagemPath
            ? path.join(__dirname, "../../", envio.imagemPath)
            : null,
        );

        if (resultado.sucesso) {
          envio.status = "enviado";
          envio.dataEnvio = new Date();
          await envio.save();

          if (ctx.contatoId) {
            await Contato.update(
              { status: "enviado" },
              { where: { id: ctx.contatoId } },
            );
            enviarEventoCampanha(campId, {
              evento: "contact",
              contatoId: ctx.contatoId,
              status: "enviado",
              numero: envio.telefoneDestino,
            });
          }

          enviadosNoCiclo++;
          console.log(
            `[Disparador] ✅ Enviado para ${envio.telefoneDestino} (${enviadosNoCiclo}${limitePorCiclo ? "/" + limitePorCiclo : ""})`,
          );

          // emitir progresso
          try {
            const total = await Contato.count({
              where: { campanhaId: campId },
            });
            const enviados = await Contato.count({
              where: { campanhaId: campId, status: "enviado" },
            });
            const erros = await Contato.count({
              where: { campanhaId: campId, status: "erro" },
            });
            const pendentes = Math.max(0, total - enviados - erros);
            const percent =
              total > 0 ? Math.round((enviados / total) * 100) : 0;
            enviarEventoCampanha(campId, {
              evento: "progress",
              total,
              enviados,
              pendentes,
              erros,
              percent,
            });
          } catch (e) {}
        } else {
          const erroMsg = resultado.erro || "Falha desconhecida";

          if (
            erroMsg.includes("Erro temporário") ||
            erroMsg.includes("WhatsApp não está conectado")
          ) {
            envio.status = "pendente";
            envio.tentativas = Math.max((envio.tentativas || 1) - 1, 0);
            envio.erroMensagem = erroMsg;
            await envio.save();
            console.warn(`[Disparador] Erro temporário, tentando novamente...`);
            await new Promise((r) => setTimeout(r, 3000));
            continue;
          }

          envio.status = "erro";
          envio.erroMensagem = erroMsg;
          await envio.save();

          if (ctx.contatoId) {
            await Contato.update(
              { status: "erro" },
              { where: { id: ctx.contatoId } },
            );
            enviarEventoCampanha(campId, {
              evento: "contact",
              contatoId: ctx.contatoId,
              status: "erro",
              numero: envio.telefoneDestino,
              erro: erroMsg,
            });
          }

          console.warn(
            `[Disparador] ❌ Erro ${envio.telefoneDestino}: ${erroMsg}`,
          );

          // emitir progresso parcial
          try {
            const total = await Contato.count({
              where: { campanhaId: campId },
            });
            const enviados = await Contato.count({
              where: { campanhaId: campId, status: "enviado" },
            });
            const erros = await Contato.count({
              where: { campanhaId: campId, status: "erro" },
            });
            const pendentes = Math.max(0, total - enviados - erros);
            const percent =
              total > 0 ? Math.round((enviados / total) * 100) : 0;
            enviarEventoCampanha(campId, {
              evento: "progress",
              total,
              enviados,
              pendentes,
              erros,
              percent,
            });
          } catch (e) {}
        }

        // Aguardar intervalo + delay aleatório antes do próximo envio
        const delayRand =
          delayRandMax > 0 ? Math.floor(Math.random() * delayRandMax) : 0;
        const totalDelay = intervaloMs + delayRand;
        console.log(
          `[Disparador] Aguardando ${totalDelay}ms antes do próximo envio...`,
        );
        await new Promise((r) => setTimeout(r, totalDelay));
      } catch (err) {
        console.error("[Disparador] Worker error:", err && err.message);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    // Limpeza ao sair do loop
    activeWorkers.delete(campId);
    console.log(`[Disparador] Worker da campanha ${campId} encerrado.`);
  })();
}

async function pausarCampanha(req, res) {
  try {
    const id = req.params.id;
    const camp = await Campanha.findByPk(id);
    if (!camp)
      return res.status(404).json({ error: "Campanha não encontrada" });

    // ISOLAMENTO MULTI-TENANT: campanha deve pertencer à empresa autenticada
    const empresaAuth =
      req.user && req.user.empresaId ? Number(req.user.empresaId) : null;
    if (!empresaAuth) {
      return res.status(403).json({ error: "Empresa não identificada" });
    }
    if (Number(camp.empresaId) !== empresaAuth) {
      return res
        .status(403)
        .json({ error: "Campanha não pertence à sua empresa" });
    }

    camp.status = "pausada";
    await camp.save();

    const worker = activeWorkers.get(Number(id));
    if (worker) {
      worker.stop();
      activeWorkers.delete(Number(id));
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("pausarCampanha error", err && err.message);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
}

async function continuarCampanha(req, res) {
  try {
    const id = req.params.id;
    const instanciaId = req.body.instanciaId || null;

    // ISOLAMENTO MULTI-TENANT: empresa sempre do contexto autenticado
    const empresaAuth =
      req.user && req.user.empresaId ? Number(req.user.empresaId) : null;
    if (!empresaAuth) {
      return res.status(403).json({ error: "Empresa não identificada" });
    }

    const camp = await Campanha.findByPk(id);
    if (!camp)
      return res.status(404).json({ error: "Campanha não encontrada" });

    // A campanha deve pertencer à empresa autenticada
    if (Number(camp.empresaId) !== empresaAuth) {
      return res
        .status(403)
        .json({ error: "Campanha não pertence à sua empresa" });
    }

    // A instância WhatsApp deve pertencer à empresa autenticada
    let instanciaValida = null;
    if (instanciaId) {
      instanciaValida = await WhatsappSession.findOne({
        where: { id: Number(instanciaId), empresaId: empresaAuth },
      });
      if (!instanciaValida) {
        return res
          .status(403)
          .json({ error: "Instância não pertence à sua empresa" });
      }
    } else {
      instanciaValida = await WhatsappSession.findOne({
        where: { empresaId: empresaAuth },
      });
      if (!instanciaValida) {
        return res.status(400).json({
          error:
            "Nenhuma instância WhatsApp encontrada para sua empresa. Crie uma instância primeiro.",
        });
      }
    }

    // Verificar/reconectar o cliente WhatsApp (chave validada)
    const chaveWpp = DISP_PREFIX + String(instanciaValida.id);
    const conectado = await aguardarConexao(chaveWpp);
    if (!conectado) {
      return res.status(400).json({
        error:
          "Não foi possível conectar ao WhatsApp. Verifique se a instância ainda está autenticada.",
      });
    }

    camp.status = "rodando";
    await camp.save();

    startWorker(camp, String(instanciaValida.id));

    return res.json({ success: true });
  } catch (err) {
    console.error("continuarCampanha error", err && err.message);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
}

async function obterLogs(req, res) {
  try {
    const id = req.params.id;

    // ISOLAMENTO MULTI-TENANT: o envio (e seus logs) deve pertencer
    // à empresa autenticada.
    const empresaAuth =
      req.user && req.user.empresaId ? Number(req.user.empresaId) : null;
    if (!empresaAuth) {
      return res.status(403).json({ error: "Empresa não identificada" });
    }
    const envioRef = await EnvioAgendado.findByPk(id);
    if (!envioRef) {
      return res.status(404).json({ error: "Envio não encontrado" });
    }
    if (Number(envioRef.empresaId) !== empresaAuth) {
      return res.status(403).json({ error: "Envio não pertence à sua empresa" });
    }

    const logs = await LogEnvio.findAll({
      where: { envioAgendadoId: id },
      order: [["createdAt", "DESC"]],
      limit: 200,
    });
    return res.json(logs);
  } catch (err) {
    console.error("obterLogs error", err && err.message);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
}

async function obterContatos(req, res) {
  try {
    const id = req.params.id;

    // ISOLAMENTO MULTI-TENANT: a campanha (e seus contatos) deve pertencer
    // à empresa autenticada.
    const empresaAuth =
      req.user && req.user.empresaId ? Number(req.user.empresaId) : null;
    if (!empresaAuth) {
      return res.status(403).json({ error: "Empresa não identificada" });
    }
    const camp = await Campanha.findByPk(id);
    if (!camp) {
      return res.status(404).json({ error: "Campanha não encontrada" });
    }
    if (Number(camp.empresaId) !== empresaAuth) {
      return res
        .status(403)
        .json({ error: "Campanha não pertence à sua empresa" });
    }

    const contatos = await Contato.findAll({
      where: { campanhaId: id },
      order: [["createdAt", "ASC"]],
    });
    return res.json(contatos);
  } catch (err) {
    console.error("obterContatos error", err && err.message);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
}

async function eventoSSE(req, res) {
  try {
    const id = req.params.id;
    // ISOLAMENTO MULTI-TENANT: só permite acompanhar campanha da própria empresa
    const empresaSSE =
      req.user && req.user.empresaId ? Number(req.user.empresaId) : null;
    const campSSE = await Campanha.findByPk(id);
    if (!empresaSSE || !campSSE || Number(campSSE.empresaId) !== empresaSSE) {
      return res.status(403).json({ error: "Campanha não pertence à sua empresa" });
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    if (res.flushHeaders) res.flushHeaders();

    // Heartbeat para manter conexão viva (>=1 minuto)
    const hb = setInterval(() => {
      try {
        res.write(`: heartbeat\n\n`);
      } catch (e) {
        clearInterval(hb);
      }
    }, 60 * 1000);

    adicionarListenerSSE(id, res);

    // Enviar snapshot inicial de progresso
    try {
      const total = await Contato.count({ where: { campanhaId: id } });
      const enviados = await Contato.count({
        where: { campanhaId: id, status: "enviado" },
      });
      const erros = await Contato.count({
        where: { campanhaId: id, status: "erro" },
      });
      const pendentes = Math.max(0, total - enviados - erros);
      const percent = total > 0 ? Math.round((enviados / total) * 100) : 0;
      res.write(
        `data: ${JSON.stringify({ evento: "progress", total, enviados, pendentes, erros, percent })}\n\n`,
      );
    } catch (e) {}

    req.on("close", () => {
      clearInterval(hb);
      // listener removal ocorre no adicionarListenerSSE por close
    });
  } catch (err) {
    try {
      res.end();
    } catch (e) {}
  }
}

/**
 * Salva configuração do disparador NO BANCO, por empresa
 * (WhatsappSession com nome='config_disparador' e empresaId da sessão).
 * ISOLAMENTO MULTI-TENANT: cada empresa tem sua própria configuração —
 * a antiga linha global (empresaId=0) nunca é lida nem atualizada.
 */
async function salvarConfig(req, res) {
  try {
    const empresaAuth =
      req.user && req.user.empresaId ? Number(req.user.empresaId) : null;
    if (!empresaAuth) {
      return res.status(403).json({ error: "Empresa não identificada" });
    }

    const { intervalo, delayInicial, limite, delayRand } = req.body;
    const config = {
      intervalo: Number(intervalo) || 10,
      delayInicial: Number(delayInicial) || 2,
      limite: Number(limite) || 0,
      delayRand: Number(delayRand) || 0,
    };

    const [registro] = await WhatsappSession.findOrCreate({
      where: { nome: "config_disparador", empresaId: empresaAuth },
      defaults: {
        empresaId: empresaAuth,
        status: "desconectado",
        numeroOrdem: 0,
        sessionData: JSON.stringify(config),
      },
    });
    registro.sessionData = JSON.stringify(config);
    await registro.save();

    return res.json({ success: true, config });
  } catch (err) {
    console.error("salvarConfig error", err && err.message);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
}

/**
 * Carrega configuração do disparador do banco, por empresa.
 * ISOLAMENTO MULTI-TENANT: retorna apenas a config DA empresa autenticada;
 * se não existir, retorna os padrões (nunca herda de outra empresa).
 */
async function carregarConfig(req, res) {
  try {
    const empresaAuth =
      req.user && req.user.empresaId ? Number(req.user.empresaId) : null;
    if (!empresaAuth) {
      return res.status(403).json({ error: "Empresa não identificada" });
    }

    const registro = await WhatsappSession.findOne({
      where: { nome: "config_disparador", empresaId: empresaAuth },
    });
    if (!registro || !registro.sessionData) {
      return res.json({
        intervalo: 10,
        delayInicial: 2,
        limite: 0,
        delayRand: 0,
      });
    }
    const config = JSON.parse(registro.sessionData);
    return res.json(config);
  } catch (err) {
    console.error("carregarConfig error", err && err.message);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
}

module.exports = {
  criarCampanha,
  iniciarCampanha,
  pausarCampanha,
  continuarCampanha,
  eventoSSE,
  obterLogs,
  obterContatos,
  salvarConfig,
  carregarConfig,
};
