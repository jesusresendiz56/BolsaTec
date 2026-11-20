import { useEffect, useState } from "react";
import {
  ArrowRight,
  GraduationCap,
  Building2,
  BriefcaseBusiness,
  FileText,
  ShieldCheck,
} from "lucide-react";

import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { sessionGet } from "../../services/session";
import { useSolicitudAdmin } from "./useSolicitudAdmin";
import EstudiantesAdmin from "./EstudiantesAdmin";
import EmpresasAdmin from "./EmpresasAdmin";
import VacantesAdmin from "./VacantesAdmin";
import PostulacionesAdmin from "./PostulacionesAdmin";
import "./AdminModulos.css";
import "../estudiante/EstudianteDashboard.css";

// ======================================
// MENÚ DEL ADMINISTRADOR
// ======================================

const menu = [
  { id: "dashboard", nombre: "Dashboard", icono: "dashboard" },
  { id: "usuarios", nombre: "Estudiantes", icono: "usuarios" },
  { id: "empresas", nombre: "Empresas", icono: "empresas" },
  { id: "vacantes", nombre: "Vacantes", icono: "vacantes" },
  { id: "postulaciones", nombre: "Postulaciones", icono: "postulaciones" },
];

const ESTADOS_POSTULACION = [
  { clave: "postulaciones_enviada", nombre: "Enviadas" },
  { clave: "postulaciones_vista", nombre: "Vistas" },
  { clave: "postulaciones_entrevista", nombre: "Entrevista" },
  { clave: "postulaciones_aceptada", nombre: "Aceptadas" },
  { clave: "postulaciones_rechazada", nombre: "Rechazadas" },
];

// ======================================
// RESUMEN PRINCIPAL
// ======================================

function ResumenAdmin({ usuario, irA }) {
  const solicitar = useSolicitudAdmin();

  const [resumen, setResumen] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;

    solicitar("/estadisticas")
      .then((datos) => activo && setResumen(datos))
      .catch((err) => activo && setError(err.message))
      .finally(() => activo && setCargando(false));

    return () => {
      activo = false;
    };
  }, [solicitar]);

  const valor = (clave) =>
    cargando ? "…" : error ? "—" : Number(resumen[clave]) || 0;

  const numero = (clave) => Number(resumen[clave]) || 0;
  const pendientes = numero("empresas_pendientes");

  const estadisticas = [
    {
      titulo: "Estudiantes",
      icono: GraduationCap,
      clave: "estudiantes",
      destino: "usuarios",
      detalle: `${valor("usuarios")} usuarios en total`,
    },
    {
      titulo: "Empresas",
      icono: Building2,
      clave: "empresas",
      destino: "empresas",
      detalle: pendientes ? `${pendientes} por verificar` : "Todas verificadas",
      alerta: pendientes > 0,
    },
    {
      titulo: "Vacantes",
      icono: BriefcaseBusiness,
      clave: "vacantes",
      destino: "vacantes",
      detalle: `${valor("vacantes_activas")} activas`,
    },
    {
      titulo: "Postulaciones",
      icono: FileText,
      clave: "postulaciones",
      destino: "postulaciones",
      detalle: `${numero("postulaciones_enviada")} sin revisar`,
    },
  ];

  const totalPostulaciones = numero("postulaciones");

  return (
    <div className="bt-est-inicio">
      <div className="bt-dashboard-welcome">
        <h2>Panel de administración</h2>
        <p>
          Bienvenido, {usuario?.nombre || "administrador"}. Supervisa
          estudiantes, empresas, vacantes y postulaciones de BolsaTec.
        </p>
      </div>

      {error && (
        <div className="bt-est-error" role="alert">
          <span>Error al cargar estadísticas: {error}</span>
        </div>
      )}

      <div className="bt-dashboard-stats">
        {estadisticas.map((item) => {
          const Icono = item.icono;
          return (
            <button
              type="button"
              className="bt-stat-card bt-est-stat"
              key={item.clave}
              onClick={() => irA(item.destino)}
            >
              <div className="bt-stat-icon">
                <Icono size={23} />
              </div>
              <p>{item.titulo}</p>
              <strong>{valor(item.clave)}</strong>
              {!cargando && !error && (
                <small className={`bt-adm-stat-detalle ${item.alerta ? "alerta" : ""}`}>
                  {item.detalle}
                </small>
              )}
              <ArrowRight size={16} className="bt-est-stat-flecha" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      {!cargando && !error && pendientes > 0 && (
        <div className="bt-dashboard-panel bt-est-panel bt-adm-pendientes">
          <div className="bt-stat-icon">
            <ShieldCheck size={23} />
          </div>
          <div>
            <h3>Empresas pendientes de verificación</h3>
            <p>
              {pendientes === 1
                ? "Hay 1 empresa que espera revisión."
                : `Hay ${pendientes} empresas que esperan revisión.`}{" "}
              Revisa sus datos antes de verificarlas.
            </p>
          </div>
          <button
            type="button"
            className="bt-dashboard-action"
            onClick={() => irA("empresas", "pendientes")}
          >
            Revisar empresas <ArrowRight size={16} />
          </button>
        </div>
      )}

      <div className="bt-dashboard-panel bt-est-panel">
        <div className="bt-est-panel-titulo">
          <h3><FileText size={19} /> Postulaciones por estado</h3>
          <button type="button" onClick={() => irA("postulaciones")}>
            Ver todas <ArrowRight size={15} />
          </button>
        </div>

        {cargando ? (
          <p>Cargando…</p>
        ) : totalPostulaciones === 0 ? (
          <p>Todavía no hay postulaciones registradas.</p>
        ) : (
          <div className="bt-adm-barras">
            {ESTADOS_POSTULACION.map((e) => {
              const cantidad = numero(e.clave);
              return (
                <div className="bt-adm-barra" key={e.clave}>
                  <span>{e.nombre}</span>
                  <div className="bt-adm-barra-track">
                    <div
                      className={`bt-adm-barra-fill ${e.clave.replace("postulaciones_", "")}`}
                      style={{ width: `${(cantidad / totalPostulaciones) * 100}%` }}
                    />
                  </div>
                  <strong>{cantidad}</strong>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ======================================
// COMPONENTE PRINCIPAL
// ======================================

const modulos = {
  usuarios: EstudiantesAdmin,
  empresas: EmpresasAdmin,
  vacantes: VacantesAdmin,
  postulaciones: PostulacionesAdmin,
};

function AdminDashboard() {
  const usuario = sessionGet("administrador")?.usuario;

  // Filtro con el que se abre "Empresas" (p. ej. desde el aviso de pendientes)
  const [filtroEmpresas, setFiltroEmpresas] = useState("todas");

  const mostrarSeccion = (seccion, irA) => {
    const ir = (destino, filtro = "todas") => {
      if (destino === "empresas") setFiltroEmpresas(filtro);
      irA(destino);
    };

    if (seccion === "empresas") {
      return <EmpresasAdmin key={filtroEmpresas} filtroInicial={filtroEmpresas} />;
    }

    const Modulo = modulos[seccion];
    return Modulo ? <Modulo /> : <ResumenAdmin usuario={usuario} irA={ir} />;
  };

  return (
    <DashboardLayout
      rol="administrador"
      titulo="Panel de administración"
      descripcion="Control general de BolsaTec"
      usuario={usuario}
      menu={menu}
    >
      {(seccion, irA) => mostrarSeccion(seccion, irA)}
    </DashboardLayout>
  );
}

export default AdminDashboard;
