import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Building2,
  Globe,
  Link2,
  RefreshCw,
  Save,
} from "lucide-react";
import { sessionGet } from "../../services/session";
import "./PerfilEmpresa.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");

const perfilInicial = {
  nombre_empresa: "",
  sector: "",
  tamano: "",
  rfc: "",
  descripcion: "",
  ubicacion: "",
  telefono: "",
  contacto_nombre: "",
  contacto_puesto: "",
  sitio_web: "",
  linkedin: "",
};

const MAX_DESCRIPCION = 1000;

// Convierte lo que regresa la API en valores del formulario
const aFormulario = (empresa) =>
  Object.fromEntries(
    Object.keys(perfilInicial).map((campo) => [campo, empresa?.[campo] || ""])
  );

function PerfilEmpresa({ onActualizar }) {
  const [perfil, setPerfil] = useState(perfilInicial);
  // Giro guardado (puede no estar en la lista si se capturó en el registro)
  const [sectorGuardado, setSectorGuardado] = useState("");
  const [sectores, setSectores] = useState([]);
  const [tamanos, setTamanos] = useState([]);
  const [representante, setRepresentante] = useState("");
  const [correo, setCorreo] = useState("");
  const [verificada, setVerificada] = useState(false);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  // sugerido: sector de la lista que corresponde al guardado
  // (cuando se capturó como texto libre, p. ej. "informatica")
  const aplicarEmpresa = (empresa, sugerido = null) => {
    setPerfil({
      ...aFormulario(empresa),
      sector: sugerido || empresa.sector || "",
    });
    setSectorGuardado(empresa.sector || "");
    setVerificada(empresa.verificada === true);
  };

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

      aplicarEmpresa(datos.empresa, datos.sector_sugerido);
      setSectores(datos.sectores || []);
      setTamanos(datos.tamanos || []);
      setRepresentante(datos.empresa.representante || "");
      setCorreo(datos.empresa.correo || "");
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
      [name]: name === "rfc" ? value.toUpperCase() : value,
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
      aplicarEmpresa(datos.empresa);
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

  const sectorFueraDeLista =
    sectorGuardado && !sectores.includes(sectorGuardado);

  const tamanoNombre = tamanos.find((t) => t.clave === perfil.tamano)?.nombre;

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

            {(sectorGuardado || tamanoNombre) && (
              <p className="bt-perfil-resumen">
                {[sectorGuardado, tamanoNombre].filter(Boolean).join(" · ")}
              </p>
            )}

            {(perfil.sitio_web || perfil.linkedin) && (
              <p className="bt-perfil-enlaces">
                {perfil.sitio_web && (
                  <a href={perfil.sitio_web} target="_blank" rel="noopener noreferrer">
                    <Globe size={15} />
                    Sitio web
                  </a>
                )}
                {perfil.linkedin && (
                  <a href={perfil.linkedin} target="_blank" rel="noopener noreferrer">
                    <Link2 size={15} />
                    LinkedIn
                  </a>
                )}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={guardarPerfil}>
          {/* DATOS GENERALES */}
          <fieldset className="bt-perfil-seccion">
            <legend>Datos de la empresa</legend>

            <div className="bt-perfil-campos">
              <label>
                Nombre de la empresa *
                <input
                  type="text"
                  name="nombre_empresa"
                  value={perfil.nombre_empresa}
                  onChange={actualizarCampo}
                  maxLength={150}
                  required
                />
              </label>

              <label>
                Sector de la empresa
                <select
                  name="sector"
                  value={perfil.sector}
                  onChange={actualizarCampo}
                >
                  <option value="">Selecciona el sector</option>
                  {sectorFueraDeLista && (
                    <option value={sectorGuardado}>
                      {sectorGuardado} (capturado en el registro)
                    </option>
                  )}
                  {sectores.map((sector) => (
                    <option key={sector} value={sector}>
                      {sector}
                    </option>
                  ))}
                </select>
                <small>
                  {sectorFueraDeLista && perfil.sector !== sectorGuardado
                    ? `Relacionamos "${sectorGuardado}" con este sector. Guarda para confirmarlo.`
                    : 'Define qué carreras aparecen en "Pruebas".'}
                </small>
              </label>

              <label>
                Tamaño
                <select
                  name="tamano"
                  value={perfil.tamano}
                  onChange={actualizarCampo}
                >
                  <option value="">Selecciona el tamaño</option>
                  {tamanos.map((tamano) => (
                    <option key={tamano.clave} value={tamano.clave}>
                      {tamano.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                RFC
                <input
                  type="text"
                  name="rfc"
                  value={perfil.rfc}
                  onChange={actualizarCampo}
                  maxLength={13}
                  placeholder="Ej. ABC010101AB1"
                  autoComplete="off"
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
                maxLength={MAX_DESCRIPCION}
                placeholder="Describe las actividades de tu empresa..."
              />
              <small className="bt-perfil-contador">
                {perfil.descripcion.length} / {MAX_DESCRIPCION}
              </small>
            </label>
          </fieldset>

          {/* CONTACTO */}
          <fieldset className="bt-perfil-seccion">
            <legend>Contacto</legend>

            <div className="bt-perfil-campos">
              <label>
                Persona de contacto
                <input
                  type="text"
                  name="contacto_nombre"
                  value={perfil.contacto_nombre}
                  onChange={actualizarCampo}
                  maxLength={120}
                  placeholder="Ej. Laura Martínez"
                />
              </label>

              <label>
                Puesto
                <input
                  type="text"
                  name="contacto_puesto"
                  value={perfil.contacto_puesto}
                  onChange={actualizarCampo}
                  maxLength={100}
                  placeholder="Ej. Reclutamiento y selección"
                />
              </label>

              <label>
                Teléfono
                <input
                  type="tel"
                  name="telefono"
                  value={perfil.telefono}
                  onChange={actualizarCampo}
                  inputMode="numeric"
                  placeholder="10 dígitos, ej. 5512345678"
                />
              </label>

              <label>
                Ubicación
                <input
                  type="text"
                  name="ubicacion"
                  value={perfil.ubicacion}
                  onChange={actualizarCampo}
                  maxLength={150}
                  placeholder="Ej. Ciudad de México"
                />
              </label>
            </div>
          </fieldset>

          {/* EN LÍNEA */}
          <fieldset className="bt-perfil-seccion">
            <legend>Presencia en línea</legend>

            <div className="bt-perfil-campos">
              <label>
                Sitio web
                <input
                  type="text"
                  name="sitio_web"
                  value={perfil.sitio_web}
                  onChange={actualizarCampo}
                  inputMode="url"
                  placeholder="Ej. www.miempresa.com"
                />
              </label>

              <label>
                LinkedIn
                <input
                  type="text"
                  name="linkedin"
                  value={perfil.linkedin}
                  onChange={actualizarCampo}
                  inputMode="url"
                  placeholder="Ej. linkedin.com/company/miempresa"
                />
              </label>
            </div>
          </fieldset>

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
