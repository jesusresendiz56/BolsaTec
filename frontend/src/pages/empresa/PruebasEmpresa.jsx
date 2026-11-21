import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  GraduationCap,
  Pencil,
  Plus,
  RefreshCw,
} from "lucide-react";

import EditorExamen from "../../components/EditorExamen";
import { solicitar } from "../../services/examen";
import "./PruebasEmpresa.css";

// ========================================
// PRUEBAS DE CONOCIMIENTOS POR CARRERA (EMPRESA)
// La empresa escribe una prueba general por carrera.
// El estudiante presenta la de su carrera antes de
// postularse a cualquier vacante de la empresa.
// ========================================

function PruebasEmpresa({ onIr }) {
  const [carreras, setCarreras] = useState([]);
  // Sector de la empresa (de la lista) y si se muestran las demás carreras
  const [giro, setGiro] = useState(null);
  const [verOtras, setVerOtras] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [editando, setEditando] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setError("");
      const datos = await solicitar("empresa", "/pruebas");
      setCarreras(datos.carreras || []);
      setGiro(datos.giro || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let activo = true;

    solicitar("empresa", "/pruebas")
      .then((datos) => {
        if (!activo) return;
        setCarreras(datos.carreras || []);
        setGiro(datos.giro || null);
      })
      .catch((err) => {
        if (activo) setError(err.message);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  const cerrarEditor = useCallback(() => setEditando(null), []);

  const conPrueba = carreras.filter((c) => c.total_preguntas > 0).length;

  // Con sector: primero las carreras del sector (y las que ya tienen
  // prueba), la general al final; las demás se ocultan.
  const general = carreras.find((c) => c.clave === "general");
  const delSector = carreras
    .filter((c) => c.clave !== "general" && (c.recomendada || c.total_preguntas > 0))
    .sort((a, b) => (b.recomendada - a.recomendada) || (a.afinidad - b.afinidad));
  const otras = carreras.filter(
    (c) => c.clave !== "general" && !c.recomendada && !c.total_preguntas
  );

  const principales = giro
    ? [...delSector, ...(general ? [general] : [])]
    : carreras;

  const tarjeta = (carrera) => {
    const tiene = carrera.total_preguntas > 0;
    const esGeneral = carrera.clave === "general";

    return (
      <article
        key={carrera.clave}
        className={`bt-pruebas-card ${tiene ? "con-prueba" : ""} ${esGeneral ? "general" : ""}`}
      >
        <div className="bt-pruebas-icono">
          {esGeneral ? <ClipboardList size={22} /> : <GraduationCap size={22} />}
        </div>

        <div className="bt-pruebas-info">
          <h3>{carrera.nombre}</h3>
          <p>
            {tiene
              ? `${carrera.total_preguntas} ${carrera.total_preguntas === 1 ? "pregunta" : "preguntas"}`
              : "Sin prueba"}
          </p>
          {esGeneral && (
            <small>Para estudiantes de carreras que no tienen prueba propia.</small>
          )}
          {giro && !esGeneral && !carrera.recomendada && (
            <small>No es del sector de tu empresa.</small>
          )}
        </div>

        <button
          type="button"
          className={tiene ? "bt-pruebas-btn" : "bt-pruebas-btn primario"}
          onClick={() => setEditando(carrera)}
          aria-label={`${tiene ? "Editar" : "Crear"} prueba de ${carrera.nombre}`}
        >
          {tiene ? <Pencil size={16} /> : <Plus size={16} />}
          {tiene ? "Editar prueba" : "Crear prueba"}
        </button>
      </article>
    );
  };

  return (
    <div className="bt-pruebas">
      <div className="bt-pruebas-encabezado">
        <div>
          <h2>Pruebas de conocimientos</h2>
          <p>
            Escribe una prueba general por carrera, relacionada con el sector
            de tu empresa. Antes de postularse a cualquiera de tus vacantes, el
            estudiante presenta la prueba de su carrera y tú recibes su
            resultado.
          </p>
        </div>

        <button
          type="button"
          className="bt-pruebas-btn"
          onClick={() => {
            setCargando(true);
            cargar();
          }}
          disabled={cargando}
        >
          <RefreshCw size={17} />
          Actualizar
        </button>
      </div>

      {mensaje && (
        <div className="bt-pruebas-mensaje exito" role="status">
          {mensaje}
        </div>
      )}

      {error && (
        <div className="bt-pruebas-mensaje error" role="alert">
          {error}
        </div>
      )}

      {!cargando && !error && (
        giro ? (
          <div className="bt-pruebas-sector">
            <Building2 size={18} />
            <span>
              Sector de tu empresa: <strong>{giro}</strong>. Estas son las
              carreras relacionadas.
            </span>
          </div>
        ) : (
          <div className="bt-pruebas-sector aviso">
            <Building2 size={18} />
            <span>
              Elige el sector de tu empresa en el perfil para ver solo las
              carreras relacionadas con él.
            </span>
            {onIr && (
              <button type="button" onClick={() => onIr("perfil")}>
                Ir a mi perfil
              </button>
            )}
          </div>
        )
      )}

      {!cargando && !error && (
        <p className="bt-pruebas-resumen">
          {conPrueba
            ? `Tienes ${conPrueba} ${conPrueba === 1 ? "prueba" : "pruebas"}.`
            : "Aún no tienes pruebas. Si no creas ninguna, los estudiantes se postulan sin prueba."}
        </p>
      )}

      {cargando ? (
        <p className="bt-pruebas-resumen">Cargando pruebas...</p>
      ) : (
        <>
          <div className="bt-pruebas-grid">{principales.map(tarjeta)}</div>

          {giro && otras.length > 0 && (
            <>
              <button
                type="button"
                className="bt-pruebas-ver-otras"
                onClick={() => setVerOtras((valor) => !valor)}
                aria-expanded={verOtras}
              >
                {verOtras ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                {verOtras
                  ? "Ocultar otras carreras"
                  : `Ver otras carreras (${otras.length})`}
              </button>

              {verOtras && (
                <div className="bt-pruebas-grid">{otras.map(tarjeta)}</div>
              )}
            </>
          )}
        </>
      )}

      {editando && (
        <EditorExamen
          carrera={editando}
          onCerrar={cerrarEditor}
          onGuardado={(texto) => {
            setMensaje(texto);
            cargar();
          }}
        />
      )}
    </div>
  );
}

export default PruebasEmpresa;
