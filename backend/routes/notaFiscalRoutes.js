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

router.get("/resumo", resumo);
router.get("/por-venda/:vendaId", buscarPorVenda);
router.get("/", listar);
router.get("/:id", buscarPorId);

// Ações de emissão / impressão (integração com o ciclo de venda + Central Fiscal)
router.post("/emitir", emitirPorVenda);
router.post("/lote-emitir", emitirLote);
router.post("/pendente", registrarPendente);
router.post("/:id/emitir", emitirNotaPorId);
router.get("/:id/danfe", danfePdf);

router.post("/", criar);
router.put("/:id", atualizar);

module.exports = router;
