const express = require("express");
const router = express.Router();
const vendaController = require("../controllers/vendaController");
const { Venda, Empresa, Cliente } = require("../models");
const path = require("path");
const fs = require("fs");
const { authUser } = require("../middleware/authUser");

// Aplicar auth em todas as rotas de venda
router.use(authUser);

// Comprovante PDF (cupom fiscal) - DEVE vir antes de /:id
router.get("/:id/comprovante", async (req, res) => {
  try {
    const { id } = req.params;
    const PDFDocument = require("pdfkit");

    const venda = await Venda.findByPk(id);
    if (!venda) return res.status(404).json({ erro: "Venda não encontrada" });

    // Buscar cliente para exibir nome e endereço no comprovante
    let clienteObj = null;
    if (venda.clienteId) {
      try {
        clienteObj = await Cliente.findByPk(venda.clienteId, {
          attributes: [
            "id",
            "nome",
            "endereco",
            "numero",
            "complemento",
            "bairro",
            "cidade",
            "estado",
            "cep",
          ],
        });
      } catch (_) {}
    }

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
      `inline; filename=comprovante-venda-${id}.pdf`,
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
      // Preferir empresa vinculada à venda, depois a do cookie JWT, depois a do req.user, senão qualquer empresa ativa
      if (venda.empresa_id) empresa = await Empresa.findByPk(venda.empresa_id);
      if (!empresa) {
        // Tentar cookie JWT
        try {
          const jwt = require("jsonwebtoken");
          const JWT_SECRET =
            process.env.JWT_USER_SECRET || "pethub_user_secret_2026_!@#$%";
          const cookieHeader = req.headers.cookie || "";
          const match = cookieHeader.match(/pethub_token=([^;]+)/);
          if (match) {
            const decoded = jwt.verify(match[1], JWT_SECRET);
            if (decoded.empresaId)
              empresa = await Empresa.findByPk(decoded.empresaId);
          }
        } catch (_) {}
      }
      if (!empresa && req.user && req.user.empresaId)
        empresa = await Empresa.findByPk(req.user.empresaId);
      if (!empresa)
        empresa = await Empresa.findOne({
          where: { ativa: true },
          order: [["id", "ASC"]],
        });

      let logoPath = null;
      let logoBuffer = null;

      // Se empresa tem logo, tentar diferentes formatos (dataURI / base64 / arquivo)
      if (empresa && empresa.logo) {
        try {
          const logoVal = String(empresa.logo || "").trim();
          if (logoVal.startsWith("data:")) {
            const parts = logoVal.split(",");
            if (parts[1]) logoBuffer = Buffer.from(parts[1], "base64");
          } else if (
            /^[A-Za-z0-9+/=\r\n]+$/.test(logoVal) &&
            logoVal.length > 200
          ) {
            // provável base64 cru
            try {
              logoBuffer = Buffer.from(logoVal, "base64");
            } catch (e) {
              logoBuffer = null;
            }
          } else {
            const candidates = [
              path.join(__dirname, "../../uploads", empresa.logo),
              path.join(
                __dirname,
                "../../uploads",
                "logos-empresas",
                empresa.logo,
              ),
              path.join(
                __dirname,
                "../../uploads",
                path.basename(empresa.logo),
              ),
            ];
            for (const p of candidates) {
              if (fs.existsSync(p)) {
                logoPath = p;
                break;
              }
            }
          }
        } catch (e) {
          /* ignore */
        }
      }

      // Se nada obtido da empresa, tentar logos padrões do frontend
      if (!logoBuffer && !logoPath) {
        const defaultPaths = [
          path.join(
            __dirname,
            "../../frontend/fivecon/Design sem nome (17).png",
          ),
          path.join(__dirname, "../../frontend/logos/Logo PetHub (2).svg"),
        ];
        for (const p of defaultPaths) {
          if (fs.existsSync(p)) {
            logoPath = p;
            break;
          }
        }
      }

      // Renderizar logo (buffer ou arquivo)
      if (logoBuffer) {
        try {
          const maxLogoWidth = Math.round(pageWidth * 0.6);
          const logoWidth = Math.min(maxLogoWidth, Math.round(mmToPt(30)));
          const logoX = (pageWidth - logoWidth) / 2;
          const logoY = smallMargin + 4;
          doc.image(logoBuffer, logoX, logoY, {
            width: logoWidth,
            align: "center",
          });
          logoRendered = true;
          const logoEstimatedHeight = Math.round(logoWidth * 0.9);
          var y = logoY + logoEstimatedHeight + 2;
        } catch (e) {
          logoRendered = false;
        }
      } else if (logoPath && fs.existsSync(logoPath)) {
        try {
          const maxLogoWidth = Math.round(pageWidth * 0.6);
          const logoWidth = Math.min(maxLogoWidth, Math.round(mmToPt(30)));
          const logoX = (pageWidth - logoWidth) / 2;
          const logoY = smallMargin + 4;
          doc.image(logoPath, logoX, logoY, {
            width: logoWidth,
            align: "center",
          });
          logoRendered = true;
          const logoEstimatedHeight = Math.round(logoWidth * 0.9);
          var y = logoY + logoEstimatedHeight + 2;
        } catch (e) {
          logoRendered = false;
        }
      }
    } catch (e) {
      /* fallback */
    }

    if (!logoRendered) {
      // tentar ainda exibir a logo padrão como texto se imagem não encontrada
      doc
        .fillColor("#000")
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("PETHUB", { align: "center" });
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

    // Nº venda e emissão
    const dataEmissao = venda.data
      ? new Date(venda.data).toLocaleDateString("pt-BR") +
        " " +
        new Date(venda.data).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : new Date().toLocaleDateString("pt-BR");
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#000");
    doc.text(`Venda: ${venda.id}`, left, y);
    doc.font("Helvetica").fontSize(8).text(`Emissão: ${dataEmissao}`, left, y, {
      width: contentWidth,
      align: "right",
    });
    y += lineHeight + 6;

    // --- Cliente ---
    const nomeCliente = (clienteObj && clienteObj.nome) || venda.cliente || "";
    if (nomeCliente) {
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#000");
      doc.text(`Cliente: ${nomeCliente}`, left, y, { width: contentWidth });
      y += lineHeight + 2;
    }
    if (clienteObj) {
      const partesEndereco = [
        clienteObj.endereco,
        clienteObj.numero,
        clienteObj.complemento,
        clienteObj.bairro,
        clienteObj.cidade && clienteObj.estado
          ? `${clienteObj.cidade} - ${clienteObj.estado}`
          : clienteObj.cidade || clienteObj.estado || null,
        clienteObj.cep,
      ].filter(Boolean);
      if (partesEndereco.length > 0) {
        doc.fontSize(7).font("Helvetica").fillColor("#555");
        doc.text(partesEndereco.join(", "), left, y, { width: contentWidth });
        doc.fillColor("#000");
        y += lineHeight + 2;
      }
    }
    if (nomeCliente || clienteObj) y += 4;

    // --- Produto/Serviço ---
    // Linha pontilhada
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
    doc.text("Desc%", left + 134, y, { width: 26, align: "right" });
    const totalColX = left + 160;
    doc.text("Total", totalColX, y, { width: 32, align: "right" });
    y += lineHeight + 2;

    doc.save();
    doc.lineWidth(0.3);
    doc.moveTo(left, y).lineTo(right, y).stroke();
    doc.restore();
    y += 4;

    // Itens
    const itens = Array.isArray(venda.itens) ? venda.itens : [];
    let totalBruto = 0;
    let totalDescontoItens = 0;
    let totalQuantidade = 0;

    doc.font("Helvetica").fontSize(7).fillColor("#000");
    for (const item of itens) {
      const prod = item.produto || {};
      const codigo = prod.id || "-";
      const nome = prod.nome || item.nome || item.descricao || "-";
      const qtd = parseFloat(item.quantidade || item.qtd || 1);
      const unitario = parseFloat(item.valorUnitario || item.preco || 0);
      const desconto = parseFloat(item.desconto || 0);
      const bruto = qtd * unitario;
      const total = parseFloat(
        item.totalFinal || item.total || bruto - (bruto * desconto) / 100,
      );

      totalBruto += bruto;
      totalDescontoItens += bruto - total;
      totalQuantidade += qtd;

      if (y > doc.page.height - 100) {
        doc.addPage();
        y = smallMargin + 10;
      }

      // Linha do item: código - nome em uma linha, valores abaixo
      doc.font("Helvetica").fontSize(7);
      doc.text(`${codigo} - ${nome}`, left, y, { width: contentWidth - 50 });
      doc.text(`${qtd} KG x R$`, left, y + lineHeight, { width: 80 });
      doc.text(`${unitario.toFixed(2)}`, left + 50, y + lineHeight, {
        width: 40,
      });
      doc.text(`- ${desconto.toFixed(2)}%`, left + 90, y + lineHeight, {
        width: 40,
      });
      doc.font("Helvetica-Bold").text(`R$ ${total.toFixed(2)}`, left, y, {
        width: contentWidth,
        align: "right",
      });
      doc.font("Helvetica");
      y += lineHeight * 2 + 4;
    }

    // --- EM CASO DE DEVOLUÇÃO ---
    y += 4;
    doc.save();
    doc.lineWidth(0.5);
    doc.dash(2, { space: 3 });
    doc.moveTo(left, y).lineTo(right, y).stroke();
    doc.undash();
    doc.restore();
    y += 6;

    doc
      .fontSize(7)
      .font("Helvetica-Bold")
      .text("EM CASO DE DEVOLUCAO APRESENTAR ESTE DOCUMENTO.", left, y, {
        width: contentWidth,
        align: "center",
      });
    y += lineHeight + 6;

    // --- Formas de Pagamento ---
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
      .text("Formas de Pagamento", left, y, {
        width: contentWidth,
        align: "center",
      });
    y += lineHeight + 4;

    let pagamentosRaw = venda.pagamentos;
    if (typeof pagamentosRaw === "string") {
      try {
        pagamentosRaw = JSON.parse(pagamentosRaw);
      } catch (_) {
        pagamentosRaw = [];
      }
    }
    const pagamentos = Array.isArray(pagamentosRaw) ? pagamentosRaw : [];
    const formaLabel = (f) => {
      if (!f) return "";
      const map = {
        dinheiro: "Dinheiro",
        debito: "Débito",
        credito: "Crédito",
        pix: "PIX",
        crediario: "Crediário",
        cheque: "Cheque",
        haver: "Haver",
      };
      return map[String(f).toLowerCase()] || String(f);
    };

    doc.font("Helvetica").fontSize(8);
    for (const p of pagamentos) {
      const label = formaLabel(p.forma || p.tipo || "");
      const valor = p.valor != null ? `R$ ${Number(p.valor).toFixed(2)}` : "";
      doc.text(label, left + 4, y, { width: contentWidth - 8 });
      if (valor)
        doc.text(valor, left + 4, y, {
          width: contentWidth - 8,
          align: "right",
        });
      y += lineHeight + 2;
    }

    y += 6;

    // --- Totais ---
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
      .text("Totais", left, y, { width: contentWidth, align: "center" });
    y += lineHeight + 4;

    const totalPago = parseFloat(venda.totalPago) || 0;
    const totaisVenda = venda.totais || {};
    const descontoGeral = parseFloat(totaisVenda.desconto || 0);
    const totalDos = totalBruto - totalDescontoItens;
    const totalLiquido = totalPago > 0 ? totalPago : totalDos - descontoGeral;

    doc.font("Helvetica").fontSize(8);
    const printTotalLine = (label, value) => {
      doc.text(label, left + 4, y, { width: contentWidth - 8 });
      doc.text(value, left + 4, y, { width: contentWidth - 8, align: "right" });
      y += lineHeight + 1;
    };

    printTotalLine("Total Quantidade:", totalQuantidade.toFixed(2));
    printTotalLine("Total Bruto:", `R$ ${totalBruto.toFixed(2)}`);
    printTotalLine(
      "(-) Desconto Itens:",
      `R$ ${totalDescontoItens.toFixed(2)}`,
    );
    printTotalLine("Total dos:", `R$ ${totalDos.toFixed(2)}`);
    printTotalLine("(-) Desconto:", `R$ ${descontoGeral.toFixed(2)}`);
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
    console.error("Erro ao gerar comprovante de venda:", error);
    res.status(500).json({ erro: "Erro ao gerar comprovante de venda" });
  }
});

router.get("/", vendaController.listarVendas);
router.get("/:id", vendaController.buscarVenda);
router.post("/", vendaController.criarVenda);
router.put("/:id", vendaController.atualizarVenda);
router.delete("/:id", vendaController.deletarVenda);

module.exports = router;
