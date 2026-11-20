"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs"),
  path = require("path"),
  { JSDOM, VirtualConsole } = require("jsdom");
const base = path.join(__dirname, "../frontend/atendimento/");
const wait = (ms = 30) => new Promise((r) => setTimeout(r, ms));
async function app(t, preferred = "rapido") {
  const errors = [],
    calls = [],
    vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(e.message));
  const dom = new JSDOM(fs.readFileSync(base + "nova-venda.html", "utf8"), {
    url: "https://pethub.test/atendimento/nova-venda.html",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole: vc,
  });
  const w = dom.window,
    d = w.document;
  t.after(() => w.close());
  w.confirmar = async () => true;
  w.confirm = () => true;
  w.alert = () => {};
  w.scrollTo = () => {};
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new w.Event("close"));
  };
  const products = [
    {
      id: "p1",
      nome: "Ração",
      preco: 12.5,
      estoqueAtual: 3,
      tipo: "produto",
      codigoBarras: "789001",
    },
    { id: "p2", nome: "Banho", preco: 50, estoqueAtual: 0, tipo: "servico" },
    { id: "p3", nome: "Granel", preco: 10, estoqueAtual: 2.5, tipo: "produto" },
  ];
  w.fetch = async (url, opt = {}) => ({
    ok: true,
    json: async () =>
      String(url).includes("/caixas/aberto") ? { aberto: true } : [],
  });
  w.ApiClient = {
    getProdutos: async () => products,
    request: async (p, o = {}) => {
      calls.push({ p, ...o });
      if (p === "/caixas/aberto") return { aberto: true };
      if (o.method === "PUT") {
        preferred = JSON.parse(o.body).layout;
        return { layout: preferred };
      }
      return { layout: preferred };
    },
    criarVenda: async (b) => {
      calls.push({ kind: "create", b: JSON.parse(JSON.stringify(b)) });
      await wait();
      return { id: 88 };
    },
    atualizarVenda: async (id, b) => {
      calls.push({ kind: "update", id, b: JSON.parse(JSON.stringify(b)) });
      await wait(40);
      return { id };
    },
    atualizarEstoque: async (...args) => calls.push({ kind: "stock", args }),
  };
  w.eval(fs.readFileSync(base + "nova-venda.js", "utf8"));
  w.eval(fs.readFileSync(base + "caixa-rapido.js", "utf8"));
  await wait(350);
  w.mostrarNotificacao = (type, message) =>
    calls.push({ kind: "notice", type, message });
  return {
    w,
    d,
    errors,
    calls,
    products,
    click: (s) => d.querySelector(s).click(),
    key: (key, node = d) =>
      node.dispatchEvent(
        new w.KeyboardEvent("keydown", {
          key,
          bubbles: true,
          cancelable: true,
        }),
      ),
  };
}
test("troca mantém o mesmo carrinho, cliente, profissional e campos; clássico é padrão", async (t) => {
  const a = await app(t, "classico");
  assert.equal(a.w.PetHubCaixa.layout, "classico");
  await a.w.PetHubVenda.adicionar(a.products[0]);
  a.d.querySelector("#observacoes").value = "Manter";
  const original = a.d.querySelector("#pesquisarCliente");
  original.value = "Ana";
  a.d.querySelector("#pesquisarProfissional").value = "João";
  a.w.PetHubCaixa.aplicar("rapido");
  assert.equal(a.d.querySelector("#qr-customer #pesquisarCliente"), original);
  assert.equal(a.w.PetHubVenda.dados().itens.length, 1);
  a.w.PetHubCaixa.aplicar("classico");
  assert.equal(
    a.d.querySelector(".resumo-section #pesquisarCliente"),
    original,
  );
  assert.equal(original.value, "Ana");
  assert.equal(a.d.querySelector("#observacoes").value, "Manter");
  assert.equal(a.d.querySelector("#pesquisarProfissional").value, "João");
  assert.equal(a.d.querySelectorAll("#pesquisarCliente").length, 1);
  assert.equal(a.errors.length, 0);
});
test("leitor repetido incrementa, impede estoque acumulado e preserva quantidades fracionadas", async (t) => {
  const a = await app(t),
    input = a.d.querySelector("#pesquisarProduto");
  for (let n = 0; n < 4; n++) {
    input.value = "789001";
    a.key("Enter", input);
  }
  await wait(200);
  assert.equal(a.w.PetHubVenda.dados().itens.length, 1);
  assert.equal(a.w.PetHubVenda.dados().itens[0].quantidade, 3);
  assert.equal(a.w.PetHubVenda.dados().totais.final, 37.5);
  assert.equal(a.d.activeElement, input);
  await a.w.PetHubVenda.adicionar(a.products[2], 0.5);
  assert.equal(a.w.PetHubVenda.dados().totais.final, 42.5);
  const id = a.w.PetHubVenda.dados().itens[1].id;
  assert.equal(await a.w.PetHubVenda.quantidade(id, 2.6), false);
  assert.equal(await a.w.PetHubVenda.quantidade(id, 1.25), true);
  assert.equal(a.w.PetHubVenda.dados().totais.final, 50);
  assert.equal(a.errors.length, 0);
});
test("atalhos, totais com descontos/acréscimo e seletores reais do layout", async (t) => {
  const a = await app(t);
  await a.w.PetHubVenda.adicionar(a.products[0]);
  a.key("F2");
  assert.equal(a.d.activeElement.id, "pesquisarProduto");
  a.key("F4");
  assert.equal(a.d.activeElement.id, "pesquisarCliente");
  a.key("F6");
  assert.equal(a.d.activeElement.id, "descontoGeralValor");
  const discount = a.d.querySelector("#descontoGeralValor");
  discount.value = "2,50";
  discount.dispatchEvent(new a.w.Event("input", { bubbles: true }));
  assert.equal(a.w.PetHubVenda.dados().totais.final, 10);
  const fee = a.d.querySelector("#acrescimoValor");
  fee.value = "1,00";
  fee.dispatchEvent(new a.w.Event("input", { bubbles: true }));
  assert.equal(a.w.PetHubVenda.dados().totais.final, 11);
  a.key("F3");
  assert.equal(
    a.d.activeElement.getAttribute("aria-label"),
    "Quantidade de Ração",
  );
  a.click(".qr-toolbar button");
  assert(a.d.querySelector("dialog[open]"));
  assert.match(a.d.querySelector("dialog").textContent, /Em uso/);
  a.d.querySelector("dialog").close();
  assert.equal(a.errors.length, 0);
});
test("dinheiro/troco e F8 duplo usam uma venda e uma baixa de estoque", async (t) => {
  const a = await app(t);
  await a.w.PetHubVenda.adicionar(a.products[0]);
  a.d.querySelector("#observacoes").value = "Pedido balcão";
  a.key("F7");
  a.key("F7");
  await wait(100);
  assert.equal(a.calls.filter((c) => c.kind === "create").length, 1);
  assert(a.d.querySelector("#modalPagamento"));
  a.click("[data-forma=dinheiro]");
  const input = a.d.querySelector("#valor-dinheiro");
  input.value = "20";
  input.dispatchEvent(new a.w.Event("input", { bubbles: true }));
  assert.match(a.d.querySelector("#qr-change").textContent, /7,50/);
  a.key("F8");
  a.key("F8");
  await wait(180);
  assert.equal(a.calls.filter((c) => c.kind === "update").length, 1);
  assert.equal(a.calls.filter((c) => c.kind === "stock").length, 1);
  const sale = a.calls.find((c) => c.kind === "update").b;
  assert.equal(sale.pagamentos[0].valor, 12.5);
  assert.equal(sale.pagamentos[0].troco, 7.5);
  assert.equal(sale.totalPago, 12.5);
  assert.equal(sale.observacoes, "Pedido balcão");
  assert.equal(a.w.PetHubVenda.dados().itens.length, 0);
  assert.equal(a.errors.length, 0);
});
test("múltiplo recusa falta e aceita soma exata sem enviar venda parcial", async (t) => {
  const a = await app(t);
  await a.w.PetHubVenda.adicionar(a.products[1]);
  a.key("F7");
  await wait(100);
  a.click("[data-forma=pix]");
  a.d.querySelector("#valor-pix").value = "20";
  a.d.querySelector("#chave-pix").value = "loja@example.test";
  a.click("#adicionarPagamento");
  await wait();
  a.key("F8");
  await wait();
  assert.equal(a.calls.filter((c) => c.kind === "update").length, 0);
  a.click("[data-forma=debito]");
  a.d.querySelector("#valor-debito").value = "30";
  a.click("#adicionarPagamento");
  await wait();
  a.key("F8");
  await wait(150);
  assert.equal(a.calls.filter((c) => c.kind === "update").length, 1);
  assert.equal(a.calls.find((c) => c.kind === "update").b.totalPago, 50);
  assert.equal(a.calls.filter((c) => c.kind === "stock").length, 0);
  assert.equal(a.errors.length, 0);
});
test("seletor salva no servidor e muda sem descartar a venda; ESC pede confirmação", async (t) => {
  const a = await app(t);
  await a.w.PetHubVenda.adicionar(a.products[0]);
  a.click(".qr-toolbar button");
  a.d.querySelector(".qr-layout-cards article button").click();
  await wait(80);
  assert.equal(a.w.PetHubCaixa.layout, "classico");
  assert.equal(a.w.PetHubVenda.dados().itens.length, 1);
  assert.equal(a.calls.filter((c) => c.method === "PUT").length, 1);
  assert.deepEqual(JSON.parse(a.calls.find((c) => c.method === "PUT").body), {
    layout: "classico",
  });
  a.w.PetHubCaixa.aplicar("rapido");
  a.w.confirmar = async () => false;
  a.key("Escape");
  await wait();
  assert.equal(a.w.PetHubVenda.dados().itens.length, 1);
  a.w.confirmar = async () => true;
  a.key("Escape");
  await wait();
  assert.equal(a.w.PetHubVenda.dados().itens.length, 0);
  assert.equal(a.errors.length, 0);
});
test("fechado bloqueia pagamento e falha de catálogo não introduz produtos de exemplo", async (t) => {
  const a = await app(t);
  await a.w.PetHubVenda.adicionar(a.products[0]);
  a.w.fetch = async () => ({ ok: true, json: async () => ({ aberto: false }) });
  a.key("F7");
  await wait();
  assert.equal(a.d.querySelector("#modalPagamento"), null);
  assert.equal(a.calls.filter((c) => c.kind === "create").length, 0);
  a.w.ApiClient.getProdutos = async () => {
    throw Error("offline");
  };
  await a.w.PetHubCaixa.catalogo();
  assert.equal(a.d.querySelectorAll("#qr-products button").length, 0);
  assert.equal(a.w.PetHubVenda.dados().itens.length, 1);
  assert.equal(a.errors.length, 0);
});
