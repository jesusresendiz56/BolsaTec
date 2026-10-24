
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

// Verificar el token JWT
const verificarToken = async (req, res, next) => {
  try {
    const autorizacion = req.headers.authorization;

    if (!autorizacion || !autorizacion.startsWith("Bearer ")) {
      return res.status(401).json({
        mensaje: "Debes iniciar sesión"
      });
    }

    const token = autorizacion.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        mensaje: "Token no proporcionado"
      });
    }

    const datos = jwt.verify(token, process.env.JWT_SECRET);

    // Comprobar que el usuario todavía existe y está activo
    const resultado = await pool.query(
      `SELECT id_usuario, rol, activo
       FROM usuarios
       WHERE id_usuario = $1`,
      [datos.id_usuario]
    );

    if (resultado.rows.length === 0 || !resultado.rows[0].activo) {
      return res.status(401).json({
        mensaje: "La cuenta no existe o está desactivada"
      });
    }

    req.usuario = {
      id_usuario: resultado.rows[0].id_usuario,
      rol: resultado.rows[0].rol
    };

    next();

  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        mensaje: "Tu sesión ha expirado"
      });
    }

    if (error.name === "JsonWebTokenError" ||
        error.name === "NotBeforeError") {
      return res.status(401).json({
        mensaje: "Token inválido"
      });
    }

    console.error("Error al verificar autenticación:", error);

    return res.status(500).json({
      mensaje: "Error interno de autenticación"
    });
  }
};

// Comprobar permisos de administrador
const soloAdministrador = (req, res, next) => {
  if (req.usuario?.rol !== "administrador") {
    return res.status(403).json({
      mensaje: "No tienes permisos de administrador"
    });
  }

  next();
};

module.exports = {
  verificarToken,
  soloAdministrador
};
