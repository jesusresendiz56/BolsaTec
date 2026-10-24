
const pool = require("../config/database");

// Obtener estadísticas generales
const obtenerEstadisticas = async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM usuarios) AS usuarios,
        (SELECT COUNT(*) FROM empresas) AS empresas,
        (SELECT COUNT(*) FROM vacantes) AS vacantes,
        (SELECT COUNT(*) FROM postulaciones) AS postulaciones
    `);

    const datos = resultado.rows[0];

    return res.json({
      usuarios: Number(datos.usuarios),
      empresas: Number(datos.empresas),
      vacantes: Number(datos.vacantes),
      postulaciones: Number(datos.postulaciones)
    });

  } catch (error) {
    console.error("Error al obtener estadísticas:", error);

    return res.status(500).json({
      mensaje: "No se pudieron obtener las estadísticas"
    });
  }
};

module.exports = {
  obtenerEstadisticas
};
