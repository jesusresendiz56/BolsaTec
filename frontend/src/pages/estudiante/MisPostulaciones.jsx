
import { useEffect, useState } from "react";

import {
  FileText,
  Building2,
  MapPin,
  CalendarDays,
  RefreshCw,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Eye,
  CalendarCheck,
  XCircle,
} from "lucide-react";

import { sessionGet } from "../../services/session";
import "./MisPostulaciones.css";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

const estados = {
  enviada: {
    nombre: "Enviada",
    icono: Clock3,
    clase: "enviada",
  },
  vista: {
    nombre: "Vista",
    icono: Eye,
    clase: "vista",
  },
  entrevista: {
    nombre: "Entrevista",
    icono: CalendarCheck,
    clase: "entrevista",
  },
  aceptada: {
    nombre: "Aceptada",
    icono: CheckCircle2,
    clase: "aceptada",
  },
  rechazada: {
    nombre: "Rechazada",
    icono: XCircle,
    clase: "rechazada",
  },
};

const modalidades = {
  presencial: "Presencial",
  hibrida: "Híbrida",
  remota: "Remota",
};

const tipos = {
  practicas: "Prácticas profesionales",
  medio_tiempo: "Medio tiempo",
  tiempo_completo: "Tiempo completo",
};

const formatearFecha = (fecha) => {
  if (!fecha) return "Fecha no disponible";

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return "Fecha no disponible";
  }

  return valor.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

function MisPostulaciones() {
  const [postulaciones, setPostulaciones] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // ========================================
  // CONSULTAR POSTULACIONES REALES
  // ========================================

  const consultarPostulaciones = async () => {
    try {
      setCargando(true);
      setError("");

      const sesion = sessionGet("estudiante");

      if (!sesion?.token) {
        throw new Error(
          "Debes iniciar sesión como estudiante"
        );
      }

      const respuesta = await fetch(
        `${API_URL}/api/estudiante/postulaciones`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${sesion.token}`,
          },
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            "No se pudieron consultar las postulaciones"
        );
      }

      setPostulaciones(
        Array.isArray(datos.postulaciones)
          ? datos.postulaciones
          : []
      );
    } catch (err) {
      console.error(
        "Error al consultar postulaciones:",
        err
      );

      setError(err.message);
      setPostulaciones([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    consultarPostulaciones();
  }, []);

  // ========================================
  // FILTRAR POSTULACIONES
  // ========================================

  const postulacionesFiltradas = postulaciones.filter(
    (postulacion) =>
      !filtroEstado || postulacion.estado === filtroEstado
  );

  const totalEntrevistas = postulaciones.filter(
    (postulacion) => postulacion.estado === "entrevista"
  ).length;

  const totalAceptadas = postulaciones.filter(
    (postulacion) => postulacion.estado === "aceptada"
  ).length;

  return (
    <div className="bt-mis-postulaciones">
      <div className="bt-postulaciones-intro">
        <div>
          <h3>Seguimiento de mis postulaciones</h3>
          <p>
            Consulta las vacantes a las que te has
            postulado y revisa el estado de cada
            solicitud.
          </p>
        </div>

        <button
          type="button"
          className="bt-postulaciones-actualizar"
          onClick={consultarPostulaciones}
          disabled={cargando}
        >
          <RefreshCw size={17} />
          {cargando ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {/* ========================================
          RESUMEN DE POSTULACIONES
      ======================================== */}

      <div className="bt-postulaciones-resumen">
        <div className="bt-postulaciones-resumen-card">
          <FileText size={23} />
          <span>Total de postulaciones</span>
          <strong>{postulaciones.length}</strong>
        </div>

        <div className="bt-postulaciones-resumen-card">
          <CalendarCheck size={23} />
          <span>Entrevistas</span>
          <strong>{totalEntrevistas}</strong>
        </div>

        <div className="bt-postulaciones-resumen-card">
          <CheckCircle2 size={23} />
          <span>Aceptadas</span>
          <strong>{totalAceptadas}</strong>
        </div>
      </div>

      {/* ========================================
          FILTRO DE ESTADOS
      ======================================== */}

      <div className="bt-postulaciones-filtros">
        <div>
          <h3>Historial de solicitudes</h3>
          <p>
            {postulacionesFiltradas.length} solicitud(es)
            encontrada(s)
          </p>
        </div>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          aria-label="Filtrar postulaciones por estado"
        >
          <option value="">Todos los estados</option>
          <option value="enviada">Enviada</option>
          <option value="vista">Vista</option>
          <option value="entrevista">Entrevista</option>
          <option value="aceptada">Aceptada</option>
          <option value="rechazada">Rechazada</option>
        </select>
      </div>

      {/* ========================================
          CARGA Y ERRORES
      ======================================== */}

      {cargando && (
        <div className="bt-postulaciones-mensaje">
          Consultando tus postulaciones...
        </div>
      )}

      {error && (
        <div
          className="bt-postulaciones-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {!cargando &&
        !error &&
        postulacionesFiltradas.length === 0 && (
          <div className="bt-postulaciones-mensaje">
            <BriefcaseBusiness size={35} />

            <h4>
              {postulaciones.length === 0
                ? "Todavía no tienes postulaciones"
                : "No hay postulaciones con este estado"}
            </h4>

            <p>
              {postulaciones.length === 0
                ? "Explora las vacantes disponibles y envía tu primera solicitud."
                : "Selecciona otro estado para consultar tus solicitudes."}
            </p>
          </div>
        )}

      {/* ========================================
          LISTADO DE POSTULACIONES
      ======================================== */}

      {!cargando &&
        !error &&
        postulacionesFiltradas.length > 0 && (
          <div className="bt-postulaciones-lista">
            {postulacionesFiltradas.map(
              (postulacion) => {
                const estado =
                  estados[postulacion.estado] || {
                    nombre:
                      postulacion.estado ||
                      "Sin estado",
                    icono: Clock3,
                    clase: "enviada",
                  };

                const IconoEstado = estado.icono;

                return (
                  <article
                    key={postulacion.id_postulacion}
                    className="bt-postulacion-card"
                  >
                    <div className="bt-postulacion-encabezado">
                      <div className="bt-postulacion-titulo">
                        <div className="bt-postulacion-icono">
                          <Building2 size={23} />
                        </div>

                        <div>
                          <h3>{postulacion.titulo}</h3>
                          <p>
                            {postulacion.nombre_empresa}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`bt-postulacion-badge bt-postulacion-badge--${estado.clase}`}
                      >
                        <IconoEstado size={15} />
                        {estado.nombre}
                      </span>
                    </div>

                    <div className="bt-postulacion-detalles">
                      <span>
                        <MapPin size={16} />
                        {postulacion.ubicacion ||
                          "Ubicación no especificada"}
                      </span>

                      <span>
                        <BriefcaseBusiness size={16} />
                        {modalidades[
                          postulacion.modalidad
                        ] ||
                          postulacion.modalidad ||
                          "Sin modalidad"}
                      </span>

                      <span>
                        <FileText size={16} />
                        {tipos[postulacion.tipo] ||
                          postulacion.tipo ||
                          "Sin tipo"}
                      </span>

                      <span>
                        <CalendarDays size={16} />
                        Postulación:{" "}
                        {formatearFecha(
                          postulacion.fecha_postulacion
                        )}
                      </span>
                    </div>

                    {postulacion.estado_vacante !==
                      "activa" && (
                      <p className="bt-postulacion-aviso">
                        Esta vacante actualmente está{" "}
                        {postulacion.estado_vacante}.
                        Tu historial de postulación
                        permanece disponible.
                      </p>
                    )}
                  </article>
                );
              }
            )}
          </div>
        )}
    </div>
  );
}

export default MisPostulaciones;
