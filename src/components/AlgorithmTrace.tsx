import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RefreshCw } from "lucide-react";
import { usePipelineStore } from "../store/pipelineStore";
import { getCode } from "../lib/encoders/index";
import {
  explainDecodeBlock,
  explainEncodeBlock,
  type DecodeBlockExplain,
  type EncodeBlockExplain,
  type LDPCCode,
} from "../lib/encoders/LDPC";
import { unpackBitsRange, type Bit } from "../lib/bitstream/BitArray";

/* ============================================================
   AlgorithmTrace
   Live, in-page view of the LDPC matrix operations applied to a
   single block. Encode walks u·G column by column; decode walks
   H·r row by row and then steps through bit-flipping iterations.
   ============================================================ */

const AUTO_INTERVAL_MS = 1100;

export function AlgorithmTrace() {
  const { mode, codeId, result } = usePipelineStore();
  const code = getCode(codeId);

  const blockCount = useMemo(() => {
    if (!result) return 1;
    return mode === "encode"
      ? Math.max(1, Math.ceil(result.original.length / code.k))
      : Math.max(1, Math.ceil(result.received.length / code.n));
  }, [mode, result, code]);

  const [blockIndex, setBlockIndex] = useState(0);
  useEffect(() => {
    if (blockIndex >= blockCount) setBlockIndex(0);
  }, [blockIndex, blockCount]);

  const sample = useMemo<Bit[]>(() => {
    if (mode === "encode") {
      if (result) return unpackBitsRange(result.original.bits, blockIndex * code.k, code.k);
      return demoData(code.k);
    }
    if (result) return unpackBitsRange(result.received.bits, blockIndex * code.n, code.n);
    return demoReceived(code);
  }, [mode, result, blockIndex, code]);

  return (
    <section className="card trace">
      <div className="trace-head">
        <span className="eyebrow">algoritmo en vivo</span>
        <h2>
          {mode === "encode" ? "Multiplicación" : "Síndrome"}{" "}
          <span className="accent">{mode === "encode" ? "c = u · G" : "s = H · r"}</span>
        </h2>
        <p className="muted">
          {mode === "encode"
            ? "Mirá cómo se construye cada bit del codeword desde la matriz generadora, columna por columna."
            : "Mirá cómo cada chequeo de paridad evalúa los bits del bloque recibido, fila por fila de H."}
        </p>
      </div>

      <BlockSelector
        blockIndex={blockIndex}
        blockCount={blockCount}
        setBlockIndex={setBlockIndex}
        live={Boolean(result)}
      />

      {mode === "encode" ? (
        <EncodeTrace code={code} data={sample} live={Boolean(result)} />
      ) : (
        <DecodeTrace code={code} received={sample} live={Boolean(result)} />
      )}
    </section>
  );
}

/* ---------- block selector ---------- */

function BlockSelector({
  blockIndex,
  blockCount,
  setBlockIndex,
  live,
}: {
  blockIndex: number;
  blockCount: number;
  setBlockIndex: (n: number) => void;
  live: boolean;
}) {
  const prev = () => setBlockIndex(Math.max(0, blockIndex - 1));
  const next = () => setBlockIndex(Math.min(blockCount - 1, blockIndex + 1));
  return (
    <div className="trace-block-row">
      <span className="trace-block-label">
        {live ? `Bloque ${blockIndex + 1} de ${blockCount.toLocaleString()}` : "Bloque de ejemplo"}
      </span>
      <div className="trace-block-nav">
        <button type="button" onClick={prev} disabled={!live || blockIndex === 0} aria-label="Bloque anterior">
          <ChevronLeft size={14} />
        </button>
        <button type="button" onClick={next} disabled={!live || blockIndex >= blockCount - 1} aria-label="Bloque siguiente">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

/* ---------- ENCODE TRACE ---------- */

function EncodeTrace({ code, data, live }: { code: LDPCCode; data: Bit[]; live: boolean }) {
  const enc: EncodeBlockExplain = useMemo(() => explainEncodeBlock(code, data), [code, data]);
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(false);
  const totalSteps = code.n;

  useEffect(() => {
    setStep(0);
    setAuto(false);
  }, [code.id, data]);

  useEffect(() => {
    if (!auto) return;
    const id = window.setInterval(() => {
      setStep((s) => {
        if (s + 1 >= totalSteps) {
          setAuto(false);
          return s;
        }
        return s + 1;
      });
    }, AUTO_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [auto, totalSteps]);

  const activeCol = step;
  const builtSoFar: (Bit | null)[] = enc.codeword.map((b, j) => (j <= activeCol ? b : null));
  const contributors = enc.contributors[activeCol] ?? [];
  const isParityCol = activeCol >= code.k;

  return (
    <div className="trace-body">
      <div className="trace-vec-row">
        <span className="trace-vec-label">
          u <span className="trace-vec-dim">({code.k})</span>
        </span>
        <BitRow bits={enc.data} highlight={isParityCol ? contributors : [activeCol]} role="data" />
      </div>

      <MatrixView
        title="G"
        rows={enc.k}
        cols={enc.n}
        cell={(i, j) => code.G[i][j]}
        rowLabel={(i) => `u${i + 1}`}
        colLabel={(j) => (j < code.k ? `c${j + 1}` : `p${j - code.k + 1}`)}
        activeCol={activeCol}
        activeRows={contributors}
        colKind={(j) => (j >= code.k ? "parity" : "data")}
      />

      <FormulaCard
        title={`Calcular c${activeCol + 1}`}
        formula={buildEncodeFormula(enc, activeCol)}
        result={enc.codeword[activeCol]}
        note={
          isParityCol
            ? `Posición ${activeCol + 1} es paridad p${activeCol - code.k + 1}: XOR de los datos donde la columna ${activeCol + 1} de G vale 1.`
            : `Posición ${activeCol + 1} es sistemática: la columna ${activeCol + 1} de G es la identidad, por eso copia u${activeCol + 1}.`
        }
      />

      <div className="trace-vec-row">
        <span className="trace-vec-label">
          c <span className="trace-vec-dim">({code.n})</span>
        </span>
        <BitRow
          bits={builtSoFar.map((b) => (b ?? 0) as Bit)}
          highlight={[activeCol]}
          missingFrom={activeCol + 1}
          marks={(j) => (j >= code.k ? "parity" : "data")}
        />
      </div>

      <StepBar
        step={step}
        totalSteps={totalSteps}
        setStep={setStep}
        auto={auto}
        setAuto={setAuto}
        labelFor={(s) => `c${s + 1}`}
      />

      {!live && (
        <p className="trace-hint">
          Bloque de ejemplo (todavía no ejecutaste el pipeline). Cargá un archivo y ejecutá para recorrer los bloques reales.
        </p>
      )}
    </div>
  );
}

function buildEncodeFormula(enc: EncodeBlockExplain, j: number): FormulaParts {
  const contributors = enc.contributors[j];
  if (contributors.length === 0) {
    return { lhs: `c${j + 1}`, expr: "0", values: "0", result: 0 };
  }
  const expr = contributors.map((i) => `u${i + 1}`).join(" ⊕ ");
  const values = contributors.map((i) => enc.data[i]).join(" ⊕ ");
  return { lhs: `c${j + 1}`, expr, values, result: enc.codeword[j] };
}

/* ---------- DECODE TRACE ---------- */

function DecodeTrace({ code, received, live }: { code: LDPCCode; received: Bit[]; live: boolean }) {
  const dec: DecodeBlockExplain = useMemo(() => explainDecodeBlock(code, received), [code, received]);
  const syndromeSteps = code.n - code.k;
  const totalSteps = syndromeSteps + dec.iterations.length;
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    setStep(0);
    setAuto(false);
  }, [code.id, received]);

  useEffect(() => {
    if (!auto) return;
    const id = window.setInterval(() => {
      setStep((s) => {
        if (s + 1 >= totalSteps) {
          setAuto(false);
          return s;
        }
        return s + 1;
      });
    }, AUTO_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [auto, totalSteps]);

  const inSyndromePhase = step < syndromeSteps;
  const activeCheck = inSyndromePhase ? step : -1;
  const iterIndex = inSyndromePhase ? -1 : step - syndromeSteps;

  const builtSyndrome: (number | null)[] = dec.initialSyndrome.map((b, i) =>
    inSyndromePhase ? (i <= activeCheck ? b : null) : b,
  );

  const activeMembers = activeCheck >= 0 ? dec.checkMembers[activeCheck] : [];

  return (
    <div className="trace-body">
      <div className="trace-vec-row">
        <span className="trace-vec-label">
          r <span className="trace-vec-dim">({code.n})</span>
        </span>
        <BitRow
          bits={received}
          highlight={activeMembers}
          marks={(j) => (j >= code.k ? "parity" : "data")}
        />
      </div>

      <MatrixView
        title="H"
        rows={code.n - code.k}
        cols={code.n}
        cell={(i, j) => code.H[i][j]}
        rowLabel={(i) => `c${i + 1}`}
        colLabel={(j) => (j < code.k ? `d${j + 1}` : `p${j - code.k + 1}`)}
        activeRow={activeCheck >= 0 ? activeCheck : undefined}
        activeRows={iterIndex >= 0 ? failedChecks(dec.iterations[iterIndex].syndrome) : []}
        colKind={(j) => (j >= code.k ? "parity" : "data")}
      />

      {inSyndromePhase ? (
        <FormulaCard
          title={`Chequeo c${activeCheck + 1} (fila ${activeCheck + 1} de H)`}
          formula={buildSyndromeFormula(dec, code, received, activeCheck)}
          result={dec.initialSyndrome[activeCheck]}
          note={
            dec.initialSyndrome[activeCheck] === 0
              ? `Suma par: este chequeo se cumple, no protesta.`
              : `Suma impar: este chequeo falla, alguno de los ${dec.checkMembers[activeCheck].length} bits involucrados está mal.`
          }
        />
      ) : (
        <IterationCard
          dec={dec}
          iter={iterIndex}
        />
      )}

      <div className="trace-vec-row">
        <span className="trace-vec-label">
          s <span className="trace-vec-dim">({code.n - code.k})</span>
        </span>
        <SyndromeRow
          syndrome={builtSyndrome}
          activeIndex={activeCheck}
        />
      </div>

      {!inSyndromePhase && (
        <div className="trace-vec-row">
          <span className="trace-vec-label">
            ĉ <span className="trace-vec-dim">({code.n})</span>
          </span>
          <BitRow
            bits={iterationSnapshot(dec, received, iterIndex)}
            highlight={dec.iterations[iterIndex]?.target !== null ? [dec.iterations[iterIndex].target as number] : []}
            marks={(j) => {
              if (dec.correctedPositions.slice(0, iterIndex + 1).includes(j)) return "corrected";
              return j >= code.k ? "parity" : "data";
            }}
          />
        </div>
      )}

      <StepBar
        step={step}
        totalSteps={totalSteps}
        setStep={setStep}
        auto={auto}
        setAuto={setAuto}
        labelFor={(s) =>
          s < syndromeSteps ? `s${s + 1}` : `it.${s - syndromeSteps + 1}`
        }
      />

      <DecodeSummary dec={dec} code={code} />

      {!live && (
        <p className="trace-hint">
          Bloque de ejemplo (un bit alterado para que el decoder tenga algo que corregir). Ejecutá el pipeline para recorrer los bloques reales.
        </p>
      )}
    </div>
  );
}

function buildSyndromeFormula(
  _dec: DecodeBlockExplain,
  code: LDPCCode,
  received: Bit[],
  row: number,
): FormulaParts {
  const members: number[] = [];
  for (let j = 0; j < code.n; j++) if (code.H[row][j] === 1) members.push(j);
  if (members.length === 0) {
    return { lhs: `s${row + 1}`, expr: "0", values: "0", result: 0 };
  }
  const expr = members.map((j) => labelForPosition(j, code.k)).join(" ⊕ ");
  const values = members.map((j) => received[j]).join(" ⊕ ");
  const result = members.reduce((acc, j) => acc ^ received[j], 0);
  return { lhs: `s${row + 1}`, expr, values, result };
}

function labelForPosition(j: number, k: number): string {
  return j < k ? `r${j + 1}` : `r${j + 1}`; // unified r-label keeps the formula compact
}

function failedChecks(syndrome: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < syndrome.length; i++) if (syndrome[i] === 1) out.push(i);
  return out;
}

function iterationSnapshot(dec: DecodeBlockExplain, received: Bit[], upToIter: number): Bit[] {
  const snap = [...received];
  for (let i = 0; i <= upToIter && i < dec.iterations.length; i++) {
    const t = dec.iterations[i].target;
    if (t !== null) snap[t] = (snap[t] ^ 1) as Bit;
  }
  return snap;
}

function IterationCard({ dec, iter }: { dec: DecodeBlockExplain; iter: number }) {
  const it = dec.iterations[iter];
  if (!it) return null;
  const actionLabel =
    it.action === "already-clean"
      ? "síndrome cero — bloque limpio"
      : it.action === "flip-syndrome-column"
        ? "el síndrome coincide con una columna de H"
        : it.action === "flip-majority-vote"
          ? "voto mayoritario de chequeos fallidos"
          : "atascado, no se puede progresar";
  return (
    <div className="trace-formula">
      <div className="trace-formula-head">
        <span className="trace-formula-kicker">iteración {iter + 1}</span>
        <span className="trace-formula-eq">{actionLabel}</span>
      </div>
      <div className="trace-formula-body">
        <p className="trace-formula-line">
          <span>s actual</span>
          <strong>[ {it.syndrome.join(" ")} ]</strong>
        </p>
        <p className="trace-formula-line">
          <span>chequeos que fallan</span>
          <strong>
            {it.failedChecks.length === 0
              ? "ninguno"
              : it.failedChecks.map((i) => `c${i + 1}`).join(", ")}
          </strong>
        </p>
        <p className="trace-formula-line">
          <span>acción</span>
          <strong>
            {it.target === null ? "—" : <>invertir bit #{it.target + 1}</>}
          </strong>
        </p>
      </div>
    </div>
  );
}

function DecodeSummary({ dec, code }: { dec: DecodeBlockExplain; code: LDPCCode }) {
  return (
    <div className={`trace-summary ${dec.success ? "ok" : "warn"}`}>
      <div>
        <span className="trace-summary-label">síndrome final</span>
        <strong>[ {dec.finalSyndrome.join(" ")} ]</strong>
      </div>
      <div>
        <span className="trace-summary-label">bits invertidos</span>
        <strong>
          {dec.correctedPositions.length === 0
            ? "ninguno"
            : dec.correctedPositions.map((p) => `#${p + 1}`).join(", ")}
        </strong>
      </div>
      <div>
        <span className="trace-summary-label">datos recuperados (k = {code.k})</span>
        <strong className="mono">{dec.data.join("")}</strong>
      </div>
    </div>
  );
}

/* ---------- shared UI bits ---------- */

interface FormulaParts {
  lhs: string;
  expr: string;
  values: string;
  result: number;
}

function FormulaCard({
  title,
  formula,
  result,
  note,
}: {
  title: string;
  formula: FormulaParts;
  result: number;
  note: string;
}) {
  return (
    <div className="trace-formula">
      <div className="trace-formula-head">
        <span className="trace-formula-kicker">{title}</span>
        <span className="trace-formula-eq">
          {formula.lhs} = ⊕ (u<sub>i</sub> · G<sub>i,j</sub>)
        </span>
      </div>
      <div className="trace-formula-body">
        <p className="trace-formula-line">
          <span>variables</span>
          <strong>{formula.lhs} = {formula.expr}</strong>
        </p>
        <p className="trace-formula-line">
          <span>valores</span>
          <strong>{formula.lhs} = {formula.values} = {result}</strong>
        </p>
        <p className="trace-formula-note">{note}</p>
      </div>
    </div>
  );
}

function MatrixView({
  title,
  rows,
  cols,
  cell,
  rowLabel,
  colLabel,
  activeRow,
  activeCol,
  activeRows = [],
  colKind,
}: {
  title: string;
  rows: number;
  cols: number;
  cell: (i: number, j: number) => number;
  rowLabel: (i: number) => string;
  colLabel: (j: number) => string;
  activeRow?: number;
  activeCol?: number;
  activeRows?: number[];
  colKind?: (j: number) => "data" | "parity";
}) {
  const cellSize = cols >= 40 ? 14 : cols >= 28 ? 16 : cols >= 18 ? 20 : 26;
  return (
    <div className="trace-matrix-wrap" style={{ ["--mc-size" as never]: `${cellSize}px` }}>
      <div className="trace-matrix-head">
        <span className="trace-matrix-title">Matriz {title}</span>
        <span className="trace-matrix-dim">
          {rows} × {cols}
        </span>
      </div>
      <div className="trace-matrix-scroll">
        <table className="trace-matrix">
          <thead>
            <tr>
              <th aria-hidden="true" />
              {Array.from({ length: cols }, (_, j) => (
                <th
                  key={j}
                  data-active={j === activeCol || undefined}
                  data-kind={colKind ? colKind(j) : undefined}
                >
                  {colLabel(j)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, i) => (
              <tr key={i} data-active={i === activeRow || activeRows.includes(i) || undefined}>
                <th scope="row">{rowLabel(i)}</th>
                {Array.from({ length: cols }, (_, j) => {
                  const v = cell(i, j);
                  const hi = (j === activeCol || i === activeRow) && v === 1;
                  return (
                    <td
                      key={j}
                      data-bit={v}
                      data-hi={hi || undefined}
                      data-col-active={j === activeCol || undefined}
                      data-row-active={i === activeRow || activeRows.includes(i) || undefined}
                    >
                      {v}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BitRow({
  bits,
  highlight = [],
  marks,
  missingFrom,
  role,
}: {
  bits: Bit[];
  highlight?: number[];
  marks?: (j: number) => "data" | "parity" | "corrected" | "altered";
  missingFrom?: number;
  role?: "data";
}) {
  return (
    <div className="trace-bit-row" data-role={role}>
      {bits.map((b, j) => {
        const isMissing = missingFrom !== undefined && j >= missingFrom;
        const m = marks?.(j);
        const cls =
          m === "parity"
            ? "p"
            : m === "corrected"
              ? "c"
              : m === "altered"
                ? "a"
                : "";
        return (
          <span
            key={j}
            className={`bit-chip ${cls} ${highlight.includes(j) ? "hi" : ""} ${isMissing ? "ghost" : ""}`}
            title={`#${j + 1}`}
          >
            {isMissing ? "·" : b}
          </span>
        );
      })}
    </div>
  );
}

function SyndromeRow({ syndrome, activeIndex }: { syndrome: (number | null)[]; activeIndex: number }) {
  return (
    <div className="trace-bit-row">
      {syndrome.map((b, i) => {
        const missing = b === null;
        const failed = b === 1;
        return (
          <span
            key={i}
            className={`bit-chip ${failed ? "a" : missing ? "ghost" : "c"} ${i === activeIndex ? "hi" : ""}`}
            title={`s${i + 1}`}
          >
            {missing ? "·" : b}
          </span>
        );
      })}
    </div>
  );
}

function StepBar({
  step,
  totalSteps,
  setStep,
  auto,
  setAuto,
  labelFor,
}: {
  step: number;
  totalSteps: number;
  setStep: (n: number) => void;
  auto: boolean;
  setAuto: (a: boolean) => void;
  labelFor: (s: number) => string;
}) {
  const prev = () => setStep(Math.max(0, step - 1));
  const next = () => setStep(Math.min(totalSteps - 1, step + 1));
  const reset = () => {
    setStep(0);
    setAuto(false);
  };
  return (
    <div className="trace-stepbar">
      <div className="trace-stepbar-info">
        <span className="trace-stepbar-kicker">paso</span>
        <strong>
          {labelFor(step)}{" "}
          <span className="trace-stepbar-of">
            {step + 1} / {totalSteps}
          </span>
        </strong>
      </div>
      <div className="trace-stepbar-controls">
        <button type="button" onClick={prev} disabled={step === 0} aria-label="Paso anterior">
          <ChevronLeft size={14} />
        </button>
        <button
          type="button"
          onClick={() => setAuto(!auto)}
          aria-label={auto ? "Pausar" : "Reproducir"}
        >
          {auto ? <Pause size={13} /> : <Play size={13} />}
        </button>
        <button type="button" onClick={next} disabled={step >= totalSteps - 1} aria-label="Paso siguiente">
          <ChevronRight size={14} />
        </button>
        <button type="button" onClick={reset} aria-label="Reiniciar">
          <RefreshCw size={13} />
        </button>
      </div>
    </div>
  );
}

/* ---------- demo data ---------- */

const DEMO_PATTERN: Bit[] = [1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1];

function demoData(k: number): Bit[] {
  return Array.from({ length: k }, (_, i) => DEMO_PATTERN[i % DEMO_PATTERN.length]);
}

function demoReceived(code: LDPCCode): Bit[] {
  const data = demoData(code.k);
  // Compute a clean codeword via the same routine and flip a single parity bit.
  const codeword: Bit[] = new Array(code.n).fill(0);
  for (let j = 0; j < code.n; j++) {
    let sum = 0;
    for (let i = 0; i < code.k; i++) sum ^= data[i] * code.G[i][j];
    codeword[j] = sum as Bit;
  }
  const flipAt = code.k; // first parity bit
  if (flipAt < code.n) codeword[flipAt] = (codeword[flipAt] ^ 1) as Bit;
  return codeword;
}
