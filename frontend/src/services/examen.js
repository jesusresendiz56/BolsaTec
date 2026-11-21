import { sessionGet } from "./session";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

// Petición autenticada a /api/{rol}/...
export async function solicitar(rol, endpoint, options = {}) {
  const token = sessionGet(rol)?.token;

  if (!token) {
    throw new Error(`Debes iniciar sesión como ${rol}`);
  }

  const respuesta = await fetch(`${API_URL}/api/${rol}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    const error = new Error(datos.mensaje || "Error del servidor");
    error.status = respuesta.status;
    throw error;
  }

  return datos;
}

// Registrar la postulación (con las respuestas de la prueba, si la hay)
export const enviarPostulacion = (idVacante, respuestas) =>
  solicitar("estudiante", "/postulaciones", {
    method: "POST",
    body: JSON.stringify({
      id_vacante: idVacante,
      ...(respuestas ? { respuestas } : {}),
    }),
  });
