import PersonalizarTema from "./PersonalizarTema";
import SelectorIdioma from "./SelectorIdioma";
import ThemeToggle from "./ThemeToggle";
import "./PersonalizarTema.css";

// Botones de idioma, paleta (colores y letra) y sol/luna
function ControlesTema() {
  return (
    <div className="bt-tema-controles">
      <SelectorIdioma />
      <PersonalizarTema />
      <ThemeToggle />
    </div>
  );
}

export default ControlesTema;
