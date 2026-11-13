import { useCallback, useEffect, useMemo, useState } from "react";

import {
  FileText,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  BriefcaseBusiness,
  Mail,
  GraduationCap,
  CalendarDays,
  Save,
} from "lucide-react";

import { sessionGet } from "../../services/session";
import "./PostulacionesEmpresa.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
)
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

const ESTADOS = [
  { valor: "enviada", nombre: "Enviada" },
  { valor: "vista", nombre: "Vista" },
  { valor: "entrevista", nombre: "Entrevista" },
  { valor: "aceptada", nombre: "Aceptada" },
  { valor: "rechazada", nombre: "Rechazada" },
];

const nombreEstado = (estado) =>
  ESTADOS.find((item) => item.valor === estado)?.nombre ||
  estado ||
  "Sin estado";

const formatearFecha = (fecha) => {
  if (!fecha) return "Sin fecha";

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) return "Sin fecha";

  return valor.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ========================================
// PETICIONES A LA API
// ========================================

async function solicitarAPI(ruta, opciones = {}) {
  const sesion = sessionGet("empresa");

  if (!sesion?.token) {
    throw new Error("Debes iniciar sesión como empresa");
  }

  const respuesta = await fetch(`${API_URL}${ruta}`, {
    ...opciones,
    headers: {
      Authorization: `Bearer ${sesion.token}`,
      ...(opciones.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...opciones.headers,
    },
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error(
      datos.mensaje || "No se pudo completar la solicitud"
    );
  }

  return datos;
}

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

function PostulacionesEmpresa({ onActualizar }) {
  const [vacantes, setVacantes] = useState([]);
  const [postulaciones, setPostulaciones] = useState([]);

  const [vacanteActiva, setVacanteActiva] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");

  // Estado elegido en cada fila antes de guardar
  const [cambios, setCambios] = useState({});
  const [guardandoId, setGuardandoId] = useState(null);
  const [abriendoCV, setAbriendoCV] = useState(null);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  // ========================================
  // CONSULTAR POSTULACIONES
  // ========================================

  const obtenerPostulaciones = useCallback(async () => {
    try {
      setCargando(true);
      setError("");

      const datos = await solicitarAPI(
        "/api/empresa/postulaciones"
      );

      setVacantes(
        Array.isArray(datos.vacantes) ? datos.vacantes : []
      );
      setPostulaciones(
        Array.isArray(datos.postulaciones)
          ? datos.postulaciones
          : []
      );
      setCambios({});
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    obtenerPostulaciones();
  }, [obtenerPostulaciones]);

  // ========================================
  // TOTALES POR ESTADO
  // ========================================

  const totales = useMemo(() => {
    const base = Object.fromEntries(
      ESTADOS.map((item) => [item.valor, 0])
    );

    postulaciones.forEach((p) => {
      if (p.estado in base) base[p.estado] += 1;
    });

    return base;
  }, [postulaciones]);

  // ========================================
  // FILTRAR POSTULACIONES
  // ========================================

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return postulaciones.filter((p) => {
      const coincideVacante =
        !vacanteActiva ||
        String(p.id_vacante) === vacanteActiva;

      const coincideEstado =
        !filtroEstado || p.estado === filtroEstado;

      const coincideTexto =
        !texto ||
        p.nombre_estudiante?.toLowerCase().includes(texto) ||
        p.correo_estudiante?.toLowerCase().includes(texto) ||
        p.carrera?.toLowerCase().includes(texto);

      return coincideVacante && coincideEstado && coincideTexto;
    });
  }, [postulaciones, vacanteActiva, filtroEstado, busqueda]);

  // ========================================
  // GUARDAR NUEVO ESTADO
  // ========================================

  const guardarEstado = async (postulacion) => {
    const estado = cambios[postulacion.id_postulacion];

    if (!estado || estado === postulacion.estado) return;

    try {
      setGuardandoId(postulacion.id_postulacion);
      setError("");
      setMensaje("");

      const respuesta = await solicitarAPI(
        `/api/empresa/postulaciones/${postulacion.id_postulacion}/estado`,
        {
          method: "PATCH",
          body: JSON.stringify({ estado }),
        }
      );

      if (respuesta.advertencia) {
        setError(respuesta.advertencia);
      } else {
        setMensaje(
          `La postulación de ${postulacion.nombre_estudiante} ` +
            `cambió a "${nombreEstado(estado)}". ` +
            "Se notificó al estudiante por correo y en BolsaTec."
        );
      }

      await obtenerPostulaciones();
      onActualizar?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoId(null);
    }
  };

  // ========================================
  // VER CURRÍCULUM PDF
  // ========================================

  const verCurriculum = async (postulacion) => {
    if (abriendoCV) return;

    const sesion = sessionGet("empresa");

    if (!sesion?.token) {
      setError("Debes iniciar sesión como empresa");
      return;
    }

    const ventana = window.open("", "_blank");

    if (!ventana) {
      setError(
        "El navegador bloqueó la nueva pestaña. Permite las ventanas emergentes para BolsaTec."
      );
      return;
    }

    try {
      setAbriendoCV(postulacion.id_postulacion);
      setError("");

      const respuesta = await fetch(
        `${API_URL}/api/empresa/postulaciones/${postulacion.id_postulacion}/curriculum`,
        {
          headers: { Authorization: `Bearer ${sesion.token}` },
          cache: "no-store",
        }
      );

      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({}));
        throw new Error(
          datos.mensaje || "No se pudo consultar el currículum"
        );
      }

      const archivo = await respuesta.blob();

      if (archivo.type !== "application/pdf") {
        throw new Error(
          "El servidor no devolvió un archivo PDF válido"
        );
      }

      const url = URL.createObjectURL(archivo);
      ventana.location.replace(url);
      ventana.addEventListener(
        "pagehide",
        () => URL.revokeObjectURL(url),
        { once: true }
      );
    } catch (err) {
      ventana.close();
      setError(err.message);
    } finally {
      setAbriendoCV(null);
    }
  };

  // ========================================
  // INTERFAZ
  // ========================================

  return (
    <div className="bt-postemp">
      {/* ENCABEZADO */}

      <div className="bt-postemp-encabezado">
        <div>
          <h2>Postulaciones recibidas</h2>
          <p>
            Revisa las solicitudes por vacante y actualiza
            su estado. El estudiante recibe un aviso con
            cada cambio.
          </p>
        </div>

        <button
          type="button"
          className="bt-postemp-btn"
          onClick={obtenerPostulaciones}
          disabled={cargando}
        >
          <RefreshCw size={17} />
          Actualizar
        </button>
      </div>

      {/* TOTALES POR ESTADO */}

      <div className="bt-postemp-totales">
        <button
          type="button"
          className={!filtroEstado ? "activo" : ""}
          onClick={() => setFiltroEstado("")}
        >
          <span>Todas</span>
          <strong>{postulaciones.length}</strong>
        </button>

        {ESTADOS.map((item) => (
          <button
            type="button"
            key={item.valor}
            className={`estado-${item.valor} ${
              filtroEstado === item.valor ? "activo" : ""
            }`}
            onClick={() =>
              setFiltroEstado(
                filtroEstado === item.valor ? "" : item.valor
              )
            }
          >
            <span>{item.nombre}</span>
            <strong>{totales[item.valor]}</strong>
          </button>
        ))}
      </div>

      {/* MENSAJES */}

      {error && (
        <div className="bt-postemp-alerta error" role="alert">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {mensaje && (
        <div className="bt-postemp-alerta exito" role="status">
          <CheckCircle2 size={18} />
          {mensaje}
        </div>
      )}

      <div className="bt-postemp-cuerpo">
        {/* LISTA DE VACANTES */}

        <aside className="bt-postemp-vacantes">
          <h3>Vacantes</h3>

          <button
            type="button"
            className={!vacanteActiva ? "activo" : ""}
            onClick={() => setVacanteActiva("")}
          >
            <span>Todas las vacantes</span>
            <strong>{postulaciones.length}</strong>
          </button>

          {vacantes.map((vacante) => (
            <button
              type="button"
              key={vacante.id_vacante}
              className={
                vacanteActiva === String(vacante.id_vacante)
                  ? "activo"
                  : ""
              }
              onClick={() =>
                setVacanteActiva(String(vacante.id_vacante))
              }
            >
              <span>
                {vacante.titulo}
                {vacante.estado_vacante !== "activa" && (
                  <small> · {vacante.estado_vacante}</small>
                )}
              </span>
              <strong>{vacante.total}</strong>
            </button>
          ))}

          {!cargando && vacantes.length === 0 && (
            <p className="bt-postemp-nota">
              Aún no has publicado vacantes.
            </p>
          )}
        </aside>

        {/* POSTULACIONES */}

        <section className="bt-postemp-lista">
          <div className="bt-postemp-busqueda">
            <Search size={18} />
            <input
              type="search"
              placeholder="Buscar por nombre, correo o carrera..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {cargando ? (
            <div className="bt-postemp-vacio">
              Cargando postulaciones...
            </div>
          ) : filtradas.length === 0 ? (
            <div className="bt-postemp-vacio">
              <FileText size={34} />
              <h3>No hay postulaciones</h3>
              <p>
                {postulaciones.length === 0
                  ? "Cuando los estudiantes se postulen a tus vacantes, aparecerán aquí."
                  : "Ninguna postulación coincide con los filtros seleccionados."}
              </p>
            </div>
          ) : (
            filtradas.map((p) => {
              const seleccion =
                cambios[p.id_postulacion] ?? p.estado;
              const guardando =
                guardandoId === p.id_postulacion;

              return (
                <article
                  className="bt-postemp-tarjeta"
                  key={p.id_postulacion}
                >
                  <div className="bt-postemp-info">
                    <div className="bt-postemp-titulo">
                      <h4>{p.nombre_estudiante}</h4>
                      <span
                        className={`bt-postemp-badge estado-${p.estado}`}
                      >
                        {nombreEstado(p.estado)}
                      </span>
                    </div>

                    <p>
                      <BriefcaseBusiness size={15} />
                      {p.titulo_vacante}
                    </p>
                    <p>
                      <Mail size={15} />
                      {p.correo_estudiante}
                    </p>
                    <p>
                      <GraduationCap size={15} />
                      {p.carrera || "Carrera sin registrar"}
                      {p.semestre
                        ? ` · Semestre ${p.semestre}`
                        : ""}
                    </p>
                    <p>
                      <CalendarDays size={15} />
                      {formatearFecha(p.fecha_postulacion)}
                    </p>
                  </div>

                  <div className="bt-postemp-acciones">
                    <select
                      value={seleccion}
                      onChange={(e) =>
                        setCambios((prev) => ({
                          ...prev,
                          [p.id_postulacion]: e.target.value,
                        }))
                      }
                      disabled={guardando}
                      aria-label={`Estado de la postulación de ${p.nombre_estudiante}`}
                    >
                      {ESTADOS.map((item) => (
                        <option
                          key={item.valor}
                          value={item.valor}
                        >
                          {item.nombre}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="bt-postemp-btn principal"
                      onClick={() => guardarEstado(p)}
                      disabled={
                        guardando || seleccion === p.estado
                      }
                    >
                      <Save size={16} />
                      {guardando ? "Guardando..." : "Guardar"}
                    </button>

                    <button
                      type="button"
                      className="bt-postemp-btn"
                      onClick={() => verCurriculum(p)}
                      disabled={
                        !p.tiene_curriculum ||
                        abriendoCV === p.id_postulacion
                      }
                      title={
                        p.tiene_curriculum
                          ? "Ver currículum PDF"
                          : "El estudiante no ha subido su currículum"
                      }
                    >
                      <FileText size={16} />
                      {abriendoCV === p.id_postulacion
                        ? "Abriendo..."
                        : "Ver CV"}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}

export default PostulacionesEmpresa;
