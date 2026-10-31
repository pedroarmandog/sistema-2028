const { Cliente, Pet, Venda } = require("../models");
// Usando importação centralizada do models/index.js com as associações configuradas

exports.createCliente = async (req, res) => {
  try {
    const {
      nome,
      cpf,
      rg,
      data_nascimento,
      sexo,
      telefone,
      email,
      cep,
      endereco,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      limite_credito,
      grupo_cliente,
      perfil_desconto,
      como_nos_conheceu,
      observacoes,
      proximidade,
      ativo,
      telefones_adicionais,
      emails_adicionais,
      lembrete_automatico_ativo,
      lembrete_automatico_dias,
      // Campos fiscais (2026-08-01)
      tipo_pessoa,
      cnpj,
      inscricao_estadual,
      indicador_ie,
      codigo_ibge_municipio,
      pais,
      codigo_pais,
    } = req.body;

    const imagem_perfil = req.file ? req.file.filename : null;

    // Converter tipo_pessoa: "fisica" → "F", "juridica" → "J"
    let tipoPessoaConvertido = null;
    if (tipo_pessoa) {
      const tp = String(tipo_pessoa).toLowerCase();
      if (tp === "fisica" || tp === "f") tipoPessoaConvertido = "F";
      else if (tp === "juridica" || tp === "j") tipoPessoaConvertido = "J";
    }

    // Processar telefones e emails adicionais
    let telefonesAdicionaisArray = null;
    let emailsAdicionaisArray = null;

    if (telefones_adicionais) {
      try {
        telefonesAdicionaisArray =
          typeof telefones_adicionais === "string"
            ? JSON.parse(telefones_adicionais)
            : telefones_adicionais;
      } catch (e) {
        console.log("Erro ao processar telefones_adicionais:", e);
      }
    }

    if (emails_adicionais) {
      try {
        emailsAdicionaisArray =
          typeof emails_adicionais === "string"
            ? JSON.parse(emails_adicionais)
            : emails_adicionais;
      } catch (e) {
        console.log("Erro ao processar emails_adicionais:", e);
      }
    }

    // Calcular idade se data_nascimento foi fornecida
    let idade = null;
    if (data_nascimento) {
      const hoje = new Date();
      const nascimento = new Date(data_nascimento);
      idade = hoje.getFullYear() - nascimento.getFullYear();
      const mes = hoje.getMonth() - nascimento.getMonth();
      if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--;
      }
    }

    const cliente = await Cliente.create({
      nome,
      cpf: cpf || null,
      rg: rg || null,
      data_nascimento,
      idade,
      sexo: sexo || null,
      telefone: telefone || null,
      email: email || null,
      telefones_adicionais: telefonesAdicionaisArray,
      emails_adicionais: emailsAdicionaisArray,
      cep,
      endereco,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      limite_credito,
      grupo_cliente,
      perfil_desconto,
      como_nos_conheceu,
      observacoes,
      proximidade,
      ativo,
      imagem_perfil,
      empresa_id: req.user?.empresaId || null,
      lembrete_automatico_ativo:
        lembrete_automatico_ativo === "true" ||
        lembrete_automatico_ativo === true,
      lembrete_automatico_dias: lembrete_automatico_dias
        ? parseInt(lembrete_automatico_dias, 10) || 30
        : 30,
      // Campos fiscais
      tipo_pessoa: tipoPessoaConvertido,
      cnpj: cnpj || null,
      inscricao_estadual: inscricao_estadual || null,
      indicador_ie: indicador_ie !== undefined && indicador_ie !== ""
        ? parseInt(indicador_ie, 10)
        : 9,
      codigo_ibge_municipio: codigo_ibge_municipio || null,
      pais: pais || "Brasil",
      codigo_pais: codigo_pais || "1058",
    });

    res.status(201).json({
      success: true,
      message: "Cliente criado com sucesso",
      cliente: cliente,
    });

    // Push Notification: Novo cliente cadastrado
    const { notificarEmpresa } = require("../services/pushNotificationService");
    if (cliente.empresa_id) {
      setImmediate(async () => {
        try {
          await notificarEmpresa(cliente.empresa_id, "novo_cliente", {
            nome: cliente.nome,
          });
        } catch (err) {
          console.error("[Push] Erro ao notificar novo cliente:", err);
        }
      });
    }

    // Nota: boas_vindas é disparado no cadastro do primeiro pet (petController)
  } catch (err) {
    console.error("Erro ao criar cliente:", err);

    // Tratar erros de duplicidade (CPF/email já cadastrados)
    if (err.name === "SequelizeUniqueConstraintError") {
      const campos = (err.errors || []).map((e) => e.path);
      let mensagem = "Já existe um cliente com esses dados.";
      if (campos.includes("cpf")) {
        mensagem = "Já existe um cliente com este CPF.";
      } else if (campos.includes("email")) {
        mensagem = "Já existe um cliente com este e-mail.";
      }
      return res.status(409).json({
        success: false,
        error: mensagem,
        details: err.message,
      });
    }

    res.status(500).json({
      success: false,
      error: "Erro ao criar o cliente",
      details: err.message,
    });
  }
};

exports.getAllClientes = async (req, res) => {
  try {
    const { search } = req.query;
    let whereClause = {};

    if (search) {
      const { Op } = require("sequelize");
      whereClause = {
        [Op.or]: [
          { nome: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { telefone: { [Op.like]: `%${search}%` } },
          { cpf: { [Op.like]: `%${search}%` } },
        ],
      };
    }

    // Filtro obrigatório por empresa
    if (req.user?.empresaId) {
      whereClause.empresa_id = req.user.empresaId;
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
    const offset = parseInt(req.query.offset, 10) || 0;
    const clientes = await Cliente.findAll({
      where: whereClause,
      attributes: [
        "id",
        "nome",
        "email",
        "telefone",
        "cpf",
        "cidade",
        "ativo",
        "createdAt",
        "grupo_cliente",
        "imagem_perfil",
        "data_nascimento",
      ],
      order: [["createdAt", "DESC"]], // Ordenar por data de criação (mais recente primeiro)
      limit,
      offset,
    });

    res.json({ success: true, clientes: clientes });
  } catch (err) {
    console.error("Erro ao buscar clientes:", err);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar os clientes",
    });
  }
};

exports.getClienteById = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar cliente incluindo pets relacionados e vendas (histórico)
    const cliente = await Cliente.findByPk(id, {
      include: [
        {
          model: Pet,
          as: "pets",
          // Incluir tags para que a UI de client-details possa renderizá-las
          attributes: [
            "id",
            "nome",
            "raca",
            "genero",
            "data_nascimento",
            "porte",
            "pelagem",
            "chip",
            "pedigree_rg",
            "alergias",
            "observacao",
            "tags",
            "ativo",
          ],
        },
        {
          model: Venda,
          as: "vendas",
          attributes: [
            "id",
            "data",
            "totais",
            "totalPago",
            "status",
            "createdAt",
          ],
          required: false,
        },
      ],
      order: [[{ model: Venda, as: "vendas" }, "data", "DESC"]],
    });

    if (!cliente) {
      return res.status(404).json({
        success: false,
        error: "Cliente não encontrado",
      });
    }

    // Enriquecer retorno com propriedade 'historico' esperada pelo frontend
    let clienteObj = cliente.get ? cliente.get({ plain: true }) : cliente;
    clienteObj.historico = (clienteObj.vendas || []).map((v) => ({
      id: v.id,
      data_hora: v.data,
      tipo: "Venda",
      total:
        v.totais && v.totais.final
          ? v.totais.final
          : (v.totais && v.totais.total) || null,
      pago: v.totalPago || null,
      status: v.status,
    }));

    res.json({
      success: true,
      cliente: clienteObj,
    });
  } catch (err) {
    console.error("Erro ao buscar cliente:", err);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar o cliente",
    });
  }
};

exports.updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Converter tipo_pessoa: "fisica" → "F", "juridica" → "J"
    if ("tipo_pessoa" in updates && updates.tipo_pessoa) {
      const tp = String(updates.tipo_pessoa).toLowerCase();
      if (tp === "fisica" || tp === "f") updates.tipo_pessoa = "F";
      else if (tp === "juridica" || tp === "j") updates.tipo_pessoa = "J";
    }

    // Converter campos vazios para null (campos opcionais)
    const camposOpcionais = [
      "cpf", "rg", "sexo", "telefone", "email",
      "cep", "endereco", "numero", "complemento", "bairro",
      "cidade", "estado", "cnpj", "inscricao_estadual",
      "codigo_ibge_municipio", "grupo_cliente", "perfil_desconto",
      "como_nos_conheceu", "observacoes", "proximidade",
    ];
    for (const campo of camposOpcionais) {
      if (campo in updates && (updates[campo] === "" || updates[campo] === null)) {
        updates[campo] = null;
      }
    }

    // Processar telefones e emails adicionais
    if (updates.telefones_adicionais) {
      try {
        updates.telefones_adicionais =
          typeof updates.telefones_adicionais === "string"
            ? JSON.parse(updates.telefones_adicionais)
            : updates.telefones_adicionais;
      } catch (e) {
        console.log(
          "Erro ao processar telefones_adicionais na atualização:",
          e,
        );
      }
    }

    if (updates.emails_adicionais) {
      try {
        updates.emails_adicionais =
          typeof updates.emails_adicionais === "string"
            ? JSON.parse(updates.emails_adicionais)
            : updates.emails_adicionais;
      } catch (e) {
        console.log("Erro ao processar emails_adicionais na atualização:", e);
      }
    }

    // Converter campos booleanos/numéricos enviados via FormData como string
    if ("lembrete_automatico_ativo" in updates) {
      updates.lembrete_automatico_ativo =
        updates.lembrete_automatico_ativo === "true" ||
        updates.lembrete_automatico_ativo === true;
    }
    if ("lembrete_automatico_dias" in updates) {
      updates.lembrete_automatico_dias =
        parseInt(updates.lembrete_automatico_dias, 10) || 30;
    }

    // Recalcular idade se data_nascimento foi atualizada
    if (updates.data_nascimento) {
      const hoje = new Date();
      const nascimento = new Date(updates.data_nascimento);
      updates.idade = hoje.getFullYear() - nascimento.getFullYear();
      const mes = hoje.getMonth() - nascimento.getMonth();
      if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
        updates.idade--;
      }
    }

    const [updatedRows] = await Cliente.update(updates, {
      where: {
        id: id,
        ...(req.user?.empresaId ? { empresa_id: req.user.empresaId } : {}),
      },
    });

    if (updatedRows === 0) {
      return res.status(404).json({
        success: false,
        error: "Cliente não encontrado",
      });
    }

    const clienteAtualizado = await Cliente.findByPk(id);

    res.json({
      success: true,
      message: "Cliente atualizado com sucesso",
      cliente: clienteAtualizado,
    });
  } catch (err) {
    console.error("Erro ao atualizar cliente:", err);
    res.status(500).json({
      success: false,
      error: "Erro ao atualizar o cliente",
      details: err.message,
    });
  }
};

exports.deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o cliente existe e pertence à empresa
    const cliente = await Cliente.findOne({
      where: {
        id,
        ...(req.user?.empresaId ? { empresa_id: req.user.empresaId } : {}),
      },
    });
    if (!cliente) {
      return res.status(404).json({
        success: false,
        error: "Cliente não encontrado",
      });
    }

    // Deletar o cliente
    await cliente.destroy();

    res.json({
      success: true,
      message: "Cliente excluído com sucesso",
    });
  } catch (err) {
    console.error("Erro ao excluir cliente:", err);
    res.status(500).json({
      success: false,
      error: "Erro ao excluir o cliente",
    });
  }
};
