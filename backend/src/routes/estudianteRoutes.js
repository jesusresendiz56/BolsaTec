
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

const {
  crearPostulacion,
  obtenerPostulaciones,
  cancelarPostulacion
} = require("../controllers/postulacionController");

const {
  obtenerNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas
} = require("../controllers/notificacionController");

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

router.post("/curriculum", subirPDF, subirCurriculum);
router.get("/curriculum", obtenerCurriculum);

// ========================================
// BUSCAR VACANTES
// ========================================

router.get("/vacantes", obtenerVacantes);

// ========================================
// POSTULACIONES DEL ESTUDIANTE
// ========================================

router.post("/postulaciones", crearPostulacion);
router.get("/postulaciones", obtenerPostulaciones);
router.delete("/postulaciones/:id", cancelarPostulacion);

// ========================================
// NOTIFICACIONES DEL ESTUDIANTE
// ========================================

// Consultar notificaciones
router.get("/notificaciones", obtenerNotificaciones);

// Marcar todas como leídas
router.patch("/notificaciones/leer-todas", marcarTodasLeidas);

// Marcar una notificación como leída
router.patch(
  "/notificaciones/:id/leer",
  marcarNotificacionLeida
);

module.exports = router;
