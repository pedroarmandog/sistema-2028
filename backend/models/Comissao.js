const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Comissao = sequelize.define(
    "Comissao",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      perfilProduto: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: "Nome do perfil de produto",
      },
      perfilVendedor: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: "Nome do perfil de vendedor/fornecedor",
      },
      percentual: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        comment: "Percentual de comissão",
      },
      empresa_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "comissoes",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["perfilProduto", "perfilVendedor", "empresa_id"],
        },
      ],
    },
  );

  return Comissao;
};
