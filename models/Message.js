// models/Message.js
const { DataTypes } = require("sequelize");
const sequelize = require("./index");

const Message = sequelize.define(
    "Message",
    {
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
    },
    {
        paranoid: true,
    }
);

module.exports = Message;
