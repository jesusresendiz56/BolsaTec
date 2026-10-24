
import { Navigate } from "react-router-dom";
import { sessionGet } from "../../services/session";

function ProtectedRoute({ rol, children }) {
  const sesion = sessionGet(rol);

  const rutaLogin =
    rol === "administrador"
      ? "/admin/login"
      : "/login";

  if (!sesion) {
    return <Navigate to={rutaLogin} replace />;
  }

  if (sesion.usuario.rol !== rol) {
    return <Navigate to={rutaLogin} replace />;
  }

  return children;
}

export default ProtectedRoute;
