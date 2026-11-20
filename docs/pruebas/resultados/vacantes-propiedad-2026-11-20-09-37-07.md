# Prueba: propiedad de vacantes

| Dato | Valor |
|---|---|
| Versión de la API | v1.1.0 (commit `5205f81`) |
| Servidor probado | http://localhost:3000 |
| Fecha de ejecución | 2026-11-20 09:37:07 UTC |
| Resultado | **14 de 14 casos aprobados** |

## Cuentas de prueba

| Actor | Correo | Contraseña |
|---|---|---|
| Empresa A | prueba.empresa.a.1795167426196@bolsatec.test | Prueba12345 |
| Empresa B | prueba.empresa.b.1795167426196@bolsatec.test | Prueba12345 |
| Estudiante | prueba.estudiante.1795167426196@bolsatec.test | Prueba12345 |

## Casos

| ID | Caso | Actor | Pasos | Datos | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|---|
| CP-01 | Empresa A inicia sesión | Empresa A | POST /api/auth/login con el correo y contraseña de Empresa A | correo=prueba.empresa.a.1795167426196@bolsatec.test | HTTP 200, token JWT y rol "empresa" | HTTP 200, rol "empresa", token recibido | ✅ Aprobado |
| CP-02 | Empresa A publica una vacante | Empresa A | POST /api/empresa/vacantes con token de Empresa A | titulo="Desarrollador Web Jr (prueba 1795167426196)", modalidad=hibrida, tipo=practicas, salario 6000–8000 | HTTP 201, vacante creada con estado "activa" | HTTP 201 "Vacante publicada correctamente", id_vacante=1, estado="activa" | ✅ Aprobado |
| CP-03 | Empresa A ve la vacante en "Mis vacantes" | Empresa A | GET /api/empresa/vacantes con token de Empresa A | id_vacante=1 | HTTP 200 y la lista incluye la vacante | HTTP 200, 1 vacante(s), incluye la vacante 1 | ✅ Aprobado |
| CP-04 | Empresa A edita su vacante | Empresa A | PUT /api/empresa/vacantes/1 con token de Empresa A | titulo="Desarrollador Web Jr EDITADA (prueba 1795167426196)", salario_max=9000 | HTTP 200, título y salario actualizados | HTTP 200 "Vacante actualizada correctamente", titulo="Desarrollador Web Jr EDITADA (prueba 1795167426196)", salario_max=9000.00 | ✅ Aprobado |
| CP-05 | Empresa A pausa su vacante | Empresa A | PATCH /api/empresa/vacantes/1/estado con token de Empresa A | estado=pausada | HTTP 200, estado "pausada" | HTTP 200 "Estado actualizado correctamente", estado="pausada" | ✅ Aprobado |
| CP-06 | Empresa A reactiva su vacante | Empresa A | PATCH /api/empresa/vacantes/1/estado con token de Empresa A | estado=activa | HTTP 200, estado "activa" | HTTP 200 "Estado actualizado correctamente", estado="activa" | ✅ Aprobado |
| CP-07 | Empresa B NO ve la vacante de Empresa A en "Mis vacantes" | Empresa B | Iniciar sesión como Empresa B; GET /api/empresa/vacantes con su token | correo=prueba.empresa.b.1795167426196@bolsatec.test | HTTP 200 y la lista NO incluye la vacante de A | HTTP 200, 0 vacante(s), no incluye la vacante 1 | ✅ Aprobado |
| CP-08 | Empresa B intenta editar la vacante de Empresa A | Empresa B | PUT /api/empresa/vacantes/1 con token de Empresa B; después Empresa A consulta su vacante | titulo="MODIFICADA POR OTRA EMPRESA", salario 1–1 | HTTP 404 "Vacante no encontrada" y la vacante de A sin cambios | HTTP 404 "Vacante no encontrada"; vacante de A sin cambios | ✅ Aprobado |
| CP-09 | Empresa B intenta cerrar la vacante de Empresa A | Empresa B | PATCH /api/empresa/vacantes/1/estado con token de Empresa B | estado=cerrada | HTTP 404 y la vacante sigue "activa" | HTTP 404 "Vacante no encontrada"; vacante de A sigue "activa" | ✅ Aprobado |
| CP-10 | Empresa B intenta eliminar la vacante de Empresa A | Empresa B | DELETE /api/empresa/vacantes/1 con token de Empresa B | id_vacante=1 | HTTP 404 y la vacante sigue existiendo | HTTP 404 "Vacante no encontrada"; vacante de A sigue existiendo | ✅ Aprobado |
| CP-11 | Una cuenta de estudiante intenta editar la vacante | Estudiante | PUT /api/empresa/vacantes/1 con token de estudiante | correo=prueba.estudiante.1795167426196@bolsatec.test | HTTP 403 "Acceso permitido únicamente a empresas" y la vacante sin cambios | HTTP 403 "Acceso permitido únicamente a empresas"; vacante sin cambios | ✅ Aprobado |
| CP-12 | Petición sin iniciar sesión intenta eliminar la vacante | Anónimo | DELETE /api/empresa/vacantes/1 sin encabezado Authorization | (sin token) | HTTP 401 "Debes iniciar sesión" y la vacante sigue existiendo | HTTP 401 "Debes iniciar sesión"; vacante sigue existiendo | ✅ Aprobado |
| CP-13 | Token JWT alterado intenta editar la vacante | Anónimo | PUT /api/empresa/vacantes/1 con la firma del token de B modificada | token con los últimos 4 caracteres cambiados | HTTP 401 "Token inválido" y la vacante sin cambios | HTTP 401 "Token inválido"; vacante sin cambios | ✅ Aprobado |
| CP-14 | Empresa A elimina su propia vacante | Empresa A | DELETE /api/empresa/vacantes/1 con token de Empresa A; después consulta su lista | id_vacante=1 | HTTP 200 "Vacante eliminada correctamente" y ya no aparece en su lista | HTTP 200 "Vacante eliminada correctamente"; ya no aparece en la lista | ✅ Aprobado |
