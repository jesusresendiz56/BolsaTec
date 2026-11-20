# Respuesta a la retroalimentación

> "El problema, los perfiles de usuario y el modelo relacional están bien definidos. Las capturas aportan evidencia de varios casos, aunque falta identificar la versión y registrar sistemáticamente lo que ocurrió en cada prueba. Prioridad: demostrar que una empresa puede administrar sus vacantes y que otra cuenta no puede modificarlas. Registren los pasos, los datos, el resultado esperado y el obtenido. Completen la demostración en móvil y escritorio."

| Observación | Qué hicimos | Dónde está la evidencia | Estado |
|---|---|---|---|
| **Falta identificar la versión** | La API responde `GET /api/version` con versión y commit, y el pie de página de cada panel muestra `BolsaTec v1.1.0 · <commit> · <fecha>`. Cada reporte y cada captura registran esa versión. | [README §1](README.md#1-versión-probada), captura [`escritorio-01.png`](evidencia/escritorio-01.png) / [`movil-01.png`](evidencia/movil-01.png) (pie de página) | ✅ Atendido |
| **Registrar sistemáticamente cada prueba** | 14 casos de prueba con ID (CP-01 a CP-14). Cada ejecución genera automáticamente un reporte con: ID, actor, **pasos, datos, resultado esperado, resultado obtenido** y aprobado/fallido, en `.md` y `.json`. | [`resultados/`](resultados/), [`evidencia/README.md`](evidencia/README.md) | ✅ Atendido |
| **Empresa administra sus vacantes** | Empresa A publica (CP-02), consulta (CP-03), edita (CP-04), pausa (CP-05), reactiva (CP-06) y elimina (CP-14) su vacante. | Reporte de API y capturas 01–05 y 11 | ✅ 6/6 aprobados |
| **Otra cuenta no puede modificarlas** | Empresa B no ve la vacante (CP-07) y recibe 404 al editar, cerrar o eliminar (CP-08–10); un estudiante recibe 403 (CP-11); sin sesión o con token alterado, 401 (CP-12–13). Después de cada intento, Empresa A vuelve a consultar su vacante y se confirma que **no cambió**. | Reporte de API y capturas 06–10 | ✅ 7/7 aprobados |
| **La prueba realmente detecta fallos** | Quitamos a propósito el filtro `AND id_empresa = ...` del backend: la prueba marcó CP-08–13 como **FALLIDOS**. Restauramos el código. | [README §4](README.md#4-resultados-registrados) | ✅ Verificado |
| **Demostración en móvil y escritorio** | El mismo recorrido de 11 pasos se ejecutó en escritorio (1366×768) y en móvil (Pixel 7, 412×915, táctil). En móvil las vacantes se muestran como tarjetas y se navega con el menú hamburguesa. | `evidencia/escritorio-*.png`, `evidencia/movil-*.png` | ✅ 22/22 pasos |

## Ejecución vigente

| Dato | Valor |
|---|---|
| Versión | **v1.1.0, commit `5205f81`** |
| Fecha | 2026-11-20 |
| Entorno | Producción: https://bolsa-tec.vercel.app y https://bolsatec.onrender.com |
| API | **14 de 14** casos aprobados — [`vacantes-propiedad-2026-11-20-08-28-46.md`](resultados/vacantes-propiedad-2026-11-20-08-28-46.md) |
| Navegador | **22 de 22** pasos aprobados (11 escritorio + 11 móvil) — [`evidencia/README.md`](evidencia/README.md) |
| Repetición local | La misma versión contra una base de datos local también aprobó 14 de 14 — [`vacantes-propiedad-2026-11-20-09-37-07.md`](resultados/vacantes-propiedad-2026-11-20-09-37-07.md) |

## Pendiente (lo hace el equipo)

- **Teléfono real:** el modo móvil es una emulación de Chromium. Para cerrar por completo el punto, una persona del equipo debe repetir el recorrido en un teléfono físico contra el sistema desplegado, llenando la plantilla de la [sección 6 del README](README.md#6-plantilla-para-pruebas-manuales-teléfono-real--escritorio) (anotar la versión del pie de página, el modelo del teléfono, el navegador y adjuntar capturas).
- **Presentación:** mostrar en vivo CP-02 → CP-04 → CP-07 → CP-08 (con verificación) en ambos dispositivos; es la secuencia que responde directamente a la prioridad señalada.
