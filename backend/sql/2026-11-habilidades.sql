-- ==========================================================
-- BolsaTec: catálogo de habilidades (módulo de administrador)
-- Ejecutar UNA vez en Supabase (SQL Editor) ANTES de
-- desplegar el backend con este cambio.
-- Es seguro ejecutarlo varias veces (IF NOT EXISTS).
-- ==========================================================

CREATE TABLE IF NOT EXISTS habilidades (
  id_habilidad SERIAL PRIMARY KEY,
  nombre       VARCHAR(100) NOT NULL
);

-- Categoría opcional para agrupar el catálogo
ALTER TABLE habilidades
  ADD COLUMN IF NOT EXISTS categoria VARCHAR(60);

-- Evitar nombres duplicados sin importar mayúsculas
CREATE UNIQUE INDEX IF NOT EXISTS habilidades_nombre_unico
  ON habilidades (LOWER(nombre));

-- Relación estudiante ↔ habilidad
CREATE TABLE IF NOT EXISTS estudiante_habilidad (
  id_estudiante INTEGER NOT NULL
    REFERENCES estudiantes (id_estudiante) ON DELETE CASCADE,
  id_habilidad  INTEGER NOT NULL
    REFERENCES habilidades (id_habilidad) ON DELETE CASCADE,
  PRIMARY KEY (id_estudiante, id_habilidad)
);
