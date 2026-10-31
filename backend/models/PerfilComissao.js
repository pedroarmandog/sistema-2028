const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PerfilComissao = sequelize.define(
    "PerfilComissao",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      perfilVendedor: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      descricao: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      percentual: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      tipo: {
        type: DataTypes.ENUM("produto", "vendedor"),
        allowNull: true,
        defaultValue: "vendedor",
      },
      empresa_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "perfis_comissao",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["perfilVendedor", "tipo", "empresa_id"],
        },
      ],
    },
  );

  return PerfilComissao;
};
