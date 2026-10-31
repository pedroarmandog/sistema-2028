const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Empresa = sequelize.define(
    "Empresa",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      nome: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      razaoSocial: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      cnpj: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      inscricaoEstadual: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      inscricaoMunicipal: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      credenciamento: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      regime: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      telefone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      telefone2: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      telefonePlantao: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      endereco: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      logo: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      },
      ultimaChavePix: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ativa: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      // ── Campos Fiscais ─────────────────────────────────────────────────────
      // Adicionados em 2026-08-01 para preparação do módulo fiscal.
      // Todos allowNull: true — retrocompatível com registros existentes.
      cnae: {
        type: DataTypes.STRING(7),
        allowNull: true,
        comment: "Classificação Nacional de Atividades Econômicas (7 dígitos)",
      },
      crt: {
        type: DataTypes.CHAR(1),
        allowNull: true,
        comment:
          "Código de Regime Tributário: 1=Simples Nacional, 2=Simples Excesso, 3=Normal",
      },
      codigo_ibge_municipio: {
        type: DataTypes.STRING(7),
        allowNull: true,
        comment: "Código IBGE do município — obrigatório para NF-e e NFS-e",
      },
      pais: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: "Brasil",
      },
      codigo_pais: {
        type: DataTypes.CHAR(4),
        allowNull: true,
        defaultValue: "1058",
        comment: "Código do país conforme tabela SEFAZ (1058 = Brasil)",
      },
    },
    {
      tableName: "empresas",
      timestamps: true,
    },
  );

  return Empresa;
};
