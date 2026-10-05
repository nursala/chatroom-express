// models/associations.js
const User = require("./User");
const Message = require("./Message");

User.hasMany(Message, { foreignKey: "userId", onDelete: "CASCADE" });
Message.belongsTo(User, { foreignKey: "userId" });

module.exports = { User, Message };
