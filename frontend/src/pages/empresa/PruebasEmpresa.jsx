import { useCallback, useEffect, useState } from "react";
import {
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

function PruebasEmpresa() {
  const [carreras, setCarreras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [editando, setEditando] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setError("");
      const datos = await solicitar("empresa", "/pruebas");
      setCarreras(datos.carreras || []);
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
        if (activo) setCarreras(datos.carreras || []);
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

  return (
    <div className="bt-pruebas">
      <div className="bt-pruebas-encabezado">
        <div>
          <h2>Pruebas de conocimientos</h2>
          <p>
            Escribe una prueba general por carrera, de acuerdo con el giro de tu
            empresa. Antes de postularse a cualquiera de tus vacantes, el
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
        <p className="bt-pruebas-resumen">
          {conPrueba
            ? `Tienes prueba para ${conPrueba} de ${carreras.length} opciones.`
            : "Aún no tienes pruebas. Si no creas ninguna, los estudiantes se postulan sin prueba."}
        </p>
      )}

      {cargando ? (
        <p className="bt-pruebas-resumen">Cargando pruebas...</p>
      ) : (
        <div className="bt-pruebas-grid">
          {carreras.map((carrera) => {
            const tiene = carrera.total_preguntas > 0;
            const general = carrera.clave === "general";

            return (
              <article
                key={carrera.clave}
                className={`bt-pruebas-card ${tiene ? "con-prueba" : ""} ${general ? "general" : ""}`}
              >
                <div className="bt-pruebas-icono">
                  {general ? <ClipboardList size={22} /> : <GraduationCap size={22} />}
                </div>

                <div className="bt-pruebas-info">
                  <h3>{carrera.nombre}</h3>
                  <p>
                    {tiene
                      ? `${carrera.total_preguntas} ${carrera.total_preguntas === 1 ? "pregunta" : "preguntas"}`
                      : "Sin prueba"}
                  </p>
                  {general && (
                    <small>
                      Para estudiantes cuya carrera no tiene prueba propia.
                    </small>
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
          })}
        </div>
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
