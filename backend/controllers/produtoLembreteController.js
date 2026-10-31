/**
 * Controller: Produto Lembrete Recorrente
 * ----------------------------------------
 * Gerencia os lembretes automáticos de produtos recorrentes.
 * Integrado ao sistema de marketing existente (MensagemAutomatica + EnvioAgendado).
 */

const path = require("path");
const { Op } = require("sequelize");

// ─────────────────────────────────────────────────────────────
// Template padrão da mensagem de produto recorrente
// ─────────────────────────────────────────────────────────────
const TEMPLATE_PRODUTO_RECORRENTE = {
  tipo: "produto_recorrente",
  titulo: "Lembrete de Reposição de Produto",
  conteudo:
    "Olá {nome_tutor}! 🐾\n\nPercebemos que a {produto_nome} do seu pet provavelmente está acabando.\n\nDeseja fazer uma nova reposição? Estamos aqui para ajudar! 😊\n\n{nome_empresa}",
  icone: "fa-box-open",
  descricaoMarketing:
    "Lembre clientes automaticamente quando um produto recorrente (ração, medicamento, etc.) estiver prestes a acabar, gerando recompra automática.",
  configuracaoEnvio: { tipo: "ciclo_recorrente", hora: "09:00" },
  ativo: true,
};

// ─────────────────────────────────────────────────────────────
// Seed: garantir que a empresa tenha o template produto_recorrente ATIVO
// ─────────────────────────────────────────────────────────────
async function garantirTemplateProdutoRecorrente(empresaId) {
  try {
    const { MensagemAutomatica } = require("../models");
    const empId = Number(empresaId) || 1;
    const existe = await MensagemAutomatica.findOne({
      where: { tipo: "produto_recorrente", empresaId: empId },
    });
    if (!existe) {
      await MensagemAutomatica.create({
        ...TEMPLATE_PRODUTO_RECORRENTE,
        empresaId: empId,
      });
      console.log(
        `[ProdutoLembrete] Template produto_recorrente criado (ativo) para empresa ${empId}`,
      );
    } else if (!existe.ativo) {
      // Ativar template existente que foi criado inativo
      await existe.update({ ativo: true });
      console.log(
        `[ProdutoLembrete] Template produto_recorrente ATIVADO para empresa ${empId}`,
      );
    }
  } catch (err) {
    console.warn(
      "[ProdutoLembrete] Erro ao garantir template:",
      err && err.message,
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Listar lembretes de uma empresa
// GET /api/produto-lembrete?empresaId=1
// ─────────────────────────────────────────────────────────────
exports.listarLembretes = async (req, res) => {
  try {
    const { ProdutoLembreteRecorrente, Cliente } = require("../models");
    const empresaId =
      req.user && req.user.empresaId ? Number(req.user.empresaId) : null;
    if (!empresaId) {
      return res
        .status(403)
        .json({ success: false, error: "Empresa não identificada" });
    }
    const empId = empresaId;

    let lembretes = await ProdutoLembreteRecorrente.findAll({
      where: { empresa_id: empId },
      include: [
        {
          model: Cliente,
          as: "cliente",
          attributes: ["id", "nome", "telefone"],
        },
      ],
      order: [["data_proximo_disparo", "ASC"]],
      limit: 1000,
    });

    // Se não há registros na tabela de recorrentes, buscar clientes com lembrete ativo
    // e criar os ciclos automaticamente (bootstrap)
    if (lembretes.length === 0) {
      const clientesAtivos = await Cliente.findAll({
        where: { empresa_id: empId, lembrete_automatico_ativo: true },
        attributes: [
          "id",
          "nome",
          "telefone",
          "lembrete_automatico_dias",
          "lembrete_produto_id",
          "lembrete_produto_nome",
        ],
      });

      if (clientesAtivos.length > 0) {
        const hoje = new Date();
        for (const cli of clientesAtivos) {
          const dias = cli.lembrete_automatico_dias || 30;
          const dataDisparo = new Date(hoje);
          dataDisparo.setDate(dataDisparo.getDate() + Math.max(0, dias - 1));

          await ProdutoLembreteRecorrente.findOrCreate({
            where: {
              cliente_id: cli.id,
              empresa_id: empId,
              status: { [Op.ne]: "cancelado" },
            },
            defaults: {
              empresa_id: empId,
              cliente_id: cli.id,
              produto_id: cli.lembrete_produto_id
                ? String(cli.lembrete_produto_id)
                : null,
              produto_nome: cli.lembrete_produto_nome || "Produto",
              ativo: true,
              status: "ativo",
              dias_lembrete: dias,
              data_ultima_venda: hoje,
              data_proximo_disparo: dataDisparo,
            },
          });
        }

        // Buscar novamente após criar
        lembretes = await ProdutoLembreteRecorrente.findAll({
          where: { empresa_id: empId },
          include: [
            {
              model: Cliente,
              as: "cliente",
              attributes: ["id", "nome", "telefone"],
            },
          ],
          order: [["data_proximo_disparo", "ASC"]],
          limit: 1000,
        });
      }
    }

    res.json({ success: true, lembretes: lembretes.map((l) => l.toJSON()) });
  } catch (err) {
    console.error("[ProdutoLembrete] Erro ao listar:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// Buscar lembretes de um cliente específico
// GET /api/produto-lembrete/cliente/:clienteId
// ─────────────────────────────────────────────────────────────
exports.listarPorCliente = async (req, res) => {
  try {
    const { ProdutoLembreteRecorrente } = require("../models");
    const { clienteId } = req.params;

    const lembretes = await ProdutoLembreteRecorrente.findAll({
      where: { cliente_id: Number(clienteId) },
      order: [["createdAt", "DESC"]],
    });

    res.json({ success: true, lembretes: lembretes.map((l) => l.toJSON()) });
  } catch (err) {
    console.error("[ProdutoLembrete] Erro ao buscar por cliente:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// Criar ou atualizar lembrete (chamado ao criar venda)
// POST /api/produto-lembrete
// ─────────────────────────────────────────────────────────────
exports.criarOuAtualizar = async (req, res) => {
  try {
    const { ProdutoLembreteRecorrente } = require("../models");
    const {
      cliente_id,
      produto_id,
      produto_nome,
      venda_id,
      dias_lembrete,
      data_ultima_venda,
      empresa_id,
    } = req.body;

    if (!cliente_id || !produto_nome || !dias_lembrete) {
      return res
        .status(400)
        .json({ success: false, error: "Campos obrigatórios ausentes" });
    }

    const dataVenda = data_ultima_venda
      ? new Date(data_ultima_venda)
      : new Date();
    const dias = Number(dias_lembrete) || 30;

    // Calcular próximo disparo: dia (dias - 1) após a venda
    const dataDisparo = new Date(dataVenda);
    dataDisparo.setDate(dataDisparo.getDate() + dias - 1);

    const empId =
      req.user && req.user.empresaId ? Number(req.user.empresaId) : null;
    if (!empId) {
      return res
        .status(403)
        .json({ success: false, error: "Empresa não identificada" });
    }

    // Verificar se já existe lembrete ativo para este cliente+produto
    const existing = await ProdutoLembreteRecorrente.findOne({
      where: {
        cliente_id: Number(cliente_id),
        produto_nome,
        status: { [Op.ne]: "cancelado" },
      },
    });

    let lembrete;
    if (existing) {
      await existing.update({
        produto_id: produto_id || existing.produto_id,
        venda_id: venda_id || existing.venda_id,
        dias_lembrete: dias,
        data_ultima_venda: dataVenda,
        data_proximo_disparo: dataDisparo,
        ativo: true,
        status: "ativo",
        empresa_id: empId,
      });
      lembrete = existing;
      console.log(
        `[ProdutoLembrete] Lembrete atualizado id=${existing.id} cliente=${cliente_id} produto=${produto_nome}`,
      );
    } else {
      lembrete = await ProdutoLembreteRecorrente.create({
        empresa_id: empId,
        cliente_id: Number(cliente_id),
        produto_id: produto_id || null,
        produto_nome,
        venda_id: venda_id || null,
        dias_lembrete: dias,
        data_ultima_venda: dataVenda,
        data_proximo_disparo: dataDisparo,
        ativo: true,
        status: "ativo",
      });
      console.log(
        `[ProdutoLembrete] Lembrete criado id=${lembrete.id} cliente=${cliente_id} produto=${produto_nome}`,
      );
    }

    // Garantir que o template de mensagem existe para esta empresa
    await garantirTemplateProdutoRecorrente(empId);

    res.json({ success: true, lembrete: lembrete.toJSON() });
  } catch (err) {
    console.error("[ProdutoLembrete] Erro ao criar/atualizar:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// Desativar lembrete
// DELETE /api/produto-lembrete/:id
// ─────────────────────────────────────────────────────────────
exports.desativar = async (req, res) => {
  try {
    const {
      ProdutoLembreteRecorrente,
      Cliente,
      EnvioAgendado,
      MensagemAutomatica,
    } = require("../models");
    const { sequelize } = require("../models/Cliente");
    const { id } = req.params;

    const lembrete = await ProdutoLembreteRecorrente.findByPk(id);
    if (!lembrete) {
      return res
        .status(404)
        .json({ success: false, error: "Lembrete não encontrado" });
    }

    await lembrete.update({ ativo: false, status: "cancelado" });

    // Cancelar envios agendados pendentes deste cliente (pizarra limpa para reativação)
    if (lembrete.cliente_id) {
      try {
        const template = await MensagemAutomatica.findOne({
          where: {
            tipo: "produto_recorrente",
            empresaId: lembrete.empresa_id || 1,
          },
        });
        if (template) {
          await EnvioAgendado.update(
            { status: "cancelado" },
            {
              where: {
                mensagemAutomaticaId: template.id,
                status: { [Op.in]: ["pendente", "enviando"] },
                [Op.and]: [
                  sequelize.literal(
                    `JSON_EXTRACT(contexto, '$.clienteId') = ${Number(lembrete.cliente_id)}`,
                  ),
                ],
              },
            },
          );
        }
      } catch (e) {
        console.warn(
          "[ProdutoLembrete] Erro ao cancelar envios pendentes:",
          e.message,
        );
      }

      // Limpar config de lembrete no cadastro do cliente
      await Cliente.update(
        {
          lembrete_automatico_ativo: false,
          lembrete_produto_id: null,
          lembrete_produto_nome: null,
          lembrete_automatico_dias: 30,
        },
        { where: { id: lembrete.cliente_id } },
      );
    }

    res.json({ success: true, message: "Lembrete desativado" });
  } catch (err) {
    console.error("[ProdutoLembrete] Erro ao desativar:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// Pausar / reativar lembrete
// PATCH /api/produto-lembrete/:id
// ─────────────────────────────────────────────────────────────
exports.atualizarStatus = async (req, res) => {
  try {
    const { ProdutoLembreteRecorrente } = require("../models");
    const { id } = req.params;
    const { ativo, status } = req.body;

    const lembrete = await ProdutoLembreteRecorrente.findByPk(id);
    if (!lembrete) {
      return res
        .status(404)
        .json({ success: false, error: "Lembrete não encontrado" });
    }

    const update = {};
    if (ativo !== undefined) update.ativo = Boolean(ativo);
    if (status) update.status = status;

    await lembrete.update(update);
    res.json({ success: true, lembrete: lembrete.toJSON() });
  } catch (err) {
    console.error("[ProdutoLembrete] Erro ao atualizar status:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// Buscar config de lembrete de um cliente específico
// GET /api/produto-lembrete/config-cliente/:clienteId
// ─────────────────────────────────────────────────────────────
exports.getConfigCliente = async (req, res) => {
  try {
    const { Cliente } = require("../models");
    const { clienteId } = req.params;
    const empresaId =
      req.user && req.user.empresaId ? Number(req.user.empresaId) : null;
    if (!empresaId) {
      return res
        .status(403)
        .json({ success: false, error: "Empresa não identificada" });
    }

    const where = { id: Number(clienteId), empresa_id: empresaId };

    const cliente = await Cliente.findOne({
      where,
      attributes: [
        "id",
        "lembrete_automatico_ativo",
        "lembrete_automatico_dias",
        "lembrete_produto_id",
        "lembrete_produto_nome",
      ],
    });

    if (!cliente) {
      return res
        .status(404)
        .json({ success: false, error: "Cliente não encontrado" });
    }

    res.json({
      success: true,
      config: {
        ativo: !!cliente.lembrete_automatico_ativo,
        dias: cliente.lembrete_automatico_dias || 30,
        produto_id: cliente.lembrete_produto_id || null,
        produto_nome: cliente.lembrete_produto_nome || null,
      },
    });
  } catch (err) {
    console.error(
      "[ProdutoLembrete] Erro ao buscar config cliente:",
      err.message,
    );
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// Salvar config de lembrete de um cliente específico (JSON)
// POST /api/produto-lembrete/config-cliente/:clienteId
// ─────────────────────────────────────────────────────────────
exports.saveConfigCliente = async (req, res) => {
  try {
    const { Cliente, ProdutoLembreteRecorrente } = require("../models");
    const { clienteId } = req.params;
    const { ativo, dias, produto_id, produto_nome } = req.body;
    const empresaId =
      req.user && req.user.empresaId ? Number(req.user.empresaId) : null;
    if (!empresaId) {
      return res
        .status(403)
        .json({ success: false, error: "Empresa não identificada" });
    }

    if (!clienteId || isNaN(Number(clienteId))) {
      return res
        .status(400)
        .json({ success: false, error: "clienteId inválido" });
    }

    const diasInt = parseInt(dias, 10);
    if (isNaN(diasInt) || diasInt <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "Dias deve ser maior que zero" });
    }

    const lembreteAtivo = ativo === true || ativo === "true";

    const where = { id: Number(clienteId), empresa_id: empresaId };

    const [updated] = await Cliente.update(
      {
        lembrete_automatico_ativo: lembreteAtivo,
        lembrete_automatico_dias: diasInt,
        lembrete_produto_id: produto_id ? Number(produto_id) : null,
        lembrete_produto_nome: produto_nome || null,
      },
      { where },
    );

    if (updated === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Cliente não encontrado" });
    }

    // ── Sincronizar produto_lembrete_recorrente ────────────────────────────
    const empId = Number(empresaId);
    const cliId = Number(clienteId);

    if (lembreteAtivo) {
      // Calcular datas do ciclo: começa hoje, disparo no dia (dias - 1)
      const hoje = new Date();
      const dataDisparo = new Date(hoje);
      dataDisparo.setDate(dataDisparo.getDate() + Math.max(0, diasInt - 1));

      const existing = await ProdutoLembreteRecorrente.findOne({
        where: {
          cliente_id: cliId,
          empresa_id: empId,
          status: { [Op.ne]: "cancelado" },
        },
      });

      if (existing) {
        // Atualizar ciclo existente
        await existing.update({
          ativo: true,
          status: "ativo",
          dias_lembrete: diasInt,
          produto_id: produto_id ? String(produto_id) : existing.produto_id,
          produto_nome: produto_nome || existing.produto_nome || "Produto",
          // Recalcular data de disparo só se dias mudou ou estava cancelado
          ...(existing.status !== "ativo"
            ? { data_ultima_venda: hoje, data_proximo_disparo: dataDisparo }
            : {}),
        });
        console.log(`[ProdutoLembrete] Ciclo atualizado — cliente ${cliId}`);
      } else {
        // Criar novo ciclo
        await ProdutoLembreteRecorrente.create({
          empresa_id: empId,
          cliente_id: cliId,
          produto_id: produto_id ? String(produto_id) : null,
          produto_nome: produto_nome || "Produto",
          venda_id: null,
          ativo: true,
          status: "ativo",
          dias_lembrete: diasInt,
          data_ultima_venda: hoje,
          data_proximo_disparo: dataDisparo,
        });
        console.log(`[ProdutoLembrete] Ciclo criado — cliente ${cliId}`);
      }

      // Garantir template de mensagem para a empresa
      garantirTemplateProdutoRecorrente(empId).catch(() => {});

      // Se data_proximo_disparo é hoje (ciclo curto: 1 dia), disparar imediatamente
      const agora2 = new Date();
      const inicioDia2 = new Date(
        agora2.getFullYear(),
        agora2.getMonth(),
        agora2.getDate(),
        0,
        0,
        0,
      );
      const fimDia2 = new Date(
        agora2.getFullYear(),
        agora2.getMonth(),
        agora2.getDate(),
        23,
        59,
        59,
      );
      if (dataDisparo >= inicioDia2 && dataDisparo <= fimDia2) {
        // Fire-and-forget: não bloqueia a resposta ao cliente
        setImmediate(async () => {
          try {
            await exports.processarLembretes();
          } catch (e) {
            console.warn(
              "[ProdutoLembrete] Erro no disparo imediato:",
              e.message,
            );
          }
        });
      }
    } else {
      // Desativar todos os ciclos ativos desse cliente e limpar campos do cadastro
      await ProdutoLembreteRecorrente.update(
        { ativo: false, status: "cancelado" },
        { where: { cliente_id: cliId, empresa_id: empId, ativo: true } },
      );
      // Cancelar envios agendados pendentes (pizarra limpa para reativação)
      try {
        const { EnvioAgendado, MensagemAutomatica } = require("../models");
        const { sequelize } = require("../models/Cliente");
        const template = await MensagemAutomatica.findOne({
          where: { tipo: "produto_recorrente", empresaId: empId },
        });
        if (template) {
          await EnvioAgendado.update(
            { status: "cancelado" },
            {
              where: {
                mensagemAutomaticaId: template.id,
                status: { [Op.in]: ["pendente", "enviando"] },
                [Op.and]: [
                  sequelize.literal(
                    `JSON_EXTRACT(contexto, '$.clienteId') = ${cliId}`,
                  ),
                ],
              },
            },
          );
        }
      } catch (e) {
        console.warn(
          "[ProdutoLembrete] Erro ao cancelar envios pendentes:",
          e.message,
        );
      }
      await Cliente.update(
        {
          lembrete_automatico_ativo: false,
          lembrete_produto_id: null,
          lembrete_produto_nome: null,
          lembrete_automatico_dias: 30,
        },
        { where: { id: cliId } },
      );
      console.log(
        `[ProdutoLembrete] Ciclos desativados e config limpa — cliente ${cliId}`,
      );
    }
    // ──────────────────────────────────────────────────────────────────────

    console.log(
      `[ProdutoLembrete] Config salva — cliente ${clienteId}: ativo=${lembreteAtivo}, dias=${diasInt}, produto_id=${produto_id}, produto_nome=${produto_nome}`,
    );

    res.json({ success: true, message: "Configuração salva com sucesso" });
  } catch (err) {
    console.error(
      "[ProdutoLembrete] Erro ao salvar config cliente:",
      err.message,
    );
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// Estatísticas de lembretes ativos para o painel de marketing
// GET /api/produto-lembrete/estatisticas
// ─────────────────────────────────────────────────────────────
exports.estatisticas = async (req, res) => {
  try {
    const { ProdutoLembreteRecorrente } = require("../models");
    const empresaId =
      req.user && req.user.empresaId ? Number(req.user.empresaId) : null;
    if (!empresaId) {
      return res
        .status(403)
        .json({ success: false, error: "Empresa não identificada" });
    }

    const totalAtivos = await ProdutoLembreteRecorrente.count({
      where: { empresa_id: Number(empresaId), ativo: true, status: "ativo" },
    });

    const hoje = new Date();
    const seteDias = new Date();
    seteDias.setDate(seteDias.getDate() + 7);

    // Conta registros atrasados + próximos 7 dias
    const disparosProximos = await ProdutoLembreteRecorrente.count({
      where: {
        empresa_id: Number(empresaId),
        ativo: true,
        status: "ativo",
        data_proximo_disparo: { [Op.lte]: seteDias },
      },
    });

    res.json({ success: true, totalAtivos, disparosProximos });
  } catch (err) {
    console.error(
      "[ProdutoLembrete] Erro ao buscar estatísticas:",
      err.message,
    );
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// Processar lembretes do dia (chamado pelo cron job)
// Verifica lembretes cujo data_proximo_disparo é hoje e dispara mensagem
// ─────────────────────────────────────────────────────────────
exports.processarLembretes = async function processarLembretes() {
  console.log("[ProdutoLembrete] Processando lembretes do dia...");

  try {
    const {
      ProdutoLembreteRecorrente,
      MensagemAutomatica,
      Cliente,
      Pet,
    } = require("../models");
    const { dispararMensagemAutomatica } = require("./marketingController");

    const agora = new Date();
    const inicioDia = new Date(
      agora.getFullYear(),
      agora.getMonth(),
      agora.getDate(),
      0,
      0,
      0,
    );
    const fimDia = new Date(
      agora.getFullYear(),
      agora.getMonth(),
      agora.getDate(),
      23,
      59,
      59,
    );

    // Buscar lembretes ativos com disparo até hoje (inclui atrasados)
    const lembretes = await ProdutoLembreteRecorrente.findAll({
      where: {
        ativo: true,
        status: "ativo",
        data_proximo_disparo: { [Op.lte]: fimDia },
      },
      include: [
        {
          model: Cliente,
          as: "cliente",
          attributes: ["id", "nome", "telefone", "ativo", "empresa_id"],
          include: [
            {
              model: Pet,
              as: "pets",
              attributes: ["id", "nome"],
              required: false,
              limit: 1,
            },
          ],
        },
      ],
      limit: 500,
    });

    if (lembretes.length === 0) {
      console.log("[ProdutoLembrete] Nenhum lembrete para disparar hoje.");
      return;
    }

    console.log(
      `[ProdutoLembrete] ${lembretes.length} lembrete(s) para processar.`,
    );

    let disparados = 0;
    let erros = 0;

    for (const lembrete of lembretes) {
      try {
        const cliente = lembrete.cliente;
        if (!cliente) continue;

        // Verificar se cliente está ativo
        if (cliente.ativo === false) {
          console.log(
            `[ProdutoLembrete] Cliente ${cliente.id} inativo — pulando lembrete ${lembrete.id}`,
          );
          continue;
        }

        if (!cliente.telefone) {
          console.warn(
            `[ProdutoLembrete] Cliente ${cliente.id} sem telefone — pulando`,
          );
          continue;
        }

        const empresaId = lembrete.empresa_id || cliente.empresa_id || 1;
        const primeiroPet = cliente.pets && cliente.pets[0];

        // Garantir template existe
        await garantirTemplateProdutoRecorrente(empresaId);

        // Disparar mensagem via sistema de marketing existente
        // cicloId único por lembrete+dia: reativações criam novo cicloData → novo envio
        const cicloId = `${lembrete.id}-${new Date().toISOString().slice(0, 10)}`;
        const envio = await dispararMensagemAutomatica(
          "produto_recorrente",
          {
            nome_tutor: cliente.nome || "Cliente",
            produto_nome: lembrete.produto_nome,
            nome_pet: primeiroPet?.nome || "seu pet",
            dias: String(lembrete.dias_lembrete),
          },
          cliente.telefone,
          null, // disparo imediato hoje
          {
            clienteId: cliente.id,
            lembreteId: lembrete.id,
            diasAntes: 0, // já é o dia do disparo
            cicloData: cicloId, // identifica o ciclo — evita bloqueio de dedup entre ciclos
          },
          empresaId,
        );

        if (envio) {
          // Reagendar próximo ciclo: nova data = hoje + dias_lembrete
          const proximaData = new Date();
          proximaData.setDate(proximaData.getDate() + lembrete.dias_lembrete);

          await lembrete.update({
            ultima_execucao: agora,
            data_proximo_disparo: proximaData,
          });

          disparados++;
          console.log(
            `[ProdutoLembrete] ✅ Lembrete ${lembrete.id} disparado para cliente ${cliente.id}. Próximo: ${proximaData.toISOString().slice(0, 10)}`,
          );
        }
      } catch (err) {
        erros++;
        console.error(
          `[ProdutoLembrete] Erro ao processar lembrete ${lembrete.id}:`,
          err && err.message,
        );
      }
    }

    console.log(
      `[ProdutoLembrete] Processamento concluído: ${disparados} disparados, ${erros} erros.`,
    );
  } catch (err) {
    console.error(
      "[ProdutoLembrete] Erro geral no processamento:",
      err.message,
    );
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/produto-lembrete/disparar-agora
// Disparo manual via painel de marketing — processa todos os atrasados
// ─────────────────────────────────────────────────────────────
exports.dispararManual = async function dispararManual(req, res) {
  try {
    await exports.processarLembretes();
    res.json({
      success: true,
      message: "Processamento de lembretes concluído.",
    });
  } catch (err) {
    console.error("[ProdutoLembrete] Erro no disparo manual:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/produto-lembrete/:id/disparar
// Disparo manual de um único lembrete pelo ID
// ─────────────────────────────────────────────────────────────
exports.dispararIndividual = async function dispararIndividual(req, res) {
  try {
    const id = Number(req.params.id);
    const { ProdutoLembreteRecorrente, Cliente, Pet } = require("../models");
    const { dispararMensagemAutomatica } = require("./marketingController");

    const empresaAuth =
      req.user && req.user.empresaId ? Number(req.user.empresaId) : null;
    if (!empresaAuth) {
      return res
        .status(403)
        .json({ success: false, error: "Empresa não identificada" });
    }

    const lembrete = await ProdutoLembreteRecorrente.findOne({
      where: { id, ativo: true },
      include: [
        {
          model: Cliente,
          as: "cliente",
          attributes: ["id", "nome", "telefone", "ativo", "empresa_id"],
          include: [
            {
              model: Pet,
              as: "pets",
              attributes: ["id", "nome"],
              required: false,
              limit: 1,
            },
          ],
        },
      ],
    });

    if (!lembrete) {
      return res
        .status(404)
        .json({ success: false, error: "Lembrete não encontrado ou inativo." });
    }

    const cliente = lembrete.cliente;
    if (!cliente || !cliente.telefone) {
      return res
        .status(400)
        .json({ success: false, error: "Cliente sem telefone cadastrado." });
    }

    const empresaId = lembrete.empresa_id || cliente.empresa_id || 1;
    if (Number(empresaId) !== empresaAuth) {
      return res.status(403).json({
        success: false,
        error: "Lembrete não pertence à sua empresa",
      });
    }
    const primeiroPet = cliente.pets && cliente.pets[0];

    await garantirTemplateProdutoRecorrente(empresaId);

    const cicloId = `${lembrete.id}-${new Date().toISOString().slice(0, 10)}`;
    const envio = await dispararMensagemAutomatica(
      "produto_recorrente",
      {
        nome_tutor: cliente.nome || "Cliente",
        produto_nome: lembrete.produto_nome,
        nome_pet: primeiroPet?.nome || "seu pet",
        dias: String(lembrete.dias_lembrete),
      },
      cliente.telefone,
      null,
      {
        clienteId: cliente.id,
        lembreteId: lembrete.id,
        diasAntes: 0,
        cicloData: cicloId,
      },
      empresaId,
    );

    if (envio) {
      const proximaData = new Date();
      proximaData.setDate(proximaData.getDate() + lembrete.dias_lembrete);
      await lembrete.update({
        ultima_execucao: new Date(),
        data_proximo_disparo: proximaData,
      });
      return res.json({
        success: true,
        message: `Lembrete disparado para ${cliente.nome}. Próximo disparo: ${proximaData.toISOString().slice(0, 10)}`,
        proximaData,
      });
    }

    res.status(500).json({
      success: false,
      error:
        "Falha ao enviar a mensagem. Verifique se o WhatsApp está conectado e o template está ativo.",
    });
  } catch (err) {
    console.error("[ProdutoLembrete] Erro no disparo individual:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// Hook: Criar lembretes a partir de uma venda (chamado pelo vendaController)
// Verifica se o cliente tem lembrete_automatico_ativo = true no modelo Cliente
// ─────────────────────────────────────────────────────────────
exports.criarLembretesDeVenda = async function criarLembretesDeVenda(
  venda,
  empresaId,
) {
  try {
    const { ProdutoLembreteRecorrente, Cliente } = require("../models");

    const clienteId = venda.clienteId;
    if (!clienteId) return;

    // Buscar cliente para verificar se tem lembrete automático ativo
    const cliente = await Cliente.findByPk(clienteId, {
      attributes: [
        "id",
        "nome",
        "telefone",
        "ativo",
        "lembrete_automatico_ativo",
        "lembrete_automatico_dias",
      ],
    });

    if (!cliente) return;
    if (!cliente.ativo) return;
    if (!cliente.lembrete_automatico_ativo) return;

    const dias = Number(cliente.lembrete_automatico_dias) || 30;

    // Processar itens da venda
    let itens = venda.itens || [];
    if (typeof itens === "string") {
      try {
        itens = JSON.parse(itens);
      } catch (_) {
        itens = [];
      }
    }

    if (!Array.isArray(itens) || itens.length === 0) return;

    const dataVenda = venda.data ? new Date(venda.data) : new Date();
    const empId = Number(empresaId) || 1;

    for (const item of itens) {
      const produtoNome = (
        (item.produto && item.produto.nome) ||
        item.nome ||
        item.descricao ||
        ""
      ).trim();
      if (!produtoNome) continue;

      const produtoId = (item.produto && item.produto.id) || item.id || null;

      // Calcular data do próximo disparo
      const dataDisparo = new Date(dataVenda);
      dataDisparo.setDate(dataDisparo.getDate() + dias - 1);

      // Criar ou atualizar lembrete
      const existing = await ProdutoLembreteRecorrente.findOne({
        where: {
          cliente_id: clienteId,
          produto_nome: produtoNome,
          status: { [Op.ne]: "cancelado" },
        },
      });

      if (existing) {
        await existing.update({
          produto_id: produtoId ? String(produtoId) : existing.produto_id,
          venda_id: venda.id || existing.venda_id,
          dias_lembrete: dias,
          data_ultima_venda: dataVenda,
          data_proximo_disparo: dataDisparo,
          ativo: true,
          status: "ativo",
          empresa_id: empId,
        });
        console.log(
          `[ProdutoLembrete] Ciclo renovado para cliente ${clienteId} produto "${produtoNome}"`,
        );
      } else {
        await ProdutoLembreteRecorrente.create({
          empresa_id: empId,
          cliente_id: clienteId,
          produto_id: produtoId ? String(produtoId) : null,
          produto_nome: produtoNome,
          venda_id: venda.id || null,
          dias_lembrete: dias,
          data_ultima_venda: dataVenda,
          data_proximo_disparo: dataDisparo,
          ativo: true,
          status: "ativo",
        });
        console.log(
          `[ProdutoLembrete] Novo lembrete criado para cliente ${clienteId} produto "${produtoNome}"`,
        );
      }
    }

    // Garantir template para esta empresa
    await garantirTemplateProdutoRecorrente(empId);
  } catch (err) {
    console.warn(
      "[ProdutoLembrete] Erro ao criar lembretes de venda:",
      err && err.message,
    );
  }
};
