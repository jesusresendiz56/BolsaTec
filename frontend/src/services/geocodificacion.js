// ========================================
// GEOCODIFICACIÓN CON OPENSTREETMAP
// Convierte direcciones en coordenadas usando
// Nominatim y Photon (gratis, sin clave).
// ========================================

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

// Guardar coordenadas para no repetir consultas
// (las políticas de Nominatim/Photon piden no saturarlos).
const cacheCoordenadas = new Map();

const PHOTON_URL = "https://photon.komoot.io/api/";

// Recuadro aproximado de México para Photon
const BBOX_MEXICO = "-118.5,14.4,-86.6,32.8";

// Expandir abreviaturas comunes en direcciones de México
export const normalizarDireccion = (texto) =>
  texto
    .replace(/#/g, " ")
    .replace(/\b(av|avda)\.?(?=\s)/gi, "Avenida")
    .replace(/\bcol\.?(?=\s)/gi, "Colonia")
    .replace(/\bblvd\.?(?=\s)/gi, "Bulevar")
    .replace(/\bcalz\.?(?=\s)/gi, "Calzada")
    .replace(/\bcdmx\b/gi, "Ciudad de México")
    .replace(/\s+/g, " ")
    .trim();

const consultarNominatim = async (consulta, signal) => {
  const parametros = new URLSearchParams({
    q: consulta,
    format: "jsonv2",
    limit: "1",
    countrycodes: "mx",
    "accept-language": "es",
  });

  const respuesta = await fetch(`${NOMINATIM_URL}?${parametros}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!respuesta.ok) throw new Error(`Nominatim ${respuesta.status}`);

  const datos = await respuesta.json();
  const lugar = Array.isArray(datos) ? datos[0] : null;

  return lugar
    ? { lat: Number(lugar.lat), lng: Number(lugar.lon) }
    : null;
};

// Photon (también usa datos de OpenStreetMap) tolera
// mejor errores de escritura y direcciones incompletas.
const consultarPhoton = async (consulta, signal) => {
  const parametros = new URLSearchParams({
    q: consulta,
    limit: "1",
    bbox: BBOX_MEXICO,
  });

  const respuesta = await fetch(`${PHOTON_URL}?${parametros}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!respuesta.ok) throw new Error(`Photon ${respuesta.status}`);

  const datos = await respuesta.json();
  const coordenadas = datos?.features?.[0]?.geometry?.coordinates;

  return coordenadas
    ? { lat: Number(coordenadas[1]), lng: Number(coordenadas[0]) }
    : null;
};

// Intentar ubicar la dirección, de la más exacta a la
// más general. Devuelve { lat, lng, aproximada, referencia }.
const buscarPorTexto = async (direccion, signal) => {
  if (cacheCoordenadas.has(direccion)) {
    return cacheCoordenadas.get(direccion);
  }

  const normalizada = normalizarDireccion(direccion);
  const conPais = `${normalizada}, México`;

  let resultado = null;

  // 1) Dirección completa
  const exacta =
    (await consultarNominatim(conPais, signal).catch(() => null)) ||
    (await consultarPhoton(normalizada, signal).catch(() => null));

  if (exacta) {
    resultado = { ...exacta, aproximada: false, referencia: direccion };
  } else {
    // 2) Quitar partes del inicio (calle, número…) hasta
    //    encontrar la colonia, alcaldía o ciudad.
    const partes = normalizada.includes(",")
      ? normalizada.split(",").map((t) => t.trim()).filter(Boolean)
      : normalizada.split(" ").filter(Boolean);

    const separador = normalizada.includes(",") ? ", " : " ";

    for (let i = 1; i < partes.length && i <= 4; i += 1) {
      const resto = partes.slice(i).join(separador);

      if (resto.replace(/[^a-záéíóúñ]/gi, "").length < 4) break;

      const aproximada = await consultarPhoton(resto, signal).catch(
        () => null
      );

      if (aproximada) {
        resultado = { ...aproximada, aproximada: true, referencia: resto };
        break;
      }
    }
  }

  // Búsqueda cancelada: no guardar un resultado vacío
  if (signal?.aborted) {
    throw new DOMException("Búsqueda cancelada", "AbortError");
  }

  cacheCoordenadas.set(direccion, resultado);
  return resultado;
};

// Búsqueda estructurada (calle, ciudad, estado, C.P.):
// es más precisa que el texto libre.
const consultarNominatimEstructurado = async (campos, signal) => {
  const calle = [campos.direccion_numero, campos.direccion_calle]
    .filter(Boolean)
    .join(" ");

  const parametros = new URLSearchParams({
    format: "jsonv2",
    limit: "1",
    countrycodes: "mx",
    "accept-language": "es",
    country: "México",
  });

  if (calle) parametros.set("street", normalizarDireccion(calle));
  if (campos.direccion_ciudad) parametros.set("city", campos.direccion_ciudad);
  if (campos.direccion_estado) parametros.set("state", campos.direccion_estado);
  if (campos.direccion_cp) parametros.set("postalcode", campos.direccion_cp);

  const respuesta = await fetch(`${NOMINATIM_URL}?${parametros}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!respuesta.ok) throw new Error(`Nominatim ${respuesta.status}`);

  const datos = await respuesta.json();
  const lugar = Array.isArray(datos) ? datos[0] : null;

  return lugar
    ? { lat: Number(lugar.lat), lng: Number(lugar.lon) }
    : null;
};

const tieneCampos = (campos) =>
  Boolean(
    campos &&
      (campos.direccion_calle ||
        campos.direccion_colonia ||
        campos.direccion_cp ||
        campos.direccion_ciudad)
  );

/**
 * Ubica una dirección en el mapa.
 * @param {string} texto  Dirección completa en texto.
 * @param {object} campos Campos separados (opcional).
 * @returns {Promise<{lat,lng,aproximada,referencia}|null>}
 */
export const buscarCoordenadas = async ({ texto, campos }, signal) => {
  const clave = JSON.stringify({ texto, campos: campos || null });

  if (cacheCoordenadas.has(clave)) return cacheCoordenadas.get(clave);

  let resultado = null;

  if (tieneCampos(campos)) {
    const exacta = await consultarNominatimEstructurado(
      campos,
      signal
    ).catch((err) => {
      if (err.name === "AbortError") throw err;
      return null;
    });

    if (exacta) {
      resultado = { ...exacta, aproximada: false, referencia: texto };
    }
  }

  if (!resultado && texto) {
    resultado = await buscarPorTexto(texto, signal);
  }

  // Búsqueda cancelada: no guardar un resultado vacío
  if (signal?.aborted) {
    throw new DOMException("Búsqueda cancelada", "AbortError");
  }

  cacheCoordenadas.set(clave, resultado);
  return resultado;
};
