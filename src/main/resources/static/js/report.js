document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("reportForm");
    const message = document.getElementById("message");
    const latitudeInput = document.getElementById("latitude");
    const longitudeInput = document.getElementById("longitude");

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            latitudeInput.value = position.coords.latitude;
            longitudeInput.value = position.coords.longitude;
        });
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const payload = {
            type: document.getElementById("type").value,
            description: document.getElementById("description").value,
            latitude: parseFloat(document.getElementById("latitude").value),
            longitude: parseFloat(document.getElementById("longitude").value),
            severity: parseInt(document.getElementById("severity").value),
            numberPlate: document.getElementById("numberPlate").value
        };

        try {
            const response = await fetch("/api/reports", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                message.textContent = "Report submitted successfully.";
                form.reset();
            } else {
                message.textContent = "Failed to submit report.";
            }
        } catch (error) {
            console.error(error);
            message.textContent = "Something went wrong.";
        }
    });
});