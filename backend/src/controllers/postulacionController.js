
const pool = require("../config/database");
const { enviarCorreo } = require("../services/brevoService");

// ========================================
// ENVIAR NOTIFICACIONES POR BREVO
// ========================================

const notificarNuevaPostulacion = async ({
  idPostulacion,
  idVacante,
  idEstudiante
}) => {
  try {
    const resultado = await pool.query(
      `SELECT
         v.titulo AS titulo_vacante,
         e.nombre_empresa,
         ue.correo AS correo_empresa,
         us.correo AS correo_estudiante,
         us.nombre AS nombre_estudiante
       FROM postulaciones p
       INNER JOIN vacantes v
         ON v.id_vacante = p.id_vacante
       INNER JOIN empresas e
         ON e.id_empresa = v.id_empresa
       INNER JOIN usuarios ue
         ON ue.id_usuario = e.id_usuario
       INNER JOIN estudiantes est
         ON est.id_estudiante = p.id_estudiante
       INNER JOIN usuarios us
         ON us.id_usuario = est.id_usuario
       WHERE p.id_postulacion = $1
         AND p.id_vacante = $2
         AND p.id_estudiante = $3`,
      [idPostulacion, idVacante, idEstudiante]
    );

    if (!resultado.rows.length) {
      console.warn(
        "No se encontraron datos para notificar la postulación"
      );
      return;
    }

    const datos = resultado.rows[0];

    // Confirmación para el estudiante
    const correoEstudiante = enviarCorreo({
      destinatario: datos.correo_estudiante,
      asunto: "Postulación registrada - BolsaTec",
      mensaje:
        `Hola ${datos.nombre_estudiante},\n\n` +
        `Tu postulación a la vacante "${datos.titulo_vacante}" ` +
        `de la empresa "${datos.nombre_empresa}" ` +
        `se registró correctamente.\n\n` +
        `Puedes consultar el estado de tu solicitud ` +
        `en la sección "Mis postulaciones" de BolsaTec.\n\n` +
        `BolsaTec - Tu futuro profesional comienza aquí.`
    });

    // Notificación para la empresa
    const correoEmpresa = enviarCorreo({
      destinatario: datos.correo_empresa,
      asunto: "Nueva postulación recibida - BolsaTec",
      mensaje:
        `Hola ${datos.nombre_empresa},\n\n` +
        `Has recibido una nueva postulación para la vacante ` +
        `"${datos.titulo_vacante}".\n\n` +
        `Candidato: ${datos.nombre_estudiante}\n\n` +
        `Ingresa a BolsaTec para consultar la postulación.\n\n` +
        `BolsaTec - Tu futuro profesional comienza aquí.`
    });

    const resultados = await Promise.allSettled([
      correoEstudiante,
      correoEmpresa
    ]);

    resultados.forEach((resultado, indice) => {
      const tipo = indice === 0 ? "estudiante" : "empresa";

      if (resultado.status === "fulfilled") {
        console.log(
          `Brevo aceptó el correo para ${tipo}:`,
          resultado.value.messageId
        );
      } else {
        console.error(
          `No se pudo enviar el correo para ${tipo}:`,
          resultado.reason?.message
        );
      }
    });

  } catch (error) {
    console.error(
      "Error al preparar notificaciones de postulación:",
      error.message
    );
  }
};

// ========================================
// REGISTRAR POSTULACIÓN
// ========================================

const crearPostulacion = async (req, res) => {
  try {
    const idUsuario = req.usuario.id_usuario;
    const idVacante = Number(req.body?.id_vacante);

    if (!Number.isSafeInteger(idVacante) || idVacante <= 0) {
      return res.status(400).json({
        mensaje: "Debes seleccionar una vacante válida"
      });
    }

    // Obtener estudiante autenticado
    const estudianteResultado = await pool.query(
      `SELECT id_estudiante
       FROM estudiantes
       WHERE id_usuario = $1`,
      [idUsuario]
    );

    if (!estudianteResultado.rows.length) {
      return res.status(404).json({
        mensaje: "No se encontró el perfil del estudiante"
      });
    }

    const idEstudiante =
      estudianteResultado.rows[0].id_estudiante;

    // Registrar solo si la vacante sigue activa.
    // ON CONFLICT evita postulaciones duplicadas.
    const resultado = await pool.query(
      `INSERT INTO postulaciones (
         id_vacante,
         id_estudiante,
         estado
       )
       SELECT
         v.id_vacante,
         $2,
         'enviada'
       FROM vacantes v
       WHERE v.id_vacante = $1
         AND v.estado = 'activa'
       ON CONFLICT (id_vacante, id_estudiante)
       DO NOTHING
       RETURNING
         id_postulacion,
         id_vacante,
         id_estudiante,
         fecha_postulacion,
         estado`,
      [idVacante, idEstudiante]
    );

    if (!resultado.rows.length) {
      const vacanteResultado = await pool.query(
        `SELECT estado
         FROM vacantes
         WHERE id_vacante = $1`,
        [idVacante]
      );

      if (!vacanteResultado.rows.length) {
        return res.status(404).json({
          mensaje: "La vacante no existe"
        });
      }

      if (vacanteResultado.rows[0].estado !== "activa") {
        return res.status(409).json({
          mensaje: "La vacante ya no está disponible"
        });
      }

      return res.status(409).json({
        mensaje: "Ya te postulaste a esta vacante"
      });
    }

    const postulacion = resultado.rows[0];

    // Se inicia el envío de correos sin bloquear
    // la respuesta ni revertir la postulación.
    void notificarNuevaPostulacion({
      idPostulacion: postulacion.id_postulacion,
      idVacante: postulacion.id_vacante,
      idEstudiante: postulacion.id_estudiante
    });

    return res.status(201).json({
      mensaje: "Postulación enviada correctamente",
      postulacion
    });

  } catch (error) {
    console.error("Error al crear postulación:", error);

    return res.status(500).json({
      mensaje: "No se pudo registrar la postulación"
    });
  }
};

// ========================================
// CONSULTAR MIS POSTULACIONES
// ========================================

const obtenerPostulaciones = async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT
         p.id_postulacion,
         p.id_vacante,
         p.fecha_postulacion,
         p.estado,
         v.titulo,
         v.modalidad,
         v.tipo,
         v.ubicacion,
         v.estado AS estado_vacante,
         e.nombre_empresa
       FROM postulaciones p
       INNER JOIN estudiantes est
         ON est.id_estudiante = p.id_estudiante
       INNER JOIN vacantes v
         ON v.id_vacante = p.id_vacante
       INNER JOIN empresas e
         ON e.id_empresa = v.id_empresa
       WHERE est.id_usuario = $1
       ORDER BY
         p.fecha_postulacion DESC,
         p.id_postulacion DESC`,
      [req.usuario.id_usuario]
    );

    return res.json({
      postulaciones: resultado.rows,
      total: resultado.rowCount
    });

  } catch (error) {
    console.error("Error al consultar postulaciones:", error);

    return res.status(500).json({
      mensaje: "No se pudieron consultar las postulaciones"
    });
  }
};

module.exports = {
  crearPostulacion,
  obtenerPostulaciones
};
