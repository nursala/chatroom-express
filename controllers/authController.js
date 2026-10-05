// controllers/authController.js
const messageService = require("../services/messageService");

exports.logout = async (req, res) => {
    const user = req.session?.user;

    if (user) {
        const name = user.firstName || user.email || "User";
        try {
            await messageService.createSystemMessage(`${name} has left the chat`);
        } catch (err) {
            console.error("Logout system message failed", err);
        }
    }

    const error = req.query?.error ? `?error=${encodeURIComponent(req.query.error)}` : "";

    //Ensure redirect happens even if session is missing
    if (req.session) {
        req.session.destroy(() => {
            res.redirect("/" + error);
        });
    } else {
        res.redirect("/" + error);
    }
};