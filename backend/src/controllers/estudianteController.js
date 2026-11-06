
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



const obtenerPerfil = async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT
        e.id_estudiante,
        e.carrera,
        e.semestre,
        e.descripcion,
        e.cv_url,
        e.telefono,
        e.institucion,
        u.nombre,
        u.correo
       FROM estudiantes e
       INNER JOIN usuarios u
         ON u.id_usuario = e.id_usuario
       WHERE e.id_usuario = $1`,
      [req.usuario.id_usuario]
    );

    if (!resultado.rows.length) {
      return res.status(404).json({
        mensaje: "Perfil del estudiante no encontrado"
      });
    }

    return res.json({
      estudiante: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error al obtener perfil:", error);

    return res.status(500).json({
      mensaje: "Error al consultar el perfil"
    });
  }
};

const actualizarPerfil = async (req, res) => {
  try {
    const {
      carrera,
      semestre,
      descripcion,
      telefono,
      institucion
    } = req.body;

    const camposTexto = {
      carrera,
      descripcion,
      telefono,
      institucion
    };

    if (
      Object.values(camposTexto).some(
        (valor) => valor != null && typeof valor !== "string"
      )
    ) {
      return res.status(400).json({
        mensaje: "Los campos del perfil deben contener texto"
      });
    }

    const semestreNumero =
      semestre === "" || semestre == null
        ? null
        : Number(semestre);

    if (
      semestreNumero !== null &&
      (!Number.isInteger(semestreNumero) ||
        semestreNumero < 1 ||
        semestreNumero > 15)
    ) {
      return res.status(400).json({
        mensaje: "El semestre debe estar entre 1 y 15"
      });
    }

    const resultado = await pool.query(
      `UPDATE estudiantes
       SET
         carrera = $1,
         semestre = $2,
         descripcion = $3,
         telefono = $4,
         institucion = $5
       WHERE id_usuario = $6
       RETURNING
         id_estudiante,
         carrera,
         semestre,
         descripcion,
         cv_url,
         telefono,
         institucion`,
      [
        carrera?.trim() || null,
        semestreNumero,
        descripcion?.trim() || null,
        telefono?.trim() || null,
        institucion?.trim() || null,
        req.usuario.id_usuario
      ]
    );

    if (!resultado.rows.length) {
      return res.status(404).json({
        mensaje: "Perfil del estudiante no encontrado"
      });
    }

    return res.json({
      mensaje: "Perfil actualizado correctamente",
      estudiante: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error al actualizar perfil:", error);

    return res.status(500).json({
      mensaje: "Error al actualizar el perfil"
    });
  }
};

module.exports = {
  obtenerEstadisticas,
  obtenerPerfil,
  actualizarPerfil
};
