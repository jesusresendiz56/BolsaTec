// ========================================
// AVANCE DEL PERFIL DEL ESTUDIANTE
// Se usa en "Mi perfil" y en el Dashboard.
// ========================================

export const MIN_DESCRIPCION = 50;

/**
 * @param {object} perfil  carrera, semestre, institucion, telefono, descripcion
 * @param {boolean} tieneCV
 */
export const calcularAvancePerfil = (perfil = {}, tieneCV = false) => {
  const texto = (valor) => String(valor ?? "").trim();

  const pasos = [
    { id: "carrera", texto: "Carrera", listo: Boolean(texto(perfil.carrera)) },
    { id: "semestre", texto: "Semestre", listo: texto(perfil.semestre) !== "" },
    { id: "institucion", texto: "Institución", listo: Boolean(texto(perfil.institucion)) },
    { id: "telefono", texto: "Teléfono", listo: Boolean(texto(perfil.telefono)) },
    {
      id: "descripcion",
      texto: `Descripción (mín. ${MIN_DESCRIPCION} caracteres)`,
      listo: texto(perfil.descripcion).length >= MIN_DESCRIPCION,
    },
    { id: "cv", texto: "Currículum en PDF", listo: Boolean(tieneCV) },
  ];

  const completados = pasos.filter((p) => p.listo).length;

  return {
    pasos,
    completados,
    total: pasos.length,
    porcentaje: Math.round((completados / pasos.length) * 100),
  };
};
