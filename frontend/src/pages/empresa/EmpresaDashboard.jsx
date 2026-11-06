
import { useEffect, useState } from "react";

import {
  Building2,
  BriefcaseBusiness,
  Users,
  FileText,
  Bell,
  RefreshCw,
} from "lucide-react";

import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { sessionGet } from "../../services/session";

// Módulo de gestión de vacantes
import VacantesEmpresa from "./VacantesEmpresa";

// Módulo de perfil empresarial
import PerfilEmpresa from "./PerfilEmpresa";

const menu = [
  { id: "dashboard", nombre: "Dashboard", icono: "dashboard" },
  { id: "perfil", nombre: "Perfil empresarial", icono: "perfil" },
  { id: "vacantes", nombre: "Mis vacantes", icono: "vacantes" },
  { id: "candidatos", nombre: "Candidatos", icono: "usuarios" },
  { id: "postulaciones", nombre: "Postulaciones", icono: "postulaciones" },
  { id: "notificaciones", nombre: "Notificaciones", icono: "notificaciones" },
];

const secciones = {
  perfil: {
    titulo: "Perfil empresarial",
    descripcion: "Administra la información de tu empresa.",
  },
  candidatos: {
    titulo: "Gestión de candidatos",
    descripcion: "Consulta los estudiantes interesados en tus vacantes.",
  },
  postulaciones: {
    titulo: "Postulaciones recibidas",
    descripcion: "Revisa las solicitudes recibidas.",
  },
  notificaciones: {
    titulo: "Notificaciones",
    descripcion: "Consulta los avisos de tu empresa.",
  },
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
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // =========================================
  // OBTENER ESTADÍSTICAS REALES
  // =========================================

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

  // =========================================
  // TARJETAS DE ESTADÍSTICAS
  // =========================================

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

  // =========================================
  // MOSTRAR SECCIONES DEL DASHBOARD
  // =========================================

  const mostrarSeccion = (seccion) => {
    // MÓDULO DE PERFIL EMPRESARIAL
    if (seccion === "perfil") {
  return <PerfilEmpresa onActualizar={obtenerEstadisticas} />;
}
    // MÓDULO DE VACANTES
    if (seccion === "vacantes") {
      return (
        <VacantesEmpresa
          onActualizar={obtenerEstadisticas}
        />
      );
    }

    // DASHBOARD PRINCIPAL
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
              {empresa?.nombre_empresa ||
                "Sin información"}
            </p>

            <p>
              <strong>Representante:</strong>{" "}
              {usuario?.nombre ||
                "Sin información"}
            </p>

            <p>
              <strong>Correo:</strong>{" "}
              {usuario?.correo ||
                "Sin información"}
            </p>

            <p>
              <strong>Rol:</strong> Empresa
            </p>
          </div>
        </>
      );
    }

    // OTROS MÓDULOS PENDIENTES
    const datos = secciones[seccion];

    if (!datos) return null;

    return (
      <div className="bt-dashboard-panel">
        <div className="bt-stat-icon">
          {seccion === "perfil" ? (
            <Building2 size={23} />
          ) : seccion === "candidatos" ? (
            <Users size={23} />
          ) : seccion === "postulaciones" ? (
            <FileText size={23} />
          ) : (
            <Bell size={23} />
          )}
        </div>

        <h3>{datos.titulo}</h3>
        <p>{datos.descripcion}</p>

        <p>
          Este módulo se conectará con el backend
          para consultar y administrar su información.
        </p>
      </div>
    );
  };

  // =========================================
  // LAYOUT PRINCIPAL
  // =========================================

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
