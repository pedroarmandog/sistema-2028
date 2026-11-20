"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs"),
  path = require("path"),
  { JSDOM, VirtualConsole } = require("jsdom");
const base = path.join(__dirname, "../frontend/atendimento/");
const wait = (ms = 30) => new Promise((r) => setTimeout(r, ms));
for (const visual of ['classico','rapido']) test(`cliente sem telefone pode ser pesquisado e vinculado no ${visual}`, async t => {
  const a=await app(t,visual),requests=[];
  await a.w.PetHubVenda.adicionar(a.products[0]);
  a.w.fetch=async url=>{requests.push(String(url));return {ok:true,status:200,json:async()=>String(url).includes('/caixas/aberto')?{aberto:true}:{success:true,clientes:[{id:'120001',nome:'Karol',telefone:null,email:null},{id:2,nome:null,telefone:1234},{id:3,nome:'Ana',telefone:null}]}}};
  const input=a.d.querySelector('#pesquisarCliente');input.value='karol';await a.w.buscarClientes('karol');
  assert.equal(a.d.querySelectorAll('.cliente-item').length,1);assert.match(a.d.querySelector('.cliente-item').textContent,/Karol/);
  a.click('.cliente-item');await wait();assert.equal(a.w.PetHubVenda.dados().cliente.id,'120001');assert.equal(a.w.PetHubVenda.dados().cliente.telefone,'');
  assert.equal(requests.filter(url=>url.includes('/clientes')).length,1);assert(requests.some(url=>url.includes('search=karol')));
  assert.equal(a.w.PetHubVenda.dados().itens.length,1);assert.doesNotMatch(a.d.querySelector('#clienteSelecionado').textContent,/undefined|null/);
  await a.w.PetHubVenda.finalizar();const pending=a.calls.find(c=>c.kind==='create');assert.equal(pending.b.clienteId,'120001');assert.equal(pending.b.cliente,'Karol');assert.equal(a.errors.length,0);
});
test('busca de clientes aceita array e ignora resposta antiga; não inventa clientes se API falhar',async t=>{
 const a=await app(t);let old;
 a.w.fetch=async url=>String(url).includes('search=karol')?await new Promise(r=>old=r):{ok:true,json:async()=>[{id:'ana',nome:'Ana',telefone:null}]};
 const input=a.d.querySelector('#pesquisarCliente');input.value='karol';const first=a.w.buscarClientes('karol');input.value='ana';await a.w.buscarClientes('ana');old({ok:true,json:async()=>({success:true,clientes:[{id:1,nome:'Karol'}]})});await first;
 assert.equal(a.d.querySelectorAll('.cliente-item').length,1);assert.match(a.d.querySelector('.cliente-item').textContent,/Ana/);
 a.key('Enter',input);await wait();assert.equal(a.w.PetHubVenda.dados().cliente.id,'ana');
 a.w.removerClienteSelecionado();a.w.fetch=async()=>({ok:false,status:503});input.value='joao';await a.w.buscarClientes('joao');assert.equal(a.d.querySelectorAll('.cliente-item').length,0);assert.match(a.d.querySelector('#clientesDropdown').textContent,/Não foi possível/);assert.equal(a.w.PetHubVenda.dados().cliente,null);assert.equal(a.errors.length,0);
});
test("carregamento esconde conteúdo desde o HTML e só revela o layout confirmado", async (t) => {
  let resolve;
  const deferred = new Promise((r) => (resolve = r));
  const a = await app(t, "rapido", {
    readPreference: () => deferred,
    beforeScripts(w, d) {
      assert(d.documentElement.classList.contains("qr-booting"));
      assert(d.querySelector("#qr-sale-content").hasAttribute("inert"));
      assert.match(
        d.querySelector("#qr-boot-critical").textContent,
        /html\.qr-booting #qr-sale-content\s*\{\s*display: none !important/,
      );
    },
  });
  assert(a.d.documentElement.classList.contains("qr-booting"));
  assert.equal(
    a.d.querySelector("#qr-sale-content").getAttribute("aria-busy"),
    "true",
  );
  assert(a.d.querySelector("#qr-layout-toggle").disabled);
  resolve({ layout: "rapido" });
  await wait(70);
  assert(!a.d.documentElement.classList.contains("qr-booting"));
  assert(!a.d.querySelector("#qr-sale-content").hasAttribute("inert"));
  assert(a.d.querySelector(".nova-venda-layout").hidden);
  assert(!a.d.querySelector("#qr-shell").hidden);
  assert.equal(a.d.activeElement.id, "pesquisarProduto");
  assert.equal(a.errors.length, 0);
});
test("erro de preferência não revela o clássico; nova tentativa aplica escolha da empresa", async (t) => {
  let attempts = 0;
  const a = await app(t, "rapido", {
    readPreference: async () => {
      attempts++;
      if (attempts === 1) throw Error("offline");
      return { layout: "rapido" };
    },
  });
  assert(a.d.documentElement.classList.contains("qr-booting"));
  assert(!a.d.querySelector("#qr-boot-error").hidden);
  a.click("#qr-boot-retry");
  await wait(70);
  assert.equal(attempts, 2);
  assert(!a.d.documentElement.classList.contains("qr-booting"));
  assert.equal(a.w.PetHubCaixa.layout, "rapido");
  assert.equal(a.errors.length, 0);
});
test("preferência clássico libera somente o clássico e remove estado de carregamento", async (t) => {
  const a = await app(t, "classico");
  assert(!a.d.documentElement.classList.contains("qr-booting"));
  assert(!a.d.querySelector(".nova-venda-layout").hidden);
  assert(a.d.querySelector("#qr-shell").hidden);
  assert.equal(
    a.d.querySelector("#qr-sale-content").getAttribute("aria-busy"),
    "false",
  );
});
async function app(t, preferred = "rapido", options = {}) {
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
      if (
        p === "/vendas/preferencias/layout-caixa" &&
        !o.method &&
        options.readPreference
      )
        return options.readPreference();
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
  options.beforeScripts?.(w, d);
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
  a.click("#qr-layout-toggle");
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
  a.click("#qr-layout-toggle");
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
test("busca seleciona primeiro resultado, setas mantêm foco e Enter confirma só destaque", async (t) => {
  const a = await app(t),
    input = a.d.querySelector("#pesquisarProduto");
  assert.equal(a.d.activeElement, input);
  input.value = "a";
  input.dispatchEvent(new a.w.Event("input", { bubbles: true }));
  assert.equal(input.getAttribute("aria-expanded"), "true");
  let cards = [...a.d.querySelectorAll("#qr-products button")];
  assert.equal(cards[0].getAttribute("aria-selected"), "true");
  a.d.querySelector("#qr-products").getBoundingClientRect = () => ({
    top: 0,
    bottom: 100,
  });
  cards[1].getBoundingClientRect = () => ({ top: 120, bottom: 180 });
  a.key("ArrowDown", input);
  assert.equal(a.d.querySelector("#qr-products").scrollTop, 80);
  assert.equal(a.d.activeElement, input);
  assert.equal(cards[1].getAttribute("aria-selected"), "true");
  a.key("ArrowUp", input);
  assert.equal(cards[0].getAttribute("aria-selected"), "true");
  a.key("ArrowDown", input);
  a.key("Enter", input);
  a.key("Enter", input);
  await wait(120);
  assert.equal(a.w.PetHubVenda.dados().itens.length, 1);
  assert.equal(a.w.PetHubVenda.dados().itens[0].produto.id, "p2");
  assert.equal(input.value, "");
  assert.equal(a.d.activeElement, input);
  input.value = "nenhum-resultado";
  input.dispatchEvent(new a.w.Event("input", { bubbles: true }));
  a.key("Enter", input);
  await wait();
  assert.equal(a.w.PetHubVenda.dados().itens.length, 1);
  a.key("Escape", input);
  assert.equal(input.getAttribute("aria-expanded"), "false");
  assert.equal(a.w.PetHubVenda.dados().itens.length, 1);
  assert.equal(a.errors.length, 0);
});
test("botão fica antes do suporte inclusive montagem tardia; sem linha antiga", async (t) => {
  const a = await app(t, "classico"),
    header = a.d.querySelector(".header-right");
  const support = a.d.createElement("button");
  support.id = "hcHeaderBtn";
  header.prepend(support);
  await wait();
  assert.equal(support.previousElementSibling.id, "qr-layout-toggle");
  assert.equal(a.d.querySelector(".qr-toolbar"), null);
  assert.equal(a.d.querySelectorAll("#qr-layout-toggle").length, 1);
  a.w.PetHubCaixa.aplicar("rapido");
  assert.equal(support.previousElementSibling.id, "qr-layout-toggle");
  assert.equal(a.errors.length, 0);
});
test("miniaturas reutilizam nome de arquivo, URL persistente e data URL; fallback e atualização no carrinho", async (t) => {
  const a = await app(t);
  a.products[0].imagem = "embalagem hot cat.webp";
  a.products[1].imagem = "/uploads/servicos/banho.webp";
  a.products[2].imagem = "data:image/png;base64,aGVsbG8=";
  await a.w.PetHubCaixa.catalogo();
  const pics = [...a.d.querySelectorAll("#qr-products img")];
  assert.equal(pics.length, 3);
  assert.equal(
    pics[0].src,
    "https://pethub.test/uploads/embalagem%20hot%20cat.webp",
  );
  assert.equal(pics[1].src, "https://pethub.test/uploads/servicos/banho.webp");
  assert.equal(pics[0].loading, "lazy");
  await a.w.PetHubVenda.adicionar(a.products[0]);
  assert.equal(a.d.querySelector("#qr-cart img").src, pics[0].src);
  const input = a.d.querySelector("#pesquisarProduto");
  input.value = "Ração";
  input.dispatchEvent(new a.w.Event("input", { bubbles: true }));
  assert.equal(a.d.querySelector("#qr-products img").src, pics[0].src);
  a.products[0].imagem = "/uploads/itens/nova-foto.webp";
  await a.w.PetHubCaixa.catalogo();
  assert.match(a.d.querySelector("#qr-cart img").src, /nova-foto.webp$/);
  a.d.querySelector("#qr-cart img").dispatchEvent(new a.w.Event("error"));
  assert(a.d.querySelector("#qr-cart .qr-product-icon"));
  a.products[0].imagem = "javascript:alert(1)";
  delete a.products[1].imagem;
  await a.w.PetHubCaixa.catalogo();
  assert.equal(a.d.querySelector("#qr-products img"), null);
  assert.equal(a.errors.length, 0);
});
test("Enter na quantidade confirma sem duplicar e retorna à busca; render não rouba foco de cliente/modal", async (t) => {
  const a = await app(t);
  await a.w.PetHubVenda.adicionar(a.products[0]);
  a.key("F3");
  const qty = a.d.activeElement;
  qty.value = "2";
  a.key("Enter", qty);
  await wait(80);
  assert.equal(a.w.PetHubVenda.dados().itens[0].quantidade, 2);
  assert.equal(a.d.activeElement.id, "pesquisarProduto");
  const cliente = a.d.querySelector("#pesquisarCliente");
  cliente.focus();
  await a.w.PetHubCaixa.catalogo();
  assert.equal(a.d.activeElement, cliente);
  const dialog = a.d.createElement("dialog");
  a.d.body.append(dialog);
  dialog.showModal();
  const field = a.d.createElement("input");
  dialog.append(field);
  field.focus();
  await a.w.PetHubCaixa.catalogo();
  assert.equal(a.d.activeElement, field);
  dialog.close();
  assert.equal(a.errors.length, 0);
});
test("Enter no pagamento adiciona valor uma vez e F8 conclui pelo fluxo original", async (t) => {
  const a = await app(t);
  await a.w.PetHubVenda.adicionar(a.products[0]);
  a.key("F7");
  await wait(100);
  a.click("[data-forma=dinheiro]");
  const field = a.d.querySelector("#valor-dinheiro");
  field.focus();
  field.value = "20";
  a.key("Enter", field);
  await wait();
  assert(a.d.querySelector("#modalPagamento"));
  assert.notEqual(a.d.activeElement.id, "pesquisarProduto");
  a.key("F8");
  await wait(150);
  const saved = a.calls.filter((c) => c.kind === "update");
  assert.equal(saved.length, 1);
  assert.equal(saved[0].b.pagamentos.length, 1);
  assert.equal(saved[0].b.totalPago, 12.5);
  a.d.querySelector("#modalVendaFinalizada").remove();
  await wait(350);
  assert.equal(a.d.activeElement.id, "pesquisarProduto");
  assert.equal(a.errors.length, 0);
});
