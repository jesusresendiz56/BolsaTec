

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  LayoutDashboard,
  UserRound,
  Users,
  Building2,
  BriefcaseBusiness,
  FileText,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Tags,
  ShieldCheck,
} from "lucide-react";

import "./DashboardLayout.css";

const iconos = {
  dashboard: LayoutDashboard,
  perfil: UserRound,
  usuarios: Users,
  empresas: Building2,
  vacantes: BriefcaseBusiness,
  postulaciones: FileText,
  notificaciones: Bell,
  configuracion: Settings,
  habilidades: Tags,
  verificacion: ShieldCheck,
};

function DashboardLayout({
  rol,
  titulo,
  descripcion,
  usuario,
  menu,
  children,
}) {
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [seccionActiva, setSeccionActiva] = useState("dashboard");

  


const cerrarSesion = () => {
  if (rol === "administrador") {
    sessionStorage.removeItem("admin_token");
    sessionStorage.removeItem("admin_usuario");

    navigate("/admin/login", { replace: true });
  } else {
    localStorage.removeItem("bolsatec_token");
    localStorage.removeItem("bolsatec_usuario");

    sessionStorage.removeItem("bolsatec_token");
    sessionStorage.removeItem("bolsatec_usuario");

    navigate("/login", { replace: true });
  }
};




  const seleccionarSeccion = (id) => {
    setSeccionActiva(id);
    setMenuAbierto(false);
  };

  return (
    <div className="bt-dashboard">
      <aside
        className={
          menuAbierto
            ? "bt-dashboard-sidebar abierto"
            : "bt-dashboard-sidebar"
        }
      >
        <Link to="/" className="bt-dashboard-logo">
          <GraduationCap size={28} />
          <span>
            Bolsa<strong>Tec</strong>
          </span>
        </Link>

        <div className="bt-sidebar-role">
          {rol === "administrador"
            ? "Administración"
            : rol === "empresa"
              ? "Portal empresarial"
              : "Portal del estudiante"}
        </div>

        <nav className="bt-sidebar-nav">
          {menu.map((item) => {
            const Icono = iconos[item.icono] || LayoutDashboard;

            return (
              <button
                key={item.id}
                type="button"
                className={
                  seccionActiva === item.id
                    ? "bt-sidebar-item activo"
                    : "bt-sidebar-item"
                }
                onClick={() => seleccionarSeccion(item.id)}
              >
                <Icono size={19} />
                <span>{item.nombre}</span>
              </button>
            );
          })}
        </nav>

        <div className="bt-sidebar-bottom">
          <button
            type="button"
            className="bt-sidebar-item bt-logout"
            onClick={cerrarSesion}
          >
            <LogOut size={19} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {menuAbierto && (
        <button
          className="bt-sidebar-overlay"
          onClick={() => setMenuAbierto(false)}
          aria-label="Cerrar menú"
        />
      )}

      <div className="bt-dashboard-main">
        <header className="bt-dashboard-header">
          <div className="bt-dashboard-header-left">
            <button
              type="button"
              className="bt-dashboard-menu-button"
              onClick={() => setMenuAbierto(!menuAbierto)}
              aria-label="Abrir menú"
            >
              {menuAbierto ? <X size={23} /> : <Menu size={23} />}
            </button>

            <div>
              <h1>{titulo}</h1>
              <p>{descripcion}</p>
            </div>
          </div>

          <div className="bt-dashboard-user">
            <div className="bt-dashboard-avatar">
              {usuario?.nombre?.charAt(0)?.toUpperCase() || "U"}
            </div>

            <div>
              <strong>{usuario?.nombre || "Usuario"}</strong>
              <span>
                {rol === "administrador"
                  ? "Administrador"
                  : rol === "empresa"
                    ? "Empresa"
                    : "Estudiante"}
              </span>
            </div>
          </div>
        </header>

        <main className="bt-dashboard-content">
          {typeof children === "function"
            ? children(seccionActiva)
            : children}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
