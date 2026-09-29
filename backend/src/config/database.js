const path = require("path");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config({
    path: path.resolve(__dirname, "../../.env"),
    override: true
});

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is missing from backend/.env");
}

const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.on("error", (error) => {
    console.error("POSTGRES POOL ERROR:", error);
});

async function query(text, params = []) {
    return pool.query(text, params);
}

module.exports = {
    pool,
    query
};
