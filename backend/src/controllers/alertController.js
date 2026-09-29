const { query } = require("../config/database");

async function listAlerts(req, res) {
    try {
        const params = [];
        const conditions = [];
        if (req.user.role !== "admin") {
            params.push(req.user.id);
            conditions.push(`cs.user_id = $${params.length}`);
        }
        if (req.query.resolved !== undefined) {
            params.push(req.query.resolved === "true");
            conditions.push(`a.resolved = $${params.length}`);
        }
        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        const result = await query(
            `SELECT a.*, s.name AS station_name, c.charger_number, cs.user_id AS session_user_id
             FROM alerts a
             LEFT JOIN stations s ON s.id = a.station_id
             LEFT JOIN chargers c ON c.id = a.charger_id
             LEFT JOIN charging_sessions cs ON cs.id = a.session_id
             ${where}
             ORDER BY a.created_at DESC LIMIT 100`,
            params
        );
        const alerts = result.rows.map(row => ({
            ...row,
            stations: row.station_name ? { name: row.station_name } : null,
            chargers: row.charger_number ? { charger_number: row.charger_number } : null,
            charging_sessions: row.session_user_id ? { user_id: row.session_user_id } : null
        }));
        return res.json({ success: true, alerts });
    } catch (error) {
        console.error("ALERTS LIST:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch alerts" });
    }
}

async function createAlert(req, res) {
    try {
        const { station_id, charger_id, session_id, alert_type, severity, message } = req.body;
        if (!alert_type || !severity || !message) return res.status(400).json({ success: false, message: "alert_type, severity and message are required" });
        const result = await query(
            `INSERT INTO alerts (station_id, charger_id, session_id, alert_type, severity, message)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [station_id || null, charger_id || null, session_id || null, alert_type, severity, message]
        );
        return res.status(201).json({ success: true, alert: result.rows[0] });
    } catch (error) {
        console.error("ALERT CREATE:", error);
        return res.status(500).json({ success: false, message: "Failed to create alert" });
    }
}

async function resolveAlert(req, res) {
    try {
        const result = await query(`UPDATE alerts SET resolved = TRUE WHERE id = $1 RETURNING *`, [req.params.id]);
        if (!result.rowCount) return res.status(404).json({ success: false, message: "Alert not found" });
        return res.json({ success: true, message: "Alert resolved", alert: result.rows[0] });
    } catch (error) {
        console.error("ALERT RESOLVE:", error);
        return res.status(500).json({ success: false, message: "Failed to resolve alert" });
    }
}

module.exports = { listAlerts, createAlert, resolveAlert };
