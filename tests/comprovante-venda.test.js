"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const calc = require("../frontend/components/venda-calculos");
const {
  resumirVenda,
  dataBrasilia,
} = require("../backend/services/comprovanteVendaDados");
const {
  gerarComprovanteVenda,
} = require("../backend/services/comprovanteVendaPDF");
const item = (q = 1, u = 100, d = 0) => ({
  produto: {
    id: "p1",
    codigo: "001",
    nome: "Ração",
    unidade: "UN",
    preco: 999,
  },
  quantidade: q,
  valorUnitario: u,
  desconto: d,
  ...calc.calcularItem(q, u, d),
});
function venda(itens = [item()], cond = {}, pags) {
  const totais = calc.calcularTotais(itens, cond);
  return {
    id: 10,
    empresa_id: 1,
    data: new Date("2026-11-20T22:01:00Z"),
    cliente: "Karol",
    itens,
    totais,
    pagamentos: pags ?? [{ forma: "pix", valor: totais.final }],
    totalPago: totais.final,
  };
}
test("sem desconto, quantidade >1, frações e centavos seguem a regra compartilhada", () => {
  for (const [q, u, d, esperado] of [
    [1, 100, 0, 100],
    [2, 100, 10, 180],
    [1.25, 19.99, 10, 22.49],
    [3, 0.1, 0, 0.3],
    [1, 1.005, 0, 1.01],
  ]) {
    const v = venda([item(q, u, d)]),
      r = resumirVenda(v);
    assert.equal(r.final, calc.centavos(esperado));
    assert.equal(r.itens[0].total, r.final);
    assert.equal(r.avisos.length, 0);
  }
});
test("desconto de item, geral percentual e em reais são discriminados sem duplicar", () => {
  const i = item(1, 100, 10);
  for (const cond of [{ descontoPercent: 10 }, { descontoValor: 9 }]) {
    const r = resumirVenda(venda([i], cond));
    assert.equal(r.bruto, 10000);
    assert.equal(r.descontoItens, 1000);
    assert.equal(r.descontoGeral, 900);
    assert.equal(r.descontoTotal, 1900);
    assert.equal(r.final, 8100);
  }
  const r = resumirVenda(
    venda([i], { descontoValor: 10, acrescimoValor: 5, arredondamento: -0.01 }),
  );
  assert.equal(r.final, 8499);
  assert.equal(r.acrescimo, 500);
  assert.equal(r.arredondamento, -1);
});
test("legado combinado ou geral isolado é distinguido pelos valores persistidos", () => {
  const v = venda([item(1, 100, 10)]);
  v.totais = { bruto: 100, desconto: 10, final: 90 };
  let r = resumirVenda(v);
  assert.equal(r.descontoGeral, 0);
  assert.equal(r.final, 9000);
  v.totais = { bruto: 100, desconto: 5, final: 85 };
  r = resumirVenda(v);
  assert.equal(r.descontoGeral, 500);
  assert.equal(r.final, 8500);
  v.totais = { bruto: 100, desconto: 20, final: 80 };
  r = resumirVenda(v);
  assert.equal(r.descontoGeral, 1000);
  assert.equal(r.final, 8000);
});
test("total líquido não vira total pago: parcial, desconto integral e JSON histórico", () => {
  const v = venda([item()]);
  v.pagamentos = [{ forma: "dinheiro", valor: 30 }];
  v.totalPago = 30;
  let r = resumirVenda(v);
  assert.equal(r.final, 10000);
  assert.equal(r.totalPago, 3000);
  assert.equal(r.saldo, 7000);
  const zero = venda([item(1, 100, 100)]);
  zero.itens = JSON.stringify(zero.itens);
  zero.totais = JSON.stringify(zero.totais);
  zero.pagamentos = "[]";
  zero.totalPago = 0;
  r = resumirVenda(zero);
  assert.equal(r.final, 0);
  assert.equal(r.itens[0].total, 0);
  assert.equal(r.descontoItens, 10000);
});
test("formas mistas, parcelas, recebido e troco são lidos sem virar receita extra", () => {
  const v = venda([item()], {}, [
    { forma: "dinheiro", valor: 40, recebido: 50, troco: 10 },
    { forma: "credito", valor: 30, parcelas: 2 },
    { forma: "pix", valor: 30 },
  ]);
  const r = resumirVenda(v);
  assert.equal(r.totalPago, 10000);
  assert.equal(r.recebido, 11000);
  assert.equal(r.troco, 1000);
  assert.equal(r.saldo, 0);
  assert.equal(r.pagamentos[1].nome, "Cartão de crédito");
  assert.equal(r.pagamentos[1].parcelas, 2);
  for (const forma of [
    "dinheiro",
    "pix",
    "credito",
    "debito",
    "crediario",
    "haver",
    "cheque",
  ])
    assert.equal(
      resumirVenda(venda([item()], {}, [{ forma, valor: 100 }])).pagamentos
        .length,
      1,
    );
});
test("reimpressão usa snapshot: preço, código, nome e unidade do produto não vêm do cadastro atual", () => {
  const v = venda([
    item(2, 25, 0),
    { ...item(1, 50), produto: { id: "s", nome: "Banho", tipo: "servico" } },
  ]);
  const antes = JSON.stringify(v);
  v.itens[0].produto.preco = 400;
  const r = resumirVenda(v);
  assert.equal(r.itens[0].unitario, 25);
  assert.equal(r.itens[0].codigo, "001");
  assert.equal(r.itens[0].unidade, "UN");
  assert.equal(r.itens[1].unidade, "SERV");
  assert.equal(r.final, 10000);
  const frozen = JSON.parse(antes);
  Object.freeze(frozen);
  assert.deepEqual(resumirVenda(frozen), resumirVenda(frozen));
  assert.equal(JSON.stringify(frozen), antes);
});
test("Brasília explícita independe de TZ do servidor e respeita virada de data", () => {
  const old = process.env.TZ;
  try {
    for (const zone of ["UTC", "America/Los_Angeles", "Asia/Tokyo"]) {
      process.env.TZ = zone;
      assert.equal(dataBrasilia("2026-11-20T22:01:00Z"), "20/11/2026 19:01");
      assert.equal(dataBrasilia("2026-11-21T00:30:00Z"), "20/11/2026 21:30");
      assert.equal(dataBrasilia("2026-11-20 22:01:00"), "20/11/2026 19:01");
    }
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
});
test("PDF real contém valores/descontos corretos e pagina descrições longas sem corte horizontal", async () => {
  const { execFileSync } = require("node:child_process");
  const itens = Array.from({ length: 55 }, (_, n) => ({
    ...item(1, 10, n % 2 ? 10 : 0),
    produto: {
      codigo: String(n + 1),
      nome: "Produto com descrição longa e cuidados especiais ".repeat(5),
      unidade: "UN",
    },
  }));
  const v = venda(itens, { descontoValor: 5 });
  const pdf = await gerarComprovanteVenda({
    venda: v,
    empresa: { nome: "Empresa A", telefone: "31999999999" },
  });
  const result = JSON.parse(
    execFileSync(
      "python3",
      [
        "-c",
        `import sys,json,fitz
d=fitz.open(stream=sys.stdin.buffer.read(),filetype='pdf')
text=' '.join(p.get_text() for p in d)
bad=[]
for p in d:
 for word in p.get_text('words'):
  if word[0]<-0.5 or word[2]>p.rect.width+0.5 or word[3]>p.rect.height+0.5:bad.append(word[4])
print(json.dumps({'pages':len(d),'text':text,'bad':bad}))`,
      ],
      { input: pdf, maxBuffer: 2 * 1024 * 1024 },
    ).toString(),
  );
  assert(result.pages > 1);
  assert.match(result.text, /Brasília/);
  assert.match(result.text, /19:01/);
  assert.match(result.text, /Desconto geral/);
  assert.match(result.text, /Total líquido da venda/);
  assert.equal(result.bad.length, 0);
});
