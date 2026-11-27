"use strict";
// Documentos financeiros continuam em entradas_mercadoria. Nenhum saldo de estoque é alterado aqui.
const { Op } = require("sequelize");
const C = require("../../frontend/components/venda-calculos");
const crypto = require("node:crypto");
const falha = (m, status = 400, code = "CONTAS_PAGAR_INVALIDO") =>
  Object.assign(Error(m), { status, code });
const normal = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
function empresa(v) {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n <= 0)
    throw falha("Empresa não identificada.", 403);
  return n;
}
function diaBrasil(now = new Date()) {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (k) => p.find((x) => x.type === k).value;
  return get("year") + "-" + get("month") + "-" + get("day");
}
function data(v, nome = "Data") {
  const s =
    v instanceof Date
      ? v.toISOString().slice(0, 10)
      : String(v || "").slice(0, 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
    !Number.isFinite(+new Date(s + "T12:00:00Z")) ||
    new Date(s + "T12:00:00Z").toISOString().slice(0, 10) !== s
  )
    throw falha(nome + " inválida.");
  return s;
}
function meses(s, n) {
  const [y, m, d] = data(s).split("-").map(Number),
    base = new Date(Date.UTC(y, m - 1 + n, 1));
  const dia = Math.min(
    d,
    new Date(
      Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0),
    ).getUTCDate(),
  );
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), dia, 12))
    .toISOString()
    .slice(0, 10);
}
function centavos(v, nome = "Valor") {
  let n;
  try {
    n = C.centavos(v);
  } catch {
    throw falha(nome + " inválido.");
  }
  if (!Number.isSafeInteger(n) || n < 0 || n > 999999999999)
    throw falha(nome + " inválido.");
  return n;
}
function array(v) {
  if (v == null || v === "") return [];
  for (let i = 0; i < 2 && typeof v === "string"; i++) {
    try {
      v = JSON.parse(v);
    } catch {
      throw falha(
        "Documento com pagamentos inválidos. Confira o cadastro.",
        409,
      );
    }
  }
  if (
    !Array.isArray(v) ||
    v.some((p) => !p || typeof p !== "object" || Array.isArray(p))
  )
    throw falha("Pagamentos do documento inválidos.", 409);
  return v;
}
const quitado = (s) =>
  ["pago", "paga", "quitado", "quitada", "liquidado", "liquidada"].includes(
    normal(s),
  );
const cancelado = (s) =>
  [
    "excluido",
    "excluida",
    "cancelado",
    "cancelada",
    "ignorada",
    "ignorado",
    "estornado",
  ].includes(normal(s));
function financeiro(row) {
  const r = row?.toJSON ? row.toJSON() : { ...row };
  const total = centavos(r.valorTotal ?? 0),
    pagos = array(r.pagamentos),
    baixas = pagos.filter(
      (p) =>
        p.baixaFinanceira === true ||
        (normal(r.situacao) === "parcial" && p.forma && p.valor != null),
    );
  const soma = baixas.reduce((n, p) => n + centavos(p.valor), 0);
  const valorPago =
    quitado(r.situacao) && !baixas.length ? total : Math.min(total, soma);
  const saldo =
    cancelado(r.situacao) || quitado(r.situacao)
      ? 0
      : Math.max(0, total - valorPago);
  return {
    ...r,
    pagamentos: pagos,
    descricao: r.observacao || r.fornecedor || "Documento",
    vencimento: r.dataEntrada,
    valorTotal: total / 100,
    valorPago: valorPago / 100,
    saldoPendente: saldo / 100,
    situacaoFinanceira: cancelado(r.situacao)
      ? "cancelado"
      : saldo === 0 && total > 0
        ? "pago"
        : valorPago > 0
          ? "parcial"
          : "pendente",
  };
}
const CAMPOS = [
  "id",
  "empresa_id",
  "fornecedor",
  "numero",
  "dataEmissao",
  "dataEntrada",
  "valorTotal",
  "situacao",
  "pagamentos",
  "dataPagamento",
  "observacao",
  "itens",
  "categoriaFinanceira",
  "centroResultado",
  "createdAt",
  "updatedAt",
];
function criar({
  Entrada,
  sequelize = Entrada.sequelize,
  agora = () => new Date(),
}) {
  let schemaCache;
  async function atributos(pagamento = false) {
    if (!schemaCache || schemaCache.ate < Date.now()) {
      const schema = await sequelize
        .getQueryInterface()
        .describeTable(Entrada.getTableName());
      schemaCache = { schema, ate: Date.now() + 10000 };
    }
    const cols = new Set(
      Object.keys(schemaCache.schema).map((k) => k.toLowerCase()),
    );
    const existe = (k) =>
      cols.has((Entrada.rawAttributes[k]?.field || k).toLowerCase());
    const obrigatorios = [
      "id",
      "empresa_id",
      "valorTotal",
      "dataEntrada",
      "situacao",
      ...(pagamento ? ["pagamentos", "dataPagamento"] : []),
    ];
    const ausentes = obrigatorios.filter((k) => !existe(k));
    if (ausentes.length)
      throw falha(
        "Estrutura de contas a pagar incompleta: " +
          ausentes.join(", ") +
          ". Execute o diagnóstico do módulo.",
        503,
        "CONTAS_PAGAR_SCHEMA",
      );
    return CAMPOS.filter((k) => Entrada.rawAttributes[k] && existe(k));
  }
  async function registro(id, emp, transaction, pagamento = false) {
    const row = await Entrada.findOne({
      attributes: await atributos(pagamento),
      where: { id, empresa_id: empresa(emp) },
      transaction,
      ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
    });
    if (!row) throw falha("Documento não encontrado nesta empresa.", 404);
    return row;
  }
  async function listar(emp, filtros = {}) {
    emp = empresa(emp);
    const attrs = await atributos(),
      rows = [];
    let last = 0;
    const whereBase = { empresa_id: emp };
    if (filtros.inicio || filtros.fim)
      whereBase.dataEntrada = {
        ...(filtros.inicio ? { [Op.gte]: data(filtros.inicio) } : {}),
        ...(filtros.fim ? { [Op.lte]: data(filtros.fim) } : {}),
      };
    while (true) {
      const batch = await Entrada.findAll({
        attributes: attrs,
        where: { ...whereBase, id: { [Op.gt]: last } },
        order: [["id", "ASC"]],
        limit: 500,
      });
      rows.push(...batch.map(financeiro));
      if (batch.length < 500) break;
      const next = Number(batch[batch.length - 1].id);
      if (next <= last) throw falha("Paginação financeira inconsistente.", 503);
      last = next;
    }
    return rows.filter(
      (r) => !filtros.situacao || r.situacaoFinanceira === filtros.situacao,
    );
  }
  async function hoje(emp) {
    const h = diaBrasil(agora());
    return (await listar(emp, { inicio: h, fim: h }))
      .filter(
        (r) => r.saldoPendente > 0 && r.situacaoFinanceira !== "cancelado",
      )
      .sort((a, b) => b.saldoPendente - a.saldoPendente || a.id - b.id)
      .map((r) =>
        Object.fromEntries(
          [
            "id",
            "empresa_id",
            "fornecedor",
            "descricao",
            "numero",
            "valorTotal",
            "valorPago",
            "saldoPendente",
            "dataEmissao",
            "dataEntrada",
            "situacao",
            "situacaoFinanceira",
          ].map((k) => [k, r[k]]),
        ),
      );
  }
  async function salvar(emp, body, id) {
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw falha("Dados do documento inválidos.");
    if (Object.hasOwn(body, "pagamentos") && !Array.isArray(body.pagamentos))
      throw falha("Pagamentos inválidos.");
    emp = empresa(emp);
    const attrs = await atributos(true),
      fields = attrs.filter(
        (k) => !["id", "createdAt", "updatedAt"].includes(k),
      );
    return sequelize.transaction(async (transaction) => {
      let row = id ? await registro(id, emp, transaction, true) : null;
      const anterior = row && financeiro(row),
        pagando = Array.isArray(body.pagamentos) && body.pagamentos.length > 0;
      if (row && cancelado(row.situacao))
        throw falha("Documento excluído não pode ser alterado.", 409);
      const allowed = [
        "fornecedor",
        "numero",
        "dataEmissao",
        "dataEntrada",
        "valorTotal",
        "observacao",
        "categoriaFinanceira",
        "centroResultado",
      ];
      const values = Object.fromEntries(
        allowed.filter((k) => Object.hasOwn(body, k)).map((k) => [k, body[k]]),
      );
      if (Object.hasOwn(values, "dataEmissao"))
        values.dataEmissao = data(values.dataEmissao, "Emissão");
      if (Object.hasOwn(values, "dataEntrada"))
        values.dataEntrada = data(values.dataEntrada, "Vencimento");
      if (Object.hasOwn(values, "valorTotal")) {
        if (values.valorTotal == null)
          throw falha("Valor do documento obrigatório.");
        const c = centavos(values.valorTotal);
        if (!c) throw falha("Informe um valor maior que zero.");
        if (anterior && c < centavos(anterior.valorPago))
          throw falha(
            "Valor do documento não pode ficar abaixo do valor já pago.",
            409,
          );
        values.valorTotal = c / 100;
      }
      if (
        row &&
        quitado(row.situacao) &&
        values.valorTotal != null &&
        centavos(values.valorTotal) !== centavos(row.valorTotal)
      )
        throw falha(
          "Documento quitado: confira o estorno antes de alterar o valor.",
          409,
        );
      if (!row) {
        if (!String(values.fornecedor || "").trim())
          throw falha("Informe o fornecedor ou a descrição da conta.");
        if (!values.dataEntrada) throw falha("Informe o vencimento.");
        const total = centavos(values.valorTotal ?? body.valor ?? 0);
        if (!total) throw falha("Informe um valor maior que zero.");
        const parcelas = Number(body.parcelas ?? 1);
        if (
          !Number.isSafeInteger(parcelas) ||
          parcelas < 1 ||
          parcelas > 120 ||
          parcelas > total
        )
          throw falha("Número de parcelas inválido.");
        if (pagando && parcelas > 1)
          throw falha(
            "Cadastre as parcelas e selecione os documentos para pagar.",
          );
        const created = [],
          base = Math.floor(total / parcelas),
          resto = total % parcelas;
        for (let i = 0; i < parcelas; i++) {
          const v = {
            ...values,
            empresa_id: emp,
            dataEmissao: values.dataEmissao || diaBrasil(agora()),
            numero:
              String(values.numero || "M-" + crypto.randomUUID()) +
              (parcelas > 1 ? "/" + (i + 1) + "-" + parcelas : ""),
            valorTotal: (base + (i < resto ? 1 : 0)) / 100,
            dataEntrada: meses(values.dataEntrada, i),
            situacao: "concluido",
            itens: [],
            pagamentos: [],
          };
          const r = await Entrada.create(v, { fields, transaction });
          created.push(financeiro(r));
          if (i === 0) row = r;
        }
        if (parcelas > 1)
          return {
            ...created[0],
            documentos: created,
            parcelasCriadas: created.length,
            financeiro: true,
            estoqueAlterado: false,
          };
      } else {
        if (
          Object.hasOwn(body, "situacao") &&
          !pagando &&
          ["pago", "parcial"].includes(normal(body.situacao))
        )
          throw falha("Informe os pagamentos para registrar a baixa.");
        if (Object.keys(values).length) {
          await row.update(values, { fields, transaction });
          if (
            normal(row.situacao) === "parcial" &&
            financeiro(row).saldoPendente === 0
          )
            await row.update(
              { situacao: "pago" },
              { fields: ["situacao"], transaction },
            );
        }
      }
      if (pagando) {
        const key = String(body.loteFinanceiro || crypto.randomUUID());
        if (!/^[a-zA-Z0-9:_-]{1,160}$/.test(key))
          throw falha("Identificador de pagamento inválido.");
        const r = financeiro(row),
          antigos = array(row.pagamentos);
        if (
          antigos.some((p) => p.baixaFinanceira && p.loteFinanceiro === key)
        ) {
          const canon = (ps) =>
            JSON.stringify(ps.map((p) => [normal(p.forma), centavos(p.valor)]));
          if (
            canon(
              antigos.filter(
                (p) => p.baixaFinanceira && p.loteFinanceiro === key,
              ),
            ) !== canon(body.pagamentos)
          )
            throw falha(
              "Este identificador já foi usado em outro pagamento.",
              409,
            );
          return { ...r, financeiro: true, estoqueAlterado: false };
        }
        const formas = [
          "dinheiro",
          "debito",
          "credito",
          "pix",
          "boleto",
          "transferencia",
          "cheque",
          "outros",
        ];
        const novos = body.pagamentos.map((p) => {
          const c = centavos(p.valor);
          if (!c || !formas.includes(normal(p.forma)))
            throw falha("Forma ou valor do pagamento inválido.");
          return {
            ...p,
            valor: c / 100,
            forma: normal(p.forma),
            data: data(body.dataPagamento || diaBrasil(agora()), "Pagamento"),
            baixaFinanceira: true,
            loteFinanceiro: key,
          };
        });
        const soma = novos.reduce((n, p) => n + centavos(p.valor), 0);
        if (soma > centavos(r.saldoPendente))
          throw falha(
            "Pagamento excede o saldo pendente. Atualize o documento.",
            409,
          );
        await row.update(
          {
            pagamentos: [...antigos, ...novos],
            dataPagamento: novos[0].data,
            situacao: soma === centavos(r.saldoPendente) ? "pago" : "parcial",
          },
          { fields, transaction },
        );
      }
      return { ...financeiro(row), financeiro: true, estoqueAlterado: false };
    });
  }
  async function excluir(emp, id) {
    emp = empresa(emp);
    return sequelize.transaction(async (transaction) => {
      const row = await registro(id, emp, transaction, true),
        r = financeiro(row);
      if (cancelado(row.situacao)) return { success: true, excluido: true };
      if (r.valorPago > 0 || quitado(row.situacao))
        throw falha(
          "Documento com pagamento não pode ser excluído. Confira o estorno financeiro antes de continuar.",
          409,
        );
      await row.update(
        { situacao: "excluido" },
        { fields: ["situacao"], transaction },
      );
      return { success: true, excluido: true };
    });
  }
  async function agrupar(emp, { inicio, fim, tipo }) {
    const de = data(inicio),
      ate = data(fim),
      rows = await listar(
        emp,
        tipo === "pendentes" ? { inicio: de, fim: ate } : {},
      ),
      map = new Map();
    const add = (dia, valor) => {
      if (dia && dia >= de && dia <= ate)
        map.set(dia, (map.get(dia) || 0) + centavos(valor));
    };
    for (const r of rows) {
      if (r.situacaoFinanceira === "cancelado") continue;
      if (tipo === "pendentes") {
        if (r.saldoPendente > 0) add(r.vencimento, r.saldoPendente);
      } else {
        const ps = r.pagamentos.filter((p) => p.baixaFinanceira === true);
        if (ps.length) ps.forEach((p) => add(data(p.data), p.valor));
        else if (quitado(r.situacao) && r.dataPagamento)
          add(data(r.dataPagamento), r.valorTotal);
      }
    }
    return [...map]
      .map(([dia, total]) => ({ dia, total: total / 100 }))
      .sort((a, b) => a.dia.localeCompare(b.dia));
  }
  async function resumo(emp, h = diaBrasil(agora())) {
    const hoje = data(h),
      d = new Date(hoje + "T12:00:00Z"),
      semana = new Date(d);
    semana.setUTCDate(d.getUTCDate() - d.getUTCDay());
    const iniSem = semana.toISOString().slice(0, 10),
      fimSem = new Date(+semana + 6 * 86400000).toISOString().slice(0, 10),
      iniProxSem = new Date(+semana + 7 * 86400000).toISOString().slice(0, 10),
      fimProxSem = new Date(+semana + 13 * 86400000).toISOString().slice(0, 10);
    const iniMes = hoje.slice(0, 7) + "-01",
      proxMes = meses(iniMes, 1),
      depois = meses(iniMes, 2);
    const r = {
      hoje: 0,
      essaSemana: 0,
      proximaSemana: 0,
      esseMes: 0,
      proximoMes: 0,
      atrasado: 0,
      geral: 0,
    };
    for (const c of await listar(emp)) {
      if (c.saldoPendente <= 0 || !c.vencimento) continue;
      const v = centavos(c.saldoPendente),
        x = c.vencimento;
      r.geral += v;
      if (x === hoje) r.hoje += v;
      if (x >= iniSem && x <= fimSem) r.essaSemana += v;
      if (x >= iniProxSem && x <= fimProxSem) r.proximaSemana += v;
      if (x >= iniMes && x < proxMes) r.esseMes += v;
      if (x >= proxMes && x < depois) r.proximoMes += v;
      if (x < hoje) r.atrasado += v;
    }
    return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v / 100]));
  }
  return {
    atributos,
    registro,
    listar,
    hoje,
    salvar,
    excluir,
    agrupar,
    resumo,
    limparSchema: () => (schemaCache = null),
  };
}
let singleton;
module.exports = {
  criar,
  diaBrasil,
  data,
  meses,
  financeiro,
  centavos,
  normal,
  quitado,
  cancelado,
  instancia: () => (singleton ||= criar(require("../models"))),
};
