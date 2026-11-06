
const express = require("express");
const router = express.Router();

const {
  verificarToken
} = require("../middleware/authMiddleware");

const {
  obtenerEstadisticas,
  obtenerPerfil,
  actualizarPerfil,
  obtenerVacantes
} = require("../controllers/estudianteController");

const {
  subirCurriculum,
  obtenerCurriculum
} = require("../controllers/curriculumController");

const subirPDF = require("../middleware/uploadCurriculum");

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

// ========================================
// CURRÍCULUM DEL ESTUDIANTE
// ========================================

// Subir o reemplazar currículum PDF
router.post("/curriculum", subirPDF, subirCurriculum);

// Consultar currículum PDF
router.get("/curriculum", obtenerCurriculum);

// ========================================
// BUSCAR VACANTES
// ========================================

// Consultar vacantes activas y aplicar filtros
router.get("/vacantes", obtenerVacantes);

module.exports = router;
