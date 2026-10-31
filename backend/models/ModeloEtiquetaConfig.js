const { DataTypes } = require("sequelize");
const { sequelize } = require("./Cliente");

const ModeloEtiquetaConfig = sequelize.define(
  "ModeloEtiquetaConfig",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    modelo: { type: DataTypes.STRING(255), allowNull: false },
    usuario: { type: DataTypes.STRING(128), allowNull: true },
  },
  {
    tableName: "modelo_etiqueta_config",
    timestamps: true,
  },
);

module.exports = ModeloEtiquetaConfig;
