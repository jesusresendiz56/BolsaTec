const pool = require("../config/database");
const {
  CATALOGO,
  CLAVES,
  nombreCarrera,
  pruebasAplicables,
} = require("../services/carreras");

// ========================================
// PRUEBA DE CONOCIMIENTOS ANTES DE POSTULARSE
// Cada empresa escribe una prueba general por carrera.
// Al postularse a cualquier vacante de la empresa, el
// estudiante presenta la prueba de su carrera (o la
// "general" si su carrera no tiene una) y el resultado
// se envía a la empresa con la postulación.
// ========================================

const MAX_PREGUNTAS = 10;
const MAX_INCORRECTAS = 3;

const leerId = (valor) => {
  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const texto = (valor) =>
  typeof valor === "string" ? valor.trim().replace(/\s+/g, " ") : "";

const revolver = (lista) => {
  const copia = [...lista];

  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }

  return copia;
};

const formatoResultado = (fila) => ({
  aciertos: fila.aciertos,
  total: fila.total,
  calificacion: Number(fila.calificacion),
  fecha_completado: fila.fecha_completado,
});

// Preguntas tal como las ve el estudiante (sin la respuesta)
const preguntasParaEstudiante = (preguntas = []) =>
  preguntas.map(({ id, texto: pregunta, opciones }) => ({
    id,
    texto: pregunta,
    opciones,
  }));

const buscarEmpresa = async (idUsuario) => {
  const resultado = await pool.query(
    `SELECT id_empresa FROM empresas WHERE id_usuario = $1`,
    [idUsuario]
  );

  return resultado.rows[0]?.id_empresa || null;
};

const consultarPreguntas = async (db, idEmpresa, carrera) => {
  const resultado = await db.query(
    `SELECT id_pregunta, pregunta, correcta, incorrectas
     FROM examen_preguntas_carrera
     WHERE id_empresa = $1
       AND carrera = $2
     ORDER BY orden, id_pregunta`,
    [idEmpresa, carrera]
  );

  return resultado.rows;
};

// Carrera de la prueba que le toca al estudiante con esta empresa
// (la de su carrera o la general), o null si no hay ninguna.
const pruebaParaEstudiante = async (db, idEmpresa, carreraEstudiante) => {
  const aplicables = pruebasAplicables(carreraEstudiante);

  const resultado = await db.query(
    `SELECT DISTINCT carrera
     FROM examen_preguntas_carrera
     WHERE id_empresa = $1
       AND carrera = ANY($2::text[])`,
    [idEmpresa, aplicables]
  );

  const disponibles = resultado.rows.map((fila) => fila.carrera);
  return aplicables.find((clave) => disponibles.includes(clave)) || null;
};

// ========================================
// EMPRESA: RESUMEN DE PRUEBAS POR CARRERA
// GET /api/empresa/pruebas
// ========================================

const obtenerPruebasEmpresa = async (req, res) => {
  try {
    const idEmpresa = await buscarEmpresa(req.usuario.id_usuario);

    if (!idEmpresa) {
      return res.status(404).json({ mensaje: "Empresa no encontrada" });
    }

    const resultado = await pool.query(
      `SELECT carrera, COUNT(*)::int AS total
       FROM examen_preguntas_carrera
       WHERE id_empresa = $1
       GROUP BY carrera`,
      [idEmpresa]
    );

    const conteo = Object.fromEntries(
      resultado.rows.map((fila) => [fila.carrera, fila.total])
    );

    return res.json({
      carreras: CATALOGO.map((carrera) => ({
        ...carrera,
        total_preguntas: conteo[carrera.clave] || 0,
      })),
      max_preguntas: MAX_PREGUNTAS,
      max_incorrectas: MAX_INCORRECTAS,
    });

  } catch (error) {
    console.error("Error al consultar pruebas de la empresa:", error);

    return res.status(500).json({
      mensaje: "No se pudieron consultar las pruebas"
    });
  }
};

// ========================================
// EMPRESA: PREGUNTAS DE LA PRUEBA DE UNA CARRERA
// GET /api/empresa/pruebas/:carrera
// ========================================

const obtenerPruebaCarrera = async (req, res) => {
  try {
    const carrera = req.params.carrera;

    if (!CLAVES.includes(carrera)) {
      return res.status(400).json({ mensaje: "Carrera no válida" });
    }

    const idEmpresa = await buscarEmpresa(req.usuario.id_usuario);

    if (!idEmpresa) {
      return res.status(404).json({ mensaje: "Empresa no encontrada" });
    }

    return res.json({
      carrera: { clave: carrera, nombre: nombreCarrera(carrera) },
      preguntas: await consultarPreguntas(pool, idEmpresa, carrera),
      max_preguntas: MAX_PREGUNTAS,
      max_incorrectas: MAX_INCORRECTAS,
    });

  } catch (error) {
    console.error("Error al consultar la prueba:", error);

    return res.status(500).json({
      mensaje: "No se pudo consultar la prueba"
    });
  }
};

// ========================================
// EMPRESA: GUARDAR LA PRUEBA DE UNA CARRERA
// PUT /api/empresa/pruebas/:carrera
// body: { preguntas: [{ pregunta, correcta, incorrectas: [] }] }
// Reemplaza todas las preguntas. Una lista vacía quita
// la prueba de esa carrera.
// ========================================

const validarPreguntas = (preguntas) => {
  if (!Array.isArray(preguntas)) {
    return { error: "Debes enviar la lista de preguntas" };
  }

  if (preguntas.length > MAX_PREGUNTAS) {
    return { error: `La prueba puede tener máximo ${MAX_PREGUNTAS} preguntas` };
  }

  const limpias = [];

  for (const [indice, item] of preguntas.entries()) {
    const numero = indice + 1;
    const pregunta = texto(item?.pregunta);
    const correcta = texto(item?.correcta);
    const incorrectas = Array.isArray(item?.incorrectas)
      ? item.incorrectas.map(texto).filter(Boolean)
      : [];

    if (!pregunta || pregunta.length > 300) {
      return { error: `Escribe la pregunta ${numero} (máximo 300 caracteres)` };
    }

    if (!correcta || correcta.length > 200) {
      return { error: `Escribe la respuesta correcta de la pregunta ${numero} (máximo 200 caracteres)` };
    }

    if (!incorrectas.length || incorrectas.length > MAX_INCORRECTAS) {
      return { error: `La pregunta ${numero} debe tener de 1 a ${MAX_INCORRECTAS} respuestas incorrectas` };
    }

    if (incorrectas.some((opcion) => opcion.length > 200)) {
      return { error: `Las respuestas de la pregunta ${numero} pueden tener máximo 200 caracteres` };
    }

    const todas = [correcta, ...incorrectas].map((o) => o.toLowerCase());

    if (new Set(todas).size !== todas.length) {
      return { error: `La pregunta ${numero} tiene respuestas repetidas` };
    }

    limpias.push({ pregunta, correcta, incorrectas });
  }

  return { preguntas: limpias };
};

const guardarPruebaCarrera = async (req, res) => {
  const carrera = req.params.carrera;

  if (!CLAVES.includes(carrera)) {
    return res.status(400).json({ mensaje: "Carrera no válida" });
  }

  const validacion = validarPreguntas(req.body?.preguntas);

  if (validacion.error) {
    return res.status(400).json({ mensaje: validacion.error });
  }

  let idEmpresa;

  try {
    idEmpresa = await buscarEmpresa(req.usuario.id_usuario);
  } catch (error) {
    console.error("Error al guardar la prueba:", error);
    return res.status(500).json({ mensaje: "No se pudo guardar la prueba" });
  }

  if (!idEmpresa) {
    return res.status(404).json({ mensaje: "Empresa no encontrada" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `DELETE FROM examen_preguntas_carrera
       WHERE id_empresa = $1
         AND carrera = $2`,
      [idEmpresa, carrera]
    );

    for (const [orden, item] of validacion.preguntas.entries()) {
      await client.query(
        `INSERT INTO examen_preguntas_carrera (
           id_empresa, carrera, orden, pregunta, correcta, incorrectas
         )
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
          idEmpresa,
          carrera,
          orden,
          item.pregunta,
          item.correcta,
          JSON.stringify(item.incorrectas),
        ]
      );
    }

    await client.query("COMMIT");

    const total = validacion.preguntas.length;

    return res.json({
      mensaje: total
        ? `Prueba de ${nombreCarrera(carrera)} guardada (${total} ${total === 1 ? "pregunta" : "preguntas"})`
        : `Se quitó la prueba de ${nombreCarrera(carrera)}`,
      preguntas: await consultarPreguntas(pool, idEmpresa, carrera),
    });

  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Error al guardar la prueba:", error);

    return res.status(500).json({
      mensaje: "No se pudo guardar la prueba"
    });
  } finally {
    client.release();
  }
};

// ========================================
// ESTUDIANTE: ¿QUÉ VACANTES PIDEN PRUEBA?
// Devuelve el conjunto de id_empresa que tienen una prueba
// aplicable a la carrera del estudiante.
// ========================================

const empresasConPrueba = async (carreraEstudiante) => {
  const resultado = await pool.query(
    `SELECT DISTINCT id_empresa
     FROM examen_preguntas_carrera
     WHERE carrera = ANY($1::text[])`,
    [pruebasAplicables(carreraEstudiante)]
  );

  return new Set(resultado.rows.map((fila) => fila.id_empresa));
};

// ========================================
// ESTUDIANTE: ABRIR LA PRUEBA DE UNA VACANTE
// GET /api/estudiante/vacantes/:id/examen
// La primera vez se guarda una copia de las preguntas
// con las opciones revueltas.
// ========================================

const buscarExamen = async (db, idEstudiante, idVacante, bloquear = false) => {
  const resultado = await db.query(
    `SELECT *
     FROM examenes_vacante
     WHERE id_estudiante = $1
       AND id_vacante = $2
     ${bloquear ? "FOR UPDATE" : ""}`,
    [idEstudiante, idVacante]
  );

  return resultado.rows[0] || null;
};

const obtenerExamenVacante = async (req, res) => {
  try {
    const idVacante = leerId(req.params.id);

    if (!idVacante) {
      return res.status(400).json({
        mensaje: "Identificador de vacante no válido"
      });
    }

    const datos = await pool.query(
      `SELECT
         est.id_estudiante,
         est.carrera AS carrera_estudiante,
         v.id_empresa,
         v.titulo AS titulo_vacante,
         v.estado AS estado_vacante,
         e.nombre_empresa
       FROM estudiantes est
       CROSS JOIN vacantes v
       INNER JOIN empresas e
         ON e.id_empresa = v.id_empresa
       WHERE est.id_usuario = $1
         AND v.id_vacante = $2`,
      [req.usuario.id_usuario, idVacante]
    );

    if (!datos.rows.length) {
      return res.status(404).json({
        mensaje: "La vacante no existe"
      });
    }

    const info = datos.rows[0];
    let examen = await buscarExamen(pool, info.id_estudiante, idVacante);

    if (!examen) {
      if (info.estado_vacante !== "activa") {
        return res.status(409).json({
          mensaje: "La vacante ya no está disponible"
        });
      }

      const carrera = await pruebaParaEstudiante(
        pool,
        info.id_empresa,
        info.carrera_estudiante
      );

      // La empresa no tiene prueba para esta carrera:
      // se puede postular directo
      if (!carrera) {
        return res.json({ examen: null });
      }

      const preguntasEmpresa = await consultarPreguntas(
        pool,
        info.id_empresa,
        carrera
      );

      const copia = preguntasEmpresa.map((p) => {
        const opciones = revolver([p.correcta, ...p.incorrectas]);

        return {
          id: p.id_pregunta,
          texto: p.pregunta,
          opciones,
          correcta: opciones.indexOf(p.correcta),
        };
      });

      await pool.query(
        `INSERT INTO examenes_vacante (
           id_estudiante, id_vacante, carrera, preguntas, total
         )
         VALUES ($1, $2, $3, $4::jsonb, $5)
         ON CONFLICT (id_estudiante, id_vacante) DO NOTHING`,
        [
          info.id_estudiante,
          idVacante,
          carrera,
          JSON.stringify(copia),
          copia.length,
        ]
      );

      examen = await buscarExamen(pool, info.id_estudiante, idVacante);
    }

    const completado = Boolean(examen.fecha_completado);

    return res.json({
      examen: {
        id_vacante: idVacante,
        titulo_vacante: info.titulo_vacante,
        nombre_empresa: info.nombre_empresa,
        carrera: examen.carrera,
        carrera_nombre: examen.carrera ? nombreCarrera(examen.carrera) : null,
        preguntas: preguntasParaEstudiante(examen.preguntas),
        completado,
        resultado: completado ? formatoResultado(examen) : null,
      }
    });

  } catch (error) {
    console.error("Error al consultar examen:", error);

    return res.status(500).json({
      mensaje: "No se pudo cargar la prueba"
    });
  }
};

// ========================================
// CALIFICAR ANTES DE POSTULAR (dentro de la transacción
// que registra la postulación)
// Devuelve { error }, { resultado } o { resultado: null }
// si no hay prueba que presentar.
// ========================================

const calificarAntesDePostular = async (
  client,
  idEstudiante,
  idVacante,
  respuestas
) => {
  const examen = await buscarExamen(client, idEstudiante, idVacante, true);

  if (!examen) {
    const datos = await client.query(
      `SELECT v.id_empresa, est.carrera
       FROM vacantes v
       CROSS JOIN estudiantes est
       WHERE v.id_vacante = $1
         AND est.id_estudiante = $2`,
      [idVacante, idEstudiante]
    );

    const fila = datos.rows[0];
    const carrera = fila
      ? await pruebaParaEstudiante(client, fila.id_empresa, fila.carrera)
      : null;

    if (carrera) {
      return {
        error: {
          status: 409,
          mensaje: "Primero debes presentar la prueba de conocimientos"
        }
      };
    }

    return { resultado: null };
  }

  // Ya la había presentado (p. ej. canceló y se vuelve a postular)
  if (examen.fecha_completado) {
    return { resultado: formatoResultado(examen) };
  }

  if (
    !respuestas ||
    typeof respuestas !== "object" ||
    Array.isArray(respuestas)
  ) {
    return {
      error: {
        status: 400,
        mensaje: "Responde la prueba antes de postularte"
      }
    };
  }

  const limpias = {};
  let aciertos = 0;

  for (const pregunta of examen.preguntas) {
    const valor = Number(respuestas[pregunta.id]);

    if (
      !Number.isInteger(valor) ||
      valor < 0 ||
      valor >= pregunta.opciones.length
    ) {
      return {
        error: {
          status: 400,
          mensaje: "Responde todas las preguntas de la prueba"
        }
      };
    }

    limpias[pregunta.id] = valor;
    if (valor === pregunta.correcta) aciertos += 1;
  }

  const total = examen.preguntas.length;
  const calificacion = total
    ? Math.round((aciertos / total) * 10000) / 100
    : 0;

  const guardado = await client.query(
    `UPDATE examenes_vacante
     SET respuestas = $3::jsonb,
         aciertos = $4,
         total = $5,
         calificacion = $6,
         fecha_completado = NOW()
     WHERE id_estudiante = $1
       AND id_vacante = $2
     RETURNING aciertos, total, calificacion, fecha_completado`,
    [idEstudiante, idVacante, JSON.stringify(limpias), aciertos, total, calificacion]
  );

  return { resultado: formatoResultado(guardado.rows[0]) };
};

module.exports = {
  obtenerPruebasEmpresa,
  obtenerPruebaCarrera,
  guardarPruebaCarrera,
  empresasConPrueba,
  obtenerExamenVacante,
  calificarAntesDePostular,
};
