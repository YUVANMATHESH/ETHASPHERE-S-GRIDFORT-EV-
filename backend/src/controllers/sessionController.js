const { query, pool } = require("../config/database");

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

async function listSessions(req, res) {
    try {
        const params = [];
        const conditions = [];
        if (req.user.role !== "admin") {
            params.push(req.user.id);
            conditions.push(`cs.user_id = $${params.length}`);
        }
        if (req.query.status) {
            params.push(req.query.status);
            conditions.push(`cs.status = $${params.length}`);
        }
        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        const result = await query(
            `SELECT cs.*, v.registration_number, v.vehicle_model,
                    s.name AS station_name, s.location AS station_location,
                    c.charger_number, c.charger_type, c.power_kw, c.status AS charger_status
             FROM charging_sessions cs
             LEFT JOIN vehicles v ON v.id = cs.vehicle_id
             LEFT JOIN stations s ON s.id = cs.station_id
             LEFT JOIN chargers c ON c.id = cs.charger_id
             ${where}
             ORDER BY cs.created_at DESC`,
            params
        );
        const sessions = result.rows.map(row => ({
            ...row,
            vehicles: row.registration_number ? { registration_number: row.registration_number, vehicle_model: row.vehicle_model } : null,
            stations: row.station_name ? { name: row.station_name, location: row.station_location } : null,
            chargers: row.charger_number ? { charger_number: row.charger_number, charger_type: row.charger_type, power_kw: row.power_kw, status: row.charger_status } : null
        }));
        return res.json({ success: true, sessions });
    } catch (error) {
        console.error("SESSIONS LIST:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch sessions" });
    }
}

async function getSession(req, res) {
    try {
        const params = [req.params.id];
        let ownership = "";
        if (req.user.role !== "admin") {
            params.push(req.user.id);
            ownership = `AND cs.user_id = $2`;
        }
        const session = await query(
            `SELECT cs.*, v.*, s.name AS station_name, s.location AS station_location,
                    c.charger_number, c.charger_type, c.power_kw, c.status AS charger_status
             FROM charging_sessions cs
             LEFT JOIN vehicles v ON v.id = cs.vehicle_id
             LEFT JOIN stations s ON s.id = cs.station_id
             LEFT JOIN chargers c ON c.id = cs.charger_id
             WHERE cs.id = $1 ${ownership} LIMIT 1`,
            params
        );
        if (!session.rowCount) return res.status(404).json({ success: false, message: "Session not found" });
        return res.json({ success: true, session: session.rows[0] });
    } catch (error) {
        console.error("SESSION GET:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch session" });
    }
}

async function startSession(req, res) {
    const client = await pool.connect();
    try {
        const { vehicle_id, station_id, charger_id, start_battery_percent } = req.body;
        if (!vehicle_id || !station_id || !charger_id) return res.status(400).json({ success: false, message: "vehicle_id, station_id and charger_id are required" });

        await client.query("BEGIN");
        const charger = await client.query(`SELECT id,status,power_kw,station_id FROM chargers WHERE id = $1 FOR UPDATE`, [charger_id]);
        if (!charger.rowCount) { await client.query("ROLLBACK"); return res.status(404).json({ success: false, message: "Charger not found" }); }
        if (charger.rows[0].station_id !== station_id) { await client.query("ROLLBACK"); return res.status(400).json({ success: false, message: "Charger does not belong to selected station" }); }
        if (charger.rows[0].status !== "available") { await client.query("ROLLBACK"); return res.status(409).json({ success: false, message: `Charger is currently ${charger.rows[0].status}` }); }

        const vehicle = await client.query(`SELECT id FROM vehicles WHERE id = $1 AND user_id = $2 LIMIT 1`, [vehicle_id, req.user.id]);
        if (!vehicle.rowCount) { await client.query("ROLLBACK"); return res.status(404).json({ success: false, message: "Vehicle not found" }); }

        const station = await client.query(`SELECT id,available_chargers FROM stations WHERE id = $1 FOR UPDATE`, [station_id]);
        if (!station.rowCount) { await client.query("ROLLBACK"); return res.status(404).json({ success: false, message: "Station not found" }); }

        const session = await client.query(
            `INSERT INTO charging_sessions
             (user_id, vehicle_id, station_id, charger_id, start_time, start_battery_percent,
              status, energy_consumed_kwh, charging_duration_minutes, cost)
             VALUES ($1,$2,$3,$4,NOW(),$5,'active',0,0,0) RETURNING *`,
            [req.user.id, vehicle_id, station_id, charger_id, clamp(Number(start_battery_percent ?? 20), 0, 100)]
        );

        await client.query(`UPDATE chargers SET status = 'charging', updated_at = NOW() WHERE id = $1`, [charger_id]);
        await client.query(`UPDATE stations SET available_chargers = GREATEST(available_chargers - 1, 0), updated_at = NOW() WHERE id = $1`, [station_id]);
        await client.query("COMMIT");

        return res.status(201).json({ success: true, message: "Charging session started", session: session.rows[0] });
    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        console.error("SESSION START:", error);
        return res.status(500).json({ success: false, message: "Failed to start charging session" });
    } finally {
        client.release();
    }
}

async function addData(req, res) {
    try {
        const { voltage, current, power_kw, battery_percent, temperature, energy_consumed_kwh } = req.body;
        const params = [req.params.id];
        let ownership = "";
        if (req.user.role !== "admin") {
            params.push(req.user.id);
            ownership = "AND user_id = $2";
        }
        const sessionResult = await query(
            `SELECT id,user_id,charger_id,station_id,status,start_time,energy_consumed_kwh
             FROM charging_sessions WHERE id = $1 ${ownership} LIMIT 1`,
            params
        );
        if (!sessionResult.rowCount) return res.status(404).json({ success: false, message: "Session not found" });
        const session = sessionResult.rows[0];
        if (session.status !== "active") return res.status(409).json({ success: false, message: "Session is not active" });

        const power = power_kw ?? ((Number(voltage || 0) * Number(current || 0)) / 1000);
        const energy = Number(energy_consumed_kwh ?? 0);
        const battery = clamp(Number(battery_percent ?? 0), 0, 100);
        const temp = Number(temperature ?? 0);

        const dataResult = await query(
            `INSERT INTO charging_data
             (session_id, voltage, current, power_kw, battery_percent, temperature, energy_consumed_kwh, recorded_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *`,
            [req.params.id, Number(voltage ?? 0), Number(current ?? 0), Number(power), battery, temp, energy]
        );

        const newTotalEnergy = Number(session.energy_consumed_kwh || 0) + energy;
        const elapsed = Math.max(0, Math.round((Date.now() - new Date(session.start_time).getTime()) / 60000));
        await query(`UPDATE charging_sessions SET energy_consumed_kwh = $1, charging_duration_minutes = $2 WHERE id = $3`, [newTotalEnergy, elapsed, session.id]);

        if (temp >= 50) {
            await query(
                `INSERT INTO alerts (station_id,charger_id,session_id,alert_type,severity,message,resolved)
                 VALUES ($1,$2,$3,'HIGH_TEMPERATURE',$4,$5,FALSE)`,
                [session.station_id, session.charger_id, session.id, temp >= 60 ? "critical" : "high", `Charger temperature reached ${temp.toFixed(1)}°C`]
            );
        }

        return res.status(201).json({ success: true, data: dataResult.rows[0] });
    } catch (error) {
        console.error("SESSION DATA:", error);
        return res.status(500).json({ success: false, message: "Failed to record charging data" });
    }
}

async function simulateData(req, res) {
    req.body = {
        voltage: Number((395 + Math.random() * 30).toFixed(2)),
        current: Number((50 + Math.random() * 70).toFixed(2)),
        battery_percent: Number((25 + Math.random() * 55).toFixed(2)),
        temperature: Number((28 + Math.random() * 32).toFixed(2)),
        energy_consumed_kwh: Number((0.4 + Math.random() * 1.5).toFixed(3))
    };
    req.body.power_kw = Number(((req.body.voltage * req.body.current) / 1000).toFixed(3));
    return addData(req, res);
}

async function completeSession(req, res) {
    const client = await pool.connect();
    try {
        const params = [req.params.id];
        let ownership = "";
        if (req.user.role !== "admin") { params.push(req.user.id); ownership = "AND user_id = $2"; }
        await client.query("BEGIN");
        const sessionResult = await client.query(
            `SELECT id,user_id,station_id,charger_id,start_time,energy_consumed_kwh,start_battery_percent,status
             FROM charging_sessions WHERE id = $1 ${ownership} FOR UPDATE`,
            params
        );
        if (!sessionResult.rowCount) { await client.query("ROLLBACK"); return res.status(404).json({ success: false, message: "Session not found" }); }
        const session = sessionResult.rows[0];
        if (session.status !== "active") { await client.query("ROLLBACK"); return res.status(409).json({ success: false, message: "Session is already closed" }); }

        const latest = await client.query(`SELECT battery_percent FROM charging_data WHERE session_id = $1 ORDER BY recorded_at DESC LIMIT 1`, [session.id]);
        const endBattery = Number(req.body?.end_battery_percent ?? latest.rows[0]?.battery_percent ?? session.start_battery_percent ?? 80);
        const duration = Math.max(0, Math.round((Date.now() - new Date(session.start_time).getTime()) / 60000));
        const energy = Number(session.energy_consumed_kwh || 0);
        const cost = Number((energy * 12).toFixed(2));

        const updated = await client.query(
            `UPDATE charging_sessions
             SET end_time = NOW(), end_battery_percent = $1, charging_duration_minutes = $2,
                 energy_consumed_kwh = $3, cost = $4, status = 'completed'
             WHERE id = $5 RETURNING *`,
            [endBattery, duration, energy, cost, session.id]
        );
        await client.query(`UPDATE chargers SET status = 'available', updated_at = NOW() WHERE id = $1`, [session.charger_id]);
        await client.query(`UPDATE stations SET available_chargers = LEAST(total_chargers, available_chargers + 1), updated_at = NOW() WHERE id = $1`, [session.station_id]);
        await client.query("COMMIT");

        return res.json({ success: true, message: "Charging session completed", session: updated.rows[0] });
    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        console.error("SESSION COMPLETE:", error);
        return res.status(500).json({ success: false, message: "Failed to complete charging session" });
    } finally {
        client.release();
    }
}

async function getSessionData(req, res) {
    try {
        const params = [req.params.id];
        let ownership = "";
        if (req.user.role !== "admin") { params.push(req.user.id); ownership = "AND user_id = $2"; }
        const session = await query(`SELECT id FROM charging_sessions WHERE id = $1 ${ownership} LIMIT 1`, params);
        if (!session.rowCount) return res.status(404).json({ success: false, message: "Session not found" });
        const result = await query(`SELECT * FROM charging_data WHERE session_id = $1 ORDER BY recorded_at DESC LIMIT 50`, [req.params.id]);
        return res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error("SESSION DATA GET:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch charging data" });
    }
}

module.exports = { listSessions, getSession, startSession, addData, simulateData, completeSession, getSessionData };
