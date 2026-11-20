-- ==========================================================
-- BolsaTec: esquema MÍNIMO para pruebas locales.
-- Reproduce las tablas que usa el backend para poder correr
-- las pruebas en una base de datos vacía (NO usar en Supabase).
-- ==========================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario     SERIAL PRIMARY KEY,
  nombre         VARCHAR(120) NOT NULL,
  correo         VARCHAR(150) NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  rol            VARCHAR(20) NOT NULL
                 CHECK (rol IN ('estudiante', 'empresa', 'administrador')),
  activo         BOOLEAN NOT NULL DEFAULT true,
  fecha_registro TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS estudiantes (
  id_estudiante SERIAL PRIMARY KEY,
  id_usuario    INTEGER NOT NULL UNIQUE
                REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
  carrera       VARCHAR(120),
  semestre      INTEGER,
  descripcion   TEXT,
  telefono      VARCHAR(30),
  institucion   VARCHAR(150),
  cv_url        TEXT
);

CREATE TABLE IF NOT EXISTS empresas (
  id_empresa     SERIAL PRIMARY KEY,
  id_usuario     INTEGER NOT NULL UNIQUE
                 REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
  nombre_empresa VARCHAR(150) NOT NULL,
  descripcion    TEXT,
  ubicacion      VARCHAR(200),
  telefono       VARCHAR(30),
  sector         VARCHAR(100),
  verificada     BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS vacantes (
  id_vacante        SERIAL PRIMARY KEY,
  id_empresa        INTEGER NOT NULL
                    REFERENCES empresas (id_empresa) ON DELETE CASCADE,
  titulo            VARCHAR(150) NOT NULL,
  descripcion       TEXT NOT NULL,
  modalidad         VARCHAR(20) NOT NULL,
  tipo              VARCHAR(20) NOT NULL,
  ubicacion         VARCHAR(255),
  salario_min       NUMERIC(10, 2),
  salario_max       NUMERIC(10, 2),
  estado            VARCHAR(20) NOT NULL DEFAULT 'activa',
  fecha_publicacion TIMESTAMP NOT NULL DEFAULT NOW(),
  direccion_calle   VARCHAR(150),
  direccion_numero  VARCHAR(30),
  direccion_colonia VARCHAR(120),
  direccion_cp      VARCHAR(5),
  direccion_ciudad  VARCHAR(120),
  direccion_estado  VARCHAR(60),
  latitud           NUMERIC(9, 6),
  longitud          NUMERIC(9, 6)
);

CREATE TABLE IF NOT EXISTS postulaciones (
  id_postulacion    SERIAL PRIMARY KEY,
  id_vacante        INTEGER NOT NULL
                    REFERENCES vacantes (id_vacante) ON DELETE CASCADE,
  id_estudiante     INTEGER NOT NULL
                    REFERENCES estudiantes (id_estudiante) ON DELETE CASCADE,
  estado            VARCHAR(20) NOT NULL DEFAULT 'enviada',
  compatibilidad    INTEGER,
  fecha_postulacion TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (id_vacante, id_estudiante)
);

CREATE TABLE IF NOT EXISTS notificaciones (
  id_notificacion SERIAL PRIMARY KEY,
  id_usuario      INTEGER NOT NULL
                  REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
  mensaje         TEXT NOT NULL,
  leida           BOOLEAN NOT NULL DEFAULT false,
  fecha           TIMESTAMP NOT NULL DEFAULT NOW()
);
