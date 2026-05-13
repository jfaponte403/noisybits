import { usePipelineStore } from "../store/pipelineStore";

export function MetricsPanel() {
  const { result, mode } = usePipelineStore();

  if (!result) {
    return (
      <div className="empty-panel">
        <span className="sec-label">sin ejecución</span>
        <p>Las métricas aparecen cuando termina el pipeline: tiempo, BER del canal, bits corregidos y hash de salida.</p>
      </div>
    );
  }

  const { metrics } = result;
  const clean = metrics.errorsUncorrected === 0;

  return (
    <div className="space-y-6">
      <div className="metric-grid">
        {mode === "decode" && (
          <>
            <div className={`metric ${metrics.berPreDecode > 0 ? "err" : "ok"}`}>
              <span className="k">BER del canal</span>
              <div className="v">{metrics.berPreDecode.toFixed(4)}</div>
              <div className="d">fracción de bits invertidos al recibir</div>
            </div>
            <div className={`metric ${clean ? "ok" : "err"}`}>
              <span className="k">bits corregidos</span>
              <div className="v">{metrics.errorsCorrected.toLocaleString()}</div>
              <div className="d">{clean ? "todas las ecuaciones de paridad quedaron satisfechas" : `${metrics.errorsUncorrected.toLocaleString()} chequeos sin resolver`}</div>
            </div>
            <div className={`metric ${clean ? "ok" : "err"}`}>
              <span className="k">síndrome final</span>
              <div className="v">{clean ? "limpio" : "residual"}</div>
              <div className="d">{clean ? "H · c = 0 en todos los bloques" : "algún bloque superó la capacidad de corrección"}</div>
            </div>
          </>
        )}
        {mode === "encode" && (
          <div className="metric">
            <span className="k">tasa del código</span>
            <div className="v">{result.encoded.length > 0 ? (result.original.length / result.encoded.length).toFixed(3) : "—"}</div>
            <div className="d">información / bits transmitidos</div>
          </div>
        )}
        <div className="metric">
          <span className="k">tiempo de ejecución</span>
          <div className="v">{metrics.elapsedMs.toFixed(0)} ms</div>
          <div className="d">cálculo en Web Workers</div>
        </div>
      </div>

      <div className="space-y-2">
        <span className="sec-label">hash de integridad (SHA-256)</span>
        <div className="hash">
          <span className="k">{mode === "encode" ? "archivo original:" : "archivo reconstruido:"}</span>
          <span className="v">{mode === "encode" ? metrics.originalHash : metrics.decodedHash}</span>
        </div>
        {mode === "encode" && (
          <p className="muted" style={{ fontSize: 12 }}>
            La codificación es reversible: este hash debe reaparecer al decodificar la salida. Guardá el <code className="inl">.txt</code> y subilo en el modo Decodificar para comprobarlo de extremo a extremo.
          </p>
        )}
        {mode === "decode" && (
          <div className={`alert ${clean ? "ok" : "warn"}`}>
            <span className="ic">{clean ? "✓" : "!"}</span>
            <div>
              {clean
                ? "El decoder convergió en todos los bloques. Si este archivo se generó codificando un original con este mismo código, el reconstruido es idéntico bit a bit; compará los hashes."
                : "Algún bloque no pudo corregirse del todo. El reconstruido puede contener errores: bajá la probabilidad de error del canal o usá un código de menor tasa."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
