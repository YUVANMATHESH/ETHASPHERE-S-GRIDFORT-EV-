const bcrypt = require("bcryptjs");
const { query } = require("../config/database");
const { generateToken } = require("../utils/jwt");

function publicUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        created_at: user.created_at
    };
}

async function register(req, res) {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "Name, email and password are required" });
        }
        if (String(name).trim().length < 2) {
            return res.status(400).json({ success: false, message: "Name must contain at least 2 characters" });
        }
        if (String(password).length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const existing = await query("SELECT id FROM users WHERE email = $1 LIMIT 1", [normalizedEmail]);
        if (existing.rowCount) {
            return res.status(409).json({ success: false, message: "Email already registered" });
        }

        const passwordHash = await bcrypt.hash(String(password), 12);
        const result = await query(
            `INSERT INTO users (name, email, password_hash, phone, role)
             VALUES ($1, $2, $3, $4, 'user')
             RETURNING id, name, email, role, phone, created_at`,
            [String(name).trim(), normalizedEmail, passwordHash, phone ? String(phone).trim() : null]
        );

        const user = result.rows[0];
        const token = generateToken(user);

        return res.status(201).json({ success: true, message: "Registration successful", token, user });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({ success: false, message: "Email already registered" });
        }
        console.error("REGISTER:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const result = await query(
            `SELECT id, name, email, password_hash, role, phone, created_at
             FROM users WHERE email = $1 LIMIT 1`,
            [normalizedEmail]
        );

        if (!result.rowCount) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const user = result.rows[0];
        const passwordMatch = await bcrypt.compare(String(password), user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const token = generateToken(user);
        return res.json({ success: true, message: "Login successful", token, user: publicUser(user) });
    } catch (error) {
        console.error("LOGIN:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}

async function getMe(req, res) {
    try {
        const result = await query(
            `SELECT id, name, email, role, phone, created_at
             FROM users WHERE id = $1 LIMIT 1`,
            [req.user.id]
        );
        if (!result.rowCount) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        return res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        console.error("ME:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}

module.exports = { register, login, getMe };
