
const authService = require("../services/authService");

const login = async (req, res) => {
  try {
    const { correo, password } = req.body;

    if (
      typeof correo !== "string" ||
      typeof password !== "string" ||
      !correo.trim() ||
      !password
    ) {
      return res.status(400).json({
        mensaje: "Correo y contraseña son obligatorios"
      });
    }

    const resultado = await authService.login(
      correo.trim(),
      password
    );

    if (!resultado) {
      return res.status(401).json({
        mensaje: "Credenciales incorrectas"
      });
    }

    res.json(resultado);

  } catch (error) {
    console.error("Error en login:", error);

    res.status(500).json({
      mensaje: "Error interno del servidor"
    });
  }
};

module.exports = { login };
