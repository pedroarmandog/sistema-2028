"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  express = require("express");
const { Sequelize } = require("sequelize");
const { modelo, criarRouter } = require("../backend/services/layoutCaixa");
test("preferência persiste por empresa, sessão/dispositivo e valida entradas/autorizações", async (t) => {
  const db = new Sequelize({
    dialect: "sqlite",
    storage: ":memory:",
    logging: false,
    dialectModule: require("./helpers/sqlite-caixa"),
  });
  await modelo(db).sync();
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    if (req.get("x-company"))
      req.user = { empresaId: Number(req.get("x-company")) };
    next();
  });
  app.use(
    "/pref",
    criarRouter({
      db,
      autorizar: (req, res, next) =>
        !req.user
          ? res.sendStatus(401)
          : req.get("x-deny")
            ? res.sendStatus(403)
            : next(),
    }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  t.after(async () => {
    await new Promise((r) => server.close(r));
    await db.close();
  });
  const url = `http://127.0.0.1:${server.address().port}/pref`;
  const call = (emp, method = "GET", body, extra = {}) =>
    fetch(url, {
      method,
      headers: {
        "content-type": "application/json",
        ...(emp ? { "x-company": String(emp) } : {}),
        ...extra,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  assert.equal((await call()).status, 401);
  assert.equal((await call(1, "GET", null, { "x-deny": "1" })).status, 403);
  assert.deepEqual(await (await call(1)).json(), { layout: "classico" });
  assert.equal(
    (await call(1, "PUT", { layout: "rapido", empresa_id: 2 })).status,
    400,
  );
  assert.equal((await call(1, "PUT", { layout: "evil" })).status, 400);
  assert.equal((await call(1, "PUT", { layout: "rapido" })).status, 200);
  assert.deepEqual(await (await call(2)).json(), { layout: "classico" });
  // Fresh independent request/session still reads DB, not process or browser cache.
  assert.deepEqual(await (await call(1)).json(), { layout: "rapido" });
  assert.equal(
    (
      await call(
        2,
        "PUT",
        { layout: "rapido" },
        { "sec-fetch-site": "cross-site" },
      )
    ).status,
    403,
  );
  assert.equal((await call(1, "PUT", { layout: "classico" })).status, 200);
  assert.equal((await modelo(db).findByPk(1)).layout, "classico");
});
test("servidor valida centavos, estoque acumulado, vínculos e soma dos pagamentos", async (t) => {
  const db = new Sequelize({
    dialect: "sqlite",
    storage: ":memory:",
    logging: false,
    dialectModule: require("./helpers/sqlite-caixa"),
  });
  t.after(() => db.close());
  const D = require("sequelize").DataTypes;
  const Produto = db.define("Produto", {
    id: { type: D.STRING, primaryKey: true },
    empresa_id: D.INTEGER,
    tipo: D.STRING,
    estoqueAtual: D.DECIMAL,
    permiteEstoqueNegativo: D.BOOLEAN,
  });
  const Cliente = db.define("Cliente", { empresa_id: D.INTEGER }),
    Profissional = db.define("Profissional", { empresa_id: D.INTEGER });
  const Caixa = db.define("Caixa", {
    empresa_id: D.INTEGER,
    aberto: D.BOOLEAN,
  });
  await db.sync();
  await Caixa.bulkCreate([
    { empresa_id: 1, aberto: true },
    { empresa_id: 2, aberto: true },
  ]);
  await Produto.bulkCreate([
    { id: "p1", empresa_id: 1, tipo: "produto", estoqueAtual: 3 },
    { id: "p2", empresa_id: 2, tipo: "produto", estoqueAtual: 99 },
  ]);
  await Cliente.create({ id: 2, empresa_id: 2 });
  const validate =
    require("../backend/services/validarVendaCaixa").criarValidador({
      Produto,
      Cliente,
      Profissional,
      Caixa,
    });
  const seed = () => ({
    origemInterface: "caixa-compartilhado",
    itens: [
      {
        produto: { id: "p1" },
        quantidade: 1,
        valorUnitario: 12.5,
        desconto: 0,
        totalBruto: 12.5,
        totalFinal: 12.5,
      },
    ],
    totais: { bruto: 12.5, desconto: 0, acrescimo: 0, final: 12.5 },
    pagamentos: [{ forma: "dinheiro", valor: 12.5 }],
    totalPago: 12.5,
    status: "pago",
  });
  async function run(body, empresaId = 1) {
    let status = 200,
      passed = false;
    await validate(
      { body, user: { empresaId }, get: () => "" },
      {
        status(v) {
          status = v;
          return this;
        },
        json() {},
      },
      () => (passed = true),
    );
    return { status, passed };
  }
  assert.equal((await run(seed())).passed, true);
  let b = seed();
  b.totais.final = 1;
  assert.equal((await run(b)).status, 400);
  b = seed();
  b.clienteId = 2;
  assert.equal((await run(b)).status, 400);
  b = seed();
  b.itens[0].produto.id = "p2";
  assert.equal((await run(b)).status, 400);
  assert.equal((await run(seed(), 2)).status, 400);
  b = seed();
  b.pagamentos[0].valor = 10;
  b.totalPago = 10;
  assert.equal((await run(b)).status, 400);
  b = seed();
  b.itens[0].quantidade = 4;
  b.itens[0].totalBruto = b.itens[0].totalFinal = 50;
  b.totais.bruto = b.totais.final = b.totalPago = b.pagamentos[0].valor = 50;
  assert.equal((await run(b)).status, 400);
  b = seed();
  b.itens[0].totalFinal = 0;
  assert.equal((await run(b)).status, 400);
  b = seed();
  b.empresa_id = 2;
  assert.equal((await run(b)).passed, true);
  assert.equal(b.empresa_id, undefined);
  await Caixa.update({ aberto: false }, { where: { empresa_id: 1 } });
  assert.equal((await run(seed())).status, 409);
});
