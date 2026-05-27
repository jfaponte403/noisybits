import { usePipelineStore } from "./store/pipelineStore";
import { ControlsPanel } from "./components/ControlsPanel";
import { BitGrid, Legend } from "./components/BitStreamViewer";
import { Toast } from "./components/Toast";
import { unpackBits } from "./lib/bitstream/BitArray";
import { MetricsPanel } from "./components/MetricsPanel";
import { AlgorithmProcess } from "./components/AlgorithmProcess";
import { AlgorithmTrace } from "./components/AlgorithmTrace";
import { MessageRecovery } from "./components/MessageRecovery";
import { BERChart } from "./components/BERChart";
import { ModePicker } from "./components/ModePicker";
import { LDPCExplainer } from "./components/LDPCExplainer";
import { FullProcessPage } from "./components/FullProcessPage";
import { NormativaPage } from "./components/NormativaPage";
import { InspectorDrawer } from "./components/InspectorDrawer";
import { getCode } from "./lib/encoders/index";
import { Activity, BookOpen, Check, Download, FileCode2, Gauge, RadioTower, Terminal } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type React from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import type { AppMode } from "./store/pipelineStore";

const MODE_PATH: Record<AppMode, string> = {
  encode: "/codificar",
  decode: "/decodificar",
};

type StageState = "done" | "active" | "upcoming";

interface PipelineStage {
  title: string;
  detail: string;
  icon: typeof FileCode2;
  state: StageState;
}

type TabKey = "pipeline" | "matrix" | "bits" | "metrics";

const TABS: ReadonlyArray<{ key: TabKey; label: string; shortcut: string }> = [
  { key: "pipeline", label: "Pipeline", shortcut: "1" },
  { key: "matrix", label: "Matriz", shortcut: "2" },
  { key: "bits", label: "Bits", shortcut: "3" },
  { key: "metrics", label: "Métricas", shortcut: "4" },
];

function Logo() {
  return (
    <div className="logo">
      <svg viewBox="0 0 24 24" fill="none" stroke="#1c1208" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12c2.5 0 2.5-7 5-7s2.5 14 5 14 2.5-7 5-7h3" />
      </svg>
    </div>
  );
}

function Brand({ subtitle, onHome }: { subtitle?: React.ReactNode; onHome?: () => void }) {
  const content = (
    <>
      <Logo />
      <div>
        <h1>Channel Coding Visualizer</h1>
        {subtitle && <div className="sub">{subtitle}</div>}
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
    <footer className="foot mt-auto">
      <div className="foot-row">
        sin backend · ningún archivo sale del navegador · algoritmo LDPC, 100% local
      </div>
      <div className="foot-row">
        <span>© {new Date().getFullYear()} noisybits</span>
        <span className="dot">·</span>
        <a href="https://github.com/jfaponte403/noisybits" target="_blank" rel="noopener noreferrer">
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
  state: "idle" | "ready" | "running" | "done" | "warn";
  label: string;
}) {
  const variant =
    state === "running" ? "active" :
    state === "done" ? "ok" :
    state === "warn" ? "warn" :
    state === "ready" ? "" :
    "";
  return (
    <div className={"status-pill" + (variant ? " " + variant : "")}>
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

function BrandMeta({ mode, codeLabel, bits, status }: {
  mode: AppMode;
  codeLabel: string;
  bits: string;
  status: string;
}) {
  return (
    <div className="brand-meta-row">
      <div className="brand-meta" aria-label="Contexto operativo">
        <span className="meta-key">modo</span>
        <span className="meta-val">{mode === "encode" ? "encode" : "decode"}</span>
        <span className="meta-sep" aria-hidden />
        <span className="meta-key">código</span>
        <span className="meta-val">{codeLabel}</span>
        <span className="meta-sep" aria-hidden />
        <span className="meta-key">entrada</span>
        <span className="meta-val">{bits}</span>
        <span className="meta-sep" aria-hidden />
        <span className="meta-key">estado</span>
        <span className="meta-val">{status}</span>
      </div>
    </div>
  );
}

function PipelineRail({
  stages,
  activeTab,
  onJump,
}: {
  stages: PipelineStage[];
  activeTab: TabKey;
  onJump: (tab: TabKey) => void;
}) {
  return (
    <nav className="pipeline-rail" aria-label="Etapas del pipeline">
      {stages.map((stage, i) => {
        const Icon = stage.icon;
        const tab = TABS[i].key;
        const isActiveTab = tab === activeTab;
        return (
          <button
            type="button"
            key={stage.title}
            className="pipeline-rail-step"
            data-state={stage.state}
            data-active={isActiveTab ? "true" : undefined}
            onClick={() => onJump(tab)}
            aria-current={isActiveTab ? "step" : undefined}
            aria-label={`${stage.title} — ir a la pestaña ${TABS[i].label}`}
          >
            <span className="pipeline-rail-node" aria-hidden="true">
              {stage.state === "done" ? <Check size={13} /> : <Icon size={13} />}
            </span>
            <span className="pipeline-rail-copy">
              <span className="pipeline-rail-title">{stage.title}</span>
              <span className="pipeline-rail-detail">{stage.detail}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function buildStages(opts: {
  mode: AppMode;
  file: { bytes: Uint8Array } | null;
  result: ReturnType<typeof usePipelineStore.getState>["result"];
  running: boolean;
  code: ReturnType<typeof getCode>;
}): PipelineStage[] {
  const { mode, file, result, running, code } = opts;
  if (mode === "encode") {
    return [
      { title: "Entrada", detail: file ? `${file.bytes.length.toLocaleString()} bytes` : "archivo local", icon: FileCode2, state: file ? "done" : "active" },
      { title: "LDPC", detail: `${code.k}→${code.n}`, icon: Activity, state: result ? "done" : running ? "active" : "upcoming" },
      { title: "Redundancia", detail: `${Math.round((1 - code.rate) * 100)}% control`, icon: RadioTower, state: result ? "done" : "upcoming" },
      { title: "Descarga", detail: ".txt binario", icon: Download, state: result ? "active" : "upcoming" },
    ];
  }
  return [
    { title: "Recepción", detail: file ? `${file.bytes.length.toLocaleString()} bytes` : "señal codificada", icon: FileCode2, state: file ? "done" : "active" },
    { title: "Síndrome", detail: "H · r por bloque", icon: Activity, state: result ? "done" : running ? "active" : "upcoming" },
    { title: "Corrección", detail: result ? `${result.metrics.errorsCorrected} reparados` : "bit-flipping", icon: RadioTower, state: result ? "done" : "upcoming" },
    { title: "Integridad", detail: result ? (result.metrics.errorsUncorrected === 0 ? "síndrome 0" : "residual") : "hash final", icon: Gauge, state: result ? "active" : "upcoming" },
  ];
}

function StageTabs({
  active,
  onSelect,
}: {
  active: TabKey;
  onSelect: (k: TabKey) => void;
}) {
  return (
    <div className="stage-tablist" role="tablist" aria-label="Vista del stage">
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={t.key === active}
          data-active={t.key === active ? "true" : undefined}
          className="stage-tab"
          onClick={() => onSelect(t.key)}
        >
          <span className="stage-tab-key" aria-hidden="true">{t.shortcut}</span>
          {t.label}
        </button>
      ))}
    </div>
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
          <span className="eyebrow is-accent">laboratorio LDPC</span>
          <h2>Cómo un archivo gana <span className="accent">redundancia</span>, atraviesa ruido y vuelve a verificarse.</h2>
          <p>Elegí una dirección del pipeline. Cada etapa muestra qué bits cambian, qué control se agregó y qué evidencia deja el algoritmo. Todo corre local, sin enviar nada al servidor.</p>
          <div className="home-meta">
            <span><strong>100% local</strong> · sin backend</span>
            <span><strong>LDPC</strong> · 7/4 · 1/2 · 2/3 · 3/4</span>
            <span><strong>Web Workers</strong> · operaciones de bits</span>
          </div>
        </div>
        <div className="home-picker">
          <div className="home-group">
            <span className="home-group-label">operaciones</span>
            <ModePicker onSelect={(m) => navigate(MODE_PATH[m])} />
          </div>

          <div className="home-group">
            <span className="home-group-label">proceso completo</span>
            <div className="chain-pair">
              <button
                type="button"
                className="chain-card"
                onClick={() => navigate("/proceso-completo/codificar")}
              >
                <div className="mc-ic">
                  <RadioTower size={18} />
                </div>
                <div className="chain-body">
                  <div className="mc-t">Codificación · transmisor</div>
                  <div className="mc-d">
                    Codificación de fuente, codificación de canal y modulación de la señal, de extremo a extremo.
                  </div>
                </div>
              </button>
              <button
                type="button"
                className="chain-card"
                onClick={() => navigate("/proceso-completo/decodificar")}
              >
                <div className="mc-ic">
                  <RadioTower size={18} />
                </div>
                <div className="chain-body">
                  <div className="mc-t">Decodificación · receptor</div>
                  <div className="mc-d">
                    Ruido del canal, demodulación, corrección de errores y mensaje recuperado.
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="home-group">
            <span className="home-group-label">referencia</span>
            <div className="ref-row">
              <button type="button" className="ref-card" onClick={() => navigate("/normativa")}>
                <div className="ref-ic">
                  <BookOpen size={16} />
                </div>
                <div className="ref-text">
                  <span className="ref-t">Normativa</span>
                  <span className="ref-d">Regulación: radio AM en Argentina y telefonía 5G (Hanoi).</span>
                </div>
              </button>
              <button type="button" className="ref-card" onClick={() => navigate("/aprender")}>
                <div className="ref-ic">
                  <BookOpen size={16} />
                </div>
                <div className="ref-text">
                  <span className="ref-t">Aprender</span>
                  <span className="ref-d">LDPC paso a paso, con un ejemplo y comparativa de tasas.</span>
                </div>
              </button>
            </div>
          </div>
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
        <Brand onHome={() => navigate("/")} subtitle="LDPC: Aprender" />
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
  const code = getCode(codeId);

  const [activeTab, setActiveTab] = useState<TabKey>("pipeline");

  useEffect(() => {
    if (mode !== pageMode) setMode(pageMode);
  }, [pageMode, mode, setMode]);

  // Auto-advance to métricas once the pipeline completes (only if user hasn't moved).
  const [autoJumped, setAutoJumped] = useState(false);
  useEffect(() => {
    if (result && !autoJumped && activeTab === "pipeline") {
      setActiveTab("metrics");
      setAutoJumped(true);
    }
    if (!result) setAutoJumped(false);
  }, [result, autoJumped, activeTab]);

  // Keyboard 1–4 shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement)?.matches?.("input, textarea, select, [contenteditable='true']")) return;
      const idx = ["1", "2", "3", "4"].indexOf(e.key);
      if (idx >= 0) {
        setActiveTab(TABS[idx].key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const jumpTo = useCallback((tab: TabKey) => setActiveTab(tab), []);

  if (mode !== pageMode) return null;

  const stages = buildStages({ mode, file, result, running, code });

  const pillState: "idle" | "ready" | "running" | "done" | "warn" =
    running ? "running" :
    result ? (result.metrics.errorsUncorrected === 0 ? "done" : "warn") :
    file ? "ready" :
    "idle";
  const pillLabel =
    running ? "procesando…" :
    result ? (result.metrics.errorsUncorrected === 0 ? "pipeline ok" : "pipeline con residuales") :
    file ? "archivo listo" :
    "sin archivo";

  const inputSummary = file ? `${file.bytes.length.toLocaleString()} bytes` : "—";

  return (
    <div className="app min-h-screen">
      <Toast />
      <InspectorDrawer />

      <header className="topbar-v2">
        <div className="top-row row-1">
          <Brand onHome={() => navigate("/")} />
          <div className="top-actions">
            <StatusPill state={pillState} label={pillLabel} />
            <button
              type="button"
              onClick={() => navigate("/aprender", { state: { from: location.pathname } })}
              className="btn ghost btn-sm"
              aria-label="Abrir guía de aprendizaje"
            >
              <BookOpen size={14} />
              Aprender
            </button>
            <a href="https://github.com/jfaponte403/noisybits" target="_blank" rel="noopener noreferrer" className="btn ghost btn-sm">
              <Terminal size={14} />
              GitHub
            </a>
          </div>
        </div>
        <div className="top-row row-2">
          <ModeToggle />
          <BrandMeta
            mode={mode}
            codeLabel={`${code.label} · k=${code.k}→n=${code.n}`}
            bits={inputSummary}
            status={pillLabel}
          />
        </div>
      </header>

      <PipelineRail stages={stages} activeTab={activeTab} onJump={jumpTo} />

      <main className="workspace-v2">
        <aside className="control-rail">
          <section className="card control-card-v2">
            <div className="card-head">
              <div className="left">
                <span className="eyebrow">{mode === "encode" ? "Configuración" : "Recepción"}</span>
                <h2>Control del <span className="accent">pipeline</span></h2>
                <p className="muted">{code.label}. Tasa {code.rate.toFixed(3)} con bloques {code.k} → {code.n}.</p>
              </div>
            </div>
            <ControlsPanel />
          </section>
        </aside>

        <div className="stage-area">
          <div className="stage-tabs">
            <StageTabs active={activeTab} onSelect={setActiveTab} />

            {activeTab === "pipeline" && (
              <div className="stage-tabpanel" role="tabpanel" aria-label="Pipeline">
                <AlgorithmProcess />
                {mode === "decode" && <MessageRecovery />}
              </div>
            )}

            {activeTab === "matrix" && (
              <div className="stage-tabpanel" role="tabpanel" aria-label="Matriz en vivo">
                <AlgorithmTrace />
              </div>
            )}

            {activeTab === "bits" && (
              <div className="stage-tabpanel" role="tabpanel" aria-label="Bits">
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
                        emptyHint="Cargá un archivo y ejecutá la codificación."
                        onBitClick={result ? (i) => setInspect({ kind: "bit", mode: "encode", which: "original", index: i }) : undefined}
                      />
                    </FlowCard>
                    <FlowCard
                      eyebrow="paso 2 · salida"
                      title="Bits"
                      accent="codificados"
                      description="Datos sistemáticos más paridad listos para transportar."
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
              </div>
            )}

            {activeTab === "metrics" && (
              <div className="stage-tabpanel" role="tabpanel" aria-label="Métricas">
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
                <BERChart />
              </div>
            )}
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
      <Route path="/proceso-completo" element={<Navigate to="/proceso-completo/codificar" replace />} />
      <Route path="/proceso-completo/codificar" element={<FullProcessPage view="encode" />} />
      <Route path="/proceso-completo/decodificar" element={<FullProcessPage view="decode" />} />
      <Route path="/normativa" element={<NormativaPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
