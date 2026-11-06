
const express = require("express");
const router = express.Router();

const {
  verificarToken
} = require("../middleware/authMiddleware");

const {
  obtenerEstadisticas
} = require("../controllers/empresaController");

// Verificar que el usuario sea una empresa
const soloEmpresa = (req, res, next) => {
  if (req.usuario?.rol !== "empresa") {
    return res.status(403).json({
      mensaje: "Acceso permitido únicamente a empresas"
    });
  }

  next();
};

// Proteger las rutas empresariales
router.use(verificarToken, soloEmpresa);

// Estadísticas reales
router.get("/estadisticas", obtenerEstadisticas);

module.exports = router;
