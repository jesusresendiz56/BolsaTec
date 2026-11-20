# Reporte de errores y correcciones

Errores detectados durante las pruebas de BolsaTec, cómo se detectaron, la corrección aplicada y cómo se verificó.

| ID | Error detectado | Dónde / cómo se detectó | Gravedad | Corrección | Versión | Verificación |
|---|---|---|---|---|---|---|
| ERR-01 | No se podía identificar qué versión del sistema se estaba probando. | Retroalimentación del proyecto: «falta identificar la versión». | Media | Se agregó `GET /api/version` (versión, commit y hora de inicio) y un pie de página en los paneles: `BolsaTec v1.1.0 · commit · fecha`. | v1.1.0 | El pie y `/api/version` muestran la misma versión y commit en producción. |
| ERR-02 | En celulares, la tabla «Mis vacantes» de la empresa ocultaba las columnas Estado y Acciones (editar, pausar, eliminar); solo se veían deslizando la tabla de lado. | Recorrido automático en móvil (Pixel 7, 412 px): las capturas no mostraban los botones. | Alta | En pantallas de 640 px o menos, cada vacante se muestra como una tarjeta con el estado y los botones visibles (`VacantesEmpresa.jsx` y `VacantesEmpresa.css`). | v1.1.0 | Prueba de navegador en móvil: 11 de 11 pasos aprobados; las capturas muestran los botones. |
| ERR-03 | En celulares, los correos largos no hacían salto de línea y ensanchaban la página (hasta 650 px en una pantalla de 412 px). En «Mi perfil» del estudiante, el botón «Guardar cambios» quedaba fuera de alcance y no se podía presionar. También afectaba el Dashboard del estudiante y de la empresa y el Perfil empresarial. | Prueba CP04/CP05 en móvil: no se pudo presionar «Guardar cambios». Después, la revisión responsiva encontró las 4 pantallas afectadas. | Alta | Los textos largos del panel bajan de línea (`overflow-wrap: break-word` en `.bt-dashboard-content`) y el bloque de nombre y correo del perfil puede encogerse (`min-width: 0`, `overflow-wrap: anywhere`). | v1.1.1 | Revisión responsiva: 28 de 28 pantallas sin desborde (antes 24 de 28). Prueba de control: al quitar la corrección, las 4 pantallas vuelven a fallar. |

## Cómo se repiten las pruebas que encontraron estos errores

- Propiedad de vacantes (API): `cd backend && API_URL=<api> npm run test:vacantes`
- Recorrido de vacantes en escritorio y móvil: `cd frontend && APP_URL=<app> API_URL=<api> npm run evidencia:vacantes`
- Casos CP01–CP13 en escritorio y móvil: `cd frontend && APP_URL=<app> API_URL=<api> node pruebas/pruebas-cp01-cp13.mjs`
- Revisión responsiva (sin desborde horizontal): `cd frontend && APP_URL=<app> API_URL=<api> node pruebas/revision-responsiva.mjs`
