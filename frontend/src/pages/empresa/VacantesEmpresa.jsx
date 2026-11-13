
import { useCallback, useEffect, useState } from "react";
import {
  PlusCircle,
  Pencil,
  Trash2,
  PauseCircle,
  PlayCircle,
  XCircle,
  RefreshCw,
  X,
} from "lucide-react";

import { sessionGet } from "../../services/session";
import SelectorUbicacion from "../../components/SelectorUbicacion";
import "./VacantesEmpresa.css";

const ESTADOS_MEXICO = [
  "Aguascalientes", "Baja California", "Baja California Sur",
  "Campeche", "Chiapas", "Chihuahua", "Ciudad de México",
  "Coahuila", "Colima", "Durango", "Estado de México",
  "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán",
  "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla",
  "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa",
  "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz",
  "Yucatán", "Zacatecas",
];

// Texto completo de la dirección (igual que en el backend)
const componerDireccion = (f) =>
  [
    [f.direccion_calle, f.direccion_numero].filter(Boolean).join(" "),
    f.direccion_colonia,
    f.direccion_cp ? `C.P. ${f.direccion_cp}` : "",
    f.direccion_ciudad,
    f.direccion_estado,
  ]
    .map((parte) => parte?.trim())
    .filter(Boolean)
    .join(", ");

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");

const formularioInicial = {
  titulo: "",
  descripcion: "",
  modalidad: "presencial",
  tipo: "practicas",
  ubicacion: "",
  direccion_calle: "",
  direccion_numero: "",
  direccion_colonia: "",
  direccion_cp: "",
  direccion_ciudad: "",
  direccion_estado: "",
  latitud: null,
  longitud: null,
  salario_min: "",
  salario_max: "",
};

async function solicitarVacantes(endpoint, options = {}) {
  const token = sessionGet("empresa")?.token;

  if (!token) {
    throw new Error("Debes iniciar sesión como empresa");
  }

  const respuesta = await fetch(
    `${API_URL}/api/empresa${endpoint}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    }
  );

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.mensaje || "Error del servidor");
  }

  return datos;
}

function VacantesEmpresa({ onActualizar }) {
  const [vacantes, setVacantes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [vacanteEditando, setVacanteEditando] = useState(null);
  const [formulario, setFormulario] = useState(formularioInicial);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const cargarVacantes = useCallback(async () => {
    try {
      setCargando(true);
      setError("");

      const datos = await solicitarVacantes("/vacantes");
      setVacantes(datos.vacantes || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarVacantes();
  }, [cargarVacantes]);

  const actualizarCampo = (evento) => {
    const { name, value } = evento.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  };

  const abrirNuevo = () => {
    setFormulario(formularioInicial);
    setVacanteEditando(null);
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
  };

  const abrirEditar = (vacante) => {
    setVacanteEditando(vacante);

    setFormulario({
      titulo: vacante.titulo || "",
      descripcion: vacante.descripcion || "",
      modalidad: vacante.modalidad || "presencial",
      tipo: vacante.tipo || "practicas",
      ubicacion: vacante.ubicacion || "",
      direccion_calle: vacante.direccion_calle || "",
      direccion_numero: vacante.direccion_numero || "",
      direccion_colonia: vacante.direccion_colonia || "",
      direccion_cp: vacante.direccion_cp || "",
      direccion_ciudad: vacante.direccion_ciudad || "",
      direccion_estado: vacante.direccion_estado || "",
      latitud:
        vacante.latitud != null ? Number(vacante.latitud) : null,
      longitud:
        vacante.longitud != null ? Number(vacante.longitud) : null,
      salario_min: vacante.salario_min ?? "",
      salario_max: vacante.salario_max ?? "",
    });

    setError("");
    setMensaje("");
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    if (guardando) return;

    setMostrarFormulario(false);
    setVacanteEditando(null);
  };

  const guardarVacante = async (evento) => {
    evento.preventDefault();

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      const endpoint = vacanteEditando
        ? `/vacantes/${vacanteEditando.id_vacante}`
        : "/vacantes";

      const metodo = vacanteEditando ? "PUT" : "POST";

      const datos = await solicitarVacantes(endpoint, {
        method: metodo,
        body: JSON.stringify(formulario),
      });

      setMostrarFormulario(false);
      setVacanteEditando(null);
      setMensaje(datos.mensaje);

      await cargarVacantes();
      onActualizar?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (vacante, estado) => {
    const confirmado = window.confirm(
      `¿Deseas cambiar el estado de "${vacante.titulo}" a "${estado}"?`
    );

    if (!confirmado) return;

    try {
      setError("");
      setMensaje("");

      const datos = await solicitarVacantes(
        `/vacantes/${vacante.id_vacante}/estado`,
        {
          method: "PATCH",
          body: JSON.stringify({ estado }),
        }
      );

      setMensaje(datos.mensaje);
      await cargarVacantes();
      onActualizar?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const eliminarVacante = async (vacante) => {
    const confirmado = window.confirm(
      `¿Eliminar definitivamente la vacante "${vacante.titulo}"?`
    );

    if (!confirmado) return;

    try {
      setError("");
      setMensaje("");

      const datos = await solicitarVacantes(
        `/vacantes/${vacante.id_vacante}`,
        { method: "DELETE" }
      );

      setMensaje(datos.mensaje);
      await cargarVacantes();
      onActualizar?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const vacantesFiltradas = vacantes.filter((vacante) => {
    const coincideBusqueda = vacante.titulo
      .toLowerCase()
      .includes(busqueda.toLowerCase());

    const coincideEstado =
      filtroEstado === "todos" ||
      vacante.estado === filtroEstado;

    return coincideBusqueda && coincideEstado;
  });

  return (
    <div className="bt-empresa-vacantes">
      <div className="bt-vacantes-encabezado">
        <div>
          <h2>Mis vacantes</h2>
          <p>
            Publica y administra las oportunidades laborales
            de tu empresa.
          </p>
        </div>

        <button
          type="button"
          className="bt-vacantes-btn bt-vacantes-btn-primary"
          onClick={abrirNuevo}
        >
          <PlusCircle size={18} />
          Nueva vacante
        </button>
      </div>

      {mensaje && (
        <div className="bt-vacantes-mensaje bt-vacantes-exito">
          {mensaje}
        </div>
      )}

      {error && (
        <div className="bt-vacantes-mensaje bt-vacantes-error">
          {error}
        </div>
      )}

      <div className="bt-vacantes-filtros">
        <input
          type="search"
          placeholder="Buscar vacante..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
        >
          <option value="todos">Todos los estados</option>
          <option value="activa">Activas</option>
          <option value="pausada">Pausadas</option>
          <option value="cerrada">Cerradas</option>
        </select>

        <button
          type="button"
          className="bt-vacantes-btn"
          onClick={cargarVacantes}
          disabled={cargando}
        >
          <RefreshCw size={17} />
          Actualizar
        </button>
      </div>

      <div className="bt-vacantes-tabla-contenedor">
        <table className="bt-vacantes-tabla">
          <thead>
            <tr>
              <th>Vacante</th>
              <th>Modalidad</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Postulaciones</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {cargando ? (
              <tr>
                <td colSpan="6">Cargando vacantes...</td>
              </tr>
            ) : vacantesFiltradas.length === 0 ? (
              <tr>
                <td colSpan="6">
                  No se encontraron vacantes.
                </td>
              </tr>
            ) : (
              vacantesFiltradas.map((vacante) => (
                <tr key={vacante.id_vacante}>
                  <td>
                    <strong>{vacante.titulo}</strong>
                    <small>{vacante.ubicacion || "Sin ubicación"}</small>
                  </td>

                  <td>{vacante.modalidad}</td>
                  <td>{vacante.tipo.replaceAll("_", " ")}</td>

                  <td>
                    <span
                      className={`bt-vacantes-estado estado-${vacante.estado}`}
                    >
                      {vacante.estado}
                    </span>
                  </td>

                  <td>{vacante.total_postulaciones}</td>

                  <td>
                    <div className="bt-vacantes-acciones">
                      <button
                        type="button"
                        title="Editar"
                        aria-label={`Editar ${vacante.titulo}`}
                        onClick={() => abrirEditar(vacante)}
                      >
                        <Pencil size={17} />
                      </button>

                      {vacante.estado === "activa" ? (
                        <button
                          type="button"
                          title="Pausar"
                          aria-label={`Pausar ${vacante.titulo}`}
                          onClick={() => cambiarEstado(vacante, "pausada")}
                        >
                          <PauseCircle size={17} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          title="Activar"
                          aria-label={`Activar ${vacante.titulo}`}
                          onClick={() => cambiarEstado(vacante, "activa")}
                        >
                          <PlayCircle size={17} />
                        </button>
                      )}

                      {vacante.estado !== "cerrada" && (
                        <button
                          type="button"
                          title="Cerrar"
                          aria-label={`Cerrar ${vacante.titulo}`}
                          onClick={() => cambiarEstado(vacante, "cerrada")}
                        >
                          <XCircle size={17} />
                        </button>
                      )}

                      <button
                        type="button"
                        title="Eliminar"
                        aria-label={`Eliminar ${vacante.titulo}`}
                        onClick={() => eliminarVacante(vacante)}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {mostrarFormulario && (
        <div className="bt-vacantes-modal-fondo">
          <div
            className="bt-vacantes-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-formulario-vacante"
          >
            <div className="bt-vacantes-modal-header">
              <h3 id="titulo-formulario-vacante">
                {vacanteEditando ? "Editar vacante" : "Nueva vacante"}
              </h3>

              <button
                type="button"
                onClick={cerrarFormulario}
                disabled={guardando}
                aria-label="Cerrar formulario"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={guardarVacante}>
              <label>
                Título *
                <input
                  name="titulo"
                  value={formulario.titulo}
                  onChange={actualizarCampo}
                  required
                  maxLength={150}
                />
              </label>

              <label>
                Descripción *
                <textarea
                  name="descripcion"
                  value={formulario.descripcion}
                  onChange={actualizarCampo}
                  required
                  rows={5}
                />
              </label>

              <div className="bt-vacantes-form-fila">
                <label>
                  Modalidad
                  <select
                    name="modalidad"
                    value={formulario.modalidad}
                    onChange={actualizarCampo}
                  >
                    <option value="presencial">Presencial</option>
                    <option value="hibrida">Híbrida</option>
                    <option value="remota">Remota</option>
                  </select>
                </label>

                <label>
                  Tipo
                  <select
                    name="tipo"
                    value={formulario.tipo}
                    onChange={actualizarCampo}
                  >
                    <option value="practicas">Prácticas</option>
                    <option value="medio_tiempo">Medio tiempo</option>
                    <option value="tiempo_completo">Tiempo completo</option>
                  </select>
                </label>
              </div>

              <fieldset className="bt-vacantes-direccion">
                <legend>Dirección de la vacante</legend>

                {vacanteEditando &&
                  formulario.ubicacion &&
                  !componerDireccion(formulario) && (
                    <p className="bt-vacantes-direccion-nota">
                      Dirección anterior: «{formulario.ubicacion}».
                      Complétala con los campos para que el mapa sea
                      más exacto.
                    </p>
                  )}

                <div className="bt-vacantes-form-fila">
                  <label className="crece">
                    Calle
                    <input
                      name="direccion_calle"
                      value={formulario.direccion_calle}
                      onChange={actualizarCampo}
                      maxLength={150}
                      placeholder="Ej. Calle 7"
                    />
                  </label>

                  <label className="corto">
                    Número
                    <input
                      name="direccion_numero"
                      value={formulario.direccion_numero}
                      onChange={actualizarCampo}
                      maxLength={30}
                      placeholder="Ej. 25 Int. 3"
                    />
                  </label>
                </div>

                <div className="bt-vacantes-form-fila">
                  <label className="crece">
                    Colonia
                    <input
                      name="direccion_colonia"
                      value={formulario.direccion_colonia}
                      onChange={actualizarCampo}
                      maxLength={120}
                      placeholder="Ej. Pantitlán"
                    />
                  </label>

                  <label className="corto">
                    Código postal
                    <input
                      name="direccion_cp"
                      value={formulario.direccion_cp}
                      onChange={(evento) =>
                        setFormulario((anterior) => ({
                          ...anterior,
                          direccion_cp: evento.target.value
                            .replace(/\D/g, "")
                            .slice(0, 5),
                        }))
                      }
                      inputMode="numeric"
                      pattern="\d{5}"
                      title="5 dígitos"
                      placeholder="08100"
                    />
                  </label>
                </div>

                <div className="bt-vacantes-form-fila">
                  <label>
                    Municipio o alcaldía
                    <input
                      name="direccion_ciudad"
                      value={formulario.direccion_ciudad}
                      onChange={actualizarCampo}
                      maxLength={120}
                      placeholder="Ej. Iztacalco"
                    />
                  </label>

                  <label>
                    Estado
                    <select
                      name="direccion_estado"
                      value={formulario.direccion_estado}
                      onChange={actualizarCampo}
                    >
                      <option value="">Selecciona</option>
                      {ESTADOS_MEXICO.map((estado) => (
                        <option key={estado} value={estado}>
                          {estado}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <SelectorUbicacion
                  texto={
                    componerDireccion(formulario) || formulario.ubicacion
                  }
                  campos={{
                    direccion_calle: formulario.direccion_calle,
                    direccion_numero: formulario.direccion_numero,
                    direccion_colonia: formulario.direccion_colonia,
                    direccion_cp: formulario.direccion_cp,
                    direccion_ciudad: formulario.direccion_ciudad,
                    direccion_estado: formulario.direccion_estado,
                  }}
                  posicion={
                    formulario.latitud != null &&
                    formulario.longitud != null
                      ? {
                          lat: formulario.latitud,
                          lng: formulario.longitud,
                        }
                      : null
                  }
                  onCambiar={(pos) =>
                    setFormulario((anterior) => ({
                      ...anterior,
                      latitud: pos ? pos.lat : null,
                      longitud: pos ? pos.lng : null,
                    }))
                  }
                />
              </fieldset>

              <div className="bt-vacantes-form-fila">
                <label>
                  Salario mínimo
                  <input
                    type="number"
                    name="salario_min"
                    min="0"
                    step="0.01"
                    value={formulario.salario_min}
                    onChange={actualizarCampo}
                  />
                </label>

                <label>
                  Salario máximo
                  <input
                    type="number"
                    name="salario_max"
                    min="0"
                    step="0.01"
                    value={formulario.salario_max}
                    onChange={actualizarCampo}
                  />
                </label>
              </div>

              {error && (
                <p className="bt-vacantes-error-texto" role="alert">
                  {error}
                </p>
              )}

              <div className="bt-vacantes-form-acciones">
                <button
                  type="button"
                  className="bt-vacantes-btn"
                  onClick={cerrarFormulario}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="bt-vacantes-btn bt-vacantes-btn-primary"
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : vacanteEditando
                      ? "Guardar cambios"
                      : "Publicar vacante"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default VacantesEmpresa;
