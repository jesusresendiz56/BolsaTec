
import { useEffect, useRef, useState } from "react";

import {
  GraduationCap,
  Save,
  RefreshCw,
  FileText,
  Upload,
  Eye,
  CheckCircle2
} from "lucide-react";

import { sessionGet } from "../../services/session";
import "./PerfilEstudiante.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");

const MAX_PDF = 5 * 1024 * 1024;

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

  const [archivoPDF, setArchivoPDF] = useState(null);
  const [subiendoPDF, setSubiendoPDF] = useState(false);
  const [viendoPDF, setViendoPDF] = useState(false);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const inputPDF = useRef(null);

  // ========================================
  // OBTENER TOKEN DEL ESTUDIANTE
  // ========================================

  const obtenerToken = () => {
    const token = sessionGet("estudiante")?.token;

    if (!token) {
      throw new Error("Debes iniciar sesión como estudiante");
    }

    return token;
  };

  // ========================================
  // CONSULTAR PERFIL
  // ========================================

  const obtenerPerfil = async () => {
    try {
      setCargando(true);
      setError("");

      const respuesta = await fetch(
        `${API_URL}/api/estudiante/perfil`,
        {
          headers: {
            Authorization: `Bearer ${obtenerToken()}`
          }
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje || "Error al obtener el perfil"
        );
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

  // ========================================
  // ACTUALIZAR CAMPOS
  // ========================================

  const actualizarCampo = (evento) => {
    const { name, value } = evento.target;

    setPerfil((anterior) => ({
      ...anterior,
      [name]: value
    }));
  };

  // ========================================
  // GUARDAR PERFIL
  // ========================================

  const guardarPerfil = async (evento) => {
    evento.preventDefault();

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      const respuesta = await fetch(
        `${API_URL}/api/estudiante/perfil`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${obtenerToken()}`
          },
          body: JSON.stringify(perfil)
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje || "Error al guardar el perfil"
        );
      }

      setMensaje(
        datos.mensaje || "Perfil actualizado correctamente"
      );

      await obtenerPerfil();
      onActualizar?.();

    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  // ========================================
  // SELECCIONAR ARCHIVO PDF
  // ========================================

  const seleccionarPDF = (evento) => {
    const archivo = evento.target.files?.[0];

    setError("");
    setMensaje("");

    if (!archivo) {
      setArchivoPDF(null);
      return;
    }

    // Validar que el archivo sea PDF
    const esPDF =
      archivo.type === "application/pdf" &&
      archivo.name.toLowerCase().endsWith(".pdf");

    if (!esPDF) {
      window.alert(
        "ARCHIVO NO PERMITIDO\n\n" +
        "Solo puedes subir archivos PDF (.pdf).\n" +
        "Selecciona un currículum en formato PDF."
      );

      setArchivoPDF(null);
      evento.target.value = "";

      setError(
        "Archivo no permitido. Solo se permiten archivos PDF."
      );

      return;
    }

    // Validar tamaño máximo de 5 MB
    if (archivo.size > MAX_PDF) {
      window.alert(
        "ARCHIVO DEMASIADO GRANDE\n\n" +
        "El currículum no debe superar los 5 MB.\n" +
        "Selecciona un PDF de menor tamaño."
      );

      setArchivoPDF(null);
      evento.target.value = "";

      setError(
        "El PDF no debe superar los 5 MB."
      );

      return;
    }

    // Archivo válido
    setArchivoPDF(archivo);
  };

  // ========================================
  // SUBIR O REEMPLAZAR CURRÍCULUM
  // ========================================

  const subirCurriculum = async () => {
    if (!archivoPDF) {
      setError("Selecciona un archivo PDF");
      return;
    }

    try {
      setSubiendoPDF(true);
      setError("");
      setMensaje("");

      const formulario = new FormData();

      formulario.append("curriculum", archivoPDF);

      const respuesta = await fetch(
        `${API_URL}/api/estudiante/curriculum`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${obtenerToken()}`
          },
          body: formulario
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje || "No se pudo subir el currículum"
        );
      }

      setCvUrl(datos.cv_url || "");
      setArchivoPDF(null);

      if (inputPDF.current) {
        inputPDF.current.value = "";
      }

      setMensaje(
        datos.mensaje || "Currículum guardado correctamente"
      );

      onActualizar?.();

    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendoPDF(false);
    }
  };

  // ========================================
  // VISUALIZAR CURRÍCULUM PRIVADO
  // ========================================

  const verCurriculum = async () => {
    let urlTemporal = null;

    try {
      setViendoPDF(true);
      setError("");

      const ventana = window.open("", "_blank");

      if (!ventana) {
        throw new Error(
          "El navegador bloqueó la nueva pestaña"
        );
      }

      try {
        const respuesta = await fetch(
          `${API_URL}/api/estudiante/curriculum`,
          {
            headers: {
              Authorization: `Bearer ${obtenerToken()}`
            }
          }
        );

        if (!respuesta.ok) {
          const datos = await respuesta.json().catch(() => ({}));

          throw new Error(
            datos.mensaje || "No se pudo consultar el PDF"
          );
        }

        const archivo = await respuesta.blob();

        if (archivo.type !== "application/pdf") {
          throw new Error(
            "El servidor no devolvió un archivo PDF"
          );
        }

        urlTemporal = URL.createObjectURL(archivo);

        ventana.location.href = urlTemporal;

      } catch (error) {
        ventana.close();
        throw error;
      }

    } catch (err) {
      if (urlTemporal) {
        URL.revokeObjectURL(urlTemporal);
      }

      setError(err.message);
    } finally {
      setViendoPDF(false);
    }
  };

  // ========================================
  // PANTALLA DE CARGA
  // ========================================

  if (cargando) {
    return (
      <div className="bt-dashboard-panel">
        <p>Cargando perfil profesional...</p>
      </div>
    );
  }

  // ========================================
  // INTERFAZ DEL PERFIL
  // ========================================

  return (
    <div className="bt-perfil-estudiante">

      <div className="bt-perfil-estudiante-header">
        <div>
          <h2>Mi perfil profesional</h2>
          <p>
            Administra tu información académica y profesional.
          </p>
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

      {/* MENSAJES */}

      {error && (
        <div
          className="bt-perfil-estudiante-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {mensaje && (
        <div
          className="bt-perfil-estudiante-exito"
          role="status"
        >
          {mensaje}
        </div>
      )}

      <div className="bt-perfil-estudiante-card">

        {/* INFORMACIÓN DEL ESTUDIANTE */}

        <div className="bt-perfil-estudiante-identidad">
          <GraduationCap size={32} />

          <div>
            <h3>{nombre}</h3>
            <p>{correo}</p>
          </div>
        </div>

        {/* FORMULARIO DEL PERFIL */}

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

          {/* DESCRIPCIÓN PROFESIONAL */}

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

          {/* CURRÍCULUM PDF */}

          <div className="bt-perfil-estudiante-cv">

            <div className="bt-cv-titulo">
              <FileText size={24} />

              <div>
                <h4>Mi currículum</h4>
                <p>
                  Adjunta tu currículum únicamente en
                  formato PDF. Tamaño máximo: 5 MB.
                </p>
              </div>
            </div>

            {/* ESTADO DEL CURRÍCULUM */}

            {cvUrl ? (
              <p className="bt-cv-estado">
                <CheckCircle2 size={18} />
                Ya tienes un currículum registrado.
              </p>
            ) : (
              <p>
                Aún no has registrado tu currículum.
              </p>
            )}

            {/* SELECCIONAR ARCHIVO */}

            <div className="bt-cv-archivo">

              <label htmlFor="archivo-curriculum">
                <Upload size={18} />
                Seleccionar PDF
              </label>

              <input
                ref={inputPDF}
                id="archivo-curriculum"
                type="file"
                accept=".pdf,application/pdf"
                onChange={seleccionarPDF}
              />

              <span>
                {archivoPDF
                  ? archivoPDF.name
                  : "Ningún archivo seleccionado"}
              </span>

            </div>

            {/* ACCIONES DEL CURRÍCULUM */}

            <div className="bt-cv-acciones">

              {cvUrl && (
                <button
                  type="button"
                  className="bt-perfil-estudiante-btn"
                  onClick={verCurriculum}
                  disabled={viendoPDF}
                >
                  <Eye size={18} />

                  {viendoPDF
                    ? "Abriendo..."
                    : "Ver currículum"}
                </button>
              )}

              <button
                type="button"
                className="bt-perfil-estudiante-btn bt-perfil-estudiante-primary"
                onClick={subirCurriculum}
                disabled={!archivoPDF || subiendoPDF}
              >
                <Upload size={18} />

                {subiendoPDF
                  ? "Subiendo..."
                  : cvUrl
                    ? "Reemplazar PDF"
                    : "Subir currículum"}
              </button>

            </div>

          </div>

          {/* GUARDAR PERFIL */}

          <div className="bt-perfil-estudiante-acciones">
            <button
              type="submit"
              className="bt-perfil-estudiante-btn bt-perfil-estudiante-primary"
              disabled={guardando}
            >
              <Save size={18} />

              {guardando
                ? "Guardando..."
                : "Guardar cambios"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default PerfilEstudiante;
