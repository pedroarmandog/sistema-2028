const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
    const Usuario = sequelize.define('Usuario', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nome: {
            type: DataTypes.STRING,
            allowNull: false
        },
        usuario: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        senha: {
            type: DataTypes.STRING,
            allowNull: false
        },
        grupoUsuario: {
            type: DataTypes.STRING,
            allowNull: true
        },
        profissionalId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        ativo: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        setorPadraoId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        setorPadraoNome: {
            type: DataTypes.STRING,
            allowNull: true
        },
        acessoValor: {
            type: DataTypes.STRING,
            allowNull: true
        },
        permissoes: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: []
        },
        empresas: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: []
        },
        preferencias: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: null
        }
    }, {
        tableName: 'usuarios',
        timestamps: true,
        hooks: {
            beforeCreate: async (usuario) => {
                if (usuario.senha) {
                    const salt = await bcrypt.genSalt(10);
                    usuario.senha = await bcrypt.hash(usuario.senha, salt);
                }
            },
            beforeUpdate: async (usuario) => {
                if (usuario.changed('senha')) {
                    const salt = await bcrypt.genSalt(10);
                    usuario.senha = await bcrypt.hash(usuario.senha, salt);
                }
            }
        }
    });

    return Usuario;
};
