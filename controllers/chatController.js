// controllers/chatController.js
const messageService = require("../services/messageService");

// Render chat page
exports.getChatPage = (req, res) => {
    return res.render("chat", {
        title: "Chat Room",
        path: "/chat",
        firstName: req.session.user.firstName,
        lastName: req.session.user.lastName,
        email: req.session.user.email,
        user: req.session.user,
        tabId: req.session.tabId,
    });
};

// API: Get messages (JSON) + DB search
exports.getMessages = async (req, res) => {
    const search = String(req.query.search || "").trim();
    const messages = await messageService.getMessages(search);
    return res.json({ messages });
};

// API: Post new message
exports.postMessage = async (req, res) => {
    const text = String(req.body?.text || "").trim();
    if (!text) return res.redirect("/chat?error=empty");

    await messageService.createMessage(req.session.user.id, text);

    return res.redirect("/chat");
};


// API: Delete message
exports.deleteMessage = async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.redirect("/chat?error=missing");

    const deleted = await messageService.deleteMessage(id, req.session.user.id);
    if (!deleted) return res.redirect("/chat?error=notallowed");

    return res.redirect("/chat");
};

// API: Edit message
exports.updateMessage = async (req, res) => {
    const id = Number(req.params.id);
    const text = String(req.body?.text || "").trim();

    if (!id) return res.status(400).json({ error: "Missing message id" });
    if (!text) return res.status(400).json({ error: "Empty message" });

    const updated = await messageService.updateMessage(id, req.session.user.id, text);
    if (!updated) return res.status(403).json({ error: "Not allowed" });

    return res.json({ success: true });
};
