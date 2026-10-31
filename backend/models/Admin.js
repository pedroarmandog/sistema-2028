const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");

module.exports = (sequelize) => {
  const Admin = sequelize.define(
    "Admin",
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
      sobrenome: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      senha: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      cpf: {
        type: DataTypes.STRING(14),
        allowNull: false,
        unique: true,
      },
      telefone: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      foto: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "admins",
      timestamps: true,
      hooks: {
        beforeCreate: async (admin) => {
          if (admin.senha) {
            const salt = await bcrypt.genSalt(12);
            admin.senha = await bcrypt.hash(admin.senha, salt);
          }
        },
        beforeUpdate: async (admin) => {
          if (admin.changed("senha")) {
            const salt = await bcrypt.genSalt(12);
            admin.senha = await bcrypt.hash(admin.senha, salt);
          }
        },
      },
    },
  );

  // Método para comparar senha
  Admin.prototype.validarSenha = async function (senha) {
    return bcrypt.compare(senha, this.senha);
  };

  return Admin;
};
