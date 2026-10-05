// routes/index.js
const express = require("express");
const router = express.Router();

const loginController = require("../controllers/loginController");
const authController = require("../controllers/authController");

router.get("/", loginController.getLogin);
router.get("/logout", authController.logout);

module.exports = router;
