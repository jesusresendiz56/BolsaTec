const pool = require("../config/database");

const idValido = (id) =>
  /^[1-9]\d*$/.test(String(id)) &&
  Number.isSafeInteger(Number(id));

function validarHabilidad({ nombre, categoria }) {
  if (
    typeof nombre !== "string" ||
    !nombre.trim() ||
    nombre.trim().length > 100
  ) return "El nombre es obligatorio (máximo 100 caracteres)";

  if (
    categoria != null &&
    (typeof categoria !== "string" ||
      categoria.trim().length > 60)
  ) return "Categoría inválida (máximo 60 caracteres)";

  return null;
}

const errorDuplicado = (error) => error.code === "23505";

// ========================================
// CONSULTAR CATÁLOGO
// ========================================

const listarHabilidades = async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT
         h.id_habilidad,
         h.nombre,
         h.categoria,
         (SELECT COUNT(*)
          FROM estudiante_habilidad eh
          WHERE eh.id_habilidad = h.id_habilidad
         )::int AS total_estudiantes
       FROM habilidades h
       ORDER BY LOWER(h.nombre)`
    );

    return res.json(resultado.rows);
  } catch (error) {
    console.error("Error al consultar habilidades:", error);

    return res.status(500).json({
      mensaje: "No se pudieron consultar las habilidades"
    });
  }
};

// ========================================
// CREAR HABILIDAD
// ========================================

const crearHabilidad = async (req, res) => {
  const error = validarHabilidad(req.body);

  if (error) {
    return res.status(400).json({ mensaje: error });
  }

  try {
    const resultado = await pool.query(
      `INSERT INTO habilidades (nombre, categoria)
       VALUES ($1, $2)
       RETURNING id_habilidad, nombre, categoria`,
      [
        req.body.nombre.trim(),
        req.body.categoria?.trim() || null
      ]
    );

    return res.status(201).json({
      mensaje: "Habilidad registrada correctamente",
      habilidad: resultado.rows[0]
    });
  } catch (error) {
    console.error("Error al crear habilidad:", error);

    return res.status(errorDuplicado(error) ? 409 : 500).json({
      mensaje: errorDuplicado(error)
        ? "Esa habilidad ya existe"
        : "No se pudo registrar la habilidad"
    });
  }
};

// ========================================
// ACTUALIZAR HABILIDAD
// ========================================

const actualizarHabilidad = async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({ mensaje: "ID inválido" });
  }

  const error = validarHabilidad(req.body);

  if (error) {
    return res.status(400).json({ mensaje: error });
  }

  try {
    const resultado = await pool.query(
      `UPDATE habilidades
       SET nombre = $1, categoria = $2
       WHERE id_habilidad = $3
       RETURNING id_habilidad, nombre, categoria`,
      [
        req.body.nombre.trim(),
        req.body.categoria?.trim() || null,
        req.params.id
      ]
    );

    if (!resultado.rowCount) {
      return res.status(404).json({
        mensaje: "Habilidad no encontrada"
      });
    }

    return res.json({
      mensaje: "Habilidad actualizada correctamente",
      habilidad: resultado.rows[0]
    });
  } catch (error) {
    console.error("Error al actualizar habilidad:", error);

    return res.status(errorDuplicado(error) ? 409 : 500).json({
      mensaje: errorDuplicado(error)
        ? "Ya existe otra habilidad con ese nombre"
        : "No se pudo actualizar la habilidad"
    });
  }
};

// ========================================
// ELIMINAR HABILIDAD (solo si no está en uso)
// ========================================

const eliminarHabilidad = async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({ mensaje: "ID inválido" });
  }

  try {
    const resultado = await pool.query(
      `DELETE FROM habilidades h
       WHERE h.id_habilidad = $1
         AND NOT EXISTS (
           SELECT 1 FROM estudiante_habilidad eh
           WHERE eh.id_habilidad = h.id_habilidad
         )
       RETURNING h.id_habilidad`,
      [req.params.id]
    );

    if (!resultado.rowCount) {
      const existe = await pool.query(
        `SELECT 1 FROM habilidades WHERE id_habilidad = $1`,
        [req.params.id]
      );

      if (!existe.rowCount) {
        return res.status(404).json({
          mensaje: "Habilidad no encontrada"
        });
      }

      return res.status(409).json({
        mensaje:
          "La habilidad está asignada a estudiantes " +
          "y no se puede eliminar."
      });
    }

    return res.json({
      mensaje: "Habilidad eliminada correctamente"
    });
  } catch (error) {
    console.error("Error al eliminar habilidad:", error);

    return res.status(500).json({
      mensaje: "No se pudo eliminar la habilidad"
    });
  }
};

module.exports = {
  listarHabilidades,
  crearHabilidad,
  actualizarHabilidad,
  eliminarHabilidad
};
