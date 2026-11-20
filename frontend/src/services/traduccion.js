// ========================================
// TRADUCCIÓN DE TODO EL SISTEMA
// Usa el traductor de Google para sitios web: traduce
// todo el texto de la página (menús, botones, mensajes
// del servidor y datos como las descripciones de vacantes).
// El sistema está escrito en español; los demás idiomas
// se traducen automáticamente.
// ========================================

export const IDIOMAS = [
  { codigo: "es", nombre: "Español", corto: "ES" },
  { codigo: "en", nombre: "English", corto: "EN" },
  { codigo: "fr", nombre: "Français", corto: "FR" },
  { codigo: "de", nombre: "Deutsch", corto: "DE" },
  { codigo: "ja", nombre: "日本語", corto: "JA" },
];

const CODIGOS = IDIOMAS.map((i) => i.codigo);
const IDIOMA_KEY = "bolsatec_idioma";
const SCRIPT_URL =
  "https://translate.google.com/translate_a/element.js?cb=btIniciarTraductor";

const leer = () => {
  try {
    return localStorage.getItem(IDIOMA_KEY);
  } catch {
    return null;
  }
};

const guardar = (codigo) => {
  try {
    localStorage.setItem(IDIOMA_KEY, codigo);
  } catch {
    // Sin almacenamiento: se usa solo la cookie
  }
};

// Google lee el idioma de la cookie "googtrans" (/es/en)
const ponerCookie = (codigo) => {
  const dominio = window.location.hostname;
  const valores =
    codigo === "es"
      ? ["googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT"]
      : [`googtrans=/es/${codigo}`];

  valores.forEach((valor) => {
    document.cookie = `${valor}; path=/`;
    document.cookie = `${valor}; path=/; domain=${dominio}`;
    document.cookie = `${valor}; path=/; domain=.${dominio}`;
  });
};

export function idiomaGet() {
  const guardado = leer();
  return CODIGOS.includes(guardado) ? guardado : "es";
}

// Cargar el script de Google una sola vez
let cargando = null;
const cargarTraductor = () => {
  if (cargando) return cargando;

  cargando = new Promise((resolver, rechazar) => {
    window.btIniciarTraductor = () => {
      // eslint-disable-next-line no-undef
      new google.translate.TranslateElement(
        {
          pageLanguage: "es",
          includedLanguages: CODIGOS.join(","),
          autoDisplay: false,
        },
        "bt-google-translate"
      );
      resolver();
    };

    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onerror = () => {
      cargando = null;
      rechazar(new Error("No se pudo cargar el traductor"));
    };
    document.body.appendChild(script);
  });

  return cargando;
};

// Esperar al selector oculto que crea Google
const esperarSelector = () =>
  new Promise((resolver, rechazar) => {
    const inicio = Date.now();
    const revisar = () => {
      const selector = document.querySelector(".goog-te-combo");
      if (selector && selector.options.length > 1) return resolver(selector);
      if (Date.now() - inicio > 10000) {
        return rechazar(new Error("El traductor no respondió"));
      }
      setTimeout(revisar, 150);
    };
    revisar();
  });

const avisarCambio = (codigo) => {
  document.documentElement.setAttribute("lang", codigo);
  window.dispatchEvent(
    new CustomEvent("bolsatec-idioma-change", { detail: codigo })
  );
};

/**
 * Cambia el idioma de todo el sistema.
 * Volver a español recarga la página para quitar la traducción.
 */
export async function idiomaSet(codigo) {
  const nuevo = CODIGOS.includes(codigo) ? codigo : "es";
  const anterior = idiomaGet();

  guardar(nuevo);
  ponerCookie(nuevo);

  if (nuevo === "es") {
    if (anterior !== "es") window.location.reload();
    return;
  }

  await cargarTraductor();
  const selector = await esperarSelector();
  selector.value = nuevo;
  selector.dispatchEvent(new Event("change"));
  avisarCambio(nuevo);
}

// Al abrir la app: si había un idioma guardado, aplicarlo
export function traduccionInit() {
  const codigo = idiomaGet();
  ponerCookie(codigo);

  if (codigo !== "es") {
    document.documentElement.setAttribute("lang", codigo);
    cargarTraductor().catch(() => {});
  }
}

// El traductor reemplaza nodos de texto; React puede fallar
// al actualizarlos ("removeChild"/"insertBefore"). Este ajuste
// conocido evita que la app se rompa.
export function protegerReactDeTraductor() {
  if (typeof Node !== "function" || !Node.prototype) return;

  const quitarOriginal = Node.prototype.removeChild;
  Node.prototype.removeChild = function (hijo) {
    if (hijo.parentNode !== this) return hijo;
    return quitarOriginal.call(this, hijo);
  };

  const insertarOriginal = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (nuevo, referencia) {
    if (referencia && referencia.parentNode !== this) return nuevo;
    return insertarOriginal.call(this, nuevo, referencia);
  };
}
