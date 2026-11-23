const pool = require("../config/database");
const { nombreCarrera } = require("../services/carreras");
const { SECTORES } = require("../services/perfilEmpresa");

// ========================================
// PRUEBA DE CONOCIMIENTOS ANTES DE POSTULARSE
// Cada empresa escribe UNA prueba, la del sector (giro)
// de su perfil. Al postularse a cualquier vacante de la
// empresa, el estudiante presenta esa prueba (sin importar
// su carrera) y el resultado se envía a la empresa con la
// postulación.
// Las preguntas se guardan en examen_preguntas_carrera con
// carrera = "sector". Las pruebas por carrera anteriores
// quedan guardadas pero ya no se usan.
// ========================================

const CLAVE_SECTOR = "sector";

// Sector de la lista (sin "Otro"); null si no es válido para la prueba
const sectorDePrueba = (sector) =>
  sector && sector !== "Otro" && SECTORES.includes(sector) ? sector : null;

// Nombre que se muestra de la prueba presentada
const nombrePrueba = (clave, sectorEmpresa) =>
  clave === CLAVE_SECTOR
    ? sectorEmpresa || "Sector de la empresa"
    : nombreCarrera(clave);

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
    `SELECT id_empresa, sector FROM empresas WHERE id_usuario = $1`,
    [idUsuario]
  );

  return resultado.rows[0] || null;
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

// Clave de la prueba que le toca al estudiante con esta empresa
// (la del sector), o null si la empresa no tiene prueba.
const pruebaParaEstudiante = async (db, idEmpresa) => {
  const resultado = await db.query(
    `SELECT 1
     FROM examen_preguntas_carrera
     WHERE id_empresa = $1
       AND carrera = $2
     LIMIT 1`,
    [idEmpresa, CLAVE_SECTOR]
  );

  return resultado.rows.length ? CLAVE_SECTOR : null;
};

// ========================================
// EMPRESA: PRUEBA DEL SECTOR
// GET /api/empresa/pruebas
// ========================================

const obtenerPruebasEmpresa = async (req, res) => {
  try {
    const empresa = await buscarEmpresa(req.usuario.id_usuario);

    if (!empresa) {
      return res.status(404).json({ mensaje: "Empresa no encontrada" });
    }

    const resultado = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM examen_preguntas_carrera
       WHERE id_empresa = $1
         AND carrera = $2`,
      [empresa.id_empresa, CLAVE_SECTOR]
    );

    return res.json({
      sector: empresa.sector,
      giro: sectorDePrueba(empresa.sector),
      prueba: {
        clave: CLAVE_SECTOR,
        nombre: sectorDePrueba(empresa.sector) || "Sector de la empresa",
        total_preguntas: resultado.rows[0].total,
      },
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
// EMPRESA: PREGUNTAS DE LA PRUEBA DEL SECTOR
// GET /api/empresa/pruebas/sector
// ========================================

const obtenerPruebaCarrera = async (req, res) => {
  try {
    if (req.params.carrera !== CLAVE_SECTOR) {
      return res.status(400).json({
        mensaje: "La prueba debe ser del sector de la empresa"
      });
    }

    const empresa = await buscarEmpresa(req.usuario.id_usuario);

    if (!empresa) {
      return res.status(404).json({ mensaje: "Empresa no encontrada" });
    }

    return res.json({
      carrera: {
        clave: CLAVE_SECTOR,
        nombre: sectorDePrueba(empresa.sector) || "Sector de la empresa",
      },
      giro: sectorDePrueba(empresa.sector),
      preguntas: await consultarPreguntas(pool, empresa.id_empresa, CLAVE_SECTOR),
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
// EMPRESA: GUARDAR LA PRUEBA DEL SECTOR
// PUT /api/empresa/pruebas/sector
// body: { preguntas: [{ pregunta, correcta, incorrectas: [] }] }
// Reemplaza todas las preguntas. Una lista vacía quita
// la prueba. Solo se puede crear si la empresa eligió
// un sector de la lista en su perfil.
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
  const carrera = CLAVE_SECTOR;

  if (req.params.carrera !== CLAVE_SECTOR) {
    return res.status(400).json({
      mensaje: "La prueba debe ser del sector de la empresa"
    });
  }

  const validacion = validarPreguntas(req.body?.preguntas);

  if (validacion.error) {
    return res.status(400).json({ mensaje: validacion.error });
  }

  let empresa;

  try {
    empresa = await buscarEmpresa(req.usuario.id_usuario);
  } catch (error) {
    console.error("Error al guardar la prueba:", error);
    return res.status(500).json({ mensaje: "No se pudo guardar la prueba" });
  }

  if (!empresa) {
    return res.status(404).json({ mensaje: "Empresa no encontrada" });
  }

  const idEmpresa = empresa.id_empresa;
  const giro = sectorDePrueba(empresa.sector);

  // Para crear o editar la prueba se necesita un sector de la lista
  // (quitarla siempre se permite)
  if (!giro && validacion.preguntas.length) {
    return res.status(400).json({
      mensaje: "Primero elige el sector de tu empresa (de la lista) en tu perfil"
    });
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
        ? `Prueba del sector ${giro} guardada (${total} ${total === 1 ? "pregunta" : "preguntas"})`
        : "Se quitó la prueba del sector",
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
// Devuelve el conjunto de id_empresa que tienen prueba
// del sector (aplica a todos los estudiantes).
// ========================================

const empresasConPrueba = async () => {
  const resultado = await pool.query(
    `SELECT DISTINCT id_empresa
     FROM examen_preguntas_carrera
     WHERE carrera = $1`,
    [CLAVE_SECTOR]
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
         v.id_empresa,
         e.sector AS sector_empresa,
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

      const carrera = await pruebaParaEstudiante(pool, info.id_empresa);

      // La empresa no tiene prueba:
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
        carrera_nombre: examen.carrera
          ? nombrePrueba(examen.carrera, info.sector_empresa)
          : null,
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
      `SELECT id_empresa FROM vacantes WHERE id_vacante = $1`,
      [idVacante]
    );

    const fila = datos.rows[0];
    const carrera = fila
      ? await pruebaParaEstudiante(client, fila.id_empresa)
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
  nombrePrueba,
  obtenerPruebasEmpresa,
  obtenerPruebaCarrera,
  guardarPruebaCarrera,
  empresasConPrueba,
  obtenerExamenVacante,
  calificarAntesDePostular,
};
