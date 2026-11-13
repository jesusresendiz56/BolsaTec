
const express = require("express");
const router = express.Router();

const {
  verificarToken
} = require("../middleware/authMiddleware");

const {
  obtenerEstadisticas,
  obtenerVacantes,
  crearVacante,
  editarVacante,
  cambiarEstadoVacante,
  eliminarVacante,
  obtenerPerfil,
  actualizarPerfil
} = require("../controllers/empresaController");

const {
  obtenerPostulacionesEmpresa,
  obtenerCandidatos,
  obtenerDetalleCandidato,
  cambiarEstadoCandidato,
  obtenerCurriculumCandidato
} = require("../controllers/candidatoController");

// ========================================
// PERMITIR ÚNICAMENTE EMPRESAS
// ========================================

const soloEmpresa = (req, res, next) => {
  if (req.usuario?.rol !== "empresa") {
    return res.status(403).json({
      mensaje: "Acceso permitido únicamente a empresas"
    });
  }

  next();
};

// ========================================
// PROTEGER TODAS LAS RUTAS
// ========================================

router.use(verificarToken, soloEmpresa);

// ========================================
// ESTADÍSTICAS
// ========================================

router.get("/estadisticas", obtenerEstadisticas);

// ========================================
// PERFIL EMPRESARIAL
// ========================================

router.get("/perfil", obtenerPerfil);
router.put("/perfil", actualizarPerfil);

// ========================================
// CRUD DE VACANTES
// ========================================

router.get("/vacantes", obtenerVacantes);
router.post("/vacantes", crearVacante);
router.put("/vacantes/:id", editarVacante);
router.patch("/vacantes/:id/estado", cambiarEstadoVacante);
router.delete("/vacantes/:id", eliminarVacante);

// ========================================
// MÓDULO DE CANDIDATOS
// ========================================

// Consultar todos los candidatos de la empresa
router.get("/candidatos", obtenerCandidatos);

// Consultar detalle de una postulación
router.get("/candidatos/:id", obtenerDetalleCandidato);

// Actualizar estado de una postulación
router.patch(
  "/candidatos/:id/estado",
  cambiarEstadoCandidato
);

// Consultar currículum PDF del candidato
router.get(
  "/candidatos/:id/curriculum",
  obtenerCurriculumCandidato
);

// ========================================
// MÓDULO DE POSTULACIONES
// ========================================

// Consultar postulaciones agrupadas por vacante
router.get("/postulaciones", obtenerPostulacionesEmpresa);

// Actualizar estado de una postulación
router.patch(
  "/postulaciones/:id/estado",
  cambiarEstadoCandidato
);

// Consultar currículum PDF del postulante
router.get(
  "/postulaciones/:id/curriculum",
  obtenerCurriculumCandidato
);

module.exports = router;
