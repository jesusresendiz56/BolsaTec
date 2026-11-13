import { useEffect, useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { ExternalLink, MapPin } from "lucide-react";

import "./MapaUbicacion.css";

// Clave de Google Maps (Vercel / .env):
// VITE_GOOGLE_MAPS_API_KEY=...
// VITE_GOOGLE_MAPS_MAP_ID=... (opcional)
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

// Las coordenadas de cada dirección se guardan para
// no volver a consultar la Geocoding API.
const cacheCoordenadas = new globalThis.Map();

// Google llama a window.gm_authFailure cuando la clave
// no es válida o no tiene habilitadas las APIs.
let errorDeClave = false;

if (typeof window !== "undefined") {
  window.gm_authFailure = () => {
    errorDeClave = true;
    window.dispatchEvent(new Event("bt-maps-auth-error"));
  };
}

const MENSAJE_CLAVE =
  "La clave de Google Maps no es válida o no tiene habilitadas " +
  "Maps JavaScript API y Geocoding API.";

// ========================================
// MAPA CON MARCADOR (usa la Geocoding API)
// ========================================

function MapaConMarcador({ direccion }) {
  const geocoding = useMapsLibrary("geocoding");
  const [resultado, setResultado] = useState(() => ({
    direccion,
    posicion: cacheCoordenadas.get(direccion) || null,
    error: "",
  }));

  const [fallaClave, setFallaClave] = useState(errorDeClave);

  useEffect(() => {
    const alFallar = () => setFallaClave(true);
    window.addEventListener("bt-maps-auth-error", alFallar);
    return () =>
      window.removeEventListener("bt-maps-auth-error", alFallar);
  }, []);

  useEffect(() => {
    if (!geocoding || cacheCoordenadas.has(direccion)) return;

    let activo = true;

    const geocoder = new geocoding.Geocoder();

    geocoder
      .geocode({ address: direccion, region: "mx" })
      .then(({ results }) => {
        if (!activo) return;

        const ubicacion = results?.[0]?.geometry?.location;

        if (!ubicacion) {
          setResultado({
            direccion,
            posicion: null,
            error: "No se encontró la dirección en el mapa.",
          });
          return;
        }

        const posicion = {
          lat: ubicacion.lat(),
          lng: ubicacion.lng(),
        };

        cacheCoordenadas.set(direccion, posicion);
        setResultado({ direccion, posicion, error: "" });
      })
      .catch((err) => {
        console.error("Error de geocodificación:", err);

        if (activo) {
          setResultado({
            direccion,
            posicion: null,
            error: "No se pudo ubicar la dirección en el mapa.",
          });
        }
      });

    return () => {
      activo = false;
    };
  }, [geocoding, direccion]);

  // Si en 12 s no hay mapa (script bloqueado, sin red,
  // clave rechazada), mostrar aviso en lugar de cargar
  // indefinidamente.
  useEffect(() => {
    if (cacheCoordenadas.has(direccion)) return;

    const limite = setTimeout(() => {
      setResultado((previo) =>
        previo.direccion === direccion && previo.posicion
          ? previo
          : {
              direccion,
              posicion: null,
              error: "No se pudo cargar el mapa en este momento.",
            }
      );
    }, 12000);

    return () => clearTimeout(limite);
  }, [direccion]);

  // Resultado de una dirección anterior: usar la caché
  // o esperar a la nueva consulta.
  const actual =
    resultado.direccion === direccion
      ? resultado
      : {
          posicion: cacheCoordenadas.get(direccion) || null,
          error: "",
        };

  if (fallaClave) {
    return (
      <div className="bt-mapa-aviso">
        <MapPin size={22} />
        {MENSAJE_CLAVE}
      </div>
    );
  }

  if (actual.error) {
    return (
      <div className="bt-mapa-aviso">
        <MapPin size={22} />
        {actual.error}
      </div>
    );
  }

  if (!actual.posicion) {
    return <div className="bt-mapa-aviso">Cargando mapa...</div>;
  }

  return (
    <Map
      key={direccion}
      mapId={MAP_ID}
      defaultCenter={actual.posicion}
      defaultZoom={16}
      gestureHandling="cooperative"
      disableDefaultUI={false}
      streetViewControl={false}
      mapTypeControl={false}
      className="bt-mapa-lienzo"
    >
      <AdvancedMarker position={actual.posicion} title={direccion}>
        <Pin
          background="#0E7490"
          borderColor="#0B2B33"
          glyphColor="#FFFFFF"
        />
      </AdvancedMarker>
    </Map>
  );
}

// ========================================
// COMPONENTE PÚBLICO
// ========================================

function MapaUbicacion({ direccion }) {
  const texto = direccion?.trim();

  if (!texto) return null;

  const urlGoogleMaps =
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(texto);

  return (
    <div className="bt-mapa">
      {API_KEY ? (
        <APIProvider apiKey={API_KEY} language="es" region="MX">
          <MapaConMarcador direccion={texto} />
        </APIProvider>
      ) : (
        <div className="bt-mapa-aviso">
          <MapPin size={22} />
          Mapa no disponible: falta configurar
          VITE_GOOGLE_MAPS_API_KEY.
        </div>
      )}

      <a href={urlGoogleMaps} target="_blank" rel="noopener noreferrer">
        <ExternalLink size={15} />
        Abrir en Google Maps
      </a>
    </div>
  );
}

export default MapaUbicacion;
