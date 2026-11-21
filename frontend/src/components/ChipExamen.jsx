import { ClipboardCheck } from "lucide-react";
import "./ExamenPostulacion.css";

// Calificación del examen de conocimientos (en listas de postulaciones)
function ChipExamen({ calificacion, aciertos, total }) {
  if (calificacion === null || calificacion === undefined) return null;

  const valor = Number(calificacion);
  const nivel = valor >= 80 ? "alto" : valor >= 60 ? "medio" : "bajo";

  return (
    <span
      className={`bt-examen-chip ${nivel}`}
      title={`Prueba de conocimientos: ${aciertos} de ${total} correctas`}
    >
      <ClipboardCheck size={13} />
      Prueba {Math.round(valor)}%
    </span>
  );
}

export default ChipExamen;
