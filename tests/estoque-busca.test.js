"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { Sequelize, DataTypes: D } = require("sequelize"),
  { JSDOM, VirtualConsole } = require("jsdom");
const { condicaoBuscaItens } = require("../backend/services/buscaItens");
const wait = (ms = 30) => new Promise((r) => setTimeout(r, ms));
test("busca SQL não depende de collation e mantém produtos zerados da empresa", async (t) => {
  const db = new Sequelize({
    dialect: "sqlite",
    storage: ":memory:",
    logging: false,
    dialectModule: require("./helpers/sqlite-caixa"),
  });
  t.after(() => db.close());
  const Produto = db.define("Produto", {
    id: { type: D.STRING, primaryKey: true },
    nome: D.STRING,
    codigo: D.STRING,
    codigoBarras: D.STRING,
    estoqueAtual: D.INTEGER,
    empresa_id: D.INTEGER,
  });
  await db.sync();
  await db.query("PRAGMA case_sensitive_like = ON");
  await Produto.bulkCreate([
    { id: "1", nome: "Banho", empresa_id: 1, estoqueAtual: 0 },
    {
      id: "2",
      nome: "HOT CAT PEIXE 20KG",
      codigo: "ABC",
      codigoBarras: "789001",
      empresa_id: 1,
      estoqueAtual: 5,
    },
    { id: "3", nome: "MAGNUS 15KG", empresa_id: 1, estoqueAtual: 0 },
    { id: "4", nome: "RACAO OUTRA EMPRESA", empresa_id: 2, estoqueAtual: 9 },
  ]);
  const find = (q) =>
    Produto.findAll({ where: { empresa_id: 1, ...condicaoBuscaItens(q) } });
  assert.equal((await find("a")).length, 3);
  assert.equal((await find("HOT cat")).length, 1);
  assert.equal((await find("abc"))[0].id, "2");
  assert.equal((await find("789001"))[0].id, "2");
  assert.equal((await find("3"))[0].estoqueAtual, 0);
});
async function tela(t, tipo) {
  const file = path.join(__dirname, "../frontend/item/estoque/outras-" + tipo),
    errors = [],
    alerts = [],
    calls = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(e.message));
  const dom = new JSDOM(fs.readFileSync(file + ".html", "utf8"), {
      url: "https://pethub.test/item/estoque/outras-" + tipo + ".html",
      runScripts: "outside-only",
      pretendToBeVisual: true,
      virtualConsole: vc,
    }),
    w = dom.window,
    d = w.document;
  t.after(() => w.close());
  w.alert = (m) => alerts.push(m);
  w.confirm = () => true;
  w.scrollTo = () => {};
  const produtos = [
    {
      id: "2",
      nome: "HOT CAT PEIXE 20KG",
      codigo: "HOT",
      estoqueAtual: 2,
      custoBase: 10,
    },
    { id: "3", nome: "MAGNUS 15KG", estoqueAtual: 0, custoBase: 5 },
    { id: "1", nome: "Banho", estoqueAtual: 0, custoBase: 5 },
  ];
  w.fetch = async (url, op = {}) => {
    calls.push({ url: String(url), ...op });
    let data = [];
    if (String(url).includes("/api/itens?q=")) {
      const q = new URL(url, "https://pethub.test").searchParams
        .get("q")
        .toLowerCase();
      data = produtos.filter((p) => p.nome.toLowerCase().includes(q));
    } else if (String(url).startsWith("/api/itens/"))
      data = produtos.find(
        (p) => String(p.id) === String(url).split("/").at(-1),
      );
    else if (op.method === "POST" || op.method === "PUT")
      data = { ...JSON.parse(op.body || "{}"), id: 10 };
    return {
      ok: true,
      json: async () => data,
      text: async () => "",
      status: 200,
    };
  };
  w.eval(fs.readFileSync(file + ".js", "utf8"));
  await wait(80);
  d.querySelector("#tipoEntrada").value = "AJUSTE";
  return {
    w,
    d,
    errors,
    alerts,
    calls,
    produtos,
    async buscar(q) {
      const input = d.querySelector("#produtoItem");
      input.value = q;
      input.dispatchEvent(new w.Event("input", { bubbles: true }));
      await wait(330);
    },
    selecionar(i) {
      d.querySelectorAll(".produto-select-dropdown .item")[i].click();
    },
  };
}
for (const tipo of ["entradas", "saidas"])
  test(`autocomplete mostra todos os resultados e preserva estoque zero em ${tipo}`, async (t) => {
    const a = await tela(t, tipo);
    await a.buscar("a");
    assert.equal(
      a.d.querySelectorAll(".produto-select-dropdown .item").length,
      3,
    );
    assert.match(
      a.d.querySelector(".produto-select-dropdown").textContent,
      /Estoque: 0/,
    );
    a.selecionar(1);
    assert.equal(a.d.querySelector("#estoqueItem").value, "0");
    assert.equal(a.errors.length, 0);
  });
test("entrada permite produto zerado; saída bloqueia zerado e quantidade acumulada acima do saldo", async (t) => {
  const e = await tela(t, "entradas");
  await e.buscar("MAGNUS");
  e.selecionar(0);
  e.d.querySelector("#quantidadeItem").value = "3";
  await e.w.adicionarItem();
  assert.equal(
    e.d.querySelectorAll("#itensTableBody .added-item-row").length,
    1,
  );
  const s = await tela(t, "saidas");
  await s.buscar("MAGNUS");
  s.selecionar(0);
  await s.w.adicionarItem();
  assert.equal(
    s.d.querySelectorAll("#itensTableBody .added-item-row").length,
    0,
  );
  assert(s.alerts.some((m) => /insuficiente/i.test(m)));
  await s.buscar("HOT");
  s.selecionar(0);
  s.d.querySelector("#quantidadeItem").value = "2";
  await s.w.adicionarItem();
  assert.equal(
    s.d.querySelectorAll("#itensTableBody .added-item-row").length,
    1,
  );
  await s.buscar("HOT");
  s.selecionar(0);
  await s.w.adicionarItem();
  assert.equal(
    s.d.querySelectorAll("#itensTableBody .added-item-row").length,
    1,
  );
  assert.equal(s.errors.length, 0);
  assert.equal(e.errors.length, 0);
});
test("saída revalida estoque antes da finalização de um rascunho", async (t) => {
  const s = await tela(t, "saidas");
  await s.buscar("HOT");
  s.selecionar(0);
  await s.w.adicionarItem();
  await wait();
  s.produtos[0].estoqueAtual = 0;
  await s.w.finalizarEntrada();
  assert(s.alerts.some((m) => /insuficiente para finalizar/i.test(m)));
  assert.equal(
    s.calls.filter(
      (c) => c.body && JSON.parse(c.body).situacao === "Finalizado",
    ).length,
    0,
  );
  assert.equal(s.errors.length, 0);
});
