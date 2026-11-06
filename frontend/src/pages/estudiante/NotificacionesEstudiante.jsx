
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

function NotificacionesEstudiante({ onActualizar }) {
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");

  // ========================================
  // CONSULTAR NOTIFICACIONES
  // ========================================

  const obtenerNotificaciones = async () => {
    try {
      setCargando(true);
      setError("");

      const sesion = sessionGet("estudiante");

      if (!sesion?.token) {
        throw new Error("Debes iniciar sesión");
      }

      const respuesta = await fetch(
        `${API_URL}/api/estudiante/notificaciones`,
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

      setNotificaciones(datos.notificaciones || []);
    } catch (err) {
      console.error("Error al consultar notificaciones:", err);
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerNotificaciones();
  }, []);

  // ========================================
  // MARCAR UNA NOTIFICACIÓN COMO LEÍDA
  // ========================================

  const marcarLeida = async (idNotificacion) => {
    try {
      setProcesando(true);
      setError("");

      const sesion = sessionGet("estudiante");

      const respuesta = await fetch(
        `${API_URL}/api/estudiante/notificaciones/${idNotificacion}/leer`,
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

      const sesion = sessionGet("estudiante");

      const respuesta = await fetch(
        `${API_URL}/api/estudiante/notificaciones/leer-todas`,
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
            onClick={obtenerNotificaciones}
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
          <p>
            Aquí aparecerán los avisos sobre tus
            postulaciones y novedades de BolsaTec.
          </p>
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
