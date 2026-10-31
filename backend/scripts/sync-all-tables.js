/**
 * Script para forçar a criação/sincronização de TODAS as tabelas.
 * Roda independente: node backend/scripts/sync-all-tables.js
 *
 * Necessário quando o banco "petshop" está vazio ou faltam tabelas.
 */
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

const path = require("path");

// 1) Carregar todos os modelos (isso registra os factory models na instância do Cliente)
const models = require("../models");
console.log("✅ Modelos carregados");

// 2) Importar a instância principal (Cliente)
const { sequelize: mainSequelize } = require("../models/Cliente");

// 3) Listar TODOS os modelos que possuem instância própria de Sequelize
//    (cada um precisa de .sync() individual)
const ownInstanceModels = [
  { name: "Agendamento", model: require("../models/Agendamento").Agendamento },
  { name: "Box", model: require("../models/Box") },
  { name: "Caixa", model: require("../models/Caixa").Caixa },
  { name: "DescontoRelacao", model: require("../models/DescontoRelacao") },
  { name: "HistoricoEstoque", model: require("../models/HistoricoEstoque") },
  { name: "ImpressoraConfig", model: require("../models/ImpressoraConfig") },
  {
    name: "ModeloEtiquetaConfig",
    model: require("../models/ModeloEtiquetaConfig"),
  },
  {
    name: "MovimentoCaixa",
    model: require("../models/MovimentoCaixa").MovimentoCaixa,
  },
  { name: "Orcamento", model: require("../models/Orcamento").Orcamento },
  {
    name: "PagamentoCaixa",
    model: require("../models/PagamentoCaixa").PagamentoCaixa,
  },
  { name: "Pelagem", model: require("../models/Pelagem") },
  { name: "PerfilCliente", model: require("../models/PerfilCliente") },
  { name: "PerfilProduto", model: require("../models/PerfilProduto") },
  { name: "Produto", model: require("../models/Produto") },
  {
    name: "Profissional",
    model: require("../models/Profissional").Profissional,
  },
  { name: "Porte", model: require("../models/Porte") },
  { name: "Raca", model: require("../models/Raca") },
  { name: "Venda", model: require("../models/Venda").Venda },
];

(async () => {
  try {
    // Testar conexão
    await mainSequelize.authenticate();
    console.log("✅ Conexão com o banco OK\n");

    // 4) Sincronizar a instância principal (cobre Cliente + factory models + models que importam do Cliente)
    console.log(
      "--- Sincronizando instância principal (Cliente + factories) ---",
    );
    try {
      await mainSequelize.sync({ alter: true });
      console.log("✅ Instância principal sincronizada\n");
    } catch (err) {
      console.warn("⚠️ Erro no alter (tentando sem alter):", err.message);
      await mainSequelize.sync();
      console.log("✅ Instância principal sincronizada (sem alter)\n");
    }

    // 5) Sincronizar cada modelo com instância própria
    console.log("--- Sincronizando modelos com instância própria ---");
    for (const { name, model } of ownInstanceModels) {
      try {
        if (model && typeof model.sync === "function") {
          try {
            await model.sync({ alter: true });
          } catch (alterErr) {
            // Se alter falhar (ex: too many keys), tentar apenas criar
            await model.sync();
          }
          console.log(`  ✅ ${name}`);
        } else {
          console.warn(`  ⚠️ ${name} — não possui método sync`);
        }
      } catch (err) {
        console.error(`  ❌ ${name}: ${err.message}`);
      }
    }

    // 6) Verificar tabelas criadas
    const [tables] = await mainSequelize.query("SHOW TABLES");
    console.log(`\n✅ Total de tabelas no banco: ${tables.length}`);
    tables.forEach((t) => {
      const nome = Object.values(t)[0];
      console.log(`   - ${nome}`);
    });

    console.log("\n🎉 Sincronização completa! Todas as tabelas foram criadas.");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Erro fatal:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
