
const pool = require("../config/database");

// ========================================
// CREAR NOTIFICACIÓN INTERNA
// ========================================

const crearNotificacion = async (idUsuario, mensaje) => {
  if (!Number.isSafeInteger(Number(idUsuario)) ||
      Number(idUsuario) <= 0 ||
      typeof mensaje !== "string" ||
      !mensaje.trim()) {
    throw new Error("Datos de notificación inválidos");
  }

  const resultado = await pool.query(
    `INSERT INTO notificaciones (
       id_usuario,
       mensaje,
       leida,
       fecha
     )
     VALUES ($1, $2, false, NOW())
     RETURNING
       id_notificacion,
       id_usuario,
       mensaje,
       leida,
       fecha`,
    [idUsuario, mensaje.trim()]
  );

  return resultado.rows[0];
};

module.exports = { crearNotificacion };
