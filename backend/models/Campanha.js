const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Campanha = sequelize.define(
    "Campanha",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      empresaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      nome: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      mensagemTemplate: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      imagemPath: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(
          "draft",
          "pronta",
          "rodando",
          "pausada",
          "finalizada",
        ),
        defaultValue: "draft",
      },
      configuracao: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      tableName: "campanhas",
      timestamps: true,
    },
  );

  return Campanha;
};
