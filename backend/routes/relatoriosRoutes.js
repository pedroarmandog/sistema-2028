const express = require("express");
const router = express.Router();
const { authUser } = require("../middleware/authUser");
router.use(authUser);
const path = require("path");
const fs = require("fs");
const { Empresa } = require("../models");
const Produto = require("../models/Produto");
const { Venda } = require("../models/Venda");
const { Op } = require("sequelize");
const { Agendamento } = require("../models/Agendamento");
const Pet = require("../models/Pet");
const { Cliente } = require("../models/Cliente");

// Helper centralizado: busca a empresa do usuário logado a partir do cookie JWT
// Ordem: req.user.empresaId → cookie JWT → body/query → primeira ativa (último recurso)
async function obterEmpresaDoRequest(req) {
  const jwt = require("jsonwebtoken");
  const JWT_SECRET =
    process.env.JWT_USER_SECRET || "pethub_user_secret_2026_!@#$%";

  // 1) req.user (se authUser middleware já preencheu)
  if (req.user && req.user.empresaId) {
    const emp = await Empresa.findByPk(req.user.empresaId);
    if (emp) return emp;
  }

  // 2) Cookie JWT — mais confiável que body/query
  try {
    const cookieHeader = req.headers.cookie || "";
    const match = cookieHeader.match(/pethub_token=([^;]+)/);
    if (match) {
      const decoded = jwt.verify(match[1], JWT_SECRET);
      if (decoded.empresaId) {
        const emp = await Empresa.findByPk(decoded.empresaId);
        if (emp) return emp;
      }
    }
  } catch (_) {}

  // 3) Body ou query param
  const idFromReq =
    (req.body && (req.body.empresaId || req.body.empresa_id)) ||
    (req.query && (req.query.empresaId || req.query.empresa_id));
  if (idFromReq) {
    const emp = await Empresa.findByPk(idFromReq);
    if (emp) return emp;
  }

  // 4) Último recurso: NÃO retornar empresa aleatória — forçar null
  console.warn(
    "[obterEmpresaDoRequest] Nenhuma empresa identificada no request (user/cookie/body/query)",
  );
  return null;
}

// Helper: retorna logo path absoluto e nome da empresa
async function obterDadosEmpresaPDF(req) {
  const emp = await obterEmpresaDoRequest(req);
  if (!emp) return { empresa: null, logoPath: null, nomeEmpresa: "" };
  const nomeEmpresa = emp.nome || emp.razaoSocial || "";
  let logoPath = null;
  if (emp.logo) {
    const logoStr = String(emp.logo);
    // logo pode estar como path relativo ou só o filename
    const candidates = [
      path.join(__dirname, "../../uploads", logoStr),
      path.join(__dirname, "../../", logoStr),
      path.join(__dirname, "../../uploads/logos-empresas", logoStr),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        logoPath = c;
        break;
      }
    }
  }
  return { empresa: emp, logoPath, nomeEmpresa };
}

// Helper: agrega vendas por produto e retorna array de linhas com custos e lucros
async function gerarDadosFaturamento(filters = {}, req) {
  // filtros: dataInicio, dataFim, ... (aceita mesmo formato do frontend)
  const { dataInicio, dataFim } = filters || {};

  // montar where para vendas (simples)
  const where = {};
  function parseBRDate(s) {
    if (!s) return null;
    const parts = String(s).split("/");
    if (parts.length === 3)
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    return new Date(s);
  }
  const inicio = parseBRDate(dataInicio);
  const fim = parseBRDate(dataFim);
  if (inicio && fim) {
    fim.setHours(23, 59, 59, 999);
    where.createdAt = { [Op.between]: [inicio, fim] };
  }
  // empresa_id obrigatório
  const empresaObj = await obterEmpresaDoRequest(req);
  if (!empresaObj || !empresaObj.id) return [];
  where.empresa_id = empresaObj.id;

  // Processar vendas em batches para evitar findAll massivo
  const mapa = new Map();
  const batchSize = 1000;
  let offset = 0;
  while (true) {
    const vendasBatch = await Venda.findAll({
      where,
      raw: true,
      limit: batchSize,
      offset,
    });
    if (!vendasBatch || vendasBatch.length === 0) break;
    for (const v of vendasBatch) {
      let itens = [];
      try {
        itens = Array.isArray(v.itens) ? v.itens : JSON.parse(v.itens || "[]");
      } catch (e) {
        itens = v.itens || [];
      }
      for (const it of itens) {
        const prodObj = it.produto || {};
        const prodId =
          prodObj && (prodObj.id || prodObj._id)
            ? String(prodObj.id || prodObj._id)
            : it.produtoId
              ? String(it.produtoId)
              : it.id
                ? String(it.id)
                : null;
        const codigo =
          it.codigo || (prodObj && (prodObj.codigo || prodObj.code)) || "";
        const nome =
          (prodObj && (prodObj.nome || prodObj.produto)) ||
          it.nome ||
          it.descricao ||
          "";

        const key = prodId
          ? `id:${prodId}`
          : codigo
            ? `code:${codigo}`
            : `name:${String(nome || "")
                .trim()
                .toLowerCase()}`;

        const entry = mapa.get(key) || {
          produtoId: prodId || null,
          codigo: codigo || "",
          nome: nome || "",
          sample: prodObj || it,
          qtd_venda: 0,
          qtd_vendida: 0,
          total_venda: 0,
        };

        const qtd = Number(it.quantidade || it.qtd || it.qtd_venda || 1) || 0;
        const qtdVendida =
          Number(it.quantidade_vendida || it.qtd_vendida || qtd) || qtd;
        entry.qtd_venda += qtd;
        entry.qtd_vendida += qtdVendida;

        // preço: tentar converter formatos com vírgula / símbolos
        let precoRaw =
          it.preco ||
          it.preco_venda ||
          it.precoVenda ||
          it.valor ||
          it.valorUnitario ||
          it.totalUnitario ||
          0;
        let preco = 0;
        try {
          preco =
            Number(
              String(precoRaw || 0)
                .replace(/[^0-9\-,\.]/g, "")
                .replace(",", "."),
            ) || 0;
        } catch (pe) {
          preco = Number(precoRaw) || 0;
        }
        entry.total_venda += preco * qtd;
        mapa.set(key, entry);
      }
    }
    offset += vendasBatch.length;
    if (vendasBatch.length < batchSize) break;
  }

  // buscar produtos para obter custo unitário (indexar por id/codigo/nome)
  const produtosDB = await Produto.findAll({
    where: { empresa_id: empresaObj.id },
    attributes: [
      "id",
      "codigo",
      "nome",
      "custoBase",
      "preco",
      "tipo",
      "perfilComissao",
    ],
  });
  const normalizeStr = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const produtosById = new Map();
  const produtosByCodigo = new Map();
  const produtosByName = new Map();
  for (const p of produtosDB) {
    if (p && p.id) produtosById.set(String(p.id), p);
    if (p && p.codigo) produtosByCodigo.set(String(p.codigo), p);
    if (p && p.nome) produtosByName.set(normalizeStr(p.nome), p);
  }

  const resultado = [];
  for (const [k, v] of mapa.entries()) {
    let prod = null;
    if (v.produtoId && produtosById.has(String(v.produtoId)))
      prod = produtosById.get(String(v.produtoId));
    else if (v.codigo && produtosByCodigo.has(String(v.codigo)))
      prod = produtosByCodigo.get(String(v.codigo));
    else if (v.nome && produtosByName.has(normalizeStr(v.nome)))
      prod = produtosByName.get(normalizeStr(v.nome));

    // custo unitário: preferir cadastro (custoBase) -> fallback sample item
    let custoUnit = 0;
    if (prod && prod.custoBase !== undefined && prod.custoBase !== null) {
      custoUnit = Number(prod.custoBase) || 0;
    } else if (v.sample) {
      custoUnit =
        Number(
          v.sample.custoBase || v.sample.custo || v.sample.preco_custo || 0,
        ) || 0;
    }

    const qtdVendida = Number(v.qtd_vendida || v.qtd_venda || 0) || 0;
    let total_custo = Number((custoUnit * qtdVendida).toFixed(2));

    // total de venda: preferir soma registrada, senão fallback ao preço cadastrado * qtd
    let total_venda = Number((v.total_venda || 0).toFixed(2));
    if (!total_venda && prod && prod.preco) {
      total_venda = Number((Number(prod.preco) * qtdVendida).toFixed(2));
    }

    const total_lucro = Number((total_venda - total_custo).toFixed(2));
    const margem = total_venda
      ? Number(((total_lucro / total_venda) * 100).toFixed(2))
      : 0;

    resultado.push({
      codigo:
        v.codigo ||
        v.codigo ||
        (prod && prod.codigo) ||
        (prod && prod.id) ||
        "",
      produto: prod || v.nome || v.sample || v.produto || "",
      qtd_venda: v.qtd_venda,
      qtd_vendida: v.qtd_vendida,
      custo_unit: custoUnit,
      total_custo,
      total_venda,
      total_lucro,
      margem,
    });
  }

  // ordenar por codigo/produto
  resultado.sort((a, b) => {
    if (a.codigo && b.codigo)
      return String(a.codigo).localeCompare(String(b.codigo));
    if (a.produto && b.produto)
      return String(a.produto.nome || a.produto).localeCompare(
        String(b.produto.nome || b.produto),
      );
    return 0;
  });
  return resultado;
}

// Rota: /faturamento (JSON)
router.post("/faturamento", async (req, res) => {
  try {
    const filtros = req.body || {};
    const produtos = await gerarDadosFaturamento(filtros, req);
    const periodo =
      filtros.dataInicio && filtros.dataFim
        ? `Período: ${filtros.dataInicio} até ${filtros.dataFim}`
        : "Período: Todos";
    // Incluir nome da empresa para templates Stimulsoft
    const emp = await obterEmpresaDoRequest(req);
    const nomeEmpresa = emp ? emp.razaoSocial || emp.nome || "" : "";
    res.json({ periodo, produtos, nomeEmpresa });
  } catch (error) {
    console.error("❌ Erro ao gerar relatório:", error);
    res
      .status(500)
      .json({ error: "Erro ao gerar relatório", message: error.message });
  }
});

// Rota: /venda-no-periodo/pdf (PDF) - usa mesma lógica de faturamento mas título diferente
router.get("/venda-no-periodo/pdf", async (req, res) => {
  let PDFDocument;
  try {
    PDFDocument = require("pdfkit");
  } catch (e) {
    res
      .status(500)
      .json({ error: "Dependência ausente: pdfkit", message: e.message });
    return;
  }

  try {
    // aceitar filtros via query string (dataInicio, dataFim)
    const filtros = req.query || {};
    const dataProdutos = await gerarDadosFaturamento(filtros, req);

    const doc = new PDFDocument({ size: "A4", margin: 36 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="venda-no-periodo.pdf"`,
    );
    doc.pipe(res);

    // Layout (reaproveita lógica do faturamento)
    const left = doc.page.margins.left;
    const pageUsableWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;

    const headers = [
      "Código",
      "Produto",
      "Qtd Vendido",
      "Total Custo",
      "Total Venda",
      "Total Lucro",
    ];

    const headerFontSize = 9;
    const rowFontSize = 8;
    const rowHeight = 18;
    const cellPadding = 4;

    // --- Logo: preferir payload (companyLogo) -> logo da empresa -> logo padrão ---
    let logoBuffer = null;
    try {
      if (req.query && req.query.companyLogo) {
        const companyLogo = req.query.companyLogo;
        if (
          typeof companyLogo === "string" &&
          companyLogo.startsWith("data:")
        ) {
          const base64 = companyLogo.split(",")[1];
          if (base64) logoBuffer = Buffer.from(base64, "base64");
        } else if (typeof companyLogo === "string") {
          try {
            logoBuffer = Buffer.from(companyLogo, "base64");
          } catch (e) {
            /* ignore */
          }
        }
      }
      // Também aceitar nome de arquivo do logo via query (logoFilename)
      if (!logoBuffer && req.query && req.query.logoFilename) {
        const lf = String(req.query.logoFilename || "");
        try {
          const p = path.join(__dirname, "../../uploads", lf);
          if (fs.existsSync(p)) {
            logoBuffer = fs.readFileSync(p);
          }
        } catch (e) {
          /* ignore */
        }
      }
    } catch (e) {
      console.warn("Erro ao parsear companyLogo payload:", e && e.message);
    }

    // Buscar empresa para logo e razão social
    // Buscar empresa do usuário logado (cookie JWT)
    let nomeEmpresa =
      req.query && req.query.companyName ? String(req.query.companyName) : "";
    try {
      const empresa = await obterEmpresaDoRequest(req);
      if (empresa) {
        if (!nomeEmpresa)
          nomeEmpresa = empresa.razaoSocial || empresa.nome || "";
        if (!logoBuffer && empresa.logo) {
          const candidates = [
            path.join(__dirname, "../../uploads", empresa.logo),
            path.join(
              __dirname,
              "../../uploads",
              "logos-empresas",
              empresa.logo,
            ),
            path.join(__dirname, "../../uploads", path.basename(empresa.logo)),
          ];
          for (const p of candidates) {
            if (fs.existsSync(p)) {
              try {
                logoBuffer = fs.readFileSync(p);
                break;
              } catch (e) {
                /* continue */
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn(
        "Erro ao buscar empresa para venda-no-periodo:",
        e && e.message,
      );
    }

    // Fallback logo padrão
    if (!logoBuffer) {
      const defaultPaths = [
        path.join(__dirname, "../../frontend/fivecon/Design sem nome (17).png"),
        path.join(__dirname, "../../frontend/logos/Logo PetHub (2).svg"),
      ];
      for (const p of defaultPaths) {
        if (fs.existsSync(p)) {
          try {
            logoBuffer = fs.readFileSync(p);
            break;
          } catch (e) {
            /* ignore */
          }
        }
      }
    }

    // Desenhar logo
    const pageWidth = doc.page.width;
    const logoWidth = 90;
    const logoX = (pageWidth - logoWidth) / 2;
    const logoY = 25;
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, logoX, logoY, {
          width: logoWidth,
          align: "center",
        });
      } catch (e) {
        console.warn("Erro ao desenhar logo no PDF:", e && e.message);
      }
    }

    // Título e razão social
    const leftTable = left;
    const usableWidth = pageUsableWidth;
    const prodW = usableWidth - 60 - (headers.length - 2) * 70;
    const headerStartY = logoBuffer ? Math.max(110, logoY + 85) : doc.y + 6;

    doc.font("Helvetica-Bold").fontSize(14).fillColor("#000");
    doc.text("RELATÓRIO DE VENDA NO PERÍODO", leftTable, headerStartY, {
      align: "center",
      width: usableWidth,
    });

    doc.moveDown(0.2);
    if (nomeEmpresa) {
      doc.font("Helvetica").fontSize(11).fillColor("#444");
      doc.text(nomeEmpresa, leftTable, doc.y, {
        align: "center",
        width: usableWidth,
      });
    }

    // Período
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(10).fillColor("#444");
    const periodoTexto =
      filtros && filtros.dataInicio && filtros.dataFim
        ? `Período: ${filtros.dataInicio} até ${filtros.dataFim}`
        : filtros && filtros.dataInicio
          ? `Período: a partir de ${filtros.dataInicio}`
          : filtros && filtros.dataFim
            ? `Período: até ${filtros.dataFim}`
            : "Período: Todos";
    doc.text(periodoTexto, leftTable, doc.y, {
      align: "center",
      width: usableWidth,
    });

    // Posicionar tabela
    let y = doc.y + 12;
    doc.font("Helvetica-Bold").fontSize(headerFontSize).fillColor("#000");
    let x = leftTable;
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], x + cellPadding, y + 2, {
        width:
          (i === 0
            ? 60
            : i === 1
              ? usableWidth - 60 - (headers.length - 2) * 70
              : 70) -
          cellPadding * 2,
        align: i >= 2 ? "right" : "left",
      });
      x +=
        i === 0
          ? 60
          : i === 1
            ? usableWidth - 60 - (headers.length - 2) * 70
            : 70;
    }
    y += rowHeight;
    doc
      .moveTo(leftTable, y - 6)
      .lineTo(leftTable + usableWidth, y - 6)
      .stroke("#e6e6e6");

    // Conteúdo das linhas
    doc.font("Helvetica").fontSize(rowFontSize).fillColor("#000");
    let sumQtdVendida = 0,
      sumTotalCusto = 0,
      sumTotalVenda = 0,
      sumTotalLucro = 0;
    const fmtCurrency = (v) =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(Number(v || 0));

    for (const p of dataProdutos) {
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 10) {
        doc.addPage();
        y = doc.page.margins.top + 10;
      }
      x = leftTable;
      const codigoVal =
        p.codigo !== undefined && p.codigo !== null ? String(p.codigo) : "";
      let produtoVal = "";
      if (p.produto)
        produtoVal =
          typeof p.produto === "object"
            ? p.produto.nome || p.produto.produto || String(p.produto.id || "")
            : String(p.produto);
      const qtdVendidaVal = String(p.qtd_vendida || 0);
      const totalCustoVal = fmtCurrency(p.total_custo || 0);
      const totalVendaVal = fmtCurrency(p.total_venda || 0);
      const totalLucroVal = fmtCurrency(p.total_lucro || 0);

      const cellValues = [
        codigoVal,
        produtoVal,
        qtdVendidaVal,
        totalCustoVal,
        totalVendaVal,
        totalLucroVal,
      ];

      // escrever cells (simples, adaptando larguras)
      doc.text(
        cellValues[0],
        x + cellPadding,
        y + (rowHeight - rowFontSize) / 2 - 1,
        { width: 60 - cellPadding * 2, align: "left" },
      );
      x += 60;
      const prodW = usableWidth - 60 - (headers.length - 2) * 70;
      doc.text(
        cellValues[1],
        x + cellPadding,
        y + (rowHeight - rowFontSize) / 2 - 1,
        { width: prodW - cellPadding * 2, align: "left" },
      );
      x += prodW;
      for (let c = 2; c < headers.length; c++) {
        doc.text(
          cellValues[c],
          x + cellPadding,
          y + (rowHeight - rowFontSize) / 2 - 1,
          { width: 70 - cellPadding * 2, align: "right" },
        );
        x += 70;
      }

      doc
        .moveTo(leftTable, y + rowHeight - 4)
        .lineTo(leftTable + usableWidth, y + rowHeight - 4)
        .stroke("#f0f0f0");

      sumQtdVendida += Number(p.qtd_vendida || 0);
      sumTotalCusto += Number(p.total_custo || 0);
      sumTotalVenda += Number(p.total_venda || 0);
      sumTotalLucro += Number(p.total_lucro || 0);
      y += rowHeight;
    }

    // Totais
    sumTotalCusto = Number(sumTotalCusto.toFixed(2));
    sumTotalVenda = Number(sumTotalVenda.toFixed(2));
    sumTotalLucro = Number(sumTotalLucro.toFixed(2));
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 10) {
      doc.addPage();
      y = doc.page.margins.top + 10;
    }
    doc
      .moveTo(leftTable, y - 6)
      .lineTo(leftTable + usableWidth, y - 6)
      .stroke("#cccccc");
    doc.font("Helvetica-Bold").fontSize(rowFontSize + 1);
    x = leftTable;
    doc.text("", x + cellPadding, y + (rowHeight - rowFontSize) / 2 - 1, {
      width: 60 - cellPadding * 2,
    });
    x += 60;
    doc.text("TOTAL", x + cellPadding, y + (rowHeight - rowFontSize) / 2 - 1, {
      width: prodW - cellPadding * 2,
      align: "left",
    });
    x += prodW;
    const totals = [
      String(sumQtdVendida),
      fmtCurrency(sumTotalCusto),
      fmtCurrency(sumTotalVenda),
      fmtCurrency(sumTotalLucro),
    ];
    for (let c = 0; c < totals.length; c++) {
      const w = 70;
      doc.text(
        totals[c],
        x + cellPadding,
        y + (rowHeight - rowFontSize) / 2 - 1,
        { width: w - cellPadding * 2, align: "right" },
      );
      x += w;
    }

    doc.end();
  } catch (error) {
    console.error("❌ Erro ao gerar PDF de venda-no-periodo:", error);
    res
      .status(500)
      .json({ error: "Erro ao gerar PDF", message: error.message });
  }
});

// Rota: /faturamento/pdf (PDF)
router.post("/faturamento/pdf", async (req, res) => {
  let PDFDocument;
  try {
    PDFDocument = require("pdfkit");
  } catch (e) {
    res
      .status(500)
      .json({ error: "Dependência ausente: pdfkit", message: e.message });
    return;
  }

  try {
    const filtros = req.body || {};
    const dataProdutos = await gerarDadosFaturamento(filtros, req);

    const doc = new PDFDocument({ size: "A4", margin: 36 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="faturamento.pdf"`);
    doc.pipe(res);

    // Layout
    const left = doc.page.margins.left;
    const pageUsableWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;

    const headers = [
      "Código",
      "Produto",
      "Qtd Vendido",
      "Total Custo",
      "Total Venda",
      "Total Lucro",
    ];

    // Fonte e dimensões (ajustadas para caber mais colunas)
    const headerFontSize = 9;
    const rowFontSize = 8;
    const rowHeight = 18;
    const cellPadding = 4;

    // --- Logo: preferir payload (companyLogo) -> logo da empresa -> logo padrão ---
    let logoBuffer = null;
    try {
      if (req.body && req.body.companyLogo) {
        const companyLogo = req.body.companyLogo;
        if (
          typeof companyLogo === "string" &&
          companyLogo.startsWith("data:")
        ) {
          const base64 = companyLogo.split(",")[1];
          if (base64) logoBuffer = Buffer.from(base64, "base64");
        } else if (typeof companyLogo === "string") {
          // tentar decodificar base64 bruto (caso frontend envie assim)
          try {
            logoBuffer = Buffer.from(companyLogo, "base64");
          } catch (e) {
            /* ignore */
          }
        } else if (companyLogo && companyLogo.data) {
          logoBuffer = Buffer.from(companyLogo.data);
        }
      }
    } catch (e) {
      console.warn("Erro ao parsear companyLogo payload:", e && e.message);
    }

    // Se não veio pelo payload, tentar buscar da tabela Empresa
    if (!logoBuffer) {
      try {
        const empresa = await obterEmpresaDoRequest(req);
        if (empresa && empresa.logo) {
          const candidates = [
            path.join(__dirname, "../../uploads", empresa.logo),
            path.join(
              __dirname,
              "../../uploads",
              "logos-empresas",
              empresa.logo,
            ),
            path.join(__dirname, "../../uploads", path.basename(empresa.logo)),
          ];
          for (const p of candidates) {
            if (fs.existsSync(p)) {
              try {
                logoBuffer = fs.readFileSync(p);
                break;
              } catch (e) {
                /* continue */
              }
            }
          }
        }
      } catch (e) {
        console.warn("Erro ao buscar logo da empresa:", e && e.message);
      }
    }

    // Fallback para logo padrão do sistema (frontend assets)
    if (!logoBuffer) {
      const defaultPaths = [
        path.join(__dirname, "../../frontend/fivecon/Design sem nome (17).png"),
        path.join(__dirname, "../../frontend/logos/Logo PetHub (2).svg"),
      ];
      for (const p of defaultPaths) {
        if (fs.existsSync(p)) {
          try {
            logoBuffer = fs.readFileSync(p);
            break;
          } catch (e) {
            /* ignore */
          }
        }
      }
    }

    // Desenhar logo no topo (header), sem reduzir a largura disponível da tabela
    const pageWidth = doc.page.width;
    // permitir ajuste via payload (companyLogoWidth), senão usar 90pt
    const logoWidth =
      typeof req.body.companyLogoWidth === "number" &&
      req.body.companyLogoWidth > 0
        ? req.body.companyLogoWidth
        : req.body && Number(req.body.companyLogoWidth)
          ? Number(req.body.companyLogoWidth)
          : 90;
    const logoX = (pageWidth - logoWidth) / 2;
    const logoY = 25;
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, logoX, logoY, {
          width: logoWidth,
          align: "center",
        });
      } catch (e) {
        console.warn("Erro ao desenhar logo no PDF:", e && e.message);
      }
    }
    // tabela usa a largura total disponível na página
    const leftTable = left;
    let usableWidth = pageUsableWidth;

    // Calcular larguras dinamicamente garantindo que a soma == usableWidth
    const codeW = 60; // coluna código
    const numericCols = headers.length - 2; // colunas numéricas após Código e Produto

    // largura sugerida para colunas numéricas (ajustável)
    let numW = 70;
    let prodW = usableWidth - codeW - numW * numericCols;

    // Se produto ficar muito estreito, recalcular numW para caber um mínimo razoável
    const minProdW = 120;
    const minNumW = 50;
    if (prodW < minProdW) {
      // distribuir espaço disponível entre colunas numéricas mantendo minProdW
      numW = Math.max(
        minNumW,
        Math.floor((usableWidth - codeW - minProdW) / numericCols),
      );
      prodW = usableWidth - codeW - numW * numericCols;
    }

    // Caso extremo (prodW ainda pequeno), distribuir igualmente entre produto+numéricas
    if (prodW < 80) {
      const remainder = usableWidth - codeW;
      const each = Math.max(minNumW, Math.floor(remainder / (numericCols + 1)));
      prodW = each;
      numW = each;
    }

    // Ajustar pequenos desvios para que a soma das colWidths == usableWidth
    const tentativeTotal = codeW + prodW + numW * numericCols;
    const diff = usableWidth - tentativeTotal;
    if (Math.abs(diff) >= 1) {
      prodW += diff; // ajustar a coluna Produto para compensar
    }

    const colWidths = [codeW, prodW].concat(new Array(numericCols).fill(numW));

    function truncateToWidth(text, width) {
      const s = String(text || "");
      doc.font("Helvetica").fontSize(rowFontSize);
      if (doc.widthOfString(s) <= width) return s;
      let out = s;
      const ell = "...";
      while (out.length > 0 && doc.widthOfString(out + ell) > width)
        out = out.slice(0, -1);
      return out.length ? out + ell : ell;
    }

    // Cabeçalho: título e período abaixo da logo, depois os headers da tabela
    const headerStartY = logoBuffer ? Math.max(110, logoY + 85) : doc.y + 6;

    // Título principal (h3/h4 equivalente)
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#000");
    doc.text("RELATÓRIO DE FATURAMENTO", leftTable, headerStartY, {
      align: "center",
      width: usableWidth,
    });

    // Período filtrado (linha menor abaixo do título)
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(10).fillColor("#444");
    const periodoTexto =
      filtros && filtros.dataInicio && filtros.dataFim
        ? `Período: ${filtros.dataInicio} até ${filtros.dataFim}`
        : filtros && filtros.dataInicio
          ? `Período: a partir de ${filtros.dataInicio}`
          : filtros && filtros.dataFim
            ? `Período: até ${filtros.dataFim}`
            : "Período: Todos";
    doc.text(periodoTexto, leftTable, doc.y, {
      align: "center",
      width: usableWidth,
    });

    // Posicionar início da tabela logo abaixo do título/período
    let y = doc.y + 12;
    doc.font("Helvetica-Bold").fontSize(headerFontSize).fillColor("#000");
    let x = leftTable;
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], x + cellPadding, y + 2, {
        width: colWidths[i] - cellPadding * 2,
        align: i >= 2 ? "right" : "left",
      });
      x += colWidths[i];
    }
    y += rowHeight;
    doc
      .moveTo(leftTable, y - 6)
      .lineTo(leftTable + usableWidth, y - 6)
      .stroke("#e6e6e6");

    doc.font("Helvetica").fontSize(rowFontSize).fillColor("#000");
    let sumQtdVendida = 0,
      sumTotalCusto = 0,
      sumTotalVenda = 0,
      sumTotalLucro = 0;
    const fmtCurrency = (v) =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(Number(v || 0));

    for (const p of dataProdutos) {
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 10) {
        doc.addPage();
        y = doc.page.margins.top + 10;
      }
      x = leftTable;
      const codigoVal =
        p.codigo !== undefined && p.codigo !== null ? String(p.codigo) : "";
      let produtoVal = "";
      if (p.produto)
        produtoVal =
          typeof p.produto === "object"
            ? p.produto.nome || p.produto.produto || String(p.produto.id || "")
            : String(p.produto);
      const qtdVendidaVal = String(p.qtd_vendida || 0);
      const totalCustoVal = fmtCurrency(p.total_custo || 0);
      const totalVendaVal = fmtCurrency(p.total_venda || 0);
      const totalLucroVal = fmtCurrency(p.total_lucro || 0);

      const cellValues = [
        codigoVal,
        produtoVal,
        qtdVendidaVal,
        totalCustoVal,
        totalVendaVal,
        totalLucroVal,
      ];

      doc.text(
        truncateToWidth(cellValues[0], colWidths[0] - cellPadding * 2),
        x + cellPadding,
        y + (rowHeight - rowFontSize) / 2 - 1,
        { width: colWidths[0] - cellPadding * 2, align: "left" },
      );
      x += colWidths[0];
      doc.text(
        truncateToWidth(cellValues[1], colWidths[1] - cellPadding * 2),
        x + cellPadding,
        y + (rowHeight - rowFontSize) / 2 - 1,
        { width: colWidths[1] - cellPadding * 2, align: "left" },
      );
      x += colWidths[1];
      for (let c = 2; c < headers.length; c++) {
        doc.text(
          cellValues[c],
          x + cellPadding,
          y + (rowHeight - rowFontSize) / 2 - 1,
          { width: colWidths[c] - cellPadding * 2, align: "right" },
        );
        x += colWidths[c];
      }

      doc
        .moveTo(leftTable, y + rowHeight - 4)
        .lineTo(leftTable + usableWidth, y + rowHeight - 4)
        .stroke("#f0f0f0");

      sumQtdVendida += Number(p.qtd_vendida || 0);
      sumTotalCusto += Number(p.total_custo || 0);
      sumTotalVenda += Number(p.total_venda || 0);
      sumTotalLucro += Number(p.total_lucro || 0);
      y += rowHeight;
    }

    // footer totals
    sumTotalCusto = Number(sumTotalCusto.toFixed(2));
    sumTotalVenda = Number(sumTotalVenda.toFixed(2));
    sumTotalLucro = Number(sumTotalLucro.toFixed(2));
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 10) {
      doc.addPage();
      y = doc.page.margins.top + 10;
    }
    doc
      .moveTo(leftTable, y - 6)
      .lineTo(leftTable + usableWidth, y - 6)
      .stroke("#cccccc");
    doc.font("Helvetica-Bold").fontSize(rowFontSize + 1);
    x = leftTable;
    doc.text("", x + cellPadding, y + (rowHeight - rowFontSize) / 2 - 1, {
      width: colWidths[0] - cellPadding * 2,
    });
    x += colWidths[0];
    doc.text("TOTAL", x + cellPadding, y + (rowHeight - rowFontSize) / 2 - 1, {
      width: colWidths[1] - cellPadding * 2,
      align: "left",
    });
    x += colWidths[1];
    const totals = [
      String(sumQtdVendida),
      fmtCurrency(sumTotalCusto),
      fmtCurrency(sumTotalVenda),
      fmtCurrency(sumTotalLucro),
    ];
    for (let c = 0; c < totals.length; c++) {
      const w = colWidths[c + 2];
      doc.text(
        totals[c],
        x + cellPadding,
        y + (rowHeight - rowFontSize) / 2 - 1,
        { width: w - cellPadding * 2, align: "right" },
      );
      x += w;
    }

    doc.end();
  } catch (error) {
    console.error("❌ Erro ao gerar PDF de faturamento:", error);
    res
      .status(500)
      .json({ error: "Erro ao gerar PDF", message: error.message });
  }
});
/**
 * POST /api/relatorios/etiquetas/pdf
 * Gera PDF simples de etiquetas a partir de um array de itens.
 * Espera JSON: { etiquetas: [{ id, produto, quantidade, codigoBarras? }], primeiraLinha, primeiraColuna, gerarPor, modelo }
 */
router.post("/etiquetas/pdf", async (req, res) => {
  try {
    console.log("📄 Gerando PDF de etiquetas");
    const {
      etiquetas = [],
      primeiraLinha = 1,
      primeiraColuna = 1,
      gerarPor = "Código do produto",
      modelo = "",
      barcodeOffsetMm = 0,
      priceOffsetMm = 0,
    } = req.body || {};
    // helper mm -> pt (definido antes do uso dos offsets)
    const mmToPt = (mm) => mm * 2.834645669;
    // converter offsets em mm (recebidos do frontend) para pontos
    let barcodeOffsetPt =
      typeof barcodeOffsetMm === "number"
        ? mmToPt(barcodeOffsetMm)
        : Number(barcodeOffsetMm)
          ? mmToPt(Number(barcodeOffsetMm))
          : 0;
    let priceOffsetPt =
      typeof priceOffsetMm === "number"
        ? mmToPt(priceOffsetMm)
        : Number(priceOffsetMm)
          ? mmToPt(Number(priceOffsetMm))
          : 0;

    // Se for o modelo A4-65 com barras e offsets não foram fornecidos, aplicar pequeno ajuste padrão para a esquerda
    const modeloA465 =
      /65 etiquetas|38x21|38 x 21|38x21mm/i.test(modelo) &&
      /barras|barra/i.test(modelo);
    if (modeloA465) {
      if (!barcodeOffsetPt) barcodeOffsetPt = mmToPt(-4); // -4 mm por padrão para a esquerda (mais deslocamento)
      if (!priceOffsetPt) priceOffsetPt = mmToPt(-4);
    }

    if (barcodeOffsetPt || priceOffsetPt)
      console.log(
        `🔧 Offsets aplicados (pt): barcodeOffset=${barcodeOffsetPt.toFixed(2)}, priceOffset=${priceOffsetPt.toFixed(2)}`,
      );

    // Log de debug: mostrar amostra dos primeiros itens e verificar presença do campo `preco`
    try {
      const sample = (Array.isArray(etiquetas) ? etiquetas : [])
        .slice(0, 5)
        .map((it, i) => ({
          index: i,
          id:
            it && (it.id || it.codigo || it.codigoBarras)
              ? it.id || it.codigo || it.codigoBarras
              : null,
          produto: it && (it.produto || it.nome) ? it.produto || it.nome : null,
          preco:
            it &&
            (it.preco !== undefined
              ? it.preco
              : it.preco_venda ||
                it.precoVenda ||
                it.preco_venda_formatted ||
                it.preco_formatted ||
                null),
        }));
      console.log(
        "🔎 etiquetas (sample 0..4):",
        JSON.stringify({ modelo, sample }),
      );
    } catch (dbg) {
      console.warn(
        "⚠️ Falha ao montar log de amostra de etiquetas:",
        dbg && dbg.message,
      );
    }

    let PDFDocument;
    try {
      PDFDocument = require("pdfkit");
    } catch (errRequire) {
      console.error(
        "❌ pdfkit não está instalado:",
        errRequire && errRequire.message,
      );
      res.status(500).json({
        error: "Dependência ausente: pdfkit",
        message:
          "Execute `npm install pdfkit` na raiz do projeto e reinicie o servidor.",
      });
      return;
    }

    const doc = new PDFDocument({ size: "A4", margin: 28 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="etiquetas.pdf"`);
    doc.pipe(res);

    const pageWidth = 595.28; // pts for A4
    const pageHeight = 841.89;
    const margin = 28;

    // Build flat list expanding quantities
    const flat = [];
    etiquetas.forEach((item) => {
      const qty = Number(item.quantidade) || 1;
      for (let i = 0; i < qty; i++) flat.push(item);
    });

    // helper mm -> pt (defined once above for offsets and later usage)

    // Caso: modelo Papel A4 - 65 etiquetas (38x21mm) com barras
    if (
      /65 etiquetas|38x21|38 x 21|38x21mm/i.test(modelo) &&
      /barras|barra/i.test(modelo)
    ) {
      // label size: 38 x 21 mm
      const labelW = mmToPt(38);
      const labelH = mmToPt(21);
      const cols = 5;
      const rows = 13; // 5 x 13 = 65

      const usableW = pageWidth - margin * 2;
      const totalGridW = cols * labelW;
      const startX = margin + Math.max(0, (usableW - totalGridW) / 2);
      let startY = margin + mmToPt(6);

      // try to load bwip-js for barcode rendering (diagnostic logs added)
      let bwip = null;
      try {
        bwip = require("bwip-js");
        console.log("✅ bwip-js carregado: geração de códigos habilitada");
      } catch (e) {
        bwip = null;
        console.warn(
          "⚠️ bwip-js não encontrado — códigos de barras gráficos estarão desativados",
        );
      }

      doc.font("Helvetica").fontSize(8).fillColor("#111");

      let idx = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (idx >= flat.length) break;
          const it = flat[idx];
          const x = startX + c * labelW;
          const y = startY + r * labelH;

          // Text line: ID - NAME (smaller font)
          const codigo =
            gerarPor && gerarPor.toLowerCase().indexOf("barras") !== -1
              ? it.codigoBarras || it.codigo || String(it.id || "")
              : it.id || it.codigo || "";
          const titulo = it.produto || it.nome || "";
          const linha = [String(codigo).trim(), String(titulo).trim()]
            .filter(Boolean)
            .join(" - ");
          doc.font("Helvetica").fontSize(8).fillColor("#000");
          // medir altura do título para posicionar corretamente o código de barras e preço
          const tituloHeight = doc.heightOfString(linha, { width: labelW - 8 });
          doc.text(linha, x + 4, y + 4, { width: labelW - 8, align: "left" });

          // Barcode (e possivelmente preço) abaixo do texto
          const imgW = Math.min(labelW - 12, mmToPt(30));
          // posição X centralizada base (sem offsets)
          const baseCenterX = x + (labelW - imgW) / 2;
          // posição X do barcode: centralizada + offset específico para barcode
          const imgX = baseCenterX + (barcodeOffsetPt || 0);
          const imgH = mmToPt(8); // altura do barcode

          // detectar se o modelo pede preço (preço + barras)
          const modeloPedePreco = /pre[cç]o|preco|preço/i.test(modelo || "");
          // obter valor do preço a partir dos campos mais comuns
          let precoRaw =
            it.preco !== undefined && it.preco !== null
              ? it.preco
              : it.preco_venda ||
                it.precoVenda ||
                it.preco_venda_formatted ||
                it.preco_formatted ||
                null;
          let temPreco =
            precoRaw !== null && precoRaw !== undefined && precoRaw !== "";

          // Fallback: se não veio preço no payload, tentar buscar no banco pelo id (quando houver)
          if (!temPreco && it && (it.id || it.codigo)) {
            try {
              const lookupId = String(it.id || it.codigo);
              const prod = await Produto.findByPk(lookupId);
              if (prod && prod.preco !== undefined && prod.preco !== null) {
                precoRaw = prod.preco;
                temPreco = true;
                console.log(
                  `🔁 Preço obtido do DB para produto ${lookupId}:`,
                  precoRaw,
                );
              }
            } catch (dbErr) {
              console.warn(
                "⚠️ Falha ao buscar produto para fallback de preco:",
                dbErr && dbErr.message,
              );
            }
          }

          // preparar texto do preço (formatado) e medir sua altura para reservar espaço
          let precoText = null;
          let priceHeight = 0;
          if (modeloPedePreco && temPreco) {
            try {
              let precoNum = Number(
                String(precoRaw)
                  .replace(/[^0-9\-.,]/g, "")
                  .replace(",", "."),
              );
              if (!isNaN(precoNum) && isFinite(precoNum)) {
                precoText = new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(precoNum);
              } else {
                precoText = String(precoRaw);
              }
            } catch (e) {
              precoText = String(precoRaw);
            }
            try {
              doc.font("Helvetica-Bold").fontSize(9);
              priceHeight = doc.heightOfString(precoText, { width: imgW });
            } catch (e) {
              priceHeight = 0;
            }
          }

          // posicionamento base do topo do barcode, após o título e reservando espaço para o preço quando houver
          const spacingAfterTitle = 4;
          const priceGap = 2; // gap entre preço e barcode
          const barcodeTop =
            y +
            4 +
            tituloHeight +
            (priceHeight ? priceHeight + priceGap : spacingAfterTitle);

          // se há preço, desenhar centralizado imediatamente acima do barcode, usando a altura medida
          if (precoText) {
            try {
              const priceY = barcodeTop - priceHeight - priceGap;
              doc.font("Helvetica-Bold").fontSize(9).fillColor("#000");
              // posicionar o preço em relação à base central (para não se mover junto com o barcode)
              const priceX = baseCenterX + (priceOffsetPt || 0);
              doc.text(precoText, priceX, priceY, {
                width: imgW,
                align: "center",
              });
            } catch (e) {
              console.warn(
                "⚠️ Erro ao desenhar preço na etiqueta:",
                e && e.message,
              );
            }
          }

          // evitar duplicar o código visual no cabeçalho: verificar se o header já começa com o código
          const headerHasCode = String(linha || "")
            .trim()
            .startsWith(String(codigo).trim());

          if (bwip) {
            try {
              const png = await bwip.toBuffer({
                bcid: "code128",
                text: String(codigo),
                scale: 2,
                height: 14,
                includetext: false,
              });
              console.log(
                "🔢 Código de barras gerado (bytes):",
                png && png.length ? png.length : "indisponível",
              );
              // salvar PNG para diagnóstico local (pasta tmp) — será útil para inspecionar se o PNG foi gerado corretamente
              try {
                const tmpDir = path.join(__dirname, "../../tmp");
                if (!fs.existsSync(tmpDir))
                  fs.mkdirSync(tmpDir, { recursive: true });
                const outPath = path.join(
                  tmpDir,
                  `barcode-${String(codigo)}.png`,
                );
                fs.writeFileSync(outPath, png);
                console.log("📁 PNG do código de barras salvo em:", outPath);
              } catch (saveErr) {
                console.warn(
                  "⚠️ Não foi possível salvar PNG de diagnóstico:",
                  saveErr && saveErr.message,
                );
              }

              try {
                // tentar desenhar a imagem; usar fit para respeitar proporções
                doc.image(png, imgX, barcodeTop, {
                  fit: [imgW, imgH],
                  align: "center",
                });
              } catch (imgErr) {
                console.warn(
                  "⚠️ Erro ao renderizar imagem do código de barras no PDF:",
                  imgErr && imgErr.message,
                );
                // fallback: desenhar o número do código para garantir que algo apareça
                doc.fontSize(7).text(String(codigo), imgX, barcodeTop, {
                  width: imgW,
                  align: "center",
                });
              }
            } catch (barErr) {
              console.warn(
                "⚠️ bwip-js falhou ao gerar o código de barras:",
                barErr && barErr.message,
              );
              // fallback: desenhar o número do código por garantia
              doc.fontSize(7).text(String(codigo), imgX, barcodeTop, {
                width: imgW,
                align: "center",
              });
            }
          } else {
            // bwip não está instalado: não desenhar o código duplicado (já aparece no cabeçalho)
            // Logar instrução para o desenvolvedor instalar a dependência caso queira barras gráficas
            console.warn(
              "⚠️ bwip-js não encontrado. Para gerar códigos de barras gráficos execute: npm install bwip-js",
            );
            if (!headerHasCode)
              doc.fontSize(7).text(String(codigo), imgX, barcodeTop, {
                width: imgW,
                align: "center",
              });
          }

          idx++;
        }
        if (idx >= flat.length) break;
      }

      doc.end();
      return;
    }

    // Fallback: Simple layout (3 cols)
    const colsFallback = 3;
    const usableWidth = pageWidth - margin * 2;
    const labelWidth = Math.floor(usableWidth / colsFallback);
    const labelHeight = 72; // pt
    doc.font("Helvetica").fontSize(9).fillColor("#111");

    let x = margin;
    let y = margin + 10; // start a bit lower
    let colIndex = 0;

    flat.forEach((it, idx) => {
      if (
        colIndex === 0 &&
        idx !== 0 &&
        y + labelHeight > pageHeight - margin
      ) {
        doc.addPage();
        y = margin + 10;
      }

      x = margin + colIndex * labelWidth;

      // Draw label content
      const codigo =
        gerarPor && gerarPor.toLowerCase().indexOf("barras") !== -1
          ? it.codigoBarras || it.codigo || String(it.id || "")
          : it.id || it.codigo || "";
      const titulo = it.produto || it.nome || "Produto";

      // Conteúdo: "CÓDIGO - PRODUTO" em uma única linha (sem estoque)
      const codigoStr = codigo ? String(codigo).trim() : "";
      const produtoStr = titulo ? String(titulo).trim() : "";
      const linha = [codigoStr, produtoStr].filter(Boolean).join(" - ");
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#000")
        .text(linha, x + 4, y + 6, { width: labelWidth - 8, align: "left" });

      colIndex++;
      if (colIndex >= colsFallback) {
        colIndex = 0;
        y += labelHeight;
      }
    });

    doc.end();
  } catch (err) {
    console.error("❌ Erro gerando etiquetas PDF", err);
    try {
      res
        .status(500)
        .json({ error: "Erro gerando PDF", message: err && err.message });
    } catch (e) {}
  }
});

/**
 * POST /api/relatorios/produtos
 * Retorna dados para relatório de produtos
 */
router.post("/produtos", async (req, res) => {
  try {
    console.log("📊 Gerando dados do relatório de produtos");

    const dadosRelatorio = {
      periodo: "Catálogo de Produtos",
      produtos: [
        {
          codigo: "001",
          produto: "Ração Premium Adulto",
          categoria: "Alimentação",
          estoque: 45,
          preco_venda: 89.9,
        },
        {
          codigo: "002",
          produto: "Shampoo Antipulgas",
          categoria: "Higiene",
          estoque: 23,
          preco_venda: 35.0,
        },
        {
          codigo: "003",
          produto: "Brinquedo Mordedor",
          categoria: "Acessórios",
          estoque: 67,
          preco_venda: 25.9,
        },
      ],
    };

    res.json(dadosRelatorio);
  } catch (error) {
    console.error("❌ Erro ao gerar relatório de produtos:", error);
    res.status(500).json({
      error: "Erro ao gerar relatório",
      message: error.message,
    });
  }
});

/**
 * GET /api/relatorios/template/:tipo
 * Retorna o template do relatório
 */
router.get("/template/:tipo", (req, res) => {
  const { tipo } = req.params;
  const path = require("path");
  const templatePath = path.join(
    __dirname,
    "../../frontend/reports/templates",
    `${tipo}.mrt`,
  );

  res.sendFile(templatePath, (err) => {
    if (err) {
      console.error("❌ Erro ao enviar template:", err);
      res.status(404).json({ error: "Template não encontrado" });
    }
  });
});

// ============================================================
// RELATÓRIO DE COMISSÃO
// ============================================================

/**
 * POST /api/relatorios/comissao
 * Retorna dados para o relatório de comissão com filtros.
 */
router.post("/comissao", async (req, res) => {
  try {
    const {
      dataInicio,
      dataFim,
      tipoRelatorio,
      profissional,
      cliente,
      grupoCliente,
      produto,
      marca,
      numeroVenda,
    } = req.body || {};

    // ---- empresa_id obrigatório ----
    const empresaObj = await obterEmpresaDoRequest(req);
    const empresaId = empresaObj && empresaObj.id;
    console.log(
      `[comissao] empresa_id filtrado: ${empresaId} (${empresaObj ? empresaObj.nome || empresaObj.razaoSocial : "null"})`,
    );
    if (!empresaId) {
      return res.status(401).json({ error: "Empresa não identificada" });
    }

    // ---- montar filtro de datas ----
    const where = { empresa_id: empresaId };
    // Cria date no fuso LOCAL (não UTC), para evitar off-by-one de timezone
    const parseDataBR = (s) => {
      if (!s) return null;
      const p = s.split("/");
      if (p.length === 3)
        return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
      return new Date(s);
    };
    const inicio = parseDataBR(dataInicio);
    const fim = parseDataBR(dataFim);
    if (inicio && fim) {
      fim.setHours(23, 59, 59, 999);
      where.data = { [Op.between]: [inicio, fim] };
    }

    // ---- filtro por nº venda ----
    if (numeroVenda && String(numeroVenda).trim() !== "") {
      where.id = parseInt(numeroVenda, 10) || 0;
    }

    // Processar vendas em batches para evitar carga excessiva na memória
    const vendas = [];
    const batchSizeV = 1000;
    let offsetV = 0;
    while (true) {
      const batch = await Venda.findAll({
        where,
        raw: true,
        limit: batchSizeV,
        offset: offsetV,
      });
      if (!batch || batch.length === 0) break;
      // raw:true retorna campos JSON como string — fazer parse aqui
      batch.forEach((v) => {
        if (typeof v.itens === "string") {
          try {
            v.itens = JSON.parse(v.itens);
          } catch {
            v.itens = [];
          }
        }
        if (!Array.isArray(v.itens)) v.itens = [];
        if (typeof v.totais === "string") {
          try {
            v.totais = JSON.parse(v.totais);
          } catch {
            v.totais = {};
          }
        }
      });
      vendas.push(...batch);
      offsetV += batch.length;
      if (batch.length < batchSizeV) break;
    }

    // ---- buscar comissões cadastradas no banco ----
    const { Comissao, Cliente, Produto, Profissional } = require("../models");
    const todasComissoes = await Comissao.findAll({
      where: { empresa_id: empresaId },
    });
    const mapaComissao = {};
    // mapa rápido: "perfilProduto||perfilVendedor" → percentual
    const mapaComissaoPorPerfil = {};
    todasComissoes.forEach((c) => {
      const k = `${(c.perfilProduto || "").toLowerCase()}||${(c.perfilVendedor || "").toLowerCase()}`;
      mapaComissao[k] = parseFloat(c.percentual) || 0;
      // também indexa por perfilProduto → lista de {perfilVendedor, percentual}
      const pKey = (c.perfilProduto || "").toLowerCase();
      if (!mapaComissaoPorPerfil[pKey]) mapaComissaoPorPerfil[pKey] = [];
      mapaComissaoPorPerfil[pKey].push({
        perfilVendedor: c.perfilVendedor || "",
        percentual: parseFloat(c.percentual) || 0,
      });
    });

    // Lista de perfilVendedor conhecidos (ordenado pelo mais longo, para melhor match)
    const todosPerfilVendedor = [
      ...new Set(
        todasComissoes
          .map((c) => (c.perfilVendedor || "").trim())
          .filter(Boolean),
      ),
    ].sort((a, b) => b.length - a.length);

    // Resolve o perfilVendedor a partir do nome completo do profissional.
    // Ex: "Julio Silva Andrade" → "Julio" (se "Julio" existe em comissoes.perfilVendedor)
    function resolverPerfilVendedor(nomeProfissional) {
      if (!nomeProfissional) return "";
      const nML = nomeProfissional.toLowerCase().trim();
      // 1. Match exato
      const exato = todosPerfilVendedor.find((pv) => pv.toLowerCase() === nML);
      if (exato) return exato.toLowerCase();
      // 2. Nome do profissional começa com perfilVendedor (ex: "Julio Silva" começa com "Julio")
      const parcial = todosPerfilVendedor.find((pv) =>
        nML.startsWith(pv.toLowerCase() + " "),
      );
      if (parcial) return parcial.toLowerCase();
      // 3. PerfilVendedor está contido no nome do profissional
      const contido = todosPerfilVendedor.find((pv) =>
        nML.includes(pv.toLowerCase()),
      );
      if (contido) return contido.toLowerCase();
      return nML; // fallback sem match
    }

    // ---- pré-carregar perfilComissao e tipo de todos os produtos ----
    const todosProdutos = await Produto.findAll({
      where: { empresa_id: empresaId },
      attributes: ["id", "nome", "perfilComissao", "tipo"],
    }).catch(() => []);
    const mapaProdutoPerfilComissao = {};
    const mapaProdutoNomePerfilComissao = {};
    const mapaProdutoTipo = {}; // id → tipo
    const mapaProdutoNomeTipo = {}; // nome → tipo
    // Normaliza string: minúsculas + remove acentos + trim
    const normStr = (s) =>
      (s || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    todosProdutos.forEach((p) => {
      if (p.perfilComissao) {
        mapaProdutoPerfilComissao[String(p.id)] = p.perfilComissao;
        mapaProdutoNomePerfilComissao[(p.nome || "").trim().toLowerCase()] =
          p.perfilComissao;
      }
      // Usar string vazia para tipo null/undefined — não assumir "produto"
      const tipoNorm = p.tipo ? p.tipo.toLowerCase() : "";
      mapaProdutoTipo[String(p.id)] = tipoNorm;
      // Indexar tanto pelo nome exato (lowercase) quanto pelo nome normalizado (sem acento)
      mapaProdutoNomeTipo[(p.nome || "").trim().toLowerCase()] = tipoNorm;
      mapaProdutoNomeTipo[normStr(p.nome)] = tipoNorm;
    });

    // ---- pré-carregar profissionais para fallback por ID ----
    const todosProfissionais = await Profissional.findAll({
      where: { empresa_id: empresaId },
      attributes: ["id", "nome"],
    }).catch(() => []);
    const mapaProfissionalId = {};
    todosProfissionais.forEach((p) => {
      mapaProfissionalId[p.id] = p.nome;
    });

    // ---- buscar clientes para saber grupoCliente ----
    const todosClientes = await Cliente.findAll({
      where: { empresa_id: empresaId },
      attributes: ["id", "nome", "grupo_cliente"],
    }).catch(() => []);
    const mapaCliente = {};
    todosClientes.forEach((c) => {
      mapaCliente[c.id] = c;
    });

    // ---- processar vendas ----
    const linhas = [];

    for (const venda of vendas) {
      // Usar nome do profissional ou fazer fallback por profissionalId
      const nomeProfissional = (
        (venda.profissional || "").trim() ||
        (venda.profissionalId
          ? mapaProfissionalId[venda.profissionalId] || ""
          : "")
      ).trim();
      const nomeCliente = (venda.cliente || "").trim();

      // obs: filtro de profissional é aplicado por item/entrada (abaixo)
      // para que vendas sem profissional ainda gerem linhas por grupo

      // filtro cliente
      if (cliente && cliente !== "" && cliente !== "Todos") {
        if (nomeCliente.toLowerCase() !== cliente.toLowerCase()) continue;
      }

      // filtro grupo cliente
      if (grupoCliente && grupoCliente !== "" && grupoCliente !== "Todos") {
        const cliObj = venda.clienteId ? mapaCliente[venda.clienteId] : null;
        const grupoDoCliente = cliObj ? cliObj.grupo_cliente || "" : "";
        if (grupoDoCliente.toLowerCase() !== grupoCliente.toLowerCase())
          continue;
      }

      const itens = Array.isArray(venda.itens) ? venda.itens : [];

      for (const item of itens) {
        const prod = item.produto || {};
        const nomeItem = prod.nome || item.descricao || item.nome || "";
        const marcaItem = (prod.marca || item.marca || "").trim();

        // ---- filtro por tipo de relatório ----
        // Descobrir o tipo do item (produto ou servico)
        const prodId = String(prod.id || item.produtoId || "");
        const tipoItem = (
          prod.tipo ||
          item.tipo ||
          (prodId ? mapaProdutoTipo[prodId] || "" : "") ||
          (nomeItem
            ? mapaProdutoNomeTipo[nomeItem.trim().toLowerCase()] || ""
            : "") ||
          (nomeItem ? mapaProdutoNomeTipo[normStr(nomeItem)] || "" : "") ||
          ""
        ).toLowerCase();

        const tipoRel = (tipoRelatorio || "").toLowerCase().trim();
        if (tipoRel === "vendas") {
          // Excluir apenas itens definitivamente serviço ou plano
          if (tipoItem === "servico" || tipoItem === "plano") continue;
        } else if (
          tipoRel === "serviços" ||
          tipoRel === "servicos" ||
          tipoRel === "serviço" ||
          tipoRel === "servico"
        ) {
          // Apenas serviços (tipo === 'servico')
          if (tipoItem !== "servico") continue;
        }
        // 'faturamento' ou sem filtro: todos os itens passam; ordenação feita depois

        // perfilComissao: tentar do JSON primeiro, senão buscar da tabela pelo id do produto, depois pelo nome
        const perfilComissaoItem = (
          prod.perfilComissao ||
          item.perfilComissao ||
          (prodId ? mapaProdutoPerfilComissao[prodId] || "" : "") ||
          (nomeItem
            ? mapaProdutoNomePerfilComissao[nomeItem.trim().toLowerCase()] || ""
            : "")
        ).trim();

        // filtro produto
        if (produto && produto.trim() !== "") {
          if (!nomeItem.toLowerCase().includes(produto.toLowerCase())) continue;
        }

        // filtro marca
        if (marca && marca !== "" && marca !== "Todos") {
          if (marcaItem.toLowerCase() !== marca.toLowerCase()) continue;
        }

        const totalItem =
          parseFloat(item.totalFinal || item.total || item.valorUnitario || 0) *
          (item.quantidade || 1);

        // Determinar quais profissionais recebem comissão por este item
        // Se a venda tem profissional definido → apenas ele
        // Se não tem → todos os profissionais do grupo de comissão do produto
        let entradas = [];
        if (perfilComissaoItem) {
          const pKey = perfilComissaoItem.toLowerCase();
          if (nomeProfissional) {
            // profissional definido na venda
            // resolver o perfilVendedor a partir do nome completo (ex: "Julio Silva Andrade" → "Julio")
            const perfilVend = resolverPerfilVendedor(nomeProfissional);
            const kLookup = `${pKey}||${perfilVend}`;
            const pct = mapaComissao[kLookup] || 0;
            entradas.push({
              profissionalNome: nomeProfissional,
              percentualComissao: pct,
            });
          } else {
            // sem profissional: gerar linha para todos do grupo
            const grupo = mapaComissaoPorPerfil[pKey] || [];
            grupo.forEach((g) => {
              entradas.push({
                profissionalNome: g.perfilVendedor,
                percentualComissao: g.percentual,
              });
            });
          }
        } else {
          // produto sem perfil de comissão: só gera linha se houver profissional identificado
          if (nomeProfissional) {
            entradas.push({
              profissionalNome: nomeProfissional,
              percentualComissao: 0,
            });
          }
        }

        // filtro profissional (aplicado nas entradas)
        if (profissional && profissional !== "" && profissional !== "Todos") {
          entradas = entradas.filter(
            (e) =>
              e.profissionalNome.toLowerCase() === profissional.toLowerCase(),
          );
        }

        for (const entrada of entradas) {
          const valorComissao = parseFloat(
            ((totalItem * entrada.percentualComissao) / 100).toFixed(2),
          );
          linhas.push({
            vendaId: venda.id,
            data: venda.data,
            profissional: entrada.profissionalNome,
            cliente: nomeCliente,
            produto: nomeItem,
            tipoProduto: tipoItem,
            marca: marcaItem,
            perfilComissao: perfilComissaoItem,
            quantidade: item.quantidade || 1,
            valorUnitario: parseFloat(item.valorUnitario || 0),
            totalVenda: parseFloat(totalItem.toFixed(2)),
            percentualComissao: entrada.percentualComissao,
            valorComissao,
          });
        }
      }
    }

    // ---- totais ----
    // Agregar linhas: mesmo profissional + produto + percentual → somar qtd/valores
    const mapaAgregado = new Map();
    for (const l of linhas) {
      const chave = `${(l.profissional || "").toLowerCase()}||${(l.produto || "").toLowerCase()}||${l.percentualComissao}`;
      if (mapaAgregado.has(chave)) {
        const existente = mapaAgregado.get(chave);
        existente.quantidade += l.quantidade;
        existente.totalVenda += l.totalVenda;
        existente.valorComissao += l.valorComissao;
        existente.vendaIds.push(l.vendaId);
      } else {
        mapaAgregado.set(chave, {
          ...l,
          vendaIds: [l.vendaId],
        });
      }
    }
    // Recalcular valores arredondados e montar array final
    const linhasAgregadas = [];
    for (const item of mapaAgregado.values()) {
      item.totalVenda = parseFloat(item.totalVenda.toFixed(2));
      item.valorComissao = parseFloat(item.valorComissao.toFixed(2));
      // vendaId: primeiro da lista (para referência)
      item.vendaId = item.vendaIds[0];
      delete item.vendaIds;
      linhasAgregadas.push(item);
    }

    const totalVendas = linhasAgregadas.reduce((s, l) => s + l.totalVenda, 0);
    const totalComissoes = linhasAgregadas.reduce(
      (s, l) => s + l.valorComissao,
      0,
    );

    // ---- ordenação por faturamento (profissional que mais faturou primeiro) ----
    const tipoRelLower = (tipoRelatorio || "").toLowerCase().trim();
    if (tipoRelLower === "faturamento") {
      // Calcular faturamento total por profissional
      const faturamentoPorProf = {};
      linhasAgregadas.forEach((l) => {
        const k = l.profissional || "";
        faturamentoPorProf[k] = (faturamentoPorProf[k] || 0) + l.totalVenda;
      });
      // Ordenar: primeiro por profissional (do maior faturamento para o menor), depois manter ordem interna
      linhasAgregadas.sort((a, b) => {
        const fa = faturamentoPorProf[a.profissional || ""] || 0;
        const fb = faturamentoPorProf[b.profissional || ""] || 0;
        if (fb !== fa) return fb - fa; // maior faturamento primeiro
        return (a.profissional || "").localeCompare(b.profissional || "");
      });
    }

    res.json({
      linhas: linhasAgregadas,
      totais: {
        totalVendas: parseFloat(totalVendas.toFixed(2)),
        totalComissoes: parseFloat(totalComissoes.toFixed(2)),
        qtdLinhas: linhasAgregadas.length,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao gerar relatório de comissão:", error);
    res.status(500).json({
      error: "Erro ao gerar relatório de comissão",
      message: error.message,
    });
  }
});

/**
 * POST /api/relatorios/comissao/pdf
 * Gera PDF do relatório de comissão agrupado por profissional
 */
router.post("/comissao/pdf", async (req, res) => {
  try {
    const { linhas = [], totais = {}, filtros = {} } = req.body || {};

    let PDFDocument;
    try {
      PDFDocument = require("pdfkit");
    } catch (e) {
      return res.status(500).json({
        error: "pdfkit não instalado",
        message: "Execute npm install pdfkit",
      });
    }

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="relatorio_comissao.pdf"',
    );
    doc.pipe(res);

    // ---- logo e empresa ----
    let logoPath = null;
    let nomeEmpresa = "";
    try {
      const dadosEmp = await obterDadosEmpresaPDF(req);
      logoPath = dadosEmp.logoPath;
      nomeEmpresa = dadosEmp.nomeEmpresa;
    } catch (e) {
      console.warn(
        "⚠️ Erro ao buscar empresa para relatório de comissão:",
        e && e.message,
      );
    }

    const pageW = 595;
    const left = 40;
    const right = 555;
    const usableW = right - left;

    // ---- cabeçalho da primeira página ----
    const desenharCabecalho = () => {
      if (logoPath) {
        doc.image(logoPath, pageW / 2 - 40, 20, { width: 80 });
      }
      doc.y = logoPath ? 110 : 40;
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor("#000")
        .text("RELATÓRIO DE COMISSÃO", left, doc.y, {
          align: "center",
          width: usableW,
        });
      if (nomeEmpresa) {
        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor("#444")
          .text(nomeEmpresa.toUpperCase(), left, doc.y + 2, {
            align: "center",
            width: usableW,
          });
      }
      if (filtros.dataInicio || filtros.dataFim) {
        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor("#444")
          .text(
            `Período: ${filtros.dataInicio || ""} a ${filtros.dataFim || ""}`,
            left,
            doc.y + 2,
            { align: "center", width: usableW },
          );
      }
      if (
        filtros.profissional &&
        filtros.profissional !== "" &&
        filtros.profissional !== "Todos"
      ) {
        doc
          .fontSize(9)
          .font("Helvetica-Bold")
          .fillColor("#444")
          .text(`Profissional: ${filtros.profissional}`, left, doc.y + 2, {
            align: "center",
            width: usableW,
          });
      }
      doc.moveDown(0.8);
      // linha divisória
      doc
        .moveTo(left, doc.y)
        .lineTo(right, doc.y)
        .strokeColor("#cccccc")
        .lineWidth(0.5)
        .stroke();
      doc.moveDown(0.5);
    };

    desenharCabecalho();

    // ---- agrupar linhas por profissional ----
    const grupos = {};
    const ordem = [];
    for (const l of linhas) {
      const prof = (l.profissional || "").trim();
      if (!prof) continue; // ignorar linhas sem profissional
      if (!grupos[prof]) {
        grupos[prof] = [];
        ordem.push(prof);
      }
      grupos[prof].push(l);
    }

    // colunas: nAtend | dataReceb | produto | qtdFat | vlrFat | pctComissao | vlrComissao
    const COL = {
      nAtend: 0,
      dataReceb: 55,
      produto: 125,
      qtd: 330,
      vlr: 375,
      pct: 420,
      comissao: 465,
    };
    const ROW_H = 14; // linha de item
    const SUB_H = 12; // sublinha Cliente/Pet

    const drawTabelaCabecalho = (yy) => {
      doc.rect(left, yy, usableW, 16).fill("#e8ebf5");
      doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#222");
      doc.text("Nº Atend.", left + COL.nAtend, yy + 4, { width: 55 });
      doc.text("Data Receb.", left + COL.dataReceb, yy + 4, { width: 70 });
      doc.text("Produto", left + COL.produto, yy + 4, { width: 205 });
      doc.text("Qtd.", left + COL.qtd, yy + 4, { width: 45, align: "right" });
      doc.text("Vlr. Fat.", left + COL.vlr, yy + 4, {
        width: 45,
        align: "right",
      });
      doc.text("% Com.", left + COL.pct, yy + 4, { width: 45, align: "right" });
      doc.text("Vlr. Com.", left + COL.comissao, yy + 4, {
        width: 50,
        align: "right",
      });
      return yy + 16;
    };

    const checkPage = (y, needed) => {
      if (y + needed > 800) {
        doc.addPage();
        return 40;
      }
      return y;
    };

    let profIdx = 0;

    for (const prof of ordem) {
      const itensProf = grupos[prof];
      let y = doc.y;

      y = checkPage(y, 40);
      doc.y = y;

      // ---- banner do profissional ----
      doc.rect(left, y, usableW, 18).fill("#2c3e6b");
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#ffffff")
        .text(`${profIdx + 1} - ${prof}`, left + 6, y + 5, {
          width: usableW - 12,
        });
      y += 22;

      // subtítulo
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#333")
        .text("Relação de Atendimentos:", left, y);
      y += 14;

      // cabeçalho da tabela
      y = drawTabelaCabecalho(y);

      // ---- linhas do profissional ----
      let totalAtend = itensProf.length;
      let totalVlrFat = 0;
      let totalComissao = 0;
      let rowIdx = 0;

      for (const l of itensProf) {
        y = checkPage(y, ROW_H + SUB_H + 2);

        const bg = rowIdx % 2 === 0 ? "#ffffff" : "#f4f6fb";
        doc.rect(left, y, usableW, ROW_H).fill(bg);

        const dataFmt = l.data
          ? new Date(l.data).toLocaleDateString("pt-BR")
          : "";
        const vlrFat = Number(l.totalVenda || 0);
        const pct = Number(l.percentualComissao || 0);
        const vlrCom = Number(l.valorComissao || 0);

        doc.fontSize(7.5).font("Helvetica").fillColor("#222");
        doc.text(String(l.vendaId || ""), left + COL.nAtend, y + 3, {
          width: 55,
        });
        doc.text(dataFmt, left + COL.dataReceb, y + 3, { width: 70 });
        doc.text(
          (l.produto || "").substring(0, 34),
          left + COL.produto,
          y + 3,
          { width: 205 },
        );
        doc.text(String(l.quantidade || 1), left + COL.qtd, y + 3, {
          width: 45,
          align: "right",
        });
        doc.text(
          `R$ ${vlrFat.toFixed(2).replace(".", ",")}`,
          left + COL.vlr,
          y + 3,
          {
            width: 45,
            align: "right",
          },
        );
        doc.text(`${pct.toFixed(2)} %`, left + COL.pct, y + 3, {
          width: 45,
          align: "right",
        });
        doc.text(
          `R$ ${vlrCom.toFixed(2).replace(".", ",")}`,
          left + COL.comissao,
          y + 3,
          {
            width: 50,
            align: "right",
          },
        );
        y += ROW_H;

        // sublinha: cliente e pet (se disponíveis)
        const hasCliente = l.cliente && l.cliente.trim();
        const hasPet = l.pet && l.pet.trim();
        if (hasCliente || hasPet) {
          doc.rect(left, y, usableW, SUB_H).fill(bg);
          let subText = "";
          if (hasCliente) subText += `Cliente: ${l.cliente}`;
          if (hasPet) subText += (subText ? "    " : "") + `Pet: ${l.pet}`;
          doc
            .fontSize(6.5)
            .font("Helvetica")
            .fillColor("#555")
            .text(subText, left + COL.produto, y + 2, { width: 350 });
          y += SUB_H;
        }

        totalVlrFat += vlrFat;
        totalComissao += vlrCom;
        rowIdx++;
      }

      // ---- rodapé do profissional ----
      y += 4;
      doc
        .moveTo(left, y)
        .lineTo(right, y)
        .strokeColor("#b0b8d0")
        .lineWidth(0.5)
        .stroke();
      y += 6;

      const rodapeX = right - 220;
      doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#222");
      doc.text("Total de Atendimentos:", rodapeX, y, {
        width: 160,
        align: "right",
      });
      doc
        .fontSize(8.5)
        .font("Helvetica")
        .fillColor("#000")
        .text(totalAtend.toString(), rodapeX + 165, y, {
          width: 55,
          align: "right",
        });
      y += 13;

      doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#222");
      doc.text("Total da Comissão:", rodapeX, y, {
        width: 160,
        align: "right",
      });
      doc
        .fontSize(8.5)
        .font("Helvetica")
        .fillColor("#000")
        .text(
          `R$ ${totalComissao.toFixed(2).replace(".", ",")}`,
          rodapeX + 165,
          y,
          {
            width: 55,
            align: "right",
          },
        );
      y += 13;

      doc
        .moveTo(rodapeX, y)
        .lineTo(right, y)
        .strokeColor("#2c3e6b")
        .lineWidth(0.5)
        .stroke();
      y += 5;

      doc.fontSize(9).font("Helvetica-Bold").fillColor("#2c3e6b");
      doc.text(`Total geral da Comissão de ${prof}:`, rodapeX, y, {
        width: 160,
        align: "right",
      });
      doc.text(
        `R$ ${totalComissao.toFixed(2).replace(".", ",")}`,
        rodapeX + 165,
        y,
        {
          width: 55,
          align: "right",
        },
      );
      y += 20;

      doc.y = y;
      profIdx++;

      // espaço entre profissionais
      if (profIdx < ordem.length) {
        doc.y = checkPage(doc.y + 10, 60);
      }
    }

    doc.end();
  } catch (error) {
    console.error("❌ Erro ao gerar PDF de comissão:", error);
    res
      .status(500)
      .json({ error: "Erro ao gerar PDF", message: error.message });
  }
});

/**
 * POST /api/relatorios/comissao/recalcular
 * Percorre todas as vendas no período informado e atualiza o campo
 * perfilComissao em cada item do JSON venda.itens com base na
 * configuração atual do produto no banco.
 * Também corrige venda.profissional quando está vazio mas profissionalId
 * está preenchido.
 */
router.post("/comissao/recalcular", async (req, res) => {
  try {
    const { inicio, fim } = req.body || {};
    if (!inicio || !fim) {
      return res
        .status(400)
        .json({ error: "Informe inicio e fim (YYYY-MM-DD)" });
    }

    // ---- empresa_id obrigatório ----
    const empresaObj = await obterEmpresaDoRequest(req);
    const empresaId = empresaObj && empresaObj.id;
    if (!empresaId) {
      return res.status(401).json({ error: "Empresa não identificada" });
    }

    const { Comissao, Produto, Profissional } = require("../models");

    // --- monta filtro de datas ---
    const dataInicio = new Date(inicio);
    dataInicio.setHours(0, 0, 0, 0);
    const dataFim = new Date(fim);
    dataFim.setHours(23, 59, 59, 999);

    // --- pré-carrega produtos: id -> { perfilComissao, nome } ---
    const todosProdutos = await Produto.findAll({
      where: { empresa_id: empresaId },
      attributes: ["id", "nome", "perfilComissao"],
    }).catch(() => []);
    const mapaProdutoById = {};
    const mapaProdutoByNome = {};
    todosProdutos.forEach((p) => {
      mapaProdutoById[String(p.id)] = p;
      if (p.nome) mapaProdutoByNome[p.nome.toLowerCase().trim()] = p;
    });

    // --- pré-carrega profissionais: id -> nome ---
    const todosProfissionais = await Profissional.findAll({
      where: { empresa_id: empresaId },
      attributes: ["id", "nome"],
    }).catch(() => []);
    const mapaProfissionalId = {};
    todosProfissionais.forEach((p) => {
      mapaProfissionalId[p.id] = p.nome;
    });

    // --- busca e processa vendas no período em batches para evitar findAll massivo ---
    const batchSize = 500;
    let offset = 0;
    let vendasAtualizadas = 0;
    let itensAtualizados = 0;
    let vendasAnalisadas = 0;

    while (true) {
      const vendasBatch = await Venda.findAll({
        where: {
          empresa_id: empresaId,
          data: { [Op.between]: [dataInicio, dataFim] },
        },
        order: [["id", "ASC"]],
        limit: batchSize,
        offset,
      });
      if (!vendasBatch || vendasBatch.length === 0) break;

      for (const venda of vendasBatch) {
        vendasAnalisadas++;
        let alterado = false;
        const itens = Array.isArray(venda.itens) ? [...venda.itens] : [];

        // Corrigir profissional vazio
        const profissionalAtual = (venda.profissional || "").trim();
        if (!profissionalAtual && venda.profissionalId) {
          const nomeProfissional = mapaProfissionalId[venda.profissionalId];
          if (nomeProfissional) {
            venda.profissional = nomeProfissional;
            alterado = true;
          }
        }

        // Atualizar perfilComissao em cada item
        const itensAtualizadosArr = itens.map((item) => {
          const prod = item.produto || {};
          const prodId = String(prod.id || item.produtoId || "");
          const prodNome = (prod.nome || item.descricao || item.nome || "")
            .toLowerCase()
            .trim();

          // já tem perfilComissao? pular
          const perfilAtual = (
            prod.perfilComissao ||
            item.perfilComissao ||
            ""
          ).trim();
          if (perfilAtual) return item;

          // buscar produto: primeiro por id, depois por nome
          let produtoDB = prodId ? mapaProdutoById[prodId] : null;
          if (!produtoDB && prodNome) produtoDB = mapaProdutoByNome[prodNome];

          if (!produtoDB || !produtoDB.perfilComissao) return item;

          // stampar perfilComissao no item
          itensAtualizados++;
          alterado = true;
          return {
            ...item,
            produto: { ...prod, perfilComissao: produtoDB.perfilComissao },
            perfilComissao: produtoDB.perfilComissao,
          };
        });

        if (alterado) {
          await venda.update({ itens: itensAtualizadosArr });
          vendasAtualizadas++;
        }
      }

      offset += vendasBatch.length;
      if (vendasBatch.length < batchSize) break;
    }

    res.json({
      ok: true,
      vendasAnalisadas,
      vendasAtualizadas,
      itensAtualizados,
      mensagem: `${itensAtualizados} item(ns) atualizado(s) em ${vendasAtualizadas} venda(s).`,
    });
  } catch (error) {
    console.error("❌ Erro ao recalcular comissões:", error);
    res
      .status(500)
      .json({ error: "Erro ao recalcular comissões", message: error.message });
  }
});

// ========================================
// RELATÓRIO DE ATENDIMENTO NO PERÍODO (PDF)
// ========================================

router.post("/atendimento-periodo/pdf", async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.body || {};
    if (!dataInicio || !dataFim) {
      return res.status(400).json({ message: "Informe dataInicio e dataFim" });
    }

    // Parse dd/mm/yyyy
    const [dI, mI, yI] = dataInicio.split("/");
    const [dF, mF, yF] = dataFim.split("/");
    const dtInicio = new Date(+yI, +mI - 1, +dI);
    const dtFim = new Date(+yF, +mF - 1, +dF);
    dtFim.setHours(23, 59, 59, 999);

    // Empresa do usuário
    const empData = await obterDadosEmpresaPDF(req);
    const empresaId = empData.empresa?.id;
    if (!empresaId) {
      return res.status(401).json({ message: "Empresa não identificada" });
    }

    // Buscar agendamentos concluídos no período
    const agendamentos = await Agendamento.findAll({
      where: {
        status: "concluido",
        empresa_id: empresaId,
        dataAgendamento: { [Op.between]: [dtInicio, dtFim] },
      },
      include: [
        {
          model: Pet,
          as: "pet",
          attributes: ["id", "nome"],
          include: [
            {
              model: Cliente,
              as: "cliente",
              attributes: ["id", "nome"],
            },
          ],
        },
      ],
      order: [
        ["dataAgendamento", "ASC"],
        ["horario", "ASC"],
      ],
    });

    if (!agendamentos.length) {
      return res.status(404).json({
        message: "Nenhum atendimento concluído encontrado no período.",
      });
    }

    // Agrupar por profissional
    const grupos = {};
    for (const ag of agendamentos) {
      const prof = ag.profissional || "Sem profissional";
      if (!grupos[prof]) grupos[prof] = [];

      let servicos = ag.servico || "";
      if (ag.servicos) {
        try {
          const arr =
            typeof ag.servicos === "string"
              ? JSON.parse(ag.servicos)
              : ag.servicos;
          if (Array.isArray(arr) && arr.length) {
            servicos = arr
              .map((s) =>
                typeof s === "object" ? s.nome || s.servico || "" : s,
              )
              .filter(Boolean)
              .join(", ");
          }
        } catch (_) {}
      }

      grupos[prof].push({
        data: ag.dataAgendamento,
        horario: ag.horario || "",
        pet: ag.pet?.nome || "-",
        tutor: ag.pet?.cliente?.nome || "-",
        servico: servicos || "-",
        valor: parseFloat(ag.valor) || 0,
      });
    }

    // Gerar PDF
    let PDFDocument;
    try {
      PDFDocument = require("pdfkit");
    } catch (e) {
      return res.status(500).json({ message: "pdfkit não instalado" });
    }

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="relatorio-atendimento.pdf"',
    );
    doc.pipe(res);

    const pageW = doc.page.width - 80;

    // --- CABEÇALHO ---
    const drawHeader = () => {
      if (empData.logoPath) {
        try {
          doc.image(empData.logoPath, doc.page.width / 2 - 30, 30, {
            width: 60,
          });
          doc.moveDown(4);
        } catch (_) {
          doc.moveDown(1);
        }
      }
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .fillColor("#2c3e6b")
        .text("Relatório de Atendimento no Período", { align: "center" });
      doc.moveDown(0.3);
      doc
        .fontSize(11)
        .font("Helvetica")
        .fillColor("#555")
        .text(empData.nomeEmpresa || "", { align: "center" });
      doc.moveDown(0.2);
      doc
        .fontSize(10)
        .fillColor("#777")
        .text(`Período: ${dataInicio} a ${dataFim}`, { align: "center" });
      doc.moveDown(1);
    };

    drawHeader();

    // Colunas: Data | Horário | Pet | Tutor | Serviço | Valor
    const cols = [
      { label: "Data", width: 60 },
      { label: "Horário", width: 50 },
      { label: "Pet", width: 80 },
      { label: "Tutor", width: 100 },
      { label: "Serviço", width: pageW - 60 - 50 - 80 - 100 - 60 },
      { label: "Valor", width: 60 },
    ];

    const drawTableHeader = (x0, y0) => {
      doc.rect(x0, y0, pageW, 20).fill("#2c3e6b");
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#fff");
      let cx = x0 + 4;
      for (const col of cols) {
        doc.text(col.label, cx, y0 + 5, {
          width: col.width - 8,
          align: col.label === "Valor" ? "right" : "left",
        });
        cx += col.width;
      }
      return y0 + 20;
    };

    const drawRow = (item, x0, y0, zebra) => {
      if (zebra) doc.rect(x0, y0, pageW, 18).fill("#f4f6f9");
      doc.font("Helvetica").fontSize(8).fillColor("#333");
      let cx = x0 + 4;
      const dataStr = item.data
        ? new Date(item.data).toLocaleDateString("pt-BR")
        : "-";
      const valStr =
        item.valor > 0 ? "R$ " + item.valor.toFixed(2).replace(".", ",") : "-";
      const values = [
        dataStr,
        item.horario || "-",
        item.pet,
        item.tutor,
        item.servico,
        valStr,
      ];
      for (let i = 0; i < cols.length; i++) {
        doc.text(values[i], cx, y0 + 4, {
          width: cols[i].width - 8,
          align: cols[i].label === "Valor" ? "right" : "left",
          lineBreak: false,
        });
        cx += cols[i].width;
      }
      return y0 + 18;
    };

    let totalGeral = 0;
    let totalAtendimentos = 0;
    const profissionais = Object.keys(grupos).sort();

    for (const prof of profissionais) {
      const items = grupos[prof];
      let subtotal = 0;

      // Checar espaço
      if (doc.y > doc.page.height - 150) {
        doc.addPage();
        drawHeader();
      }

      // Banner profissional
      doc.rect(40, doc.y, pageW, 22).fill("#3b5998");
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#fff")
        .text(prof, 48, doc.y + 5);
      doc.y += 26;

      let y = drawTableHeader(40, doc.y);
      let rowIdx = 0;

      for (const item of items) {
        if (y > doc.page.height - 80) {
          doc.addPage();
          drawHeader();
          y = drawTableHeader(40, doc.y);
          rowIdx = 0;
        }
        y = drawRow(item, 40, y, rowIdx % 2 === 0);
        subtotal += item.valor;
        rowIdx++;
      }

      // Rodapé do profissional
      doc.rect(40, y, pageW, 20).fill("#e8edf3");
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#2c3e6b");
      doc.text(`${items.length} atendimento(s)`, 48, y + 5, {
        width: pageW / 2,
      });
      doc.text(
        `Subtotal: R$ ${subtotal.toFixed(2).replace(".", ",")}`,
        48,
        y + 5,
        { width: pageW - 12, align: "right" },
      );
      doc.y = y + 28;

      totalGeral += subtotal;
      totalAtendimentos += items.length;
    }

    // Rodapé geral
    doc.moveDown(0.5);
    doc.rect(40, doc.y, pageW, 24).fill("#2c3e6b");
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#fff");
    doc.text(`Total: ${totalAtendimentos} atendimento(s)`, 48, doc.y + 6, {
      width: pageW / 2,
    });
    doc.text(`R$ ${totalGeral.toFixed(2).replace(".", ",")}`, 48, doc.y + 6, {
      width: pageW - 12,
      align: "right",
    });

    doc.end();
  } catch (error) {
    console.error("Erro ao gerar PDF de atendimento:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message });
    }
  }
});

module.exports = router;

/**
 * GET /api/relatorios/produtos/pdf
 * Gera um PDF com o catálogo de produtos e retorna como application/pdf
 */
router.get("/produtos/pdf", async (req, res) => {
  try {
    console.log("📄 Gerando PDF de produtos");

    // Buscar empresa do usuário logado
    let empresa = null;
    try {
      empresa = await obterEmpresaDoRequest(req);
    } catch (e) {
      console.warn("⚠️ Erro ao buscar empresa ativa:", e && e.message);
    }

    // Aqui você deveria buscar os produtos do banco ou do storage
    // Usarei o mesmo fallback de produtos definido acima (produtosExemplo-like)
    const produtos = [
      {
        codigo: "001",
        descricao: "Ração Premium Adulto",
        unidade: "UN",
        marca: "Golden",
        grupo: "Rações",
        subgrupo: "Adulto",
        preco_custo: 40.04,
        preco_venda: 131.0,
        estoque_minimo: 0,
        local: "Loja",
      },
      {
        codigo: "002",
        descricao: "BUTOX P CE 25 - 20ML",
        unidade: "UN",
        marca: "Credeli",
        grupo: "Farmácia",
        subgrupo: "Medicamentos",
        preco_custo: 4.31,
        preco_venda: 7.0,
        estoque_minimo: 0,
        local: "Loja",
      },
      {
        codigo: "003",
        descricao: "Banho e Tosa - Cães Pequeno Porte",
        unidade: "UN",
        marca: "",
        grupo: "Serviços",
        subgrupo: "Banho/Tosa",
        preco_custo: 0.0,
        preco_venda: 50.0,
        estoque_minimo: 0,
        local: "Loja",
      },
    ];

    // carregar pdfkit dinamicamente (se não estiver instalado, retornar erro claro)
    let PDFDocument;
    try {
      PDFDocument = require("pdfkit");
    } catch (errRequire) {
      console.error(
        "❌ pdfkit não está instalado:",
        errRequire && errRequire.message,
      );
      res.status(500).json({
        error: "Dependência ausente: pdfkit",
        message:
          "Execute `npm install pdfkit` na raiz do projeto e reinicie o servidor.",
      });
      return;
    }

    // criar documento em memória
    const doc = new PDFDocument({ size: "A4", margin: 40 });

    // preparar headers da resposta
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="relatorio_produtos.pdf"',
    );

    // pipe direto para response
    doc.pipe(res);

    // Cabeçalho com logo da empresa
    let logoPath = path.join(
      __dirname,
      "../../frontend/fivecon/Design sem nome (17).png",
    ); // logo padrão

    // Se empresa tem logo, usar a logo da empresa
    if (empresa && empresa.logo && empresa.logo !== "") {
      const empresaLogoPath = path.join(
        __dirname,
        "../../uploads",
        empresa.logo,
      );
      if (fs.existsSync(empresaLogoPath)) {
        logoPath = empresaLogoPath;
        console.log("✅ Usando logo da empresa:", empresa.logo);
      }
    }

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 595 / 2 - 55, 30, { width: 110, align: "center" }); // centralizar logo
    }

    // Título
    doc.fontSize(14).font("Helvetica-Bold");
    doc.text("RELATÓRIO DE PRODUTO", 0, 150, { align: "center" });
    doc.moveDown(0.2);
    doc.fontSize(11).font("Helvetica");
    doc.text(empresa ? empresa.nome || empresa.razaoSocial || "" : "", {
      align: "center",
    });

    doc.moveDown(1);

    // Construir tabela com layout em duas linhas por produto (para caber em A4)
    const left = 40;
    const usableWidth = 595 - 2 * 40; // A4 width - margins
    // Colunas calculadas para segunda linha
    const cols2 = {
      marca: left,
      grupo: left + 120,
      subgrupo: left + 240,
      preco_custo: left + 340,
      preco_venda: left + 400,
      estoque_minimo: left + 460,
    };

    // Header (título da tabela)
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#222");
    // desenhar uma linha de separação abaixo do título
    let y = 180; // ajustado para dar espaço à logo centralizada
    doc
      .moveTo(left, y + 18)
      .lineTo(left + usableWidth, y + 18)
      .stroke("#e6e6e6");

    doc.fontSize(9).font("Helvetica");

    // Percorrer produtos e desenhar cada produto em duas colunas: esquerda (código + descrição), direita (meta + preços)
    y = y + 26;
    const rightColWidth = 170;
    const codeWidth = 40;
    const descX = left + codeWidth + 8; // espaço após código
    const descWidth = usableWidth - rightColWidth - codeWidth - 16; // margem interna
    const rightX = left + usableWidth - rightColWidth;

    produtos.forEach((p, i) => {
      // calcular blocos e alturas para evitar sobreposição
      const codigoText = p.codigo || "";
      const descricao = p.descricao || p.produto || "";
      const unidadeText = p.unidade ? `Un: ${p.unidade}` : "";

      const marcaText = p.marca || "";
      const grupoText = p.grupo || "";
      const subgrupoText = p.subgrupo || "";

      const precoCusto = p.preco_custo
        ? `C: R$ ${Number(p.preco_custo).toFixed(2)}`
        : "";
      const precoVenda = p.preco_venda
        ? `V: R$ ${Number(p.preco_venda).toFixed(2)}`
        : "";
      const estoqueTxt =
        p.estoque_minimo !== undefined && p.estoque_minimo !== null
          ? String(p.estoque_minimo)
          : "";

      // montar blocos de texto para medir alturas
      const leftDescHeight = doc.heightOfString(descricao, {
        width: descWidth,
      });
      const leftUnitHeight = unidadeText
        ? doc.heightOfString(unidadeText, { width: descWidth })
        : 0;
      const leftHeight = Math.max(leftDescHeight + leftUnitHeight, 18);

      const rightTopLines = [marcaText, grupoText, subgrupoText]
        .filter(Boolean)
        .join("\n");
      const rightPriceLines = [
        precoCusto,
        precoVenda,
        estoqueTxt ? `Est: ${estoqueTxt}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const rightTopHeight = rightTopLines
        ? doc.heightOfString(rightTopLines, { width: rightColWidth - 8 })
        : 0;
      const rightPriceHeight = rightPriceLines
        ? doc.heightOfString(rightPriceLines, { width: rightColWidth - 8 })
        : 0;
      const rightHeight = Math.max(rightTopHeight + rightPriceHeight, 18);

      const rowPadding = 12;
      const rowHeight = Math.max(leftHeight, rightHeight) + rowPadding;

      // nova página se necessário (considerar rowHeight)
      if (y + rowHeight > 760) {
        doc.addPage();
        y = 60;
      }

      // Desenhar código à esquerda (fonte menor e largura limitada) e descrição ao lado
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#000");
      doc.text(codigoText, left, y, { width: codeWidth, align: "left" });
      doc.font("Helvetica").fontSize(9).fillColor("#111");
      doc.text(descricao, descX, y, { width: descWidth, align: "left" });

      // Unidade abaixo da descrição, se houver
      if (unidadeText) {
        doc.font("Helvetica").fontSize(8).fillColor("#666");
        doc.text(unidadeText, descX, y + leftDescHeight + 4, {
          width: descWidth,
        });
      }

      // Bloco direito: topo (marca/grupo/subgrupo) + preços (cada um em linha própria)
      doc.font("Helvetica").fontSize(9).fillColor("#333");
      if (rightTopLines) {
        doc.text(rightTopLines, rightX, y, {
          width: rightColWidth - 8,
          align: "left",
        });
      }

      if (rightPriceLines) {
        const priceStartY = y + rightTopHeight + 6;
        // desenhar preços alinhados à direita dentro o bloco
        const priceLinesArr = rightPriceLines.split("\n");
        priceLinesArr.forEach((line, idx) => {
          const thisY = priceStartY + idx * 12;
          doc.text(line, rightX, thisY, {
            width: rightColWidth - 8,
            align: "right",
          });
        });
      }

      // linha separadora entre registros
      const sepY = y + rowHeight - 6;
      doc
        .moveTo(left, sepY)
        .lineTo(left + usableWidth, sepY)
        .stroke("#f0f0f0");

      // avançar y para próximo registro
      y = sepY + 12;
    });

    doc.end();
  } catch (error) {
    console.error("❌ Erro ao gerar PDF:", error);
    res
      .status(500)
      .json({ error: "Erro ao gerar PDF", message: error.message });
  }
});

/**
 * POST /api/relatorios/entradas/pdf
 * Gera PDF da lista de Entradas usando o mesmo template/layout do relatório de produtos.
 * Corpo esperado: { entradas: [ { id, dataEmissao, tipoEntrada, itens: [ { produto, unidade, quantidade, custo, total, categoria } ] }, ... ], companyLogo?, companyRazao? }
 */
router.post("/entradas/pdf", async (req, res) => {
  try {
    console.log("📄 Gerando PDF de ENTRADAS (POST)");

    const entradas = Array.isArray(req.body && req.body.entradas)
      ? req.body.entradas
      : Array.isArray(req.body)
        ? req.body
        : [];

    // Gerar seção de entradas: renderizamos um resumo por entrada (ID, Tipo, Data Emissão, Valor)
    const dataEntradas = Array.isArray(entradas) ? entradas : [];
    // ordenar por dataEmissao decrescente quando presente
    try {
      dataEntradas.sort((a, b) => {
        const da =
          new Date(a.dataEmissao || a.data || a.createdAt || 0).getTime() || 0;
        const db =
          new Date(b.dataEmissao || b.data || b.createdAt || 0).getTime() || 0;
        return db - da;
      });
    } catch (e) {
      /* noop */
    }

    // carregar pdfkit dinamicamente
    let PDFDocument;
    try {
      PDFDocument = require("pdfkit");
    } catch (errRequire) {
      console.error(
        "❌ pdfkit não está instalado:",
        errRequire && errRequire.message,
      );
      res.status(500).json({
        error: "Dependência ausente: pdfkit",
        message:
          "Execute `npm install pdfkit` na raiz do projeto e reinicie o servidor.",
      });
      return;
    }

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="relatorio_entradas.pdf"',
    );
    doc.pipe(res);

    // Buscar empresa do usuário logado
    let empresa = null;
    try {
      empresa = await obterEmpresaDoRequest(req);
    } catch (e) {
      console.warn("⚠️ Erro ao buscar empresa para entradas:", e && e.message);
    }

    // pegar logo do payload (base64) se foi enviada, senão usar logo da empresa, senão fallback local
    const companyLogo = req.body.companyLogo || null;
    const companyRazao =
      (empresa ? empresa.razaoSocial || empresa.nome : null) ||
      req.body.companyRazao ||
      "";

    let logoRendered = false;
    // permitir ajuste de largura da logo via payload (em pontos). Default menor para visual menos dominante.
    const logoWidth =
      typeof req.body.companyLogoWidth === "number" &&
      req.body.companyLogoWidth > 0
        ? req.body.companyLogoWidth
        : req.body && Number(req.body.companyLogoWidth)
          ? Number(req.body.companyLogoWidth)
          : 90;
    const pageWidth = 595;
    const logoX = (pageWidth - logoWidth) / 2;
    const logoY = 25;

    if (
      companyLogo &&
      typeof companyLogo === "string" &&
      companyLogo.startsWith("data:image/")
    ) {
      try {
        const base64Data = companyLogo.split(",")[1];
        const imgBuffer = Buffer.from(base64Data, "base64");
        doc.image(imgBuffer, logoX, logoY, {
          width: logoWidth,
          align: "center",
        });
        logoRendered = true;
      } catch (e) {
        logoRendered = false;
      }
    }

    if (!logoRendered && empresa && empresa.logo && empresa.logo !== "") {
      try {
        const empresaLogoPath = path.join(
          __dirname,
          "../../uploads",
          empresa.logo,
        );
        if (fs.existsSync(empresaLogoPath)) {
          doc.image(empresaLogoPath, logoX, logoY, {
            width: logoWidth,
            align: "center",
          });
          logoRendered = true;
        }
      } catch (e) {
        /* noop */
      }
    }

    if (!logoRendered) {
      try {
        const logoPath = path.join(
          __dirname,
          "../../frontend/fivecon/Design sem nome (17).png",
        );
        if (fs.existsSync(logoPath))
          doc.image(logoPath, logoX, logoY, {
            width: logoWidth,
            align: "center",
          });
      } catch (e) {}
    }

    // Título específico para Entradas (mantendo o estilo visual)
    const tituloY = Math.max(110, logoY + 85);
    doc.fontSize(14).font("Helvetica-Bold");
    doc.text("OUTRAS ENTRADAS NO PERÍODO", 0, tituloY, {
      align: "center",
      width: pageWidth,
    });
    doc.moveDown(0.3);
    doc.fontSize(11).font("Helvetica");
    doc.text(companyRazao, 0, doc.y, { align: "center", width: pageWidth });
    doc.moveDown(1.2);

    // Renderizar entradas em formato resumido por entrada (uma linha por entrada)
    const left = 40;
    const usableWidth = 595 - 2 * 40;
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#222");
    let y = 180;
    doc
      .moveTo(left, y + 18)
      .lineTo(left + usableWidth, y + 18)
      .stroke("#e6e6e6");
    doc.fontSize(9).font("Helvetica");
    y = y + 26;

    const rightColWidth = 160;
    const codeWidth = 40;
    const descX = left + codeWidth + 8;
    const descWidth = usableWidth - rightColWidth - codeWidth - 16;
    const rightX = left + usableWidth - rightColWidth;

    // Interpretar datas de forma a evitar deslocamento de timezone
    // - Strings no formato YYYY-MM-DD serão tratadas como datas LOCAIS (sem shift UTC)
    // - Strings em outros formatos (com 'T' ou timezone) serão deixadas para Date() padrão
    const parseToLocalDate = (v) => {
      if (!v && v !== 0) return null;
      try {
        if (v instanceof Date) return v;
        if (typeof v === "number" || /^[0-9]+$/.test(String(v)))
          return new Date(Number(v));
        const s = String(v).trim();
        // YYYY-MM-DD (sem hora) -> criar Date local (evita shift UTC)
        const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (ymd) {
          const year = Number(ymd[1]);
          const month = Number(ymd[2]) - 1;
          const day = Number(ymd[3]);
          return new Date(year, month, day);
        }
        // dd/mm/yyyy -> criar Date local
        const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (br) {
          const day = Number(br[1]);
          const month = Number(br[2]) - 1;
          const year = Number(br[3]);
          return new Date(year, month, day);
        }
        // fallback: permitir Date parse (inclui ISO com T e timezone)
        return new Date(s);
      } catch (e) {
        return null;
      }
    };

    const formatDate = (v) => {
      try {
        if (!v) return "";
        const d = parseToLocalDate(v);
        if (!d || isNaN(d.getTime())) return String(v);
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      } catch (e) {
        return String(v || "");
      }
    };

    dataEntradas.forEach((ent) => {
      try {
        const entId = ent.id || ent.ID || ent._id || "";
        const tipo = (
          ent.tipoEntrada ||
          ent.tipo ||
          ent.descricao ||
          ent.tipoDescricao ||
          ""
        ).toString();
        const dataEmissao = ent.dataEmissao || ent.data || ent.createdAt || "";
        const valorNum =
          Number(
            ent.valor || ent.total || ent.valorTotal || ent.valor_pago || 0,
          ) || 0;
        const valorText = valorNum
          ? `R$ ${valorNum.toFixed(2).replace(".", ",")}`
          : "";

        const descricao = tipo;
        const leftDescHeight = doc.heightOfString(descricao, {
          width: descWidth,
        });
        const dateLine = formatDate(dataEmissao);
        const dateHeight = dateLine
          ? doc.heightOfString(dateLine, { width: descWidth })
          : 0;
        const leftHeight = Math.max(leftDescHeight + dateHeight, 18);

        const rightLinesHeight = valorText
          ? doc.heightOfString(valorText, { width: rightColWidth - 8 })
          : 0;
        const rowPadding = 12;
        const rowHeight = Math.max(leftHeight, rightLinesHeight) + rowPadding;

        if (y + rowHeight > 760) {
          doc.addPage();
          y = 60;
        }

        doc.font("Helvetica-Bold").fontSize(8).fillColor("#000");
        doc.text(String(entId), left, y, { width: codeWidth, align: "left" });

        doc.font("Helvetica").fontSize(9).fillColor("#111");
        doc.text(descricao, descX, y, { width: descWidth, align: "left" });
        if (dateLine) {
          doc.font("Helvetica").fontSize(8).fillColor("#666");
          doc.text(dateLine, descX, y + leftDescHeight + 4, {
            width: descWidth,
            align: "left",
          });
        }

        if (valorText) {
          doc.font("Helvetica").fontSize(9).fillColor("#333");
          doc.text(valorText, rightX, y, {
            width: rightColWidth - 8,
            align: "right",
          });
        }

        const sepY = y + rowHeight - 6;
        doc
          .moveTo(left, sepY)
          .lineTo(left + usableWidth, sepY)
          .stroke("#f0f0f0");
        y = sepY + 12;
      } catch (itemErr) {
        console.warn(
          "⚠️ Erro ao renderizar entrada:",
          ent && (ent.id || ent.ID),
          itemErr && itemErr.message,
        );
      }
    });

    doc.end();
  } catch (error) {
    console.error("❌ Erro ao gerar PDF de entradas:", error);
    res
      .status(500)
      .json({ error: "Erro ao gerar PDF", message: error.message });
  }
});

/**
 * POST /api/relatorios/produtos/pdf
 * Gera PDF a partir da lista de produtos enviada no corpo da requisição.
 * Corpo esperado: { produtos: [ { codigo, descricao, unidade, marca, grupo, subgrupo, preco_custo, preco_venda, estoque_minimo, local }, ... ] }
 */
router.post("/produtos/pdf", async (req, res) => {
  try {
    console.log("📄 Gerando PDF de produtos (POST)");

    const produtos = Array.isArray(req.body && req.body.produtos)
      ? req.body.produtos
      : Array.isArray(req.body)
        ? req.body
        : null;

    // fallback para data de exemplo quando nada for enviado
    const produtosFallback = [
      {
        codigo: "001",
        descricao: "Ração Premium Adulto",
        unidade: "UN",
        marca: "Golden",
        grupo: "Rações",
        subgrupo: "Adulto",
        preco_custo: 40.04,
        preco_venda: 131.0,
        estoque_minimo: 0,
        local: "Loja",
      },
      {
        codigo: "002",
        descricao: "BUTOX P CE 25 - 20ML",
        unidade: "UN",
        marca: "Credeli",
        grupo: "Farmácia",
        subgrupo: "Medicamentos",
        preco_custo: 4.31,
        preco_venda: 7.0,
        estoque_minimo: 0,
        local: "Loja",
      },
      {
        codigo: "003",
        descricao: "Banho e Tosa - Cães Pequeno Porte",
        unidade: "UN",
        marca: "",
        grupo: "Serviços",
        subgrupo: "Banho/Tosa",
        preco_custo: 0.0,
        preco_venda: 50.0,
        estoque_minimo: 0,
        local: "Loja",
      },
    ];

    const dataProdutos =
      produtos && produtos.length ? produtos : produtosFallback;

    // Garantir ordenação alfabética por descrição no servidor (pt-BR)
    try {
      dataProdutos.sort((a, b) => {
        const aDesc =
          a && (a.descricao || a.nome || a.produto)
            ? String(a.descricao || a.nome || a.produto)
            : "";
        const bDesc =
          b && (b.descricao || b.nome || b.produto)
            ? String(b.descricao || b.nome || b.produto)
            : "";
        return aDesc.localeCompare(bDesc, "pt-BR", { sensitivity: "base" });
      });
    } catch (e) {
      // se algo der errado na ordenação, não interrompemos a geração do PDF
      console.warn(
        "⚠️ Não foi possível ordenar dataProdutos no servidor:",
        e && e.message,
      );
    }

    // carregar pdfkit dinamicamente (se não estiver instalado, retornar erro claro)
    let PDFDocument;
    try {
      PDFDocument = require("pdfkit");
    } catch (errRequire) {
      console.error(
        "❌ pdfkit não está instalado:",
        errRequire && errRequire.message,
      );
      res.status(500).json({
        error: "Dependência ausente: pdfkit",
        message:
          "Execute `npm install pdfkit` na raiz do projeto e reinicie o servidor.",
      });
      return;
    }

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="relatorio_produtos.pdf"',
    );
    doc.pipe(res);

    // Buscar empresa do usuário logado
    let empresa = null;
    try {
      empresa = await obterEmpresaDoRequest(req);
    } catch (err) {
      console.warn(
        "⚠️ Erro ao buscar empresa para relatório:",
        err && err.message,
      );
      empresa = null;
    }

    // Definir razão social (payload > empresa > fallback)
    const payloadCompanyRazao =
      req.body &&
      (req.body.companyRazao || req.body.razaoSocial || req.body.companyName);
    const companyRazao =
      payloadCompanyRazao ||
      (empresa &&
        (empresa.razaoSocial || empresa.nome || empresa.nomeFantasia)) ||
      "";

    // Lidar com o logo: aceitar data-URI (base64) ou nome/URL de arquivo que exista em uploads
    const payloadLogo = req.body && req.body.companyLogo;
    let logoRendered = false;
    const logoWidth =
      typeof req.body.companyLogoWidth === "number" &&
      req.body.companyLogoWidth > 0
        ? req.body.companyLogoWidth
        : req.body && Number(req.body.companyLogoWidth)
          ? Number(req.body.companyLogoWidth)
          : 90;
    const pageWidth = 595; // largura A4
    const logoX = (pageWidth - logoWidth) / 2; // centralizar horizontalmente
    const logoY = 25; // posição Y fixa no topo

    if (payloadLogo && typeof payloadLogo === "string") {
      try {
        if (payloadLogo.startsWith("data:image/")) {
          const base64Data = payloadLogo.split(",")[1];
          if (!base64Data) throw new Error("Base64 data inválida");
          const estimatedSize = (base64Data.length * 3) / 4;
          if (estimatedSize > 5 * 1024 * 1024)
            throw new Error("Logo excede 5MB");
          const imgBuffer = Buffer.from(base64Data, "base64");
          doc.image(imgBuffer, logoX, logoY, {
            width: logoWidth,
            align: "center",
          });
          logoRendered = true;
        } else {
          // tentar localizar arquivo no diretório uploads (aceita nome de arquivo ou URL que contenha o nome)
          const candidate = path.join(
            __dirname,
            "../../uploads",
            path.basename(payloadLogo),
          );
          if (fs.existsSync(candidate)) {
            doc.image(candidate, logoX, logoY, {
              width: logoWidth,
              align: "center",
            });
            logoRendered = true;
          }
        }
      } catch (logoErr) {
        console.warn(
          "⚠️ Erro ao incluir logo do payload:",
          logoErr && logoErr.message,
        );
        logoRendered = false;
      }
    }

    // tentar logo da empresa se não renderizou a do payload
    if (!logoRendered && empresa && empresa.logo) {
      try {
        const empresaLogoPath = path.join(
          __dirname,
          "../../uploads",
          String(empresa.logo),
        );
        if (fs.existsSync(empresaLogoPath)) {
          doc.image(empresaLogoPath, logoX, logoY, {
            width: logoWidth,
            align: "center",
          });
          logoRendered = true;
          console.log("✅ Usando logo da empresa:", empresa.logo);
        }
      } catch (logoErr) {
        console.warn(
          "⚠️ Erro ao incluir logo da empresa:",
          logoErr && logoErr.message,
        );
        logoRendered = false;
      }
    }

    // fallback: tentar logo local padrão se ainda não renderizou
    if (!logoRendered) {
      try {
        const logoPath = path.join(
          __dirname,
          "../../frontend/fivecon/Design sem nome (17).png",
        );
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, logoX, logoY, {
            width: logoWidth,
            align: "center",
          });
        }
      } catch (localLogoErr) {
        console.warn(
          "⚠️ Erro ao incluir logo local:",
          localLogoErr && localLogoErr.message,
        );
      }
    }

    // Título centralizado com espaço seguro abaixo da logo (mínimo 110px do topo)
    const tituloY = Math.max(110, logoY + 85); // garante espaço mínimo maior entre logo e título
    doc.fontSize(14).font("Helvetica-Bold");
    doc.text("RELATÓRIO DE PRODUTO", 0, tituloY, {
      align: "center",
      width: pageWidth,
    });
    doc.moveDown(0.3);
    doc.fontSize(11).font("Helvetica");
    doc.text(companyRazao, 0, doc.y, { align: "center", width: pageWidth });
    doc.moveDown(1.2);

    // Se o frontend solicitou modo resumido, gerar layout enxuto: apenas Nome e Preço
    if (req.body && req.body.mode === "resumido") {
      const left = 40;
      const usableWidth = 595 - 2 * 40;
      let y = 120 + 26;
      const priceWidth = 100; // reserva para o preço à direita

      doc.fontSize(9).font("Helvetica");

      dataProdutos.forEach((p) => {
        const descricao = p.descricao || p.produto || p.nome || "";
        const precoVal =
          p.preco_venda !== undefined && p.preco_venda !== null
            ? Number(p.preco_venda)
            : p.preco !== undefined && p.preco !== null
              ? Number(p.preco)
              : null;
        const precoText =
          precoVal !== null
            ? `R$ ${precoVal.toFixed(2).replace(".", ",")}`
            : "";

        // altura estimada
        const descHeight = doc.heightOfString(descricao, {
          width: usableWidth - priceWidth - 8,
        });
        const rowHeight = Math.max(descHeight, 12) + 12;

        if (y + rowHeight > 760) {
          doc.addPage();
          y = 60;
        }

        doc.font("Helvetica").fontSize(9).fillColor("#111");
        doc.text(descricao, left, y, {
          width: usableWidth - priceWidth - 8,
          align: "left",
        });
        if (precoText) {
          doc.text(precoText, left + usableWidth - priceWidth, y, {
            width: priceWidth - 8,
            align: "right",
          });
        }

        const sepY = y + rowHeight - 6;
        doc
          .moveTo(left, sepY)
          .lineTo(left + usableWidth, sepY)
          .stroke("#f0f0f0");
        y = sepY + 12;
      });

      doc.end();
      return;
    }

    const left = 40;
    const usableWidth = 595 - 2 * 40;
    const rightColWidth = 170;
    const codeWidth = 40;
    const descX = left + codeWidth + 8;
    const descWidth = usableWidth - rightColWidth - codeWidth - 16;
    const rightX = left + usableWidth - rightColWidth;

    doc.fontSize(9).font("Helvetica");
    let y = 120 + 26;

    dataProdutos.forEach((p) => {
      const codigoText = p.codigo || (p.id ? String(p.id) : "");
      const descricao = p.descricao || p.produto || p.nome || "";
      // O campo unidade já vem formatado do frontend com preços incluídos
      const unidadeText = p.unidade
        ? String(p.unidade)
        : p.unidade_medida
          ? String(p.unidade_medida)
          : "";

      const marcaText = p.marca ? String(p.marca) : "";
      const grupoText =
        p.grupo || p.categoria ? String(p.grupo || p.categoria) : "";
      const subgrupoText = p.subgrupo ? String(p.subgrupo) : "";

      // Como os preços já estão no campo unidade, não precisamos formatar aqui para modo detalhado
      // Mas mantemos para outros campos se necessário
      const precoCusto = ""; // já incluído em unidade
      const precoVenda = ""; // já incluído em unidade
      const estoqueTxt =
        p.estoque_minimo !== undefined && p.estoque_minimo !== null
          ? String(p.estoque_minimo)
          : "";

      try {
        const leftDescHeight = doc.heightOfString(descricao, {
          width: descWidth,
        });
        const leftUnitHeight = unidadeText
          ? doc.heightOfString(unidadeText, { width: descWidth })
          : 0;
        const leftHeight = Math.max(leftDescHeight + leftUnitHeight + 6, 18);

        const rightTopLines = [marcaText, grupoText, subgrupoText]
          .filter(Boolean)
          .join("\n");
        const rightPriceLines = [estoqueTxt ? `Estoque Mín: ${estoqueTxt}` : ""]
          .filter(Boolean)
          .join("\n");

        const rightTopHeight = rightTopLines
          ? doc.heightOfString(rightTopLines, { width: rightColWidth - 8 })
          : 0;
        const rightPriceHeight = rightPriceLines
          ? doc.heightOfString(rightPriceLines, { width: rightColWidth - 8 })
          : 0;
        const rightHeight = Math.max(rightTopHeight + rightPriceHeight, 18);

        const rowPadding = 12;
        const rowHeight = Math.max(leftHeight, rightHeight) + rowPadding;

        if (y + rowHeight > 760) {
          doc.addPage();
          y = 60;
        }

        doc.font("Helvetica-Bold").fontSize(8).fillColor("#000");
        doc.text(codigoText, left, y, { width: codeWidth, align: "left" });
        doc.font("Helvetica").fontSize(9).fillColor("#111");
        doc.text(descricao, descX, y, { width: descWidth, align: "left" });

        if (unidadeText) {
          doc.font("Helvetica").fontSize(8).fillColor("#666");
          doc.text(unidadeText, descX, y + leftDescHeight + 4, {
            width: descWidth,
          });
        }

        doc.font("Helvetica").fontSize(9).fillColor("#333");
        if (rightTopLines) {
          doc.text(rightTopLines, rightX, y, {
            width: rightColWidth - 8,
            align: "left",
          });
        }

        if (rightPriceLines) {
          const priceStartY = y + rightTopHeight + 6;
          const priceLinesArr = rightPriceLines.split("\n");
          priceLinesArr.forEach((line, idx) => {
            const thisY = priceStartY + idx * 12;
            doc.text(line, rightX, thisY, {
              width: rightColWidth - 8,
              align: "right",
            });
          });
        }

        const sepY = y + rowHeight - 6;
        doc
          .moveTo(left, sepY)
          .lineTo(left + usableWidth, sepY)
          .stroke("#f0f0f0");
        y = sepY + 12;
      } catch (itemErr) {
        console.warn(
          "⚠️ Erro ao renderizar produto:",
          p.codigo || p.id,
          itemErr.message,
        );
        // pular este item e continuar
      }
    });

    doc.end();
  } catch (error) {
    console.error("❌ Erro ao gerar PDF (POST):", error);
    res
      .status(500)
      .json({ error: "Erro ao gerar PDF", message: error.message });
  }
});

/**
 * POST /api/relatorios/fornecedores/pdf
 * Gera PDF com a lista de fornecedores (modo 'resumido' ou 'detalhado')
 */
router.post("/fornecedores/pdf", async (req, res) => {
  try {
    console.log("📄 Gerando PDF de fornecedores");
    console.log("📥 payload recebido:", JSON.stringify(req.body, null, 2));

    // tentar carregar modelo Fornecedor e Sequelize Op
    let Fornecedor, Op;
    try {
      ({ Fornecedor } = require("../models"));
      ({ Op } = require("sequelize"));
      console.log("✅ Modelo Fornecedor carregado");
    } catch (err) {
      console.error(
        "❌ Erro ao carregar modelo Fornecedor:",
        err && err.message,
      );
      return res
        .status(500)
        .json({ error: "Modelo Fornecedor não disponível" });
    }

    const filtros = req.body && req.body.filtros ? req.body.filtros : {};
    const mode =
      req.body && req.body.tipo
        ? req.body.tipo
        : req.body && req.body.mode
          ? req.body.mode
          : "resumido";

    let fornecedoresList = [];

    if (Fornecedor && typeof Fornecedor.findAll === "function") {
      const where = {};

      // ---- empresa_id obrigatório ----
      const empresaObj = await obterEmpresaDoRequest(req);
      const empresaId = empresaObj && empresaObj.id;
      if (!empresaId) {
        return res.status(401).json({ error: "Empresa não identificada" });
      }
      where.empresa_id = empresaId;

      // Processar filtro ativo (aceita 'todos', 'sim', 'nao', true, false, 1, 0)
      if (
        filtros.ativo !== undefined &&
        filtros.ativo !== null &&
        filtros.ativo !== "todos"
      ) {
        if (
          filtros.ativo === "sim" ||
          filtros.ativo === true ||
          filtros.ativo === 1 ||
          filtros.ativo === "1" ||
          filtros.ativo === "true"
        ) {
          where.ativo = true;
        } else if (
          filtros.ativo === "nao" ||
          filtros.ativo === false ||
          filtros.ativo === 0 ||
          filtros.ativo === "0" ||
          filtros.ativo === "false"
        ) {
          where.ativo = false;
        }
      }

      // Processar filtro de pesquisa (busca por nome, razaoSocial ou codigo)
      if (filtros.pesquisa && filtros.pesquisa.trim() && Op) {
        where[Op.or] = [
          { nome: { [Op.like]: `%${filtros.pesquisa.trim()}%` } },
          { razaoSocial: { [Op.like]: `%${filtros.pesquisa.trim()}%` } },
          { codigo: { [Op.like]: `%${filtros.pesquisa.trim()}%` } },
        ];
      }

      console.log("🔎 Query where:", JSON.stringify(where, null, 2));

      try {
        fornecedoresList = await Fornecedor.findAll({
          where,
          attributes: [
            "id",
            "codigo",
            "nome",
            "cnpj",
            "cpf",
            "razaoSocial",
            "telefone",
            "ativo",
            "email",
            "cidade",
            "bairro",
            "endereco",
            "cep",
            "proximidade",
            "inscEstadual",
            "createdAt",
          ],
          raw: true,
          order: [["nome", "ASC"]],
        });
        console.log(
          `✅ Fornecedor.findAll retornou ${fornecedoresList.length} registros`,
        );
        if (fornecedoresList.length > 0) {
          console.log(
            "📦 Registros encontrados:",
            fornecedoresList.map((f) => ({
              id: f.id,
              nome: f.nome,
              codigo: f.codigo,
            })),
          );
        } else {
          console.warn("⚠️ Nenhum fornecedor encontrado no banco de dados!");
        }
      } catch (dbErr) {
        console.error("❌ Erro na query Fornecedor.findAll:", dbErr);
        return res.status(500).json({
          error: "Erro ao buscar fornecedores",
          details: dbErr.message,
        });
      }
    } else {
      console.error(
        "❌ Modelo Fornecedor não disponível ou findAll não é função",
      );
      return res
        .status(500)
        .json({ error: "Modelo Fornecedor não disponível" });
    }

    console.log(
      `📊 Total de fornecedores para o PDF: ${fornecedoresList.length}`,
    );

    let PDFDocument;
    try {
      PDFDocument = require("pdfkit");
    } catch (errRequire) {
      console.error(
        "❌ pdfkit não está instalado:",
        errRequire && errRequire.message,
      );
      res.status(500).json({ error: "Dependência ausente: pdfkit" });
      return;
    }

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="relatorio_fornecedores.pdf"',
    );
    doc.pipe(res);

    // Buscar empresa do usuário logado
    let empresa = null;
    try {
      empresa = await obterEmpresaDoRequest(req);
    } catch (e) {
      console.warn("⚠️ Erro ao buscar empresa ativa:", e && e.message);
    }

    // Cabeçalho semelhante à imagem: logo à esquerda/centralizado e título + razão social no centro
    const pageWidth = 595;
    const logoWidth = 80;
    const logoX = 50; // deixar margem esquerda para a logo
    const logoY = 25;

    // tentar usar logo da empresa (upload), senão fallback para frontend/logo
    let renderedLogo = false;
    try {
      if (empresa && empresa.logo) {
        const empresaLogoPath = path.join(
          __dirname,
          "../../uploads",
          empresa.logo,
        );
        if (fs.existsSync(empresaLogoPath)) {
          doc.image(empresaLogoPath, logoX, logoY, { width: logoWidth });
          renderedLogo = true;
        }
      }
    } catch (errLogo) {
      console.warn(
        "⚠️ Falha ao tentar renderizar logo da empresa:",
        errLogo && errLogo.message,
      );
    }

    if (!renderedLogo) {
      try {
        const defaultLogo = path.join(
          __dirname,
          "../../frontend/fivecon/Design sem nome (17).png",
        );
        if (fs.existsSync(defaultLogo))
          doc.image(defaultLogo, logoX, logoY, { width: logoWidth });
      } catch (e) {
        /* ignore */
      }
    }

    // Título centralizado
    const tituloY = 40;
    doc.fontSize(14).font("Helvetica-Bold");
    doc.text("RELATÓRIO DE FORNECEDOR", 0, tituloY, {
      align: "center",
      width: pageWidth,
    });
    doc.moveDown(0.3);
    doc.fontSize(11).font("Helvetica");
    const razao =
      empresa && (empresa.nome || empresa.razaoSocial)
        ? empresa.nome || empresa.razaoSocial
        : "";
    doc.text(razao, 0, doc.y, { align: "center", width: pageWidth });
    doc.moveDown(0.8);
    // Cabeçalho da tabela (Código | Nome | Telefone | CNPJ/CPF)
    const left = 40;
    const usableWidth = pageWidth - left - 40;
    // ajustar larguras: priorizar espaço para CNPJ/CPF para evitar quebra
    const colCodigo = 50;
    const colTelefone = 110; // reduzir um pouco
    const colCnpj = 150; // aumentar espaço para CNPJ/CPF
    const colNome = usableWidth - (colCodigo + colTelefone + colCnpj);

    let y = doc.y + 6;

    // Se for modo 'detalhado', renderizar layout completo por fornecedor e terminar
    if (mode && String(mode).toLowerCase() === "detalhado") {
      console.log(
        "📄 Modo DETALHADO: renderizando informações completas por fornecedor",
      );
      // larguras para colunas detalhadas
      const leftCol = left;
      const leftColWidth = Math.floor(usableWidth * 0.55);
      const rightCol = left + leftColWidth + 10;
      const rightColWidth = usableWidth - leftColWidth - 10;

      doc.moveDown(0.2);
      let yy = doc.y + 4;
      fornecedoresList.forEach((f, idx) => {
        if (yy + 120 > 760) {
          doc.addPage();
          yy = 60;
        }

        // linha separadora superior
        doc.lineWidth(0.5).strokeColor("#bbbbbb");
        doc
          .moveTo(leftCol, yy)
          .lineTo(leftCol + usableWidth, yy)
          .stroke();
        yy += 8;

        const clienteText = `Cliente: ${f.id ? f.id + " - " : ""}${f.nome || f.razaoSocial || ""}`;
        const cnpjText = `CNPJ: ${f.cnpj || ""}`;
        const telefone1 = `Telefone 1: ${f.telefone || ""}`;
        const email = `E-mail: ${f.email || ""}`;
        const proximidade = `Proximidade: ${f.proximidade || ""}`;

        const ieRg = `IE/RG: ${f.inscEstadual || ""}`;
        const telefone2 = `Telefone 2: `; // Campo não existe no banco, deixar vazio
        const cidade = `Cidade: ${f.cidade || ""}`;
        const bairro = `Bairro: ${f.bairro || ""}`;
        const endereco = `Endereço: ${f.endereco || ""}`;
        const cep = `Cep: ${f.cep || ""}`;
        const dt = `Dt: ${f.createdAt ? new Date(f.createdAt).toLocaleDateString("pt-BR") : ""}`;

        doc.fontSize(9).font("Helvetica");
        // esquerda (bloco)
        doc.text(clienteText, leftCol, yy, {
          width: leftColWidth,
          align: "left",
        });
        doc.text(cnpjText, leftCol, yy + 14, {
          width: leftColWidth,
          align: "left",
        });
        doc.text(telefone1, leftCol, yy + 28, {
          width: leftColWidth,
          align: "left",
        });
        doc.text(email, leftCol, yy + 42, {
          width: leftColWidth,
          align: "left",
        });
        doc.text(proximidade, leftCol, yy + 56, {
          width: leftColWidth,
          align: "left",
        });

        // direita (bloco)
        doc.text(ieRg, rightCol, yy, { width: rightColWidth, align: "left" });
        doc.text(telefone2, rightCol, yy + 14, {
          width: rightColWidth,
          align: "left",
        });
        doc.text(cidade, rightCol, yy + 28, {
          width: rightColWidth,
          align: "left",
        });
        doc.text(bairro, rightCol, yy + 42, {
          width: rightColWidth,
          align: "left",
        });
        doc.text(endereco, rightCol, yy + 56, {
          width: rightColWidth - 60,
          align: "left",
        });
        doc.text(cep, rightCol + rightColWidth - 60, yy + 56, {
          width: 60,
          align: "right",
        });
        doc.text(dt, rightCol + rightColWidth - 60, yy + 42, {
          width: 60,
          align: "right",
        });

        // texto final direito (ex: Sem limite)
        doc.fontSize(9).font("Helvetica");
        doc.text("Sem limite", rightCol + rightColWidth - 60, yy + 28, {
          width: 60,
          align: "right",
        });

        yy += 84;
      });

      // desenhar rodapé final na última página (já tem hook pageAdded)
      doc.end();
      return;
    }
    // --- MODO RESUMIDO: Layout simples com tabela ---
    console.log(
      `📝 Renderizando (resumido) ${fornecedoresList.length} fornecedores no PDF...`,
    );

    // Cabeçalho da tabela
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Código", left, y, { width: colCodigo, align: "left" });
    doc.text("Nome", left + colCodigo, y, { width: colNome, align: "left" });
    doc.text("Telefone", left + colCodigo + colNome, y, {
      width: colTelefone,
      align: "left",
    });
    doc.text("CNPJ / CPF", left + colCodigo + colNome + colTelefone, y, {
      width: colCnpj,
      align: "left",
    });

    y += 16;
    doc
      .moveTo(left, y)
      .lineTo(left + usableWidth, y)
      .stroke("#000");
    y += 8;

    doc.font("Helvetica").fontSize(9).fillColor("#111");

    // Renderizar fornecedores linha por linha (layout simples e espaçamento fixo)
    fornecedoresList.forEach((f, index) => {
      const codigo = f.codigo || (f.id ? String(f.id) : "");
      const nome = f.nome || f.razaoSocial || "";
      const telefone = f.telefone || "";
      const cnpjcpf = f.cnpj || f.cpf || "";

      if (y > 750) {
        doc.addPage();
        y = 60;
      }

      doc.font("Helvetica-Bold").fontSize(9).fillColor("#000");
      doc.text(codigo, left, y, { width: colCodigo, align: "left" });

      doc.font("Helvetica").fontSize(9).fillColor("#111");
      doc.text(nome, left + colCodigo, y, { width: colNome, align: "left" });

      doc.fontSize(8).fillColor("#333");
      doc.text(telefone, left + colCodigo + colNome, y, {
        width: colTelefone,
        align: "left",
      });
      doc.text(cnpjcpf, left + colCodigo + colNome + colTelefone, y, {
        width: colCnpj,
        align: "left",
      });

      y += 18; // espaçamento fixo entre linhas
    });

    // Quantidade no rodapé
    const quantidade = fornecedoresList.length || 0;
    doc.fontSize(10).font("Helvetica");
    doc.text("Quantidade:", left + usableWidth - 160, Math.max(y + 10, 560), {
      width: 120,
      align: "right",
    });
    doc.text(
      String(quantidade),
      left + usableWidth - 30,
      Math.max(y + 10, 560),
      { width: 30, align: "right" },
    );

    doc.end();
  } catch (error) {
    console.error("❌ Erro ao gerar PDF de fornecedores:", error);
    res.status(500).json({
      error: "Erro ao gerar PDF de fornecedores",
      message: error.message,
    });
  }
});

/**
 * POST /api/relatorios/demonstrativo-resultados/pdf
 * Gera PDF do relatório demonstrativo de resultados
 */
router.post("/demonstrativo-resultados/pdf", async (req, res) => {
  try {
    console.log("📊 Gerando PDF Demonstrativo de Resultados");
    const {
      dataInicio,
      dataFim,
      apuracaoCusto,
      detalharGrupo,
      detalharCentro,
      considerarCusto,
      companyLogo,
      companyRazao,
    } = req.body;

    const PDFDocument = require("pdfkit");
    const doc = new PDFDocument({ size: "A4", margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="demonstrativo_resultados.pdf"',
    );
    doc.pipe(res);

    // LOGO DA EMPRESA (mesmo estilo do relatório de produtos)
    const companyRazaoFinal = companyRazao || "SUA EMPRESA";
    let logoRendered = false;
    const logoWidth = 120;
    const pageWidth = 595;
    const logoX = (pageWidth - logoWidth) / 2;
    const logoY = 25;

    if (
      companyLogo &&
      typeof companyLogo === "string" &&
      companyLogo.startsWith("data:image/")
    ) {
      try {
        const base64Data = companyLogo.split(",")[1];
        if (!base64Data) throw new Error("Base64 data inválida");
        const estimatedSize = (base64Data.length * 3) / 4;
        if (estimatedSize > 5 * 1024 * 1024) throw new Error("Logo excede 5MB");
        const imgBuffer = Buffer.from(base64Data, "base64");
        doc.image(imgBuffer, logoX, logoY, {
          width: logoWidth,
          align: "center",
        });
        logoRendered = true;
      } catch (logoErr) {
        console.warn("⚠️ Erro ao incluir logo:", logoErr.message);
      }
    }

    if (!logoRendered) {
      try {
        const logoPath = path.join(
          __dirname,
          "../../frontend/fivecon/Design sem nome (17).png",
        );
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, logoX, logoY, {
            width: logoWidth,
            align: "center",
          });
        }
      } catch (err) {
        /* ignore */
      }
    }

    // CABEÇALHO (posicionar abaixo da logo)
    const tituloY = Math.max(110, logoY + 85);
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#000");
    doc.text("RELATÓRIO DEMONSTRATIVO DE RESULTADOS", 0, tituloY, {
      align: "center",
      width: pageWidth,
    });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica").fillColor("#666");
    doc.text(companyRazaoFinal, 0, doc.y, {
      align: "center",
      width: pageWidth,
    });
    doc.moveDown(0.3);
    doc.text(`Período: ${dataInicio} até ${dataFim}`, { align: "center" });
    doc.moveDown(0.3);

    if (apuracaoCusto) {
      const apuracaoTexto = {
        cadastro: "Custo do Cadastro",
        compra: "Custo de Compra",
        medio: "Custo Médio",
      };
      doc.text(`Apuração: ${apuracaoTexto[apuracaoCusto] || apuracaoCusto}`, {
        align: "center",
      });
    }

    doc.moveDown(1);
    doc.strokeColor("#ddd").lineWidth(1);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(1);

    // DADOS DE EXEMPLO (substituir por dados reais do banco)
    const dadosReceita = [
      { descricao: "Receita Bruta de Serviços", valor: 45000.0 },
      { descricao: "Receita Bruta de Produtos", valor: 15000.0 },
      { descricao: "TOTAL RECEITA BRUTA", valor: 60000.0, destaque: true },
    ];

    const dadosDeducoes = [
      { descricao: "Impostos sobre Vendas", valor: -6000.0 },
      { descricao: "Descontos Concedidos", valor: -1500.0 },
      { descricao: "TOTAL DEDUÇÕES", valor: -7500.0, destaque: true },
    ];

    const dadosCustos = [
      { descricao: "Custo de Produtos Vendidos", valor: -8000.0 },
      { descricao: "Custo de Serviços Prestados", valor: -12000.0 },
      { descricao: "TOTAL CUSTOS", valor: -20000.0, destaque: true },
    ];

    const dadosDespesas = [
      { descricao: "Despesas Administrativas", valor: -5000.0 },
      { descricao: "Despesas com Pessoal", valor: -15000.0 },
      { descricao: "Despesas Operacionais", valor: -3000.0 },
      { descricao: "TOTAL DESPESAS", valor: -23000.0, destaque: true },
    ];

    function renderizarSecao(titulo, dados) {
      doc.fontSize(12).font("Helvetica-Bold").fillColor("#000");
      doc.text(titulo, 40, doc.y);
      doc.moveDown(0.5);

      dados.forEach((item) => {
        const y = doc.y;

        if (item.destaque) {
          doc.fontSize(10).font("Helvetica-Bold").fillColor("#000");
        } else {
          doc.fontSize(9).font("Helvetica").fillColor("#333");
        }

        doc.text(item.descricao, 60, y, { width: 350, align: "left" });

        const valorFormatado = item.valor.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });

        doc.text(valorFormatado, 420, y, { width: 100, align: "right" });
        doc.moveDown(0.3);
      });

      doc.moveDown(0.5);
    }

    // Renderizar todas as seções
    renderizarSecao("RECEITAS", dadosReceita);
    renderizarSecao("DEDUÇÕES", dadosDeducoes);

    // RECEITA LÍQUIDA
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#000");
    const receitaLiquida = 60000.0 - 7500.0;
    doc.text("RECEITA LÍQUIDA", 60, doc.y, { width: 350, align: "left" });
    doc.text(
      receitaLiquida.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
      420,
      doc.y,
      { width: 100, align: "right" },
    );
    doc.moveDown(1);

    renderizarSecao("CUSTOS", dadosCustos);

    // LUCRO BRUTO
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#000");
    const lucroBruto = receitaLiquida - 20000.0;
    doc.text("LUCRO BRUTO", 60, doc.y, { width: 350, align: "left" });
    doc.text(
      lucroBruto.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
      420,
      doc.y,
      { width: 100, align: "right" },
    );
    doc.moveDown(1);

    renderizarSecao("DESPESAS OPERACIONAIS", dadosDespesas);

    // RESULTADO OPERACIONAL (LUCRO LÍQUIDO)
    doc.strokeColor("#000").lineWidth(2);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(13).font("Helvetica-Bold").fillColor("#000");
    const resultadoOperacional = lucroBruto - 23000.0;
    const corResultado = resultadoOperacional >= 0 ? "#006400" : "#8B0000";

    doc.text("RESULTADO OPERACIONAL (LUCRO LÍQUIDO)", 60, doc.y, {
      width: 350,
      align: "left",
    });
    doc.fillColor(corResultado);
    doc.text(
      resultadoOperacional.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
      420,
      doc.y,
      { width: 100, align: "right" },
    );

    // Rodapé com informações adicionais
    doc.moveDown(2);
    doc.fontSize(8).font("Helvetica").fillColor("#999");
    doc.text(`Relatório gerado em: ${new Date().toLocaleString("pt-BR")}`, {
      align: "center",
    });

    if (considerarCusto) {
      doc.text("* Custos do cadastro no serviço prestado foram considerados", {
        align: "center",
      });
    }

    doc.end();
  } catch (error) {
    console.error("❌ Erro ao gerar PDF Demonstrativo:", error);
    res
      .status(500)
      .json({ error: "Erro ao gerar PDF", message: error.message });
  }
});
