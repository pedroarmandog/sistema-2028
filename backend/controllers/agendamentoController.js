const { Agendamento } = require("../models/Agendamento");
const Pet = require("../models/Pet");
const { Cliente } = require("../models/Cliente");

exports.createAgendamento = async (req, res) => {
  try {
    const { data, servico, petId } = req.body;
    // Verificar pet e vínculo de empresa (a menos que usuário seja master)
    const grupoUser =
      req.user && req.user.grupoUsuario
        ? String(req.user.grupoUsuario).toLowerCase()
        : "";
    const isMasterUser =
      grupoUser.includes("admin") ||
      grupoUser.includes("acesso total") ||
      grupoUser.includes("master");

    let pet = null;
    if (petId) {
      pet = await Pet.findByPk(petId, { include: [{ model: Cliente }] });
      if (!pet) return res.status(400).json({ error: "Pet não encontrado" });

      if (
        !isMasterUser &&
        req.user?.empresaId &&
        Number(pet.empresa_id) !== Number(req.user.empresaId)
      ) {
        return res
          .status(403)
          .json({ error: "Pet não pertence à sua empresa" });
      }
    }

    const agendamento = await Agendamento.create({
      data,
      servico,
      PetId: petId,
      empresa_id: req.user?.empresaId || null,
    });
    res.json(agendamento);

    // ── Trigger: Lembrete de Agendamento ────────────────────────────
    // Disparado de forma assíncrona (não bloqueia a resposta)
    setImmediate(async () => {
      try {
        const { dispararMensagemAutomatica } = require("./marketingController");
        // Tentar obter dados do pet/cliente para as variáveis
        let nomeTutor = "";
        let nomePet = "";
        let telefone = "";
        let dataAgendamento = "";
        let horaAgendamento = "";

        if (petId) {
          const pet = await Pet.findByPk(petId, {
            include: [{ model: Cliente }],
          });
          if (pet) {
            nomePet = pet.nome || "";
            if (pet.Cliente) {
              nomeTutor = pet.Cliente.nome || "";
              telefone = pet.Cliente.telefone || "";
            }
          }
        }

        if (data) {
          const dt = new Date(data);
          dataAgendamento = dt.toLocaleDateString("pt-BR");
          horaAgendamento = dt.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          });
        }

        await dispararMensagemAutomatica(
          "lembrete_agendamento",
          {
            nomeTutor,
            nomePet,
            dataAgendamento,
            horaAgendamento,
            servico: servico || "",
          },
          telefone,
          data ? new Date(data) : null,
          { agendamentoId: agendamento.id, petId },
          pet?.Cliente?.empresa_id,
        );
      } catch (e) {
        console.warn(
          "[Marketing] Não foi possível disparar lembrete_agendamento:",
          e.message,
        );
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar agendamento" });
  }
};

exports.getAgendamentos = async (req, res) => {
  try {
    const { data } = req.query;
    let whereCondition = {};

    // Se uma data específica for fornecida, filtrar por ela
    if (data) {
      const dataInicio = new Date(data);
      const dataFim = new Date(data);
      dataFim.setDate(dataFim.getDate() + 1);

      whereCondition.dataAgendamento = {
        [require("sequelize").Op.gte]: dataInicio,
        [require("sequelize").Op.lt]: dataFim,
      };
    }

    // Filtro obrigatório por empresa (quando disponível no token)
    if (req.user?.empresaId) {
      whereCondition.empresa_id = req.user.empresaId;
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
    const offset = parseInt(req.query.offset, 10) || 0;
    const agendamentos = await Agendamento.findAll({
      attributes: [
        "id",
        "horario",
        "servico",
        "profissional",
        "valor",
        "status",
        "observacoes",
        "dataAgendamento",
        "petId",
      ],
      where: whereCondition,
      include: [
        {
          model: Pet,
          attributes: [
            "id",
            "nome",
            "tipo",
            "raca",
            "observacao",
            "cliente_id",
          ],
          include: [
            {
              model: Cliente,
              attributes: ["id", "nome", "email", "telefone"],
            },
          ],
        },
      ],
      order: [
        ["dataAgendamento", "ASC"],
        ["horario", "ASC"],
      ],
      limit,
      offset,
    });

    // Transformar os dados para o formato esperado pelo frontend
    const agendamentosFormatados = agendamentos.map((agendamento) => ({
      id: agendamento.id,
      horario: agendamento.horario,
      petNome: agendamento.Pet?.nome || "N/A",
      clienteNome: agendamento.Pet?.Cliente?.nome || "N/A",
      servico: agendamento.servico,
      profissional: agendamento.profissional,
      valor: agendamento.valor,
      status: agendamento.status,
      observacoes: agendamento.observacoes,
      petObservacao: agendamento.Pet?.observacao || null,
      dataAgendamento: agendamento.dataAgendamento,
    }));

    res.json(agendamentosFormatados);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar agendamentos" });
  }
};
