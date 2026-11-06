
import { useEffect, useState } from "react";
import {
  Search,
  MapPin,
  BriefcaseBusiness,
  Building2,
  RefreshCw,
  CalendarDays,
  X,
} from "lucide-react";

import { sessionGet } from "../../services/session";
import "./BuscarVacantes.css";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

const modalidades = {
  presencial: "Presencial",
  hibrida: "Híbrida",
  remota: "Remota",
};

const tipos = {
  practicas: "Prácticas profesionales",
  medio_tiempo: "Medio tiempo",
  tiempo_completo: "Tiempo completo",
};

const formatoSalario = (valor) => {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero)) return null;

  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(numero);
};

function BuscarVacantes() {
  const [vacantes, setVacantes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [modalidad, setModalidad] = useState("");
  const [tipo, setTipo] = useState("");

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [vacanteSeleccionada, setVacanteSeleccionada] =
    useState(null);

  const consultarVacantes = async (
    filtros = { busqueda: "", modalidad: "", tipo: "" }
  ) => {
    try {
      setCargando(true);
      setError("");

      const sesion = sessionGet("estudiante");

      if (!sesion?.token) {
        throw new Error("Debes iniciar sesión como estudiante");
      }

      const parametros = new URLSearchParams();

      if (filtros.busqueda.trim()) {
        parametros.set("busqueda", filtros.busqueda.trim());
      }

      if (filtros.modalidad) {
        parametros.set("modalidad", filtros.modalidad);
      }

      if (filtros.tipo) {
        parametros.set("tipo", filtros.tipo);
      }

      const query = parametros.toString();

      const respuesta = await fetch(
        `${API_URL}/api/estudiante/vacantes${
          query ? `?${query}` : ""
        }`,
        {
          headers: {
            Authorization: `Bearer ${sesion.token}`,
          },
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje || "No se pudieron consultar las vacantes"
        );
      }

      setVacantes(
        Array.isArray(datos.vacantes) ? datos.vacantes : []
      );
    } catch (err) {
      console.error("Error al buscar vacantes:", err);
      setError(err.message);
      setVacantes([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    consultarVacantes();
  }, []);

  const buscar = (evento) => {
    evento.preventDefault();
    consultarVacantes({ busqueda, modalidad, tipo });
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setModalidad("");
    setTipo("");
    consultarVacantes();
  };

  const mostrarSalario = (vacante) => {
    const minimo = formatoSalario(vacante.salario_min);
    const maximo = formatoSalario(vacante.salario_max);

    if (minimo && maximo) {
      return `${minimo} - ${maximo} MXN`;
    }

    if (minimo) return `Desde ${minimo} MXN`;
    if (maximo) return `Hasta ${maximo} MXN`;

    return "Salario no especificado";
  };

  return (
    <div className="bt-vacantes">
      <div className="bt-vacantes-intro">
        <h3>Explorar oportunidades</h3>
        <p>
          Encuentra empleos y prácticas profesionales
          publicados por las empresas de BolsaTec.
        </p>
      </div>

      <form className="bt-vacantes-filtros" onSubmit={buscar}>
        <div className="bt-vacantes-busqueda">
          <Search size={19} />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar puesto, empresa o ubicación"
            aria-label="Buscar vacantes"
          />
        </div>

        <select
          value={modalidad}
          onChange={(e) => setModalidad(e.target.value)}
          aria-label="Filtrar por modalidad"
        >
          <option value="">Todas las modalidades</option>
          <option value="presencial">Presencial</option>
          <option value="hibrida">Híbrida</option>
          <option value="remota">Remota</option>
        </select>

        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          aria-label="Filtrar por tipo"
        >
          <option value="">Todos los tipos</option>
          <option value="practicas">Prácticas profesionales</option>
          <option value="medio_tiempo">Medio tiempo</option>
          <option value="tiempo_completo">Tiempo completo</option>
        </select>

        <div className="bt-vacantes-botones">
          <button type="submit" disabled={cargando}>
            <Search size={17} />
            Buscar
          </button>

          <button
            type="button"
            className="bt-vacantes-secundario"
            onClick={limpiarFiltros}
            disabled={cargando}
          >
            <X size={17} />
            Limpiar
          </button>
        </div>
      </form>

      <div className="bt-vacantes-resultados">
        <h3>Vacantes disponibles</h3>

        <button
          type="button"
          onClick={() =>
            consultarVacantes({ busqueda, modalidad, tipo })
          }
          disabled={cargando}
          className="bt-vacantes-actualizar"
        >
          <RefreshCw size={17} />
          Actualizar
        </button>
      </div>

      {cargando && (
        <div className="bt-vacantes-mensaje">
          Consultando vacantes disponibles...
        </div>
      )}

      {error && (
        <div className="bt-vacantes-error" role="alert">
          {error}
        </div>
      )}

      {!cargando && !error && vacantes.length === 0 && (
        <div className="bt-vacantes-mensaje">
          <BriefcaseBusiness size={32} />
          <h4>No se encontraron vacantes</h4>
          <p>
            Intenta cambiar los filtros o vuelve a consultar
            más adelante.
          </p>
        </div>
      )}

      {!cargando && !error && vacantes.length > 0 && (
        <>
          <p className="bt-vacantes-contador">
            {vacantes.length} vacante(s) encontrada(s)
          </p>

          <div className="bt-vacantes-grid">
            {vacantes.map((vacante) => (
              <article
                className="bt-vacante-card"
                key={vacante.id_vacante}
              >
                <div className="bt-vacante-icono">
                  <Building2 size={24} />
                </div>

                <h3>{vacante.titulo}</h3>

                <p className="bt-vacante-empresa">
                  {vacante.nombre_empresa}
                </p>

                <div className="bt-vacante-etiquetas">
                  <span>
                    {modalidades[vacante.modalidad] ||
                      vacante.modalidad}
                  </span>

                  <span>
                    {tipos[vacante.tipo] || vacante.tipo}
                  </span>
                </div>

                <p className="bt-vacante-dato">
                  <MapPin size={16} />
                  {vacante.ubicacion || "No especificada"}
                </p>

                <p className="bt-vacante-salario">
                  {mostrarSalario(vacante)}
                </p>

                <button
                  type="button"
                  className="bt-vacante-detalles"
                  onClick={() =>
                    setVacanteSeleccionada(vacante)
                  }
                >
                  Ver detalles
                </button>
              </article>
            ))}
          </div>
        </>
      )}

      {vacanteSeleccionada && (
        <div
          className="bt-vacante-modal-fondo"
          onClick={() => setVacanteSeleccionada(null)}
        >
          <div
            className="bt-vacante-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Detalles de la vacante"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="bt-vacante-cerrar"
              onClick={() => setVacanteSeleccionada(null)}
              aria-label="Cerrar detalles"
            >
              <X size={21} />
            </button>

            <h2>{vacanteSeleccionada.titulo}</h2>

            <p className="bt-vacante-empresa">
              <Building2 size={17} />
              {vacanteSeleccionada.nombre_empresa}
            </p>

            <div className="bt-vacante-etiquetas">
              <span>
                {modalidades[vacanteSeleccionada.modalidad] ||
                  vacanteSeleccionada.modalidad}
              </span>
              <span>
                {tipos[vacanteSeleccionada.tipo] ||
                  vacanteSeleccionada.tipo}
              </span>
            </div>

            <p className="bt-vacante-dato">
              <MapPin size={17} />
              {vacanteSeleccionada.ubicacion ||
                "Ubicación no especificada"}
            </p>

            <p className="bt-vacante-salario">
              {mostrarSalario(vacanteSeleccionada)}
            </p>

            {vacanteSeleccionada.fecha_publicacion && (
              <p className="bt-vacante-dato">
                <CalendarDays size={17} />
                Publicada:{" "}
                {new Date(
                  vacanteSeleccionada.fecha_publicacion
                ).toLocaleDateString("es-MX")}
              </p>
            )}

            <h3>Descripción de la vacante</h3>

            <p className="bt-vacante-descripcion">
              {vacanteSeleccionada.descripcion ||
                "Sin descripción"}
            </p>

            <p className="bt-vacante-aviso">
              La opción para postularte estará disponible
              cuando implementemos el módulo de
              postulaciones.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default BuscarVacantes;
