const { Pet, Cliente } = require("../models");

// Criar novo pet
exports.createPet = async (req, res) => {
  try {
    console.log("📝 Criando novo pet:", req.body);

    const {
      nome,
      cliente_id,
      raca,
      genero,
      porte,
      pelagem,
      data_nascimento,
      chip,
      pedigree_rg,
      alimentacao,
      tags,
      alergias,
      observacao,
    } = req.body;

    // Normalizar/parsear data de nascimento enviada no formato DD/MM/YYYY -> YYYY-MM-DD
    let dataNascimentoNormalized = data_nascimento;
    if (
      data_nascimento &&
      typeof data_nascimento === "string" &&
      data_nascimento.includes("/")
    ) {
      const parts = data_nascimento.split("/").map((p) => p.trim());
      if (parts.length === 3) {
        const [d, m, y] = parts;
        // criar no formato YYYY-MM-DD
        dataNascimentoNormalized = `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }
    }

    // Validações básicas
    if (!nome || !cliente_id) {
      return res.status(400).json({
        success: false,
        message: "Nome e cliente são obrigatórios",
      });
    }

    // Verificar se o cliente existe
    const cliente = await Cliente.findByPk(cliente_id);
    if (!cliente) {
      return res.status(400).json({
        success: false,
        message: "Cliente não encontrado",
      });
    }
    // Verificar vínculo de empresa (a menos que usuário seja master)
    const grupoUser =
      req.user && req.user.grupoUsuario
        ? String(req.user.grupoUsuario).toLowerCase()
        : "";
    const isMasterUser =
      grupoUser.includes("admin") ||
      grupoUser.includes("acesso total") ||
      grupoUser.includes("master");
    if (
      !isMasterUser &&
      req.user?.empresaId &&
      Number(cliente.empresa_id) !== Number(req.user.empresaId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Cliente não pertence à sua empresa",
      });
    }

    // Verificar se o chip já existe (se fornecido)
    if (chip && chip.trim() !== "") {
      const whereChip = { chip: chip.trim() };
      if (req.user?.empresaId) whereChip.empresa_id = req.user.empresaId;
      const petExistente = await Pet.findOne({ where: whereChip });
      if (petExistente) {
        return res.status(400).json({
          success: false,
          message: "Já existe um pet com este número de chip",
        });
      }
    }

    // Criar pet
    const novoPet = await Pet.create({
      nome: nome.trim(),
      cliente_id: parseInt(cliente_id),
      raca: raca?.trim() || null,
      genero: genero || null,
      porte: porte || null,
      pelagem: pelagem?.trim() || null,
      data_nascimento: dataNascimentoNormalized || null,
      chip: chip?.trim() || null,
      pedigree_rg: pedigree_rg?.trim() || null,
      alimentacao: alimentacao?.trim() || null,
      tags: tags?.trim() || null,
      alergias: alergias?.trim() || null,
      observacao: observacao?.trim() || null,
      ativo: true,
      empresa_id: req.user?.empresaId || null,
    });

    // Recarregar o pet para garantir que associações e campos estejam disponíveis
    await novoPet.reload();
    console.log("✅ Pet criado com sucesso:", novoPet.id);

    res.status(201).json({
      success: true,
      pet: novoPet,
      message: "Pet cadastrado com sucesso",
    });

    // ── Trigger: Mensagem de Boas-Vindas (apenas no primeiro pet do cliente) ──
    setImmediate(async () => {
      try {
        // Verificar se é o primeiro pet do cliente
        const totalPets = await Pet.count({
          where: { cliente_id: parseInt(cliente_id) },
        });
        if (totalPets > 1) return; // Já tinha pet antes, não disparar novamente

        const { dispararMensagemAutomatica } = require("./marketingController");
        await dispararMensagemAutomatica(
          "boas_vindas",
          { nomeTutor: cliente.nome, nomePet: nome.trim() },
          cliente.telefone || "",
          null,
          { clienteId: parseInt(cliente_id), petId: novoPet.id },
          cliente.empresa_id,
        );
      } catch (e) {
        console.warn(
          "[Marketing] Não foi possível disparar boas_vindas:",
          e.message,
        );
      }
    });
  } catch (error) {
    console.error("❌ Erro ao criar pet:", error.stack || error);

    // Erro de validação do Sequelize
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: error.errors[0].message,
      });
    }

    // Erro de constraint única (chip duplicado)
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Já existe um pet com este número de chip",
      });
    }

    // Erro de FK (cliente_id inválido)
    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Cliente inválido ou não encontrado no banco de dados",
      });
    }

    // Retornar mensagem de erro para facilitar debug em ambiente de desenvolvimento
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor ao criar pet",
      error: error.message,
    });
  }
};

exports.getAllPets = async (req, res) => {
  try {
    console.log("📋 Buscando todos os pets...");

    const { cliente_id, search } = req.query;

    const whereClause = {};

    // Filtrar por cliente se fornecido
    if (cliente_id) {
      whereClause.cliente_id = cliente_id;
    }

    // Busca por texto se fornecido
    if (search) {
      const { Op } = require("sequelize");
      whereClause[Op.or] = [
        { nome: { [Op.like]: `%${search}%` } },
        { raca: { [Op.like]: `%${search}%` } },
        { pelagem: { [Op.like]: `%${search}%` } },
      ];
    }

    // Filtro obrigatório por empresa
    if (req.user?.empresaId) {
      whereClause.empresa_id = req.user.empresaId;
    }

    const pets = await Pet.findAll({
      where: whereClause,
      include: [
        {
          model: Cliente,
          as: "cliente",
          attributes: ["id", "nome", "email", "telefone"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    console.log(`✅ ${pets.length} pets encontrados`);

    res.json({
      success: true,
      pets: pets,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar pets:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar pets",
    });
  }
};

// Buscar pet por ID
exports.getPetById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🔍 Buscando pet por ID:", id);

    const pet = await Pet.findByPk(id, {
      include: [
        {
          model: Cliente,
          as: "cliente",
          attributes: ["id", "nome", "email", "telefone"],
        },
      ],
    });

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "Pet não encontrado",
      });
    }

    console.log("✅ Pet encontrado:", pet.nome);

    // Verificar empresa do pet (a menos que usuário master)
    const grupoPetQuery =
      req.user && req.user.grupoUsuario
        ? String(req.user.grupoUsuario).toLowerCase()
        : "";
    const isMasterPetQuery =
      grupoPetQuery.includes("admin") ||
      grupoPetQuery.includes("acesso total") ||
      grupoPetQuery.includes("master");
    if (
      !isMasterPetQuery &&
      req.user?.empresaId &&
      Number(pet.empresa_id) !== Number(req.user.empresaId)
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Acesso negado ao pet solicitado" });
    }

    res.json({
      success: true,
      pet: pet,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar pet:", error);
    // Expor mensagem de erro temporariamente para facilitar debug local
    res.status(500).json({
      success: false,
      message: "Erro ao buscar pet",
      error: error.message,
    });
  }
};

// Atualizar pet
exports.updatePet = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("📝 Atualizando pet:", id, req.body);

    const pet = await Pet.findByPk(id);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "Pet não encontrado",
      });
    }
    // Verificar vínculo de empresa do pet (a menos que usuário seja master)
    const grupoAtual =
      req.user && req.user.grupoUsuario
        ? String(req.user.grupoUsuario).toLowerCase()
        : "";
    const isMasterAtual =
      grupoAtual.includes("admin") ||
      grupoAtual.includes("acesso total") ||
      grupoAtual.includes("master");
    if (
      !isMasterAtual &&
      req.user?.empresaId &&
      Number(pet.empresa_id) !== Number(req.user.empresaId)
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Pet não pertence à sua empresa" });
    }

    const {
      nome,
      cliente_id,
      raca,
      genero,
      porte,
      pelagem,
      data_nascimento,
      chip,
      pedigree_rg,
      alimentacao,
      tags,
      alergias,
      observacao,
      ativo,
    } = req.body;

    // Normalizar data de nascimento enviada no formato DD/MM/YYYY -> YYYY-MM-DD
    let dataNascimentoNormalized = data_nascimento;
    if (
      data_nascimento &&
      typeof data_nascimento === "string" &&
      data_nascimento.includes("/")
    ) {
      const parts = data_nascimento.split("/").map((p) => p.trim());
      if (parts.length === 3) {
        const [d, m, y] = parts;
        dataNascimentoNormalized = `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }
    }

    // Validações básicas
    if (!nome || !cliente_id) {
      return res.status(400).json({
        success: false,
        message: "Nome e cliente são obrigatórios",
      });
    }

    // Verificar se o cliente existe
    const cliente = await Cliente.findByPk(cliente_id);
    if (!cliente) {
      return res.status(400).json({
        success: false,
        message: "Cliente não encontrado",
      });
    }
    // Verificar vínculo de empresa do cliente (a menos que usuário seja master)
    const grupoCliente =
      req.user && req.user.grupoUsuario
        ? String(req.user.grupoUsuario).toLowerCase()
        : "";
    const isMasterCliente =
      grupoCliente.includes("admin") ||
      grupoCliente.includes("acesso total") ||
      grupoCliente.includes("master");
    if (
      !isMasterCliente &&
      req.user?.empresaId &&
      Number(cliente.empresa_id) !== Number(req.user.empresaId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Cliente não pertence à sua empresa",
      });
    }

    // Verificar se o chip já existe em outro pet (se fornecido)
    if (chip && chip.trim() !== "") {
      const whereChip = {
        chip: chip.trim(),
        id: { [require("sequelize").Op.ne]: id },
      };
      if (req.user?.empresaId) whereChip.empresa_id = req.user.empresaId;
      const petExistente = await Pet.findOne({ where: whereChip });
      if (petExistente) {
        return res.status(400).json({
          success: false,
          message: "Já existe outro pet com este número de chip",
        });
      }
    }

    // Atualizar pet
    await pet.update({
      nome: nome.trim(),
      cliente_id: parseInt(cliente_id),
      raca: raca?.trim() || null,
      genero: genero || null,
      porte: porte || null,
      pelagem: pelagem?.trim() || null,
      data_nascimento: dataNascimentoNormalized || null,
      chip: chip?.trim() || null,
      pedigree_rg: pedigree_rg?.trim() || null,
      alimentacao: alimentacao?.trim() || null,
      tags: tags?.trim() || null,
      alergias: alergias?.trim() || null,
      observacao: observacao?.trim() || null,
      ativo: ativo !== undefined ? ativo : pet.ativo,
    });

    // Recarregar do banco para garantir que temos os dados mais recentes
    await pet.reload();

    console.log("✅ Pet atualizado com sucesso");

    res.json({
      success: true,
      pet: pet,
      message: "Pet atualizado com sucesso",
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar pet:", error.stack || error);

    // Erro de validação do Sequelize
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: error.errors[0].message,
      });
    }

    // Erro de constraint única (chip duplicado)
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Já existe outro pet com este número de chip",
      });
    }

    // Expor mensagem de erro temporariamente para debug local
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor ao atualizar pet",
      error: error.message,
    });
  }
};

// Excluir pet
exports.deletePet = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🗑️ Excluindo pet:", id);

    const pet = await Pet.findByPk(id);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "Pet não encontrado",
      });
    }

    // Verificar vínculo de empresa antes de excluir (a menos que usuário seja master)
    const grupoDel =
      req.user && req.user.grupoUsuario
        ? String(req.user.grupoUsuario).toLowerCase()
        : "";
    const isMasterDel =
      grupoDel.includes("admin") ||
      grupoDel.includes("acesso total") ||
      grupoDel.includes("master");
    if (
      !isMasterDel &&
      req.user?.empresaId &&
      Number(pet.empresa_id) !== Number(req.user.empresaId)
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Pet não pertence à sua empresa" });
    }

    await pet.destroy();

    console.log("✅ Pet excluído com sucesso");

    res.json({
      success: true,
      message: "Pet excluído com sucesso",
    });
  } catch (error) {
    console.error("❌ Erro ao excluir pet:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao excluir pet",
    });
  }
};
