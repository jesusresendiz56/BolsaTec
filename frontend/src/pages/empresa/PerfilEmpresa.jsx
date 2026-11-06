
import { useEffect, useState } from "react";
import { Building2, Save, RefreshCw, BadgeCheck } from "lucide-react";
import { sessionGet } from "../../services/session";
import "./PerfilEmpresa.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");

const perfilInicial = {
  nombre_empresa: "",
  descripcion: "",
  ubicacion: "",
  telefono: "",
  sector: "",
};

function PerfilEmpresa({ onActualizar }) {
  const [perfil, setPerfil] = useState(perfilInicial);
  const [representante, setRepresentante] = useState("");
  const [correo, setCorreo] = useState("");
  const [verificada, setVerificada] = useState(false);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const obtenerPerfil = async () => {
    try {
      setCargando(true);
      setError("");

      const token = sessionGet("empresa")?.token;

      if (!token) {
        throw new Error("Debes iniciar sesión como empresa");
      }

      const respuesta = await fetch(`${API_URL}/api/empresa/perfil`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "Error al consultar el perfil");
      }

      const empresa = datos.empresa;

      setPerfil({
        nombre_empresa: empresa.nombre_empresa || "",
        descripcion: empresa.descripcion || "",
        ubicacion: empresa.ubicacion || "",
        telefono: empresa.telefono || "",
        sector: empresa.sector || "",
      });

      setRepresentante(empresa.representante || "");
      setCorreo(empresa.correo || "");
      setVerificada(empresa.verificada === true);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerPerfil();
  }, []);

  const actualizarCampo = (evento) => {
    const { name, value } = evento.target;

    setPerfil((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  };

  const guardarPerfil = async (evento) => {
    evento.preventDefault();

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      const token = sessionGet("empresa")?.token;

      if (!token) {
        throw new Error("Debes iniciar sesión como empresa");
      }

      const respuesta = await fetch(`${API_URL}/api/empresa/perfil`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(perfil),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "Error al actualizar el perfil");
      }

      setMensaje(datos.mensaje || "Perfil actualizado correctamente");
      await obtenerPerfil();
      onActualizar?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="bt-dashboard-panel">
        <p>Cargando perfil empresarial...</p>
      </div>
    );
  }

  return (
    <div className="bt-perfil-empresa">
      <div className="bt-perfil-encabezado">
        <div>
          <h2>Perfil empresarial</h2>
          <p>Administra la información de tu empresa.</p>
        </div>

        <button
          type="button"
          className="bt-perfil-btn"
          onClick={obtenerPerfil}
        >
          <RefreshCw size={18} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="bt-perfil-error" role="alert">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="bt-perfil-exito" role="status">
          {mensaje}
        </div>
      )}

      <div className="bt-perfil-tarjeta">
        <div className="bt-perfil-identidad">
          <div className="bt-perfil-icono">
            <Building2 size={30} />
          </div>

          <div>
            <h3>{perfil.nombre_empresa || "Mi empresa"}</h3>
            <p>
              {verificada ? (
                <span className="bt-perfil-verificada">
                  <BadgeCheck size={17} />
                  Empresa verificada
                </span>
              ) : (
                "Empresa pendiente de verificación"
              )}
            </p>
          </div>
        </div>

        <form onSubmit={guardarPerfil}>
          <div className="bt-perfil-campos">
            <label>
              Nombre de la empresa *
              <input
                type="text"
                name="nombre_empresa"
                value={perfil.nombre_empresa}
                onChange={actualizarCampo}
                required
              />
            </label>

            <label>
              Sector
              <input
                type="text"
                name="sector"
                value={perfil.sector}
                onChange={actualizarCampo}
                placeholder="Ej. Tecnología"
              />
            </label>

            <label>
              Ubicación
              <input
                type="text"
                name="ubicacion"
                value={perfil.ubicacion}
                onChange={actualizarCampo}
                placeholder="Ej. Ciudad de México"
              />
            </label>

            <label>
              Teléfono
              <input
                type="tel"
                name="telefono"
                value={perfil.telefono}
                onChange={actualizarCampo}
                placeholder="Ej. 5512345678"
              />
            </label>
          </div>

          <label className="bt-perfil-descripcion">
            Descripción de la empresa
            <textarea
              name="descripcion"
              value={perfil.descripcion}
              onChange={actualizarCampo}
              rows={5}
              placeholder="Describe las actividades de tu empresa..."
            />
          </label>

          <div className="bt-perfil-info">
            <h4>Información de la cuenta</h4>
            <p><strong>Representante:</strong> {representante}</p>
            <p><strong>Correo:</strong> {correo}</p>
          </div>

          <div className="bt-perfil-acciones">
            <button
              type="submit"
              className="bt-perfil-btn bt-perfil-btn-primary"
              disabled={guardando}
            >
              <Save size={18} />
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PerfilEmpresa;
