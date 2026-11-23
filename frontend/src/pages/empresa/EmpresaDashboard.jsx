import { useCallback, useEffect, useState } from "react";

import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  FileText,
  Filter,
  PlusCircle,
  RefreshCw,
  UserRound,
  Users,
} from "lucide-react";

import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { sessionGet } from "../../services/session";
import { tiempoRelativo } from "../../services/fechas";
import { ESTADOS_POSTULACION } from "../../services/postulaciones";

import VacantesEmpresa from "./VacantesEmpresa";
import PerfilEmpresa from "./PerfilEmpresa";
import CandidatosEmpresa from "./CandidatosEmpresa";
import PostulacionesEmpresa from "./PostulacionesEmpresa";
import PruebasEmpresa from "./PruebasEmpresa";
import NotificacionesEstudiante from "../estudiante/NotificacionesEstudiante";

import "../estudiante/notificaciones.css";
import "../estudiante/MisPostulaciones.css";
import "../estudiante/EstudianteDashboard.css";
import "./EmpresaDashboard.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");

const pedir = async (ruta, token) => {
  const respuesta = await fetch(`${API_URL}/api/empresa${ruta}`, {
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

const ESTADOS_VACANTE = {
  activa: "Activa",
  pausada: "Pausada",
  cerrada: "Cerrada",
};

// Nombres de la empresa para los estados (la empresa ve "Rechazada")
const NOMBRE_ESTADO_EMPRESA = {
  enviada: "Nueva",
  vista: "Vista",
  entrevista: "Entrevista",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
};

function EmpresaDashboard() {
  const usuario = sessionGet("empresa")?.usuario;

  const [resumen, setResumen] = useState({
    vacantes: 0,
    candidatos: 0,
    postulaciones: 0,
    notificaciones: 0,
  });
  const [empresa, setEmpresa] = useState(null);
  const [vacantes, setVacantes] = useState([]);
  const [postulaciones, setPostulaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const obtenerEstadisticas = useCallback(async () => {
    try {
      setCargando(true);
      setError("");

      const token = sessionGet("empresa")?.token;
      if (!token) throw new Error("Debes iniciar sesión como empresa");

      const [datos, datosVacantes, datosPostulaciones] = await Promise.all([
        pedir("/estadisticas", token),
        pedir("/vacantes", token).catch(() => ({ vacantes: [] })),
        pedir("/postulaciones", token).catch(() => ({ postulaciones: [] })),
      ]);

      setResumen({
        vacantes: Number(datos.vacantes) || 0,
        candidatos: Number(datos.candidatos) || 0,
        postulaciones: Number(datos.postulaciones) || 0,
        notificaciones: Number(datos.notificaciones) || 0,
      });
      setEmpresa(datos.empresa);
      setVacantes(datosVacantes.vacantes || []);
      setPostulaciones(datosPostulaciones.postulaciones || []);
    } catch (err) {
      console.error("Error en dashboard empresarial:", err);
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

  const menu = [
    { id: "dashboard", nombre: "Dashboard", icono: "dashboard" },
    { id: "perfil", nombre: "Perfil empresarial", icono: "perfil" },
    { id: "vacantes", nombre: "Mis vacantes", icono: "vacantes" },
    { id: "candidatos", nombre: "Candidatos", icono: "usuarios" },
    { id: "postulaciones", nombre: "Postulaciones", icono: "postulaciones" },
    { id: "pruebas", nombre: "Pruebas", icono: "pruebas" },
    {
      id: "notificaciones",
      nombre: "Notificaciones",
      icono: "notificaciones",
      badge: resumen.notificaciones,
    },
  ];

  // ========================================
  // DASHBOARD
  // ========================================

  const renderDashboard = (irA) => {
    const nombreEmpresa = empresa?.nombre_empresa || usuario?.nombre || "Empresa";
    const nuevas = postulaciones.filter((p) => p.estado === "enviada");
    const recientes = (nuevas.length ? nuevas : postulaciones).slice(0, 5);

    const embudo = ["enviada", "vista", "entrevista", "aceptada", "rechazada"].map((id) => ({
      id,
      total: postulaciones.filter((p) => p.estado === id).length,
    }));
    const maximo = Math.max(1, ...embudo.map((e) => e.total));

    const vacantesOrdenadas = [...vacantes]
      .sort((a, b) => Number(b.total_postulaciones || 0) - Number(a.total_postulaciones || 0))
      .slice(0, 5);

    const tarjetas = [
      { titulo: "Vacantes publicadas", icono: BriefcaseBusiness, valor: resumen.vacantes, destino: "vacantes" },
      { titulo: "Candidatos", icono: Users, valor: resumen.candidatos, destino: "candidatos" },
      { titulo: "Postulaciones", icono: FileText, valor: resumen.postulaciones, destino: "postulaciones" },
      { titulo: "Notificaciones sin leer", icono: Bell, valor: resumen.notificaciones, destino: "notificaciones" },
    ];

    return (
      <div className="bt-est-inicio">
        <section className="bt-dashboard-welcome bt-est-bienvenida">
          <div>
            <h2>{saludo()}, {nombreEmpresa}</h2>
            <p>
              {nuevas.length > 0
                ? `Tienes ${nuevas.length} postulación${nuevas.length === 1 ? "" : "es"} nueva${nuevas.length === 1 ? "" : "s"} por revisar.`
                : "Publica vacantes y encuentra talento universitario."}
            </p>
          </div>

          <button type="button" className="bt-est-bienvenida-btn" onClick={() => irA("vacantes")}>
            <PlusCircle size={18} />
            Publicar vacante
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

        <div className="bt-dashboard-stats">
          {tarjetas.map((item) => {
            const Icono = item.icono;
            return (
              <button type="button" className="bt-stat-card bt-est-stat" key={item.titulo} onClick={() => irA(item.destino)}>
                <div className="bt-stat-icon"><Icono size={23} /></div>
                <p>{item.titulo}</p>
                <strong>{cargando ? "…" : error ? "—" : item.valor}</strong>
                <ArrowRight size={16} className="bt-est-stat-flecha" aria-hidden="true" />
              </button>
            );
          })}
        </div>

        <div className="bt-est-columnas">
          {/* POSTULACIONES POR REVISAR */}
          <section className="bt-dashboard-panel bt-est-panel">
            <div className="bt-est-panel-titulo">
              <h3>
                <FileText size={19} />
                {nuevas.length ? "Postulaciones por revisar" : "Postulaciones recientes"}
              </h3>
              {postulaciones.length > 0 && (
                <button type="button" onClick={() => irA("postulaciones")}>
                  Ver todas <ArrowRight size={15} />
                </button>
              )}
            </div>

            {cargando ? (
              <p className="bt-est-vacio">Cargando…</p>
            ) : recientes.length === 0 ? (
              <div className="bt-est-vacio">
                <FileText size={30} />
                <p>Aún no recibes postulaciones. Publica una vacante para empezar.</p>
                <button type="button" className="bt-dashboard-action" onClick={() => irA("vacantes")}>
                  <PlusCircle size={16} /> Publicar vacante
                </button>
              </div>
            ) : (
              <ul className="bt-est-lista">
                {recientes.map((p) => {
                  const estado = ESTADOS_POSTULACION[p.estado] || ESTADOS_POSTULACION.enviada;
                  const Icono = estado.icono;
                  return (
                    <li key={p.id_postulacion}>
                      <div className="bt-est-lista-icono"><UserRound size={18} /></div>
                      <div className="bt-est-lista-texto">
                        <strong>{p.nombre_estudiante}</strong>
                        <span>{p.titulo_vacante} · {tiempoRelativo(p.fecha_postulacion)}</span>
                      </div>
                      <span className={`bt-postulacion-estado ${estado.clase}`}>
                        <Icono size={14} /> {NOMBRE_ESTADO_EMPRESA[p.estado] || estado.nombre}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* EMBUDO DE SELECCIÓN */}
          <section className="bt-dashboard-panel bt-est-panel">
            <div className="bt-est-panel-titulo">
              <h3><Filter size={19} /> Proceso de selección</h3>
            </div>

            {postulaciones.length === 0 ? (
              <p className="bt-est-vacio">{cargando ? "Cargando…" : "Sin postulaciones todavía."}</p>
            ) : (
              <ul className="bt-emp-embudo">
                {embudo.map((e) => {
                  const estado = ESTADOS_POSTULACION[e.id];
                  return (
                    <li key={e.id}>
                      <span className="bt-emp-embudo-nombre">{NOMBRE_ESTADO_EMPRESA[e.id]}</span>
                      <span className="bt-emp-embudo-barra">
                        <span className={`relleno ${estado.clase}`} style={{ width: `${(e.total / maximo) * 100}%` }} />
                      </span>
                      <strong>{e.total}</strong>
                    </li>
                  );
                })}
              </ul>
            )}

            <button type="button" className="bt-est-enlace" onClick={() => irA("candidatos")}>
              Ver candidatos <ArrowRight size={15} />
            </button>
          </section>
        </div>

        {/* VACANTES */}
        <section className="bt-dashboard-panel bt-est-panel">
          <div className="bt-est-panel-titulo">
            <h3><BriefcaseBusiness size={19} /> Tus vacantes</h3>
            <button type="button" onClick={() => irA("vacantes")}>
              Gestionar <ArrowRight size={15} />
            </button>
          </div>

          {cargando ? (
            <p className="bt-est-vacio">Cargando…</p>
          ) : vacantesOrdenadas.length === 0 ? (
            <div className="bt-est-vacio">
              <BriefcaseBusiness size={30} />
              <p>Todavía no publicas vacantes.</p>
            </div>
          ) : (
            <ul className="bt-est-lista">
              {vacantesOrdenadas.map((v) => (
                <li key={v.id_vacante}>
                  <div className="bt-est-lista-icono"><BriefcaseBusiness size={18} /></div>
                  <div className="bt-est-lista-texto">
                    <strong>{v.titulo}</strong>
                    <span>{v.ubicacion || "Sin ubicación"} · publicada {tiempoRelativo(v.fecha_publicacion)}</span>
                  </div>
                  <span className={`bt-emp-vacante-estado ${v.estado}`}>{ESTADOS_VACANTE[v.estado] || v.estado}</span>
                  <span className="bt-emp-vacante-total" title="Postulaciones">
                    <Users size={14} /> {Number(v.total_postulaciones) || 0}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  };

  const mostrarSeccion = (seccion, irA) => {
    switch (seccion) {
      case "dashboard":
        return renderDashboard(irA);
      case "perfil":
        return <PerfilEmpresa onActualizar={obtenerEstadisticas} />;
      case "vacantes":
        return <VacantesEmpresa onActualizar={obtenerEstadisticas} onIr={irA} />;
      case "candidatos":
        return <CandidatosEmpresa onActualizar={obtenerEstadisticas} />;
      case "postulaciones":
        return <PostulacionesEmpresa onActualizar={obtenerEstadisticas} />;
      case "pruebas":
        return <PruebasEmpresa onIr={irA} />;
      case "notificaciones":
        return <NotificacionesEstudiante rol="empresa" onActualizar={obtenerEstadisticas} onIr={irA} />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout
      rol="empresa"
      titulo="Portal empresarial"
      descripcion="Gestiona tus vacantes y candidatos"
      usuario={usuario}
      menu={menu}
    >
      {(seccion, irA) => mostrarSeccion(seccion, irA)}
    </DashboardLayout>
  );
}

export default EmpresaDashboard;
