import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  RadioTower,
  RefreshCw,
  Waves,
  Binary,
  ShieldCheck,
  ShieldAlert,
  FileUp,
  File as FileIcon,
  Download,
  Shuffle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { BitGrid } from "./BitStreamViewer";
import { bitsToCodewordText, type BitType } from "../lib/bitstream/BitArray";
import { ALL_LDPC, type LDPCCode } from "../lib/encoders/LDPC";
import { ALL_MOD, MOD_INFO, idealConstellation, type ConstSymbol, type ModScheme } from "../lib/modulation/modulation";
import { runFullChain, type FullChainResult } from "../lib/fullChain";

/** Mismas tasas que el apartado de codificación (todos los códigos LDPC, incluye 4/7). */
const RATE_CODES: LDPCCode[] = ALL_LDPC;

type Phase = "tx" | "channel" | "rx" | "result";
type Side = "encode" | "decode";

const PHASE_LABEL: Record<Phase, string> = {
  tx: "Transmisor",
  channel: "Canal",
  rx: "Receptor",
  result: "Resultado",
};

interface Step {
  phase: Phase;
  side: Side;
  icon: typeof Activity;
  short: string;
  eyebrow: string;
  title: string;
  accent: string;
  desc: string;
  body: React.ReactNode;
}

/** Columna de pasos independiente (una para codificar, otra para decodificar). */
function StepColumn({
  kind,
  title,
  subtitle,
  steps,
  active,
  setActive,
}: {
  kind: Side;
  title: string;
  subtitle: string;
  steps: Step[];
  active: number;
  setActive: (n: number) => void;
}) {
  const current = Math.min(active, steps.length - 1);
  const step = steps[current];
  const StepIcon = step.icon;

  return (
    <section className="fc-stepper" data-side={kind}>
      <header className="fc-col-head" data-side={kind}>
        <span className="fc-col-tag">{kind === "encode" ? "transmisor" : "receptor"}</span>
        <h2>{title}</h2>
        <p className="muted">{subtitle}</p>
      </header>

      <ol className="fc-steprail" aria-label={`Pasos de ${title}`}>
        {steps.map((s, i) => (
          <li key={i} className="fc-steprail-item">
            <button
              type="button"
              className="fc-stepchip"
              data-phase={s.phase}
              data-active={i === current}
              data-done={i < current}
              aria-current={i === current ? "step" : undefined}
              onClick={() => setActive(i)}
              title={`${PHASE_LABEL[s.phase]} · ${s.short}`}
            >
              <span className="fc-stepchip-n">{i < current ? "✓" : i + 1}</span>
              <span className="fc-stepchip-t">{s.short}</span>
            </button>
          </li>
        ))}
      </ol>

      <article className="card fc-steppanel" data-phase={step.phase}>
        <div className="fc-steppanel-head">
          <span className="fc-phase-tag" data-phase={step.phase}>{PHASE_LABEL[step.phase]}</span>
          <span className="eyebrow"><StepIcon size={13} /> {step.eyebrow}</span>
          <h2>{step.title} <span className="accent">{step.accent}</span></h2>
          <p className="fc-steppanel-desc">{step.desc}</p>
        </div>
        <div className="fc-steppanel-body">{step.body}</div>
      </article>

      <div className="fc-stepnav">
        <button
          type="button"
          className="btn ghost"
          disabled={current === 0}
          onClick={() => setActive(Math.max(0, current - 1))}
        >
          <ChevronLeft size={16} /> Anterior
        </button>
        <span className="fc-stepnav-count">paso {current + 1} de {steps.length}</span>
        <button
          type="button"
          className="btn primary"
          disabled={current === steps.length - 1}
          onClick={() => setActive(Math.min(steps.length - 1, current + 1))}
        >
          Siguiente <ChevronRight size={16} />
        </button>
      </div>
    </section>
  );
}

/** Clases de color de cada tipo de bit (idénticas a las del visor general). */
const BIT_CLS: Record<BitType, string> = {
  data: "",
  parity: "r",
  altered: "a",
  corrected: "c",
  uncorrected: "e",
};

/**
 * Muestra los bits AGRUPADOS por palabra de código (n bits): los primeros k
 * son el mensaje y los últimos n-k son la corrección (paridad), separados
 * visualmente. Pensado para que se entienda "a simple vista".
 */
function CodewordGrid({
  bits,
  metadata,
  k,
  n,
  unit = "bloque",
  maxBlocks = 24,
}: {
  bits: number[];
  metadata?: Record<number, BitType>;
  k: number;
  n: number;
  unit?: string;
  maxBlocks?: number;
}) {
  const totalBlocks = Math.ceil(bits.length / n) || 0;
  const shown = Math.min(totalBlocks, maxBlocks);
  const hasParity = n > k;

  const blocks = [];
  for (let b = 0; b < shown; b++) {
    const start = b * n;
    const cells = [];
    for (let j = 0; j < n && start + j < bits.length; j++) {
      const gi = start + j;
      const type: BitType = metadata?.[gi] ?? (j < k ? "data" : "parity");
      cells.push(
        <span key={`c${j}`} className={"bit cw-bit " + BIT_CLS[type]} data-bit-type={type} title={`#${gi} · ${type}`}>
          {bits[gi]}
        </span>,
      );
      if (hasParity && j === k - 1) {
        cells.push(<span key={`sep${j}`} className="cw-sep" aria-hidden>›</span>);
      }
    }
    blocks.push(
      <div className="cw-block" key={b}>
        <span className="cw-block-tag">{unit} {b + 1}</span>
        <div className="cw-cells">{cells}</div>
      </div>,
    );
  }

  return (
    <div className="cw-wrap">
      <div className="cw-legend">
        <span className="cw-leg"><i className="cw-key msg" /> {k} bit{k === 1 ? "" : "s"} de mensaje</span>
        {hasParity && <span className="cw-leg"><i className="cw-key par" /> {n - k} bit{n - k === 1 ? "" : "s"} de control</span>}
        <span className="cw-leg total">cada bloque = {n} bits</span>
      </div>
      <div className="cw-grid">{blocks}</div>
      {totalBlocks > shown && (
        <div className="cw-more">+ {(totalBlocks - shown).toLocaleString()} bloques más · se muestran los primeros {shown}</div>
      )}
    </div>
  );
}

/** Tope de tamaño para la cadena síncrona (cualquier archivo hasta este tamaño). */
const MAX_BYTES = 256 * 1024;
/** Etiqueta legible del tope de tamaño. */
const MAX_LABEL = "256 KB";
/** Máximo de puntos dibujados en la constelación (el cálculo usa todos). */
const MAX_PLOT = 1500;

/** Dispara la descarga de un texto como archivo .txt. */
function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function Constellation({ symbols, scheme }: { symbols: ConstSymbol[]; scheme: ModScheme }) {
  const ideal = idealConstellation(scheme);
  const plot = symbols.length > MAX_PLOT ? symbols.slice(0, MAX_PLOT) : symbols;
  const all = [...plot, ...ideal];
  const ext = Math.max(2, ...all.map((s) => Math.max(Math.abs(s.i), Math.abs(s.q)))) * 1.1;
  const S = 280;
  const pad = 16;
  const map = (v: number) => pad + ((v + ext) / (2 * ext)) * (S - 2 * pad);

  return (
    <svg className="constellation" viewBox={`0 0 ${S} ${S}`} role="img" aria-label="Diagrama de constelación">
      {/* ejes */}
      <line x1={pad} y1={map(0)} x2={S - pad} y2={map(0)} className="cst-axis" />
      <line x1={map(0)} y1={pad} x2={map(0)} y2={S - pad} className="cst-axis" />
      {/* puntos recibidos */}
      {plot.map((s, i) => (
        <circle key={i} cx={map(s.i)} cy={map(-s.q)} r={2.4} className="cst-rx" />
      ))}
      {/* puntos ideales */}
      {ideal.map((s, i) => (
        <circle key={`id-${i}`} cx={map(s.i)} cy={map(-s.q)} r={5} className="cst-ideal" />
      ))}
      <text x={S - pad} y={map(0) - 6} className="cst-label" textAnchor="end">I</text>
      <text x={map(0) + 6} y={pad + 8} className="cst-label">Q</text>
    </svg>
  );
}

function ConstFigure({
  symbols,
  scheme,
  movingLabel,
}: {
  symbols: ConstSymbol[];
  scheme: ModScheme;
  movingLabel: string;
}) {
  return (
    <figure className="fc-figure">
      <Constellation symbols={symbols} scheme={scheme} />
      <figcaption className="fc-figcap">
        <span><i className="cst-key ideal" aria-hidden /> posición ideal</span>
        <span><i className="cst-key rx" aria-hidden /> {movingLabel}</span>
      </figcaption>
    </figure>
  );
}

/** Compara el texto enviado con el recuperado, resaltando los caracteres que no se pudieron reparar. */
function RecoveredText({ original, recovered }: { original: string; recovered: string }) {
  const len = Math.max(original.length, recovered.length);
  const out: React.ReactNode[] = [];
  for (let i = 0; i < len; i++) {
    const o = original[i];
    const r = recovered[i];
    const bad = r !== o;
    const glyph = r == null ? "·" : r === " " ? "␣" : r;
    out.push(
      <span key={i} className={bad ? "fc-ch bad" : "fc-ch"}>
        {glyph}
      </span>,
    );
  }
  return <code className="fc-text-diff">{out}</code>;
}

interface FileSource {
  name: string;
  type: string;
  bytes: Uint8Array;
  truncated: boolean;
}

export function FullProcessPage({ view }: { view: Side }) {
  const navigate = useNavigate();

  const [inputKind, setInputKind] = useState<"text" | "file">("text");
  const [text, setText] = useState("HOLA");
  const [fileSource, setFileSource] = useState<FileSource | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [sourceId, setSourceId] = useState("ldpc_8_12"); // 2/3
  const [channelId, setChannelId] = useState("ldpc_8_16"); // 1/2
  const [modulation, setModulation] = useState<ModScheme>("qpsk");
  const [noise, setNoise] = useState(0.45);
  const [manualFlips, setManualFlips] = useState(0);
  const [encStep, setEncStep] = useState(0);
  const [decStep, setDecStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sourceCode = RATE_CODES.find((c) => c.id === sourceId) ?? RATE_CODES[0];
  const channelCode = RATE_CODES.find((c) => c.id === channelId) ?? RATE_CODES[0];

  const loadFile = async (f: File) => {
    setFileError(null);
    const buf = new Uint8Array(await f.arrayBuffer());
    const truncated = buf.length > MAX_BYTES;
    const bytes = truncated ? buf.slice(0, MAX_BYTES) : buf;
    if (truncated) {
      setFileError(`El archivo supera ${MAX_LABEL}; se procesan los primeros ${MAX_LABEL}.`);
    }
    setFileSource({ name: f.name, type: f.type || "application/octet-stream", bytes, truncated });
    setInputKind("file");
  };

  // Bytes de la señal fuente según el modo de entrada.
  const sourceBytes = useMemo(() => {
    if (inputKind === "file" && fileSource) return fileSource.bytes;
    return new TextEncoder().encode(text || " ");
  }, [inputKind, fileSource, text]);

  // El resultado NO se calcula al subir/cambiar: solo al hacer clic en el botón.
  const [result, setResult] = useState<FullChainResult | null>(null);
  const [busy, setBusy] = useState(false);

  // Cualquier cambio de parámetros invalida el resultado (hay que volver a procesar).
  useEffect(() => {
    setResult(null);
  }, [sourceBytes, sourceCode, channelCode, modulation, noise, manualFlips]);

  const runChain = () => {
    // Mostramos "procesando…" y diferimos el cálculo (bloqueante) un tick
    // para que el navegador pinte el estado antes de congelarse con archivos grandes.
    setBusy(true);
    setTimeout(() => {
      setResult(runFullChain({ bytes: sourceBytes, sourceCode, channelCode, modulation, noise, manualFlips }));
      setBusy(false);
    }, 20);
  };

  const m = result?.metrics ?? null;
  const ready = result !== null;
  const runLabel = view === "encode" ? "Codificar" : "Decodificar";
  const isImage = inputKind === "file" && (fileSource?.type.startsWith("image/") ?? false);

  // URLs para previsualizar la entrada y el archivo recuperado.
  const recoveredUrl = useMemo(() => {
    if (inputKind !== "file" || !fileSource || !result) return null;
    return URL.createObjectURL(new Blob([new Uint8Array(result.recoveredBytes)], { type: fileSource.type }));
  }, [inputKind, fileSource, result]);
  const originalUrl = useMemo(() => {
    if (inputKind !== "file" || !fileSource) return null;
    return URL.createObjectURL(new Blob([new Uint8Array(fileSource.bytes)], { type: fileSource.type }));
  }, [inputKind, fileSource]);
  useEffect(() => () => { if (recoveredUrl) URL.revokeObjectURL(recoveredUrl); }, [recoveredUrl]);
  useEffect(() => () => { if (originalUrl) URL.revokeObjectURL(originalUrl); }, [originalUrl]);

  const pendingBody = (
    <div className="fc-pending">
      <p>Configurá los parámetros y hacé clic en <strong>{runLabel}</strong> para ver este paso.</p>
    </div>
  );

  // ---- Definición de los pasos del stepper -------------------------------
  const steps: Step[] = [
    {
      phase: "tx", side: "encode", icon: ShieldCheck, short: "Fuente",
      eyebrow: "paso 1 · codificación de fuente", title: "Bloques de", accent: "fuente",
      desc: `Tu ${inputKind === "file" ? "archivo" : "texto"} se vuelve bits y LDPC ${sourceCode.label} los agrupa en bloques de ${sourceCode.n} bits: ${sourceCode.k} de mensaje + ${sourceCode.n - sourceCode.k} de control.`,
      body: result ? <CodewordGrid bits={result.sourceEncoded.bits} metadata={result.sourceEncoded.metadata} k={sourceCode.k} n={sourceCode.n} /> : pendingBody,
    },
    {
      phase: "tx", side: "encode", icon: Activity, short: "Canal",
      eyebrow: "paso 2 · codificación de canal", title: "Bloques de", accent: "canal",
      desc: `LDPC ${channelCode.label}: se vuelve a codificar para proteger la transmisión. Cada bloque = ${channelCode.n} bits (${channelCode.k} de mensaje + ${channelCode.n - channelCode.k} de control).`,
      body: result ? (
        <>
          <CodewordGrid bits={result.channelEncoded.bits} metadata={result.channelEncoded.metadata} k={channelCode.k} n={channelCode.n} />
          <button type="button" className="btn ghost btn-sm fc-dl" onClick={() => downloadText("codificado.txt", bitsToCodewordText(result.channelEncoded.bits, channelCode.n, channelCode.k))}>
            <Download size={14} /> Descargar codificado (.txt)
          </button>
        </>
      ) : pendingBody,
    },
    {
      phase: "tx", side: "encode", icon: Waves, short: "Modular",
      eyebrow: "paso 3 · modulación", title: "Símbolos", accent: MOD_INFO[modulation].label,
      desc: `${result ? result.metrics.afterChannel : "—"} bits → ${result ? result.metrics.symbols : "—"} símbolos (${MOD_INFO[modulation].bitsPerSymbol} bit/símbolo). Cada símbolo cae exactamente en un punto de la constelación.`,
      body: result ? <ConstFigure symbols={result.symbolsTx} scheme={modulation} movingLabel="símbolo transmitido" /> : pendingBody,
    },
    {
      phase: "channel", side: "decode", icon: RadioTower, short: "Ruido",
      eyebrow: "paso 1 · canal con ruido (AWGN)", title: "Constelación", accent: "recibida",
      desc: `El ruido (σ=${noise.toFixed(2)})${manualFlips > 0 ? ` más ${manualFlips} error${manualFlips === 1 ? "" : "es"} manual${manualFlips === 1 ? "" : "es"}` : ""} desplaza los símbolos. La decisión dura asigna cada uno al punto ideal más cercano.`,
      body: result ? <ConstFigure symbols={result.symbolsRx} scheme={modulation} movingLabel="símbolo recibido (con ruido)" /> : pendingBody,
    },
    {
      phase: "rx", side: "decode", icon: Binary, short: "Demod.",
      eyebrow: "paso 2 · demodulación", title: "Bloques", accent: "recibidos",
      desc: "Cada símbolo vuelve a bits, en los mismos bloques del canal. En rojo, los bits que el canal alteró.",
      body: result ? (
        <>
          <CodewordGrid bits={result.demod.bits} metadata={result.demod.metadata} k={channelCode.k} n={channelCode.n} />
          <button type="button" className="btn ghost btn-sm fc-dl" onClick={() => downloadText("recibido-con-errores.txt", bitsToCodewordText(result.demod.bits, channelCode.n, channelCode.k))}>
            <Download size={14} /> Descargar recibido con errores (.txt)
          </button>
        </>
      ) : pendingBody,
    },
    {
      phase: "rx", side: "decode", icon: Activity, short: "Decod. canal",
      eyebrow: "paso 3 · decodificación de canal", title: "Corrección de", accent: "canal",
      desc: `LDPC ${channelCode.label} usa los bits de control para reparar errores y recupera los bloques de la fuente (${sourceCode.n} bits cada uno).`,
      body: result ? <CodewordGrid bits={result.channelDecoded.bits} metadata={result.channelDecoded.metadata} k={sourceCode.k} n={sourceCode.n} /> : pendingBody,
    },
    {
      phase: "rx", side: "decode", icon: ShieldCheck, short: "Decod. fuente",
      eyebrow: "paso 4 · decodificación de fuente", title: "Mensaje", accent: "recuperado",
      desc: `LDPC ${sourceCode.label} quita la redundancia y reconstruye el mensaje. Verde = correcto, rojo = error residual.`,
      body: result ? <BitGrid bits={result.sourceDecoded.bits} metadata={result.sourceDecoded.metadata} /> : pendingBody,
    },
    {
      phase: "result", side: "decode", icon: !result ? ShieldCheck : result.metrics.integrity ? ShieldCheck : ShieldAlert, short: "Resultado",
      eyebrow: "paso 5 · resultado",
      title: !result ? "Resultado" : result.metrics.integrity ? "Mensaje" : "Errores",
      accent: !result ? "pendiente" : result.metrics.integrity ? "íntegro" : "residuales",
      desc: !result
        ? `Hacé clic en ${runLabel} para correr toda la cadena y ver si el mensaje se recupera.`
        : result.metrics.integrity
          ? `Los ${result.metrics.channelBitErrors} bit${result.metrics.channelBitErrors === 1 ? "" : "s"} que el canal alteró fueron reparados por el código LDPC. La fuente se reconstruyó sin pérdida.`
          : `${result.metrics.residualBitErrors} de ${result.metrics.sourceBits} bits no se pudieron corregir. Bajá el ruido o subí la redundancia del canal para recuperar la integridad.`,
      body: result ? (
        <div className={"fc-payoff " + (result.metrics.integrity ? "ok" : "warn")}>
          <div className="fc-payoff-ic">{result.metrics.integrity ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}</div>
          <div className="fc-payoff-body">
            {inputKind === "text" ? (
              <div className="fc-compare">
                <div className="fc-compare-row"><span className="meta-key">enviado</span><code className="fc-text-diff">{text || " "}</code></div>
                <div className="fc-compare-row"><span className="meta-key">recuperado</span><RecoveredText original={text || " "} recovered={result.recoveredText} /></div>
              </div>
            ) : (
              <div className="fc-file-out">
                {isImage ? (
                  <div className="fc-imgs">
                    <figure><img src={originalUrl ?? undefined} alt="original enviado" /><figcaption>enviado</figcaption></figure>
                    <figure><img src={recoveredUrl ?? undefined} alt="recuperado tras el canal" /><figcaption>recuperado</figcaption></figure>
                  </div>
                ) : (
                  <p className="muted">{fileSource?.name} · {result.recoveredBytes.length.toLocaleString()} bytes reconstruidos.</p>
                )}
                {recoveredUrl && fileSource && (
                  <a className="btn ghost btn-sm" href={recoveredUrl} download={`recuperado_${fileSource.name}`}>
                    <Download size={14} /> Descargar archivo recuperado
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      ) : pendingBody,
    },
  ];

  const encodeSteps = steps.filter((s) => s.side === "encode");
  const decodeSteps = steps.filter((s) => s.side === "decode");

  return (
    <div className="app min-h-screen">
      <header className="topbar-v2">
        <div className="top-row row-1">
          <button type="button" className="brand brand-link" onClick={() => navigate("/")} aria-label="Volver al inicio">
            <div className="logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="#1c1208" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12c2.5 0 2.5-7 5-7s2.5 14 5 14 2.5-7 5-7h3" />
              </svg>
            </div>
            <div>
              <h1>Channel Coding Visualizer</h1>
              <div className="sub">
                {view === "encode" ? "Codificación · proceso completo" : "Decodificación · proceso completo"}
              </div>
            </div>
          </button>
          <div className="top-actions">
            <div className="fc-viewswitch" role="tablist" aria-label="Etapa del proceso completo">
              <button
                type="button"
                role="tab"
                aria-selected={view === "encode"}
                className="fc-viewswitch-btn"
                data-active={view === "encode"}
                onClick={() => navigate("/proceso-completo/codificar")}
              >
                <ShieldCheck size={14} /> Codificación
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === "decode"}
                className="fc-viewswitch-btn"
                data-active={view === "decode"}
                onClick={() => navigate("/proceso-completo/decodificar")}
              >
                <RadioTower size={14} /> Decodificación
              </button>
            </div>
            <div className={"status-pill " + (!ready ? "" : m!.integrity ? "ok" : "warn")}>
              <span className="led" />
              {!ready ? "sin procesar" : m!.integrity ? "señal íntegra" : `${m!.residualBitErrors} bit${m!.residualBitErrors === 1 ? "" : "s"} sin corregir`}
            </div>
            <button type="button" className="btn ghost btn-sm" onClick={() => navigate("/")}>
              <ArrowLeft size={14} /> Inicio
            </button>
          </div>
        </div>
        <div className="top-row row-2">
          <div className="brand-meta-row">
            <div className="brand-meta" aria-label="Resumen de la cadena">
              <span className="meta-key">fuente</span>
              <span className="meta-val">{sourceCode.label}</span>
              <span className="meta-sep" aria-hidden />
              <span className="meta-key">canal</span>
              <span className="meta-val">{channelCode.label}</span>
              <span className="meta-sep" aria-hidden />
              <span className="meta-key">mod</span>
              <span className="meta-val">{MOD_INFO[modulation].label}</span>
              <span className="meta-sep" aria-hidden />
              <span className="meta-key">σ</span>
              <span className="meta-val">{noise.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="fc-shell">
        {/* Panel de control */}
        <aside className="fc-controls">
          <section className="card">
            <div className="card-head">
              <div className="left">
                <span className="eyebrow">parámetros</span>
                <h2>Configurá la <span className="accent">señal</span></h2>
                <p className="muted">Subí un archivo, ajustá los parámetros y hacé clic en {runLabel}.</p>
              </div>
            </div>

            <div className="fc-fields">
              <div className="fc-field">
                <label>1 · Subí tu archivo <span className="fc-hint">(cualquier tipo)</span></label>

                {/* Zona de subida — SIEMPRE visible */}
                <div className="fc-drop" data-active={inputKind === "file" && !!fileSource}>
                  <div
                    className="drop"
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void loadFile(f); }}
                  >
                    <div className="row">
                      <div className="ic">{fileSource ? <FileIcon size={18} /> : <FileUp size={18} />}</div>
                      {fileSource ? (
                        <div className="flex-1 min-w-0">
                          <div className="name">{fileSource.name}</div>
                          <div className="sub">{fileSource.type || "binario"} · {fileSource.bytes.length.toLocaleString()} bytes</div>
                        </div>
                      ) : (
                        <div className="flex-1">
                          <div className="name" style={{ whiteSpace: "normal" }}>Arrastrá un archivo o hacé clic para subir</div>
                          <div className="formats">imagen · texto · audio · pdf · binario · cualquier tipo · máx {MAX_LABEL}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  {fileError && <p className="fc-warn">{fileError}</p>}
                  {fileSource && (
                    <button
                      type="button"
                      className="linklike mt-2"
                      onClick={() => { setFileSource(null); setFileError(null); setInputKind("text"); }}
                    >
                      quitar archivo y usar texto de ejemplo
                    </button>
                  )}
                </div>

                {/* Alternativa: texto de ejemplo */}
                <div className="fc-or"><span>o probá con un texto</span></div>
                <textarea
                  id="fc-text"
                  className="input"
                  data-active={inputKind === "text"}
                  rows={2}
                  value={text}
                  maxLength={64}
                  onChange={(e) => { setText(e.target.value); setInputKind("text"); }}
                  onFocus={() => setInputKind("text")}
                  placeholder="Escribí un mensaje corto…"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void loadFile(f); e.target.value = ""; }}
                />
              </div>

              <div className="fc-field">
                <label htmlFor="fc-src">Tasa · codificación de fuente</label>
                <select id="fc-src" className="select" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                  {RATE_CODES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="fc-field">
                <label htmlFor="fc-ch">Tasa · codificación de canal</label>
                <select id="fc-ch" className="select" value={channelId} onChange={(e) => setChannelId(e.target.value)}>
                  {RATE_CODES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="fc-field">
                <label htmlFor="fc-mod">Modulación</label>
                <select id="fc-mod" className="select" value={modulation} onChange={(e) => setModulation(e.target.value as ModScheme)}>
                  {ALL_MOD.map((s) => (
                    <option key={s} value={s}>{MOD_INFO[s].label} — {MOD_INFO[s].description}</option>
                  ))}
                </select>
              </div>

              <div className="fc-field">
                <label htmlFor="fc-noise">
                  Ruido del canal · <span className="fc-sigma">σ {noise.toFixed(2)}</span>
                </label>
                <input
                  id="fc-noise"
                  type="range"
                  min={0}
                  max={1.2}
                  step={0.01}
                  value={noise}
                  onChange={(e) => setNoise(Number(e.target.value))}
                />
                <div className="fc-ticks" aria-hidden>
                  <span>canal limpio</span>
                  <span>ruido severo</span>
                </div>
              </div>

              <div className="fc-field">
                <label htmlFor="fc-flips">
                  <Shuffle size={12} /> Errores manuales · <span className="fc-sigma">{manualFlips} bit{manualFlips === 1 ? "" : "s"}</span>
                </label>
                <input
                  id="fc-flips"
                  type="range"
                  min={0}
                  max={40}
                  step={1}
                  value={manualFlips}
                  onChange={(e) => setManualFlips(Number(e.target.value))}
                />
                <div className="fc-ticks" aria-hidden>
                  <span>sin alterar</span>
                  <span>voltear bits al azar antes de decodificar</span>
                </div>
              </div>

              <button type="button" className="btn primary fc-resim" onClick={runChain} disabled={busy}>
                {busy ? <RefreshCw size={14} className="spin" /> : ready ? <RefreshCw size={14} /> : view === "encode" ? <ShieldCheck size={14} /> : <RadioTower size={14} />}
                {busy ? "Procesando…" : ready ? `Re-${runLabel.toLowerCase()} (nuevo ruido)` : `${runLabel} ahora`}
              </button>
              {!ready && (
                <p className="fc-run-hint">Nada se procesa hasta que hagas clic. {runLabel === "Codificar" ? "Codifica y transmite tu señal." : "Decodifica la señal recibida y recupera el mensaje."}</p>
              )}
            </div>
          </section>

          {/* Vista previa — visible en codificación y decodificación */}
          <section className="card fc-previewcard">
            <div className="card-head">
              <div className="left">
                <span className="eyebrow">vista previa</span>
                <h2>{view === "encode" ? "Lo que vas a " : "Entrada y "}<span className="accent">{view === "encode" ? "enviar" : "salida"}</span></h2>
              </div>
            </div>
            <div className="fc-preview-grid">
              <figure className="fc-preview-item">
                <figcaption className="fc-preview-tag">{view === "encode" ? "a codificar" : "enviado"}</figcaption>
                {inputKind === "file" ? (
                  isImage && originalUrl ? (
                    <img src={originalUrl} alt="entrada" />
                  ) : (
                    <div className="fc-preview-file"><FileIcon size={20} /><span>{fileSource?.name ?? "archivo"}</span></div>
                  )
                ) : (
                  <code className="fc-preview-text">{text || " "}</code>
                )}
              </figure>

              {view === "decode" && (
                <figure className="fc-preview-item">
                  <figcaption className="fc-preview-tag">recuperado</figcaption>
                  {!ready ? (
                    <div className="fc-preview-empty">hacé clic en <strong>Decodificar</strong></div>
                  ) : inputKind === "file" ? (
                    isImage && recoveredUrl ? (
                      <img src={recoveredUrl} alt="recuperado" />
                    ) : recoveredUrl && fileSource ? (
                      <a className="btn ghost btn-sm" href={recoveredUrl} download={`recuperado_${fileSource.name}`}>
                        <Download size={14} /> descargar
                      </a>
                    ) : null
                  ) : (
                    <RecoveredText original={text || " "} recovered={result!.recoveredText} />
                  )}
                </figure>
              )}
            </div>
          </section>

          {ready && m ? (
            <section className="card fc-readout">
              <div className={"fc-verdict " + (m.integrity ? "ok" : "warn")}>
                {m.integrity ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                <div>
                  <strong>{m.integrity ? "Señal recuperada íntegra" : "Errores residuales"}</strong>
                  <span>
                    {m.channelBitErrors} bit{m.channelBitErrors === 1 ? "" : "s"} alterados{m.manualFlips > 0 ? ` (${m.manualFlips} manuales)` : ""} · {m.residualBitErrors} sin corregir
                  </span>
                </div>
              </div>

              <dl className="fc-metrics">
                <div><dt>Bits fuente</dt><dd>{m.sourceBits}</dd></div>
                <div><dt>Tras cod. fuente</dt><dd>{m.afterSource}</dd></div>
                <div><dt>Tras cod. canal</dt><dd>{m.afterChannel}</dd></div>
                <div><dt>Símbolos</dt><dd>{m.symbols}</dd></div>
                <div><dt>BER en canal</dt><dd>{(m.berChannel * 100).toFixed(2)}%</dd></div>
                <div><dt>BER final</dt><dd>{(m.berFinal * 100).toFixed(2)}%</dd></div>
              </dl>

              <p className="fc-compute">
                calculado localmente en {m.elapsedMs < 1 ? "<1" : m.elapsedMs.toFixed(0)} ms · nada sale del navegador
              </p>
            </section>
          ) : null}
        </aside>

        {/* Una vista por etapa: codificación (transmisor) o decodificación (receptor) */}
        {view === "encode" ? (
          <StepColumn
            kind="encode"
            title="Codificación"
            subtitle="El transmisor prepara y protege el mensaje antes de enviarlo."
            steps={encodeSteps}
            active={encStep}
            setActive={setEncStep}
          />
        ) : (
          <StepColumn
            kind="decode"
            title="Decodificación"
            subtitle="El receptor recupera el mensaje y corrige los errores del canal."
            steps={decodeSteps}
            active={decStep}
            setActive={setDecStep}
          />
        )}
      </main>
    </div>
  );
}
