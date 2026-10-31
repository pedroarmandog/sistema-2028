const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const UserFilter = sequelize.define('UserFilter', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        usuarioId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        pagina: {
            type: DataTypes.STRING,
            allowNull: false
        },
        filtros: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: {}
        }
    }, {
        tableName: 'user_filters',
        timestamps: true
    });

    return UserFilter;
};
