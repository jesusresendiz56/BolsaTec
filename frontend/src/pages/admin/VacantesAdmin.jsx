import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, Eye, Trash2, X } from "lucide-react";

import {
  useSolicitudAdmin,
  formatearFecha,
  formatearSalario,
} from "./useSolicitudAdmin";
import "./EmpresasAdmin.css";
import "./AdminModulos.css";

const ESTADOS = [
  { valor: "activa", nombre: "Activa" },
  { valor: "pausada", nombre: "Pausada" },
  { valor: "cerrada", nombre: "Cerrada" },
];

const MODALIDADES = {
  presencial: "Presencial",
  hibrida: "Híbrida",
  remota: "Remota",
};

const TIPOS = {
  practicas: "Prácticas",
  medio_tiempo: "Medio tiempo",
  tiempo_completo: "Tiempo completo",
};

const normalizar = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const direccionCompleta = (v) =>
  [
    [v.direccion_calle, v.direccion_numero].filter(Boolean).join(" "),
    v.direccion_colonia,
    v.direccion_cp && `C.P. ${v.direccion_cp}`,
    v.direccion_ciudad,
    v.direccion_estado,
  ]
    .filter(Boolean)
    .join(", ") || v.ubicacion || "Sin registrar";

function VacantesAdmin() {
  const solicitar = useSolicitudAdmin();

  const [vacantes, setVacantes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroModalidad, setFiltroModalidad] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [detalle, setDetalle] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      setVacantes(await solicitar("/vacantes"));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [solicitar]);

  // Carga inicial (cargando ya empieza en true)
  useEffect(() => {
    let activo = true;
    solicitar("/vacantes")
      .then((datos) => activo && setVacantes(datos))
      .catch((err) => activo && setError(err.message))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [solicitar]);

  const filtradas = useMemo(() => {
    const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);

    return vacantes.filter((v) => {
      if (filtroEstado && v.estado !== filtroEstado) return false;
      if (filtroModalidad && v.modalidad !== filtroModalidad) return false;

      const texto = normalizar(
        [v.titulo, v.nombre_empresa, v.ubicacion, v.direccion_ciudad].join(" ")
      );
      return palabras.every((palabra) => texto.includes(palabra));
    });
  }, [vacantes, busqueda, filtroEstado, filtroModalidad]);

  const cambiarEstado = async (vacante, estado) => {
    if (estado === vacante.estado) return;

    if (
      !window.confirm(
        `¿Cambiar la vacante "${vacante.titulo}" a ` +
          `${ESTADOS.find((e) => e.valor === estado)?.nombre}?`
      )
    )
      return;

    setError("");
    setMensaje("");

    try {
      await solicitar(`/vacantes/${vacante.id_vacante}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado }),
      });
      setMensaje("Estado de la vacante actualizado");
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const eliminar = async (vacante) => {
    if (
      !window.confirm(
        `¿Eliminar definitivamente la vacante "${vacante.titulo}"?\n\n` +
          "Esta operación no se puede deshacer."
      )
    )
      return;

    setError("");
    setMensaje("");

    try {
      await solicitar(`/vacantes/${vacante.id_vacante}`, {
        method: "DELETE",
      });
      setMensaje("Vacante eliminada correctamente");
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="bt-empresas-admin">
      <div className="bt-em-header">
        <div>
          <h2>Supervisión de vacantes</h2>
          <p>
            Revisa las vacantes publicadas por las empresas, cambia su
            estado o elimina publicaciones indebidas.
          </p>
        </div>
      </div>

      <div className="bt-em-toolbar">
        <div className="bt-em-search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Buscar por título, empresa o ciudad..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e.valor} value={e.valor}>
              {e.nombre}
            </option>
          ))}
        </select>

        <select
          value={filtroModalidad}
          onChange={(e) => setFiltroModalidad(e.target.value)}
          aria-label="Filtrar por modalidad"
        >
          <option value="">Todas las modalidades</option>
          {Object.entries(MODALIDADES).map(([valor, nombre]) => (
            <option key={valor} value={valor}>
              {nombre}
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
        <table className="bt-em-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Vacante</th>
              <th>Empresa</th>
              <th>Modalidad</th>
              <th>Publicada</th>
              <th>Postulaciones</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {cargando ? (
              <tr>
                <td colSpan="8">Cargando vacantes...</td>
              </tr>
            ) : filtradas.length === 0 ? (
              <tr>
                <td colSpan="8">No se encontraron vacantes.</td>
              </tr>
            ) : (
              filtradas.map((v) => (
                <tr key={v.id_vacante}>
                  <td>{v.id_vacante}</td>
                  <td>
                    <strong>{v.titulo}</strong>
                    <span className="bt-adm-sub">
                      {TIPOS[v.tipo] || v.tipo}
                    </span>
                  </td>
                  <td>
                    {v.nombre_empresa}
                    {!v.empresa_verificada && (
                      <span className="bt-adm-sub">No verificada</span>
                    )}
                  </td>
                  <td>{MODALIDADES[v.modalidad] || v.modalidad}</td>
                  <td>{formatearFecha(v.fecha_publicacion)}</td>
                  <td>{v.total_postulaciones}</td>
                  <td>
                    <select
                      className="bt-adm-estado-select"
                      value={v.estado}
                      onChange={(e) => cambiarEstado(v, e.target.value)}
                      aria-label={`Estado de ${v.titulo}`}
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
                        title="Ver detalle"
                        aria-label={`Ver detalle de ${v.titulo}`}
                        onClick={() => setDetalle(v)}
                      >
                        <Eye size={17} />
                      </button>
                      <button
                        className="bt-em-danger-button"
                        title="Eliminar vacante"
                        aria-label={`Eliminar ${v.titulo}`}
                        onClick={() => eliminar(v)}
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
        Mostrando {filtradas.length} de {vacantes.length} vacantes
      </p>

      {detalle && (
        <div className="bt-em-overlay" onClick={() => setDetalle(null)}>
          <div
            className="bt-em-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bt-vac-modal-title"
            style={{ maxWidth: 640 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bt-em-modal-header">
              <h3 id="bt-vac-modal-title">{detalle.titulo}</h3>
              <button
                type="button"
                onClick={() => setDetalle(null)}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <dl className="bt-adm-detalle">
              <div>
                <dt>Empresa</dt>
                <dd>{detalle.nombre_empresa}</dd>
              </div>
              <div>
                <dt>Correo de la empresa</dt>
                <dd>{detalle.correo_empresa}</dd>
              </div>
              <div>
                <dt>Modalidad</dt>
                <dd>{MODALIDADES[detalle.modalidad] || detalle.modalidad}</dd>
              </div>
              <div>
                <dt>Tipo</dt>
                <dd>{TIPOS[detalle.tipo] || detalle.tipo}</dd>
              </div>
              <div>
                <dt>Salario</dt>
                <dd>
                  {formatearSalario(detalle.salario_min, detalle.salario_max)}
                </dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>
                  <span className={`bt-em-badge ${detalle.estado}`}>
                    {ESTADOS.find((e) => e.valor === detalle.estado)?.nombre ||
                      detalle.estado}
                  </span>
                </dd>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <dt>Dirección</dt>
                <dd>{direccionCompleta(detalle)}</dd>
              </div>
            </dl>

            <h4>Descripción</h4>
            <p className="bt-adm-descripcion">{detalle.descripcion}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default VacantesAdmin;
