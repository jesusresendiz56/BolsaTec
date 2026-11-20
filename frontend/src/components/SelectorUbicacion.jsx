import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import {
  CheckCircle2,
  LocateFixed,
  MapPinned,
  Search,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import {
  buscarCoordenadas,
  buscarDireccionDePunto,
  coincide,
} from "../services/geocodificacion";
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

const redondear = (valor) => Number(Number(valor).toFixed(6));

// Mensaje según qué tan precisa fue la búsqueda
const avisoDeResultado = (resultado, numero) => {
  const encontrado = resultado.referencia
    ? `Encontrado: ${resultado.referencia}.`
    : "";

  if (resultado.precision === "numero") {
    return {
      tipo: "ok",
      titulo: "Dirección encontrada",
      detalle: `${encontrado} Revisa que el marcador esté en el lugar correcto.`,
    };
  }

  if (resultado.precision === "calle") {
    return {
      tipo: "alerta",
      titulo: numero
        ? `Se encontró la calle, pero no el número ${numero}`
        : "Se encontró la calle",
      detalle: `${encontrado} OpenStreetMap no tiene registrado ese número; el marcador está en el centro de la calle (resaltada en naranja). Arrástralo al punto exacto.`,
    };
  }

  return {
    tipo: "alerta",
    titulo: "Solo se encontró la zona",
    detalle: `${encontrado} No se encontró la calle. Arrastra el marcador o haz clic en el mapa en el punto exacto.`,
  };
};

const avisoAjusteManual = {
  tipo: "ok",
  titulo: "Ubicación ajustada",
  detalle: "Se guardará el punto donde dejaste el marcador. Confirma abajo la dirección que tiene OpenStreetMap en ese punto.",
};

const iconos = {
  ok: CheckCircle2,
  alerta: TriangleAlert,
  info: MapPinned,
};

function SelectorUbicacion({ texto, campos, posicion, onCambiar }) {
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState(null);
  // Solo se recentra el mapa al buscar la dirección
  const [destino, setDestino] = useState(null);
  // Calle encontrada (cuando no está el número)
  const [linea, setLinea] = useState(null);
  // Dirección con la que se hizo la última búsqueda
  const [buscadoCon, setBuscadoCon] = useState("");
  // Lo que OpenStreetMap tiene donde quedó el marcador
  const [enElPunto, setEnElPunto] = useState({ clave: "", texto: "", calle: "" });

  const claveDireccion = JSON.stringify({ texto, campos });
  const desactualizado = Boolean(buscadoCon) && buscadoCon !== claveDireccion;

  const centroInicial = useMemo(
    () => posicion || CENTRO_MEXICO,
    // Solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Consultar la dirección del punto donde quedó el marcador
  // (espera a que la empresa deje de moverlo)
  const clavePunto = posicion ? `${posicion.lat},${posicion.lng}` : "";

  useEffect(() => {
    if (!posicion) return;

    const controlador = new AbortController();
    const temporizador = setTimeout(() => {
      buscarDireccionDePunto(posicion, controlador.signal)
        .then((punto) =>
          setEnElPunto({
            clave: clavePunto,
            texto: punto?.texto || "",
            calle: punto?.calle || "",
          })
        )
        .catch(() => {});
    }, 700);

    return () => {
      clearTimeout(temporizador);
      controlador.abort();
    };
    // `clavePunto` resume la posición
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clavePunto]);

  const fijar = (latlng, nuevoAviso = null) => {
    onCambiar({ lat: redondear(latlng.lat), lng: redondear(latlng.lng) });
    setAviso(nuevoAviso);
  };

  const ubicarDireccion = async () => {
    if (!texto?.trim()) {
      setAviso({
        tipo: "alerta",
        titulo: "Falta la dirección",
        detalle: "Escribe la dirección antes de buscarla en el mapa.",
      });
      return;
    }

    try {
      setBuscando(true);
      setAviso(null);
      setLinea(null);

      const resultado = await buscarCoordenadas({ texto, campos });
      setBuscadoCon(claveDireccion);

      if (!resultado) {
        setAviso({
          tipo: "alerta",
          titulo: "No se encontró la dirección",
          detalle: "Revisa la calle, el municipio y el estado, o haz clic en el mapa para marcar la ubicación manualmente.",
        });
        return;
      }

      setDestino({
        lat: resultado.lat,
        lng: resultado.lng,
        zoom: resultado.precision === "numero" ? 18 : 16,
        linea: resultado.linea,
      });
      setLinea(resultado.linea);

      fijar(
        resultado,
        avisoDeResultado(resultado, campos?.direccion_numero?.trim())
      );
    } catch (err) {
      console.error("Error al buscar la dirección:", err);
      setAviso({
        tipo: "alerta",
        titulo: "No se pudo buscar la dirección",
        detalle: "El servicio de mapas no respondió. Intenta de nuevo en unos segundos o marca la ubicación haciendo clic en el mapa.",
      });
    } finally {
      setBuscando(false);
    }
  };

  // Aviso que se muestra debajo del mapa
  const avisoVisible = desactualizado
    ? {
        tipo: "info",
        titulo: "La dirección cambió",
        detalle: "Vuelve a presionar «Ubicar dirección en el mapa» o ajusta el marcador.",
      }
    : aviso || {
        tipo: "info",
        titulo: "",
        detalle: posicion
          ? "Arrastra el marcador o haz clic en el mapa para ajustar la ubicación."
          : "Busca la dirección o haz clic en el mapa para marcar dónde está la vacante.",
      };

  const Icono = iconos[avisoVisible.tipo];

  // ¿El marcador quedó en otra calle distinta a la escrita?
  const puntoActual = enElPunto.clave === clavePunto ? enElPunto : null;
  const otraCalle =
    puntoActual?.calle &&
    campos?.direccion_calle?.trim() &&
    !coincide(puntoActual.calle, campos.direccion_calle);

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
              setAviso(null);
              setLinea(null);
              setBuscadoCon("");
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

        <ClicEnMapa onClic={(latlng) => fijar(latlng, avisoAjusteManual)} />
        <Recentrar destino={destino} />

        {linea && !desactualizado && (
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
                fijar(evento.target.getLatLng(), avisoAjusteManual),
            }}
          />
        )}
      </MapContainer>

      <div
        className={`bt-selector-aviso ${avisoVisible.tipo}`}
        role="status"
        aria-live="polite"
      >
        <Icono size={16} aria-hidden="true" />
        <p>
          {avisoVisible.titulo && <strong>{avisoVisible.titulo}. </strong>}
          {avisoVisible.detalle}
        </p>
      </div>

      {posicion && (
        <p className="bt-selector-coordenadas" translate="no">
          <LocateFixed size={14} />
          <span>
            {posicion.lat.toFixed(6)}, {posicion.lng.toFixed(6)}
            {puntoActual?.texto && (
              <span className="bt-selector-en-punto">
                {" "}· Marcador en: {puntoActual.texto}
              </span>
            )}
          </span>
        </p>
      )}

      {posicion && otraCalle && (
        <p className="bt-selector-otra-calle" role="status">
          <TriangleAlert size={14} aria-hidden="true" />
          El marcador está sobre «{puntoActual.calle}», no sobre «
          {campos.direccion_calle.trim()}». Si la entrada está en esa
          esquina, está bien; si no, muévelo a la calle correcta.
        </p>
      )}
    </div>
  );
}

export default SelectorUbicacion;
