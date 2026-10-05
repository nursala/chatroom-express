// services/userService.js
const User = require("../models/User");

// Find a user by email (case-insensitive)
async function findUserByEmail(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    return await User.findOne({ where: { email: normalizedEmail } });
}

// Create a new user
async function createUser({ email, firstName, lastName, passwordHash }) {
    return await User.create({
        email: String(email || "").trim().toLowerCase(),
        firstName: String(firstName || "").trim(),
        lastName: String(lastName || "").trim(),
        passwordHash: String(passwordHash || "").trim(),
    });
}

module.exports = {
    findUserByEmail,
    createUser,
};
