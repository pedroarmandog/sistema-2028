"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path");
const { Sequelize, DataTypes: D } = require("sequelize"),
  { JSDOM, VirtualConsole } = require("jsdom"),
  sharp = require("sharp");
const root = path.resolve(__dirname, "..");
function load(file, stubs = {}) {
  const mod = { exports: {} };
  const real = require("node:module").createRequire(path.join(root, file));
  vm.runInNewContext(fs.readFileSync(path.join(root, file), "utf8"), {
    module: mod,
    exports: mod.exports,
    Buffer,
    console: { log() {}, warn() {}, error() {} },
    __dirname: path.dirname(path.join(root, file)),
    require: (n) => (n in stubs ? stubs[n] : real(n)),
  });
  return mod.exports;
}
function response() {
  return {
    statusCode: 200,
    headers: {},
    status(n) {
      this.statusCode = n;
      return this;
    },
    set(k, v) {
      this.headers[k] = v;
      return this;
    },
    type(t) {
      return this.set("Content-Type", t);
    },
    send(b) {
      this.body = b;
      return this;
    },
    json(b) {
      this.body = JSON.parse(JSON.stringify(b));
      return this;
    },
  };
}
async function fixture(t) {
  const db = new Sequelize({
    dialect: "sqlite",
    storage: ":memory:",
    logging: false,
    dialectModule: require("./helpers/sqlite-caixa"),
  });
  t.after(() => db.close());
  const Cliente = db.define(
    "Cliente",
    {
      nome: D.STRING,
      empresa_id: D.INTEGER,
      email: D.STRING,
      telefone: D.STRING,
      cpf: D.STRING,
      cidade: D.STRING,
      ativo: D.BOOLEAN,
      grupo_cliente: D.STRING,
      imagem_perfil: D.STRING,
      data_nascimento: D.DATE,
    },
    { tableName: "Clientes" },
  );
  const { Orcamento } = load("backend/models/Orcamento.js", {
    "./Cliente": { sequelize: db },
  });
  const Produto = db.define(
    "Produto",
    {
      id: { type: D.STRING, primaryKey: true },
      nome: D.STRING,
      codigo: D.STRING,
      codigoBarras: D.STRING,
      preco: D.FLOAT,
      tipo: D.STRING,
      empresa_id: D.INTEGER,
      estoqueAtual: D.INTEGER,
      estoqueMinimo: D.INTEGER,
      controlaEstoque: D.BOOLEAN,
    },
    { tableName: "itens" },
  );
  await db.sync();
  await Cliente.bulkCreate([
    { id: 1, nome: "Karol", empresa_id: 1 },
    { id: 2, nome: "Outro", empresa_id: 2 },
  ]);
  const models = { Produto, Cliente };
  const controllers = load("backend/controllers/orcamentoController.js", {
    "../models/Orcamento": { Orcamento },
    "../models": models,
  });
  const stock = load("backend/controllers/dashboardController.js", {
    "../models": models,
    "../utils/simpleCache": { get() {}, set() {} },
  });
  const empresa = {
    id: 1,
    nome: "Pet Shop Teste",
    razaoSocial: "Empresa Teste LTDA",
    cnpj: "00.000.000/0001-00",
    telefone: "31999999999",
    email: "teste@example.com",
    endereco: "Rua Exemplo, 12",
  };
  const logo = await sharp({
    create: { width: 220, height: 100, channels: 4, background: "#ffaa33" },
  })
    .png()
    .toBuffer();
  const identidade = {
    empresa,
    nomeEmpresa: empresa.nome,
    logoBuffer: logo,
    origem: "empresa",
  };
  const handlers = {},
    router = {
      use() {},
      get(p, ...f) {
        handlers["GET " + p] = f.at(-1);
      },
      post() {},
      put() {},
      delete() {},
    };
  load("backend/routes/orcamentoRoutes.js", {
    express: { Router: () => router },
    "../controllers/orcamentoController": controllers,
    "../models/Orcamento": { Orcamento },
    "../middleware/authUser": { authUser() {} },
    "../services/identidadeEmpresaPDF": {
      carregarIdentidade: async (req, op) => {
        assert.equal(Number(req.user.empresaId), Number(op.empresaId));
        return identidade;
      },
    },
  });
  async function call(fn, body = {}, id, emp = 1, query = {}) {
    const res = response();
    await fn({ body, params: { id }, query, user: { empresaId: emp } }, res);
    return res;
  }
  return {
    db,
    Cliente,
    Orcamento,
    Produto,
    controllers,
    stock,
    identidade,
    handlers,
    call,
  };
}
test("estoque real: só produtos físicos em falta, mínimo por item, empresa e flag independente", async (t) => {
  const f = await fixture(t);
  await f.Produto.bulkCreate([
    {
      id: "1",
      nome: "Serviço",
      tipo: "servico",
      estoqueAtual: 0,
      empresa_id: 1,
    },
    { id: "2", nome: "Plano", tipo: "plano", estoqueAtual: 0, empresa_id: 1 },
    {
      id: "3",
      nome: "Ração zero",
      tipo: "produto",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      empresa_id: 1,
      controlaEstoque: true,
    },
    {
      id: "4",
      nome: "Ração baixo",
      tipo: "produto",
      estoqueAtual: 2,
      estoqueMinimo: 3,
      empresa_id: 1,
    },
    {
      id: "5",
      nome: "Ração igual",
      tipo: "produto",
      estoqueAtual: 3,
      estoqueMinimo: 3,
      empresa_id: 1,
    },
    {
      id: "6",
      nome: "Outra empresa",
      tipo: "produto",
      estoqueAtual: 0,
      empresa_id: 2,
    },
    {
      id: "7",
      nome: "Sem controle",
      tipo: "produto",
      estoqueAtual: 0,
      empresa_id: 1,
      controlaEstoque: false,
    },
  ]);
  const r = await f.call(f.stock.produtosEstoqueBaixo);
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.body.map((p) => p.id).sort(), ["3", "4"]);
  const predicate = require("../frontend/components/estoque-reposicao");
  assert.equal(
    predicate.precisaReposicao({ tipo: "servico", estoqueAtual: 0 }),
    false,
  );
  assert.equal(
    predicate.precisaReposicao({
      tipo: "produto",
      controlaEstoque: false,
      estoqueAtual: 0,
    }),
    false,
  );
});
test("busca SQL: acentos, caixa, 1 letra, palavras separadas, código e empresa; ordenação antes do limite", async (t) => {
  const f = await fixture(t),
    search = require("../backend/services/buscaItens");
  await f.Produto.bulkCreate([
    { id: "1", nome: "RAÇÃO GOLDEN ADULTOS", empresa_id: 1 },
    { id: "2", nome: "SHAMPOO ANTIALÉRGICO", codigo: "789012", empresa_id: 1 },
    { id: "3", nome: "BANHO PORTE PEQUENO", tipo: "servico", empresa_id: 1 },
    { id: "4", nome: "RAÇÃO PREMIER PARA FILHOTES", empresa_id: 1 },
    { id: "5", nome: "RAÇÃO GOLDEN", empresa_id: 2 },
  ]);
  const find = (q) =>
    f.Produto.findAll({
      where: { empresa_id: 1, ...search.condicaoBuscaItens(q) },
      order: search.ordemBuscaItens(q, f.db),
      limit: 20,
    });
  for (const q of ["golden", "GoLdEn", "  racao   golden  "])
    assert.deepEqual(
      (await find(q)).map((p) => p.id),
      ["1"],
    );
  assert.equal((await find("racao")).length, 2);
  assert.equal((await find("antialergico"))[0].id, "2");
  assert.equal((await find("premier filhotes"))[0].id, "4");
  assert.equal((await find("filhotes premier"))[0].id, "4");
  assert.deepEqual(
    (await find("BANHO")).map((p) => p.id),
    (await find("banho")).map((p) => p.id),
  );
  assert.equal((await find("h")).length, 3);
  assert.equal((await find("789012"))[0].id, "2");
  assert.equal((await find("inexistente")).length, 0);
});
test("reproduz erro de empresa ausente e migração idempotente recupera somente vínculos verificáveis", async (t) => {
  const f = await fixture(t),
    qi = f.db.getQueryInterface();
  await qi.removeColumn("orcamentos", "empresa_id");
  await assert.rejects(
    f.Orcamento.findOne({ where: { empresa_id: 1 } }),
    /empresa_id/,
  );
  await f.db.query(
    "INSERT INTO orcamentos (id,data,clienteId,itens,createdAt,updatedAt) VALUES (91,'2026-11-21',1,'[]','2026-11-21','2026-11-21'),(92,'2026-11-21',NULL,'[]','2026-11-21','2026-11-21')",
  );
  const { preparar } = require("../backend/scripts/preparar-orcamentos");
  const r = await preparar(f.db);
  assert.equal(r.semEmpresa, 1);
  await preparar(f.db);
  assert.equal((await f.Orcamento.findByPk(91)).empresa_id, 1);
  assert.equal((await f.Orcamento.findByPk(92)).empresa_id, null);
  assert.equal(await f.Orcamento.count(), 2);
});
test("CRUD grava empresa autenticada, calcula descontos e rejeita outra empresa", async (t) => {
  const f = await fixture(t),
    c = f.controllers;
  const r = await f.call(c.criarOrcamento, {
    empresa_id: 2,
    cliente: "Karol",
    clienteId: 1,
    itens: [{ nome: "Banho", quantidade: 2, valorUnitario: 50, desconto: 10 }],
  });
  assert.equal(r.statusCode, 201);
  assert.equal(r.body.empresa_id, 1);
  assert.equal(r.body.totais.total, "90.00");
  const id = r.body.id;
  assert.equal((await f.call(c.buscarOrcamento, {}, id, 2)).statusCode, 404);
  assert.equal(
    (await f.call(c.atualizarOrcamento, { itens: [] }, id, 2)).statusCode,
    404,
  );
  assert.equal((await f.call(c.deletarOrcamento, {}, id, 2)).statusCode, 404);
  const list = await f.call(c.listarOrcamentos, {}, null, 2);
  assert.equal(list.body.orcamentos.length, 0);
  const edit = await f.call(
    c.atualizarOrcamento,
    {
      empresa_id: 2,
      itens: [
        { nome: "Ração", quantidade: 1, valorUnitario: 99.99, desconto: 100 },
      ],
    },
    id,
  );
  assert.equal(edit.body.empresa_id, 1);
  assert.equal(edit.body.totais.total, "0.00");
});
test("PDF GET gera A4 real com dados salvos, logo, vários itens/descontos e reimpressão sem duplicação", async (t) => {
  const f = await fixture(t);
  const o = await f.Orcamento.create({
    empresa_id: 1,
    data: new Date("2026-11-21T13:00:00Z"),
    cliente: "Karol",
    clienteTelefone: "31999999999",
    profissional: "Ana",
    condicaoPagamento: "Pix",
    informacoesAdicionais: "Cuidado especial com o pet.",
    itens: [
      { nome: "RAÇÃO GOLDEN", quantidade: 2, valorUnitario: 50, desconto: 10 },
      { nome: "BANHO", quantidade: 1, valorUnitario: 80, desconto: 0 },
    ],
    totais: { subtotal: "180.00", desconto: "10.00", total: "170.00" },
  });
  const fn = f.handlers["GET /:id/comprovante"];
  for (let i = 0; i < 2; i++) {
    const r = await f.call(fn, {}, o.id);
    assert.equal(r.statusCode, 200);
    assert.equal(r.headers["Content-Type"], "application/pdf");
    assert.equal(r.body.subarray(0, 5).toString(), "%PDF-");
    fs.mkdirSync("/tmp/orcamentos-pdf", { recursive: true });
    fs.writeFileSync("/tmp/orcamentos-pdf/orcamento-a4.pdf", r.body);
  }
  assert.equal(await f.Orcamento.count(), 1);
  assert.equal((await f.call(fn, {}, o.id, 2)).statusCode, 404);
  const gerar = require("../backend/services/orcamentoPDF").gerarOrcamentoPDF;
  const longa = {
    ...o.get({ plain: true }),
    itens: Array.from({ length: 65 }, (_, i) => ({
      nome: "Produto ou serviço " + i + " descrição longa ".repeat(12),
      quantidade: 1,
      valorUnitario: 12.34,
      desconto: 5,
    })),
    informacoesAdicionais: "Observações muito longas. ".repeat(700),
  };
  fs.writeFileSync(
    "/tmp/orcamentos-pdf/orcamento-longo.pdf",
    await gerar(longa, { ...f.identidade, logoBuffer: null, origem: "padrao" }),
  );
  fs.writeFileSync(
    "/tmp/orcamentos-pdf/orcamento-sem-logo.pdf",
    await gerar(o, { ...f.identidade, logoBuffer: null, origem: "padrao" }),
  );
});
async function tela(t) {
  const dom = new JSDOM(
    fs.readFileSync(
      path.join(root, "frontend/atendimento/orcamento.html"),
      "utf8",
    ),
    {
      url: "https://pethub.test/atendimento/orcamento.html",
      runScripts: "outside-only",
      pretendToBeVisual: true,
      virtualConsole: new VirtualConsole(),
    },
  );
  const w = dom.window;
  t.after(() => w.close());
  w.alert = () => {};
  w.fetch = async () => ({ ok: true, json: async () => ({ orcamentos: [] }) });
  w.URL.createObjectURL = () => "blob:teste";
  w.URL.revokeObjectURL = () => {};
  for (const f of [
    "components/pesquisa-normalizada.js",
    "components/venda-calculos.js",
    "atendimento/orcamento.js",
  ])
    w.eval(fs.readFileSync(path.join(root, "frontend", f), "utf8"));
  await new Promise((r) => setTimeout(r, 380));
  return w;
}
test("autocomplete real: 1 letra, teclado, preço, seleção antiga inválida e nenhum item", async (t) => {
  const w = await tela(t),
    d = w.document,
    calls = [];
  w.fetch = async (url) => {
    calls.push(url);
    return {
      ok: true,
      json: async () =>
        String(url).includes("inexistente")
          ? []
          : [{ id: "1", nome: "SHAMPOO ANTIALÉRGICO", preco: 49.9 }],
    };
  };
  const input = d.getElementById("orcItemBusca");
  input.value = "h";
  input.dispatchEvent(new w.Event("input"));
  await new Promise((r) => setTimeout(r, 260));
  assert.equal(
    d.querySelectorAll('#orcItemSugestoes [role="option"]').length,
    1,
  );
  input.dispatchEvent(
    new w.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
  );
  input.dispatchEvent(
    new w.KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
  );
  assert.equal(input.value, "SHAMPOO ANTIALÉRGICO");
  assert.equal(d.getElementById("orcPreco").value, "49.90");
  input.value = "inexistente";
  input.dispatchEvent(new w.Event("input"));
  await new Promise((r) => setTimeout(r, 260));
  assert.match(d.getElementById("orcItemSugestoes").textContent, /Nenhum item/);
  assert.ok(calls.some((u) => u.includes("limit=20")));
});
test("PDF frontend: falha amigável, repetir só GET e download blob sem JSON no iframe", async (t) => {
  const w = await tela(t),
    d = w.document,
    calls = [];
  let fail = true;
  w.fetch = async (url, op = {}) => {
    calls.push({ url, op });
    return {
      ok: !fail,
      headers: { get: () => (fail ? "application/json" : "application/pdf") },
      blob: async () => new w.Blob(["%PDF-"], { type: "application/pdf" }),
    };
  };
  await w.abrirComprovantePDF(1);
  assert.match(d.getElementById("pdfStatus").textContent, /continua salvo/);
  assert.equal(d.getElementById("pdfIframe").hidden, true);
  fail = false;
  d.getElementById("pdfStatus").querySelector("button").click();
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(d.getElementById("pdfIframe").src, "blob:teste");
  assert.equal(d.getElementById("pdfDownload").download, "orcamento-1.pdf");
  assert.equal(calls.length, 2);
  assert.ok(calls.every((c) => !c.op.method || c.op.method === "GET"));
  w.fecharComprovantePDF();
});
test("rota real pesquisa entre milhares sem baixar catálogo inteiro, por palavra e acento", async (t) => {
  const f = await fixture(t),
    handlers = {},
    router = {
      use() {},
      get(p, ...fn) {
        handlers[p] = fn.at(-1);
      },
      post() {},
      put() {},
      delete() {},
    };
  load("backend/routes/itemRoutes.js", {
    express: { Router: () => router },
    "../models/Produto": f.Produto,
    "../models/Fornecedor": {},
    "../middleware/authUser": { authUser() {} },
  });
  const dados = Array.from({ length: 2500 }, (_, i) => ({
    id: "p" + i,
    nome: "Produto comum " + i,
    empresa_id: 1,
    preco: 1,
  }));
  dados.push({
    id: "especial",
    nome: "RAÇÃO PREMIUM FILHOTES GOLDEN",
    empresa_id: 1,
    preco: 100,
  });
  await f.Produto.bulkCreate(dados);
  const r = await f.call(handlers["/"], {}, null, 1, {
    q: "filhotes racao",
    limit: "20",
  });
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.length, 1);
  assert.equal(r.body[0].id, "especial");
});
test("cliente de outra empresa não pode ser associado ao orçamento", async (t) => {
  const f = await fixture(t);
  const r = await f.call(f.controllers.criarOrcamento, {
    clienteId: 2,
    itens: [],
  });
  assert.equal(r.statusCode, 404);
  assert.equal(await f.Orcamento.count(), 0);
});
test("pesquisa compartilhada de clientes encontra acentos com telefone nulo e respeita empresa", async (t) => {
  const f = await fixture(t);
  await f.Cliente.bulkCreate([
    { nome: "JOÃO DA SILVA", empresa_id: 1, telefone: null },
    { nome: "João Silva", empresa_id: 2 },
  ]);
  const ctrl = load("backend/controllers/clienteController.js", {
    "../models": { Cliente: f.Cliente },
  });
  const r = await f.call(ctrl.getAllClientes, {}, null, 1, {
    search: "joao silva",
  });
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.clientes.length, 1);
  assert.equal(r.body.clientes[0].nome, "JOÃO DA SILVA");
});
