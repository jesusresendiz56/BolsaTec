
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  UserCheck,
  UserX,
  X,
} from "lucide-react";

import { apiRequest } from "../../services/api";
import { sessionGet, sessionDestroy } from "../../services/session";
import { useNavigate } from "react-router-dom";

import "./EstudiantesAdmin.css";

const formularioVacio = {
  nombre: "",
  correo: "",
  password: "",
  carrera: "",
  semestre: "",
  descripcion: "",
};

function EstudiantesAdmin() {
  const navigate = useNavigate();

  const [estudiantes, setEstudiantes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formulario, setFormulario] = useState(formularioVacio);

  const peticionAdmin = useCallback(async (ruta, opciones = {}) => {
    const sesion = sessionGet("administrador");

    if (!sesion) {
      throw new Error("Tu sesión ha expirado. Inicia sesión nuevamente.");
    }

    return apiRequest(`/admin${ruta}`, {
      ...opciones,
      headers: {
        ...opciones.headers,
        Authorization: `Bearer ${sesion.token}`,
      },
    });
  }, []);

  const cargarEstudiantes = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const datos = await peticionAdmin("/estudiantes");
      setEstudiantes(datos);
    } catch (err) {
      setError(err.message);

      if (/sesión ha expirado/i.test(err.message)) {
        sessionDestroy("administrador");
        navigate("/admin/login", { replace: true });
      }
    } finally {
      setCargando(false);
    }
  }, [peticionAdmin, navigate]);

  useEffect(() => {
    cargarEstudiantes();
  }, [cargarEstudiantes]);

  const estudiantesFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    return estudiantes.filter((e) =>
      [e.nombre, e.correo, e.carrera]
        .some((valor) =>
          String(valor || "").toLowerCase().includes(texto)
        )
    );
  }, [estudiantes, busqueda]);

  const abrirCrear = () => {
    setEditando(null);
    setFormulario({ ...formularioVacio });
    setError("");
    setMensaje("");
    setModalAbierto(true);
  };

  const abrirEditar = (estudiante) => {
    setEditando(estudiante);
    setFormulario({
      nombre: estudiante.nombre || "",
      correo: estudiante.correo || "",
      password: "",
      carrera: estudiante.carrera || "",
      semestre: estudiante.semestre ?? "",
      descripcion: estudiante.descripcion || "",
    });
    setError("");
    setMensaje("");
    setModalAbierto(true);
  };

  const actualizarCampo = (e) => {
    const { name, value } = e.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  };

  const guardarEstudiante = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError("");

    try {
      const datos = {
        nombre: formulario.nombre.trim(),
        correo: formulario.correo.trim(),
        carrera: formulario.carrera.trim(),
        semestre: formulario.semestre === ""
          ? null
          : Number(formulario.semestre),
        descripcion: formulario.descripcion.trim(),
      };

      if (!editando) {
        datos.password = formulario.password;
      }

      await peticionAdmin(
        editando
          ? `/estudiantes/${editando.id_estudiante}`
          : "/estudiantes",
        {
          method: editando ? "PUT" : "POST",
          body: JSON.stringify(datos),
        }
      );

      setModalAbierto(false);
      setMensaje(
        editando
          ? "Estudiante actualizado correctamente"
          : "Estudiante registrado correctamente"
      );

      await cargarEstudiantes();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (estudiante) => {
    const nuevoEstado = !estudiante.activo;

    const confirmar = window.confirm(
      `¿Deseas ${nuevoEstado ? "activar" : "desactivar"} ` +
      `la cuenta de ${estudiante.nombre}?`
    );

    if (!confirmar) return;

    setError("");
    setMensaje("");

    try {
      await peticionAdmin(
        `/estudiantes/${estudiante.id_estudiante}/estado`,
        {
          method: "PATCH",
          body: JSON.stringify({ activo: nuevoEstado }),
        }
      );

      setMensaje("Estado actualizado correctamente");
      await cargarEstudiantes();
    } catch (err) {
      setError(err.message);
    }
  };

  const eliminarEstudiante = async (estudiante) => {
    const confirmar = window.confirm(
      `¿Eliminar definitivamente a ${estudiante.nombre}?\n\n` +
      "Esta acción no se puede deshacer."
    );

    if (!confirmar) return;

    setError("");
    setMensaje("");

    try {
      await peticionAdmin(
        `/estudiantes/${estudiante.id_estudiante}`,
        { method: "DELETE" }
      );

      setMensaje("Estudiante eliminado correctamente");
      await cargarEstudiantes();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="bt-estudiantes-admin">
      <div className="bt-estudiantes-top">
        <div>
          <h2>Administración de estudiantes</h2>
          <p>
            Consulta, registra y administra las cuentas
            de estudiantes de BolsaTec.
          </p>
        </div>

        <button
          className="bt-ea-primary"
          onClick={abrirCrear}
        >
          <Plus size={18} />
          Nuevo estudiante
        </button>
      </div>

      <div className="bt-estudiantes-toolbar">
        <div className="bt-ea-search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Buscar por nombre, correo o carrera..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <button
          className="bt-ea-outline"
          onClick={cargarEstudiantes}
          disabled={cargando}
        >
          <RefreshCw size={17} />
          Actualizar
        </button>
      </div>

      {mensaje && (
        <p className="bt-ea-success" role="status">{mensaje}</p>
      )}

      {error && (
        <p className="bt-ea-error" role="alert">{error}</p>
      )}

      <div className="bt-ea-table-wrapper">
        <table className="bt-ea-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Estudiante</th>
              <th>Correo</th>
              <th>Carrera</th>
              <th>Semestre</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {cargando ? (
              <tr>
                <td colSpan="7">Cargando estudiantes...</td>
              </tr>
            ) : estudiantesFiltrados.length === 0 ? (
              <tr>
                <td colSpan="7">
                  No se encontraron estudiantes.
                </td>
              </tr>
            ) : (
              estudiantesFiltrados.map((estudiante) => (
                <tr key={estudiante.id_estudiante}>
                  <td>{estudiante.id_estudiante}</td>
                  <td>
                    <strong>{estudiante.nombre}</strong>
                  </td>
                  <td>{estudiante.correo}</td>
                  <td>{estudiante.carrera || "Sin registrar"}</td>
                  <td>{estudiante.semestre ?? "—"}</td>
                  <td>
                    <span
                      className={
                        estudiante.activo
                          ? "bt-ea-badge activo"
                          : "bt-ea-badge inactivo"
                      }
                    >
                      {estudiante.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>
                    <div className="bt-ea-actions">
                      <button
                        title="Editar"
                        aria-label={`Editar ${estudiante.nombre}`}
                        onClick={() => abrirEditar(estudiante)}
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        title={estudiante.activo ? "Desactivar" : "Activar"}
                        aria-label={`${estudiante.activo ? "Desactivar" : "Activar"} ${estudiante.nombre}`}
                        onClick={() => cambiarEstado(estudiante)}
                      >
                        {estudiante.activo
                          ? <UserX size={17} />
                          : <UserCheck size={17} />}
                      </button>

                      <button
                        className="peligro"
                        title="Eliminar"
                        aria-label={`Eliminar ${estudiante.nombre}`}
                        onClick={() => eliminarEstudiante(estudiante)}
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

      <p className="bt-ea-total">
        Mostrando {estudiantesFiltrados.length} de{" "}
        {estudiantes.length} estudiantes
      </p>

      {modalAbierto && (
        <div
          className="bt-ea-modal-overlay"
          onClick={() => setModalAbierto(false)}
        >
          <div
            className="bt-ea-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bt-ea-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bt-ea-modal-header">
              <h3 id="bt-ea-modal-title">
                {editando ? "Editar estudiante" : "Nuevo estudiante"}
              </h3>
              <button
                onClick={() => setModalAbierto(false)}
                aria-label="Cerrar formulario"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={guardarEstudiante}>
              <label>
                Nombre completo *
                <input
                  name="nombre"
                  value={formulario.nombre}
                  onChange={actualizarCampo}
                  maxLength={150}
                  required
                />
              </label>

              <label>
                Correo electrónico *
                <input
                  type="email"
                  name="correo"
                  value={formulario.correo}
                  onChange={actualizarCampo}
                  maxLength={255}
                  required
                />
              </label>

              {!editando && (
                <label>
                  Contraseña *
                  <input
                    type="password"
                    name="password"
                    value={formulario.password}
                    onChange={actualizarCampo}
                    minLength={8}
                    maxLength={72}
                    autoComplete="new-password"
                    required
                  />
                </label>
              )}

              <label>
                Carrera
                <input
                  name="carrera"
                  value={formulario.carrera}
                  onChange={actualizarCampo}
                  maxLength={150}
                />
              </label>

              <label>
                Semestre
                <input
                  type="number"
                  name="semestre"
                  value={formulario.semestre}
                  onChange={actualizarCampo}
                  min={1}
                  max={15}
                />
              </label>

              <label>
                Descripción
                <textarea
                  name="descripcion"
                  value={formulario.descripcion}
                  onChange={actualizarCampo}
                  rows={3}
                />
              </label>

              {error && (
                <p className="bt-ea-error" role="alert">{error}</p>
              )}

              <div className="bt-ea-modal-actions">
                <button
                  type="button"
                  className="bt-ea-outline"
                  onClick={() => setModalAbierto(false)}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="bt-ea-primary"
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : editando
                      ? "Guardar cambios"
                      : "Registrar estudiante"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default EstudiantesAdmin;
