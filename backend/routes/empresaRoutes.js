const express = require("express");
const router = express.Router();
const empresaController = require("../controllers/empresaController");
const { authUser } = require("../middleware/authUser");

// Rotas de empresas (protegidas - cada usuário vê apenas sua empresa)
router.get("/", authUser, empresaController.listarEmpresas);
// Debug route: retorna info do token e do registro de usuário (temporário)
router.get("/whoami", authUser, empresaController.whoami);

// Rotas para última chave Pix
router.get("/pix/ultima", authUser, empresaController.getUltimaChavePix);
router.post("/pix/ultima", authUser, empresaController.setUltimaChavePix);

// Imagem atual para PDFs gerados no navegador; sem cache para respeitar remoção/troca.
router.get('/logo-pdf', authUser, async (req, res) => {
  try {
    const identidade = await require('../services/identidadeEmpresaPDF').carregarIdentidade(req);
    if (!identidade.logoBuffer) return res.status(404).json({ erro: 'Logo indisponível.' });
    res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.send(identidade.logoBuffer);
  } catch (e) { res.status(e.status || 500).json({ erro: e.status ? e.message : 'Não foi possível carregar a logo.' }); }
});

// Rotas com parâmetro devem vir por último para não sobrescrever rotas estáticas
router.get("/:id", authUser, empresaController.buscarEmpresa);
router.post("/", authUser, empresaController.criarEmpresa);
router.put("/:id", authUser, empresaController.atualizarEmpresa);
router.delete("/:id", authUser, empresaController.deletarEmpresa);

module.exports = router;
