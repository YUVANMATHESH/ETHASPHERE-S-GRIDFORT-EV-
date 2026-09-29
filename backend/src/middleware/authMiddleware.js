const { verifyToken } = require("../utils/jwt");

function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ success: false, message: "Authorization token is required" });
        }

        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, message: "Invalid authorization format" });
        }

        const token = authHeader.slice(7).trim();
        if (!token) {
            return res.status(401).json({ success: false, message: "Authorization token is required" });
        }

        req.user = verifyToken(token);
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
}

module.exports = authMiddleware;
