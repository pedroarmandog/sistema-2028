"use strict";
// Diagnóstico somente leitura. Não inicializa WhatsApp, filas ou o servidor HTTP.
const { sequelize } = require("../models/Cliente");
const Entrada = require("../models/Entrada");
async function diagnosticar() {
  const schema = await sequelize
    .getQueryInterface()
    .describeTable(Entrada.getTableName());
  const keys = new Set(Object.keys(schema).map((k) => k.toLowerCase()));
  const financeiros = [
    "id",
    "empresa_id",
    "valorTotal",
    "dataEntrada",
    "situacao",
    "pagamentos",
    "dataPagamento",
  ];
  const ausentes = financeiros.filter(
    (k) => !keys.has((Entrada.rawAttributes[k]?.field || k).toLowerCase()),
  );
  console.log("COMMIT:", process.env.RENDER_GIT_COMMIT || "ambiente local");
  console.log(
    "Campos financeiros ausentes:",
    ausentes.length ? ausentes.join(", ") : "nenhum",
  );
  const flag = keys.has("estoqueprocessado");
  console.log(
    "Coluna estoqueProcessado:",
    flag
      ? "presente"
      : "ausente — o SELECT completo antigo pode falhar; o módulo financeiro corrigido não depende desta coluna",
  );
  if (ausentes.length)
    throw Error(
      "Schema financeiro incompleto. Confira a migration existente antes de publicar.",
    );
  // Valida o SELECT sem retornar documentos nem informações das empresas.
  await Entrada.findAll({
    attributes: await require("../services/contasPagar")
      .criar({ Entrada })
      .atributos(true),
    where: { id: -1 },
    limit: 1,
  });
  console.log(
    "Consulta financeira compatível: OK. Nenhum registro foi alterado.",
  );
}
if (require.main === module)
  diagnosticar()
    .catch((e) => {
      console.error(
        "Diagnóstico:",
        e.original?.code || e.code || "ERRO",
        e.message,
      );
      process.exitCode = 1;
    })
    .finally(async () => {
      await sequelize.close();
      process.exit(process.exitCode || 0);
    });
module.exports = { diagnosticar };
