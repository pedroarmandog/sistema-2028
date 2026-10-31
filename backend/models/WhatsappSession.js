/**
 * Model: WhatsappSession
 * Armazena sessões ativas do WhatsApp por empresa (preparado para SaaS).
 * NÃO usa localStorage — persistência exclusivamente no banco.
 */
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const WhatsappSession = sequelize.define(
    "WhatsappSession",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      // ID da empresa (futura expansão SaaS)
      empresaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      // Nome da instância (ex: 'Instância Sala 1')
      nome: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      // Número sequencial por empresa (ex: 1, 2, 3...) — resetado por empresa
      numeroOrdem: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      // Número conectado (ex: 5527999104837)
      numero: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      // Status da sessão
      status: {
        type: DataTypes.ENUM(
          "desconectado",
          "aguardando_qr",
          "conectado",
          "erro",
        ),
        defaultValue: "desconectado",
      },
      // Dados da sessão serializados (LocalAuth salva no FS, este campo é auxiliar)
      sessionData: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      // Timestamp da última conexão bem-sucedida
      ultimaConexao: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "whatsapp_sessions",
      timestamps: true,
    },
  );

  return WhatsappSession;
};
