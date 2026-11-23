// ========================================
// CATÁLOGO DE CARRERAS PARA LAS PRUEBAS DE CONOCIMIENTOS
// (Antes se usaba para pruebas por carrera; ahora la prueba es
// por sector. Se conserva para nombrar resultados anteriores.)
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

// Carreras que se eligen en el registro del estudiante (TecNM)
const CARRERAS_TECNM = [
  "Ingeniería en Sistemas Computacionales",
  "Ingeniería Informática",
  "Ingeniería en Tecnologías de la Información y Comunicaciones",
  "Ingeniería Industrial",
  "Ingeniería en Logística",
  "Ingeniería en Gestión Empresarial",
  "Ingeniería Mecatrónica",
  "Ingeniería Electrónica",
  "Ingeniería Eléctrica",
  "Ingeniería Mecánica",
  "Ingeniería en Materiales",
  "Ingeniería Civil",
  "Arquitectura",
  "Ingeniería Química",
  "Ingeniería Bioquímica",
  "Ingeniería Ambiental",
  "Ingeniería en Industrias Alimentarias",
  "Contador Público",
  "Licenciatura en Administración",
  "Otra carrera",
];

module.exports = {
  CARRERAS_TECNM,
  CATALOGO: TODAS.map(({ clave, nombre }) => ({ clave, nombre })),
  CLAVES,
  detectarCarrera,
  nombreCarrera,
  pruebasAplicables,
};
