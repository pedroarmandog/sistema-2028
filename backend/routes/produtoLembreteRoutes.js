/**
 * Routes: Produto Lembrete Recorrente
 * ------------------------------------
 * Endpoints para gerenciar lembretes automáticos de produtos recorrentes.
 * Montado em: /api/produto-lembrete
 */

const express = require("express");
const router = express.Router();
const { authUser } = require("../middleware/authUser");
const controller = require("../controllers/produtoLembreteController");

// ── Config por cliente (requer auth — chamado pelo form de cliente logado) ──
router.get("/config-cliente/:clienteId", authUser, controller.getConfigCliente);
router.post(
  "/config-cliente/:clienteId",
  authUser,
  controller.saveConfigCliente,
);

// ── Rotas públicas por empresaId (mesmo padrão do marketing) ──────────────
// ── Disparo manual via painel de marketing ──────────────────────────────────
// Processar todos os atrasados agora
router.post("/disparar-agora", controller.dispararManual);

// Disparar lembrete individual por ID
router.post("/:id/disparar", controller.dispararIndividual);

// Listar todos os lembretes da empresa
router.get("/", controller.listarLembretes);

// Estatísticas para o painel de marketing
router.get("/estatisticas", controller.estatisticas);

// Listar lembretes de um cliente específico
router.get("/cliente/:clienteId", controller.listarPorCliente);

// Criar ou atualizar lembrete (chamado por vendaController com req.user)
router.post("/", controller.criarOuAtualizar);

// Atualizar status (ativar/pausar)
router.patch("/:id", controller.atualizarStatus);

// Desativar/cancelar lembrete
router.delete("/:id", controller.desativar);

module.exports = router;
