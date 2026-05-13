import { useEffect, useRef, useState } from "react";
import type React from "react";
import { X } from "lucide-react";
import { usePipelineStore, type InspectTarget } from "../store/pipelineStore";
import { getCode } from "../lib/encoders/index";
import type { LDPCCode } from "../lib/encoders/LDPC";
import { explainDecodeBlock, explainEncodeBlock } from "../lib/encoders/LDPC";
import { unpackBitsRange, type Bit } from "../lib/bitstream/BitArray";
import type { PipelineResult } from "../lib/pipeline";

/* ============================================================
   Inspector drawer — clicking any pipeline stage, journey node
   or individual bit opens a pedagogical explanation of exactly
   what the LDPC algorithm did there.
   ============================================================ */

export function InspectorDrawer() {
  const { inspect, setInspect, result, codeId } = usePipelineStore();
  const [shown, setShown] = useState<InspectTarget | null>(inspect);
  const open = inspect !== null;
  const closeRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inspect) setShown(inspect);
  }, [inspect]);

  const close = () => {
    closeRef.current?.blur();
    setInspect(null);
  };

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, inspect]);

  const target = inspect ?? shown;
  const code = getCode(codeId);

  return (
    <>
      <div
        className={"drawer-backdrop" + (open ? " open" : "")}
        onClick={close}
        aria-hidden="true"
      />
      <aside
        className={"drawer" + (open ? " open" : "")}
        role="dialog"
        aria-modal="true"
        aria-label="Explicación del paso"
        aria-hidden={!open}
      >
        <div className="drawer-bar">
          <span className="drawer-kicker">Inspector LDPC</span>
          <button ref={closeRef} type="button" className="drawer-close" onClick={close} aria-label="Cerrar inspector">
            <X size={16} />
          </button>
        </div>
        <div className="drawer-scroll" ref={scrollRef}>
          {target ? (
            target.kind === "stage" ? (
              <StageExplain target={target} code={code} result={result} />
            ) : (
              <BitExplain target={target} code={code} result={result} />
            )
          ) : null}
        </div>
      </aside>
    </>
  );
}

/* ---------- shared little pieces ---------- */

function BitRow({ bits, highlight, marks }: { bits: Bit[]; highlight?: number; marks?: Record<number, "data" | "parity" | "altered" | "corrected"> }) {
  return (
    <div className="ins-bits">
      {bits.map((b, i) => {
        const m = marks?.[i];
        const cls = m === "parity" ? "p" : m === "altered" ? "a" : m === "corrected" ? "c" : "";
        return (
          <span key={i} className={"bit-chip " + cls + (i === highlight ? " hi" : "")} title={`#${i}`}>
            {b}
          </span>
        );
      })}
    </div>
  );
}

function SyndromeRow({ s }: { s: number[] }) {
  const clean = s.every((b) => b === 0);
  return (
    <div className="ins-bits">
      {s.map((b, i) => (
        <span key={i} className={"bit-chip" + (b === 1 ? " a" : clean ? " c" : "")} title={`chequeo ${i}`}>
          {b}
        </span>
      ))}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="ins-section">
      <span className="ins-label">{label}</span>
      {children}
    </section>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <code className="inl">{children}</code>;
}

/* ---------- stage explanations ---------- */

interface StageDoc {
  eyebrow: string;
  title: string;
  accent: string;
  lede: string;            // beginner-friendly
  what: React.ReactNode;   // qué entra / qué se hace
  calc: React.ReactNode;   // el cálculo
  out: React.ReactNode;    // qué sale
  nodes: React.ReactNode;  // qué nodos participan
  math: React.ReactNode;   // significado matemático
}

function fmt(n: number) {
  return n.toLocaleString();
}

function buildStageDocs(mode: "encode" | "decode", code: LDPCCode, result: PipelineResult | null): StageDoc[] {
  const k = code.k;
  const n = code.n;
  const m = n - k;
  const has = result !== null;
  const origBits = result?.original.length ?? 0;
  const encBits = result?.encoded.length ?? 0;
  const recBits = result?.received.length ?? 0;
  const decBits = result?.decoded.length ?? 0;

  if (mode === "encode") {
    return [
      {
        eyebrow: "paso 1 · entrada",
        title: "De archivo a",
        accent: "bits",
        lede: "Antes de proteger nada, el archivo se ve como lo que realmente es: una larga tira de ceros y unos. Cada byte del archivo son 8 bits, leídos del más significativo al menos significativo.",
        what: <>Entra el archivo crudo que cargaste. No se modifica ni se interpreta: solo se desempaqueta byte a byte en bits.</>,
        calc: <>Para cada byte <Mono>b</Mono> se emiten los bits <Mono>(b≫7)&1, (b≫6)&1, …, b&1</Mono>. {has && <>Tu archivo produjo <strong>{fmt(origBits)}</strong> bits de información.</>}</>,
        out: <>Una secuencia de {has ? <strong>{fmt(origBits)}</strong> : "todos los"} bits, todos marcados como <em>dato</em> (aún no hay redundancia).</>,
        nodes: <>Todavía no interviene la estructura del código. Estos bits serán los <strong>nodos de variable</strong> sistemáticos: viajarán intactos al codeword.</>,
        math: <>Es solo un cambio de representación: el mismo mensaje <Mono>u ∈ {"{0,1}"}<sup>L</sup></Mono>, escrito bit a bit. La información (entropía) no cambia.</>,
      },
      {
        eyebrow: "paso 2 · bloqueo",
        title: "Cortar en",
        accent: `bloques de ${k}`,
        lede: `LDPC no procesa el archivo entero de golpe: lo parte en trozos de ${k} bits. Cada trozo se codificará por separado con la misma matriz.`,
        what: <>Entra la tira de {has ? fmt(origBits) : "L"} bits. Se corta en bloques de <Mono>k = {k}</Mono> bits. Si el último bloque no llega a {k}, se rellena con ceros (padding).</>,
        calc: <>Número de bloques = <Mono>⌈L / {k}⌉</Mono>{has && <> = <strong>{fmt(Math.ceil(origBits / k))}</strong> bloques</>}. Los ceros de relleno son inofensivos: al decodificar se descartan.</>,
        out: <>Una lista de vectores <Mono>u ∈ {"{0,1}"}<sup>{k}</sup></Mono>, listos para multiplicarse por la matriz generadora.</>,
        nodes: <>Cada bloque define una instancia del grafo de Tanner: <Mono>{k}</Mono> nodos de variable de datos + <Mono>{m}</Mono> de paridad, y <Mono>{m}</Mono> nodos de chequeo.</>,
        math: <>El código es de longitud fija <Mono>n = {n}</Mono> y dimensión <Mono>k = {k}</Mono>. Trabajar por bloques es lo que hace que las matrices sean pequeñas y &ldquo;dispersas&rdquo; (low-density).</>,
      },
      {
        eyebrow: "paso 3 · paridad",
        title: "Aplicar la matriz",
        accent: "generadora G",
        lede: `Aquí nace la redundancia. A cada bloque de ${k} bits se le añaden ${m} bits de control calculados como sumas XOR de ciertos bits de datos. El resultado tiene ${n} bits.`,
        what: <>Entra cada bloque <Mono>u</Mono> de {k} bits. Se calcula <Mono>c = u · G</Mono> (aritmética módulo 2).</>,
        calc: <>Como <Mono>G = [ I<sub>{k}</sub> | P ]</Mono> es sistemática, las primeras {k} posiciones del codeword son <em>copias</em> de los datos, y cada bit de paridad <Mono>p<sub>j</sub></Mono> es el XOR de los bits de datos donde la columna de <Mono>G</Mono> vale 1. {has && <>Por bloque se añaden <strong>{m}</strong> bits de paridad.</>}</>,
        out: <>Cada bloque pasa de {k} a <Mono>n = {n}</Mono> bits. {has && <>En total <strong>{fmt(encBits)}</strong> bits codificados ({fmt(Math.max(0, encBits - origBits))} de ellos, redundancia).</>}</>,
        nodes: <>Cada bit de paridad &ldquo;cierra&rdquo; un nodo de chequeo: la fila correspondiente de <Mono>H</Mono> conecta a ese bit con los datos que lo definen. Por construcción <Mono>c · H<sup>T</sup> = 0</Mono>.</>,
        math: <><Mono>C = {"{ u·G : u ∈ {0,1}^k }"}</Mono> es un subespacio de dimensión {k}. La distancia mínima de este subespacio determina cuántos errores se pueden corregir.</>,
      },
      {
        eyebrow: "paso 4 · salida",
        title: "Empaquetar el",
        accent: "codeword",
        lede: "Los bloques codificados se concatenan y se guardan como texto binario (grupos de bits separados por espacios) para que sea fácil de inspeccionar y transmitir.",
        what: <>Entran todos los bloques de {n} bits. Se concatenan en orden y se serializan a texto.</>,
        calc: <>Tasa del código <Mono>R = k/n = {code.rate.toFixed(3)}</Mono>: por cada bit transmitido, {(code.rate * 100).toFixed(1)}% es información y el resto control. {has && <>Salida final: <strong>{fmt(encBits)}</strong> bits.</>}</>,
        out: <>Un archivo <Mono>.txt</Mono> con la palabra código completa, listo para pasar por un canal ruidoso (probalo en el modo Decodificar).</>,
        nodes: <>El archivo entero ya no es &ldquo;datos&rdquo;: alterna nodos de variable de datos y de paridad, bloque tras bloque.</>,
        math: <>Has aplicado la codificación <Mono>u ↦ c = uG</Mono>. El receptor, sin saber <Mono>u</Mono>, podrá recuperarlo mientras el canal no introduzca demasiados errores por bloque.</>,
      },
    ];
  }

  // decode
  const preBER = result?.metrics.berPreDecode ?? 0;
  const corrected = result?.metrics.errorsCorrected ?? 0;
  const residual = result?.metrics.errorsUncorrected ?? 0;
  return [
    {
      eyebrow: "paso 1 · entrada",
      title: "Leer la palabra",
      accent: "codificada",
      lede: `Recibís un archivo que ya pasó por una codificación LDPC: una tira de bits que debería estar alineada en bloques de ${n}. Se reconstruyen esos bloques.`,
      what: <>Entra el archivo codificado (texto binario o bytes). Se interpreta como bits y se agrupa en bloques de <Mono>n = {n}</Mono>.</>,
      calc: <>Se valida que la longitud sea múltiplo de {n}. {has && <>Se alinearon <strong>{fmt(recBits)}</strong> bits = <strong>{fmt(recBits / n)}</strong> bloques.</>}</>,
      out: <>Una lista de vectores recibidos <Mono>r ∈ {"{0,1}"}<sup>{n}</sup></Mono> (todavía sin ruido aplicado en la app).</>,
      nodes: <>Cada bloque vuelve a instanciar el grafo de Tanner del código: {n} nodos de variable, {m} nodos de chequeo.</>,
      math: <>Aún no hay decodificación: solo se recupera <Mono>r</Mono> tal como llegó. La pregunta que sigue es: ¿se cumple <Mono>r·H<sup>T</sup> = 0</Mono>?</>,
    },
    {
      eyebrow: "paso 2 · canal",
      title: "Atravesar el",
      accent: "ruido",
      lede: "Para simular una transmisión real, se corrompen algunos bits: o al azar con cierta probabilidad (canal binario simétrico), o invirtiendo un patrón concreto que vos elegís.",
      what: <>Entra <Mono>r</Mono>. En modo BSC, cada bit se invierte con probabilidad <Mono>p</Mono> de forma independiente. En modo patrón, se hace XOR del patrón en la posición indicada.</>,
      calc: <>BSC: <Mono>r′<sub>i</sub> = r<sub>i</sub> ⊕ e<sub>i</sub></Mono>, con <Mono>P(e<sub>i</sub>=1) = p</Mono>. {has && <>Tasa de error medida tras el canal: <strong>{preBER.toFixed(4)}</strong>.</>}</>,
      out: <>La señal recibida con errores. Los bits invertidos aparecen marcados como <em>alterado</em> en la grilla.</>,
      nodes: <>Los errores quedan sobre nodos de variable concretos; los nodos de chequeo que los tocan dejarán de cumplirse.</>,
      math: <>El vector de error <Mono>e</Mono> es desconocido para el decoder. Lo único observable es <Mono>r′</Mono>, y de ahí el síndrome <Mono>s = r′·H<sup>T</sup> = e·H<sup>T</sup></Mono>.</>,
    },
    {
      eyebrow: "paso 3 · síndrome",
      title: "Calcular el",
      accent: "síndrome y corregir",
      lede: `El decoder no conoce el mensaje original, pero sí la matriz H. Multiplica cada bloque por H: si da todo ceros, no hay error; si no, el resultado (el "síndrome") apunta a qué bits sospechar.`,
      what: <>Entra cada bloque recibido <Mono>r′</Mono>. Se calcula <Mono>s = H · r′</Mono> (módulo 2), un vector de {m} bits.</>,
      calc: (
        <>
          <p>Si <Mono>s = 0</Mono>: el bloque ya satisface todas las ecuaciones de paridad, se acepta.</p>
          <p>Si <Mono>s</Mono> coincide exactamente con una columna de <Mono>H</Mono>: ese único bit es el culpable, se invierte y se recalcula.</p>
          <p>Si no: bit-flipping iterativo. Se invierte el bit que participa en más chequeos fallidos (voto mayoritario) y se repite, hasta {10} iteraciones.</p>
          {has && <p>Resultado: <strong>{fmt(corrected)}</strong> bits corregidos, <strong>{fmt(residual)}</strong> chequeos sin resolver.</p>}
        </>
      ),
      out: <>Para cada bloque, un codeword corregido (idealmente con síndrome cero) del que se extraen los {k} bits de datos.</>,
      nodes: <>Es paso de mensajes en el grafo de Tanner: los nodos de chequeo &ldquo;votan&rdquo; sobre los nodos de variable que tocan; el más señalado se invierte.</>,
      math: <>Decodificación por síndrome: dos vectores recibidos tienen el mismo síndrome sii difieren en una palabra código. El decoder elige el patrón de error más probable (de menor peso) compatible con <Mono>s</Mono>.</>,
    },
    {
      eyebrow: "paso 4 · salida",
      title: "Reconstruir la",
      accent: "carga útil",
      lede: "Como el código es sistemático, los datos están en las primeras k posiciones de cada bloque corregido. Se concatenan y se reempaquetan como archivo.",
      what: <>Entran los bloques corregidos. De cada uno se toman los primeros <Mono>k = {k}</Mono> bits.</>,
      calc: <>{has && <>Salida: <strong>{fmt(decBits)}</strong> bits de datos. Hash SHA-256 del resultado: <Mono>{result?.metrics.decodedHash.slice(0, 16)}…</Mono></>}</>,
      out: <>Un archivo reconstruido. Si el canal no superó la capacidad de corrección del código, es bit-a-bit idéntico al original.</>,
      nodes: <>Solo sobreviven los nodos de variable de datos; los de paridad cumplieron su función y se descartan.</>,
      math: <>Has invertido la codificación: dado <Mono>c</Mono> recuperado, <Mono>u</Mono> son sus primeras {k} coordenadas. Comparar el hash con el original es la prueba empírica de que la corrección funcionó.</>,
    },
  ];
}

function StageExplain({ target, code, result }: { target: Extract<InspectTarget, { kind: "stage" }>; code: LDPCCode; result: PipelineResult | null }) {
  const docs = buildStageDocs(target.mode, code, result);
  const doc = docs[Math.min(target.index, docs.length - 1)];
  return (
    <div className="ins">
      <div className="ins-head">
        <span className="ins-eyebrow">{doc.eyebrow}</span>
        <h3>
          {doc.title} <span className="accent">{doc.accent}</span>
        </h3>
        <p className="ins-lede">{doc.lede}</p>
      </div>
      <Section label="Qué entra y qué se hace">
        <p>{doc.what}</p>
      </Section>
      <Section label="El cálculo">
        <div className="ins-prose">{doc.calc}</div>
      </Section>
      <Section label="Qué sale">
        <p>{doc.out}</p>
      </Section>
      <Section label="Qué nodos participan">
        <p>{doc.nodes}</p>
      </Section>
      <Section label="Significado matemático">
        <p>{doc.math}</p>
      </Section>
      {!result && (
        <div className="alert warn">
          <span className="ic">!</span>
          <div>Cargá un archivo y ejecutá el pipeline para ver esta etapa con datos reales.</div>
        </div>
      )}
    </div>
  );
}

/* ---------- bit explanations ---------- */

function roleLabel(within: number, k: number) {
  return within < k ? `dato d${within + 1}` : `paridad p${within - k + 1}`;
}

function BitExplain({ target, code, result }: { target: Extract<InspectTarget, { kind: "bit" }>; code: LDPCCode; result: PipelineResult | null }) {
  if (!result) {
    return (
      <div className="ins">
        <div className="alert warn">
          <span className="ic">!</span>
          <div>Ejecutá el pipeline para inspeccionar bits con datos reales.</div>
        </div>
      </div>
    );
  }
  const k = code.k;
  const n = code.n;
  const m = n - k;
  const idx = target.index;

  /* ------- ENCODE ------- */
  if (target.which === "original") {
    const b = Math.floor(idx / k);
    const within = idx % k;
    const dataBlock = unpackBitsRange(result.original.bits, b * k, k);
    const enc = explainEncodeBlock(code, dataBlock);
    const goesTo = within; // systematic: data position == codeword position
    const usedIn: number[] = [];
    for (let j = k; j < n; j++) if (enc.contributors[j].includes(within)) usedIn.push(j);
    return (
      <BitShell title={`Bit #${fmt(idx)}`} badge="dato original" badgeCls="">
        <Section label="Ubicación">
          <p>Bloque <strong>#{fmt(b)}</strong>, posición <strong>{within}</strong> de {k}. Es el bit de <strong>{roleLabel(within, k)}</strong> de su bloque.</p>
        </Section>
        <Section label="Valor">
          <BitRow bits={dataBlock} highlight={within} />
          <p>Valor actual: <Mono>{dataBlock[within]}</Mono>.</p>
        </Section>
        <Section label="Qué le pasa al codificar">
          <p>El código es sistemático: este bit se <strong>copia tal cual</strong> a la posición {goesTo} de la palabra código del bloque #{fmt(b)}.</p>
          {usedIn.length > 0 ? (
            <p>Además contribuye (vía XOR) a {usedIn.length === 1 ? "el bit de paridad" : "los bits de paridad"} {usedIn.map((j) => `p${j - k + 1}`).join(", ")} de ese bloque.</p>
          ) : (
            <p>No participa en ningún bit de paridad de este código en concreto.</p>
          )}
        </Section>
        <Section label="Significado matemático">
          <p>En <Mono>c = u·G</Mono> con <Mono>G = [I | P]</Mono>, este bit es la coordenada {within + 1} de <Mono>u</Mono>, por eso aparece intacta en <Mono>c</Mono> y, multiplicada por la fila {within + 1} de <Mono>P</Mono>, en las paridades.</p>
        </Section>
      </BitShell>
    );
  }

  if (target.which === "encoded") {
    const b = Math.floor(idx / n);
    const within = idx % n;
    const dataBlock = unpackBitsRange(result.original.bits, b * k, k);
    const enc = explainEncodeBlock(code, dataBlock);
    const isParity = within >= k;
    const contributors = enc.contributors[within];
    return (
      <BitShell title={`Bit #${fmt(idx)}`} badge={isParity ? "bit de paridad" : "dato (sistemático)"} badgeCls={isParity ? "p" : ""}>
        <Section label="Ubicación">
          <p>Bloque codificado <strong>#{fmt(b)}</strong>, posición <strong>{within}</strong> de {n}. Es <strong>{roleLabel(within, k)}</strong>.</p>
        </Section>
        <Section label="El bloque entero">
          <BitRow
            bits={enc.codeword}
            highlight={within}
            marks={Object.fromEntries(enc.codeword.map((_, j) => [j, j >= k ? "parity" : "data"]))}
          />
          <p className="ins-cap">datos d1…d{k} en celeste · paridad p1…p{m} en violeta</p>
        </Section>
        {isParity ? (
          <Section label="De dónde sale">
            <p>Este bit de paridad es el XOR de los bits de datos del bloque donde la columna {within} de <Mono>G</Mono> vale 1:</p>
            <p className="ins-eq">
              <Mono>
                p{within - k + 1} = {contributors.length === 0 ? "0" : contributors.map((i) => `d${i + 1}`).join(" ⊕ ")}
                {" = "}
                {contributors.length === 0 ? "0" : contributors.map((i) => dataBlock[i]).join(" ⊕ ")}
                {" = "}
                {enc.codeword[within]}
              </Mono>
            </p>
            <p>Por eso, si el canal invierte uno solo de esos bits, esta ecuación de paridad deja de cumplirse y el decoder lo notará.</p>
          </Section>
        ) : (
          <Section label="De dónde sale">
            <p>Es una <strong>copia exacta</strong> del bit de datos d{within + 1} del bloque #{fmt(b)} (parte sistemática <Mono>I</Mono> de <Mono>G</Mono>). Valor: <Mono>{enc.codeword[within]}</Mono>.</p>
          </Section>
        )}
        <Section label="Significado matemático">
          <p>{isParity ? <>Esta coordenada de <Mono>c</Mono> corresponde a una columna de <Mono>P</Mono>: un producto interno (módulo 2) entre <Mono>u</Mono> y esa columna.</> : <>Esta coordenada de <Mono>c</Mono> corresponde a una columna de la identidad <Mono>I</Mono> dentro de <Mono>G</Mono>, de ahí que sea el dato sin alterar.</>}</p>
        </Section>
      </BitShell>
    );
  }

  /* ------- DECODE ------- */
  if (target.which === "received") {
    const b = Math.floor(idx / n);
    const within = idx % n;
    const receivedBlock = unpackBitsRange(result.received.bits, b * n, n);
    const sentBlock = unpackBitsRange(result.original.bits, b * n, n); // pre-noise codeword
    const dec = explainDecodeBlock(code, receivedBlock);
    const wasAltered = receivedBlock[within] !== sentBlock[within];
    const wasFlippedByDecoder = dec.correctedPositions.includes(within);
    const finalValue = dec.corrected[within];
    return (
      <BitShell
        title={`Bit #${fmt(idx)}`}
        badge={wasAltered ? "alterado por el canal" : roleLabel(within, k)}
        badgeCls={wasAltered ? "a" : ""}
      >
        <Section label="Ubicación">
          <p>Bloque recibido <strong>#{fmt(b)}</strong>, posición <strong>{within}</strong> de {n} ({roleLabel(within, k)}).</p>
        </Section>
        <Section label="Transmitido → recibido → decodificado">
          <p className="ins-eq">
            <Mono>{sentBlock[within]}</Mono> <span className="ins-arrow">→</span> <Mono>{receivedBlock[within]}</Mono> <span className="ins-arrow">→</span> <Mono>{finalValue}</Mono>
          </p>
          <p>
            {wasAltered
              ? "El canal invirtió este bit. "
              : "El canal no tocó este bit. "}
            {wasFlippedByDecoder
              ? "El decoder lo invirtió durante la corrección."
              : "El decoder lo dejó como llegó."}
            {" "}
            {finalValue === sentBlock[within] ? "Quedó igual al transmitido: bien." : "No coincide con el transmitido."}
          </p>
        </Section>
        <Section label="El bloque recibido">
          <BitRow
            bits={receivedBlock}
            highlight={within}
            marks={Object.fromEntries(receivedBlock.map((_, j) => [j, receivedBlock[j] !== sentBlock[j] ? "altered" : j >= k ? "parity" : "data"]))}
          />
        </Section>
        <Section label="Síndrome del bloque (s = H · r)">
          <SyndromeRow s={dec.initialSyndrome} />
          {dec.initialSyndrome.every((x) => x === 0) ? (
            <p>Todo ceros: el bloque ya cumple las {m} ecuaciones de paridad, no se corrige nada.</p>
          ) : (
            <p>
              Chequeos que fallan: {dec.initialSyndrome.map((x, i) => (x ? `c${i + 1}` : null)).filter(Boolean).join(", ")}.
              {" "}El chequeo c{(dec.initialSyndrome.findIndex((x) => x === 1)) + 1} involucra las posiciones {"{" + dec.checkMembers[dec.initialSyndrome.findIndex((x) => x === 1)].join(", ") + "}"} del codeword.
            </p>
          )}
        </Section>
        <DecodeIterations dec={dec} highlight={within} />
        <Section label="Significado matemático">
          <p>El síndrome <Mono>s = H·r = H·e</Mono> depende solo del patrón de error <Mono>e</Mono>, no del mensaje. Si <Mono>s</Mono> es una columna de <Mono>H</Mono>, hay un único bit erróneo (y es ese); si no, se usa bit-flipping para acercarse a <Mono>s = 0</Mono>.</p>
        </Section>
      </BitShell>
    );
  }

  // which === "decoded"
  {
    const b = Math.floor(idx / k);
    const within = idx % k;
    const receivedBlock = unpackBitsRange(result.received.bits, b * n, n);
    const dec = explainDecodeBlock(code, receivedBlock);
    const before = receivedBlock[within];
    const after = dec.data[within];
    const wasCorrected = dec.correctedPositions.includes(within);
    return (
      <BitShell title={`Bit #${fmt(idx)}`} badge={wasCorrected ? "dato corregido" : "dato recuperado"} badgeCls={wasCorrected ? "c" : ""}>
        <Section label="Ubicación">
          <p>Dato <strong>d{within + 1}</strong> del bloque <strong>#{fmt(b)}</strong> (posición {within} de los {k} datos). En el codeword recibido estaba en la posición {within} de {n}.</p>
        </Section>
        <Section label="Recibido → recuperado">
          <p className="ins-eq">
            <Mono>{before}</Mono> <span className="ins-arrow">→</span> <Mono>{after}</Mono>
          </p>
          <p>{wasCorrected ? "El decoder invirtió esta posición porque era la más señalada por los chequeos de paridad que fallaban." : "El decoder no necesitó tocar esta posición."}</p>
        </Section>
        <Section label="Cómo decidió el decoder">
          <SyndromeRow s={dec.initialSyndrome} />
          <p>{dec.success ? "El bloque terminó con síndrome cero: la corrección converge y los datos extraídos son fiables." : "El bloque NO llegó a síndrome cero tras las iteraciones; este dato puede ser incorrecto (más errores de los que el código tolera)."}</p>
        </Section>
        <DecodeIterations dec={dec} highlight={within} />
        <Section label="Significado matemático">
          <p>Por ser un código sistemático, <Mono>u = c[0..{k - 1}]</Mono>: el dato recuperado es, literalmente, la primera parte del codeword corregido. La calidad de <Mono>u</Mono> depende de que <Mono>c</Mono> haya vuelto a un codeword válido.</p>
        </Section>
      </BitShell>
    );
  }
}

function DecodeIterations({ dec, highlight }: { dec: ReturnType<typeof explainDecodeBlock>; highlight: number }) {
  if (dec.iterations.length === 0) return null;
  const label = (a: typeof dec.iterations[number]["action"]) =>
    a === "already-clean"
      ? "síndrome cero, se acepta"
      : a === "flip-syndrome-column"
        ? "el síndrome es una columna de H"
        : a === "flip-majority-vote"
          ? "voto mayoritario de chequeos fallidos"
          : "atascado, no se puede corregir más";
  return (
    <Section label="Iteraciones de corrección">
      <ol className="ins-iters">
        {dec.iterations.map((it, i) => (
          <li key={i} className={it.target === highlight ? "hi" : ""}>
            <span className="ins-iter-n">{i + 1}</span>
            <span>
              s = [{it.syndrome.join(" ")}] — {label(it.action)}
              {it.target !== null && (
                <>
                  {" "}→ invierte el bit <strong>#{it.target}</strong>
                  {it.target === highlight && " (este)"}
                </>
              )}
            </span>
          </li>
        ))}
      </ol>
      <p className="ins-cap">
        síndrome final: [{dec.finalSyndrome.join(" ")}] {dec.success ? "✓ válido" : "× sin resolver"}
      </p>
    </Section>
  );
}

function BitShell({ title, badge, badgeCls, children }: { title: string; badge: string; badgeCls: string; children: React.ReactNode }) {
  return (
    <div className="ins">
      <div className="ins-head">
        <span className="ins-eyebrow">bit individual</span>
        <h3>
          {title} <span className={"ins-badge " + badgeCls}>{badge}</span>
        </h3>
      </div>
      {children}
    </div>
  );
}
