
const pool = require("../config/database");

// ========================================
// OBTENER NOTIFICACIONES DEL ESTUDIANTE
// ========================================

const obtenerNotificaciones = async (req, res) => {
  try {
    const idUsuario = req.usuario.id_usuario;

    const resultado = await pool.query(
      `SELECT
         id_notificacion,
         mensaje,
         COALESCE(leida, false) AS leida,
         fecha
       FROM notificaciones
       WHERE id_usuario = $1
       ORDER BY fecha DESC, id_notificacion DESC
       LIMIT 100`,
      [idUsuario]
    );

    const totalNoLeidas = resultado.rows.filter(
      (notificacion) => !notificacion.leida
    ).length;

    return res.status(200).json({
      notificaciones: resultado.rows,
      total: resultado.rows.length,
      no_leidas: totalNoLeidas
    });

  } catch (error) {
    console.error("Error al obtener notificaciones:", error);

    return res.status(500).json({
      mensaje: "No se pudieron consultar las notificaciones"
    });
  }
};

// ========================================
// MARCAR UNA NOTIFICACIÓN COMO LEÍDA
// ========================================

const marcarNotificacionLeida = async (req, res) => {
  try {
    const idUsuario = req.usuario.id_usuario;
    const idNotificacion = Number(req.params.id);

    if (
      !Number.isSafeInteger(idNotificacion) ||
      idNotificacion <= 0
    ) {
      return res.status(400).json({
        mensaje: "Identificador de notificación inválido"
      });
    }

    const resultado = await pool.query(
      `UPDATE notificaciones
       SET leida = true
       WHERE id_notificacion = $1
         AND id_usuario = $2
       RETURNING
         id_notificacion,
         mensaje,
         leida,
         fecha`,
      [idNotificacion, idUsuario]
    );

    if (!resultado.rows.length) {
      return res.status(404).json({
        mensaje: "Notificación no encontrada"
      });
    }

    return res.status(200).json({
      mensaje: "Notificación marcada como leída",
      notificacion: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error al marcar notificación:", error);

    return res.status(500).json({
      mensaje: "No se pudo actualizar la notificación"
    });
  }
};

// ========================================
// MARCAR TODAS COMO LEÍDAS
// ========================================

const marcarTodasLeidas = async (req, res) => {
  try {
    const idUsuario = req.usuario.id_usuario;

    const resultado = await pool.query(
      `UPDATE notificaciones
       SET leida = true
       WHERE id_usuario = $1
         AND leida IS DISTINCT FROM true`,
      [idUsuario]
    );

    return res.status(200).json({
      mensaje: "Notificaciones marcadas como leídas",
      actualizadas: resultado.rowCount
    });

  } catch (error) {
    console.error("Error al marcar todas las notificaciones:", error);

    return res.status(500).json({
      mensaje: "No se pudieron actualizar las notificaciones"
    });
  }
};

module.exports = {
  obtenerNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas
};
