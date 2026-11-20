const { carregarIdentidade, desenharLogo } = require('../services/identidadeEmpresaPDF');
const express = require("express");
const router = express.Router();
const vendaController = require("../controllers/vendaController");
const { Venda, Empresa, Cliente } = require("../models");
const path = require("path");
const fs = require("fs");
const { authUser } = require("../middleware/authUser");

// Aplicar auth em todas as rotas de venda
router.use(authUser);
router.use('/preferencias/layout-caixa', require('../services/layoutCaixa').criarRouter({
  db: require('../models/Cliente').sequelize,
  autorizar: require('../middleware/exigePermissao').exigePermissao('atendimento.vendas'),
}));

// Comprovante PDF (cupom fiscal) - DEVE vir antes de /:id
router.get("/:id/comprovante", async (req, res) => {
  try {
    const { id } = req.params;
    const venda = await Venda.findOne({ where: { id, empresa_id: req.user.empresaId } });
    if (!venda) return res.status(404).json({ erro: 'Venda não encontrada' });
    const identidade = await carregarIdentidade(req, { empresaId: venda.empresa_id });
    let cliente = null;
    if (venda.clienteId) cliente = await Cliente.findOne({ where: { id: venda.clienteId, empresa_id: req.user.empresaId } }).catch(() => null);
    const bytes = await require('../services/comprovanteVendaPDF').gerarComprovanteVenda({ venda, empresa: identidade.empresa, logoBuffer: identidade.logoBuffer, cliente });
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename=comprovante-venda-${id}.pdf`, 'Cache-Control': 'no-store' });
    res.send(bytes);
  } catch (error) {
    console.error("Erro ao gerar comprovante de venda:", error);
    res.status(500).json({ erro: "Erro ao gerar comprovante de venda" });
  }
});

const validarCaixa = require('../services/validarVendaCaixa').criarValidador(require('../models'));
const permissaoCaixa = require('../middleware/exigePermissao').exigePermissao('atendimento.vendas');
function autorizarInterfaceCaixa(req, res, next) {
  if (req.body?.origemInterface === 'caixa-compartilhado') return permissaoCaixa(req, res, next);
  next();
}
router.get("/", vendaController.listarVendas);
router.get("/:id", vendaController.buscarVenda);
router.post("/", autorizarInterfaceCaixa, validarCaixa, vendaController.criarVenda);
router.put("/:id", autorizarInterfaceCaixa, validarCaixa, vendaController.atualizarVenda);
router.delete("/:id", vendaController.deletarVenda);

module.exports = router;
