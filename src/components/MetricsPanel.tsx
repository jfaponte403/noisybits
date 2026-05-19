import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { usePipelineStore } from "../store/pipelineStore";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // clipboard blocked — ignore
    }
  };
  return (
    <button
      type="button"
      className={"hash-copy" + (copied ? " is-copied" : "")}
      onClick={onCopy}
      aria-label={`Copiar ${label}`}
      title={`Copiar ${label}`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "copiado" : "copiar"}
    </button>
  );
}

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
  const hashLabel = mode === "encode" ? "archivo original" : "archivo reconstruido";
  const hashValue = mode === "encode" ? metrics.originalHash : metrics.decodedHash;

  return (
    <div className="metrics-stack">
      <div className="evidence" role="table" aria-label="Métricas del pipeline">
        {mode === "decode" && (
          <>
            <div className="evidence-row" data-status={clean ? "ok" : "err"} role="row">
              <span className="evidence-key" role="rowheader">bits corregidos</span>
              <div className="evidence-val">
                <span className={"v " + (clean ? "ok" : "err")}>{metrics.errorsCorrected.toLocaleString()}</span>
                <span className="d">
                  {clean
                    ? "todas las ecuaciones de paridad quedaron satisfechas"
                    : `${metrics.errorsUncorrected.toLocaleString()} chequeos sin resolver`}
                </span>
              </div>
            </div>
            <div className="evidence-row" data-status={clean ? "ok" : "warn"} role="row">
              <span className="evidence-key" role="rowheader">síndrome final</span>
              <div className="evidence-val">
                <span className={"v " + (clean ? "ok" : "warn")}>{clean ? "limpio" : "residual"}</span>
                <span className="d">
                  {clean ? "H · c = 0 en todos los bloques" : "algún bloque superó la capacidad de corrección"}
                </span>
              </div>
            </div>
          </>
        )}
        {mode === "encode" && (
          <div className="evidence-row" role="row">
            <span className="evidence-key" role="rowheader">tasa del código</span>
            <div className="evidence-val">
              <span className="v">{result.encoded.length > 0 ? (result.original.length / result.encoded.length).toFixed(3) : "—"}</span>
              <span className="d">información / bits transmitidos</span>
            </div>
          </div>
        )}
        <div className="evidence-row" role="row">
          <span className="evidence-key" role="rowheader">tiempo de ejecución</span>
          <div className="evidence-val">
            <span className="v">{metrics.elapsedMs.toFixed(0)} ms</span>
            <span className="d">cálculo en Web Workers</span>
          </div>
        </div>
        <div className="evidence-row" role="row">
          <span className="evidence-key" role="rowheader">bits totales</span>
          <div className="evidence-val">
            <span className="v">
              {mode === "encode"
                ? `${result.original.length.toLocaleString()} → ${result.encoded.length.toLocaleString()}`
                : `${result.received.length.toLocaleString()} → ${result.decoded.length.toLocaleString()}`}
            </span>
            <span className="d">{mode === "encode" ? "información → codificado" : "recibido → datos"}</span>
          </div>
        </div>
      </div>

      <div className="hash-row">
        <span className="hash-key">hash SHA-256 · {hashLabel}</span>
        <span className="hash-val" title={hashValue}>{hashValue}</span>
        <CopyButton value={hashValue} label="hash" />
      </div>

      {mode === "encode" && (
        <p className="muted metrics-note">
          La codificación es reversible: este hash debe reaparecer al decodificar la salida. Guardá el <code className="inl">.txt</code> y subilo en el modo Decodificar para comprobarlo de extremo a extremo.
        </p>
      )}
      {mode === "decode" && (
        <div className={`alert ${clean ? "ok" : "warn"}`}>
          <span className="ic">{clean ? "✓" : "!"}</span>
          <div>
            {clean
              ? "El decoder convergió en todos los bloques. Si este archivo se generó codificando un original con este mismo código, el reconstruido es idéntico bit a bit; compará los hashes."
              : "Algún bloque no pudo corregirse del todo. El reconstruido puede contener errores: el archivo subido tiene más bits alterados de los que este código tolera. Probá un código de menor tasa."}
          </div>
        </div>
      )}
    </div>
  );
}
