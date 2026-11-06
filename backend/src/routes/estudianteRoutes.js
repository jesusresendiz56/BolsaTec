
const express = require("express");
const router = express.Router();

const {
  verificarToken
} = require("../middleware/authMiddleware");

const {
  obtenerEstadisticas
} = require("../controllers/estudianteController");

// Permitir únicamente estudiantes
const soloEstudiante = (req, res, next) => {
  if (req.usuario?.rol !== "estudiante") {
    return res.status(403).json({
      mensaje: "Acceso permitido únicamente a estudiantes"
    });
  }

  next();
};

// Proteger las rutas
router.use(verificarToken, soloEstudiante);

// Estadísticas del dashboard
router.get("/estadisticas", obtenerEstadisticas);

module.exports = router;
