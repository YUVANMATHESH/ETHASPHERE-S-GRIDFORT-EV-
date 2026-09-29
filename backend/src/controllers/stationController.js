const { query } = require("../config/database");

async function listStations(req, res) {
    try {
        const result = await query(`SELECT * FROM stations ORDER BY created_at DESC`);
        return res.json({ success: true, stations: result.rows });
    } catch (error) {
        console.error("STATIONS LIST:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch stations" });
    }
}

async function getStation(req, res) {
    try {
        const stationResult = await query(`SELECT * FROM stations WHERE id = $1 LIMIT 1`, [req.params.id]);
        if (!stationResult.rowCount) return res.status(404).json({ success: false, message: "Station not found" });

        const chargerResult = await query(
            `SELECT * FROM chargers WHERE station_id = $1 ORDER BY created_at DESC`,
            [req.params.id]
        );
        return res.json({ success: true, station: { ...stationResult.rows[0], chargers: chargerResult.rows } });
    } catch (error) {
        console.error("STATION GET:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch station" });
    }
}

async function createStation(req, res) {
    try {
        const { name, location, latitude, longitude, total_chargers, available_chargers, status } = req.body;
        if (!name || !location) return res.status(400).json({ success: false, message: "Name and location are required" });

        const result = await query(
            `INSERT INTO stations
             (name, location, latitude, longitude, total_chargers, available_chargers, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7)
             RETURNING *`,
            [
                String(name).trim(),
                String(location).trim(),
                latitude ?? null,
                longitude ?? null,
                Number(total_chargers || 0),
                Number(available_chargers ?? total_chargers ?? 0),
                status || "active"
            ]
        );
        return res.status(201).json({ success: true, message: "Station created", station: result.rows[0] });
    } catch (error) {
        console.error("STATION CREATE:", error);
        return res.status(500).json({ success: false, message: "Failed to create station" });
    }
}

async function updateStation(req, res) {
    try {
        const allowed = ["name", "location", "latitude", "longitude", "total_chargers", "available_chargers", "status"];
        const updates = allowed.filter(key => req.body[key] !== undefined);
        if (!updates.length) return res.status(400).json({ success: false, message: "No valid fields supplied" });

        const values = updates.map(key => req.body[key]);
        const setClause = updates.map((key, index) => `${key} = $${index + 1}`).join(", ");
        values.push(req.params.id);

        const result = await query(
            `UPDATE stations SET ${setClause}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
            values
        );
        if (!result.rowCount) return res.status(404).json({ success: false, message: "Station not found" });
        return res.json({ success: true, message: "Station updated", station: result.rows[0] });
    } catch (error) {
        console.error("STATION UPDATE:", error);
        return res.status(500).json({ success: false, message: "Failed to update station" });
    }
}

async function deleteStation(req, res) {
    try {
        const result = await query(`DELETE FROM stations WHERE id = $1 RETURNING id`, [req.params.id]);
        if (!result.rowCount) return res.status(404).json({ success: false, message: "Station not found" });
        return res.json({ success: true, message: "Station deleted" });
    } catch (error) {
        console.error("STATION DELETE:", error);
        return res.status(500).json({ success: false, message: "Failed to delete station" });
    }
}

module.exports = { listStations, getStation, createStation, updateStation, deleteStation };
