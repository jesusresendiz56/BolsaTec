
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Search, Pencil, Trash2, RefreshCw,
  BadgeCheck, BadgeX, UserCheck, UserX, X
} from "lucide-react";

import { apiRequest } from "../../services/api";
import { sessionGet, sessionDestroy } from "../../services/session";
import "./EmpresasAdmin.css";

const vacio = {
  representante: "",
  nombre_empresa: "",
  correo: "",
  password: "",
  descripcion: "",
  ubicacion: ""
};

function EmpresasAdmin() {
  const navigate = useNavigate();

  const [empresas, setEmpresas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formulario, setFormulario] = useState(vacio);

  const solicitar = useCallback(async (ruta, opciones = {}) => {
    const sesion = sessionGet("administrador");

    if (!sesion?.token) {
      throw new Error("Tu sesión ha expirado");
    }

    return apiRequest(`/admin${ruta}`, {
      ...opciones,
      headers: {
        ...opciones.headers,
        Authorization: `Bearer ${sesion.token}`
      }
    });
  }, []);

  const cargarEmpresas = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const datos = await solicitar("/empresas");
      setEmpresas(datos);
    } catch (err) {
      setError(err.message);

      if (/sesión ha expirado/i.test(err.message)) {
        sessionDestroy("administrador");
        navigate("/admin/login", { replace: true });
      }
    } finally {
      setCargando(false);
    }
  }, [solicitar, navigate]);

  useEffect(() => {
    cargarEmpresas();
  }, [cargarEmpresas]);

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return empresas.filter((empresa) =>
      [
        empresa.nombre_empresa,
        empresa.representante,
        empresa.correo,
        empresa.ubicacion
      ].some((valor) =>
        String(valor || "").toLowerCase().includes(texto)
      )
    );
  }, [empresas, busqueda]);

  const abrirCrear = () => {
    setEditando(null);
    setFormulario({ ...vacio });
    setError("");
    setModal(true);
  };

  const abrirEditar = (empresa) => {
    setEditando(empresa);
    setFormulario({
      representante: empresa.representante || "",
      nombre_empresa: empresa.nombre_empresa || "",
      correo: empresa.correo || "",
      password: "",
      descripcion: empresa.descripcion || "",
      ubicacion: empresa.ubicacion || ""
    });
    setError("");
    setModal(true);
  };

  const cambiarCampo = (e) => {
    const { name, value } = e.target;
    setFormulario((previo) => ({
      ...previo,
      [name]: value
    }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    setProcesando(true);
    setError("");
    setMensaje("");

    try {
      const datos = {
        representante: formulario.representante.trim(),
        nombre_empresa: formulario.nombre_empresa.trim(),
        correo: formulario.correo.trim(),
        descripcion: formulario.descripcion.trim(),
        ubicacion: formulario.ubicacion.trim()
      };

      if (!editando) {
        datos.password = formulario.password;
      }

      await solicitar(
        editando
          ? `/empresas/${editando.id_empresa}`
          : "/empresas",
        {
          method: editando ? "PUT" : "POST",
          body: JSON.stringify(datos)
        }
      );

      setModal(false);
      setMensaje(
        editando
          ? "Empresa actualizada correctamente"
          : "Empresa registrada correctamente"
      );

      await cargarEmpresas();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  };

  const actualizarVerificacion = async (empresa) => {
    const nuevo = !empresa.verificada;

    if (!window.confirm(
      `¿Deseas ${nuevo ? "verificar" : "revocar la verificación de"} ` +
      `${empresa.nombre_empresa}?`
    )) return;

    setError("");
    setMensaje("");

    try {
      await solicitar(
        `/empresas/${empresa.id_empresa}/verificar`,
        {
          method: "PATCH",
          body: JSON.stringify({ verificada: nuevo })
        }
      );

      setMensaje("Verificación actualizada correctamente");
      await cargarEmpresas();
    } catch (err) {
      setError(err.message);
    }
  };

  const actualizarEstado = async (empresa) => {
    const nuevo = !empresa.activo;

    if (!window.confirm(
      `¿Deseas ${nuevo ? "activar" : "desactivar"} ` +
      `la cuenta de ${empresa.nombre_empresa}?`
    )) return;

    setError("");
    setMensaje("");

    try {
      await solicitar(
        `/empresas/${empresa.id_empresa}/estado`,
        {
          method: "PATCH",
          body: JSON.stringify({ activo: nuevo })
        }
      );

      setMensaje("Estado actualizado correctamente");
      await cargarEmpresas();
    } catch (err) {
      setError(err.message);
    }
  };

  const eliminar = async (empresa) => {
    if (!window.confirm(
      `¿Eliminar definitivamente ${empresa.nombre_empresa}?\n\n` +
      "Esta operación no se puede deshacer."
    )) return;

    setError("");
    setMensaje("");

    try {
      await solicitar(`/empresas/${empresa.id_empresa}`, {
        method: "DELETE"
      });

      setMensaje("Empresa eliminada correctamente");
      await cargarEmpresas();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="bt-empresas-admin">
      <div className="bt-em-header">
        <div>
          <h2>Administración de empresas</h2>
          <p>
            Consulta, registra, verifica y administra
            las empresas de BolsaTec.
          </p>
        </div>

        <button className="bt-em-primary" onClick={abrirCrear}>
          <Plus size={18} />
          Nueva empresa
        </button>
      </div>

      <div className="bt-em-toolbar">
        <div className="bt-em-search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Buscar empresa, correo o ubicación..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <button
          className="bt-em-secondary"
          onClick={cargarEmpresas}
          disabled={cargando}
        >
          <RefreshCw size={17} />
          Actualizar
        </button>
      </div>

      {mensaje && (
        <p className="bt-em-success" role="status">{mensaje}</p>
      )}

      {error && (
        <p className="bt-em-error" role="alert">{error}</p>
      )}

      <div className="bt-em-table-wrapper">
        <table className="bt-em-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Empresa</th>
              <th>Representante</th>
              <th>Correo</th>
              <th>Ubicación</th>
              <th>Verificación</th>
              <th>Cuenta</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {cargando ? (
              <tr>
                <td colSpan="8">Cargando empresas...</td>
              </tr>
            ) : filtradas.length === 0 ? (
              <tr>
                <td colSpan="8">No se encontraron empresas.</td>
              </tr>
            ) : (
              filtradas.map((empresa) => (
                <tr key={empresa.id_empresa}>
                  <td>{empresa.id_empresa}</td>
                  <td>
                    <strong>{empresa.nombre_empresa}</strong>
                  </td>
                  <td>{empresa.representante}</td>
                  <td>{empresa.correo}</td>
                  <td>{empresa.ubicacion || "Sin registrar"}</td>
                  <td>
                    <span className={
                      empresa.verificada
                        ? "bt-em-badge verificada"
                        : "bt-em-badge pendiente"
                    }>
                      {empresa.verificada
                        ? "Verificada"
                        : "Pendiente"}
                    </span>
                  </td>
                  <td>
                    <span className={
                      empresa.activo
                        ? "bt-em-badge activa"
                        : "bt-em-badge inactiva"
                    }>
                      {empresa.activo ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td>
                    <div className="bt-em-actions">
                      <button
                        title="Editar empresa"
                        aria-label={`Editar ${empresa.nombre_empresa}`}
                        onClick={() => abrirEditar(empresa)}
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        title={
                          empresa.verificada
                            ? "Revocar verificación"
                            : "Verificar empresa"
                        }
                        aria-label={
                          `${empresa.verificada ? "Revocar verificación" : "Verificar"} ` +
                          empresa.nombre_empresa
                        }
                        onClick={() => actualizarVerificacion(empresa)}
                      >
                        {empresa.verificada
                          ? <BadgeX size={17} />
                          : <BadgeCheck size={17} />}
                      </button>

                      <button
                        title={empresa.activo ? "Desactivar" : "Activar"}
                        aria-label={
                          `${empresa.activo ? "Desactivar" : "Activar"} ` +
                          empresa.nombre_empresa
                        }
                        onClick={() => actualizarEstado(empresa)}
                      >
                        {empresa.activo
                          ? <UserX size={17} />
                          : <UserCheck size={17} />}
                      </button>

                      <button
                        className="bt-em-danger-button"
                        title="Eliminar empresa"
                        aria-label={`Eliminar ${empresa.nombre_empresa}`}
                        onClick={() => eliminar(empresa)}
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
        Mostrando {filtradas.length} de {empresas.length} empresas
      </p>

      {modal && (
        <div className="bt-em-overlay">
          <div
            className="bt-em-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bt-em-modal-title"
          >
            <div className="bt-em-modal-header">
              <h3 id="bt-em-modal-title">
                {editando ? "Editar empresa" : "Nueva empresa"}
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
                Nombre de la empresa *
                <input
                  name="nombre_empresa"
                  value={formulario.nombre_empresa}
                  onChange={cambiarCampo}
                  maxLength={200}
                  required
                />
              </label>

              <label>
                Nombre del representante *
                <input
                  name="representante"
                  value={formulario.representante}
                  onChange={cambiarCampo}
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
                  onChange={cambiarCampo}
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
                    onChange={cambiarCampo}
                    minLength={8}
                    autoComplete="new-password"
                    required
                  />
                </label>
              )}

              <label>
                Ubicación
                <input
                  name="ubicacion"
                  value={formulario.ubicacion}
                  onChange={cambiarCampo}
                  maxLength={255}
                />
              </label>

              <label>
                Descripción
                <textarea
                  name="descripcion"
                  value={formulario.descripcion}
                  onChange={cambiarCampo}
                  rows={3}
                />
              </label>

              {error && (
                <p className="bt-em-error" role="alert">{error}</p>
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
                      : "Registrar empresa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmpresasAdmin;
