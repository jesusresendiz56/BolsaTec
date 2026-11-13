// ========================================
// PLANTILLAS DE CORREO POR ESTADO
// DE LA POSTULACIÓN
// ========================================

const URL_FRONTEND = (
  process.env.FRONTEND_URL || "https://bolsa-tec.vercel.app"
).replace(/\/+$/, "");

// Evitar que nombres o títulos rompan el HTML del correo
const escapar = (texto = "") =>
  String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// ========================================
// CONTENIDO DE CADA ESTADO
// ========================================

const PLANTILLAS = {
  enviada: {
    etiqueta: "Enviada",
    color: "#2563EB",
    asunto: (d) => `Tu postulación a "${d.vacante}" está registrada`,
    notificacion: (d) =>
      `Tu postulación a "${d.vacante}" de "${d.empresa}" está registrada y en espera de revisión.`,
    titulo: "Tu postulación está registrada",
    parrafos: (d) => [
      `Tu postulación a la vacante <strong>${d.vacante}</strong> de <strong>${d.empresa}</strong> está registrada y en espera de revisión.`,
      "Te avisaremos por este medio cuando la empresa la revise.",
    ],
  },

  vista: {
    etiqueta: "Vista",
    color: "#D97706",
    asunto: (d) => `${d.empresa} revisó tu postulación`,
    notificacion: (d) =>
      `"${d.empresa}" revisó tu postulación a "${d.vacante}".`,
    titulo: "La empresa revisó tu postulación",
    parrafos: (d) => [
      `<strong>${d.empresa}</strong> ya revisó tu postulación a la vacante <strong>${d.vacante}</strong>.`,
      "Mantén tu perfil y tu currículum actualizados: te avisaremos en cuanto haya novedades.",
    ],
  },

  entrevista: {
    etiqueta: "Entrevista",
    color: "#7C3AED",
    asunto: (d) => `¡${d.empresa} quiere entrevistarte!`,
    notificacion: (d) =>
      `¡"${d.empresa}" quiere entrevistarte para "${d.vacante}"! Revisa tu correo.`,
    titulo: "¡Te invitan a una entrevista!",
    parrafos: (d) => [
      `<strong>${d.empresa}</strong> quiere conocerte para la vacante <strong>${d.vacante}</strong>.`,
      "La empresa se pondrá en contacto contigo para acordar la fecha y hora. Revisa tu correo y tu teléfono.",
      d.correoEmpresa
        ? `Si tienes dudas, puedes escribir a la empresa a <a href="mailto:${d.correoEmpresa}">${d.correoEmpresa}</a>.`
        : null,
      "<strong>Consejos:</strong> investiga sobre la empresa, repasa los requisitos de la vacante y prepara ejemplos de tus proyectos.",
    ],
  },

  aceptada: {
    etiqueta: "Aceptada",
    color: "#059669",
    asunto: (d) => `¡Felicidades! Tu postulación a "${d.vacante}" fue aceptada`,
    notificacion: (d) =>
      `¡Felicidades! "${d.empresa}" aceptó tu postulación a "${d.vacante}".`,
    titulo: "¡Felicidades, tu postulación fue aceptada!",
    parrafos: (d) => [
      `<strong>${d.empresa}</strong> aceptó tu postulación a la vacante <strong>${d.vacante}</strong>.`,
      "La empresa te contactará con los siguientes pasos para tu incorporación.",
      d.correoEmpresa
        ? `También puedes comunicarte con la empresa a <a href="mailto:${d.correoEmpresa}">${d.correoEmpresa}</a>.`
        : null,
    ],
  },

  rechazada: {
    etiqueta: "No seleccionada",
    color: "#DC2626",
    asunto: (d) => `Actualización de tu postulación a "${d.vacante}"`,
    notificacion: (d) =>
      `"${d.empresa}" decidió continuar con otros candidatos para "${d.vacante}".`,
    titulo: "Actualización de tu postulación",
    parrafos: (d) => [
      `Gracias por tu interés en la vacante <strong>${d.vacante}</strong>. En esta ocasión, <strong>${d.empresa}</strong> decidió continuar con otros candidatos.`,
      "No te desanimes: cada postulación es experiencia. Sigue explorando las vacantes disponibles en BolsaTec.",
    ],
  },
};

// Quitar etiquetas HTML para la versión en texto plano
const aTexto = (html) =>
  html
    .replace(/<a href="mailto:([^"]+)">[^<]*<\/a>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

// ========================================
// GENERAR CORREO
// ========================================

const generarCorreoEstado = ({
  estado,
  nombreEstudiante,
  tituloVacante,
  nombreEmpresa,
  correoEmpresa,
}) => {
  const plantilla = PLANTILLAS[estado];

  if (!plantilla) return null;

  // Versión segura para HTML
  const d = {
    estudiante: escapar(nombreEstudiante),
    vacante: escapar(tituloVacante),
    empresa: escapar(nombreEmpresa),
    correoEmpresa: correoEmpresa ? escapar(correoEmpresa) : "",
  };

  // Versión sin escapar para asunto y notificación interna
  const p = {
    estudiante: nombreEstudiante,
    vacante: tituloVacante,
    empresa: nombreEmpresa,
  };

  const parrafos = plantilla.parrafos(d).filter(Boolean);
  const urlPostulaciones = `${URL_FRONTEND}/login`;

  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,Helvetica,sans-serif;color:#1E293B;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #E2E8F0;">
        <tr><td style="background:#0B2B33;padding:20px 28px;color:#FFFFFF;font-size:22px;font-weight:bold;">
          Bolsa<span style="color:#22D3EE;">Tec</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${plantilla.color};color:#FFFFFF;font-size:12px;font-weight:bold;">
            ${plantilla.etiqueta}
          </span>
          <h1 style="margin:18px 0 8px;font-size:22px;color:#0B2B33;">${plantilla.titulo}</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hola ${d.estudiante},</p>
          ${parrafos
            .map(
              (texto) =>
                `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">${texto}</p>`
            )
            .join("\n          ")}
          <p style="margin:24px 0 0;">
            <a href="${urlPostulaciones}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#0E7490;color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:14px;">
              Ver mis postulaciones
            </a>
          </p>
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #E2E8F0;color:#64748B;font-size:12px;">
          BolsaTec - Tu futuro profesional comienza aquí.<br>
          Recibes este correo porque te postulaste a una vacante en BolsaTec.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const texto =
    `Hola ${nombreEstudiante},\n\n` +
    parrafos.map(aTexto).join("\n\n") +
    `\n\nConsulta el detalle en "Mis postulaciones": ${urlPostulaciones}\n\n` +
    "BolsaTec - Tu futuro profesional comienza aquí.";

  return {
    asunto: `${plantilla.asunto(p)} - BolsaTec`,
    notificacion: plantilla.notificacion(p),
    html,
    texto,
  };
};

module.exports = { generarCorreoEstado };
