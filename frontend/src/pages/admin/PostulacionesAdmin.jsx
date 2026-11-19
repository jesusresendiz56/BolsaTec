import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, Trash2 } from "lucide-react";

import { useSolicitudAdmin, formatearFecha } from "./useSolicitudAdmin";
import "./EmpresasAdmin.css";
import "./AdminModulos.css";

const ESTADOS = [
  { valor: "enviada", nombre: "Enviada" },
  { valor: "vista", nombre: "Vista" },
  { valor: "entrevista", nombre: "Entrevista" },
  { valor: "aceptada", nombre: "Aceptada" },
  { valor: "rechazada", nombre: "Rechazada" },
];

const nombreEstado = (estado) =>
  ESTADOS.find((e) => e.valor === estado)?.nombre || estado;

function PostulacionesAdmin() {
  const solicitar = useSolicitudAdmin();

  const [postulaciones, setPostulaciones] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [advertencia, setAdvertencia] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      setPostulaciones(await solicitar("/postulaciones"));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [solicitar]);

  // Carga inicial (cargando ya empieza en true)
  useEffect(() => {
    let activo = true;
    solicitar("/postulaciones")
      .then((datos) => activo && setPostulaciones(datos))
      .catch((err) => activo && setError(err.message))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [solicitar]);

  const conteo = useMemo(() => {
    const totales = {};
    postulaciones.forEach((p) => {
      totales[p.estado] = (totales[p.estado] || 0) + 1;
    });
    return totales;
  }, [postulaciones]);

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return postulaciones.filter(
      (p) =>
        (!filtroEstado || p.estado === filtroEstado) &&
        [
          p.nombre_estudiante,
          p.correo_estudiante,
          p.carrera,
          p.titulo_vacante,
          p.nombre_empresa,
        ].some((valor) => String(valor || "").toLowerCase().includes(texto))
    );
  }, [postulaciones, busqueda, filtroEstado]);

  const limpiarAvisos = () => {
    setError("");
    setMensaje("");
    setAdvertencia("");
  };

  const cambiarEstado = async (p, estado) => {
    if (estado === p.estado) return;

    if (
      !window.confirm(
        `¿Cambiar la postulación de ${p.nombre_estudiante} a ` +
          `"${nombreEstado(estado)}"?\n\n` +
          "Se notificará al estudiante por correo y en la plataforma."
      )
    )
      return;

    limpiarAvisos();

    try {
      const datos = await solicitar(
        `/postulaciones/${p.id_postulacion}/estado`,
        { method: "PATCH", body: JSON.stringify({ estado }) }
      );
      setMensaje(datos.mensaje || "Estado actualizado");
      if (datos.advertencia) setAdvertencia(datos.advertencia);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const eliminar = async (p) => {
    if (
      !window.confirm(
        `¿Eliminar la postulación de ${p.nombre_estudiante} ` +
          `a "${p.titulo_vacante}"?\n\nEsta operación no se puede deshacer.`
      )
    )
      return;

    limpiarAvisos();

    try {
      await solicitar(`/postulaciones/${p.id_postulacion}`, {
        method: "DELETE",
      });
      setMensaje("Postulación eliminada correctamente");
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="bt-empresas-admin">
      <div className="bt-em-header">
        <div>
          <h2>Administración de postulaciones</h2>
          <p>
            Consulta todas las postulaciones de los estudiantes y
            corrige su estado cuando sea necesario.
          </p>
        </div>
      </div>

      <div className="bt-adm-resumen" role="group" aria-label="Filtrar por estado">
        <button
          type="button"
          className={filtroEstado === "" ? "bt-adm-chip activo" : "bt-adm-chip"}
          onClick={() => setFiltroEstado("")}
        >
          Todas ({postulaciones.length})
        </button>
        {ESTADOS.map((e) => (
          <button
            key={e.valor}
            type="button"
            className={
              filtroEstado === e.valor ? "bt-adm-chip activo" : "bt-adm-chip"
            }
            onClick={() => setFiltroEstado(e.valor)}
          >
            {e.nombre} ({conteo[e.valor] || 0})
          </button>
        ))}
      </div>

      <div className="bt-em-toolbar">
        <div className="bt-em-search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Buscar estudiante, carrera, vacante o empresa..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

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
      {advertencia && (
        <p className="bt-adm-warning" role="status">
          {advertencia}
        </p>
      )}
      {error && (
        <p className="bt-em-error" role="alert">
          {error}
        </p>
      )}

      <div className="bt-em-table-wrapper">
        <table className="bt-em-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Estudiante</th>
              <th>Carrera</th>
              <th>Vacante</th>
              <th>Empresa</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {cargando ? (
              <tr>
                <td colSpan="8">Cargando postulaciones...</td>
              </tr>
            ) : filtradas.length === 0 ? (
              <tr>
                <td colSpan="8">No se encontraron postulaciones.</td>
              </tr>
            ) : (
              filtradas.map((p) => (
                <tr key={p.id_postulacion}>
                  <td>{p.id_postulacion}</td>
                  <td>
                    <strong>{p.nombre_estudiante}</strong>
                    <span className="bt-adm-sub">{p.correo_estudiante}</span>
                  </td>
                  <td>
                    {p.carrera || "Sin registrar"}
                    {p.semestre && (
                      <span className="bt-adm-sub">
                        {p.semestre}° semestre
                      </span>
                    )}
                  </td>
                  <td>
                    {p.titulo_vacante}
                    {p.estado_vacante !== "activa" && (
                      <span className="bt-adm-sub">
                        Vacante {p.estado_vacante}
                      </span>
                    )}
                  </td>
                  <td>{p.nombre_empresa}</td>
                  <td>{formatearFecha(p.fecha_postulacion)}</td>
                  <td>
                    <select
                      className="bt-adm-estado-select"
                      value={p.estado}
                      onChange={(e) => cambiarEstado(p, e.target.value)}
                      aria-label={`Estado de la postulación de ${p.nombre_estudiante}`}
                    >
                      {ESTADOS.map((e) => (
                        <option key={e.valor} value={e.valor}>
                          {e.nombre}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="bt-em-actions">
                      <button
                        className="bt-em-danger-button"
                        title="Eliminar postulación"
                        aria-label={`Eliminar postulación de ${p.nombre_estudiante}`}
                        onClick={() => eliminar(p)}
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
        Mostrando {filtradas.length} de {postulaciones.length} postulaciones
      </p>
    </div>
  );
}

export default PostulacionesAdmin;
