import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { ExternalLink, MapPin } from "lucide-react";

import { buscarCoordenadas } from "../services/geocodificacion";
import { iconoMarcador, ATRIBUCION_OSM, URL_TESELAS_OSM } from "./mapaComun";

import "leaflet/dist/leaflet.css";
import "./MapaUbicacion.css";

// ========================================
// MAPA DE SOLO LECTURA (estudiante)
// 1) Si la vacante tiene coordenadas (marcadas por la
//    empresa), se usan directamente: ubicación exacta.
// 2) Si no, se busca la dirección en OpenStreetMap.
// ========================================

const coordenadaValida = (valor) =>
  valor !== null && valor !== undefined && valor !== "" &&
  Number.isFinite(Number(valor));

function MapaUbicacion({ direccion, latitud, longitud, campos }) {
  const texto = direccion?.trim() || "";

  const tieneCoordenadas =
    coordenadaValida(latitud) && coordenadaValida(longitud);

  const clave = JSON.stringify({ texto, campos: campos || null });

  const [estado, setEstado] = useState({
    clave: "",
    posicion: null,
    error: "",
  });

  useEffect(() => {
    if (tieneCoordenadas || !texto) return;

    const controlador = new AbortController();
    let porTiempo = false;

    // Si no responde en 12 s, cancelar
    const limite = setTimeout(() => {
      porTiempo = true;
      controlador.abort();
    }, 12000);

    buscarCoordenadas({ texto, campos }, controlador.signal)
      .then((posicion) => {
        setEstado({
          clave,
          posicion,
          error: posicion
            ? ""
            : "No se encontró esta dirección en el mapa.",
        });
      })
      .catch((err) => {
        if (err.name === "AbortError" && !porTiempo) return;

        if (!porTiempo) {
          console.error("Error al ubicar la dirección:", err);
        }

        setEstado({
          clave,
          posicion: null,
          error: porTiempo
            ? "El mapa tardó demasiado en cargar."
            : "No se pudo cargar el mapa en este momento.",
        });
      })
      .finally(() => clearTimeout(limite));

    return () => {
      clearTimeout(limite);
      controlador.abort();
    };
    // `clave` resume texto + campos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, tieneCoordenadas]);

  if (!texto && !tieneCoordenadas) return null;

  const actual = tieneCoordenadas
    ? {
        posicion: {
          lat: Number(latitud),
          lng: Number(longitud),
          aproximada: false,
        },
        error: "",
      }
    : estado.clave === clave
      ? estado
      : { posicion: null, error: "" };

  const urlGoogleMaps = tieneCoordenadas
    ? `https://www.google.com/maps/search/?api=1&query=${Number(latitud)},${Number(longitud)}`
    : "https://www.google.com/maps/search/?api=1&query=" +
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
          key={`${actual.posicion.lat},${actual.posicion.lng}`}
          center={[actual.posicion.lat, actual.posicion.lng]}
          zoom={actual.posicion.aproximada ? 14 : 17}
          scrollWheelZoom={false}
          className="bt-mapa-lienzo"
        >
          <TileLayer
            attribution={ATRIBUCION_OSM}
            url={URL_TESELAS_OSM}
            maxZoom={19}
          />

          <Marker
            position={[actual.posicion.lat, actual.posicion.lng]}
            icon={iconoMarcador}
          >
            {texto && <Popup>{texto}</Popup>}
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
