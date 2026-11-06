
const pool = require("../config/database");

// ========================================
// REGISTRAR POSTULACIÓN
// ========================================

const crearPostulacion = async (req, res) => {
  try {
    const idUsuario = req.usuario.id_usuario;
    const idVacante = Number(req.body?.id_vacante);

    if (!Number.isSafeInteger(idVacante) || idVacante <= 0) {
      return res.status(400).json({
        mensaje: "Debes seleccionar una vacante válida"
      });
    }

    // Obtener estudiante autenticado
    const estudianteResultado = await pool.query(
      `SELECT id_estudiante
       FROM estudiantes
       WHERE id_usuario = $1`,
      [idUsuario]
    );

    if (!estudianteResultado.rows.length) {
      return res.status(404).json({
        mensaje: "No se encontró el perfil del estudiante"
      });
    }

    const idEstudiante =
      estudianteResultado.rows[0].id_estudiante;

    // Registrar solo si la vacante sigue activa.
    // ON CONFLICT evita postulaciones duplicadas.
    const resultado = await pool.query(
      `INSERT INTO postulaciones (
         id_vacante,
         id_estudiante,
         estado
       )
       SELECT
         v.id_vacante,
         $2,
         'enviada'
       FROM vacantes v
       WHERE v.id_vacante = $1
         AND v.estado = 'activa'
       ON CONFLICT (id_vacante, id_estudiante)
       DO NOTHING
       RETURNING
         id_postulacion,
         id_vacante,
         id_estudiante,
         fecha_postulacion,
         estado`,
      [idVacante, idEstudiante]
    );

    if (!resultado.rows.length) {
      const vacanteResultado = await pool.query(
        `SELECT estado
         FROM vacantes
         WHERE id_vacante = $1`,
        [idVacante]
      );

      if (!vacanteResultado.rows.length) {
        return res.status(404).json({
          mensaje: "La vacante no existe"
        });
      }

      if (vacanteResultado.rows[0].estado !== "activa") {
        return res.status(409).json({
          mensaje: "La vacante ya no está disponible"
        });
      }

      return res.status(409).json({
        mensaje: "Ya te postulaste a esta vacante"
      });
    }

    return res.status(201).json({
      mensaje: "Postulación enviada correctamente",
      postulacion: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error al crear postulación:", error);

    return res.status(500).json({
      mensaje: "No se pudo registrar la postulación"
    });
  }
};

// ========================================
// CONSULTAR MIS POSTULACIONES
// ========================================

const obtenerPostulaciones = async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT
         p.id_postulacion,
         p.id_vacante,
         p.fecha_postulacion,
         p.estado,
         v.titulo,
         v.modalidad,
         v.tipo,
         v.ubicacion,
         v.estado AS estado_vacante,
         e.nombre_empresa
       FROM postulaciones p
       INNER JOIN estudiantes est
         ON est.id_estudiante = p.id_estudiante
       INNER JOIN vacantes v
         ON v.id_vacante = p.id_vacante
       INNER JOIN empresas e
         ON e.id_empresa = v.id_empresa
       WHERE est.id_usuario = $1
       ORDER BY
         p.fecha_postulacion DESC,
         p.id_postulacion DESC`,
      [req.usuario.id_usuario]
    );

    return res.json({
      postulaciones: resultado.rows,
      total: resultado.rowCount
    });

  } catch (error) {
    console.error("Error al consultar postulaciones:", error);

    return res.status(500).json({
      mensaje: "No se pudieron consultar las postulaciones"
    });
  }
};

module.exports = {
  crearPostulacion,
  obtenerPostulaciones
};
