import { usePipelineStore } from "../store/pipelineStore";
import type { BlockTrace } from "../lib/pipeline";
import type { BitRole } from "../lib/encoders/Hamming";
import type { Bit } from "../lib/bitstream/BitArray";

/* ---------- primitives ---------- */

function roleClass(role: BitRole): string {
  return role === "data" ? "" : role === "parity" ? "r" : "p";
}

interface BitItem {
  value: Bit | string;
  cls?: string; // "", "r", "a", "c", "e", "p"
  label?: string;
}

function BitRow({ items }: { items: BitItem[] }) {
  return (
    <div className="bit-row with-labels">
      {items.map((it, i) => (
        <div className="col" key={i}>
          <div className={"bit-chip " + (it.cls ?? "")}>{it.value}</div>
          {it.label !== undefined && <span className="lbl">{it.label}</span>}
        </div>
      ))}
    </div>
  );
}

function Codeword({
  bits,
  roles,
  flipped,
  corrected,
}: {
  bits: Bit[];
  roles: BitRole[];
  flipped?: Set<number>;
  corrected?: number | null;
}) {
  return (
    <BitRow
      items={bits.map((b, i) => {
        const pos = i + 1;
        const cls = corrected === pos ? "c" : flipped?.has(pos) ? "a" : roleClass(roles[i]);
        return { value: b, cls, label: String(pos) };
      })}
    />
  );
}

function Eq({
  name,
  rhs,
  res,
  zero,
  bad,
}: {
  name: React.ReactNode;
  rhs: React.ReactNode;
  res: React.ReactNode;
  zero?: boolean;
  bad?: boolean;
}) {
  return (
    <div className={"eq" + (zero ? " zero" : "")}>
      <span className="name">{name}</span>
      <span className="rhs">{rhs}</span>
      <span className={"res" + (bad ? " bad" : "")}>{res}</span>
    </div>
  );
}

function SecLabel({ children }: { children: React.ReactNode }) {
  return <span className="sec-label">{children}</span>;
}

function Alert({ kind, children }: { kind: "ok" | "warn" | "err"; children: React.ReactNode }) {
  const ic = kind === "ok" ? "✓" : kind === "err" ? "×" : "!";
  return (
    <div className={"alert " + kind}>
      <span className="ic">{ic}</span>
      <span>{children}</span>
    </div>
  );
}

/* ---------- steps ---------- */

function StepOriginal() {
  const { result, file } = usePipelineStore();
  const bits = result?.original ?? null;
  return (
    <>
      <p>
        El archivo es una secuencia de bytes. Cada byte se expande a <strong>8</strong> bits en orden{" "}
        <strong>MSB → LSB</strong>; esa cadena de bits es la entrada del codificador.
      </p>
      {bits && (
        <div className="section">
          <SecLabel>primeros bytes de “{file?.name}”</SecLabel>
          <div className="byte-grid">
            {chunk(bits.slice(0, 64), 8).map((byte, bi) => {
              const hex = parseInt(byte.map((b) => b.value).join(""), 2)
                .toString(16)
                .padStart(2, "0");
              return (
                <div className="byte" key={bi}>
                  <div className="bits">
                    {byte.map((ab, i) => (
                      <div className="bit-chip" key={i}>
                        {ab.value}
                      </div>
                    ))}
                  </div>
                  <span className="cap">byte {bi} · 0x{hex}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function StepEncode({ t }: { t: BlockTrace }) {
  return (
    <>
      <p>
        Los bits se agrupan en bloques de <strong>k = {t.code.k}</strong>. Cada bloque produce una
        palabra código de <strong>n = {t.code.n}</strong> bits, tasa{" "}
        <strong>{ratio(t.code.k, t.code.n)}</strong>. Los bits de paridad ocupan posiciones potencia
        de dos; cada uno es el <strong>XOR</strong> de las posiciones cuyo índice tiene ese bit activo.
      </p>

      <div className="section">
        <SecLabel>bloque #{t.blockIndex} · datos de entrada (k = {t.code.k})</SecLabel>
        <BitRow items={t.dataIn.map((b, i) => ({ value: b, label: `d${i + 1}` }))} />
      </div>

      <div className="section">
        <SecLabel>ecuaciones de paridad</SecLabel>
        {t.parityEquations.map((eq) => (
          <Eq
            key={eq.pos}
            name={`p@${eq.pos}`}
            rhs={eq.covers.map((c) => `b${c}`).join(" ⊕ ")}
            res={eq.value}
            zero={eq.value === 0}
          />
        ))}
        {t.overall && (
          <Eq
            name="p₀"
            rhs={`b1 ⊕ … ⊕ b${t.code.baseN}`}
            res={t.overall.value}
            zero={t.overall.value === 0}
          />
        )}
      </div>

      <div className="section">
        <SecLabel>palabra código resultante (n = {t.code.n})</SecLabel>
        <Codeword bits={t.codeword} roles={t.roles} />
      </div>
    </>
  );
}

function StepChannel({ t }: { t: BlockTrace }) {
  const { channel } = usePipelineStore();
  const flipped = new Set(t.flippedPositions);
  return (
    <>
      <p>
        {channel.mode === "bsc" ? (
          <>
            Canal simétrico binario (<strong>BSC</strong>): cada bit transmitido se invierte de forma
            independiente con probabilidad <strong>p = {channel.bscProbability.toFixed(3)}</strong>.
          </>
        ) : (
          <>
            Inyección manual: se aplica <strong>XOR</strong> del patrón{" "}
            <code className="inl">{channel.pattern || "—"}</code> desde la posición{" "}
            <strong>{channel.patternPosition}</strong> de la cadena codificada.
          </>
        )}
      </p>

      <div className="section">
        <SecLabel>bloque #{t.blockIndex} · transmitido</SecLabel>
        <Codeword bits={t.codeword} roles={t.roles} />
      </div>
      <div className="section">
        <SecLabel>bloque #{t.blockIndex} · recibido</SecLabel>
        <Codeword bits={t.received} roles={t.roles} flipped={flipped} />
      </div>

      {t.flippedPositions.length === 0 ? (
        <Alert kind="ok">Ningún bit de este bloque cambió en el canal.</Alert>
      ) : (
        <Alert kind="warn">
          Bits invertidos en este bloque: posiciones {t.flippedPositions.join(", ")} (
          {t.flippedPositions.length} {t.flippedPositions.length === 1 ? "error" : "errores"}).
        </Alert>
      )}
    </>
  );
}

function StepDecode({ t }: { t: BlockTrace }) {
  const diag: Record<BlockTrace["diagnosis"], { msg: string; kind: "ok" | "warn" }> = {
    "no-error": { msg: "Síndrome cero → no se detecta error.", kind: "ok" },
    "single-corrected": {
      msg: `Síndrome = ${t.syndrome} → error único en la posición ${t.correctedPosition}; se corrige invirtiéndolo.`,
      kind: "ok",
    },
    "overall-bit": {
      msg: "Síndrome cero pero falla la paridad global → el error está en el bit de paridad global; los datos son correctos.",
      kind: "ok",
    },
    "double-uncorrectable": {
      msg: "Síndrome inconsistente con la paridad global → se detectan dos errores; el bloque no es corregible.",
      kind: "warn",
    },
  };
  const d = diag[t.diagnosis];
  const hadFlips = t.flippedPositions.length > 0;
  return (
    <>
      <p>
        El decodificador recalcula cada bit de <strong>síndrome</strong> como <strong>XOR</strong> de
        los bits recibidos en ciertas posiciones. El número binario formado por los síndromes apunta a
        la posición del bit erróneo (0 = sin error)
        {t.code.extended ? "; la paridad global distingue 1 vs 2 errores." : "."}
      </p>

      <div className="section">
        <SecLabel>bloque #{t.blockIndex} · recibido</SecLabel>
        <Codeword bits={t.received} roles={t.roles} flipped={new Set(t.flippedPositions)} />
      </div>

      <div className="section">
        <SecLabel>cálculo del síndrome</SecLabel>
        {t.syndromeBits.map((s, i) => (
          <Eq
            key={i}
            name={`s${i} · peso ${s.weight}`}
            rhs={s.covers.map((c) => `r${c}`).join(" ⊕ ")}
            res={s.value}
            zero={s.value === 0}
            bad={s.value === 1}
          />
        ))}
        {t.code.extended && (
          <Eq
            name="paridad global"
            rhs={`r1 ⊕ … ⊕ r${t.code.n}`}
            res={t.overallCheck ?? 0}
            zero={t.overallCheck === 0}
            bad={t.overallCheck === 1}
          />
        )}
        <Eq
          name="síndrome"
          rhs={`${t.syndromeBits.map((s) => s.value).reverse().join("")}₂`}
          res={t.syndrome}
          zero={t.syndrome === 0}
        />
      </div>

      <Alert kind={d.kind}>{d.msg}</Alert>

      <div className="section">
        <SecLabel>datos recuperados (k = {t.code.k})</SecLabel>
        <BitRow
          items={t.dataOut.map((b, i) => ({
            value: b,
            cls: !hadFlips ? "" : b !== t.dataIn[i] ? "e" : "c",
            label: `d${i + 1}`,
          }))}
        />
        <p style={{ marginBottom: 0 }}>
          {arraysEqual(t.dataOut, t.dataIn) ? (
            <span style={{ color: "var(--ok)" }}>Coincide con el bloque original.</span>
          ) : (
            <span style={{ color: "var(--warn)" }}>Difiere del bloque original.</span>
          )}
        </p>
      </div>
    </>
  );
}

function StepVerify() {
  const { result } = usePipelineStore();
  if (!result) return <p>Ejecutá el pipeline.</p>;
  const m = result.metrics;
  const totalBlocks = Math.round(m.encodedBits / result.code.n);
  return (
    <>
      <p>
        Los bloques decodificados se reensamblan en bytes y se compara su hash <strong>SHA-256</strong>{" "}
        con el del archivo original. La <strong>BER</strong> se mide antes y después de la corrección.
      </p>

      <div className="section">
        <SecLabel>métricas</SecLabel>
        <div className="metric-grid">
          <Metric k="BER en el canal (pre)" v={pct(m.berPreDecode)} tone="err" d="errores / bits transmitidos" />
          <Metric
            k="BER tras decodificar (post)"
            v={pct(m.berPostDecode)}
            tone={m.berPostDecode > 0 ? "warn" : "ok"}
            d="errores residuales / bits de dato"
          />
          <Metric k="Bloques corregidos" v={String(m.blocksCorrected)} tone="ok" d={`de ${totalBlocks.toLocaleString()} bloques`} />
          <Metric
            k="Bloques no corregibles"
            v={String(m.blocksUncorrectable)}
            tone={m.blocksUncorrectable ? "warn" : undefined}
            d="errores dobles detectados"
          />
        </div>
      </div>

      <div className="section">
        <SecLabel>verificación de integridad</SecLabel>
        <div className="hash">
          <span className="k">SHA-256 original</span>
          <span className="v">{m.originalHash}</span>
        </div>
        <div className="hash">
          <span className="k">SHA-256 decodificado</span>
          <span className="v">{m.decodedHash}</span>
        </div>
        {m.integrity ? (
          <Alert kind="ok">El archivo reconstruido es idéntico al original.</Alert>
        ) : (
          <Alert kind="err">El archivo reconstruido difiere del original (errores residuales).</Alert>
        )}
      </div>
    </>
  );
}

function Metric({
  k,
  v,
  d,
  tone,
}: {
  k: string;
  v: string;
  d?: string;
  tone?: "ok" | "warn" | "err";
}) {
  return (
    <div className={"metric" + (tone === "ok" ? " ok" : tone === "err" ? " err" : "")}>
      <div className="k">{k}</div>
      <div className={"v" + (tone ? " " + tone : "")}>{v}</div>
      {d && <div className="d">{d}</div>}
    </div>
  );
}

/* ---------- shell ---------- */

export function AlgorithmProcess() {
  const { step, result } = usePipelineStore();

  let body: React.ReactNode;
  if (!result) body = <p>Ejecutá el pipeline para ver este paso.</p>;
  else if (step === 1) body = <StepOriginal />;
  else if (step === 2) body = <StepEncode t={result.trace} />;
  else if (step === 3) body = <StepChannel t={result.trace} />;
  else if (step === 4) body = <StepDecode t={result.trace} />;
  else body = <StepVerify />;

  return (
    <>
      <span className="tag">paso a paso</span>
      <h3>¿Qué hace el algoritmo aquí?</h3>
      {body}
    </>
  );
}

/* ---------- utils ---------- */

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
function arraysEqual(a: Bit[], b: Bit[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
function pct(x: number) {
  return `${(x * 100).toFixed(3)} %`;
}
function ratio(k: number, n: number) {
  const g = gcd(k, n) || 1;
  return `${k / g}/${n / g}`;
}
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
