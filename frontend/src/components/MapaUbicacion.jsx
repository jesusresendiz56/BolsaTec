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

// Guardar coordenadas para no repetir consultas
// (las políticas de Nominatim/Photon piden no saturarlos).
const cacheCoordenadas = new Map();

const PHOTON_URL = "https://photon.komoot.io/api/";

// Recuadro aproximado de México para Photon
const BBOX_MEXICO = "-118.5,14.4,-86.6,32.8";

// Expandir abreviaturas comunes en direcciones de México
const normalizarDireccion = (texto) =>
  texto
    .replace(/#/g, " ")
    .replace(/\b(av|avda)\.?(?=\s)/gi, "Avenida")
    .replace(/\bcol\.?(?=\s)/gi, "Colonia")
    .replace(/\bblvd\.?(?=\s)/gi, "Bulevar")
    .replace(/\bcalz\.?(?=\s)/gi, "Calzada")
    .replace(/\bcdmx\b/gi, "Ciudad de México")
    .replace(/\s+/g, " ")
    .trim();

const consultarNominatim = async (consulta, signal) => {
  const parametros = new URLSearchParams({
    q: consulta,
    format: "jsonv2",
    limit: "1",
    countrycodes: "mx",
    "accept-language": "es",
  });

  const respuesta = await fetch(`${NOMINATIM_URL}?${parametros}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!respuesta.ok) throw new Error(`Nominatim ${respuesta.status}`);

  const datos = await respuesta.json();
  const lugar = Array.isArray(datos) ? datos[0] : null;

  return lugar
    ? { lat: Number(lugar.lat), lng: Number(lugar.lon) }
    : null;
};

// Photon (también usa datos de OpenStreetMap) tolera
// mejor errores de escritura y direcciones incompletas.
const consultarPhoton = async (consulta, signal) => {
  const parametros = new URLSearchParams({
    q: consulta,
    limit: "1",
    bbox: BBOX_MEXICO,
  });

  const respuesta = await fetch(`${PHOTON_URL}?${parametros}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!respuesta.ok) throw new Error(`Photon ${respuesta.status}`);

  const datos = await respuesta.json();
  const coordenadas = datos?.features?.[0]?.geometry?.coordinates;

  return coordenadas
    ? { lat: Number(coordenadas[1]), lng: Number(coordenadas[0]) }
    : null;
};

// Intentar ubicar la dirección, de la más exacta a la
// más general. Devuelve { lat, lng, aproximada, referencia }.
const buscarCoordenadas = async (direccion, signal) => {
  if (cacheCoordenadas.has(direccion)) {
    return cacheCoordenadas.get(direccion);
  }

  const normalizada = normalizarDireccion(direccion);
  const conPais = `${normalizada}, México`;

  let resultado = null;

  // 1) Dirección completa
  const exacta =
    (await consultarNominatim(conPais, signal).catch(() => null)) ||
    (await consultarPhoton(normalizada, signal).catch(() => null));

  if (exacta) {
    resultado = { ...exacta, aproximada: false, referencia: direccion };
  } else {
    // 2) Quitar partes del inicio (calle, número…) hasta
    //    encontrar la colonia, alcaldía o ciudad.
    const partes = normalizada.includes(",")
      ? normalizada.split(",").map((t) => t.trim()).filter(Boolean)
      : normalizada.split(" ").filter(Boolean);

    const separador = normalizada.includes(",") ? ", " : " ";

    for (let i = 1; i < partes.length && i <= 4; i += 1) {
      const resto = partes.slice(i).join(separador);

      if (resto.replace(/[^a-záéíóúñ]/gi, "").length < 4) break;

      const aproximada = await consultarPhoton(resto, signal).catch(
        () => null
      );

      if (aproximada) {
        resultado = { ...aproximada, aproximada: true, referencia: resto };
        break;
      }
    }
  }

  cacheCoordenadas.set(direccion, resultado);
  return resultado;
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
          center={[actual.posicion.lat, actual.posicion.lng]}
          zoom={actual.posicion.aproximada ? 14 : 16}
          scrollWheelZoom={false}
          className="bt-mapa-lienzo"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          <Marker
            position={[actual.posicion.lat, actual.posicion.lng]}
            icon={iconoMarcador}
          >
            <Popup>{texto}</Popup>
          </Marker>
        </MapContainer>
      )}

      {actual.posicion?.aproximada && (
        <p className="bt-mapa-nota">
          Ubicación aproximada: no se encontró la dirección exacta,
          se muestra la zona de «{actual.posicion.referencia}».
        </p>
      )}

      <a href={urlGoogleMaps} target="_blank" rel="noopener noreferrer">
        <ExternalLink size={15} />
        Abrir en Google Maps
      </a>
    </div>
  );
}

export default MapaUbicacion;
