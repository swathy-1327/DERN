let map;
let reportMarkers = [];
let activeSosId = null;
let sosActive = false;
let currentUserLat = null;
let currentUserLng = null;
let allReports = [];
let heatLayer = null;
let radarInterval = null;
let userMarker = null ;
let markersVisible = true ;
let heatmapVisible = true ;
let routeLine = null;
let responderMarkers = [];
let demoVolunteers = [
    {name:"Dr. Alex", skill:"DOCTOR", lat:9.968, lng:76.326},
    {name:"Nurse Maria", skill:"NURSE", lat:9.967, lng:76.322},
    {name:"Rahul", skill:"CPR_TRAINED", lat:9.970, lng:76.327},
    {name:"Arjun", skill:"GENERAL_VOLUNTEER", lat:9.965, lng:76.320}
];

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

async function checkAuthAndLoad() {
    try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
            window.location.href = "/index.html";
            return;
        }

        const user = await response.json();
        console.log("Logged in as:", user.name, user.role);

        const volunteerLink = document.getElementById("volunteerDashboardLink");
        if (volunteerLink) {
            if (user.role === "VOLUNTEER") {
                volunteerLink.style.display = "block";
            } else {
                volunteerLink.style.display = "none";
            }
        }

        initMap();
    } catch (error) {
        console.error("Auth check failed:", error);
        window.location.href = "/index.html";
    }
}

function initMap() {
    const defaultLat = 10.0159;
    const defaultLng = 76.3419;

    map = L.map("map").setView([defaultLat, defaultLng], 13);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            currentUserLat = position.coords.latitude;
            currentUserLng = position.coords.longitude;

            map.setView([currentUserLat, currentUserLng], 15);

            if (userMarker) {
                map.removeLayer(userMarker);
            }

            userMarker = L.marker([currentUserLat, currentUserLng], { icon: blueIcon })
                .addTo(map)
                .bindPopup("You are here")
                .openPopup();

            loadReports();
            trackUserLocation();
        }, () => {
            loadReports();
        });
    } else {
        loadReports();
    }
}
let lastSpokenMessage = "";

function speakAlert(message) {
    if (!("speechSynthesis" in window)) return;

    if (lastSpokenMessage === message) return;

    lastSpokenMessage = message;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
}

function checkNearbyHazards() {
    if (currentUserLat === null || currentUserLng === null) return;
    if (!allReports || allReports.length === 0) {
        hideAlert();
        return;
    }

    let nearestReport = null;
    let nearestDistance = Infinity;

    allReports.forEach(report => {
        const distance = getDistanceInMeters(
            currentUserLat,
            currentUserLng,
            report.latitude,
            report.longitude
        );

        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestReport = report;
        }
    });

    if (nearestReport && nearestDistance <= 100) {
        let spokenMessage = "";

        if (nearestReport.type === "POTHOLE") {
            spokenMessage = "Pothole ahead";
        } else if (nearestReport.type === "CRASH") {
            spokenMessage = "Crash ahead";
        } else if (nearestReport.type === "OPEN_CANAL") {
            spokenMessage = "Open canal ahead";
        } else if (nearestReport.type === "UNSAFE_AREA") {
            spokenMessage = "Unsafe area ahead";
        } else if (nearestReport.type === "ACCIDENT_PRONE") {
            spokenMessage = "Accident prone area ahead";
        } else if (nearestReport.type === "NARROW_ROAD") {
            spokenMessage = "Narrow road ahead";
        } else {
            spokenMessage = `${nearestReport.type} ahead`;
        }

        showAlert(`⚠ ${spokenMessage} (${Math.round(nearestDistance)}m)`);

        speakAlert(spokenMessage);
    } else {
        hideAlert();
        lastSpokenMessage = "";
    }
}
function getSkillPriority(skill){

    if(skill === "DOCTOR") return 1;
    if(skill === "NURSE") return 2;
    if(skill === "CPR_TRAINED") return 3;
    return 4;

}
function calculateDistance(lat1, lon1, lat2, lon2){

    const R = 6371;

    const dLat = (lat2-lat1) * Math.PI/180;
    const dLon = (lon2-lon1) * Math.PI/180;

    const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1*Math.PI/180) *
        Math.cos(lat2*Math.PI/180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;

}
function findBestResponder(userLat, userLng){

    let responders = demoVolunteers.map(v=>{

        return {
            ...v,
            distance: calculateDistance(userLat,userLng,v.lat,v.lng),
            priority: getSkillPriority(v.skill)
        }

    });

    responders.sort((a,b)=>{

        if(a.priority !== b.priority){
            return a.priority - b.priority;
        }

        return a.distance - b.distance;

    });

    return responders[0];

}
function showResponderRadar(){

    responderMarkers.forEach(m=>map.removeLayer(m));
    responderMarkers = [];

    demoVolunteers.forEach(v=>{

        let marker = L.circleMarker(
            [v.lat,v.lng],
            {
                radius:8,
                color:"blue"
            }
        ).addTo(map);

        marker.bindPopup(
            v.name + " (" + v.skill + ")"
        );

        responderMarkers.push(marker);

    });

}
function showAlert(message) {
    const alertBox = document.getElementById("alertBox");
    if (!alertBox) return;

    alertBox.textContent = message;
    alertBox.classList.remove("alert-hidden");
}

function hideAlert() {
    const alertBox = document.getElementById("alertBox");
    if (!alertBox) return;

    alertBox.classList.add("alert-hidden");
}

function toggleMarkers() {

    markersVisible = !markersVisible;

    const btn = document.getElementById("toggleMarkersBtn");

    if (markersVisible) {

        btn.textContent = "Hide Markers";
        loadReports();

    } else {

        btn.textContent = "Show Markers";

        reportMarkers.forEach(marker => {
            map.removeLayer(marker);
        });

        reportMarkers = [];

    }

}

function toggleHeatmap() {
    heatmapVisible = !heatmapVisible;

    const btn = document.getElementById("toggleHeatmapBtn");
    if (btn) {
        btn.textContent = heatmapVisible ? "Hide Heatmap" : "Show Heatmap";
    }

    drawHeatMap();
}

function trackUserLocation() {
    if (!navigator.geolocation) return;

    navigator.geolocation.watchPosition(
        (position) => {
            currentUserLat = position.coords.latitude;
            currentUserLng = position.coords.longitude;

            if (userMarker) {
                userMarker.setLatLng([currentUserLat, currentUserLng]);
            } else {
                userMarker = L.marker([currentUserLat, currentUserLng], { icon: blueIcon })
                    .addTo(map)
                    .bindPopup("You are here");
            }

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
    if (type === "NARROW_ROAD") return Math.min(1, 0.3 + s * 0.08);

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

            if(type === "NARROW_ROAD") return orangeIcon;

            return blueIcon;
        }
        reportMarkers.forEach(marker => map.removeLayer(marker));
        reportMarkers = [];

        if (markersVisible) {
            reports.forEach((report) => {
                const marker = L.marker(
                    [report.latitude, report.longitude],
                    {icon: getIconForReport(report.type)}
                )
                    .addTo(map)
                    .bindPopup(`
                     <b>${report.type}</b><br>
                     ${report.description || "No description"}<br>
                     Severity: ${report.severity ?? "N/A"}<br>
                     AI Status: ${report.aiStatus || "Not analysed"}<br>
                     AI Confidence: ${report.aiConfidence || "N/A"}<br>
                     AI Severity: ${report.aiSeverityEstimate || "N/A"}
`);

                reportMarkers.push(marker);
            });
        }

        drawHeatMap();
        checkNearbyHazards();

    } catch (error) {
        console.error("Error loading reports:", error);
    }
}

function drawHeatMap() {
    if (heatLayer) {
        map.removeLayer(heatLayer);
        heatLayer = null;
    }

    if (!heatmapVisible) return;

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

document.addEventListener("DOMContentLoaded", () => {
    checkAuthAndLoad();
    const safeWalkToggleBtn = document.getElementById("safeWalkToggleBtn");
    const safeWalkPanel = document.getElementById("safeWalkPanel");
    const startSafeWalkBtn = document.getElementById("startSafeWalkBtn");

    if (safeWalkToggleBtn && safeWalkPanel) {
        safeWalkToggleBtn.addEventListener("click", () => {
            safeWalkPanel.classList.toggle("hidden-panel");
        });
    }

    if (startSafeWalkBtn) {
        startSafeWalkBtn.addEventListener("click", startSafeWalk);
    }

    function startSafeWalk() {
        const destLat = parseFloat(document.getElementById("destLat").value);
        const destLng = parseFloat(document.getElementById("destLng").value);

        if (currentUserLat === null || currentUserLng === null) {
            alert("Current location not available yet.");
            return;
        }

        if (isNaN(destLat) || isNaN(destLng)) {
            alert("Enter valid destination coordinates.");
            return;
        }

        if (routeLine) {
            map.removeLayer(routeLine);
        }

        routeLine = L.polyline([
            [currentUserLat, currentUserLng],
            [destLat, destLng]
        ], { color: "green", weight: 5 }).addTo(map);

        map.fitBounds(routeLine.getBounds());

        evaluateSafeWalk(destLat, destLng);
    }

    function evaluateSafeWalk(destLat, destLng) {
        const warnings = [];
        let dangerScore = 0;

        allReports.forEach(report => {
            const d1 = getDistanceInMeters(currentUserLat, currentUserLng, report.latitude, report.longitude);
            const d2 = getDistanceInMeters(destLat, destLng, report.latitude, report.longitude);

            if (d1 <= 300 || d2 <= 300) {
                warnings.push(`${report.type}: ${report.description || "Reported hazard near route"}`);

                if (report.type === "CRASH" || report.type === "ACCIDENT_PRONE") dangerScore += 25;
                else if (report.type === "UNSAFE_AREA" || report.type === "OPEN_CANAL") dangerScore += 20;
                else if (report.type === "POTHOLE") dangerScore += 10;
                else dangerScore += 8;
            }
        });

        let safetyScore = 100 - dangerScore;
        if (safetyScore < 0) safetyScore = 0;

        document.getElementById("safeWalkScore").textContent = `Safety Score: ${safetyScore}/100`;

        const warningsBox = document.getElementById("safeWalkWarnings");
        if (warnings.length === 0) {
            warningsBox.innerHTML = "<div class='request-card'>No major hazards detected near this route.</div>";
        } else {
            warningsBox.innerHTML = warnings.map(w => `<div class="request-card">${w}</div>`).join("");
        }
    }
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", logoutUser);
    }
    const menuToggleBtn = document.getElementById("menuToggleBtn");
    const sideMenu = document.getElementById("sideMenu");

    if (menuToggleBtn && sideMenu) {
        menuToggleBtn.addEventListener("click", () => {
            sideMenu.classList.toggle("hidden-menu");
        });
    }

    const sosButton = document.getElementById("sosButton");
    if (sosButton) {
        sosButton.addEventListener("click", async () => {
            if (!sosActive) {
                await activateSOS();
            } else {
                await cancelSOS();
            }
        });
    }

    const toggleMarkersBtn = document.getElementById("toggleMarkersBtn");
    if (toggleMarkersBtn) {
        toggleMarkersBtn.addEventListener("click", toggleMarkers);
    }

    const toggleHeatmapBtn = document.getElementById("toggleHeatmapBtn");
    if (toggleHeatmapBtn) {
        toggleHeatmapBtn.addEventListener("click", toggleHeatmap);
    }

    setInterval(() => {
        loadReports();
    }, 15000);
});

async function logoutUser() {
    try {
        await fetch("/api/auth/logout", {
            method: "POST"
        });

        window.location.href = "/index.html";
    } catch (error) {
        console.error("Logout failed:", error);
    }
}

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

            showImmediateSosNotification();

            const alertEntry = {
                title: "SOS Alert Triggered",
                message: `Emergency reported at ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
                time: new Date().toLocaleString()
            };

            const existingAlerts = JSON.parse(localStorage.getItem("dernAlerts") || "[]");
            existingAlerts.unshift(alertEntry);
            localStorage.setItem("dernAlerts", JSON.stringify(existingAlerts.slice(0, 20)));

            if (localStorage.getItem("dernNotificationsEnabled") === "true" && Notification.permission === "granted") {
                new Notification("DERN SOS Alert", {
                    body: "A user has triggered an SOS emergency alert."
                });
            }
            const best = findBestResponder(
                position.coords.latitude,
                position.coords.longitude
            );

            document.getElementById("responderName").innerText =
                best.name;

            document.getElementById("responderSkill").innerText =
                "Skill: " + best.skill;

            document.getElementById("responderDistance").innerText =
                "Distance: " + best.distance.toFixed(2) + " km";

            document.getElementById("bestResponderBox").style.display="block";
            // SHOW GOLDEN HOUR GUIDE
            const guide = document.getElementById("goldenHourGuide");
            if(guide){
                guide.style.display = "block";
            }

            updateSOSButton();
            showResponderRadar();
            radarInterval=setInterval(()=>{

                moveResponders(
                    position.coords.latitude,
                    position.coords.longitude
                );

            },2000);
        }catch(error){
            console.error(error);
        }

    });

}
async function showImmediateSosNotification() {
    if (localStorage.getItem("dernNotificationsEnabled") !== "true") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification("SOS Activated", {
            body: "Your SOS alert was activated successfully.",
            requireInteraction: true
        });
    } else {
        new Notification("SOS Activated", {
            body: "Your SOS alert was activated successfully."
        });
    }
}
function moveResponders(targetLat,targetLng){

    demoVolunteers.forEach(v=>{

        v.lat += (targetLat - v.lat) * 0.02;
        v.lng += (targetLng - v.lng) * 0.02;

    });

    showResponderRadar();

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

            // STOP RADAR MOVEMENT
            if(radarInterval){
                clearInterval(radarInterval);
                radarInterval = null;
            }

            // REMOVE RESPONDER MARKERS
            responderMarkers.forEach(marker=>{
                map.removeLayer(marker);
            });

            responderMarkers = [];

            // HIDE BEST RESPONDER MESSAGE
            const box = document.getElementById("bestResponderBox");
            if(box){
                box.style.display="none";
            }
            // HIDE GOLDEN HOUR GUIDE
            const guide = document.getElementById("goldenHourGuide");
            if(guide){
                guide.style.display = "none";
            }

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