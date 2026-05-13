import { usePipelineStore } from "../store/pipelineStore";
import { FileDropzone } from "./FileDropzone";
import { ALL_CODES, getCode } from "../lib/encoders/index";
import { Download, Play } from "lucide-react";
import { bitsToBytes, bitsToGroupedBinaryText, unpackBits } from "../lib/bitstream/BitArray";

export function ControlsPanel() {
  const { mode, codeId, setCodeId, run, running, file, channel, setChannel, result } = usePipelineStore();
  const code = getCode(codeId);
  const canRun = Boolean(file) && !running;

  const downloadFile = () => {
    if (!result) return;
    const target = mode === "encode" ? result.encoded : result.decoded;
    const bits = unpackBits(target.bits, target.length);
    const blob =
      mode === "encode"
        ? new Blob([bitsToGroupedBinaryText(bits)], { type: "text/plain;charset=utf-8" })
        : new Blob([bitsToBytes(bits).buffer as ArrayBuffer], { type: file?.type || "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = mode === "encode" ? `encoded_${file?.name || "file"}.txt` : `decoded_${file?.name || "file"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="controls">
      <div className="field">
        <span className="lbl">{mode === "encode" ? "Archivo Original" : "Archivo Codificado"}</span>
        <FileDropzone />
      </div>

      <div className="field">
        <span className="lbl">Algoritmo</span>
        <select className="input" value={codeId} onChange={(e) => setCodeId(e.target.value)}>
          {ALL_CODES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <span className="hint">
          {`Tasa ${(code.rate).toFixed(3)} · k=${code.k} → n=${code.n}. Salida codificada en .txt binario.`}
        </span>
      </div>

      {mode === "decode" && (
        <>
          <div className="field">
            <span className="lbl">Modelo de canal</span>
            <div className="segmented" role="group" aria-label="modelo de canal">
              <button
                type="button"
                className="segmented-btn"
                data-active={channel.mode === "bsc"}
                onClick={() => setChannel({ mode: "bsc" })}
              >
                BSC
              </button>
              <button
                type="button"
                className="segmented-btn"
                data-active={channel.mode === "pattern"}
                onClick={() => setChannel({ mode: "pattern" })}
              >
                Patrón
              </button>
            </div>
          </div>

          <div className="field">
            <span className="lbl">Probabilidad de error</span>
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="0" 
                max="0.5" 
                step="0.001" 
                className="pager flex-1"
                value={channel.bscProbability}
                disabled={channel.mode !== "bsc"}
                onChange={(e) => setChannel({ bscProbability: parseFloat(e.target.value) })}
                style={{ "--p": `${(channel.bscProbability / 0.5) * 100}%` } as React.CSSProperties}
              />
              <span className="mono text-tx-2 w-12 text-right">{channel.bscProbability.toFixed(3)}</span>
            </div>
          </div>

          <div className="field">
              <span className="lbl">Inyección de Patrón</span>
              <div className="grid grid-cols-[1fr_80px] gap-2">
                <input 
                    type="text" 
                    className="input mono" 
                    placeholder="1010..." 
                    value={channel.pattern}
                    disabled={channel.mode !== "pattern"}
                    onChange={(e) => setChannel({ pattern: e.target.value.replace(/[^01]/g, '') })}
                />
                <input 
                    type="number" 
                    className="input mono" 
                    placeholder="Pos" 
                    value={channel.patternPosition}
                    disabled={channel.mode !== "pattern"}
                    onChange={(e) => setChannel({ patternPosition: parseInt(e.target.value, 10) || 0 })}
                />
              </div>
          </div>
        </>
      )}

      <div className="pt-4 space-y-3">
        <div className="run-summary">
          <span>{file ? "entrada lista" : "falta archivo"}</span>
          <strong>{mode === "encode" ? `${code.k} datos + ${code.n - code.k} paridad` : `${code.n} bits por bloque`}</strong>
        </div>
        <button
          className="btn primary btn-run flex items-center justify-center gap-2"
          onClick={() => void run()}
          disabled={!canRun}
        >
          {running ? "Procesando…" : (
              <>
                <Play size={16} />
                {mode === "encode" ? "Iniciar Codificación" : "Iniciar Decodificación"}
              </>
          )}
        </button>

        {result && (
          <button
            className="btn btn-run flex items-center justify-center gap-2"
            onClick={downloadFile}
          >
            <Download size={16} />
            {mode === "encode" ? "Descargar Codificado" : "Descargar Reconstruido"}
          </button>
        )}
      </div>
    </div>
  );
}
