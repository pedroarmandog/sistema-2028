// migrate.js
const { Sequelize } = require("sequelize");

// Banco LOCAL — carregar credenciais do .env
require("dotenv").config();
const localDB = new Sequelize(
  process.env.LOCAL_DB_NAME || "petshop",
  process.env.LOCAL_DB_USER || "root",
  process.env.LOCAL_DB_PASSWORD,
  {
    host: process.env.LOCAL_DB_HOST || "localhost",
    dialect: "mysql",
    logging: false,
  },
);

// Banco REMOTO Clever Cloud
const remoteDB = new Sequelize("DB_NAME", "DB_USER", "DB_PASSWORD", {
  host: "DB_HOST",
  dialect: "mysql",
  port: 3306,
  logging: false,
});

async function migrateTable(tableName) {
  console.log(`Migrando tabela: ${tableName}`);
  try {
    // Pegar todos os dados da tabela local
    const [rows] = await localDB.query(`SELECT * FROM ${tableName}`);

    if (rows.length === 0) {
      console.log(`Tabela ${tableName} está vazia.`);
      return;
    }

    // Limpar a tabela no banco remoto
    await remoteDB.query(`DELETE FROM ${tableName}`);

    // Inserir dados no banco remoto
    for (const row of rows) {
      const columns = Object.keys(row)
        .map((col) => `\`${col}\``)
        .join(", ");
      const values = Object.values(row)
        .map((val) =>
          val === null ? "NULL" : `'${val.toString().replace(/'/g, "''")}'`,
        )
        .join(", ");

      await remoteDB.query(
        `INSERT INTO ${tableName} (${columns}) VALUES (${values})`,
      );
    }

    console.log(`Tabela ${tableName} migrada com sucesso!`);
  } catch (err) {
    console.error(`Erro ao migrar tabela ${tableName}:`, err);
  }
}

async function migrateAll() {
  try {
    await localDB.authenticate();
    await remoteDB.authenticate();
    console.log("Conexão com bancos local e remoto OK ✅");

    // Liste aqui todas as tabelas que quer migrar
    const tables = [
      "clientes",
      "pets",
      "itens",
      "agrupamentos",
      "centros",
      "vendas",
      "agendamentos",
    ];

    for (const table of tables) {
      await migrateTable(table);
    }

    console.log("Migração concluída! 🎉");
    process.exit(0);
  } catch (err) {
    console.error("Erro de conexão:", err);
    process.exit(1);
  }
}

migrateAll();
