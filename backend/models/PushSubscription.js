const { DataTypes } = require("sequelize");

/**
 * PushSubscription — armazena subscriptions Web Push por usuário/dispositivo.
 * Cada usuário pode ter múltiplas subscriptions (vários dispositivos).
 * Isolamento multi-tenant via empresa_id.
 */
module.exports = (sequelize) => {
  const PushSubscription = sequelize.define(
    "PushSubscription",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      empresa_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      // Endpoint da subscription (URL do push service)
      // VARCHAR(500) em vez de TEXT para permitir índice único no MySQL
      endpoint: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      // Chaves de criptografia (auth + p256dh) — armazenadas como JSON
      keys: {
        type: DataTypes.TEXT,
        allowNull: false,
        get() {
          const raw = this.getDataValue("keys");
          if (!raw) return null;
          try {
            return JSON.parse(raw);
          } catch (_) {
            return null;
          }
        },
        set(value) {
          this.setDataValue("keys", value ? JSON.stringify(value) : null);
        },
      },
      // Plataforma do dispositivo
      plataforma: {
        type: DataTypes.ENUM("android", "ios", "desktop"),
        defaultValue: "android",
      },
      // Preferências de notificação — quais eventos o usuário quer receber
      preferencias: {
        type: DataTypes.TEXT,
        defaultValue: JSON.stringify({
          novo_agendamento: true,
          checkin_pet: true,
          servico_concluido: true,
          nova_venda: true,
          pagamento_recebido: true,
          checkout: true,
          cancelamento: true,
          meta_atingida: true,
          estoque_baixo: false,
          novo_cliente: false,
        }),
        get() {
          const raw = this.getDataValue("preferencias");
          if (!raw) return null;
          try {
            return JSON.parse(raw);
          } catch (_) {
            return null;
          }
        },
        set(value) {
          this.setDataValue(
            "preferencias",
            value ? JSON.stringify(value) : null,
          );
        },
      },
      // Flag para desativar sem deletar
      ativo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      // Data da última entrega bem-sucedida
      ultimo_uso: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "push_subscriptions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        // Busca por empresa (para envio em massa)
        { fields: ["empresa_id", "ativo"] },
        // Busca por usuário
        { fields: ["usuario_id", "ativo"] },
        // Único por endpoint (um dispositivo = uma subscription)
        {
          unique: true,
          fields: ["endpoint"],
          name: "push_subscriptions_endpoint_unique",
        },
      ],
    },
  );

  return PushSubscription;
};
