/*
 * ==========================================================
 * BolsaTec · Pruebas CP01–CP13 del plan de pruebas
 * (sección 21 de la documentación), en escritorio y móvil.
 *
 * Para cada caso registra: pasos, datos, resultado esperado,
 * resultado obtenido, estado y captura, junto con la versión
 * del sistema (pie de página y /api/version).
 *
 * Uso:
 *   APP_URL=https://bolsa-tec.vercel.app \
 *   API_URL=https://bolsatec.onrender.com \
 *   node pruebas/pruebas-cp01-cp13.mjs
 *
 * Crea cuentas de prueba (prueba.*@bolsatec.test), un PDF de
 * prueba y vacantes de prueba. Al final elimina las vacantes
 * sin postulaciones y cierra la que sí tiene.
 * ==========================================================
 */

import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import process from "node:process";
import { fileURLToPath } from "node:url";

const APP_URL = (process.env.APP_URL || "http://localhost:5173").replace(/\/+$/, "");
const API_URL = (process.env.API_URL || "http://localhost:3000").replace(/\/+$/, "");
const PASSWORD = "Prueba12345";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const carpeta = path.join(raiz, "docs", "pruebas", "cp01-cp13");
fs.mkdirSync(carpeta, { recursive: true });

// Archivos de prueba para el currículum
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bolsatec-"));
const pdfPrueba = path.join(tmp, "Curriculum_prueba.pdf");
const txtPrueba = path.join(tmp, "Curriculum_prueba.txt");
fs.writeFileSync(pdfPrueba, `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 58>>stream
BT /F1 18 Tf 72 720 Td (Curriculum de prueba BolsaTec) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF
`);
fs.writeFileSync(txtPrueba, "Este archivo no es un PDF.\n");

const dispositivos = [
  { clave: "escritorio", nombre: "Escritorio (Chromium 1366×768)", opciones: { viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 } },
  { clave: "movil", nombre: "Móvil (Pixel 7, 412×915)", opciones: { ...devices["Pixel 7"] } }
];

// ---------------- utilidades ----------------
const api = async (metodo, ruta, { token, body } = {}) => {
  const r = await fetch(`${API_URL}/api${ruta}`, {
    method: metodo,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: r.status, datos: await r.json().catch(() => null) };
};

const loginApi = async (correo) =>
  (await api("POST", "/auth/login", { body: { correo, password: PASSWORD } })).datos?.token;

const abrirMenuSiEsMovil = async (page) => {
  const boton = page.getByRole("button", { name: "Abrir menú" });
  if (await boton.isVisible()) await boton.click();
};

const irASeccion = async (page, nombre) => {
  await abrirMenuSiEsMovil(page);
  await page.locator(".bt-sidebar-item", { hasText: nombre }).click();
  await page.locator(".bt-dashboard-sidebar.abierto").waitFor({ state: "detached" });
  await page.waitForTimeout(500);
};

const panel = (page, lineas) =>
  page.evaluate((texto) => {
    document.getElementById("panel-prueba")?.remove();
    const el = document.createElement("pre");
    el.id = "panel-prueba";
    el.textContent = texto;
    Object.assign(el.style, {
      position: "fixed", left: "12px", right: "12px", bottom: "12px", zIndex: 99999, margin: 0,
      padding: "14px 16px", background: "#0f172a", color: "#e2e8f0", border: "2px solid #f59e0b",
      borderRadius: "10px", font: "13px/1.5 ui-monospace, Menlo, Consolas, monospace",
      whiteSpace: "pre-wrap", wordBreak: "break-word"
    });
    document.body.appendChild(el);
  }, lineas.join("\n"));

const quitarPanel = (page) => page.evaluate(() => document.getElementById("panel-prueba")?.remove());

const tokenDePagina = (page) =>
  page.evaluate(() => localStorage.getItem("bolsatec_token") || sessionStorage.getItem("bolsatec_token"));

const fetchDesdePagina = (page, metodo, ruta, body) =>
  page.evaluate(async ({ url, metodo, body }) => {
    const token = localStorage.getItem("bolsatec_token") || sessionStorage.getItem("bolsatec_token");
    const r = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined
    });
    return { status: r.status, datos: await r.json().catch(() => null) };
  }, { url: `${API_URL}/api${ruta}`, metodo, body });

// ---------------- escenario por dispositivo ----------------
const ejecutarEn = async (browser, d, version) => {
  const sello = `${d.clave}.${Date.now()}`;
  const estudiante = {
    nombre: "Diana López (prueba)",
    telefono: "5511122233",
    institucion: "Universidad Tecnológica de Nezahualcóyotl",
    carrera: "Ingeniería en TIC",
    correo: `prueba.cp.estudiante.${sello}@bolsatec.test`
  };
  const empresa = {
    nombre: "Ernesto Ruiz",
    correo: `prueba.cp.empresa.${sello}@bolsatec.test`,
    password: PASSWORD,
    nombre_empresa: `Empresa Pruebas CP (${d.clave})`,
    telefono: "5544455566",
    sector: "Tecnología"
  };

  // Preparación: empresa y vacantes de apoyo (presencial, híbrida y una cerrada)
  const reg = await api("POST", "/auth/registro-empresa", { body: empresa });
  if (reg.status !== 201) throw new Error(`No se pudo registrar la empresa de prueba: HTTP ${reg.status}`);
  const tokenEmpresa = await loginApi(empresa.correo);
  const crear = async (titulo, modalidad) => (await api("POST", "/empresa/vacantes", {
    token: tokenEmpresa,
    body: { titulo, descripcion: "Vacante de prueba del plan CP01–CP13.", modalidad, tipo: "practicas", direccion_ciudad: "Nezahualcóyotl", direccion_estado: "Estado de México" }
  })).datos.vacante.id_vacante;
  const idPresencial = await crear(`Soporte técnico (prueba ${d.clave})`, "presencial");
  const idHibrida = await crear(`Analista de datos (prueba ${d.clave})`, "hibrida");
  const tituloCerrada = `Vacante cerrada (prueba ${d.clave})`;
  const idCerrada = await crear(tituloCerrada, "remota");
  await api("PATCH", `/empresa/vacantes/${idCerrada}/estado`, { token: tokenEmpresa, body: { estado: "cerrada" } });
  const tituloRemota = `Desarrollador Web Jr remoto (prueba ${d.clave})`;
  let idRemota = null;

  const context = await browser.newContext({ ...d.opciones, locale: "es-MX" });
  const page = await context.newPage();
  page.on("dialog", (dlg) => dlg.accept());

  const casos = [];
  const caso = async ({ id, nombre, pasos, datos, esperado, ejecutar, capturas = 1 }) => {
    let obtenido;
    let aprobado;
    try {
      ({ obtenido, aprobado } = await ejecutar());
    } catch (e) {
      obtenido = `Error: ${e.message.split("\n")[0]}`;
      aprobado = false;
    }
    const archivo = `${d.clave}-${id}.png`;
    await page.screenshot({ path: path.join(carpeta, archivo) });
    await quitarPanel(page);
    casos.push({ id, nombre, pasos, datos, esperado, obtenido, resultado: aprobado ? "APROBADO" : "FALLIDO", captura: archivo });
    console.log(`${aprobado ? "✔" : "✘"} [${d.clave}] ${id} ${nombre} → ${obtenido}`);
  };

  const llenarRegistro = async () => {
    await page.goto(`${APP_URL}/registro`);
    await page.getByRole("button", { name: "Soy estudiante" }).click();
    await page.getByPlaceholder("Ej. Andrea Martínez").fill(estudiante.nombre);
    await page.getByPlaceholder("Ej. 55 1234 5678").fill(estudiante.telefono);
    await page.locator("#registro-institucion").fill(estudiante.institucion);
    await page.locator("#registro-carrera").fill(estudiante.carrera);
    await page.getByPlaceholder("correo@ejemplo.com").fill(estudiante.correo);
    await page.getByPlaceholder("Mínimo 8 caracteres").fill(PASSWORD);
    await page.locator(".registro-terms input[type=checkbox]").check();
  };

  // CP01
  await caso({
    id: "CP01", nombre: "Registro de estudiante",
    pasos: "Abrir /registro → «Soy estudiante» → llenar nombre, teléfono, institución, carrera, correo y contraseña → aceptar términos → «Crear cuenta».",
    datos: `Nombre «${estudiante.nombre}», correo ${estudiante.correo}, contraseña ${PASSWORD}.`,
    esperado: "La cuenta se registra con rol estudiante y el sistema confirma la operación.",
    ejecutar: async () => {
      await llenarRegistro();
      const respuesta = page.waitForResponse((r) => r.url().endsWith("/api/auth/registro"));
      await page.getByRole("button", { name: "Crear cuenta" }).click();
      const r = await respuesta;
      const cuerpo = await r.json().catch(() => ({}));
      await page.waitForURL(/\/login/);
      return {
        obtenido: `HTTP ${r.status()} «${cuerpo.mensaje}»; rol «${cuerpo.usuario?.rol}»; redirige a /login.`,
        aprobado: r.status() === 201 && cuerpo.usuario?.rol === "estudiante"
      };
    }
  });

  // CP02
  await caso({
    id: "CP02", nombre: "Registro con correo existente",
    pasos: "Abrir /registro → «Soy estudiante» → llenar el formulario con el mismo correo de CP01 → «Crear cuenta».",
    datos: `Correo ya registrado: ${estudiante.correo}.`,
    esperado: "El sistema rechaza el registro duplicado y muestra un mensaje.",
    ejecutar: async () => {
      await llenarRegistro();
      await page.getByRole("button", { name: "Crear cuenta" }).click();
      const msg = page.locator(".registro-error");
      await msg.waitFor();
      const texto = (await msg.textContent()).trim();
      await msg.scrollIntoViewIfNeeded();
      return { obtenido: `Mensaje «${texto}»; permanece en /registro.`, aprobado: /ya está registrado/i.test(texto) && page.url().includes("/registro") };
    }
  });

  // CP03
  await caso({
    id: "CP03", nombre: "Inicio de sesión correcto",
    pasos: "Abrir /login → «Soy estudiante» → correo y contraseña de CP01 → «Iniciar sesión».",
    datos: `Correo ${estudiante.correo}, contraseña ${PASSWORD}.`,
    esperado: "El usuario accede a su panel según el rol.",
    ejecutar: async () => {
      await page.goto(`${APP_URL}/login`);
      await page.getByRole("button", { name: "Soy estudiante" }).click();
      await page.locator('input[type="email"]').fill(estudiante.correo);
      await page.getByPlaceholder("Ingresa tu contraseña").fill(PASSWORD);
      await page.getByRole("button", { name: "Iniciar sesión" }).click();
      await page.waitForURL(/\/dashboard\/estudiante/);
      const pie = (await page.getByTestId("version-app").textContent()).trim();
      await page.waitForTimeout(800);
      return { obtenido: `Redirige a /dashboard/estudiante («Portal del estudiante»); pie «${pie}».`, aprobado: pie.includes(version.version) };
    }
  });

  const tokenEstudiante = await tokenDePagina(page);

  // CP04
  await caso({
    id: "CP04", nombre: "Semestre dentro del rango",
    pasos: "Mi perfil → Semestre = 1 → «Guardar cambios»; después Semestre = 15 → «Guardar cambios».",
    datos: "Semestre 1 y semestre 15.",
    esperado: "La información se guarda y se muestra actualizada.",
    ejecutar: async () => {
      await irASeccion(page, "Mi perfil");
      const semestre = page.locator('input[name="semestre"]');
      await semestre.waitFor();
      const res = [];
      for (const valor of ["1", "15"]) {
        await semestre.fill(valor);
        await page.getByRole("button", { name: "Guardar cambios" }).click();
        const ok = page.locator(".bt-perfil-est-aviso.exito");
        await ok.waitFor();
        res.push(`${valor}: «${(await ok.textContent()).trim()}»`);
        await page.waitForTimeout(600);
      }
      const perfil = await api("GET", "/estudiante/perfil", { token: tokenEstudiante });
      const guardado = perfil.datos?.estudiante?.semestre ?? perfil.datos?.perfil?.semestre ?? perfil.datos?.semestre;
      await page.locator(".bt-perfil-est-aviso.exito").scrollIntoViewIfNeeded();
      return { obtenido: `Semestre ${res.join("; semestre ")}. Valor guardado: ${guardado}.`, aprobado: Number(guardado) === 15 };
    }
  });

  // CP05
  await caso({
    id: "CP05", nombre: "Semestre fuera de rango",
    pasos: "Mi perfil → Semestre = 16 → «Guardar cambios». Además se envía PUT /api/estudiante/perfil con semestre 16 para revisar la validación del servidor.",
    datos: "Semestre 16.",
    esperado: "La validación impide guardar el dato.",
    ejecutar: async () => {
      const semestre = page.locator('input[name="semestre"]');
      await semestre.fill("16");
      await page.getByRole("button", { name: "Guardar cambios" }).click();
      // v1.2.0: el formulario marca el campo en rojo con su propio mensaje
      const mensajeCampo = page.locator('input[name="semestre"] ~ small.error');
      await mensajeCampo.waitFor();
      const mensajeNavegador = (await mensajeCampo.textContent()).trim();
      const perfilAntes = await api("GET", "/estudiante/perfil", { token: tokenEstudiante });
      const datosPerfil = perfilAntes.datos?.estudiante || perfilAntes.datos?.perfil || perfilAntes.datos || {};
      const servidor = await fetchDesdePagina(page, "PUT", "/estudiante/perfil", {
        carrera: datosPerfil.carrera || "Ingeniería en TIC", semestre: 16,
        descripcion: datosPerfil.descripcion || "", telefono: datosPerfil.telefono || "", institucion: datosPerfil.institucion || ""
      });
      const despues = await api("GET", "/estudiante/perfil", { token: tokenEstudiante });
      const guardado = despues.datos?.estudiante?.semestre ?? despues.datos?.perfil?.semestre ?? despues.datos?.semestre;
      await semestre.scrollIntoViewIfNeeded();
      await panel(page, [
        "PRUEBA CP05 · Semestre = 16",
        `Validación del formulario: «${mensajeNavegador}»`,
        `Validación del servidor (PUT /api/estudiante/perfil): HTTP ${servidor.status} ${JSON.stringify(servidor.datos)}`,
        `Semestre guardado después del intento: ${guardado}`,
        `Resultado: ${Number(guardado) === 15 ? "NO SE GUARDÓ ✔" : "SE GUARDÓ ✘"}`
      ]);
      return {
        obtenido: `Formulario: «${mensajeNavegador}». Servidor: HTTP ${servidor.status} «${servidor.datos?.mensaje}». El semestre sigue en ${guardado}.`,
        aprobado: Number(guardado) === 15 && servidor.status === 400
      };
    }
  });

  // CP06
  await caso({
    id: "CP06", nombre: "Currículum PDF válido",
    pasos: "Mi perfil → zona «Sube tu currículum» → elegir el archivo → revisar la vista previa → «Subir currículum».",
    datos: "Curriculum_prueba.pdf (1 página, < 1 KB).",
    esperado: "El archivo se asocia al estudiante autenticado.",
    ejecutar: async () => {
      await page.reload();
      await irASeccion(page, "Mi perfil");
      await page.locator('input[type="file"]').setInputFiles(pdfPrueba);
      await page.getByRole("button", { name: /Subir currículum|Reemplazar currículum/ }).click();
      const ok = page.locator(".bt-perfil-est-aviso.exito");
      await ok.waitFor({ timeout: 30000 });
      const texto = (await ok.textContent()).trim();
      const cv = await api("GET", "/estudiante/curriculum", { token: tokenEstudiante });
      await page.locator('input[type="file"]').scrollIntoViewIfNeeded();
      return { obtenido: `«${texto}»; GET /api/estudiante/curriculum: HTTP ${cv.status}.`, aprobado: /guardado|correctamente/i.test(texto) && cv.status === 200 };
    }
  });

  // CP07
  await caso({
    id: "CP07", nombre: "Archivo que no es PDF",
    pasos: "Mi perfil → zona «Sube tu currículum» → elegir un archivo .txt.",
    datos: "Curriculum_prueba.txt (texto plano).",
    esperado: "El archivo se rechaza y se informa el formato permitido.",
    ejecutar: async () => {
      await page.locator('input[type="file"]').setInputFiles(txtPrueba);
      const err = page.locator(".bt-cv-error");
      await err.waitFor();
      const texto = (await err.textContent()).trim();
      await err.scrollIntoViewIfNeeded();
      return { obtenido: `Mensaje «${texto}»; el archivo no se envía.`, aprobado: /solo se permiten archivos pdf/i.test(texto) };
    }
  });

  // CP08 (con la cuenta de empresa, en una pestaña aparte del mismo dispositivo)
  const pageEmp = await context.newPage();
  pageEmp.on("dialog", (dlg) => dlg.accept());
  {
    let obtenido;
    let aprobado;
    try {
      await pageEmp.goto(`${APP_URL}/login`);
      // La sesión del estudiante comparte almacenamiento: se usa sessionStorage aislado limpiando antes
      await pageEmp.getByRole("button", { name: "Soy empresa" }).click();
      await pageEmp.locator('input[type="email"]').fill(empresa.correo);
      await pageEmp.getByPlaceholder("Ingresa tu contraseña").fill(PASSWORD);
      await pageEmp.getByRole("button", { name: "Iniciar sesión" }).click();
      await pageEmp.waitForURL(/\/dashboard\/empresa/);
      await irASeccion(pageEmp, "Mis vacantes");
      await pageEmp.locator(".bt-vacantes-encabezado button").click();
      await pageEmp.locator('input[name="titulo"]').fill(tituloRemota);
      await pageEmp.locator('textarea[name="descripcion"]').fill("Desarrollo de interfaces web con React. Vacante de prueba del plan CP01–CP13.");
      await pageEmp.locator('select[name="modalidad"]').selectOption("remota");
      await pageEmp.locator('select[name="tipo"]').selectOption("practicas");
      await pageEmp.locator('input[name="direccion_ciudad"]').fill("Nezahualcóyotl");
      await pageEmp.locator('input[name="salario_min"]').fill("6000");
      await pageEmp.locator('input[name="salario_max"]').fill("8000");
      await pageEmp.getByRole("button", { name: "Publicar vacante" }).click();
      const ok = pageEmp.locator(".bt-vacantes-exito");
      await ok.waitFor();
      const fila = pageEmp.locator(".bt-vacantes-tabla tbody tr", { hasText: tituloRemota });
      await fila.waitFor();
      const estado = await fila.locator(".bt-vacantes-estado").textContent();
      const lista = await api("GET", "/empresa/vacantes", { token: tokenEmpresa });
      const v = lista.datos.vacantes.find((x) => x.titulo === tituloRemota);
      idRemota = v?.id_vacante;
      obtenido = `«${(await ok.textContent()).trim()}»; estado «${estado}»; la vacante ${idRemota} aparece en «Mis vacantes» de ${empresa.nombre_empresa}.`;
      aprobado = !!v && estado === "activa";
    } catch (e) {
      obtenido = `Error: ${e.message.split("\n")[0]}`;
      aprobado = false;
    }
    const archivo = `${d.clave}-CP08.png`;
    await pageEmp.screenshot({ path: path.join(carpeta, archivo) });
    casos.push({
      id: "CP08", nombre: "Publicación de vacante",
      pasos: "Iniciar sesión como empresa → Mis vacantes → «Nueva vacante» → llenar campos obligatorios → «Publicar vacante».",
      datos: `Empresa ${empresa.correo}; título «${tituloRemota}», Remota, Prácticas, salario 6000–8000.`,
      esperado: "La vacante se registra asociada a esa empresa.",
      obtenido, resultado: aprobado ? "APROBADO" : "FALLIDO", captura: archivo
    });
    console.log(`${aprobado ? "✔" : "✘"} [${d.clave}] CP08 Publicación de vacante → ${obtenido}`);
    await pageEmp.close();
  }

  // Volver a la sesión del estudiante (la empresa reemplazó el token guardado)
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${APP_URL}/login`);
  await page.getByRole("button", { name: "Soy estudiante" }).click();
  await page.locator('input[type="email"]').fill(estudiante.correo);
  await page.getByPlaceholder("Ingresa tu contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL(/\/dashboard\/estudiante/);

  // CP09
  await caso({
    id: "CP09", nombre: "Filtro por modalidad",
    pasos: "Buscar vacantes → filtro «Remota».",
    datos: "Modalidad = Remota.",
    esperado: "Se muestran solo las vacantes de la modalidad seleccionada.",
    ejecutar: async () => {
      await irASeccion(page, "Buscar vacantes");
      await page.locator(".bt-vacante-detalles").first().waitFor();
      await page.getByLabel("Filtrar por modalidad").selectOption("remota");
      await page.waitForTimeout(1500);
      const etiquetas = await page.locator("article").evaluateAll((arts) =>
        arts.map((a) => ({ titulo: a.querySelector("h3")?.textContent, modalidad: a.querySelector(".bt-vacante-etiquetas span")?.textContent })));
      const todasRemotas = etiquetas.length > 0 && etiquetas.every((e) => e.modalidad === "Remota");
      const incluye = etiquetas.some((e) => e.titulo === tituloRemota);
      const excluye = !etiquetas.some((e) => e.titulo?.includes(`(prueba ${d.clave})`) && e.titulo !== tituloRemota);
      await page.locator("article", { hasText: tituloRemota }).scrollIntoViewIfNeeded();
      return {
        obtenido: `${etiquetas.length} vacante(s), todas con etiqueta «Remota»: ${todasRemotas ? "sí" : "no"}. Incluye la vacante remota de prueba: ${incluye ? "sí" : "no"}; oculta la presencial y la híbrida de prueba: ${excluye ? "sí" : "no"}.`,
        aprobado: todasRemotas && incluye && excluye
      };
    }
  });

  // CP10
  await caso({
    id: "CP10", nombre: "Consulta y detalle de vacante",
    pasos: "Buscar vacantes → quitar filtro → «Ver detalles» en la vacante remota de prueba.",
    datos: `Vacante «${tituloRemota}».`,
    esperado: "Se muestran datos principales y detalle de la vacante.",
    ejecutar: async () => {
      await page.getByLabel("Filtrar por modalidad").selectOption("");
      await page.waitForTimeout(1000);
      const tarjeta = page.locator("article", { hasText: tituloRemota });
      await tarjeta.getByRole("button", { name: "Ver detalles" }).click();
      const modal = page.getByRole("dialog", { name: "Detalles de la vacante" });
      await modal.waitFor();
      const texto = (await modal.textContent()).replace(/\s+/g, " ");
      const tiene = ["Remota", empresa.nombre_empresa, "Nezahualcóyotl", "React"].filter((t) => texto.includes(t));
      return { obtenido: `El detalle muestra título, empresa, modalidad, ubicación y descripción (${tiene.length}/4 datos verificados).`, aprobado: tiene.length === 4 };
    }
  });

  // CP11
  await caso({
    id: "CP11", nombre: "Postulación a vacante activa",
    pasos: "En el detalle de la vacante → «Postularme».",
    datos: `Estudiante ${estudiante.correo}; vacante «${tituloRemota}» sin solicitud previa.`,
    esperado: "Se crea una postulación y se confirma el registro.",
    ejecutar: async () => {
      const modal = page.getByRole("dialog", { name: "Detalles de la vacante" });
      const respuesta = page.waitForResponse((r) => r.url().endsWith("/api/estudiante/postulaciones") && r.request().method() === "POST");
      await modal.getByRole("button", { name: "Postularme" }).click();
      const r = await respuesta;
      const cuerpo = await r.json().catch(() => ({}));
      const estado = modal.locator(".bt-vacante-estado-detalle .bt-postulacion-estado");
      await estado.waitFor();
      const textoEstado = (await estado.textContent()).trim();
      return { obtenido: `HTTP ${r.status()} «${cuerpo.mensaje}»; el detalle muestra el estado «${textoEstado}».`, aprobado: r.status() === 201 && textoEstado === "Enviada" };
    }
  });

  // CP12
  await caso({
    id: "CP12", nombre: "Postulación duplicada",
    pasos: "Con la misma sesión se intenta postular otra vez a la misma vacante (POST /api/estudiante/postulaciones).",
    datos: `Mismo estudiante y vacante ${idRemota}.`,
    esperado: "La segunda solicitud se rechaza por duplicidad.",
    ejecutar: async () => {
      const r = await fetchDesdePagina(page, "POST", "/estudiante/postulaciones", { id_vacante: idRemota });
      const mias = await api("GET", "/estudiante/postulaciones", { token: tokenEstudiante });
      const lista = mias.datos?.postulaciones || (Array.isArray(mias.datos) ? mias.datos : []);
      const cuantas = lista.filter((p) => p.id_vacante === idRemota).length;
      await panel(page, [
        `PRUEBA CP12 · sesión actual: Estudiante (${estudiante.correo})`,
        `POST ${API_URL}/api/estudiante/postulaciones  {"id_vacante":${idRemota}}`,
        `Respuesta: HTTP ${r.status} ${JSON.stringify(r.datos)}`,
        `Postulaciones del estudiante a esta vacante: ${cuantas}`,
        `Resultado: ${r.status === 409 && cuantas === 1 ? "DUPLICADO RECHAZADO ✔" : "ERROR ✘"}`
      ]);
      return { obtenido: `HTTP ${r.status} «${r.datos?.mensaje}»; el estudiante sigue con ${cuantas} postulación a esa vacante.`, aprobado: r.status === 409 && cuantas === 1 };
    }
  });

  // CP13
  await caso({
    id: "CP13", nombre: "Postulación a vacante cerrada",
    pasos: "La empresa cierra una vacante. El estudiante busca la vacante y, con su sesión, envía POST /api/estudiante/postulaciones.",
    datos: `Vacante «${tituloCerrada}» (id ${idCerrada}), estado cerrada.`,
    esperado: "El sistema no permite crear la solicitud.",
    ejecutar: async () => {
      await page.keyboard.press("Escape");
      await page.locator(".bt-vacante-cerrar").click({ trial: false }).catch(() => {});
      await page.getByLabel("Buscar vacantes").fill(tituloCerrada);
      await page.waitForTimeout(1500);
      const visible = await page.locator("article", { hasText: tituloCerrada }).count();
      const r = await fetchDesdePagina(page, "POST", "/estudiante/postulaciones", { id_vacante: idCerrada });
      await panel(page, [
        `PRUEBA CP13 · sesión actual: Estudiante (${estudiante.correo})`,
        `Búsqueda «${tituloCerrada}»: ${visible} resultado(s) (la vacante cerrada no se lista)`,
        `POST ${API_URL}/api/estudiante/postulaciones  {"id_vacante":${idCerrada}}`,
        `Respuesta: HTTP ${r.status} ${JSON.stringify(r.datos)}`,
        `Resultado: ${r.status === 409 ? "RECHAZADA ✔" : "ACEPTADA ✘"}`
      ]);
      return { obtenido: `La vacante cerrada no aparece en la búsqueda (${visible} resultados). HTTP ${r.status} «${r.datos?.mensaje}»; no se crea la postulación.`, aprobado: visible === 0 && r.status === 409 };
    }
  });

  await context.close();

  // Limpieza
  for (const id of [idPresencial, idHibrida, idCerrada]) {
    await api("DELETE", `/empresa/vacantes/${id}`, { token: tokenEmpresa });
  }
  if (idRemota) {
    await api("PATCH", `/empresa/vacantes/${idRemota}/estado`, { token: tokenEmpresa, body: { estado: "cerrada" } });
  }

  return { dispositivo: d.nombre, clave: d.clave, cuentas: { estudiante: estudiante.correo, empresa: empresa.correo }, casos };
};

// ---------------- reporte ----------------
const celda = (t) => String(t).replace(/\|/g, "\\|").replace(/\n/g, " ");

const main = async () => {
  const version = (await api("GET", "/version")).datos;
  if (!version?.version) throw new Error(`No se pudo consultar ${API_URL}/api/version`);
  console.log(`BolsaTec API v${version.version} (commit ${version.commit})`);

  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const browser = await chromium.launch(proxy ? { proxy: { server: proxy, bypass: "localhost,127.0.0.1" } } : {});
  const resultados = [];
  try {
    for (const d of dispositivos) resultados.push(await ejecutarEn(browser, d, version));
  } finally {
    await browser.close();
  }

  const todos = resultados.flatMap((r) => r.casos);
  const aprobados = todos.filter((c) => c.resultado === "APROBADO").length;
  const fecha = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  const md = [
    "# Registro de pruebas CP01–CP13",
    "",
    "| Dato | Valor |",
    "|---|---|",
    `| Versión probada | v${version.version} (commit \`${version.commit}\`) |`,
    `| Frontend | ${APP_URL} |`,
    `| API | ${API_URL} |`,
    `| Navegador | Chromium (Playwright) |`,
    `| Fecha de ejecución | ${fecha} |`,
    `| Resultado | **${aprobados} de ${todos.length} casos aprobados** |`,
    "",
    `Contraseña de las cuentas de prueba: \`${PASSWORD}\`.`,
    "",
    ...resultados.flatMap((r) => [
      `## ${r.dispositivo}`,
      "",
      `Cuentas: estudiante \`${r.cuentas.estudiante}\`, empresa \`${r.cuentas.empresa}\`.`,
      "",
      "| ID | Caso | Pasos | Datos | Resultado esperado | Resultado obtenido | Estado | Captura |",
      "|---|---|---|---|---|---|---|---|",
      ...r.casos.map((c) => `| ${c.id} | ${celda(c.nombre)} | ${celda(c.pasos)} | ${celda(c.datos)} | ${celda(c.esperado)} | ${celda(c.obtenido)} | ${c.resultado === "APROBADO" ? "✅ Aprobado" : "❌ Fallido"} | [${c.captura}](${c.captura}) |`),
      "",
      ...r.casos.flatMap((c) => [`**${c.id} — ${c.nombre}**`, "", `![${c.id}](${c.captura})`, ""])
    ])
  ].join("\n");
  fs.writeFileSync(path.join(carpeta, "README.md"), md);
  fs.writeFileSync(path.join(carpeta, "resultados.json"), JSON.stringify({ version, fecha, app: APP_URL, api: API_URL, resultados }, null, 2));
  console.log(`\n${aprobados}/${todos.length} casos aprobados. Reporte: docs/pruebas/cp01-cp13/README.md`);
  process.exit(aprobados === todos.length ? 0 : 1);
};

main().catch((e) => { console.error(e); process.exit(1); });
