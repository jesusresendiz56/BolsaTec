
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

  const obtenerCandidatos = useCallback(async () => {
    try {
      setCargando(true);
      setError("");

      const datos = await solicitarAPI(
        "/api/empresa/candidatos"
      );

      setCandidatos(
        Array.isArray(datos.candidatos) ? datos.candidatos : []
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
        !filtroEstado || candidato.estado === filtroEstado;

      const coincideVacante =
        !filtroVacante ||
        String(candidato.id_vacante) === filtroVacante;

      return (
        coincideBusqueda &&
        coincideEstado &&
        coincideVacante
      );
    });
  }, [candidatos, busqueda, filtroEstado, filtroVacante]);

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

  const cerrarDetalle = () => {
    if (guardando) return;
    setSeleccionado(null);
    setEstadoNuevo("");
  };

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
          body: JSON.stringify({ estado: estadoNuevo }),
        }
      );

      setMensaje("Estado de la postulación actualizado correctamente.");
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

  return (
    <div className="bt-candidatos">
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
                (candidato) => candidato.estado === "entrevista"
              ).length
            }
          </strong>
        </div>
      </div>

      {error && (
        <div className="bt-candidatos-alerta error" role="alert">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {mensaje && (
        <div className="bt-candidatos-alerta exito" role="status">
          <CheckCircle2 size={18} />
          {mensaje}
        </div>
      )}

      <div className="bt-candidatos-filtros">
        <div className="bt-candidatos-busqueda">
          <Search size={19} />
          <input
            type="search"
            placeholder="Buscar por nombre o correo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <select
          value={filtroVacante}
          onChange={(e) => setFiltroVacante(e.target.value)}
          aria-label="Filtrar por vacante"
        >
          <option value="">Todas las vacantes</option>
          {vacantes.map(([id, titulo]) => (
            <option key={id} value={id}>
              {titulo}
            </option>
          ))}
        </select>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          {Object.entries(nombresEstado).map(([valor, nombre]) => (
            <option key={valor} value={valor}>
              {nombre}
            </option>
          ))}
        </select>
      </div>

      {cargando ? (
        <div className="bt-candidatos-vacio">
          Cargando candidatos...
        </div>
      ) : candidatosFiltrados.length === 0 ? (
        <div className="bt-candidatos-vacio">
          <Users size={35} />
          <h3>No se encontraron candidatos</h3>
          <p>
            Cuando los estudiantes se postulen a tus vacantes,
            aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="bt-candidatos-lista">
          {candidatosFiltrados.map((candidato) => (
            <article
              className="bt-candidato-tarjeta"
              key={candidato.id_postulacion}
            >
              <div className="bt-candidato-avatar">
                {candidato.nombre_estudiante?.charAt(0) || "E"}
              </div>

              <div className="bt-candidato-informacion">
                <div className="bt-candidato-titulo">
                  <h3>{candidato.nombre_estudiante}</h3>
                  <span
                    className={`bt-candidato-estado estado-${candidato.estado}`}
                  >
                    {obtenerNombreEstado(candidato.estado)}
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
                  {candidato.carrera || "Carrera sin registrar"}
                  {candidato.semestre
                    ? ` · Semestre ${candidato.semestre}`
                    : ""}
                </p>

                <p>
                  <CalendarDays size={15} />
                  Postulación:{" "}
                  {formatearFecha(candidato.fecha_postulacion)}
                </p>
              </div>

              <button
                type="button"
                className="bt-candidatos-btn principal"
                onClick={() =>
                  abrirDetalle(candidato.id_postulacion)
                }
                disabled={cargandoDetalle}
              >
                <Eye size={17} />
                Ver candidato
              </button>
            </article>
          ))}
        </div>
      )}

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
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bt-candidato-modal-cabecera">
              <h2>Información del candidato</h2>

              <button
                type="button"
                onClick={cerrarDetalle}
                disabled={guardando}
                aria-label="Cerrar detalle"
              >
                <X size={21} />
              </button>
            </div>

            <div className="bt-candidato-modal-contenido">
              <h3>{seleccionado.nombre_estudiante}</h3>

              <p>
                <strong>Correo:</strong>{" "}
                {seleccionado.correo_estudiante}
              </p>

              <p>
                <strong>Carrera:</strong>{" "}
                {seleccionado.carrera || "Sin registrar"}
              </p>

              <p>
                <strong>Semestre:</strong>{" "}
                {seleccionado.semestre ?? "Sin registrar"}
              </p>

              <p>
                <strong>Vacante:</strong>{" "}
                {seleccionado.titulo_vacante}
              </p>

              <p>
                <strong>Fecha de postulación:</strong>{" "}
                {formatearFecha(seleccionado.fecha_postulacion)}
              </p>

              <h4>Descripción profesional</h4>
              <p>
                {seleccionado.descripcion ||
                  "El estudiante todavía no ha registrado una descripción."}
              </p>

              <h4>Currículum</h4>
              <p>
                {seleccionado.tiene_curriculum
                  ? "El estudiante tiene un currículum registrado. La consulta segura del PDF se habilitará en el siguiente paso."
                  : "El estudiante todavía no ha subido su currículum."}
              </p>

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
                    (item) => item.valor === estadoNuevo
                  ) && (
                    <option value={estadoNuevo}>
                      {obtenerNombreEstado(estadoNuevo)}
                    </option>
                  )}

                  {ESTADOS.map((item) => (
                    <option key={item.valor} value={item.valor}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bt-candidato-modal-acciones">
              <button
                type="button"
                className="bt-candidatos-btn"
                onClick={cerrarDetalle}
                disabled={guardando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="bt-candidatos-btn principal"
                onClick={cambiarEstado}
                disabled={
                  guardando ||
                  estadoNuevo === seleccionado.estado
                }
              >
                {guardando ? "Guardando..." : "Guardar estado"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CandidatosEmpresa;
