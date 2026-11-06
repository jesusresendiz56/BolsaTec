
import { useEffect, useState } from "react";
import { GraduationCap, Save, RefreshCw } from "lucide-react";
import { sessionGet } from "../../services/session";
import "./PerfilEstudiante.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");

const perfilInicial = {
  carrera: "",
  semestre: "",
  descripcion: "",
  telefono: "",
  institucion: ""
};

function PerfilEstudiante({ onActualizar }) {
  const [perfil, setPerfil] = useState(perfilInicial);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [cvUrl, setCvUrl] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const obtenerPerfil = async () => {
    try {
      setCargando(true);
      setError("");

      const token = sessionGet("estudiante")?.token;

      if (!token) {
        throw new Error("Debes iniciar sesión como estudiante");
      }

      const respuesta = await fetch(
        `${API_URL}/api/estudiante/perfil`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "Error al obtener perfil");
      }

      const estudiante = datos.estudiante;

      setPerfil({
        carrera: estudiante.carrera || "",
        semestre: estudiante.semestre ?? "",
        descripcion: estudiante.descripcion || "",
        telefono: estudiante.telefono || "",
        institucion: estudiante.institucion || ""
      });

      setNombre(estudiante.nombre || "");
      setCorreo(estudiante.correo || "");
      setCvUrl(estudiante.cv_url || "");

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
      [name]: value
    }));
  };

  const guardarPerfil = async (evento) => {
    evento.preventDefault();

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      const token = sessionGet("estudiante")?.token;

      if (!token) {
        throw new Error("Debes iniciar sesión como estudiante");
      }

      const respuesta = await fetch(
        `${API_URL}/api/estudiante/perfil`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(perfil)
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "Error al guardar perfil");
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
        <p>Cargando perfil profesional...</p>
      </div>
    );
  }

  return (
    <div className="bt-perfil-estudiante">
      <div className="bt-perfil-estudiante-header">
        <div>
          <h2>Mi perfil profesional</h2>
          <p>Administra tu información académica y profesional.</p>
        </div>

        <button
          type="button"
          className="bt-perfil-estudiante-btn"
          onClick={obtenerPerfil}
        >
          <RefreshCw size={18} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="bt-perfil-estudiante-error" role="alert">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="bt-perfil-estudiante-exito" role="status">
          {mensaje}
        </div>
      )}

      <div className="bt-perfil-estudiante-card">
        <div className="bt-perfil-estudiante-identidad">
          <GraduationCap size={32} />
          <div>
            <h3>{nombre}</h3>
            <p>{correo}</p>
          </div>
        </div>

        <form onSubmit={guardarPerfil}>
          <div className="bt-perfil-estudiante-grid">
            <label>
              Carrera
              <input
                type="text"
                name="carrera"
                value={perfil.carrera}
                onChange={actualizarCampo}
                placeholder="Ej. Ingeniería en Tecnologías de la Información"
              />
            </label>

            <label>
              Semestre
              <input
                type="number"
                name="semestre"
                min="1"
                max="15"
                value={perfil.semestre}
                onChange={actualizarCampo}
                placeholder="Ej. 7"
              />
            </label>

            <label>
              Institución educativa
              <input
                type="text"
                name="institucion"
                value={perfil.institucion}
                onChange={actualizarCampo}
                placeholder="Nombre de tu universidad"
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

          <label className="bt-perfil-estudiante-descripcion">
            Descripción profesional
            <textarea
              name="descripcion"
              rows={5}
              value={perfil.descripcion}
              onChange={actualizarCampo}
              placeholder="Describe tus conocimientos, intereses y objetivos profesionales..."
            />
          </label>

          <div className="bt-perfil-estudiante-cv">
            <h4>Mi currículum</h4>

            {cvUrl ? (
              <p>Ya tienes un currículum registrado.</p>
            ) : (
              <p>Aún no has registrado tu currículum.</p>
            )}

            <p>
              La carga de archivos PDF se implementará
              en el siguiente paso.
            </p>
          </div>

          <div className="bt-perfil-estudiante-acciones">
            <button
              type="submit"
              className="bt-perfil-estudiante-btn bt-perfil-estudiante-primary"
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

export default PerfilEstudiante;
