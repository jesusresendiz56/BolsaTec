
const pool = require("../config/database");

// ========================================
// OBTENER ESTUDIANTE AUTENTICADO
// ========================================

const buscarEstudiante = async (idUsuario) => {
  const resultado = await pool.query(
    `SELECT
       id_estudiante,
       id_usuario,
       carrera,
       semestre,
       descripcion,
       cv_url
     FROM estudiantes
     WHERE id_usuario = $1`,
    [idUsuario]
  );

  return resultado.rows[0] || null;
};

// ========================================
// ESTADÍSTICAS DEL ESTUDIANTE
// ========================================

const obtenerEstadisticas = async (req, res) => {
  try {
    const idUsuario = req.usuario.id_usuario;

    const estudiante = await buscarEstudiante(idUsuario);

    if (!estudiante) {
      return res.status(404).json({
        mensaje: "No se encontró el perfil del estudiante"
      });
    }

    const resultado = await pool.query(
      `SELECT
        (SELECT COUNT(*)
         FROM postulaciones
         WHERE id_estudiante = $1) AS postulaciones,

        (SELECT COUNT(*)
         FROM vacantes
         WHERE estado = 'activa') AS vacantes,

        (SELECT COUNT(*)
         FROM postulaciones
         WHERE id_estudiante = $1
           AND estado = 'entrevista') AS entrevistas,

        (SELECT COUNT(*)
         FROM notificaciones
         WHERE id_usuario = $2
           AND leida = FALSE) AS notificaciones`,
      [estudiante.id_estudiante, idUsuario]
    );

    const datos = resultado.rows[0];

    return res.json({
      estudiante,
      postulaciones: Number(datos.postulaciones),
      vacantes: Number(datos.vacantes),
      entrevistas: Number(datos.entrevistas),
      notificaciones: Number(datos.notificaciones)
    });

  } catch (error) {
    console.error("Error en estadísticas del estudiante:", error);

    return res.status(500).json({
      mensaje: "No se pudieron obtener las estadísticas"
    });
  }
};

module.exports = {
  obtenerEstadisticas
};
