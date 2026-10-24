
const THEME_KEY = "bolsatec_theme";

export function themeGet() {
  const guardado = localStorage.getItem(THEME_KEY);

  if (guardado === "dark" || guardado === "light") {
    return guardado;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function themeSet(tema) {
  const nuevoTema = tema === "dark" ? "dark" : "light";

  document.documentElement.setAttribute(
    "data-theme",
    nuevoTema
  );

  localStorage.setItem(THEME_KEY, nuevoTema);

  window.dispatchEvent(
    new CustomEvent("bolsatec-theme-change", {
      detail: nuevoTema
    })
  );
}

export function themeInit() {
  document.documentElement.setAttribute(
    "data-theme",
    themeGet()
  );
}
