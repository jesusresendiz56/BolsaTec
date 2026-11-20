# Historial de versiones de BolsaTec

Cada versión se ve en el pie de página de los paneles
(`BolsaTec vX.Y.Z · commit · fecha`) y en `GET /api/version`.
Las pruebas de `docs/pruebas/` indican siempre la versión y el commit
con los que se ejecutaron.

## v1.2.0 — 2026-11-20

**Interfaz**
- Rediseño de los módulos del estudiante: dashboard con accesos directos,
  postulaciones recientes, avance del perfil y vacantes sugeridas;
  "Mis postulaciones" con pestañas y línea de tiempo del proceso;
  notificaciones agrupadas por día y por tipo.
- Nuevo "Mi perfil" del estudiante: avance del perfil, validación en línea
  y subida de CV con arrastrar y soltar, vista previa y barra de progreso.
- Módulos de la empresa: dashboard con postulaciones por revisar, embudo de
  selección y resumen de vacantes; colores de estados unificados.
- Módulos del administrador: dashboard con accesos directos, filtro de
  empresas por verificar y columna de acciones siempre visible.
- Contador de notificaciones sin leer en el menú lateral.
- Botón para personalizar el color de fondo (8 temas) y el tipo de letra (10).
- Botón para traducir el sistema (español, inglés, francés, alemán y japonés).

**Mapa**
- El selector de ubicación elige la calle que coincide con el C.P., municipio
  y estado, y avisa cuando OpenStreetMap no tiene el número exterior.
- Muestra la dirección donde quedó el marcador y avisa si está en otra calle.

**Servidor**
- Validación de teléfono (10 dígitos) y descripción (máx. 1000 caracteres)
  en el perfil del estudiante.

## v1.1.1 — 2026-11-20

- Corrección: los correos largos ensanchaban la página en celulares y el
  botón "Guardar cambios" quedaba fuera de alcance (ERR-03).

## v1.1.0 — 2026-11-19

- Versión y commit visibles en el pie de página y en `/api/version`.
- Vacantes de la empresa en tarjetas en móvil.
- Pruebas automáticas de propiedad de vacantes (API y navegador).
