
const pool = require("../config/database");

// ========================================
// CONSULTAR CANDIDATOS DE LA EMPRESA
// ========================================

const obtenerCandidatos = async (req, res) => {
  try {
    const idUsuario = req.usuario.id_usuario;

    const resultado = await pool.query(
      `SELECT
        p.id_postulacion,
        p.id_vacante,
        p.id_estudiante,
        p.estado,
        p.fecha_postulacion,
        p.compatibilidad,

        v.titulo AS titulo_vacante,

        u.nombre AS nombre_estudiante,
        u.correo AS correo_estudiante,

        est.carrera,
        est.semestre,
        est.descripcion,
        (est.cv_url IS NOT NULL) AS tiene_curriculum

       FROM postulaciones p

       INNER JOIN vacantes v
         ON v.id_vacante = p.id_vacante

       INNER JOIN empresas e
         ON e.id_empresa = v.id_empresa

       INNER JOIN estudiantes est
         ON est.id_estudiante = p.id_estudiante

       INNER JOIN usuarios u
         ON u.id_usuario = est.id_usuario

       WHERE e.id_usuario = $1

       ORDER BY
         p.fecha_postulacion DESC,
         p.id_postulacion DESC`,
      [idUsuario]
    );

    return res.json({
      candidatos: resultado.rows,
      total: resultado.rowCount
    });

  } catch (error) {
    console.error(
      "Error al consultar candidatos:",
      error
    );

    return res.status(500).json({
      mensaje: "No se pudieron consultar los candidatos"
    });
  }
};

// ========================================
// CONSULTAR DETALLE DE UN CANDIDATO
// ========================================

const obtenerDetalleCandidato = async (req, res) => {
  try {
    const idPostulacion = Number(req.params.id);

    if (
      !Number.isSafeInteger(idPostulacion) ||
      idPostulacion <= 0
    ) {
      return res.status(400).json({
        mensaje: "Identificador de postulación no válido"
      });
    }

    const resultado = await pool.query(
      `SELECT
        p.id_postulacion,
        p.estado,
        p.fecha_postulacion,
        p.compatibilidad,

        v.id_vacante,
        v.titulo AS titulo_vacante,

        u.nombre AS nombre_estudiante,
        u.correo AS correo_estudiante,

        est.id_estudiante,
        est.carrera,
        est.semestre,
        est.descripcion,
        (est.cv_url IS NOT NULL) AS tiene_curriculum

       FROM postulaciones p

       INNER JOIN vacantes v
         ON v.id_vacante = p.id_vacante

       INNER JOIN empresas e
         ON e.id_empresa = v.id_empresa

       INNER JOIN estudiantes est
         ON est.id_estudiante = p.id_estudiante

       INNER JOIN usuarios u
         ON u.id_usuario = est.id_usuario

       WHERE p.id_postulacion = $1
         AND e.id_usuario = $2`,
      [
        idPostulacion,
        req.usuario.id_usuario
      ]
    );

    if (!resultado.rows.length) {
      return res.status(404).json({
        mensaje: "Candidato no encontrado"
      });
    }

    return res.json({
      candidato: resultado.rows[0]
    });

  } catch (error) {
    console.error(
      "Error al consultar detalle del candidato:",
      error
    );

    return res.status(500).json({
      mensaje: "No se pudo consultar el candidato"
    });
  }
};

// ========================================
// CAMBIAR ESTADO DE POSTULACIÓN
// ========================================

const cambiarEstadoCandidato = async (req, res) => {
  try {
    const idPostulacion = Number(req.params.id);
    const { estado } = req.body || {};

    if (
      !Number.isSafeInteger(idPostulacion) ||
      idPostulacion <= 0
    ) {
      return res.status(400).json({
        mensaje: "Identificador de postulación no válido"
      });
    }

    const estadosPermitidos = [
      "enviada",
      "vista",
      "entrevista",
      "aceptada",
      "rechazada"
    ];

    if (!estadosPermitidos.includes(estado)) {
      return res.status(400).json({
        mensaje: "Estado de postulación no válido"
      });
    }

    const resultado = await pool.query(
      `UPDATE postulaciones p
       SET estado = $1
       FROM vacantes v
       INNER JOIN empresas e
         ON e.id_empresa = v.id_empresa
       WHERE p.id_postulacion = $2
         AND p.id_vacante = v.id_vacante
         AND e.id_usuario = $3
       RETURNING
         p.id_postulacion,
         p.id_vacante,
         p.id_estudiante,
         p.estado,
         p.fecha_postulacion`,
      [
        estado,
        idPostulacion,
        req.usuario.id_usuario
      ]
    );

    if (!resultado.rows.length) {
      return res.status(404).json({
        mensaje: "Postulación no encontrada"
      });
    }

    return res.json({
      mensaje: "Estado de postulación actualizado correctamente",
      postulacion: resultado.rows[0]
    });

  } catch (error) {
    console.error(
      "Error al cambiar estado del candidato:",
      error
    );

    return res.status(500).json({
      mensaje: "No se pudo actualizar el estado"
    });
  }
};

module.exports = {
  obtenerCandidatos,
  obtenerDetalleCandidato,
  cambiarEstadoCandidato
};
