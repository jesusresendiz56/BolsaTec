// ========================================
// CATÁLOGOS Y VALIDACIÓN DEL PERFIL EMPRESARIAL
// ========================================

// Sectores (giros) de empresa y las carreras relacionadas con cada
// uno (claves de backend/src/services/carreras.js). En la sección
// "Pruebas" la empresa ve las carreras de su sector.
const GIROS = [
  { nombre: "Tecnologías de la información y software", carreras: ["sistemas", "electronica", "gestion"],
    palabras: ["informatica", "sistemas", "software", "tecnologia", "tecnologias", "ti", "tic", "computo", "computacion", "desarrollo", "programacion", "datos", "internet", "web", "digital"] },
  { nombre: "Telecomunicaciones", carreras: ["electronica", "sistemas"],
    palabras: ["telecomunicaciones", "telecom", "redes", "telefonia"] },
  { nombre: "Manufactura e industria", carreras: ["industrial", "mecanica", "electronica", "quimica"],
    palabras: ["manufactura", "industria", "industrial", "fabrica", "produccion", "maquila", "maquiladora"] },
  { nombre: "Automotriz y autopartes", carreras: ["mecanica", "industrial", "electronica"],
    palabras: ["automotriz", "autopartes", "automoviles", "automotores"] },
  { nombre: "Electrónica y eléctrica", carreras: ["electronica", "sistemas", "mecanica"],
    palabras: ["electronica", "electrica", "electricidad"] },
  { nombre: "Construcción e inmobiliaria", carreras: ["civil", "industrial", "contabilidad"],
    palabras: ["construccion", "constructora", "inmobiliaria", "arquitectura", "obra", "obras"] },
  { nombre: "Energía y minería", carreras: ["electronica", "mecanica", "quimica", "civil"],
    palabras: ["energia", "mineria", "minera", "petroleo", "solar", "gas"] },
  { nombre: "Química, farmacéutica y laboratorios", carreras: ["quimica", "industrial"],
    palabras: ["quimica", "farmaceutica", "laboratorio", "laboratorios"] },
  { nombre: "Alimentos y bebidas", carreras: ["quimica", "industrial", "gestion"],
    palabras: ["alimentos", "alimentaria", "bebidas", "restaurante", "restaurantes"] },
  { nombre: "Logística y transporte", carreras: ["industrial", "gestion", "sistemas"],
    palabras: ["logistica", "transporte", "paqueteria", "almacen", "almacenes", "distribucion"] },
  { nombre: "Comercio y ventas", carreras: ["gestion", "contabilidad", "sistemas"],
    palabras: ["comercio", "comercial", "ventas", "retail", "tienda", "tiendas"] },
  { nombre: "Finanzas, seguros y contabilidad", carreras: ["contabilidad", "gestion", "sistemas"],
    palabras: ["finanzas", "financiera", "banco", "bancario", "seguros", "contabilidad", "contable", "fiscal"] },
  { nombre: "Servicios profesionales y consultoría", carreras: ["gestion", "contabilidad", "sistemas"],
    palabras: ["consultoria", "consultora", "servicios", "despacho", "asesoria"] },
  { nombre: "Salud", carreras: ["quimica", "gestion", "sistemas"],
    palabras: ["salud", "hospital", "clinica", "medico", "medica"] },
  { nombre: "Educación", carreras: ["gestion", "sistemas"],
    palabras: ["educacion", "educativo", "escuela", "universidad", "capacitacion"] },
  { nombre: "Turismo y hotelería", carreras: ["gestion", "contabilidad"],
    palabras: ["turismo", "hotel", "hoteleria", "viajes"] },
  { nombre: "Agroindustria", carreras: ["quimica", "industrial", "gestion"],
    palabras: ["agro", "agroindustria", "agricola", "agricultura", "ganaderia"] },
  { nombre: "Medio ambiente", carreras: ["quimica", "civil"],
    palabras: ["ambiental", "ambiente", "reciclaje", "sustentabilidad"] },
  { nombre: "Gobierno y sector público", carreras: ["gestion", "contabilidad", "sistemas", "civil"],
    palabras: ["gobierno", "publico", "municipio", "municipal"] },
  { nombre: "Otro", carreras: [], palabras: [] },
];

const SECTORES = GIROS.map((giro) => giro.nombre);

const normalizar = (valor = "") =>
  String(valor)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Sector de la lista que corresponde al de la empresa.
// Si se capturó como texto libre (p. ej. "informatica" en el
// registro), se relaciona por palabras clave.
const giroDeSector = (sector) => {
  if (!sector) return null;

  const exacto = GIROS.find((giro) => giro.nombre === sector);
  if (exacto) return exacto;

  const limpio = ` ${normalizar(sector)} `;

  return (
    GIROS.find((giro) =>
      giro.palabras.some((palabra) => limpio.includes(` ${palabra} `))
    ) || null
  );
};

// Carreras relacionadas con el sector de la empresa ([] si no se reconoce)
const carrerasDelGiro = (sector) => giroDeSector(sector)?.carreras || [];

const TAMANOS = [
  { clave: "micro", nombre: "Micro (1 a 10 empleados)" },
  { clave: "pequena", nombre: "Pequeña (11 a 50 empleados)" },
  { clave: "mediana", nombre: "Mediana (51 a 250 empleados)" },
  { clave: "grande", nombre: "Grande (más de 250 empleados)" },
];

const texto = (valor) =>
  typeof valor === "string" ? valor.trim().replace(/\s+/g, " ") : "";

// Agrega https:// si falta y valida que sea una dirección web
const normalizarUrl = (valor) => {
  const limpio = texto(valor);
  if (!limpio) return { valor: null };

  const conProtocolo = /^https?:\/\//i.test(limpio)
    ? limpio
    : `https://${limpio}`;

  try {
    const url = new URL(conProtocolo);

    if (!url.hostname.includes(".") || url.href.length > 200) {
      return { error: true };
    }

    return { valor: url.href, host: url.hostname.toLowerCase() };
  } catch {
    return { error: true };
  }
};

// RFC de persona moral (12) o física (13)
const RFC = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

// Devuelve { error } o { datos } listos para guardar.
// sectorActual: el que ya tenía la empresa (se permite conservarlo
// aunque no esté en la lista, p. ej. el capturado en el registro).
const validarPerfil = (body = {}, sectorActual = null) => {
  const nombre = texto(body.nombre_empresa);

  if (!nombre || nombre.length > 150) {
    return { error: "El nombre de la empresa es obligatorio (máximo 150 caracteres)" };
  }

  const sector = texto(body.sector) || null;

  if (sector && !SECTORES.includes(sector) && sector !== sectorActual) {
    return { error: "Elige un sector de la lista" };
  }

  const tamano = texto(body.tamano) || null;

  if (tamano && !TAMANOS.some((t) => t.clave === tamano)) {
    return { error: "Elige un tamaño de empresa válido" };
  }

  const rfc = texto(body.rfc).toUpperCase().replace(/[\s-]/g, "") || null;

  if (rfc && !RFC.test(rfc)) {
    return { error: "El RFC no es válido (12 caracteres para persona moral o 13 para persona física)" };
  }

  const telefono = texto(body.telefono).replace(/[\s().-]/g, "") || null;

  if (telefono && !/^\d{10}$/.test(telefono)) {
    return { error: "El teléfono debe tener 10 dígitos" };
  }

  const sitio = normalizarUrl(body.sitio_web);

  if (sitio.error) {
    return { error: "El sitio web no es válido (ej. www.miempresa.com)" };
  }

  const linkedin = normalizarUrl(body.linkedin);

  if (
    linkedin.error ||
    (linkedin.valor && !/(^|\.)linkedin\.com$/.test(linkedin.host))
  ) {
    return { error: "El enlace de LinkedIn no es válido (ej. linkedin.com/company/miempresa)" };
  }

  const limites = {
    ubicacion: 150,
    contacto_nombre: 120,
    contacto_puesto: 100,
  };

  const extra = {};

  for (const [campo, maximo] of Object.entries(limites)) {
    const valor = texto(body[campo]);

    if (valor.length > maximo) {
      return { error: `El campo ${campo.replace("_", " ")} admite máximo ${maximo} caracteres` };
    }

    extra[campo] = valor || null;
  }

  const descripcion =
    typeof body.descripcion === "string" ? body.descripcion.trim() : "";

  if (descripcion.length > 1000) {
    return { error: "La descripción admite máximo 1000 caracteres" };
  }

  return {
    datos: {
      nombre_empresa: nombre,
      sector,
      tamano,
      rfc,
      telefono,
      sitio_web: sitio.valor,
      linkedin: linkedin.valor,
      descripcion: descripcion || null,
      ...extra,
    },
  };
};

module.exports = {
  SECTORES,
  giroDeSector,
  carrerasDelGiro,
  TAMANOS,
  validarPerfil,
};
