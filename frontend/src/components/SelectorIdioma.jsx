import { useEffect, useRef, useState } from "react";
import { Check, Languages, LoaderCircle } from "lucide-react";

import { IDIOMAS, idiomaGet, idiomaSet } from "../services/traduccion";
import "./PersonalizarTema.css";

// ========================================
// SELECTOR DE IDIOMA
// Botón que abre un menú para traducir todo el sistema.
// ========================================

function SelectorIdioma() {
  const [abierto, setAbierto] = useState(false);
  const [idioma, setIdioma] = useState(idiomaGet);
  const [cambiando, setCambiando] = useState(false);
  const [error, setError] = useState("");
  const contenedor = useRef(null);
  const boton = useRef(null);

  useEffect(() => {
    const actualizar = () => setIdioma(idiomaGet());
    window.addEventListener("bolsatec-idioma-change", actualizar);
    return () =>
      window.removeEventListener("bolsatec-idioma-change", actualizar);
  }, []);

  // Cerrar al hacer clic fuera o con Escape
  useEffect(() => {
    if (!abierto) return;

    const alClic = (evento) => {
      if (!contenedor.current?.contains(evento.target)) setAbierto(false);
    };

    const alTeclear = (evento) => {
      if (evento.key === "Escape") {
        setAbierto(false);
        boton.current?.focus();
      }
    };

    document.addEventListener("pointerdown", alClic);
    document.addEventListener("keydown", alTeclear);

    return () => {
      document.removeEventListener("pointerdown", alClic);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  const elegir = async (codigo) => {
    if (codigo === idioma || cambiando) return;

    setCambiando(true);
    setError("");

    try {
      await idiomaSet(codigo);
      setIdioma(codigo);
      setAbierto(false);
    } catch (err) {
      console.error("Error al traducir:", err);
      setError(
        "No se pudo cargar el traductor. Revisa tu conexión o desactiva el bloqueador de anuncios."
      );
    } finally {
      setCambiando(false);
    }
  };

  const actual = IDIOMAS.find((i) => i.codigo === idioma) || IDIOMAS[0];

  return (
    <div className="bt-personalizar notranslate" ref={contenedor} translate="no">
      <button
        ref={boton}
        type="button"
        className="bt-personalizar-boton bt-idioma-boton"
        onClick={() => setAbierto((valor) => !valor)}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-label={`Idioma: ${actual.nombre}. Cambiar idioma`}
        title="Idioma / Language"
      >
        {cambiando ? (
          <LoaderCircle size={20} className="bt-idioma-girando" />
        ) : (
          <Languages size={20} />
        )}
        <span className="bt-idioma-codigo">{actual.corto}</span>
      </button>

      {abierto && (
        <div
          className="bt-personalizar-menu bt-idioma-menu"
          role="dialog"
          aria-label="Idioma / Language"
        >
          <p className="bt-personalizar-titulo" id="bt-idioma-titulo">
            Idioma · Language
          </p>

          <div
            className="bt-personalizar-fuentes bt-idioma-lista"
            role="radiogroup"
            aria-labelledby="bt-idioma-titulo"
          >
            {IDIOMAS.map((opcion) => (
              <button
                key={opcion.codigo}
                type="button"
                role="radio"
                lang={opcion.codigo}
                aria-checked={idioma === opcion.codigo}
                className={`bt-personalizar-fuente ${
                  idioma === opcion.codigo ? "activo" : ""
                }`}
                disabled={cambiando}
                onClick={() => elegir(opcion.codigo)}
              >
                <span>{opcion.nombre}</span>
                <span className="bt-personalizar-ejemplo">{opcion.corto}</span>
                {idioma === opcion.codigo && <Check size={15} />}
              </button>
            ))}
          </div>

          {error && <p className="bt-idioma-error">{error}</p>}

          <p className="bt-idioma-nota">
            Traducción automática de Google. El sistema original está en
            español.
          </p>
        </div>
      )}
    </div>
  );
}

export default SelectorIdioma;
