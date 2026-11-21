const pool = require("../config/database");

// ========================================
// PRUEBA DE CONOCIMIENTOS ANTES DE POSTULARSE
// La empresa define las preguntas de cada vacante.
// El estudiante la responde antes de postularse y el
// resultado se envía a la empresa con la postulación.
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

// ========================================
// EMPRESA: CONSULTAR PREGUNTAS DE UNA VACANTE
// GET /api/empresa/vacantes/:id/examen
// ========================================

const vacanteDeEmpresa = async (idVacante, idUsuario) => {
  const resultado = await pool.query(
    `SELECT v.id_vacante, v.titulo
     FROM vacantes v
     INNER JOIN empresas e
       ON e.id_empresa = v.id_empresa
     WHERE v.id_vacante = $1
       AND e.id_usuario = $2`,
    [idVacante, idUsuario]
  );

  return resultado.rows[0] || null;
};

const consultarPreguntas = async (db, idVacante) => {
  const resultado = await db.query(
    `SELECT id_pregunta, pregunta, correcta, incorrectas
     FROM examen_preguntas
     WHERE id_vacante = $1
     ORDER BY orden, id_pregunta`,
    [idVacante]
  );

  return resultado.rows;
};

const obtenerExamenEmpresa = async (req, res) => {
  try {
    const idVacante = leerId(req.params.id);

    if (!idVacante) {
      return res.status(400).json({
        mensaje: "Identificador de vacante no válido"
      });
    }

    const vacante = await vacanteDeEmpresa(
      idVacante,
      req.usuario.id_usuario
    );

    if (!vacante) {
      return res.status(404).json({
        mensaje: "Vacante no encontrada"
      });
    }

    return res.json({
      vacante,
      preguntas: await consultarPreguntas(pool, idVacante),
      max_preguntas: MAX_PREGUNTAS,
      max_incorrectas: MAX_INCORRECTAS,
    });

  } catch (error) {
    console.error("Error al consultar examen de la vacante:", error);

    return res.status(500).json({
      mensaje: "No se pudo consultar la prueba"
    });
  }
};

// ========================================
// EMPRESA: GUARDAR PREGUNTAS DE UNA VACANTE
// PUT /api/empresa/vacantes/:id/examen
// body: { preguntas: [{ pregunta, correcta, incorrectas: [] }] }
// Reemplaza todas las preguntas. Una lista vacía quita
// el examen de la vacante.
// ========================================

const validarPreguntas = (preguntas) => {
  if (!Array.isArray(preguntas)) {
    return { error: "Debes enviar la lista de preguntas" };
  }

  if (preguntas.length > MAX_PREGUNTAS) {
    return { error: `El examen puede tener máximo ${MAX_PREGUNTAS} preguntas` };
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

const guardarExamenEmpresa = async (req, res) => {
  const idVacante = leerId(req.params.id);

  if (!idVacante) {
    return res.status(400).json({
      mensaje: "Identificador de vacante no válido"
    });
  }

  const validacion = validarPreguntas(req.body?.preguntas);

  if (validacion.error) {
    return res.status(400).json({ mensaje: validacion.error });
  }

  const client = await pool.connect();

  try {
    const vacante = await vacanteDeEmpresa(
      idVacante,
      req.usuario.id_usuario
    );

    if (!vacante) {
      return res.status(404).json({
        mensaje: "Vacante no encontrada"
      });
    }

    await client.query("BEGIN");

    await client.query(
      `DELETE FROM examen_preguntas WHERE id_vacante = $1`,
      [idVacante]
    );

    for (const [orden, item] of validacion.preguntas.entries()) {
      await client.query(
        `INSERT INTO examen_preguntas (
           id_vacante, orden, pregunta, correcta, incorrectas
         )
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [
          idVacante,
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
        ? `Prueba guardada (${total} ${total === 1 ? "pregunta" : "preguntas"})`
        : "Se quitó la prueba de la vacante",
      preguntas: await consultarPreguntas(pool, idVacante),
    });

  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Error al guardar examen de la vacante:", error);

    return res.status(500).json({
      mensaje: "No se pudo guardar la prueba"
    });
  } finally {
    client.release();
  }
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

      const preguntasEmpresa = await consultarPreguntas(pool, idVacante);

      // La vacante no tiene examen: se puede postular directo
      if (!preguntasEmpresa.length) {
        return res.json({ examen: null });
      }

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
           id_estudiante, id_vacante, preguntas, total
         )
         VALUES ($1, $2, $3::jsonb, $4)
         ON CONFLICT (id_estudiante, id_vacante) DO NOTHING`,
        [info.id_estudiante, idVacante, JSON.stringify(copia), copia.length]
      );

      examen = await buscarExamen(pool, info.id_estudiante, idVacante);
    }

    const completado = Boolean(examen.fecha_completado);

    return res.json({
      examen: {
        id_vacante: idVacante,
        titulo_vacante: info.titulo_vacante,
        nombre_empresa: info.nombre_empresa,
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
// si la vacante no tiene examen.
// ========================================

const calificarAntesDePostular = async (
  client,
  idEstudiante,
  idVacante,
  respuestas
) => {
  const examen = await buscarExamen(client, idEstudiante, idVacante, true);

  if (!examen) {
    const preguntas = await client.query(
      `SELECT 1 FROM examen_preguntas WHERE id_vacante = $1 LIMIT 1`,
      [idVacante]
    );

    if (preguntas.rowCount) {
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
  obtenerExamenEmpresa,
  guardarExamenEmpresa,
  obtenerExamenVacante,
  calificarAntesDePostular,
};
