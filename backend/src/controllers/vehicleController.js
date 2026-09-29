const { query } = require("../config/database");

async function listVehicles(req, res) {
    try {
        const result = await query(`SELECT * FROM vehicles WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.id]);
        return res.json({ success: true, vehicles: result.rows });
    } catch (error) {
        console.error("VEHICLES LIST:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch vehicles" });
    }
}

async function createVehicle(req, res) {
    try {
        const { registration_number, vehicle_model, battery_capacity_kwh } = req.body;
        if (!registration_number || !vehicle_model) return res.status(400).json({ success: false, message: "Registration number and vehicle model are required" });
        const result = await query(
            `INSERT INTO vehicles (user_id, registration_number, vehicle_model, battery_capacity_kwh)
             VALUES ($1,$2,$3,$4) RETURNING *`,
            [req.user.id, String(registration_number).trim().toUpperCase(), String(vehicle_model).trim(), battery_capacity_kwh ?? null]
        );
        return res.status(201).json({ success: true, message: "Vehicle added", vehicle: result.rows[0] });
    } catch (error) {
        if (error.code === "23505") return res.status(409).json({ success: false, message: "Vehicle registration already exists" });
        console.error("VEHICLE CREATE:", error);
        return res.status(500).json({ success: false, message: "Failed to add vehicle" });
    }
}

async function updateVehicle(req, res) {
    try {
        const allowed = ["registration_number", "vehicle_model", "battery_capacity_kwh"];
        const updates = allowed.filter(key => req.body[key] !== undefined);
        if (!updates.length) return res.status(400).json({ success: false, message: "No valid fields supplied" });
        const values = updates.map(key => key === "registration_number" ? String(req.body[key]).trim().toUpperCase() : req.body[key]);
        values.push(req.params.id, req.user.id);
        const setClause = updates.map((key, index) => `${key} = $${index + 1}`).join(", ");
        const result = await query(
            `UPDATE vehicles SET ${setClause}
             WHERE id = $${values.length - 1} AND user_id = $${values.length}
             RETURNING *`,
            values
        );
        if (!result.rowCount) return res.status(404).json({ success: false, message: "Vehicle not found" });
        return res.json({ success: true, message: "Vehicle updated", vehicle: result.rows[0] });
    } catch (error) {
        console.error("VEHICLE UPDATE:", error);
        return res.status(500).json({ success: false, message: "Failed to update vehicle" });
    }
}

async function deleteVehicle(req, res) {
    try {
        const result = await query(`DELETE FROM vehicles WHERE id = $1 AND user_id = $2 RETURNING id`, [req.params.id, req.user.id]);
        if (!result.rowCount) return res.status(404).json({ success: false, message: "Vehicle not found" });
        return res.json({ success: true, message: "Vehicle deleted" });
    } catch (error) {
        console.error("VEHICLE DELETE:", error);
        return res.status(500).json({ success: false, message: "Failed to delete vehicle" });
    }
}

module.exports = { listVehicles, createVehicle, updateVehicle, deleteVehicle };
