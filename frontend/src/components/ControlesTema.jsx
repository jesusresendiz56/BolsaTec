import PersonalizarTema from "./PersonalizarTema";
import ThemeToggle from "./ThemeToggle";
import "./PersonalizarTema.css";

// Botón de paleta (colores y letra) + botón de sol/luna
function ControlesTema() {
  return (
    <div className="bt-tema-controles">
      <PersonalizarTema />
      <ThemeToggle />
    </div>
  );
}

export default ControlesTema;
