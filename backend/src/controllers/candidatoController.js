
const pool = require("../config/database");
const supabase = require("../config/supabase");
const { enviarCorreo } = require("../services/brevoService");
const { crearNotificacion } = require("../services/notificacionService");

const ESTADOS_POSTULACION = [
  "enviada",
  "vista",
  "entrevista",
  "aceptada",
  "rechazada"
];

const NOMBRES_ESTADO = {
  enviada: "Enviada",
  vista: "Vista por la empresa",
  entrevista: "En entrevista",
  aceptada: "Aceptada",
  rechazada: "Rechazada"
};

// ========================================
// NOTIFICAR CAMBIO DE ESTADO AL ESTUDIANTE
// ========================================

const notificarCambioEstado = async (idPostulacion) => {
  try {
    const resultado = await pool.query(
      `SELECT
         p.estado,
         v.titulo AS titulo_vacante,
         e.nombre_empresa,
         us.id_usuario AS id_usuario_estudiante,
         us.nombre AS nombre_estudiante,
         us.correo AS correo_estudiante
       FROM postulaciones p
       INNER JOIN vacantes v
         ON v.id_vacante = p.id_vacante
       INNER JOIN empresas e
         ON e.id_empresa = v.id_empresa
       INNER JOIN estudiantes est
         ON est.id_estudiante = p.id_estudiante
       INNER JOIN usuarios us
         ON us.id_usuario = est.id_usuario
       WHERE p.id_postulacion = $1`,
      [idPostulacion]
    );

    if (!resultado.rows.length) return;

    const datos = resultado.rows[0];
    const nombreEstado =
      NOMBRES_ESTADO[datos.estado] || datos.estado;

    const mensaje =
      `Tu postulación a "${datos.titulo_vacante}" ` +
      `de "${datos.nombre_empresa}" cambió a: ${nombreEstado}.`;

    const tareas = await Promise.allSettled([
      crearNotificacion(datos.id_usuario_estudiante, mensaje),
      enviarCorreo({
        destinatario: datos.correo_estudiante,
        asunto: "Actualización de tu postulación - BolsaTec",
        mensaje:
          `Hola ${datos.nombre_estudiante},\n\n` +
          `${mensaje}\n\n` +
          `Consulta el detalle en la sección ` +
          `"Mis postulaciones" de BolsaTec.\n\n` +
          `BolsaTec - Tu futuro profesional comienza aquí.`
      })
    ]);

    tareas.forEach((tarea, indice) => {
      if (tarea.status === "rejected") {
        console.error(
          indice === 0
            ? "Notificación de cambio de estado: error -"
            : "Correo de cambio de estado: error -",
          tarea.reason?.message || tarea.reason
        );
      }
    });
  } catch (error) {
    console.error(
      "Error al notificar cambio de estado:",
      error.message
    );
  }
};

// ========================================
// CONSULTAR POSTULACIONES DE LA EMPRESA
// (agrupadas por vacante)
// ========================================

const obtenerPostulacionesEmpresa = async (req, res) => {
  try {
    const idUsuario = req.usuario.id_usuario;

    const [vacantes, postulaciones] = await Promise.all([
      pool.query(
        `SELECT
           v.id_vacante,
           v.titulo,
           v.estado AS estado_vacante,
           COUNT(p.id_postulacion)::int AS total,
           COUNT(*) FILTER (WHERE p.estado = 'enviada')::int AS enviada,
           COUNT(*) FILTER (WHERE p.estado = 'vista')::int AS vista,
           COUNT(*) FILTER (WHERE p.estado = 'entrevista')::int AS entrevista,
           COUNT(*) FILTER (WHERE p.estado = 'aceptada')::int AS aceptada,
           COUNT(*) FILTER (WHERE p.estado = 'rechazada')::int AS rechazada
         FROM vacantes v
         INNER JOIN empresas e
           ON e.id_empresa = v.id_empresa
         LEFT JOIN postulaciones p
           ON p.id_vacante = v.id_vacante
         WHERE e.id_usuario = $1
         GROUP BY v.id_vacante, v.titulo, v.estado
         ORDER BY total DESC, v.id_vacante DESC`,
        [idUsuario]
      ),
      pool.query(
        `SELECT
           p.id_postulacion,
           p.id_vacante,
           p.estado,
           p.fecha_postulacion,
           v.titulo AS titulo_vacante,
           u.nombre AS nombre_estudiante,
           u.correo AS correo_estudiante,
           est.carrera,
           est.semestre,
           (est.cv_url IS NOT NULL) AS tiene_curriculum
         FROM postulaciones p
         INNER JOIN vacantes v
           ON v.id_vacante = p.id_vacante
         INNER JOIN empresas e
           ON e.id_empresa = v.id_empresa
         INNER JOIN estudiantes est
           ON est.id_estudiante = p.id_estudiante
         INNER JOIN usuarios u
           ON u.id_usuario = est.id_usuario
         WHERE e.id_usuario = $1
         ORDER BY
           p.fecha_postulacion DESC,
           p.id_postulacion DESC`,
        [idUsuario]
      )
    ]);

    return res.json({
      vacantes: vacantes.rows,
      postulaciones: postulaciones.rows,
      total: postulaciones.rowCount
    });

  } catch (error) {
    console.error(
      "Error al consultar postulaciones de la empresa:",
      error
    );

    return res.status(500).json({
      mensaje: "No se pudieron consultar las postulaciones"
    });
  }
};

// ========================================
// CONSULTAR CANDIDATOS DE LA EMPRESA
// ========================================

const obtenerCandidatos = async (req, res) => {
  try {
    const idUsuario = req.usuario.id_usuario;

    const resultado = await pool.query(
      `SELECT
        p.id_postulacion,
        p.id_vacante,
        p.id_estudiante,
        p.estado,
        p.fecha_postulacion,
        p.compatibilidad,

        v.titulo AS titulo_vacante,

        u.nombre AS nombre_estudiante,
        u.correo AS correo_estudiante,

        est.carrera,
        est.semestre,
        est.descripcion,
        (est.cv_url IS NOT NULL) AS tiene_curriculum

       FROM postulaciones p

       INNER JOIN vacantes v
         ON v.id_vacante = p.id_vacante

       INNER JOIN empresas e
         ON e.id_empresa = v.id_empresa

       INNER JOIN estudiantes est
         ON est.id_estudiante = p.id_estudiante

       INNER JOIN usuarios u
         ON u.id_usuario = est.id_usuario

       WHERE e.id_usuario = $1

       ORDER BY
         p.fecha_postulacion DESC,
         p.id_postulacion DESC`,
      [idUsuario]
    );

    return res.json({
      candidatos: resultado.rows,
      total: resultado.rowCount
    });

  } catch (error) {
    console.error(
      "Error al consultar candidatos:",
      error
    );

    return res.status(500).json({
      mensaje: "No se pudieron consultar los candidatos"
    });
  }
};

// ========================================
// CONSULTAR DETALLE DE UN CANDIDATO
// ========================================

const obtenerDetalleCandidato = async (req, res) => {
  try {
    const idPostulacion = Number(req.params.id);

    if (
      !Number.isSafeInteger(idPostulacion) ||
      idPostulacion <= 0
    ) {
      return res.status(400).json({
        mensaje: "Identificador de postulación no válido"
      });
    }

    const resultado = await pool.query(
      `SELECT
        p.id_postulacion,
        p.estado,
        p.fecha_postulacion,
        p.compatibilidad,

        v.id_vacante,
        v.titulo AS titulo_vacante,

        u.nombre AS nombre_estudiante,
        u.correo AS correo_estudiante,

        est.id_estudiante,
        est.carrera,
        est.semestre,
        est.descripcion,
        (est.cv_url IS NOT NULL) AS tiene_curriculum

       FROM postulaciones p

       INNER JOIN vacantes v
         ON v.id_vacante = p.id_vacante

       INNER JOIN empresas e
         ON e.id_empresa = v.id_empresa

       INNER JOIN estudiantes est
         ON est.id_estudiante = p.id_estudiante

       INNER JOIN usuarios u
         ON u.id_usuario = est.id_usuario

       WHERE p.id_postulacion = $1
         AND e.id_usuario = $2`,
      [
        idPostulacion,
        req.usuario.id_usuario
      ]
    );

    if (!resultado.rows.length) {
      return res.status(404).json({
        mensaje: "Candidato no encontrado"
      });
    }

    return res.json({
      candidato: resultado.rows[0]
    });

  } catch (error) {
    console.error(
      "Error al consultar detalle del candidato:",
      error
    );

    return res.status(500).json({
      mensaje: "No se pudo consultar el candidato"
    });
  }
};

// ========================================
// CAMBIAR ESTADO DE POSTULACIÓN
// ========================================

const cambiarEstadoCandidato = async (req, res) => {
  try {
    const idPostulacion = Number(req.params.id);
    const { estado } = req.body || {};

    if (
      !Number.isSafeInteger(idPostulacion) ||
      idPostulacion <= 0
    ) {
      return res.status(400).json({
        mensaje: "Identificador de postulación no válido"
      });
    }

    if (!ESTADOS_POSTULACION.includes(estado)) {
      return res.status(400).json({
        mensaje: "Estado de postulación no válido"
      });
    }

    const resultado = await pool.query(
      `UPDATE postulaciones p
       SET estado = $1
       FROM vacantes v
       INNER JOIN empresas e
         ON e.id_empresa = v.id_empresa
       WHERE p.id_postulacion = $2
         AND p.id_vacante = v.id_vacante
         AND e.id_usuario = $3
       RETURNING
         p.id_postulacion,
         p.id_vacante,
         p.id_estudiante,
         p.estado,
         p.fecha_postulacion`,
      [
        estado,
        idPostulacion,
        req.usuario.id_usuario
      ]
    );

    if (!resultado.rows.length) {
      return res.status(404).json({
        mensaje: "Postulación no encontrada"
      });
    }

    // Avisar al estudiante sin bloquear la respuesta.
    void notificarCambioEstado(idPostulacion);

    return res.json({
      mensaje: "Estado de postulación actualizado correctamente",
      postulacion: resultado.rows[0]
    });

  } catch (error) {
    console.error(
      "Error al cambiar estado del candidato:",
      error
    );

    return res.status(500).json({
      mensaje: "No se pudo actualizar el estado"
    });
  }
};

// ========================================
// CONSULTAR CURRÍCULUM DE UN CANDIDATO
// ========================================

const obtenerCurriculumCandidato = async (req, res) => {
  try {
    const idPostulacion = Number(req.params.id);
    const idUsuarioEmpresa = req.usuario.id_usuario;

    if (
      !Number.isSafeInteger(idPostulacion) ||
      idPostulacion <= 0
    ) {
      return res.status(400).json({
        mensaje: "Identificador de postulación no válido"
      });
    }

    // Verificar que la postulación pertenece
    // a una vacante de la empresa autenticada.
    const resultado = await pool.query(
      `SELECT
         est.id_estudiante,
         est.cv_url
       FROM postulaciones p
       INNER JOIN vacantes v
         ON v.id_vacante = p.id_vacante
       INNER JOIN empresas e
         ON e.id_empresa = v.id_empresa
       INNER JOIN estudiantes est
         ON est.id_estudiante = p.id_estudiante
       WHERE p.id_postulacion = $1
         AND e.id_usuario = $2`,
      [idPostulacion, idUsuarioEmpresa]
    );

    if (!resultado.rows.length) {
      return res.status(404).json({
        mensaje: "Postulación no encontrada"
      });
    }

    const estudiante = resultado.rows[0];

    if (!estudiante.cv_url) {
      return res.status(404).json({
        mensaje: "El candidato no tiene un currículum registrado"
      });
    }

    const rutaEsperada =
      `estudiantes/${estudiante.id_estudiante}/curriculum.pdf`;

    if (estudiante.cv_url !== rutaEsperada) {
      return res.status(409).json({
        mensaje: "La referencia del currículum no es válida"
      });
    }

    // Descargar desde el bucket privado.
    const { data, error } = await supabase.storage
      .from("curriculums")
      .download(rutaEsperada);

    if (error || !data) {
      console.error(
        "Error al descargar currículum del candidato:",
        error
      );

      return res.status(500).json({
        mensaje: "No se pudo consultar el currículum"
      });
    }

    const buffer = Buffer.from(
      await data.arrayBuffer()
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="curriculum-candidato.pdf"'
    );
    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
      "X-Content-Type-Options",
      "nosniff"
    );

    return res.send(buffer);

  } catch (error) {
    console.error(
      "Error al consultar currículum del candidato:",
      error
    );

    return res.status(500).json({
      mensaje: "Error al consultar el currículum"
    });
  }
};
module.exports = {
  obtenerPostulacionesEmpresa,
  obtenerCandidatos,
  obtenerDetalleCandidato,
  cambiarEstadoCandidato,
  obtenerCurriculumCandidato
};
