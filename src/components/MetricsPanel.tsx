import { usePipelineStore } from "../store/pipelineStore";

export function MetricsPanel() {
  const { result, mode } = usePipelineStore();

  if (!result) {
    return (
      <div className="text-center py-12 text-tx-3 mono">
        Sin métricas disponibles. Ejecuta el pipeline para ver los resultados.
      </div>
    );
  }

  const { metrics } = result;

  return (
    <div className="space-y-6">
      <div className="metric-grid">
        {mode === "decode" && (
            <>
                <div className={`metric ${metrics.berPreDecode > 0 ? 'err' : 'ok'}`}>
                <span className="k">BER Canal</span>
                <div className="v">{metrics.berPreDecode.toFixed(4)}</div>
                <div className="d">Errores detectados en la señal</div>
                </div>
                <div className={`metric ${metrics.errorsUncorrected === 0 ? 'ok' : 'err'}`}>
                <span className="k">Corrección</span>
                <div className="v">{metrics.errorsCorrected}</div>
                <div className="d">{metrics.errorsUncorrected} chequeos residuales</div>
                </div>
            </>
        )}
        <div className="metric">
          <span className="k">Tiempo de Ejecución</span>
          <div className="v">{metrics.elapsedMs.toFixed(0)} ms</div>
          <div className="d">Procesamiento en Web Workers</div>
        </div>
      </div>

      <div className="space-y-2">
        <span className="sec-label">Hash de Integridad</span>
        {mode === "encode" && (
            <div className="hash">
                <span className="k">Original (SHA-256):</span>
                <span className="v">{metrics.originalHash}</span>
            </div>
        )}
        <div className="hash">
          <span className="k">{mode === "encode" ? "Codificado" : "Reconstruido"}:</span>
          <span className="v">{metrics.decodedHash}</span>
        </div>
        
        {mode === "decode" && metrics.originalHash !== "N/A" && (
            <div className={`alert ${metrics.integrity ? 'ok' : 'err'}`}>
            <span className="ic">{metrics.integrity ? '✓' : '×'}</span>
            <div>
                {metrics.integrity 
                ? 'El archivo reconstruido es idéntico al original.' 
                : 'Se detectaron discrepancias en la integridad.'}
            </div>
            </div>
        )}
      </div>
    </div>
  );
}
