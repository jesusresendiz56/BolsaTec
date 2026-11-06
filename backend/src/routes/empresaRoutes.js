
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

const soloEmpresa = (req, res, next) => {
  if (req.usuario?.rol !== "empresa") {
    return res.status(403).json({
      mensaje: "Acceso permitido únicamente a empresas"
    });
  }

  next();
};

router.use(verificarToken, soloEmpresa);

// Estadísticas
router.get("/estadisticas", obtenerEstadisticas);

// Perfil empresarial
router.get("/perfil", obtenerPerfil);
router.put("/perfil", actualizarPerfil);

// CRUD de vacantes
router.get("/vacantes", obtenerVacantes);
router.post("/vacantes", crearVacante);
router.put("/vacantes/:id", editarVacante);
router.patch("/vacantes/:id/estado", cambiarEstadoVacante);
router.delete("/vacantes/:id", eliminarVacante);

module.exports = router;
