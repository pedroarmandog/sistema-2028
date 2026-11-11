const { DataTypes } = require("sequelize");
const { sequelize } = require("../../models/Cliente");
const Centro = sequelize.define(
  "CentroImportacao",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    empresa_id: { type: DataTypes.INTEGER, allowNull: false },
    descricao: { type: DataTypes.STRING(256), allowNull: false },
    slug: { type: DataTypes.STRING(128), allowNull: false },
    unidade: { type: DataTypes.STRING(256), defaultValue: "" },
  },
  {
    tableName: "centros_resultado_empresa",
    indexes: [{ unique: true, fields: ["empresa_id", "slug"] }],
  },
);
const Lote = sequelize.define(
  "ImportacaoLote",
  {
    id: { type: DataTypes.STRING(36), primaryKey: true },
    empresa_id: { type: DataTypes.INTEGER, allowNull: false },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo: { type: DataTypes.STRING(16), allowNull: false },
    dados: { type: DataTypes.TEXT("long"), allowNull: false },
    resultado: DataTypes.TEXT("long"),
    expira: { type: DataTypes.DATE, allowNull: false },
  },
  { tableName: "importacoes_lotes" },
);
const Linha = sequelize.define(
  "ImportacaoLinha",
  {
    empresa_id: { type: DataTypes.INTEGER, primaryKey: true },
    tipo: { type: DataTypes.STRING(16), primaryKey: true },
    hash: { type: DataTypes.STRING(64), primaryKey: true },
    registro: { type: DataTypes.STRING(64), allowNull: false },
  },
  { tableName: "importacoes_linhas" },
);
let preparando;
function preparar() {
  preparando ??= Centro.sync()
    .then(() => Lote.sync())
    .then(() => Linha.sync())
    .catch((e) => {
      preparando = null;
      throw e;
    });
  return preparando;
}
module.exports = { sequelize, Centro, Lote, Linha, preparar };
