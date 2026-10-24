
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../../services/api";

import {
  GraduationCap,
  Building2,
  UserRound,
  Phone,
  BriefcaseBusiness,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

import AuthLayout from "../../components/AuthLayout";
import "./Registro.css";

function Registro() {
  const navigate = useNavigate();

  const [rol, setRol] = useState("estudiante");
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [institucion, setInstitucion] = useState("");
  const [carrera, setCarrera] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  
const registrar = async (e) => {
  e.preventDefault();

  setError("");
  setExito("");

  if (password.length < 8) {
    setError("La contraseña debe tener al menos 8 caracteres.");
    return;
  }

  setCargando(true);

  try {
    let endpoint;
    let datos;

    if (rol === "estudiante") {
      endpoint = "/auth/registro";

      datos = {
        nombre: nombre.trim(),
        correo: correo.trim(),
        password,
        carrera: carrera.trim(),
        semestre: null
      };
    } else {
      endpoint = "/auth/registro-empresa";

      datos = {
        nombre: nombre.trim(),
        correo: correo.trim(),
        password,
        nombre_empresa: institucion.trim(),
        telefono: telefono.trim(),
        sector: carrera.trim()
      };
    }

    const respuesta = await apiRequest(endpoint, {
      method: "POST",
      body: JSON.stringify(datos)
    });

    setExito(respuesta.mensaje);

    setNombre("");
    setTelefono("");
    setInstitucion("");
    setCarrera("");
    setCorreo("");
    setPassword("");

    navigate("/login", {
      state: {
        mensaje: respuesta.mensaje
      }
    });

  } catch (err) {
    setError(
      err.message || "No se pudo completar el registro"
    );
  } finally {
    setCargando(false);
  }
};


  return (
    <AuthLayout>
      <div className="registro-container">
        <span className="registro-subtitle">
          ÚNETE A BOLSATEC
        </span>

        <h1>Crea tu cuenta profesional</h1>

        <p className="registro-description">
          Completa tus datos y comienza a conectar.
        </p>

        <div className="registro-roles">
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

        <form className="registro-form" onSubmit={registrar}>
          <div className="registro-row">
            <div className="registro-field">
              <label htmlFor="registro-nombre">
                {rol === "estudiante"
                  ? "Nombre completo"
                  : "Nombre del representante"}
              </label>

              <div className="registro-input">
                <UserRound size={19} />
                <input
                  id="registro-nombre"
                  type="text"
                  required
                  maxLength={150}
                  placeholder="Ej. Andrea Martínez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>
            </div>

            <div className="registro-field">
              <label htmlFor="registro-telefono">
                Teléfono
              </label>

              <div className="registro-input">
                <Phone size={19} />
                <input
                  id="registro-telefono"
                  type="tel"
                  required
                  placeholder="Ej. 55 1234 5678"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="registro-row">
            <div className="registro-field">
              <label htmlFor="registro-institucion">
                {rol === "estudiante"
                  ? "Institución"
                  : "Nombre de la empresa"}
              </label>

              <div className="registro-input">
                <Building2 size={19} />
                <input
                  id="registro-institucion"
                  type="text"
                  required
                  placeholder={
                    rol === "estudiante"
                      ? "Ej. Universidad Tecnológica"
                      : "Ej. TechCorp"
                  }
                  value={institucion}
                  onChange={(e) => setInstitucion(e.target.value)}
                />
              </div>
            </div>

            <div className="registro-field">
              <label htmlFor="registro-carrera">
                {rol === "estudiante"
                  ? "Carrera o especialidad"
                  : "Sector empresarial"}
              </label>

              <div className="registro-input">
                <BriefcaseBusiness size={19} />
                <input
                  id="registro-carrera"
                  type="text"
                  required
                  placeholder={
                    rol === "estudiante"
                      ? "Ej. Ingeniería en sistemas"
                      : "Ej. Tecnología"
                  }
                  value={carrera}
                  onChange={(e) => setCarrera(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="registro-field">
            <label htmlFor="registro-correo">
              Correo electrónico
            </label>

            <div className="registro-input">
              <Mail size={19} />
              <input
                id="registro-correo"
                type="email"
                required
                placeholder="tu.nombre@tecnm.mx"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
              />
            </div>
          </div>

          <div className="registro-field">
            <label htmlFor="registro-password">
              Contraseña
            </label>

            <div className="registro-input">
              <LockKeyhole size={19} />

              <input
                id="registro-password"
                type={mostrarPassword ? "text" : "password"}
                minLength={8}
                required
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                className="registro-eye"
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

          <label className="registro-terms">
            <input type="checkbox" required />
            Acepto los términos y condiciones de BolsaTec
          </label>

          {error && (
            <p className="registro-error" role="alert">
              {error}
            </p>
          )}

          {exito && (
            <p className="registro-exito" role="status">
              {exito}
            </p>
          )}

          <button
            type="submit"
            className="registro-submit"
            disabled={cargando}
          >
            {cargando ? "Registrando..." : "Crear cuenta"}
            <ArrowRight size={19} />
          </button>
        </form>

        <p className="registro-login">
          ¿Ya tienes una cuenta?{" "}
          <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default Registro;
