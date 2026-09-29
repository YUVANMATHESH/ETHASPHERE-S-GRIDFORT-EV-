if (!requireAuth()) throw new Error("Not authenticated");

const user = getUser();
if (user.role !== "admin") { location.href = "/dashboard.html"; throw new Error("Admin only"); }
const $ = id => document.getElementById(id);
$("userName").textContent = user.name || "Admin";
$("avatar").textContent = (user.name || "A").charAt(0).toUpperCase();

async function loadAdmin() {
    try {
        const data = await apiRequest("/admin/dashboard");
        $("usersCount").textContent = data.users?.length ?? 0;
        $("stationsCount").textContent = data.stations?.length ?? 0;
        $("chargersCount").textContent = data.chargers?.length ?? 0;
        $("alertsCount").textContent = (data.alerts || []).filter(a => !a.resolved).length;
        renderStations(data.stations || []);
        renderUsers(data.users || []);
        renderSessions(data.sessions || []);
        renderAlerts(data.alerts || []);
    } catch (error) {
        alert(error.message);
    }
}

function renderStations(items) {
    $("stationsGrid").innerHTML = items.length ? items.map(s => `
    <div class="station-card card"><div class="station-head"><div><div class="station-name">${escapeHtml(s.name)}</div><div class="station-location">${escapeHtml(s.location)}</div></div><span class="badge ${s.status === "active" ? "badge-green" : s.status === "maintenance" ? "badge-yellow" : "badge-red"}">${escapeHtml(s.status)}</span></div><div class="station-foot"><span>${s.available_chargers || 0} available</span><span>${s.total_chargers || 0} total</span></div></div>`).join("") : `<div class="card empty">No stations.</div>`;
}
function renderUsers(items) {
    $("usersTable").innerHTML = items.length ? items.map(u => `<tr><td>${escapeHtml(u.name)}</td><td>${escapeHtml(u.email)}</td><td>${escapeHtml(u.role)}</td><td>${new Date(u.created_at).toLocaleDateString()}</td></tr>`).join("") : `<tr><td colspan="4" class="empty">No users</td></tr>`;
}
function renderSessions(items) {
    $("sessionsTable").innerHTML = items.length ? items.slice(0,50).map(s => `<tr><td><span class="badge ${s.status === "active" ? "badge-green" : "badge-cyan"}">${escapeHtml(s.status)}</span></td><td>${formatNumber(s.energy_consumed_kwh,2)} kWh</td><td>₹${formatNumber(s.cost,2)}</td><td>${s.start_time ? new Date(s.start_time).toLocaleString() : "—"}</td></tr>`).join("") : `<tr><td colspan="4" class="empty">No sessions</td></tr>`;
}
function renderAlerts(items) {
    $("alertsList").innerHTML = items.length ? items.slice(0,30).map(a => `<div class="alert"><div><strong>${escapeHtml(a.message || a.alert_type)}</strong><small>${new Date(a.created_at).toLocaleString()}</small></div><span class="badge ${a.resolved ? "badge-cyan" : a.severity === "critical" || a.severity === "high" ? "badge-red" : "badge-yellow"}">${a.resolved ? "resolved" : escapeHtml(a.severity || "alert")}</span></div>`).join("") : `<div class="empty">No alerts</div>`;
}

function openStationModal() { $("stationModal").classList.add("open"); }
function closeStationModal() { $("stationModal").classList.remove("open"); $("stationMessage").textContent = ""; }
$("addStationBtn").addEventListener("click", openStationModal);
$("stationForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        await apiRequest("/stations", { method: "POST", body: JSON.stringify({ name: $("stationName").value.trim(), location: $("stationLocation").value.trim(), total_chargers: Number($("stationChargers").value || 0), available_chargers: Number($("stationChargers").value || 0) }) });
        e.target.reset(); closeStationModal(); await loadAdmin();
    } catch (error) { $("stationMessage").textContent = error.message; }
});
loadAdmin();
