
import { useState } from "react";
import { Link } from "react-router-dom";
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
  const [rol, setRol] = useState("estudiante");
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const registrar = (e) => {
    e.preventDefault();
    alert("Registro pendiente de conectar al backend");
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
            onClick={() => setRol("estudiante")}
          >
            <GraduationCap size={19} />
            Soy estudiante
          </button>

          <button
            type="button"
            className={rol === "empresa" ? "active" : ""}
            onClick={() => setRol("empresa")}
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
                  required
                  placeholder="Ej. Andrea Martínez"
                />
              </div>
            </div>

            <div className="registro-field">
              <label htmlFor="registro-telefono">Teléfono</label>
              <div className="registro-input">
                <Phone size={19} />
                <input
                  id="registro-telefono"
                  type="tel"
                  required
                  placeholder="Ej. 55 1234 5678"
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
                  required
                  placeholder={
                    rol === "estudiante"
                      ? "Ej. Universidad Tecnológica"
                      : "Ej. TechCorp"
                  }
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
                  required
                  placeholder={
                    rol === "estudiante"
                      ? "Ej. Ingeniería en sistemas"
                      : "Ej. Tecnología"
                  }
                />
              </div>
            </div>
          </div>

          <div className="registro-field">
            <label htmlFor="registro-correo">Correo electrónico</label>

            <div className="registro-input">
              <Mail size={19} />
              <input
                id="registro-correo"
                type="email"
                required
                placeholder="tu.nombre@tecnm.mx"
              />
            </div>
          </div>

          <div className="registro-field">
            <label htmlFor="registro-password">Contraseña</label>

            <div className="registro-input">
              <LockKeyhole size={19} />
              <input
                id="registro-password"
                type={mostrarPassword ? "text" : "password"}
                minLength={6}
                required
                placeholder="Mínimo 6 caracteres"
              />

              <button
                type="button"
                className="registro-eye"
                aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setMostrarPassword(!mostrarPassword)}
              >
                {mostrarPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          <label className="registro-terms">
            <input type="checkbox" required />
            Acepto los términos y condiciones de BolsaTec
          </label>

          <button type="submit" className="registro-submit">
            Crear cuenta
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
