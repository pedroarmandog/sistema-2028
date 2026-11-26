"use strict";
const PDFDocument = require("pdfkit");
const { resumirVenda, moeda, quantidade } = require("./comprovanteVendaDados");
const { desenharLogo } = require("./identidadeEmpresaPDF");
function gerarComprovanteVenda({ venda, empresa, logoBuffer, cliente }) {
  const r = resumirVenda(venda),
    doc = new PDFDocument({
      size: [204, 1134],
      margins: { left: 7, right: 7, top: 8, bottom: 14 },
    }),
    chunks = [];
  const result = new Promise((resolve, reject) => {
    doc.on("data", (b) => chunks.push(b));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const left = 7,
    width = 190,
    bottom = 1110;
  let y = 10;
  const ensure = (h) => {
    if (y + h > bottom) {
      doc.addPage();
      y = 12;
    }
  };
  function text(
    s,
    { size = 8, bold = false, align = "left", color = "#000" } = {},
  ) {
    doc
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(size)
      .fillColor(color);
    const h = doc.heightOfString(String(s), { width, align });
    ensure(h + 4);
    doc.text(String(s), left, y, { width, align });
    y += h + 4;
  }
  function line(label, value, { bold = false } = {}) {
    doc
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(7.5)
      .fillColor("#000");
    const valueWidth = Math.max(65, Math.min(90, doc.widthOfString(value) + 3)),
      labelWidth = width - valueWidth - 3;
    const h = Math.max(
      doc.heightOfString(label, { width: labelWidth }),
      doc.heightOfString(value, { width: valueWidth }),
    );
    ensure(h + 5);
    doc.text(label, left, y, { width: labelWidth });
    doc.text(value, left + width - valueWidth, y, {
      width: valueWidth,
      align: "right",
    });
    y += h + 5;
  }
  function rule() {
    ensure(10);
    doc
      .save()
      .lineWidth(0.4)
      .dash(2, { space: 3 })
      .moveTo(left, y + 2)
      .lineTo(left + width, y + 2)
      .stroke()
      .undash()
      .restore();
    y += 10;
  }
  try {
    if (desenharLogo(doc, logoBuffer, { x: 52, y, largura: 100, altura: 64 }))
      y += 70;
    else text("PETHUB", { bold: true, size: 15, align: "center" });
    const nome =
      empresa.nomeFantasia || empresa.nome || empresa.razaoSocial || "Empresa";
    text(nome, { bold: true, size: 10, align: "center" });
    if (empresa.razaoSocial && empresa.razaoSocial !== nome)
      text(empresa.razaoSocial, { size: 8, align: "center" });
    if (empresa.telefone)
      text("Contato: " + empresa.telefone, { size: 7, align: "center" });
    const endereco =
      typeof empresa.endereco === "string"
        ? empresa.endereco
        : empresa.endereco &&
          [
            empresa.endereco.logradouro || empresa.endereco.endereco,
            empresa.endereco.numero,
            empresa.endereco.bairro,
            empresa.endereco.cidade,
            empresa.endereco.estado,
            empresa.endereco.cep,
          ]
            .filter(Boolean)
            .join(", ");
    if (endereco && empresa.exibirEnderecoComprovante !== false)
      text(endereco, { size: 7, align: "center" });
    line("Venda", String(r.id), { bold: true });
    text("Data da venda: " + r.data + " (Brasília)", { size: 7 });
    const nomeCliente = r.cliente || cliente?.nome;
    if (nomeCliente) text("Cliente: " + nomeCliente, { size: 8 });
    if (r.operador) text("Operador: " + r.operador, { size: 7 });
    rule();
    text("Produtos / Serviços", { bold: true, size: 9, align: "center" });
    for (const item of r.itens) {
      doc.font("Helvetica-Bold").fontSize(8);
      const h = doc.heightOfString(item.codigo + " - " + item.nome, { width });
      ensure(h + 65);
      text(item.codigo + " - " + item.nome, { bold: true, size: 8 });
      line(
        `${quantidade(item.quantidade,item.unidade)} ${item.unidade} × ${moeda(item.unitario)}${item.unidade.toUpperCase()==="KG"?" / KG":""}`,
        moeda(item.bruto / 100),
      );
      if (item.desconto !== 0 || item.descontoPercent !== 0)
        line(
          "Desconto do item" +
            (item.descontoPercent
              ? " (" + quantidade(item.descontoPercent) + "%)"
              : ""),
          moeda(item.desconto / 100),
        );
      line("Total do item", moeda(item.total / 100), { bold: true });
      y += 3;
    }
    rule();
    text("Formas de pagamento", { bold: true, size: 9, align: "center" });
    if (!r.pagamentos.length) text("Nenhum pagamento registrado.", { size: 7 });
    for (const p of r.pagamentos) {
      line(
        p.nome + (p.parcelas > 1 ? " · " + p.parcelas + "x" : ""),
        moeda(p.valor / 100),
      );
      if (p.recebido !== null) {
        line("Valor recebido", moeda(p.recebido / 100));
        line("Troco", moeda(p.troco / 100));
      }
    }
    rule();
    text("Totais", { bold: true, size: 9, align: "center" });
    line("Quantidade total", quantidade(r.totalQuantidade));
    line("Total bruto", moeda(r.bruto / 100));
    line("(-) Descontos dos itens", moeda(r.descontoItens / 100));
    line("Subtotal dos itens", moeda(r.itensLiquidos / 100));
    line("(-) Desconto geral", moeda(r.descontoGeral / 100));
    line("Total de descontos", moeda(r.descontoTotal / 100));
    if (r.acrescimo) line("(+) Acréscimos", moeda(r.acrescimo / 100));
    if (r.arredondamento) line("Arredondamento", moeda(r.arredondamento / 100));
    line("Total líquido da venda", moeda(r.final / 100), { bold: true });
    line("Total pago registrado", moeda(r.totalPago / 100));
    if (r.saldo) line("Saldo a pagar", moeda(r.saldo / 100), { bold: true });
    if (r.excesso) line("Valor acima do total", moeda(r.excesso / 100));
    if (r.avisos.length) {
      rule();
      for (const a of r.avisos) text(a, { size: 6.5, color: "#555" });
    }
    rule();
    text("Em caso de devolução, apresente este documento.", {
      size: 7,
      align: "center",
    });
    ensure(50);
    y += 20;
    doc
      .moveTo(left + 12, y)
      .lineTo(left + width - 12, y)
      .stroke();
    y += 5;
    text("Assinatura", { size: 8, align: "center" });
    doc.end();
  } catch (e) {
    doc.destroy();
    throw e;
  }
  return result;
}
module.exports = { gerarComprovanteVenda };
