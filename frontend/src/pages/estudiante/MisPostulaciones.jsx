import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Check,
  FileText,
  MapPin,
  RefreshCw,
  Search,
  BriefcaseBusiness,
  XCircle,
} from "lucide-react";

import { sessionGet } from "../../services/session";
import { tiempoRelativo, fechaCorta } from "../../services/fechas";
import {
  ESTADOS_POSTULACION,
  PASOS_PROCESO,
  pasoActual,
} from "../../services/postulaciones";
import ChipExamen from "../../components/ChipExamen";
import "./MisPostulaciones.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");

const MODALIDADES = {
  presencial: "Presencial",
  hibrida: "Híbrida",
  remota: "Remota",
};

const TIPOS = {
  estadia: "Estadía",
  practicas: "Prácticas profesionales",
  tiempo_completo: "Tiempo completo",
  medio_tiempo: "Medio tiempo",
  servicio_social: "Servicio social",
};

const CANCELABLES = ["enviada", "vista", "entrevista"];

const NOMBRES_PASOS = {
  enviada: "Enviada",
  vista: "Revisada",
  entrevista: "Entrevista",
  resultado: "Resultado",
};

// Pestañas de filtro
const FILTROS = [
  { id: "todas", nombre: "Todas", incluye: () => true },
  { id: "proceso", nombre: "En proceso", incluye: (e) => CANCELABLES.includes(e) },
  { id: "entrevista", nombre: "Entrevistas", incluye: (e) => e === "entrevista" },
  { id: "aceptada", nombre: "Aceptadas", incluye: (e) => e === "aceptada" },
  { id: "rechazada", nombre: "No seleccionadas", incluye: (e) => e === "rechazada" },
];

function MisPostulaciones({ onActualizar, onIr }) {
  const [postulaciones, setPostulaciones] = useState([]);
  const [filtro, setFiltro] = useState("todas");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [confirmandoId, setConfirmandoId] = useState(null);
  const [cancelandoId, setCancelandoId] = useState(null);

  // ========================================
  // CONSULTAR POSTULACIONES
  // ========================================

  const consultarPostulaciones = useCallback(async () => {
    try {
      setCargando(true);
      setError("");

      const sesion = sessionGet("estudiante");
      if (!sesion?.token) {
        throw new Error("Debes iniciar sesión como estudiante");
      }

      const respuesta = await fetch(`${API_URL}/api/estudiante/postulaciones`, {
        headers: { Authorization: `Bearer ${sesion.token}` },
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudieron consultar las postulaciones");
      }

      setPostulaciones(Array.isArray(datos.postulaciones) ? datos.postulaciones : []);
    } catch (err) {
      console.error("Error al consultar postulaciones:", err);
      setError(err.message);
      setPostulaciones([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // La consulta inicial actualiza el estado al terminar
    // eslint-disable-next-line react-hooks/set-state-in-effect
    consultarPostulaciones();
  }, [consultarPostulaciones]);

  // Ocultar el mensaje de éxito después de unos segundos
  useEffect(() => {
    if (!mensaje) return;
    const temporizador = setTimeout(() => setMensaje(""), 5000);
    return () => clearTimeout(temporizador);
  }, [mensaje]);

  // ========================================
  // CANCELAR POSTULACIÓN
  // ========================================

  const cancelarPostulacion = async (postulacion) => {
    if (cancelandoId) return;

    try {
      setCancelandoId(postulacion.id_postulacion);
      setError("");
      setMensaje("");

      const sesion = sessionGet("estudiante");
      if (!sesion?.token) {
        throw new Error("Debes iniciar sesión como estudiante");
      }

      const respuesta = await fetch(
        `${API_URL}/api/estudiante/postulaciones/${postulacion.id_postulacion}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${sesion.token}` },
        }
      );

      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo cancelar la postulación");
      }

      setPostulaciones((anteriores) =>
        anteriores.filter((item) => item.id_postulacion !== postulacion.id_postulacion)
      );
      setConfirmandoId(null);
      setMensaje(`Cancelaste tu postulación a "${postulacion.titulo}".`);
      onActualizar?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setCancelandoId(null);
    }
  };

  // ========================================
  // CONTADORES Y FILTRO
  // ========================================

  const conteos = useMemo(() => {
    const resultado = {};
    FILTROS.forEach((f) => {
      resultado[f.id] = postulaciones.filter((p) => f.incluye(p.estado)).length;
    });
    return resultado;
  }, [postulaciones]);

  const filtroActual = FILTROS.find((f) => f.id === filtro) || FILTROS[0];
  const visibles = postulaciones.filter((p) => filtroActual.incluye(p.estado));

  // ========================================
  // INTERFAZ
  // ========================================

  return (
    <div className="bt-postulaciones">
      <div className="bt-postulaciones-header">
        <div>
          <h2>Mis postulaciones</h2>
          <p>Da seguimiento al estado de cada solicitud que enviaste.</p>
        </div>

        <button
          type="button"
          className="bt-postulaciones-btn"
          onClick={consultarPostulaciones}
          disabled={cargando}
        >
          <RefreshCw size={17} className={cargando ? "girando" : ""} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="bt-postulaciones-aviso error" role="alert">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {mensaje && (
        <div className="bt-postulaciones-aviso exito" role="status">
          <Check size={18} /> {mensaje}
        </div>
      )}

      {/* PESTAÑAS */}
      <div className="bt-postulaciones-tabs" role="tablist" aria-label="Filtrar postulaciones">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filtro === f.id}
            className={filtro === f.id ? "activo" : ""}
            onClick={() => setFiltro(f.id)}
          >
            {f.nombre}
            <span>{conteos[f.id] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* LISTA */}
      {cargando && postulaciones.length === 0 ? (
        <div className="bt-postulaciones-lista">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bt-postulacion-card esqueleto" aria-hidden="true">
              <span /> <span /> <span />
            </div>
          ))}
        </div>
      ) : visibles.length === 0 ? (
        <div className="bt-postulaciones-vacio">
          <FileText size={40} />
          {postulaciones.length === 0 ? (
            <>
              <h3>Aún no te has postulado</h3>
              <p>Explora las vacantes disponibles y envía tu primera solicitud.</p>
              {onIr && (
                <button type="button" className="bt-postulaciones-btn primario" onClick={() => onIr("vacantes")}>
                  <Search size={17} /> Buscar vacantes
                </button>
              )}
            </>
          ) : (
            <>
              <h3>Sin postulaciones en «{filtroActual.nombre}»</h3>
              <button type="button" className="bt-postulaciones-btn" onClick={() => setFiltro("todas")}>
                Ver todas
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="bt-postulaciones-lista">
          {visibles.map((p) => {
            const estado = ESTADOS_POSTULACION[p.estado] || ESTADOS_POSTULACION.enviada;
            const IconoEstado = estado.icono;
            const terminada = p.estado === "aceptada" || p.estado === "rechazada";
            // Si ya hay resultado no sabemos si hubo entrevista: no se muestra ese paso
            const pasos = terminada
              ? PASOS_PROCESO.filter((id) => id !== "entrevista")
              : PASOS_PROCESO;
            const paso = terminada ? pasos.length - 1 : pasoActual(p.estado);
            const confirmando = confirmandoId === p.id_postulacion;

            return (
              <article key={p.id_postulacion} className={`bt-postulacion-card estado-${estado.clase}`}>
                <div className="bt-postulacion-top">
                  <div className="bt-postulacion-logo"><Building2 size={22} /></div>

                  <div className="bt-postulacion-titulo">
                    <h3>{p.titulo}</h3>
                    <p>{p.nombre_empresa}</p>
                  </div>

                  <span className={`bt-postulacion-estado ${estado.clase}`}>
                    <IconoEstado size={15} /> {estado.nombre}
                  </span>
                </div>

                <ul className="bt-postulacion-meta">
                  <li><MapPin size={15} /> {p.ubicacion || "Sin ubicación"}</li>
                  <li><BriefcaseBusiness size={15} /> {MODALIDADES[p.modalidad] || p.modalidad}</li>
                  <li><FileText size={15} /> {TIPOS[p.tipo] || p.tipo}</li>
                  <li title={fechaCorta(p.fecha_postulacion)}>
                    <CalendarDays size={15} /> Te postulaste {tiempoRelativo(p.fecha_postulacion)}
                  </li>
                  {p.examen_calificacion !== null && p.examen_calificacion !== undefined && (
                    <li>
                      <ChipExamen
                        calificacion={p.examen_calificacion}
                        aciertos={p.examen_aciertos}
                        total={p.examen_total}
                      />
                    </li>
                  )}
                </ul>

                {/* LÍNEA DE TIEMPO */}
                <ol
                  className="bt-postulacion-pasos"
                  aria-label="Avance del proceso"
                  style={{ gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))` }}
                >
                  {pasos.map((id, i) => {
                    const hecho = i < paso || (i === paso && terminada) || i === 0;
                    const actual = i === paso && !terminada;
                    const nombre =
                      id === "resultado" && terminada ? estado.nombre : NOMBRES_PASOS[id];
                    return (
                      <li
                        key={id}
                        className={[
                          hecho ? "hecho" : "",
                          actual ? "actual" : "",
                          id === "resultado" && p.estado === "rechazada" ? "negativo" : "",
                        ].join(" ")}
                        aria-current={actual ? "step" : undefined}
                      >
                        <span className="punto">
                          {hecho && !(id === "resultado" && p.estado === "rechazada") && <Check size={12} strokeWidth={3} />}
                          {id === "resultado" && p.estado === "rechazada" && <XCircle size={12} strokeWidth={3} />}
                        </span>
                        <span className="nombre">{nombre}</span>
                      </li>
                    );
                  })}
                </ol>

                <p className={`bt-postulacion-ayuda ${estado.clase}`}>{estado.ayuda}</p>

                {p.estado_vacante && p.estado_vacante !== "activa" && !terminada && (
                  <p className="bt-postulacion-nota">
                    <AlertTriangle size={15} /> La empresa {p.estado_vacante === "pausada" ? "pausó" : "cerró"} esta vacante.
                  </p>
                )}

                {CANCELABLES.includes(p.estado) && (
                  <div className="bt-postulacion-acciones">
                    {confirmando ? (
                      <div className="bt-postulacion-confirmar" role="alertdialog" aria-label="Confirmar cancelación">
                        <span>¿Cancelar tu postulación? La empresa ya no verá tu solicitud.</span>
                        <div>
                          <button type="button" className="bt-postulaciones-btn" onClick={() => setConfirmandoId(null)} disabled={Boolean(cancelandoId)}>
                            No, conservar
                          </button>
                          <button type="button" className="bt-postulaciones-btn peligro" onClick={() => cancelarPostulacion(p)} disabled={Boolean(cancelandoId)}>
                            {cancelandoId === p.id_postulacion ? "Cancelando..." : "Sí, cancelar"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" className="bt-postulacion-cancelar" onClick={() => setConfirmandoId(p.id_postulacion)}>
                        <XCircle size={16} /> Cancelar postulación
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MisPostulaciones;
