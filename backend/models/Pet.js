const { DataTypes } = require("sequelize");
const { sequelize } = require("./Cliente");

const Pet = sequelize.define(
  "Pet",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Nome do pet é obrigatório",
        },
        len: {
          args: [1, 100],
          msg: "Nome deve ter entre 1 e 100 caracteres",
        },
      },
    },
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Clientes",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    raca: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    genero: {
      type: DataTypes.ENUM("Macho", "Fêmea"),
      allowNull: true,
    },
    porte: {
      type: DataTypes.ENUM("Pequeno", "Médio", "Grande", "Gigante"),
      allowNull: true,
    },
    pelagem: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    data_nascimento: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    chip: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    pedigree_rg: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    alimentacao: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tags: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    alergias: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    observacao: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    foto_url: {
      type: DataTypes.TEXT("medium"),
      allowNull: true,
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "pets",
    timestamps: true,
    indexes: [
      {
        name: "idx_pet_cliente",
        fields: ["cliente_id"],
      },
      {
        name: "idx_pet_nome",
        fields: ["nome"],
      },
    ],
  },
);

// Definir associações
Pet.associate = function (models) {
  Pet.belongsTo(models.Cliente, {
    foreignKey: "cliente_id",
    as: "cliente",
  });
};

module.exports = Pet;
