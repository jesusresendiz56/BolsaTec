
import { useEffect, useState } from "react";

import {
  BriefcaseBusiness,
  Users,
  FileText,
  Bell,
  RefreshCw,
} from "lucide-react";

import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { sessionGet } from "../../services/session";

import VacantesEmpresa from "./VacantesEmpresa";
import PerfilEmpresa from "./PerfilEmpresa";
import CandidatosEmpresa from "./CandidatosEmpresa";
import PostulacionesEmpresa from "./PostulacionesEmpresa";
import NotificacionesEstudiante from "../estudiante/NotificacionesEstudiante";
import "../estudiante/notificaciones.css";

const menu = [
  { id: "dashboard", nombre: "Dashboard", icono: "dashboard" },
  { id: "perfil", nombre: "Perfil empresarial", icono: "perfil" },
  { id: "vacantes", nombre: "Mis vacantes", icono: "vacantes" },
  { id: "candidatos", nombre: "Candidatos", icono: "usuarios" },
  { id: "postulaciones", nombre: "Postulaciones", icono: "postulaciones" },
  { id: "notificaciones", nombre: "Notificaciones", icono: "notificaciones" },
];

function EmpresaDashboard() {
  const usuario = sessionGet("empresa")?.usuario;

  const [resumen, setResumen] = useState({
    vacantes: 0,
    candidatos: 0,
    postulaciones: 0,
    notificaciones: 0,
  });

  const [empresa, setEmpresa] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const obtenerEstadisticas = async () => {
    try {
      setCargando(true);
      setError("");

      const sesion = sessionGet("empresa");

      if (!sesion?.token) {
        throw new Error("Debes iniciar sesión como empresa");
      }

      const API_URL = (
        import.meta.env.VITE_API_URL ||
        "http://localhost:3000"
      ).replace(/\/$/, "");

      const respuesta = await fetch(
        `${API_URL}/api/empresa/estadisticas`,
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
        vacantes: Number(datos.vacantes) || 0,
        candidatos: Number(datos.candidatos) || 0,
        postulaciones: Number(datos.postulaciones) || 0,
        notificaciones: Number(datos.notificaciones) || 0,
      });

      setEmpresa(datos.empresa);
    } catch (err) {
      console.error("Error en dashboard empresarial:", err);
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerEstadisticas();
  }, []);

  const estadisticas = [
    {
      titulo: "Vacantes publicadas",
      icono: BriefcaseBusiness,
      valor: resumen.vacantes,
    },
    {
      titulo: "Candidatos",
      icono: Users,
      valor: resumen.candidatos,
    },
    {
      titulo: "Postulaciones",
      icono: FileText,
      valor: resumen.postulaciones,
    },
    {
      titulo: "Notificaciones",
      icono: Bell,
      valor: resumen.notificaciones,
    },
  ];

  const mostrarSeccion = (seccion) => {
    if (seccion === "perfil") {
      return (
        <PerfilEmpresa onActualizar={obtenerEstadisticas} />
      );
    }

    if (seccion === "vacantes") {
      return (
        <VacantesEmpresa onActualizar={obtenerEstadisticas} />
      );
    }

    if (seccion === "candidatos") {
      return (
        <CandidatosEmpresa onActualizar={obtenerEstadisticas} />
      );
    }

    if (seccion === "postulaciones") {
      return (
        <PostulacionesEmpresa onActualizar={obtenerEstadisticas} />
      );
    }

    if (seccion === "notificaciones") {
      return (
        <NotificacionesEstudiante
          rol="empresa"
          onActualizar={obtenerEstadisticas}
        />
      );
    }

    if (seccion === "dashboard") {
      return (
        <>
          <div className="bt-dashboard-welcome">
            <h2>¡Bienvenido a BolsaTec!</h2>
            <p>
              {empresa?.nombre_empresa ||
                usuario?.nombre ||
                "Empresa"}
              , administra tus oportunidades laborales
              y conecta con talento universitario.
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
            <h3>Panel empresarial</h3>

            <p>
              Consulta las estadísticas de tu empresa,
              administra vacantes y revisa las
              postulaciones recibidas.
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
            <h3>Información de tu cuenta</h3>

            <p>
              <strong>Empresa:</strong>{" "}
              {empresa?.nombre_empresa || "Sin información"}
            </p>

            <p>
              <strong>Representante:</strong>{" "}
              {usuario?.nombre || "Sin información"}
            </p>

            <p>
              <strong>Correo:</strong>{" "}
              {usuario?.correo || "Sin información"}
            </p>

            <p>
              <strong>Rol:</strong> Empresa
            </p>
          </div>
        </>
      );
    }

    return null;
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
