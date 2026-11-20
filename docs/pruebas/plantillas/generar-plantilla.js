// Genera la plantilla de Word del registro de pruebas de BolsaTec
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, WidthType, ShadingType, BorderStyle,
  PageOrientation, PageBreak, Footer, Header, PageNumber, LevelFormat,
  VerticalAlign, TableOfContents,
} = require("docx");

const SALIDA = process.argv[2];

// ---------- Estilo ----------
const FUENTE = "Arial";
const COLOR = "0E7490";        // turquesa de BolsaTec
const COLOR_OSCURO = "0B2B33";
const GRIS = "64748B";
const FONDO_TITULO = "E0F2F7";
const FONDO_AYUDA = "FFF8E1";
const FONDO_LLENAR = "F8FAFC";

// Carta: 12240 x 15840 DXA, márgenes de 1" (1440)
const ANCHO_V = 12240 - 2 * 1440;          // 9360 vertical
const ANCHO_H = 15840 - 2 * 1080;          // 13680 horizontal (márgenes 0.75")

const borde = { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" };
const bordes = { top: borde, bottom: borde, left: borde, right: borde };

const texto = (t, o = {}) => new TextRun({ text: t, font: FUENTE, size: o.size ?? 20, bold: o.bold, italics: o.italics, color: o.color });

const p = (t, o = {}) =>
  new Paragraph({
    alignment: o.align,
    spacing: { before: o.before ?? 0, after: o.after ?? 120 },
    children: Array.isArray(t) ? t : [texto(t, o)],
  });

const ayuda = (t) => p(t, { italics: true, color: "8A6D00", size: 18 });

const celda = (contenido, ancho, o = {}) =>
  new TableCell({
    width: { size: ancho, type: WidthType.DXA },
    borders: bordes,
    shading: o.fondo ? { fill: o.fondo, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 70, bottom: 70, left: 100, right: 100 },
    verticalAlign: o.vertical ?? VerticalAlign.TOP,
    columnSpan: o.span,
    children: (Array.isArray(contenido) ? contenido : [contenido]).map((c) =>
      typeof c === "string"
        ? new Paragraph({ alignment: o.align, spacing: { after: 0 }, children: [texto(c, { bold: o.bold, size: o.size ?? 18, color: o.color, italics: o.italics })] })
        : c
    ),
  });

// Tabla con encabezado; filas = arreglos de textos ("" = espacio para llenar)
const tabla = (encabezados, anchos, filas, o = {}) => {
  const total = anchos.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: anchos,
    rows: [
      new TableRow({
        tableHeader: true,
        children: encabezados.map((e, i) => celda(e, anchos[i], { fondo: COLOR, bold: true, color: "FFFFFF" })),
      }),
      ...filas.map((fila) =>
        new TableRow({
          cantSplit: true,
          children: fila.map((v, i) => {
            const vacio = v === "";
            const especial = typeof v === "object" && v !== null && !Array.isArray(v) && v.texto !== undefined;
            return celda(
              especial ? v.texto : vacio ? " " : v,
              anchos[i],
              {
                fondo: especial ? v.fondo : vacio || (o.llenar || []).includes(i) ? FONDO_LLENAR : undefined,
                bold: (o.negritas || []).includes(i),
                align: (o.centro || []).includes(i) ? AlignmentType.CENTER : undefined,
                vertical: (o.centro || []).includes(i) ? VerticalAlign.CENTER : undefined,
              }
            );
          }),
        })
      ),
    ],
  });
};

// Tabla de dos columnas Dato / Valor
const datos = (filas, anchos = [3000, ANCHO_V - 3000]) =>
  tabla(["Dato", "Valor"], anchos, filas, { negritas: [0], llenar: [1] });

// Recuadro para pegar una captura
const recuadro = (t, ancho, alto = 2200) =>
  new Table({
    width: { size: ancho, type: WidthType.DXA },
    columnWidths: [ancho],
    rows: [
      new TableRow({
        height: { value: alto, rule: "atLeast" },
        children: [
          new TableCell({
            width: { size: ancho, type: WidthType.DXA },
            borders: { top: { style: BorderStyle.DASHED, size: 6, color: "94A3B8" }, bottom: { style: BorderStyle.DASHED, size: 6, color: "94A3B8" }, left: { style: BorderStyle.DASHED, size: 6, color: "94A3B8" }, right: { style: BorderStyle.DASHED, size: 6, color: "94A3B8" } },
            shading: { fill: FONDO_LLENAR, type: ShadingType.CLEAR, color: "auto" },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [texto(t, { italics: true, color: GRIS, size: 18 })] })],
          }),
        ],
      }),
    ],
  });

const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const espacio = () => p("", { after: 80 });
const salto = () => new Paragraph({ children: [new PageBreak()] });
const vineta = (t) => new Paragraph({ numbering: { reference: "vinetas", level: 0 }, spacing: { after: 60 }, children: [texto(t)] });
const numero = (t) => new Paragraph({ numbering: { reference: "numeros", level: 0 }, spacing: { after: 60 }, children: [texto(t)] });

// ---------- Casos de prueba ----------
const CASOS = [
  ["CP-01", "Iniciar sesión", "Empresa A", "Ir a /login → «Soy empresa» → escribir correo y contraseña → «Iniciar sesión».", "Correo y contraseña de Empresa A.", "Entra al portal empresarial; el pie de página muestra la versión."],
  ["CP-02", "Publicar vacante", "Empresa A", "Mis vacantes → «Nueva vacante» → llenar campos → «Publicar vacante».", "Título: Desarrollador Web Jr (prueba); modalidad Híbrida; tipo Prácticas; salario 6000–8000.", "Mensaje «Vacante publicada correctamente»; la vacante aparece con estado Activa."],
  ["CP-03", "Ver «Mis vacantes»", "Empresa A", "Mis vacantes → buscar la vacante en la lista.", "Título de la vacante de CP-02.", "La vacante aparece en la lista de Empresa A."],
  ["CP-04", "Editar vacante", "Empresa A", "Botón Editar (lápiz) → cambiar título y salario máximo → «Guardar cambios».", "Título nuevo: … EDITADA; salario máximo 9000.", "Mensaje «Vacante actualizada correctamente»; la lista muestra el nuevo título."],
  ["CP-05", "Pausar vacante", "Empresa A", "Botón Pausar → Aceptar.", "Estado nuevo: Pausada.", "La vacante cambia a Pausada."],
  ["CP-06", "Reactivar vacante", "Empresa A", "Botón Activar → Aceptar.", "Estado nuevo: Activa.", "La vacante vuelve a Activa."],
  ["CP-07", "Ver «Mis vacantes» de otra empresa", "Empresa B", "Cerrar sesión → iniciar sesión como Empresa B → Mis vacantes.", "Correo y contraseña de Empresa B.", "La vacante de Empresa A NO aparece."],
  ["CP-08", "Editar la vacante de A", "Empresa B", "Con la sesión de B, enviar PUT /api/empresa/vacantes/{id} con el token de B (prueba automática o consola del navegador).", "id de la vacante de A; título «MODIFICADA POR OTRA EMPRESA».", "HTTP 404 «Vacante no encontrada»; la vacante de A no cambia."],
  ["CP-09", "Cerrar la vacante de A", "Empresa B", "Con la sesión de B, enviar PATCH /api/empresa/vacantes/{id}/estado.", "id de la vacante de A; estado «cerrada».", "HTTP 404; la vacante de A sigue Activa."],
  ["CP-10", "Eliminar la vacante de A", "Empresa B", "Con la sesión de B, enviar DELETE /api/empresa/vacantes/{id}.", "id de la vacante de A.", "HTTP 404; la vacante de A sigue existiendo."],
  ["CP-11", "Editar la vacante de A", "Estudiante", "Con la sesión del estudiante, enviar PUT /api/empresa/vacantes/{id}.", "Token de estudiante; id de la vacante de A.", "HTTP 403 «Acceso permitido únicamente a empresas»; la vacante no cambia."],
  ["CP-12", "Eliminar sin iniciar sesión", "Anónimo", "Enviar DELETE /api/empresa/vacantes/{id} sin encabezado Authorization.", "Sin token.", "HTTP 401 «Debes iniciar sesión»; la vacante sigue existiendo."],
  ["CP-13", "Editar con token alterado", "Anónimo", "Enviar PUT /api/empresa/vacantes/{id} con el token de B modificado.", "Token con los últimos caracteres cambiados.", "HTTP 401 «Token inválido»; la vacante no cambia."],
  ["CP-V", "Verificar que nada cambió", "Empresa A", "Iniciar sesión como Empresa A → Mis vacantes → revisar la vacante.", "Título, estado y salario anotados en CP-04 a CP-06.", "La vacante sigue con el título EDITADA, estado Activa y salario 9000."],
  ["CP-14", "Eliminar su propia vacante", "Empresa A", "Botón Eliminar (bote) → Aceptar.", "id de la vacante de A.", "Mensaje «Vacante eliminada correctamente»; ya no aparece en la lista."],
];

// Tabla de ejecución (horizontal)
const ANCHOS_EJEC = [850, 2650, 2050, 2450, 2700, 1330, 1650]; // = 13680
const tablaEjecucion = () =>
  tabla(
    ["ID", "Pasos", "Datos", "Resultado esperado", "Resultado obtenido", "¿Aprobado?", "Evidencia"],
    ANCHOS_EJEC,
    CASOS.map(([id, , , pasos, datosCaso, esperado]) => [id, pasos, datosCaso, esperado, "", "☐ Sí\n☐ No".split("\n").join("   "), "Figura __"]),
    { negritas: [0], llenar: [4, 5, 6], centro: [5] }
  );

const encabezadoEjecucion = (dispositivo) =>
  tabla(
    ["Dato", "Valor", "Dato", "Valor"],
    [2200, 4640, 2200, 4640],
    [
      ["Dispositivo", dispositivo, "Versión (pie de página)", "BolsaTec v_____ · _______"],
      ["Navegador", "", "Fecha y hora", ""],
      ["Resolución / pantalla", "", "Responsable", ""],
    ],
    { negritas: [0, 2], llenar: [1, 3] }
  );

// ---------- Documento ----------
const portada = [
  p("", { after: 1200 }),
  p([texto("BolsaTec", { size: 28, bold: true, color: COLOR })], { align: AlignmentType.CENTER }),
  new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, children: [new TextRun("REGISTRO DE PRUEBAS")] }),
  p([texto("Propiedad de vacantes: una empresa administra sus vacantes y otra cuenta no puede modificarlas", { size: 24, color: GRIS })], { align: AlignmentType.CENTER, after: 600 }),
  datos([
    ["Proyecto", "BolsaTec — Bolsa de trabajo y prácticas profesionales"],
    ["Versión probada", "v_____ · commit _______ (anotar la que muestra el pie de página)"],
    ["Página probada", "https://bolsa-tec.vercel.app"],
    ["API probada", "https://bolsatec.onrender.com"],
    ["Fecha de ejecución", ""],
    ["Integrantes", ""],
    ["Grupo", ""],
    ["Docente", ""],
  ]),
  espacio(),
  new Table({
    width: { size: ANCHO_V, type: WidthType.DXA },
    columnWidths: [ANCHO_V],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: ANCHO_V, type: WidthType.DXA },
      borders: bordes,
      shading: { fill: FONDO_AYUDA, type: ShadingType.CLEAR, color: "auto" },
      margins: { top: 120, bottom: 120, left: 160, right: 160 },
      children: [
        p([texto("Cómo usar esta plantilla", { bold: true, size: 20, color: "8A6D00" })], { after: 60 }),
        p("1. Antes de probar, anoten la versión que aparece en el pie de página de los paneles (sección 2).", { size: 18, after: 30 }),
        p("2. Las celdas grises son para llenar. Los pasos, datos y resultados esperados ya vienen escritos.", { size: 18, after: 30 }),
        p("3. Llenen la sección 5 en escritorio y la sección 6 en móvil (de preferencia un teléfono real).", { size: 18, after: 30 }),
        p("4. Escriban el resultado obtenido tal como ocurrió (mensaje, código HTTP, estado) y marquen ☒ Sí o ☒ No.", { size: 18, after: 30 }),
        p("5. Peguen cada captura en la sección 7 con su número de figura. Borren este recuadro y los textos en cursiva al terminar.", { size: 18, after: 0 }),
      ],
    })] })],
  }),
  salto(),
];

const cuerpo = [
  new TableOfContents("Contenido", { hyperlink: true, headingStyleRange: "1-2" }),
  ayuda("Para actualizar el índice: clic derecho sobre él → «Actualizar campos»."),
  salto(),

  h1("1. Respuesta a la retroalimentación"),
  p("Esta tabla relaciona cada observación del docente con la parte del documento que la atiende."),
  tabla(
    ["Observación del docente", "Cómo se atiende", "Sección"],
    [3000, 4560, 1800],
    [
      ["Falta identificar la versión", "Cada ejecución anota la versión y el commit que muestra el pie de página, con captura.", "2, 5, 6"],
      ["Registrar sistemáticamente lo que ocurrió en cada prueba", "Cada caso tiene ID, pasos, datos, resultado esperado, resultado obtenido, aprobado/no y evidencia.", "4, 5, 6"],
      ["Demostrar que una empresa administra sus vacantes", "Empresa A publica, consulta, edita, pausa, reactiva y elimina su vacante (CP-01 a CP-06 y CP-14).", "5, 6, 7"],
      ["Demostrar que otra cuenta no puede modificarlas", "Empresa B, un estudiante y un usuario sin sesión intentan modificarla (CP-07 a CP-13) y se verifica que no cambió (CP-V).", "5, 6, 7"],
      ["Completar la demostración en móvil y escritorio", "El mismo recorrido se ejecuta y registra en escritorio y en móvil.", "5, 6"],
    ],
    { llenar: [] }
  ),

  h1("2. Identificación de la versión"),
  p("El sistema muestra su versión en el pie de página de los paneles con el formato «BolsaTec vX.Y.Z · commit · fecha», y en la dirección /api/version del servidor. Anoten ambos valores antes de empezar."),
  tabla(
    ["Dónde se consulta", "Valor anotado"],
    [4000, ANCHO_V - 4000],
    [
      ["Pie de página del panel (frontend)", "BolsaTec v_____ · _______ · __________"],
      ["https://bolsatec.onrender.com/api/version (backend)", "version: _______   commit: _______"],
      ["¿Coinciden frontend y backend?", "☐ Sí   ☐ No (explicar):"],
    ],
    { negritas: [0], llenar: [1] }
  ),
  espacio(),
  recuadro("[Pegar aquí la captura del pie de página con la versión]", ANCHO_V, 1400),
  p([texto("Figura 1. Pie de página con la versión probada.", { italics: true, size: 18, color: GRIS })], { align: AlignmentType.CENTER, before: 60 }),

  h1("3. Entorno de prueba"),
  tabla(
    ["Dato", "Escritorio", "Móvil"],
    [2400, 3480, 3480],
    [
      ["Dispositivo / modelo", "", ""],
      ["Sistema operativo", "", ""],
      ["Navegador y versión", "", ""],
      ["Tamaño de pantalla", "", ""],
      ["Tipo", "Computadora", "☐ Teléfono real   ☐ Emulado"],
      ["Responsable", "", ""],
    ],
    { negritas: [0] }
  ),

  h2("3.1. Cuentas de prueba"),
  ayuda("Usen cuentas creadas solo para la prueba (por ejemplo, prueba.empresa.a@...). No anoten contraseñas reales."),
  tabla(
    ["Actor", "Correo", "Contraseña", "Rol"],
    [1800, 4160, 1900, 1500],
    [
      ["Empresa A", "", "", "empresa"],
      ["Empresa B", "", "", "empresa"],
      ["Estudiante", "", "", "estudiante"],
    ],
    { negritas: [0] }
  ),

  h2("3.2. Vacante de prueba"),
  datos([
    ["Título", "Desarrollador Web Jr (prueba)"],
    ["Descripción", "Vacante de prueba para el registro de propiedad de vacantes."],
    ["Modalidad / tipo", "Híbrida / Prácticas profesionales"],
    ["Salario", "6000 – 8000 MXN"],
    ["id_vacante asignado", ""],
  ]),

  h1("4. Plan de casos de prueba"),
  p("Empresa A administra su vacante. Después, otras cuentas intentan modificarla. En los casos de bloqueo no basta con el mensaje de error: se comprueba al final (CP-V) que la vacante sigue igual."),
  tabla(
    ["ID", "Caso", "Actor", "Resultado esperado"],
    [900, 2900, 1500, 4060],
    CASOS.map(([id, caso, actor, , , esperado]) => [id, caso, actor, esperado]),
    { negritas: [0] }
  ),
  espacio(),
  p([texto("Cómo protege el sistema las vacantes: ", { bold: true }), texto("el servidor exige un token válido (si no, 401), exige el rol empresa (si no, 403) y cada edición, cambio de estado o eliminación busca la vacante por su id y por la empresa que inició sesión; si es de otra empresa no la encuentra (404) y no cambia nada.")]),
];

const ejecucionEscritorio = [
  h1("5. Registro de ejecución: escritorio"),
  encabezadoEjecucion("Computadora de escritorio / laptop"),
  espacio(),
  tablaEjecucion(),
];

const ejecucionMovil = [
  h1("6. Registro de ejecución: móvil"),
  encabezadoEjecucion("Teléfono: _______________"),
  espacio(),
  tablaEjecucion(),
];

// Evidencias: una fila por caso con escritorio y móvil
const ANCHO_MITAD = (ANCHO_V - 200) / 2;
const evidencias = [
  h1("7. Evidencias"),
  p("Peguen una captura por caso en escritorio y en móvil. En cada captura debe verse el resultado (mensaje, estado o respuesta del servidor). Numeren las figuras como en las tablas de las secciones 5 y 6."),
  ...CASOS.flatMap(([id, caso]) => [
    h2(`${id} · ${caso}`),
    new Table({
      width: { size: ANCHO_V, type: WidthType.DXA },
      columnWidths: [ANCHO_MITAD, 200, ANCHO_MITAD],
      rows: [new TableRow({ cantSplit: true, children: [
        new TableCell({ width: { size: ANCHO_MITAD, type: WidthType.DXA }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, children: [recuadro("[Captura de escritorio]", ANCHO_MITAD, 2000), p([texto(`Figura __. ${id} en escritorio.`, { italics: true, size: 16, color: GRIS })], { align: AlignmentType.CENTER, before: 40, after: 0 })] }),
        new TableCell({ width: { size: 200, type: WidthType.DXA }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, children: [p("")] }),
        new TableCell({ width: { size: ANCHO_MITAD, type: WidthType.DXA }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, children: [recuadro("[Captura de móvil]", ANCHO_MITAD, 2000), p([texto(`Figura __. ${id} en móvil.`, { italics: true, size: 16, color: GRIS })], { align: AlignmentType.CENTER, before: 40, after: 0 })] }),
      ] })],
    }),
  ]),
];

const cierre = [
  h1("8. Resumen de resultados"),
  tabla(
    ["Prueba", "Escritorio (aprobados / total)", "Móvil (aprobados / total)", "Total"],
    [3000, 2120, 2120, 2120],
    [
      ["Empresa administra su vacante (CP-01 a CP-06, CP-14)", "___ / 7", "___ / 7", "___ / 14"],
      ["Otra cuenta no puede modificarla (CP-07 a CP-13, CP-V)", "___ / 8", "___ / 8", "___ / 16"],
      [{ texto: "Total", fondo: FONDO_TITULO }, { texto: "___ / 15", fondo: FONDO_TITULO }, { texto: "___ / 15", fondo: FONDO_TITULO }, { texto: "___ / 30", fondo: FONDO_TITULO }],
    ],
    { negritas: [0], llenar: [1, 2, 3], centro: [1, 2, 3] }
  ),

  h1("9. Errores encontrados y correcciones"),
  ayuda("Si un caso falla, regístrenlo aquí, corrijan, publiquen una versión nueva y vuelvan a ejecutar el caso. Si no hubo errores, escriban «Sin errores»."),
  tabla(
    ["ID", "Error detectado", "Caso", "Gravedad", "Corrección", "Versión corregida", "¿Verificado?"],
    [800, 2200, 900, 1100, 2160, 1200, 1000],
    [["ERR-01", "", "", "", "", "", ""], ["ERR-02", "", "", "", "", "", ""], ["ERR-03", "", "", "", "", "", ""]],
    { negritas: [0] }
  ),

  h1("10. Conclusión"),
  ayuda("Ejemplo: «En la versión v1.2.0 (commit xxxxxxx), Empresa A pudo publicar, editar, pausar, reactivar y eliminar su vacante. Empresa B, un estudiante y un usuario sin sesión no pudieron modificarla (404, 403 y 401) y se comprobó que la vacante no cambió. La prueba se realizó en escritorio y en móvil con __ de __ casos aprobados.»"),
  recuadro("[Escribir la conclusión]", ANCHO_V, 1600),

  h1("11. Firmas"),
  tabla(
    ["Nombre", "Rol en la prueba", "Firma"],
    [3600, 2880, 2880],
    [["", "Ejecutó (escritorio)", ""], ["", "Ejecutó (móvil)", ""], ["", "Revisó", ""]],
    { negritas: [] }
  ),
];

const piePagina = new Footer({
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      texto("BolsaTec · Registro de pruebas · Versión v_____ · Página ", { size: 16, color: GRIS }),
      new TextRun({ children: [PageNumber.CURRENT], font: FUENTE, size: 16, color: GRIS }),
    ],
  })],
});

const vertical = { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } };
const horizontal = { page: { size: { width: 12240, height: 15840, orientation: PageOrientation.LANDSCAPE }, margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } };

const doc = new Document({
  creator: "BolsaTec",
  features: { updateFields: true },
  title: "Plantilla de registro de pruebas — BolsaTec",
  styles: {
    default: { document: { run: { font: FUENTE, size: 20 } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal", next: "Normal", run: { font: FUENTE, size: 52, bold: true, color: COLOR_OSCURO }, paragraph: { spacing: { before: 120, after: 160 }, keepNext: true } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FUENTE, size: 30, bold: true, color: COLOR_OSCURO }, paragraph: { spacing: { before: 360, after: 140 }, keepNext: true, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: COLOR, space: 4 } } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FUENTE, size: 24, bold: true, color: COLOR }, paragraph: { spacing: { before: 240, after: 100 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: "vinetas", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numeros", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [
    { properties: vertical, footers: { default: piePagina }, children: [...portada, ...cuerpo] },
    { properties: horizontal, footers: { default: piePagina }, children: ejecucionEscritorio },
    { properties: horizontal, footers: { default: piePagina }, children: ejecucionMovil },
    { properties: vertical, footers: { default: piePagina }, children: [...evidencias, salto(), ...cierre] },
  ],
});

Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync(SALIDA, b);
  console.log("Plantilla creada:", SALIDA);
});
