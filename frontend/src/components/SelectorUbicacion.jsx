import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { LocateFixed, Search, Trash2 } from "lucide-react";

import { buscarCoordenadas } from "../services/geocodificacion";
import {
  iconoMarcador,
  ATRIBUCION_OSM,
  URL_TESELAS_OSM,
  CENTRO_MEXICO,
} from "./mapaComun";

import "leaflet/dist/leaflet.css";
import "./MapaUbicacion.css";

// ========================================
// SELECTOR DE UBICACIÓN (empresa)
// La empresa busca su dirección y ajusta el marcador
// (arrastrándolo o haciendo clic) al punto exacto.
// ========================================

// Clic en el mapa: mover el marcador
function ClicEnMapa({ onClic }) {
  useMapEvents({
    click: (evento) => onClic(evento.latlng),
  });

  return null;
}

// Centrar el mapa al buscar la dirección. Si se encontró
// solo la calle, se muestra la calle completa.
function Recentrar({ destino }) {
  const mapa = useMap();

  useEffect(() => {
    if (!destino) return;

    if (destino.linea?.length) {
      mapa.fitBounds(destino.linea.flat(), { padding: [30, 30], maxZoom: 18 });
    } else {
      mapa.setView([destino.lat, destino.lng], destino.zoom ?? mapa.getZoom());
    }
  }, [mapa, destino]);

  return null;
}

const mensajes = {
  numero:
    "Se encontró el número en OpenStreetMap. Revisa que el marcador esté en el lugar correcto; puedes arrastrarlo para ajustarlo.",
  calle: (numero) =>
    `Se encontró la calle${numero ? `, pero OpenStreetMap no tiene registrado el número ${numero}` : ""}. El marcador está en el centro de la calle (resaltada en el mapa): arrástralo al punto exacto.`,
  zona: "No se encontró la calle; se marcó solo la zona (colonia, C.P. o municipio). Arrastra el marcador al punto exacto.",
};

const redondear = (valor) => Number(Number(valor).toFixed(6));

function SelectorUbicacion({ texto, campos, posicion, onCambiar }) {
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState("");
  // Solo se recentra el mapa al buscar la dirección
  const [destino, setDestino] = useState(null);
  // Calle encontrada (cuando no está el número)
  const [linea, setLinea] = useState(null);

  const centroInicial = useMemo(
    () => posicion || CENTRO_MEXICO,
    // Solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const fijar = (latlng, mensaje = "") => {
    onCambiar({ lat: redondear(latlng.lat), lng: redondear(latlng.lng) });
    setAviso(mensaje);
  };

  const ubicarDireccion = async () => {
    if (!texto?.trim()) {
      setAviso("Escribe la dirección antes de buscarla en el mapa.");
      return;
    }

    try {
      setBuscando(true);
      setAviso("");
      setLinea(null);

      const resultado = await buscarCoordenadas({ texto, campos });

      if (!resultado) {
        setAviso(
          "No se encontró la dirección. Haz clic en el mapa para marcar la ubicación manualmente."
        );
        return;
      }

      setDestino({
        lat: resultado.lat,
        lng: resultado.lng,
        zoom: resultado.precision === "numero" ? 18 : 16,
        linea: resultado.linea,
      });
      setLinea(resultado.linea);

      const mensaje =
        resultado.precision === "calle"
          ? mensajes.calle(campos?.direccion_numero?.trim())
          : mensajes[resultado.precision] || mensajes.zona;

      fijar(
        resultado,
        resultado.referencia
          ? `${mensaje} Encontrado: ${resultado.referencia}.`
          : mensaje
      );
    } catch (err) {
      console.error("Error al buscar la dirección:", err);
      setAviso(
        "No se pudo buscar la dirección. Puedes marcar la ubicación haciendo clic en el mapa."
      );
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div className="bt-selector-ubicacion">
      <div className="bt-selector-ubicacion-acciones">
        <button
          type="button"
          onClick={ubicarDireccion}
          disabled={buscando}
        >
          <Search size={16} />
          {buscando ? "Buscando..." : "Ubicar dirección en el mapa"}
        </button>

        {posicion && (
          <button
            type="button"
            className="secundario"
            onClick={() => {
              onCambiar(null);
              setAviso("");
              setLinea(null);
            }}
          >
            <Trash2 size={16} />
            Quitar marcador
          </button>
        )}
      </div>

      <MapContainer
        center={[centroInicial.lat, centroInicial.lng]}
        zoom={posicion ? 17 : 11}
        scrollWheelZoom
        className="bt-mapa-lienzo bt-selector-mapa"
      >
        <TileLayer
          attribution={ATRIBUCION_OSM}
          url={URL_TESELAS_OSM}
          maxZoom={19}
        />

        <ClicEnMapa onClic={(latlng) => fijar(latlng)} />
        <Recentrar destino={destino} />

        {linea && (
          <Polyline
            positions={linea}
            pathOptions={{ color: "#f59e0b", weight: 7, opacity: 0.75 }}
          />
        )}

        {posicion && (
          <Marker
            position={[posicion.lat, posicion.lng]}
            icon={iconoMarcador}
            draggable
            eventHandlers={{
              dragend: (evento) =>
                fijar(evento.target.getLatLng()),
            }}
          />
        )}
      </MapContainer>

      <p className="bt-mapa-nota">
        {aviso ||
          (posicion
            ? "Arrastra el marcador o haz clic en el mapa para ajustar la ubicación."
            : "Busca la dirección o haz clic en el mapa para marcar dónde está la vacante.")}
      </p>

      {posicion && (
        <p className="bt-selector-coordenadas">
          <LocateFixed size={14} />
          {posicion.lat.toFixed(6)}, {posicion.lng.toFixed(6)}
        </p>
      )}
    </div>
  );
}

export default SelectorUbicacion;
