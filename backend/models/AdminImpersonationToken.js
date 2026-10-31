const { DataTypes } = require("sequelize");
const crypto = require("crypto");

module.exports = (sequelize) => {
  const AdminImpersonationToken = sequelize.define(
    "AdminImpersonationToken",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      token: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true,
      },
      admin_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      empresa_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      usado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      expira_em: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: "admin_impersonation_tokens",
      timestamps: true,
    },
  );

  /**
   * Gera um token seguro de uso único para impersonação.
   */
  AdminImpersonationToken.gerarToken = async function ({
    adminId,
    empresaId,
    usuarioId,
  }) {
    const token = crypto.randomBytes(48).toString("hex");
    const expiraEm = new Date(Date.now() + 60 * 1000); // expira em 60 segundos
    return AdminImpersonationToken.create({
      token,
      admin_id: adminId,
      empresa_id: empresaId,
      usuario_id: usuarioId,
      expira_em: expiraEm,
    });
  };

  return AdminImpersonationToken;
};
