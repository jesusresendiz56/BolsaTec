
const authService = require("../services/authService");

// ======================================
// INICIO DE SESIÓN
// ======================================

const login = async (req, res) => {
  try {
    const { correo, password } = req.body;

    if (
      typeof correo !== "string" ||
      typeof password !== "string" ||
      !correo.trim() ||
      !password
    ) {
      return res.status(400).json({
        mensaje: "Correo y contraseña son obligatorios"
      });
    }

    const resultado = await authService.login(
      correo.trim(),
      password
    );

    if (!resultado) {
      return res.status(401).json({
        mensaje: "Credenciales incorrectas"
      });
    }

    return res.json(resultado);

  } catch (error) {
    console.error("Error en login:", error);

    return res.status(500).json({
      mensaje: "Error interno del servidor"
    });
  }
};

// ======================================
// REGISTRO DE ESTUDIANTES
// ======================================

const registrarEstudiante = async (req, res) => {
  try {
    const {
      nombre,
      correo,
      password,
      carrera,
      semestre
    } = req.body;

    // Validar datos obligatorios
    if (
      typeof nombre !== "string" ||
      !nombre.trim() ||
      typeof correo !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim()) ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        mensaje:
          "Ingresa nombre, correo válido y una contraseña de al menos 8 caracteres"
      });
    }

    // Validar carrera
    if (
      carrera !== undefined &&
      carrera !== null &&
      typeof carrera !== "string"
    ) {
      return res.status(400).json({
        mensaje: "La carrera debe ser un texto válido"
      });
    }

    // Convertir semestre a número
    const semestreNumero =
      semestre === "" ||
      semestre === undefined ||
      semestre === null
        ? null
        : Number(semestre);

    // Validar semestre
    if (
      semestreNumero !== null &&
      (
        !Number.isInteger(semestreNumero) ||
        semestreNumero < 1 ||
        semestreNumero > 15
      )
    ) {
      return res.status(400).json({
        mensaje: "El semestre debe estar entre 1 y 15"
      });
    }

    // Registrar estudiante en Supabase
    const resultado = await authService.registrarEstudiante({
      nombre: nombre.trim(),
      correo: correo.trim().toLowerCase(),
      password,
      carrera:
        typeof carrera === "string"
          ? carrera.trim() || null
          : null,
      semestre: semestreNumero
    });

    return res.status(201).json(resultado);

  } catch (error) {
    console.error("Error en registro:", error);

    // Correo duplicado
    if (error.code === "23505") {
      return res.status(409).json({
        mensaje: "El correo electrónico ya está registrado"
      });
    }

    return res.status(500).json({
      mensaje: "Error interno al registrar al estudiante"
    });
  }
};

const registrarEmpresa = async (req, res) => {
  try {
    const {
      nombre,
      correo,
      password,
      nombre_empresa,
      telefono,
      sector
    } = req.body;

    if (
      typeof nombre !== "string" ||
      !nombre.trim() ||
      typeof nombre_empresa !== "string" ||
      !nombre_empresa.trim() ||
      typeof correo !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim()) ||
      typeof password !== "string" ||
      password.length < 8 ||
      typeof telefono !== "string" ||
      !telefono.trim() ||
      typeof sector !== "string" ||
      !sector.trim()
    ) {
      return res.status(400).json({
        mensaje: "Completa correctamente todos los campos. La contraseña debe tener al menos 8 caracteres."
      });
    }

    const resultado = await authService.registrarEmpresa({
      nombre: nombre.trim(),
      correo: correo.trim(),
      password,
      nombre_empresa: nombre_empresa.trim(),
      telefono: telefono.trim(),
      sector: sector.trim()
    });

    return res.status(201).json(resultado);

  } catch (error) {
    console.error("Error en registro de empresa:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        mensaje: "El correo electrónico ya está registrado"
      });
    }

    return res.status(500).json({
      mensaje: "No se pudo registrar la empresa"
    });
  }
};

// ======================================
// EXPORTAR CONTROLADORES
// ======================================

module.exports = {
  login,
  registrarEstudiante,
  registrarEmpresa
};