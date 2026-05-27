import { usePipelineStore } from "../store/pipelineStore";
import { FileDropzone } from "./FileDropzone";
import { DecodedFilePreview, FilePreview } from "./FilePreview";
import { ALL_CODES, getCode } from "../lib/encoders/index";
import { Download, FileText, Play, Shuffle } from "lucide-react";
import {
  bitsToBytes,
  bitsToGroupedBinaryText,
  serializeEncodedFile,
  unpackBits,
  type Bit,
} from "../lib/bitstream/BitArray";

/**
 * Voltea hasta `count` bits al azar, a lo sumo uno por bloque de `n` bits, para
 * que el decoder (que corrige ~1 error por bloque) pueda repararlos todos.
 */
function injectErrorsIntoBits(bits: Bit[], n: number, count: number): Bit[] {
  const out = bits.slice();
  const target = Math.max(0, Math.floor(count));
  const blocks = Math.floor(out.length / n);
  if (target === 0 || blocks === 0) return out;
  const order = Array.from({ length: blocks }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (let i = 0; i < Math.min(target, blocks); i++) {
    const pos = order[i] * n + Math.floor(Math.random() * n);
    out[pos] = (out[pos] ^ 1) as Bit;
  }
  return out;
}

export function ControlsPanel() {
  const { mode, codeId, setCodeId, run, running, file, result, injectErrors, setInjectErrors } =
    usePipelineStore();
  const code = getCode(codeId);
  const canRun = Boolean(file) && !running;

  // Bloques disponibles para inyectar errores (cota práctica: 1 error por bloque).
  const availableBlocks = result
    ? Math.floor((mode === "encode" ? result.encoded.length : result.received.length) / code.n)
    : file && mode === "encode"
      ? Math.ceil((file.bytes.length * 8) / code.k)
      : 0;

  // Bits de datos recuperados, recortados al tamaño original si hay cabecera.
  const recoveredDataBits = () => {
    if (!result) return [];
    const meta = result.sourceMeta;
    const allBits = unpackBits(result.decoded.bits, result.decoded.length);
    return meta && meta.dataBits > 0 && meta.dataBits <= allBits.length
      ? allBits.slice(0, meta.dataBits)
      : allBits;
  };

  // ENCODE: descarga la palabra código como .txt, agrupada por n (longitud de
  // bloque) para que cada grupo sea exactamente una palabra código LDPC.
  const downloadEncoded = () => {
    if (!result || !file) return;
    const clean = unpackBits(result.encoded.bits, result.encoded.length);
    // Opcionalmente inyectamos errores aleatorios para que, al decodificar este
    // .txt, se vea cómo LDPC los detecta y corrige.
    const bits = injectErrors > 0 ? injectErrorsIntoBits(clean, code.n, injectErrors) : clean;
    const text = serializeEncodedFile(
      bits,
      {
        name: file.name,
        type: file.type || "application/octet-stream",
        dataBits: file.bytes.length * 8,
      },
      code.n,
    );
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const suffix = injectErrors > 0 ? `_con-${injectErrors}-errores` : "";
    triggerDownload(blob, `encoded_${file.name}${suffix}.txt`);
  };

  // DECODE · opción 1: bits recuperados como .txt, agrupados por k (los datos
  // sistemáticos de cada bloque), para que la agrupación coincida con la tasa.
  const downloadDecodedTxt = () => {
    if (!result || !file) return;
    const text = bitsToGroupedBinaryText(recoveredDataBits(), code.k) + "\n";
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const base = result.sourceMeta?.name ?? file.name;
    triggerDownload(blob, `decoded_${base}.txt`);
  };

  // DECODE · opción 2: restaura el media original con su tipo/nombre embebidos.
  const restoreMedia = () => {
    if (!result || !file) return;
    const meta = result.sourceMeta;
    const outName = meta?.name ?? `decoded_${file.name}`;
    const outType = meta?.type || file.type || "application/octet-stream";
    const blob = new Blob([bitsToBytes(recoveredDataBits()).buffer as ArrayBuffer], { type: outType });
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

      <div className="field">
        <span className="lbl">
          <Shuffle size={13} /> Errores aleatorios a inyectar
        </span>
        <div className="inject-row">
          <input
            type="number"
            className="input"
            min={0}
            step={1}
            value={injectErrors}
            onChange={(e) => setInjectErrors(Number(e.target.value))}
            placeholder="0"
          />
          <button type="button" className="btn ghost btn-sm" onClick={() => setInjectErrors(0)}>
            Limpiar
          </button>
        </div>
        <span className="hint">
          {mode === "encode"
            ? injectErrors > 0
              ? `Al descargar, se voltean ${injectErrors.toLocaleString()} bit${injectErrors === 1 ? "" : "s"} al azar (máx. 1 por bloque). Decodificá ese .txt para ver cómo LDPC los corrige.`
              : "Escribí cuántos bits querés voltear al descargar para luego probar la recuperación."
            : injectErrors > 0
              ? `Antes de decodificar se voltean ${injectErrors.toLocaleString()} bit${injectErrors === 1 ? "" : "s"} al azar (máx. 1 por bloque) para ver al decoder repararlos.`
              : "Escribí cuántos bits querés voltear antes de decodificar para ver la corrección."}
          {availableBlocks > 0 && (
            <>
              {" "}Hay <strong>{availableBlocks.toLocaleString()}</strong> bloques disponibles
              {injectErrors > availableBlocks && ` (se inyectarán como máximo ${availableBlocks.toLocaleString()})`}.
            </>
          )}
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

        {result && mode === "encode" && (
          <button className="btn btn-run" onClick={downloadEncoded}>
            <Download size={16} />
            Descargar codificado
          </button>
        )}

        {result && mode === "decode" && (
          <>
            <button className="btn btn-run" onClick={downloadDecodedTxt}>
              <FileText size={16} />
              Descargar bits (.txt)
            </button>
            <button className="btn btn-run" onClick={restoreMedia}>
              <Download size={16} />
              Restaurar media original
            </button>
            <span className="hint">
              {`.txt: bits recuperados agrupados de a ${code.k} (un bloque de datos por grupo). Restaurar media: reconstruye ${result.sourceMeta?.name ?? "el archivo"} con su tipo original.`}
            </span>
          </>
        )}

        {mode === "decode" && result && file && (
          <DecodedFilePreview result={result} fallbackName={file.name} />
        )}
      </div>
    </div>
  );
}
