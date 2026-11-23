const express = require("express");
const router = express.Router();

const {
  login,
  registrarEstudiante,
  registrarEmpresa,
  obtenerSectores,
  obtenerCarreras
} = require("../controllers/authController");

router.post("/login", login);
router.post("/registro", registrarEstudiante);
router.post("/registro-empresa", registrarEmpresa);
// Lista de sectores (giros) para el registro de empresas
router.get("/sectores", obtenerSectores);
// Lista de carreras para el registro de estudiantes
router.get("/carreras", obtenerCarreras);

module.exports = router;