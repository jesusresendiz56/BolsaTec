
const express = require("express");
const router = express.Router();

const {
  verificarToken
} = require("../middleware/authMiddleware");

const {
  obtenerEstadisticas,
  obtenerPerfil,
  actualizarPerfil
} = require("../controllers/estudianteController");

// ========================================
// PERMITIR ÚNICAMENTE ESTUDIANTES
// ========================================

const soloEstudiante = (req, res, next) => {
  if (req.usuario?.rol !== "estudiante") {
    return res.status(403).json({
      mensaje: "Acceso permitido únicamente a estudiantes"
    });
  }

  next();
};

// ========================================
// PROTEGER TODAS LAS RUTAS
// ========================================

router.use(verificarToken, soloEstudiante);

// ========================================
// DASHBOARD DEL ESTUDIANTE
// ========================================

router.get("/estadisticas", obtenerEstadisticas);

// ========================================
// PERFIL DEL ESTUDIANTE
// ========================================

router.get("/perfil", obtenerPerfil);
router.put("/perfil", actualizarPerfil);

module.exports = router;
