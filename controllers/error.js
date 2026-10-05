// controllers/error.js
exports.get404 = (req, res, next) => {
    res.status(404).render("404", { pageTitle: "Page Not Found", path: "" });
};

// Global error handler (Express)
exports.get500 = (err, req, res, next) => {
    const status = err?.statusCode || err?.status || 500;

    // Show stack only in development
    const showDetails = process.env.NODE_ENV !== "production";

    res.status(status).render("error", {
        message: err?.message || "Something went wrong",
        status,
        error: err,
        showDetails,
    });
};
