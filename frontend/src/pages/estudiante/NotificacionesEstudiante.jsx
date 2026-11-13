
import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  RefreshCw,
} from "lucide-react";

import { sessionGet } from "../../services/session";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

const TEXTO_VACIO = {
  estudiante:
    "Aquí aparecerán los avisos sobre tus postulaciones y novedades de BolsaTec.",
  empresa:
    "Aquí aparecerán los avisos de nuevas postulaciones a tus vacantes y novedades de BolsaTec.",
};

// Componente compartido por estudiante y empresa.
// El backend usa las mismas rutas en /api/<rol>/notificaciones.
function NotificacionesEstudiante({ onActualizar, rol = "estudiante" }) {
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");

  // ========================================
  // CONSULTAR NOTIFICACIONES
  // ========================================

  // silencioso = true: actualización automática sin
  // mostrar "Cargando..." ni borrar la lista.
  const obtenerNotificaciones = async (silencioso = false) => {
    try {
      if (!silencioso) setCargando(true);
      setError("");

      const sesion = sessionGet(rol);

      if (!sesion?.token) {
        throw new Error("Debes iniciar sesión");
      }

      const respuesta = await fetch(
        `${API_URL}/api/${rol}/notificaciones`,
        {
          headers: {
            Authorization: `Bearer ${sesion.token}`,
          },
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
          "No se pudieron consultar las notificaciones"
        );
      }

      const nuevas = datos.notificaciones || [];

      setNotificaciones((anteriores) => {
        // Si llegaron notificaciones nuevas, actualizar
        // también el contador del dashboard.
        const idsPrevios = new Set(
          anteriores.map((n) => n.id_notificacion)
        );

        if (
          silencioso &&
          nuevas.some((n) => !idsPrevios.has(n.id_notificacion))
        ) {
          onActualizar?.();
        }

        return nuevas;
      });
    } catch (err) {
      console.error("Error al consultar notificaciones:", err);
      if (!silencioso) setError(err.message);
    } finally {
      if (!silencioso) setCargando(false);
    }
  };

  useEffect(() => {
    obtenerNotificaciones();

    // Revisar si hay notificaciones nuevas cada 30 s
    // y al volver a la pestaña.
    const intervalo = setInterval(() => {
      if (document.visibilityState === "visible") {
        obtenerNotificaciones(true);
      }
    }, 30000);

    const alVolver = () => {
      if (document.visibilityState === "visible") {
        obtenerNotificaciones(true);
      }
    };

    document.addEventListener("visibilitychange", alVolver);

    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rol]);

  // ========================================
  // MARCAR UNA NOTIFICACIÓN COMO LEÍDA
  // ========================================

  const marcarLeida = async (idNotificacion) => {
    try {
      setProcesando(true);
      setError("");

      const sesion = sessionGet(rol);

      const respuesta = await fetch(
        `${API_URL}/api/${rol}/notificaciones/${idNotificacion}/leer`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${sesion.token}`,
          },
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
          "No se pudo marcar la notificación"
        );
      }

      setNotificaciones((anteriores) =>
        anteriores.map((notificacion) =>
          notificacion.id_notificacion === idNotificacion
            ? { ...notificacion, leida: true }
            : notificacion
        )
      );

      onActualizar?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  };

  // ========================================
  // MARCAR TODAS COMO LEÍDAS
  // ========================================

  const marcarTodas = async () => {
    try {
      setProcesando(true);
      setError("");

      const sesion = sessionGet(rol);

      const respuesta = await fetch(
        `${API_URL}/api/${rol}/notificaciones/leer-todas`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${sesion.token}`,
          },
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
          "No se pudieron actualizar las notificaciones"
        );
      }

      setNotificaciones((anteriores) =>
        anteriores.map((notificacion) => ({
          ...notificacion,
          leida: true,
        }))
      );

      onActualizar?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  };

  const noLeidas = notificaciones.filter(
    (notificacion) => !notificacion.leida
  ).length;

  const formatearFecha = (fecha) => {
    if (!fecha) return "Sin fecha";

    const valor = new Date(fecha);

    if (Number.isNaN(valor.getTime())) {
      return "Sin fecha";
    }

    return valor.toLocaleString("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="bt-dashboard-panel">
      <div className="bt-notificaciones-header">
        <div>
          <h3>Mis notificaciones</h3>
          <p>
            Tienes {noLeidas} notificación(es) sin leer.
          </p>
        </div>

        <div className="bt-notificaciones-acciones">
          <button
            type="button"
            className="bt-notificaciones-btn"
            onClick={() => obtenerNotificaciones()}
            disabled={cargando || procesando}
          >
            <RefreshCw size={16} />
            Actualizar
          </button>

          <button
            type="button"
            className="bt-notificaciones-btn principal"
            onClick={marcarTodas}
            disabled={
              cargando ||
              procesando ||
              noLeidas === 0
            }
          >
            <CheckCheck size={16} />
            Marcar todas como leídas
          </button>
        </div>
      </div>

      {error && (
        <p className="bt-notificaciones-error">
          {error}
        </p>
      )}

      {cargando ? (
        <p>Cargando notificaciones...</p>
      ) : notificaciones.length === 0 ? (
        <div className="bt-notificaciones-vacio">
          <Bell size={36} />
          <h4>No tienes notificaciones</h4>
          <p>{TEXTO_VACIO[rol] || TEXTO_VACIO.estudiante}</p>
        </div>
      ) : (
        <div className="bt-notificaciones-lista">
          {notificaciones.map((notificacion) => (
            <div
              key={notificacion.id_notificacion}
              className={
                "bt-notificacion-item " +
                (notificacion.leida
                  ? "leida"
                  : "no-leida")
              }
            >
              <div className="bt-notificacion-icono">
                <Bell size={19} />
              </div>

              <div className="bt-notificacion-contenido">
                <p>{notificacion.mensaje}</p>

                <small>
                  {formatearFecha(notificacion.fecha)}
                </small>
              </div>

              {!notificacion.leida && (
                <button
                  type="button"
                  className="bt-notificacion-leer"
                  onClick={() =>
                    marcarLeida(notificacion.id_notificacion)
                  }
                  disabled={procesando}
                  title="Marcar como leída"
                >
                  <Check size={18} />
                  <span>Marcar leída</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotificacionesEstudiante;
