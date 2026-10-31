const { DataTypes } = require("sequelize");
const { sequelize } = require("./Cliente");

const Profissional = sequelize.define(
  "Profissional",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    codigo: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tipoPessoa: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cpf: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    rg: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dataNascimento: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sexo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cep: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    endereco: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    numero: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    complemento: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bairro: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cidade: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    proximidade: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    telefone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tags: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    funcoes: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    especialidade: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    crmv: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("ativo", "inativo"),
      allowNull: false,
      defaultValue: "ativo",
    },
    comissao: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    perfilComissao: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    assinatura: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "profissionais",
    timestamps: true,
  },
);

module.exports = { Profissional, sequelize };
