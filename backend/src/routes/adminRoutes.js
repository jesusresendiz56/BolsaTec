
const express = require("express");
const router = express.Router();

const {
  verificarToken,
  soloAdministrador
} = require("../middleware/authMiddleware");

const {
  obtenerEstadisticas,
  obtenerUsuarios,
  cambiarEstadoUsuario
} = require("../controllers/adminController");

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
