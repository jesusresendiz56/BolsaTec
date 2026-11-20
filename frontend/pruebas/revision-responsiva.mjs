/*
 * BolsaTec · Revisión responsiva: entra a cada sección de los
 * paneles de estudiante y empresa en un celular (Pixel 7) y en
 * escritorio, y comprueba que la página no sea más ancha que la
 * pantalla (sin desplazamiento horizontal).
 *
 * Crea un estudiante y una empresa de prueba con correos largos,
 * que es el caso que antes desbordaba la página.
 *
 * Uso: APP_URL=... API_URL=... node pruebas/revision-responsiva.mjs
 */

import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const APP_URL = (process.env.APP_URL || "http://localhost:5173").replace(/\/+$/, "");
const API_URL = (process.env.API_URL || "http://localhost:3000").replace(/\/+$/, "");
const PASSWORD = "Prueba12345";
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const carpeta = path.join(raiz, "docs", "pruebas", "responsivo");
fs.mkdirSync(carpeta, { recursive: true });

const api = async (metodo, ruta, body) => {
  const r = await fetch(`${API_URL}/api${ruta}`, {
    method: metodo, headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: r.status, datos: await r.json().catch(() => null) };
};

const sello = Date.now();
const estudiante = { nombre: "Valeria Hernández Domínguez (prueba)", correo: `prueba.responsivo.estudiante.con.correo.largo.${sello}@bolsatec.test`, password: PASSWORD, carrera: "Ingeniería en TIC", semestre: 5 };
const empresa = { nombre: "Representante de prueba", correo: `prueba.responsivo.empresa.con.correo.largo.${sello}@bolsatec.test`, password: PASSWORD, nombre_empresa: "Empresa Responsiva de Prueba", telefono: "5512345678", sector: "Tecnología" };

const roles = [
  { rol: "estudiante", cuenta: estudiante, boton: "Soy estudiante", secciones: ["Dashboard", "Mi perfil", "Buscar vacantes", "Mis postulaciones", "Notificaciones"] },
  { rol: "empresa", cuenta: empresa, boton: "Soy empresa", secciones: ["Dashboard", "Perfil empresarial", "Mis vacantes", "Candidatos", "Postulaciones", "Notificaciones"] }
];
const pantallas = [
  { clave: "movil", nombre: "Móvil (Pixel 7, 412 px)", opciones: { ...devices["Pixel 7"] } },
  { clave: "escritorio", nombre: "Escritorio (1366 px)", opciones: { viewport: { width: 1366, height: 768 } } }
];

const main = async () => {
  const version = (await api("GET", "/version")).datos;
  for (const [ruta, cuerpo] of [["/auth/registro", estudiante], ["/auth/registro-empresa", empresa]]) {
    const r = await api("POST", ruta, cuerpo);
    if (r.status !== 201) throw new Error(`Registro ${ruta}: HTTP ${r.status}`);
  }

  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const browser = await chromium.launch(proxy ? { proxy: { server: proxy, bypass: "localhost,127.0.0.1" } } : {});
  const filas = [];
  try {
    for (const pant of pantallas) {
      // Páginas públicas
      const cp = await browser.newContext({ ...pant.opciones });
      const pp = await cp.newPage();
      for (const ruta of ["/", "/login", "/registro"]) {
        await pp.goto(`${APP_URL}${ruta}`);
        await pp.waitForTimeout(1000);
        const m = await pp.evaluate(() => ({ ancho: document.documentElement.scrollWidth, anchoPantalla: document.documentElement.clientWidth }));
        filas.push({ pantalla: pant.nombre, rol: "público", seccion: ruta, ...m, ok: m.ancho <= m.anchoPantalla });
      }
      await cp.close();

      for (const r of roles) {
        const c = await browser.newContext({ ...pant.opciones });
        const p = await c.newPage();
        await p.goto(`${APP_URL}/login`);
        await p.getByRole("button", { name: r.boton }).click();
        await p.locator('input[type="email"]').fill(r.cuenta.correo);
        await p.getByPlaceholder("Ingresa tu contraseña").fill(PASSWORD);
        await p.getByRole("button", { name: "Iniciar sesión" }).click();
        await p.waitForURL(/dashboard/);
        for (const s of r.secciones) {
          const menu = p.getByRole("button", { name: "Abrir menú" });
          if (pant.clave === "movil") { await menu.click(); await p.locator(".bt-dashboard-sidebar.abierto").waitFor(); await p.waitForTimeout(450); }
          await p.locator(".bt-sidebar-item", { hasText: s }).click();
          await p.waitForTimeout(1500);
          const m = await p.evaluate(() => ({ ancho: document.documentElement.scrollWidth, anchoPantalla: document.documentElement.clientWidth }));
          const ok = m.ancho <= m.anchoPantalla;
          if (pant.clave === "movil") {
            await p.screenshot({ path: path.join(carpeta, `${r.rol}-${s.toLowerCase().replace(/\s+/g, "-")}.png`) });
          }
          filas.push({ pantalla: pant.nombre, rol: r.rol, seccion: s, ...m, ok });
        }
        await c.close();
      }
    }
  } finally {
    await browser.close();
  }

  const fallidas = filas.filter((f) => !f.ok);
  for (const f of filas) console.log(`${f.ok ? "✔" : "✘"} ${f.pantalla} · ${f.rol} · ${f.seccion}: página ${f.ancho}px / pantalla ${f.anchoPantalla}px`);
  const md = [
    "# Revisión responsiva (sin desplazamiento horizontal)",
    "",
    `Versión: v${version?.version} (commit \`${version?.commit}\`) · Frontend: ${APP_URL} · Fecha: ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`,
    "",
    "Se usan cuentas con correos largos, el caso que antes ensanchaba la página en celulares.",
    "",
    "| Pantalla | Rol | Sección | Ancho de la página | Ancho de la pantalla | Resultado |",
    "|---|---|---|---|---|---|",
    ...filas.map((f) => `| ${f.pantalla} | ${f.rol} | ${f.seccion} | ${f.ancho} px | ${f.anchoPantalla} px | ${f.ok ? "✅ Sin desborde" : "❌ Se desborda"} |`),
    "",
    `**${filas.length - fallidas.length} de ${filas.length} pantallas sin desborde.**`
  ].join("\n");
  fs.writeFileSync(path.join(carpeta, "README.md"), md);
  console.log(`\n${filas.length - fallidas.length}/${filas.length} sin desborde. Reporte: docs/pruebas/responsivo/README.md`);
  process.exit(fallidas.length ? 1 : 0);
};

main().catch((e) => { console.error(e); process.exit(1); });
