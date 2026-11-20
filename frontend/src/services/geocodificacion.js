// ========================================
// GEOCODIFICACIÓN CON OPENSTREETMAP
// Convierte direcciones en coordenadas usando
// Nominatim (y Photon como respaldo), gratis y sin clave.
//
// Cada resultado indica qué tan preciso es:
//   "numero" → OpenStreetMap tiene registrado el número exterior
//   "calle"  → se encontró la calle, pero no el número
//              (el punto es el centro de la calle)
//   "zona"   → solo la colonia, el C.P. o el municipio
// ========================================

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const PHOTON_URL = "https://photon.komoot.io/api/";

// Recuadro aproximado de México para Photon
const BBOX_MEXICO = "-118.5,14.4,-86.6,32.8";

// Guardar resultados para no repetir consultas
// (las políticas de Nominatim/Photon piden no saturarlos).
const cacheCoordenadas = new Map();

// Nominatim permite como máximo 1 consulta por segundo
let ultimaConsulta = 0;
const esperarTurno = async (signal) => {
  const espera = ultimaConsulta + 1100 - Date.now();
  ultimaConsulta = Math.max(Date.now(), ultimaConsulta + 1100);

  if (espera > 0) {
    await new Promise((resolver, rechazar) => {
      const temporizador = setTimeout(resolver, espera);
      signal?.addEventListener("abort", () => {
        clearTimeout(temporizador);
        rechazar(new DOMException("Búsqueda cancelada", "AbortError"));
      });
    });
  }
};

// Expandir abreviaturas comunes en direcciones de México
export const normalizarDireccion = (texto) =>
  texto
    .replace(/#/g, " ")
    .replace(/\b(av|avda)\.?(?=\s)/gi, "Avenida")
    .replace(/\bcol\.?(?=\s)/gi, "Colonia")
    .replace(/\bblvd\.?(?=\s)/gi, "Bulevar")
    .replace(/\bcalz\.?(?=\s)/gi, "Calzada")
    .replace(/\bcdmx\b/gi, "Ciudad de México")
    .replace(/\bedomex\b/gi, "Estado de México")
    .replace(/\s+/g, " ")
    .trim();

// Comparar textos sin acentos, mayúsculas ni palabras genéricas
const simplificar = (texto = "") =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(
      /\b(colonia|col|fraccionamiento|fracc|barrio|unidad|calle|avenida|la|el|los|las|de|del)\b/g,
      " "
    )
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const coincide = (a, b) => {
  const x = simplificar(a);
  const y = simplificar(b);
  return Boolean(x && y) && (x.includes(y) || y.includes(x));
};

// Número exterior sin "Int. 3", "Lote", etc.
const numeroExterior = (numero = "") =>
  (String(numero).match(/\d+[a-z]?/i) || [""])[0];

// ---------- Consultas ----------

const consultarNominatim = async (parametrosExtra, signal) => {
  const parametros = new URLSearchParams({
    format: "jsonv2",
    limit: "10",
    countrycodes: "mx",
    addressdetails: "1",
    polygon_geojson: "1",
    polygon_threshold: "0.00005",
    "accept-language": "es",
    ...parametrosExtra,
  });

  await esperarTurno(signal);

  const respuesta = await fetch(`${NOMINATIM_URL}?${parametros}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!respuesta.ok) throw new Error(`Nominatim ${respuesta.status}`);

  const datos = await respuesta.json();
  return Array.isArray(datos) ? datos : [];
};

// Photon (también usa datos de OpenStreetMap): solo como
// respaldo si Nominatim no responde.
const consultarPhoton = async (consulta, signal) => {
  const parametros = new URLSearchParams({
    q: consulta,
    limit: "10",
    bbox: BBOX_MEXICO,
  });

  const respuesta = await fetch(`${PHOTON_URL}?${parametros}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!respuesta.ok) throw new Error(`Photon ${respuesta.status}`);

  const datos = await respuesta.json();

  // Convertir al mismo formato que Nominatim
  return (datos?.features || []).map((f) => ({
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
    category: f.properties.osm_key,
    type: f.properties.osm_value,
    address: {
      road: f.properties.street || f.properties.name,
      house_number: f.properties.housenumber,
      suburb: f.properties.district || f.properties.locality,
      postcode: f.properties.postcode,
      city: f.properties.city,
      county: f.properties.county,
      state: f.properties.state,
    },
  }));
};

// ---------- Validación de candidatos ----------

const municipioDe = (a) =>
  [a.city, a.town, a.village, a.municipality, a.borough, a.county, a.city_district]
    .filter(Boolean)
    .join(" ");

const coloniaDe = (a) =>
  [a.suburb, a.neighbourhood, a.quarter, a.residential, a.hamlet]
    .filter(Boolean)
    .join(" ");

/**
 * Da puntos a un candidato según qué tanto coincide con lo
 * que escribió la empresa. Devuelve -1 si es claramente
 * otro lugar (otro estado u otro código postal lejano).
 */
const calificar = (lugar, campos) => {
  const a = lugar.address || {};
  let puntos = 0;

  if (campos.direccion_estado && a.state) {
    if (!coincide(a.state, campos.direccion_estado)) return -1;
    puntos += 1;
  }

  if (campos.direccion_cp && a.postcode) {
    if (a.postcode === campos.direccion_cp) puntos += 4;
    // Mismos 3 primeros dígitos: zona cercana
    else if (a.postcode.slice(0, 3) === campos.direccion_cp.slice(0, 3)) puntos += 1;
    else puntos -= 3;
  }

  if (campos.direccion_ciudad) {
    puntos += coincide(municipioDe(a), campos.direccion_ciudad) ? 2 : -2;
  }

  if (campos.direccion_colonia && coincide(coloniaDe(a), campos.direccion_colonia)) {
    puntos += 2;
  }

  if (campos.direccion_calle && a.road && coincide(a.road, campos.direccion_calle)) {
    puntos += 3;
  }

  const numero = numeroExterior(campos.direccion_numero);
  if (numero && a.house_number && simplificar(a.house_number) === simplificar(numero)) {
    puntos += 3;
  }

  return puntos;
};

const precisionDe = (lugar, campos) => {
  const a = lugar.address || {};
  const numero = numeroExterior(campos.direccion_numero);

  if (a.house_number && (!numero || simplificar(a.house_number) === simplificar(numero))) {
    return "numero";
  }

  if (lugar.category === "highway" || (a.road && coincide(a.road, campos.direccion_calle))) {
    return "calle";
  }

  return "zona";
};

// Línea de la calle ([lat, lng]) para dibujarla en el mapa
const lineaDe = (lugar) => {
  const g = lugar.geojson;
  if (!g) return null;

  if (g.type === "LineString") {
    return [g.coordinates.map(([lng, lat]) => [lat, lng])];
  }

  if (g.type === "MultiLineString") {
    return g.coordinates.map((tramo) => tramo.map(([lng, lat]) => [lat, lng]));
  }

  return null;
};

const elegirMejor = (candidatos, campos, precisionMinima) => {
  const orden = { zona: 0, calle: 1, numero: 2 };

  const evaluados = candidatos
    .map((lugar) => ({
      lugar,
      puntos: calificar(lugar, campos),
      precision: precisionDe(lugar, campos),
    }))
    .filter((c) => c.puntos >= 0)
    .filter((c) => orden[c.precision] >= orden[precisionMinima])
    .sort(
      (x, y) =>
        y.puntos - x.puntos || orden[y.precision] - orden[x.precision]
    );

  const mejor = evaluados[0];
  if (!mejor) return null;

  return {
    lat: Number(mejor.lugar.lat),
    lng: Number(mejor.lugar.lon),
    precision: mejor.precision,
    aproximada: mejor.precision !== "numero",
    linea: mejor.precision === "calle" ? lineaDe(mejor.lugar) : null,
    referencia: [
      mejor.lugar.address?.road,
      mejor.precision === "numero" ? mejor.lugar.address?.house_number : "",
      coloniaDe(mejor.lugar.address || {}),
      mejor.lugar.address?.postcode,
      mejor.lugar.address?.city ||
        mejor.lugar.address?.town ||
        mejor.lugar.address?.municipality,
    ]
      .filter(Boolean)
      .join(", "),
  };
};

// ---------- Búsqueda principal ----------

const camposVacios = {
  direccion_calle: "",
  direccion_numero: "",
  direccion_colonia: "",
  direccion_cp: "",
  direccion_ciudad: "",
  direccion_estado: "",
};

const tieneCampos = (campos) =>
  Boolean(
    campos &&
      (campos.direccion_calle ||
        campos.direccion_colonia ||
        campos.direccion_cp ||
        campos.direccion_ciudad)
  );

const intentar = async (fn) => {
  try {
    return { candidatos: await fn(), error: false };
  } catch (err) {
    if (err.name === "AbortError") throw err;
    return { candidatos: [], error: true };
  }
};

/**
 * Ubica una dirección en el mapa.
 * @param {string} texto  Dirección completa en texto.
 * @param {object} campos Campos separados (opcional).
 * @returns {Promise<{lat,lng,precision,aproximada,referencia,linea}|null>}
 */
export const buscarCoordenadas = async ({ texto, campos }, signal) => {
  const clave = JSON.stringify({ texto, campos: campos || null });
  if (cacheCoordenadas.has(clave)) return cacheCoordenadas.get(clave);

  const c = { ...camposVacios, ...(tieneCampos(campos) ? campos : {}) };
  const numero = numeroExterior(c.direccion_numero);
  const calle = c.direccion_calle ? normalizarDireccion(c.direccion_calle) : "";
  const textoNormalizado = texto ? normalizarDireccion(texto) : "";

  let resultado = null;
  let nominatimFallo = false;

  // 1) Calle y número con búsqueda estructurada. No se envía el
  //    C.P. a Nominatim (en México suele faltar en OpenStreetMap
  //    y haría fallar la búsqueda); se usa después para elegir
  //    entre calles con el mismo nombre.
  if (calle) {
    const base = { country: "México" };
    if (c.direccion_ciudad) base.city = c.direccion_ciudad;
    if (c.direccion_estado) base.state = c.direccion_estado;

    const conNumero = await intentar(() =>
      consultarNominatim(
        { ...base, street: [numero, calle].filter(Boolean).join(" ") },
        signal
      )
    );
    nominatimFallo ||= conNumero.error;
    resultado = elegirMejor(conNumero.candidatos, c, "calle");

    // Si no apareció, intentar sin el municipio (a veces en OSM
    // la calle está registrada en otra localidad del municipio)
    if (!resultado && c.direccion_ciudad) {
      const sinMunicipio = await intentar(() =>
        consultarNominatim(
          {
            country: "México",
            ...(c.direccion_estado ? { state: c.direccion_estado } : {}),
            street: [numero, calle].filter(Boolean).join(" "),
          },
          signal
        )
      );
      nominatimFallo ||= sinMunicipio.error;
      resultado = elegirMejor(sinMunicipio.candidatos, c, "calle");
    }
  }

  // 2) Texto libre (dirección anterior sin campos o calle no hallada)
  if (!resultado && textoNormalizado && !tieneCampos(campos)) {
    const libre = await intentar(() =>
      consultarNominatim({ q: `${textoNormalizado}, México` }, signal)
    );
    nominatimFallo ||= libre.error;
    resultado = elegirMejor(libre.candidatos, c, "zona");
  }

  // 3) Solo la zona: colonia + municipio + estado
  if (!resultado && (c.direccion_colonia || c.direccion_cp)) {
    const zona = [c.direccion_colonia, c.direccion_ciudad, c.direccion_estado]
      .filter(Boolean)
      .join(", ");

    if (c.direccion_colonia) {
      const porColonia = await intentar(() =>
        consultarNominatim({ q: `${zona}, México` }, signal)
      );
      nominatimFallo ||= porColonia.error;
      resultado = elegirMejor(porColonia.candidatos, c, "zona");
    }

    if (!resultado && c.direccion_cp) {
      const porCP = await intentar(() =>
        consultarNominatim(
          { postalcode: c.direccion_cp, country: "México" },
          signal
        )
      );
      nominatimFallo ||= porCP.error;
      resultado = elegirMejor(porCP.candidatos, c, "zona");
    }
  }

  // 4) Solo el municipio
  if (!resultado && c.direccion_ciudad) {
    const porMunicipio = await intentar(() =>
      consultarNominatim(
        {
          city: c.direccion_ciudad,
          ...(c.direccion_estado ? { state: c.direccion_estado } : {}),
          country: "México",
        },
        signal
      )
    );
    nominatimFallo ||= porMunicipio.error;
    resultado = elegirMejor(porMunicipio.candidatos, c, "zona");
  }

  // 5) Respaldo: Photon, solo si Nominatim no respondió
  if (!resultado && nominatimFallo && textoNormalizado) {
    const photon = await intentar(() =>
      consultarPhoton(textoNormalizado, signal)
    );
    resultado = elegirMejor(photon.candidatos, c, "zona");
  }

  // Búsqueda cancelada: no guardar un resultado vacío
  if (signal?.aborted) {
    throw new DOMException("Búsqueda cancelada", "AbortError");
  }

  // Los fallos de red no se guardan, para poder reintentar
  if (resultado || !nominatimFallo) cacheCoordenadas.set(clave, resultado);
  return resultado;
};
