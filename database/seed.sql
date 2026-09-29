-- Run after schema.sql.
-- Demo station data. Create users from the portal's Register page.

INSERT INTO stations (id, name, location, latitude, longitude, total_chargers, available_chargers, status)
VALUES
('11111111-1111-1111-1111-111111111111', 'Central EV Hub', 'Perundurai, Erode', 11.2756, 77.5873, 6, 5, 'active'),
('22222222-2222-2222-2222-222222222222', 'Smart Charge Point', 'Erode', 11.3410, 77.7172, 4, 4, 'active'),
('33333333-3333-3333-3333-333333333333', 'Green Mobility Hub', 'Coimbatore', 11.0168, 76.9558, 4, 0, 'maintenance')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    location = EXCLUDED.location,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    total_chargers = EXCLUDED.total_chargers,
    available_chargers = EXCLUDED.available_chargers,
    status = EXCLUDED.status;

INSERT INTO chargers (id, station_id, charger_number, charger_type, power_kw, connector_type, status)
VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'CH-01', 'DC Fast', 60, 'CCS2', 'available'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'CH-02', 'DC Fast', 120, 'CCS2', 'available'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'CH-03', 'AC Fast', 22, 'Type 2', 'available'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', 'CH-04', 'DC Fast', 60, 'CCS2', 'maintenance')
ON CONFLICT (id) DO UPDATE SET
    station_id = EXCLUDED.station_id,
    charger_number = EXCLUDED.charger_number,
    charger_type = EXCLUDED.charger_type,
    power_kw = EXCLUDED.power_kw,
    connector_type = EXCLUDED.connector_type,
    status = EXCLUDED.status;
