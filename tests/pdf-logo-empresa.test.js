"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const fs = require("node:fs/promises"),
  path = require("node:path"),
  os = require("node:os");
const sharp = require("sharp"),
  PDFDocument = require("pdfkit");
const {
  criarServico,
  desenharLogo,
} = require("../backend/services/identidadeEmpresaPDF");
async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pethub-pdf-logo-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  await fs.mkdir(path.join(dir, "frontend/fivecon"), { recursive: true });
  const image = (color, w = 300, h = 120) =>
    sharp({ create: { width: w, height: h, channels: 4, background: color } })
      .png()
      .toBuffer();
  const red = await image("#ff0000"),
    blue = await image("#0000ff"),
    fallback = await image("#ffaa33");
  await fs.writeFile(
    path.join(dir, "frontend/fivecon/Design sem nome (17).png"),
    fallback,
  );
  const companies = new Map([
      [1, { id: 1, nome: "Empresa A", logo: "/uploads/empresas/a.webp" }],
      [2, { id: 2, nome: "Empresa B", logo: "/uploads/empresas/b.webp" }],
    ]),
    calls = [];
  const service = criarServico({
    diretorio: dir,
    Empresa: { findByPk: async (id) => companies.get(id) },
    lerMidia: async (emp, ref) => {
      calls.push({ emp, ref });
      if (emp === 1 && ref.endsWith("a.webp")) return { bytes: red };
      if (emp === 2 && ref.endsWith("b.webp")) return { bytes: blue };
      throw Object.assign(Error("Arquivo não autorizado"), { status: 403 });
    },
    log: { warn() {} },
  });
  return { dir, service, companies, calls, red, blue, fallback, image };
}
async function rgb(bytes) {
  const { data } = await sharp(bytes)
    .extract({ left: 320, top: 200, width: 1, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return [...data];
}
test("logo persistente é lida com empresa autenticada e payload antigo não substitui cadastro", async (t) => {
  const f = await fixture(t);
  const a = await f.service.carregarIdentidade({
    user: { empresaId: 1 },
    body: { companyLogo: f.blue.toString("base64"), empresaId: 2 },
    query: { empresaId: 2 },
  });
  assert.equal(a.origem, "empresa");
  assert.deepEqual(await rgb(a.logoBuffer), [255, 0, 0]);
  assert.deepEqual(f.calls, [{ emp: 1, ref: "/uploads/empresas/a.webp" }]);
  const b = await f.service.carregarIdentidade({ user: { empresaId: 2 } });
  assert.deepEqual(await rgb(b.logoBuffer), [0, 0, 255]);
  await assert.rejects(
    () =>
      f.service.carregarIdentidade(
        { user: { empresaId: 1 } },
        { empresaId: 2 },
      ),
    { status: 403 },
  );
  await assert.rejects(
    () => f.service.carregarIdentidade({ query: { empresaId: 1 } }),
    { status: 401 },
  );
});
test("remover logo usa PetHub imediatamente, sem cache nem imagem antiga de outra empresa", async (t) => {
  const f = await fixture(t);
  await f.service.carregarIdentidade({ user: { empresaId: 1 } });
  f.companies.get(1).logo = null;
  const a = await f.service.carregarIdentidade({
    user: { empresaId: 1 },
    body: { companyLogo: f.red.toString("base64") },
  });
  assert.equal(a.origem, "padrao");
  assert.deepEqual(await rgb(a.logoBuffer), [255, 170, 51]);
  f.companies.get(1).logo = "/uploads/empresas/b.webp";
  const invalid = await f.service.carregarIdentidade({
    user: { empresaId: 1 },
  });
  assert.notDeepEqual(await rgb(invalid.logoBuffer), [0, 0, 255]);
});
test("nomes antigos, data URLs, JPEG, WebP e SVG são normalizados sem distorção", async (t) => {
  const f = await fixture(t);
  await fs.mkdir(path.join(f.dir, "uploads"), { recursive: true });
  await fs.writeFile(path.join(f.dir, "uploads", "logo.png"), f.red);
  const local = criarServico({
    Empresa: { findByPk: async () => f.companies.get(1) },
    diretorio: f.dir,
    log: { warn() {} },
  });
  for (const ref of [
    "logo.png",
    "/uploads/logo.png",
    "data:image/png;base64," + f.red.toString("base64"),
  ]) {
    f.companies.get(1).logo = ref;
    const a = await local.carregarIdentidade({ user: { empresaId: 1 } });
    assert.deepEqual(await rgb(a.logoBuffer), [255, 0, 0]);
  }
  for (const format of ["webp", "jpeg"]) {
    const img = await sharp(f.red).toFormat(format).toBuffer();
    f.companies.get(1).logo =
      "data:image/" + format + ";base64," + img.toString("base64");
    const a = await local.carregarIdentidade({ user: { empresaId: 1 } });
    assert.equal((await sharp(a.logoBuffer).metadata()).format, "png");
  }
  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="200"><rect width="100" height="200" fill="red"/></svg>',
  );
  f.companies.get(1).logo =
    "data:image/svg+xml;base64," + svg.toString("base64");
  const a = await local.carregarIdentidade({ user: { empresaId: 1 } });
  const { info } = await sharp(a.logoBuffer)
    .trim()
    .toBuffer({ resolveWithObject: true });
  assert(Math.abs(info.width / info.height - 0.5) < 0.02);
});
test("PDFKit gera cupom e A4 reais com logo dentro da área reservada", async (t) => {
  const f = await fixture(t),
    a = await f.service.carregarIdentidade({ user: { empresaId: 1 } });
  for (const width of [204, 595]) {
    const doc = new PDFDocument({ size: [width, 842], margin: 8 }),
      chunks = [];
    const result = new Promise((resolve, reject) => {
      doc.on("data", (b) => chunks.push(b));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });
    assert.equal(
      desenharLogo(doc, a.logoBuffer, {
        x: (width - 90) / 2,
        y: 10,
        largura: 90,
        altura: 64,
      }),
      true,
    );
    doc.text("Empresa A", 8, 82, { width: width - 16, align: "center" });
    doc.end();
    const pdf = await result;
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
    assert(pdf.includes(Buffer.from("/Subtype /Image")));
  }
});
test("rotas reais de comprovante e faturamento incorporam logo da empresa e rejeitam documento cruzado", async (t) => {
  const f = await fixture(t),
    express = require("express"),
    vm = require("node:vm"),
    syncfs = require("node:fs");
  const helper = require("../backend/services/identidadeEmpresaPDF"),
    records = [];
  const authUser = (req, res, next) => {
    const emp = Number(req.get("x-company"));
    if (!emp) return res.sendStatus(401);
    req.user = { empresaId: emp, id: 1 };
    next();
  };
  const Venda = {
    findOne: async ({ where }) =>
      Number(where.id) === 10 && Number(where.empresa_id) === 1
        ? {
            id: 10,
            empresa_id: 1,
            itens: [],
            pagamentos: [],
            totais: {},
            data: new Date(),
          }
        : null,
    findAll: async () => [],
  };
  const models = {
    Venda,
    Empresa: { findByPk: async (id) => f.companies.get(Number(id)) },
    Cliente: { findByPk: async () => null },
    Produto: { findAll: async () => [] },
  };
  function load(name) {
    const filename = path.join(__dirname, "../backend/routes", name),
      module = { exports: {} };
    const customRequire = (p) => {
      if (p === "../services/identidadeEmpresaPDF")
        return {
          ...helper,
          carregarIdentidade: async (req, op) => {
            const r = await f.service.carregarIdentidade(req, op);
            records.push({ emp: req.user.empresaId, origem: r.origem });
            return r;
          },
        };
      if (p === "../models") return models;
      if (p === "../models/Venda") return { Venda };
      if (p === "../models/Produto") return models.Produto;
      if (p === "../models/Cliente")
        return { Cliente: models.Cliente, sequelize: {} };
      if (p === "../models/Agendamento") return { Agendamento: {} };
      if (p === "../models/Pet") return {};
      if (p === "../middleware/authUser") return { authUser };
      if (p === "../middleware/exigePermissao")
        return { exigePermissao: () => (req, res, next) => next() };
      if (p === "../services/layoutCaixa")
        return { criarRouter: () => express.Router() };
      if (p === "../services/validarVendaCaixa")
        return { criarValidador: () => (req, res, next) => next() };
      if (p === "../controllers/vendaController")
        return new Proxy({}, { get: () => (req, res) => res.sendStatus(204) });
      return require(p);
    };
    vm.runInNewContext(
      syncfs.readFileSync(filename, "utf8"),
      {
        require: customRequire,
        module,
        exports: module.exports,
        __dirname: path.dirname(filename),
        Buffer,
        console,
        setTimeout,
        clearTimeout,
        process,
      },
      { filename },
    );
    return module.exports;
  }
  const app = express();
  app.use(express.json());
  app.use("/vendas", load("vendaRoutes.js"));
  app.use("/relatorios", load("relatoriosRoutes.js"));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  t.after(() => new Promise((r) => server.close(r)));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal(
    (
      await fetch(base + "/vendas/10/comprovante", {
        headers: { "x-company": "2" },
      })
    ).status,
    404,
  );
  assert.equal((await fetch(base + "/vendas/10/comprovante")).status, 401);
  for (const url of [
    "/vendas/10/comprovante",
    "/relatorios/venda-no-periodo/pdf",
  ]) {
    const res = await fetch(base + url, { headers: { "x-company": "1" } });
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type"), /application\/pdf/);
    const pdf = Buffer.from(await res.arrayBuffer());
    assert(pdf.includes(Buffer.from("/Subtype /Image")));
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  }
  f.companies.get(1).logo = null;
  const faturamento = await fetch(base + '/relatorios/faturamento/pdf', {
    method: 'POST', headers: { 'x-company': '1', 'content-type': 'application/json' },
    body: JSON.stringify({ companyLogo: 'data:image/png;base64,' + f.blue.toString('base64') }),
  });
  assert.equal(faturamento.status, 200);
  assert(Buffer.from(await faturamento.arrayBuffer()).includes(Buffer.from('/Subtype /Image')));
  assert.deepEqual(records, [
    { emp: 1, origem: "empresa" },
    { emp: 1, origem: "empresa" },
    { emp: 1, origem: "padrao" },
  ]);
});
