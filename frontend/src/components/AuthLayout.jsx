
import { Link } from "react-router-dom";
import {
  BriefcaseBusiness,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

import "./AuthLayout.css";

function AuthLayout({ children }) {
  return (
    <div className="auth-layout">
      <aside className="auth-left">
        <Link to="/" className="auth-logo">
          <div className="auth-logo-icon">
            <BriefcaseBusiness size={24} />
          </div>

          <span>
            Bolsa<strong>Tec</strong>
          </span>
        </Link>

        <div className="auth-left-content">
          <div className="auth-tag">
            <Sparkles size={15} />
            TALENTO QUE TRANSFORMA
          </div>

          <h1>
            Tu futuro
            <br />
            profesional
            <br />
            <span>empieza aquí.</span>
          </h1>

          <p className="auth-description">
            Conectamos el talento tecnológico con las empresas
            que están construyendo el futuro de México.
          </p>

          <div className="auth-features">
            <div className="auth-feature">
              <div className="auth-feature-icon">
                <BriefcaseBusiness size={21} />
              </div>

              <div>
                <h3>Oportunidades seleccionadas</h3>
                <p>Vacantes alineadas a tu perfil profesional</p>
              </div>
            </div>

            <div className="auth-feature">
              <div className="auth-feature-icon">
                <ShieldCheck size={21} />
              </div>

              <div>
                <h3>Empresas verificadas</h3>
                <p>Conecta con empresas confiables</p>
              </div>
            </div>

            <div className="auth-feature">
              <div className="auth-feature-icon">
                <CheckCircle2 size={21} />
              </div>

              <div>
                <h3>Seguimiento de postulaciones</h3>
                <p>Consulta el estado de tus solicitudes</p>
              </div>
            </div>
          </div>
        </div>

        <p className="auth-copyright">
          © 2026 BolsaTec. Todos los derechos reservados.
        </p>
      </aside>

      <section className="auth-right">
        {children}
      </section>
    </div>
  );
}

export default AuthLayout;
