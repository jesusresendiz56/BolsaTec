
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

import { apiRequest } from "../../services/api";
import "./AdminLogin.css";

function AdminLogin() {
  const navigate = useNavigate();

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const iniciarSesion = async (e) => {
    e.preventDefault();
    setError("");

    if (!correo.trim() || !password) {
      setError("Ingresa tu correo y contraseña.");
      return;
    }

    setCargando(true);

    try {
      const respuesta = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          correo: correo.trim(),
          password,
        }),
      });

      if (respuesta.usuario?.rol !== "administrador") {
        setError("Esta cuenta no tiene permisos de administrador.");
        return;
      }

      if (!respuesta.token) {
        throw new Error("No se recibió el token de autenticación.");
      }

      // Guardar la sesión administrativa
      sessionStorage.setItem("admin_token", respuesta.token);
      sessionStorage.setItem(
        "admin_usuario",
        JSON.stringify(respuesta.usuario)
      );

      // Redirigir al dashboard administrativo
      navigate("/admin/dashboard", { replace: true });

    } catch (err) {
      setError(
        err.message || "No se pudo iniciar sesión."
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-container">

        <div className="admin-login-header">
          <div className="admin-login-logo">
            <GraduationCap size={28} />
          </div>

          <h1>
            Bolsa<span>Tec</span>
          </h1>

          <p>Panel de administración</p>
        </div>

        <div className="admin-login-card">

          <div className="admin-login-icon">
            <ShieldCheck size={29} />
          </div>

          <h2>Acceso administrativo</h2>

          <p className="admin-login-description">
            Ingresa tus credenciales para acceder
            al panel de administración de BolsaTec.
          </p>

          {error && (
            <div className="admin-login-error" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={iniciarSesion}>

            <div className="admin-form-group">
              <label htmlFor="admin-correo">
                Correo electrónico
              </label>

              <div className="admin-input-container">
                <Mail size={19} />

                <input
                  id="admin-correo"
                  type="email"
                  placeholder="Correo del administrador"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="admin-form-group">
              <label htmlFor="admin-password">
                Contraseña
              </label>

              <div className="admin-input-container">
                <LockKeyhole size={19} />

                <input
                  id="admin-password"
                  type={mostrarPassword ? "text" : "password"}
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="admin-show-password"
                  onClick={() =>
                    setMostrarPassword(!mostrarPassword)
                  }
                  aria-label={
                    mostrarPassword
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                >
                  {mostrarPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="admin-login-submit"
              disabled={cargando}
            >
              {cargando ? (
                "Verificando credenciales..."
              ) : (
                <>
                  Iniciar sesión
                  <ArrowRight size={19} />
                </>
              )}
            </button>

          </form>
        </div>

        <Link to="/" className="admin-back-home">
          Volver al inicio de BolsaTec
        </Link>

        <p className="admin-login-footer">
          © 2026 BolsaTec · Acceso restringido
        </p>

      </div>
    </div>
  );
}

export default AdminLogin;
