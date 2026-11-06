
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Users,
  Search,
  RefreshCw,
  Eye,
  X,
  Mail,
  GraduationCap,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";

import { sessionGet } from "../../services/session";
import "./CandidatosEmpresa.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");

const ESTADOS = [
  { valor: "enviada", nombre: "Enviada" },
  { valor: "vista", nombre: "Vista" },
  { valor: "entrevista", nombre: "Entrevista" },
  { valor: "aceptada", nombre: "Aceptada" },
  { valor: "rechazada", nombre: "Rechazada" },
];

const nombresEstado = {
  pendiente: "Pendiente",
  revision: "En revisión",
  enviada: "Enviada",
  vista: "Vista",
  entrevista: "Entrevista",
  seleccionado: "Seleccionado",
  aceptada: "Aceptada",
  rechazado: "Rechazado",
  rechazada: "Rechazada",
};

const obtenerNombreEstado = (estado) =>
  nombresEstado[estado] || estado || "Sin estado";

const formatearFecha = (fecha) => {
  if (!fecha) return "Sin fecha";

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return "Sin fecha";
  }

  return valor.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
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

function CandidatosEmpresa({ onActualizar }) {
  const [candidatos, setCandidatos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroVacante, setFiltroVacante] = useState("");

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [seleccionado, setSeleccionado] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [estadoNuevo, setEstadoNuevo] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Estado para consultar currículums
  const [abriendoCurriculum, setAbriendoCurriculum] =
    useState(false);

  // ========================================
  // CONSULTAR CANDIDATOS
  // ========================================

  const obtenerCandidatos = useCallback(async () => {
    try {
      setCargando(true);
      setError("");

      const datos = await solicitarAPI(
        "/api/empresa/candidatos"
      );

      setCandidatos(
        Array.isArray(datos.candidatos)
          ? datos.candidatos
          : []
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    obtenerCandidatos();
  }, [obtenerCandidatos]);

  // ========================================
  // OBTENER VACANTES CON CANDIDATOS
  // ========================================

  const vacantes = useMemo(() => {
    const mapa = new Map();

    candidatos.forEach((candidato) => {
      mapa.set(
        String(candidato.id_vacante),
        candidato.titulo_vacante
      );
    });

    return [...mapa.entries()];
  }, [candidatos]);

  // ========================================
  // FILTRAR CANDIDATOS
  // ========================================

  const candidatosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return candidatos.filter((candidato) => {
      const coincideBusqueda =
        !texto ||
        candidato.nombre_estudiante
          ?.toLowerCase()
          .includes(texto) ||
        candidato.correo_estudiante
          ?.toLowerCase()
          .includes(texto);

      const coincideEstado =
        !filtroEstado ||
        candidato.estado === filtroEstado;

      const coincideVacante =
        !filtroVacante ||
        String(candidato.id_vacante) === filtroVacante;

      return (
        coincideBusqueda &&
        coincideEstado &&
        coincideVacante
      );
    });
  }, [
    candidatos,
    busqueda,
    filtroEstado,
    filtroVacante,
  ]);

  // ========================================
  // ABRIR DETALLE DEL CANDIDATO
  // ========================================

  const abrirDetalle = async (idPostulacion) => {
    try {
      setCargandoDetalle(true);
      setError("");
      setMensaje("");

      const datos = await solicitarAPI(
        `/api/empresa/candidatos/${idPostulacion}`
      );

      setSeleccionado(datos.candidato);
      setEstadoNuevo(datos.candidato.estado);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargandoDetalle(false);
    }
  };

  // ========================================
  // CERRAR DETALLE
  // ========================================

  const cerrarDetalle = () => {
    if (guardando || abriendoCurriculum) return;

    setSeleccionado(null);
    setEstadoNuevo("");
  };

  // ========================================
  // VISUALIZAR CURRÍCULUM PDF
  // ========================================

  const verCurriculum = async () => {
    if (
      !seleccionado ||
      !seleccionado.tiene_curriculum ||
      abriendoCurriculum
    ) {
      return;
    }

    const sesion = sessionGet("empresa");

    if (!sesion?.token) {
      setError("Debes iniciar sesión como empresa");
      return;
    }

    // Abrir la pestaña desde el clic para evitar
    // que el navegador bloquee la ventana emergente.
    const nuevaVentana = window.open(
      "",
      "_blank"
    );

    if (!nuevaVentana) {
      setError(
        "El navegador bloqueó la nueva pestaña. Permite las ventanas emergentes para BolsaTec."
      );
      return;
    }

    try {
      setAbriendoCurriculum(true);
      setError("");

      const respuesta = await fetch(
        `${API_URL}/api/empresa/candidatos/${seleccionado.id_postulacion}/curriculum`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${sesion.token}`,
          },
          cache: "no-store",
        }
      );

      if (!respuesta.ok) {
        const datos = await respuesta
          .json()
          .catch(() => ({}));

        throw new Error(
          datos.mensaje ||
            "No se pudo consultar el currículum"
        );
      }

      const archivo = await respuesta.blob();

      if (archivo.type !== "application/pdf") {
        throw new Error(
          "El servidor no devolvió un archivo PDF válido"
        );
      }

      const urlTemporal = URL.createObjectURL(archivo);

      nuevaVentana.location.replace(urlTemporal);

      // Liberar la URL temporal después de permitir
      // que el navegador cargue el documento.
      // Se conserva mientras la pestaña esté abierta.
      const liberarURL = () => {
        URL.revokeObjectURL(urlTemporal);
      };

      nuevaVentana.addEventListener(
        "pagehide",
        liberarURL,
        { once: true }
      );

    } catch (err) {
      nuevaVentana.close();
      setError(err.message);
    } finally {
      setAbriendoCurriculum(false);
    }
  };

  // ========================================
  // CAMBIAR ESTADO DE POSTULACIÓN
  // ========================================

  const cambiarEstado = async () => {
    if (!seleccionado || guardando) return;

    if (estadoNuevo === seleccionado.estado) {
      return;
    }

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      await solicitarAPI(
        `/api/empresa/candidatos/${seleccionado.id_postulacion}/estado`,
        {
          method: "PATCH",
          body: JSON.stringify({
            estado: estadoNuevo,
          }),
        }
      );

      setMensaje(
        "Estado de la postulación actualizado correctamente."
      );

      setSeleccionado(null);
      setEstadoNuevo("");

      await obtenerCandidatos();

      onActualizar?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  // ========================================
  // INTERFAZ
  // ========================================

  return (
    <div className="bt-candidatos">

      {/* ENCABEZADO */}

      <div className="bt-candidatos-encabezado">
        <div>
          <h2>Gestión de candidatos</h2>
          <p>
            Consulta y administra los estudiantes que se
            postularon a tus vacantes.
          </p>
        </div>

        <button
          type="button"
          className="bt-candidatos-btn"
          onClick={obtenerCandidatos}
          disabled={cargando}
        >
          <RefreshCw size={17} />
          Actualizar
        </button>
      </div>

      {/* ESTADÍSTICAS */}

      <div className="bt-candidatos-resumen">
        <div>
          <Users size={22} />
          <span>Candidatos registrados</span>
          <strong>{candidatos.length}</strong>
        </div>

        <div>
          <BriefcaseBusiness size={22} />
          <span>Vacantes con postulantes</span>
          <strong>{vacantes.length}</strong>
        </div>

        <div>
          <CheckCircle2 size={22} />
          <span>En entrevista</span>
          <strong>
            {
              candidatos.filter(
                (candidato) =>
                  candidato.estado === "entrevista"
              ).length
            }
          </strong>
        </div>
      </div>

      {/* MENSAJES */}

      {error && (
        <div
          className="bt-candidatos-alerta error"
          role="alert"
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {mensaje && (
        <div
          className="bt-candidatos-alerta exito"
          role="status"
        >
          <CheckCircle2 size={18} />
          {mensaje}
        </div>
      )}

      {/* FILTROS */}

      <div className="bt-candidatos-filtros">
        <div className="bt-candidatos-busqueda">
          <Search size={19} />

          <input
            type="search"
            placeholder="Buscar por nombre o correo..."
            value={busqueda}
            onChange={(e) =>
              setBusqueda(e.target.value)
            }
          />
        </div>

        <select
          value={filtroVacante}
          onChange={(e) =>
            setFiltroVacante(e.target.value)
          }
          aria-label="Filtrar por vacante"
        >
          <option value="">
            Todas las vacantes
          </option>

          {vacantes.map(([id, titulo]) => (
            <option key={id} value={id}>
              {titulo}
            </option>
          ))}
        </select>

        <select
          value={filtroEstado}
          onChange={(e) =>
            setFiltroEstado(e.target.value)
          }
          aria-label="Filtrar por estado"
        >
          <option value="">
            Todos los estados
          </option>

          {Object.entries(nombresEstado).map(
            ([valor, nombre]) => (
              <option key={valor} value={valor}>
                {nombre}
              </option>
            )
          )}
        </select>
      </div>

      {/* LISTA DE CANDIDATOS */}

      {cargando ? (
        <div className="bt-candidatos-vacio">
          Cargando candidatos...
        </div>
      ) : candidatosFiltrados.length === 0 ? (
        <div className="bt-candidatos-vacio">
          <Users size={35} />

          <h3>No se encontraron candidatos</h3>

          <p>
            Cuando los estudiantes se postulen a tus
            vacantes, aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="bt-candidatos-lista">
          {candidatosFiltrados.map(
            (candidato) => (
              <article
                className="bt-candidato-tarjeta"
                key={candidato.id_postulacion}
              >
                <div className="bt-candidato-avatar">
                  {candidato.nombre_estudiante
                    ?.charAt(0) || "E"}
                </div>

                <div className="bt-candidato-informacion">
                  <div className="bt-candidato-titulo">
                    <h3>
                      {candidato.nombre_estudiante}
                    </h3>

                    <span
                      className={`bt-candidato-estado estado-${candidato.estado}`}
                    >
                      {obtenerNombreEstado(
                        candidato.estado
                      )}
                    </span>
                  </div>

                  <p>
                    <Mail size={15} />
                    {candidato.correo_estudiante}
                  </p>

                  <p>
                    <BriefcaseBusiness size={15} />
                    {candidato.titulo_vacante}
                  </p>

                  <p>
                    <GraduationCap size={15} />
                    {candidato.carrera ||
                      "Carrera sin registrar"}

                    {candidato.semestre
                      ? ` · Semestre ${candidato.semestre}`
                      : ""}
                  </p>

                  <p>
                    <CalendarDays size={15} />
                    Postulación:{" "}
                    {formatearFecha(
                      candidato.fecha_postulacion
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  className="bt-candidatos-btn principal"
                  onClick={() =>
                    abrirDetalle(
                      candidato.id_postulacion
                    )
                  }
                  disabled={cargandoDetalle}
                >
                  <Eye size={17} />
                  Ver candidato
                </button>
              </article>
            )
          )}
        </div>
      )}

      {/* MODAL DEL CANDIDATO */}

      {seleccionado && (
        <div
          className="bt-candidato-modal-fondo"
          onClick={cerrarDetalle}
        >
          <div
            className="bt-candidato-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Detalle del candidato"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* CABECERA */}

            <div className="bt-candidato-modal-cabecera">
              <h2>
                Información del candidato
              </h2>

              <button
                type="button"
                onClick={cerrarDetalle}
                disabled={
                  guardando || abriendoCurriculum
                }
                aria-label="Cerrar detalle"
              >
                <X size={21} />
              </button>
            </div>

            {/* INFORMACIÓN */}

            <div className="bt-candidato-modal-contenido">
              <h3>
                {seleccionado.nombre_estudiante}
              </h3>

              <p>
                <strong>Correo:</strong>{" "}
                {seleccionado.correo_estudiante}
              </p>

              <p>
                <strong>Carrera:</strong>{" "}
                {seleccionado.carrera ||
                  "Sin registrar"}
              </p>

              <p>
                <strong>Semestre:</strong>{" "}
                {seleccionado.semestre ??
                  "Sin registrar"}
              </p>

              <p>
                <strong>Vacante:</strong>{" "}
                {seleccionado.titulo_vacante}
              </p>

              <p>
                <strong>
                  Fecha de postulación:
                </strong>{" "}
                {formatearFecha(
                  seleccionado.fecha_postulacion
                )}
              </p>

              {/* DESCRIPCIÓN */}

              <h4>
                Descripción profesional
              </h4>

              <p>
                {seleccionado.descripcion ||
                  "El estudiante todavía no ha registrado una descripción."}
              </p>

              {/* CURRÍCULUM */}

              <h4>Currículum</h4>

              {seleccionado.tiene_curriculum ? (
                <div>
                  <p>
                    El estudiante tiene un
                    currículum registrado.
                  </p>

                  <button
                    type="button"
                    className="bt-candidatos-btn principal"
                    onClick={verCurriculum}
                    disabled={abriendoCurriculum}
                  >
                    <FileText size={17} />

                    {abriendoCurriculum
                      ? "Abriendo PDF..."
                      : "Ver currículum PDF"}
                  </button>
                </div>
              ) : (
                <p>
                  El estudiante todavía no ha
                  subido su currículum.
                </p>
              )}

              {/* CAMBIAR ESTADO */}

              <div className="bt-candidato-cambio-estado">
                <label htmlFor="estado-candidato">
                  Estado de la postulación
                </label>

                <select
                  id="estado-candidato"
                  value={estadoNuevo}
                  onChange={(e) =>
                    setEstadoNuevo(e.target.value)
                  }
                  disabled={guardando}
                >
                  {!ESTADOS.some(
                    (item) =>
                      item.valor === estadoNuevo
                  ) && (
                    <option value={estadoNuevo}>
                      {obtenerNombreEstado(
                        estadoNuevo
                      )}
                    </option>
                  )}

                  {ESTADOS.map((item) => (
                    <option
                      key={item.valor}
                      value={item.valor}
                    >
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ACCIONES */}

            <div className="bt-candidato-modal-acciones">
              <button
                type="button"
                className="bt-candidatos-btn"
                onClick={cerrarDetalle}
                disabled={
                  guardando || abriendoCurriculum
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="bt-candidatos-btn principal"
                onClick={cambiarEstado}
                disabled={
                  guardando ||
                  abriendoCurriculum ||
                  estadoNuevo ===
                    seleccionado.estado
                }
              >
                {guardando
                  ? "Guardando..."
                  : "Guardar estado"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CandidatosEmpresa;
