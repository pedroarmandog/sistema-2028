// Script: checar quais fornecedores mencionados em entradas_mercadoria estão ausentes na tabela fornecedores
// Uso: node backend/scripts/check-fornecedores-from-entradas.js

const path = require("path");
(async function () {
  try {
    const models = require(path.join(__dirname, "..", "models"));
    const { Entrada, Fornecedor } = models;
    const { Op } = require("sequelize");
    if (!Entrada || !Fornecedor) {
      console.error("Modelos Entrada ou Fornecedor não encontrados.");
      process.exit(1);
    }

    const entradas = await Entrada.findAll({
      attributes: ["id", "fornecedor"],
      where: { fornecedor: { [Op.ne]: null } },
      order: [["createdAt", "DESC"]],
      limit: 50000,
    });
    const fornecedorRows = await Fornecedor.findAll({
      attributes: ["id", "nome", "cnpj"],
      order: [["nome", "ASC"]],
      limit: 50000,
    });

    const nomesEntradas = new Set();
    entradas.forEach((e) => {
      const n = (e.fornecedor || "").toString().trim();
      if (n) nomesEntradas.add(n);
    });

    const nomesFornecedores = new Set();
    fornecedorRows.forEach((f) => {
      const n = (f.nome || "").toString().trim();
      if (n) nomesFornecedores.add(n);
    });

    const missing = [];
    nomesEntradas.forEach((n) => {
      if (!nomesFornecedores.has(n)) missing.push(n);
    });

    console.log("Total entradas com fornecedor não-nulo:", nomesEntradas.size);
    console.log("Total fornecedores cadastrados:", nomesFornecedores.size);
    console.log("Fornecedores ausentes (amostra até 50):");
    missing.slice(0, 50).forEach((m, i) => console.log(`${i + 1}. ${m}`));

    if (missing.length === 0)
      console.log("\nNenhum fornecedor ausente detectado.");
    else console.log(`\nTotal ausentes: ${missing.length}`);

    process.exit(0);
  } catch (err) {
    console.error("Erro no script:", err && err.stack);
    process.exit(2);
  }
})();
