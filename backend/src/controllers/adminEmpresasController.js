
const pool = require("../config/database");
const bcrypt = require("bcrypt");

const CONSULTA = `
  SELECT
    e.id_empresa,
    e.id_usuario,
    e.nombre_empresa,
    e.descripcion,
    e.ubicacion,
    e.verificada,
    u.nombre AS representante,
    u.correo,
    u.activo
  FROM empresas e
  INNER JOIN usuarios u
    ON u.id_usuario = e.id_usuario
`;

const idValido = (id) =>
  /^[1-9]\d*$/.test(String(id)) &&
  Number.isSafeInteger(Number(id));

function validarEmpresa(datos, crear = false) {
  const {
    representante,
    nombre_empresa,
    correo,
    password,
    descripcion,
    ubicacion
  } = datos;

  if (
    typeof representante !== "string" ||
    !representante.trim() ||
    representante.trim().length > 150
  ) return "Nombre del representante inválido";

  if (
    typeof nombre_empresa !== "string" ||
    !nombre_empresa.trim() ||
    nombre_empresa.trim().length > 200
  ) return "Nombre de empresa inválido";

  if (
    typeof correo !== "string" ||
    correo.length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())
  ) return "Correo electrónico inválido";

  if (
    descripcion != null &&
    typeof descripcion !== "string"
  ) return "Descripción inválida";

  if (
    ubicacion != null &&
    (typeof ubicacion !== "string" ||
      ubicacion.length > 255)
  ) return "Ubicación inválida";

  if (crear && (
    typeof password !== "string" ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  )) return "La contraseña debe tener entre 8 y 72 bytes";

  return null;
}

// CONSULTAR EMPRESAS
const listarEmpresas = async (req, res) => {
  try {
    const resultado = await pool.query(
      `${CONSULTA} ORDER BY e.id_empresa DESC`
    );

    return res.json(resultado.rows);
  } catch (error) {
    console.error("Error al consultar empresas:", error);

    return res.status(500).json({
      mensaje: "No se pudieron consultar las empresas"
    });
  }
};

// CONSULTAR UNA EMPRESA
const obtenerEmpresa = async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({ mensaje: "ID inválido" });
  }

  try {
    const resultado = await pool.query(
      `${CONSULTA} WHERE e.id_empresa = $1`,
      [req.params.id]
    );

    if (!resultado.rowCount) {
      return res.status(404).json({
        mensaje: "Empresa no encontrada"
      });
    }

    return res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      mensaje: "No se pudo consultar la empresa"
    });
  }
};

// CREAR EMPRESA
const crearEmpresa = async (req, res) => {
  const error = validarEmpresa(req.body, true);

  if (error) {
    return res.status(400).json({ mensaje: error });
  }

  const {
    representante,
    nombre_empresa,
    correo,
    password,
    descripcion,
    ubicacion
  } = req.body;

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const passwordHash = await bcrypt.hash(password, 12);

    const usuario = await cliente.query(
      `INSERT INTO usuarios
       (nombre, correo, password_hash, rol, activo)
       VALUES ($1, $2, $3, 'empresa', TRUE)
       RETURNING id_usuario`,
      [
        representante.trim(),
        correo.trim().toLowerCase(),
        passwordHash
      ]
    );

    const empresa = await cliente.query(
      `INSERT INTO empresas
       (id_usuario, nombre_empresa, descripcion,
        ubicacion, verificada)
       VALUES ($1, $2, $3, $4, FALSE)
       RETURNING id_empresa`,
      [
        usuario.rows[0].id_usuario,
        nombre_empresa.trim(),
        descripcion?.trim() || null,
        ubicacion?.trim() || null
      ]
    );

    await cliente.query("COMMIT");

    return res.status(201).json({
      mensaje: "Empresa registrada correctamente",
      id_empresa: empresa.rows[0].id_empresa
    });

  } catch (error) {
    await cliente.query("ROLLBACK");
    console.error("Error al crear empresa:", error);

    return res.status(error.code === "23505" ? 409 : 500).json({
      mensaje: error.code === "23505"
        ? "El correo ya está registrado"
        : "No se pudo registrar la empresa"
    });
  } finally {
    cliente.release();
  }
};

// ACTUALIZAR EMPRESA
const actualizarEmpresa = async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({ mensaje: "ID inválido" });
  }

  const error = validarEmpresa(req.body);

  if (error) {
    return res.status(400).json({ mensaje: error });
  }

  const {
    representante,
    nombre_empresa,
    correo,
    descripcion,
    ubicacion
  } = req.body;

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const existente = await cliente.query(
      `SELECT id_usuario FROM empresas
       WHERE id_empresa = $1 FOR UPDATE`,
      [req.params.id]
    );

    if (!existente.rowCount) {
      await cliente.query("ROLLBACK");
      return res.status(404).json({
        mensaje: "Empresa no encontrada"
      });
    }

    await cliente.query(
      `UPDATE usuarios
       SET nombre = $1, correo = $2
       WHERE id_usuario = $3`,
      [
        representante.trim(),
        correo.trim().toLowerCase(),
        existente.rows[0].id_usuario
      ]
    );

    await cliente.query(
      `UPDATE empresas
       SET nombre_empresa = $1,
           descripcion = $2,
           ubicacion = $3
       WHERE id_empresa = $4`,
      [
        nombre_empresa.trim(),
        descripcion?.trim() || null,
        ubicacion?.trim() || null,
        req.params.id
      ]
    );

    await cliente.query("COMMIT");

    return res.json({
      mensaje: "Empresa actualizada correctamente"
    });

  } catch (error) {
    await cliente.query("ROLLBACK");
    console.error("Error al actualizar empresa:", error);

    return res.status(error.code === "23505" ? 409 : 500).json({
      mensaje: error.code === "23505"
        ? "El correo pertenece a otra cuenta"
        : "No se pudo actualizar la empresa"
    });
  } finally {
    cliente.release();
  }
};

// VERIFICAR O REVOCAR VERIFICACIÓN
const cambiarVerificacion = async (req, res) => {
  if (
    !idValido(req.params.id) ||
    typeof req.body.verificada !== "boolean"
  ) {
    return res.status(400).json({
      mensaje: "Datos inválidos"
    });
  }

  try {
    const resultado = await pool.query(
      `UPDATE empresas
       SET verificada = $1
       WHERE id_empresa = $2
       RETURNING id_empresa, nombre_empresa, verificada`,
      [req.body.verificada, req.params.id]
    );

    if (!resultado.rowCount) {
      return res.status(404).json({
        mensaje: "Empresa no encontrada"
      });
    }

    return res.json({
      mensaje: "Verificación actualizada correctamente",
      empresa: resultado.rows[0]
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      mensaje: "No se pudo actualizar la verificación"
    });
  }
};

// ACTIVAR O DESACTIVAR CUENTA
const cambiarEstadoEmpresa = async (req, res) => {
  if (
    !idValido(req.params.id) ||
    typeof req.body.activo !== "boolean"
  ) {
    return res.status(400).json({
      mensaje: "Datos inválidos"
    });
  }

  try {
    const resultado = await pool.query(
      `UPDATE usuarios u
       SET activo = $1
       FROM empresas e
       WHERE e.id_usuario = u.id_usuario
         AND e.id_empresa = $2
         AND u.rol = 'empresa'
       RETURNING u.id_usuario, u.activo`,
      [req.body.activo, req.params.id]
    );

    if (!resultado.rowCount) {
      return res.status(404).json({
        mensaje: "Empresa no encontrada"
      });
    }

    return res.json({
      mensaje: "Estado actualizado correctamente"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      mensaje: "No se pudo actualizar el estado"
    });
  }
};

// ELIMINAR EMPRESA
const eliminarEmpresa = async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({ mensaje: "ID inválido" });
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const existente = await cliente.query(
      `SELECT id_usuario FROM empresas
       WHERE id_empresa = $1 FOR UPDATE`,
      [req.params.id]
    );

    if (!existente.rowCount) {
      await cliente.query("ROLLBACK");
      return res.status(404).json({
        mensaje: "Empresa no encontrada"
      });
    }

    const vacantes = await cliente.query(
      `SELECT COUNT(*) AS total
       FROM vacantes
       WHERE id_empresa = $1`,
      [req.params.id]
    );

    if (Number(vacantes.rows[0].total) > 0) {
      await cliente.query("ROLLBACK");

      return res.status(409).json({
        mensaje:
          "Esta empresa tiene vacantes registradas. " +
          "Desactiva su cuenta para conservar el historial."
      });
    }

    await cliente.query(
      `DELETE FROM empresas WHERE id_empresa = $1`,
      [req.params.id]
    );

    await cliente.query(
      `DELETE FROM usuarios
       WHERE id_usuario = $1 AND rol = 'empresa'`,
      [existente.rows[0].id_usuario]
    );

    await cliente.query("COMMIT");

    return res.json({
      mensaje: "Empresa eliminada correctamente"
    });

  } catch (error) {
    await cliente.query("ROLLBACK");
    console.error("Error al eliminar empresa:", error);

    return res.status(500).json({
      mensaje: "No se pudo eliminar la empresa"
    });
  } finally {
    cliente.release();
  }
};

module.exports = {
  listarEmpresas,
  obtenerEmpresa,
  crearEmpresa,
  actualizarEmpresa,
  cambiarVerificacion,
  cambiarEstadoEmpresa,
  eliminarEmpresa
};

