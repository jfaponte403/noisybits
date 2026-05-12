import { usePipelineStore, LAST_STEP } from "./store/pipelineStore";
import { ControlsPanel } from "./components/ControlsPanel";
import { ResultsBar } from "./components/MetricsPanel";
import { BitGrid, Legend } from "./components/BitStreamViewer";
import { Stepper } from "./components/Stepper";
import { AlgorithmProcess } from "./components/AlgorithmProcess";
import { Toast } from "./components/Toast";

// indexed by pipeline step 1..5
const VIEW: Record<number, { slug: string; title: React.ReactNode; sub: string }> = {
  1: { slug: "original", title: <>Bits del archivo <span className="accent">original</span></>, sub: "El archivo, byte a byte, expandido a bits MSB → LSB." },
  2: { slug: "encode", title: <>Bits <span className="accent">codificados</span></>, sub: "Datos más bits de redundancia añadidos por el código." },
  3: { slug: "channel", title: <>Bits <span className="accent">recibidos</span></>, sub: "La cadena tras pasar por el canal ruidoso." },
  4: { slug: "decode", title: <>Bits <span className="accent">decodificados</span></>, sub: "Datos recuperados tras corregir errores por síndrome." },
  5: { slug: "verify", title: <>Comparación <span className="accent">final</span></>, sub: "Datos decodificados frente al original." },
};

function Logo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#07111c" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12c2.5 0 2.5-7 5-7s2.5 14 5 14 2.5-7 5-7h3" />
    </svg>
  );
}

function StatusPill() {
  const result = usePipelineStore((s) => s.result);
  if (!result) return null;
  const ok = result.metrics.integrity;
  return (
    <span className={"status-pill " + (ok ? "" : "err")}>
      <span className="led" />
      {ok ? "íntegro · SHA-256 ok" : "errores residuales"}
    </span>
  );
}

export default function App() {
  const { result, step, running, goNext, goBack, clearFile } = usePipelineStore();

  const stepBits =
    step === 1 ? (result?.original ?? null)
    : step === 2 ? (result?.encoded ?? null)
    : step === 3 ? (result?.received ?? null)
    : step === 4 ? (result?.decoded ?? null)
    : step === 5 ? (result?.comparison ?? null)
    : null;

  return (
    <div className="app">
      <Toast />

      <header className="topbar">
        <div className="brand">
          <span className="logo">
            <Logo />
          </span>
          <div>
            <h1>Channel Coding Visualizer</h1>
            <div className="sub">
              códigos Hamming<span className="sep">·</span>canal ruidoso<span className="sep">·</span>corrección de errores<span className="sep">·</span>100&nbsp;% en el navegador
            </div>
          </div>
        </div>
        <StatusPill />
      </header>

      <nav className="stepper">
        <Stepper />
      </nav>

      {step === 0 ? (
        <section className="card" style={{ maxWidth: 560, margin: "0 auto", width: "100%" }}>
          <div className="card-head" style={{ marginBottom: 18 }}>
            <div className="left">
              <span className="eyebrow">paso 1 · setup</span>
              <h2>
                Subí un archivo y elegí la <span className="accent">tasa</span>
              </h2>
              <p className="muted">
                Cargá un archivo, seleccioná un código Hamming con su tasa y ejecutá. Vas a recorrer
                el pipeline paso a paso.
              </p>
            </div>
          </div>
          <ControlsPanel />
        </section>
      ) : (
        <>
          <section className="card">
            <div className="card-head">
              <div className="left">
                <span className="eyebrow">
                  paso {step + 1} · {VIEW[step].slug}
                </span>
                <h2>{VIEW[step].title}</h2>
                <p className="muted">{VIEW[step].sub}</p>
              </div>
              <Legend />
            </div>
            <BitGrid bits={stepBits} emptyHint="Ejecutá el pipeline para ver este paso." />
          </section>

          <section className="card algo">
            <AlgorithmProcess />
          </section>

          {step === LAST_STEP && result && (
            <section className="card">
              <ResultsBar />
            </section>
          )}
        </>
      )}

      <div className="navrow">
        <button className="btn" onClick={goBack} disabled={step === 0}>
          ← Atrás
        </button>
        {step === 0 ? (
          <span className="hint">usá el botón “Ejecutar pipeline” de arriba</span>
        ) : step === LAST_STEP ? (
          <button className="btn primary" onClick={clearFile}>
            ↺ Empezar de nuevo
          </button>
        ) : (
          <button className="btn primary" onClick={goNext} disabled={running || result === null}>
            Siguiente →
          </button>
        )}
      </div>

      <footer className="foot">
        sin backend · ningún archivo sale del navegador · SHA-256 vía Web Crypto API
      </footer>
    </div>
  );
}
