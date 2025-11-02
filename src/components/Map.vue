<template>
    <!-- Map container -->
    <div id="map" style="height: 100%; width: 100%"></div>

    <!-- Toggle table button -->
    <v-btn @click="toggleDrawer" color="primary" style="position: absolute; top: 16px; right: 16px; z-index: 1000">
        Toggle Table
    </v-btn>

    <!-- Bottom sheet table -->
    <v-bottom-sheet v-model="showTable" max-height="70%">
        <v-card>
            <v-text-field v-model="search" density="compact" label="Search" prepend-inner-icon="mdi-magnify"
                variant="solo-filled" flat hide-details single-line />
            <v-data-table :headers="headers" :items="hospitals" :search="search" item-value="hospital" show-expand
                class="elevation-1" @click:row="onRowClick">
                <!-- Normal cell rendering for arrays (optional, could remove if expanded) -->
                <template v-slot:item.equipment="{ item }">
                    <span>
                        {{ item.equipment[0] }}
                        <template v-if="item.equipment.length > 1">
                            +{{ item.equipment.length - 1 }} more
                        </template>
                    </span>
                </template>

                <!-- <template v-slot:item.assigned_people="{ item }">
                <span>
                    {{ item.assigned_people[0] }}
                    <template v-if="item.assigned_people.length > 1">
                        +{{ item.assigned_people.length - 1 }} more
                    </template>
                </span>
            </template> -->


                <!-- Expanded row slot -->
                <template v-slot:expanded-row="{ columns, item }">
                    <tr>
                        <td :colspan="columns.length">
                            <v-card flat class="pa-4">
                                <h4 class="text-h6 mb-2">Equipment</h4>
                                <v-list density="compact">
                                    <v-list-item v-for="(eq, index) in item.equipment" :key="index" :title="eq" />
                                </v-list>

                                <!-- <h4 class="text-h6 mt-4 mb-2">Assigned People</h4>
                            <v-list density="compact">
                                <v-list-item v-for="(person, index) in item.assigned_people" :key="index"
                                    :title="person" />
                            </v-list> -->
                            </v-card>
                        </td>
                    </tr>
                </template>
            </v-data-table>
        </v-card>
    </v-bottom-sheet>
</template>

<script lang="ts">
import { defineComponent, toRaw } from 'vue'
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import hospitalsData from '@/assets/hospitals.json';

interface Hospital {
    hospital: string
    latitude: number
    longitude: number
    equipment: string[]
    assigned_person: string
}

interface Header {
    title: string
    value: keyof Hospital
}

interface DataTableRowEvent<T> {
    index: number
    item: T
    internalItem: {
        type: string
        key: string | number
        index: number
        value: any
        selectable: boolean
        columns: Record<string, any>
        raw: T
    }
    columns: Record<string, any>[]
}

export default defineComponent({
    data() {
        return {
            headers: [
                { title: 'Hospital', value: 'hospital' },
                { title: 'Equipment', value: 'equipment' },
                { title: 'Assigned Person', value: 'assigned_person' },
            ] as Header[],
            hospitals: hospitalsData,
            search: "",
            showTable: false,
            map: null as L.Map | null,
            markerMap: new Map<string, L.Marker>(),
            selectedHospital: null as string | null,

        }
    },
    methods: {
        toggleDrawer() {
            this.showTable = !this.showTable;
        },
        onRowClick(event: MouseEvent, payload: DataTableRowEvent<Hospital>) {
            const marker = this.markerMap.get(payload.item.hospital);
            if (!marker || !this.map) return;
            marker.openPopup();
        },

        async initMap() {
            this.map = L.map("map", {
                crs: L.CRS.EPSG3857,
                zoomAnimation: true
            }).setView([53.9, -3.9], 6);
            if (!this.map) return;

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                minZoom: 2,
                maxZoom: 16,
                detectRetina: true,
            }).addTo(this.map as L.Map);

            this.hospitals.forEach((row, index) => {
                const lat = row.latitude;
                const lon = row.longitude;
                if (isNaN(lat) || isNaN(lon)) return;

                const markerHtml = `
              <div class="d-flex align-center justify-center bg-primary text-white rounded-xl elevation-3"
                   style="width: 32px; height: 32px; border: 2px solid white;">
                <span style="font-size: 16px;">🏥</span>
              </div>`;

                const customIcon = L.divIcon({
                    html: markerHtml,
                    className: "",
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                    popupAnchor: [0, -16],
                });

                const marker = L.marker([lat, lon], { icon: customIcon }).addTo(toRaw(this.map as L.Map));

                marker.bindPopup(`
            <div style="font-family: Roboto, sans-serif; font-size: 14px; line-height: 1.4; width: min(90vw, 600px); padding: 6px;">
                <div style="font-weight: 600; color: var(--v-theme-primary); margin-bottom: 8px;">
                ${row.hospital}
                </div>
                <div><strong>Equipment:</strong> ${row.equipment.join(", ")}</div>
                <div><strong>Assigned to:</strong> ${row.assigned_person}</div>
            </div>
            `);

                // Store the marker reference
                this.markerMap.set(row.hospital, marker);

                // Scroll to row when marker is clicked
                marker.on("popupopen", () => {
                    if (!this.map) return;
                    this.selectedHospital = row.hospital;
                    this.map.setView(marker.getLatLng(), 10);
                });

                marker.on("popupclose", () => {
                    if (this.selectedHospital === row.hospital) {
                        this.selectedHospital = null;
                    }
                });

                this.map?.on('zoomend', () => {
                    this.map?.eachLayer(layer => {
                        if (layer instanceof L.Marker && layer.isPopupOpen()) {
                            const p = layer.getPopup();
                            if (p) p.update();
                        }
                    });
                });
            });
        }
    },
    watch: {
        showTable(val: boolean) {
            if (!val || !this.selectedHospital) return;
            this.$nextTick(() => {
                const table = document.querySelector(".v-data-table");
                if (!table) return;
                const rows = table.querySelectorAll("tbody tr");
                const index = this.hospitals.findIndex(
                    h => h.hospital === this.selectedHospital
                );
                if (index === -1) return;
                const rowEl = rows[index] as HTMLElement;
                rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
                rowEl.classList.add("highlight-row");
                setTimeout(() => rowEl.classList.remove("highlight-row"), 1500);
            });
        },
    },

    mounted() {
        this.initMap();
    },
})
</script>
<style>
* {
    user-select: none;
    -webkit-user-select: none;
    -ms-user-select: none;
}

.highlight-row {
    background-color: rgba(25, 118, 210, 0.15);
    /* transition: background-color 0.8s ease; */
}
</style>
