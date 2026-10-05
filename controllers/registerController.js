// controllers/registerController.js
const userService = require("../services/userService");
const bcrypt = require("bcrypt");

const TIMEOUT_REGISTER = 30 * 1000; // 30 seconds

function readJsonCookie(req, key) {
    const raw = req.cookies?.[key];
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function clearDraft(res) {
    res.clearCookie("registerDraft");
}

function getDraftFromCookie(req, res) {
    const draft = readJsonCookie(req, "registerDraft");
    if (!draft) return null;

    if (!draft.expiresAt || Date.now() > Number(draft.expiresAt)) {
        clearDraft(res);
        return null;
    }

    return draft;
}

function setDraftCookie(res, draft) {
    res.cookie("registerDraft", JSON.stringify(draft), {
        maxAge: TIMEOUT_REGISTER,
        httpOnly: true,
        sameSite: "lax",
    });
}

exports.getRegister = (req, res) => {
    const draft = getDraftFromCookie(req, res);

    return res.render("register", {
        title: "Register",
        error: null,
        draft,
    });
};

exports.postRegister = async (req, res) => {
    const action = String(req.body.action || "").trim();

    // Step 1: AJAX email check
    if (action === "checkEmail") {
        const firstName = String(req.body.firstName || "").trim();
        const lastName = String(req.body.lastName || "").trim();
        const email = String(req.body.email || "").trim().toLowerCase();

        // trim requirement: spaces-only is empty
        if (!firstName || !lastName || !email) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const existing = await userService.findUserByEmail(email);
        if (existing) {
            return res.status(409).json({ error: "Email already exists" });
        }

        const draft = {
            firstName,
            lastName,
            email,
            expiresAt: Date.now() + TIMEOUT_REGISTER,
        };

        setDraftCookie(res, draft);
        return res.json({ success: true });
    }

    // Validate that the draft is still alive (back button / client check)
    if (action === "checkDraft") {
        const draft = getDraftFromCookie(req, res);
        if (!draft) {
            return res.json({
                valid: false,
                error: "You took more than 30 seconds. Please enter your name and email again.",
            });
        }
        return res.json({ valid: true });
    }

    // Step 2: Final submit (create user)
    const draft = getDraftFromCookie(req, res);
    if (!draft) {
        return res.status(400).render("register", {
            title: "Register",
            error: "Registration step expired. Please start again.",
            draft: null,
        });
    }

    // IMPORTANT: check email again before creating user (race condition)
    const existing = await userService.findUserByEmail(String(draft.email || "").toLowerCase());
    if (existing) {
        clearDraft(res);
        return res.status(409).render("register", {
            title: "Register",
            error: "This email is already in use, please choose another one.",
            draft: null,
        });
    }

    // trim requirement
    const password1 = String(req.body.password1 || "").trim();
    const password2 = String(req.body.password2 || "").trim();

    if (!password1 || !password2) {
        return res.status(400).render("register", {
            title: "Register",
            error: "Please enter password in both fields.",
            draft,
        });
    }

    if (password1 !== password2) {
        return res.status(400).render("register", {
            title: "Register",
            error: "Passwords do not match.",
            draft,
        });
    }

    const hashedPassword = await bcrypt.hash(password1, 10);

    await userService.createUser({
        email: draft.email,
        firstName: draft.firstName,
        lastName: draft.lastName,
        passwordHash: hashedPassword,
    });

    clearDraft(res);
    return res.redirect("/?success=registered");
};
