
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../../services/api";
import { sessionStart } from "../../services/session";

import {
  GraduationCap,
  Building2,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

import AuthLayout from "../../components/AuthLayout";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [rol, setRol] = useState("estudiante");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [recordarme, setRecordarme] = useState(true);
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");


const iniciarSesion = async (e) => {
  e.preventDefault();

  setError("");
  setCargando(true);

  try {
    // 1. Enviar credenciales al backend
    const respuesta = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        correo: correo.trim(),
        password,
      }),
    });

    const { token, usuario } = respuesta;

    // 2. Validar respuesta
    if (!token || !usuario?.rol) {
      throw new Error(
        "Respuesta de autenticación incompleta"
      );
    }

    // 3. Verificar el rol seleccionado
    if (usuario.rol !== rol) {
      throw new Error(
        "El tipo de cuenta seleccionado no corresponde a tu usuario"
      );
    }

    // 4. Determinar el dashboard
    const rutasPorRol = {
      estudiante: "/dashboard/estudiante",
      empresa: "/dashboard/empresa",
    };

    const rutaDestino = rutasPorRol[usuario.rol];

    if (!rutaDestino) {
      throw new Error(
        "El usuario no tiene acceso a este portal"
      );
    }

    // 5. SESSION START
    sessionStart(token, usuario, recordarme);

    console.log("Sesión iniciada correctamente", {
      id_usuario: usuario.id_usuario,
      rol: usuario.rol,
    });

    // 6. Redirigir al dashboard
    navigate(rutaDestino, { replace: true });

  } catch (err) {
    console.error("Error al iniciar sesión:", err);

    setError(
      err.message || "No se pudo iniciar sesión"
    );
  } finally {
    setCargando(false);
  }
};


  return (
    <AuthLayout>
      <div className="login-container">
        <span className="login-subtitle">
          BIENVENIDO DE VUELTA
        </span>

        <h1>Inicia sesión en tu cuenta</h1>

        <p className="login-description">
          Accede a oportunidades diseñadas para ti.
        </p>

        {/* Selección de rol */}
        <div className="login-roles">
          <button
            type="button"
            className={rol === "estudiante" ? "active" : ""}
            onClick={() => {
              setRol("estudiante");
              setError("");
            }}
          >
            <GraduationCap size={19} />
            Soy estudiante
          </button>

          <button
            type="button"
            className={rol === "empresa" ? "active" : ""}
            onClick={() => {
              setRol("empresa");
              setError("");
            }}
          >
            <Building2 size={19} />
            Soy empresa
          </button>
        </div>

        {/* Formulario */}
        <form
          onSubmit={iniciarSesion}
          className="login-form"
        >
          {/* Correo electrónico */}
          <div className="login-field">
            <label htmlFor="login-correo">
              Correo electrónico
            </label>

            <div className="login-input">
              <Mail size={19} />
              <input
                id="login-correo"
                type="email"
                placeholder={
                  rol === "estudiante"
                    ? "tu.nombre@tecnm.mx"
                    : "contacto@empresa.com"
                }
                value={correo}
                onChange={(e) =>
                  setCorreo(e.target.value)
                }
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* Contraseña */}
          <div className="login-field">
            <label htmlFor="login-password">
              Contraseña
            </label>

            <div className="login-input">
              <LockKeyhole size={19} />

              <input
                id="login-password"
                type={
                  mostrarPassword
                    ? "text"
                    : "password"
                }
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="login-eye"
                aria-label={
                  mostrarPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
                onClick={() =>
                  setMostrarPassword(!mostrarPassword)
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

          {/* Opciones */}
          <div className="login-options">
            <label className="login-remember">
              <input
                type="checkbox"
                checked={recordarme}
                onChange={(e) =>
                  setRecordarme(e.target.checked)
                }
              />
              Recordarme
            </label>

            <Link to="/recuperar-password">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {/* Mensaje de error */}
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          {/* Botón de inicio de sesión */}
          <button
            type="submit"
            className="login-submit"
            disabled={cargando}
          >
            {cargando
              ? "Iniciando sesión..."
              : "Iniciar sesión"}
            <ArrowRight size={19} />
          </button>
        </form>

        {/* Registro */}
        <p className="login-register">
          ¿Todavía no tienes cuenta?{" "}
          <Link to="/registro">
            Regístrate gratis
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default Login;
