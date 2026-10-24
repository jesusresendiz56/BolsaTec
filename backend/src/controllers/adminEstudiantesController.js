
const pool = require("../config/database");
const bcrypt = require("bcrypt");

const CAMPOS = `
  SELECT
    u.id_usuario,
    e.id_estudiante,
    u.nombre,
    u.correo,
    u.rol,
    u.activo,
    e.carrera,
    e.semestre,
    e.descripcion,
    e.cv_url
  FROM estudiantes e
  INNER JOIN usuarios u
    ON u.id_usuario = e.id_usuario
`;

const idValido = (valor) =>
  /^[1-9]\d*$/.test(String(valor)) &&
  Number.isSafeInteger(Number(valor));

const validarDatos = ({ nombre, correo, carrera, semestre }) => {
  if (
    typeof nombre !== "string" ||
    !nombre.trim() ||
    nombre.trim().length > 150
  ) return "Nombre inválido (máximo 150 caracteres)";

  if (
    typeof correo !== "string" ||
    correo.length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())
  ) return "Correo electrónico inválido";

  if (
    carrera != null &&
    (typeof carrera !== "string" || carrera.length > 150)
  ) return "Carrera inválida";

  if (
    semestre != null &&
    semestre !== "" &&
    (!Number.isInteger(Number(semestre)) ||
      Number(semestre) < 1 ||
      Number(semestre) > 15)
  ) return "El semestre debe estar entre 1 y 15";

  return null;
};

// GET /api/admin/estudiantes
const listarEstudiantes = async (req, res) => {
  try {
    const resultado = await pool.query(
      `${CAMPOS} ORDER BY e.id_estudiante DESC`
    );

    return res.json(resultado.rows);
  } catch (error) {
    console.error("Error al listar estudiantes:", error);
    return res.status(500).json({
      mensaje: "No se pudieron consultar los estudiantes"
    });
  }
};

// GET /api/admin/estudiantes/:id
const obtenerEstudiante = async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({ mensaje: "ID inválido" });
  }

  try {
    const resultado = await pool.query(
      `${CAMPOS} WHERE e.id_estudiante = $1`,
      [req.params.id]
    );

    if (!resultado.rowCount) {
      return res.status(404).json({
        mensaje: "Estudiante no encontrado"
      });
    }

    return res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      mensaje: "Error al consultar estudiante"
    });
  }
};

// POST /api/admin/estudiantes
const crearEstudiante = async (req, res) => {
  const {
    nombre, correo, password,
    carrera, semestre, descripcion
  } = req.body;

  const error = validarDatos(req.body);

  if (error) {
    return res.status(400).json({ mensaje: error });
  }

  if (
    typeof password !== "string" ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return res.status(400).json({
      mensaje: "La contraseña debe tener entre 8 y 72 bytes"
    });
  }

  if (
    descripcion != null &&
    typeof descripcion !== "string"
  ) {
    return res.status(400).json({
      mensaje: "Descripción inválida"
    });
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const hash = await bcrypt.hash(password, 12);

    const usuario = await cliente.query(
      `INSERT INTO usuarios
       (nombre, correo, password_hash, rol, activo)
       VALUES ($1, $2, $3, 'estudiante', TRUE)
       RETURNING id_usuario`,
      [nombre.trim(), correo.trim().toLowerCase(), hash]
    );

    const estudiante = await cliente.query(
      `INSERT INTO estudiantes
       (id_usuario, carrera, semestre, descripcion)
       VALUES ($1, $2, $3, $4)
       RETURNING id_estudiante`,
      [
        usuario.rows[0].id_usuario,
        carrera?.trim() || null,
        semestre === "" || semestre == null
          ? null : Number(semestre),
        descripcion?.trim() || null
      ]
    );

    await cliente.query("COMMIT");

    return res.status(201).json({
      mensaje: "Estudiante registrado correctamente",
      id_estudiante: estudiante.rows[0].id_estudiante
    });
  } catch (error) {
    await cliente.query("ROLLBACK");
    console.error("Error al crear estudiante:", error);

    return res.status(error.code === "23505" ? 409 : 500).json({
      mensaje: error.code === "23505"
        ? "El correo ya está registrado"
        : "No se pudo registrar al estudiante"
    });
  } finally {
    cliente.release();
  }
};

// PUT /api/admin/estudiantes/:id
const actualizarEstudiante = async (req, res) => {
  const {
    nombre, correo, carrera, semestre, descripcion
  } = req.body;

  if (!idValido(req.params.id)) {
    return res.status(400).json({ mensaje: "ID inválido" });
  }

  const error = validarDatos(req.body);
  if (error) return res.status(400).json({ mensaje: error });

  if (
    descripcion != null &&
    typeof descripcion !== "string"
  ) {
    return res.status(400).json({
      mensaje: "Descripción inválida"
    });
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const estudiante = await cliente.query(
      `SELECT id_usuario FROM estudiantes
       WHERE id_estudiante = $1 FOR UPDATE`,
      [req.params.id]
    );

    if (!estudiante.rowCount) {
      await cliente.query("ROLLBACK");
      return res.status(404).json({
        mensaje: "Estudiante no encontrado"
      });
    }

    const idUsuario = estudiante.rows[0].id_usuario;

    await cliente.query(
      `UPDATE usuarios
       SET nombre = $1, correo = $2
       WHERE id_usuario = $3`,
      [nombre.trim(), correo.trim().toLowerCase(), idUsuario]
    );

    await cliente.query(
      `UPDATE estudiantes
       SET carrera = $1,
           semestre = $2,
           descripcion = $3
       WHERE id_estudiante = $4`,
      [
        carrera?.trim() || null,
        semestre === "" || semestre == null
          ? null : Number(semestre),
        descripcion?.trim() || null,
        req.params.id
      ]
    );

    await cliente.query("COMMIT");

    return res.json({
      mensaje: "Estudiante actualizado correctamente"
    });
  } catch (error) {
    await cliente.query("ROLLBACK");
    console.error("Error al actualizar estudiante:", error);

    return res.status(error.code === "23505" ? 409 : 500).json({
      mensaje: error.code === "23505"
        ? "El correo ya pertenece a otra cuenta"
        : "No se pudo actualizar al estudiante"
    });
  } finally {
    cliente.release();
  }
};

// PATCH /api/admin/estudiantes/:id/estado
const cambiarEstadoEstudiante = async (req, res) => {
  if (!idValido(req.params.id) ||
      typeof req.body.activo !== "boolean") {
    return res.status(400).json({
      mensaje: "Datos inválidos"
    });
  }

  try {
    const resultado = await pool.query(
      `UPDATE usuarios u
       SET activo = $1
       FROM estudiantes e
       WHERE e.id_usuario = u.id_usuario
         AND e.id_estudiante = $2
         AND u.rol = 'estudiante'
       RETURNING u.id_usuario, u.activo`,
      [req.body.activo, req.params.id]
    );

    if (!resultado.rowCount) {
      return res.status(404).json({
        mensaje: "Estudiante no encontrado"
      });
    }

    return res.json({
      mensaje: "Estado actualizado correctamente"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      mensaje: "No se pudo cambiar el estado"
    });
  }
};

// DELETE /api/admin/estudiantes/:id
const eliminarEstudiante = async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({ mensaje: "ID inválido" });
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const estudiante = await cliente.query(
      `SELECT id_usuario FROM estudiantes
       WHERE id_estudiante = $1 FOR UPDATE`,
      [req.params.id]
    );

    if (!estudiante.rowCount) {
      await cliente.query("ROLLBACK");
      return res.status(404).json({
        mensaje: "Estudiante no encontrado"
      });
    }

    // No borrar el historial de postulaciones
    const postulaciones = await cliente.query(
      `SELECT COUNT(*) AS total
       FROM postulaciones
       WHERE id_estudiante = $1`,
      [req.params.id]
    );

    if (Number(postulaciones.rows[0].total) > 0) {
      await cliente.query("ROLLBACK");
      return res.status(409).json({
        mensaje:
          "Este estudiante tiene postulaciones. " +
          "Desactiva su cuenta para conservar el historial."
      });
    }

    // La relación estudiante_habilidad tiene ON DELETE CASCADE
    await cliente.query(
      `DELETE FROM estudiantes WHERE id_estudiante = $1`,
      [req.params.id]
    );

    await cliente.query(
      `DELETE FROM usuarios
       WHERE id_usuario = $1 AND rol = 'estudiante'`,
      [estudiante.rows[0].id_usuario]
    );

    await cliente.query("COMMIT");

    return res.json({
      mensaje: "Estudiante eliminado correctamente"
    });
  } catch (error) {
    await cliente.query("ROLLBACK");
    console.error("Error al eliminar estudiante:", error);

    return res.status(500).json({
      mensaje: "No se pudo eliminar al estudiante"
    });
  } finally {
    cliente.release();
  }
};

module.exports = {
  listarEstudiantes,
  obtenerEstudiante,
  crearEstudiante,
  actualizarEstudiante,
  cambiarEstadoEstudiante,
  eliminarEstudiante
};
