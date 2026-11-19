/*
 * ==========================================================
 * BolsaTec · Evidencia visual (escritorio y móvil):
 * una empresa administra sus vacantes y otra cuenta no puede
 * modificarlas.
 *
 * Requisitos: backend y frontend corriendo, y Playwright.
 *   npm install --no-save playwright
 *   npx playwright install chromium
 *
 * Uso:
 *   APP_URL=http://localhost:5173 API_URL=http://localhost:3000 \
 *     node pruebas/evidencia-vacantes.mjs
 *
 * Genera capturas y un reporte en docs/pruebas/evidencia/.
 * Ejecútalo contra una base de datos de pruebas.
 * ==========================================================
 */

import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const APP_URL = (process.env.APP_URL || "http://localhost:5173").replace(/\/+$/, "");
const API_URL = (process.env.API_URL || "http://localhost:3000").replace(/\/+$/, "");

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const carpeta = path.join(raiz, "docs", "pruebas", "evidencia");
fs.mkdirSync(carpeta, { recursive: true });

const PASSWORD = "Prueba12345";

const dispositivos = [
  {
    clave: "escritorio",
    nombre: "Escritorio (Chromium 1366×768)",
    opciones: { viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 }
  },
  {
    clave: "movil",
    nombre: "Móvil (Pixel 7, 412×915)",
    opciones: { ...devices["Pixel 7"] }
  }
];

// ----------------------------------------------------------
// Utilidades de API
// ----------------------------------------------------------

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

const registrarEmpresa = async (sufijo, nombre, nombreEmpresa) => {
  const cuenta = {
    nombre,
    correo: `prueba.${sufijo}@bolsatec.test`,
    password: PASSWORD,
    nombre_empresa: nombreEmpresa,
    telefono: "5512345678",
    sector: "Tecnología"
  };

  const r = await api("POST", "/auth/registro-empresa", { body: cuenta });

  if (r.status !== 201) {
    throw new Error(`No se pudo registrar ${nombreEmpresa}: HTTP ${r.status}`);
  }

  return cuenta;
};

// ----------------------------------------------------------
// Pasos en la interfaz
// ----------------------------------------------------------

const iniciarSesion = async (page, cuenta) => {
  await page.goto(`${APP_URL}/login`);
  await page.getByRole("button", { name: "Soy empresa" }).click();
  await page.locator('input[type="email"]').fill(cuenta.correo);
  await page.getByPlaceholder("Ingresa tu contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL(/\/dashboard\/empresa/);
  await page.getByTestId("version-app").waitFor();
};

const cerrarSesion = async (page) => {
  await abrirMenuSiEsMovil(page);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.waitForURL(/\/login/);
};

const abrirMenuSiEsMovil = async (page) => {
  const botonMenu = page.getByRole("button", { name: "Abrir menú" });

  if (await botonMenu.isVisible()) {
    await botonMenu.click();
  }
};

// En móvil el menú lateral se cierra con una animación de 0.25 s
const esperarMenuCerrado = async (page) => {
  await page.locator(".bt-dashboard-sidebar.abierto").waitFor({ state: "detached" });
  await page.waitForTimeout(400);
};

const irAMisVacantes = async (page) => {
  await abrirMenuSiEsMovil(page);
  await page.locator(".bt-sidebar-item", { hasText: "Mis vacantes" }).click();
  await esperarMenuCerrado(page);
  await page.getByRole("heading", { name: "Mis vacantes" }).waitFor();
  await page.locator(".bt-vacantes-tabla tbody tr").first().waitFor();
  await page.waitForFunction(
    () => !document.querySelector(".bt-vacantes-tabla tbody")?.textContent.includes("Cargando")
  );
};

const token = (page) =>
  page.evaluate(() =>
    localStorage.getItem("bolsatec_token") ||
    sessionStorage.getItem("bolsatec_token")
  );

// Muestra en pantalla la petición hecha desde la sesión actual
// y la respuesta del servidor (para que aparezca en la captura).
const mostrarPanelPrueba = async (page, lineas) => {
  await page.evaluate((contenido) => {
    document.getElementById("panel-prueba")?.remove();
    const panel = document.createElement("pre");
    panel.id = "panel-prueba";
    panel.textContent = contenido;
    Object.assign(panel.style, {
      position: "fixed",
      left: "12px",
      right: "12px",
      bottom: "12px",
      zIndex: 99999,
      margin: 0,
      padding: "14px 16px",
      background: "#0f172a",
      color: "#e2e8f0",
      border: "2px solid #f59e0b",
      borderRadius: "10px",
      font: "13px/1.5 ui-monospace, Menlo, Consolas, monospace",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      boxShadow: "0 10px 30px rgba(0,0,0,.35)"
    });
    document.body.appendChild(panel);
  }, lineas.join("\n"));
};

const quitarPanelPrueba = (page) =>
  page.evaluate(() => document.getElementById("panel-prueba")?.remove());

// ----------------------------------------------------------
// Escenario por dispositivo
// ----------------------------------------------------------

const ejecutarEn = async (browser, dispositivo, version) => {
  const sello = `${dispositivo.clave}.${Date.now()}`;
  const empresaA = await registrarEmpresa(`empresa.a.${sello}`, "Ana Torres", "Empresa A (prueba)");
  const empresaB = await registrarEmpresa(`empresa.b.${sello}`, "Bruno Díaz", "Empresa B (prueba)");

  const titulo = `Desarrollador Web Jr (${dispositivo.clave})`;
  const tituloEditado = `${titulo} EDITADA`;

  const context = await browser.newContext({ ...dispositivo.opciones, locale: "es-MX" });
  const page = await context.newPage();
  page.on("dialog", (d) => d.accept());

  const pasos = [];
  let n = 0;

  const paso = async ({ caso, accion, datos, esperado, comprobar }) => {
    n += 1;
    const archivo = `${dispositivo.clave}-${String(n).padStart(2, "0")}.png`;
    let obtenido;
    let aprobado;

    try {
      ({ obtenido, aprobado } = await comprobar());
    } catch (error) {
      obtenido = `Error: ${error.message.split("\n")[0]}`;
      aprobado = false;
    }

    await page.screenshot({ path: path.join(carpeta, archivo) });
    pasos.push({ caso, accion, datos, esperado, obtenido, resultado: aprobado ? "APROBADO" : "FALLIDO", captura: archivo });
    console.log(`${aprobado ? "✔" : "✘"} [${dispositivo.clave}] ${caso} ${accion} → ${obtenido}`);
  };

  const filaVacante = (texto) =>
    page.locator(".bt-vacantes-tabla tbody tr", { hasText: texto });

  // 1. Empresa A inicia sesión
  await paso({
    caso: "CP-01",
    accion: "Empresa A inicia sesión en /login (\"Soy empresa\")",
    datos: `correo=${empresaA.correo}`,
    esperado: "Entra al portal empresarial y se ve la versión de la app",
    comprobar: async () => {
      await iniciarSesion(page, empresaA);
      const textoVersion = await page.getByTestId("version-app").textContent();
      return {
        obtenido: `Portal empresarial abierto; pie: "${textoVersion.trim()}"`,
        aprobado: page.url().includes("/dashboard/empresa") && textoVersion.includes(version.version)
      };
    }
  });

  // 2. Publicar vacante
  await paso({
    caso: "CP-02",
    accion: "Empresa A → Mis vacantes → Nueva vacante → Publicar",
    datos: `titulo="${titulo}", modalidad=Híbrida, tipo=Prácticas, salario 6000–8000`,
    esperado: "Mensaje \"Vacante publicada correctamente\" y la vacante aparece \"activa\"",
    comprobar: async () => {
      await irAMisVacantes(page);
      await page.locator(".bt-vacantes-encabezado button").click();
      await page.locator('input[name="titulo"]').fill(titulo);
      await page.locator('textarea[name="descripcion"]').fill("Vacante creada para la demostración de propiedad de vacantes.");
      await page.locator('select[name="modalidad"]').selectOption("hibrida");
      await page.locator('select[name="tipo"]').selectOption("practicas");
      await page.locator('input[name="direccion_ciudad"]').fill("Iztacalco");
      await page.locator('input[name="salario_min"]').fill("6000");
      await page.locator('input[name="salario_max"]').fill("8000");
      await page.getByRole("button", { name: "Publicar vacante" }).click();
      const exito = page.locator(".bt-vacantes-exito");
      await exito.waitFor();
      await filaVacante(titulo).waitFor();
      const estado = await filaVacante(titulo).locator(".bt-vacantes-estado").textContent();
      const texto = (await exito.textContent()).trim();
      return {
        obtenido: `"${texto}"; estado en la tabla: "${estado}"`,
        aprobado: texto.includes("publicada") && estado === "activa"
      };
    }
  });

  // 3. Editar vacante
  await paso({
    caso: "CP-04",
    accion: "Empresa A → botón Editar → cambia título y salario → Guardar cambios",
    datos: `titulo="${tituloEditado}", salario_max=9000`,
    esperado: "Mensaje \"Vacante actualizada correctamente\" y el nuevo título en la tabla",
    comprobar: async () => {
      await page.getByRole("button", { name: `Editar ${titulo}` }).click();
      await page.locator('input[name="titulo"]').fill(tituloEditado);
      await page.locator('input[name="salario_max"]').fill("9000");
      await page.getByRole("button", { name: "Guardar cambios" }).click();
      await filaVacante(tituloEditado).waitFor();
      const texto = (await page.locator(".bt-vacantes-exito").textContent()).trim();
      return {
        obtenido: `"${texto}"; la tabla muestra "${tituloEditado}"`,
        aprobado: texto.includes("actualizada")
      };
    }
  });

  // 4. Pausar vacante
  await paso({
    caso: "CP-05",
    accion: "Empresa A → botón Pausar → confirmar",
    datos: "estado=pausada",
    esperado: "La vacante cambia a \"pausada\"",
    comprobar: async () => {
      await page.getByRole("button", { name: `Pausar ${tituloEditado}` }).click();
      await page.waitForFunction(
        (t) => [...document.querySelectorAll(".bt-vacantes-tabla tbody tr")]
          .some((tr) => tr.textContent.includes(t) && tr.querySelector(".bt-vacantes-estado")?.textContent === "pausada"),
        tituloEditado
      );
      return { obtenido: "Estado en la tabla: \"pausada\"", aprobado: true };
    }
  });

  // 5. Reactivar vacante
  await paso({
    caso: "CP-06",
    accion: "Empresa A → botón Activar → confirmar",
    datos: "estado=activa",
    esperado: "La vacante vuelve a \"activa\"",
    comprobar: async () => {
      await page.getByRole("button", { name: `Activar ${tituloEditado}` }).click();
      await page.waitForFunction(
        (t) => [...document.querySelectorAll(".bt-vacantes-tabla tbody tr")]
          .some((tr) => tr.textContent.includes(t) && tr.querySelector(".bt-vacantes-estado")?.textContent === "activa"),
        tituloEditado
      );
      return { obtenido: "Estado en la tabla: \"activa\"", aprobado: true };
    }
  });

  const tokenA = await token(page);
  const listaA = await api("GET", "/empresa/vacantes", { token: tokenA });
  const vacante = listaA.datos.vacantes.find((v) => v.titulo === tituloEditado);
  const idVacante = vacante.id_vacante;

  await cerrarSesion(page);

  // 6. Empresa B no ve la vacante
  await paso({
    caso: "CP-07",
    accion: "Empresa B inicia sesión → Mis vacantes",
    datos: `correo=${empresaB.correo}`,
    esperado: "La vacante de Empresa A NO aparece en la lista de Empresa B",
    comprobar: async () => {
      await iniciarSesion(page, empresaB);
      await irAMisVacantes(page);
      const aparece = await filaVacante(tituloEditado).count();
      const filas = (await page.locator(".bt-vacantes-tabla tbody").textContent()).trim();
      return {
        obtenido: aparece ? "La vacante de A SÍ aparece" : `La vacante de A no aparece (tabla: "${filas}")`,
        aprobado: aparece === 0
      };
    }
  });

  // 7-9. Empresa B intenta modificar la vacante de A usando su propia sesión
  const tokenB = await token(page);

  const intento = async ({ caso, accion, metodo, ruta, body, datos }) => {
    await paso({
      caso,
      accion,
      datos,
      esperado: "HTTP 404 \"Vacante no encontrada\"; la vacante de A no cambia",
      comprobar: async () => {
        const respuesta = await page.evaluate(async ({ url, metodo, body, token }) => {
          const r = await fetch(url, {
            method: metodo,
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: body ? JSON.stringify(body) : undefined
          });
          return { status: r.status, datos: await r.json().catch(() => null) };
        }, { url: `${API_URL}/api${ruta}`, metodo, body, token: tokenB });

        const actual = (await api("GET", "/empresa/vacantes", { token: tokenA }))
          .datos.vacantes.find((v) => v.id_vacante === idVacante);
        const intacta = !!actual && actual.titulo === tituloEditado && actual.estado === "activa";

        await mostrarPanelPrueba(page, [
          `PRUEBA ${caso} · sesión actual: Empresa B (${empresaB.correo})`,
          `${metodo} ${API_URL}/api${ruta}`,
          body ? `Datos enviados: ${JSON.stringify(body)}` : "Datos enviados: (ninguno)",
          `Respuesta: HTTP ${respuesta.status} ${JSON.stringify(respuesta.datos)}`,
          `Vacante ${idVacante} de Empresa A después del intento: ${actual ? `"${actual.titulo}" · estado ${actual.estado}` : "NO EXISTE"}`,
          `Resultado: ${respuesta.status === 404 && intacta ? "BLOQUEADO ✔" : "PERMITIDO ✘"}`
        ]);

        return {
          obtenido: `HTTP ${respuesta.status} "${respuesta.datos?.mensaje}"; vacante de A ${intacta ? "sin cambios" : "MODIFICADA"}`,
          aprobado: respuesta.status === 404 && intacta
        };
      }
    });
    await quitarPanelPrueba(page);
  };

  await intento({
    caso: "CP-08",
    accion: "Con la sesión de Empresa B se envía una edición a la vacante de A",
    metodo: "PUT",
    ruta: `/empresa/vacantes/${idVacante}`,
    body: { titulo: "MODIFICADA POR OTRA EMPRESA", descripcion: "x", modalidad: "remota", tipo: "practicas" },
    datos: `id_vacante=${idVacante}, titulo="MODIFICADA POR OTRA EMPRESA"`
  });

  await intento({
    caso: "CP-09",
    accion: "Con la sesión de Empresa B se intenta cerrar la vacante de A",
    metodo: "PATCH",
    ruta: `/empresa/vacantes/${idVacante}/estado`,
    body: { estado: "cerrada" },
    datos: `id_vacante=${idVacante}, estado=cerrada`
  });

  await intento({
    caso: "CP-10",
    accion: "Con la sesión de Empresa B se intenta eliminar la vacante de A",
    metodo: "DELETE",
    ruta: `/empresa/vacantes/${idVacante}`,
    datos: `id_vacante=${idVacante}`
  });

  await cerrarSesion(page);

  // 10. Empresa A comprueba que su vacante sigue igual
  await paso({
    caso: "CP-08/09/10",
    accion: "Empresa A vuelve a iniciar sesión → Mis vacantes",
    datos: `correo=${empresaA.correo}`,
    esperado: `La vacante sigue con el título "${tituloEditado}" y estado "activa"`,
    comprobar: async () => {
      await iniciarSesion(page, empresaA);
      await irAMisVacantes(page);
      const fila = filaVacante(tituloEditado);
      const existe = await fila.count();
      const estado = existe ? await fila.locator(".bt-vacantes-estado").textContent() : null;
      return {
        obtenido: existe ? `Vacante presente, estado "${estado}"` : "La vacante ya no existe",
        aprobado: existe === 1 && estado === "activa"
      };
    }
  });

  // 11. Empresa A elimina su vacante
  await paso({
    caso: "CP-14",
    accion: "Empresa A → botón Eliminar → confirmar",
    datos: `id_vacante=${idVacante}`,
    esperado: "Mensaje \"Vacante eliminada correctamente\" y la vacante desaparece",
    comprobar: async () => {
      await page.getByRole("button", { name: `Eliminar ${tituloEditado}` }).click();
      await page.locator(".bt-vacantes-exito", { hasText: "eliminada" }).waitFor();
      await page.waitForFunction(
        (t) => ![...document.querySelectorAll(".bt-vacantes-tabla tbody tr")].some((tr) => tr.textContent.includes(t)),
        tituloEditado
      );
      return { obtenido: "\"Vacante eliminada correctamente\"; ya no aparece en la tabla", aprobado: true };
    }
  });

  await context.close();

  return { dispositivo: dispositivo.nombre, cuentas: { empresaA: empresaA.correo, empresaB: empresaB.correo }, pasos };
};

// ----------------------------------------------------------
// Reporte
// ----------------------------------------------------------

const celda = (t) => String(t).replace(/\|/g, "\\|").replace(/\n/g, " ");

const main = async () => {
  const version = (await api("GET", "/version")).datos;

  if (!version?.version) {
    throw new Error(`No se pudo consultar ${API_URL}/api/version`);
  }

  console.log(`BolsaTec API v${version.version} (commit ${version.commit})`);

  const browser = await chromium.launch();
  const resultados = [];

  try {
    for (const dispositivo of dispositivos) {
      resultados.push(await ejecutarEn(browser, dispositivo, version));
    }
  } finally {
    await browser.close();
  }

  const total = resultados.flatMap((r) => r.pasos);
  const aprobados = total.filter((p) => p.resultado === "APROBADO").length;
  const fecha = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

  const md = [
    "# Evidencia visual: propiedad de vacantes (escritorio y móvil)",
    "",
    "| Dato | Valor |",
    "|---|---|",
    `| Versión de la API | v${version.version} (commit \`${version.commit}\`) |`,
    `| Frontend probado | ${APP_URL} |`,
    `| API probada | ${API_URL} |`,
    `| Navegador | Chromium (Playwright) |`,
    `| Fecha de ejecución | ${fecha} |`,
    `| Resultado | **${aprobados} de ${total.length} pasos aprobados** |`,
    "",
    "Contraseña de todas las cuentas de prueba: `" + PASSWORD + "`.",
    "",
    ...resultados.flatMap((r) => [
      `## ${r.dispositivo}`,
      "",
      `Cuentas: Empresa A = \`${r.cuentas.empresaA}\`, Empresa B = \`${r.cuentas.empresaB}\``,
      "",
      "| # | Caso | Pasos | Datos | Resultado esperado | Resultado obtenido | Estado | Captura |",
      "|---|---|---|---|---|---|---|---|",
      ...r.pasos.map((p, i) =>
        `| ${i + 1} | ${p.caso} | ${celda(p.accion)} | ${celda(p.datos)} | ${celda(p.esperado)} | ${celda(p.obtenido)} | ${p.resultado === "APROBADO" ? "✅ Aprobado" : "❌ Fallido"} | [${p.captura}](${p.captura}) |`
      ),
      "",
      ...r.pasos.flatMap((p, i) => [`**${i + 1}. ${p.caso} — ${p.accion}**`, "", `![${p.caso}](${p.captura})`, ""])
    ])
  ].join("\n");

  fs.writeFileSync(path.join(carpeta, "README.md"), md);
  fs.writeFileSync(path.join(carpeta, "resultados.json"), JSON.stringify({ version, fecha, resultados }, null, 2));

  console.log(`\n${aprobados}/${total.length} pasos aprobados. Reporte: docs/pruebas/evidencia/README.md`);
  process.exit(aprobados === total.length ? 0 : 1);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
