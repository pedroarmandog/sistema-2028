const express = require("express");
const router = express.Router();
const orcamentoController = require("../controllers/orcamentoController");
const { Orcamento } = require("../models/Orcamento");
const path = require("path");
const fs = require("fs");

// Comprovante PDF - DEVE vir antes de /:id
router.get("/:id/comprovante", async (req, res) => {
  try {
    const { id } = req.params;
    const PDFDocument = require("pdfkit");
    const { Empresa } = require("../models");

    const orcamento = await Orcamento.findByPk(id);
    if (!orcamento)
      return res.status(404).json({ erro: "Orçamento não encontrado" });

    const mmToPt = (mm) => (mm * 72) / 25.4;
    const RECEIPT_MM = 72;
    const receiptWidth = Math.round(mmToPt(RECEIPT_MM));
    const receiptHeight = Math.round(mmToPt(400));
    const smallMargin = Math.round(mmToPt(2));

    const doc = new PDFDocument({
      size: [receiptWidth, receiptHeight],
      margins: {
        top: smallMargin,
        bottom: smallMargin,
        left: smallMargin,
        right: smallMargin,
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=comprovante-orcamento-${id}.pdf`,
    );
    doc.pipe(res);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const pageWidth = doc.page.width;
    const contentWidth = right - left;
    const lineHeight = 12;

    // --- Logo e dados da empresa ---
    let logoRendered = false;
    let empresa = null;
    try {
      // Buscar empresa do usuário logado via cookie JWT
      const jwt = require("jsonwebtoken");
      const JWT_SECRET = process.env.JWT_USER_SECRET;
      let empresaId = null;
      try {
        const cookieHeader = req.headers.cookie || "";
        const match = cookieHeader.match(/pethub_token=([^;]+)/);
        if (match) {
          const decoded = jwt.verify(match[1], JWT_SECRET);
          if (decoded.empresaId) empresaId = decoded.empresaId;
        }
      } catch (_) {}
      // Tentar query param como fallback
      if (
        !empresaId &&
        req.query &&
        (req.query.empresaId || req.query.empresa_id)
      ) {
        empresaId = req.query.empresaId || req.query.empresa_id;
      }
      if (empresaId) {
        empresa = await Empresa.findByPk(empresaId);
      }
      if (!empresa) {
        empresa = await Empresa.findOne({
          where: { ativa: true },
          order: [["id", "ASC"]],
        });
      }

      let logoPath = null;
      if (empresa && empresa.logo) {
        const candidates = [
          path.join(__dirname, "../../uploads", String(empresa.logo)),
          path.join(
            __dirname,
            "../../uploads/logos-empresas",
            String(empresa.logo),
          ),
        ];
        for (const c of candidates) {
          if (fs.existsSync(c)) {
            logoPath = c;
            break;
          }
        }
      }
      if (logoPath) {
        const maxLogoWidth = Math.round(pageWidth * 0.6);
        const logoWidth = Math.min(maxLogoWidth, Math.round(mmToPt(30)));
        const logoX = (pageWidth - logoWidth) / 2;
        const logoY = smallMargin + 4;
        try {
          doc.image(logoPath, logoX, logoY, {
            width: logoWidth,
            align: "center",
          });
          logoRendered = true;
        } catch (e) {
          logoRendered = false;
        }
        const logoEstimatedHeight = Math.round(logoWidth * 0.9);
        var y = logoY + logoEstimatedHeight + 2;
      }
    } catch (e) {
      /* fallback */
    }

    if (!logoRendered) {
      const headerText =
        empresa && (empresa.nome || empresa.razaoSocial)
          ? empresa.nome || empresa.razaoSocial
          : "Empresa";
      doc
        .fillColor("#000")
        .fontSize(18)
        .font("Helvetica-Bold")
        .text(headerText, { align: "center" });
      var y = doc.y + 6;
    }

    // Razão social e contato
    if (empresa && empresa.razaoSocial) {
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#000")
        .text(String(empresa.razaoSocial), left, y, {
          width: contentWidth,
          align: "center",
        });
      y += lineHeight + 2;
    }
    if (empresa && empresa.telefone) {
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#000")
        .text(`Contato: ${empresa.telefone}`, left, y, {
          width: contentWidth,
          align: "center",
        });
      y += lineHeight;
    }

    // 1ª Via
    doc
      .fontSize(8)
      .font("Helvetica")
      .text("1ª Via", left, y, { width: contentWidth, align: "right" });
    y += lineHeight + 4;

    // Nº orçamento e emissão
    const dataEmissao = orcamento.data
      ? new Date(orcamento.data).toLocaleDateString("pt-BR")
      : new Date().toLocaleDateString("pt-BR");
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#000");
    doc.text(`Orçamento: ${orcamento.id}`, left, y);
    doc.font("Helvetica").fontSize(8).text(`Emissão: ${dataEmissao}`, left, y, {
      width: contentWidth,
      align: "right",
    });
    y += lineHeight + 2;

    // Cliente
    if (orcamento.cliente) {
      doc
        .fontSize(8)
        .font("Helvetica")
        .text(
          `Cliente: ${orcamento.clienteId || ""} - ${orcamento.cliente}`,
          left,
          y,
        );
      y += lineHeight;
    }
    if (orcamento.clienteTelefone) {
      doc
        .fontSize(8)
        .font("Helvetica")
        .text(`Contato: ${orcamento.clienteTelefone}`, left, y);
      y += lineHeight;
    }
    y += 4;

    // --- Produto/Serviço ---
    doc.save();
    doc.lineWidth(0.5);
    doc.dash(2, { space: 3 });
    doc.moveTo(left, y).lineTo(right, y).stroke();
    doc.undash();
    doc.restore();
    y += 6;

    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor("#000")
      .text("Produto/Serviço", left, y, {
        width: contentWidth,
        align: "center",
      });
    y += lineHeight + 4;

    // Cabeçalho tabela
    doc.fontSize(7).font("Helvetica-Bold");
    doc.text("Cód.", left, y, { width: 22 });
    doc.text("Desc.", left + 22, y, { width: 40 });
    doc.text("Qtd.", left + 62, y, { width: 20, align: "center" });
    doc.text("Unid.", left + 82, y, { width: 22, align: "center" });
    doc.text("Vlr Unit.", left + 104, y, { width: 30, align: "right" });
    doc.text("PercDesc.", left + 134, y, { width: 26, align: "right" });
    const totalColX = left + 160;
    doc.text("Total", totalColX, y, { width: 32, align: "right" });
    y += lineHeight + 2;

    doc.save();
    doc.lineWidth(0.3);
    doc.moveTo(left, y).lineTo(right, y).stroke();
    doc.restore();
    y += 4;

    // Itens
    const itens = Array.isArray(orcamento.itens) ? orcamento.itens : [];
    let totalBruto = 0;
    let totalDescontoItens = 0;

    doc.font("Helvetica").fontSize(7).fillColor("#000");
    for (const item of itens) {
      const prod = item.produto || {};
      const codigo = prod.id || item.produtoId || "-";
      const nome = prod.nome || item.nome || item.descricao || "-";
      const qtd = parseFloat(item.quantidade || 1);
      const unitario = parseFloat(item.valorUnitario || item.preco || 0);
      const desconto = parseFloat(item.desconto || 0);
      const bruto = qtd * unitario;
      const total = bruto - (bruto * desconto) / 100;

      totalBruto += bruto;
      totalDescontoItens += bruto - total;

      if (y > doc.page.height - 100) {
        doc.addPage();
        y = smallMargin + 10;
      }

      doc.font("Helvetica").fontSize(7);
      doc.text(
        `${codigo} - ${nome}  ${qtd} ${item.unidade || "null"} x R$ ${unitario.toFixed(2)}`,
        left,
        y,
        { width: contentWidth - 50 },
      );
      doc.font("Helvetica-Bold").text(`R$ ${total.toFixed(2)}`, left, y, {
        width: contentWidth,
        align: "right",
      });
      doc.font("Helvetica");
      y += lineHeight + 4;
    }

    y += 4;
    doc.save();
    doc.lineWidth(0.5);
    doc.dash(2, { space: 3 });
    doc.moveTo(left, y).lineTo(right, y).stroke();
    doc.undash();
    doc.restore();
    y += 6;

    // --- Totais ---
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("Totais", left, y, { width: contentWidth, align: "center" });
    y += lineHeight + 4;

    const totaisOrc = orcamento.totais || {};
    const subtotal = parseFloat(totaisOrc.subtotal || totalBruto);
    const descontoTotal = parseFloat(totaisOrc.desconto || totalDescontoItens);
    const totalLiquido = parseFloat(
      totaisOrc.total || subtotal - descontoTotal,
    );

    doc.font("Helvetica").fontSize(8);
    const printTotalLine = (label, value) => {
      doc.text(label, left + 4, y, { width: contentWidth - 8 });
      doc.text(value, left + 4, y, {
        width: contentWidth - 8,
        align: "right",
      });
      y += lineHeight + 1;
    };

    printTotalLine("Total Bruto:", `R$ ${subtotal.toFixed(2)}`);
    printTotalLine("(-) Desconto:", `R$ ${descontoTotal.toFixed(2)}`);
    doc.font("Helvetica-Bold").fontSize(9);
    printTotalLine("Total Líquido:", `R$ ${totalLiquido.toFixed(2)}`);

    // --- Assinatura ---
    y += 30;
    if (y > doc.page.height - 40) {
      doc.addPage();
      y = smallMargin + 20;
    }
    const sigLeft = left + 12;
    const sigRight = right - 12;
    doc.moveTo(sigLeft, y).lineTo(sigRight, y).stroke();
    y += 6;
    doc
      .fontSize(9)
      .font("Helvetica")
      .text("Assinatura", sigLeft, y, {
        width: sigRight - sigLeft,
        align: "center",
      });

    // Linha pontilhada final
    y += 20;
    doc.save();
    doc.lineWidth(0.5);
    doc.dash(2, { space: 3 });
    doc.moveTo(left, y).lineTo(right, y).stroke();
    doc.undash();
    doc.restore();

    doc.end();
  } catch (error) {
    console.error("Erro ao gerar comprovante de orçamento:", error);
    res.status(500).json({ erro: "Erro ao gerar comprovante de orçamento" });
  }
});

router.get("/", orcamentoController.listarOrcamentos);
router.get("/:id", orcamentoController.buscarOrcamento);
router.post("/", orcamentoController.criarOrcamento);
router.put("/:id", orcamentoController.atualizarOrcamento);
router.delete("/:id", orcamentoController.deletarOrcamento);

module.exports = router;
