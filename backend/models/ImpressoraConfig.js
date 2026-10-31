const { DataTypes } = require("sequelize");
const { sequelize } = require("./Cliente");

const ImpressoraConfig = sequelize.define(
  "ImpressoraConfig",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tipo: { type: DataTypes.STRING(64), allowNull: false },
    usuario: { type: DataTypes.STRING(128), allowNull: true },
  },
  {
    tableName: "impressora_config",
    timestamps: true,
  },
);

module.exports = ImpressoraConfig;
