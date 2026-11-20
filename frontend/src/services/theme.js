// ========================================
// TEMA DE BOLSATEC
// - Modo claro u oscuro (data-theme)
// - Color de fondo: variantes oscuras con color (data-color)
// - Tipo de letra (data-font)
// Las preferencias se guardan en este navegador.
// ========================================

const THEME_KEY = "bolsatec_theme";
const COLOR_KEY = "bolsatec_color";
const FONT_KEY = "bolsatec_font";

// Colores de fondo. "claro" y "oscuro" son los temas de siempre;
// el resto son como el modo oscuro, pero con ese color.
export const COLORES = [
  { id: "claro", nombre: "Claro", fondo: "#F1F5F9", acento: "#0E7490" },
  { id: "oscuro", nombre: "Oscuro", fondo: "#0D0D0D", acento: "#22A7C4" },
  { id: "morado", nombre: "Morado", fondo: "#1A1029", acento: "#A78BFA" },
  { id: "azul", nombre: "Azul", fondo: "#0B1530", acento: "#60A5FA" },
  { id: "verde", nombre: "Verde", fondo: "#0B1D16", acento: "#34D399" },
  { id: "rosa", nombre: "Rosa", fondo: "#24101A", acento: "#F472B6" },
  { id: "rojo", nombre: "Vino", fondo: "#220D0F", acento: "#F87171" },
  { id: "cafe", nombre: "Café", fondo: "#1F1610", acento: "#F59E0B" },
];

// Tipos de letra (Google Fonts). Inter ya viene cargada.
export const FUENTES = [
  { id: "inter", nombre: "Inter", familia: '"Inter", Arial, sans-serif' },
  { id: "poppins", nombre: "Poppins", familia: '"Poppins", Arial, sans-serif', google: "Poppins:wght@400;500;600;700;800" },
  { id: "roboto", nombre: "Roboto", familia: '"Roboto", Arial, sans-serif', google: "Roboto:wght@400;500;700;900" },
  { id: "montserrat", nombre: "Montserrat", familia: '"Montserrat", Arial, sans-serif', google: "Montserrat:wght@400;500;600;700;800" },
  { id: "nunito", nombre: "Nunito", familia: '"Nunito", Arial, sans-serif', google: "Nunito:wght@400;500;600;700;800" },
  { id: "merriweather", nombre: "Merriweather", familia: '"Merriweather", Georgia, serif', google: "Merriweather:wght@400;700;900" },
  { id: "lato", nombre: "Lato", familia: '"Lato", Arial, sans-serif', google: "Lato:wght@400;700;900" },
  { id: "opensans", nombre: "Open Sans", familia: '"Open Sans", Arial, sans-serif', google: "Open+Sans:wght@400;500;600;700;800" },
  { id: "raleway", nombre: "Raleway", familia: '"Raleway", Arial, sans-serif', google: "Raleway:wght@400;500;600;700;800" },
  { id: "playfair", nombre: "Playfair Display", familia: '"Playfair Display", Georgia, serif', google: "Playfair+Display:wght@400;500;600;700;800" },
];

const COLORES_IDS = COLORES.map((c) => c.id);
const FUENTES_IDS = FUENTES.map((f) => f.id);

// localStorage puede fallar (modo privado, bloqueado)
const leer = (clave) => {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
};

const guardar = (clave, valor) => {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    // Sin almacenamiento: el cambio dura hasta recargar
  }
};

const avisarCambio = () => {
  window.dispatchEvent(
    new CustomEvent("bolsatec-theme-change", {
      detail: { tema: themeGet(), color: colorGet(), fuente: fuenteGet() },
    })
  );
};

// ---------- Claro / oscuro ----------

export function themeGet() {
  const guardado = leer(THEME_KEY);

  if (guardado === "dark" || guardado === "light") {
    return guardado;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

// El botón de sol/luna vuelve a los temas de siempre
// (quita el color de fondo elegido).
export function themeSet(tema) {
  colorSet(tema === "dark" ? "oscuro" : "claro");
}

// ---------- Color de fondo ----------

export function colorGet() {
  const guardado = leer(COLOR_KEY);
  if (COLORES_IDS.includes(guardado) && guardado !== "claro" && guardado !== "oscuro") {
    return guardado;
  }
  return themeGet() === "dark" ? "oscuro" : "claro";
}

export function colorSet(color) {
  const id = COLORES_IDS.includes(color) ? color : "claro";
  const tema = id === "claro" ? "light" : "dark";
  const raiz = document.documentElement;

  raiz.setAttribute("data-theme", tema);

  if (id === "claro" || id === "oscuro") {
    raiz.removeAttribute("data-color");
  } else {
    raiz.setAttribute("data-color", id);
  }

  guardar(THEME_KEY, tema);
  guardar(COLOR_KEY, id);
  avisarCambio();
}

// ---------- Tipo de letra ----------

export function fuenteGet() {
  const guardada = leer(FONT_KEY);
  return FUENTES_IDS.includes(guardada) ? guardada : "inter";
}

// Cargar la fuente de Google Fonts solo cuando se usa
const cargarFuente = (fuente) => {
  if (!fuente.google) return;

  const id = `bt-fuente-${fuente.id}`;
  if (document.getElementById(id)) return;

  const enlace = document.createElement("link");
  enlace.id = id;
  enlace.rel = "stylesheet";
  enlace.href = `https://fonts.googleapis.com/css2?family=${fuente.google}&display=swap`;
  document.head.appendChild(enlace);
};

const aplicarFuente = (id) => {
  const fuente = FUENTES.find((f) => f.id === id) || FUENTES[0];
  const raiz = document.documentElement;

  cargarFuente(fuente);

  if (fuente.id === "inter") {
    raiz.removeAttribute("data-font");
    raiz.style.removeProperty("--bt-font");
  } else {
    raiz.setAttribute("data-font", fuente.id);
    raiz.style.setProperty("--bt-font", fuente.familia);
  }
};

export function fuenteSet(id) {
  const valido = FUENTES_IDS.includes(id) ? id : "inter";
  aplicarFuente(valido);
  guardar(FONT_KEY, valido);
  avisarCambio();
}

// Precargar todas las fuentes para mostrarlas en el menú
export function precargarFuentes() {
  FUENTES.forEach(cargarFuente);
}

// ---------- Inicio ----------

export function themeInit() {
  const raiz = document.documentElement;
  const color = colorGet();

  raiz.setAttribute("data-theme", color === "claro" ? "light" : "dark");
  if (color !== "claro" && color !== "oscuro") {
    raiz.setAttribute("data-color", color);
  }

  aplicarFuente(fuenteGet());
}
