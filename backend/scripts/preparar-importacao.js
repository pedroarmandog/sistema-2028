// Cria somente as três tabelas novas usadas pela importação.
process.env.NODE_ENV ||= "production";
require("dotenv").config({
  path: require("node:path").resolve(__dirname, "../../.env"),
});
const { sequelize, preparar } = require("../services/importacao/modelos");
preparar()
  .then(() => console.log("Tabelas de importação prontas."))
  .catch((e) => {
    console.error(
      "Não foi possível preparar as tabelas de importação:",
      e.message,
    );
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
