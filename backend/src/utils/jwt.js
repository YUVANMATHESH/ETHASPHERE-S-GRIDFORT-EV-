const jwt = require("jsonwebtoken");

function generateToken(user) {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
    }

    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d",
            issuer: "evgrid-api",
            audience: "evgrid-frontend"
        }
    );
}

function verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET, {
        issuer: "evgrid-api",
        audience: "evgrid-frontend"
    });
}

module.exports = { generateToken, verifyToken };
