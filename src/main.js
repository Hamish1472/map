import L from "leaflet";

window.addEventListener("load", () => {
    const map = L.map("map").setView([53.9, -3.9], 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        minZoom: 2,
        maxZoom: 16,
        detectRetina: true,
    }).addTo(map);

    // Load CSV
    fetch(import.meta.env.BASE_URL + "/hospitals.csv")
        .then((response) => response.text())
        .then((text) => {
            const lines = text.trim().split("\n");
            // const headers = lines[0].split(',');
            const markers = [];

            lines.slice(1).forEach((line) => {
                const match = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
                if (!match || match.length < 5) return;

                const [name, lat, lng, equipmentRaw, person] = match;

                const latNum = parseFloat(lat);
                const lngNum = parseFloat(lng);
                if (isNaN(latNum) || isNaN(lngNum)) return;

                const equipmentList = equipmentRaw
                    .replace(/^"|"$/g, "") // remove surrounding quotes
                    .split(";")
                    .map((item) => `<li>${item.trim()}</li>`)
                    .join("");

                const popupContent = `
                <b>${name}</b><br>
                <i>${person}</i><br>
                <ul>${equipmentList}</ul>
            `;

                const marker = L.marker([latNum, lngNum]).addTo(map);
                marker.bindPopup(popupContent, {
                    autoClose: false,
                    closeOnClick: false,
                });

                let popupPinned = false;

                // Hover: open if not pinned
                marker.on("mouseover", function () {
                    if (!popupPinned) {
                        this.openPopup();
                    }
                });

                // Hover out: close if not pinned
                marker.on("mouseout", function () {
                    if (!popupPinned) {
                        this.closePopup();
                    }
                });

                // Click: toggle pinned state
                marker.on("click", function () {
                    // if (popupPinned) {
                    //     this.closePopup();
                    //     popupPinned = false;
                    // } else {
                    //     this.openPopup();
                    //     popupPinned = true;
                    // }
                    this.openPopup();
                    popupPinned = true;
                });

                // When popup is manually closed (e.g. with the X button)
                marker.on("popupclose", function () {
                    popupPinned = false;
                });

                markers.push(marker);
            });
            markers.forEach((marker) => {
                marker.on("click", function (e) {
                    map.setView(e.latlng, 13);
                });
            });
        });

    var popup = L.popup();

    function onMapClick(e) {
        console.log(e);
        var content = /*html*/ `<p>You clicked the map at</p>
            <p style="text-align:center;">
            ${e.latlng.lat.toFixed(4).toString()},
            ${e.latlng.lng.toFixed(4).toString()}
            </p>`;
        popup.setLatLng(e.latlng).setContent(content).openOn(map);
    }

    map.on("click", onMapClick);
});
