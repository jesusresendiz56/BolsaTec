
require("dotenv").config();

const { enviarCorreo } = require("./src/services/brevoService");

const probarEnvio = async () => {
  try {
    const destinatario = process.env.BREVO_TEST_EMAIL;

    if (!destinatario) {
      throw new Error(
        "Configura BREVO_TEST_EMAIL con el correo que recibirá la prueba"
      );
    }

    const resultado = await enviarCorreo({
      destinatario,
      asunto: "Prueba de notificaciones - BolsaTec",
      mensaje:
        "Hola, este es un correo de prueba enviado desde BolsaTec utilizando la API de Brevo.",
    });

    console.log("Brevo aceptó el correo correctamente");
    console.log("ID del mensaje:", resultado.messageId);

  } catch (error) {
    console.error("Error al probar Brevo:", error.message);
    process.exitCode = 1;
  }
};

probarEnvio();

