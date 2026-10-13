
const auditLogs = [];
const MAX_LOGS = 100;

function auditLogger(req, res, next) {
    const startTime = Date.now();

    res.on("finish", () => {
        const duration = Date.now() - startTime;

        const log = {
            id: Date.now() + Math.random(),
            user: req.user ? req.user.username : "Unauthenticated",
            role: req.user ? req.user.role : "None",
            method: req.method,
            endpoint: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            time: new Date().toISOString()
        };

        auditLogs.unshift(log);

        if (auditLogs.length > MAX_LOGS) {
            auditLogs.pop();
        }

        console.log("===== AUDIT LOG =====");
        console.log("User:", log.user);
        console.log("Role:", log.role);
        console.log("Method:", log.method);
        console.log("Endpoint:", log.endpoint);
        console.log("Status:", log.status);
        console.log("Duration:", log.duration);
        console.log("Time:", log.time);
        console.log("=====================");
    });

    next();
}

function getAuditLogs() {
    return auditLogs;
}

module.exports = auditLogger;
module.exports.getAuditLogs = getAuditLogs;
