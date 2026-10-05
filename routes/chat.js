// routes/chat.js
const express = require("express");
const router = express.Router();

const chatController = require("../controllers/chatController");
const loginController = require("../controllers/loginController");
const { requireAuthPage, requireAuthApi } = require("../middlewares/auth.js");

// Login: form action="/chat" method="POST"
router.post("/", loginController.postLogin);

// Chat page
router.get("/", requireAuthPage, chatController.getChatPage);

// Chat APIs
router.get("/messages", requireAuthApi, chatController.getMessages);
// Add message (FORM, no fetch)
router.post("/message", requireAuthPage, chatController.postMessage);

// Delete message (FORM, no fetch)
router.post("/messages/:id/delete", requireAuthPage, chatController.deleteMessage);

// Edit message (FETCH API)
router.post("/messages/:id/edit", requireAuthApi, chatController.updateMessage);

module.exports = router;
