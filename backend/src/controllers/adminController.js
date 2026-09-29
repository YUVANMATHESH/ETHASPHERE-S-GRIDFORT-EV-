const { query } = require("../config/database");

async function dashboard(req, res) {
    try {
        const [users, stations, chargers, sessions, alerts] = await Promise.all([
            query(`SELECT id,name,email,role,phone,created_at FROM users ORDER BY created_at DESC LIMIT 200`),
            query(`SELECT id,name,location,status,total_chargers,available_chargers FROM stations ORDER BY name`),
            query(`SELECT id,station_id,charger_number,charger_type,power_kw,connector_type,status FROM chargers ORDER BY charger_number`),
            query(`SELECT id,status,start_time,end_time,energy_consumed_kwh,cost,user_id,station_id,charger_id FROM charging_sessions ORDER BY created_at DESC LIMIT 200`),
            query(`SELECT id,station_id,charger_id,session_id,alert_type,severity,message,resolved,created_at FROM alerts ORDER BY created_at DESC LIMIT 100`)
        ]);
        return res.json({ success: true, users: users.rows, stations: stations.rows, chargers: chargers.rows, sessions: sessions.rows, alerts: alerts.rows });
    } catch (error) {
        console.error("ADMIN DASHBOARD:", error);
        return res.status(500).json({ success: false, message: "Failed to load admin dashboard" });
    }
}

async function users(req, res) {
    try {
        const result = await query(`SELECT id,name,email,role,phone,created_at FROM users ORDER BY created_at DESC`);
        return res.json({ success: true, users: result.rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch users" });
    }
}

async function stations(req, res) {
    try {
        const result = await query(`SELECT * FROM stations ORDER BY name`);
        return res.json({ success: true, stations: result.rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch stations" });
    }
}

async function sessions(req, res) {
    try {
        const result = await query(`SELECT * FROM charging_sessions ORDER BY created_at DESC LIMIT 300`);
        return res.json({ success: true, sessions: result.rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch sessions" });
    }
}

module.exports = { dashboard, users, stations, sessions };
