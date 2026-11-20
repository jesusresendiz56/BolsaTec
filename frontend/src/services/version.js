// Versión de la aplicación (se inyecta al compilar en vite.config.js)
/* global __BOLSATEC_VERSION__, __BOLSATEC_COMMIT__, __BOLSATEC_FECHA__ */

export const VERSION = __BOLSATEC_VERSION__;
export const COMMIT = __BOLSATEC_COMMIT__;
export const FECHA_COMPILACION = __BOLSATEC_FECHA__;

export const VERSION_TEXTO = `v${VERSION} · ${COMMIT} · ${FECHA_COMPILACION}`;
