const { carregarIdentidade } = require("../services/identidadeEmpresaPDF");
const express = require("express");
const router = express.Router();
const orcamentoController = require("../controllers/orcamentoController");
const { Orcamento } = require("../models/Orcamento");

const { authUser } = require("../middleware/authUser");
router.use(authUser);
router.use((req, res, next) =>
  req.user?.empresaId
    ? next()
    : res.status(403).json({ erro: "Empresa não identificada" }),
);
// Geração é somente leitura: repetir o GET não cria outro orçamento.
router.get("/:id/comprovante", async (req, res) => {
  try {
    const orcamento = await Orcamento.findOne({
      where: { id: req.params.id, empresa_id: req.user.empresaId },
    });
    if (!orcamento)
      return res.status(404).json({ erro: "Orçamento não encontrado" });
    const identidade = await carregarIdentidade(req, {
      empresaId: orcamento.empresa_id,
    });
    const bytes = await require("../services/orcamentoPDF").gerarOrcamentoPDF(
      orcamento,
      identidade,
    );
    res.set("Cache-Control", "private, no-store");
    res.type("application/pdf");
    res.set(
      "Content-Disposition",
      `inline; filename="orcamento-${orcamento.id}.pdf"`,
    );
    res.send(bytes);
  } catch (error) {
    console.error("Erro ao gerar comprovante de orçamento:", error);
    // Nenhum cabeçalho PDF foi enviado antes de concluir a geração.
    res
      .status(error.status || 500)
      .json({
        erro: "Não foi possível gerar o PDF deste orçamento. Tente novamente.",
      });
  }
});

router.get("/", orcamentoController.listarOrcamentos);
router.get("/:id", orcamentoController.buscarOrcamento);
router.post("/", orcamentoController.criarOrcamento);
router.put("/:id", orcamentoController.atualizarOrcamento);
router.delete("/:id", orcamentoController.deletarOrcamento);

module.exports = router;
