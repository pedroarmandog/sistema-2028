"use strict";

const express = require("express");
const router = express.Router();
const { authUser } = require("../middleware/authUser");
const {
  listar,
  buscarPorId,
  buscarPorVenda,
  criar,
  atualizar,
  resumo,
  registrarPendente,
  emitirPorVenda,
  emitirNotaPorId,
  emitirLote,
  danfePdf,
} = require("../controllers/notaFiscalController");

/**
 * Rotas: /api/notas-fiscais
 *
 * Central Fiscal — gerencia registro de todas as notas fiscais.
 * Todas as rotas exigem autenticação (authUser).
 *
 * GET  /api/notas-fiscais           → lista com filtros (tipo, status, data, busca)
 * GET  /api/notas-fiscais/resumo    → contagem por status para dashboard
 * GET  /api/notas-fiscais/:id       → detalhe com XML
 * GET  /api/notas-fiscais/por-venda/:vendaId → notas de uma venda
 * POST /api/notas-fiscais           → cria rascunho
 * PUT  /api/notas-fiscais/:id       → atualiza (apenas rascunhos ou status)
 */

router.use(authUser);

const central = require("../middleware/exigePermissao").exigePermissao("configuracoes.central-fiscal");
router.get("/resumo", central, resumo);
router.get("/por-venda/:vendaId", buscarPorVenda);
router.get("/", central, listar);
router.get("/:id", central, buscarPorId);

// Ações de emissão / impressão (integração com o ciclo de venda + Central Fiscal)
router.post("/emitir", emitirPorVenda);
router.post("/lote-emitir", central, emitirLote);
router.post("/pendente", registrarPendente);
router.post("/:id/emitir", central, emitirNotaPorId);
router.get("/:id/danfe", danfePdf);
router.get("/:id/xml", central, async (req,res) => {
  try {
    const xml = await require("../services/notaFiscalService").obterXml({notaId:req.params.id, empresaId:req.user.empresaId});
    res.attachment("nota-" + Number(req.params.id) + ".xml").type("application/xml").send(xml);
  } catch (err) { res.status(err.status || 502).json({erro:err.message}); }
});

router.post("/", central, criar);
router.put("/:id", central, atualizar);

module.exports = router;
