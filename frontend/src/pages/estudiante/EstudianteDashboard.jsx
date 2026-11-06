
import { useEffect, useState } from "react";

import {
  BriefcaseBusiness,
  FileText,
  Bell,
  CalendarCheck,
  RefreshCw,
} from "lucide-react";

import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { sessionGet } from "../../services/session";

import PerfilEstudiante from "./PerfilEstudiante";
import BuscarVacantes from "./BuscarVacantes";
import MisPostulaciones from "./MisPostulaciones";

const menu = [
  { id: "dashboard", nombre: "Dashboard", icono: "dashboard" },
  { id: "perfil", nombre: "Mi perfil", icono: "perfil" },
  { id: "vacantes", nombre: "Buscar vacantes", icono: "vacantes" },
  {
    id: "postulaciones",
    nombre: "Mis postulaciones",
    icono: "postulaciones",
  },
  {
    id: "notificaciones",
    nombre: "Notificaciones",
    icono: "notificaciones",
  },
];

const titulos = {
  dashboard: "Dashboard del estudiante",
  perfil: "Mi perfil profesional",
  vacantes: "Buscar vacantes",
  postulaciones: "Mis postulaciones",
  notificaciones: "Notificaciones",
};

function EstudianteDashboard() {
  const usuario = sessionGet("estudiante")?.usuario;

  const [resumen, setResumen] = useState({
    postulaciones: 0,
    vacantes: 0,
    entrevistas: 0,
    notificaciones: 0,
  });

  const [estudiante, setEstudiante] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // ========================================
  // CONSULTAR ESTADÍSTICAS REALES
  // ========================================

  const obtenerEstadisticas = async () => {
    try {
      setCargando(true);
      setError("");

      const sesion = sessionGet("estudiante");

      if (!sesion?.token) {
        throw new Error(
          "Debes iniciar sesión como estudiante"
        );
      }

      const API_URL = (
        import.meta.env.VITE_API_URL ||
        "http://localhost:3000"
      ).replace(/\/$/, "");

      const respuesta = await fetch(
        `${API_URL}/api/estudiante/estadisticas`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${sesion.token}`,
          },
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            "No se pudieron obtener las estadísticas"
        );
      }

      setResumen({
        postulaciones: Number(datos.postulaciones) || 0,
        vacantes: Number(datos.vacantes) || 0,
        entrevistas: Number(datos.entrevistas) || 0,
        notificaciones: Number(datos.notificaciones) || 0,
      });

      setEstudiante(datos.estudiante);
    } catch (err) {
      console.error(
        "Error en dashboard del estudiante:",
        err
      );

      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerEstadisticas();
  }, []);

  // ========================================
  // TARJETAS DEL DASHBOARD
  // ========================================

  const estadisticas = [
    {
      titulo: "Mis postulaciones",
      icono: FileText,
      valor: resumen.postulaciones,
    },
    {
      titulo: "Vacantes disponibles",
      icono: BriefcaseBusiness,
      valor: resumen.vacantes,
    },
    {
      titulo: "Entrevistas",
      icono: CalendarCheck,
      valor: resumen.entrevistas,
    },
    {
      titulo: "Notificaciones",
      icono: Bell,
      valor: resumen.notificaciones,
    },
  ];

  // ========================================
  // SECCIONES
  // ========================================

  const mostrarSeccion = (seccion) => {
    if (seccion === "dashboard") {
      return (
        <>
          <div className="bt-dashboard-welcome">
            <h2>
              ¡Bienvenido,{" "}
              {usuario?.nombre || "estudiante"}!
            </h2>

            <p>
              Encuentra oportunidades profesionales,
              desarrolla tu perfil y da seguimiento
              a tus postulaciones.
            </p>
          </div>

          <div className="bt-dashboard-stats">
            {estadisticas.map((item) => {
              const Icono = item.icono;

              return (
                <div
                  className="bt-stat-card"
                  key={item.titulo}
                >
                  <div className="bt-stat-icon">
                    <Icono size={23} />
                  </div>

                  <p>{item.titulo}</p>

                  <strong>
                    {cargando
                      ? "..."
                      : error
                        ? "—"
                        : item.valor}
                  </strong>
                </div>
              );
            })}
          </div>

          {error && (
            <div className="bt-dashboard-panel">
              <p style={{ color: "#DC2626" }}>
                {error}
              </p>
            </div>
          )}

          <div className="bt-dashboard-panel">
            <h3>Comienza tu experiencia profesional</h3>

            <p>
              Completa tu perfil, busca vacantes,
              postúlate y consulta el estado
              de tus solicitudes.
            </p>

            <div className="bt-dashboard-actions">
              <button
                type="button"
                className="bt-dashboard-action"
                onClick={obtenerEstadisticas}
                disabled={cargando}
              >
                <RefreshCw size={18} />
                {cargando
                  ? "Actualizando..."
                  : "Actualizar"}
              </button>
            </div>
          </div>

          <div className="bt-dashboard-panel">
            <h3>Tu cuenta</h3>

            <p>
              <strong>Nombre:</strong>{" "}
              {usuario?.nombre || "Sin información"}
            </p>

            <p>
              <strong>Correo:</strong>{" "}
              {usuario?.correo || "Sin información"}
            </p>

            <p>
              <strong>Carrera:</strong>{" "}
              {estudiante?.carrera || "Sin registrar"}
            </p>

            <p>
              <strong>Semestre:</strong>{" "}
              {estudiante?.semestre ??
                "Sin registrar"}
            </p>

            <p>
              <strong>Rol:</strong> Estudiante
            </p>
          </div>
        </>
      );
    }

    if (seccion === "perfil") {
      return (
        <PerfilEstudiante
          onActualizar={obtenerEstadisticas}
        />
      );
    }

    if (seccion === "vacantes") {
      return <BuscarVacantes />;
    }

    if (seccion === "postulaciones") {
      return <MisPostulaciones />;
    }

    if (seccion === "notificaciones") {
      return (
        <div className="bt-dashboard-panel">
          <h3>Mis notificaciones</h3>

          <p>
            Consulta avisos relacionados con tus
            postulaciones y novedades de BolsaTec.
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
