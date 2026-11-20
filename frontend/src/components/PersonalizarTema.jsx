import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

import {
  COLORES,
  FUENTES,
  colorGet,
  colorSet,
  fuenteGet,
  fuenteSet,
  precargarFuentes,
} from "../services/theme";
import "./PersonalizarTema.css";

// ========================================
// PERSONALIZAR TEMA
// Botón con paleta que abre un menú para elegir
// el color de fondo y el tipo de letra.
// ========================================

// Icono: paleta de pintor con pincel
function IconoPaleta() {
  return (
    <svg
      className="bt-icono-paleta"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {/* Paleta */}
      <path
        d="M12 3.2c-5 0-8.8 3.6-8.8 8.2 0 4.4 3.6 8.4 8.3 8.4 1.4 0 2.1-.8 2.1-1.8 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1 .8-1.7 1.8-1.7h2.1c2.4 0 4.3-1.9 4.3-4.3C20.8 6 16.9 3.2 12 3.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Pinturas */}
      <circle cx="7.4" cy="11.6" r="1.35" fill="#F97316" />
      <circle cx="8.9" cy="7.8" r="1.35" fill="#22C55E" />
      <circle cx="12.9" cy="6.6" r="1.35" fill="#EAB308" />
      <circle cx="8.6" cy="15.6" r="1.35" fill="#EF4444" />
      <circle cx="16.6" cy="8.6" r="1.35" fill="#3B82F6" />
      {/* Pincel */}
      <path
        d="M21.6 2.4 13.4 12.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M13.6 12.3c-.9-.4-2 .1-2.3 1.1-.3.9-.9 1.5-1.8 1.7 1.1 1 3 .9 3.9-.2.6-.7.7-1.8.2-2.6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PersonalizarTema() {
  const [abierto, setAbierto] = useState(false);
  const [color, setColor] = useState(colorGet);
  const [fuente, setFuente] = useState(fuenteGet);
  const contenedor = useRef(null);
  const boton = useRef(null);

  // Mantenerse al día si el tema cambia desde el botón sol/luna
  useEffect(() => {
    const actualizar = () => {
      setColor(colorGet());
      setFuente(fuenteGet());
    };

    window.addEventListener("bolsatec-theme-change", actualizar);
    return () =>
      window.removeEventListener("bolsatec-theme-change", actualizar);
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

  const alternar = () => {
    // Cargar las fuentes para que cada opción se vea con su letra
    if (!abierto) precargarFuentes();
    setAbierto((valor) => !valor);
  };

  return (
    <div className="bt-personalizar" ref={contenedor}>
      <button
        ref={boton}
        type="button"
        className="bt-personalizar-boton"
        onClick={alternar}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-label="Personalizar colores y tipo de letra"
        title="Personalizar"
      >
        <IconoPaleta />
      </button>

      {abierto && (
        <div
          className="bt-personalizar-menu"
          role="dialog"
          aria-label="Personalizar apariencia"
        >
          <p className="bt-personalizar-titulo" id="bt-personalizar-colores">
            Color de fondo
          </p>

          <div
            className="bt-personalizar-colores"
            role="radiogroup"
            aria-labelledby="bt-personalizar-colores"
          >
            {COLORES.map((opcion) => (
              <button
                key={opcion.id}
                type="button"
                role="radio"
                aria-checked={color === opcion.id}
                className={`bt-personalizar-color ${
                  color === opcion.id ? "activo" : ""
                }`}
                onClick={() => colorSet(opcion.id)}
              >
                <span
                  className="bt-personalizar-muestra"
                  style={{
                    background: `linear-gradient(135deg, ${opcion.fondo} 55%, ${opcion.acento} 55%)`,
                  }}
                >
                  {color === opcion.id && <Check size={14} strokeWidth={3} />}
                </span>
                {opcion.nombre}
              </button>
            ))}
          </div>

          <p className="bt-personalizar-titulo" id="bt-personalizar-fuentes">
            Tipo de letra
          </p>

          <div
            className="bt-personalizar-fuentes"
            role="radiogroup"
            aria-labelledby="bt-personalizar-fuentes"
          >
            {FUENTES.map((opcion) => (
              <button
                key={opcion.id}
                type="button"
                role="radio"
                aria-checked={fuente === opcion.id}
                className={`bt-personalizar-fuente ${
                  fuente === opcion.id ? "activo" : ""
                }`}
                style={{ fontFamily: opcion.familia }}
                onClick={() => fuenteSet(opcion.id)}
              >
                <span>{opcion.nombre}</span>
                <span className="bt-personalizar-ejemplo">Aa</span>
                {fuente === opcion.id && <Check size={15} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PersonalizarTema;
