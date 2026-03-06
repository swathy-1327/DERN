let map;
let reportMarkers = [];
let activeSosId = null;
let sosActive = false;
let currentUserLat = null;
let currentUserLng = null;
let allReports = [];
let heatLayer = null;

const redIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25,41],
    iconAnchor: [12,41],
    popupAnchor: [1,-34],
    shadowSize: [41,41]
});

const orangeIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25,41],
    iconAnchor: [12,41],
    popupAnchor: [1,-34],
    shadowSize: [41,41]
});

const yellowIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25,41],
    iconAnchor: [12,41],
    popupAnchor: [1,-34],
    shadowSize: [41,41]
});

const blueIcon = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25,41],
    iconAnchor: [12,41],
    popupAnchor: [1,-34],
    shadowSize: [41,41]
});

function initMap() {
    const defaultLat = 10.0159;
    const defaultLng = 76.3419;

    map = L.map("map").setView([defaultLat, defaultLng], 14);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;

                map.setView([userLat, userLng], 15);

                L.marker([userLat, userLng])
                    .addTo(map)
                    .bindPopup("You are here")
                    .openPopup();
            },
            (error) => {
                console.log("Location access denied or unavailable:", error.message);
            }
        );
    }

    loadReports();
}


function checkNearbyHazards() {
    if (currentUserLat === null || currentUserLng === null) return;

    const nearby = allReports.find(report => {
        const distance = getDistanceInMeters(
            currentUserLat,
            currentUserLng,
            report.latitude,
            report.longitude
        );

        return distance <= 100;
    });

    if (nearby) {
        showAlert(`⚠ ${nearby.type} reported nearby`);
    } else {
        hideAlert();
    }
}

function showAlert(message) {
    const alertBox = document.getElementById("alertBox");
    alertBox.textContent = message;
    alertBox.classList.remove("alert-hidden");
}

function hideAlert() {
    const alertBox = document.getElementById("alertBox");
    alertBox.classList.add("alert-hidden");
}

function trackUserLocation() {
    if (!navigator.geolocation) {
        return;
    }

    navigator.geolocation.watchPosition(
        (position) => {
            currentUserLat = position.coords.latitude;
            currentUserLng = position.coords.longitude;

            checkNearbyHazards();
        },
        (error) => {
            console.log("Location tracking error:", error.message);
        },
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
        }
    );
}

function getDistanceInMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

function getWeightForReport(type, severity) {
    const s = severity || 1;

    if (type === "ACCIDENT_PRONE") return Math.min(1, 0.55 + s * 0.1);
    if (type === "CRASH") return Math.min(1, 0.5 + s * 0.1);
    if (type === "POTHOLE") return Math.min(1, 0.4 + s * 0.1);
    if (type === "OPEN_CANAL") return Math.min(1, 0.45 + s * 0.1);
    if (type === "UNSAFE_AREA") return Math.min(1, 0.35 + s * 0.1);
    if (type === "VIOLATION") return Math.min(1, 0.25 + s * 0.08);

    return 0.4;
}

async function loadReports() {
    try {
        const response = await fetch("/api/reports");
        const reports = await response.json();

        allReports = reports;

        function getIconForReport(type){

            if (type === "ACCIDENT_PRONE") return redIcon;
            
            if(type === "POTHOLE") return redIcon;

            if(type === "CRASH") return redIcon;

            if(type === "OPEN_CANAL") return orangeIcon;

            if(type === "UNSAFE_AREA") return orangeIcon;

            if(type === "VIOLATION") return yellowIcon;

            return blueIcon;
        }

        reportMarkers.forEach(marker => map.removeLayer(marker));
        reportMarkers = [];

        reports.forEach((report) => {
            const marker = L.marker([report.latitude, report.longitude] , { icon : getIconForReport(report.type) })
                .addTo(map)
                .bindPopup(`
          <b>${report.type}</b><br>
          ${report.description || "No description"}<br>
          Severity: ${report.severity ?? "N/A"}
        `);

            reportMarkers.push(marker);
        });

        drawHeatMap();

    } catch (error) {
        console.error("Error loading reports:", error);
    }
}

function drawHeatMap() {
    if (heatLayer) {
        map.removeLayer(heatLayer);
    }

    const heatPoints = allReports.map(report => [
        report.latitude,
        report.longitude,
        getWeightForReport(report.type, report.severity)
    ]);

    heatLayer = L.heatLayer(heatPoints, {
        radius: 30,
        blur: 20,
        maxZoom: 17
    }).addTo(map);
}

document.addEventListener("DOMContentLoaded", initMap);

const sosButton = document.getElementById("sosButton");

sosButton.addEventListener("click", async () => {

    if(!sosActive){
        activateSOS();
    } else {
        cancelSOS();
    }

});

async function activateSOS(){

    if(!navigator.geolocation){
        alert("Geolocation not supported");
        return;
    }

    navigator.geolocation.getCurrentPosition(async (position)=>{

        const payload = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            status: "ACTIVE"
        };

        try{

            const response = await fetch("/api/sos",{
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify(payload)
            });

            const data = await response.json();

            activeSosId = data.id;

            sosActive = true;

            updateSOSButton();

        }catch(error){
            console.error(error);
        }

    });

}

async function cancelSOS(){

    if(!activeSosId) return;

    try{

        const response = await fetch(`/api/sos/${activeSosId}/cancel`,{
            method:"PUT"
        });

        if(response.ok){

            sosActive = false;
            activeSosId = null;

            updateSOSButton();
        }

    }catch(error){
        console.error(error);
    }

}
function updateSOSButton(){

    if(sosActive){

        sosButton.textContent = "CANCEL";
        sosButton.classList.remove("sos-off");
        sosButton.classList.add("sos-on");

    }else{

        sosButton.textContent = "SOS";
        sosButton.classList.remove("sos-on");
        sosButton.classList.add("sos-off");

    }

}
async function triggerSOS() {
    if (!navigator.geolocation) {
        alert("Geolocation not supported.");
        return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
        const payload = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            status: "ACTIVE"
        };

        try {
            const response = await fetch("/api/sos", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            activeSosId = data.id;

            alert("SOS Activated");

        } catch (error) {
            console.error(error);
            alert("Something went wrong.");
        }
    });
}