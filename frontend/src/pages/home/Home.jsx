import "./Home.css";

function Home() {
  return (
    <div className="home">

      {/* Barra de navegación */}
      <header className="navbar">
        <div className="logo">
          Bolsa<span>Tec</span>
        </div>

        <nav>
          <a href="#inicio">Inicio</a>
          <a href="#vacantes">Vacantes</a>
          <a href="#empresas">Empresas</a>
        </nav>

        <div className="navbar-buttons">
          <button className="btn-login">Iniciar sesión</button>
          <button className="btn-register">Registrarse</button>
        </div>
      </header>

      {/* Sección principal */}
      <main id="inicio" className="hero">
        <div className="hero-content">

          <p className="tag">
            Tu futuro profesional comienza aquí
          </p>

          <h1>
            Encuentra oportunidades para comenzar tu{" "}
            <span>carrera profesional</span>
          </h1>

          <p className="description">
            BolsaTec conecta estudiantes con empresas que ofrecen
            prácticas profesionales, estadías y oportunidades de empleo.
          </p>

          <div className="search-box">
            <input
              type="text"
              placeholder="¿Qué oportunidad estás buscando?"
            />

            <button>Buscar vacantes</button>
          </div>

        </div>
      </main>

      {/* Oportunidades */}
      <section id="vacantes" className="opportunities">

        <h2>Encuentra tu próxima oportunidad</h2>

        <p>
          Explora diferentes opciones para comenzar tu experiencia profesional.
        </p>

        <div className="cards">

          <div className="card">
            <h3>Prácticas profesionales</h3>
            <p>
              Obtén experiencia profesional mientras continúas tus estudios.
            </p>
          </div>

          <div className="card">
            <h3>Vacantes</h3>
            <p>
              Encuentra oportunidades laborales relacionadas con tu perfil.
            </p>
          </div>

          <div className="card">
            <h3>Empresas</h3>
            <p>
              Conoce empresas interesadas en incorporar talento universitario.
            </p>
          </div>

        </div>

      </section>

      {/* Registro */}
      <section className="register-section">

        <h2>¿Listo para encontrar una oportunidad?</h2>

        <p>
          Crea tu perfil, explora vacantes y comienza a construir
          tu experiencia profesional.
        </p>

        <button>Crear cuenta</button>

      </section>

      {/* Pie de página */}
      <footer>

        <div className="logo footer-logo">
          Bolsa<span>Tec</span>
        </div>

        <p>
          Plataforma de oportunidades laborales y prácticas profesionales.
        </p>

        <p>© 2026 BolsaTec</p>

      </footer>

    </div>
  );
}

export default Home;