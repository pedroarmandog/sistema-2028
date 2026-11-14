"use strict";

const express = require("express");
const router = express.Router();
const { authUser } = require("../middleware/authUser");
const { exigePermissao } = require("../middleware/exigePermissao");
const {
  getConfiguracao,
  salvarConfiguracao,
  listarProvedores,
  getFluxo,
} = require("../controllers/configuracaoFiscalController");

/**
 * Rotas: /api/fiscal
 *
 * Gerencia configuração fiscal e operações de apoio à Central Fiscal.
 * Configurações exigem authUser; diagnóstico global exige authAdmin e autorização explícita.
 *
 * SEGURANÇA: GET/POST /api/fiscal/configuracao exigem a permissão
 * `gerenciar_configuracao_fiscal` (ver middleware/exigePermissao.js).
 */

// Diagnóstico global: sessão do painel + autorização explícita, nunca permissão do pet shop.
const {authAdmin}=require("../middleware/authAdmin");
const diagnostico=require("../controllers/focusDiagnosticoController");
router.get("/diagnostico-focus/permissao",authAdmin,diagnostico.autorizado,diagnostico.permissao);
router.post("/testar-conexao-focus",authAdmin,diagnostico.autorizado,diagnostico.executar);

router.use(authUser);

// Configuração fiscal da empresa — exige permissão específica
router.get(
  "/configuracao",
  exigePermissao("gerenciar_configuracao_fiscal"),
  getConfiguracao,
);
router.post(
  "/configuracao",
  exigePermissao("gerenciar_configuracao_fiscal"),
  salvarConfiguracao,
);

// Provedores disponíveis
router.get("/provedores", listarProvedores);

// Fluxo de emissão para o ciclo de venda (somente autenticação)
router.get("/fluxo", getFluxo);

module.exports = router;
