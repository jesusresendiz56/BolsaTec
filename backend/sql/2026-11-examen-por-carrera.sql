-- ==========================================================
-- BolsaTec: pruebas de conocimientos POR CARRERA
-- Cada empresa escribe una prueba general por carrera (según
-- su giro). Al postularse a cualquier vacante de la empresa,
-- el estudiante recibe la prueba de su carrera, o la prueba
-- "general" si su carrera no tiene una.
-- Requiere haber ejecutado antes 2026-11-examen-postulacion.sql
-- (usa su tabla examenes_vacante para guardar los resultados).
-- Ejecutar UNA vez en Supabase (SQL Editor) ANTES de
-- desplegar el backend con este cambio.
-- Es seguro ejecutarlo varias veces (IF NOT EXISTS).
-- ==========================================================

CREATE TABLE IF NOT EXISTS examen_preguntas_carrera (
  id_pregunta  SERIAL PRIMARY KEY,
  id_empresa   INTEGER NOT NULL
    REFERENCES empresas (id_empresa) ON DELETE CASCADE,
  -- Clave del catálogo (backend/src/services/carreras.js):
  -- sistemas, electronica, mecanica, civil, quimica,
  -- contabilidad, gestion, industrial o general
  carrera      VARCHAR(30) NOT NULL,
  orden        SMALLINT NOT NULL DEFAULT 0,
  pregunta     VARCHAR(300) NOT NULL,
  correcta     VARCHAR(200) NOT NULL,
  -- Arreglo JSON de 1 a 3 respuestas incorrectas
  incorrectas  JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS examen_preguntas_carrera_empresa
  ON examen_preguntas_carrera (id_empresa, carrera, orden);

-- Carrera de la prueba que presentó el estudiante
ALTER TABLE examenes_vacante
  ADD COLUMN IF NOT EXISTS carrera VARCHAR(30);

-- La tabla de preguntas por vacante (examen_preguntas) ya no se
-- usa. Cuando confirmes que no la necesitas, puedes borrarla con:
-- DROP TABLE IF EXISTS examen_preguntas;
