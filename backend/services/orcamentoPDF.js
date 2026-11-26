"use strict";
const PDFDocument = require("pdfkit");
const { resumirOrcamento } = require("./orcamentoDados");
const { moeda, quantidade, dataBrasilia } = require("./comprovanteVendaDados");
const { desenharLogo } = require("./identidadeEmpresaPDF");
async function gerarOrcamentoPDF(o, identidade) {
  const r = resumirOrcamento(o),
    e = identidade.empresa || {},
    doc = new PDFDocument({
      size: "A4",
      margin: 42,
      info: { Title: "Orçamento " + o.id },
    }),
    chunks = [];
  const result = new Promise((resolve, reject) => {
    doc.on("data", (b) => chunks.push(b));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
  const left = 42,
    width = doc.page.width - 84,
    bottom = doc.page.height - 52;
  let y = 42,
    page = 1;
  const text = (v) => String(v ?? "").replace(/\u0000/g, "");
  function linha(
    v,
    { bold = false, size = 10, color = "#263849", gap = 6 } = {},
  ) {
    doc
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(size)
      .fillColor(color);
    const h = doc.heightOfString(text(v), { width });
    if (y + h > bottom) {
      novaPagina();
    }
    doc.text(text(v), left, y, { width });
    y = doc.y + gap;
  }
  function novaPagina() {
    doc.addPage();
    page++;
    y = 42;
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#203449")
      .text("Orçamento #" + o.id + " · continuação", left, y, { width });
    y += 26;
  }
  function garantir(h) {
    if (y + h > bottom) novaPagina();
  }
  // Logo só da empresa; sem logo, o nome identifica o estabelecimento.
  const hasLogo = identidade.origem === "empresa" && identidade.logoBuffer;
  if (hasLogo)
    desenharLogo(doc, identidade.logoBuffer, {
      x: left + width - 116,
      y,
      largura: 116,
      altura: 72,
    });
  const nome =
    identidade.nomeEmpresa ||
    e.nomeFantasia ||
    e.razaoSocial ||
    e.nome ||
    "Empresa";
  doc.font("Helvetica-Bold").fontSize(19).fillColor("#14283e");
  const nomeW = hasLogo ? width - 135 : width;
  doc.text(text(nome), left, y, { width: nomeW });
  y = doc.y + 10;
  const detalhes = [
    e.cnpj ? "CNPJ: " + e.cnpj : e.cpf ? "CPF: " + e.cpf : "",
    e.telefone ? "Telefone: " + e.telefone : "",
    e.email ? e.email : "",
  ];
  for (const v of detalhes.filter(Boolean)) {
    doc.font("Helvetica").fontSize(9).text(text(v), left, y, { width: nomeW });
    y = doc.y + 4;
  }
  if (hasLogo) y = Math.max(y, 122);
  const endereco =
    typeof e.endereco === "object"
      ? Object.values(e.endereco || {})
          .filter(Boolean)
          .join(", ")
      : [
          e.endereco,
          e.numero,
          e.complemento,
          e.bairro,
          [e.cidade, e.estado || e.uf].filter(Boolean).join("/"),
          e.cep,
        ]
          .filter(Boolean)
          .join(" · ");
  if (endereco) linha(endereco, { size: 9 });
  y += 10;
  linha("ORÇAMENTO #" + o.id, { size: 16, bold: true });
  linha("Emissão: " + dataBrasilia(o.data) + " · Brasília", { size: 9 });
  if (o.validade || o.dataValidade)
    linha("Validade: " + text(o.validade || o.dataValidade), { size: 9 });
  linha(
    "Cliente: " +
      (typeof o.cliente === "object"
        ? o.cliente?.nome
        : o.cliente || "Não informado"),
    { bold: true },
  );
  if (o.clienteTelefone) linha("Telefone: " + o.clienteTelefone, { size: 9 });
  if (o.profissional) linha("Profissional: " + o.profissional, { size: 9 });
  if (o.condicaoPagamento)
    linha("Condição de pagamento: " + o.condicaoPagamento, { size: 9 });
  y += 10;
  const cols = [
    { label: "Descrição", x: 0, w: 238 },
    { label: "Qtd.", x: 242, w: 44 },
    { label: "Valor unitário", x: 290, w: 80 },
    { label: "Desc.", x: 374, w: 42 },
    { label: "Total", x: 420, w: width - 420 },
  ];
  function cabecalho() {
    garantir(28);
    doc.rect(left, y, width, 24).fill("#eaf0f5");
    doc.fillColor("#14283e").font("Helvetica-Bold").fontSize(9);
    for (const c of cols)
      doc.text(c.label, left + c.x, y + 7, {
        width: c.w,
        align: c.x ? "right" : "left",
      });
    y += 30;
  }
  cabecalho();
  for (const i of r.itens) {
    let rest = text(i.nome);
    let primeiro = true;
    // Divide descrições muito longas em trechos medidos, sem invadir o rodapé.
    while (rest) {
      const maxH = bottom - y - 12;
      doc.font("Helvetica").fontSize(9);
      if (maxH < 28) {
        novaPagina();
        cabecalho();
        continue;
      }
      let n = rest.length;
      if (doc.heightOfString(rest, { width: 238 }) > maxH) {
        let a = 1,
          b = n;
        while (a < b) {
          const m = Math.ceil((a + b) / 2);
          if (doc.heightOfString(rest.slice(0, m), { width: 238 }) <= maxH)
            a = m;
          else b = m - 1;
        }
        n = Math.max(1, a);
      }
      const part = rest.slice(0, n),
        h = Math.max(20, doc.heightOfString(part, { width: 238 }) + 10);
      doc.fillColor("#263849").text(part, left, y, { width: 238 });
      if (primeiro) {
        const vals = [
          quantidade(i.quantidade,i.unidade || i.produto?.unidade)+" "+(i.unidade || i.produto?.unidade || "UN"),
          moeda(i.valorUnitario),
          quantidade(i.desconto) + "%",
          moeda(i.totalFinal),
        ];
        cols
          .slice(1)
          .forEach((c, k) =>
            doc.text(vals[k], left + c.x, y, { width: c.w, align: "right" }),
          );
        primeiro = false;
      }
      y += h;
      doc
        .moveTo(left, y - 4)
        .lineTo(left + width, y - 4)
        .strokeColor("#e2e8ee")
        .lineWidth(0.5)
        .stroke();
      rest = rest.slice(n);
      if (rest) {
        novaPagina();
        cabecalho();
      }
    }
  }
  y += 10;
  garantir(105);
  for (const [label, v, bold] of [
    ["Subtotal", r.subtotal],
    ["Descontos", r.desconto],
    ["TOTAL DO ORÇAMENTO", r.total, true],
  ]) {
    doc
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(bold ? 13 : 10)
      .fillColor("#14283e")
      .text(label, left + 240, y, { width: 165 })
      .text(moeda(v), left + 410, y, { width: width - 410, align: "right" });
    y += 26;
  }
  if (o.informacoesAdicionais) {
    linha("Informações adicionais", { bold: true });
    // PDFKit faz a paginação automática do texto; não há altura fixa truncando observações.
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(text(o.informacoesAdicionais), left, y, { width });
    y = doc.y + 12;
  }
  garantir(24);
  linha("Orçamento comercial · Não é documento fiscal.", {
    size: 8,
    color: "#52677d",
  });
  doc.end();
  return result;
}
module.exports = { gerarOrcamentoPDF };
