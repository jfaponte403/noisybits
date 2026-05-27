import { useNavigate } from "react-router-dom";
import { ArrowLeft, RadioTower, Activity, BookOpen, Terminal } from "lucide-react";

function Brand({ onHome }: { onHome: () => void }) {
  return (
    <button type="button" className="brand brand-link" onClick={onHome} aria-label="Volver al inicio">
      <div className="logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="#1c1208" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12c2.5 0 2.5-7 5-7s2.5 14 5 14 2.5-7 5-7h3" />
        </svg>
      </div>
      <div>
        <h1>Channel Coding Visualizer</h1>
        <div className="sub">Normativa · marco regulatorio</div>
      </div>
    </button>
  );
}

export function NormativaPage() {
  const navigate = useNavigate();

  return (
    <div className="app min-h-screen">
      <header className="topbar">
        <Brand onHome={() => navigate("/")} />
        <div className="top-actions">
          <button type="button" className="btn ghost btn-sm" onClick={() => navigate("/")}>
            <ArrowLeft size={14} /> Inicio
          </button>
        </div>
      </header>

      <main className="norm-shell">
        <div className="norm-intro">
          <span className="eyebrow is-accent">normativa</span>
          <h2>Qué dice la regulación sobre <span className="accent">codificación, modulación y corrección de errores</span>.</h2>
          <p>
            Este laboratorio simula codificación de canal (LDPC), modulación y corrección de errores.
            Acá relacionamos esos conceptos con dos marcos reales: la radio <strong>AM en Argentina</strong> y
            el <strong>5G</strong> (caso Hanoi, Vietnam).
          </p>
          <div className="norm-disclaimer">
            <BookOpen size={15} />
            <p>
              Contenido <strong>educativo</strong>, no asesoramiento legal. Los números de resolución y las
              asignaciones de espectro cambian: verificá siempre las fuentes oficiales (ENACOM, ITU, 3GPP,
              y el regulador nacional correspondiente).
            </p>
          </div>
        </div>

        {/* ---------------- Argentina · Radio AM ---------------- */}
        <section className="card norm-card" data-kind="am">
          <div className="norm-card-head">
            <div className="norm-ic"><RadioTower size={20} /></div>
            <div>
              <span className="eyebrow">Argentina</span>
              <h3>Radio <span className="accent">AM</span> (ondas medias)</h3>
            </div>
          </div>

          <div className="norm-body">
            <p className="norm-key">
              ⚠️ Punto clave: la radio AM clásica es <strong>analógica</strong>. <em>No</em> usa codificación de
              canal (LDPC), ni FEC, ni modulación digital. Lo que construimos en este laboratorio pertenece a
              sistemas <strong>digitales</strong> — en AM tradicional no hay corrección de errores.
            </p>

            <dl className="norm-dl">
              <div><dt>Regulador</dt><dd>ENACOM (Ente Nacional de Comunicaciones).</dd></div>
              <div><dt>Marco legal</dt><dd>Ley 26.522 (Servicios de Comunicación Audiovisual) y Ley 27.078 (Argentina Digital), más las normas técnicas de ENACOM / ex-CNC.</dd></div>
              <div><dt>Banda</dt><dd>Ondas medias (MW), 526,5 – 1606,5 kHz, con separación de canal de 10 kHz.</dd></div>
              <div><dt>Modulación</dt><dd>Amplitud (AM de doble banda lateral, designación de emisión A3E). Es analógica.</dd></div>
              <div><dt>Robustez ante ruido</dt><dd>No hay corrección de errores: depende de la potencia, el ancho de banda y la relación señal/ruido. El ruido se escucha directamente.</dd></div>
            </dl>

            <p className="norm-note">
              <strong>¿Dónde aparecería el LDPC entonces?</strong> Solo en <strong>radio digital</strong>.
              Estándares como DRM (Digital Radio Mondiale), pensados para la banda de AM, sí usan modulación
              COFDM + codificación de canal (FEC). En Argentina la radio digital no está plenamente
              implementada/obligatoria, así que el broadcast de AM sigue siendo analógico.
            </p>
          </div>
        </section>

        {/* ---------------- 5G · Hanoi (Vietnam) ---------------- */}
        <section className="card norm-card" data-kind="g5">
          <div className="norm-card-head">
            <div className="norm-ic"><Activity size={20} /></div>
            <div>
              <span className="eyebrow">Hanoi · Vietnam</span>
              <h3>Telefonía <span className="accent">5G</span> (5G NR)</h3>
            </div>
          </div>

          <div className="norm-body">
            <p className="norm-key">
              ✅ Acá sí aplica todo lo que hicimos: el 5G usa <strong>LDPC</strong> para los datos y
              modulaciones <strong>QPSK / 16-QAM / 64-QAM / 256-QAM</strong> — exactamente el pipeline del
              laboratorio (codificación de canal + modulación + canal con ruido + corrección).
            </p>

            <dl className="norm-dl">
              <div><dt>Estándar</dt><dd>3GPP 5G NR (New Radio), desde el Release 15. El espectro lo coordina la ITU a nivel global.</dd></div>
              <div><dt>Regulador (Vietnam)</dt><dd>Ministerio de Información y Comunicaciones (MIC) y la Autoridad de Gestión de Frecuencias de Radio. Aplica el estándar 3GPP en Hanoi y todo el país.</dd></div>
              <div><dt>Codificación de canal</dt><dd><strong>LDPC</strong> para los canales de datos (PDSCH/PUSCH, eMBB) y <strong>códigos polares</strong> para los canales de control.</dd></div>
              <div><dt>Modulación</dt><dd>QPSK, 16-QAM, 64-QAM y 256-QAM (más π/2-BPSK en uplink). Adaptativa según la calidad del canal.</dd></div>
              <div><dt>Multiplexación</dt><dd>OFDM con prefijo cíclico (CP-OFDM); DFT-s-OFDM opcional en el enlace ascendente.</dd></div>
              <div><dt>Bandas típicas</dt><dd>FR1 (sub-6 GHz: p. ej. 700 MHz, 2,6 GHz, 3,5 GHz) y FR2 (ondas milimétricas, 26/28 GHz). Vietnam ha licitado bandas como 2,6 GHz y 3,5 GHz para 5G.</dd></div>
            </dl>

            <p className="norm-note">
              <strong>Conexión directa:</strong> la cadena que armaste — bits → LDPC → modulación QAM →
              canal con ruido → demodulación → decodificación LDPC — es esencialmente la capa física de
              datos de 5G NR. Cambiar la tasa LDPC y el orden de modulación es lo que hace el 5G en tiempo
              real (adaptación de enlace) según el ruido del canal.
            </p>
          </div>
        </section>

        <div className="norm-sources">
          <span className="eyebrow">fuentes para verificar</span>
          <ul>
            <li><Terminal size={12} /> ENACOM — normas del servicio de radiodifusión sonora (Argentina).</li>
            <li><Terminal size={12} /> ITU-R — atribución internacional de frecuencias y recomendaciones.</li>
            <li><Terminal size={12} /> 3GPP TS 38.211 / 38.212 — capa física y codificación de canal de 5G NR.</li>
            <li><Terminal size={12} /> MIC Vietnam — asignación de espectro y despliegue 5G.</li>
          </ul>
        </div>
      </main>

      <footer className="foot mt-auto">
        <div className="foot-row">contenido educativo · verificá las fuentes oficiales · 100% local</div>
        <div className="foot-row">
          <span>© {new Date().getFullYear()} noisybits</span>
        </div>
      </footer>
    </div>
  );
}
