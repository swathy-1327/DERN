let map;
let reportMarkers = [];
let activeSosId = null;
let sosActive = false;

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

async function loadReports() {
    try {
        const response = await fetch("/api/reports");
        const reports = await response.json();

        reportMarkers.forEach(marker => map.removeLayer(marker));
        reportMarkers = [];

        reports.forEach((report) => {
            const marker = L.marker([report.latitude, report.longitude])
                .addTo(map)
                .bindPopup(`
          <b>${report.type}</b><br>
          ${report.description || "No description"}<br>
          Severity: ${report.severity ?? "N/A"}
        `);

            reportMarkers.push(marker);
        });
    } catch (error) {
        console.error("Error loading reports:", error);
    }
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