
import { Navigate } from "react-router-dom";

function ProtectedRoute({ rol, children }) {
  const esAdmin = rol === "administrador";

  let token = null;
  let usuarioGuardado = null;

  if (esAdmin) {
    token = sessionStorage.getItem("admin_token");
    usuarioGuardado = sessionStorage.getItem("admin_usuario");
  } else {
    const almacenamiento = localStorage.getItem("bolsatec_token")
      ? localStorage
      : sessionStorage;

    token = almacenamiento.getItem("bolsatec_token");
    usuarioGuardado = almacenamiento.getItem("bolsatec_usuario");
  }

  const rutaLogin = esAdmin ? "/admin/login" : "/login";

  if (!token || !usuarioGuardado) {
    return <Navigate to={rutaLogin} replace />;
  }

  try {
    const usuario = JSON.parse(usuarioGuardado);

    if (usuario.rol !== rol) {
      return <Navigate to={rutaLogin} replace />;
    }

    return children;
  } catch {
    return <Navigate to={rutaLogin} replace />;
  }
}

export default ProtectedRoute;
