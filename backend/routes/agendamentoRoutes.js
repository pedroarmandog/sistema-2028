const express = require("express");
const router = express.Router();
const { Agendamento, Pet, Cliente, Empresa, Usuario } = require("../models");
const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");
const { authUser } = require("../middleware/authUser");

console.log("DEBUG CANCELAMENTO: Entrou no endpoint de cancelamento");

// Aplicar auth em toda a rota
router.use(authUser);

// GET /api/agendamentos - Listar agendamentos
router.get("/", async (req, res) => {
  try {
    const { data, status, petCliente, profissional } = req.query;

    console.log("🔍 GET /api/agendamentos - Params:", {
      data,
      status,
      petCliente,
      profissional,
    });

    const whereClause = {
      // Excluir registros internos de prontuário (vacina/vermifugo/antiparasitário de pet-details)
      servico: {
        [Op.notIn]: ["vacina", "vermifugo", "antiparasitario", "documento"],
      },
    };

    // Filtro obrigatório por empresa
    if (req.user?.empresaId) {
      whereClause.empresa_id = req.user.empresaId;
    }

    // Filtro por data - usar intervalo com offset -03:00 para evitar
    // discrepâncias de timezone/UTC ao armazenar timestamps.
    if (data) {
      try {
        const start = new Date(`${data}T00:00:00-03:00`);
        const next = new Date(start);
        next.setDate(start.getDate() + 1);
        whereClause.dataAgendamento = {
          [Op.gte]: start,
          [Op.lt]: next,
        };
        console.log(
          "📅 Filtro de data aplicado (range):",
          start.toISOString(),
          next.toISOString(),
        );
      } catch (e) {
        console.warn(
          "⚠️ Erro ao aplicar filtro de data como range, fallback para DATE():",
          e,
        );
        const { Sequelize } = require("sequelize");
        whereClause[Op.and] = [
          Sequelize.where(
            Sequelize.fn("DATE", Sequelize.col("dataAgendamento")),
            "=",
            data,
          ),
        ];
      }
    }

    // Filtro por status
    if (status && Array.isArray(status) && status.length > 0) {
      // Filtro explícito: mostrar apenas os status solicitados (incluindo cancelado se pedido)
      whereClause.status = { [Op.in]: status };
    } else if (status && !Array.isArray(status)) {
      // status como string única
      whereClause.status = status;
    } else if (req.query.incluirCancelados !== "true") {
      // Sem filtro de status e sem flag especial: ocultar cancelados por padrão
      whereClause.status = { [Op.ne]: "cancelado" };
    }
    // Se incluirCancelados=true e sem status[], retorna tudo (inclusive cancelados)

    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
    const offset = parseInt(req.query.offset, 10) || 0;
    const agendamentos = await Agendamento.findAll({
      attributes: [
        "id",
        "horario",
        "servico",
        "observacoes",
        "profissional",
        "valor",
        "status",
        "dataAgendamento",
        "petId",
      ],
      where: whereClause,
      include: [
        {
          model: Pet,
          as: "pet",
          attributes: ["id", "nome", "raca", "observacao", "cliente_id"],
          include: [
            {
              model: Cliente,
              as: "cliente",
              attributes: ["id", "nome", "telefone"],
            },
          ],
          where: petCliente
            ? {
                nome: {
                  [Op.like]: `%${petCliente}%`,
                },
              }
            : undefined,
        },
      ],
      order: [
        ["dataAgendamento", "ASC"],
        ["horario", "ASC"],
      ],
      limit,
      offset,
    });

    // Formatando os dados para o frontend (usar aliases corretos em minúsculas)
    const agendamentosFormatted = agendamentos.map((agendamento) => ({
      id: agendamento.id,
      horario: agendamento.horario,
      petNome: agendamento.pet?.nome || "Pet não encontrado",
      clienteNome: agendamento.pet?.cliente?.nome || "Cliente não encontrado",
      servico: agendamento.servico,
      servicos: agendamento.servicos || [],
      observacoes: agendamento.observacoes,
      petObservacao: agendamento.pet?.observacao || null,
      profissional: agendamento.profissional,
      valor: agendamento.valor,
      status: agendamento.status,
      dataAgendamento: agendamento.dataAgendamento,
    }));

    res.json(agendamentosFormatted);
  } catch (error) {
    console.error("[AGENDAMENTOS ERROR] Erro ao buscar agendamentos:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// GET /api/agendamentos/:id - Buscar agendamento por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const agendamento = await Agendamento.findByPk(id, {
      include: [
        {
          model: Pet,
          as: "pet",
          include: [{ model: Cliente, as: "cliente" }],
        },
      ],
    });

    if (!agendamento) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    const agendamentoFormatted = {
      id: agendamento.id,
      horario: agendamento.horario,
      petNome: agendamento.pet?.nome || "Pet não encontrado",
      clienteNome: agendamento.pet?.cliente?.nome || "Cliente não encontrado",
      servico: agendamento.servico,
      servicos: agendamento.servicos || [],
      observacoes: agendamento.observacoes,
      petObservacao: agendamento.pet?.observacao || null,
      profissional: agendamento.profissional,
      valor: agendamento.valor,
      status: agendamento.status,
      dataAgendamento: agendamento.dataAgendamento,
      petId: agendamento.petId,
      clienteId: agendamento.pet?.cliente?.id || null,
      prontuario: agendamento.prontuario || [],
      clinicaState: agendamento.clinicaState || null,
      pagamentos: agendamento.pagamentos || [],
      totalPago: agendamento.totalPago || 0,
      taxidog: agendamento.taxidog || false,
    };
    // Incluir objeto `pet` com cliente aninhado (útil para views que precisam do endereço completo)
    try {
      if (agendamento.pet) {
        agendamentoFormatted.pet = {
          id: agendamento.pet.id,
          nome: agendamento.pet.nome,
          observacao: agendamento.pet.observacao || null,
        };
        if (agendamento.pet.cliente) {
          const c = agendamento.pet.cliente;
          agendamentoFormatted.pet.cliente = {
            id: c.id,
            nome: c.nome,
            telefone: c.telefone,
            endereco: c.endereco || null,
            numero: c.numero || null,
            complemento: c.complemento || null,
            bairro: c.bairro || null,
            cidade: c.cidade || null,
            estado: c.estado || null,
            cep: c.cep || null,
          };
        }
      }
    } catch (e) {
      // não falhar em caso de estrutura inesperada
      console.warn(
        "Aviso: falha ao anexar pet.cliente no agendamentoFormatted:",
        e,
      );
    }

    res.json(agendamentoFormatted);
  } catch (error) {
    console.error("[AGENDAMENTOS ERROR] Erro ao buscar agendamento:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /api/agendamentos - Criar novo agendamento
router.post("/", async (req, res) => {
  try {
    const {
      data,
      hora,
      petId,
      servico,
      servicos,
      observacoes,
      profissional,
      valor,
    } = req.body;

    // Validações básicas
    if (!data || !hora || !petId || !servico) {
      return res.status(400).json({
        error: "Campos obrigatórios: data, hora, petId e servico",
      });
    }

    // Verificar se o pet existe
    const pet = await Pet.findByPk(petId);
    if (!pet) {
      return res.status(404).json({ error: "Pet não encontrado" });
    }

    // Combinar data e hora (adicionar explicitamente o offset de São Paulo)
    // Isso evita problemas de conversão de timezone que movem o dia para frente/para trás
    // quando a string é interpretada como UTC pelo engine de JS/DB.
    const dataAgendamento = new Date(`${data}T${hora}:00-03:00`);

    // Verificar conflitos de horário (mesmo PET no mesmo horário)
    // Usar intervalo (start <= dataAgendamento < next) com offset -03:00
    let conflito = null;
    try {
      const start = new Date(`${data}T00:00:00-03:00`);
      const next = new Date(start);
      next.setDate(start.getDate() + 1);
      conflito = await Agendamento.findOne({
        where: {
          petId: petId,
          horario: hora,
          dataAgendamento: {
            [Op.gte]: start,
            [Op.lt]: next,
          },
          status: {
            [Op.not]: "cancelado",
          },
        },
      });
    } catch (e) {
      console.warn("⚠️ fallback conflito por DATE():", e);
      const { Sequelize } = require("sequelize");
      conflito = await Agendamento.findOne({
        where: {
          petId: petId,
          horario: hora,
          [Op.and]: Sequelize.where(
            Sequelize.fn("DATE", Sequelize.col("dataAgendamento")),
            "=",
            data,
          ),
          status: {
            [Op.not]: "cancelado",
          },
        },
      });
    }

    if (conflito) {
      return res.status(409).json({
        error: "Já existe um agendamento para este pet no mesmo horário",
      });
    }

    const novoAgendamento = await Agendamento.create({
      dataAgendamento,
      horario: hora,
      petId,
      servico,
      servicos: Array.isArray(servicos)
        ? servicos
        : servico
          ? [{ nome: servico, valor: valor || 0 }]
          : [],
      observacoes: observacoes || "",
      profissional: profissional || "",
      valor: valor || 0,
      status: "agendado",
      empresa_id: req.user?.empresaId || null,
    });

    // Buscar o agendamento criado com os dados relacionados
    const agendamentoCriado = await Agendamento.findByPk(novoAgendamento.id, {
      include: [
        {
          model: Pet,
          as: "pet",
          include: [{ model: Cliente, as: "cliente" }],
        },
      ],
    });

    const agendamentoFormatted = {
      id: agendamentoCriado.id,
      horario: agendamentoCriado.horario,
      petNome: agendamentoCriado.pet?.nome || "Pet não encontrado",
      clienteNome:
        agendamentoCriado.pet?.cliente?.nome || "Cliente não encontrado",
      servico: agendamentoCriado.servico,
      observacoes: agendamentoCriado.observacoes,
      profissional: agendamentoCriado.profissional,
      valor: agendamentoCriado.valor,
      status: agendamentoCriado.status,
      dataAgendamento: agendamentoCriado.dataAgendamento,
    };

    res.status(201).json(agendamentoFormatted);

    // ── Trigger: Lembrete de Agendamento (via Marketing) ────────────
    setImmediate(async () => {
      try {
        const {
          dispararMensagemAutomatica,
        } = require("../controllers/marketingController");
        const nomeTutor = agendamentoCriado.pet?.cliente?.nome || "";
        const telefone = agendamentoCriado.pet?.cliente?.telefone || "";
        const nomePet = agendamentoCriado.pet?.nome || "";
        const dt = agendamentoCriado.dataAgendamento
          ? new Date(agendamentoCriado.dataAgendamento)
          : null;
        const dataAgendamento = dt ? dt.toLocaleDateString("pt-BR") : "";
        const horaAgendamento = agendamentoCriado.horario || "";

        await dispararMensagemAutomatica(
          "lembrete_agendamento",
          {
            nomeTutor,
            nomePet,
            dataAgendamento,
            horaAgendamento,
            servico: agendamentoCriado.servico || "",
          },
          telefone,
          dt,
          {
            agendamentoId: agendamentoCriado.id,
            petId: agendamentoCriado.petId,
          },
          agendamentoCriado.pet?.cliente?.empresa_id,
        );
      } catch (e) {
        console.warn(
          "[Marketing] Não foi possível disparar lembrete:",
          e.message,
        );
      }
    });

    // ── Push: novo_agendamento ──────────────────────────────────────
    setImmediate(async () => {
      try {
        const pushService = require("../services/pushNotificationService");
        const empresaId = agendamentoCriado.empresa_id || req.user?.empresaId;
        if (empresaId) {
          // Formatar data para exibição (DD/MM/YYYY)
          let dataFormatada = "";
          try {
            if (agendamentoCriado.dataAgendamento) {
              const dt = new Date(agendamentoCriado.dataAgendamento);
              if (!isNaN(dt.getTime())) {
                dataFormatada = dt.toLocaleDateString("pt-BR");
              }
            }
          } catch (_) {}
          await pushService.notificarEmpresa(empresaId, "novo_agendamento", {
            petNome: agendamentoCriado.pet?.nome || "",
            clienteNome: agendamentoCriado.pet?.cliente?.nome || "",
            dataAgendamento: dataFormatada,
            horario: agendamentoCriado.horario || "",
            servico: agendamentoCriado.servico || "",
          });
        }
      } catch (e) {
        console.warn("[Push] Erro ao enviar push novo_agendamento:", e.message);
      }
    });
  } catch (error) {
    console.error("[AGENDAMENTOS ERROR] Erro ao criar agendamento:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// PUT /api/agendamentos/:id - Atualizar agendamento
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      data,
      hora,
      petId,
      servico,
      servicos,
      observacoes,
      profissional,
      valor,
      status,
      taxidog,
    } = req.body;

    console.log("📥 PUT /api/agendamentos/:id - Dados recebidos:", {
      id,
      data,
      hora,
      petId,
      servico,
      observacoes,
      profissional,
      valor,
      status,
    });

    const agendamento = await Agendamento.findByPk(id);
    if (!agendamento) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    // Preparar dados para atualização
    const updateData = {};

    if (data && hora) {
      // Normalizar hora: se não tem segundos, adicionar :00
      let horaNormalizada = hora;
      const partesHora = hora.split(":");
      if (partesHora.length === 2) {
        // Formato HH:MM, adicionar segundos
        horaNormalizada = `${hora}:00`;
      }
      // Se já tem 3 partes (HH:MM:SS), usar como está

      const dataString = `${data}T${horaNormalizada}-03:00`;
      console.log("🕐 Criando data (com offset -03:00):", dataString);
      const dataObj = new Date(dataString);
      console.log(
        "📅 Data criada:",
        dataObj,
        "isValid:",
        !isNaN(dataObj.getTime()),
      );

      if (isNaN(dataObj.getTime())) {
        console.error("❌ Data inválida gerada:", {
          data,
          hora,
          horaNormalizada,
          dataString,
        });
        return res
          .status(400)
          .json({ error: "Data ou hora inválida", details: { data, hora } });
      }

      updateData.dataAgendamento = dataObj;
      updateData.horario = hora;
    } else {
      console.log("⚠️ Data ou hora não fornecida, mantendo valores atuais");
    }

    if (petId) updateData.petId = petId;
    if (servico) updateData.servico = servico;
    // Se o cliente enviar um array estruturado de serviços, persista também no campo JSON
    if (servicos && Array.isArray(servicos)) {
      console.log("PUT /api/agendamentos/:id received servicos payload:", {
        id,
        servicosLength: servicos.length,
      });
      // Tratar o array enviado pelo cliente como autoritativo: sobrescrever o que está no banco
      try {
        // Deduplicar apenas os itens enviados pelo cliente (por id quando disponível, fallback por JSON)
        const seen = new Map();
        for (const it of servicos) {
          try {
            const key =
              it && it.id !== undefined && it.id !== null
                ? String(it.id)
                : JSON.stringify(it);
            if (!seen.has(key)) seen.set(key, it);
          } catch (e) {
            const key = JSON.stringify(it);
            if (!seen.has(key)) seen.set(key, it);
          }
        }
        const merged = Array.from(seen.values());
        updateData.servicos = merged;
        // atualizar campo texto concatenado para compatibilidade com views legadas
        const names = merged
          .map((s) =>
            s && (s.nome || s.name || s.nomeServico)
              ? s.nome || s.name || s.nomeServico
              : "",
          )
          .filter(Boolean);
        updateData.servico = names.join(", ");
      } catch (e) {
        updateData.servicos = servicos;
      }
    }
    if (observacoes !== undefined) updateData.observacoes = observacoes;
    if (profissional !== undefined) updateData.profissional = profissional;
    if (valor !== undefined) updateData.valor = valor;
    if (status) updateData.status = status;
    if (taxidog !== undefined) updateData.taxidog = taxidog;

    await agendamento.update(updateData);

    // Buscar o agendamento atualizado com os dados relacionados
    const agendamentoAtualizado = await Agendamento.findByPk(id, {
      include: [
        {
          model: Pet,
          as: "pet",
          include: [{ model: Cliente, as: "cliente" }],
        },
      ],
    });

    const agendamentoFormatted = {
      id: agendamentoAtualizado.id,
      horario: agendamentoAtualizado.horario,
      petNome: agendamentoAtualizado.pet?.nome || "Pet não encontrado",
      clienteNome:
        agendamentoAtualizado.pet?.cliente?.nome || "Cliente não encontrado",
      servico: agendamentoAtualizado.servico,
      servicos: agendamentoAtualizado.servicos || [],
      observacoes: agendamentoAtualizado.observacoes,
      profissional: agendamentoAtualizado.profissional,
      valor: agendamentoAtualizado.valor,
      status: agendamentoAtualizado.status,
      taxidog: agendamentoAtualizado.taxidog || false,
      dataAgendamento: agendamentoAtualizado.dataAgendamento,
    };

    res.json(agendamentoFormatted);
  } catch (error) {
    console.error("❌ Erro ao atualizar agendamento:", error);
    console.error("Stack trace:", error.stack);
    console.error("Payload recebido:", req.body);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
      details: error.stack,
    });
  }
});

// POST /api/agendamentos/:id/cancelar - Cancela agendamento após validar credenciais de gerente
router.post("/:id/cancelar", async (req, res) => {
  console.log("[CANCELAMENTO] ===== INÍCIO DA REQUISIÇÃO =====");
  console.log("[CANCELAMENTO] Params:", req.params);
  console.log("[CANCELAMENTO] Body:", req.body);
  
  try {
    const { id } = req.params;
    const { usuario: usuarioLogin, senha } = req.body;
    
    console.log("[CANCELAMENTO] ID:", id, "Usuario:", usuarioLogin);
    
    if (!usuarioLogin || !senha) {
      console.log("[CANCELAMENTO] ERRO: Campos obrigatórios faltando");
      return res.status(400).json({ error: "Usuário e senha são obrigatórios" });
    }

    const bcrypt = require("bcryptjs");
    const { Admin, Op } = require("../models");
    
    console.log("[CANCELAMENTO] Buscando Admin...");
    let user = null;
    let tipo = null;
    
    try {
      user = await Admin.findOne({
        where: {
          [Op.or]: [{ email: usuarioLogin }, { usuario: usuarioLogin }],
        },
      });
      tipo = "Admin";
      console.log("[CANCELAMENTO] Admin encontrado:", !!user);
    } catch (e) {
      console.error("[CANCELAMENTO] Erro ao buscar Admin:", e);
    }
    
    if (!user) {
      console.log("[CANCELAMENTO] Buscando Usuario...");
      try {
        user = await Usuario.findOne({ where: { usuario: usuarioLogin } });
        tipo = "Usuario";
        console.log("[CANCELAMENTO] Usuario encontrado:", !!user);
      } catch (e) {
        console.error("[CANCELAMENTO] Erro ao buscar Usuario:", e);
      }
    }
    
    if (!user) {
      console.log("[CANCELAMENTO] ERRO: Usuário não encontrado");
      return res.status(401).json({ error: "Usuário não encontrado" });
    }
    
    console.log("[CANCELAMENTO] Validando senha...");
    let senhaValida = false;
    try {
      if (tipo === "Usuario") {
        senhaValida = await bcrypt.compare(senha, user.senha);
      } else if (tipo === "Admin") {
        if (typeof user.validarSenha === "function") {
          senhaValida = await user.validarSenha(senha);
        } else {
          senhaValida = senha === user.senha;
        }
      }
      console.log("[CANCELAMENTO] Senha válida:", senhaValida);
    } catch (e) {
      console.error("[CANCELAMENTO] Erro na validação:", e);
      return res.status(500).json({ error: "Erro ao validar senha" });
    }
    
    if (!senhaValida) {
      console.log("[CANCELAMENTO] ERRO: Senha inválida");
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    console.log("[CANCELAMENTO] Cancelando agendamento ID:", id);
    const agendamento = await Agendamento.findByPk(id);
    if (!agendamento) {
      console.log("[CANCELAMENTO] ERRO: Agendamento não encontrado");
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }
    
    await agendamento.update({ status: "cancelado" });
    console.log("[CANCELAMENTO] SUCESSO: Agendamento cancelado");
    
    res.json({ message: "Agendamento cancelado com sucesso" });

    // ── Push: cancelamento ──────────────────────────────────────────
    setImmediate(async () => {
      try {
        const pushService = require("../services/pushNotificationService");
        const ag = await Agendamento.findByPk(id, {
          include: [{ model: Pet, as: "pet", required: false }],
        });
        const empresaId = ag?.empresa_id || req.user?.empresaId;
        if (empresaId) {
          console.log("[CANCELAMENTO] 📤 Enviando push notification de cancelamento");
          await pushService.notificarEmpresa(empresaId, "cancelamento", {
            petNome: ag?.pet?.nome || "",
            horario: ag?.horario || "",
          });
        }
      } catch (e) {
        console.warn("[CANCELAMENTO] ⚠️ Erro ao enviar push cancelamento:", e.message);
      }
    });
  } catch (error) {
    console.error("[CANCELAMENTO] ERRO GERAL:", error);
    console.error("[CANCELAMENTO] Stack:", error.stack);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    });
  }
});

// DELETE /api/agendamentos/:id - Deletar agendamento (cancelar)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const agendamento = await Agendamento.findByPk(id);
    if (!agendamento) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    // Em vez de deletar, vamos cancelar o agendamento
    await agendamento.update({ status: "cancelado" });

    res.json({ message: "Agendamento cancelado com sucesso" });
  } catch (error) {
    console.error("Erro ao cancelar agendamento:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// PATCH /api/agendamentos/:id/status - Atualizar status e opcionalmente pagamentos
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, pagamentos, totalPago } = req.body;

    // Instante real em que a ação (check-in/check-out) foi executada.
    // Usado nas notificações push — NUNCA substituir pelo horário agendado (`horario`).
    const momentoAcao = new Date();

    if (!status) {
      return res.status(400).json({ error: "Status é obrigatório" });
    }

    const validStatuses = [
      "agendado",
      "checkin",
      "pronto",
      "concluido",
      "cancelado",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: "Status inválido. Valores aceitos: " + validStatuses.join(", "),
      });
    }

    const agendamento = await Agendamento.findByPk(id);
    if (!agendamento) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    const updatePayload = { status };
    // aceitar pagamentos opcionais e totalPago
    if (pagamentos !== undefined) {
      try {
        updatePayload.pagamentos = Array.isArray(pagamentos)
          ? pagamentos
          : JSON.parse(pagamentos);
      } catch (e) {
        updatePayload.pagamentos = pagamentos;
      }
    }

    if (totalPago !== undefined) {
      const v = parseFloat(String(totalPago).replace(",", ".")) || 0;
      updatePayload.totalPago = v;
    }

    await agendamento.update(updatePayload);

    res.json({
      message: "Status (e pagamentos) atualizados com sucesso",
      status,
      pagamentos: updatePayload.pagamentos,
      totalPago: updatePayload.totalPago,
    });

    // ── Trigger: pet_pronto ─────────────────────────────────────────
    if (status === "pronto") {
      setImmediate(async () => {
        try {
          const {
            dispararMensagemAutomatica,
          } = require("../controllers/marketingController");
          const ag = await Agendamento.findByPk(id, {
            include: [
              {
                model: Pet,
                as: "pet",
                include: [{ model: Cliente, as: "cliente" }],
              },
            ],
          });
          if (!ag?.pet?.cliente) return;
          await dispararMensagemAutomatica(
            "pet_pronto",
            {
              nomeTutor: ag.pet.cliente.nome || "",
              nomePet: ag.pet.nome || "",
            },
            ag.pet.cliente.telefone || "",
            null,
            { agendamentoId: ag.id, petId: ag.petId },
            ag.pet.cliente.empresa_id,
          );
        } catch (e) {
          console.warn(
            "[Marketing] Não foi possível disparar pet_pronto:",
            e.message,
          );
        }
      });
    }

    // ── Push: checkout ─────────────────────────────────────────────
    if (status === "concluido") {
      setImmediate(async () => {
        try {
          const pushService = require("../services/pushNotificationService");
          const ag = await Agendamento.findByPk(id, {
            include: [{ model: Pet, as: "pet", required: false }],
          });
          const empresaId = ag?.empresa_id;
          if (empresaId) {
            // Valor final já existente no registro (sem recalcular regra financeira).
            // Prioriza o total efetivamente pago; senão usa o valor do serviço.
            const totalPagoNum = parseFloat(ag?.totalPago) || 0;
            const valorServicoNum = parseFloat(ag?.valor) || 0;
            const valorCheckout =
              totalPagoNum > 0
                ? totalPagoNum
                : valorServicoNum > 0
                  ? valorServicoNum
                  : null;
            await pushService.notificarEmpresa(empresaId, "checkout", {
              petNome: ag?.pet?.nome || "",
              horario: pushService.formatarHorarioBrasilia(momentoAcao),
              valor: valorCheckout,
            });
          }
        } catch (e) {
          console.warn("[Push] Erro ao enviar push checkout:", e.message);
        }
      });
    }

    // ── Trigger: primeiro_banho ─────────────────────────────────────
    if (status === "concluido") {
      setImmediate(async () => {
        try {
          const {
            dispararMensagemAutomatica,
          } = require("../controllers/marketingController");
          const ag = await Agendamento.findByPk(id, {
            include: [
              {
                model: Pet,
                as: "pet",
                include: [{ model: Cliente, as: "cliente" }],
              },
            ],
          });
          if (!ag?.pet?.cliente) return;
          // Verificar se é o primeiro atendimento concluído deste pet
          const concluidos = await Agendamento.count({
            where: {
              petId: ag.petId,
              status: "concluido",
              id: { [Op.ne]: id },
            },
          });
          if (concluidos === 0) {
            await dispararMensagemAutomatica(
              "primeiro_banho",
              {
                nomeTutor: ag.pet.cliente.nome || "",
                nomePet: ag.pet.nome || "",
                servico: ag.servico || "",
              },
              ag.pet.cliente.telefone || "",
              null,
              { agendamentoId: ag.id, petId: ag.petId },
              ag.pet.cliente.empresa_id,
            );
          }
        } catch (e) {
          console.warn(
            "[Marketing] Não foi possível disparar primeiro_banho:",
            e.message,
          );
        }
      });
    }

    // ── Push: checkin_pet ───────────────────────────────────────────
    if (status === "checkin") {
      setImmediate(async () => {
        try {
          const pushService = require("../services/pushNotificationService");
          const ag = await Agendamento.findByPk(id, {
            include: [{ model: Pet, as: "pet", required: false }],
          });
          const empresaId = ag?.empresa_id;
          if (empresaId) {
            await pushService.notificarEmpresa(empresaId, "checkin_pet", {
              petNome: ag?.pet?.nome || "",
              horario: pushService.formatarHorarioBrasilia(momentoAcao),
            });
          }
        } catch (e) {
          console.warn("[Push] Erro ao enviar push checkin_pet:", e.message);
        }
      });
    }

    // ── Push: servico_concluido ─────────────────────────────────────
    if (status === "pronto") {
      setImmediate(async () => {
        try {
          const pushService = require("../services/pushNotificationService");
          const ag = await Agendamento.findByPk(id, {
            include: [{ model: Pet, as: "pet", required: false }],
          });
          const empresaId = ag?.empresa_id;
          if (empresaId) {
            await pushService.notificarEmpresa(empresaId, "servico_concluido", {
              petNome: ag?.pet?.nome || "",
            });
          }
        } catch (e) {
          console.warn(
            "[Push] Erro ao enviar push servico_concluido:",
            e.message,
          );
        }
      });
    }

    // ── Push: cancelamento ──────────────────────────────────────────
    if (status === "cancelado") {
      setImmediate(async () => {
        try {
          const pushService = require("../services/pushNotificationService");
          const ag = await Agendamento.findByPk(id, {
            include: [{ model: Pet, as: "pet", required: false }],
          });
          const empresaId = ag?.empresa_id;
          if (empresaId) {
            await pushService.notificarEmpresa(empresaId, "cancelamento", {
              petNome: ag?.pet?.nome || "",
            });
          }
        } catch (e) {
          console.warn("[Push] Erro ao enviar push cancelamento:", e.message);
        }
      });
    }
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// PATCH /api/agendamentos/:id/prontuario - Salvar prontuário
router.patch("/:id/prontuario", async (req, res) => {
  try {
    const { id } = req.params;
    const { prontuario, clinicaState } = req.body;

    console.log("📥 Salvando prontuário/estado clínico para agendamento:", id);
    console.log(
      "📝 Dados prontuário:",
      Array.isArray(prontuario)
        ? `array(${prontuario.length})`
        : typeof prontuario,
    );
    console.log("🧭 Dados clinicaState:", clinicaState);

    const agendamento = await Agendamento.findByPk(id);
    if (!agendamento) {
      console.error("❌ Agendamento não encontrado:", id);
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    const updatePayload = {};
    if (prontuario !== undefined) updatePayload.prontuario = prontuario;
    if (clinicaState !== undefined) updatePayload.clinicaState = clinicaState;

    await agendamento.update(updatePayload);
    console.log("✅ Prontuário/estado clínico salvo com sucesso no banco");

    res.json({
      message: "Prontuário e estado clínico salvos com sucesso",
      prontuario: agendamento.prontuario,
      clinicaState: agendamento.clinicaState,
    });
  } catch (error) {
    console.error("Erro ao salvar prontuário:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// GET /api/agendamentos/:id/comprovante - Gerar PDF do comprovante
router.get("/:id/comprovante", async (req, res) => {
  try {
    const { id } = req.params;
    const PDFDocument = require("pdfkit");

    // Buscar agendamento com dados relacionados
    const agendamento = await Agendamento.findByPk(id, {
      include: [
        {
          model: Pet,
          as: "pet",
          include: [{ model: Cliente, as: "cliente" }],
        },
      ],
    });

    if (!agendamento) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    // ===== DETERMINAÇÃO DA EMPRESA DO COMPROVANTE (isolamento multi-tenant) =====
    // A empresa que deve aparecer no comprovante é a do contexto autenticado
    // (req.user.empresaId, resolvido pelo middleware authUser) e a do vínculo do
    // próprio atendimento (agendamento.empresa_id). Não há fallback silencioso
    // para outra empresa: quando ambos existem, precisam apontar para a mesma.
    const empresaUsuarioId =
      req.user && req.user.empresaId != null
        ? Number(req.user.empresaId)
        : null;
    const empresaAtendimentoId =
      agendamento.empresa_id != null ? Number(agendamento.empresa_id) : null;

    if (
      empresaUsuarioId &&
      empresaAtendimentoId &&
      empresaUsuarioId !== empresaAtendimentoId
    ) {
      console.error(
        `[comprovante] INCONSISTÊNCIA MULTI-TENANT: usuário empresa=${empresaUsuarioId}, atendimento empresa=${empresaAtendimentoId}`,
      );
      return res.status(403).json({
        erro:
          "Inconsistência de empresa: este atendimento não pertence à empresa do usuário autenticado.",
        empresaUsuario: empresaUsuarioId,
        empresaAtendimento: empresaAtendimentoId,
      });
    }

    const empresaIdEfetivo = empresaUsuarioId || empresaAtendimentoId;

    if (!empresaIdEfetivo) {
      console.error(
        "[comprovante] Nenhuma empresa identificada (usuário e atendimento sem empresa_id)",
      );
      return res.status(403).json({
        erro:
          "Empresa não identificada para gerar o comprovante. Contate o suporte.",
      });
    }

    const empresa = await Empresa.findByPk(empresaIdEfetivo);
    if (!empresa) {
      console.error(
        `[comprovante] Empresa ${empresaIdEfetivo} não encontrada no cadastro`,
      );
      return res
        .status(404)
        .json({ erro: "Empresa do atendimento não encontrada no cadastro." });
    }

    // Criar PDF para impressora de cupom (ajustado para ser um pouco mais largo)
    const mmToPt = (mm) => (mm * 72) / 25.4;
    const RECEIPT_MM = 72; // aumentar um pouco a largura do cupom (pouquinho mais largo que 58mm)
    const receiptWidth = Math.round(mmToPt(RECEIPT_MM)); // mm para pontos
    const receiptHeight = Math.round(mmToPt(300)); // altura padrão 300mm (ajustável)
    const smallMargin = Math.round(mmToPt(2)); // 2 mm
    const doc = new PDFDocument({
      size: [receiptWidth, receiptHeight],
      margins: {
        top: smallMargin,
        bottom: smallMargin,
        left: smallMargin,
        right: smallMargin,
      },
    });

    // Headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=comprovante-${id}.pdf`,
    );

    doc.pipe(res);

    // ===== Layout em blocos com colunas fixas e controle de Y para evitar sobreposição =====
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const pageWidth = doc.page.width;
    const lineHeight = 12;

    // Cabeçalho: usar a logo cadastrada da empresa correta (campo `logo` da tabela empresas)
    let logoRendered = false;
    var y = 0;
    try {
      let logoPath = null;
      let logoBuffer = null;

      // A logo da empresa é armazenada como arquivo em uploads/ (ex.: empresa_<timestamp>.png)
      // ou, ocasionalmente, como data URI/base64 gravado diretamente no campo `logo`.
      if (empresa && empresa.logo) {
        const logoStr = String(empresa.logo);
        if (logoStr.startsWith("data:image")) {
          try {
            const b64 = logoStr.split(",")[1] || "";
            logoBuffer = Buffer.from(b64, "base64");
          } catch (e) {
            logoBuffer = null;
          }
        } else {
          const candidates = [];
          if (logoStr.startsWith("/") || logoStr.startsWith("uploads")) {
            candidates.push(
              path.join(__dirname, "../../..", logoStr.replace(/^\/+/, "")),
            );
          }
          candidates.push(
            path.join(__dirname, "../../uploads", logoStr),
            path.join(__dirname, "../../uploads/logos-empresas", logoStr),
          );
          for (const c of candidates) {
            if (fs.existsSync(c)) {
              logoPath = c;
              break;
            }
          }
        }
      }

      const imagemLogo =
        logoBuffer || (logoPath && fs.existsSync(logoPath) ? logoPath : null);
      if (imagemLogo) {
        const maxLogoWidth = Math.round(pageWidth * 0.6);
        const logoWidth = Math.min(maxLogoWidth, Math.round(mmToPt(30)));
        const logoX = (pageWidth - logoWidth) / 2;
        const logoY = smallMargin + 4;
        try {
          doc.image(imagemLogo, logoX, logoY, {
            width: logoWidth,
            align: "center",
          });
          logoRendered = true;
        } catch (e) {
          logoRendered = false;
        }
        const logoEstimatedHeight = Math.round(logoWidth * 0.9);
        y = logoY + logoEstimatedHeight + 2;
      }
    } catch (e) {
      console.warn("Erro ao buscar logo da empresa:", e && e.message);
    }

    if (!logoRendered) {
      const nomeEmp = empresa ? empresa.nome || empresa.razaoSocial || "" : "";
      if (nomeEmp) {
        doc
          .fillColor("#000")
          .fontSize(18)
          .font("Helvetica-Bold")
          .text(nomeEmp, { align: "center" });
      }
      if (empresa && empresa.telefone) {
        doc
          .fontSize(9)
          .font("Helvetica")
          .text("Contato: " + empresa.telefone, { align: "center" });
      }
      // iniciar y logo -> conteúdo; aumentar espaçamento quando não há logo real
      // aproximar um pouco (menos espaçamento) para a razão social
      y = doc.y + 12;
    }

    // Exibir Razão Social da empresa abaixo da logo (se disponível)
    try {
      if (empresa && empresa.razaoSocial) {
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor("#000")
          .text(String(empresa.razaoSocial), left, y, {
            width: right - left,
            align: "center",
          });
        y += lineHeight + 6;
      }
    } catch (e) {
      /* não bloquear geração por erro de leitura */
    }

    // Dados cadastrais da empresa (CNPJ, endereço, contato) — dados reais do cadastro
    try {
      if (empresa) {
        const infoLines = [];

        const cnpjRaw = String(empresa.cnpj || "").trim();
        if (cnpjRaw) {
          const cnpjLimpo = cnpjRaw.replace(/\D/g, "");
          const cnpjExib =
            cnpjLimpo.length === 14
              ? cnpjLimpo.replace(
                  /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
                  "$1.$2.$3/$4-$5",
                )
              : cnpjRaw;
          infoLines.push(`CNPJ: ${cnpjExib}`);
        }

        const end =
          empresa.endereco && typeof empresa.endereco === "object"
            ? empresa.endereco
            : {};
        const rua = String(end.rua || "").trim();
        const numero = String(end.numero || "").trim();
        const complemento = String(end.complemento || "").trim();
        const bairro = String(end.bairro || "").trim();
        const enderecoParts = [];
        if (rua) enderecoParts.push(rua + (numero ? `, ${numero}` : ""));
        if (complemento) enderecoParts.push(`Cpl: ${complemento}`);
        if (bairro) enderecoParts.push(`Bairro: ${bairro}`);
        if (enderecoParts.length) infoLines.push(enderecoParts.join(" - "));

        const cidade = String(end.cidade || "").trim();
        const uf = String(end.estado || end.uf || "").trim();
        const cep = String(end.cep || "").trim();
        const localParts = [];
        if (cidade) localParts.push(cidade + (uf ? `/${uf}` : ""));
        if (cep) localParts.push(`CEP: ${cep}`);
        if (localParts.length) infoLines.push(localParts.join(" - "));

        const telefone = String(empresa.telefone || "").trim();
        const telefone2 = String(empresa.telefone2 || "").trim();
        const email = String(empresa.email || "").trim();
        const contatoParts = [];
        // Sem logo, o fallback já imprime "Contato: <telefone>" — evita duplicação
        if (logoRendered && telefone) contatoParts.push(`Tel: ${telefone}`);
        if (telefone2) contatoParts.push(`Tel 2: ${telefone2}`);
        if (email) contatoParts.push(`E-mail: ${email}`);
        if (contatoParts.length) infoLines.push(contatoParts.join(" • "));

        if (infoLines.length) {
          doc.fontSize(8).font("Helvetica").fillColor("#333");
          for (const line of infoLines) {
            const lineH = doc.heightOfString(line, { width: right - left });
            doc.text(line, left, y, {
              width: right - left,
              align: "center",
              lineGap: 1,
            });
            y += lineH + 2;
          }
          y += 3;
        }
      }
    } catch (e) {
      /* não bloquear a geração do comprovante por erro no bloco de dados da empresa */
    }

    // Dados do cliente e emissão (blocos à esquerda e direita)
    const clienteCodigo = agendamento.pet?.cliente?.codigo || "550";
    const clienteNome = agendamento.pet?.cliente?.nome || "Rodrigo";
    const clienteTelefone =
      agendamento.pet?.cliente?.telefone ||
      agendamento.pet?.cliente?.celular ||
      "";
    const dataEmissao = new Date().toLocaleDateString("pt-BR");
    const petId = agendamento.pet?.id || "312";
    const petNome = agendamento.pet?.nome || "Clark";

    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor("#c00")
      .text(`Cliente: ${clienteCodigo} - ${clienteNome}`, left, y);
    if (clienteTelefone) {
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#000")
        .text(`Contato: ${clienteTelefone}`, left, y + lineHeight);
    }

    // Avançar y para evitar sobreposição antes de imprimir Emissão/Atendimento
    const rightAreaWidth = right - left;
    const clienteLines = clienteTelefone ? 2 : 1;
    const spacingAfterCliente = clienteLines * lineHeight;
    // posicionar Emissão abaixo do nome/contato do cliente
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#000")
      .text(`Emissão: ${dataEmissao}`, left, y + spacingAfterCliente, {
        width: rightAreaWidth,
        align: "right",
      });
    // manter fonte regular para 'Atendimento' logo abaixo de Emissão
    doc
      .fontSize(9)
      .font("Helvetica")
      .text(`Atendimento: ${id}`, left, y + spacingAfterCliente + lineHeight, {
        width: rightAreaWidth,
        align: "right",
      });

    // Pet em nova linha, alinhado à esquerda — avançar y considerando linhas de cliente + emissão + atendimento
    y += spacingAfterCliente + lineHeight * 2 + 6;
    doc
      .fontSize(9)
      .font("Helvetica")
      .text(`Pet: ${petId} - ${petNome}`, left, y);

    // Espaçamento antes da tabela
    y += lineHeight + 6;

    // Linha pontilhada (usar dash para manter visual consistente)
    doc.save();
    doc.lineWidth(0.7);
    doc.dash(2, { space: 3 });
    doc.moveTo(left, y).lineTo(right, y).stroke();
    doc.undash();
    doc.restore();

    y += 10;

    // Definir colunas responsivas (percentuais) para caber bem no cupom
    const contentWidth =
      pageWidth - doc.page.margins.left - doc.page.margins.right;
    const totalColWidth = Math.round(contentWidth * 0.28);
    const unitColWidth = Math.round(contentWidth * 0.18);
    const qtyColWidth = Math.round(contentWidth * 0.12);

    const totalX = right - totalColWidth;
    const unitX = totalX - unitColWidth;
    const qtyX = unitX - qtyColWidth;
    const descX = left;

    // Cabeçalho da tabela
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#000");
    doc.text("Descrição", descX, y, { width: qtyX - descX - 8 });
    doc.text("Qtd", qtyX, y, { width: unitX - qtyX, align: "center" });
    doc.text("Vlr Unit", unitX, y, { width: totalX - unitX, align: "right" });
    doc.text("Total", totalX, y, { width: right - totalX, align: "right" });

    y += lineHeight + 6;

    // Linha divisória
    doc.save();
    doc.lineWidth(0.5);
    doc
      .moveTo(left, y - 4)
      .lineTo(right, y - 4)
      .stroke();
    doc.restore();

    // Serviços
    const servicos = agendamento.servicos || [];
    let subtotal = 0;
    doc.font("Helvetica").fontSize(9).fillColor("#000");

    for (let i = 0; i < servicos.length; i++) {
      const servico = servicos[i];
      const quantidade = parseFloat(servico.quantidade) || 1;
      // "Vlr Unit" = valor unitário cadastrado original do serviço/produto (nunca muda com desconto/acréscimo)
      const unitarioCadastrado =
        parseFloat(servico.unitario) || parseFloat(servico.valor) || 0;
      // "Total" = valor final já calculado com desconto/acréscimo (salvo no banco)
      // Prioriza servico.total; fallback: valor × qtd
      const total =
        parseFloat(servico.total) ||
        parseFloat(servico.valor || servico.unitario) * quantidade ||
        unitarioCadastrado * quantidade;
      subtotal += total;

      const descricao = servico.nome || "";

      // Verificar quebra de página
      if (y > doc.page.height - 120) {
        doc.addPage();
        y = 60;
      }

      // Descrição (pode quebrar em várias linhas)
      const descWidth = qtyX - descX - 8;
      const descHeight = doc.heightOfString(descricao, { width: descWidth });
      doc.text(descricao, descX, y, { width: descWidth });

      // Quantidade, Valor Unitário (cadastrado) e Total alinhados nas colunas
      doc.text(String(quantidade), qtyX, y, {
        width: unitX - qtyX,
        align: "center",
      });
      doc.text(`R$ ${unitarioCadastrado.toFixed(2)}`, unitX, y, {
        width: totalX - unitX,
        align: "right",
      });
      doc.text(`R$ ${total.toFixed(2)}`, totalX, y, {
        width: right - totalX,
        align: "right",
      });

      // avançar y pela maior altura entre descrição e linha simples
      y += Math.max(descHeight, lineHeight) + 6;
    }

    // Espaço antes dos totais - usar fluxo (sem x/y) e bloco exclusivo para valores
    doc.moveDown(1);

    // Linha pontilhada visual (texto) para evitar uso de coordenadas absolutas
    const dashLine = Array(Math.floor(contentWidth / 6))
      .fill(".")
      .join("");
    doc
      .fontSize(8)
      .fillColor("#000")
      .text(dashLine, { align: "center", width: contentWidth });
    doc.moveDown(0.5);

    // Bloco de totais usando largura reduzida para deslocar visualmente o bloco para a esquerda
    const desiredOffsetFromRight = Math.round(mmToPt(6)); // ~6mm
    const totalsBlockWidth = Math.max(
      contentWidth - desiredOffsetFromRight,
      totalColWidth + 12,
    );

    doc.moveDown(0.2);
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#000")
      .text(`Subtotal: R$ ${subtotal.toFixed(2)}`, {
        align: "right",
        width: totalsBlockWidth,
        lineGap: 4,
      });
    doc.moveDown(0.3);
    doc.fontSize(9).font("Helvetica").text(`(-) Descontos: R$ 0,00`, {
      align: "right",
      width: totalsBlockWidth,
      lineGap: 4,
    });
    doc.moveDown(0.6);

    // Linha separadora curta antes do total
    const sepLen = Math.floor(totalsBlockWidth / 6);
    const separator = Array(sepLen).fill("-").join("");
    doc
      .fontSize(9)
      .text(separator, { align: "right", width: totalsBlockWidth });
    doc.moveDown(0.6);

    // Espaçamento e formas de pagamento centradas em bloco próprio
    y += lineHeight + 16;
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("Formas de Pagamento", left, y, {
        width: right - left,
        align: "center",
      });

    // Mostrar formas de pagamento salvas no agendamento, se houver
    const pagamentos = agendamento.pagamentos || [];
    if (Array.isArray(pagamentos) && pagamentos.length > 0) {
      y += lineHeight + 8;
      doc.fontSize(9).font("Helvetica").fillColor("#000");
      // helper para mapear chave da forma para rótulo legível
      const formaLabel = (f) => {
        if (!f) return "";
        const map = {
          dinheiro: "Dinheiro",
          debito: "Débito",
          credito: "Crédito",
          pix: "Pix",
          crediario: "Crediário",
          cheque: "Cheque",
          haver: "Haver",
        };
        return map[f] || String(f);
      };

      pagamentos.forEach((p) => {
        try {
          const label = formaLabel(p.forma || p.tipo || p.method);
          const valor =
            p.valor !== undefined && p.valor !== null
              ? `R$ ${Number(p.valor).toFixed(2)}`
              : "";
          doc.text(label, left + 6, y, {
            width: right - left - 12,
            align: "left",
          });
          if (valor)
            doc.text(valor, left + 6, y, {
              width: right - left - 12,
              align: "right",
            });
          y += lineHeight + 4;
        } catch (e) {
          /* não bloquear drawing por item inválido */
        }
      });

      y += 6;
    } else {
      // manter espaço similar quando não há pagamentos
      y += lineHeight + 12;
    }

    // Depois das formas de pagamento, desenhar a linha separadora (assim pagamentos ficam acima dela)
    doc.save();
    doc.lineWidth(0.5);
    doc.moveTo(left, y).lineTo(right, y).stroke();
    doc.restore();
    y += 8;

    // Total centralizado abaixo da linha
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(`Total do(s) atendimento(s): R$ ${subtotal.toFixed(2)}`, left, y, {
        width: right - left,
        align: "center",
      });

    // Linha para assinatura (aumentar espaço para ficar mais abaixo que o total)
    // Ajuste feito para afastar a assinatura do bloco de totais
    // Linha para assinatura (centralizada no cupom)
    y += 60;
    if (y > doc.page.height - 60) {
      doc.addPage({
        size: [receiptWidth, receiptHeight],
        margins: {
          top: smallMargin,
          bottom: smallMargin,
          left: smallMargin,
          right: smallMargin,
        },
      });
      y = smallMargin + 20;
    }
    const sigLineLeft = left + 12;
    const sigLineRight = right - 12;
    doc.moveTo(sigLineLeft, y).lineTo(sigLineRight, y).stroke();
    y += 6;
    doc
      .fontSize(9)
      .font("Helvetica")
      .text("Assinatura", sigLineLeft, y, {
        width: sigLineRight - sigLineLeft,
        align: "center",
      });

    doc.end();
  } catch (error) {
    console.error("Erro ao gerar comprovante:", error);
    res.status(500).json({ error: "Erro ao gerar comprovante" });
  }
});

// ====== PRONTUÁRIO — PDF COMPLETO ======
router.get("/:id/prontuario/pdf", async (req, res) => {
  try {
    const { id } = req.params;
    const PDFDocument = require("pdfkit");

    // Buscar agendamento com Pet + Cliente
    const agendamento = await Agendamento.findByPk(id, {
      include: [
        { model: Pet, as: "pet", include: [{ model: Cliente, as: "cliente" }] },
      ],
    });
    if (!agendamento)
      return res.status(404).json({ error: "Agendamento não encontrado" });

    // Buscar empresa do usuário via cookie JWT
    let empresa = null;
    try {
      const jwt = require("jsonwebtoken");
      const JWT_SECRET =
        process.env.JWT_USER_SECRET || "pethub_user_secret_2026_!@#$%";
      let empresaId = null;
      try {
        const cookieHeader = req.headers.cookie || "";
        const match = cookieHeader.match(/pethub_token=([^;]+)/);
        if (match) {
          const decoded = jwt.verify(match[1], JWT_SECRET);
          if (decoded.empresaId) empresaId = decoded.empresaId;
        }
      } catch (_) {}
      if (
        !empresaId &&
        req.query &&
        (req.query.empresaId || req.query.empresa_id)
      ) {
        empresaId = req.query.empresaId || req.query.empresa_id;
      }
      if (empresaId) empresa = await Empresa.findByPk(empresaId);
      if (!empresa)
        empresa = await Empresa.findOne({
          where: { ativa: true },
          order: [["id", "ASC"]],
        });
    } catch (e) {}

    // Helper: strip HTML tags
    const stripHtml = (str) =>
      String(str || "")
        .replace(/<[^>]*>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ")
        .trim();

    // PDF A4
    const mmToPt = (mm) => (mm * 72) / 25.4;
    const A4W = 595.28,
      A4H = 841.89;
    const marginX = mmToPt(18),
      marginTop = mmToPt(14),
      marginBottom = mmToPt(14);
    const contentW = A4W - marginX * 2;

    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: marginTop,
        bottom: marginBottom,
        left: marginX,
        right: marginX,
      },
      autoFirstPage: true,
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=prontuario-${id}.pdf`,
    );
    doc.pipe(res);

    const left = marginX,
      right = A4W - marginX;
    let y = marginTop;

    // ── CABEÇALHO: logo ──────────────────────────────────────────────
    let logoRendered = false;
    try {
      let logoPath = null;
      if (empresa && empresa.logo) {
        const candidates = [
          path.join(__dirname, "../../uploads", String(empresa.logo)),
          path.join(
            __dirname,
            "../../uploads/logos-empresas",
            String(empresa.logo),
          ),
        ];
        for (const c of candidates) {
          if (fs.existsSync(c)) {
            logoPath = c;
            break;
          }
        }
      }
      if (!logoPath) {
        const fallback = path.join(
          __dirname,
          "../../frontend/fivecon/Design sem nome (17).png",
        );
        if (fs.existsSync(fallback)) logoPath = fallback;
      }
      if (logoPath && fs.existsSync(logoPath)) {
        const maxH = Math.round(mmToPt(18));
        const maxW = Math.round(mmToPt(28));
        const logoX = (A4W - maxW) / 2;
        doc.image(logoPath, logoX, y, {
          fit: [maxW, maxH],
          align: "center",
          valign: "top",
        });
        y += maxH + Math.round(mmToPt(4));
        logoRendered = true;
      }
    } catch (e) {}
    if (!logoRendered) {
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .fillColor("#2c3e50")
        .text("PETSHOP", left, y, { align: "center", width: contentW });
      y += 26;
    }

    // Nome empresa
    if (empresa && empresa.razaoSocial) {
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor("#2c3e50")
        .text(empresa.razaoSocial, left, y, {
          align: "center",
          width: contentW,
        });
      y += 16;
    }
    // Contato empresa
    const contatoEmp = [
      empresa && empresa.cnpj ? `CNPJ: ${empresa.cnpj}` : "",
      empresa && empresa.telefone ? `Tel: ${empresa.telefone}` : "",
      empresa && empresa.email ? empresa.email : "",
    ]
      .filter(Boolean)
      .join("   ");
    if (contatoEmp) {
      doc
        .fontSize(8.5)
        .font("Helvetica")
        .fillColor("#636e72")
        .text(contatoEmp, left, y, { align: "center", width: contentW });
      y += 13;
    }
    if (empresa && empresa.endereco) {
      let endStr = "";
      try {
        const e =
          typeof empresa.endereco === "string"
            ? JSON.parse(empresa.endereco)
            : empresa.endereco;
        if (typeof e === "object" && e !== null) {
          endStr = [
            e.logradouro || e.rua || e.endereco,
            e.numero,
            e.bairro,
            e.cidade ? `${e.cidade}${e.estado ? "/" + e.estado : ""}` : "",
            e.cep ? `CEP: ${e.cep}` : "",
          ]
            .filter(Boolean)
            .join(", ");
        } else {
          endStr = String(e);
        }
      } catch (e2) {
        endStr = String(empresa.endereco);
      }
      if (endStr) {
        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor("#636e72")
          .text(endStr, left, y, { align: "center", width: contentW });
        y += 13;
      }
    }

    // Linha divisória grossa
    y += 6;
    doc.save().rect(left, y, contentW, 2).fill("#2c3e50").restore();
    y += 10;

    // ── TÍTULO ────────────────────────────────────────────────────────
    doc
      .fontSize(15)
      .font("Helvetica-Bold")
      .fillColor("#2c3e50")
      .text("PRONTUÁRIO DO PET", left, y, { align: "center", width: contentW });
    y += 22;

    // ── DADOS DO AGENDAMENTO ─────────────────────────────────────────
    const dataAg = agendamento.dataAgendamento
      ? new Date(agendamento.dataAgendamento).toLocaleDateString("pt-BR")
      : "—";
    const horaAg = agendamento.horario || "—";
    const petNome = agendamento.pet?.nome || "—";
    const petRaca = agendamento.pet?.raca || "—";
    const petGenero = agendamento.pet?.genero || "—";
    const petPorte = agendamento.pet?.porte || "—";
    const petNasc = agendamento.pet?.data_nascimento
      ? new Date(agendamento.pet.data_nascimento).toLocaleDateString("pt-BR")
      : "—";
    const clienteNome = agendamento.pet?.cliente?.nome || "—";
    const clienteTel =
      agendamento.pet?.cliente?.telefone ||
      agendamento.pet?.cliente?.celular ||
      "—";
    const profissional = agendamento.profissional || "—";
    const servicos =
      (agendamento.servicos || [])
        .map((s) => s.nome || s.servico || "")
        .filter(Boolean)
        .join(", ") || "—";

    // Caixa de informações do pet (fundo cinza suave)
    const boxH = 126;
    // 1) fundo cinza
    doc
      .save()
      .roundedRect(left, y, contentW, boxH, 6)
      .fill("#f8f9fa")
      .restore();
    // 2) header colorido: topo arredondado + retângulo cobre cantos inferiores do roundedRect
    doc.save().roundedRect(left, y, contentW, 26, 6).fill("#2c3e50").restore();
    doc
      .save()
      .rect(left, y + 6, contentW, 20)
      .fill("#2c3e50")
      .restore();
    // 3) stroke por cima de tudo — borda limpa sem artefato
    doc
      .save()
      .lineWidth(1)
      .roundedRect(left, y, contentW, boxH, 6)
      .stroke("#c8cfd6")
      .restore();
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#ffffff")
      .text("INFORMAÇÕES DO PET", left + 10, y + 8, { width: contentW - 20 });

    // Duas colunas de info
    const col1X = left + 10,
      col2X = left + contentW / 2 + 5;
    const colW = contentW / 2 - 15;
    const lineH = 15;

    const labelStyle = () =>
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#636e72");
    const valueStyle = () =>
      doc.fontSize(9).font("Helvetica").fillColor("#2c3e50");

    const drawField = (label, value, x, curY) => {
      labelStyle().text(label.toUpperCase(), x, curY, { width: colW });
      valueStyle().text(value, x, curY + 9, { width: colW });
    };

    const box1YStart = y;
    drawField("Nome do Pet", petNome, col1X, y + 30);
    drawField("Tutor", clienteNome, col2X, y + 30);
    drawField("Raça", petRaca, col1X, y + 30 + lineH * 2 + 2);
    drawField("Telefone", clienteTel, col2X, y + 30 + lineH * 2 + 2);
    drawField(
      "Gênero / Porte",
      `${petGenero} / ${petPorte}`,
      col1X,
      y + 30 + (lineH * 2 + 2) * 2,
    );
    drawField("Nascimento", petNasc, col2X, y + 30 + (lineH * 2 + 2) * 2);
    // Avançar y para sempre sair abaixo da caixa
    y = box1YStart + boxH + 14;

    // Segunda caixa: dados do atendimento — altura dinâmica para caber os serviços
    // Calcular altura do campo Serviços (pode ser longo)
    const servicosTextHeight = doc
      .fontSize(9)
      .font("Helvetica")
      .heightOfString(servicos, { width: colW });
    // Linhas fixas: header(26) + padding(4) + linha1(lineH*2+2) + início linha2(lineH+9)
    // + altura real do texto serviços + padding inferior(14)
    const linhaServicosBaseY = 30 + lineH * 2 + 2 + lineH + 9; // offset relativo dentro da caixa
    const boxH2 = Math.max(
      96,
      30 + lineH * 2 + 2 + 9 + servicosTextHeight + 20,
    );
    const boxYStart = y;
    // 1) fundo cinza
    doc
      .save()
      .roundedRect(left, y, contentW, boxH2, 6)
      .fill("#f8f9fa")
      .restore();
    // 2) header colorido
    doc.save().roundedRect(left, y, contentW, 26, 6).fill("#4a90d9").restore();
    doc
      .save()
      .rect(left, y + 6, contentW, 20)
      .fill("#4a90d9")
      .restore();
    // 3) stroke por cima
    doc
      .save()
      .lineWidth(1)
      .roundedRect(left, y, contentW, boxH2, 6)
      .stroke("#b0bec5")
      .restore();
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#ffffff")
      .text("DADOS DO ATENDIMENTO", left + 10, y + 8, { width: contentW - 20 });

    drawField("Número", `#${id}`, col1X, y + 30);
    drawField("Profissional", profissional, col2X, y + 30);
    // Linha 2: Data/Hora à esquerda, Serviços à direita (pode ser multilinha)
    labelStyle().text("DATA / HORA", col1X, y + 30 + lineH * 2 + 2, {
      width: colW,
    });
    valueStyle().text(
      `${dataAg} às ${horaAg}`,
      col1X,
      y + 30 + lineH * 2 + 2 + 9,
      { width: colW },
    );
    labelStyle().text("SERVIÇOS", col2X, y + 30 + lineH * 2 + 2, {
      width: colW,
    });
    valueStyle().text(servicos, col2X, y + 30 + lineH * 2 + 2 + 9, {
      width: colW,
    });
    // Avançar y para sempre sair abaixo da caixa
    y = boxYStart + boxH2 + 14;

    // ── REGISTROS DO PRONTUÁRIO ────────────────────────────────────
    const prontuario = agendamento.prontuario || [];

    // Mapa de labels e cores por tipo
    const tipoMeta = {
      peso: { label: "Peso", color: "#ff6b6b" },
      banho: { label: "Banho e Tosa", color: "#4ecdc4" },
      medicacao: { label: "Medicação", color: "#ff9f43" },
      cirurgia: { label: "Cirurgia", color: "#a29bfe" },
      coracao: { label: "Avaliação Cardíaca", color: "#fd79a8" },
      vacina: { label: "Vacina", color: "#6c5ce7" },
      queixas: { label: "Queixas e Sintomas", color: "#00b894" },
      exames: { label: "Exames", color: "#e17055" },
      alergias: { label: "Alergias", color: "#fdcb6e" },
      temperatura: { label: "Temperatura", color: "#74b9ff" },
      dieta: { label: "Dieta e Alimentação", color: "#55efc4" },
      compartilhar: { label: "Notas para Compartilhar", color: "#0984e3" },
      anexar: { label: "Anexos e Documentos", color: "#636e72" },
    };

    if (prontuario.length === 0) {
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#aaa")
        .text("Nenhum registro no prontuário.", left, y, {
          align: "center",
          width: contentW,
        });
      y += 20;
    }

    for (const reg of prontuario) {
      const meta = tipoMeta[reg.tipo] || { label: reg.tipo, color: "#6c757d" };
      const conteudo = stripHtml(reg.conteudo);
      const dataReg = reg.dataEmissao || "";

      // Verificar se é tipo anexar
      if (reg.tipo === "anexar") {
        const arquivos = reg.arquivos || [];
        if (arquivos.length === 0) continue;

        // Estimar altura do card
        const cardH = 32 + arquivos.length * 14 + 12;
        if (y + cardH > A4H - marginBottom - 40) {
          doc.addPage();
          y = marginTop;
        }
        const anexarCardStartY = y;

        // Borda colorida lateral
        doc.save().rect(left, y, 4, cardH).fill(meta.color).restore();
        doc
          .save()
          .roundedRect(left, y, contentW, cardH, 4)
          .stroke("#dee2e6")
          .restore();

        // Título
        doc
          .fontSize(9.5)
          .font("Helvetica-Bold")
          .fillColor(meta.color)
          .text(meta.label, left + 12, y + 8, { width: contentW - 80 });
        if (dataReg)
          doc
            .fontSize(7.5)
            .font("Helvetica")
            .fillColor("#aaa")
            .text(dataReg, left + 12, y + 8, {
              width: contentW - 20,
              align: "right",
            });

        // Arquivos
        arquivos.forEach((arq, idx) => {
          const nome = arq.name || arq.url || "Arquivo";
          doc
            .fontSize(8.5)
            .font("Helvetica")
            .fillColor("#2c3e50")
            .text(`• ${nome}`, left + 16, y + 24 + idx * 14, {
              width: contentW - 24,
            });
        });
        // Sempre sair abaixo do card desenhado
        y = anexarCardStartY + cardH + 8;
        continue;
      }

      if (!conteudo) continue;

      // Calcular altura do conteúdo de texto
      const textH = doc.heightOfString(conteudo, {
        width: contentW - 24,
        fontSize: 9,
      });
      const cardH = 32 + textH + 14;

      if (y + cardH > A4H - marginBottom - 40) {
        doc.addPage();
        y = marginTop;
      }

      // Card com borda colorida lateral
      doc.save().rect(left, y, 4, cardH).fill(meta.color).restore();
      doc
        .save()
        .roundedRect(left, y, contentW, cardH, 4)
        .stroke("#dee2e6")
        .restore();

      // Título do card
      doc
        .fontSize(9.5)
        .font("Helvetica-Bold")
        .fillColor(meta.color)
        .text(meta.label, left + 12, y + 8, { width: contentW - 80 });
      if (dataReg)
        doc
          .fontSize(7.5)
          .font("Helvetica")
          .fillColor("#aaa")
          .text(dataReg, left + 12, y + 8, {
            width: contentW - 20,
            align: "right",
          });

      // Conteúdo
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#2c3e50")
        .text(conteudo, left + 12, y + 24, { width: contentW - 24 });

      y += cardH + 8;
    }

    // ── RODAPÉ ────────────────────────────────────────────────────────
    if (y > A4H - marginBottom - 50) {
      doc.addPage();
      y = marginTop;
    }
    y += 10;
    doc
      .save()
      .moveTo(left, y)
      .lineTo(right, y)
      .lineWidth(0.5)
      .stroke("#dee2e6")
      .restore();
    y += 8;
    const agora = new Date().toLocaleString("pt-BR");
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#aaa")
      .text(`Documento gerado em ${agora}`, left, y, {
        align: "center",
        width: contentW,
      });

    doc.end();
  } catch (error) {
    console.error("Erro ao gerar PDF do prontuário:", error);
    res.status(500).json({ error: "Erro ao gerar PDF do prontuário" });
  }
});

// ====== PRONTUÁRIO — UPLOAD DE ANEXOS ======
const multer = require("multer");

const storageProntuario = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../../uploads/prontuario");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_\-]/g, "_");
    cb(null, `ag${req.params.id}_${Date.now()}_${base}${ext}`);
  },
});

const uploadProntuario = multer({
  storage: storageProntuario,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// POST /api/agendamentos/:id/prontuario/anexos
router.post(
  "/:id/prontuario/anexos",
  uploadProntuario.single("arquivo"),
  async (req, res) => {
    try {
      if (!req.file)
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      const url = `/uploads/prontuario/${req.file.filename}`;
      res.json({
        id: `anexo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        url,
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size,
      });
    } catch (error) {
      console.error("Erro ao fazer upload de anexo do prontuário:", error);
      res.status(500).json({ error: "Erro ao salvar arquivo" });
    }
  },
);

module.exports = router;
