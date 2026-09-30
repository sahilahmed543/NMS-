function auditLogger(req, res, next) {

    const startTime = Date.now();

    res.on("finish", () => {

        const duration = Date.now() - startTime;

        console.log("===== AUDIT LOG =====");
        console.log("User:", req.user ? req.user.username : "Unauthenticated");
        console.log("Role:", req.user ? req.user.role : "None");
        console.log("Method:", req.method);
        console.log("Endpoint:", req.originalUrl);
        console.log("Status:", res.statusCode);
        console.log("Duration:", `${duration}ms`);
        console.log("Time:", new Date().toISOString());
        console.log("=====================");
    });

    next();
}

module.exports = auditLogger;