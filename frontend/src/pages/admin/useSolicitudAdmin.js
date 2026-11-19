import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { apiRequest } from "../../services/api";
import { sessionGet, sessionDestroy } from "../../services/session";

// Peticiones autenticadas a /api/admin.
// Si la sesión expiró, cierra sesión y vuelve al login.
export function useSolicitudAdmin() {
  const navigate = useNavigate();

  return useCallback(async (ruta, opciones = {}) => {
    const sesion = sessionGet("administrador");

    const expirar = () => {
      sessionDestroy("administrador");
      navigate("/admin/login", { replace: true });
    };

    if (!sesion?.token) {
      expirar();
      throw new Error("Tu sesión ha expirado");
    }

    try {
      return await apiRequest(`/admin${ruta}`, {
        ...opciones,
        headers: {
          ...opciones.headers,
          Authorization: `Bearer ${sesion.token}`,
        },
      });
    } catch (err) {
      if (/sesión ha expirado|token inválido|desactivada/i.test(err.message)) {
        expirar();
      }
      throw err;
    }
  }, [navigate]);
}

export const formatearFecha = (fecha) => {
  if (!fecha) return "Sin fecha";
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return "Sin fecha";
  return valor.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatearSalario = (min, max) => {
  const fmt = (n) =>
    Number(n).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    });
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `Desde ${fmt(min)}`;
  if (max != null) return `Hasta ${fmt(max)}`;
  return "No especificado";
};
