const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Contato = sequelize.define(
    "Contato",
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
      campanhaId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      nome: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      numero: {
        type: DataTypes.STRING(40),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("pendente", "enviado", "erro", "pausado"),
        defaultValue: "pendente",
      },
      meta: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      tableName: "contatos_campanha",
      timestamps: true,
    },
  );

  return Contato;
};
