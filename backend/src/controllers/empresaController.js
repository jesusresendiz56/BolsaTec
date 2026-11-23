
const pool = require("../config/database");
const {
  SECTORES,
  TAMANOS,
  giroDeSector,
  validarPerfil
} = require("../services/perfilEmpresa");

// ========================================
// OBTENER EMPRESA AUTENTICADA
// ========================================

const buscarEmpresa = async (idUsuario) => {
  const resultado = await pool.query(
    `SELECT id_empresa, nombre_empresa
     FROM empresas
     WHERE id_usuario = $1`,
    [idUsuario]
  );

  return resultado.rows[0] || null;
};

// ========================================
// ESTADÍSTICAS DE EMPRESA
// ========================================

const obtenerEstadisticas = async (req, res) => {
  try {
    const idUsuario = req.usuario.id_usuario;

    const empresa = await buscarEmpresa(idUsuario);

    if (!empresa) {
      return res.status(404).json({
        mensaje: "No se encontró el perfil empresarial"
      });
    }

    const resultado = await pool.query(
      `SELECT
        (SELECT COUNT(*)
         FROM vacantes
         WHERE id_empresa = $1) AS vacantes,

        (SELECT COUNT(DISTINCT p.id_estudiante)
         FROM postulaciones p
         INNER JOIN vacantes v
           ON v.id_vacante = p.id_vacante
         WHERE v.id_empresa = $1) AS candidatos,

        (SELECT COUNT(*)
         FROM postulaciones p
         INNER JOIN vacantes v
           ON v.id_vacante = p.id_vacante
         WHERE v.id_empresa = $1) AS postulaciones,

        (SELECT COUNT(*)
         FROM notificaciones
         WHERE id_usuario = $2
           AND leida = FALSE) AS notificaciones`,
      [empresa.id_empresa, idUsuario]
    );

    const datos = resultado.rows[0];

    return res.json({
      empresa,
      vacantes: Number(datos.vacantes),
      candidatos: Number(datos.candidatos),
      postulaciones: Number(datos.postulaciones),
      notificaciones: Number(datos.notificaciones)
    });

  } catch (error) {
    console.error("Error en estadísticas:", error);

    return res.status(500).json({
      mensaje: "No se pudieron obtener las estadísticas"
    });
  }
};

// ========================================
// CONSULTAR VACANTES
// ========================================

const obtenerVacantes = async (req, res) => {
  try {
    const empresa = await buscarEmpresa(req.usuario.id_usuario);

    if (!empresa) {
      return res.status(404).json({
        mensaje: "Empresa no encontrada"
      });
    }

    const resultado = await pool.query(
      `SELECT
        v.*,
        (SELECT COUNT(*)
         FROM postulaciones p
         WHERE p.id_vacante = v.id_vacante
        ) AS total_postulaciones
       FROM vacantes v
       WHERE v.id_empresa = $1
       ORDER BY v.fecha_publicacion DESC, v.id_vacante DESC`,
      [empresa.id_empresa]
    );

    return res.json({
      vacantes: resultado.rows.map((vacante) => ({
        ...vacante,
        total_postulaciones: Number(vacante.total_postulaciones)
      }))
    });

  } catch (error) {
    console.error("Error al consultar vacantes:", error);

    return res.status(500).json({
      mensaje: "Error al consultar las vacantes"
    });
  }
};

// ========================================
// DIRECCIÓN DETALLADA Y COORDENADAS
// ========================================

const CAMPOS_DIRECCION = {
  direccion_calle: 150,
  direccion_numero: 30,
  direccion_colonia: 120,
  direccion_cp: 5,
  direccion_ciudad: 120,
  direccion_estado: 60
};

// Valida los campos de dirección y arma el texto de
// "ubicacion" que se muestra en la vacante.
const procesarDireccion = (body = {}) => {
  const campos = {};

  for (const [campo, maximo] of Object.entries(CAMPOS_DIRECCION)) {
    const valor = body[campo];

    if (valor != null && typeof valor !== "string") {
      return { error: "Los datos de la dirección no son válidos" };
    }

    const limpio = valor?.trim() || null;

    if (limpio && limpio.length > maximo) {
      return { error: "Uno de los campos de la dirección es demasiado largo" };
    }

    campos[campo] = limpio;
  }

  if (campos.direccion_cp && !/^\d{5}$/.test(campos.direccion_cp)) {
    return { error: "El código postal debe tener 5 dígitos" };
  }

  // Coordenadas: ambas o ninguna
  const lat = body.latitud === "" || body.latitud == null
    ? null
    : Number(body.latitud);
  const lng = body.longitud === "" || body.longitud == null
    ? null
    : Number(body.longitud);

  if ((lat === null) !== (lng === null)) {
    return { error: "La ubicación en el mapa está incompleta" };
  }

  if (
    lat !== null &&
    (!Number.isFinite(lat) || lat < -90 || lat > 90 ||
     !Number.isFinite(lng) || lng < -180 || lng > 180)
  ) {
    return { error: "La ubicación en el mapa no es válida" };
  }

  // Texto completo: "Calle 7 25, Pantitlán, 08100, Iztacalco, CDMX"
  const calleNumero = [campos.direccion_calle, campos.direccion_numero]
    .filter(Boolean)
    .join(" ");

  const compuesta = [
    calleNumero,
    campos.direccion_colonia,
    campos.direccion_cp ? `C.P. ${campos.direccion_cp}` : null,
    campos.direccion_ciudad,
    campos.direccion_estado
  ]
    .filter(Boolean)
    .join(", ");

  // Si no se usaron los campos nuevos, conservar el texto libre
  const ubicacion =
    compuesta ||
    (typeof body.ubicacion === "string" ? body.ubicacion.trim() : "") ||
    null;

  return {
    ubicacion,
    campos,
    latitud: lat === null ? null : Number(lat.toFixed(6)),
    longitud: lng === null ? null : Number(lng.toFixed(6))
  };
};

// ========================================
// CREAR VACANTE
// ========================================

const crearVacante = async (req, res) => {
  try {
    const empresa = await buscarEmpresa(req.usuario.id_usuario);

    if (!empresa) {
      return res.status(404).json({
        mensaje: "Empresa no encontrada"
      });
    }

    const {
      titulo,
      descripcion,
      modalidad,
      tipo,
      ubicacion,
      salario_min,
      salario_max
    } = req.body;

    if (!titulo?.trim() || !descripcion?.trim()) {
      return res.status(400).json({
        mensaje: "El título y la descripción son obligatorios"
      });
    }

    if (!["presencial", "hibrida", "remota"].includes(modalidad)) {
      return res.status(400).json({
        mensaje: "Modalidad no válida"
      });
    }

    if (!["practicas", "medio_tiempo", "tiempo_completo"].includes(tipo)) {
      return res.status(400).json({
        mensaje: "Tipo de vacante no válido"
      });
    }

    const minimo = salario_min === "" || salario_min == null
      ? null
      : Number(salario_min);

    const maximo = salario_max === "" || salario_max == null
      ? null
      : Number(salario_max);

    if (
      (minimo !== null && (!Number.isFinite(minimo) || minimo < 0)) ||
      (maximo !== null && (!Number.isFinite(maximo) || maximo < 0)) ||
      (minimo !== null && maximo !== null && minimo > maximo)
    ) {
      return res.status(400).json({
        mensaje: "El rango salarial no es válido"
      });
    }

    const direccion = procesarDireccion(req.body);

    if (direccion.error) {
      return res.status(400).json({ mensaje: direccion.error });
    }

    const resultado = await pool.query(
      `INSERT INTO vacantes (
        id_empresa,
        titulo,
        descripcion,
        modalidad,
        tipo,
        ubicacion,
        salario_min,
        salario_max,
        estado,
        direccion_calle,
        direccion_numero,
        direccion_colonia,
        direccion_cp,
        direccion_ciudad,
        direccion_estado,
        latitud,
        longitud
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'activa',
              $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        empresa.id_empresa,
        titulo.trim(),
        descripcion.trim(),
        modalidad,
        tipo,
        direccion.ubicacion,
        minimo,
        maximo,
        direccion.campos.direccion_calle,
        direccion.campos.direccion_numero,
        direccion.campos.direccion_colonia,
        direccion.campos.direccion_cp,
        direccion.campos.direccion_ciudad,
        direccion.campos.direccion_estado,
        direccion.latitud,
        direccion.longitud
      ]
    );

    return res.status(201).json({
      mensaje: "Vacante publicada correctamente",
      vacante: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error al crear vacante:", error);

    return res.status(500).json({
      mensaje: "Error al crear la vacante"
    });
  }
};

// ========================================
// EDITAR VACANTE
// ========================================

const editarVacante = async (req, res) => {
  try {
    const empresa = await buscarEmpresa(req.usuario.id_usuario);

    if (!empresa) {
      return res.status(404).json({
        mensaje: "Empresa no encontrada"
      });
    }

    const idVacante = Number(req.params.id);

    if (!Number.isSafeInteger(idVacante) || idVacante <= 0) {
      return res.status(400).json({
        mensaje: "Identificador de vacante no válido"
      });
    }

    const {
      titulo,
      descripcion,
      modalidad,
      tipo,
      ubicacion,
      salario_min,
      salario_max
    } = req.body;

    if (
      typeof titulo !== "string" ||
      !titulo.trim() ||
      typeof descripcion !== "string" ||
      !descripcion.trim()
    ) {
      return res.status(400).json({
        mensaje: "El título y la descripción son obligatorios"
      });
    }

    if (!["presencial", "hibrida", "remota"].includes(modalidad)) {
      return res.status(400).json({
        mensaje: "Modalidad no válida"
      });
    }

    if (!["practicas", "medio_tiempo", "tiempo_completo"].includes(tipo)) {
      return res.status(400).json({
        mensaje: "Tipo de vacante no válido"
      });
    }

    const minimo = salario_min === "" || salario_min == null
      ? null
      : Number(salario_min);

    const maximo = salario_max === "" || salario_max == null
      ? null
      : Number(salario_max);

    if (
      (minimo !== null && (!Number.isFinite(minimo) || minimo < 0)) ||
      (maximo !== null && (!Number.isFinite(maximo) || maximo < 0)) ||
      (minimo !== null && maximo !== null && minimo > maximo)
    ) {
      return res.status(400).json({
        mensaje: "El rango salarial no es válido"
      });
    }

    const direccion = procesarDireccion(req.body);

    if (direccion.error) {
      return res.status(400).json({ mensaje: direccion.error });
    }

    const resultado = await pool.query(
      `UPDATE vacantes
       SET
         titulo = $1,
         descripcion = $2,
         modalidad = $3,
         tipo = $4,
         ubicacion = $5,
         salario_min = $6,
         salario_max = $7,
         direccion_calle = $10,
         direccion_numero = $11,
         direccion_colonia = $12,
         direccion_cp = $13,
         direccion_ciudad = $14,
         direccion_estado = $15,
         latitud = $16,
         longitud = $17
       WHERE id_vacante = $8
         AND id_empresa = $9
       RETURNING *`,
      [
        titulo.trim(),
        descripcion.trim(),
        modalidad,
        tipo,
        direccion.ubicacion,
        minimo,
        maximo,
        idVacante,
        empresa.id_empresa,
        direccion.campos.direccion_calle,
        direccion.campos.direccion_numero,
        direccion.campos.direccion_colonia,
        direccion.campos.direccion_cp,
        direccion.campos.direccion_ciudad,
        direccion.campos.direccion_estado,
        direccion.latitud,
        direccion.longitud
      ]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Vacante no encontrada"
      });
    }

    return res.json({
      mensaje: "Vacante actualizada correctamente",
      vacante: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error al editar vacante:", error);

    return res.status(500).json({
      mensaje: "Error al editar la vacante"
    });
  }
};

// ========================================
// CAMBIAR ESTADO DE VACANTE
// ========================================

const cambiarEstadoVacante = async (req, res) => {
  try {
    const empresa = await buscarEmpresa(req.usuario.id_usuario);

    if (!empresa) {
      return res.status(404).json({
        mensaje: "Empresa no encontrada"
      });
    }

    const idVacante = Number(req.params.id);
    const { estado } = req.body;

    if (!Number.isSafeInteger(idVacante) || idVacante <= 0) {
      return res.status(400).json({
        mensaje: "Identificador de vacante no válido"
      });
    }

    if (!["activa", "pausada", "cerrada"].includes(estado)) {
      return res.status(400).json({
        mensaje: "Estado de vacante no válido"
      });
    }

    const resultado = await pool.query(
      `UPDATE vacantes
       SET estado = $1
       WHERE id_vacante = $2
         AND id_empresa = $3
       RETURNING *`,
      [estado, idVacante, empresa.id_empresa]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Vacante no encontrada"
      });
    }

    return res.json({
      mensaje: "Estado actualizado correctamente",
      vacante: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error al cambiar estado:", error);

    return res.status(500).json({
      mensaje: "Error al cambiar el estado"
    });
  }
};

// ========================================
// ELIMINAR VACANTE
// ========================================

const eliminarVacante = async (req, res) => {
  try {
    const empresa = await buscarEmpresa(req.usuario.id_usuario);

    if (!empresa) {
      return res.status(404).json({
        mensaje: "Empresa no encontrada"
      });
    }

    const idVacante = Number(req.params.id);

    if (!Number.isSafeInteger(idVacante) || idVacante <= 0) {
      return res.status(400).json({
        mensaje: "Identificador de vacante no válido"
      });
    }

    // Evitar eliminar vacantes con postulaciones.
    const resultado = await pool.query(
      `DELETE FROM vacantes v
       WHERE v.id_vacante = $1
         AND v.id_empresa = $2
         AND NOT EXISTS (
           SELECT 1
           FROM postulaciones p
           WHERE p.id_vacante = v.id_vacante
         )
       RETURNING v.id_vacante`,
      [idVacante, empresa.id_empresa]
    );

    if (resultado.rowCount === 0) {
      const consulta = await pool.query(
        `SELECT
          v.id_vacante,
          EXISTS (
            SELECT 1
            FROM postulaciones p
            WHERE p.id_vacante = v.id_vacante
          ) AS tiene_postulaciones
         FROM vacantes v
         WHERE v.id_vacante = $1
           AND v.id_empresa = $2`,
        [idVacante, empresa.id_empresa]
      );

      if (consulta.rows.length === 0) {
        return res.status(404).json({
          mensaje: "Vacante no encontrada"
        });
      }

      if (consulta.rows[0].tiene_postulaciones) {
        return res.status(409).json({
          mensaje: "No puedes eliminar una vacante con postulaciones. Puedes cerrarla."
        });
      }

      return res.status(409).json({
        mensaje: "No se pudo eliminar la vacante"
      });
    }

    return res.json({
      mensaje: "Vacante eliminada correctamente"
    });

  } catch (error) {
    console.error("Error al eliminar vacante:", error);

    return res.status(500).json({
      mensaje: "Error al eliminar la vacante"
    });
  }
};




// ========================================
// OBTENER PERFIL EMPRESARIAL
// ========================================

const CAMPOS_PERFIL = `
  e.id_empresa,
  e.nombre_empresa,
  e.descripcion,
  e.ubicacion,
  e.telefono,
  e.sector,
  e.tamano,
  e.rfc,
  e.sitio_web,
  e.linkedin,
  e.contacto_nombre,
  e.contacto_puesto,
  e.verificada`;

const obtenerPerfil = async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT
        ${CAMPOS_PERFIL},
        u.nombre AS representante,
        u.correo,
        EXISTS (
          SELECT 1
          FROM examen_preguntas_carrera pr
          WHERE pr.id_empresa = e.id_empresa
            AND pr.carrera = 'sector'
        ) AS tiene_prueba
       FROM empresas e
       INNER JOIN usuarios u
         ON u.id_usuario = e.id_usuario
       WHERE e.id_usuario = $1`,
      [req.usuario.id_usuario]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Perfil empresarial no encontrado"
      });
    }

    return res.json({
      empresa: resultado.rows[0],
      // Sector de la lista que corresponde al guardado
      // (útil cuando se capturó como texto libre en el registro)
      sector_sugerido: giroDeSector(resultado.rows[0].sector)?.nombre || null,
      sectores: SECTORES,
      tamanos: TAMANOS
    });
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    return res.status(500).json({
      mensaje: "Error al consultar el perfil empresarial"
    });
  }
};

// ========================================
// ACTUALIZAR PERFIL EMPRESARIAL
// ========================================

// Si cambia el sector, se borra la prueba de conocimientos del
// sector anterior (examen_preguntas_carrera con carrera = 'sector').
const actualizarPerfil = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const actual = await client.query(
      `SELECT id_empresa, sector FROM empresas WHERE id_usuario = $1 FOR UPDATE`,
      [req.usuario.id_usuario]
    );

    if (actual.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        mensaje: "Perfil empresarial no encontrado"
      });
    }

    const validacion = validarPerfil(req.body, actual.rows[0].sector);

    if (validacion.error) {
      await client.query("ROLLBACK");
      return res.status(400).json({ mensaje: validacion.error });
    }

    const d = validacion.datos;

    const resultado = await client.query(
      `UPDATE empresas e
       SET nombre_empresa = $1,
           descripcion = $2,
           ubicacion = $3,
           telefono = $4,
           sector = $5,
           tamano = $6,
           rfc = $7,
           sitio_web = $8,
           linkedin = $9,
           contacto_nombre = $10,
           contacto_puesto = $11
       WHERE e.id_usuario = $12
       RETURNING ${CAMPOS_PERFIL}`,
      [
        d.nombre_empresa,
        d.descripcion,
        d.ubicacion,
        d.telefono,
        d.sector,
        d.tamano,
        d.rfc,
        d.sitio_web,
        d.linkedin,
        d.contacto_nombre,
        d.contacto_puesto,
        req.usuario.id_usuario
      ]
    );

    let pruebaBorrada = false;

    if ((actual.rows[0].sector || null) !== (d.sector || null)) {
      const borrado = await client.query(
        `DELETE FROM examen_preguntas_carrera
         WHERE id_empresa = $1
           AND carrera = 'sector'`,
        [actual.rows[0].id_empresa]
      );

      pruebaBorrada = borrado.rowCount > 0;
    }

    await client.query("COMMIT");

    return res.json({
      mensaje: pruebaBorrada
        ? "Perfil actualizado. Como cambiaste el sector, se borró tu prueba de conocimientos; crea la del nuevo sector en \"Pruebas\"."
        : "Perfil empresarial actualizado correctamente",
      empresa: resultado.rows[0],
      prueba_borrada: pruebaBorrada
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Error al actualizar perfil:", error);
    return res.status(500).json({
      mensaje: "Error al actualizar el perfil empresarial"
    });
  } finally {
    client.release();
  }
};

// ========================================
// EXPORTAR FUNCIONES
// ========================================

module.exports = {
  obtenerEstadisticas,
  obtenerVacantes,
  crearVacante,
  editarVacante,
  cambiarEstadoVacante,
  eliminarVacante,
  obtenerPerfil,
  actualizarPerfil
};