"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path");
const { Sequelize } = require("sequelize"),
  express = require("express");
const service = require("../backend/services/contasPagar"),
  PF = require("../frontend/components/contas-pagar");
function load(name, stubs = {}) {
  const file = path.resolve(__dirname, "..", name),
    module = { exports: {} };
  const real = require("node:module").createRequire(file);
  vm.runInNewContext(fs.readFileSync(file, "utf8"), {
    module,
    exports: module.exports,
    require: (n) => (Object.hasOwn(stubs, n) ? stubs[n] : real(n)),
    console,
    process,
    Buffer,
    setTimeout,
    clearTimeout,
    __dirname: path.dirname(file),
  });
  return module.exports;
}
async function fixture(t, { old = false } = {}) {
  const db = new Sequelize({
    dialect: "sqlite",
    storage: ":memory:",
    logging: false,
    dialectModule: require("./helpers/sqlite-caixa"),
  });
  const transaction = db.transaction.bind(db);
  let tail = Promise.resolve();
  db.transaction = (...a) => {
    const p = tail.then(() => transaction(...a));
    tail = p.catch(() => {});
    return p;
  };
  const Entrada = load("backend/models/Entrada.js", {
      "./Cliente": { sequelize: db },
    }),
    Produto = load("backend/models/Produto.js", {
      "./Cliente": { sequelize: db },
    }),
    Saida = load("backend/models/Saida.js", { "./Cliente": { sequelize: db } }),
    HistoricoEstoque = load("backend/models/HistoricoEstoque.js", {
      "./Cliente": { sequelize: db },
    });
  await db.sync();
  if (old)
    await db
      .getQueryInterface()
      .removeColumn(Entrada.getTableName(), "estoqueProcessado");
  const f = service.criar({
    Entrada,
    agora: () => new Date("2026-11-26T16:00:00Z"),
  });
  t.after(() => db.close());
  const create = (emp = 1, body = {}) =>
    f.salvar(emp, {
      fornecedor: "Fornecedor real de teste",
      valorTotal: 100,
      dataEntrada: "2026-11-26",
      ...body,
    });
  return { db, Entrada, Produto, Saida, HistoricoEstoque, f, create };
}
async function server(t, f) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = { empresaId: Number(req.get("X-Empresa") || 1) };
    next();
  });
  app.use(
    "/api",
    require("../backend/routes/movimentacoesEstoqueRoutes").criarRotas(f),
  );
  const controller = load("backend/controllers/dashboardController.js", {
    "../models": f,
    "../services/contasPagar": { instancia: () => f.f },
  });
  app.get("/api/dashboard/contas-a-pagar-hoje", controller.contasAPagarHoje);
  const srv = app.listen(0, "127.0.0.1");
  await new Promise((r) => srv.once("listening", r));
  t.after(() => new Promise((r) => srv.close(r)));
  return async (url, opts = {}) => {
    const response = await fetch(
      "http://127.0.0.1:" + srv.address().port + url,
      {
        ...opts,
        headers: { "Content-Type": "application/json", ...opts.headers },
        ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
      },
    );
    return { status: response.status, body: await response.json() };
  };
}
test("Reproduz SELECT completo quebrado pelo campo de estoque ausente; fluxo financeiro funciona sem migration", async (t) => {
  const f = await fixture(t, { old: true });
  await assert.rejects(f.Entrada.findAll(), /estoqueProcessado/);
  const row = await f.create();
  assert.equal(row.valorTotal, 100);
  assert.equal((await f.f.hoje(1)).length, 1);
  const p = await f.f.salvar(
    1,
    { pagamentos: [{ forma: "pix", valor: 20 }], loteFinanceiro: "old-1" },
    row.id,
  );
  assert.equal(p.saldoPendente, 80);
  assert.equal(p.situacao, "parcial");
});
test("Endpoint HTTP 200 vazio; vencimentos hoje, futuros, pagos, cancelados e isolamento inclusive empresa NULL", async (t) => {
  const f = await fixture(t),
    req = await server(t, f);
  assert.deepEqual(await req("/api/dashboard/contas-a-pagar-hoje"), {
    status: 200,
    body: [],
  });
  for (let i = 0; i < 25; i++) await f.create();
  await f.create(1, { dataEntrada: "2026-11-27" });
  await f.create(2);
  await f.Entrada.create({
    empresa_id: null,
    valorTotal: 200,
    dataEntrada: "2026-11-26",
    situacao: "concluido",
  });
  const quitada = await f.create();
  await f.f.salvar(
    1,
    { pagamentos: [{ forma: "pix", valor: 100 }] },
    quitada.id,
  );
  const excluida = await f.create();
  await f.f.excluir(1, excluida.id);
  const r = await req("/api/dashboard/contas-a-pagar-hoje");
  assert.equal(r.status, 200);
  assert.equal(r.body.length, 25);
  assert.ok(
    r.body.every((x) => x.empresa_id === 1 && x.dataEntrada === "2026-11-26"),
  );
  assert.equal(
    (
      await req("/api/dashboard/contas-a-pagar-hoje", {
        headers: { "X-Empresa": "2" },
      })
    ).body.length,
    1,
  );
  assert.equal(
    (
      await req("/api/dashboard/contas-a-pagar-hoje", {
        headers: { "X-Empresa": "0" },
      })
    ).status,
    403,
  );
});
test("CRUD financeiro via rotas existentes não exige itens e preserva estoque; edição e persistência após pagamento parcial", async (t) => {
  const f = await fixture(t),
    req = await server(t, f);
  await f.Produto.create({
    id: "kg",
    nome: "Ração KG",
    empresa_id: 1,
    estoqueAtual: 15,
    unidade: "KG",
  });
  const r = await req("/api/entrada/manual?financeiro=1", {
    method: "POST",
    body: { fornecedor: "Conta", valorTotal: 100, dataEntrada: "2026-11-26" },
  });
  assert.equal(r.status, 201, JSON.stringify(r));
  const id = r.body.id;
  assert.equal(
    (
      await req("/api/entrada/manual/" + id + "?financeiro=1", {
        method: "PUT",
        body: { valorTotal: 120, fornecedor: "Conta editada" },
      })
    ).status,
    200,
  );
  const p = await req("/api/entrada/manual/" + id + "?financeiro=1", {
    method: "PUT",
    body: {
      pagamentos: [{ forma: "pix", valor: 30 }],
      loteFinanceiro: "http-1",
    },
  });
  assert.equal(p.body.saldoPendente, 90);
  assert.equal(
    (await req("/api/entrada/manual?financeiro=1")).body[0].saldoPendente,
    90,
  );
  assert.equal(Number((await f.Produto.findByPk("kg")).estoqueAtual), 15);
  assert.equal(await f.HistoricoEstoque.count(), 0);
  assert.equal(
    (
      await req("/api/entrada/manual/" + id + "?financeiro=1", {
        method: "DELETE",
      })
    ).status,
    409,
  );
});
test("Documento de compra finalizado pode receber baixa/edição financeira sem alterar itens, estoque ou marcador", async (t) => {
  const f = await fixture(t);
  const row = await f.Entrada.create({
    empresa_id: 1,
    fornecedor: "Compra",
    valorTotal: 50,
    dataEntrada: "2026-11-26",
    situacao: "concluido",
    estoqueProcessado: true,
    itens: [{ id: "x", quantidade: 5 }],
  });
  await f.f.salvar(1, { fornecedor: "Compra corrigida" }, row.id);
  await f.f.salvar(1, { pagamentos: [{ forma: "pix", valor: 50 }] }, row.id);
  const p = await f.Entrada.findByPk(row.id);
  assert.equal(p.estoqueProcessado, true);
  assert.equal(p.itens[0].quantidade, 5);
  assert.equal(p.situacao, "pago");
});
test("Pagamentos parciais, quitação, excesso, edição abaixo do pago e repetição da requisição", async (t) => {
  const { f, create } = await fixture(t);
  const a = await create();
  let r = await f.salvar(
    1,
    {
      pagamentos: [{ forma: "dinheiro", valor: 20 }],
      loteFinanceiro: "lote-1",
      dataPagamento: "2026-11-25",
    },
    a.id,
  );
  assert.equal(r.saldoPendente, 80);
  r = await f.salvar(
    1,
    {
      pagamentos: [{ forma: "dinheiro", valor: 20 }],
      loteFinanceiro: "lote-1",
    },
    a.id,
  );
  assert.equal(r.saldoPendente, 80);
  await assert.rejects(
    f.salvar(1, { pagamentos: [{ forma: "pix", valor: 81 }] }, a.id),
    /excede/,
  );
  await assert.rejects(f.salvar(1, { valorTotal: 19 }, a.id), /abaixo/);
  r = await f.salvar(
    1,
    {
      pagamentos: [{ forma: "pix", valor: 80 }],
      loteFinanceiro: "lote-2",
      dataPagamento: "2026-12-01",
    },
    a.id,
  );
  assert.equal(r.situacao, "pago");
  assert.equal(r.valorPago, 100);
  assert.equal((await f.hoje(1)).length, 0);
  assert.deepEqual(
    await f.agrupar(1, {
      inicio: "2026-11-01",
      fim: "2026-11-30",
      tipo: "pagos",
    }),
    [{ dia: "2026-11-25", total: 20 }],
  );
  assert.deepEqual(
    await f.agrupar(1, {
      inicio: "2026-12-01",
      fim: "2026-12-31",
      tipo: "pagos",
    }),
    [{ dia: "2026-12-01", total: 80 }],
  );
});
test("Bloqueia alteração e leitura de conta de outra empresa em todas as operações", async (t) => {
  const fx = await fixture(t),
    { f, create } = fx,
    req = await server(t, fx),
    r = await create(2);
  for (const op of [
    () => f.salvar(1, { valorTotal: 1 }, r.id),
    () => f.excluir(1, r.id),
    () => f.registro(r.id, 1),
  ])
    await assert.rejects(op, /não encontrado/);
  for (const method of ["GET", "PUT", "DELETE"])
    assert.equal(
      (
        await req("/api/entrada/manual/" + r.id + "?financeiro=1", {
          method,
          ...(method === "PUT" ? { body: { valorTotal: 1 } } : {}),
        })
      ).status,
      404,
    );
  assert.equal((await f.listar(2))[0].valorTotal, 100);
});
test("Exclusão financeira é lógica e idempotente; nunca destrói o documento ou seus itens", async (t) => {
  const { f, create, Entrada } = await fixture(t);
  const a = await create();
  await f.excluir(1, a.id);
  await f.excluir(1, a.id);
  assert.equal(await Entrada.count(), 1);
  assert.equal((await Entrada.findByPk(a.id)).situacao, "excluido");
  assert.equal((await f.hoje(1)).length, 0);
  await assert.rejects(f.salvar(1, { valorTotal: 10 }, a.id), /excluído/);
});
test("Parcelamento mensal conserva centavos e dia original após fevereiro; não altera outras empresas", async (t) => {
  const { f, create } = await fixture(t);
  const a = await create(2, {
    valorTotal: "100,00",
    parcelas: 3,
    dataEntrada: "2027-01-31",
  });
  assert.deepEqual(
    a.documentos.map((x) => x.valorTotal),
    [33.34, 33.33, 33.33],
  );
  assert.deepEqual(
    a.documentos.map((x) => x.dataEntrada),
    ["2027-01-31", "2027-02-28", "2027-03-31"],
  );
  assert.equal((await f.listar(1)).length, 0);
  assert.equal((await f.listar(2)).length, 3);
});
test("Resumo financeiro usa vencimento DATEONLY e saldo parcial, inclui pendente junto com concluído", async (t) => {
  const { f, create } = await fixture(t);
  const a = await create();
  await f.salvar(1, { pagamentos: [{ forma: "pix", valor: 25 }] }, a.id);
  await create(1, { dataEntrada: "2026-11-25", valorTotal: 20 });
  await create(1, { dataEntrada: "2026-12-01", valorTotal: 50 });
  const r = await f.resumo(1, "2026-11-26");
  assert.equal(r.hoje, 75);
  assert.equal(r.atrasado, 20);
  assert.equal(r.geral, 145);
  assert.equal(r.proximoMes, 50);
  assert.deepEqual(
    await f.agrupar(1, {
      inicio: "2026-11-26",
      fim: "2026-11-26",
      tipo: "pendentes",
    }),
    [{ dia: "2026-11-26", total: 75 }],
  );
});
test("Pagamentos previstos numa compra não são baixas; histórico pago antigo continua compatível", async (t) => {
  const { f, Entrada } = await fixture(t);
  await Entrada.create({
    empresa_id: 1,
    fornecedor: "Compra",
    valorTotal: 100,
    situacao: "concluido",
    dataEntrada: "2026-11-26",
    pagamentos: [{ forma: "boleto", valor: 100 }],
  });
  await Entrada.create({
    empresa_id: 1,
    fornecedor: "Antiga",
    valorTotal: 50,
    situacao: "pago",
    dataEntrada: "2026-11-26",
    dataPagamento: "2026-11-26",
    pagamentos: [{ forma: "pix", valor: 50 }],
  });
  assert.equal((await f.hoje(1)).length, 1);
  assert.equal((await f.hoje(1))[0].saldoPendente, 100);
  assert.deepEqual(
    await f.agrupar(1, {
      inicio: "2026-11-26",
      fim: "2026-11-26",
      tipo: "pagos",
    }),
    [{ dia: "2026-11-26", total: 50 }],
  );
});
test("Brasília antes/depois da meia-noite, datas e valores inválidos", async (t) => {
  assert.equal(
    service.diaBrasil(new Date("2026-11-26T02:59:59Z")),
    "2026-11-25",
  );
  assert.equal(
    service.diaBrasil(new Date("2026-11-26T03:00:00Z")),
    "2026-11-26",
  );
  assert.equal(PF.diaBrasil(new Date("2026-11-26T02:59:59Z")), "2026-11-25");
  const { create } = await fixture(t);
  await assert.rejects(create(1, { dataEntrada: "2026-02-30" }), /inválida/);
  await assert.rejects(create(1, { valorTotal: -1 }), /inválido/);
  await assert.rejects(create(1, { valorTotal: 10000000000 }), /inválido/);
});
test("Rateio de vários documentos e formas mantém exatamente o valor uma única vez", () => {
  const r = PF.ratear(
    [
      { id: 1, saldoPendente: 100 },
      { id: 2, saldoPendente: 50 },
    ],
    [
      { forma: "pix", valor: 120 },
      { forma: "dinheiro", valor: 30 },
    ],
  );
  assert.deepEqual(r, [
    { id: "1", pagamentos: [{ forma: "pix", valor: 100 }] },
    {
      id: "2",
      pagamentos: [
        { forma: "pix", valor: 20 },
        { forma: "dinheiro", valor: 30 },
      ],
    },
  ]);
  assert.deepEqual(
    PF.ratear(
      [
        { id: 1, saldoPendente: 1 },
        { id: 2, saldoPendente: 1 },
      ],
      [{ forma: "pix", valor: "1,01" }],
    ).map((x) => x.pagamentos[0].valor),
    [1, 0.01],
  );
  assert.throws(
    () =>
      PF.ratear([{ id: 1, saldoPendente: 1 }], [{ forma: "pix", valor: 2 }]),
    /excede/,
  );
});
test("Frontend não trata HTTP de erro ou HTML como sucesso", async () => {
  await assert.rejects(
    PF.resposta({
      ok: false,
      status: 409,
      json: async () => ({ erro: "Saldo alterado" }),
    }),
    /Saldo alterado/,
  );
  await assert.rejects(
    PF.resposta({
      ok: false,
      status: 500,
      json: async () => {
        throw Error("HTML");
      },
    }),
    /500/,
  );
  assert.equal(PF.escape('<script>"&'), "&lt;script&gt;&quot;&amp;");
});

test("Valores e datas nulos não apagam a dívida; pago não pode aumentar sem estorno; lote não pode mudar de valor", async (t) => {
  const { f, create } = await fixture(t);
  const r = await create();
  await f.salvar(
    1,
    { pagamentos: [{ forma: "pix", valor: 25 }], loteFinanceiro: "fixo" },
    r.id,
  );
  await assert.rejects(f.salvar(1, { valorTotal: null }, r.id), /obrigatório/);
  await assert.rejects(f.salvar(1, { dataEntrada: null }, r.id), /inválida/);
  await assert.rejects(
    f.salvar(
      1,
      { pagamentos: [{ forma: "pix", valor: 30 }], loteFinanceiro: "fixo" },
      r.id,
    ),
    /identificador/,
  );
  const p = await f.salvar(1, { valorTotal: 25 }, r.id);
  assert.equal(p.situacao, "pago");
  await assert.rejects(f.salvar(1, { valorTotal: 30 }, r.id), /quitado/);
});

test("Tela real renderiza saldo parcial, escapa fornecedor e recarrega dados persistidos por HTTP", async (t) => {
  const { JSDOM } = require("jsdom"),
    f = await fixture(t),
    req = await server(t, f);
  const row = await f.create(1, {
    fornecedor: "Fornecedor <script>indesejado</script>",
  });
  await f.f.salvar(1, { pagamentos: [{ forma: "pix", valor: 25 }] }, row.id);
  const dir = path.resolve(
    __dirname,
    "../frontend/financeiro/contas-a-receber/contas-a-pagar",
  );
  const dom = new JSDOM(
    fs.readFileSync(path.join(dir, "pagamento-fornecedor.html"), "utf8"),
    {
      pretendToBeVisual: true,
      runScripts: "outside-only",
      url: "https://pethub.example/financeiro/contas-a-receber/contas-a-pagar/pagamento-fornecedor.html",
    },
  );
  t.after(() => dom.window.close());
  const w = dom.window;
  await new Promise((r) => w.addEventListener("load", r, { once: true }));
  w.fetch = async (url, opt = {}) => {
    if (String(url).startsWith("/api/entrada/manual")) {
      const r = await req(url, opt);
      return { ok: r.status < 400, status: r.status, json: async () => r.body };
    }
    return { ok: true, status: 200, json: async () => [] };
  };
  w.console = { log() {}, warn() {}, error() {} };
  w.eval(
    fs.readFileSync(
      path.resolve(__dirname, "../frontend/components/venda-calculos.js"),
      "utf8",
    ),
  );
  w.eval(
    fs.readFileSync(
      path.resolve(__dirname, "../frontend/components/contas-pagar.js"),
      "utf8",
    ),
  );
  w.eval(fs.readFileSync(path.join(dir, "pagamento-fornecedor.js"), "utf8"));
  await w.inicializarPagamentos();
  let tbody = w.document.getElementById("tabelaPagamentosBody");
  assert.match(tbody.textContent, /75,00/);
  assert.ok(tbody.textContent.includes("<script>indesejado</script>"));
  assert.equal(tbody.querySelector("script"), null);
  await w.carregarDocumentos();
  assert.match(tbody.textContent, /75,00/);
  w.fetch = async () => ({
    ok: false,
    status: 500,
    json: async () => ({ erro: "Falha do banco" }),
  });
  await w.carregarDocumentos();
  assert.match(tbody.textContent, /status 500/);
  assert.doesNotMatch(tbody.textContent, /Nenhum documento/);
});

test("Pagamento na interface envia rateio correto e não mostra sucesso quando servidor rejeita; retry não duplica baixa", async (t) => {
  const { JSDOM } = require("jsdom"),
    f = await fixture(t),
    req = await server(t, f);
  const a = await f.create(),
    b = await f.create(1, { valorTotal: 50 });
  const dir = path.resolve(
    __dirname,
    "../frontend/financeiro/contas-a-receber/contas-a-pagar",
  );
  const dom = new JSDOM(
    fs.readFileSync(path.join(dir, "pagamento-fornecedor.html"), "utf8"),
    {
      pretendToBeVisual: true,
      runScripts: "outside-only",
      url: "https://pethub.example/financeiro/pagamento-fornecedor.html",
    },
  );
  t.after(() => dom.window.close());
  const w = dom.window;
  await new Promise((r) => w.addEventListener("load", r, { once: true }));
  w.console = { log() {}, warn() {}, error() {} };
  let failSecond = true;
  const puts = [];
  w.fetch = async (url, opt = {}) => {
    if (String(url).startsWith("/api/entrada/manual")) {
      if (opt.method === "PUT") {
        puts.push({ url, body: JSON.parse(opt.body) });
        if (failSecond && url.includes("/" + b.id + "?"))
          return {
            ok: false,
            status: 409,
            json: async () => ({ erro: "Rejeição deliberada do teste" }),
          };
      }
      const r = await req(url, {
        ...opt,
        ...(opt.body ? { body: JSON.parse(opt.body) } : {}),
      });
      return { ok: r.status < 400, status: r.status, json: async () => r.body };
    }
    return { ok: true, status: 200, json: async () => [] };
  };
  for (const file of [
    "frontend/components/venda-calculos.js",
    "frontend/components/contas-pagar.js",
    "frontend/financeiro/contas-a-receber/contas-a-pagar/pagamento-fornecedor.js",
  ])
    w.eval(fs.readFileSync(path.resolve(__dirname, "..", file), "utf8"));
  await w.inicializarPagamentos();
  for (const cb of w.document.querySelectorAll(".checkbox-documento")) {
    cb.checked = true;
    cb.dispatchEvent(new w.Event("change"));
  }
  w.abrirModalPagamento();
  const pix =
    w.document.querySelector('[data-pf="pix"]') ||
    w.document.querySelector('[data-forma="pix"]');
  // Existing payment buttons use data-pf-forma.
  const button =
    pix ||
    [...w.document.querySelectorAll("[data-pf-forma]")].find(
      (b) => b.getAttribute("data-pf-forma") === "pix",
    );
  assert.ok(button, "botão Pix existente");
  button.click();
  const input = w.document.querySelector('[data-pf-c="pix"] .pf-valor-input');
  input.value = "150";
  w.document.querySelector(".pf-finalizar-btn").click();
  async function until(fn) {
    for (let i = 0; i < 80; i++) {
      if (fn()) return;
      await new Promise((r) => setTimeout(r, 10));
    }
    assert.fail("operação não concluiu");
  }
  await until(
    () =>
      w.document.querySelector(".pf-finalizar-btn")?.textContent ===
      "Tentar novamente",
  );
  assert.ok(w.document.body.textContent.includes("Rejeição deliberada"));
  assert.ok(
    !w.document.body.textContent.includes("Pagamento registrado com sucesso!"),
  );
  assert.equal((await f.f.listar(1)).find((x) => x.id === a.id).valorPago, 100);
  failSecond = false;
  w.document.querySelector(".pf-finalizar-btn").click();
  await until(() =>
    w.document.body.textContent.includes("Pagamento registrado com sucesso!"),
  );
  const rows = await f.f.listar(1);
  assert.equal(rows.find((x) => x.id === a.id).valorPago, 100);
  assert.equal(rows.find((x) => x.id === b.id).valorPago, 50);
  assert.equal(rows.find((x) => x.id === a.id).pagamentos.length, 1);
  assert.equal(puts[0].body.pagamentos[0].valor, 100);
  assert.equal(puts[1].body.pagamentos[0].valor, 50);
  assert.equal(puts[0].body.loteFinanceiro, puts[2].body.loteFinanceiro);
});

test("Integração HTTP do painel financeiro: resumo, calendário, gráfico, fluxo e pagamentos usam saldos e baixas reais", async (t) => {
  const f = await fixture(t);
  const row = await f.create(1, { valorTotal: 100 });
  await f.f.salvar(
    1,
    { pagamentos: [{ forma: "pix", valor: 25 }], dataPagamento: "2026-11-26" },
    row.id,
  );
  await f.create(2, { valorTotal: 900 });
  // Outros módulos são isolados nesta integração; contas a pagar executa SQL real em SQLite.
  const vazio = { findAll: async () => [], sum: async () => 0 };
  const router = load("backend/routes/painelFinanceiroRoutes.js", {
    "../middleware/authUser": {
      authUser: (req, res, next) => {
        req.user = { empresaId: 1 };
        next();
      },
    },
    "../models/Venda": { Venda: vazio },
    "../models/Agendamento": { Agendamento: vazio },
    "../models/MovimentoCaixa": { MovimentoCaixa: vazio },
    "../models/ContaReceber": vazio,
    "../models/Cliente": { sequelize: f.db },
    "../services/contasPagar": {
      ...service,
      diaBrasil: () => "2026-11-26",
      instancia: () => f.f,
    },
  });
  const app = express();
  app.use("/api/painel-financeiro", router);
  const srv = app.listen(0, "127.0.0.1");
  await new Promise((r) => srv.once("listening", r));
  t.after(() => new Promise((r) => srv.close(r)));
  const get = async (url) => {
    const r = await fetch(
      "http://127.0.0.1:" + srv.address().port + "/api/painel-financeiro" + url,
    );
    assert.equal(r.status, 200, url);
    return r.json();
  };
  const resumo = await get("/resumo");
  assert.equal(resumo.pagar.hoje, 75);
  assert.equal(resumo.pagar.geral, 75);
  const calendario = await get("/calendario?mes=11&ano=2026");
  assert.equal(
    calendario.dias.find((x) => x.dataStr === "2026-11-26").saidas,
    25,
  );
  const grafico = await get("/grafico?mes=11&ano=2026");
  assert.equal(grafico.aPagar[25], 100);
  const fluxo = await get("/fluxo-caixa?mes=11&ano=2026");
  assert.equal(fluxo.linhas.saidas[25], 25);
  const pagamentos = await get("/pagamentos-recebimentos?data=2026-11");
  assert.equal(pagamentos.pagamentos["2026-11-26"], 100);
  assert.ok(!JSON.stringify(pagamentos.pagamentos).includes("900"));
});

test("Duas baixas concorrentes não excedem a dívida; transação com saldo desatualizado é rejeitada", async (t) => {
  const { f, create } = await fixture(t);
  const row = await create();
  const results = await Promise.allSettled([
    f.salvar(
      1,
      { pagamentos: [{ forma: "pix", valor: 70 }], loteFinanceiro: "a" },
      row.id,
    ),
    f.salvar(
      1,
      { pagamentos: [{ forma: "pix", valor: 70 }], loteFinanceiro: "b" },
      row.id,
    ),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal((await f.listar(1))[0].saldoPendente, 30);
});

test("Schema financeiro realmente incompleto retorna diagnóstico 503 em vez de exibir lista vazia", async (t) => {
  const f = await fixture(t);
  await f.db
    .getQueryInterface()
    .removeColumn(f.Entrada.getTableName(), "dataEntrada");
  const req = await server(t, f);
  const r = await req("/api/dashboard/contas-a-pagar-hoje");
  assert.equal(r.status, 503);
  assert.match(r.body.erro, /dataEntrada/);
  assert.equal(r.body.stack, undefined);
});

test("Card mantém estrutura visual e mostra descrição, vencimento e saldo; ausência gera mensagem informativa", async (t) => {
  const { JSDOM } = require("jsdom");
  const dom = new JSDOM('<div id="contasContent"></div>');
  t.after(() => dom.window.close());
  const s = fs.readFileSync(
    path.resolve(__dirname, "../frontend/dashboard.js"),
    "utf8",
  );
  const a = s.indexOf("  async loadContasAPagar()"),
    b = s.indexOf("  // === ESTOQUE BAIXO", a);
  const obj = vm.runInNewContext("({" + s.slice(a, b) + "})", {
    document: dom.window.document,
    console,
  });
  obj.escapeHtml = PF.escape;
  obj.formatCurrency = (v) =>
    Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  obj.emptyHTML = (m) => "<p>" + m + "</p>";
  obj.errorHTML = (m) => "<p>" + m + "</p>";
  obj.apiFetch = async () => [
    {
      fornecedor: "Fornecedor",
      descricao: "Aluguel <loja>",
      numero: "123",
      dataEntrada: "2026-11-26",
      situacaoFinanceira: "parcial",
      saldoPendente: 75,
      valorTotal: 100,
    },
  ];
  await obj.loadContasAPagar();
  const el = dom.window.document.getElementById("contasContent");
  assert.ok(el.querySelector(".widget-list-item.conta-item"));
  assert.ok(el.textContent.includes("26/11/2026"));
  assert.ok(el.textContent.includes("75,00"));
  assert.ok(el.textContent.includes("Aluguel <loja>"));
  assert.equal(el.querySelector("loja"), null);
  obj.apiFetch = async () => [];
  await obj.loadContasAPagar();
  assert.match(el.textContent, /Nenhuma conta a pagar com vencimento hoje/);
});
