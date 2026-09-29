const { query } = require("../config/database");

// GET /api/chargers?station_id=...&status=available
async function listChargers(req, res) {
    try {
        const params = [];
        const conditions = [];

        if (req.query.station_id) {
            params.push(req.query.station_id);
            conditions.push(`c.station_id = $${params.length}`);
        }

        if (req.query.status) {
            params.push(req.query.status.toLowerCase().trim());
            conditions.push(`LOWER(c.status) = $${params.length}`);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

        const result = await query(
            `SELECT c.*, s.name AS station_name, s.location AS station_location
             FROM chargers c
             LEFT JOIN stations s ON s.id = c.station_id
             ${whereClause}
             ORDER BY c.created_at DESC`,
            params
        );

        const chargers = result.rows.map(row => ({
            ...row,
            stations: row.station_name
                ? { id: row.station_id, name: row.station_name, location: row.station_location }
                : null
        }));

        return res.json({ success: true, count: chargers.length, chargers });
    } catch (error) {
        console.error("CHARGERS LIST:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch chargers" });
    }
}

// GET /api/chargers/available/:stationId
async function getAvailableChargerForStation(req, res) {
    try {
        const { stationId } = req.params;

        const result = await query(
            `SELECT c.*, s.name AS station_name 
             FROM chargers c
             JOIN stations s ON s.id = c.station_id
             WHERE c.station_id = $1 AND LOWER(c.status) = 'available'
             ORDER BY c.id ASC
             LIMIT 1`,
            [stationId]
        );

        if (!result.rowCount) {
            return res.status(404).json({
                success: false,
                message: "No available charger at this station"
            });
        }

        return res.json({ success: true, charger: result.rows[0] });
    } catch (error) {
        console.error("AVAILABLE CHARGER GET:", error);
        return res.status(500).json({ success: false, message: "Failed to check charger availability" });
    }
}

// GET /api/chargers/:id
async function getCharger(req, res) {
    try {
        const result = await query(
            `SELECT c.*, s.id AS station_id_join, s.name AS station_name, s.location AS station_location
             FROM chargers c LEFT JOIN stations s ON s.id = c.station_id
             WHERE c.id = $1 LIMIT 1`,
            [req.params.id]
        );

        if (!result.rowCount) return res.status(404).json({ success: false, message: "Charger not found" });

        const row = result.rows[0];
        return res.json({
            success: true,
            charger: {
                ...row,
                stations: row.station_name
                    ? { id: row.station_id, name: row.station_name, location: row.station_location }
                    : null
            }
        });
    } catch (error) {
        console.error("CHARGER GET:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch charger" });
    }
}

// POST /api/chargers
async function createCharger(req, res) {
    try {
        const { station_id, charger_number, charger_type, power_kw, connector_type, status } = req.body;

        if (!station_id || !charger_number || !charger_type || power_kw === undefined) {
            return res.status(400).json({
                success: false,
                message: "station_id, charger_number, charger_type and power_kw are required"
            });
        }

        // Normalize status to lowercase to avoid matching bugs
        const normalizedStatus = status ? String(status).toLowerCase().trim() : "available";

        const result = await query(
            `INSERT INTO chargers (station_id, charger_number, charger_type, power_kw, connector_type, status)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [
                station_id,
                String(charger_number).trim(),
                String(charger_type).trim(),
                Number(power_kw),
                connector_type ? String(connector_type).trim() : null,
                normalizedStatus
            ]
        );

        return res.status(201).json({ success: true, message: "Charger created", charger: result.rows[0] });
    } catch (error) {
        console.error("CHARGER CREATE:", error);
        return res.status(500).json({ success: false, message: "Failed to create charger" });
    }
}

// PUT /api/chargers/:id
async function updateCharger(req, res) {
    try {
        const allowed = ["station_id", "charger_number", "charger_type", "power_kw", "connector_type", "status"];
        const updates = allowed.filter(key => req.body[key] !== undefined);

        if (!updates.length) return res.status(400).json({ success: false, message: "No valid fields supplied" });

        const values = updates.map(key => {
            if (key === "status" && typeof req.body[key] === "string") {
                return req.body[key].toLowerCase().trim();
            }
            return req.body[key];
        });

        values.push(req.params.id);
        const setClause = updates.map((key, index) => `${key} = $${index + 1}`).join(", ");

        const result = await query(
            `UPDATE chargers SET ${setClause}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
            values
        );

        if (!result.rowCount) return res.status(404).json({ success: false, message: "Charger not found" });

        return res.json({ success: true, message: "Charger updated", charger: result.rows[0] });
    } catch (error) {
        console.error("CHARGER UPDATE:", error);
        return res.status(500).json({ success: false, message: "Failed to update charger" });
    }
}

// DELETE /api/chargers/:id
async function deleteCharger(req, res) {
    try {
        const result = await query(`DELETE FROM chargers WHERE id = $1 RETURNING id`, [req.params.id]);
        if (!result.rowCount) return res.status(404).json({ success: false, message: "Charger not found" });

        return res.json({ success: true, message: "Charger deleted" });
    } catch (error) {
        console.error("CHARGER DELETE:", error);
        return res.status(500).json({ success: false, message: "Failed to delete charger" });
    }
}

module.exports = {
    listChargers,
    getCharger,
    getAvailableChargerForStation,
    createCharger,
    updateCharger,
    deleteCharger
};