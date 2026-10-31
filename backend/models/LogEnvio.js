/**
 * Model: LogEnvio
 * Registro de auditoria de todos os envios realizados.
 * Permite rastrear sucesso, falha e histórico completo.
 */
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const LogEnvio = sequelize.define(
    "LogEnvio",
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
      // FK para EnvioAgendado
      envioAgendadoId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      // Tipo do evento
      evento: {
        type: DataTypes.ENUM(
          "envio_iniciado",
          "envio_sucesso",
          "envio_erro",
          "qr_gerado",
          "conectado",
          "desconectado",
          "mensagem_ativada",
          "mensagem_desativada",
        ),
        allowNull: false,
      },
      // Informações adicionais (JSON)
      detalhes: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      // Mensagem de descrição
      mensagem: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "logs_envio",
      timestamps: true,
      indexes: [{ fields: ["empresaId", "createdAt"] }, { fields: ["evento"] }],
    },
  );

  return LogEnvio;
};
