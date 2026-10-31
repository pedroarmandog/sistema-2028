const { sequelize } = require("../models/Cliente");
const AgrupamentoFactory = require("../models/Agrupamento");

// Inicializa o modelo
const Agrupamento = AgrupamentoFactory(sequelize);

// Dados dos agrupamentos extraídos do HTML
const agrupamentosData = [
  {
    name: "Assinatura Centro de Estética",
    subgrupos: JSON.stringify([
      "Banho e Tosa",
      "BANHO E TOSA",
      "BANHOS AVULSOS",
      "TOSAS",
      "ADICIONAIS",
      "PLANOS",
    ]),
  },
  {
    name: "CONSULTÓRIO",
    subgrupos: JSON.stringify([
      "CONSULTAS",
      "EXAMES",
      "PROCEDIMENTOS CLINICOS",
      "PROCEDIMENTO CIRURGICO",
    ]),
  },
  {
    name: "LOJA",
    subgrupos: JSON.stringify([
      "RAÇÕES",
      "MEDICAMENTOS",
      "VACINAS",
      "VERMIFUGOS",
      "ANTIPARASITARIOS",
      "BRINQUEDOS",
      "HIGIENE",
      "ROUPAS",
    ]),
  },
];

async function popularAgrupamentos() {
  try {
    console.log("🔄 Conectando ao banco de dados...");
    await sequelize.authenticate();
    console.log("✅ Conexão estabelecida com sucesso.");

    console.log("🔄 Sincronizando tabela agrupamentos...");
    await Agrupamento.sync({ alter: true });
    console.log("✅ Tabela sincronizada.");

    console.log("🔄 Limpando dados antigos...");
    await Agrupamento.destroy({ where: {}, truncate: true });
    console.log("✅ Dados antigos removidos.");

    console.log("🔄 Inserindo agrupamentos...");
    for (const agrupamento of agrupamentosData) {
      await Agrupamento.create(agrupamento);
      console.log(`   ✅ Inserido: ${agrupamento.name}`);
    }

    console.log("\n🎉 Agrupamentos populados com sucesso!");
    console.log(
      `📊 Total de agrupamentos inseridos: ${agrupamentosData.length}`,
    );

    // Verifica os dados inseridos
    const count = await Agrupamento.count();
    console.log(`\n🔍 Verificação: ${count} agrupamentos na tabela`);

    const todos = await Agrupamento.findAll({ limit: 1000 });
    console.log("\n📋 Agrupamentos cadastrados:");
    todos.forEach((ag) => {
      const subgrupos = JSON.parse(ag.subgrupos || "[]");
      console.log(`   - ${ag.name} (${subgrupos.length} subgrupos)`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao popular agrupamentos:", error);
    process.exit(1);
  }
}

// Executa a função
popularAgrupamentos();
