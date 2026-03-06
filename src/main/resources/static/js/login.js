document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    const message = document.getElementById("loginMessage");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const payload = {
            email: document.getElementById("email").value.trim(),
            password: document.getElementById("password").value
        };

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            message.textContent = data.message;

            if (response.ok) {
                if (data.role === "VOLUNTEER") {
                    window.location.href = "/volunteer.html";
                } else {
                    window.location.href = "/index.html";
                }
            }
        } catch (error) {
            console.error(error);
            message.textContent = "Login failed";
        }
    });
});