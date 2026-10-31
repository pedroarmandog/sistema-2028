const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const EmpresaPainel = sequelize.define(
    "EmpresaPainel",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      razao_social: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      nome_fantasia: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      cnpj: {
        type: DataTypes.STRING(18),
        allowNull: false,
        unique: true,
      },
      cep: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      endereco: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: { isEmail: true },
      },
      telefone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      foto: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      logo: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      data_adesao: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      status: {
        type: DataTypes.ENUM("ATIVO", "VENCIDO", "BLOQUEADO"),
        allowNull: false,
        defaultValue: "ATIVO",
      },
      valor_mensalidade: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      data_vencimento: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      intervalo_dias: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 30,
      },
      proxima_cobranca: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      limite_acessos: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3,
      },
    },
    {
      tableName: "empresas_painel",
      timestamps: true,
    },
  );

  return EmpresaPainel;
};
