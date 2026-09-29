const express = require("express");
const { query } = require("../config/database");

const router = express.Router();

router.get("/database", async (req, res) => {
    try {
        const result = await query(`SELECT COUNT(*)::int AS count FROM users`);
        return res.json({ success: true, database: "connected", users_count: result.rows[0].count });
    } catch (error) {
        console.error("DATABASE TEST:", error);
        return res.status(500).json({ success: false, database: "error", message: error.message });
    }
});

module.exports = router;
