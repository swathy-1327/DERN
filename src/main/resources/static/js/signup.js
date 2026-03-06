document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("signupForm");
    const message = document.getElementById("signupMessage");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const payload = {
            name: document.getElementById("name").value.trim(),
            email: document.getElementById("email").value.trim(),
            password: document.getElementById("password").value,
            role: document.getElementById("role").value
        };

        try {
            const response = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            message.textContent = data.message;

            if (response.ok) {
                form.reset();
                setTimeout(() => {
                    window.location.href = "/login.html";
                }, 1000);
            }
        } catch (error) {
            console.error(error);
            message.textContent = "Signup failed";
        }
    });
});