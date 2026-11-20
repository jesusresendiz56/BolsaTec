/*
 * BolsaTec · Evidencia de CP03 (inicio de sesión correcto) y
 * CP13 (postulación a una vacante cerrada) en escritorio y móvil.
 *
 * Usa cuentas de prueba ya existentes (variables de entorno):
 *   EMPRESA_CORREO, ESTUDIANTE_CORREO, PRUEBA_PASSWORD
 * La vacante de prueba que crea se elimina al final.
 */

import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const APP_URL = (process.env.APP_URL || "http://localhost:5173").replace(/\/+$/, "");
const API_URL = (process.env.API_URL || "http://localhost:3000").replace(/\/+$/, "");
const PASSWORD = process.env.PRUEBA_PASSWORD || "Prueba12345";
const EMPRESA = process.env.EMPRESA_CORREO;
const ESTUDIANTE = process.env.ESTUDIANTE_CORREO;

if (!EMPRESA || !ESTUDIANTE) {
  console.error("Faltan EMPRESA_CORREO o ESTUDIANTE_CORREO");
  process.exit(1);
}

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const carpeta = path.join(raiz, "docs", "pruebas", "evidencia");
fs.mkdirSync(carpeta, { recursive: true });

const api = async (metodo, ruta, { token, body } = {}) => {
  const r = await fetch(`${API_URL}/api${ruta}`, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: r.status, datos: await r.json().catch(() => null) };
};

const login = async (correo) =>
  (await api("POST", "/auth/login", { body: { correo, password: PASSWORD } })).datos.token;

const dispositivos = [
  { clave: "escritorio", opciones: { viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 } },
  { clave: "movil", opciones: { ...devices["Pixel 7"] } }
];

const panel = (page, lineas) =>
  page.evaluate((texto) => {
    const el = document.createElement("pre");
    el.textContent = texto;
    Object.assign(el.style, {
      position: "fixed", left: "12px", right: "12px", bottom: "12px", zIndex: 99999, margin: 0,
      padding: "14px 16px", background: "#0f172a", color: "#e2e8f0", border: "2px solid #f59e0b",
      borderRadius: "10px", font: "13px/1.5 ui-monospace, Menlo, Consolas, monospace",
      whiteSpace: "pre-wrap", wordBreak: "break-word"
    });
    document.body.appendChild(el);
  }, lineas.join("\n"));

const main = async () => {
  const version = (await api("GET", "/version")).datos;
  const tokenEmpresa = await login(EMPRESA);

  // Vacante de prueba cerrada
  const creada = await api("POST", "/empresa/vacantes", {
    token: tokenEmpresa,
    body: {
      titulo: "Vacante cerrada (prueba CP13)",
      descripcion: "Vacante de prueba para comprobar que no se aceptan postulaciones cuando está cerrada.",
      modalidad: "remota",
      tipo: "practicas"
    }
  });
  const idVacante = creada.datos.vacante.id_vacante;
  const cierre = await api("PATCH", `/empresa/vacantes/${idVacante}/estado`, {
    token: tokenEmpresa,
    body: { estado: "cerrada" }
  });

  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const browser = await chromium.launch(proxy ? { proxy: { server: proxy } } : {});
  const resultados = [];

  try {
    for (const d of dispositivos) {
      const context = await browser.newContext({ ...d.opciones, locale: "es-MX" });
      const page = await context.newPage();

      // CP03: inicio de sesión correcto
      await page.goto(`${APP_URL}/login`);
      await page.getByRole("button", { name: "Soy estudiante" }).click();
      await page.locator('input[type="email"]').fill(ESTUDIANTE);
      await page.getByPlaceholder("Ingresa tu contraseña").fill(PASSWORD);
      await page.screenshot({ path: path.join(carpeta, `cp03-${d.clave}-1.png`) });
      await page.getByRole("button", { name: "Iniciar sesión" }).click();
      await page.waitForURL(/\/dashboard\/estudiante/);
      const pie = (await page.getByTestId("version-app").textContent()).trim();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(carpeta, `cp03-${d.clave}-2.png`) });
      resultados.push({
        caso: "CP03", dispositivo: d.clave,
        obtenido: `Redirige a ${new URL(page.url()).pathname}; pie "${pie}"`,
        aprobado: page.url().includes("/dashboard/estudiante")
      });

      // CP13: postulación a vacante cerrada con la sesión del estudiante
      const tokenEstudiante = await page.evaluate(() =>
        localStorage.getItem("bolsatec_token") || sessionStorage.getItem("bolsatec_token"));
      const r = await page.evaluate(async ({ url, token, id }) => {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id_vacante: id })
        });
        return { status: res.status, datos: await res.json().catch(() => null) };
      }, { url: `${API_URL}/api/estudiante/postulaciones`, token: tokenEstudiante, id: idVacante });

      const mias = await api("GET", "/estudiante/postulaciones", { token: tokenEstudiante });
      const lista = mias.datos?.postulaciones || mias.datos || [];
      const creadaPost = Array.isArray(lista) && lista.some((p) => p.id_vacante === idVacante);

      await panel(page, [
        `PRUEBA CP13 · sesión actual: Estudiante (${ESTUDIANTE})`,
        `Vacante ${idVacante} "Vacante cerrada (prueba CP13)" · estado: cerrada`,
        `POST ${API_URL}/api/estudiante/postulaciones`,
        `Datos enviados: {"id_vacante":${idVacante}}`,
        `Respuesta: HTTP ${r.status} ${JSON.stringify(r.datos)}`,
        `¿Se creó la postulación?: ${creadaPost ? "SÍ ✘" : "NO"}`,
        `Resultado: ${r.status === 409 && !creadaPost ? "RECHAZADA ✔" : "ACEPTADA ✘"}`
      ]);
      await page.screenshot({ path: path.join(carpeta, `cp13-${d.clave}.png`) });
      resultados.push({
        caso: "CP13", dispositivo: d.clave,
        obtenido: `HTTP ${r.status} "${r.datos?.mensaje}"; postulación ${creadaPost ? "creada" : "no creada"}`,
        aprobado: r.status === 409 && !creadaPost
      });

      await context.close();
    }
  } finally {
    await browser.close();
    await api("DELETE", `/empresa/vacantes/${idVacante}`, { token: tokenEmpresa });
  }

  const salida = { version, fecha: new Date().toISOString(), app: APP_URL, api: API_URL, vacante: idVacante, cierre: cierre.status, resultados };
  fs.writeFileSync(path.join(carpeta, "cp03-cp13.json"), JSON.stringify(salida, null, 2));
  for (const r of resultados) console.log(`${r.aprobado ? "✔" : "✘"} ${r.caso} [${r.dispositivo}] ${r.obtenido}`);
  process.exit(resultados.every((r) => r.aprobado) ? 0 : 1);
};

main().catch((e) => { console.error(e); process.exit(1); });
