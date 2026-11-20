# Pruebas: propiedad de vacantes

**Objetivo.** Demostrar que una empresa puede administrar sus vacantes (publicar, editar, pausar, reactivar y eliminar) y que **otra cuenta no puede modificarlas**.

## 1. Versión probada

Cada ejecución queda ligada a una versión concreta del sistema:

| Dónde | Qué muestra |
|---|---|
| `GET /api/version` | `{ "version": "1.1.0", "commit": "5205f81", ... }` |
| Pie de página de los paneles | `BolsaTec v1.1.0 · 5205f81 · 2026-11-20` (versión · commit · fecha de compilación) |

La versión sale de `package.json` y el commit de git (o de `VERCEL_GIT_COMMIT_SHA` / `RENDER_GIT_COMMIT` al desplegar). Los reportes y las capturas incluyen ambos datos.

## 2. Cómo protege el sistema las vacantes

1. `verificarToken` exige un JWT válido de una cuenta activa → si no hay token o es inválido: **401**.
2. `soloEmpresa` exige el rol `empresa` → un estudiante recibe **403**.
3. Cada consulta de edición, cambio de estado y eliminación filtra por `id_vacante` **y** por el `id_empresa` de la cuenta que inició sesión (`backend/src/controllers/empresaController.js`). Si la vacante es de otra empresa, no se encuentra → **404 "Vacante no encontrada"** y no cambia nada en la base de datos.

## 3. Casos de prueba

| ID | Caso | Actor | Resultado esperado |
|---|---|---|---|
| CP-01 | Iniciar sesión | Empresa A | 200, rol `empresa` |
| CP-02 | Publicar vacante | Empresa A | 201, estado `activa` |
| CP-03 | Ver "Mis vacantes" | Empresa A | La lista incluye la vacante |
| CP-04 | Editar vacante | Empresa A | 200, datos actualizados |
| CP-05 | Pausar vacante | Empresa A | 200, estado `pausada` |
| CP-06 | Reactivar vacante | Empresa A | 200, estado `activa` |
| CP-07 | Ver "Mis vacantes" | Empresa B | La vacante de A **no** aparece |
| CP-08 | Editar la vacante de A | Empresa B | 404 y la vacante no cambia |
| CP-09 | Cerrar la vacante de A | Empresa B | 404 y sigue `activa` |
| CP-10 | Eliminar la vacante de A | Empresa B | 404 y sigue existiendo |
| CP-11 | Editar la vacante de A | Estudiante | 403 y la vacante no cambia |
| CP-12 | Eliminar sin iniciar sesión | Anónimo | 401 y sigue existiendo |
| CP-13 | Editar con token alterado | Anónimo | 401 y la vacante no cambia |
| CP-14 | Eliminar su vacante | Empresa A | 200 y desaparece de su lista |

En los casos de bloqueo (CP-08 a CP-13), la prueba no solo revisa el código HTTP: después de cada intento, **Empresa A vuelve a consultar su vacante** y comprueba que el título, el estado y el salario siguen iguales.

## 4. Resultados registrados

| Prueba | Qué cubre | Reporte |
|---|---|---|
| API (automática) | CP-01 a CP-14 contra el backend | [`resultados/`](resultados/): un `.md` y un `.json` por ejecución, con pasos, datos, resultado esperado y obtenido |
| Navegador, **escritorio** (1366×768) | Recorrido completo en la interfaz | [`evidencia/README.md`](evidencia/README.md), capturas `escritorio-*.png` |
| Navegador, **móvil** (Pixel 7, 412×915) | El mismo recorrido con el menú móvil | [`evidencia/README.md`](evidencia/README.md), capturas `movil-*.png` |

### Ejecución en producción (la válida para la entrega)

| Dato | Valor |
|---|---|
| Versión | **v1.1.0, commit `5205f81`** (frontend y backend; se ve en el pie de página y en `/api/version`) |
| Frontend | https://bolsa-tec.vercel.app |
| API | https://bolsatec.onrender.com |
| Fecha | 2026-11-20 |
| Navegador | Chromium (Playwright): escritorio 1366×768 y móvil Pixel 7 (412×915) |
| API | **14 de 14** casos aprobados — [`resultados/vacantes-propiedad-2026-11-20-08-28-46.md`](resultados/vacantes-propiedad-2026-11-20-08-28-46.md) |
| Navegador | **22 de 22** pasos aprobados (11 escritorio + 11 móvil) — [`evidencia/README.md`](evidencia/README.md) |

Antes se hizo una ejecución en una base de datos local con la v1.1.0, commit `ff16a03` (14 de 14): [`resultados/vacantes-propiedad-2026-11-19-20-52-58.md`](resultados/vacantes-propiedad-2026-11-19-20-52-58.md).

Las pruebas en producción dejan cuentas de prueba `prueba.*@bolsatec.test` en la base de datos (las vacantes de prueba se eliminan al final). Se pueden desactivar desde el panel de administrador.

> El modo móvil es una emulación de Chromium (tamaño de pantalla, táctil y user agent de un Pixel 7). Para completar la evidencia en un **teléfono real**, usen la plantilla de la sección 6.

**Comprobamos que la prueba detecta fallos:** quitamos temporalmente el filtro `AND id_empresa = ...` de la edición y la prueba de API marcó como **FALLIDOS** los casos CP-08 a CP-13. Después restauramos el código.

## 5. Cómo repetir las pruebas

Úsenlas con una **base de datos de pruebas**, no con la de producción, porque crean cuentas `prueba.*@bolsatec.test`.

1. Base de datos local (opcional): creen una base vacía y ejecuten `backend/pruebas/esquema-pruebas.sql` y después los scripts de `backend/sql/`.
2. Arranquen el backend (`npm start` en `backend/`) con `DATABASE_URL` apuntando a esa base, y el frontend (`npm run dev` en `frontend/`).
3. Prueba de API:

   ```bash
   cd backend && API_URL=http://localhost:3000 npm run test:vacantes
   ```

4. Evidencia en escritorio y móvil (requiere Playwright). Si la red sale por un proxy, agreguen `NODE_USE_ENV_PROXY=1` (Node 22.21 o superior):

   ```bash
   cd frontend && npm install --no-save playwright && npx playwright install chromium
   ```

   ```bash
   APP_URL=http://localhost:5173 API_URL=http://localhost:3000 npm run evidencia:vacantes
   ```

Ambos comandos terminan con código 1 si algún caso falla.

## 6. Plantilla para pruebas manuales (teléfono real / escritorio)

Copien esta tabla por cada dispositivo. Anoten la versión que aparece en el pie de página **antes** de empezar.

- **Versión (pie de página):** `BolsaTec v_____ · _______ · __________`
- **Dispositivo / navegador:** (ej. Samsung A54, Chrome 131 · Windows 11, Edge 131)
- **Fecha y responsable:**

| ID | Pasos | Datos | Resultado esperado | Resultado obtenido | ¿Aprobado? | Captura |
|---|---|---|---|---|---|---|
| CP-01 | Iniciar sesión como Empresa A ("Soy empresa") | correo / contraseña de A | Entra al portal empresarial | | | |
| CP-02 | Mis vacantes → Nueva vacante → Publicar | título, modalidad, tipo, salario | "Vacante publicada correctamente", estado Activa | | | |
| CP-04 | Editar → cambiar título → Guardar cambios | nuevo título | "Vacante actualizada correctamente" | | | |
| CP-05 | Pausar → Aceptar | — | Estado Pausada | | | |
| CP-06 | Activar → Aceptar | — | Estado Activa | | | |
| CP-07 | Cerrar sesión; entrar como Empresa B → Mis vacantes | correo / contraseña de B | La vacante de A no aparece | | | |
| CP-08 | Como B, intentar editar la vacante de A (p. ej. con `curl` y el token de B) | id de la vacante de A | 404 "Vacante no encontrada" | | | |
| CP-08 (verificación) | Entrar como A → Mis vacantes | — | La vacante sigue igual | | | |
| CP-14 | Como A, Eliminar → Aceptar | — | "Vacante eliminada correctamente" | | | |
