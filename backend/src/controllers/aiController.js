const { query } = require("../config/database");

function computePrediction(rows) {
    if (!rows.length) {
        return {
            prediction_type: "CHARGING_HEALTH",
            prediction_value: 8,
            confidence: 60,
            explanation: "Not enough charging telemetry yet; using a demo baseline risk score."
        };
    }

    const avgTemp = rows.reduce((s, r) => s + Number(r.temperature || 0), 0) / rows.length;
    const avgPower = rows.reduce((s, r) => s + Number(r.power_kw || 0), 0) / rows.length;
    const maxTemp = Math.max(...rows.map(r => Number(r.temperature || 0)));

    let risk = 15;
    if (avgTemp >= 40) risk += 15;
    if (avgTemp >= 45) risk += 20;
    if (maxTemp >= 55) risk += 25;
    if (avgPower >= 80) risk += 10;

    return {
        prediction_type: "OVERHEATING_RISK",
        prediction_value: Math.min(99, Number(risk.toFixed(1))),
        confidence: Math.min(98, 70 + rows.length),
        explanation: `Telemetry analysis: average temperature ${avgTemp.toFixed(1)}°C, peak temperature ${maxTemp.toFixed(1)}°C, average power ${avgPower.toFixed(1)} kW.`
    };
}

async function predict(req, res) {
    try {
        const stationId = req.body?.station_id || null;
        const sessionId = req.body?.session_id || null;
        const params = [];
        let where = "";
        if (sessionId) {
            params.push(sessionId);
            where = "WHERE session_id = $1";
        }
        const result = await query(
            `SELECT temperature, power_kw, battery_percent, recorded_at
             FROM charging_data ${where}
             ORDER BY recorded_at DESC LIMIT 50`,
            params
        );
        const prediction = computePrediction(result.rows);
        if (stationId) {
            await query(
                `INSERT INTO ai_predictions
                 (station_id, prediction_type, prediction_value, confidence, explanation)
                 VALUES ($1,$2,$3,$4,$5)`,
                [stationId, prediction.prediction_type, prediction.prediction_value, prediction.confidence, prediction.explanation]
            );
        }
        return res.json({ success: true, prediction });
    } catch (error) {
        console.error("AI PREDICT:", error);
        return res.status(500).json({ success: false, message: "Failed to generate AI prediction" });
    }
}

async function predictions(req, res) {
    try {
        const params = [];
        let where = "";
        if (req.query.station_id) {
            params.push(req.query.station_id);
            where = "WHERE p.station_id = $1";
        }
        const result = await query(
            `SELECT p.*, s.name AS station_name
             FROM ai_predictions p LEFT JOIN stations s ON s.id = p.station_id
             ${where}
             ORDER BY p.created_at DESC LIMIT 100`,
            params
        );
        const predictions = result.rows.map(row => ({ ...row, stations: row.station_name ? { name: row.station_name } : null }));
        return res.json({ success: true, predictions });
    } catch (error) {
        console.error("AI PREDICTIONS:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch AI predictions" });
    }
}

async function analyze(req, res) {
    try {
        const text = String(req.body?.text || "").trim();
        if (!text) return res.status(400).json({ success: false, message: "text is required" });
        const lower = text.toLowerCase();
        const insights = [];
        if (lower.includes("temperature") || lower.includes("heat")) insights.push("Temperature-related charging risk detected.");
        if (lower.includes("power") || lower.includes("current")) insights.push("Electrical load should be monitored for abnormal changes.");
        if (lower.includes("battery")) insights.push("Track battery percentage trend and charging duration together.");
        if (!insights.length) insights.push("No predefined anomaly keyword detected; continue collecting telemetry.");
        return res.json({ success: true, analysis: { summary: insights.join(" "), insights } });
    } catch (error) {
        console.error("AI ANALYZE:", error);
        return res.status(500).json({ success: false, message: "Failed to analyze input" });
    }
}

module.exports = { predict, predictions, analyze };
