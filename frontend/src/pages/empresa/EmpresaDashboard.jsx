
import {
  Building2,
  BriefcaseBusiness,
  Users,
  FileText,
  Bell,
  PlusCircle,
} from "lucide-react";

import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { sessionGet } from "../../services/session";

const menu = [
  { id: "dashboard", nombre: "Dashboard", icono: "dashboard" },
  { id: "perfil", nombre: "Perfil empresarial", icono: "perfil" },
  { id: "vacantes", nombre: "Mis vacantes", icono: "vacantes" },
  { id: "candidatos", nombre: "Candidatos", icono: "usuarios" },
  { id: "postulaciones", nombre: "Postulaciones", icono: "postulaciones" },
  { id: "notificaciones", nombre: "Notificaciones", icono: "notificaciones" },
];

function obtenerUsuario() {
  try {
    return JSON.parse(
      localStorage.getItem("usuario") ||
      sessionStorage.getItem("usuario") ||
      "null"
    );
  } catch {
    return null;
  }
}

function EmpresaDashboard() {
  const usuario = sessionGet("empresa")?.usuario;

  const estadisticas = [
    { titulo: "Vacantes publicadas", icono: BriefcaseBusiness },
    { titulo: "Candidatos", icono: Users },
    { titulo: "Postulaciones", icono: FileText },
    { titulo: "Notificaciones", icono: Bell },
  ];

  const secciones = {
    perfil: {
      titulo: "Perfil empresarial",
      descripcion:
        "Administra el nombre de tu empresa, sector, ubicación, descripción y datos de contacto.",
    },
    vacantes: {
      titulo: "Mis vacantes",
      descripcion:
        "Aquí podrás crear, editar, pausar y cerrar las vacantes de tu empresa.",
    },
    candidatos: {
      titulo: "Gestión de candidatos",
      descripcion:
        "Consulta los estudiantes que se postulen a tus vacantes y revisa sus perfiles profesionales.",
    },
    postulaciones: {
      titulo: "Postulaciones recibidas",
      descripcion:
        "Administra las solicitudes de los estudiantes y actualiza el estado de cada postulación.",
    },
    notificaciones: {
      titulo: "Notificaciones",
      descripcion:
        "Consulta los avisos relacionados con tus vacantes y postulaciones.",
    },
  };

  const mostrarSeccion = (seccion) => {
    if (seccion === "dashboard") {
      return (
        <>
          <div className="bt-dashboard-welcome">
            <h2>¡Bienvenido a BolsaTec!</h2>
            <p>
              {usuario?.nombre}, administra tus oportunidades
              laborales y conecta con talento universitario.
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
            <h3>Panel empresarial</h3>
            <p>
              Desde aquí podrás administrar las vacantes
              de tu empresa, revisar candidatos y dar
              seguimiento a las postulaciones recibidas.
            </p>
            <p>
              Los indicadores mostrarán valores reales
              cuando conectemos las consultas a Supabase.
            </p>
          </div>

          <div className="bt-dashboard-panel">
            <h3>Información de tu cuenta</h3>
            <p><strong>Representante:</strong> {usuario?.nombre}</p>
            <p><strong>Correo:</strong> {usuario?.correo}</p>
            <p><strong>Rol:</strong> Empresa</p>
          </div>
        </>
      );
    }

    const datos = secciones[seccion];

    if (!datos) return null;

    return (
      <div className="bt-dashboard-panel">
        <div className="bt-stat-icon">
          {seccion === "perfil" ? (
            <Building2 size={23} />
          ) : seccion === "vacantes" ? (
            <BriefcaseBusiness size={23} />
          ) : (
            <Users size={23} />
          )}
        </div>

        <h3>{datos.titulo}</h3>
        <p>{datos.descripcion}</p>

        {seccion === "vacantes" && (
          <div className="bt-dashboard-actions">
            <button
              type="button"
              className="bt-dashboard-action"
              disabled
              title="Se habilitará al implementar la publicación de vacantes"
            >
              <PlusCircle size={18} />
              Nueva vacante
            </button>
          </div>
        )}

        <p>
          La gestión de esta sección se implementará
          con los endpoints correspondientes del backend.
        </p>
      </div>
    );
  };

  return (
    <DashboardLayout
      rol="empresa"
      titulo="Portal empresarial"
      descripcion="Gestiona tus vacantes y candidatos"
      usuario={usuario}
      menu={menu}
    >
      {mostrarSeccion}
    </DashboardLayout>
  );
}

export default EmpresaDashboard;
