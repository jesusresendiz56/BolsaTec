const pool = require("../config/database");

const ESTADOS_VACANTE = ["activa", "pausada", "cerrada"];

const idValido = (id) =>
  /^[1-9]\d*$/.test(String(id)) &&
  Number.isSafeInteger(Number(id));

const CONSULTA = `
  SELECT
    v.id_vacante,
    v.id_empresa,
    v.titulo,
    v.descripcion,
    v.modalidad,
    v.tipo,
    v.ubicacion,
    v.salario_min,
    v.salario_max,
    v.estado,
    v.fecha_publicacion,
    v.direccion_calle,
    v.direccion_numero,
    v.direccion_colonia,
    v.direccion_cp,
    v.direccion_ciudad,
    v.direccion_estado,
    e.nombre_empresa,
    e.verificada AS empresa_verificada,
    u.correo AS correo_empresa,
    (SELECT COUNT(*)
     FROM postulaciones p
     WHERE p.id_vacante = v.id_vacante
    )::int AS total_postulaciones
  FROM vacantes v
  INNER JOIN empresas e
    ON e.id_empresa = v.id_empresa
  INNER JOIN usuarios u
    ON u.id_usuario = e.id_usuario
`;

// ========================================
// CONSULTAR TODAS LAS VACANTES
// ========================================

const listarVacantes = async (req, res) => {
  try {
    const resultado = await pool.query(
      `${CONSULTA}
       ORDER BY v.fecha_publicacion DESC, v.id_vacante DESC`
    );

    return res.json(resultado.rows);
  } catch (error) {
    console.error("Error al consultar vacantes:", error);

    return res.status(500).json({
      mensaje: "No se pudieron consultar las vacantes"
    });
  }
};

// ========================================
// CONSULTAR UNA VACANTE
// ========================================

const obtenerVacante = async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({ mensaje: "ID inválido" });
  }

  try {
    const resultado = await pool.query(
      `${CONSULTA} WHERE v.id_vacante = $1`,
      [req.params.id]
    );

    if (!resultado.rowCount) {
      return res.status(404).json({
        mensaje: "Vacante no encontrada"
      });
    }

    return res.json(resultado.rows[0]);
  } catch (error) {
    console.error("Error al consultar vacante:", error);

    return res.status(500).json({
      mensaje: "No se pudo consultar la vacante"
    });
  }
};

// ========================================
// CAMBIAR ESTADO (activa / pausada / cerrada)
// ========================================

const cambiarEstadoVacante = async (req, res) => {
  const { estado } = req.body;

  if (
    !idValido(req.params.id) ||
    !ESTADOS_VACANTE.includes(estado)
  ) {
    return res.status(400).json({
      mensaje: "Datos inválidos"
    });
  }

  try {
    const resultado = await pool.query(
      `UPDATE vacantes
       SET estado = $1
       WHERE id_vacante = $2
       RETURNING id_vacante, titulo, estado`,
      [estado, req.params.id]
    );

    if (!resultado.rowCount) {
      return res.status(404).json({
        mensaje: "Vacante no encontrada"
      });
    }

    return res.json({
      mensaje: "Estado de la vacante actualizado",
      vacante: resultado.rows[0]
    });
  } catch (error) {
    console.error("Error al cambiar estado de vacante:", error);

    return res.status(500).json({
      mensaje: "No se pudo actualizar el estado"
    });
  }
};

// ========================================
// ELIMINAR VACANTE (solo sin postulaciones)
// ========================================

const eliminarVacante = async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({ mensaje: "ID inválido" });
  }

  try {
    const resultado = await pool.query(
      `DELETE FROM vacantes v
       WHERE v.id_vacante = $1
         AND NOT EXISTS (
           SELECT 1 FROM postulaciones p
           WHERE p.id_vacante = v.id_vacante
         )
       RETURNING v.id_vacante`,
      [req.params.id]
    );

    if (!resultado.rowCount) {
      const existe = await pool.query(
        `SELECT 1 FROM vacantes WHERE id_vacante = $1`,
        [req.params.id]
      );

      if (!existe.rowCount) {
        return res.status(404).json({
          mensaje: "Vacante no encontrada"
        });
      }

      return res.status(409).json({
        mensaje:
          "La vacante tiene postulaciones. " +
          "Ciérrala para conservar el historial."
      });
    }

    return res.json({
      mensaje: "Vacante eliminada correctamente"
    });
  } catch (error) {
    console.error("Error al eliminar vacante:", error);

    return res.status(500).json({
      mensaje: "No se pudo eliminar la vacante"
    });
  }
};

module.exports = {
  listarVacantes,
  obtenerVacante,
  cambiarEstadoVacante,
  eliminarVacante
};
