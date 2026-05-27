import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { usePipelineStore } from "../store/pipelineStore";
import { getCode } from "../lib/encoders/index";
import { explainDecodeBlock, type LDPCCode } from "../lib/encoders/LDPC";
import { bitsToBytes, unpackBits, unpackBitsRange, type Bit } from "../lib/bitstream/BitArray";

/* ============================================================
   MessageRecovery
   Panel explícito que muestra, paso a paso, cómo LDPC recupera
   el mensaje al decodificar:
     1. palabra recibida r (n bits)
     2. corrección por síndrome → ĉ (palabra código válida)
     3. extracción sistemática: los primeros k bits son los datos
     4. ensamblado de los k-bit de todos los bloques en bytes
     5. mensaje reconstruido
   ============================================================ */

export function MessageRecovery() {
  const { mode, codeId, result } = usePipelineStore();
  const code = getCode(codeId);

  if (mode !== "decode") return null;

  const blockCount = result ? Math.max(1, Math.ceil(result.received.length / code.n)) : 0;

  return (
    <section className="card trace recovery">
      <div className="trace-head">
        <span className="eyebrow">recuperación del mensaje</span>
        <h2>
          Cómo se recupera <span className="accent">el mensaje</span>
        </h2>
        <p className="muted">
          El código es sistemático: tras corregir el bloque, los datos están
          literalmente en las primeras <strong>k = {code.k}</strong> posiciones de
          la palabra código. Se concatenan bloque a bloque y se reagrupan en bytes.
        </p>
      </div>

      <SimpleExplainer />

      {!result ? (
        <p className="trace-hint">
          Cargá un archivo codificado y ejecutá la decodificación para ver la
          reconstrucción real, bloque por bloque.
        </p>
      ) : (
        <RecoveryBody code={code} result={result} blockCount={blockCount} />
      )}
    </section>
  );
}

function RecoveryBody({
  code,
  result,
  blockCount,
}: {
  code: LDPCCode;
  result: NonNullable<ReturnType<typeof usePipelineStore.getState>["result"]>;
  blockCount: number;
}) {
  const [blockIndex, setBlockIndex] = useState(0);
  useEffect(() => {
    if (blockIndex >= blockCount) setBlockIndex(0);
  }, [blockIndex, blockCount]);

  const received = useMemo<Bit[]>(
    () => unpackBitsRange(result.received.bits, blockIndex * code.n, code.n),
    [result.received.bits, blockIndex, code.n],
  );
  const dec = useMemo(() => explainDecodeBlock(code, received), [code, received]);

  // Mensaje completo reconstruido (todos los bloques), recortado al original.
  const recovered = useMemo(() => {
    const allBits = unpackBits(result.decoded.bits, result.decoded.length);
    const meta = result.sourceMeta;
    const usable =
      meta && meta.dataBits > 0 && meta.dataBits <= allBits.length
        ? allBits.slice(0, meta.dataBits)
        : allBits;
    const bytes = bitsToBytes(usable as Bit[]);
    let text = "";
    try {
      text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    } catch {
      text = "";
    }
    return { bytes, text };
  }, [result.decoded.bits, result.decoded.length, result.sourceMeta]);

  const dataBits = dec.corrected.slice(0, code.k);

  return (
    <div className="trace-body">
      <div className="trace-block-row">
        <span className="trace-block-label">
          Bloque {blockIndex + 1} de {blockCount.toLocaleString()}
        </span>
        <div className="trace-block-nav">
          <button
            type="button"
            onClick={() => setBlockIndex(Math.max(0, blockIndex - 1))}
            disabled={blockIndex === 0}
            aria-label="Bloque anterior"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => setBlockIndex(Math.min(blockCount - 1, blockIndex + 1))}
            disabled={blockIndex >= blockCount - 1}
            aria-label="Bloque siguiente"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <BlockVerdict
        errors={dec.correctedPositions.length}
        success={dec.success}
        blockIndex={blockIndex}
      />

      {/* Paso 1 · recibido */}
      <RecoveryStep
        n={1}
        title="Palabra recibida"
        plain="1) Llegó un pedacito del mensaje. Algunas casillas pueden estar mal."
        sub={`r · ${code.n} bits — tal como llegó del canal`}
      >
        <BitTrack
          bits={received}
          mark={(j) => (j >= code.k ? "parity" : "data")}
        />
      </RecoveryStep>

      {/* Paso 2 · corrección */}
      <RecoveryStep
        n={2}
        title="Corrección por síndrome"
        plain={
          dec.correctedPositions.length === 0
            ? "2) Revisamos las casillas. ¡Estaban todas bien! No hubo que arreglar nada."
            : `2) Encontramos ${dec.correctedPositions.length} casilla${dec.correctedPositions.length === 1 ? "" : "s"} mal y la${dec.correctedPositions.length === 1 ? "" : "s"} arreglamos (en verde).`
        }
        sub={
          dec.correctedPositions.length === 0
            ? "síndrome 0 — el bloque ya era válido, no se invirtió nada"
            : `se invirtieron los bits ${dec.correctedPositions.map((p) => `#${p + 1}`).join(", ")} para llegar a una palabra código válida`
        }
      >
        <BitTrack
          bits={dec.corrected}
          mark={(j) =>
            dec.correctedPositions.includes(j)
              ? "corrected"
              : j >= code.k
                ? "parity"
                : "data"
          }
        />
        <p className={"recovery-flag " + (dec.success ? "ok" : "warn")}>
          síndrome final [{dec.finalSyndrome.join(" ")}]{" "}
          {dec.success
            ? "✓ válido — la extracción es fiable"
            : "× sin resolver — más errores de los que tolera el bloque"}
        </p>
      </RecoveryStep>

      {/* Paso 3 · extracción sistemática */}
      <RecoveryStep
        n={3}
        title="Extracción sistemática"
        plain={`3) De cada pedacito nos quedamos solo con las primeras ${code.k} casillas: ese es el mensaje. El resto (las de control) ya no se necesitan.`}
        sub={`se toman las primeras k = ${code.k} posiciones de la palabra corregida`}
      >
        <div className="recovery-extract">
          <BitTrack
            bits={dec.corrected}
            mark={(j) => (j >= code.k ? "dropped" : "data")}
            label="ĉ"
          />
          <ArrowRight size={16} className="recovery-arrow" aria-hidden />
          <BitTrack bits={dataBits} mark={() => "data"} label="u" />
        </div>
        <p className="recovery-note">
          Las {code.n - code.k} posiciones de paridad cumplieron su función
          (detectar/corregir) y se descartan. Solo sobreviven los {code.k} bits de datos.
        </p>
      </RecoveryStep>

      {/* Paso 4 · ensamblado a bytes */}
      <RecoveryStep
        n={4}
        title="Ensamblado del mensaje"
        plain="4) Juntamos todos los pedacitos y los agrupamos de a 8 para formar letras y números."
        sub="los datos de todos los bloques se concatenan y se reagrupan de a 8 bits → bytes"
      >
        <ByteView bytes={recovered.bytes} />
      </RecoveryStep>

      {/* Paso 5 · mensaje */}
      <RecoveryStep
        n={5}
        title="Mensaje recuperado"
        plain="5) ¡Listo! Este es el mensaje completo, igual al original."
        sub={`${recovered.bytes.length.toLocaleString()} bytes reconstruidos${result.sourceMeta ? ` · ${result.sourceMeta.name}` : ""}`}
      >
        <pre className="recovery-text mono">
          {printable(recovered.text) || "(contenido binario — usá «Restaurar media original»)"}
        </pre>
      </RecoveryStep>
    </div>
  );
}

function SimpleExplainer() {
  return (
    <div className="recovery-simple">
      <p className="recovery-simple-title">📩 Explicado fácil</p>
      <p className="recovery-simple-text">
        Imaginá que te mandan un mensaje, pero en el camino se ensucian algunas
        casillas. Cuando codificamos, se agregan unas <strong>casillas extra de
        control</strong> (como pistas). Al recibirlo, esas pistas nos dicen
        <strong> dónde se ensució</strong> y podemos <strong>borrar la mancha</strong>.
        Así el mensaje vuelve a quedar perfecto, ¡como nuevo!
      </p>
      <div className="recovery-simple-row">
        <span>📥 llega con manchas</span>
        <span aria-hidden>→</span>
        <span>🔍 buscamos el error</span>
        <span aria-hidden>→</span>
        <span>🩹 lo arreglamos</span>
        <span aria-hidden>→</span>
        <span>✅ se lee perfecto</span>
      </div>
    </div>
  );
}

function BlockVerdict({
  errors,
  success,
  blockIndex,
}: {
  errors: number;
  success: boolean;
  blockIndex: number;
}) {
  const ok = success;
  const text = !ok
    ? "Este pedacito tenía demasiadas manchas juntas y no se pudo arreglar del todo."
    : errors === 0
      ? "Este pedacito llegó limpio. ¡No tenía ninguna mancha! 🎉"
      : `Este pedacito tenía ${errors} mancha${errors === 1 ? "" : "s"}. La${errors === 1 ? "" : "s"} encontramos y la${errors === 1 ? "" : "s"} borramos. Quedó perfecto. ✅`;
  return (
    <div className={"recovery-verdict " + (ok ? "ok" : "warn")}>
      <span className="recovery-verdict-emoji" aria-hidden>{ok ? (errors === 0 ? "🎉" : "🩹") : "⚠️"}</span>
      <div>
        <strong>Pedacito {blockIndex + 1}</strong>
        <span>{text}</span>
      </div>
    </div>
  );
}

function RecoveryStep({
  n,
  title,
  sub,
  plain,
  children,
}: {
  n: number;
  title: string;
  sub: string;
  plain?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="recovery-step">
      {plain && <p className="recovery-step-plain">{plain}</p>}
      <div className="recovery-step-head">
        <span className="recovery-step-n" aria-hidden>{n}</span>
        <div>
          <strong>{title}</strong>
          <span className="recovery-step-sub">{sub}</span>
        </div>
      </div>
      <div className="recovery-step-body">{children}</div>
    </div>
  );
}

type Mark = "data" | "parity" | "corrected" | "dropped";

function BitTrack({
  bits,
  mark,
  label,
}: {
  bits: Bit[];
  mark: (j: number) => Mark;
  label?: string;
}) {
  return (
    <div className="recovery-track">
      {label && <span className="recovery-track-label">{label}</span>}
      <div className="trace-bit-row">
        {bits.map((b, j) => {
          const m = mark(j);
          const cls =
            m === "parity" ? "p" : m === "corrected" ? "c" : m === "dropped" ? "ghost" : "";
          return (
            <span key={j} className={`bit-chip ${cls}`} title={`#${j + 1}`}>
              {b}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ByteView({ bytes }: { bytes: Uint8Array }) {
  const limit = Math.min(bytes.length, 24);
  const shown = Array.from(bytes.slice(0, limit));
  return (
    <div className="recovery-bytes">
      {shown.map((byte, i) => (
        <div key={i} className="recovery-byte">
          <code className="recovery-byte-bin">{byte.toString(2).padStart(8, "0")}</code>
          <span className="recovery-byte-dec">{byte}</span>
          <span className="recovery-byte-ch">{printableChar(byte)}</span>
        </div>
      ))}
      {bytes.length > limit && <div className="recovery-byte more">+{bytes.length - limit}</div>}
    </div>
  );
}

function printableChar(byte: number): string {
  if (byte === 32) return "␣";
  if (byte >= 33 && byte <= 126) return String.fromCharCode(byte);
  return "·";
}

function printable(text: string): string {
  // Reemplaza controles no imprimibles (code < 32 o 127) para no romper el layout.
  let out = "";
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0;
    out += c < 32 || c === 127 ? "·" : ch;
  }
  return out;
}
