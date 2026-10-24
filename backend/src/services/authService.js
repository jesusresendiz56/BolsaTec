
const pool = require("../config/database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const login = async (correo, password) => {
  // Buscar usuario por correo
  const resultado = await pool.query(
    `SELECT id_usuario, nombre, correo,
            password_hash, rol, activo
     FROM usuarios
     WHERE LOWER(correo) = LOWER($1)
     LIMIT 1`,
    [correo]
  );

  if (resultado.rows.length === 0) {
    return null;
  }

  const usuario = resultado.rows[0];

  // Verificar que la cuenta esté activa
  if (!usuario.activo) {
    return null;
  }

  // Comparar contraseña con bcrypt
  const passwordValida = await bcrypt.compare(
    password,
    usuario.password_hash
  );

  if (!passwordValida) {
    return null;
  }

  // Generar token JWT
  const token = jwt.sign(
    {
      id_usuario: usuario.id_usuario,
      rol: usuario.rol
    },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );

  return {
    mensaje: "Inicio de sesión exitoso",
    token,
    usuario: {
      id_usuario: usuario.id_usuario,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol
    }
  };
};

module.exports = { login };
