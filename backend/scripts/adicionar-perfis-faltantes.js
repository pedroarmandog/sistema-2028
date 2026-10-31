// Usar instância central do Sequelize (evita abrir novas conexões manuais)
const { sequelize } = require("../models/Cliente");
const { QueryTypes } = require("sequelize");

async function adicionarPerfisFaltantes() {
  try {
    console.log("🔍 Verificando perfis existentes...");

    // Verificar se ASSINATURA existe
    const [assinatura] = await sequelize.query(
      "SELECT * FROM perfis_comissao WHERE perfilVendedor = ?",
      { replacements: ["ASSINATURA"], type: QueryTypes.SELECT },
    );

    if (!assinatura) {
      await sequelize.query(
        "INSERT INTO perfis_comissao (perfilVendedor, descricao, percentual, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())",
        {
          replacements: [
            "ASSINATURA",
            "Perfil de comissão para assinaturas",
            0.0,
          ],
        },
      );
      console.log("✅ Perfil ASSINATURA inserido");
    } else {
      console.log("ℹ️  Perfil ASSINATURA já existe");
    }

    // Verificar se teste existe
    const [teste] = await sequelize.query(
      "SELECT * FROM perfis_comissao WHERE perfilVendedor = ?",
      { replacements: ["teste"], type: QueryTypes.SELECT },
    );

    if (!teste) {
      await sequelize.query(
        "INSERT INTO perfis_comissao (perfilVendedor, descricao, percentual, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())",
        { replacements: ["teste", "Perfil de teste", 0.0] },
      );
      console.log("✅ Perfil teste inserido");
    } else {
      console.log("ℹ️  Perfil teste já existe");
    }

    // Listar todos os perfis
    const [rows] = await sequelize.query(
      "SELECT * FROM perfis_comissao ORDER BY perfilVendedor ASC",
    );
    console.log("\n📊 Total de perfis:", rows.length);
    rows.forEach((r) => {
      console.log(
        `  - ${r.perfilVendedor} (ID: ${r.id}, Percentual: ${r.percentual}%)`,
      );
    });
  } catch (error) {
    console.error("❌ Erro:", error.message);
  } finally {
    try {
      await sequelize.close();
    } catch (e) {}
  }
}

adicionarPerfisFaltantes();
