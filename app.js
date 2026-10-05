// app.js
const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const session = require("express-session");

// Load model associations ONCE (needed for include joins)
require("./models/associations");

// Controllers & Routes
const errorController = require("./controllers/error");
const indexRoutes = require("./routes/index");
const usersRoutes = require("./routes/users");
const chatRoutes = require("./routes/chat");

const app = express();

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Body parsers
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Static files + cookies
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

if (!process.env.SESSION_SECRET) throw new Error("Set SESSION_SECRET before starting the app");

// Session configuration
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            maxAge: 1000 * 60 * 60 * 2, // 2 hours
        },
    })
);

// Routes
app.use(indexRoutes);
app.use("/users", usersRoutes);
app.use("/chat", chatRoutes);

// 404 handler
app.use(errorController.get404);
app.use(errorController.get500);

module.exports = app;
