// ========================================
// FORMATO DE FECHAS
// ========================================

const valida = (fecha) => {
  if (!fecha) return null;
  const valor = new Date(fecha);
  return Number.isNaN(valor.getTime()) ? null : valor;
};

// "hace 5 min", "hace 3 h", "ayer", "hace 4 días", "12 nov 2026"
export const tiempoRelativo = (fecha) => {
  const valor = valida(fecha);
  if (!valor) return "Sin fecha";

  const segundos = Math.round((Date.now() - valor.getTime()) / 1000);

  if (segundos < 60) return "hace un momento";
  if (segundos < 3600) return `hace ${Math.floor(segundos / 60)} min`;
  if (segundos < 86400) return `hace ${Math.floor(segundos / 3600)} h`;

  const dias = Math.floor(segundos / 86400);
  if (dias === 1) return "ayer";
  if (dias < 7) return `hace ${dias} días`;
  if (dias < 30) {
    const semanas = Math.floor(dias / 7);
    return semanas === 1 ? "hace 1 semana" : `hace ${semanas} semanas`;
  }

  return valor.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const fechaCompleta = (fecha) => {
  const valor = valida(fecha);
  if (!valor) return "Sin fecha";

  return valor.toLocaleString("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
  });
};

export const fechaCorta = (fecha) => {
  const valor = valida(fecha);
  if (!valor) return "Sin fecha";

  return valor.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// Grupo para listas por día: "Hoy", "Ayer", "Esta semana", "Anteriores"
export const grupoDeFecha = (fecha) => {
  const valor = valida(fecha);
  if (!valor) return "Anteriores";

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dia = new Date(valor);
  dia.setHours(0, 0, 0, 0);

  const diferencia = Math.round((hoy - dia) / 86400000);

  if (diferencia <= 0) return "Hoy";
  if (diferencia === 1) return "Ayer";
  if (diferencia < 7) return "Esta semana";
  return "Anteriores";
};

// Menos de 3 días desde la publicación
export const esReciente = (fecha) => {
  const valor = valida(fecha);
  return Boolean(valor) && Date.now() - valor.getTime() < 3 * 86400000;
};
