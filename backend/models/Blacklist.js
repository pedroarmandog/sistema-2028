const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Blacklist = sequelize.define(
    "Blacklist",
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
      numero: {
        type: DataTypes.STRING(40),
        allowNull: false,
      },
      motivo: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
    },
    {
      tableName: "blacklist_disparador",
      timestamps: true,
    },
  );

  return Blacklist;
};
