
const TOKEN_KEY = "bolsatec_token";
const USER_KEY = "bolsatec_usuario";

const ADMIN_TOKEN_KEY = "admin_token";
const ADMIN_USER_KEY = "admin_usuario";

// Leer la fecha de expiración de un JWT
function tokenExpirado(token) {
  try {
    const partes = token.split(".");
    if (partes.length !== 3) return true;

    const base64 = partes[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const payload = JSON.parse(atob(base64));

    if (typeof payload.exp !== "number") {
      return true;
    }

    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

// SESSION START
export function sessionStart(token, usuario, recordarme = false) {
  if (!token || !usuario?.rol) {
    throw new Error("Datos de sesión inválidos");
  }

  if (tokenExpirado(token)) {
    throw new Error("El token ha expirado o no es válido");
  }

  if (usuario.rol === "administrador") {
    sessionDestroy("administrador");

    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    sessionStorage.setItem(
      ADMIN_USER_KEY,
      JSON.stringify(usuario)
    );

    return;
  }

  if (!["estudiante", "empresa"].includes(usuario.rol)) {
    throw new Error("Rol no permitido");
  }

  sessionDestroy("usuario");

  const almacenamiento = recordarme
    ? localStorage
    : sessionStorage;

  almacenamiento.setItem(TOKEN_KEY, token);
  almacenamiento.setItem(
    USER_KEY,
    JSON.stringify(usuario)
  );
}

// SESSION GET
export function sessionGet(rol = null) {
  const esAdmin = rol === "administrador";

  let almacenamiento;

  if (esAdmin) {
    almacenamiento = sessionStorage;
  } else {
    almacenamiento = localStorage.getItem(TOKEN_KEY)
      ? localStorage
      : sessionStorage;
  }

  const token = almacenamiento.getItem(
    esAdmin ? ADMIN_TOKEN_KEY : TOKEN_KEY
  );

  const usuarioGuardado = almacenamiento.getItem(
    esAdmin ? ADMIN_USER_KEY : USER_KEY
  );

  if (!token || !usuarioGuardado) {
    return null;
  }

  if (tokenExpirado(token)) {
    sessionDestroy(esAdmin ? "administrador" : "usuario");
    return null;
  }

  try {
    const usuario = JSON.parse(usuarioGuardado);

    if (!usuario?.rol) {
      sessionDestroy(esAdmin ? "administrador" : "usuario");
      return null;
    }

    if (esAdmin && usuario.rol !== "administrador") {
      sessionDestroy("administrador");
      return null;
    }

    if (!esAdmin && !["estudiante", "empresa"].includes(usuario.rol)) {
      sessionDestroy("usuario");
      return null;
    }

    return { token, usuario };
  } catch {
    sessionDestroy(esAdmin ? "administrador" : "usuario");
    return null;
  }
}

// SESSION DESTROY
export function sessionDestroy(tipo = "usuario") {
  if (tipo === "administrador") {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_USER_KEY);
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

// Comprobar sesión activa
export function sessionActiva(rol) {
  const sesion = sessionGet(rol);
  return Boolean(sesion && sesion.usuario.rol === rol);
}
