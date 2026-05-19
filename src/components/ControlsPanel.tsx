import { usePipelineStore } from "../store/pipelineStore";
import { FileDropzone } from "./FileDropzone";
import { DecodedFilePreview, FilePreview } from "./FilePreview";
import { ALL_CODES, getCode } from "../lib/encoders/index";
import { Download, Play } from "lucide-react";
import { bitsToBytes, serializeEncodedFile, unpackBits } from "../lib/bitstream/BitArray";

export function ControlsPanel() {
  const { mode, codeId, setCodeId, run, running, file, result } = usePipelineStore();
  const code = getCode(codeId);
  const canRun = Boolean(file) && !running;

  const downloadFile = () => {
    if (!result || !file) return;

    if (mode === "encode") {
      const bits = unpackBits(result.encoded.bits, result.encoded.length);
      const text = serializeEncodedFile(bits, {
        name: file.name,
        type: file.type || "application/octet-stream",
        dataBits: file.bytes.length * 8,
      });
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      triggerDownload(blob, `encoded_${file.name}.txt`);
      return;
    }

    // decode: restore original media using embedded metadata when present
    const meta = result.sourceMeta;
    const allBits = unpackBits(result.decoded.bits, result.decoded.length);
    const usableBits = meta && meta.dataBits > 0 && meta.dataBits <= allBits.length
      ? allBits.slice(0, meta.dataBits)
      : allBits;
    const outName = meta?.name ?? `decoded_${file.name}`;
    const outType = meta?.type || file.type || "application/octet-stream";
    const blob = new Blob([bitsToBytes(usableBits).buffer as ArrayBuffer], { type: outType });
    triggerDownload(blob, outName);
  };

  const triggerDownload = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="controls">
      <div className="field">
        <span className="lbl">{mode === "encode" ? "Archivo Original" : "Archivo Codificado"}</span>
        <FileDropzone />
        {file && <FilePreview file={file} mode={mode === "encode" ? "encode" : "decode"} />}
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

      <div className="run-stack">
        <div className="run-summary">
          <span>{file ? "entrada lista" : "falta archivo"}</span>
          <strong>{mode === "encode" ? `${code.k} datos + ${code.n - code.k} paridad` : `${code.n} bits por bloque`}</strong>
        </div>
        <button
          className="btn primary btn-run"
          onClick={() => void run()}
          disabled={!canRun}
        >
          {running ? (
            <>
              <span className="btn-spinner" aria-hidden />
              Procesando…
            </>
          ) : (
            <>
              <Play size={16} />
              {mode === "encode" ? "Iniciar codificación" : "Iniciar decodificación"}
            </>
          )}
        </button>

        {result && (
          <button
            className="btn btn-run"
            onClick={downloadFile}
          >
            <Download size={16} />
            {mode === "encode" ? "Descargar codificado" : "Descargar reconstruido"}
          </button>
        )}

        {mode === "decode" && result && file && (
          <DecodedFilePreview result={result} fallbackName={file.name} />
        )}
      </div>
    </div>
  );
}
