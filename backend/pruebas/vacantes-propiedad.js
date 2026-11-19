/*
 * ==========================================================
 * BolsaTec · Prueba: una empresa administra SUS vacantes y
 * otra cuenta NO puede modificarlas.
 *
 * Uso (con el backend corriendo):
 *   API_URL=http://localhost:3000 node pruebas/vacantes-propiedad.js
 *
 * Crea cuentas de prueba nuevas (correos prueba.*@bolsatec.test),
 * ejecuta cada caso, compara resultado esperado vs. obtenido y
 * guarda un reporte en docs/pruebas/resultados/.
 *
 * IMPORTANTE: ejecútalo contra una base de datos de pruebas,
 * no contra la de producción (deja cuentas de prueba creadas).
 * ==========================================================
 */

const fs = require("fs");
const path = require("path");

const API_URL = (process.env.API_URL || "http://localhost:3000")
  .replace(/\/+$/, "");

const sello = Date.now();
const PASSWORD = "Prueba12345";

const cuentas = {
  empresaA: {
    nombre: "Ana Torres",
    correo: `prueba.empresa.a.${sello}@bolsatec.test`,
    password: PASSWORD,
    nombre_empresa: "Empresa A (prueba)",
    telefono: "5512345678",
    sector: "Tecnología"
  },
  empresaB: {
    nombre: "Bruno Díaz",
    correo: `prueba.empresa.b.${sello}@bolsatec.test`,
    password: PASSWORD,
    nombre_empresa: "Empresa B (prueba)",
    telefono: "5587654321",
    sector: "Manufactura"
  },
  estudiante: {
    nombre: "Carla Ruiz",
    correo: `prueba.estudiante.${sello}@bolsatec.test`,
    password: PASSWORD,
    carrera: "Ingeniería en Sistemas",
    semestre: 6
  }
};

const vacanteOriginal = {
  titulo: `Desarrollador Web Jr (prueba ${sello})`,
  descripcion: "Vacante creada por la prueba automática de propiedad.",
  modalidad: "hibrida",
  tipo: "practicas",
  salario_min: 6000,
  salario_max: 8000,
  direccion_ciudad: "Iztacalco",
  direccion_estado: "Ciudad de México"
};

const vacanteEditada = {
  ...vacanteOriginal,
  titulo: `Desarrollador Web Jr EDITADA (prueba ${sello})`,
  salario_max: 9000
};

const vacanteAtaque = {
  ...vacanteOriginal,
  titulo: "MODIFICADA POR OTRA EMPRESA",
  salario_min: 1,
  salario_max: 1
};

// ----------------------------------------------------------
// Utilidades
// ----------------------------------------------------------

const llamar = async (metodo, ruta, { token, body } = {}) => {
  const respuesta = await fetch(`${API_URL}/api${ruta}`, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  let datos = null;

  try {
    datos = await respuesta.json();
  } catch {
    datos = null;
  }

  return { status: respuesta.status, datos };
};

const casos = [];

const registrar = ({
  id,
  descripcion,
  actor,
  pasos,
  datos,
  esperado,
  obtenido,
  aprobado
}) => {
  casos.push({
    id,
    descripcion,
    actor,
    pasos,
    datos,
    esperado,
    obtenido,
    resultado: aprobado ? "APROBADO" : "FALLIDO"
  });

  const marca = aprobado ? "✔" : "✘";
  console.log(`${marca} ${id} ${descripcion}`);
  console.log(`    esperado: ${esperado}`);
  console.log(`    obtenido: ${obtenido}`);
};

const mensaje = (r) => r.datos?.mensaje ? ` "${r.datos.mensaje}"` : "";

const buscarVacante = async (token, idVacante) => {
  const r = await llamar("GET", "/empresa/vacantes", { token });
  return (r.datos?.vacantes || []).find(
    (v) => v.id_vacante === idVacante
  );
};

// ----------------------------------------------------------
// Ejecución
// ----------------------------------------------------------

const ejecutar = async () => {
  const version = await llamar("GET", "/version");

  if (version.status !== 200) {
    throw new Error(
      `No se pudo consultar ${API_URL}/api/version (HTTP ${version.status}).`
    );
  }

  console.log(
    `BolsaTec API v${version.datos.version} (commit ${version.datos.commit}) en ${API_URL}\n`
  );

  // Preparación: registrar cuentas
  const regA = await llamar("POST", "/auth/registro-empresa", { body: cuentas.empresaA });
  const regB = await llamar("POST", "/auth/registro-empresa", { body: cuentas.empresaB });
  const regE = await llamar("POST", "/auth/registro", { body: cuentas.estudiante });

  for (const [nombre, r] of [["Empresa A", regA], ["Empresa B", regB], ["Estudiante", regE]]) {
    if (r.status !== 201) {
      throw new Error(`No se pudo registrar ${nombre}: HTTP ${r.status}${mensaje(r)}`);
    }
  }

  const iniciar = async (cuenta) => {
    const r = await llamar("POST", "/auth/login", {
      body: { correo: cuenta.correo, password: cuenta.password }
    });
    return { r, token: r.datos?.token };
  };

  // CP-01 Inicio de sesión Empresa A
  const loginA = await iniciar(cuentas.empresaA);
  registrar({
    id: "CP-01",
    descripcion: "Empresa A inicia sesión",
    actor: "Empresa A",
    pasos: "POST /api/auth/login con el correo y contraseña de Empresa A",
    datos: `correo=${cuentas.empresaA.correo}`,
    esperado: "HTTP 200, token JWT y rol \"empresa\"",
    obtenido: `HTTP ${loginA.r.status}, rol "${loginA.r.datos?.usuario?.rol}", token ${loginA.token ? "recibido" : "no recibido"}`,
    aprobado: loginA.r.status === 200 && loginA.r.datos?.usuario?.rol === "empresa" && !!loginA.token
  });

  const loginB = await iniciar(cuentas.empresaB);
  const loginE = await iniciar(cuentas.estudiante);
  const tokenA = loginA.token;
  const tokenB = loginB.token;
  const tokenE = loginE.token;

  // CP-02 Crear vacante
  const crear = await llamar("POST", "/empresa/vacantes", { token: tokenA, body: vacanteOriginal });
  const idVacante = crear.datos?.vacante?.id_vacante;
  registrar({
    id: "CP-02",
    descripcion: "Empresa A publica una vacante",
    actor: "Empresa A",
    pasos: "POST /api/empresa/vacantes con token de Empresa A",
    datos: `titulo="${vacanteOriginal.titulo}", modalidad=hibrida, tipo=practicas, salario 6000–8000`,
    esperado: "HTTP 201, vacante creada con estado \"activa\"",
    obtenido: `HTTP ${crear.status}${mensaje(crear)}, id_vacante=${idVacante}, estado="${crear.datos?.vacante?.estado}"`,
    aprobado: crear.status === 201 && !!idVacante && crear.datos?.vacante?.estado === "activa"
  });

  if (!idVacante) {
    throw new Error("No se creó la vacante; no se pueden ejecutar los demás casos.");
  }

  // CP-03 Listar vacantes propias
  const listaA = await llamar("GET", "/empresa/vacantes", { token: tokenA });
  const enListaA = (listaA.datos?.vacantes || []).some((v) => v.id_vacante === idVacante);
  registrar({
    id: "CP-03",
    descripcion: "Empresa A ve la vacante en \"Mis vacantes\"",
    actor: "Empresa A",
    pasos: "GET /api/empresa/vacantes con token de Empresa A",
    datos: `id_vacante=${idVacante}`,
    esperado: "HTTP 200 y la lista incluye la vacante",
    obtenido: `HTTP ${listaA.status}, ${listaA.datos?.vacantes?.length ?? 0} vacante(s), ${enListaA ? "incluye" : "NO incluye"} la vacante ${idVacante}`,
    aprobado: listaA.status === 200 && enListaA
  });

  // CP-04 Editar vacante propia
  const editar = await llamar("PUT", `/empresa/vacantes/${idVacante}`, { token: tokenA, body: vacanteEditada });
  registrar({
    id: "CP-04",
    descripcion: "Empresa A edita su vacante",
    actor: "Empresa A",
    pasos: `PUT /api/empresa/vacantes/${idVacante} con token de Empresa A`,
    datos: `titulo="${vacanteEditada.titulo}", salario_max=9000`,
    esperado: "HTTP 200, título y salario actualizados",
    obtenido: `HTTP ${editar.status}${mensaje(editar)}, titulo="${editar.datos?.vacante?.titulo}", salario_max=${editar.datos?.vacante?.salario_max}`,
    aprobado: editar.status === 200 && editar.datos?.vacante?.titulo === vacanteEditada.titulo && Number(editar.datos?.vacante?.salario_max) === 9000
  });

  // CP-05 Pausar vacante propia
  const pausar = await llamar("PATCH", `/empresa/vacantes/${idVacante}/estado`, { token: tokenA, body: { estado: "pausada" } });
  registrar({
    id: "CP-05",
    descripcion: "Empresa A pausa su vacante",
    actor: "Empresa A",
    pasos: `PATCH /api/empresa/vacantes/${idVacante}/estado con token de Empresa A`,
    datos: "estado=pausada",
    esperado: "HTTP 200, estado \"pausada\"",
    obtenido: `HTTP ${pausar.status}${mensaje(pausar)}, estado="${pausar.datos?.vacante?.estado}"`,
    aprobado: pausar.status === 200 && pausar.datos?.vacante?.estado === "pausada"
  });

  const reactivar = await llamar("PATCH", `/empresa/vacantes/${idVacante}/estado`, { token: tokenA, body: { estado: "activa" } });
  registrar({
    id: "CP-06",
    descripcion: "Empresa A reactiva su vacante",
    actor: "Empresa A",
    pasos: `PATCH /api/empresa/vacantes/${idVacante}/estado con token de Empresa A`,
    datos: "estado=activa",
    esperado: "HTTP 200, estado \"activa\"",
    obtenido: `HTTP ${reactivar.status}${mensaje(reactivar)}, estado="${reactivar.datos?.vacante?.estado}"`,
    aprobado: reactivar.status === 200 && reactivar.datos?.vacante?.estado === "activa"
  });

  // Estado de referencia para comprobar que nadie más la cambia
  const referencia = await buscarVacante(tokenA, idVacante);
  const sinCambios = async () => {
    const actual = await buscarVacante(tokenA, idVacante);
    return !!actual &&
      actual.titulo === referencia.titulo &&
      actual.estado === referencia.estado &&
      Number(actual.salario_min) === Number(referencia.salario_min) &&
      Number(actual.salario_max) === Number(referencia.salario_max);
  };

  // CP-07 Empresa B no ve la vacante de A
  const listaB = await llamar("GET", "/empresa/vacantes", { token: tokenB });
  const enListaB = (listaB.datos?.vacantes || []).some((v) => v.id_vacante === idVacante);
  registrar({
    id: "CP-07",
    descripcion: "Empresa B NO ve la vacante de Empresa A en \"Mis vacantes\"",
    actor: "Empresa B",
    pasos: "Iniciar sesión como Empresa B; GET /api/empresa/vacantes con su token",
    datos: `correo=${cuentas.empresaB.correo}`,
    esperado: "HTTP 200 y la lista NO incluye la vacante de A",
    obtenido: `HTTP ${listaB.status}, ${listaB.datos?.vacantes?.length ?? 0} vacante(s), ${enListaB ? "SÍ incluye" : "no incluye"} la vacante ${idVacante}`,
    aprobado: listaB.status === 200 && !enListaB
  });

  // CP-08 Empresa B intenta editar
  const editarB = await llamar("PUT", `/empresa/vacantes/${idVacante}`, { token: tokenB, body: vacanteAtaque });
  const intacta8 = await sinCambios();
  registrar({
    id: "CP-08",
    descripcion: "Empresa B intenta editar la vacante de Empresa A",
    actor: "Empresa B",
    pasos: `PUT /api/empresa/vacantes/${idVacante} con token de Empresa B; después Empresa A consulta su vacante`,
    datos: `titulo="${vacanteAtaque.titulo}", salario 1–1`,
    esperado: "HTTP 404 \"Vacante no encontrada\" y la vacante de A sin cambios",
    obtenido: `HTTP ${editarB.status}${mensaje(editarB)}; vacante de A ${intacta8 ? "sin cambios" : "MODIFICADA"}`,
    aprobado: editarB.status === 404 && intacta8
  });

  // CP-09 Empresa B intenta cambiar el estado
  const estadoB = await llamar("PATCH", `/empresa/vacantes/${idVacante}/estado`, { token: tokenB, body: { estado: "cerrada" } });
  const intacta9 = await sinCambios();
  registrar({
    id: "CP-09",
    descripcion: "Empresa B intenta cerrar la vacante de Empresa A",
    actor: "Empresa B",
    pasos: `PATCH /api/empresa/vacantes/${idVacante}/estado con token de Empresa B`,
    datos: "estado=cerrada",
    esperado: "HTTP 404 y la vacante sigue \"activa\"",
    obtenido: `HTTP ${estadoB.status}${mensaje(estadoB)}; vacante de A ${intacta9 ? "sigue \"activa\"" : "CAMBIÓ de estado"}`,
    aprobado: estadoB.status === 404 && intacta9
  });

  // CP-10 Empresa B intenta eliminar
  const eliminarB = await llamar("DELETE", `/empresa/vacantes/${idVacante}`, { token: tokenB });
  const intacta10 = await sinCambios();
  registrar({
    id: "CP-10",
    descripcion: "Empresa B intenta eliminar la vacante de Empresa A",
    actor: "Empresa B",
    pasos: `DELETE /api/empresa/vacantes/${idVacante} con token de Empresa B`,
    datos: `id_vacante=${idVacante}`,
    esperado: "HTTP 404 y la vacante sigue existiendo",
    obtenido: `HTTP ${eliminarB.status}${mensaje(eliminarB)}; vacante de A ${intacta10 ? "sigue existiendo" : "ELIMINADA o modificada"}`,
    aprobado: eliminarB.status === 404 && intacta10
  });

  // CP-11 Estudiante intenta editar
  const editarE = await llamar("PUT", `/empresa/vacantes/${idVacante}`, { token: tokenE, body: vacanteAtaque });
  const intacta11 = await sinCambios();
  registrar({
    id: "CP-11",
    descripcion: "Una cuenta de estudiante intenta editar la vacante",
    actor: "Estudiante",
    pasos: `PUT /api/empresa/vacantes/${idVacante} con token de estudiante`,
    datos: `correo=${cuentas.estudiante.correo}`,
    esperado: "HTTP 403 \"Acceso permitido únicamente a empresas\" y la vacante sin cambios",
    obtenido: `HTTP ${editarE.status}${mensaje(editarE)}; vacante ${intacta11 ? "sin cambios" : "MODIFICADA"}`,
    aprobado: editarE.status === 403 && intacta11
  });

  // CP-12 Sin sesión
  const sinToken = await llamar("DELETE", `/empresa/vacantes/${idVacante}`);
  const intacta12 = await sinCambios();
  registrar({
    id: "CP-12",
    descripcion: "Petición sin iniciar sesión intenta eliminar la vacante",
    actor: "Anónimo",
    pasos: `DELETE /api/empresa/vacantes/${idVacante} sin encabezado Authorization`,
    datos: "(sin token)",
    esperado: "HTTP 401 \"Debes iniciar sesión\" y la vacante sigue existiendo",
    obtenido: `HTTP ${sinToken.status}${mensaje(sinToken)}; vacante ${intacta12 ? "sigue existiendo" : "ELIMINADA"}`,
    aprobado: sinToken.status === 401 && intacta12
  });

  // CP-13 Token alterado
  const tokenFalso = `${tokenB.slice(0, -4)}abcd`;
  const alterado = await llamar("PUT", `/empresa/vacantes/${idVacante}`, { token: tokenFalso, body: vacanteAtaque });
  const intacta13 = await sinCambios();
  registrar({
    id: "CP-13",
    descripcion: "Token JWT alterado intenta editar la vacante",
    actor: "Anónimo",
    pasos: `PUT /api/empresa/vacantes/${idVacante} con la firma del token de B modificada`,
    datos: "token con los últimos 4 caracteres cambiados",
    esperado: "HTTP 401 \"Token inválido\" y la vacante sin cambios",
    obtenido: `HTTP ${alterado.status}${mensaje(alterado)}; vacante ${intacta13 ? "sin cambios" : "MODIFICADA"}`,
    aprobado: alterado.status === 401 && intacta13
  });

  // CP-14 Empresa A elimina su vacante
  const eliminarA = await llamar("DELETE", `/empresa/vacantes/${idVacante}`, { token: tokenA });
  const sigue = await buscarVacante(tokenA, idVacante);
  registrar({
    id: "CP-14",
    descripcion: "Empresa A elimina su propia vacante",
    actor: "Empresa A",
    pasos: `DELETE /api/empresa/vacantes/${idVacante} con token de Empresa A; después consulta su lista`,
    datos: `id_vacante=${idVacante}`,
    esperado: "HTTP 200 \"Vacante eliminada correctamente\" y ya no aparece en su lista",
    obtenido: `HTTP ${eliminarA.status}${mensaje(eliminarA)}; ${sigue ? "AÚN aparece" : "ya no aparece"} en la lista`,
    aprobado: eliminarA.status === 200 && !sigue
  });

  return version.datos;
};

// ----------------------------------------------------------
// Reporte
// ----------------------------------------------------------

const escaparTabla = (texto) =>
  String(texto).replace(/\|/g, "\\|").replace(/\n/g, " ");

const guardarReporte = (version, error) => {
  const fecha = new Date();
  const fechaTexto = fecha.toISOString().replace("T", " ").slice(0, 19) + " UTC";
  const aprobados = casos.filter((c) => c.resultado === "APROBADO").length;

  const carpeta = path.join(__dirname, "..", "..", "docs", "pruebas", "resultados");
  fs.mkdirSync(carpeta, { recursive: true });

  const base = `vacantes-propiedad-${fecha.toISOString().slice(0, 19).replace(/[:T]/g, "-")}`;

  const md = [
    "# Prueba: propiedad de vacantes",
    "",
    "| Dato | Valor |",
    "|---|---|",
    `| Versión de la API | ${version ? `v${version.version} (commit \`${version.commit}\`)` : "desconocida"} |`,
    `| Servidor probado | ${API_URL} |`,
    `| Fecha de ejecución | ${fechaTexto} |`,
    `| Resultado | **${aprobados} de ${casos.length} casos aprobados**${error ? ` — ejecución interrumpida: ${error}` : ""} |`,
    "",
    "## Cuentas de prueba",
    "",
    "| Actor | Correo | Contraseña |",
    "|---|---|---|",
    `| Empresa A | ${cuentas.empresaA.correo} | ${PASSWORD} |`,
    `| Empresa B | ${cuentas.empresaB.correo} | ${PASSWORD} |`,
    `| Estudiante | ${cuentas.estudiante.correo} | ${PASSWORD} |`,
    "",
    "## Casos",
    "",
    "| ID | Caso | Actor | Pasos | Datos | Resultado esperado | Resultado obtenido | Estado |",
    "|---|---|---|---|---|---|---|---|",
    ...casos.map((c) =>
      `| ${c.id} | ${escaparTabla(c.descripcion)} | ${c.actor} | ${escaparTabla(c.pasos)} | ${escaparTabla(c.datos)} | ${escaparTabla(c.esperado)} | ${escaparTabla(c.obtenido)} | ${c.resultado === "APROBADO" ? "✅ Aprobado" : "❌ Fallido"} |`
    ),
    ""
  ].join("\n");

  fs.writeFileSync(path.join(carpeta, `${base}.md`), md);
  fs.writeFileSync(
    path.join(carpeta, `${base}.json`),
    JSON.stringify({ version, servidor: API_URL, fecha: fecha.toISOString(), cuentas: Object.fromEntries(Object.entries(cuentas).map(([k, v]) => [k, v.correo])), casos }, null, 2)
  );

  console.log(`\n${aprobados}/${casos.length} casos aprobados.`);
  console.log(`Reporte: docs/pruebas/resultados/${base}.md`);

  return aprobados === casos.length && !error;
};

ejecutar()
  .then((version) => {
    process.exit(guardarReporte(version) ? 0 : 1);
  })
  .catch((error) => {
    console.error(`\nError: ${error.message}`);
    guardarReporte(null, error.message);
    process.exit(1);
  });
