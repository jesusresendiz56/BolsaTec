
require("dotenv").config();

const bcrypt = require("bcrypt");
const pool = require("../src/config/database");

async function crearAdministrador() {
  try {
    const nombre = process.env.ADMIN_NOMBRE;
    const correo = process.env.ADMIN_CORREO;
    const password = process.env.ADMIN_PASSWORD;

    if (
      !nombre ||
      !correo ||
      !password ||
      password.length < 12
    ) {
      throw new Error(
        "Configura ADMIN_NOMBRE, ADMIN_CORREO y ADMIN_PASSWORD (mínimo 12 caracteres)"
      );
    }

    const existe = await pool.query(
      `SELECT id_usuario
       FROM usuarios
       WHERE LOWER(correo) = LOWER($1)`,
      [correo.trim()]
    );

    if (existe.rows.length > 0) {
      console.log("Ya existe una cuenta con ese correo.");
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const resultado = await pool.query(
      `INSERT INTO usuarios
       (nombre, correo, password_hash, rol, activo)
       VALUES ($1, $2, $3, 'administrador', TRUE)
       RETURNING id_usuario, nombre, correo, rol`,
      [
        nombre.trim(),
        correo.trim().toLowerCase(),
        passwordHash
      ]
    );

    console.log(
      "Administrador creado correctamente:",
      resultado.rows[0]
    );

  } catch (error) {
    console.error("Error al crear administrador:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

crearAdministrador();
