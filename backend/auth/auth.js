const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const JWT_SECRET = "nms-project-secret-key";

// Temporary users
const users = [
    {
        id: 1,
        username: "admin",
        password: bcrypt.hashSync("admin123", 10),
        role: "admin"
    },
    {
        id: 2,
        username: "operator",
        password: bcrypt.hashSync("operator123", 10),
        role: "operator"
    },
    {
        id: 3,
        username: "viewer",
        password: bcrypt.hashSync("viewer123", 10),
        role: "viewer"
    }
];

function login(username, password) {

    const user = users.find(
        user => user.username === username
    );

    if (!user) {
        return null;
    }

    const passwordMatch = bcrypt.compareSync(
        password,
        user.password
    );

    if (!passwordMatch) {
        return null;
    }

    const token = jwt.sign(
        {
            id: user.id,
            username: user.username,
            role: user.role
        },
        JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );

    return token;
}

module.exports = {
    login,
    JWT_SECRET
};