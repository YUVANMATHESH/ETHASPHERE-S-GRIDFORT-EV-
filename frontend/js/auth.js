function setupLogin() {
    const form = document.getElementById("loginForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const message = document.getElementById("loginMessage");
        const submit = form.querySelector("button[type=submit]");
        submit.disabled = true;
        message.textContent = "Signing in...";

        try {
            const data = await apiRequest("/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    email: document.getElementById("email").value.trim(),
                    password: document.getElementById("password").value
                })
            });

            localStorage.setItem("evgrid_token", data.token);
            localStorage.setItem("evgrid_user", JSON.stringify(data.user));
            location.href = data.user.role === "admin" ? "/admin.html" : "/dashboard.html";
        } catch (error) {
            message.textContent = error.message;
        } finally { submit.disabled = false; }
    });
}

function setupRegister() {
    const form = document.getElementById("registerForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const message = document.getElementById("registerMessage");
        const submit = form.querySelector("button[type=submit]");
        submit.disabled = true;
        message.textContent = "Creating account...";

        try {
            const data = await apiRequest("/auth/register", {
                method: "POST",
                body: JSON.stringify({
                    name: document.getElementById("name").value.trim(),
                    email: document.getElementById("email").value.trim(),
                    phone: document.getElementById("phone").value.trim(),
                    password: document.getElementById("password").value
                })
            });

            localStorage.setItem("evgrid_token", data.token);
            localStorage.setItem("evgrid_user", JSON.stringify(data.user));
            location.href = "/dashboard.html";
        } catch (error) {
            message.textContent = error.message;
        } finally { submit.disabled = false; }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    setupLogin();
    setupRegister();
});
