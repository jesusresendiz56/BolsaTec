
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

// ========================================
// ENVIAR CORREO CON BREVO
// ========================================

const enviarCorreo = async ({ destinatario, asunto, mensaje, html }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const remitente = process.env.BREVO_SENDER_EMAIL;
  const nombreRemitente = process.env.BREVO_SENDER_NAME || "BolsaTec";

  if (!apiKey || !remitente) {
    throw new Error("Falta configurar Brevo en las variables de entorno");
  }

  if (!destinatario || !asunto || (!mensaje && !html)) {
    throw new Error("Faltan datos para enviar el correo");
  }

  const respuesta = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: nombreRemitente,
        email: remitente,
      },
      to: [{ email: destinatario }],
      subject: asunto,
      ...(mensaje ? { textContent: mensaje } : {}),
      ...(html ? { htmlContent: html } : {}),
    }),
    signal: AbortSignal.timeout(15000),
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    console.error("Error de Brevo:", {
      status: respuesta.status,
      code: datos.code,
      message: datos.message,
    });

    throw new Error("Brevo no pudo aceptar el envío del correo");
  }

  return {
    enviado: true,
    messageId: datos.messageId || null,
  };
};

module.exports = { enviarCorreo };
