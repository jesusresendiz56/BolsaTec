
const express = require("express");
const router = express.Router();

const {
  verificarToken,
  soloAdministrador
} = require("../middleware/authMiddleware");

const {
  obtenerEstadisticas
} = require("../controllers/adminController");

// Proteger todas las rutas administrativas
router.use(verificarToken, soloAdministrador);

// Estadísticas del dashboard
router.get("/estadisticas", obtenerEstadisticas);

module.exports = router;
