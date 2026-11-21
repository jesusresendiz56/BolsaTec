-- ==========================================================
-- BolsaTec: más datos en el perfil empresarial
-- Ejecutar UNA vez en Supabase (SQL Editor) ANTES de
-- desplegar el backend con este cambio.
-- Es seguro ejecutarlo varias veces (IF NOT EXISTS).
-- ==========================================================

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS sitio_web       VARCHAR(200),
  ADD COLUMN IF NOT EXISTS linkedin        VARCHAR(200),
  ADD COLUMN IF NOT EXISTS rfc             VARCHAR(13),
  -- micro | pequena | mediana | grande
  ADD COLUMN IF NOT EXISTS tamano          VARCHAR(20),
  ADD COLUMN IF NOT EXISTS contacto_nombre VARCHAR(120),
  ADD COLUMN IF NOT EXISTS contacto_puesto VARCHAR(100);
