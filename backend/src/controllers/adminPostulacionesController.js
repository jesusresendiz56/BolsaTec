const pool = require("../config/database");
const {
  ESTADOS_POSTULACION,
  notificarCambioEstado
} = require("./candidatoController");

const idValido = (id) =>
  /^[1-9]\d*$/.test(String(id)) &&
  Number.isSafeInteger(Number(id));

// ========================================
// CONSULTAR TODAS LAS POSTULACIONES
// ========================================

const listarPostulaciones = async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT
         p.id_postulacion,
         p.id_vacante,
         p.id_estudiante,
         p.estado,
         p.fecha_postulacion,
         us.nombre AS nombre_estudiante,
         us.correo AS correo_estudiante,
         est.carrera,
         est.semestre,
         v.titulo AS titulo_vacante,
         v.estado AS estado_vacante,
         e.nombre_empresa
       FROM postulaciones p
       INNER JOIN estudiantes est
         ON est.id_estudiante = p.id_estudiante
       INNER JOIN usuarios us
         ON us.id_usuario = est.id_usuario
       INNER JOIN vacantes v
         ON v.id_vacante = p.id_vacante
       INNER JOIN empresas e
         ON e.id_empresa = v.id_empresa
       ORDER BY p.fecha_postulacion DESC, p.id_postulacion DESC`
    );

    return res.json(resultado.rows);
  } catch (error) {
    console.error("Error al consultar postulaciones:", error);

    return res.status(500).json({
      mensaje: "No se pudieron consultar las postulaciones"
    });
  }
};

// ========================================
// CAMBIAR ESTADO DE UNA POSTULACIÓN
// Avisa al estudiante igual que cuando lo hace la empresa.
// ========================================

const cambiarEstadoPostulacion = async (req, res) => {
  const { estado } = req.body;

  if (
    !idValido(req.params.id) ||
    !ESTADOS_POSTULACION.includes(estado)
  ) {
    return res.status(400).json({
      mensaje: "Datos inválidos"
    });
  }

  try {
    const resultado = await pool.query(
      `UPDATE postulaciones
       SET estado = $1
       WHERE id_postulacion = $2
         AND estado IS DISTINCT FROM $1
       RETURNING id_postulacion, estado`,
      [estado, req.params.id]
    );

    if (!resultado.rowCount) {
      const existe = await pool.query(
        `SELECT 1 FROM postulaciones WHERE id_postulacion = $1`,
        [req.params.id]
      );

      if (!existe.rowCount) {
        return res.status(404).json({
          mensaje: "Postulación no encontrada"
        });
      }

      return res.json({
        mensaje: "La postulación ya tenía ese estado"
      });
    }

    let advertencia = null;

    try {
      await notificarCambioEstado(req.params.id);
    } catch (error) {
      console.error(
        `Aviso de cambio de estado (admin): error (postulación ${req.params.id}) -`,
        error.message
      );
      advertencia =
        "El estado se guardó, pero no se pudo notificar al estudiante.";
    }

    return res.json({
      mensaje: "Estado de la postulación actualizado",
      postulacion: resultado.rows[0],
      ...(advertencia ? { advertencia } : {})
    });
  } catch (error) {
    console.error("Error al cambiar estado de postulación:", error);

    return res.status(500).json({
      mensaje: "No se pudo actualizar la postulación"
    });
  }
};

// ========================================
// ELIMINAR POSTULACIÓN
// ========================================

const eliminarPostulacion = async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({ mensaje: "ID inválido" });
  }

  try {
    const resultado = await pool.query(
      `DELETE FROM postulaciones
       WHERE id_postulacion = $1
       RETURNING id_postulacion`,
      [req.params.id]
    );

    if (!resultado.rowCount) {
      return res.status(404).json({
        mensaje: "Postulación no encontrada"
      });
    }

    return res.json({
      mensaje: "Postulación eliminada correctamente"
    });
  } catch (error) {
    console.error("Error al eliminar postulación:", error);

    return res.status(500).json({
      mensaje: "No se pudo eliminar la postulación"
    });
  }
};

module.exports = {
  listarPostulaciones,
  cambiarEstadoPostulacion,
  eliminarPostulacion
};
