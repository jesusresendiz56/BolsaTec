
const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");

export async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_URL}/api${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.mensaje ||
      data.message ||
      "Error del servidor"
    );
  }

  return data;
}
