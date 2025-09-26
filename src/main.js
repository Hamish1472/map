import L from "leaflet";

function setVh() {
    const vh = (window.visualViewport?.height || window.innerHeight) * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
}

setVh();
window.addEventListener("resize", setVh);
if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", setVh);
    window.visualViewport.addEventListener("scroll", setVh);
}

window.addEventListener("load", () => {
    const map = L.map("map").setView([53.9, -3.9], 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        minZoom: 2,
        maxZoom: 16,
        detectRetina: true,
    }).addTo(map);

    const tbody = document.querySelector("#hospital-table tbody");
    const rowMarkerMap = new Map(); // row <-> marker mapping

    // --- Toggle button ---
    const toggleBtn = document.getElementById("toggle-table");
    const tableContainer = document.getElementById("table-container");
    toggleBtn.addEventListener("click", () => {
        tableContainer.classList.toggle("collapsed");
        if (tableContainer.classList.contains("collapsed")) {
            toggleBtn.textContent = "▼ Show Table";
        } else {
            toggleBtn.textContent = "▲ Hide Table";
        }
        map.invalidateSize(); // recalc map layout after animation
    });

    fetch(import.meta.env.BASE_URL + "/hospitals.csv")
        .then((response) => response.text())
        .then((text) => {
            const lines = text.trim().split("\n");
            const headers = lines[0].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);

            // --- Build table header dynamically ---
            const thead = document.querySelector("#hospital-table thead");
            const headerRow = document.createElement("tr");
            headers.forEach((h) => {
                if (!["Latitude", "Longitude"].includes(h)) {
                    const th = document.createElement("th");
                    th.textContent = h.replace(/^"|"$/g, ""); // remove quotes
                    headerRow.appendChild(th);
                }
            });
            thead.appendChild(headerRow);

            // --- Now process rows ---
            lines.slice(1).forEach((line) => {
                const match = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
                if (!match || match.length < 5) return;

                const [hospital, lat, lng, equipmentRaw, person] = match;
                const latNum = parseFloat(lat);
                const lngNum = parseFloat(lng);
                if (isNaN(latNum) || isNaN(lngNum)) return;

                const equipmentList = equipmentRaw
                    .replace(/^"|"$/g, "")
                    .split(";");

                // --- Map marker ---
                const popupContent = `
                    <b>${hospital}</b><br>
                    <i>${person}</i><br>
                    <ul>${equipmentList
                        .map((e) => `<li>${e.trim()}</li>`)
                        .join("")}</ul>
                `;
                const marker = L.marker([latNum, lngNum]).addTo(map);
                marker.bindPopup(popupContent);

                // --- Table row ---
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${hospital}</td>
                    <td>${equipmentList.join(", ")}</td>
                    <td>${person}</td>
                `;
                tbody.appendChild(row);

                // --- Link row <-> marker ---
                rowMarkerMap.set(row, marker);
                rowMarkerMap.set(marker, row);

                // Marker click → highlight row
                marker.on("click", function (e) {
                    highlightRow(row);
                    map.setView(e.latlng, 13);
                });

                // Row click → open popup and highlight
                row.addEventListener("click", () => {
                    map.setView(marker.getLatLng(), 13);
                    marker.openPopup();
                    highlightRow(row);
                });

                // When popup closes → remove row highlight
                marker.on("popupclose", function () {
                    row.classList.remove("highlight");
                });
            });
        });

    function highlightRow(row) {
        document
            .querySelectorAll("#hospital-table tr")
            .forEach((tr) => tr.classList.remove("highlight"));
        row.classList.add("highlight");
    }

    // Optional: show lat/lng click
    // var popup = L.popup();
    // map.on("click", function (e) {
    //     var content = `<p>You clicked the map at</p>
    //         <p style="text-align:center;">
    //         ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}
    //         </p>`;
    //     popup.setLatLng(e.latlng).setContent(content).openOn(map);
    // });
});
