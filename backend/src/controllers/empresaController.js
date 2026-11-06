
const pool = require("../config/database");

// Obtener estadísticas de la empresa autenticada
const obtenerEstadisticas = async (req, res) => {
  try {
    const idUsuario = req.usuario.id_usuario;

    const empresaResultado = await pool.query(
      `SELECT id_empresa, nombre_empresa
       FROM empresas
       WHERE id_usuario = $1`,
      [idUsuario]
    );

    if (empresaResultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "No se encontró el perfil empresarial"
      });
    }

    const empresa = empresaResultado.rows[0];

    const resultado = await pool.query(
      `SELECT
        (SELECT COUNT(*)
         FROM vacantes
         WHERE id_empresa = $1) AS vacantes,

        (SELECT COUNT(DISTINCT p.id_estudiante)
         FROM postulaciones p
         INNER JOIN vacantes v
           ON v.id_vacante = p.id_vacante
         WHERE v.id_empresa = $1) AS candidatos,

        (SELECT COUNT(*)
         FROM postulaciones p
         INNER JOIN vacantes v
           ON v.id_vacante = p.id_vacante
         WHERE v.id_empresa = $1) AS postulaciones,

        (SELECT COUNT(*)
         FROM notificaciones
         WHERE id_usuario = $2
           AND leida = FALSE) AS notificaciones`,
      [empresa.id_empresa, idUsuario]
    );

    const datos = resultado.rows[0];

    return res.json({
      empresa: {
        id_empresa: empresa.id_empresa,
        nombre_empresa: empresa.nombre_empresa
      },
      vacantes: Number(datos.vacantes),
      candidatos: Number(datos.candidatos),
      postulaciones: Number(datos.postulaciones),
      notificaciones: Number(datos.notificaciones)
    });

  } catch (error) {
    console.error("Error en estadísticas de empresa:", error);

    return res.status(500).json({
      mensaje: "No se pudieron obtener las estadísticas"
    });
  }
};

module.exports = {
  obtenerEstadisticas
};
