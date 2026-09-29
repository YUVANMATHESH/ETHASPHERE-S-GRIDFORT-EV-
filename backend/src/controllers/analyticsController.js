const { query } = require("../config/database");

function num(value) { return Number(value || 0); }

async function dashboard(req, res) {
    try {
        const [users, stations, chargers, sessions, data, alerts] = await Promise.all([
            query(`SELECT COUNT(*)::int AS count FROM users`),
            query(`SELECT id,name,status,total_chargers,available_chargers FROM stations ORDER BY name`),
            query(`SELECT id,status FROM chargers`),
            query(`SELECT id,status,energy_consumed_kwh,cost,user_id FROM charging_sessions`),
            query(`SELECT power_kw,temperature FROM charging_data`),
            query(`SELECT id,resolved,severity FROM alerts`)
        ]);

        const sessionsRows = sessions.rows;
        const dataRows = data.rows;
        const chargersRows = chargers.rows;
        const alertRows = alerts.rows;
        const energy = sessionsRows.reduce((s, r) => s + num(r.energy_consumed_kwh), 0);
        const revenue = sessionsRows.reduce((s, r) => s + num(r.cost), 0);
        const avgPower = dataRows.length ? dataRows.reduce((s, r) => s + num(r.power_kw), 0) / dataRows.length : 0;
        const avgTemp = dataRows.length ? dataRows.reduce((s, r) => s + num(r.temperature), 0) / dataRows.length : 0;

        return res.json({
            success: true,
            metrics: {
                users: users.rows[0].count,
                stations: stations.rowCount,
                chargers: chargers.rowCount,
                available_chargers: chargersRows.filter(c => c.status === "available").length,
                active_sessions: sessionsRows.filter(s => s.status === "active").length,
                completed_sessions: sessionsRows.filter(s => s.status === "completed").length,
                energy_consumed_kwh: Number(energy.toFixed(3)),
                revenue: Number(revenue.toFixed(2)),
                unresolved_alerts: alertRows.filter(a => !a.resolved).length,
                average_power_kw: Number(avgPower.toFixed(2)),
                average_temperature_c: Number(avgTemp.toFixed(2))
            },
            stations: stations.rows
        });
    } catch (error) {
        console.error("ANALYTICS DASHBOARD:", error);
        return res.status(500).json({ success: false, message: "Failed to load analytics" });
    }
}

async function energy(req, res) {
    try {
        const result = await query(`SELECT id,station_id,start_time,end_time,energy_consumed_kwh,cost,status FROM charging_sessions ORDER BY created_at DESC`);
        return res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error("ANALYTICS ENERGY:", error);
        return res.status(500).json({ success: false, message: "Failed to load energy analytics" });
    }
}

async function revenue(req, res) {
    try {
        const result = await query(`SELECT id,station_id,end_time,cost,status FROM charging_sessions WHERE status = 'completed' ORDER BY end_time DESC`);
        const total = result.rows.reduce((s, r) => s + num(r.cost), 0);
        return res.json({ success: true, data: result.rows, total: Number(total.toFixed(2)) });
    } catch (error) {
        console.error("ANALYTICS REVENUE:", error);
        return res.status(500).json({ success: false, message: "Failed to load revenue analytics" });
    }
}

async function stations(req, res) {
    try {
        const result = await query(`SELECT id,name,location,status,total_chargers,available_chargers FROM stations ORDER BY name`);
        return res.json({ success: true, stations: result.rows });
    } catch (error) {
        console.error("ANALYTICS STATIONS:", error);
        return res.status(500).json({ success: false, message: "Failed to load station analytics" });
    }
}

module.exports = { dashboard, energy, revenue, stations };
