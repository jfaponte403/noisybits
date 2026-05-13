import { usePipelineStore } from "./store/pipelineStore";
import { ControlsPanel } from "./components/ControlsPanel";
import { BitGrid, Legend } from "./components/BitStreamViewer";
import { Toast } from "./components/Toast";
import { unpackBits } from "./lib/bitstream/BitArray";
import { MetricsPanel } from "./components/MetricsPanel";
import { AlgorithmProcess } from "./components/AlgorithmProcess";
import { BERChart } from "./components/BERChart";
import { ModePicker } from "./components/ModePicker";
import { ArrowLeft, Terminal } from "lucide-react";

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
        sin backend · ningún archivo sale del navegador · algoritmos LDPC 100% locales
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

export default function App() {
  const { mode, result, setMode } = usePipelineStore();

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
        <main className="flex flex-col items-center justify-center flex-1 gap-8 py-12">
            <div className="text-center space-y-2">
                <span className="eyebrow">Bienvenido</span>
                <h2 className="text-3xl font-bold text-tx-1">Potenciando la <span className="accent">Integridad</span> de Datos</h2>
                <p className="text-tx-3 max-w-md mx-auto">Explora el funcionamiento de los códigos LDPC (Low-Density Parity-Check) paso a paso.</p>
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
        <div className="flex gap-4">
          <button onClick={() => setMode(null)} className="btn ghost btn-sm flex items-center gap-2">
            <ArrowLeft size={14} />
            Cambiar Proceso
          </button>
          <a href="https://github.com/jfaponte403/noisybits" target="_blank" rel="noopener noreferrer" className="btn ghost btn-sm flex items-center gap-2">
            <Terminal size={16} />
            GitHub
          </a>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 flex-1">
        <aside className="space-y-6">
          <section className="card">
            <div className="card-head">
              <div className="left">
                <span className="eyebrow">{mode === "encode" ? "Configuración" : "Recepción"}</span>
                <h2>Panel de <span className="accent">Control</span></h2>
              </div>
            </div>
            <ControlsPanel />
          </section>

          {result && <AlgorithmProcess />}
        </aside>

        <div className="space-y-8">
          {mode === "encode" ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <section className="card">
                <div className="card-head">
                    <div className="left">
                    <span className="eyebrow">Etapa 1</span>
                    <h2>Bits <span className="accent">Originales</span></h2>
                    </div>
                    <Legend />
                </div>
                <BitGrid 
                    bits={result ? unpackBits(result.original.bits, result.original.length) : null} 
                    metadata={result?.original.metadata}
                    emptyHint="Carga un archivo y ejecuta la codificación." 
                />
                </section>

                <section className="card">
                <div className="card-head">
                    <div className="left">
                    <span className="eyebrow">Etapa 2</span>
                    <h2>Bits <span className="accent">Codificados</span></h2>
                    </div>
                </div>
                <BitGrid 
                    bits={result ? unpackBits(result.encoded.bits, result.encoded.length) : null} 
                    metadata={result?.encoded.metadata}
                    emptyHint="La redundancia se visualizará aquí tras procesar." 
                />
                </section>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <section className="card">
                <div className="card-head">
                    <div className="left">
                    <span className="eyebrow">Etapa 1</span>
                    <h2>Bits <span className="accent">Recibidos</span></h2>
                    </div>
                    <Legend />
                </div>
                <BitGrid 
                    bits={result ? unpackBits(result.received.bits, result.received.length) : null} 
                    metadata={result?.received.metadata}
                    emptyHint="La señal con ruido aparecerá aquí tras procesar." 
                />
                </section>

                <section className="card">
                <div className="card-head">
                    <div className="left">
                    <span className="eyebrow">Etapa 2</span>
                    <h2>Bits <span className="accent">Decodificados</span></h2>
                    </div>
                </div>
                <BitGrid 
                    bits={result ? unpackBits(result.decoded.bits, result.decoded.length) : null} 
                    metadata={result?.decoded.metadata}
                    emptyHint="Resultado de la corrección de errores." 
                />
                </section>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8">
            <BERChart />
            <section className="card">
              <div className="card-head">
                <div className="left">
                  <span className="eyebrow">Análisis</span>
                  <h2>Métricas e <span className="accent">Integridad</span></h2>
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
