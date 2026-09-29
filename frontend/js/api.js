const API = "/api";

async function apiRequest(path, options = {}) {
    const token = localStorage.getItem("evgrid_token");
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API}${path}`, { ...options, headers });
    let data = null;
    try { data = await response.json(); } catch (_) { data = {}; }

    if (response.status === 401) {
        localStorage.removeItem("evgrid_token");
        localStorage.removeItem("evgrid_user");
        if (!location.pathname.endsWith("login.html") && !location.pathname.endsWith("register.html")) {
            location.href = "/login.html";
        }
    }

    if (!response.ok) throw new Error(data.message || "Request failed");
    return data;
}

function getUser() {
    try { return JSON.parse(localStorage.getItem("evgrid_user") || "{}"); } catch (_) { return {}; }
}

function requireAuth() {
    if (!localStorage.getItem("evgrid_token")) {
        location.href = "/login.html";
        return false;
    }
    return true;
}

function logout() {
    localStorage.removeItem("evgrid_token");
    localStorage.removeItem("evgrid_user");
    location.href = "/login.html";
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));
}

function formatNumber(value, digits = 1) {
    const n = Number(value || 0);
    return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}
