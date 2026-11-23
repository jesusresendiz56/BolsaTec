import { useCallback, useEffect, useState } from "react";

import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Circle,
  FileText,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";

import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { sessionGet } from "../../services/session";
import { tiempoRelativo, esReciente } from "../../services/fechas";
import { calcularAvancePerfil } from "../../services/perfilEstudiante";
import { ESTADOS_POSTULACION } from "../../services/postulaciones";

import PerfilEstudiante from "./PerfilEstudiante";
import BuscarVacantes from "./BuscarVacantes";
import MisPostulaciones from "./MisPostulaciones";
import NotificacionesEstudiante from "./NotificacionesEstudiante";

import "./notificaciones.css";
import "./MisPostulaciones.css";
import "./EstudianteDashboard.css";

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
  practicas: "Prácticas",
  tiempo_completo: "Tiempo completo",
  medio_tiempo: "Medio tiempo",
  servicio_social: "Servicio social",
};

const pedir = async (ruta, token) => {
  const respuesta = await fetch(`${API_URL}/api/estudiante${ruta}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error(datos.mensaje || "No se pudo cargar la información");
  }
  return datos;
};

const saludo = () => {
  const hora = new Date().getHours();
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
};

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

function EstudianteDashboard() {
  const usuario = sessionGet("estudiante")?.usuario;
  const primerNombre = usuario?.nombre?.trim().split(/\s+/)[0] || "estudiante";

  const [resumen, setResumen] = useState({
    postulaciones: 0,
    vacantes: 0,
    entrevistas: 0,
    notificaciones: 0,
  });
  const [postulaciones, setPostulaciones] = useState([]);
  const [vacantes, setVacantes] = useState([]);
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // ========================================
  // CONSULTAR TODO EN PARALELO
  // ========================================

  const obtenerEstadisticas = useCallback(async () => {
    try {
      setCargando(true);
      setError("");

      const token = sessionGet("estudiante")?.token;
      if (!token) throw new Error("Debes iniciar sesión como estudiante");

      const [estadisticas, datosPostulaciones, datosVacantes, datosPerfil] =
        await Promise.all([
          pedir("/estadisticas", token),
          pedir("/postulaciones", token).catch(() => ({ postulaciones: [] })),
          pedir("/vacantes", token).catch(() => ({ vacantes: [] })),
          pedir("/perfil", token).catch(() => ({ estudiante: null })),
        ]);

      setResumen({
        postulaciones: Number(estadisticas.postulaciones) || 0,
        vacantes: Number(estadisticas.vacantes) || 0,
        entrevistas: Number(estadisticas.entrevistas) || 0,
        notificaciones: Number(estadisticas.notificaciones) || 0,
      });
      setPostulaciones(datosPostulaciones.postulaciones || []);
      setVacantes(datosVacantes.vacantes || []);
      setPerfil(datosPerfil.estudiante);
    } catch (err) {
      console.error("Error en dashboard del estudiante:", err);
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // La consulta inicial actualiza el estado al terminar
    // eslint-disable-next-line react-hooks/set-state-in-effect
    obtenerEstadisticas();
  }, [obtenerEstadisticas]);

  // ========================================
  // MENÚ (con contador de notificaciones)
  // ========================================

  const menu = [
    { id: "dashboard", nombre: "Dashboard", icono: "dashboard" },
    { id: "perfil", nombre: "Mi perfil", icono: "perfil" },
    { id: "vacantes", nombre: "Buscar vacantes", icono: "vacantes" },
    { id: "postulaciones", nombre: "Mis postulaciones", icono: "postulaciones" },
    {
      id: "notificaciones",
      nombre: "Notificaciones",
      icono: "notificaciones",
      badge: resumen.notificaciones,
    },
  ];

  // ========================================
  // DASHBOARD PRINCIPAL
  // ========================================

  const renderDashboard = (irA) => {
    const avance = perfil ? calcularAvancePerfil(perfil, perfil.cv_url) : null;

    const idsPostulados = new Set(postulaciones.map((p) => p.id_vacante));
    const sugeridas = vacantes
      .filter((v) => !idsPostulados.has(v.id_vacante))
      .slice(0, 3);

    const tarjetas = [
      { titulo: "Mis postulaciones", icono: FileText, valor: resumen.postulaciones, destino: "postulaciones" },
      { titulo: "Vacantes disponibles", icono: BriefcaseBusiness, valor: resumen.vacantes, destino: "vacantes" },
      { titulo: "Entrevistas", icono: CalendarCheck, valor: resumen.entrevistas, destino: "postulaciones" },
      { titulo: "Notificaciones sin leer", icono: Bell, valor: resumen.notificaciones, destino: "notificaciones" },
    ];

    return (
      <div className="bt-est-inicio">
        {/* BIENVENIDA */}
        <section className="bt-dashboard-welcome bt-est-bienvenida">
          <div>
            <h2>{saludo()}, {primerNombre}</h2>
            <p>
              {resumen.entrevistas > 0
                ? `Tienes ${resumen.entrevistas} entrevista${resumen.entrevistas === 1 ? "" : "s"} en proceso. ¡Mucho éxito!`
                : "Encuentra prácticas y empleos, y da seguimiento a tus postulaciones."}
            </p>
          </div>

          <button type="button" className="bt-est-bienvenida-btn" onClick={() => irA("vacantes")}>
            <Search size={18} />
            Buscar vacantes
          </button>
        </section>

        {error && (
          <div className="bt-est-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={obtenerEstadisticas}>
              <RefreshCw size={15} /> Reintentar
            </button>
          </div>
        )}

        {/* ESTADÍSTICAS (llevan a su sección) */}
        <div className="bt-dashboard-stats">
          {tarjetas.map((item) => {
            const Icono = item.icono;
            return (
              <button
                type="button"
                className="bt-stat-card bt-est-stat"
                key={item.titulo}
                onClick={() => irA(item.destino)}
              >
                <div className="bt-stat-icon">
                  <Icono size={23} />
                </div>
                <p>{item.titulo}</p>
                <strong>{cargando ? "…" : error ? "—" : item.valor}</strong>
                <ArrowRight size={16} className="bt-est-stat-flecha" aria-hidden="true" />
              </button>
            );
          })}
        </div>

        <div className="bt-est-columnas">
          {/* POSTULACIONES RECIENTES */}
          <section className="bt-dashboard-panel bt-est-panel">
            <div className="bt-est-panel-titulo">
              <h3><FileText size={19} /> Postulaciones recientes</h3>
              {postulaciones.length > 0 && (
                <button type="button" onClick={() => irA("postulaciones")}>
                  Ver todas <ArrowRight size={15} />
                </button>
              )}
            </div>

            {cargando ? (
              <p className="bt-est-vacio">Cargando…</p>
            ) : postulaciones.length === 0 ? (
              <div className="bt-est-vacio">
                <FileText size={30} />
                <p>Todavía no te has postulado a ninguna vacante.</p>
                <button type="button" className="bt-dashboard-action" onClick={() => irA("vacantes")}>
                  <Search size={16} /> Explorar vacantes
                </button>
              </div>
            ) : (
              <ul className="bt-est-lista">
                {postulaciones.slice(0, 4).map((p) => {
                  const estado = ESTADOS_POSTULACION[p.estado] || ESTADOS_POSTULACION.enviada;
                  const Icono = estado.icono;
                  return (
                    <li key={p.id_postulacion}>
                      <div className="bt-est-lista-icono"><Building2 size={18} /></div>
                      <div className="bt-est-lista-texto">
                        <strong>{p.titulo}</strong>
                        <span>{p.nombre_empresa} · {tiempoRelativo(p.fecha_postulacion)}</span>
                      </div>
                      <span className={`bt-postulacion-estado ${estado.clase}`}>
                        <Icono size={14} /> {estado.nombre}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* AVANCE DEL PERFIL */}
          <section className="bt-dashboard-panel bt-est-panel">
            <div className="bt-est-panel-titulo">
              <h3><UserRound size={19} /> Tu perfil</h3>
            </div>

            {!avance ? (
              <p className="bt-est-vacio">{cargando ? "Cargando…" : "No se pudo cargar tu perfil."}</p>
            ) : (
              <>
                <div className="bt-est-avance">
                  <div
                    className="bt-est-anillo"
                    style={{ "--avance": `${avance.porcentaje * 3.6}deg` }}
                    role="img"
                    aria-label={`Perfil completo al ${avance.porcentaje} %`}
                  >
                    <span>{avance.porcentaje}%</span>
                  </div>
                  <p>
                    {avance.porcentaje === 100
                      ? "¡Tu perfil está completo! Las empresas verán toda tu información."
                      : "Un perfil completo aumenta tus posibilidades de que te llamen."}
                  </p>
                </div>

                {avance.porcentaje < 100 && (
                  <ul className="bt-est-pasos">
                    {avance.pasos.map((paso) => (
                      <li key={paso.id} className={paso.listo ? "listo" : ""}>
                        {paso.listo ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                        {paso.texto}
                      </li>
                    ))}
                  </ul>
                )}

                <button type="button" className="bt-est-enlace" onClick={() => irA("perfil")}>
                  {avance.porcentaje === 100 ? "Ver mi perfil" : "Completar mi perfil"}
                  <ArrowRight size={15} />
                </button>
              </>
            )}
          </section>
        </div>

        {/* VACANTES SUGERIDAS */}
        <section className="bt-dashboard-panel bt-est-panel">
          <div className="bt-est-panel-titulo">
            <h3><Sparkles size={19} /> Vacantes recientes para ti</h3>
            <button type="button" onClick={() => irA("vacantes")}>
              Ver todas <ArrowRight size={15} />
            </button>
          </div>

          {cargando ? (
            <p className="bt-est-vacio">Cargando…</p>
          ) : sugeridas.length === 0 ? (
            <p className="bt-est-vacio">
              {vacantes.length
                ? "Ya te postulaste a todas las vacantes disponibles. ¡Vuelve pronto!"
                : "Por ahora no hay vacantes publicadas."}
            </p>
          ) : (
            <div className="bt-est-sugeridas">
              {sugeridas.map((v) => (
                <button type="button" key={v.id_vacante} className="bt-est-sugerida" onClick={() => irA("vacantes")}>
                  <div className="bt-est-sugerida-top">
                    <span className="bt-est-lista-icono"><Building2 size={17} /></span>
                    {esReciente(v.fecha_publicacion) && <span className="bt-est-nueva">Nueva</span>}
                  </div>
                  <strong>{v.titulo}</strong>
                  <span>{v.nombre_empresa}</span>
                  <small>
                    <MapPin size={13} /> {v.ubicacion || MODALIDADES[v.modalidad] || "Sin ubicación"}
                  </small>
                  <div className="bt-est-etiquetas">
                    <em>{MODALIDADES[v.modalidad] || v.modalidad}</em>
                    <em>{TIPOS[v.tipo] || v.tipo}</em>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  };

  // ========================================
  // SECCIONES
  // ========================================

  const mostrarSeccion = (seccion, irA) => {
    switch (seccion) {
      case "dashboard":
        return renderDashboard(irA);
      case "perfil":
        return <PerfilEstudiante onActualizar={obtenerEstadisticas} />;
      case "vacantes":
        return <BuscarVacantes onActualizar={obtenerEstadisticas} onIr={irA} />;
      case "postulaciones":
        return <MisPostulaciones onActualizar={obtenerEstadisticas} onIr={irA} />;
      case "notificaciones":
        return <NotificacionesEstudiante onActualizar={obtenerEstadisticas} onIr={irA} />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout
      rol="estudiante"
      titulo="Portal del estudiante"
      descripcion="Gestiona tu futuro profesional"
      usuario={usuario}
      menu={menu}
    >
      {(seccion, irA) => mostrarSeccion(seccion, irA)}
    </DashboardLayout>
  );
}

export default EstudianteDashboard;
