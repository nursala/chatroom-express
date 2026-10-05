// models/User.js
const { DataTypes } = require("sequelize");
const sequelize = require("./index");

const User = sequelize.define("User", {
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
    },
    firstName: {
        type: DataTypes.STRING(80),
        allowNull: false,
    },
    lastName: {
        type: DataTypes.STRING(80),
        allowNull: false,
    },
    passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
});

module.exports = User;
