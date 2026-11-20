"use strict";
// Idempotente: cria apenas a tabela nova, sem sync/alter do restante do ERP.
const { sequelize } = require("../models/Cliente");
require("../services/layoutCaixa")
  .modelo(sequelize)
  .sync()
  .then(() => console.log("Preferências de caixa preparadas."))
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
    process.exit(process.exitCode || 0);
  });
