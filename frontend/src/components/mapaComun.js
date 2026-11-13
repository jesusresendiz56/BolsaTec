import L from "leaflet";

// Elementos compartidos por los mapas de BolsaTec

export const URL_TESELAS_OSM =
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const ATRIBUCION_OSM =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// Centro por defecto: Ciudad de México
export const CENTRO_MEXICO = { lat: 19.4326, lng: -99.1332 };

// Marcador propio (evita el problema de las imágenes
// por defecto de Leaflet con Vite)
export const iconoMarcador = L.divIcon({
  className: "bt-mapa-marcador",
  html: '<span class="bt-mapa-marcador-pin"></span>',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -28],
});
