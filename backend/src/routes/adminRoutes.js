const express = require("express");
const router = express.Router();

const {
  verificarToken,
  soloAdministrador
} = require("../middleware/authMiddleware");

const {
  listarEstudiantes,
  obtenerEstudiante,
  crearEstudiante,
  actualizarEstudiante,
  cambiarEstadoEstudiante,
  eliminarEstudiante
} = require("../controllers/adminEstudiantesController");

const {
  listarEmpresas,
  obtenerEmpresa,
  crearEmpresa,
  actualizarEmpresa,
  cambiarVerificacion,
  cambiarEstadoEmpresa,
  eliminarEmpresa
} = require("../controllers/adminEmpresasController");

const {
  listarVacantes,
  obtenerVacante,
  cambiarEstadoVacante,
  eliminarVacante
} = require("../controllers/adminVacantesController");

const {
  listarPostulaciones,
  cambiarEstadoPostulacion,
  eliminarPostulacion
} = require("../controllers/adminPostulacionesController");


const {
  obtenerEstadisticas,
  obtenerUsuarios,
  cambiarEstadoUsuario
} = require("../controllers/adminController");

// ========================================
// PROTEGER TODAS LAS RUTAS ADMINISTRATIVAS
// (debe ir antes de cualquier ruta)
// ========================================

router.use(verificarToken, soloAdministrador);

// Estadísticas
router.get("/estadisticas", obtenerEstadisticas);

// Usuarios
router.get("/usuarios", obtenerUsuarios);
router.patch("/usuarios/:id/estado", cambiarEstadoUsuario);

// CRUD de estudiantes
router.get("/estudiantes", listarEstudiantes);
router.get("/estudiantes/:id", obtenerEstudiante);
router.post("/estudiantes", crearEstudiante);
router.put("/estudiantes/:id", actualizarEstudiante);
router.patch("/estudiantes/:id/estado", cambiarEstadoEstudiante);
router.delete("/estudiantes/:id", eliminarEstudiante);

// CRUD de empresas
router.get("/empresas", listarEmpresas);
router.get("/empresas/:id", obtenerEmpresa);
router.post("/empresas", crearEmpresa);
router.put("/empresas/:id", actualizarEmpresa);
router.patch("/empresas/:id/verificar", cambiarVerificacion);
router.patch("/empresas/:id/estado", cambiarEstadoEmpresa);
router.delete("/empresas/:id", eliminarEmpresa);

// Supervisión de vacantes
router.get("/vacantes", listarVacantes);
router.get("/vacantes/:id", obtenerVacante);
router.patch("/vacantes/:id/estado", cambiarEstadoVacante);
router.delete("/vacantes/:id", eliminarVacante);

// Postulaciones
router.get("/postulaciones", listarPostulaciones);
router.patch("/postulaciones/:id/estado", cambiarEstadoPostulacion);
router.delete("/postulaciones/:id", eliminarPostulacion);

module.exports = router;
