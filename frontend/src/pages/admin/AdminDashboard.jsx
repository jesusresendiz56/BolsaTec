import { useEffect, useState } from "react";
import {
  Users,
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
import HabilidadesAdmin from "./HabilidadesAdmin";
import "./AdminModulos.css";

// ======================================
// MENÚ DEL ADMINISTRADOR
// ======================================

const menu = [
  { id: "dashboard", nombre: "Dashboard", icono: "dashboard" },
  { id: "usuarios", nombre: "Estudiantes", icono: "usuarios" },
  { id: "empresas", nombre: "Empresas", icono: "empresas" },
  { id: "vacantes", nombre: "Vacantes", icono: "vacantes" },
  { id: "postulaciones", nombre: "Postulaciones", icono: "postulaciones" },
  { id: "habilidades", nombre: "Habilidades", icono: "habilidades" },
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

function ResumenAdmin({ usuario }) {
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
    cargando ? "..." : error ? "—" : Number(resumen[clave]) || 0;

  const estadisticas = [
    { titulo: "Usuarios registrados", icono: Users, clave: "usuarios" },
    { titulo: "Estudiantes", icono: GraduationCap, clave: "estudiantes" },
    { titulo: "Empresas registradas", icono: Building2, clave: "empresas" },
    {
      titulo: "Empresas por verificar",
      icono: ShieldCheck,
      clave: "empresas_pendientes",
    },
    { titulo: "Vacantes", icono: BriefcaseBusiness, clave: "vacantes" },
    {
      titulo: "Vacantes activas",
      icono: BriefcaseBusiness,
      clave: "vacantes_activas",
    },
    { titulo: "Postulaciones", icono: FileText, clave: "postulaciones" },
  ];

  const totalPostulaciones = Number(resumen.postulaciones) || 0;

  return (
    <>
      <div className="bt-dashboard-welcome">
        <h2>Panel de administración de BolsaTec</h2>
        <p>
          Bienvenido, {usuario?.nombre || "administrador"}. Supervisa y
          administra la información general de la plataforma.
        </p>
      </div>

      <div className="bt-dashboard-stats">
        {estadisticas.map((item) => {
          const Icono = item.icono;
          return (
            <div className="bt-stat-card" key={item.clave}>
              <div className="bt-stat-icon">
                <Icono size={23} />
              </div>
              <p>{item.titulo}</p>
              <strong>{valor(item.clave)}</strong>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="bt-dashboard-panel">
          <p role="alert" style={{ color: "#DC2626" }}>
            Error al cargar estadísticas: {error}
          </p>
        </div>
      )}

      <div className="bt-dashboard-panel">
        <h3>Postulaciones por estado</h3>

        {cargando ? (
          <p>Cargando...</p>
        ) : totalPostulaciones === 0 ? (
          <p>Todavía no hay postulaciones registradas.</p>
        ) : (
          <div className="bt-adm-barras">
            {ESTADOS_POSTULACION.map((e) => {
              const cantidad = Number(resumen[e.clave]) || 0;
              return (
                <div className="bt-adm-barra" key={e.clave}>
                  <span>{e.nombre}</span>
                  <div className="bt-adm-barra-track">
                    <div
                      className="bt-adm-barra-fill"
                      style={{
                        width: `${(cantidad / totalPostulaciones) * 100}%`,
                      }}
                    />
                  </div>
                  <strong>{cantidad}</strong>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!cargando && !error && Number(resumen.empresas_pendientes) > 0 && (
        <div className="bt-dashboard-panel">
          <div className="bt-stat-icon">
            <ShieldCheck size={23} />
          </div>
          <h3>Empresas pendientes de verificación</h3>
          <p>
            Hay {resumen.empresas_pendientes}{" "}
            {Number(resumen.empresas_pendientes) === 1
              ? "empresa que espera"
              : "empresas que esperan"}{" "}
            revisión. Ve al módulo <strong>Empresas</strong> para revisar
            sus datos y verificarlas.
          </p>
        </div>
      )}
    </>
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
  habilidades: HabilidadesAdmin,
};

function AdminDashboard() {
  const usuario = sessionGet("administrador")?.usuario;

  const mostrarSeccion = (seccion) => {
    const Modulo = modulos[seccion];
    return Modulo ? <Modulo /> : <ResumenAdmin usuario={usuario} />;
  };

  return (
    <DashboardLayout
      rol="administrador"
      titulo="Panel de administración"
      descripcion="Control general de BolsaTec"
      usuario={usuario}
      menu={menu}
    >
      {mostrarSeccion}
    </DashboardLayout>
  );
}

export default AdminDashboard;
