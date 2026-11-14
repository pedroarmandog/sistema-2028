const { Profissional } = require("../models/Profissional");
const { Op } = require("sequelize");

// Listar todos os profissionais
exports.listarProfissionais = async (req, res) => {
  try {
    const empresaId = req.user?.empresaId;
    const where = empresaId ? { empresa_id: empresaId } : {};
    const profissionais = await Profissional.findAll({
      where,
      order: [["nome", "ASC"]],
    });
    res.json(profissionais);
  } catch (error) {
    console.error("Erro ao listar profissionais:", error);
    res.status(500).json({ erro: "Erro ao listar profissionais" });
  }
};

// Buscar profissional por ID
exports.buscarProfissional = async (req, res) => {
  try {
    const profissional = await Profissional.findOne({where:{id:req.params.id,empresa_id:req.user.empresaId}});
    if (!profissional) {
      return res.status(404).json({ erro: "Profissional não encontrado" });
    }
    res.json(profissional);
  } catch (error) {
    console.error("Erro ao buscar profissional:", error);
    res.status(500).json({ erro: "Erro ao buscar profissional" });
  }
};

// Criar profissional
exports.criarProfissional = async (req, res) => {
  try {
    const dados = { ...req.body };
    if (req.user?.empresaId) dados.empresa_id = req.user.empresaId;

    // Gerar codigo único se não fornecido
    if (!dados.codigo) {
      let codigo;
      let tentativas = 0;
      do {
        codigo = String(Math.floor(100 + Math.random() * 900));
        const existe = await Profissional.findOne({ where: { codigo } });
        if (!existe) break;
        tentativas++;
      } while (tentativas < 20);
      dados.codigo = codigo;
    }

    if(dados.assinatura!==undefined)dados.assinatura=await require("../services/midias").instancia().referencia(req.user.empresaId,dados.assinatura,"assinaturas");
    const profissional = await Profissional.create(dados);
    res.status(201).json(profissional);
  } catch (error) {
    console.error("Erro ao criar profissional:", error);
    res.status(error.status||500).json({ erro: error.publica?error.message:"Erro ao criar profissional" });
  }
};

// Atualizar profissional
exports.atualizarProfissional = async (req, res) => {
  try {
    const profissional = await Profissional.findOne({where:{id:req.params.id,empresa_id:req.user.empresaId}});
    if (!profissional) {
      return res.status(404).json({ erro: "Profissional não encontrado" });
    }
    const dados={...req.body};delete dados.id;delete dados.empresa_id;
    if(dados.assinatura!==undefined)dados.assinatura=await require("../services/midias").instancia().referencia(req.user.empresaId,dados.assinatura,"assinaturas",{anterior:profissional.assinatura});
    await profissional.update(dados);
    res.json(profissional);
  } catch (error) {
    console.error("Erro ao atualizar profissional:", error);
    res.status(error.status||500).json({ erro: error.publica?error.message:"Erro ao atualizar profissional" });
  }
};

// Deletar profissional
exports.deletarProfissional = async (req, res) => {
  try {
    const profissional = await Profissional.findOne({where:{id:req.params.id,empresa_id:req.user.empresaId}});
    if (!profissional) {
      return res.status(404).json({ erro: "Profissional não encontrado" });
    }
    await profissional.destroy();
    res.json({ mensagem: "Profissional deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar profissional:", error);
    res.status(500).json({ erro: "Erro ao deletar profissional" });
  }
};

// Upload de assinatura
exports.uploadAssinatura = async (req, res) => {
  try {
    const profissional = await Profissional.findOne({where:{id:req.params.id,empresa_id:req.user.empresaId}});
    if (!profissional) {
      return res.status(404).json({ erro: "Profissional não encontrado" });
    }
    if (!req.file) {
      return res.status(400).json({ erro: "Nenhum arquivo enviado" });
    }
    const url = req.file.url;
    await profissional.update({ assinatura: url });
    res.json({ assinatura: url });
  } catch (error) {
    console.error("Erro ao salvar assinatura:", error);
    res.status(500).json({ erro: "Erro ao salvar assinatura" });
  }
};
