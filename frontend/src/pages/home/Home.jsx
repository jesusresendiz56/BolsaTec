
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Building2,
  Search,
  ArrowRight,
  BriefcaseBusiness,
  FileUser,
  CheckCircle2,
  Menu,
  X,
  MapPin,
  ShieldCheck,
  Bell,
  Users,
  ArrowUpRight,
} from "lucide-react";

import "./Home.css";

function Home() {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  const [menuAbierto, setMenuAbierto] = useState(false);

  const buscarVacantes = (e) => {
    e.preventDefault();

    // El catálogo público se implementará después.
    // Por ahora enviamos al login sin perder la búsqueda.
    navigate("/login", {
      state: {
        busquedaPendiente: busqueda.trim(),
      },
    });
  };

  const cerrarMenu = () => setMenuAbierto(false);

  return (
    <div className="bt-home">
      {/* NAVEGACIÓN */}
      <header className="bt-navbar">
        <div className="bt-nav-container">
          <Link to="/" className="bt-logo" onClick={cerrarMenu}>
            <span className="bt-logo-icon">
              <GraduationCap size={23} />
            </span>
            Bolsa<span>Tec</span>
          </Link>

          <nav className={menuAbierto ? "bt-nav-links abierto" : "bt-nav-links"}>
            <a href="#inicio" onClick={cerrarMenu}>Inicio</a>
            <a href="#oportunidades" onClick={cerrarMenu}>Oportunidades</a>
            <a href="#estudiantes" onClick={cerrarMenu}>Estudiantes</a>
            <a href="#empresas" onClick={cerrarMenu}>Empresas</a>

            <div className="bt-mobile-actions">
              <Link to="/login" onClick={cerrarMenu}>Iniciar sesión</Link>
              <Link to="/registro" onClick={cerrarMenu}>Crear cuenta</Link>
            </div>
          </nav>

          <div className="bt-nav-actions">
            <Link to="/login" className="bt-btn-outline">
              Iniciar sesión
            </Link>
            <Link to="/registro" className="bt-btn-primary">
              Registrarse <ArrowRight size={17} />
            </Link>
          </div>

          <button
            type="button"
            className="bt-menu-toggle"
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuAbierto}
            onClick={() => setMenuAbierto(!menuAbierto)}
          >
            {menuAbierto ? <X size={25} /> : <Menu size={25} />}
          </button>
        </div>
      </header>

      {/* HERO */}
      <main id="inicio" className="bt-hero">
        <div className="bt-hero-inner">
          <div className="bt-hero-copy">
            <span className="bt-eyebrow">
              <span className="bt-eyebrow-dot" />
              TU FUTURO PROFESIONAL COMIENZA AQUÍ
            </span>

            <h1>
              Tu talento merece
              <span> grandes oportunidades.</span>
            </h1>

            <p className="bt-hero-description">
              Conectamos estudiantes con empresas que ofrecen
              prácticas profesionales, estadías y oportunidades
              laborales para comenzar una carrera profesional.
            </p>

            <form className="bt-search" onSubmit={buscarVacantes}>
              <Search size={21} />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Puesto, carrera o palabra clave..."
                aria-label="Buscar oportunidades"
              />
              <button type="submit">
                Buscar vacantes <ArrowRight size={17} />
              </button>
            </form>

            <p className="bt-search-note">
              Crea tu cuenta para consultar y postularte a las vacantes.
            </p>

            <div className="bt-hero-links">
              <Link to="/registro" className="bt-hero-link">
                <GraduationCap size={18} />
                Soy estudiante
                <ArrowUpRight size={16} />
              </Link>

              <Link to="/registro" className="bt-hero-link">
                <Building2 size={18} />
                Soy empresa
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>

          {/* PANEL VISUAL */}
          <div className="bt-hero-visual" aria-label="Funciones de BolsaTec">
            <div className="bt-visual-top">
              <div className="bt-visual-icon">
                <BriefcaseBusiness size={23} />
              </div>
              <div>
                <span className="bt-visual-label">BOLSATEC</span>
                <h3>Tu espacio profesional</h3>
              </div>
              <span className="bt-visual-status">
                <span /> Plataforma
              </span>
            </div>

            <div className="bt-visual-heading">
              <h4>Todo lo que necesitas para avanzar</h4>
              <p>Una plataforma, diferentes oportunidades.</p>
            </div>

            <div className="bt-feature-row">
              <span className="bt-feature-icon azul">
                <Search size={21} />
              </span>
              <div>
                <strong>Explora oportunidades</strong>
                <p>Encuentra vacantes de tu interés.</p>
              </div>
              <ArrowUpRight size={18} />
            </div>

            <div className="bt-feature-row">
              <span className="bt-feature-icon morado">
                <FileUser size={21} />
              </span>
              <div>
                <strong>Construye tu perfil</strong>
                <p>Comparte tu experiencia y habilidades.</p>
              </div>
              <ArrowUpRight size={18} />
            </div>

            <div className="bt-feature-row">
              <span className="bt-feature-icon verde">
                <Bell size={21} />
              </span>
              <div>
                <strong>Da seguimiento</strong>
                <p>Consulta el avance de tus postulaciones.</p>
              </div>
              <ArrowUpRight size={18} />
            </div>

            <div className="bt-visual-footer">
              <CheckCircle2 size={18} />
              Diseñado para estudiantes y empresas
            </div>
          </div>
        </div>
      </main>

      {/* OPORTUNIDADES */}
      <section id="oportunidades" className="bt-section bt-opportunities">
        <div className="bt-section-heading">
          <span className="bt-section-label">EXPLORA BOLSATEC</span>
          <h2>Encuentra el camino hacia tu futuro</h2>
          <p>
            Descubre las diferentes oportunidades que puedes
            encontrar en nuestra plataforma.
          </p>
        </div>

        <div className="bt-cards">
          <article className="bt-opportunity-card">
            <span className="bt-card-icon">
              <GraduationCap size={26} />
            </span>
            <h3>Prácticas profesionales</h3>
            <p>
              Aplica tus conocimientos y desarrolla habilidades
              en un entorno profesional.
            </p>
            <Link to="/registro">
              Comenzar ahora <ArrowRight size={17} />
            </Link>
          </article>

          <article className="bt-opportunity-card">
            <span className="bt-card-icon">
              <BriefcaseBusiness size={26} />
            </span>
            <h3>Oportunidades laborales</h3>
            <p>
              Encuentra vacantes relacionadas con tu carrera,
              intereses y conocimientos.
            </p>
            <Link to="/registro">
              Explorar opciones <ArrowRight size={17} />
            </Link>
          </article>

          <article className="bt-opportunity-card">
            <span className="bt-card-icon">
              <Building2 size={26} />
            </span>
            <h3>Empresas y talento</h3>
            <p>
              Conecta con organizaciones interesadas en incorporar
              estudiantes y nuevos profesionistas.
            </p>
            <Link to="/registro">
              Crear una cuenta <ArrowRight size={17} />
            </Link>
          </article>
        </div>
      </section>

      {/* ESTUDIANTES */}
      <section id="estudiantes" className="bt-section bt-audience-section">
        <div className="bt-audience-panel">
          <div className="bt-audience-icon">
            <GraduationCap size={30} />
          </div>

          <div className="bt-audience-content">
            <span className="bt-section-label">PARA ESTUDIANTES</span>
            <h2>Da el siguiente paso en tu carrera</h2>
            <p>
              Crea tu perfil profesional, descubre oportunidades
              y mantén el control de tus postulaciones.
            </p>

            <div className="bt-benefits">
              <div><CheckCircle2 size={19} /> Perfil profesional y currículum</div>
              <div><CheckCircle2 size={19} /> Búsqueda de vacantes</div>
              <div><CheckCircle2 size={19} /> Seguimiento de postulaciones</div>
            </div>

            <Link to="/registro" className="bt-action-link">
              Crear cuenta de estudiante <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* EMPRESAS */}
      <section id="empresas" className="bt-section bt-companies-section">
        <div className="bt-companies-inner">
          <div className="bt-company-copy">
            <span className="bt-section-label">PARA EMPRESAS</span>
            <h2>Encuentra talento para hacer crecer tu empresa</h2>
            <p>
              Publica oportunidades de empleo, prácticas y estadías.
              Conecta con estudiantes interesados en desarrollar
              su experiencia profesional.
            </p>

            <div className="bt-company-benefits">
              <div>
                <BriefcaseBusiness size={21} />
                <span>Publicación de vacantes</span>
              </div>
              <div>
                <Users size={21} />
                <span>Gestión de candidatos</span>
              </div>
              <div>
                <ShieldCheck size={21} />
                <span>Perfiles empresariales</span>
              </div>
            </div>

            <Link to="/registro" className="bt-btn-primary bt-company-cta">
              Registrar mi empresa <ArrowRight size={18} />
            </Link>
          </div>

          <div className="bt-company-visual">
            <div className="bt-company-visual-icon">
              <Building2 size={42} />
            </div>
            <h3>Tu próxima contratación comienza aquí</h3>
            <p>
              Conecta tus oportunidades con el talento que
              está construyendo su futuro.
            </p>
            <div className="bt-company-mini-card">
              <MapPin size={18} />
              Oportunidades para diferentes modalidades
            </div>
          </div>
        </div>
      </section>

      {/* LLAMADO A LA ACCIÓN */}
      <section className="bt-final-cta">
        <div>
          <h2>El futuro profesional se construye hoy</h2>
          <p>
            Forma parte de BolsaTec y comienza a conectar
            con nuevas oportunidades.
          </p>
          <Link to="/registro">
            Crear mi cuenta <ArrowRight size={19} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bt-footer">
        <div className="bt-footer-inner">
          <div>
            <Link to="/" className="bt-logo bt-footer-logo">
              <GraduationCap size={25} />
              Bolsa<span>Tec</span>
            </Link>
            <p>
              Plataforma de empleo, prácticas profesionales
              y estadías para estudiantes y empresas.
            </p>
          </div>

          <div className="bt-footer-links">
            <a href="#inicio">Inicio</a>
            <a href="#oportunidades">Oportunidades</a>
            <a href="#estudiantes">Estudiantes</a>
            <a href="#empresas">Empresas</a>
          </div>
        </div>

        <div className="bt-footer-bottom">
          <span>© 2026 BolsaTec. Todos los derechos reservados.</span>
          <span>Conectando talento con oportunidades.</span>
        </div>
      </footer>
    </div>
  );
}

export default Home;
