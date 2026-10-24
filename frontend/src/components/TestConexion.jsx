
import { useState } from "react";
import { apiRequest } from "../services/api";

function TestConexion() {
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const probarConexion = async () => {
    setMensaje("");
    setError("");

    try {
      const respuesta = await apiRequest("/test-db");
      setMensaje(respuesta.mensaje);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ padding: "30px" }}>
      <h2>Prueba de conexión BolsaTec</h2>

      <button onClick={probarConexion}>
        Probar conexión
      </button>

      {mensaje && <p>{mensaje}</p>}
      {error && <p>Error: {error}</p>}
    </div>
  );
}

export default TestConexion;
