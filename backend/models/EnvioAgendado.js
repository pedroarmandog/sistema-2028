/**
 * Model: EnvioAgendado
 * Fila de mensagens a serem enviadas automaticamente.
 * Cada registro representa um envio pendente/em progresso/concluído.
 */
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const EnvioAgendado = sequelize.define(
    "EnvioAgendado",
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
      // FK para MensagemAutomatica (null para campanhas manuais do disparador)
      mensagemAutomaticaId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
      },
      // Número de destino (formato: 5527999104837)
      telefoneDestino: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      // Texto final já com variáveis substituídas
      conteudoFinal: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      // Caminho da imagem a enviar (opcional)
      imagemPath: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      // Status do envio
      status: {
        type: DataTypes.ENUM(
          "pendente",
          "enviando",
          "enviado",
          "erro",
          "cancelado",
        ),
        defaultValue: "pendente",
      },
      // Data/hora programada para envio
      dataAgendada: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      // Data/hora do envio efetivo
      dataEnvio: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      // Número de tentativas
      tentativas: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      // Dados de contexto para referência (JSON: clienteId, petId, agendamentoId)
      contexto: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      // Mensagem de erro, se houver
      erroMensagem: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "envios_agendados",
      timestamps: true,
      indexes: [
        { fields: ["status", "dataAgendada"] },
        { fields: ["empresaId"] },
      ],
    },
  );

  return EnvioAgendado;
};
