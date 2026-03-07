document.addEventListener("DOMContentLoaded", () => {
    const enableBtn = document.getElementById("enableNotificationsBtn");
    const status = document.getElementById("notificationStatus");

    loadNotifications();

    if (enableBtn) {
        enableBtn.addEventListener("click", async () => {
            if (!("Notification" in window)) {
                status.textContent = "This browser does not support notifications.";
                return;
            }

            const permission = await Notification.requestPermission();

            if (permission === "granted") {
                status.textContent = "Notifications enabled.";
                localStorage.setItem("dernNotificationsEnabled", "true");
            } else {
                status.textContent = "Notification permission denied.";
                localStorage.setItem("dernNotificationsEnabled", "false");
            }
        });
    }
});

function loadNotifications() {
    const container = document.getElementById("notificationList");
    const alerts = JSON.parse(localStorage.getItem("dernAlerts") || "[]");

    if (alerts.length === 0) {
        container.innerHTML = "<p>No notifications yet.</p>";
        return;
    }

    container.innerHTML = alerts.map(alert => `
        <div class="request-card">
            <p><strong>${alert.title}</strong></p>
            <p>${alert.message}</p>
            <p><small>${alert.time}</small></p>
        </div>
    `).join("");
}