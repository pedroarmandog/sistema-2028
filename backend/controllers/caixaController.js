const { Caixa } = require("../models/Caixa");
const { Op } = require("sequelize");

// Listar todos os caixas
exports.listarCaixas = async (req, res) => {
  try {
    const where = {};
    if (req.user?.empresaId) where.empresa_id = req.user.empresaId;
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
    const offset = parseInt(req.query.offset, 10) || 0;
    const caixas = await Caixa.findAll({
      attributes: [
        "id",
        "numero",
        "aberto",
        "dataAbertura",
        "usuario",
        "saldoInicial",
        "saldoFinal",
        "empresa_id",
      ],
      where,
      order: [["dataAbertura", "DESC"]],
      limit,
      offset,
    });
    res.json(caixas);
  } catch (error) {
    console.error("Erro ao listar caixas:", error);
    res.status(500).json({ erro: "Erro ao listar caixas" });
  }
};

// Buscar caixa por ID
exports.buscarCaixa = async (req, res) => {
  try {
    const caixa = await Caixa.findByPk(req.params.id);
    if (!caixa) {
      return res.status(404).json({ erro: "Caixa não encontrado" });
    }
    res.json(caixa);
  } catch (error) {
    console.error("Erro ao buscar caixa:", error);
    res.status(500).json({ erro: "Erro ao buscar caixa" });
  }
};

// Buscar status do caixa aberto
exports.buscarCaixaAberto = async (req, res) => {
  try {
    // Filtrar por empresa (multi-tenant) e opcionalmente por terminal (numero)
    const where = { aberto: true };
    if (req.user?.empresaId) where.empresa_id = req.user.empresaId;
    if (req.query && req.query.numero) where.numero = req.query.numero;

    const caixa = await Caixa.findOne({
      where,
      order: [["dataAbertura", "DESC"]],
    });
    res.json(caixa || { aberto: false });
  } catch (error) {
    console.error("Erro ao buscar caixa aberto:", error);
    res.status(500).json({ erro: "Erro ao buscar caixa aberto" });
  }
};

// Abrir caixa
exports.abrirCaixa = async (req, res) => {
  try {
    // Verificar se já existe caixa aberto para a mesma empresa/terminal
    const where = { aberto: true };
    if (req.user?.empresaId) where.empresa_id = req.user.empresaId;
    if (req.body && req.body.numero) where.numero = req.body.numero;

    const caixaAberto = await Caixa.findOne({ where });
    if (caixaAberto) {
      return res
        .status(400)
        .json({ erro: "Já existe um caixa aberto para este terminal/empresa" });
    }

    const caixa = await Caixa.create({
      numero: req.body.numero,
      usuarioId: req.body.usuarioId || null,
      usuario: req.body.usuario || null,
      saldoInicial: req.body.saldoInicial || 0,
      aberto: true,
      dataAbertura: new Date(),
      empresa_id: req.user?.empresaId || null,
    });
    res.status(201).json(caixa);
  } catch (error) {
    console.error("Erro ao abrir caixa:", error);
    res.status(500).json({ erro: "Erro ao abrir caixa" });
  }
};

// Fechar caixa
exports.fecharCaixa = async (req, res) => {
  try {
    const caixa = await Caixa.findByPk(req.params.id);
    if (!caixa) {
      return res.status(404).json({ erro: "Caixa não encontrado" });
    }
    await caixa.update({
      aberto: false,
      dataFechamento: new Date(),
      saldoFinal: req.body.saldoFinal,
    });
    res.json(caixa);
  } catch (error) {
    console.error("Erro ao fechar caixa:", error);
    res.status(500).json({ erro: "Erro ao fechar caixa" });
  }
};

// Buscar caixa por número
exports.buscarCaixaPorNumero = async (req, res) => {
  try {
    const numero = req.params.numero; // Recebe como string (ex: "Caixa 01" ou "01")

    // Buscar com o valor exato ou formatado
    const baseWhere = { numero };
    if (req.user?.empresaId) baseWhere.empresa_id = req.user.empresaId;

    let caixa = await Caixa.findOne({
      where: baseWhere,
      order: [["dataAbertura", "DESC"]],
    });

    // Se não encontrou, tentar com "Caixa XX"
    if (!caixa && !numero.includes("Caixa")) {
      const where2 = { numero: `Caixa ${numero}` };
      if (req.user?.empresaId) where2.empresa_id = req.user.empresaId;
      caixa = await Caixa.findOne({
        where: where2,
        order: [["dataAbertura", "DESC"]],
      });
    }

    if (!caixa) {
      return res.status(404).json({ erro: "Caixa não encontrado" });
    }

    res.json({ caixa });
  } catch (error) {
    console.error("Erro ao buscar caixa por número:", error);
    res.status(500).json({ erro: "Erro ao buscar caixa por número" });
  }
};
