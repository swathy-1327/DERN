document.addEventListener("DOMContentLoaded", async () => {
    const ok = await checkVolunteerAuth();
    if (!ok) return;
    await pollVolunteerNotifications(true);
    setInterval(() => pollVolunteerNotifications(false), 5000);
    loadActiveRequests();
    setInterval(loadActiveRequests, 10000);
});

async function checkVolunteerAuth() {
    try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
            window.location.href = "/index.html";
            return false;
        }

        const user = await response.json();

        if (user.role !== "VOLUNTEER") {
            window.location.href = "/main.html";
            return false;
        }

        return true;
    } catch (error) {
        console.error(error);
        window.location.href = "/index.html";
        return false;
    }
}

async function loadActiveRequests() {
    const container = document.getElementById("activeRequests");

    try {
        const response = await fetch("/api/volunteer/active-requests");
        const data = await response.json();

        if (!response.ok) {
            container.innerHTML = `<p>${data.message}</p>`;
            return;
        }

        if (data.length === 0) {
            container.innerHTML = "<p>No active SOS requests right now.</p>";
            return;
        }

        container.innerHTML = data.map(event => `
        <div class="request-card">
                <h4>Emergency Request #${event.id}</h4>
                <p><strong>Status:</strong> ${event.status}</p>
                <p><strong>User ID:</strong> ${event.userId ?? "Unknown"}</p>
                <p><strong>Latitude:</strong> ${event.latitude}</p>
                <p><strong>Longitude:</strong> ${event.longitude}</p>
                <a target="_blank" href="https://www.google.com/maps?q=${event.latitude},${event.longitude}">
                  Open Location
                </a>
                <button onclick ="markRequestSpam(${event.id})">Mark as Spam</button>
                <p><strong>Responder Priority:</strong></p>
                <ul>
                  <li>Doctors nearby</li>
                  <li>Nurses nearby</li>
                  <li>CPR trained volunteers</li>
                  <li>General volunteers</li>
                </ul>
            </div>
        `).join("");
    } catch (error) {
        console.error(error);
        container.innerHTML = "<p>Failed to load active requests.</p>";
    }
}
let volunteerSeenNotificationIds = new Set();

async function pollVolunteerNotifications(initialLoad = false) {
    try {
        const response = await fetch("/api/notifications/me");
        const data = await response.json();

        if (!response.ok) return;

        if (!initialLoad) {
            for (const item of data) {
                if (!volunteerSeenNotificationIds.has(item.id)) {
                    volunteerSeenNotificationIds.add(item.id);

                    if (localStorage.getItem("dernNotificationsEnabled") === "true"
                        && "Notification" in window
                        && Notification.permission === "granted") {

                        if ("serviceWorker" in navigator) {
                            const reg = await navigator.serviceWorker.ready;
                            await reg.showNotification(item.title, {
                                body: item.message,
                                requireInteraction: true
                            });
                        } else {
                            new Notification(item.title, { body: item.message });
                        }
                    }
                }
            }
        } else {
            data.forEach(item => volunteerSeenNotificationIds.add(item.id));
        }
    } catch (e) {
        console.error(e);
    }
}
async function markRequestSpam(id) {
    try {
        const response = await fetch(`/api/volunteer/mark-spam/${id}`, {
            method: "POST"
        });

        const data = await response.json();
        alert(data.message || "Spam vote submitted");
        loadActiveRequests();
    } catch (error) {
        console.error(error);
        alert("Failed to mark as spam");
    }
}