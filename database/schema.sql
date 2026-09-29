-- EVGRID database schema for Neon PostgreSQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    phone VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    location VARCHAR(255) NOT NULL,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    total_chargers INTEGER DEFAULT 0,
    available_chargers INTEGER DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chargers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    charger_number VARCHAR(50) NOT NULL,
    charger_type VARCHAR(50) NOT NULL,
    power_kw DECIMAL(10,2) NOT NULL,
    connector_type VARCHAR(50),
    status VARCHAR(30) NOT NULL DEFAULT 'available' CHECK (status IN ('available','charging','offline','maintenance')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    registration_number VARCHAR(30) UNIQUE NOT NULL,
    vehicle_model VARCHAR(100) NOT NULL,
    battery_capacity_kwh DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS charging_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    station_id UUID REFERENCES stations(id) ON DELETE SET NULL,
    charger_id UUID REFERENCES chargers(id) ON DELETE SET NULL,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    start_battery_percent DECIMAL(5,2),
    end_battery_percent DECIMAL(5,2),
    energy_consumed_kwh DECIMAL(10,3),
    charging_duration_minutes INTEGER,
    cost DECIMAL(10,2),
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS charging_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES charging_sessions(id) ON DELETE CASCADE,
    voltage DECIMAL(10,2),
    current DECIMAL(10,2),
    power_kw DECIMAL(10,3),
    battery_percent DECIMAL(5,2),
    temperature DECIMAL(5,2),
    energy_consumed_kwh DECIMAL(10,3),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    charger_id UUID REFERENCES chargers(id) ON DELETE CASCADE,
    session_id UUID REFERENCES charging_sessions(id) ON DELETE CASCADE,
    alert_type VARCHAR(100),
    severity VARCHAR(30) CHECK (severity IN ('low','medium','high','critical')),
    message TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    prediction_type VARCHAR(100),
    prediction_value DECIMAL(10,2),
    confidence DECIMAL(5,2),
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chargers_station_id ON chargers(station_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON charging_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON charging_sessions(status);
CREATE INDEX IF NOT EXISTS idx_data_session_id ON charging_data(session_id);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_predictions_station_id ON ai_predictions(station_id);


-- Application authorization is handled by the Node/Express backend with JWTs.
