import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import { solicitar } from "../services/examen";
import "./ExamenPostulacion.css";

// ========================================
// EDITOR DE LA PRUEBA DE CONOCIMIENTOS (EMPRESA)
// Una prueba general por carrera. Por cada pregunta: la
// respuesta correcta y de 1 a 3 incorrectas. Al estudiante
// se le muestran revueltas.
// ========================================

const preguntaVacia = () => ({
  clave: crypto.randomUUID?.() || String(Math.random()),
  pregunta: "",
  correcta: "",
  incorrectas: ["", ""],
});

function EditorExamen({ carrera, onCerrar, onGuardado }) {
  const [preguntas, setPreguntas] = useState([]);
  const [maxPreguntas, setMaxPreguntas] = useState(10);
  const [maxIncorrectas, setMaxIncorrectas] = useState(3);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const dialogo = useRef(null);

  const clave = carrera?.clave;
  const esGeneral = clave === "general";

  useEffect(() => {
    let activo = true;

    solicitar("empresa", `/pruebas/${clave}`)
      .then((datos) => {
        if (!activo) return;

        setMaxPreguntas(datos.max_preguntas || 10);
        setMaxIncorrectas(datos.max_incorrectas || 3);
        setPreguntas(
          datos.preguntas.length
            ? datos.preguntas.map((p) => ({
              clave: String(p.id_pregunta),
              pregunta: p.pregunta,
              correcta: p.correcta,
              incorrectas: p.incorrectas,
            }))
            : [preguntaVacia()]
        );
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
  }, [clave]);

  useEffect(() => {
    dialogo.current?.focus();
  }, []);

  useEffect(() => {
    const alTeclear = (evento) => {
      if (evento.key === "Escape" && !guardando) onCerrar();
    };

    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [guardando, onCerrar]);

  const actualizar = (indice, cambios) =>
    setPreguntas((anteriores) =>
      anteriores.map((p, i) => (i === indice ? { ...p, ...cambios } : p))
    );

  const actualizarIncorrecta = (indice, posicion, valor) =>
    setPreguntas((anteriores) =>
      anteriores.map((p, i) =>
        i === indice
          ? {
            ...p,
            incorrectas: p.incorrectas.map((o, j) =>
              j === posicion ? valor : o
            ),
          }
          : p
      )
    );

  const guardar = async (lista) => {
    try {
      setGuardando(true);
      setError("");

      const datos = await solicitar("empresa", `/pruebas/${clave}`, {
        method: "PUT",
        body: JSON.stringify({
          preguntas: lista.map(({ pregunta, correcta, incorrectas }) => ({
            pregunta,
            correcta,
            incorrectas: incorrectas.filter((o) => o.trim()),
          })),
        }),
      });

      onGuardado?.(datos.mensaje, datos.preguntas.length);
      onCerrar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const enviar = (evento) => {
    evento.preventDefault();
    guardar(preguntas);
  };

  const quitarExamen = () => {
    if (
      window.confirm(
        esGeneral
          ? "¿Quitar la prueba general? Los estudiantes de otras carreras podrán postularse sin presentarla."
          : "¿Quitar la prueba de esta carrera? Sus estudiantes presentarán la prueba general (si la tienes) o se postularán sin prueba."
      )
    ) {
      guardar([]);
    }
  };

  return (
    <div className="bt-examen-fondo">
      <form
        ref={dialogo}
        tabIndex={-1}
        className="bt-examen bt-editor-examen"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bt-editor-examen-titulo"
        onSubmit={enviar}
      >
        <div className="bt-examen-header">
          <div>
            <span className="bt-examen-etiqueta">
              <ClipboardList size={15} />
              Prueba de conocimientos
            </span>
            <h3 id="bt-editor-examen-titulo">{carrera?.nombre}</h3>
            <p className="bt-examen-empresa">
              {esGeneral
                ? "La presentan los estudiantes de carreras que no tienen prueba propia."
                : "La presentan los estudiantes de esta carrera antes de postularse a cualquiera de tus vacantes."}{" "}
              Haz preguntas generales de la carrera relacionadas con el giro de
              tu empresa. Las respuestas se muestran en orden aleatorio.
            </p>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {cargando ? (
          <p className="bt-examen-cargando">
            <LoaderCircle size={20} className="bt-examen-girando" />
            Cargando preguntas...
          </p>
        ) : (
          <ol className="bt-editor-preguntas">
            {preguntas.map((p, indice) => (
              <li key={p.clave}>
                <div className="bt-editor-pregunta-top">
                  <label htmlFor={`pregunta-${p.clave}`}>
                    Pregunta {indice + 1}
                  </label>

                  <button
                    type="button"
                    className="bt-editor-icono"
                    onClick={() =>
                      setPreguntas((anteriores) =>
                        anteriores.filter((_, i) => i !== indice)
                      )
                    }
                    disabled={guardando}
                    aria-label={`Eliminar pregunta ${indice + 1}`}
                    title="Eliminar pregunta"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <textarea
                  id={`pregunta-${p.clave}`}
                  value={p.pregunta}
                  onChange={(e) => actualizar(indice, { pregunta: e.target.value })}
                  placeholder="Escribe la pregunta"
                  maxLength={300}
                  rows={2}
                  required
                  disabled={guardando}
                />

                <div className="bt-editor-opcion correcta">
                  <CheckCircle2 size={18} aria-hidden="true" />
                  <input
                    value={p.correcta}
                    onChange={(e) => actualizar(indice, { correcta: e.target.value })}
                    placeholder="Respuesta correcta"
                    aria-label={`Respuesta correcta de la pregunta ${indice + 1}`}
                    maxLength={200}
                    required
                    disabled={guardando}
                  />
                </div>

                {p.incorrectas.map((opcion, j) => (
                  <div className="bt-editor-opcion incorrecta" key={j}>
                    <XCircle size={18} aria-hidden="true" />
                    <input
                      value={opcion}
                      onChange={(e) => actualizarIncorrecta(indice, j, e.target.value)}
                      placeholder={`Respuesta incorrecta ${j + 1}`}
                      aria-label={`Respuesta incorrecta ${j + 1} de la pregunta ${indice + 1}`}
                      maxLength={200}
                      required={j === 0}
                      disabled={guardando}
                    />
                    {p.incorrectas.length > 1 && (
                      <button
                        type="button"
                        className="bt-editor-icono"
                        onClick={() =>
                          actualizar(indice, {
                            incorrectas: p.incorrectas.filter((_, k) => k !== j),
                          })
                        }
                        disabled={guardando}
                        aria-label={`Quitar respuesta incorrecta ${j + 1}`}
                        title="Quitar respuesta"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                ))}

                {p.incorrectas.length < maxIncorrectas && (
                  <button
                    type="button"
                    className="bt-editor-agregar-opcion"
                    onClick={() =>
                      actualizar(indice, { incorrectas: [...p.incorrectas, ""] })
                    }
                    disabled={guardando}
                  >
                    <Plus size={15} />
                    Agregar respuesta incorrecta
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}

        {!cargando && preguntas.length < maxPreguntas && (
          <button
            type="button"
            className="bt-examen-btn bt-editor-agregar"
            onClick={() => setPreguntas((anteriores) => [...anteriores, preguntaVacia()])}
            disabled={guardando}
          >
            <Plus size={17} />
            Agregar pregunta
          </button>
        )}

        {!cargando && !preguntas.length && (
          <p className="bt-examen-instrucciones">
            Sin preguntas, esta carrera no tendrá prueba.
          </p>
        )}

        {error && (
          <p className="bt-examen-error" role="alert">
            {error}
          </p>
        )}

        <div className="bt-examen-acciones">
          {Number(carrera?.total_preguntas) > 0 && (
            <button
              type="button"
              className="bt-examen-btn peligro"
              onClick={quitarExamen}
              disabled={guardando || cargando}
            >
              Quitar prueba
            </button>
          )}

          <button
            type="button"
            className="bt-examen-btn"
            onClick={onCerrar}
            disabled={guardando}
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="bt-examen-btn primario"
            disabled={guardando || cargando}
          >
            <Save size={17} />
            {guardando ? "Guardando..." : "Guardar prueba"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditorExamen;
