if (!requireAuth()) { throw new Error("Not authenticated"); }

let stations = [];
let vehicles = [];
let activeSession = null;
let telemetryTimer = null;

const $ = id => document.getElementById(id);
const user = getUser();
$("userName").textContent = user.name || "User";
$("avatar").textContent = (user.name || "U").charAt(0).toUpperCase();

function stationStatusBadge(status) {
    const cls = status === "active" ? "badge-green" : status === "maintenance" ? "badge-yellow" : "badge-red";
    return `<span class="badge ${cls}">${escapeHtml(status)}</span>`;
}

async function loadDashboard() {
    try {
        const [stationRes, chargerRes, sessionRes, analyticsRes, alertRes, vehicleRes] = await Promise.all([
            apiRequest("/stations"),
            apiRequest("/chargers"),
            apiRequest("/sessions?status=active"),
            apiRequest("/analytics/dashboard"),
            apiRequest("/alerts?resolved=false"),
            apiRequest("/vehicles")
        ]);

        stations = stationRes.stations || [];
        vehicles = vehicleRes.vehicles || [];
        renderStations(stations);
        renderVehicles(vehicles);
        renderAlerts(alertRes.alerts || []);

        const metrics = analyticsRes.metrics || {};
        $("stationCount").textContent = metrics.stations ?? stations.length;
        $("availableChargers").textContent = metrics.available_chargers ?? (chargerRes.chargers || []).filter(c => c.status === "available").length;
        $("activeSessions").textContent = metrics.active_sessions ?? 0;
        $("energyConsumed").textContent = formatNumber(metrics.energy_consumed_kwh, 1);
        $("stationHint").textContent = `${stations.length} station(s)`;

        if ((sessionRes.sessions || []).length) {
            activeSession = sessionRes.sessions[0];
            updateSessionUI(activeSession);
        } else {
            updateIdleUI();
        }
    } catch (error) {
        console.error(error);
        $("stationHint").textContent = error.message;
        $("stationsGrid").innerHTML = `<div class="card empty">${escapeHtml(error.message)}</div>`;
    }
}

function renderStations(items) {
    if (!items.length) {
        $("stationsGrid").innerHTML = `<div class="card empty">No stations found. Ask an admin to add demo stations.</div>`;
        return;
    }
    $("stationsGrid").innerHTML = items.map(s => `
        <div class="station-card card">
            <div class="station-head"><div><div class="station-name">${escapeHtml(s.name)}</div><div class="station-location">${escapeHtml(s.location)}</div></div>${stationStatusBadge(s.status)}</div>
            <div class="station-foot"><span>${Number(s.available_chargers || 0)} available</span><span>${Number(s.total_chargers || 0)} total</span></div>
        </div>`).join("");
}

function renderVehicles(items) {
    if (!items.length) {
        $("vehiclesGrid").innerHTML = `<div class="card empty">No vehicle added yet. Add one to start a charging session.</div>`;
        return;
    }
    $("vehiclesGrid").innerHTML = items.map(v => `
        <div class="station-card card"><div class="station-name">${escapeHtml(v.vehicle_model)}</div><div class="station-location">${escapeHtml(v.registration_number)}</div><div class="station-foot"><span>Battery</span><span>${formatNumber(v.battery_capacity_kwh,1)} kWh</span></div></div>`).join("");
}

function renderAlerts(items) {
    if (!items.length) {
        $("alertsList").innerHTML = `<div class="empty">No unresolved alerts.</div>`;
        return;
    }
    $("alertsList").innerHTML = items.slice(0, 8).map(a => `
        <div class="alert"><div><strong>${escapeHtml(a.message || a.alert_type || "Alert")}</strong><small>${escapeHtml(a.alert_type || "SYSTEM")}</small></div><span class="badge ${a.severity === "critical" || a.severity === "high" ? "badge-red" : a.severity === "medium" ? "badge-yellow" : "badge-cyan"}">${escapeHtml(a.severity || "low")}</span></div>`).join("");
}

function updateSessionUI(session) {
    $("sessionMeta").textContent = `Session ${session.id.slice(0, 8)} · Charger ${session.charger_id?.slice(0,8) || "—"}`;
    $("liveBadge").className = "badge badge-green";
    $("liveBadge").textContent = "LIVE";
    $("startDemo").classList.add("hidden");
    $("stopDemo").classList.remove("hidden");
    refreshLatestTelemetry();
    if (!telemetryTimer) telemetryTimer = setInterval(refreshLatestTelemetry, 2500);
}

function updateIdleUI() {
    $("sessionMeta").textContent = "No active session";
    $("liveBadge").className = "badge badge-yellow";
    $("liveBadge").textContent = "IDLE";
    $("startDemo").classList.remove("hidden");
    $("stopDemo").classList.add("hidden");
}

async function refreshLatestTelemetry() {
    if (!activeSession) return;
    try {
        const data = await apiRequest(`/sessions/${activeSession.id}/data`);
        const latest = (data.data || [])[0];
        if (!latest) return;
        const battery = Number(latest.battery_percent || 0);
        $("battery").textContent = `${battery.toFixed(0)}%`;
        $("batteryBar").style.width = `${battery}%`;
        $("voltage").textContent = `${formatNumber(latest.voltage,0)} V`;
        $("current").textContent = `${formatNumber(latest.current,0)} A`;
        $("power").textContent = `${formatNumber(latest.power_kw,1)} kW`;
    } catch (error) { console.warn(error); }
}

async function startDemo() {
    if (!vehicles.length) {
        openVehicleModal();
        return;
    }

    try {
        const active = await apiRequest("/sessions?status=active");
        if (active.sessions?.length) {
            activeSession = active.sessions[0];
            updateSessionUI(activeSession);
            return;
        }

        const activeStation = stations.find(s => s.status === "active" && Number(s.available_chargers) > 0);
        if (!activeStation) throw new Error("No station with an available charger");

        const chargerRes = await apiRequest(`/chargers?station_id=${activeStation.id}`);
        const charger = (chargerRes.chargers || []).find(c => c.status === "available");
        if (!charger) throw new Error("No available charger at this station");

        const data = await apiRequest("/sessions/start", {
            method: "POST",
            body: JSON.stringify({
                vehicle_id: vehicles[0].id,
                station_id: activeStation.id,
                charger_id: charger.id,
                start_battery_percent: 25
            })
        });

        activeSession = data.session;
        updateSessionUI(activeSession);
        await refreshDashboardFast();
        startTelemetryLoop();
    } catch (error) { alert(error.message); }
}

function startTelemetryLoop() {
    if (telemetryTimer) clearInterval(telemetryTimer);
    telemetryTimer = setInterval(async () => {
        if (!activeSession) return;
        try {
            await apiRequest(`/sessions/${activeSession.id}/simulate`, { method: "POST", body: JSON.stringify({}) });
            await refreshLatestTelemetry();
            const ai = await apiRequest("/ai/predict", { method: "POST", body: JSON.stringify({ station_id: activeSession.station_id, session_id: activeSession.id }) });
            const p = ai.prediction || {};
            $("aiScore").textContent = `${formatNumber(p.prediction_value,1)}%`;
            $("aiText").textContent = `${p.prediction_type}: ${p.explanation}`;
            if (Number(p.prediction_value) >= 60) $("aiScore").style.color = "var(--red)";
            else if (Number(p.prediction_value) >= 35) $("aiScore").style.color = "var(--yellow)";
            else $("aiScore").style.color = "var(--green)";
            await refreshDashboardFast();
        } catch (error) { console.warn(error); }
    }, 3500);
}

async function stopDemo() {
    if (!activeSession) return;
    try {
        await apiRequest(`/sessions/${activeSession.id}/complete`, { method: "POST", body: JSON.stringify({}) });
        if (telemetryTimer) clearInterval(telemetryTimer);
        telemetryTimer = null;
        activeSession = null;
        updateIdleUI();
        await loadDashboard();
    } catch (error) { alert(error.message); }
}

async function refreshDashboardFast() {
    const metrics = await apiRequest("/analytics/dashboard");
    const m = metrics.metrics || {};
    $("availableChargers").textContent = m.available_chargers ?? "—";
    $("activeSessions").textContent = m.active_sessions ?? "—";
    $("energyConsumed").textContent = formatNumber(m.energy_consumed_kwh, 1);
}

function openVehicleModal() { $("vehicleModal").classList.add("open"); }
function closeVehicleModal() { $("vehicleModal").classList.remove("open"); $("vehicleMessage").textContent = ""; }

$("startDemo").addEventListener("click", startDemo);
$("stopDemo").addEventListener("click", stopDemo);
$("addVehicleBtn").addEventListener("click", openVehicleModal);

$("vehicleForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        await apiRequest("/vehicles", { method: "POST", body: JSON.stringify({
            registration_number: $("vehicleReg").value.trim(), vehicle_model: $("vehicleModel").value.trim(), battery_capacity_kwh: Number($("vehicleBattery").value || 0) || null
        }) });
        closeVehicleModal(); e.target.reset(); await loadDashboard();
    } catch (error) { $("vehicleMessage").textContent = error.message; }
});

loadDashboard();
