import { ArrowLeft, ShieldCheck, ShieldAlert, BookOpen } from "lucide-react";
import { ALL_CODES } from "../lib/encoders/index";
import { LDPC_7_4 } from "../lib/encoders/LDPC";
import { Term, Matrix } from "./Term";

interface Props {
  onBack: () => void;
  onStart: (mode: "encode" | "decode") => void;
}

interface RowProps {
  label: string;
  bits: number[];
  highlight?: number[];
  variant?: "data" | "parity" | "altered" | "corrected";
}

function BitRow({ label, bits, highlight = [], variant = "data" }: RowProps) {
  const cls = variant === "parity" ? "r" : variant === "altered" ? "a" : variant === "corrected" ? "c" : "";
  return (
    <div className="explainer-row">
      <span className="explainer-row-lbl">{label}</span>
      <div className="explainer-bits">
        {bits.map((b, i) => (
          <span
            key={i}
            className={`bit-chip ${highlight.includes(i) ? "a" : cls}`}
            title={`bit ${i}: ${b}`}
          >
            {b}
          </span>
        ))}
      </div>
    </div>
  );
}

export function LDPCExplainer({ onBack, onStart }: Props) {
  // Ejemplo quemado: código LDPC 4/7 didáctico
  // Dato: 1011 -> codeword sistemático: [1,0,1,1, p1,p2,p3]
  // G y H del código 4/7 didáctico (Hamming(7,4) extendido conceptualmente)
  // P = [[1,1,0],[0,1,1],[1,1,1],[1,0,1]]
  // codeword = [d0,d1,d2,d3, d0+d2+d3, d0+d1+d2, d1+d2+d3]  (mod 2)
  const data = [1, 0, 1, 1];
  const p1 = (data[0] + data[2] + data[3]) % 2; // 1+1+1 = 1
  const p2 = (data[0] + data[1] + data[2]) % 2; // 1+0+1 = 0
  const p3 = (data[1] + data[2] + data[3]) % 2; // 0+1+1 = 0
  const codeword = [...data, p1, p2, p3];
  const errorPos = 4;
  const received = codeword.map((b, i) => (i === errorPos ? 1 - b : b));
  const corrected = [...codeword];

  return (
    <main className="learn-shell">
      <button className="btn ghost btn-sm learn-back" onClick={onBack}>
        <ArrowLeft size={14} />
        Volver
      </button>

      <header className="learn-hero">
        <span className="eyebrow">aprendé · LDPC</span>
        <h2>
          ¿Qué es <span className="accent">LDPC</span> y por qué sirve?
        </h2>
        <p>
          LDPC (<em>Low-Density Parity-Check</em>) es un código de canal que agrega{" "}
          <Term label="bits de paridad">
            Un <strong>bit de paridad</strong> es un bit extra que se calcula sumando (XOR) varios
            bits de datos. Si uno de los bits cambia, la paridad ya no “cuadra” y eso delata el error.
            <br />
            <span className="mono">Ej: p = d0 ⊕ d1 ⊕ d2</span>
          </Term>{" "}
          a un mensaje. Si el ruido del canal altera algunos bits, esas paridades
          permiten <strong>detectar y corregir</strong> el error sin reenviar nada.
        </p>
      </header>

      <section className="learn-grid">
        <article className="card learn-card">
          <span className="eyebrow">paso 1 · idea</span>
          <h3>Datos + paridad = bloque protegido</h3>
          <p>
            Tomamos <strong>k</strong> bits de datos y agregamos <strong>n − k</strong> bits
            de paridad calculados con una{" "}
            <Term label="Matriz G">
              La <strong>matriz generadora G</strong> tiene tamaño <span className="mono">k × n</span>.
              En forma sistemática es <span className="mono">[I | P]</span>: copia los datos tal cual
              y agrega columnas que calculan cada bit de paridad.
              <Matrix rows={LDPC_7_4.G} caption="G del código 4/7 (4×7)" />
              Multiplicar el vector de datos por <span className="mono">G</span> (mod 2) produce el codeword.
            </Term>
            . El bloque resultante de <strong>n</strong> bits se llama{" "}
            <Term label="codeword">
              <strong>Codeword</strong>: el bloque de <span className="mono">n</span> bits que
              efectivamente se transmite. Los primeros <span className="mono">k</span> bits son
              los datos originales (parte sistemática) y los últimos <span className="mono">n−k</span>{" "}
              son la paridad.
            </Term>
            .
          </p>
          <div className="learn-formula">
            <span className="mono">codeword = datos · G  (mod 2)</span>
          </div>
        </article>

        <article className="card learn-card">
          <span className="eyebrow">paso 2 · canal</span>
          <h3>El ruido cambia bits</h3>
          <p>
            En el canal, algunos bits pueden invertirse. Sin protección, el receptor no
            tiene cómo saber cuáles. Con LDPC, las paridades dejan una <strong>firma</strong>
            que delata al bit alterado.
          </p>
        </article>

        <article className="card learn-card">
          <span className="eyebrow">paso 3 · corrección</span>
          <h3>Síndrome con la matriz H</h3>
          <p>
            El receptor calcula{" "}
            <Term label="síndrome">
              El <strong>síndrome</strong> es el vector <span className="mono">s = H · r</span>{" "}
              (mod 2), donde <span className="mono">r</span> es el bloque recibido. Si todos
              sus bits son cero, no hay errores detectables. Si no, el patrón de unos en{" "}
              <span className="mono">s</span> coincide con la columna de <span className="mono">H</span> del bit que falló.
            </Term>{" "}
            con la{" "}
            <Term label="Matriz H">
              La <strong>matriz de chequeo H</strong> tiene tamaño <span className="mono">(n−k) × n</span>.
              Cada fila es una ecuación de paridad que el codeword debe cumplir:
              <span className="mono"> H · codeword = 0</span>.
              <Matrix rows={LDPC_7_4.H} caption="H del código 4/7 (3×7)" />
              Cuando el recibido no la cumple, la diferencia (síndrome) apunta al bit roto.
            </Term>
            . Si da cero, no hay errores. Si no, el resultado apunta a la columna de{" "}
            <code className="inl">H</code> que coincide con el bit equivocado: se invierte ese bit y listo.
          </p>
        </article>
      </section>

      <section className="card learn-example">
        <div className="card-head">
          <div className="left">
            <span className="eyebrow">ejemplo numérico · LDPC 4/7</span>
            <h2>Codificar <span className="accent">1011</span>, sufrir 1 error, corregirlo</h2>
            <p className="muted">
              k=4 bits de datos, n=7 bits totales, 3 de paridad. Tasa 4/7 ≈ 0.571.
            </p>
          </div>
        </div>

        <BitRow label="Datos" bits={data} variant="data" />
        <div className="explainer-step">
          <span className="explainer-step-arrow">↓</span>
          <span>multiplicar por <code className="inl">G</code> → calcular 3 paridades</span>
        </div>
        <BitRow label="Codeword" bits={codeword} variant="data" highlight={[]} />
        <p className="explainer-note">
          Bits 0–3 son los datos originales (sistemáticos). Bits 4–6 son paridad:
          <span className="mono"> p1={p1}, p2={p2}, p3={p3}</span>.
        </p>

        <div className="explainer-step">
          <span className="explainer-step-arrow">↓</span>
          <span>el canal invierte el bit #{errorPos} (un bit de paridad)</span>
        </div>
        <BitRow label="Recibido" bits={received} highlight={[errorPos]} />

        <div className="explainer-step">
          <span className="explainer-step-arrow">↓</span>
          <span>
            calcular síndrome <code className="inl">s = H · recibido</code> → coincide con
            la columna #{errorPos} de <code className="inl">H</code> → invertir bit #{errorPos}
          </span>
        </div>
        <BitRow label="Corregido" bits={corrected} variant="corrected" />

        <div className="alert ok">
          <span className="ic">✓</span>
          <div>
            El receptor recuperó el bloque original sin pedir reenvíos. Los primeros 4 bits
            son los datos: <span className="mono">1011</span>.
          </div>
        </div>
      </section>

      <section className="card learn-rates">
        <div className="card-head">
          <div className="left">
            <span className="eyebrow">tasas disponibles</span>
            <h2>¿Qué pasa si cambio la <span className="accent">tasa</span>?</h2>
            <p className="muted">
              La{" "}
              <Term label="tasa">
                <strong>Tasa</strong> = <span className="mono">k / n</span>. Es la fracción de
                bits útiles dentro del bloque transmitido.
                <br />
                • <strong>Tasa baja</strong> (ej. 1/2): mucha redundancia, corrige más errores, archivo
                final más grande.
                <br />
                • <strong>Tasa alta</strong> (ej. 3/4): poca redundancia, corrige menos, archivo final
                más liviano.
              </Term>{" "}
              <strong>k/n</strong> es cuántos bits de información viajan por cada bit
              transmitido. <strong>Más baja = más redundancia = más capacidad de corrección,
              pero archivo final más grande.</strong>
            </p>
          </div>
        </div>

        <div className="rates-grid">
          {ALL_CODES.map((c) => {
            const overhead = ((c.n / c.k - 1) * 100).toFixed(0);
            const strength = c.rate <= 0.5 ? "alta" : c.rate <= 0.7 ? "media" : "baja";
            return (
              <div key={c.id} className="rate-card">
                <div className="rate-head">
                  <strong>{c.label}</strong>
                  <span className="rate-pill">tasa {c.rate.toFixed(3)}</span>
                </div>
                <dl className="rate-facts">
                  <div>
                    <dt>bits datos</dt>
                    <dd>{c.k}</dd>
                  </div>
                  <div>
                    <dt>bits totales</dt>
                    <dd>{c.n}</dd>
                  </div>
                  <div>
                    <dt>paridad</dt>
                    <dd>{c.n - c.k} bits ({overhead}% extra)</dd>
                  </div>
                  <div>
                    <dt>protección</dt>
                    <dd className={`strength-${strength}`}>{strength}</dd>
                  </div>
                </dl>
                <p className="rate-note">
                  Un archivo de 1 KB se transmite como <strong>{(c.n / c.k).toFixed(2)} KB</strong>.
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="learn-cta">
        <h3>¿Listo para probarlo con tu archivo?</h3>
        <div className="mode-picker">
          <button type="button" className="mode-card" onClick={() => onStart("encode")}>
            <div className="mc-ic">
              <ShieldCheck size={20} />
            </div>
            <div className="mc-t">Codificar</div>
            <div className="mc-d">Subí un archivo y agregale redundancia LDPC.</div>
          </button>
          <button type="button" className="mode-card" onClick={() => onStart("decode")}>
            <div className="mc-ic">
              <ShieldAlert size={20} />
            </div>
            <div className="mc-t">Decodificar</div>
            <div className="mc-d">Recibí un archivo codificado y recuperá el original.</div>
          </button>
        </div>
      </section>
    </main>
  );
}

export function LearnButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="mode-card learn-card-btn" onClick={onClick}>
      <div className="mc-ic">
        <BookOpen size={20} />
      </div>
      <div className="mc-t">Aprender</div>
      <div className="mc-d">
        Conocé cómo funciona LDPC con un ejemplo paso a paso y comparativa de tasas.
      </div>
    </button>
  );
}
