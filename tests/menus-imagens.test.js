"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  syncfs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  crypto = require("node:crypto"),
  vm = require("node:vm");
const { Sequelize, DataTypes: D } = require("sequelize"),
  sharp = require("sharp"),
  { JSDOM, VirtualConsole } = require("jsdom");
const root = path.resolve(__dirname, ".."),
  { criarServico } = require("../backend/services/produtoImagens");
function load(file, stubs = {}) {
  const mod = { exports: {} };
  const real = require("node:module").createRequire(path.join(root, file));
  vm.runInNewContext(syncfs.readFileSync(path.join(root, file), "utf8"), {
    module: mod,
    exports: mod.exports,
    Buffer,
    console: { log() {}, debug() {}, warn() {}, error() {} },
    __dirname: path.dirname(path.join(root, file)),
    require: (n) => (n in stubs ? stubs[n] : real(n)),
  });
  return mod.exports;
}
async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pethub-fotos-")),
    db = new Sequelize({
      dialect: "sqlite",
      storage: ":memory:",
      logging: false,
      dialectModule: require("./helpers/sqlite-caixa"),
    });
  t.after(async () => {
    await db.close();
    await fs.rm(dir, { recursive: true, force: true });
  });
  const Produto = db.define("Produto", {
    id: { type: D.STRING, primaryKey: true },
    nome: D.STRING,
    empresa_id: D.INTEGER,
    imagem: D.TEXT,
    imagemVersoes: D.JSON,
  });
  const Media = db.define("MediaTeste", {
    id: { type: D.STRING, primaryKey: true },
    empresa_id: D.INTEGER,
    tipo: D.STRING,
    chave: D.STRING,
  });
  await db.sync();
  function novaMidia() {
    return {
      async salvar(emp, bytes, modulo) {
        const id = crypto.randomUUID(),
          chave = path.join(dir, id + ".webp");
        await fs.writeFile(chave, bytes);
        await Media.create({ id, empresa_id: emp, chave, tipo: "image/webp" });
        return { url: "/uploads/" + modulo + "/" + id + ".webp" };
      },
      async ler(emp, ref) {
        const id = path.basename(ref, ".webp");
        const m = await Media.findOne({ where: { id, empresa_id: emp } });
        if (!m)
          throw Object.assign(Error("Arquivo não encontrado"), { status: 404 });
        try {
          return { bytes: await fs.readFile(m.chave), tipo: m.tipo };
        } catch (e) {
          throw Object.assign(e, { status: 404 });
        }
      },
    };
  }
  const media = novaMidia(),
    service = criarServico({ Produto, midias: media });
  return { dir, db, Produto, Media, media, service, novaMidia };
}
const uri = (bytes, type = "image/png") =>
  "data:" + type + ";base64," + bytes.toString("base64");
async function sample(format = "png") {
  const pixels = crypto.randomBytes(1200 * 900 * 3);
  return sharp(pixels, { raw: { width: 1200, height: 900, channels: 3 } })
    [format]()
    .toBuffer();
}
test("JPG, PNG, WebP e AVIF: conteúdo real, três versões, redução e dimensões sem distorção", async (t) => {
  const f = await fixture(t);
  for (const format of ["jpeg", "png", "webp", "avif"]) {
    let bytes;
    try {
      bytes = await sample(format);
    } catch (e) {
      if (format === "avif") {
        t.diagnostic("AVIF indisponível neste ambiente: " + e.message);
        continue;
      }
      throw e;
    }
    const d = await f.service.preparar(
      1,
      uri(bytes, "application/octet-stream"),
    );
    const thumbs = await f.media.ler(1, d.imagemVersoes.miniatura),
      medium = await f.media.ler(1, d.imagemVersoes.media),
      full = await f.media.ler(1, d.imagem);
    const m = await sharp(thumbs.bytes).metadata(),
      m2 = await sharp(medium.bytes).metadata(),
      m3 = await sharp(full.bytes).metadata();
    assert.equal(m.format, "webp");
    assert.equal(m.width, 160);
    assert.equal(m.height, 120);
    assert.ok(m2.width <= 480 && m3.width <= 1200);
    assert.ok(thumbs.bytes.length < 20000);
    assert.ok(medium.bytes.length < 80000);
    assert.ok(
      full.bytes.length < bytes.length ||
        format === "webp" ||
        format === "avif",
    );
    t.diagnostic(
      format +
        ": entrada " +
        bytes.length +
        " B; miniatura " +
        thumbs.bytes.length +
        " B; média " +
        medium.bytes.length +
        " B; ampliada " +
        full.bytes.length +
        " B",
    );
  }
});
test("EXIF é corrigido, arquivo inválido e excesso de tamanho rejeitados antes do armazenamento", async (t) => {
  const f = await fixture(t);
  const jpg = await sharp({
    create: { width: 320, height: 200, channels: 3, background: "red" },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const r = await f.service.preparar(1, uri(jpg));
  const m = await sharp((await f.media.ler(1, r.imagem)).bytes).metadata();
  assert.equal(m.width, 200);
  assert.equal(m.height, 320);
  await assert.rejects(
    f.service.preparar(1, uri(Buffer.from('<svg onload="evil()"></svg>'))),
    (e) => e.status === 415,
  );
  await assert.rejects(
    f.service.decodificar(Buffer.alloc(17 * 1024 * 1024)),
    (e) => e.status === 413,
  );
  await assert.rejects(
    f.service.preparar(1, "data:image/heic;base64,YWJjZA=="),
    (e) => e.status === 415,
  );
});
test("persistência: nova instância lê arquivos registrados; empresa diferente não lê a foto", async (t) => {
  const f = await fixture(t),
    bytes = await sample();
  const dados = await f.service.preparar(1, uri(bytes));
  await f.Produto.create({ id: "1", empresa_id: 1, nome: "Ração", ...dados });
  const restarted = criarServico({ Produto: f.Produto, midias: f.novaMidia() });
  const r = await restarted.imagem(1, "1");
  assert.ok(r.bytes.length > 0);
  await assert.rejects(restarted.imagem(2, "1"), (e) => e.status === 404);
  const rows = await f.Media.count();
  const result = await restarted.otimizarRegistro(
    await f.Produto.findByPk("1"),
  );
  assert.equal(result.status, "ja-otimizada");
  assert.equal(await f.Media.count(), rows);
  const reutilizada=await restarted.preparar(1,dados.imagem);
  assert.equal(reutilizada.imagem,dados.imagem);
  assert.equal(await f.Media.count(), rows);
});
test("falha do armazenamento preserva cadastro; imagem antiga e corrida de edição não são sobrescritas", async (t) => {
  const f = await fixture(t),
    old = await f.media.salvar(1, await sample(), "produtos"),
    p = await f.Produto.create({ id: "1", empresa_id: 1, imagem: old.url });
  let writes = 0;
  const bad = criarServico({
    Produto: f.Produto,
    midias: {
      ...f.media,
      salvar: async (...args) => {
        if (++writes === 2)
          throw Object.assign(Error("Armazenamento indisponível"), {
            status: 503,
          });
        return f.media.salvar(...args);
      },
    },
  });
  await assert.rejects(bad.otimizarRegistro(p));
  assert.equal((await p.reload()).imagem, old.url);
  assert.equal(p.imagemVersoes, null);
  assert.ok((await f.media.ler(1, old.url)).bytes.length);
  const race = criarServico({
    Produto: f.Produto,
    midias: {
      ...f.media,
      salvar: async (...args) => {
        await f.Produto.update(
          { imagem: "nova-foto.webp" },
          { where: { id: "1" } },
        );
        return f.media.salvar(...args);
      },
    },
  });
  const result = await race.otimizarRegistro(p);
  assert.equal(result.status, "alterada-durante-processamento");
  assert.equal((await p.reload()).imagem, "nova-foto.webp");
});
test("migração em lotes é retomável e reporta originais ausentes sem inventar fotos", async (t) => {
  const f = await fixture(t),
    {
      migrar,
      preparar,
    } = require("../backend/scripts/otimizar-imagens-produtos");
  await preparar(f.Produto);
  await preparar(f.Produto);
  const old = await f.media.salvar(1, await sample(), "produtos");
  await f.Produto.bulkCreate([
    { id: "01", empresa_id: 1, imagem: old.url },
    { id: "02", empresa_id: 1, imagem: "/uploads/produtos/ausente.webp" },
    { id: "03", empresa_id: 2, imagem: old.url },
  ]);
  const rows = [];
  await migrar({
    Produto: f.Produto,
    servico: f.service,
    empresaId: 1,
    limite: 1,
    aplicar: true,
    relatar: (r) => rows.push(r),
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].status, "otimizada");
  assert.equal(rows[1].status, "falha");
  assert.match(rows[1].erro, /não encontrado/);
  assert.equal(
    (await f.Produto.findByPk("02")).imagem,
    "/uploads/produtos/ausente.webp",
  );
  const resume = [];
  await migrar({
    Produto: f.Produto,
    servico: f.service,
    empresaId: 1,
    apos: "01",
    aplicar: true,
    relatar: (r) => resume.push(r),
  });
  assert.deepEqual(
    resume.map((r) => r.produto),
    ["02"],
  );
  assert.equal((await f.Produto.findByPk("03")).imagemVersoes, null);
});
test("rota de produto: upload persistente, erro não é sucesso e leitura respeita empresa e cache privado", async (t) => {
  const f = await fixture(t),
    handlers = {},
    router = {
      use() {},
      get(p, ...fn) {
        handlers["GET " + p] = fn.at(-1);
      },
      post(p, ...fn) {
        handlers["POST " + p] = fn.at(-1);
      },
      put(p, ...fn) {
        handlers["PUT " + p] = fn.at(-1);
      },
      delete() {},
    };
  load("backend/routes/itemRoutes.js", {
    express: { Router: () => router },
    "../models/Produto": f.Produto,
    "../models/Fornecedor": {},
    "../middleware/authUser": { authUser() {} },
    "../services/produtoImagens": { instancia: () => f.service },
  });
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
        this.headers["Content-Type"] = t;
        return this;
      },
      json(b) {
        this.body = b;
        return this;
      },
      send(b) {
        this.body = b;
        return this;
      },
      end() {
        return this;
      },
    };
  }
  const p = await f.Produto.create({
    id: "1",
    empresa_id: 1,
    nome: "Produto",
    imagem: null,
  });
  const bytes = await sample();
  let res = response();
  await handlers["PUT /:id"](
    {
      params: { id: "1" },
      user: { empresaId: 1 },
      body: { imagem: uri(bytes) },
      query: {},
      headers: {},
    },
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.match((await p.reload()).imagem, /uploads/);
  res = response();
  await handlers["GET /:id/imagem"](
    {
      params: { id: "1" },
      user: { empresaId: 1 },
      query: { v: "1" },
      headers: {},
    },
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["Content-Type"], "image/webp");
  assert.match(res.headers["Cache-Control"], /private/);
  const current = p.imagem;
  res = response();
  await handlers["PUT /:id"](
    {
      params: { id: "1" },
      user: { empresaId: 1 },
      body: { imagem: uri(Buffer.from("não é imagem")) },
      query: {},
      headers: {},
    },
    res,
  );
  assert.equal(res.statusCode, 415);
  assert.equal((await p.reload()).imagem, current);
  res = response();
  await handlers["PUT /:id"](
    {
      params: { id: "1" },
      user: { empresaId: 2 },
      body: { imagem: null },
      query: {},
      headers: {},
    },
    res,
  );
  assert.equal(res.statusCode, 404);
  assert.equal((await p.reload()).imagem, current);
});
function dom(html = "<!doctype html><html><head></head><body></body></html>") {
  return new JSDOM(html, {
    url: "https://pethub.test/item/meus-itens.html",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole: new VirtualConsole(),
  });
}
test("7 flags ocultam links e grupos vazios, suportam injeção e reativação, mantendo Compras", async (t) => {
  const d = dom(
    '<!doctype html><html><head></head><body><a id="compras" href="/compras/entrada-mercadoria.html">Compras</a><div><button id="compBtnRelatorios">Relatórios</button><div id="compSubRelatorios"><a href="#">Entrada por produto</a><a href="#">Sugestão de compra</a></div></div>' +
      [
        "Rel. Demonstrativo de Resultados",
        "Rel. Recebíveis por Produtos",
        "Rel. Demonstrativo de Caixa",
        "Devolução de Venda",
        "Sugestão de Compra",
        "Entrada no Período",
        "Entrada por Produto",
      ]
        .map((x) => '<a href="#">' + x + "</a>")
        .join("") +
      "</body></html>",
  );
  t.after(() => d.window.close());
  const w = d.window;
  w.eval(
    syncfs.readFileSync(
      path.join(root, "frontend/components/feature-flags.js"),
      "utf8",
    ),
  );
  assert.equal(Object.keys(w.PetHubFeatures.config).length, 7);
  const links = [...w.document.querySelectorAll("a[data-pethub-feature]")];
  assert.ok(links.length >= 7);
  for (const el of links) assert.equal(w.getComputedStyle(el).display, "none");
  assert.notEqual(
    w.getComputedStyle(w.document.getElementById("compras")).display,
    "none",
  );
  assert.equal(
    w.getComputedStyle(w.document.getElementById("compBtnRelatorios")).display,
    "none",
  );
  const novo = w.document.createElement("a");
  novo.href = "/painel/rel-demonstrativo-resultados.html";
  novo.textContent = "Abrir relatório";
  w.document.body.append(novo);
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(w.getComputedStyle(novo).display, "none");
  w.PetHubFeatures.set("relatorioDRE", true);
  assert.notEqual(w.getComputedStyle(novo).display, "none");
});
test("integração HTML preserva código e é idempotente, inclui formulários e menus antigos", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pethub-html-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  await fs.writeFile(
    path.join(dir, "novo-produto.html"),
    '<html><head></head><body class="sidebar"><a href="#">Sugestão de compra</a><a href="compras.html">Compras</a><form class="cadastro-form"></form></body></html>',
  );
  const { integrar } = require("../backend/scripts/integrar-menus-imagens");
  assert.equal(integrar(dir), 1);
  assert.equal(integrar(dir), 0);
  const html = await fs.readFile(path.join(dir, "novo-produto.html"), "utf8");
  assert.match(html, /data-pethub-feature="sugestaoCompra"/);
  assert.match(html, /produtoFotoArquivo/);
  assert.match(html, />Compras</);
  assert.match(html, /feature-flags/);
});
test("miniatura usa rota autenticada, imagens quebradas viram placeholder e lista com 2000 itens cria só 60 cards", (t) => {
  const d = dom();
  t.after(() => d.window.close());
  const w = d.window;
  w.eval(
    syncfs.readFileSync(
      path.join(root, "frontend/components/produto-imagens.js"),
      "utf8",
    ),
  );
  const h = w.PetHubProdutoImagem,
    p = {
      id: "1",
      empresa_id: 1,
      imagem: "https://dominio.test/uploads/produtos/foto.webp",
    };
  assert.match(h.url(p), /api\/itens\/1\/imagem\?versao=miniatura/);
  assert.ok(!h.url(p).includes("/uploads/https"));
  const box = w.document.createElement("div"),
    img = w.document.createElement("img");
  box.append(img);
  w.document.body.append(box);
  h.aplicar(img, p);
  assert.equal(img.loading, "lazy");
  assert.equal(img.alt, "");
  img.dispatchEvent(new w.Event("error"));
  assert.equal(img.style.display, "none");
  assert.equal(
    box.querySelector("[data-produto-placeholder]").style.display,
    "flex",
  );
  const grid = w.document.createElement("div");
  w.document.body.append(grid);
  h.renderizarLista(
    grid,
    Array.from({ length: 2000 }, (_, id) => ({ id })),
    (p) => {
      const c = w.document.createElement("article");
      c.textContent = p.id;
      return c;
    },
  );
  assert.equal(grid.querySelectorAll("article").length, 60);
  grid.querySelector("button").click();
  assert.equal(grid.querySelectorAll("article").length, 120);
});
test("revisão das páginas ERP: integração presente e todos os acessos identificados recebem a flag", async (t) => {
  const files = [];
  async function walk(dir) {
    for (const item of await fs.readdir(dir, { withFileTypes: true })) {
      if (item.name === "node_modules") continue;
      const p = path.join(dir, item.name);
      if (item.isDirectory()) await walk(p);
      else if (p.endsWith(".html")) files.push(p);
    }
  }
  await walk(path.join(root, "frontend"));
  let paginas = 0,
    acessos = 0;
  const code = syncfs.readFileSync(
    path.join(root, "frontend/components/feature-flags.js"),
    "utf8",
  );
  for (const file of files) {
    const html = await fs.readFile(file, "utf8");
    if (
      !/sidebar|dashboard\.css|inject-sidebar/.test(html) ||
      !/<head\b/i.test(html)
    )
      continue;
    assert.match(html, /components\/feature-flags\.js/);
    const d = dom(html),
      w = d.window;
    w.eval(code);
    for (const el of w.document.querySelectorAll('a,button,[role="tab"]')) {
      const f = w.PetHubFeatures.identificar(el);
      if (f) {
        acessos++;
        assert.equal(el.dataset.pethubFeature, f);
        assert.equal(
          w.document.documentElement.getAttribute(
            "data-pethub-" + f.toLowerCase(),
          ),
          "off",
        );
      }
    }
    paginas++;
    w.close();
  }
  assert.ok(paginas >= 100);
  assert.ok(acessos > 100);
  t.diagnostic(
    "Páginas verificadas: " +
      paginas +
      "; acessos ocultados identificados: " +
      acessos,
  );
});
test("pipeline completo reaproveita MidiaArquivo e confirma objetos; nova instância encontra as variantes", async (t) => {
  const f = await fixture(t),
    midiaReal = require("../backend/services/midias");
  const store = {
    async gravar(chave, bytes) {
      const alvo = path.join(f.dir, chave);
      await fs.mkdir(path.dirname(alvo), { recursive: true });
      await fs.writeFile(alvo, bytes);
    },
    async ler(chave) {
      return fs.readFile(path.join(f.dir, chave));
    },
  };
  const media = midiaReal.criarServico({ db: f.db, store }),
    s = criarServico({ Produto: f.Produto, midias: media });
  const bytes = await sharp({
    create: { width: 800, height: 600, channels: 3, background: "#2977ba" },
  })
    .png()
    .toBuffer();
  const dados = await s.preparar(1, uri(bytes));
  await f.Produto.create({ id: "real", empresa_id: 1, ...dados });
  const novaMidia = midiaReal.criarServico({ db: f.db, store }),
    nova = criarServico({ Produto: f.Produto, midias: novaMidia });
  const foto = await nova.imagem(1, "real", "miniatura");
  assert.equal((await sharp(foto.bytes).metadata()).width, 160);
  assert.ok((await media.Media.count()) >= 1);
  await assert.rejects(nova.imagem(2, "real"), (e) => e.status === 404);
});
test("imagem de alta resolução é reduzida e upload acima de 8 MB é rejeitado", async (t) => {
  const f = await fixture(t),
    raw = crypto.randomBytes(2400 * 1600 * 3),
    bytes = await sharp(raw, {
      raw: { width: 2400, height: 1600, channels: 3 },
    })
      .jpeg({ quality: 75 })
      .toBuffer();
  const d = await f.service.preparar(1, uri(bytes, "image/jpeg"));
  const m = await sharp((await f.media.ler(1, d.imagem)).bytes).metadata();
  assert.ok(m.width <= 1200 && m.height <= 1200);
  assert.ok(d.imagemVersoes.medidas.ampliada.bytes < bytes.length);
  await assert.rejects(
    f.service.preparar(1, uri(Buffer.alloc(9 * 1024 * 1024))),
    (e) => e.status === 413,
  );
});
test('detalhes só confirma foto com referência persistida e preserva foto anterior se API falha',async()=>{
 const src=syncfs.readFileSync(path.join(root,'frontend/item/pagina-produto.js'),'utf8'),a=src.indexOf('async function setImagemProduto('),b=src.indexOf('/**',a),old={id:'1',imagem:'antiga.webp'},ctx={produtoAtual:old,window:{},showToast(){},console:{error(){}},ApiClient:{atualizarProduto:async()=>({imagem:'/uploads/produtos/salva.webp',imagemVersoes:{versao:1}})}};
 vm.runInNewContext(src.slice(a,b),ctx);await ctx.setImagemProduto('data:image/png;base64,YWJj');assert.equal(old.imagem,'/uploads/produtos/salva.webp');assert.equal(old.imagemVersoes.versao,1);
 ctx.ApiClient.atualizarProduto=async()=>{throw Error('Sem armazenamento')};await assert.rejects(ctx.setImagemProduto('data:image/png;base64,YWJj'));assert.equal(old.imagem,'/uploads/produtos/salva.webp');
});
