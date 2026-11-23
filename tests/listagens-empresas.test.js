"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm");
const { Sequelize, DataTypes: D } = require("sequelize"),
  { JSDOM, VirtualConsole } = require("jsdom");
const root = path.resolve(__dirname, "..");
function load(file, stubs = {}) {
  const module = { exports: {} };
  const real = require("node:module").createRequire(path.join(root, file));
  vm.runInNewContext(fs.readFileSync(path.join(root, file), "utf8"), {
    module,
    exports: module.exports,
    Buffer,
    console: { log() {}, debug() {}, warn() {}, error() {} },
    __dirname: path.dirname(path.join(root, file)),
    require: (n) => (n in stubs ? stubs[n] : real(n)),
  });
  return module.exports;
}
function res() {
  return {
    code: 200,
    status(n) {
      this.code = n;
      return this;
    },
    set() {
      return this;
    },
    json(v) {
      this.body = JSON.parse(JSON.stringify(v));
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
  const Cliente = db.define("Cliente", {
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
  });
  const Produto = db.define("Produto", {
    id: { type: D.STRING, primaryKey: true },
    nome: D.STRING,
    codigo: D.STRING,
    codigoBarras: D.STRING,
    empresa_id: D.INTEGER,
    agrupamento: D.STRING,
    tipo: D.STRING,
    imagem: D.STRING,
    imagemVersoes: D.JSON,
  });
  await db.sync();
  const clientes = load("backend/controllers/clienteController.js", {
      "../models": { Cliente },
    }),
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
    "./importacaoRoutes": { criarRotas: () => router },
    "../models/Produto": Produto,
    "../models/Fornecedor": {},
    "../middleware/authUser": { authUser() {} },
  });
  return { db, Cliente, Produto, clientes, handlers };
}
test("clientes: contrato pagination restaura offset, páginas e total da própria empresa", async (t) => {
  const f = await fixture(t);
  await f.Cliente.bulkCreate([
    ...Array.from({ length: 31 }, (_, i) => ({
      nome: "Cliente " + i,
      empresa_id: 1,
    })),
    { nome: "Cliente empresa 2", empresa_id: 2 },
  ]);
  const r = res();
  await f.clientes.getAllClientes(
    { user: { empresaId: 1 }, query: { limit: "25", offset: "0" } },
    r,
  );
  assert.equal(r.code, 200);
  assert.equal(r.body.clientes.length, 25);
  assert.equal(r.body.pagination.offset, 0);
  assert.equal(r.body.pagination.total, 31);
  assert.equal(r.body.pagination.hasNext, true);
  assert.ok(r.body.clientes.every((c) => c.nome !== "Cliente empresa 2"));
  const page2 = res();
  await f.clientes.getAllClientes(
    { user: { empresaId: 1 }, query: { limit: "25", offset: "25" } },
    page2,
  );
  assert.equal(page2.body.clientes.length, 6);
  assert.equal(page2.body.pagination.page, 2);
  assert.equal(page2.body.pagination.hasNext, false);
  assert.ok(
    page2.body.clientes.every(
      (c) => !r.body.clientes.some((old) => old.id === c.id),
    ),
  );
  const outra = res();
  await f.clientes.getAllClientes({ user: { empresaId: 2 }, query: {} }, outra);
  assert.equal(outra.body.pagination.total, 1);
  assert.equal(outra.body.clientes[0].nome, "Cliente empresa 2");
  assert.equal(await f.Cliente.count(), 32);
});
test("clientes: vazio tem paginação; parâmetros inválidos não quebram; busca preserva acentos", async (t) => {
  const f = await fixture(t);
  await f.Cliente.create({ nome: "JOÃO DA SILVA", empresa_id: 1 });
  let r = res();
  await f.clientes.getAllClientes(
    {
      user: { empresaId: 1 },
      query: { search: "joao silva", limit: "NaN", offset: "-5" },
    },
    r,
  );
  assert.equal(r.body.pagination.offset, 0);
  assert.equal(r.body.clientes.length, 1);
  r = res();
  await f.clientes.getAllClientes({ user: { empresaId: 2 }, query: {} }, r);
  assert.equal(r.body.pagination.total, 0);
  assert.deepEqual(r.body.clientes, []);
  r = res();
  await f.clientes.getAllClientes({ user: {}, query: {} }, r);
  assert.equal(r.code, 403);
});
test("produtos antigos aparecem sem coluna de variantes e com agrupamento NULL; empresas continuam isoladas", async (t) => {
  const f = await fixture(t);
  await f.Produto.bulkCreate([
    {
      id: "1",
      nome: "MAGNUS",
      empresa_id: 1,
      agrupamento: null,
      imagem: "foto-antiga.png",
    },
    { id: "2", nome: "HOT CAT", empresa_id: 1, agrupamento: "" },
    {
      id: "3",
      nome: "Medicamento separado",
      empresa_id: 1,
      agrupamento: "MEDICAMENTOS",
    },
    { id: "4", nome: "Produto empresa 2", empresa_id: 2, agrupamento: null },
    { id: "5", nome: "Proprietário desconhecido", empresa_id: null },
  ]);
  await f.db
    .getQueryInterface()
    .removeColumn(f.Produto.getTableName(), "imagemVersoes");
  await assert.rejects(f.Produto.findAll(), /imagemVersoes/);
  const r = res();
  await f.handlers["/"](
    { user: { empresaId: 1 }, query: { excludeAgrupamento: "MEDICAMENTOS" } },
    r,
  );
  assert.equal(r.code, 200);
  assert.deepEqual(r.body.map((p) => p.id).sort(), ["1", "2"]);
  assert.equal(r.body.find((p) => p.id === "1").imagem, "foto-antiga.png");
  const detail = res();
  await f.handlers["/:id"](
    { user: { empresaId: 1 }, params: { id: "1" } },
    detail,
  );
  assert.equal(detail.code, 200);
  assert.equal(detail.body.nome, "MAGNUS");
  const denied = res();
  await f.handlers["/:id"](
    { user: { empresaId: 2 }, params: { id: "1" } },
    denied,
  );
  assert.equal(denied.code, 404);
  assert.equal(await f.Produto.count(), 5);
  const cols = await f.db
    .getQueryInterface()
    .describeTable(f.Produto.getTableName());
  assert.equal(cols.imagemVersoes, undefined);
});
test("consulta compatível não mascara erros diferentes da coluna opcional", async () => {
  const {
    consultarItens,
  } = require("../backend/services/consultaItensCompativel");
  let calls = 0;
  await assert.rejects(
    consultarItens(
      {
        findAll: async () => {
          calls++;
          throw Error("Conexão indisponível");
        },
      },
      "findAll",
    ),
    /Conexão/,
  );
  assert.equal(calls, 1);
});
async function tela(t) {
  const dom = new JSDOM(
    '<!doctype html><html><head></head><body><div id="productsGrid"></div></body></html>',
    {
      url: "https://pethub.test/item/meus-itens.html",
      runScripts: "outside-only",
      pretendToBeVisual: true,
      virtualConsole: new VirtualConsole(),
    },
  );
  t.after(() => dom.window.close());
  const w = dom.window;
  w.document.addEventListener = () => {};
  const append = w.document.head.append.bind(w.document.head);
  w.document.head.append = (...nodes) => {
    append(...nodes);
    for (const n of nodes)
      if (n.tagName === "SCRIPT")
        queueMicrotask(() => n.dispatchEvent(new w.Event("error")));
  };
  w.ApiClient = {
    getProdutos: async () => [
      {
        id: "1",
        nome: "MAGNUS",
        tipo: "produto",
        preco: 100,
        estoqueAtual: 4,
        imagem: "foto.png",
      },
      { id: "2", nome: "Banho", tipo: "servico", preco: 50 },
    ],
    getVendas: async () => [],
  };
  w.eval(
    fs.readFileSync(path.join(root, "frontend/item/meus-itens.js"), "utf8"),
  );
  return w;
}
test("tela real mantém os cards mesmo sem componentes novos carregados no HTML", async (t) => {
  const w = await tela(t);
  assert.equal(w.PetHubProdutoImagem, undefined);
  await w.inicializarProdutosLista();
  w.renderizarProdutos("todos");
  const cards = w.document.querySelectorAll(".product-card");
  assert.equal(cards.length, 2);
  assert.match(w.document.getElementById("productsGrid").textContent, /MAGNUS/);
  assert.match(w.document.getElementById("productsGrid").textContent, /Banho/);
});
test("tela real distingue falha da API de lista vazia e permite tentar novamente", async (t) => {
  const w = await tela(t);
  w.ApiClient.getProdutos = async () => {
    throw Error("HTTP 500");
  };
  await w.inicializarProdutosLista();
  w.renderizarProdutos("todos");
  const grid = w.document.getElementById("productsGrid");
  assert.match(grid.textContent, /Não foi possível carregar/);
  assert.doesNotMatch(grid.textContent, /Nenhum item cadastrado/);
  w.ApiClient.getProdutos = async () => [
    { id: "1", nome: "Produto preservado", tipo: "produto", preco: 1 },
  ];
  grid.querySelector("button").click();
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(grid.querySelectorAll(".product-card").length, 1);
  assert.match(grid.textContent, /Produto preservado/);
});
test("foto antiga permanece legível sem preparar variantes e sem atualizar o produto", async (t) => {
  const f = await fixture(t),
    sharp = require("sharp");
  await f.Produto.create({
    id: "1",
    nome: "Produto antigo",
    empresa_id: 1,
    imagem: "foto.png",
  });
  await f.db
    .getQueryInterface()
    .removeColumn(f.Produto.getTableName(), "imagemVersoes");
  const bytes = await sharp({
    create: { width: 800, height: 600, channels: 3, background: "orange" },
  })
    .png()
    .toBuffer();
  let leituras = 0;
  const service = require("../backend/services/produtoImagens").criarServico({
    Produto: f.Produto,
    midias: {
      ler: async (emp, ref) => {
        assert.equal(emp, 1);
        assert.equal(ref, "foto.png");
        leituras++;
        return { bytes, tipo: "image/png" };
      },
      salvar: async () => {
        throw Error("Não deve escrever nesta leitura");
      },
    },
  });
  const img = await service.imagem(1, "1", "miniatura");
  assert.equal((await sharp(img.bytes).metadata()).width, 160);
  assert.equal(leituras, 1);
  assert.equal(await f.Produto.count(), 1);
});

test('tela publicada de clientes consome a resposta real: primeira/segunda página, busca e vazio', async t => {
  const f = await fixture(t);
  await f.Cliente.bulkCreate([...Array.from({length:27},(_,i)=>({nome:'RegistroCliente'+i,empresa_id:1})),{nome:'Empresa alheia',empresa_id:2}]);
  const dom=new JSDOM('<table><tbody id="clientsTableBody"></tbody></table><div class="pagination-container"></div>',{runScripts:'outside-only'});
  t.after(()=>dom.window.close());
  const w=dom.window;w.itemsPerPage=25;w.currentPage=1;w.filtrosAtivos={};let atualizacoes=0;
  w.updatePaginationInfo=()=>atualizacoes++;
  w.fetch=async url=>{const query=Object.fromEntries(new URL(url,'https://pethub.test').searchParams);const r=res();await f.clientes.getAllClientes({user:{empresaId:1},query},r);return {ok:r.code===200,json:async()=>r.body};};
  // Código exato servido em produção, sem adaptar o consumidor ao teste.
  w.eval(fs.readFileSync(path.join(__dirname,'fixtures/clientes-paginacao-publicada.js'),'utf8'));
  await w.PetHubClientesPagina.carregar();
  assert.equal(w.document.querySelectorAll('.client-row').length,25);
  assert.equal(w.totalClients,27);
  assert.match(w.document.getElementById('ph-total-clientes').textContent,/Total da empresa: 27/);
  w.currentPage=2;await w.PetHubClientesPagina.carregar();assert.equal(w.document.querySelectorAll('.client-row').length,2);
  w.currentPage=1;w.filtrosAtivos.busca='RegistroCliente26';await w.PetHubClientesPagina.carregar();
  assert.equal(w.document.querySelectorAll('.client-row').length,1);
  assert.match(w.document.getElementById('ph-total-clientes').textContent,/Total da empresa: 27 · Encontrados com os filtros: 1/);
  w.filtrosAtivos.busca='Ausente';await w.PetHubClientesPagina.carregar();assert.match(w.document.getElementById('clientsTableBody').textContent,/Nenhum cliente/);
  assert.equal(w.totalClients,0);assert.equal(atualizacoes,4);
});

test('detalhes do produto preservam ID texto da URL até a API e rejeitam outra empresa',async t=>{
 const f=await fixture(t),id='7832-abcd-1234';
 await f.Produto.create({id,nome:'Produto original',empresa_id:1});
 const dom=new JSDOM('',{url:'https://pethub.test/item/pagina-produto.html?id='+encodeURIComponent(id),runScripts:'outside-only'});t.after(()=>dom.window.close());const w=dom.window;
 w.console={log(){},error(){},warn(){},debug(){}};
 w.eval(fs.readFileSync(path.join(root,'frontend/api/api-client.js'),'utf8'));
 let endpoint;
 w.ApiClient.request=async p=>{endpoint=p;const r=res();await f.handlers['/:id']({user:{empresaId:1},params:{id:decodeURIComponent(p.split('/').at(-1))}},r);if(r.code!==200)throw Error(r.body.error);return r.body;};
 const src=fs.readFileSync(path.join(root,'frontend/item/pagina-produto.js'),'utf8');
 const load=src.slice(src.indexOf('async function carregarDadosProduto('),src.indexOf('/**\n * Atualizar campos com dados do produto'));
 let displayed;w.atualizarCamposProduto=p=>displayed=p;w.showToast=m=>assert.fail(m);w.produtoAtual=null;
 w.eval(load);
 const init=src.slice(src.indexOf('function inicializarPaginaProduto()'),src.indexOf('  // Configurar abas',src.indexOf('function inicializarPaginaProduto()')))+'}';
 let pending;const real=w.carregarDadosProduto;w.carregarDadosProduto=p=>(pending=real(p));w.eval(init);w.inicializarPaginaProduto();await pending;
 assert.equal(endpoint,'/itens/'+id);assert.equal(displayed.id,id);assert.equal(displayed.nome,'Produto original');
 const denied=res();await f.handlers['/:id']({user:{empresaId:2},params:{id}},denied);assert.equal(denied.code,404);
 for(const opaque of ['00007832','produto/a?b#c','90071992547409931234']){w.ApiClient.request=async p=>p;assert.equal(await w.ApiClient.getProduto(opaque),'/itens/'+encodeURIComponent(opaque));assert.equal(await w.ApiClient.atualizarProduto(opaque,{}),'/itens/'+encodeURIComponent(opaque));assert.equal(await w.ApiClient.getHistoricoEstoque(opaque),'/itens/'+encodeURIComponent(opaque)+'/historico-estoque');}
});

test('editar, clonar e formulário alternativo preservam IDs sem conversão numérica',()=>{
 const id='7832-f00a',cases=[['editar-produto.js','id'],['editar-produto.js','clonar'],['novo-produto.js','id']];
 for(const[file,key]of cases){let recebido;const src=fs.readFileSync(path.join(root,'frontend/item',file),'utf8');const start=src.indexOf('function inicializarFormulario()');const end=src.indexOf('  // Configurar botões toggle',start);const context={console:{log(){}},URLSearchParams,window:{location:{search:'?'+key+'='+id}},localStorage:{getItem(){return null;}},carregarDadosProduto:x=>recebido=x,carregarDadosProdutoParaClonar:x=>recebido=x};vm.runInNewContext(src.slice(start,end)+'}',context);context.inicializarFormulario();assert.equal(recebido,id);}
});

test('404 do produto não é substituído por dados locais antigos ou exemplos',async()=>{
 const src=fs.readFileSync(path.join(root,'frontend/item/pagina-produto.js'),'utf8');let msg,rendered=false;const ctx={console:{log(){},error(){}},produtoAtual:{id:1},produtosExemplo:[{id:1}],localStorage:{getItem(){throw Error('Não deve consultar cache local');}},ApiClient:{async getProduto(){throw Error('Produto não encontrado (HTTP 404)');}},atualizarCamposProduto(){rendered=true;},showToast:m=>msg=m};
 vm.runInNewContext(src.slice(src.indexOf('async function carregarDadosProduto('),src.indexOf('/**\n * Atualizar campos com dados do produto')),ctx);
 await ctx.carregarDadosProduto('1');assert.equal(rendered,false);assert.equal(ctx.produtoAtual,null);assert.match(msg,/HTTP 404/);
});
