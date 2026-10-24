
import { useState } from "react";
import {
  BriefcaseBusiness,
  FileText,
  UserRound,
  Bell,
  Search,
  GraduationCap,
  ArrowRight,
} from "lucide-react";

import DashboardLayout from "../../components/dashboard/DashboardLayout";

const menu = [
  { id: "dashboard", nombre: "Dashboard", icono: "dashboard" },
  { id: "perfil", nombre: "Mi perfil", icono: "perfil" },
  { id: "vacantes", nombre: "Buscar vacantes", icono: "vacantes" },
  { id: "postulaciones", nombre: "Mis postulaciones", icono: "postulaciones" },
  { id: "notificaciones", nombre: "Notificaciones", icono: "notificaciones" },
];

const titulos = {
  dashboard: "Dashboard del estudiante",
  perfil: "Mi perfil profesional",
  vacantes: "Buscar vacantes",
  postulaciones: "Mis postulaciones",
  notificaciones: "Notificaciones",
};

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

function EstudianteDashboard() {
  const usuario = obtenerUsuario();
  const [busqueda, setBusqueda] = useState("");

  const estadisticas = [
    { titulo: "Postulaciones", icono: FileText },
    { titulo: "Vacantes disponibles", icono: BriefcaseBusiness },
    { titulo: "Notificaciones", icono: Bell },
    { titulo: "Mi perfil", icono: UserRound },
  ];

  const mostrarSeccion = (seccion) => {
    if (seccion === "dashboard") {
      return (
        <>
          <div className="bt-dashboard-welcome">
            <h2>¡Bienvenido, {usuario?.nombre || "estudiante"}!</h2>
            <p>
              Encuentra oportunidades profesionales, desarrolla
              tu perfil y da seguimiento a tus postulaciones.
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
            <h3>Comienza tu experiencia profesional</h3>
            <p>
              Desde BolsaTec podrás completar tu perfil,
              cargar tu currículum, buscar oportunidades
              y consultar el estado de tus postulaciones.
            </p>
            <p>
              Las estadísticas se mostrarán cuando conectemos
              estos módulos con Supabase.
            </p>
          </div>

          <div className="bt-dashboard-panel">
            <h3>Tu cuenta</h3>
            <p><strong>Nombre:</strong> {usuario?.nombre}</p>
            <p><strong>Correo:</strong> {usuario?.correo}</p>
            <p><strong>Rol:</strong> Estudiante</p>
          </div>
        </>
      );
    }

    if (seccion === "perfil") {
      return (
        <div className="bt-dashboard-panel">
          <div className="bt-stat-icon">
            <GraduationCap size={24} />
          </div>
          <h3>Mi perfil profesional</h3>
          <p>
            Aquí podrás administrar tu información personal,
            carrera, semestre, experiencia, habilidades
            y currículum.
          </p>
          <p>
            <strong>Usuario:</strong> {usuario?.nombre}
          </p>
          <p>
            <strong>Correo:</strong> {usuario?.correo}
          </p>
          <p>
            El formulario para editar el perfil se
            desarrollará en el siguiente módulo.
          </p>
        </div>
      );
    }

    if (seccion === "vacantes") {
      return (
        <div className="bt-dashboard-panel">
          <h3>Explorar oportunidades</h3>
          <p>
            Busca vacantes de empleo, prácticas profesionales
            y estadías.
          </p>

          <form
            className="bt-dashboard-actions"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por puesto o carrera"
              aria-label="Buscar vacantes"
              style={{
                flex: 1,
                minWidth: 200,
                padding: 12,
                border: "1px solid #CBD5E1",
                borderRadius: 9,
              }}
            />
            <button
              className="bt-dashboard-action"
              type="submit"
              disabled
              title="Disponible cuando conectemos el módulo de vacantes"
            >
              <Search size={18} />
              Buscar
            </button>
          </form>

          <p>
            Próximamente aparecerán aquí las vacantes
            registradas por las empresas.
          </p>
        </div>
      );
    }

    if (seccion === "postulaciones") {
      return (
        <div className="bt-dashboard-panel">
          <h3>Seguimiento de postulaciones</h3>
          <p>
            Aquí podrás consultar las vacantes a las que
            te postulaste y su estado:
          </p>
          <p>
            Pendiente, en revisión, entrevista,
            seleccionado o rechazado.
          </p>
          <p>
            Esta sección se conectará con la tabla
            de postulaciones de Supabase.
          </p>
        </div>
      );
    }

    if (seccion === "notificaciones") {
      return (
        <div className="bt-dashboard-panel">
          <h3>Mis notificaciones</h3>
          <p>
            Recibirás avisos sobre tus postulaciones
            y novedades importantes de BolsaTec.
          </p>
          <p>
            La consulta de notificaciones todavía
            está pendiente de implementar.
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <DashboardLayout
      rol="estudiante"
      titulo="Portal del estudiante"
      descripcion="Gestiona tu futuro profesional"
      usuario={usuario}
      menu={menu}
    >
      {(seccion) => (
        <>
          {seccion !== "dashboard" && (
            <div className="bt-dashboard-panel">
              <h3>{titulos[seccion]}</h3>
              <p>
                Administra esta sección desde tu cuenta
                de estudiante.
              </p>
            </div>
          )}
          {mostrarSeccion(seccion)}
        </>
      )}
    </DashboardLayout>
  );
}

export default EstudianteDashboard;
