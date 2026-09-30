const express = require("express");
const axios = require("axios");
const { login } = require("./auth/auth");
const authenticateToken = require("./middleware/authMiddleware");
const authorizeRoles = require("./middleware/roleMiddleware");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const auditLogger = require("./middleware/auditLogger");

const app = express();

const PORT = 5000;
const NMS_URL = "http://localhost:5001";

app.use(express.json());

app.use(cors({
    origin: "http://localhost:5173"
}));

app.use(helmet());

app.use(morgan("combined"));
app.use(auditLogger);

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: {
        message: "Too many requests. Please try again later."
    }
});

app.use("/api", apiLimiter);
// Login endpoint
app.post("/auth/login", (req, res) => {

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            message: "Username and password are required"
        });
    }

    const token = login(username, password);

    if (!token) {
        return res.status(401).json({
            message: "Invalid username or password"
        });
    }

    res.json({
        message: "Login successful",
        token: token
    });
});

app.get("/", (req, res) => {
    res.json({
        message: "Secure NMS API Gateway is running"
    });
});

app.get("/api/devices", authenticateToken, async (req, res) => {

    try {
        const response = await axios.get(
            `${NMS_URL}/nms/devices`
        );

        res.json(response.data);

    } catch (error) {
        res.status(500).json({
            message: "Unable to communicate with NMS"
        });
    }
});

app.get("/api/devices/:id", authenticateToken, async (req, res) => {

    try {
        const response = await axios.get(
            `${NMS_URL}/nms/devices/${req.params.id}`
        );

        res.json(response.data);

    } catch (error) {

        if (error.response) {
            return res.status(error.response.status).json(
                error.response.data
            );
        }

        res.status(500).json({
            message: "Unable to communicate with NMS"
        });
    }
});

app.get("/api/network-status", authenticateToken, async (req, res) => {

    try {
        const response = await axios.get(
            `${NMS_URL}/nms/network-status`
        );

        res.json(response.data);

    } catch (error) {
        res.status(500).json({
            message: "Unable to communicate with NMS"
        });
    }
});

app.post(
    "/api/admin/restart-nms",
    authenticateToken,
    authorizeRoles("admin"),
    (req, res) => {

        res.json({
            message: "NMS restart operation authorized",
            performedBy: req.user.username,
            role: req.user.role
        });
    }
);

app.listen(PORT, () => {
    console.log(
        `API Gateway running on http://localhost:${PORT}`
    );
});