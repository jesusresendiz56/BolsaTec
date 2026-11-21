// ========================================
// CATÁLOGO DE CARRERAS PARA LAS PRUEBAS DE CONOCIMIENTOS
// La empresa escribe una prueba general por carrera.
// La carrera del estudiante es texto libre, así que se
// relaciona con el catálogo por palabras clave.
// ========================================

const CARRERAS = [
  {
    clave: "sistemas",
    nombre: "Sistemas, TIC e Informática",
    palabras: [
      "sistemas", "informatica", "computacion", "computacionales",
      "tecnologias de la informacion", "tic", "tics", "software",
      "ciencia de datos", "ciberseguridad", "programacion",
    ],
  },
  {
    clave: "electronica",
    nombre: "Electrónica, Eléctrica y Mecatrónica",
    palabras: [
      "electronica", "electrica", "mecatronica", "electromecanica",
      "automatizacion", "robotica", "telecomunicaciones",
    ],
  },
  {
    clave: "mecanica",
    nombre: "Mecánica y Manufactura",
    palabras: ["mecanica", "manufactura", "automotriz", "aeronautica", "materiales"],
  },
  {
    clave: "civil",
    nombre: "Civil y Arquitectura",
    palabras: ["civil", "arquitectura", "construccion", "topografia"],
  },
  {
    clave: "quimica",
    nombre: "Química, Bioquímica y Ambiental",
    palabras: [
      "quimica", "bioquimica", "ambiental", "alimentarias", "alimentos",
      "biotecnologia", "farmaceutica",
    ],
  },
  {
    clave: "contabilidad",
    nombre: "Contaduría y Finanzas",
    palabras: ["contador", "contaduria", "contabilidad", "finanzas", "fiscal"],
  },
  {
    clave: "gestion",
    nombre: "Administración y Gestión Empresarial",
    palabras: [
      "gestion", "administracion", "empresarial", "negocios",
      "mercadotecnia", "comercio", "recursos humanos", "turismo",
    ],
  },
  {
    clave: "industrial",
    nombre: "Industrial y Logística",
    palabras: ["industrial", "logistica", "calidad", "procesos", "produccion"],
  },
];

// Prueba para estudiantes cuya carrera no tiene prueba propia
const GENERAL = {
  clave: "general",
  nombre: "Otras carreras (prueba general)",
  palabras: [],
};

const TODAS = [...CARRERAS, GENERAL];
const CLAVES = TODAS.map((c) => c.clave);

const normalizar = (texto = "") =>
  String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Clave del catálogo que corresponde a la carrera del estudiante
// (null si no se reconoce)
const detectarCarrera = (texto) => {
  const limpio = ` ${normalizar(texto)} `;
  if (!limpio.trim()) return null;

  const carrera = CARRERAS.find((c) =>
    c.palabras.some((palabra) => limpio.includes(` ${palabra} `))
  );

  return carrera ? carrera.clave : null;
};

const nombreCarrera = (clave) =>
  TODAS.find((c) => c.clave === clave)?.nombre || clave;

// Claves de prueba que aplican al estudiante, en orden de preferencia
const pruebasAplicables = (texto) => {
  const clave = detectarCarrera(texto);
  return clave ? [clave, GENERAL.clave] : [GENERAL.clave];
};

module.exports = {
  CATALOGO: TODAS.map(({ clave, nombre }) => ({ clave, nombre })),
  CLAVES,
  detectarCarrera,
  nombreCarrera,
  pruebasAplicables,
};
