// services/messageService.js
const { Op } = require("sequelize");
const Message = require("../models/Message");
const User = require("../models/User");

const SYSTEM_EMAIL = "system@chat.com";
const SYSTEM_FIRST = "System";
const SYSTEM_LAST = "User";

// Map DB message to frontend format
function mapDbMessageToUi(row) {
    const user = row?.User || {};
    const senderEmail = user.email || SYSTEM_EMAIL;
    const senderName = user.firstName || SYSTEM_FIRST;

    const createdAt = row?.createdAt instanceof Date ? row.createdAt : new Date(row?.createdAt);
    const updatedAt = row?.updatedAt instanceof Date ? row.updatedAt : new Date(row?.updatedAt);

    const isEdited =
        row?.updatedAt && row?.createdAt && updatedAt.getTime() !== createdAt.getTime();

    return {
        id: row.id,
        senderEmail,
        senderName,
        text: row.content,
        date: row.createdAt,
        isEdited,
        type: senderEmail === SYSTEM_EMAIL ? "system" : "user",
    };
}

function getLikeOperator() {
    const dialect = Message.sequelize.getDialect();
    return dialect === "postgres" ? Op.iLike : Op.like;
}

// Get all messages (with optional DB search)
async function getMessages(search = "") {
    const q = String(search || "").trim();
    const likeOp = getLikeOperator();

    const where = q
        ? {
            [Op.or]: [
                { content: { [likeOp]: `%${q}%` } },
                { "$User.email$": { [likeOp]: `%${q}%` } },
                { "$User.firstName$": { [likeOp]: `%${q}%` } },
                { "$User.lastName$": { [likeOp]: `%${q}%` } },
            ],
        }
        : undefined;

    const rows = await Message.findAll({
        where,
        include: [{ model: User, attributes: ["firstName", "lastName", "email"] }],
        order: [["createdAt", "ASC"]],
    });

    return rows.map(mapDbMessageToUi);
}

// Ensure system user exists
async function getOrCreateSystemUser() {
    const [systemUser] = await User.findOrCreate({
        where: { email: SYSTEM_EMAIL },
        defaults: {
            firstName: SYSTEM_FIRST,
            lastName: SYSTEM_LAST,
            // Not used for login; just required by schema (must be non-null)
            passwordHash: "__system__",
        },
    });

    return systemUser;
}

async function createAndFetchMessage(userId, text) {
    const content = String(text || "").trim();

    const msg = await Message.create({ userId, content });

    const fullRow = await Message.findByPk(msg.id, {
        include: [{ model: User, attributes: ["firstName", "lastName", "email"] }],
    });

    return mapDbMessageToUi(fullRow);
}

async function createSystemMessage(text) {
    const systemUser = await getOrCreateSystemUser();
    return await createAndFetchMessage(systemUser.id, text);
}

async function createMessage(userId, text) {
    return await createAndFetchMessage(userId, text);
}

// Delete message (only owner can delete)
async function deleteMessage(messageId, userId) {
    const deleted = await Message.destroy({
        where: { id: messageId, userId },
    });

    return deleted > 0;
}

// Update message (only owner can update)
async function updateMessage(messageId, userId, newText) {
    const content = String(newText || "").trim();

    const [updated] = await Message.update(
        { content },
        { where: { id: messageId, userId } }
    );

    return updated > 0;
}

module.exports = {
    getMessages,
    createSystemMessage,
    createMessage,
    deleteMessage,
    updateMessage,
};
