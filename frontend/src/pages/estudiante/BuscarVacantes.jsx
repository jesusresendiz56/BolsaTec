
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Search,
  MapPin,
  XCircle,
  BriefcaseBusiness,
  Building2,
  RefreshCw,
  CalendarDays,
  X,
  Send,
  CheckCircle2,
} from "lucide-react";

import { sessionGet } from "../../services/session";
import { esReciente, fechaCorta, tiempoRelativo } from "../../services/fechas";
import { ESTADOS_POSTULACION } from "../../services/postulaciones";
import MapaUbicacion from "../../components/MapaUbicacion";
import ExamenPostulacion from "../../components/ExamenPostulacion";
import ChipExamen from "../../components/ChipExamen";
import { enviarPostulacion } from "../../services/examen";
import "./BuscarVacantes.css";
import "./MisPostulaciones.css";

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
  estadia: "Estadía",
  practicas: "Prácticas profesionales",
  tiempo_completo: "Tiempo completo",
  medio_tiempo: "Medio tiempo",
  servicio_social: "Servicio social",
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

// ========================================
// BÚSQUEDA SIN ACENTOS NI MAYÚSCULAS
// "practicas morelia" encuentra "Prácticas ... Morelia"
// ========================================

const normalizar = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const textoBuscable = (vacante) =>
  normalizar(
    [
      vacante.titulo,
      vacante.nombre_empresa,
      vacante.descripcion,
      vacante.ubicacion,
      vacante.direccion_colonia,
      vacante.direccion_ciudad,
      vacante.direccion_estado,
      modalidades[vacante.modalidad],
      tipos[vacante.tipo],
    ].join(" ")
  );

const salarioReferencia = (vacante) => {
  const valores = [vacante.salario_max, vacante.salario_min]
    .map((v) => (v === null || v === "" ? NaN : Number(v)))
    .filter(Number.isFinite);

  return valores.length ? Math.max(...valores) : -1;
};

const ORDENES = {
  recientes: "Más recientes",
  salario: "Mejor salario",
  titulo: "Puesto (A-Z)",
};

const ubicacionCorta = (vacante) =>
  vacante.ubicacion ||
  [vacante.direccion_ciudad, vacante.direccion_estado]
    .filter(Boolean)
    .join(", ") ||
  "No especificada";

function BuscarVacantes({ onActualizar, onIr }) {
  const [vacantes, setVacantes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [modalidad, setModalidad] = useState("");
  const [tipo, setTipo] = useState("");
  const [orden, setOrden] = useState("recientes");
  const [ocultarPostuladas, setOcultarPostuladas] =
    useState(false);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [vacanteSeleccionada, setVacanteSeleccionada] =
    useState(null);

  // ========================================
  // ESTADOS DE POSTULACIONES
  // ========================================

  // { [id_vacante]: { id_postulacion, estado } }
  const [postuladas, setPostuladas] = useState({});
  const idsPostulados = Object.keys(postuladas).map(Number);
  const [cancelando, setCancelando] = useState(false);
  // Examen de conocimientos que se presenta antes de postularse
  const [examenAbierto, setExamenAbierto] = useState(false);
  const [enviandoPostulacion, setEnviandoPostulacion] = useState(false);
  const [confirmarCancelacion, setConfirmarCancelacion] = useState(false);

  const [mensajePostulacion, setMensajePostulacion] =
    useState("");

  const [errorPostulacion, setErrorPostulacion] =
    useState("");

  // ========================================
  // CONSULTAR VACANTES ACTIVAS
  // ========================================

  const consultarVacantes = async () => {
    try {
      setCargando(true);
      setError("");

      const sesion = sessionGet("estudiante");

      if (!sesion?.token) {
        throw new Error("Debes iniciar sesión como estudiante");
      }

      const respuesta = await fetch(
        `${API_URL}/api/estudiante/vacantes`,
        {
          headers: {
            Authorization: `Bearer ${sesion.token}`,
          },
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            "No se pudieron consultar las vacantes"
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

  // ========================================
  // CONSULTAR POSTULACIONES EXISTENTES
  // ========================================

  const consultarPostulaciones = async () => {
    try {
      const sesion = sessionGet("estudiante");

      if (!sesion?.token) return;

      const respuesta = await fetch(
        `${API_URL}/api/estudiante/postulaciones`,
        {
          headers: {
            Authorization: `Bearer ${sesion.token}`,
          },
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            "No se pudieron consultar las postulaciones"
        );
      }

      const postulaciones = Array.isArray(datos.postulaciones)
        ? datos.postulaciones
        : [];

      setPostuladas(
        Object.fromEntries(
          postulaciones.map((item) => [
            Number(item.id_vacante),
            {
              id_postulacion: item.id_postulacion,
              estado: item.estado,
              examen_calificacion: item.examen_calificacion,
              examen_aciertos: item.examen_aciertos,
              examen_total: item.examen_total,
            },
          ])
        )
      );
    } catch (err) {
      console.error(
        "Error al consultar postulaciones:",
        err
      );
      setErrorPostulacion(
        "No se pudo verificar si ya te postulaste."
      );
    }
  };

  useEffect(() => {
    // La consulta inicial actualiza el estado al terminar
    // eslint-disable-next-line react-hooks/set-state-in-effect
    consultarVacantes();
    consultarPostulaciones();
  }, []);


  // ========================================
  // BUSCADOR Y FILTROS
  // ========================================

  // Se cargan todas las vacantes activas una vez y se
  // filtran al momento, mientras el estudiante escribe.

  const vacantesFiltradas = useMemo(() => {
    const palabras = normalizar(busqueda)
      .split(/\s+/)
      .filter(Boolean);

    const resultado = vacantes.filter((vacante) => {
      if (modalidad && vacante.modalidad !== modalidad) {
        return false;
      }

      if (tipo && vacante.tipo !== tipo) return false;

      if (
        ocultarPostuladas &&
        postuladas[Number(vacante.id_vacante)]
      ) {
        return false;
      }

      if (!palabras.length) return true;

      const texto = textoBuscable(vacante);
      return palabras.every((palabra) =>
        texto.includes(palabra)
      );
    });

    if (orden === "salario") {
      return [...resultado].sort(
        (a, b) => salarioReferencia(b) - salarioReferencia(a)
      );
    }

    if (orden === "titulo") {
      return [...resultado].sort((a, b) =>
        String(a.titulo).localeCompare(String(b.titulo), "es")
      );
    }

    return resultado;
  }, [
    vacantes,
    busqueda,
    modalidad,
    tipo,
    orden,
    ocultarPostuladas,
    postuladas,
  ]);

  const hayFiltros =
    Boolean(busqueda.trim()) ||
    Boolean(modalidad) ||
    Boolean(tipo) ||
    ocultarPostuladas;

  const limpiarFiltros = () => {
    setBusqueda("");
    setModalidad("");
    setTipo("");
    setOcultarPostuladas(false);
  };

  // ========================================
  // ABRIR DETALLES
  // ========================================

  const abrirDetalles = (vacante) => {
    setVacanteSeleccionada(vacante);
    setConfirmarCancelacion(false);
    setMensajePostulacion("");
    setErrorPostulacion("");
  };

  const cerrarDetalles = () => {
    if (cancelando || examenAbierto || enviandoPostulacion) return;

    setVacanteSeleccionada(null);
    setMensajePostulacion("");
    setErrorPostulacion("");
  };

  // Cerrar el detalle con la tecla Escape
  useEffect(() => {
    if (!vacanteSeleccionada) return;
    const alTeclear = (evento) => {
      if (evento.key === "Escape") cerrarDetalles();
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  });

  // ========================================
  // ENVIAR POSTULACIÓN
  // ========================================

  // Si la empresa definió una prueba de conocimientos, primero
  // se muestra el aviso y la prueba (ver ExamenPostulacion);
  // al terminarla se registra la postulación.
  const postularme = async () => {
    if (!vacanteSeleccionada || enviandoPostulacion) return;

    const idVacante = Number(
      vacanteSeleccionada.id_vacante
    );

    if (idsPostulados.includes(idVacante)) {
      setErrorPostulacion(
        "Ya te postulaste a esta vacante."
      );
      return;
    }

    setMensajePostulacion("");
    setErrorPostulacion("");

    if (vacanteSeleccionada.tiene_examen) {
      setExamenAbierto(true);
      return;
    }

    // Sin prueba: postular directo
    try {
      setEnviandoPostulacion(true);
      alPostular(await enviarPostulacion(idVacante));
    } catch (err) {
      if (err.status === 409 && /presentar la prueba/.test(err.message)) {
        // La empresa agregó una prueba después de cargar la lista
        setExamenAbierto(true);
        return;
      }

      if (err.status === 409) consultarPostulaciones();
      setErrorPostulacion(err.message);
    } finally {
      setEnviandoPostulacion(false);
    }
  };

  const alPostular = (datos) => {
    const idVacante = Number(datos.postulacion?.id_vacante);

    setPostuladas((anteriores) => ({
      ...anteriores,
      [idVacante]: {
        id_postulacion: datos.postulacion?.id_postulacion,
        estado: datos.postulacion?.estado || "enviada",
        examen_calificacion: datos.examen?.calificacion ?? null,
        examen_aciertos: datos.examen?.aciertos ?? null,
        examen_total: datos.examen?.total ?? null,
      },
    }));

    setMensajePostulacion(
      datos.mensaje ||
        "Postulación enviada correctamente"
    );
    onActualizar?.();
  };

  const cerrarExamen = useCallback(() => setExamenAbierto(false), []);

  // ========================================
  // CANCELAR POSTULACIÓN
  // ========================================

  const cancelarPostulacion = async () => {
    if (!vacanteSeleccionada || cancelando) return;

    const idVacante = Number(vacanteSeleccionada.id_vacante);
    const postulacion = postuladas[idVacante];

    if (!postulacion?.id_postulacion) return;

    try {
      setCancelando(true);
      setMensajePostulacion("");
      setErrorPostulacion("");

      const sesion = sessionGet("estudiante");

      if (!sesion?.token) {
        throw new Error("Debes iniciar sesión como estudiante");
      }

      const respuesta = await fetch(
        `${API_URL}/api/estudiante/postulaciones/${postulacion.id_postulacion}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${sesion.token}`,
          },
        }
      );

      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje || "No se pudo cancelar la postulación"
        );
      }

      setPostuladas((anteriores) => {
        const copia = { ...anteriores };
        delete copia[idVacante];
        return copia;
      });

      setMensajePostulacion(
        datos.mensaje || "Postulación cancelada correctamente"
      );
      setConfirmarCancelacion(false);
      onActualizar?.();
    } catch (err) {
      setErrorPostulacion(err.message);
    } finally {
      setCancelando(false);
    }
  };

  // ========================================
  // INTERFAZ
  // ========================================

  const postulacionActual = vacanteSeleccionada
    ? postuladas[Number(vacanteSeleccionada.id_vacante)]
    : null;

  const yaPostulado = Boolean(postulacionActual);
  const estadoActual = postulacionActual
    ? ESTADOS_POSTULACION[postulacionActual.estado] || ESTADOS_POSTULACION.enviada
    : null;

  const puedeCancelar =
    yaPostulado &&
    ["enviada", "vista", "entrevista"].includes(
      postulacionActual.estado
    );

  const direccion = vacanteSeleccionada?.ubicacion?.trim();

  return (
    <div className="bt-vacantes">
      <div className="bt-vacantes-intro">
        <h2>Buscar vacantes</h2>

        <p>
          Encuentra empleos y prácticas profesionales
          publicados por las empresas de BolsaTec.
        </p>
      </div>

      <form
        className="bt-vacantes-filtros"
        onSubmit={(e) => e.preventDefault()}
        role="search"
      >
        <div className="bt-vacantes-busqueda">
          <Search size={19} />

          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Puesto, empresa, ciudad o palabra clave (ej. react morelia)"
            aria-label="Buscar vacantes"
          />

          {busqueda && (
            <button
              type="button"
              className="bt-vacantes-borrar"
              onClick={() => setBusqueda("")}
              aria-label="Borrar búsqueda"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <select
          value={modalidad}
          onChange={(e) => setModalidad(e.target.value)}
          aria-label="Filtrar por modalidad"
        >
          <option value="">Todas las modalidades</option>
          {Object.entries(modalidades).map(([valor, nombre]) => (
            <option key={valor} value={valor}>
              {nombre}
            </option>
          ))}
        </select>

        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          aria-label="Filtrar por tipo"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(tipos).map(([valor, nombre]) => (
            <option key={valor} value={valor}>
              {nombre}
            </option>
          ))}
        </select>

        <select
          value={orden}
          onChange={(e) => setOrden(e.target.value)}
          aria-label="Ordenar vacantes"
        >
          {Object.entries(ORDENES).map(([valor, nombre]) => (
            <option key={valor} value={valor}>
              Ordenar: {nombre}
            </option>
          ))}
        </select>

        <label className="bt-vacantes-check">
          <input
            type="checkbox"
            checked={ocultarPostuladas}
            onChange={(e) =>
              setOcultarPostuladas(e.target.checked)
            }
          />
          Ocultar las que ya me postulé
        </label>

        {hayFiltros && (
          <div className="bt-vacantes-botones">
            <button
              type="button"
              className="bt-vacantes-secundario"
              onClick={limpiarFiltros}
            >
              <X size={17} />
              Limpiar filtros
            </button>
          </div>
        )}
      </form>

      <div className="bt-vacantes-resultados">
        <h3>Vacantes disponibles</h3>

        <button
          type="button"
          onClick={() => {
            consultarVacantes();
            consultarPostulaciones();
          }}
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
        <div
          className="bt-vacantes-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {!cargando &&
        !error &&
        vacantesFiltradas.length === 0 && (
          <div className="bt-vacantes-mensaje">
            <BriefcaseBusiness size={32} />
            <h4>
              {vacantes.length === 0
                ? "Por ahora no hay vacantes publicadas"
                : "Ninguna vacante coincide con tu búsqueda"}
            </h4>

            <p>
              {vacantes.length === 0
                ? "Vuelve a consultar más adelante."
                : "Prueba con otras palabras o quita algunos filtros."}
            </p>

            {hayFiltros && (
              <button
                type="button"
                className="bt-vacante-detalles"
                onClick={limpiarFiltros}
              >
                Ver todas las vacantes
              </button>
            )}
          </div>
        )}

      {!cargando &&
        !error &&
        vacantesFiltradas.length > 0 && (
          <>
            <p className="bt-vacantes-contador" aria-live="polite">
              {hayFiltros
                ? `${vacantesFiltradas.length} de ${vacantes.length} vacantes coinciden`
                : `${vacantes.length} vacante(s) disponible(s)`}
            </p>

            <div className="bt-vacantes-grid">
              {vacantesFiltradas.map((vacante) => {
                const postulacion =
                  postuladas[Number(vacante.id_vacante)];
                const estado = postulacion
                  ? ESTADOS_POSTULACION[postulacion.estado] ||
                    ESTADOS_POSTULACION.enviada
                  : null;
                const IconoEstado = estado?.icono;

                return (
                  <article
                    className={`bt-vacante-card ${postulacion ? "postulada" : ""}`}
                    key={vacante.id_vacante}
                  >
                    <div className="bt-vacante-card-top">
                      <div className="bt-vacante-icono">
                        <Building2 size={24} />
                      </div>

                      {estado ? (
                        <span className={`bt-postulacion-estado ${estado.clase}`}>
                          <IconoEstado size={14} />
                          {estado.nombre}
                        </span>
                      ) : (
                        esReciente(vacante.fecha_publicacion) && (
                          <span className="bt-vacante-nueva">Nueva</span>
                        )
                      )}
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
                        {tipos[vacante.tipo] ||
                          vacante.tipo}
                      </span>
                    </div>

                    <p className="bt-vacante-dato">
                      <MapPin size={16} />
                      {ubicacionCorta(vacante)}
                    </p>

                    <p className="bt-vacante-salario">
                      {mostrarSalario(vacante)}
                    </p>

                    <p className="bt-vacante-fecha">
                      <CalendarDays size={14} />
                      Publicada {tiempoRelativo(vacante.fecha_publicacion)}
                    </p>

                    <button
                      type="button"
                      className={`bt-vacante-detalles ${postulacion ? "secundario" : ""}`}
                      onClick={() =>
                        abrirDetalles(vacante)
                      }
                    >
                      {postulacion ? "Ver mi postulación" : "Ver detalles y postularme"}
                    </button>
                  </article>
                );
              })}
            </div>
          </>
        )}

      {vacanteSeleccionada && (
        <div
          className="bt-vacante-modal-fondo"
          onClick={cerrarDetalles}
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
              onClick={cerrarDetalles}
              disabled={cancelando || enviandoPostulacion}
              aria-label="Cerrar detalles"
            >
              <X size={21} />
            </button>

            <h2>{vacanteSeleccionada.titulo}</h2>

            <p className="bt-vacante-empresa">
              <Building2 size={17} />
              {vacanteSeleccionada.nombre_empresa}
            </p>

            <div className="bt-vacante-modal-cuerpo">
            <div className="bt-vacante-modal-info">
            <div className="bt-vacante-etiquetas">
              <span>
                {modalidades[
                  vacanteSeleccionada.modalidad
                ] ||
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
                Publicada {tiempoRelativo(vacanteSeleccionada.fecha_publicacion)}{" "}
                ({fechaCorta(vacanteSeleccionada.fecha_publicacion)})
              </p>
            )}
            </div>

            <MapaUbicacion
              direccion={direccion}
              latitud={vacanteSeleccionada.latitud}
              longitud={vacanteSeleccionada.longitud}
              campos={{
                direccion_calle: vacanteSeleccionada.direccion_calle,
                direccion_numero: vacanteSeleccionada.direccion_numero,
                direccion_colonia: vacanteSeleccionada.direccion_colonia,
                direccion_cp: vacanteSeleccionada.direccion_cp,
                direccion_ciudad: vacanteSeleccionada.direccion_ciudad,
                direccion_estado: vacanteSeleccionada.direccion_estado,
              }}
            />
            </div>

            <h3>Descripción de la vacante</h3>

            <p className="bt-vacante-descripcion">
              {vacanteSeleccionada.descripcion ||
                "Sin descripción"}
            </p>

            {mensajePostulacion && (
              <div
                className="bt-postulacion-exito"
                role="status"
              >
                <CheckCircle2 size={19} />
                <span>{mensajePostulacion}</span>
                {onIr && yaPostulado && (
                  <button
                    type="button"
                    className="bt-postulacion-exito-ir"
                    onClick={() => {
                      setVacanteSeleccionada(null);
                      onIr("postulaciones");
                    }}
                  >
                    Ver mis postulaciones
                  </button>
                )}
              </div>
            )}

            {errorPostulacion && (
              <div
                className="bt-vacantes-error"
                role="alert"
              >
                {errorPostulacion}
              </div>
            )}

            {yaPostulado ? (
              <div className="bt-vacante-acciones-postulado">
                {estadoActual && (
                  <div className="bt-vacante-estado-detalle">
                    <span className={`bt-postulacion-estado ${estadoActual.clase}`}>
                      <estadoActual.icono size={15} />
                      {estadoActual.nombre}
                    </span>
                    <ChipExamen
                      calificacion={postulacionActual.examen_calificacion}
                      aciertos={postulacionActual.examen_aciertos}
                      total={postulacionActual.examen_total}
                    />
                    <p>{estadoActual.ayuda}</p>
                  </div>
                )}

                {puedeCancelar ? (
                  confirmarCancelacion ? (
                    <div className="bt-vacante-confirmar" role="alertdialog" aria-label="Confirmar cancelación">
                      <span>¿Seguro? La empresa ya no verá tu solicitud.</span>
                      <div>
                        <button type="button" className="bt-vacante-btn" onClick={() => setConfirmarCancelacion(false)} disabled={cancelando}>
                          No, conservar
                        </button>
                        <button type="button" className="bt-vacante-btn peligro" onClick={cancelarPostulacion} disabled={cancelando}>
                          {cancelando ? "Cancelando..." : "Sí, cancelar"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="bt-vacante-cancelar"
                      onClick={() => setConfirmarCancelacion(true)}
                    >
                      <XCircle size={18} />
                      Cancelar postulación
                    </button>
                  )
                ) : (
                  <p className="bt-vacante-nota">
                    La empresa ya respondió a tu postulación,
                    por lo que no se puede cancelar.
                  </p>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="bt-vacante-detalles"
                onClick={postularme}
                disabled={enviandoPostulacion}
              >
                {enviandoPostulacion ? (
                  "Enviando postulación..."
                ) : (
                  <>
                    <Send size={18} />
                    Postularme
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {examenAbierto && vacanteSeleccionada && (
        <ExamenPostulacion
          vacante={vacanteSeleccionada}
          onCerrar={cerrarExamen}
          onPostulado={alPostular}
        />
      )}
    </div>
  );
}

export default BuscarVacantes;
