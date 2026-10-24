
import { Navigate } from "react-router-dom";
import { sessionGet } from "../services/session";

function ProtectedRoute({ rol, children }) {
  const sesion = sessionGet(rol);

  if (!sesion?.token || sesion.usuario?.rol !== rol) {
    return (
      <Navigate
        to={
          rol === "administrador"
            ? "/admin/login"
            : "/login"
        }
        replace
      />
    );
  }

  return children;
}

export default ProtectedRoute;
