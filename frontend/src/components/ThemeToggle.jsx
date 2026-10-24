


import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { themeGet, themeSet } from "../services/theme";
import "./ThemeToggle.css";

function ThemeToggle() {
  const [tema, setTema] = useState(themeGet);

  useEffect(() => {
    const actualizar = () => setTema(themeGet());

    window.addEventListener(
      "bolsatec-theme-change",
      actualizar
    );

    return () => {
      window.removeEventListener(
        "bolsatec-theme-change",
        actualizar
      );
    };
  }, []);

  const cambiarTema = () => {
    themeSet(tema === "dark" ? "light" : "dark");
  };

  return (
    <button
      type="button"
      className="bt-global-theme-toggle"
      onClick={cambiarTema}
      aria-label={
        tema === "dark"
          ? "Activar modo claro"
          : "Activar modo oscuro"
      }
      title={
        tema === "dark"
          ? "Modo claro"
          : "Modo oscuro"
      }
    >
      {tema === "dark" ? (
        <Sun size={21} />
      ) : (
        <Moon size={21} />
      )}
    </button>
  );
}

export default ThemeToggle;
