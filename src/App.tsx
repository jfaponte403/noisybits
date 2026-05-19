import { usePipelineStore } from "./store/pipelineStore";
import { ControlsPanel } from "./components/ControlsPanel";
import { BitGrid, Legend } from "./components/BitStreamViewer";
import { Toast } from "./components/Toast";
import { unpackBits } from "./lib/bitstream/BitArray";
import { MetricsPanel } from "./components/MetricsPanel";
import { AlgorithmProcess } from "./components/AlgorithmProcess";
import { BERChart } from "./components/BERChart";
import { ModePicker } from "./components/ModePicker";
import { LDPCExplainer, LearnButton } from "./components/LDPCExplainer";
import { InspectorDrawer } from "./components/InspectorDrawer";
import { getCode } from "./lib/encoders/index";
import { Activity, BookOpen, Check, Download, FileCode2, Gauge, RadioTower, Terminal } from "lucide-react";
import { useEffect, useState } from "react";
import type React from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import type { AppMode } from "./store/pipelineStore";

const SECTION_IDS = ["sec-entrada", "sec-ldpc", "sec-redundancia", "sec-descarga"] as const;
type SectionId = (typeof SECTION_IDS)[number];

const MODE_PATH: Record<AppMode, string> = {
  encode: "/codificar",
  decode: "/decodificar",
};

function scrollToSection(id: SectionId) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function useScrollSpy(ids: readonly string[]): number | null {
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const resolve = () =>
      ids
        .map((id, i) => {
          const el = document.getElementById(id);
          return el ? { el, i } : null;
        })
        .filter((x): x is { el: HTMLElement; i: number } => x !== null);

    let tracked = resolve();
    if (tracked.length === 0) return;

    const observer = new IntersectionObserver(
      () => {
        const ranked = tracked
          .map((t) => ({ i: t.i, rect: t.el.getBoundingClientRect() }))
          .filter((t) => t.rect.bottom > 120 && t.rect.top < window.innerHeight * 0.5)
          .sort((a, b) => a.rect.top - b.rect.top);
        if (ranked[0]) setActive(ranked[0].i);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    tracked.forEach((t) => observer.observe(t.el));
    return () => observer.disconnect();
  }, [ids.join("|")]);
  return active;
}

function Logo() {
  return (
    <div className="logo">
      <svg viewBox="0 0 24 24" fill="none" stroke="#07111c" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12c2.5 0 2.5-7 5-7s2.5 14 5 14 2.5-7 5-7h3" />
      </svg>
    </div>
  );
}

function Brand({ subtitle, onHome }: { subtitle: React.ReactNode; onHome?: () => void }) {
  const content = (
    <>
      <Logo />
      <div>
        <h1>Channel Coding Visualizer</h1>
        <div className="sub">{subtitle}</div>
      </div>
    </>
  );
  if (!onHome) return <div className="brand">{content}</div>;
  return (
    <button type="button" className="brand brand-link" onClick={onHome} aria-label="Volver al inicio">
      {content}
    </button>
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

function ModeToggle() {
  const navigate = useNavigate();
  const { mode } = usePipelineStore();
  if (!mode) return null;
  const select = (m: AppMode) => {
    if (m !== mode) navigate(MODE_PATH[m]);
  };
  return (
    <div className="mode-toggle" role="tablist" aria-label="Modo del pipeline">
      <button
        type="button"
        role="tab"
        aria-selected={mode === "encode"}
        data-active={mode === "encode"}
        onClick={() => select("encode")}
      >
        Codificar
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "decode"}
        data-active={mode === "decode"}
        onClick={() => select("decode")}
      >
        Decodificar
      </button>
    </div>
  );
}

function JourneyStrip({ activeSection }: { activeSection: number | null }) {
  const { mode, file, result, running, codeId } = usePipelineStore();
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
        { title: "Síndrome", detail: "H · r por bloque", icon: Activity, state: result ? "done" : running ? "active" : "upcoming" },
        { title: "Corrección", detail: result ? `${result.metrics.errorsCorrected} reparados` : "bit-flipping", icon: RadioTower, state: result ? "done" : "upcoming" },
        { title: "Integridad", detail: result ? `${result.metrics.errorsUncorrected === 0 ? "síndrome 0" : "residual"}` : "hash final", icon: Gauge, state: result ? "active" : "upcoming" },
      ];

  return (
    <nav className="journey" aria-label="navegación del pipeline">
      {stages.map((stage, index) => {
        const Icon = stage.icon;
        const sectionId = SECTION_IDS[index];
        const isCurrent = activeSection === index;
        return (
          <a
            className="journey-step"
            data-state={stage.state}
            data-current={isCurrent ? "true" : undefined}
            key={stage.title}
            href={`#${sectionId}`}
            aria-current={isCurrent ? "true" : undefined}
            onClick={(e) => {
              e.preventDefault();
              scrollToSection(sectionId);
            }}
          >
            <div className="journey-node" aria-hidden="true">
              {stage.state === "done" ? <Check size={14} /> : <Icon size={15} />}
            </div>
            <div className="journey-copy">
              <span className="journey-index">0{index + 1}</span>
              <strong>{stage.title}</strong>
              <span>{stage.detail}</span>
            </div>
          </a>
        );
      })}
    </nav>
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

function HomePage() {
  const navigate = useNavigate();
  const { setMode } = usePipelineStore();

  useEffect(() => {
    setMode(null);
  }, [setMode]);

  return (
    <div className="app min-h-screen">
      <Toast />
      <header className="topbar">
        <Brand
          subtitle={
            <>
              instrumento de laboratorio<span className="sep">·</span>precisión técnica<span className="sep">·</span>LDPC
            </>
          }
        />
      </header>
      <main className="home-shell">
        <div className="home-intro">
          <span className="eyebrow">laboratorio LDPC</span>
          <h2>Visualizá cómo un archivo gana <span className="accent">redundancia</span>, atraviesa ruido y vuelve a verificarse.</h2>
          <p>Elegí una dirección del pipeline. Cada etapa muestra qué bits cambian, qué control se agregó y qué evidencia deja el algoritmo.</p>
        </div>
        <div className="home-picker">
          <ModePicker onSelect={(m) => navigate(MODE_PATH[m])} />
          <LearnButton onClick={() => navigate("/aprender")} />
        </div>
      </main>
      <Footer />
    </div>
  );
}

function LearnPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setMode } = usePipelineStore();

  const goBack = () => {
    const from = (location.state as { from?: string } | null)?.from;
    if (from) navigate(from);
    else navigate(-1);
  };

  return (
    <div className="app min-h-screen">
      <Toast />
      <header className="topbar">
        <Brand
          onHome={() => navigate("/")}
          subtitle="LDPC: Aprender"
        />
      </header>
      <LDPCExplainer
        onBack={goBack}
        onStart={(m) => {
          setMode(m);
          navigate(MODE_PATH[m]);
        }}
      />
      <Footer />
    </div>
  );
}

function WorkspacePage({ pageMode }: { pageMode: AppMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, result, setMode, file, running, codeId, setInspect } = usePipelineStore();
  const activeSection = useScrollSpy(SECTION_IDS);
  const code = getCode(codeId);

  useEffect(() => {
    if (mode !== pageMode) setMode(pageMode);
  }, [pageMode, mode, setMode]);

  if (mode !== pageMode) return null;

  return (
    <div className="app min-h-screen">
      <Toast />
      <InspectorDrawer />

      <header className="topbar">
        <Brand
          onHome={() => navigate("/")}
          subtitle={mode === "encode" ? "LDPC: Codificación" : "LDPC: Decodificación"}
        />
        <ModeToggle />
        <div className="top-actions">
          <StatusPill
            state={running ? "running" : result ? "done" : file ? "ready" : "idle"}
            label={running ? "procesando" : result ? "pipeline completo" : file ? "archivo listo" : "sin archivo"}
          />
          <button
            type="button"
            onClick={() => navigate("/aprender", { state: { from: location.pathname } })}
            className="btn ghost btn-sm flex items-center gap-2"
            aria-label="Abrir guía de aprendizaje"
          >
            <BookOpen size={14} />
            Aprender
          </button>
          <a href="https://github.com/jfaponte403/noisybits" target="_blank" rel="noopener noreferrer" className="btn ghost btn-sm flex items-center gap-2">
            <Terminal size={16} />
            GitHub
          </a>
        </div>
      </header>

      <JourneyStrip activeSection={activeSection} />

      <main className="workspace">
        <aside id="sec-entrada" className="control-rail anchor">
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
          <div id="sec-ldpc" className="anchor">
            <AlgorithmProcess />
          </div>

          {mode === "encode" ? (
            <div id="sec-redundancia" className="flow-grid anchor">
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
            <div id="sec-redundancia" className="flow-grid anchor">
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

          <div id="sec-descarga" className="analysis-grid anchor">
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/aprender" element={<LearnPage />} />
      <Route path="/codificar" element={<WorkspacePage pageMode="encode" />} />
      <Route path="/decodificar" element={<WorkspacePage pageMode="decode" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
