// Tipos de vacante permitidos (deben coincidir con la restricción
// de la columna vacantes.tipo; ver backend/sql/2026-11-tipos-vacante.sql)
const TIPOS_VACANTE = [
  "estadia",
  "practicas",
  "tiempo_completo",
  "medio_tiempo",
  "servicio_social",
];

module.exports = { TIPOS_VACANTE };
