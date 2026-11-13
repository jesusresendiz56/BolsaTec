-- ==========================================================
-- BolsaTec: dirección detallada y coordenadas en vacantes
-- Ejecutar UNA vez en Supabase (SQL Editor) ANTES de
-- desplegar el backend con este cambio.
-- Es seguro ejecutarlo varias veces (IF NOT EXISTS).
-- ==========================================================

ALTER TABLE vacantes
  ADD COLUMN IF NOT EXISTS direccion_calle   VARCHAR(150),
  ADD COLUMN IF NOT EXISTS direccion_numero  VARCHAR(30),
  ADD COLUMN IF NOT EXISTS direccion_colonia VARCHAR(120),
  ADD COLUMN IF NOT EXISTS direccion_cp      VARCHAR(5),
  ADD COLUMN IF NOT EXISTS direccion_ciudad  VARCHAR(120),
  ADD COLUMN IF NOT EXISTS direccion_estado  VARCHAR(60),
  ADD COLUMN IF NOT EXISTS latitud           NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS longitud          NUMERIC(9, 6);

-- Las coordenadas van juntas y dentro de rangos válidos
ALTER TABLE vacantes
  DROP CONSTRAINT IF EXISTS vacantes_coordenadas_validas;

ALTER TABLE vacantes
  ADD CONSTRAINT vacantes_coordenadas_validas CHECK (
    (latitud IS NULL AND longitud IS NULL)
    OR (
      latitud BETWEEN -90 AND 90
      AND longitud BETWEEN -180 AND 180
    )
  );
