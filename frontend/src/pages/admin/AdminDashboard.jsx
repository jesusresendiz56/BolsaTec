
import {
  Users,
  Building2,
  BriefcaseBusiness,
  FileText,
  ShieldCheck,
  Tags,
} from "lucide-react";

import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { sessionGet } from "../../services/session";

const menu = [
  { id: "dashboard", nombre: "Dashboard", icono: "dashboard" },
  { id: "usuarios", nombre: "Usuarios", icono: "usuarios" },
  { id: "empresas", nombre: "Empresas", icono: "empresas" },
  { id: "vacantes", nombre: "Vacantes", icono: "vacantes" },
  { id: "postulaciones", nombre: "Postulaciones", icono: "postulaciones" },
  { id: "habilidades", nombre: "Habilidades", icono: "habilidades" },
];

function obtenerAdministrador() {
  try {
    return JSON.parse(
      sessionStorage.getItem("admin_usuario") || "null"
    );
  } catch {
    return null;
  }
}

function AdminDashboard() {
  const usuario = sessionGet("administrador")?.usuario;

  const estadisticas = [
    { titulo: "Usuarios registrados", icono: Users },
    { titulo: "Empresas registradas", icono: Building2 },
    { titulo: "Vacantes", icono: BriefcaseBusiness },
    { titulo: "Postulaciones", icono: FileText },
  ];

  const secciones = {
    usuarios: {
      titulo: "Administración de usuarios",
      descripcion:
        "Consulta los estudiantes, empresas y administradores registrados. Aquí podrás activar o desactivar cuentas.",
    },
    empresas: {
      titulo: "Verificación de empresas",
      descripcion:
        "Consulta los perfiles empresariales registrados y revisa cuáles están pendientes de verificación.",
    },
    vacantes: {
      titulo: "Supervisión de vacantes",
      descripcion:
        "Consulta las vacantes publicadas y supervisa su estado y contenido.",
    },
    postulaciones: {
      titulo: "Administración de postulaciones",
      descripcion:
        "Consulta las postulaciones realizadas por los estudiantes y su estado actual.",
    },
    habilidades: {
      titulo: "Catálogo de habilidades",
      descripcion:
        "Administra las habilidades utilizadas para los perfiles de estudiantes y los requisitos de las vacantes.",
    },
  };

  const mostrarSeccion = (seccion) => {
    if (seccion === "dashboard") {
      return (
        <>
          <div className="bt-dashboard-welcome">
            <h2>Panel de administración de BolsaTec</h2>
            <p>
              Bienvenido, {usuario?.nombre || "administrador"}.
              Supervisa y administra la información
              general de la plataforma.
            </p>
          </div>

          <div className="bt-dashboard-stats">
            {estadisticas.map((item) => {
              const Icono = item.icono;

              return (
                <div className="bt-stat-card" key={item.titulo}>
                  <div className="bt-stat-icon">
                    <Icono size={23} />
                  </div>
                  <p>{item.titulo}</p>
                  <strong>—</strong>
                </div>
              );
            })}
          </div>

          <div className="bt-dashboard-panel">
            <h3>Administración general</h3>
            <p>
              Gestiona las cuentas de usuarios, revisa
              empresas registradas, supervisa vacantes
              y consulta las postulaciones.
            </p>
            <p>
              Las estadísticas reales estarán disponibles
              cuando implementemos los endpoints
              administrativos en Express.
            </p>
          </div>

          <div className="bt-dashboard-panel">
            <div className="bt-stat-icon">
              <ShieldCheck size={23} />
            </div>
            <h3>Verificación de empresas</h3>
            <p>
              Las nuevas empresas se registran inicialmente
              como no verificadas. Desde este módulo
              podremos revisar sus datos antes de
              habilitar las funciones que requieran verificación.
            </p>
          </div>
        </>
      );
    }

    const datos = secciones[seccion];

    if (!datos) return null;

    return (
      <div className="bt-dashboard-panel">
        <div className="bt-stat-icon">
          {seccion === "usuarios" ? (
            <Users size={23} />
          ) : seccion === "empresas" ? (
            <Building2 size={23} />
          ) : seccion === "vacantes" ? (
            <BriefcaseBusiness size={23} />
          ) : seccion === "habilidades" ? (
            <Tags size={23} />
          ) : (
            <FileText size={23} />
          )}
        </div>

        <h3>{datos.titulo}</h3>
        <p>{datos.descripcion}</p>

        <p>
          Las consultas y operaciones administrativas
          se habilitarán cuando conectemos este módulo
          con el backend y Supabase.
        </p>
      </div>
    );
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
