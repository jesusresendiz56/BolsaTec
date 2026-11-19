import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, RefreshCw, X } from "lucide-react";

import { useSolicitudAdmin } from "./useSolicitudAdmin";
import "./EmpresasAdmin.css";
import "./AdminModulos.css";

const vacio = { nombre: "", categoria: "" };

function HabilidadesAdmin() {
  const solicitar = useSolicitudAdmin();

  const [habilidades, setHabilidades] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [errorModal, setErrorModal] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formulario, setFormulario] = useState(vacio);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      setHabilidades(await solicitar("/habilidades"));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [solicitar]);

  // Carga inicial (cargando ya empieza en true)
  useEffect(() => {
    let activo = true;
    solicitar("/habilidades")
      .then((datos) => activo && setHabilidades(datos))
      .catch((err) => activo && setError(err.message))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [solicitar]);

  const categorias = useMemo(
    () =>
      [...new Set(habilidades.map((h) => h.categoria).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, "es")
      ),
    [habilidades]
  );

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return habilidades.filter(
      (h) =>
        (!filtroCategoria || h.categoria === filtroCategoria) &&
        [h.nombre, h.categoria].some((valor) =>
          String(valor || "").toLowerCase().includes(texto)
        )
    );
  }, [habilidades, busqueda, filtroCategoria]);

  const abrirCrear = () => {
    setEditando(null);
    setFormulario({ ...vacio });
    setErrorModal("");
    setModal(true);
  };

  const abrirEditar = (h) => {
    setEditando(h);
    setFormulario({ nombre: h.nombre || "", categoria: h.categoria || "" });
    setErrorModal("");
    setModal(true);
  };

  const cambiarCampo = (e) => {
    const { name, value } = e.target;
    setFormulario((previo) => ({ ...previo, [name]: value }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    setProcesando(true);
    setErrorModal("");
    setMensaje("");

    try {
      await solicitar(
        editando ? `/habilidades/${editando.id_habilidad}` : "/habilidades",
        {
          method: editando ? "PUT" : "POST",
          body: JSON.stringify({
            nombre: formulario.nombre.trim(),
            categoria: formulario.categoria.trim(),
          }),
        }
      );

      setModal(false);
      setMensaje(
        editando
          ? "Habilidad actualizada correctamente"
          : "Habilidad registrada correctamente"
      );
      await cargar();
    } catch (err) {
      setErrorModal(err.message);
    } finally {
      setProcesando(false);
    }
  };

  const eliminar = async (h) => {
    if (!window.confirm(`¿Eliminar la habilidad "${h.nombre}"?`)) return;

    setError("");
    setMensaje("");

    try {
      await solicitar(`/habilidades/${h.id_habilidad}`, { method: "DELETE" });
      setMensaje("Habilidad eliminada correctamente");
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="bt-empresas-admin">
      <div className="bt-em-header">
        <div>
          <h2>Catálogo de habilidades</h2>
          <p>
            Administra las habilidades disponibles para los perfiles de
            los estudiantes.
          </p>
        </div>

        <button className="bt-em-primary" onClick={abrirCrear}>
          <Plus size={18} />
          Nueva habilidad
        </button>
      </div>

      <div className="bt-em-toolbar">
        <div className="bt-em-search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Buscar habilidad o categoría..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          aria-label="Filtrar por categoría"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button
          className="bt-em-secondary"
          onClick={cargar}
          disabled={cargando}
        >
          <RefreshCw size={17} />
          Actualizar
        </button>
      </div>

      {mensaje && (
        <p className="bt-em-success" role="status">
          {mensaje}
        </p>
      )}
      {error && (
        <p className="bt-em-error" role="alert">
          {error}
        </p>
      )}

      <div className="bt-em-table-wrapper">
        <table className="bt-em-table" style={{ minWidth: 640 }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Habilidad</th>
              <th>Categoría</th>
              <th>Estudiantes</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {cargando ? (
              <tr>
                <td colSpan="5">Cargando habilidades...</td>
              </tr>
            ) : filtradas.length === 0 ? (
              <tr>
                <td colSpan="5">No se encontraron habilidades.</td>
              </tr>
            ) : (
              filtradas.map((h) => (
                <tr key={h.id_habilidad}>
                  <td>{h.id_habilidad}</td>
                  <td>
                    <strong>{h.nombre}</strong>
                  </td>
                  <td>{h.categoria || "Sin categoría"}</td>
                  <td>{h.total_estudiantes}</td>
                  <td>
                    <div className="bt-em-actions">
                      <button
                        title="Editar habilidad"
                        aria-label={`Editar ${h.nombre}`}
                        onClick={() => abrirEditar(h)}
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        className="bt-em-danger-button"
                        title="Eliminar habilidad"
                        aria-label={`Eliminar ${h.nombre}`}
                        onClick={() => eliminar(h)}
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

      <p className="bt-em-total">
        Mostrando {filtradas.length} de {habilidades.length} habilidades
      </p>

      {modal && (
        <div className="bt-em-overlay">
          <div
            className="bt-em-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bt-hab-modal-title"
          >
            <div className="bt-em-modal-header">
              <h3 id="bt-hab-modal-title">
                {editando ? "Editar habilidad" : "Nueva habilidad"}
              </h3>
              <button
                type="button"
                onClick={() => setModal(false)}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={guardar}>
              <label>
                Nombre *
                <input
                  name="nombre"
                  value={formulario.nombre}
                  onChange={cambiarCampo}
                  maxLength={100}
                  placeholder="Ej. JavaScript"
                  required
                />
              </label>

              <label>
                Categoría
                <input
                  name="categoria"
                  value={formulario.categoria}
                  onChange={cambiarCampo}
                  maxLength={60}
                  list="bt-hab-categorias"
                  placeholder="Ej. Programación"
                />
                <datalist id="bt-hab-categorias">
                  {categorias.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>

              {errorModal && (
                <p className="bt-em-error" role="alert">
                  {errorModal}
                </p>
              )}

              <div className="bt-em-modal-actions">
                <button
                  type="button"
                  className="bt-em-secondary"
                  onClick={() => setModal(false)}
                  disabled={procesando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bt-em-primary"
                  disabled={procesando}
                >
                  {procesando
                    ? "Guardando..."
                    : editando
                      ? "Guardar cambios"
                      : "Registrar habilidad"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default HabilidadesAdmin;
