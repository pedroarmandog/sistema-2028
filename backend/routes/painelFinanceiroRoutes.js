/**
 * painelFinanceiroRoutes.js
 * Endpoints do Painel Financeiro – dados 100% do banco de dados.
 *
 * Fontes de dados:
 *   ENTRADAS:  vendas (status pago/parcial) + agendamentos (concluido) + movimentos_caixa (entrada)
 *   SAÍDAS:    entradas_mercadoria (situacao=pago, via dataPagamento) + movimentos_caixa (saida)
 *   A RECEBER: vendas status pendente/parcial
 *   A PAGAR:   entradas_mercadoria situacao=concluido (nota recebida mas não paga)
 *
 * Todos os parâmetros recebidos via query string são validados e usados
 * somente como valores em queries parametrizadas (Sequelize Op) – sem risco de SQL injection.
 */

const express = require("express");
const router = express.Router();
const { Op, fn, col, literal } = require("sequelize");
const { authUser } = require("../middleware/authUser");

// Proteger todas as rotas do painel financeiro com autenticação de usuário
router.use(authUser);

// ── Modelos ──────────────────────────────────────────────────────────────────
const { Venda, sequelize: seqVenda } = require("../models/Venda");
const { Agendamento } = require("../models/Agendamento");
const { MovimentoCaixa } = require("../models/MovimentoCaixa");
const Entrada = require("../models/Entrada");
const ContaReceber = require("../models/ContaReceber");

// Instância do sequelize compartilhada
const { sequelize } = require("../models/Cliente");

// ── Helpers ───────────────────────────────────────────────────────────────────
function getHojeBrasilStr() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

// ── Utilitários ───────────────────────────────────────────────────────────────

/**
 * Converte um valor numérico para número seguro (evita NaN/null).
 */
function toNum(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

/**
 * Calcula o início e fim de semana (dom–sáb) contendo a data passada.
 */
function semanaContendo(date) {
  const d = new Date(date);
  const dia = d.getDay(); // 0=dom
  const inicio = new Date(d);
  inicio.setDate(d.getDate() - dia);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  fim.setHours(23, 59, 59, 999);
  return { inicio, fim };
}

/**
 * Retorna o primeiro e último dia do mês.
 */
function limitesMes(ano, mes) {
  // mes: 1-based
  const inicio = new Date(ano, mes - 1, 1, 0, 0, 0, 0);
  const fim = new Date(ano, mes, 0, 23, 59, 59, 999);
  return { inicio, fim };
}

/**
 * Retorna o nome do dia da semana em português para uma data.
 */
function nomeDiaSemana(date) {
  const nomes = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ];
  return nomes[new Date(date).getDay()];
}

/**
 * Formata uma data como DD/MM/YYYY.
 */
function fmtData(date) {
  const d = new Date(date);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${d.getFullYear()}`;
}

// ── Helpers de consulta ───────────────────────────────────────────────────────

/**
 * Soma total de entradas (vendas + agendamentos + movimentos caixa entrada)
 * para um array de datas [Date start, Date end].
 */
async function somaEntradas(inicio, fim, empresaId) {
  const eW = empresaId ? { empresa_id: empresaId } : {};
  const movW = empresaId
    ? {
        [Op.and]: [
          sequelize.literal(
            `caixaId IN (SELECT id FROM caixas WHERE empresa_id = ${parseInt(empresaId, 10)})`,
          ),
        ],
      }
    : {};
  const [vendas, agendamentos, movimentos] = await Promise.all([
    // Vendas pagas total ou parcial dentro do período
    Venda.sum("totalPago", {
      where: {
        ...eW,
        data: { [Op.between]: [inicio, fim] },
        status: { [Op.in]: ["pago", "parcial"] },
      },
    }),
    // Agendamentos concluídos
    Agendamento.sum("totalPago", {
      where: {
        ...eW,
        dataAgendamento: { [Op.between]: [inicio, fim] },
        status: "concluido",
      },
    }),
    // Movimentos de caixa – entradas
    MovimentoCaixa.sum("valor", {
      where: {
        ...movW,
        data: { [Op.between]: [inicio, fim] },
        tipo: "entrada",
      },
    }),
  ]);
  return toNum(vendas) + toNum(agendamentos) + toNum(movimentos);
}

/**
 * Soma total de saídas (entradas_mercadoria pagas + movimentos caixa saida)
 * para um intervalo de datas.
 * @param {Date} inicio
 * @param {Date} fim
 */
async function somaSaidas(inicio, fim, empresaId) {
  const eW = empresaId ? { empresa_id: empresaId } : {};
  const movW = empresaId
    ? {
        [Op.and]: [
          sequelize.literal(
            `caixaId IN (SELECT id FROM caixas WHERE empresa_id = ${parseInt(empresaId, 10)})`,
          ),
        ],
      }
    : {};
  const [comprasPagas, movimentos] = await Promise.all([
    // Entradas_mercadoria onde a data de pagamento cai no período e estão pagas
    Entrada.sum("valorTotal", {
      where: {
        ...eW,
        dataPagamento: { [Op.between]: [inicio, fim] },
        situacao: "pago",
      },
    }),
    // Movimentos de caixa – saídas
    MovimentoCaixa.sum("valor", {
      where: {
        ...movW,
        data: { [Op.between]: [inicio, fim] },
        tipo: "saida",
      },
    }),
  ]);
  return toNum(comprasPagas) + toNum(movimentos);
}

// ── ENDPOINT 1: Resumo (Contas a Receber / a Pagar) ──────────────────────────
/**
 * GET /api/painel-financeiro/resumo
 * Retorna totais de contas a receber e a pagar agrupados por período.
 * Usado nos cards laterais do painel.
 */
router.get("/resumo", async (req, res) => {
  try {
    // CRÍTICO: Verificar empresaId antes de qualquer consulta
    if (!req.user?.empresaId) {
      console.error(
        `[GET /api/painel-financeiro/resumo] BLOQUEIO: empresaId ausente no req.user.`
      );
      return res.status(403).json({
        error: "Acesso negado: empresa não identificada.",
        semEmpresa: true,
      });
    }

    const empresaId = parseInt(req.user.empresaId, 10);
    const eW = { empresa_id: empresaId };
    const dataBrasil = getHojeBrasilStr();

    // Range do dia de hoje (offset -03:00) para evitar problemas de timezone
    const hojeStart = new Date(`${dataBrasil}T00:00:00-03:00`);
    const hojeNext = new Date(hojeStart);
    hojeNext.setDate(hojeStart.getDate() + 1);
    const hojeStartStr = hojeStart.toISOString().slice(0, 19).replace("T", " ");
    const hojeNextStr = hojeNext.toISOString().slice(0, 19).replace("T", " ");

    // Semana atual (dom–sáb) - usar dataBrasil para calcular
    const hojeParts = dataBrasil.split("-").map(Number);
    const hojeDate = new Date(hojeParts[0], hojeParts[1] - 1, hojeParts[2]);
    const semana = semanaContendo(hojeDate);
    // Próxima semana
    const proxSemIni = new Date(semana.fim);
    proxSemIni.setDate(proxSemIni.getDate() + 1);
    proxSemIni.setHours(0, 0, 0, 0);
    const proxSemFim = new Date(proxSemIni);
    proxSemFim.setDate(proxSemIni.getDate() + 6);
    proxSemFim.setHours(23, 59, 59, 999);

    // Mês atual
    const mesMesIni = new Date(
      hojeParts[0],
      hojeParts[1] - 1,
      1,
      0,
      0,
      0,
      0,
    );
    const mesMesFim = new Date(
      hojeParts[0],
      hojeParts[1],
      0,
      23,
      59,
      59,
      999,
    );

    // Próximo mês
    const proxMesIni = new Date(
      hojeParts[0],
      hojeParts[1],
      1,
      0,
      0,
      0,
      0,
    );
    const proxMesFim = new Date(
      hojeParts[0],
      hojeParts[1] + 1,
      0,
      23,
      59,
      59,
      999,
    );

    // ── CONTAS A RECEBER ──────────────────────────────────────────────────────
    // Vendas pendentes/parciais: saldo ainda a receber = (totais.totalFinal ou valor dos itens) - totalPago
    // Como totais é JSON, calculamos de forma mais simples:
    // usamos o campo 'data' da venda para agrupar temporalmente.
    // Valor a receber por venda = totalPago é o que JÁ foi recebido.
    // Para vendas pendentes, o total a receber é armazenado em totais.totalComDesconto ou similar.
    // Simplificação prática: somar totalPago das vendas (i.e., "quanto entrou por venda") como proxy
    // e usar dados de vendas status='pendente' ou 'parcial' para "a receber futuro".
    // NOTA: Aqui interpretamos "contas a receber" como valor total das vendas status=pendente|parcial.

    const [recHoje, recSemana, recProxSem, recMes, recProxMes, recAtrasado] =
      await Promise.all([
        // Hoje - usa range com offset -03:00
        Venda.findAll({
          where: {
            ...eW,
            data: { [Op.gte]: hojeStartStr, [Op.lt]: hojeNextStr },
            status: { [Op.in]: ["pendente", "parcial"] },
          },
          attributes: ["totais", "totalPago"],
        }),
        // Esta semana
        Venda.findAll({
          where: {
            ...eW,
            data: { [Op.between]: [semana.inicio, semana.fim] },
            status: { [Op.in]: ["pendente", "parcial"] },
          },
          attributes: ["totais", "totalPago"],
        }),
        // Próxima semana
        Venda.findAll({
          where: {
            ...eW,
            data: { [Op.between]: [proxSemIni, proxSemFim] },
            status: { [Op.in]: ["pendente", "parcial"] },
          },
          attributes: ["totais", "totalPago"],
        }),
        // Este mês
        Venda.findAll({
          where: {
            ...eW,
            data: { [Op.between]: [mesMesIni, mesMesFim] },
            status: { [Op.in]: ["pendente", "parcial"] },
          },
          attributes: ["totais", "totalPago"],
        }),
        // Próximo mês
        Venda.findAll({
          where: {
            ...eW,
            data: { [Op.between]: [proxMesIni, proxMesFim] },
            status: { [Op.in]: ["pendente", "parcial"] },
          },
          attributes: ["totais", "totalPago"],
        }),
        // Atrasadas (anteriores a hoje)
        Venda.findAll({
          where: {
            ...eW,
            data: { [Op.lt]: hojeStartStr },
            status: { [Op.in]: ["pendente", "parcial"] },
          },
          attributes: ["totais", "totalPago"],
        }),
      ]);

    // Calcula saldo pendente de uma lista de vendas
    const calcReceber = (vendas) =>
      vendas.reduce((acc, v) => {
        const total = toNum(
          v.totais?.totalComDesconto ||
            v.totais?.totalFinal ||
            v.totais?.subtotal ||
            0,
        );
        const pago = toNum(v.totalPago);
        return acc + Math.max(0, total - pago);
      }, 0);

    const receber = {
      hoje: calcReceber(recHoje),
      essaSemana: calcReceber(recSemana),
      proximaSemana: calcReceber(recProxSem),
      esseMes: calcReceber(recMes),
      proximoMes: calcReceber(recProxMes),
      atrasado: calcReceber(recAtrasado),
    };

    // DEBUG: Log do resultado final
    console.log("[painel-financeiro/resumo DEBUG] receber:", JSON.stringify(receber));
    console.log("[painel-financeiro/resumo DEBUG] recHoje count:", recHoje.length, "recMes count:", recMes.length);
    console.log("[painel-financeiro/resumo DEBUG] empresaId:", empresaId, "eW:", JSON.stringify(eW));
    console.log("[painel-financeiro/resumo DEBUG] hojeStartStr:", hojeStartStr, "hojeNextStr:", hojeNextStr);

    // ── ACRESCENTAR DocumentosAReceber (ContaReceber) ─────────────────────────
    try {
      const calcCR = (rows) =>
        rows.reduce(
          (acc, r) => acc + Math.max(0, toNum(r.valor) - toNum(r.valorPago)),
          0,
        );
      const statusPend = { [Op.in]: ["pendente", "parcial"] };
      // Isolamento estrito por empresa_id
      const empresaWhere = eW;
      
      // dataVencimento é DATEONLY, então usamos apenas datas puras YYYY-MM-DD
      const hojeDateStr = dataBrasil; // "2026-07-12"
      const amanhaDateStr = new Date(hojeStart).toISOString().slice(0, 10); // "2026-07-13"
      
      const [crHoje, crSem, crProxSem, crMes, crProxMes, crAtr] =
        await Promise.all([
          // Hoje - usa data pura (DATEONLY)
          ContaReceber.findAll({
            where: {
              ...empresaWhere,
              status: statusPend,
              dataVencimento: { [Op.gte]: hojeDateStr, [Op.lt]: amanhaDateStr },
            },
            attributes: ["valor", "valorPago"],
          }),
          // Esta semana
          ContaReceber.findAll({
            where: {
              ...empresaWhere,
              status: statusPend,
              dataVencimento: { [Op.between]: [semana.inicio.toISOString().slice(0, 10), semana.fim.toISOString().slice(0, 10)] },
            },
            attributes: ["valor", "valorPago"],
          }),
          // Próxima semana
          ContaReceber.findAll({
            where: {
              ...empresaWhere,
              status: statusPend,
              dataVencimento: { [Op.between]: [proxSemIni.toISOString().slice(0, 10), proxSemFim.toISOString().slice(0, 10)] },
            },
            attributes: ["valor", "valorPago"],
          }),
          // Este mês
          ContaReceber.findAll({
            where: {
              ...empresaWhere,
              status: statusPend,
              dataVencimento: { [Op.between]: [mesMesIni.toISOString().slice(0, 10), mesMesFim.toISOString().slice(0, 10)] },
            },
            attributes: ["valor", "valorPago"],
          }),
          // Próximo mês
          ContaReceber.findAll({
            where: {
              ...empresaWhere,
              status: statusPend,
              dataVencimento: { [Op.between]: [proxMesIni.toISOString().slice(0, 10), proxMesFim.toISOString().slice(0, 10)] },
            },
            attributes: ["valor", "valorPago"],
          }),
          // Atrasadas
          ContaReceber.findAll({
            where: {
              ...empresaWhere,
              status: statusPend,
              dataVencimento: { [Op.lt]: hojeDateStr },
            },
            attributes: ["valor", "valorPago"],
          }),
        ]);
      receber.hoje += calcCR(crHoje);
      receber.essaSemana += calcCR(crSem);
      receber.proximaSemana += calcCR(crProxSem);
      receber.esseMes += calcCR(crMes);
      receber.proximoMes += calcCR(crProxMes);
      receber.atrasado += calcCR(crAtr);
      // Novo debug: registrar quantos registros de ContaReceber foram encontrados por período
      console.log(
        "[painel-financeiro/resumo DEBUG] ContaReceber counts:",
        { hoje: crHoje.length, semana: crSem.length, proxSem: crProxSem.length, mes: crMes.length, proxMes: crProxMes.length, atrasado: crAtr.length }
      );
    } catch (crErr) {
      console.error(
        "[painel-financeiro/resumo] ERRO ao somar ContaReceber:",
        crErr.message,
        "\nStack:",
        crErr.stack,
      );
    }

    receber.geral =
      receber.hoje +
      receber.essaSemana +
      receber.proximaSemana +
      receber.esseMes +
      receber.proximoMes +
      receber.atrasado;

    // ── CONTAS A PAGAR ────────────────────────────────────────────────────────
    // Documentos a pagar são entradas_mercadoria com situacao='concluido'
    // (ainda não pagos). O campo dataEntrada armazena a data de vencimento
    // definida no momento da criação do documento. Quando o documento for pago,
    // situacao muda para 'pago' e ele deixa de aparecer aqui.

    const [
      pagHoje,
      pagSemana,
      pagProxSem,
      pagMes,
      pagProxMes,
      pagAtrasado,
      pagGeral,
    ] = await Promise.all([
      // Vencimento hoje - usa range com offset -03:00
      Entrada.findAll({
        where: {
          ...eW,
          dataEntrada: { [Op.gte]: hojeStartStr, [Op.lt]: hojeNextStr },
          situacao: "concluido",
        },
        attributes: ["valorTotal"],
      }),
      // Vencimento esta semana
      Entrada.findAll({
        where: {
          ...eW,
          dataEntrada: { [Op.between]: [semana.inicio, semana.fim] },
          situacao: "concluido",
        },
        attributes: ["valorTotal"],
      }),
      // Vencimento próxima semana
      Entrada.findAll({
        where: {
          ...eW,
          dataEntrada: { [Op.between]: [proxSemIni, proxSemFim] },
          situacao: "concluido",
        },
        attributes: ["valorTotal"],
      }),
      // Vencimento este mês
      Entrada.findAll({
        where: {
          ...eW,
          dataEntrada: { [Op.between]: [mesMesIni, mesMesFim] },
          situacao: "concluido",
        },
        attributes: ["valorTotal"],
      }),
      // Vencimento próximo mês
      Entrada.findAll({
        where: {
          ...eW,
          dataEntrada: { [Op.between]: [proxMesIni, proxMesFim] },
          situacao: "concluido",
        },
        attributes: ["valorTotal"],
      }),
      // Atrasados: vencimento anterior a hoje e ainda não pago
      Entrada.findAll({
        where: {
          ...eW,
          dataEntrada: { [Op.lt]: hojeStartStr },
          situacao: "concluido",
        },
        attributes: ["valorTotal"],
      }),
      // Geral: todos os documentos não pagos, independente de vencimento
      Entrada.findAll({
        where: { ...eW, situacao: "concluido" },
        attributes: ["valorTotal"],
      }),
    ]);

    const calcPagar = (entradas) =>
      entradas.reduce((acc, e) => acc + toNum(e.valorTotal), 0);

    const pagar = {
      hoje: calcPagar(pagHoje),
      essaSemana: calcPagar(pagSemana),
      proximaSemana: calcPagar(pagProxSem),
      esseMes: calcPagar(pagMes),
      proximoMes: calcPagar(pagProxMes),
      atrasado: calcPagar(pagAtrasado),
      geral: calcPagar(pagGeral),
    };

    return res.json({ receber, pagar });
  } catch (err) {
    console.error("[painel-financeiro/resumo] Erro:", err.message);
    return res.status(500).json({ error: "Erro ao buscar resumo financeiro" });
  }
});

// ── ENDPOINT 2: Calendário ────────────────────────────────────────────────────
/**
 * GET /api/painel-financeiro/calendario?mes=3&ano=2026
 * Retorna, para cada dia do mês, o total de entradas, saídas, saldo do dia
 * e saldo acumulado.
 */
router.get("/calendario", async (req, res) => {
  try {
    // CRÍTICO: Verificar empresaId antes de qualquer consulta
    if (!req.user?.empresaId) {
      console.error(
        `[GET /api/painel-financeiro/calendario] BLOQUEIO: empresaId ausente no req.user.`
      );
      return res.status(403).json({
        error: "Acesso negado: empresa não identificada.",
        semEmpresa: true,
      });
    }

    const empresaId = parseInt(req.user.empresaId, 10);
    const eW = { empresa_id: empresaId };
    const movW = {
      [Op.and]: [
        sequelize.literal(
          `caixaId IN (SELECT id FROM caixas WHERE empresa_id = ${empresaId})`,
        ),
      ],
    };
    // Validar e sanitizar parâmetros
    const hoje = new Date();
    const mes = parseInt(req.query.mes) || hoje.getMonth() + 1;
    const ano = parseInt(req.query.ano) || hoje.getFullYear();

    if (mes < 1 || mes > 12 || ano < 2000 || ano > 2100) {
      return res.status(400).json({ error: "Parâmetros inválidos" });
    }

    const { inicio: mesIni, fim: mesFim } = limitesMes(ano, mes);
    const totalDias = new Date(ano, mes, 0).getDate();

    // Buscar dados agregados de vendas por dia
    const [vendasDia, agendDia, movEntDia, comprasDia, movSaiDia] =
      await Promise.all([
        // Vendas pagas por dia
        Venda.findAll({
          attributes: [
            [fn("DATE", col("data")), "dia"],
            [fn("SUM", col("totalPago")), "total"],
          ],
          where: {
            ...eW,
            data: { [Op.between]: [mesIni, mesFim] },
            status: { [Op.in]: ["pago", "parcial"] },
          },
          group: [fn("DATE", col("data"))],
          raw: true,
        }),
        // Agendamentos concluídos por dia
        Agendamento.findAll({
          attributes: [
            [fn("DATE", col("dataAgendamento")), "dia"],
            [fn("SUM", col("totalPago")), "total"],
          ],
          where: {
            ...eW,
            dataAgendamento: { [Op.between]: [mesIni, mesFim] },
            status: "concluido",
          },
          group: [fn("DATE", col("dataAgendamento"))],
          raw: true,
        }),
        // Movimentos de caixa – entradas por dia
        MovimentoCaixa.findAll({
          attributes: [
            [fn("DATE", col("data")), "dia"],
            [fn("SUM", col("valor")), "total"],
          ],
          where: {
            ...movW,
            data: { [Op.between]: [mesIni, mesFim] },
            tipo: "entrada",
          },
          group: [fn("DATE", col("data"))],
          raw: true,
        }),
        // Compras pagas por dia (via dataPagamento)
        Entrada.findAll({
          attributes: [
            ["dataPagamento", "dia"],
            [fn("SUM", col("valorTotal")), "total"],
          ],
          where: {
            ...eW,
            dataPagamento: { [Op.between]: [mesIni, mesFim] },
            situacao: "pago",
          },
          group: ["dataPagamento"],
          raw: true,
        }),
        // Movimentos de caixa – saídas por dia
        MovimentoCaixa.findAll({
          attributes: [
            [fn("DATE", col("data")), "dia"],
            [fn("SUM", col("valor")), "total"],
          ],
          where: {
            ...movW,
            data: { [Op.between]: [mesIni, mesFim] },
            tipo: "saida",
          },
          group: [fn("DATE", col("data"))],
          raw: true,
        }),
      ]);

    // Indexar resultados por string de data YYYY-MM-DD
    const idx = (arr) =>
      arr.reduce((m, r) => {
        const key = r.dia ? String(r.dia).slice(0, 10) : null;
        if (key) m[key] = toNum(r.total);
        return m;
      }, {});

    const idxVendas = idx(vendasDia);
    const idxAgend = idx(agendDia);
    const idxMovEnt = idx(movEntDia);
    const idxCompras = idx(comprasDia);
    const idxMovSai = idx(movSaiDia);

    // Montar array de dias com saldo acumulado
    let saldoAcumulado = 0;
    const dias = [];
    for (let d = 1; d <= totalDias; d++) {
      const dataStr = `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const entradas =
        (idxVendas[dataStr] || 0) +
        (idxAgend[dataStr] || 0) +
        (idxMovEnt[dataStr] || 0);
      const saidas = (idxCompras[dataStr] || 0) + (idxMovSai[dataStr] || 0);
      const saldoDia = entradas - saidas;
      saldoAcumulado += saldoDia;

      dias.push({
        dia: d,
        dataStr,
        entradas,
        saidas,
        saldo: saldoDia,
        saldoAcumulado,
      });
    }

    return res.json({ mes, ano, dias });
  } catch (err) {
    console.error("[painel-financeiro/calendario] Erro:", err.message);
    return res
      .status(500)
      .json({ error: "Erro ao buscar dados do calendário" });
  }
});

// ── ENDPOINT 3: Dados dos Gráficos ────────────────────────────────────────────
/**
 * GET /api/painel-financeiro/grafico?mes=3&ano=2026
 * Retorna séries de dados para os dois gráficos:
 *   - Saldo de contas (acumulado real) e Saldo previsto (contas a pagar futuras deduzidas)
 *   - A receber (pendentes) e A pagar (concluídas não pagas) por dia
 */
router.get("/grafico", async (req, res) => {
  try {
    // CRÍTICO: Verificar empresaId antes de qualquer consulta
    if (!req.user?.empresaId) {
      console.error(
        `[GET /api/painel-financeiro/grafico] BLOQUEIO: empresaId ausente no req.user.`
      );
      return res.status(403).json({
        error: "Acesso negado: empresa não identificada.",
        semEmpresa: true,
      });
    }

    const empresaId = parseInt(req.user.empresaId, 10);
    const eW = { empresa_id: empresaId };
    const movW = {
      [Op.and]: [
        sequelize.literal(
          `caixaId IN (SELECT id FROM caixas WHERE empresa_id = ${empresaId})`,
        ),
      ],
    };
    const hoje = new Date();
    const mes = parseInt(req.query.mes) || hoje.getMonth() + 1;
    const ano = parseInt(req.query.ano) || hoje.getFullYear();

    if (mes < 1 || mes > 12 || ano < 2000 || ano > 2100) {
      return res.status(400).json({ error: "Parâmetros inválidos" });
    }

    const { inicio: mesIni, fim: mesFim } = limitesMes(ano, mes);
    const totalDias = new Date(ano, mes, 0).getDate();

    // Buscar entradas e saídas por dia (reutiliza a mesma lógica do calendário)
    const [
      vendasDia,
      agendDia,
      movEntDia,
      comprasDia,
      movSaiDia,
      recDia,
      pagDia,
      crPagoDia,
      crPendVenc,
    ] = await Promise.all([
      Venda.findAll({
        attributes: [
          [fn("DATE", col("data")), "dia"],
          [fn("SUM", col("totalPago")), "total"],
        ],
        where: {
          ...eW,
          data: { [Op.between]: [mesIni, mesFim] },
          status: { [Op.in]: ["pago", "parcial"] },
        },
        group: [fn("DATE", col("data"))],
        raw: true,
      }),
      Agendamento.findAll({
        attributes: [
          [fn("DATE", col("dataAgendamento")), "dia"],
          [fn("SUM", col("totalPago")), "total"],
        ],
        where: {
          ...eW,
          dataAgendamento: { [Op.between]: [mesIni, mesFim] },
          status: "concluido",
        },
        group: [fn("DATE", col("dataAgendamento"))],
        raw: true,
      }),
      MovimentoCaixa.findAll({
        attributes: [
          [fn("DATE", col("data")), "dia"],
          [fn("SUM", col("valor")), "total"],
        ],
        where: {
          ...movW,
          data: { [Op.between]: [mesIni, mesFim] },
          tipo: "entrada",
        },
        group: [fn("DATE", col("data"))],
        raw: true,
      }),
      Entrada.findAll({
        attributes: [
          ["dataPagamento", "dia"],
          [fn("SUM", col("valorTotal")), "total"],
        ],
        where: {
          ...eW,
          dataPagamento: { [Op.between]: [mesIni, mesFim] },
          situacao: "pago",
        },
        group: ["dataPagamento"],
        raw: true,
      }),
      MovimentoCaixa.findAll({
        attributes: [
          [fn("DATE", col("data")), "dia"],
          [fn("SUM", col("valor")), "total"],
        ],
        where: {
          ...movW,
          data: { [Op.between]: [mesIni, mesFim] },
          tipo: "saida",
        },
        group: [fn("DATE", col("data"))],
        raw: true,
      }),
      // A receber (vendas pendentes/parciais) por dia
      Venda.findAll({
        attributes: [
          [fn("DATE", col("data")), "dia"],
          [fn("SUM", col("totalPago")), "total"],
        ],
        where: {
          ...eW,
          data: { [Op.between]: [mesIni, mesFim] },
          status: { [Op.in]: ["pendente", "parcial"] },
        },
        group: [fn("DATE", col("data"))],
        raw: true,
      }),
      // A pagar (entradas concluídas não pagas) por vencimento
      Entrada.findAll({
        attributes: [
          ["dataPagamento", "dia"],
          [fn("SUM", col("valorTotal")), "total"],
        ],
        where: {
          ...eW,
          dataPagamento: { [Op.between]: [mesIni, mesFim] },
          situacao: "concluido",
        },
        group: ["dataPagamento"],
        raw: true,
      }),
      // ContaReceber pagas por dataPagamento (saldo real)
      ContaReceber.findAll({
        attributes: [
          [fn("DATE", col("dataPagamento")), "dia"],
          [fn("SUM", col("valorPago")), "total"],
        ],
        where: {
          ...eW,
          dataPagamento: { [Op.between]: [mesIni, mesFim] },
          status: "pago",
        },
        group: [fn("DATE", col("dataPagamento"))],
        raw: true,
      }),
      // ContaReceber pendentes/parciais por dataVencimento (a receber)
      ContaReceber.findAll({
        attributes: [
          [fn("DATE", col("dataVencimento")), "dia"],
          [fn("SUM", col("valor")), "total"],
        ],
        where: {
          ...eW,
          dataVencimento: { [Op.between]: [mesIni, mesFim] },
          status: { [Op.in]: ["pendente", "parcial"] },
        },
        group: [fn("DATE", col("dataVencimento"))],
        raw: true,
      }),
    ]);

    const idx = (arr) =>
      arr.reduce((m, r) => {
        const key = r.dia ? String(r.dia).slice(0, 10) : null;
        if (key) m[key] = (m[key] || 0) + toNum(r.total);
        return m;
      }, {});

    const iV = idx(vendasDia),
      iA = idx(agendDia),
      iME = idx(movEntDia);
    const iC = idx(comprasDia),
      iMS = idx(movSaiDia);
    const iR = idx(recDia),
      iP = idx(pagDia);
    const iCRg = idx(crPagoDia),
      iCRp = idx(crPendVenc);

    const labels = [],
      saldoContas = [],
      saldoPrevisto = [],
      aReceber = [],
      aPagar = [];
    let acum = 0,
      acumPrev = 0;

    for (let d = 1; d <= totalDias; d++) {
      const dataStr = `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const label = `${String(d).padStart(2, "0")}/${String(mes).padStart(2, "0")}`;

      // Entradas reais: vendas + agendamentos + caixa entrada + ContaReceber pagos
      const entradas =
        (iV[dataStr] || 0) +
        (iA[dataStr] || 0) +
        (iME[dataStr] || 0) +
        (iCRg[dataStr] || 0);
      const saidas = (iC[dataStr] || 0) + (iMS[dataStr] || 0);
      acum += entradas - saidas;

      // Saldo previsto considera também contas a receber pendentes e a pagar futuras
      const prevEntrada = (iR[dataStr] || 0) + (iCRp[dataStr] || 0);
      const prevSaida = iP[dataStr] || 0;
      acumPrev += entradas - saidas + prevEntrada - prevSaida;

      labels.push(label);
      saldoContas.push(parseFloat(acum.toFixed(2)));
      saldoPrevisto.push(parseFloat(acumPrev.toFixed(2)));
      // A Receber: vendas pendentes + ContaReceber pendentes + entradas reais do dia
      aReceber.push(
        parseFloat(
          ((iR[dataStr] || 0) + (iCRp[dataStr] || 0) + entradas).toFixed(2),
        ),
      );
      aPagar.push(parseFloat(((iP[dataStr] || 0) + saidas).toFixed(2)));
    }

    return res.json({ labels, saldoContas, saldoPrevisto, aReceber, aPagar });
  } catch (err) {
    console.error("[painel-financeiro/grafico] Erro:", err.message);
    return res.status(500).json({ error: "Erro ao buscar dados dos gráficos" });
  }
});

// ── ENDPOINT 4: Fluxo de Caixa ────────────────────────────────────────────────
/**
 * GET /api/painel-financeiro/fluxo-caixa
 * Query params:
 *   periodo    = 'mensal' | 'semanal' | 'diario'  (default: mensal)
 *   mes        = 1-12    (default: mês atual)
 *   ano        = YYYY    (default: ano atual)
 *   semana     = 0..53   (usada no período semanal; 0 = semana atual)
 *   dataRef    = 'YYYY-MM-DD' (usada no período diário)
 *
 * Retorna colunas e linhas com:
 *   SALDO INICIAL, ENTRADAS (oper, financ, outras), SAÍDAS (custo, despesa, invest, outras),
 *   SALDO DO PERÍODO, SALDO FINAL
 */
router.get("/fluxo-caixa", async (req, res) => {
  try {
    // CRÍTICO: Verificar empresaId antes de qualquer consulta
    if (!req.user?.empresaId) {
      console.error(
        `[GET /api/painel-financeiro/fluxo-caixa] BLOQUEIO: empresaId ausente no req.user.`
      );
      return res.status(403).json({
        error: "Acesso negado: empresa não identificada.",
        semEmpresa: true,
      });
    }

    const empresaId = parseInt(req.user.empresaId, 10);
    const eW = { empresa_id: empresaId };
    const movW = {
      [Op.and]: [
        sequelize.literal(
          `caixaId IN (SELECT id FROM caixas WHERE empresa_id = ${empresaId})`,
        ),
      ],
    };
    const hoje = new Date();
    const periodo = ["mensal", "semanal", "diario"].includes(req.query.periodo)
      ? req.query.periodo
      : "mensal";
    const mes = parseInt(req.query.mes) || hoje.getMonth() + 1;
    const ano = parseInt(req.query.ano) || hoje.getFullYear();

    if (mes < 1 || mes > 12 || ano < 2000 || ano > 2100) {
      return res.status(400).json({ error: "Parâmetros inválidos" });
    }

    // Determinar colunas (datas) conforme período
    let colunas = [];

    if (periodo === "mensal") {
      // Uma coluna por dia do mês
      const totalDias = new Date(ano, mes, 0).getDate();
      for (let d = 1; d <= totalDias; d++) {
        const dt = new Date(ano, mes - 1, d);
        colunas.push({
          dataStr: `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
          label: fmtData(dt),
          diaSemana: nomeDiaSemana(dt),
        });
      }
    } else if (periodo === "semanal") {
      // Semana contendo o primeiro dia do mês selecionado (ou data atual)
      const dataRef = req.query.dataRef
        ? new Date(req.query.dataRef)
        : new Date(ano, mes - 1, 1);
      const { inicio } = semanaContendo(dataRef);
      for (let i = 0; i < 7; i++) {
        const dt = new Date(inicio);
        dt.setDate(inicio.getDate() + i);
        colunas.push({
          dataStr: dt.toISOString().slice(0, 10),
          label: fmtData(dt),
          diaSemana: nomeDiaSemana(dt),
        });
      }
    } else {
      // Diário: uma única coluna
      const dataRef = req.query.dataRef ? new Date(req.query.dataRef) : hoje;
      const dt = new Date(
        dataRef.getFullYear(),
        dataRef.getMonth(),
        dataRef.getDate(),
      );
      colunas.push({
        dataStr: dt.toISOString().slice(0, 10),
        label: fmtData(dt),
        diaSemana: nomeDiaSemana(dt),
      });
    }

    if (colunas.length === 0) {
      return res.json({ colunas: [], linhas: {} });
    }

    const dataIni = new Date(`${colunas[0].dataStr}T00:00:00`);
    const dataFim = new Date(`${colunas[colunas.length - 1].dataStr}T23:59:59`);

    // ── Buscar dados por dia ──────────────────────────────────────────────────
    const [vendasDia, agendDia, movEntDia, comprasDia, movSaiDia] =
      await Promise.all([
        // Receitas Operacionais: vendas pagas
        Venda.findAll({
          attributes: [
            [fn("DATE", col("data")), "dia"],
            [fn("SUM", col("totalPago")), "total"],
          ],
          where: {
            ...eW,
            data: { [Op.between]: [dataIni, dataFim] },
            status: { [Op.in]: ["pago", "parcial"] },
          },
          group: [fn("DATE", col("data"))],
          raw: true,
        }),
        // Receitas Operacionais: agendamentos concluídos
        Agendamento.findAll({
          attributes: [
            [fn("DATE", col("dataAgendamento")), "dia"],
            [fn("SUM", col("totalPago")), "total"],
          ],
          where: {
            ...eW,
            dataAgendamento: { [Op.between]: [dataIni, dataFim] },
            status: "concluido",
          },
          group: [fn("DATE", col("dataAgendamento"))],
          raw: true,
        }),
        // Outras entradas: movimentos de caixa (entrada)
        MovimentoCaixa.findAll({
          attributes: [
            [fn("DATE", col("data")), "dia"],
            [fn("SUM", col("valor")), "total"],
          ],
          where: {
            ...movW,
            data: { [Op.between]: [dataIni, dataFim] },
            tipo: "entrada",
          },
          group: [fn("DATE", col("data"))],
          raw: true,
        }),
        // Saídas (custos): compras pagas por dia
        Entrada.findAll({
          attributes: [
            ["dataPagamento", "dia"],
            [fn("SUM", col("valorTotal")), "total"],
          ],
          where: {
            ...eW,
            dataPagamento: { [Op.between]: [dataIni, dataFim] },
            situacao: "pago",
          },
          group: ["dataPagamento"],
          raw: true,
        }),
        // Despesas: movimentos de caixa (saída)
        MovimentoCaixa.findAll({
          attributes: [
            [fn("DATE", col("data")), "dia"],
            [fn("SUM", col("valor")), "total"],
          ],
          where: {
            ...movW,
            data: { [Op.between]: [dataIni, dataFim] },
            tipo: "saida",
          },
          group: [fn("DATE", col("data"))],
          raw: true,
        }),
      ]);

    // Calcular saldo inicial (acumulado ANTES do primeiro dia do período)
    const dataAntesDoPeriodo = new Date(dataIni);
    dataAntesDoPeriodo.setDate(dataAntesDoPeriodo.getDate() - 1);
    const entAntes = await somaEntradas(
      new Date(0),
      dataAntesDoPeriodo,
      empresaId,
    );
    const saiAntes = await somaSaidas(
      new Date(0),
      dataAntesDoPeriodo,
      empresaId,
    );
    const saldoBase = entAntes - saiAntes;

    const idx = (arr) =>
      arr.reduce((m, r) => {
        const key = r.dia ? String(r.dia).slice(0, 10) : null;
        if (key) m[key] = toNum(r.total);
        return m;
      }, {});

    const iV = idx(vendasDia),
      iA = idx(agendDia),
      iME = idx(movEntDia);
    const iC = idx(comprasDia),
      iMS = idx(movSaiDia);

    // Construir linhas da tabela
    const linhas = {
      saldoInicial: [],
      receitasOperacionais: [],
      receitasFinanceiras: [], // sem fonte específica separada por ora (retorna zeros)
      outrasEntradas: [],
      entradas: [],
      custosOperacionais: [],
      despesasOperacionais: [],
      investimentos: [], // ainda sem fonte específica
      outrasSaidas: [],
      saidas: [],
      saldoPeriodo: [],
      saldoFinal: [],
    };

    let saldoAcum = saldoBase;

    for (const col of colunas) {
      const d = col.dataStr;

      const recOper = (iV[d] || 0) + (iA[d] || 0);
      const recFinanc = 0; // Receitas financeiras – extensívell no futuro
      const outrasEnt = iME[d] || 0;
      const totalEnt = recOper + recFinanc + outrasEnt;

      const custos = iC[d] || 0;
      const despesas = iMS[d] || 0;
      const invest = 0; // Investimentos – extensível no futuro
      const outrasSai = 0;
      const totalSai = custos + despesas + invest + outrasSai;

      const saldoPeriodo = totalEnt - totalSai;
      const saldoFinal = saldoAcum + saldoPeriodo;

      linhas.saldoInicial.push(parseFloat(saldoAcum.toFixed(2)));
      linhas.receitasOperacionais.push(parseFloat(recOper.toFixed(2)));
      linhas.receitasFinanceiras.push(0);
      linhas.outrasEntradas.push(parseFloat(outrasEnt.toFixed(2)));
      linhas.entradas.push(parseFloat(totalEnt.toFixed(2)));
      linhas.custosOperacionais.push(parseFloat(custos.toFixed(2)));
      linhas.despesasOperacionais.push(parseFloat(despesas.toFixed(2)));
      linhas.investimentos.push(0);
      linhas.outrasSaidas.push(0);
      linhas.saidas.push(parseFloat(totalSai.toFixed(2)));
      linhas.saldoPeriodo.push(parseFloat(saldoPeriodo.toFixed(2)));
      linhas.saldoFinal.push(parseFloat(saldoFinal.toFixed(2)));

      saldoAcum = saldoFinal;
    }

    return res.json({ colunas, linhas });
  } catch (err) {
    console.error("[painel-financeiro/fluxo-caixa] Erro:", err.message);
    return res.status(500).json({ error: "Erro ao buscar fluxo de caixa" });
  }
});

// ── ENDPOINT 5: Pagamentos e Recebimentos por dia ────────────────────────────
/**
 * GET /api/painel-financeiro/pagamentos-recebimentos?periodo=mensal&data=2026-05
 *
 * Recebimentos (tabela verde) por dia:
 *   - contas_receber pendentes/parciais → agrupadas por dataVencimento
 *   - contas_receber pagas             → agrupadas por dataPagamento
 *   - vendas pagas/parciais            → agrupadas por data
 *   - agendamentos concluídos          → agrupadas por dataAgendamento
 *   - movimentos_caixa entrada         → agrupadas por data
 *
 * Pagamentos (tabela vermelha) por dia:
 *   - entradas_mercadoria pendentes (concluido/pendente) → agrupadas por dataEntrada (vencimento)
 *   - entradas_mercadoria pagas                         → agrupadas por dataPagamento
 *   - movimentos_caixa saída                            → agrupadas por data
 */
router.get("/pagamentos-recebimentos", async (req, res) => {
  try {
    // CRÍTICO: Verificar empresaId antes de qualquer consulta
    if (!req.user?.empresaId) {
      console.error(
        `[GET /api/painel-financeiro/pagamentos-recebimentos] BLOQUEIO: empresaId ausente no req.user.`
      );
      return res.status(403).json({
        error: "Acesso negado: empresa não identificada.",
        semEmpresa: true,
      });
    }

    const empresaId = parseInt(req.user.empresaId, 10);
    const eW = { empresa_id: empresaId };
    const movW = {
      [Op.and]: [
        sequelize.literal(
          `caixaId IN (SELECT id FROM caixas WHERE empresa_id = ${empresaId})`,
        ),
      ],
    };
    const hoje = new Date();
    const periodo = ["mensal", "semanal", "diario"].includes(req.query.periodo)
      ? req.query.periodo
      : "mensal";

    let ano, mes;
    if (req.query.data && /^\d{4}-\d{2}$/.test(req.query.data)) {
      [ano, mes] = req.query.data.split("-").map(Number);
    } else {
      ano = hoje.getFullYear();
      mes = hoje.getMonth() + 1;
    }

    if (mes < 1 || mes > 12 || ano < 2000 || ano > 2100) {
      return res.status(400).json({ error: "Parâmetros inválidos" });
    }

    // Montar colunas conforme período
    let colunas = [];
    if (periodo === "mensal") {
      const totalDias = new Date(ano, mes, 0).getDate();
      for (let d = 1; d <= totalDias; d++) {
        const dt = new Date(ano, mes - 1, d);
        colunas.push({
          dataStr: `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
          label: fmtData(dt),
          diaSemana: nomeDiaSemana(dt),
        });
      }
    } else if (periodo === "semanal") {
      const dataRef = new Date(ano, mes - 1, 1);
      const { inicio } = semanaContendo(dataRef);
      for (let i = 0; i < 7; i++) {
        const dt = new Date(inicio);
        dt.setDate(inicio.getDate() + i);
        colunas.push({
          dataStr: dt.toISOString().slice(0, 10),
          label: fmtData(dt),
          diaSemana: nomeDiaSemana(dt),
        });
      }
    } else {
      const dt = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
      colunas.push({
        dataStr: dt.toISOString().slice(0, 10),
        label: fmtData(dt),
        diaSemana: nomeDiaSemana(dt),
      });
    }

    if (colunas.length === 0)
      return res.json({ colunas: [], recebimentos: {}, pagamentos: {} });

    const dataIni = new Date(`${colunas[0].dataStr}T00:00:00`);
    const dataFim = new Date(`${colunas[colunas.length - 1].dataStr}T23:59:59`);

    const [
      vendasDia,
      agendDia,
      movEntDia,
      // ContaReceber pendentes/parciais por vencimento
      crPendVenc,
      // ContaReceber pagas por dataPagamento
      crPagoDia,
      // Entradas pendentes (concluido/pendente) por dataEntrada (vencimento)
      entPendDia,
      // Entradas pagas por dataPagamento
      entPagoDia,
      movSaiDia,
    ] = await Promise.all([
      // Recebimentos – vendas pagas/parciais
      Venda.findAll({
        attributes: [
          [fn("DATE", col("data")), "dia"],
          [fn("SUM", col("totalPago")), "total"],
        ],
        where: {
          ...eW,
          data: { [Op.between]: [dataIni, dataFim] },
          status: { [Op.in]: ["pago", "parcial"] },
        },
        group: [fn("DATE", col("data"))],
        raw: true,
      }),
      // Recebimentos – agendamentos concluídos
      Agendamento.findAll({
        attributes: [
          [fn("DATE", col("dataAgendamento")), "dia"],
          [fn("SUM", col("totalPago")), "total"],
        ],
        where: {
          ...eW,
          dataAgendamento: { [Op.between]: [dataIni, dataFim] },
          status: "concluido",
        },
        group: [fn("DATE", col("dataAgendamento"))],
        raw: true,
      }),
      // Recebimentos – movimentos de caixa entrada
      MovimentoCaixa.findAll({
        attributes: [
          [fn("DATE", col("data")), "dia"],
          [fn("SUM", col("valor")), "total"],
        ],
        where: {
          ...movW,
          data: { [Op.between]: [dataIni, dataFim] },
          tipo: "entrada",
        },
        group: [fn("DATE", col("data"))],
        raw: true,
      }),
      // Recebimentos – contas_receber PENDENTES/PARCIAIS por dataVencimento
      ContaReceber.findAll({
        attributes: [
          [fn("DATE", col("dataVencimento")), "dia"],
          [fn("SUM", col("valor")), "total"],
        ],
        where: {
          ...eW,
          dataVencimento: { [Op.between]: [dataIni, dataFim] },
          status: { [Op.in]: ["pendente", "parcial"] },
        },
        group: [fn("DATE", col("dataVencimento"))],
        raw: true,
      }),
      // Recebimentos – contas_receber PAGAS por dataPagamento
      ContaReceber.findAll({
        attributes: [
          [fn("DATE", col("dataPagamento")), "dia"],
          [fn("SUM", col("valorPago")), "total"],
        ],
        where: {
          ...eW,
          dataPagamento: { [Op.between]: [dataIni, dataFim] },
          status: "pago",
        },
        group: [fn("DATE", col("dataPagamento"))],
        raw: true,
      }),
      // Pagamentos – entradas_mercadoria PENDENTES (concluido/pendente) por dataEntrada (vencimento)
      Entrada.findAll({
        attributes: [
          ["dataEntrada", "dia"],
          [fn("SUM", col("valorTotal")), "total"],
        ],
        where: {
          ...eW,
          dataEntrada: { [Op.between]: [dataIni, dataFim] },
          situacao: { [Op.notIn]: ["pago", "excluido", "ignorada"] },
        },
        group: ["dataEntrada"],
        raw: true,
      }),
      // Pagamentos – entradas_mercadoria PAGAS por dataPagamento
      Entrada.findAll({
        attributes: [
          ["dataPagamento", "dia"],
          [fn("SUM", col("valorTotal")), "total"],
        ],
        where: {
          ...eW,
          dataPagamento: { [Op.between]: [dataIni, dataFim] },
          situacao: "pago",
        },
        group: ["dataPagamento"],
        raw: true,
      }),
      // Pagamentos – movimentos de caixa saída
      MovimentoCaixa.findAll({
        attributes: [
          [fn("DATE", col("data")), "dia"],
          [fn("SUM", col("valor")), "total"],
        ],
        where: {
          ...movW,
          data: { [Op.between]: [dataIni, dataFim] },
          tipo: "saida",
        },
        group: [fn("DATE", col("data"))],
        raw: true,
      }),
    ]);

    const idx = (arr) =>
      arr.reduce((m, r) => {
        const key = r.dia ? String(r.dia).slice(0, 10) : null;
        if (key) m[key] = (m[key] || 0) + toNum(r.total);
        return m;
      }, {});

    const iV = idx(vendasDia);
    const iA = idx(agendDia);
    const iME = idx(movEntDia);
    const iCRp = idx(crPendVenc);
    const iCRg = idx(crPagoDia);
    const iEP = idx(entPendDia);
    const iEG = idx(entPagoDia);
    const iMS = idx(movSaiDia);

    const recebimentos = {};
    const pagamentos = {};

    for (const c of colunas) {
      const d = c.dataStr;
      // Recebimentos: pendentes por vencimento + pagos por dataPagamento + vendas + agend + caixa
      recebimentos[d] = parseFloat(
        (
          (iV[d] || 0) +
          (iA[d] || 0) +
          (iME[d] || 0) +
          (iCRp[d] || 0) +
          (iCRg[d] || 0)
        ).toFixed(2),
      );
      // Pagamentos: pendentes por vencimento + pagos por dataPagamento + caixa saída
      pagamentos[d] = parseFloat(
        ((iEP[d] || 0) + (iEG[d] || 0) + (iMS[d] || 0)).toFixed(2),
      );
    }

    return res.json({ colunas, recebimentos, pagamentos });
  } catch (err) {
    console.error(
      "[painel-financeiro/pagamentos-recebimentos] Erro:",
      err.message,
    );
    return res
      .status(500)
      .json({ error: "Erro ao buscar pagamentos e recebimentos" });
  }
});

module.exports = router;
