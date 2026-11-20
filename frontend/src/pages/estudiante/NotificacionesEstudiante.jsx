import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Bell,
  BellOff,
  CalendarCheck,
  Check,
  CheckCheck,
  CheckCircle2,
  Eye,
  RefreshCw,
  Send,
  UserPlus,
  XCircle,
} from "lucide-react";

import { sessionGet } from "../../services/session";
import {
  fechaCompleta,
  grupoDeFecha,
  tiempoRelativo,
} from "../../services/fechas";
import "./notificaciones.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");

const TEXTO_VACIO = {
  estudiante:
    "Aquí aparecerán los avisos sobre tus postulaciones y novedades de BolsaTec.",
  empresa:
    "Aquí aparecerán los avisos de nuevas postulaciones a tus vacantes y novedades de BolsaTec.",
};

// Tipo de aviso según el texto (las notificaciones solo guardan el mensaje)
const TIPOS = [
  { id: "aceptada", prueba: /felicidades|aceptó/i, icono: CheckCircle2 },
  { id: "rechazada", prueba: /otros candidatos|rechaz|no fue seleccionad/i, icono: XCircle },
  { id: "entrevista", prueba: /entrevist/i, icono: CalendarCheck },
  { id: "vista", prueba: /revisó/i, icono: Eye },
  { id: "cancelada", prueba: /cancel/i, icono: XCircle },
  { id: "nueva", prueba: /nueva postulación|recibiste/i, icono: UserPlus },
  { id: "enviada", prueba: /se registró correctamente/i, icono: Send },
];

const tipoDe = (mensaje = "") =>
  TIPOS.find((t) => t.prueba.test(mensaje)) || { id: "info", icono: Bell };

// Resaltar los nombres entre comillas ("Vacante", "Empresa")
const resaltar = (mensaje = "") =>
  mensaje.split(/("[^"]+")/g).map((parte, i) =>
    /^"[^"]+"$/.test(parte) ? <strong key={i}>{parte.slice(1, -1)}</strong> : parte
  );

const ORDEN_GRUPOS = ["Hoy", "Ayer", "Esta semana", "Anteriores"];

// Componente compartido por estudiante y empresa.
// El backend usa las mismas rutas en /api/<rol>/notificaciones.
function NotificacionesEstudiante({ onActualizar, onIr, rol = "estudiante" }) {
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);

  // ========================================
  // CONSULTAR NOTIFICACIONES
  // ========================================

  // silencioso = true: actualización automática sin
  // mostrar "Cargando..." ni borrar la lista.
  const obtenerNotificaciones = useCallback(
    async (silencioso = false) => {
      try {
        if (!silencioso) setCargando(true);
        setError("");

        const sesion = sessionGet(rol);
        if (!sesion?.token) throw new Error("Debes iniciar sesión");

        const respuesta = await fetch(`${API_URL}/api/${rol}/notificaciones`, {
          headers: { Authorization: `Bearer ${sesion.token}` },
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(datos.mensaje || "No se pudieron consultar las notificaciones");
        }

        const nuevas = datos.notificaciones || [];

        setNotificaciones((anteriores) => {
          // Si llegaron notificaciones nuevas, actualizar
          // también el contador del dashboard.
          const idsPrevios = new Set(anteriores.map((n) => n.id_notificacion));
          if (silencioso && nuevas.some((n) => !idsPrevios.has(n.id_notificacion))) {
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
    },
    [rol, onActualizar]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    obtenerNotificaciones();

    // Revisar si hay notificaciones nuevas cada 30 s y al volver a la pestaña
    const revisar = () => {
      if (document.visibilityState === "visible") obtenerNotificaciones(true);
    };
    const intervalo = setInterval(revisar, 30000);
    document.addEventListener("visibilitychange", revisar);

    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", revisar);
    };
    // Solo al montar o cambiar de rol
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rol]);

  // ========================================
  // MARCAR COMO LEÍDAS
  // ========================================

  const llamar = async (ruta, mensajeError) => {
    const sesion = sessionGet(rol);
    const respuesta = await fetch(`${API_URL}/api/${rol}/notificaciones/${ruta}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${sesion?.token}` },
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(datos.mensaje || mensajeError);
  };

  const marcarLeida = async (idNotificacion) => {
    // Actualizar la vista primero; si falla, se revierte
    setNotificaciones((anteriores) =>
      anteriores.map((n) => (n.id_notificacion === idNotificacion ? { ...n, leida: true } : n))
    );

    try {
      await llamar(`${idNotificacion}/leer`, "No se pudo marcar la notificación");
      onActualizar?.();
    } catch (err) {
      setError(err.message);
      setNotificaciones((anteriores) =>
        anteriores.map((n) => (n.id_notificacion === idNotificacion ? { ...n, leida: false } : n))
      );
    }
  };

  const marcarTodas = async () => {
    try {
      setProcesando(true);
      setError("");
      await llamar("leer-todas", "No se pudieron actualizar las notificaciones");
      setNotificaciones((anteriores) => anteriores.map((n) => ({ ...n, leida: true })));
      onActualizar?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  };

  // ========================================
  // AGRUPAR POR DÍA
  // ========================================

  const noLeidas = notificaciones.filter((n) => !n.leida).length;
  const visibles = soloNoLeidas ? notificaciones.filter((n) => !n.leida) : notificaciones;

  const grupos = ORDEN_GRUPOS.map((nombre) => ({
    nombre,
    items: visibles.filter((n) => grupoDeFecha(n.fecha) === nombre),
  })).filter((g) => g.items.length);

  // Adónde lleva cada aviso
  const destino = rol === "empresa" ? "postulaciones" : "postulaciones";
  const textoDestino = rol === "empresa" ? "Ver postulaciones" : "Ver mis postulaciones";

  return (
    <div className="bt-notificaciones">
      <div className="bt-notificaciones-header">
        <div>
          <h2>
            Notificaciones
            {noLeidas > 0 && <span className="bt-notificaciones-contador">{noLeidas} sin leer</span>}
          </h2>
          <p>Avisos sobre {rol === "empresa" ? "las postulaciones a tus vacantes" : "tus postulaciones"}.</p>
        </div>

        <div className="bt-notificaciones-acciones">
          <button
            type="button"
            className="bt-notificaciones-btn"
            onClick={() => obtenerNotificaciones()}
            disabled={cargando || procesando}
            aria-label="Actualizar notificaciones"
            title="Actualizar"
          >
            <RefreshCw size={16} className={cargando ? "girando" : ""} />
          </button>

          <button
            type="button"
            className="bt-notificaciones-btn principal"
            onClick={marcarTodas}
            disabled={cargando || procesando || noLeidas === 0}
          >
            <CheckCheck size={16} />
            Marcar todas como leídas
          </button>
        </div>
      </div>

      <div className="bt-notificaciones-filtro" role="tablist" aria-label="Filtrar notificaciones">
        <button type="button" role="tab" aria-selected={!soloNoLeidas} className={!soloNoLeidas ? "activo" : ""} onClick={() => setSoloNoLeidas(false)}>
          Todas <span>{notificaciones.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={soloNoLeidas} className={soloNoLeidas ? "activo" : ""} onClick={() => setSoloNoLeidas(true)}>
          No leídas <span>{noLeidas}</span>
        </button>
      </div>

      {error && <p className="bt-notificaciones-error" role="alert">{error}</p>}

      {cargando && notificaciones.length === 0 ? (
        <div className="bt-notificaciones-caja">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bt-notificacion-item esqueleto" aria-hidden="true">
              <span className="bt-notificacion-icono" />
              <div className="bt-notificacion-contenido"><span /><span /></div>
            </div>
          ))}
        </div>
      ) : visibles.length === 0 ? (
        <div className="bt-notificaciones-vacio">
          {soloNoLeidas ? <CheckCheck size={38} /> : <BellOff size={38} />}
          <h4>{soloNoLeidas ? "¡Estás al día!" : "No tienes notificaciones"}</h4>
          <p>{soloNoLeidas ? "No tienes notificaciones sin leer." : TEXTO_VACIO[rol] || TEXTO_VACIO.estudiante}</p>
        </div>
      ) : (
        grupos.map((grupo) => (
          <section key={grupo.nombre} className="bt-notificaciones-grupo">
            <h3>{grupo.nombre}</h3>

            <div className="bt-notificaciones-caja">
              {grupo.items.map((n) => {
                const tipo = tipoDe(n.mensaje);
                const Icono = tipo.icono;

                return (
                  <div
                    key={n.id_notificacion}
                    className={`bt-notificacion-item tipo-${tipo.id} ${n.leida ? "leida" : "no-leida"}`}
                  >
                    <div className="bt-notificacion-icono"><Icono size={19} /></div>

                    <div className="bt-notificacion-contenido">
                      <p>{resaltar(n.mensaje)}</p>
                      <div className="bt-notificacion-pie">
                        <small title={fechaCompleta(n.fecha)}>{tiempoRelativo(n.fecha)}</small>
                        {onIr && ["aceptada", "rechazada", "entrevista", "vista", "nueva", "cancelada"].includes(tipo.id) && (
                          <button
                            type="button"
                            className="bt-notificacion-ir"
                            onClick={() => {
                              if (!n.leida) marcarLeida(n.id_notificacion);
                              onIr(destino);
                            }}
                          >
                            {textoDestino} <ArrowRight size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {!n.leida ? (
                      <button
                        type="button"
                        className="bt-notificacion-leer"
                        onClick={() => marcarLeida(n.id_notificacion)}
                        title="Marcar como leída"
                        aria-label="Marcar como leída"
                      >
                        <span className="punto" aria-hidden="true" />
                        <Check size={17} />
                      </button>
                    ) : (
                      <span className="bt-notificacion-leida-marca" title="Leída"><Check size={15} /></span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

export default NotificacionesEstudiante;
