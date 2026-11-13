import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { ExternalLink, MapPin } from "lucide-react";

import "leaflet/dist/leaflet.css";
import "./MapaUbicacion.css";

// ========================================
// MAPA CON LEAFLET + OPENSTREETMAP
// - Mapa: teselas de OpenStreetMap (gratis, sin clave)
// - Dirección → coordenadas: Nominatim (OpenStreetMap)
// ========================================

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

// Marcador propio (evita el problema de las imágenes
// por defecto de Leaflet con Vite)
const iconoMarcador = L.divIcon({
  className: "bt-mapa-marcador",
  html: '<span class="bt-mapa-marcador-pin"></span>',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -28],
});

// Guardar coordenadas para no repetir consultas a
// Nominatim (su política pide no saturar el servicio).
const cacheCoordenadas = new Map();

const buscarCoordenadas = async (direccion, signal) => {
  if (cacheCoordenadas.has(direccion)) {
    return cacheCoordenadas.get(direccion);
  }

  const parametros = new URLSearchParams({
    q: direccion,
    format: "jsonv2",
    limit: "1",
    countrycodes: "mx",
    "accept-language": "es",
  });

  const respuesta = await fetch(`${NOMINATIM_URL}?${parametros}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!respuesta.ok) {
    throw new Error(`Nominatim respondió ${respuesta.status}`);
  }

  const datos = await respuesta.json();
  const lugar = Array.isArray(datos) ? datos[0] : null;

  const posicion = lugar
    ? { lat: Number(lugar.lat), lng: Number(lugar.lon) }
    : null;

  cacheCoordenadas.set(direccion, posicion);
  return posicion;
};

function MapaUbicacion({ direccion }) {
  const texto = direccion?.trim() || "";

  const [estado, setEstado] = useState({
    direccion: "",
    posicion: null,
    error: "",
  });

  useEffect(() => {
    if (!texto) return;

    const controlador = new AbortController();

    // Si no responde en 12 s, cancelar
    const limite = setTimeout(() => controlador.abort(), 12000);

    buscarCoordenadas(texto, controlador.signal)
      .then((posicion) => {
        setEstado({
          direccion: texto,
          posicion,
          error: posicion
            ? ""
            : "No se encontró esta dirección en el mapa.",
        });
      })
      .catch((err) => {
        if (controlador.signal.aborted && err.name === "AbortError") {
          setEstado({
            direccion: texto,
            posicion: null,
            error: "El mapa tardó demasiado en cargar.",
          });
          return;
        }

        console.error("Error al ubicar la dirección:", err);

        setEstado({
          direccion: texto,
          posicion: null,
          error: "No se pudo cargar el mapa en este momento.",
        });
      })
      .finally(() => clearTimeout(limite));

    return () => {
      clearTimeout(limite);
      controlador.abort();
    };
  }, [texto]);

  if (!texto) return null;

  const actual =
    estado.direccion === texto
      ? estado
      : { posicion: null, error: "" };

  const urlGoogleMaps =
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(texto);

  return (
    <div className="bt-mapa">
      {actual.error ? (
        <div className="bt-mapa-aviso">
          <MapPin size={22} />
          {actual.error}
        </div>
      ) : !actual.posicion ? (
        <div className="bt-mapa-aviso">Cargando mapa...</div>
      ) : (
        <MapContainer
          key={texto}
          center={actual.posicion}
          zoom={16}
          scrollWheelZoom={false}
          className="bt-mapa-lienzo"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          <Marker position={actual.posicion} icon={iconoMarcador}>
            <Popup>{texto}</Popup>
          </Marker>
        </MapContainer>
      )}

      <a href={urlGoogleMaps} target="_blank" rel="noopener noreferrer">
        <ExternalLink size={15} />
        Abrir en Google Maps
      </a>
    </div>
  );
}

export default MapaUbicacion;
