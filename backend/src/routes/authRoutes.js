const express = require("express");
const router = express.Router();

const {
  login,
  registrarEstudiante,
  registrarEmpresa,
  obtenerSectores
} = require("../controllers/authController");

router.post("/login", login);
router.post("/registro", registrarEstudiante);
router.post("/registro-empresa", registrarEmpresa);
// Lista de sectores (giros) para el registro de empresas
router.get("/sectores", obtenerSectores);

module.exports = router;