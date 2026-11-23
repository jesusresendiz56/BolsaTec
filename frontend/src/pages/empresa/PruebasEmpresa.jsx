import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  ClipboardList,
  Pencil,
  Plus,
  RefreshCw,
} from "lucide-react";

import EditorExamen from "../../components/EditorExamen";
import { solicitar } from "../../services/examen";
import "./PruebasEmpresa.css";

// ========================================
// PRUEBA DE CONOCIMIENTOS DEL SECTOR (EMPRESA)
// La empresa escribe una sola prueba, la del sector (giro)
// de su perfil. Todos los estudiantes la presentan antes de
// postularse a cualquier vacante de la empresa.
// ========================================

function PruebasEmpresa({ onIr }) {
  const [prueba, setPrueba] = useState(null);
  // Sector de la empresa (solo si es uno de la lista)
  const [giro, setGiro] = useState(null);
  const [sector, setSector] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [editando, setEditando] = useState(false);

  const aplicar = (datos) => {
    setPrueba(datos.prueba || null);
    setGiro(datos.giro || null);
    setSector(datos.sector || null);
  };

  const cargar = useCallback(async () => {
    try {
      setError("");
      aplicar(await solicitar("empresa", "/pruebas"));
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
        if (activo) aplicar(datos);
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

  const cerrarEditor = useCallback(() => setEditando(false), []);

  const total = prueba?.total_preguntas || 0;
  const tiene = total > 0;
  // Sin sector de la lista solo se puede quitar una prueba existente
  const puedeEditar = Boolean(giro) || tiene;

  return (
    <div className="bt-pruebas">
      <div className="bt-pruebas-encabezado">
        <div>
          <h2>Prueba de conocimientos</h2>
          <p>
            Escribe una prueba del sector de tu empresa. Antes de postularse a
            cualquiera de tus vacantes, el estudiante la presenta y tú recibes
            su resultado.
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

      {!cargando && !error && !giro && (
        <div className="bt-pruebas-sector aviso">
          <Building2 size={18} />
          <span>
            {sector
              ? `El sector "${sector}" no es de la lista. `
              : "Tu empresa aún no tiene sector. "}
            Elige el sector de tu empresa en el perfil para poder crear la
            prueba.
          </span>
          {onIr && (
            <button type="button" onClick={() => onIr("perfil")}>
              Ir a mi perfil
            </button>
          )}
        </div>
      )}

      {cargando ? (
        <p className="bt-pruebas-resumen">Cargando prueba...</p>
      ) : (
        !error && (
          <div className="bt-pruebas-grid">
            <article className={`bt-pruebas-card ${tiene ? "con-prueba" : ""}`}>
              <div className="bt-pruebas-icono">
                <ClipboardList size={22} />
              </div>

              <div className="bt-pruebas-info">
                <h3>{giro || "Sector sin elegir"}</h3>
                <p>
                  {tiene
                    ? `${total} ${total === 1 ? "pregunta" : "preguntas"}`
                    : "Sin prueba"}
                </p>
                <small>
                  {tiene
                    ? "La presentan todos los estudiantes que se postulan a tus vacantes."
                    : "Si no creas la prueba, los estudiantes se postulan sin ella."}
                </small>
              </div>

              <button
                type="button"
                className={tiene ? "bt-pruebas-btn" : "bt-pruebas-btn primario"}
                onClick={() => setEditando(true)}
                disabled={!puedeEditar}
                aria-label={`${tiene ? "Editar" : "Crear"} prueba del sector`}
              >
                {tiene ? <Pencil size={16} /> : <Plus size={16} />}
                {tiene ? "Editar prueba" : "Crear prueba"}
              </button>
            </article>
          </div>
        )
      )}

      {editando && prueba && (
        <EditorExamen
          carrera={{ ...prueba, nombre: giro || prueba.nombre }}
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
