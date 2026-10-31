const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const BackupEmpresa = sequelize.define(
    "BackupEmpresa",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      empresa_painel_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      empresa_sistema_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      data_referencia: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: "Data a que o backup se refere (dia anterior)",
      },
      caminho_arquivo: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      tamanho_bytes: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      tabelas_salvas: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      registros_totais: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      status: {
        type: DataTypes.ENUM("COMPLETO", "ERRO", "RESTAURADO"),
        allowNull: false,
        defaultValue: "COMPLETO",
      },
      observacao: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
    },
    {
      tableName: "backups_empresa",
      timestamps: true,
      indexes: [
        {
          fields: ["empresa_painel_id", "data_referencia"],
          unique: true,
        },
      ],
    },
  );

  return BackupEmpresa;
};
