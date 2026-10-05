// middlewares/auth.js

function requireAuthPage(req, res, next) {
    if (!req.session.user) return res.redirect("/?error=session");
    next();
}

function requireAuthApi(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: "session ended" });
    }

    const tabId = String(req.get("x-tab-id") || "");

    // First time: lock the session to a tab
    if (!req.session.tabId) {
        req.session.tabId = tabId || ("server_" + Date.now());
        return next();
    }

    if (!tabId || tabId !== req.session.tabId) {
        return res.status(401).json({ error: "logged in from another tab" });
    }

    next();
}

module.exports = { requireAuthPage, requireAuthApi };
