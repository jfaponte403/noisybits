import { usePipelineStore } from "./store/pipelineStore";
import { ControlsPanel } from "./components/ControlsPanel";
import { BitGrid, Legend } from "./components/BitStreamViewer";
import { Toast } from "./components/Toast";
import { unpackBits } from "./lib/bitstream/BitArray";
import { MetricsPanel } from "./components/MetricsPanel";
import { AlgorithmProcess } from "./components/AlgorithmProcess";
import { BERChart } from "./components/BERChart";
import { ModePicker } from "./components/ModePicker";
import { InspectorDrawer } from "./components/InspectorDrawer";
import { getCode } from "./lib/encoders/index";
import { Activity, ArrowLeft, Check, Download, FileCode2, Gauge, RadioTower, Terminal } from "lucide-react";
import type React from "react";

function Logo() {
  return (
    <div className="logo">
      <svg viewBox="0 0 24 24" fill="none" stroke="#07111c" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12c2.5 0 2.5-7 5-7s2.5 14 5 14 2.5-7 5-7h3" />
      </svg>
    </div>
  );
}

function Footer() {
  return (
    <footer className="foot mt-auto pt-8">
      <div className="foot-row">
        sin backend · ningún archivo sale del navegador · algoritmo LDPC, 100% local
      </div>
      <div className="foot-row">
        <span>© {new Date().getFullYear()} noisybits</span>
        <span className="dot">·</span>
        <a href="https://github.com/jfaponte403/noisybits" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
          <Terminal size={12} />
          GitHub
        </a>
      </div>
    </footer>
  );
}

function StatusPill({
  state,
  label,
}: {
  state: "idle" | "ready" | "running" | "done";
  label: string;
}) {
  return (
    <div className={`status-pill ${state === "idle" ? "warn" : ""} ${state === "running" ? "active" : ""}`}>
      <span className="led" />
      {label}
    </div>
  );
}

function JourneyStrip() {
  const { mode, file, result, running, codeId, setInspect } = usePipelineStore();
  const code = getCode(codeId);
  const stages = mode === "encode"
    ? [
        { title: "Entrada", detail: file ? `${file.bytes.length.toLocaleString()} bytes` : "archivo local", icon: FileCode2, state: file ? "done" : "active" },
        { title: "LDPC", detail: `${code.k}->${code.n}`, icon: Activity, state: result ? "done" : running ? "active" : "upcoming" },
        { title: "Redundancia", detail: `${Math.round((1 - code.rate) * 100)}% control`, icon: RadioTower, state: result ? "done" : "upcoming" },
        { title: "Descarga", detail: ".txt binario", icon: Download, state: result ? "active" : "upcoming" },
      ]
    : [
        { title: "Recepción", detail: file ? `${file.bytes.length.toLocaleString()} bytes` : "señal codificada", icon: FileCode2, state: file ? "done" : "active" },
        { title: "Canal", detail: "BSC + patrón", icon: RadioTower, state: result ? "done" : running ? "active" : "upcoming" },
        { title: "Síndrome", detail: "H · corrección", icon: Activity, state: result ? "done" : "upcoming" },
        { title: "Integridad", detail: result ? `${result.metrics.errorsCorrected} reparados` : "hash final", icon: Gauge, state: result ? "active" : "upcoming" },
      ];

  return (
    <section className="journey" aria-label="flujo del pipeline">
      {stages.map((stage, index) => {
        const Icon = stage.icon;
        const open = () => mode && setInspect({ kind: "stage", mode, index });
        return (
          <div
            className="journey-step"
            data-state={stage.state}
            key={stage.title}
            role="button"
            tabIndex={0}
            onClick={open}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                open();
              }
            }}
            aria-label={`Explicar etapa: ${stage.title}`}
          >
            <div className="journey-node">
              {stage.state === "done" ? <Check size={14} /> : <Icon size={15} />}
            </div>
            <div className="journey-copy">
              <span className="journey-index">0{index + 1}</span>
              <strong>{stage.title}</strong>
              <span>{stage.detail}</span>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function FlowCard({
  eyebrow,
  title,
  accent,
  description,
  children,
  legend = false,
  state = "waiting",
}: {
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  children: React.ReactNode;
  legend?: boolean;
  state?: "waiting" | "live" | "done";
}) {
  return (
    <section className="card flow-card" data-state={state}>
      <div className="card-head">
        <div className="left">
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title} <span className="accent">{accent}</span></h2>
          <p className="muted">{description}</p>
        </div>
        {legend && <Legend />}
      </div>
      {children}
    </section>
  );
}

export default function App() {
  const { mode, result, setMode, file, running, codeId, setInspect } = usePipelineStore();
  const code = getCode(codeId);

  if (!mode) {
    return (
      <div className="app min-h-screen">
        <Toast />
        <header className="topbar">
          <div className="brand">
            <Logo />
            <div>
              <h1>Channel Coding Visualizer</h1>
              <div className="sub">
                instrumento de laboratorio<span className="sep">·</span>precisión técnica<span className="sep">·</span>LDPC
              </div>
            </div>
          </div>
        </header>
        <main className="home-shell">
            <div className="home-intro">
                <span className="eyebrow">laboratorio LDPC</span>
                <h2>Visualizá cómo un archivo gana <span className="accent">redundancia</span>, atraviesa ruido y vuelve a verificarse.</h2>
                <p>Elegí una dirección del pipeline. Cada etapa muestra qué bits cambian, qué control se agregó y qué evidencia deja el algoritmo.</p>
            </div>
            <ModePicker />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="app min-h-screen">
      <Toast />
      <InspectorDrawer />

      <header className="topbar">
        <div className="brand">
          <Logo />
          <div>
            <h1>Channel Coding Visualizer</h1>
            <div className="sub">
              {mode === "encode" ? "LDPC: Codificación" : "LDPC: Decodificación"}
            </div>
          </div>
        </div>
        <div className="top-actions">
          <StatusPill
            state={running ? "running" : result ? "done" : file ? "ready" : "idle"}
            label={running ? "procesando" : result ? "pipeline completo" : file ? "archivo listo" : "sin archivo"}
          />
          <button onClick={() => setMode(null)} className="btn ghost btn-sm flex items-center gap-2">
            <ArrowLeft size={14} />
            Cambiar
          </button>
          <a href="https://github.com/jfaponte403/noisybits" target="_blank" rel="noopener noreferrer" className="btn ghost btn-sm flex items-center gap-2">
            <Terminal size={16} />
            GitHub
          </a>
        </div>
      </header>

      <JourneyStrip />

      <main className="workspace">
        <aside className="control-rail">
          <section className="card control-card">
            <div className="card-head">
              <div className="left">
                <span className="eyebrow">{mode === "encode" ? "configuración" : "recepción"}</span>
                <h2>Control del <span className="accent">pipeline</span></h2>
                <p className="muted">{code.label}. Tasa {code.rate.toFixed(3)} con bloques {code.k}{" -> "}{code.n}.</p>
              </div>
            </div>
            <ControlsPanel />
          </section>
        </aside>

        <div className="stage-area">
          <AlgorithmProcess />

          {mode === "encode" ? (
            <div className="flow-grid">
                <FlowCard
                  eyebrow="paso 1 · entrada"
                  title="Bits"
                  accent="originales"
                  description="Carga útil antes de aplicar la matriz generadora."
                  legend
                  state={result ? "done" : file ? "live" : "waiting"}
                >
                <BitGrid
                    bits={result ? unpackBits(result.original.bits, result.original.length) : null}
                    metadata={result?.original.metadata}
                    emptyHint="Carga un archivo y ejecuta la codificación."
                    onBitClick={result ? (i) => setInspect({ kind: "bit", mode: "encode", which: "original", index: i }) : undefined}
                />
                </FlowCard>

                <FlowCard
                  eyebrow="paso 2 · salida"
                  title="Bits"
                  accent="codificados"
                  description="Datos sistemáticos más paridad lista para transportar."
                  state={result ? "done" : "waiting"}
                >
                <BitGrid
                    bits={result ? unpackBits(result.encoded.bits, result.encoded.length) : null}
                    metadata={result?.encoded.metadata}
                    emptyHint="La redundancia se visualizará aquí tras procesar."
                    onBitClick={result ? (i) => setInspect({ kind: "bit", mode: "encode", which: "encoded", index: i }) : undefined}
                />
                </FlowCard>
            </div>
          ) : (
            <div className="flow-grid">
                <FlowCard
                  eyebrow="paso 1 · canal"
                  title="Bits"
                  accent="recibidos"
                  description="Secuencia codificada después del ruido configurado."
                  legend
                  state={result ? "done" : file ? "live" : "waiting"}
                >
                <BitGrid
                    bits={result ? unpackBits(result.received.bits, result.received.length) : null}
                    metadata={result?.received.metadata}
                    emptyHint="La señal con ruido aparecerá aquí tras procesar."
                    onBitClick={result ? (i) => setInspect({ kind: "bit", mode: "decode", which: "received", index: i }) : undefined}
                />
                </FlowCard>

                <FlowCard
                  eyebrow="paso 2 · corrección"
                  title="Bits"
                  accent="decodificados"
                  description="Carga útil extraída después de síndrome y corrección."
                  state={result ? "done" : "waiting"}
                >
                <BitGrid
                    bits={result ? unpackBits(result.decoded.bits, result.decoded.length) : null}
                    metadata={result?.decoded.metadata}
                    emptyHint="Resultado de la corrección de errores."
                    onBitClick={result ? (i) => setInspect({ kind: "bit", mode: "decode", which: "decoded", index: i }) : undefined}
                />
                </FlowCard>
            </div>
          )}

          <div className="analysis-grid">
            <BERChart />
            <section className="card">
              <div className="card-head">
                <div className="left">
                  <span className="eyebrow">verificación</span>
                  <h2>Métricas e <span className="accent">integridad</span></h2>
                  <p className="muted">Evidencia final del procesamiento local.</p>
                </div>
              </div>
              <MetricsPanel />
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
