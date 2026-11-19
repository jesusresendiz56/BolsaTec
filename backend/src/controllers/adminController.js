
const pool = require("../config/database");

// Obtener estadísticas generales
const obtenerEstadisticas = async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM usuarios) AS usuarios,
        (SELECT COUNT(*) FROM usuarios
         WHERE rol = 'estudiante') AS estudiantes,
        (SELECT COUNT(*) FROM empresas) AS empresas,
        (SELECT COUNT(*) FROM empresas
         WHERE verificada = FALSE) AS empresas_pendientes,
        (SELECT COUNT(*) FROM vacantes) AS vacantes,
        (SELECT COUNT(*) FROM vacantes
         WHERE estado = 'activa') AS vacantes_activas,
        (SELECT COUNT(*) FROM postulaciones) AS postulaciones,
        (SELECT COUNT(*) FROM postulaciones
         WHERE estado = 'enviada') AS postulaciones_enviada,
        (SELECT COUNT(*) FROM postulaciones
         WHERE estado = 'vista') AS postulaciones_vista,
        (SELECT COUNT(*) FROM postulaciones
         WHERE estado = 'entrevista') AS postulaciones_entrevista,
        (SELECT COUNT(*) FROM postulaciones
         WHERE estado = 'aceptada') AS postulaciones_aceptada,
        (SELECT COUNT(*) FROM postulaciones
         WHERE estado = 'rechazada') AS postulaciones_rechazada
    `);

    const datos = Object.fromEntries(
      Object.entries(resultado.rows[0]).map(
        ([clave, valor]) => [clave, Number(valor) || 0]
      )
    );

    return res.json(datos);

  } catch (error) {
    console.error("Error al obtener estadísticas:", error);

    return res.status(500).json({
      mensaje: "No se pudieron obtener las estadísticas"
    });
  }
};


// Obtener todos los usuarios
const obtenerUsuarios = async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        id_usuario,
        nombre,
        correo,
        rol,
        activo
      FROM usuarios
      ORDER BY id_usuario DESC
    `);

    return res.json(resultado.rows);
  } catch (error) {
    console.error("Error al consultar usuarios:", error);

    return res.status(500).json({
      mensaje: "No se pudieron obtener los usuarios"
    });
  }
};

// Activar o desactivar usuarios
const cambiarEstadoUsuario = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { activo } = req.body;

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        mensaje: "ID de usuario inválido"
      });
    }

    if (typeof activo !== "boolean") {
      return res.status(400).json({
        mensaje: "El estado debe ser verdadero o falso"
      });
    }

    // Evitar que el administrador desactive su propia cuenta
    if (
      Number(req.usuario.id_usuario) === id &&
      activo === false
    ) {
      return res.status(400).json({
        mensaje: "No puedes desactivar tu propia cuenta"
      });
    }

    const resultado = await pool.query(
      `UPDATE usuarios
       SET activo = $1
       WHERE id_usuario = $2
       RETURNING id_usuario, nombre, correo, rol, activo`,
      [activo, id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        mensaje: "Usuario no encontrado"
      });
    }

    return res.json({
      mensaje: "Estado actualizado correctamente",
      usuario: resultado.rows[0]
    });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);

    return res.status(500).json({
      mensaje: "No se pudo actualizar el usuario"
    });
  }
};

module.exports = {
  obtenerEstadisticas,
  obtenerUsuarios,
  cambiarEstadoUsuario
};
