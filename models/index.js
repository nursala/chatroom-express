// models/index.js
const { Sequelize } = require("sequelize");

const DB_NAME = process.env.DB_NAME || "mydb";
const DB_USER = process.env.DB_USER || "root";
const DB_PASS = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST || "127.0.0.1";
const DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    dialect: "mariadb",
    port: DB_PORT,
    logging: false,
});

module.exports = sequelize;
