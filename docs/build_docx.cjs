const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, Footer, SectionType, ImageRun,
} = require("docx");

const CONTENT_W = 9360;        // full content width (US Letter, 1" margins)
const COL_GAP = 360;           // 0.25" gap between columns
const COL_W = (CONTENT_W - COL_GAP) / 2; // 4500 DXA per column

// ---- helpers --------------------------------------------------------------
const P = (text, opts = {}) =>
  new Paragraph({
    spacing: { after: 120, line: 252 },
    alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, ...opts })],
    ...opts.paragraph,
  });

const H1 = (text) =>
  new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER,
    children: [new TextRun(text)] });
const H2 = (text) =>
  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });

const EQ = (text) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 120 },
    children: [new TextRun({ text, italics: true })],
  });

const bullet = (text) =>
  new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 60 },
    alignment: AlignmentType.JUSTIFIED, children: [new TextRun(text)] });
const numItem = (text) =>
  new Paragraph({ numbering: { reference: "nums", level: 0 }, spacing: { after: 60 },
    alignment: AlignmentType.JUSTIFIED, children: [new TextRun(text)] });

const border = { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" };
const borders = { top: border, bottom: border, left: border, right: border,
  insideHorizontal: border, insideVertical: border };

function cell(text, w, { head = false, align = AlignmentType.LEFT } = {}) {
  return new TableCell({
    borders,
    width: { size: w, type: WidthType.DXA },
    shading: head ? { fill: "D5E8F0", type: ShadingType.CLEAR } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [new Paragraph({ alignment: align, spacing: { after: 0 },
      children: [new TextRun({ text, bold: head, size: 18 })] })],
  });
}

// ---- tables (sized to a single column) ------------------------------------
const codesCols = [1740, 780, 780, 1200]; // = 4500
const codesData = [
  ["Etiqueta", "n", "k", "Tasa R"],
  ["LDPC (7,4) didáctico", "7", "4", "0.57"],
  ["LDPC (12,8)", "12", "8", "0.67"],
  ["LDPC (16,8)", "16", "8", "0.50"],
  ["LDPC (24,8)", "24", "8", "0.33"],
  ["LDPC (25,20)", "25", "20", "0.80"],
  ["LDPC (30,25)", "30", "25", "0.83"],
  ["LDPC (32,24)", "32", "24", "0.75"],
  ["LDPC (48,42)", "48", "42", "0.88"],
];
const codesTable = new Table({
  width: { size: COL_W, type: WidthType.DXA },
  columnWidths: codesCols,
  rows: codesData.map((row, ri) =>
    new TableRow({
      children: row.map((txt, ci) =>
        cell(txt, codesCols[ci], { head: ri === 0,
          align: ci === 0 ? AlignmentType.LEFT : AlignmentType.CENTER })),
    })),
});

const modCols = [1300, 1500, 1700]; // = 4500
const modData = [
  ["Esquema", "Bits/símb.", "Constelación"],
  ["BPSK", "1", "2 puntos eje I"],
  ["QPSK", "2", "4 puntos cuadratura"],
  ["16-QAM", "4", "Rejilla 4×4 (Gray)"],
];
const modTable = new Table({
  width: { size: COL_W, type: WidthType.DXA },
  columnWidths: modCols,
  rows: modData.map((row, ri) =>
    new TableRow({
      children: row.map((txt, ci) =>
        cell(txt, modCols[ci], { head: ri === 0,
          align: ci === 1 ? AlignmentType.CENTER : AlignmentType.LEFT })),
    })),
});

const caption = (t) =>
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 160 },
    children: [new TextRun({ text: t, italics: true, size: 16 })] });

// ---- code listing ----------------------------------------------------------
const codeLines = [
  "for (let j=0; j<code.n; j++) {",
  "  let sum = 0;",
  "  for (let i=0; i<code.k; i++)",
  "    sum ^= data[i]*code.G[i][j];",
  "  codeword[j] = sum;",
  "}",
];
const codeBlock = new Table({
  width: { size: COL_W, type: WidthType.DXA },
  columnWidths: [COL_W],
  rows: [new TableRow({ children: [new TableCell({
    borders,
    width: { size: COL_W, type: WidthType.DXA },
    shading: { fill: "F4F4F4", type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: codeLines.map((ln) => new Paragraph({ spacing: { after: 0 },
      children: [new TextRun({ text: ln || " ", font: "Consolas", size: 16 })] })),
  })] })],
});

function placeholderBox(text) {
  const b = { style: BorderStyle.SINGLE, size: 6, color: "888888" };
  return new Table({
    width: { size: COL_W, type: WidthType.DXA },
    columnWidths: [COL_W],
    rows: [new TableRow({
      height: { value: 1600, rule: "atLeast" },
      children: [new TableCell({
        borders: { top: b, bottom: b, left: b, right: b },
        width: { size: COL_W, type: WidthType.DXA },
        verticalAlign: "center",
        margins: { top: 300, bottom: 300, left: 120, right: 120 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER,
          children: [new TextRun({ text, italics: true, color: "666666", size: 18 })] })],
      })],
    })],
  });
}

// ---- image embedding (falls back to placeholder if file missing) ----------
const EVID_DIR = path.join(__dirname, "evidencias");

function imageSize(buf) {
  // PNG
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), type: "png" };
  }
  // JPEG: scan SOF markers
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let off = 2;
    while (off < buf.length) {
      if (buf[off] !== 0xff) { off++; continue; }
      const marker = buf[off + 1];
      const len = buf.readUInt16BE(off + 2);
      if (marker >= 0xc0 && marker <= 0xcf &&
          marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { h: buf.readUInt16BE(off + 5), w: buf.readUInt16BE(off + 7), type: "jpg" };
      }
      off += 2 + len;
    }
    return { w: 1600, h: 800, type: "jpg" };
  }
  return { w: 1600, h: 800, type: "jpg" };
}

// Returns [imageParagraph | placeholderTable] for a given evidence file.
function evidence(filename, placeholderText) {
  const fp = path.join(EVID_DIR, filename);
  if (!fs.existsSync(fp)) return placeholderBox(placeholderText);
  const data = fs.readFileSync(fp);
  const { w, h, type } = imageSize(data);
  const targetW = 300; // px ≈ full column width
  const targetH = Math.round((h / w) * targetW);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new ImageRun({
      type,
      data,
      transformation: { width: targetW, height: targetH },
      altText: { title: filename, description: placeholderText, name: filename },
    })],
  });
}

// ---- title block (full width, single column) ------------------------------
const titleBlock = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [new TextRun({ text: "Codificación y Decodificación de Canal mediante Códigos LDPC", bold: true, size: 32 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
    children: [new TextRun({ text: "Brayan Stiven Peña Hernández (Cód. 20252678043)   ·   Jhonattan Fernando Aponte Gamboa (Cód. 20252678026)   ·   Juan José Cita Sarmiento (Cód. 20252678046)" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [new TextRun({ text: "Universidad Francisco José de Caldas", italics: true })] }),
];

// ---- body (two columns) ----------------------------------------------------
const body = [
  // Abstract
  new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 120 }, children: [
    new TextRun({ text: "Resumen— ", bold: true, italics: true }),
    new TextRun({ italics: true, text: "Este informe presenta el diseño e implementación de una herramienta web educativa para la simulación de la cadena de comunicación digital empleando códigos de comprobación de paridad de baja densidad (LDPC, Low-Density Parity-Check). La aplicación, completamente del lado del cliente, permite codificar y decodificar información binaria a partir de matrices generadora G y de comprobación de paridad H en forma sistemática. Se implementó un algoritmo de decodificación basado en el cálculo del síndrome combinado con votación por mayoría (bit-flipping), así como una cadena completa que incorpora codificación de fuente y de canal, modulación digital (BPSK, QPSK y 16-QAM) y un canal con ruido aditivo gaussiano blanco (AWGN). Los resultados muestran que el sistema corrige errores de bit introducidos por el canal y permite visualizar métricas como la tasa de error de bit (BER), el síndrome y las posiciones corregidas, cumpliendo el objetivo didáctico de ilustrar el funcionamiento interno de los códigos LDPC." }),
  ]}),
  new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 200 }, children: [
    new TextRun({ text: "Palabras clave— ", bold: true, italics: true }),
    new TextRun({ italics: true, text: "LDPC, corrección de errores, matriz de paridad, síndrome, BER, AWGN, modulación digital." }),
  ]}),

  H1("I. Introducción"),
  P("La comunicación digital sobre canales ruidosos exige mecanismos capaces de detectar y corregir los errores introducidos durante la transmisión. La codificación de canal añade redundancia controlada a la información para permitir su recuperación en el receptor sin necesidad de retransmisión. Entre las técnicas de corrección de errores hacia adelante (FEC), los códigos de comprobación de paridad de baja densidad (LDPC), propuestos originalmente por Gallager en 1962 y redescubiertos en la década de 1990, destacan por aproximarse al límite teórico de Shannon con una complejidad de decodificación razonable. Por ello se utilizan en estándares modernos como Wi-Fi (802.11n/ac), DVB-S2 y 5G NR."),
  P("El presente laboratorio tiene como objetivo construir una herramienta interactiva que ilustre, paso a paso, el proceso de codificación y decodificación LDPC. A diferencia de un simulador de caja negra, la aplicación expone las matrices G y H, el cálculo del síndrome y las decisiones de corrección, de modo que el estudiante observe directamente la relación entre la teoría algebraica y el comportamiento del sistema. La herramienta fue desarrollada como una aplicación de página única (SPA) que opera al 100% en el navegador, garantizando privacidad y reproducibilidad."),

  H1("II. Marco Teórico"),
  H2("A. Códigos de bloque lineales"),
  P("Un código de bloque lineal (n, k) transforma un mensaje de k bits de información en una palabra código de n bits, añadiendo m = n − k bits de paridad. La tasa del código se define como R = k/n. La codificación se realiza mediante la matriz generadora G de dimensión k × n:"),
  EQ("c = d · G   (mod 2)"),
  P("donde d es el vector de datos y c la palabra código resultante, con operaciones en el cuerpo de Galois GF(2) (suma módulo 2, equivalente a la operación XOR)."),
  P("En forma sistemática, la matriz generadora adopta la estructura G = [ Iₖ | P ], donde Iₖ es la matriz identidad y P la submatriz de paridad. Esto garantiza que los primeros k bits de la palabra código coincidan con los datos originales, facilitando su extracción en el receptor."),
  H2("B. Matriz de comprobación de paridad"),
  P("La matriz de comprobación de paridad H, de dimensión m × n, cumple la relación fundamental:"),
  EQ("H · cᵀ = 0   (mod 2)"),
  P("para toda palabra código válida. En forma sistemática se relaciona con G mediante H = [ Pᵀ | Iₘ ]. El carácter de baja densidad de los códigos LDPC implica que H es una matriz dispersa: contiene muy pocos unos por fila y por columna, lo que reduce la complejidad de la decodificación."),
  H2("C. Decodificación por síndrome"),
  P("Cuando una palabra recibida r contiene errores, se calcula el síndrome:"),
  EQ("s = H · rᵀ   (mod 2)"),
  P("Si s = 0, la palabra se considera válida. En caso contrario, el patrón del síndrome indica la presencia y, potencialmente, la ubicación de los errores. Para un único error en la posición j, el síndrome coincide exactamente con la columna j de H, lo que permite la corrección directa. Cuando el patrón no corresponde a una columna única, se recurre a algoritmos iterativos como el bit-flipping, en el que se invierten los bits que participan en el mayor número de comprobaciones de paridad insatisfechas."),

  H1("III. Metodología e Implementación"),
  H2("A. Arquitectura general"),
  P("La herramienta se desarrolló en TypeScript sobre el framework React con el empaquetador Vite. Las operaciones intensivas sobre bits se delegan a Web Workers para no bloquear la interfaz. La aplicación opera enteramente en el cliente, sin servidor ni envío de datos, lo que preserva la privacidad del usuario."),
  H2("B. Construcción de los códigos"),
  P("Se implementó un generador de códigos LDPC sistemáticos parametrizado por k (bits de datos) y m (bits de paridad). Las filas de paridad se construyen seleccionando máscaras binarias de peso creciente, evitando los vectores unitarios para mantener la baja densidad. A partir de ellas se derivan G = [ Iₖ | P ] y H = [ Pᵀ | Iₘ ]. La Tabla I resume los códigos disponibles, incluyendo un código didáctico (7,4) definido manualmente."),
  caption("TABLA I. Códigos LDPC implementados"),
  codesTable,
  new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),
  H2("C. Proceso de codificación"),
  P("La codificación se realiza bloque a bloque. Para cada bloque de k bits se calcula la palabra código aplicando la suma módulo 2 de las contribuciones de G. El último bloque se rellena con ceros (padding) cuando la longitud de los datos no es múltiplo de k."),
  codeBlock,
  caption("Listado 1. Núcleo del codificador en GF(2)."),
  H2("D. Proceso de decodificación"),
  P("El decodificador implementa un esquema iterativo (hasta 10 iteraciones) que combina dos estrategias:"),
  numItem("Corrección directa por síndrome: si el síndrome coincide exactamente con una columna de H, se invierte el bit asociado (error único)."),
  numItem("Votación por mayoría (bit-flipping): en otro caso, se cuenta para cada bit el número de comprobaciones insatisfechas en que participa y se invierte el de mayor recuento."),
  P("El proceso se detiene cuando el síndrome se anula (éxito) o cuando ninguna inversión mejora el resultado (atascado). Se registran las posiciones corregidas y el estado final de integridad."),
  H2("E. Cadena de comunicación completa"),
  P("Adicionalmente, se implementó una cadena extremo a extremo que integra: codificación de fuente (LDPC) → codificación de canal (LDPC) → modulación digital → canal AWGN → demodulación por decisión dura → decodificación de canal → decodificación de fuente. Se soportan tres esquemas de modulación, resumidos en la Tabla II, con mapeo Gray para 16-QAM."),
  caption("TABLA II. Esquemas de modulación"),
  modTable,
  new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),
  P("El canal AWGN suma ruido gaussiano de desviación estándar σ a las componentes en fase (I) y cuadratura (Q) de cada símbolo, generado mediante la transformación de Box–Muller:"),
  EQ("n = σ · √(−2 ln u) · cos(2π v),  u, v ~ U(0,1)"),

  H1("IV. Resultados y Análisis"),
  H2("A. Métricas evaluadas"),
  P("La herramienta calcula y muestra las siguientes métricas:"),
  bullet("BER pre-decodificación: tasa de error de bit introducida por el canal, BER = Nₑ / N."),
  bullet("BER final: errores residuales tras la decodificación."),
  bullet("Errores corregidos / no corregidos."),
  bullet("Integridad: verificación mediante hash SHA-256 entre el archivo original y el recuperado."),
  bullet("Síndrome y posiciones corregidas por bloque."),
  H2("B. Comportamiento observado"),
  P("Las pruebas confirman que para un único error de bit por bloque la corrección directa por síndrome es exacta e inmediata, recuperando la información sin error residual. Al aumentar σ en el canal AWGN, el número de errores por bloque crece y supera la capacidad de corrección del código, momento en el que aparecen errores residuales (BER final > 0). Se verificó la relación esperada entre la tasa del código R y su robustez: códigos de menor tasa, como el (24,8) con R = 0.33, incorporan más redundancia y toleran un mayor nivel de ruido que códigos de tasa alta como el (48,42) con R = 0.88, a costa de una mayor sobrecarga de transmisión."),
  P("Respecto a la modulación, los esquemas de mayor orden (16-QAM) transmiten más bits por símbolo pero presentan mayor sensibilidad al ruido, dado que sus puntos de constelación están más próximos entre sí, incrementando la probabilidad de error en la demodulación por decisión dura frente a BPSK."),
  H2("C. Verificación de integridad"),
  P("La comparación de los hashes SHA-256 del archivo original y del recuperado permitió validar de forma objetiva la integridad de la transmisión: una coincidencia exacta confirma la recuperación perfecta, mientras que cualquier diferencia evidencia errores residuales no corregidos."),

  H1("V. Conclusiones"),
  P("Se diseñó e implementó con éxito una herramienta educativa interactiva que ilustra el ciclo completo de codificación y decodificación de canal mediante códigos LDPC. La exposición explícita de las matrices G y H, del cálculo del síndrome y de las decisiones de corrección facilita la comprensión del vínculo entre la teoría algebraica en GF(2) y el comportamiento práctico del sistema."),
  P("El algoritmo de decodificación basado en síndrome y votación por mayoría demostró ser eficaz para la corrección de errores dentro de la capacidad del código, evidenciando el compromiso fundamental entre tasa de código, redundancia y capacidad de corrección. La integración de una cadena de comunicación completa con modulación digital y canal AWGN permitió observar el impacto del ruido y del esquema de modulación sobre la tasa de error de bit."),
  P("Como trabajo futuro se propone incorporar decodificación de decisión blanda mediante propagación de creencias (belief propagation) sobre el grafo de Tanner, que ofrece un rendimiento superior al bit-flipping de decisión dura, así como la generación de curvas BER frente a Eb/N0 para una caracterización cuantitativa del desempeño."),

  H1("VI. Evidencias"),
  H2("A. Firmas de exposición"),
  P("Se anexan las evidencias de las firmas de exposición de laboratorio. El laboratorio contempla tres firmas de exposición (1, 2 y 3); al momento de la entrega se cuenta con dos, quedando la tercera pendiente."),
  evidence("firma_exposicion_1.jpg", "[ Insertar imagen ]  Firma 1 — 19/05/2026"),
  caption("Figura 1. Firma de exposición 1 — 19/05/2026."),
  evidence("firma_exposicion_2.jpg", "[ Insertar imagen ]  Firma 2 — 20/05/2026"),
  caption("Figura 2. Firma de exposición 2 — 20/05/2026."),
  placeholderBox("Firma 3 — pendiente de registrar"),
  caption("Figura 3. Firma de exposición 3 — pendiente."),

  H2("B. Firmas Jhonattan Aponte"),
  P("Se anexan las evidencias correspondientes a los ejercicios resueltos por el estudiante Jhonattan Fernando Aponte Gamboa durante las sesiones de laboratorio."),
  evidence("jhonattan_1.jpg", "[ Insertar imagen ]  Ejercicio de codificación — 11/05/2026"),
  caption("Figura 4. Ejercicio de codificación, C(D) = g(D)·M(D) — 11/05/2026."),
  evidence("jhonattan_2.jpg", "[ Insertar imagen ]  Ejercicio 3: métrica y decodificación (Viterbi) — 25/05/2026"),
  caption("Figura 5. Ejercicio 3: cálculo de métrica y decodificación sobre el trellis — 25/05/2026."),

  H1("Referencias"),
  P("[1]  C. E. Shannon, “A mathematical theory of communication,” Bell System Technical Journal, vol. 27, no. 3, pp. 379–423, 1948.", { paragraph: { alignment: AlignmentType.LEFT, spacing: { after: 60 } } }),
  P("[2]  R. G. Gallager, “Low-density parity-check codes,” IRE Trans. Information Theory, vol. 8, no. 1, pp. 21–28, 1962.", { paragraph: { alignment: AlignmentType.LEFT, spacing: { after: 60 } } }),
  P("[3]  D. J. C. MacKay, “Good error-correcting codes based on very sparse matrices,” IEEE Trans. Information Theory, vol. 45, no. 2, pp. 399–431, 1999.", { paragraph: { alignment: AlignmentType.LEFT, spacing: { after: 60 } } }),
  P("[4]  S. Lin and D. J. Costello, Error Control Coding, 2nd ed. Upper Saddle River, NJ: Prentice Hall, 2004.", { paragraph: { alignment: AlignmentType.LEFT, spacing: { after: 60 } } }),
  P("[5]  J. G. Proakis and M. Salehi, Digital Communications, 5th ed. New York: McGraw-Hill, 2007.", { paragraph: { alignment: AlignmentType.LEFT, spacing: { after: 60 } } }),
];

// ---- document --------------------------------------------------------------
const pageMargin = { top: 1440, right: 1440, bottom: 1440, left: 1440 };
const footer = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
  children: [new TextRun("Página "), new TextRun({ children: [PageNumber.CURRENT] }),
    new TextRun(" de "), new TextRun({ children: [PageNumber.TOTAL_PAGES] })] })] });

const doc = new Document({
  creator: "Grupo LDPC - Universidad Francisco José de Caldas",
  title: "Codificación y Decodificación de Canal mediante Códigos LDPC",
  styles: {
    default: { document: { run: { font: "Times New Roman", size: 20 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, allCaps: true, font: "Times New Roman" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 20, italics: true, font: "Times New Roman" },
        paragraph: { spacing: { before: 120, after: 60 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•",
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 220 } } } }] },
      { reference: "nums", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.",
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 220 } } } }] },
    ],
  },
  sections: [
    {
      // Section 1: title block, single column, full width
      properties: { page: { size: { width: 12240, height: 15840 }, margin: pageMargin } },
      footers: { default: footer },
      children: titleBlock,
    },
    {
      // Section 2: body, two columns, continuous (same page)
      properties: {
        type: SectionType.CONTINUOUS,
        page: { size: { width: 12240, height: 15840 }, margin: pageMargin },
        column: { count: 2, space: COL_GAP, equalWidth: true, separate: false },
      },
      footers: { default: footer },
      children: body,
    },
  ],
});

const out = path.join(__dirname, "informe_ldpc.docx");
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(out, buf); console.log("Escrito:", out); });
