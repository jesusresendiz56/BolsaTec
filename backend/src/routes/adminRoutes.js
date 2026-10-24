
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
  obtenerEstadisticas,
  obtenerUsuarios,
  cambiarEstadoUsuario
} = require("../controllers/adminController");


// CRUD de estudiantes
router.get("/estudiantes", listarEstudiantes);

router.get("/estudiantes/:id", obtenerEstudiante);

router.post("/estudiantes", crearEstudiante);

router.put("/estudiantes/:id", actualizarEstudiante);

router.patch(
  "/estudiantes/:id/estado",
  cambiarEstadoEstudiante
);

router.delete("/estudiantes/:id", eliminarEstudiante);


// CRUD DE EMPRESAS

router.get("/empresas", listarEmpresas);

router.get("/empresas/:id", obtenerEmpresa);

router.post("/empresas", crearEmpresa);

router.put("/empresas/:id", actualizarEmpresa);

router.patch(
  "/empresas/:id/verificar",
  cambiarVerificacion
);

router.patch(
  "/empresas/:id/estado",
  cambiarEstadoEmpresa
);

router.delete("/empresas/:id", eliminarEmpresa);

// Proteger todas las rutas administrativas
router.use(verificarToken, soloAdministrador);

// Estadísticas
router.get("/estadisticas", obtenerEstadisticas);

// Usuarios
router.get("/usuarios", obtenerUsuarios);

// Activar o desactivar usuario
router.patch(
  "/usuarios/:id/estado",
  cambiarEstadoUsuario
);

module.exports = router;
