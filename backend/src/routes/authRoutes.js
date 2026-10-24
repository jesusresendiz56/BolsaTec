const express = require("express");
const router = express.Router();

const {
  login,
  registrarEstudiante,
  registrarEmpresa
} = require("../controllers/authController");

router.post("/login", login);
router.post("/registro", registrarEstudiante);
router.post("/registro-empresa", registrarEmpresa);

module.exports = router;