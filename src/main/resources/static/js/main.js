let map;

async function initMap() {
    const defaultLocation = { lat: 10.0159, lng: 76.3419 };

    map = new google.maps.Map(document.getElementById("map"), {
        center: defaultLocation,
        zoom: 14,
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };

                map.setCenter(userLocation);

                new google.maps.Marker({
                    position: userLocation,
                    map,
                    title: "You are here",
                });
            },
            () => {
                console.log("Location access denied.");
            }
        );
    }

    await loadReports();
}

async function loadReports() {
    try {
        const response = await fetch("/api/reports");
        const reports = await response.json();

        reports.forEach((report) => {
            new google.maps.Marker({
                position: {
                    lat: report.latitude,
                    lng: report.longitude,
                },
                map: map,
                title: `${report.type} - ${report.description || ""}`,
            });
        });
    } catch (error) {
        console.error("Error loading reports:", error);
    }
}