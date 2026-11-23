-- ==========================================================
-- BolsaTec: nuevos tipos de vacante (estadía y servicio social)
-- Tipos permitidos: estadia, practicas, tiempo_completo,
-- medio_tiempo, servicio_social
-- (backend/src/services/tiposVacante.js)
--
-- Si la columna vacantes.tipo tiene una restricción CHECK que
-- solo acepta los tipos anteriores, este script la reemplaza.
-- Ejecutar UNA vez en Supabase (SQL Editor) ANTES de desplegar
-- el backend con este cambio. Es seguro ejecutarlo varias veces.
-- ==========================================================

-- Quitar cualquier restricción CHECK existente sobre vacantes.tipo
DO $$
DECLARE
  restriccion record;
BEGIN
  FOR restriccion IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'vacantes'
      AND nsp.nspname = current_schema()
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%tipo%'
  LOOP
    EXECUTE format('ALTER TABLE vacantes DROP CONSTRAINT %I', restriccion.conname);
  END LOOP;
END $$;

-- Nueva restricción con los cinco tipos
ALTER TABLE vacantes
  ADD CONSTRAINT vacantes_tipo_check
  CHECK (tipo IN (
    'estadia',
    'practicas',
    'tiempo_completo',
    'medio_tiempo',
    'servicio_social'
  ));
