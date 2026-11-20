import {
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Eye,
  XCircle,
} from "lucide-react";

// ========================================
// ESTADOS DE UNA POSTULACIÓN
// Compartido por el dashboard y "Mis postulaciones".
// ========================================

export const ESTADOS_POSTULACION = {
  enviada: {
    nombre: "Enviada",
    icono: Clock3,
    clase: "enviada",
    ayuda: "La empresa aún no revisa tu solicitud.",
  },
  vista: {
    nombre: "Vista",
    icono: Eye,
    clase: "vista",
    ayuda: "La empresa ya revisó tu perfil.",
  },
  entrevista: {
    nombre: "Entrevista",
    icono: CalendarCheck,
    clase: "entrevista",
    ayuda: "¡La empresa quiere entrevistarte! Revisa tu correo para los detalles.",
  },
  aceptada: {
    nombre: "Aceptada",
    icono: CheckCircle2,
    clase: "aceptada",
    ayuda: "¡Felicidades! La empresa aceptó tu postulación y se pondrá en contacto contigo.",
  },
  rechazada: {
    nombre: "No seleccionada",
    icono: XCircle,
    clase: "rechazada",
    ayuda: "La empresa decidió continuar con otros candidatos. ¡Sigue intentando!",
  },
};

// Pasos del proceso, para la línea de tiempo
export const PASOS_PROCESO = ["enviada", "vista", "entrevista", "resultado"];

export const pasoActual = (estado) => {
  if (estado === "aceptada" || estado === "rechazada") return 3;
  return Math.max(0, PASOS_PROCESO.indexOf(estado));
};
