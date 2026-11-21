-- ==========================================================
-- BolsaTec: prueba de conocimientos ANTES de postularse
-- La empresa define las preguntas de cada vacante (respuesta
-- correcta + incorrectas). El estudiante responde antes de
-- postularse y el resultado se envía a la empresa.
-- Ejecutar UNA vez en Supabase (SQL Editor) ANTES de
-- desplegar el backend con este cambio.
-- Es seguro ejecutarlo varias veces (IF NOT EXISTS).
-- ==========================================================

-- Preguntas que la empresa define para cada vacante
CREATE TABLE IF NOT EXISTS examen_preguntas (
  id_pregunta  SERIAL PRIMARY KEY,
  id_vacante   INTEGER NOT NULL
    REFERENCES vacantes (id_vacante) ON DELETE CASCADE,
  orden        SMALLINT NOT NULL DEFAULT 0,
  pregunta     VARCHAR(300) NOT NULL,
  correcta     VARCHAR(200) NOT NULL,
  -- Arreglo JSON de 1 a 3 respuestas incorrectas
  incorrectas  JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS examen_preguntas_vacante
  ON examen_preguntas (id_vacante, orden);

-- Prueba de cada estudiante para cada vacante.
-- Guarda una copia de las preguntas tal como se le mostraron,
-- así el resultado no cambia si la empresa edita el examen.
-- Si cancela y se vuelve a postular, conserva su resultado.
CREATE TABLE IF NOT EXISTS examenes_vacante (
  id_estudiante    INTEGER NOT NULL
    REFERENCES estudiantes (id_estudiante) ON DELETE CASCADE,
  id_vacante       INTEGER NOT NULL
    REFERENCES vacantes (id_vacante) ON DELETE CASCADE,
  -- [{ "id": 12, "texto": "...", "opciones": ["..."], "correcta": 2 }]
  preguntas        JSONB NOT NULL,
  -- Se llenan al enviar: { "12": 0, ... } (índice elegido)
  respuestas       JSONB,
  aciertos         SMALLINT,
  total            SMALLINT NOT NULL,
  calificacion     NUMERIC(5, 2),
  fecha_asignado   TIMESTAMP NOT NULL DEFAULT NOW(),
  fecha_completado TIMESTAMP,
  PRIMARY KEY (id_estudiante, id_vacante)
);
