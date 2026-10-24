
const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000"
)
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

export async function apiRequest(endpoint, options = {}) {
  const ruta = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  const url = `${API_URL}/api${ruta}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const contentType =
    response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error(
      `La API no devolvió JSON. ` +
      `HTTP ${response.status}. ` +
      `Verifica la dirección del backend: ${url}`
    );
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.mensaje ||
      data.message ||
      `Error del servidor (${response.status})`
    );
  }

  return data;
}
