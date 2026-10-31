#!/usr/bin/env node
// Script de debug: lista fornecedores e quantos itens os referenciam
const Produto = require("../models/Produto");
const Fornecedor = require("../models/Fornecedor");
const sequelize = Produto.sequelize;

async function main() {
  const fornecedores = await Fornecedor.findAll({
    attributes: ["id", "nome", "cnpj"],
    order: [["nome", "ASC"]],
    limit: 5000,
  });
  console.log(`Fornecedores encontrados: ${fornecedores.length}`);
  fornecedores.forEach((f) => console.log(`id=${f.id} nome=${f.nome}`));

  const produtos = await Produto.findAll({
    attributes: ["id", "nome", "fornecedores"],
    limit: 10000,
  });
  console.log(`Produtos carregados: ${produtos.length}`);

  const map = {};
  for (const p of produtos) {
    const arr = p.fornecedores || [];
    if (!Array.isArray(arr)) continue;
    for (const fi of arr) {
      let matchId = null;
      let matchNome = null;
      if (!fi) continue;
      if (typeof fi === "string") {
        matchNome = fi.trim().toLowerCase();
      } else if (typeof fi === "object") {
        if (fi.id) matchId = String(fi.id);
        if (fi.nome) matchNome = fi.nome.toString().trim().toLowerCase();
        if (fi.fornecedor && !matchNome)
          matchNome = fi.fornecedor.toString().trim().toLowerCase();
      }
      if (matchId) {
        map[matchId] = map[matchId] || [];
        map[matchId].push({ produtoId: p.id, produtoNome: p.nome });
      } else if (matchNome) {
        map[`nome:${matchNome}`] = map[`nome:${matchNome}`] || [];
        map[`nome:${matchNome}`].push({ produtoId: p.id, produtoNome: p.nome });
      }
    }
  }

  console.log("\nResumo por fornecedor id:");
  const ids = Object.keys(map)
    .filter((k) => !k.startsWith("nome:"))
    .sort((a, b) => a - b);
  for (const id of ids) {
    console.log(
      `id=${id} -> ${map[id].length} itens (ex: ${map[id]
        .slice(0, 3)
        .map((x) => x.produtoNome)
        .join(", ")})`,
    );
  }

  console.log("\nResumo por fornecedor nome (entradas que não têm id):");
  const nomes = Object.keys(map).filter((k) => k.startsWith("nome:"));
  for (const key of nomes) {
    console.log(
      `${key.replace("nome:", "")} -> ${map[key].length} itens (ex: ${map[key]
        .slice(0, 3)
        .map((x) => x.produtoNome)
        .join(", ")})`,
    );
  }

  console.log(
    "\nSe quiser investigar um fornecedor específico, execute:\n  node backend/scripts/debug-fornecedores-itens.js <fornecedorId|fornecedorNome>\n",
  );
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
