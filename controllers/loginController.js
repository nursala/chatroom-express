// controllers/loginController.js
const userService = require("../services/userService");
const messageService = require("../services/messageService");
const bcrypt = require("bcrypt");

exports.getLogin = (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect("/chat");
    }

    let error = null;
    let successMessage = null;

    if (req.query.error === "login") error = "Invalid email or password";
    else if (req.query.error === "missing") error = "Please enter email and password";
    else if (req.query.error === "session") error = "You logged in from another tab. Please login again.";

    if (req.query.success === "registered") {
        successMessage = "Registration completed successfully! You can login now.";
    }

    return res.render("index", {
        title: "Login",
        error,
        successMessage,
        loggedUser: req.session.user || null,
    });
};

exports.postLogin = async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "").trim();

    // tabId from login page
    let tabId = String(req.body.tabId || "").trim();
    if (!tabId) tabId = "server_" + Date.now();

    if (!email || !password) return res.redirect("/?error=missing");

    const user = await userService.findUserByEmail(email);
    if (!user) return res.redirect("/?error=login");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.redirect("/?error=login");

    // keep old user (if switching accounts) BEFORE regenerate
    const oldUser = req.session?.user || null;

    req.session.regenerate(async (err) => {
        if (err) return res.redirect("/?error=session");

        try {
            req.session.user = {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
            };

            req.session.tabId = tabId;

            if (oldUser && oldUser.email && oldUser.email !== user.email) {
                const oldName = oldUser.firstName || oldUser.email;
                await messageService.createSystemMessage(`${oldName} has left the chat`);
            }

            await messageService.createSystemMessage(`${user.firstName} has joined the chat`);

            return res.redirect("/chat");
        } catch (e) {
            return res.redirect("/?error=session");
        }
    });
};