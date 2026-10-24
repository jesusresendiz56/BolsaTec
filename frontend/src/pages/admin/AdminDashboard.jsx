
import { useEffect, useState } from "react";
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
import { apiRequest } from "../../services/api";
import EstudiantesAdmin from "./EstudiantesAdmin";

// ======================================
// MENÚ DEL ADMINISTRADOR
// ======================================

const menu = [
  { id: "dashboard", nombre: "Dashboard", icono: "dashboard" },
  { id: "usuarios", nombre: "Usuarios", icono: "usuarios" },
  { id: "empresas", nombre: "Empresas", icono: "empresas" },
  { id: "vacantes", nombre: "Vacantes", icono: "vacantes" },
  { id: "postulaciones", nombre: "Postulaciones", icono: "postulaciones" },
  { id: "habilidades", nombre: "Habilidades", icono: "habilidades" },
];

// ======================================
// COMPONENTE PRINCIPAL
// ======================================

function AdminDashboard() {
  const usuario = sessionGet("administrador")?.usuario;

  // ======================================
  // ESTADOS
  // ======================================

  const [resumen, setResumen] = useState({
    usuarios: 0,
    empresas: 0,
    vacantes: 0,
    postulaciones: 0,
  });

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // ======================================
  // OBTENER ESTADÍSTICAS DESDE SUPABASE
  // ======================================

  useEffect(() => {
    let activo = true;

    const obtenerEstadisticas = async () => {
      try {
        setCargando(true);
        setError("");

        const sesion = sessionGet("administrador");

        if (!sesion?.token) {
          throw new Error(
            "Debes iniciar sesión como administrador"
          );
        }

        // apiRequest utiliza VITE_API_URL.
        // La variable debe incluir /api al final.
        const datos = await apiRequest(
          "/admin/estadisticas",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${sesion.token}`,
            },
          }
        );

        if (!activo) return;

        setResumen({
          usuarios: Number(datos.usuarios) || 0,
          empresas: Number(datos.empresas) || 0,
          vacantes: Number(datos.vacantes) || 0,
          postulaciones: Number(datos.postulaciones) || 0,
        });

      } catch (err) {
        console.error(
          "Error al obtener estadísticas:",
          err
        );

        if (activo) {
          setError(
            err.message ||
            "No se pudieron obtener las estadísticas"
          );
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    };

    obtenerEstadisticas();

    return () => {
      activo = false;
    };
  }, []);

  // ======================================
  // TARJETAS DE ESTADÍSTICAS
  // ======================================

  const estadisticas = [
    {
      titulo: "Usuarios registrados",
      icono: Users,
      valor: resumen.usuarios,
    },
    {
      titulo: "Empresas registradas",
      icono: Building2,
      valor: resumen.empresas,
    },
    {
      titulo: "Vacantes",
      icono: BriefcaseBusiness,
      valor: resumen.vacantes,
    },
    {
      titulo: "Postulaciones",
      icono: FileText,
      valor: resumen.postulaciones,
    },
  ];

  // ======================================
  // INFORMACIÓN DE SECCIONES
  // ======================================

  const secciones = {
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

  // ======================================
  // MOSTRAR SECCIONES
  // ======================================

  const mostrarSeccion = (seccion) => {

    // ====================================
    // CRUD DE ESTUDIANTES
    // ====================================

    if (seccion === "usuarios") {
      return <EstudiantesAdmin />;
    }

    // ====================================
    // DASHBOARD PRINCIPAL
    // ====================================

    if (seccion === "dashboard") {
      return (
        <>
          {/* BIENVENIDA */}
          <div className="bt-dashboard-welcome">
            <h2>
              Panel de administración de BolsaTec
            </h2>

            <p>
              Bienvenido,{" "}
              {usuario?.nombre || "administrador"}.
              {" "}
              Supervisa y administra la información
              general de la plataforma.
            </p>
          </div>

          {/* ESTADÍSTICAS */}
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

          {/* ERROR AL CONSULTAR ESTADÍSTICAS */}
          {error && (
            <div className="bt-dashboard-panel">
              <p
                role="alert"
                style={{ color: "#DC2626" }}
              >
                Error al cargar estadísticas: {error}
              </p>
            </div>
          )}

          {/* ADMINISTRACIÓN GENERAL */}
          <div className="bt-dashboard-panel">
            <h3>Administración general</h3>

            <p>
              Gestiona las cuentas de usuarios,
              revisa empresas registradas,
              supervisa vacantes y consulta
              las postulaciones.
            </p>
          </div>

          {/* VERIFICACIÓN DE EMPRESAS */}
          <div className="bt-dashboard-panel">
            <div className="bt-stat-icon">
              <ShieldCheck size={23} />
            </div>

            <h3>Verificación de empresas</h3>

            <p>
              Las nuevas empresas se registran
              inicialmente como no verificadas.
              Desde este módulo podrás revisar
              sus datos antes de habilitar
              las funciones que requieran verificación.
            </p>
          </div>
        </>
      );
    }

    // ====================================
    // RESTO DE SECCIONES
    // ====================================

    const datos = secciones[seccion];

    if (!datos) {
      return null;
    }

    return (
      <div className="bt-dashboard-panel">

        <div className="bt-stat-icon">
          {seccion === "empresas" ? (
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
          Este módulo está pendiente de conectar
          con las operaciones correspondientes
          del backend y Supabase.
        </p>
      </div>
    );
  };

  // ======================================
  // LAYOUT DEL ADMINISTRADOR
  // ======================================

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
