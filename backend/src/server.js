const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../.env"),
    override: true
});

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = Number(process.env.PORT || 5000);
const FRONTEND_PATH = path.resolve(__dirname, "../../frontend");

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));

const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5000")
    .split(",").map(v => v.trim()).filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("CORS origin not allowed"));
    }
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use("/api", rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests. Please try again later." }
}));

app.get("/api/health", (req, res) => {
    res.json({ success: true, status: "healthy", service: "EVGRID API", database: "Neon PostgreSQL" });
});

app.use("/api/test", require("./routes/testRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/stations", require("./routes/stationRoutes"));
app.use("/api/chargers", require("./routes/chargerRoutes"));
app.use("/api/vehicles", require("./routes/vehicleRoutes"));
app.use("/api/sessions", require("./routes/sessionRoutes"));
app.use("/api/alerts", require("./routes/alertRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

app.use(express.static(FRONTEND_PATH));

app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api/")) {
        return res.sendFile(path.join(FRONTEND_PATH, "index.html"));
    }
    return next();
});

app.use((req, res) => {
    res.status(404).json({ success: false, message: "API endpoint not found" });
});

app.use((err, req, res, next) => {
    console.error("SERVER ERROR:", err);
    const status = err.message === "CORS origin not allowed" ? 403 : 500;
    res.status(status).json({ success: false, message: status === 403 ? "Origin not allowed" : "Internal server error" });
});

app.listen(PORT, () => {
    console.log("----------------------------------------");
    console.log("EVGRID EV STATION MANAGEMENT PORTAL");
    console.log("Database: Neon PostgreSQL");
    console.log(`Server:   http://localhost:${PORT}`);
    console.log(`Health:   http://localhost:${PORT}/api/health`);
    console.log(`Frontend: http://localhost:${PORT}/`);
    console.log("----------------------------------------");
});
