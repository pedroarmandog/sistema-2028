const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { authUser } = require("../middleware/authUser");
const rateLimit = require("../middleware/rateLimit");

// Todas as rotas do dashboard requerem autenticação
router.use(authUser);

// Bloqueio de segurança: impede vazamento de dados entre empresas.
// Se empresaId for null no JWT o usuário veria dados de TODAS as empresas.
router.use((req, res, next) => {
  if (!req.user || !req.user.empresaId) {
    console.warn(
      `[dashboard] acesso negado — empresaId ausente (usuario=${req.user?.id}). Refaça o login.`,
    );
    return res.status(403).json({
      erro: "Empresa não identificada. Faça login novamente.",
      code: "EMPRESA_NAO_IDENTIFICADA",
    });
  }
  next();
});

// NOTE: removido rateLimit global do dashboard para evitar 429 quando o frontend faz múltiplas chamadas paralelas.
// Aplicar rate limiting apenas em rotas críticas (ex: login) ou em endpoints específicos quando necessário.

// Rota para produtos com estoque baixo
router.get("/produtos-estoque-baixo", dashboardController.produtosEstoqueBaixo);

// Rota consolidada: resumo do dashboard (clientes, agendamentos, vendas, ticket)
router.get("/resumo", dashboardController.resumo);

// Rota para aniversariantes (pets e clientes)
router.get("/aniversariantes", dashboardController.aniversariantes);

// Rota para oportunidades de venda
router.get("/oportunidades-venda", dashboardController.oportunidadesVenda);

// Rota para Taxi Dog do dia
router.get("/leva-traz", dashboardController.levaTraz);

// Rota para produtos próximos do vencimento
router.get("/produtos-vencimento", dashboardController.produtosVencimento);

// Rota para contagem de vendas realizadas hoje
router.get("/vendas-hoje", dashboardController.vendasHoje);

// Rota para ticket médio das vendas (dia)
router.get("/ticket-medio", dashboardController.ticketMedio);

// Rota para periódicos (serviços a renovar nos próximos 7 dias)
router.get("/periodicos", dashboardController.periodicos);

// Rota para contas a pagar vencendo hoje
router.get("/contas-a-pagar-hoje", dashboardController.contasAPagarHoje);

// Rota para faturamento por períodos (dia, semana, mês) - usado pelo Mobile Dashboard
router.get(
  "/faturamento-periodos",
  dashboardController.faturamentoPeriodos,
);

// Rota para indicadores do atendimento (agendados, checkin, prontos)
router.get(
  "/indicadores-atendimento",
  dashboardController.indicadoresAtendimento,
);

// Rota para pets no estabelecimento agrupados por status (mobile dashboard)
router.get(
  "/pets-no-estabelecimento",
  dashboardController.petsNoEstabelecimento,
);

module.exports = router;
