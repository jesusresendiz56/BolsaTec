import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  LoaderCircle,
  Send,
  X,
} from "lucide-react";

import { enviarPostulacion, solicitar } from "../services/examen";
import "./ExamenPostulacion.css";

// ========================================
// PRUEBA DE CONOCIMIENTOS ANTES DE POSTULARSE
// 1. Aviso: ¿desea continuar?
// 2. Prueba con las preguntas que definió la empresa
// 3. Al enviarla se registra la postulación y el
//    resultado se manda a la empresa.
// ========================================

function ExamenPostulacion({ vacante, onCerrar, onPostulado }) {
  const [paso, setPaso] = useState("aviso"); // aviso | prueba | listo
  const [examen, setExamen] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);
  const dialogo = useRef(null);

  const idVacante = Number(vacante?.id_vacante);

  useEffect(() => {
    dialogo.current?.focus();
  }, [paso]);

  // Cerrar con Escape (sin cerrar también el detalle de la vacante)
  useEffect(() => {
    const alTeclear = (evento) => {
      if (evento.key === "Escape" && !enviando) {
        evento.stopPropagation();
        onCerrar();
      }
    };

    document.addEventListener("keydown", alTeclear, true);
    return () => document.removeEventListener("keydown", alTeclear, true);
  }, [enviando, onCerrar]);

  const postular = async (conRespuestas) => {
    try {
      setEnviando(true);
      setError("");

      const datos = await enviarPostulacion(
        idVacante,
        conRespuestas ? respuestas : undefined
      );

      setResultado(datos.examen || null);
      setPaso("listo");
      onPostulado?.(datos);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  // El estudiante aceptó el aviso: abrir la prueba
  const continuar = async () => {
    try {
      setCargando(true);
      setError("");

      const datos = await solicitar(
        "estudiante",
        `/vacantes/${idVacante}/examen`
      );

      if (!datos.examen) {
        // La empresa no tiene prueba: postular directo
        await postular(false);
        return;
      }

      setExamen(datos.examen);
      setPaso("prueba");
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const preguntas = examen?.preguntas || [];
  const respondidas = preguntas.filter(
    (p) => respuestas[p.id] !== undefined
  ).length;
  const completo = preguntas.length > 0 && respondidas === preguntas.length;

  return (
    <div className="bt-examen-fondo">
      <div
        ref={dialogo}
        tabIndex={-1}
        className={`bt-examen ${paso === "aviso" ? "aviso" : ""}`}
        role={paso === "aviso" ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby="bt-examen-titulo"
        aria-describedby={paso === "aviso" ? "bt-examen-aviso" : undefined}
      >
        <div className="bt-examen-header">
          <div>
            <span className="bt-examen-etiqueta">
              <ClipboardCheck size={15} />
              Prueba de conocimientos
            </span>
            <h3 id="bt-examen-titulo">{vacante?.titulo}</h3>
            {vacante?.nombre_empresa && (
              <p className="bt-examen-empresa">{vacante.nombre_empresa}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onCerrar}
            disabled={enviando}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* 1. AVISO */}
        {paso === "aviso" && (
          <>
            <p id="bt-examen-aviso" className="bt-examen-aviso-texto">
              Se hará una pequeña prueba de conocimientos generales de la
              carrera para ver si eres apto para la postulación.
              <strong> ¿Deseas continuar?</strong>
            </p>

            <ul className="bt-examen-aviso-lista">
              <li>Solo puedes presentarla una vez por vacante.</li>
              <li>Al terminar se enviará tu postulación junto con tu resultado a la empresa.</li>
            </ul>

            {error && (
              <p className="bt-examen-error" role="alert">
                {error}
              </p>
            )}

            <div className="bt-examen-acciones">
              <button
                type="button"
                className="bt-examen-btn"
                onClick={onCerrar}
                disabled={cargando || enviando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="bt-examen-btn primario"
                onClick={continuar}
                disabled={cargando || enviando}
              >
                {cargando || enviando ? (
                  <>
                    <LoaderCircle size={17} className="bt-examen-girando" />
                    Cargando...
                  </>
                ) : (
                  "Continuar"
                )}
              </button>
            </div>
          </>
        )}

        {/* 2. PRUEBA */}
        {paso === "prueba" && examen && (
          <>
            {examen.completado ? (
              <p className="bt-examen-instrucciones">
                Ya presentaste la prueba de esta vacante y obtuviste{" "}
                <strong>
                  {examen.resultado.aciertos} de {examen.resultado.total} (
                  {Math.round(examen.resultado.calificacion)}%)
                </strong>
                . Se enviará ese resultado con tu postulación.
              </p>
            ) : (
              <>
                <p className="bt-examen-instrucciones">
                  {examen.carrera_nombre && (
                    <>
                      Prueba de <strong>{examen.carrera_nombre}</strong>.{" "}
                    </>
                  )}
                  Responde las {preguntas.length}{" "}
                  {preguntas.length === 1 ? "pregunta" : "preguntas"} para
                  enviar tu postulación.
                </p>

                <ol className="bt-examen-preguntas">
                  {preguntas.map((pregunta, indice) => (
                    <li key={pregunta.id}>
                      <fieldset>
                        <legend>
                          <span>{indice + 1}.</span> {pregunta.texto}
                        </legend>

                        {pregunta.opciones.map((opcion, i) => (
                          <label
                            key={i}
                            className={
                              respuestas[pregunta.id] === i ? "elegida" : ""
                            }
                          >
                            <input
                              type="radio"
                              name={`pregunta-${pregunta.id}`}
                              checked={respuestas[pregunta.id] === i}
                              onChange={() =>
                                setRespuestas((anteriores) => ({
                                  ...anteriores,
                                  [pregunta.id]: i,
                                }))
                              }
                              disabled={enviando}
                            />
                            <span>{opcion}</span>
                          </label>
                        ))}
                      </fieldset>
                    </li>
                  ))}
                </ol>
              </>
            )}

            {error && (
              <p className="bt-examen-error" role="alert">
                {error}
              </p>
            )}

            <div className="bt-examen-acciones">
              {!examen.completado && (
                <span className="bt-examen-progreso">
                  {respondidas} de {preguntas.length} respondidas
                </span>
              )}

              <button
                type="button"
                className="bt-examen-btn"
                onClick={onCerrar}
                disabled={enviando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="bt-examen-btn primario"
                onClick={() => postular(!examen.completado)}
                disabled={enviando || (!examen.completado && !completo)}
              >
                {enviando ? (
                  "Enviando..."
                ) : (
                  <>
                    <Send size={17} />
                    {examen.completado
                      ? "Enviar postulación"
                      : "Terminar y postularme"}
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* 3. LISTO */}
        {paso === "listo" && (
          <div className="bt-examen-resultado" role="status">
            {resultado && (
              <div className="bt-examen-calificacion">
                <strong>{Math.round(resultado.calificacion)}%</strong>
                <span>
                  {resultado.aciertos} de {resultado.total} correctas
                </span>
              </div>
            )}

            <h4>
              <CheckCircle2 size={20} />
              Postulación enviada
            </h4>
            <p>
              {resultado
                ? "Tu resultado se envió a la empresa junto con tu postulación."
                : "La empresa ya puede ver tu postulación."}{" "}
              Puedes darle seguimiento en "Mis postulaciones".
            </p>

            <div className="bt-examen-acciones centrado">
              <button
                type="button"
                className="bt-examen-btn primario"
                onClick={onCerrar}
              >
                Listo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExamenPostulacion;
