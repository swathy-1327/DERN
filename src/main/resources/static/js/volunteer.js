document.addEventListener("DOMContentLoaded", () => {
    loadActiveRequests();
    setInterval(loadActiveRequests, 10000);
});

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
            </div>
        `).join("");
    } catch (error) {
        console.error(error);
        container.innerHTML = "<p>Failed to load active requests.</p>";
    }
}