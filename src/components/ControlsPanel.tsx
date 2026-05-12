import { usePipelineStore } from "../store/pipelineStore";
import { FileDropzone } from "./FileDropzone";
import { CODES } from "../lib/encoders/Hamming";

export function ControlsPanel() {
  const { codeId, setCodeId, run, running, file } = usePipelineStore();
  const code = CODES.find((c) => c.id === codeId)!;

  return (
    <div className="controls">
      <div className="field">
        <span className="lbl">archivo</span>
        <FileDropzone />
      </div>

      <div className="field">
        <span className="lbl">código de canal</span>
        <select className="input" value={codeId} onChange={(e) => setCodeId(e.target.value)}>
          {CODES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label} · tasa {fmtRate(c.k, c.n)}
            </option>
          ))}
        </select>
        <span className="hint">
          k = {code.k} bits de dato → n = {code.n} bits ·{" "}
          {code.extended ? "corrige 1, detecta 2" : "corrige 1 error por bloque"}
        </span>
      </div>

      <button className="btn primary btn-run" onClick={() => void run()} disabled={!file || running}>
        {running ? "Procesando…" : "Ejecutar pipeline"}
      </button>
    </div>
  );
}

function fmtRate(k: number, n: number) {
  const g = gcd(k, n) || 1;
  return `${k / g}/${n / g}`;
}
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
