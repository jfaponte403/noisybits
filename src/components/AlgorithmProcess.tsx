import { usePipelineStore } from "../store/pipelineStore";
import { getCode } from "../lib/encoders/index";

export function AlgorithmProcess() {
  const { codeId, result, mode } = usePipelineStore();
  const code = getCode(codeId);
  const steps = mode === "encode"
    ? [
        ["1", "Entrada", `${result?.original.length.toLocaleString()} bits`],
        ["2", "Bloques", `k=${code.k}`],
        ["3", "Paridad", `${code.n - code.k} bits/bloque`],
        ["4", "TXT final", `${result?.encoded.length.toLocaleString()} bits`],
      ]
    : [
        ["1", "TXT cargado", `${result?.encoded.length.toLocaleString()} bits`],
        ["2", "Canal", `BER ${result?.metrics.berPreDecode.toFixed(4)}`],
        ["3", "Síndrome", `${result?.metrics.errorsCorrected} correcciones`],
        ["4", "Salida", `${result?.decoded.length.toLocaleString()} bits`],
      ];

  return (
    <div className="algo">
      <span className="tag">Proceso LDPC</span>
      <h3>{code.label}</h3>

      <div className="process-rail" aria-label="Resumen del proceso">
        {steps.map(([index, title, detail]) => (
          <div className="process-step" key={index}>
            <span className="process-node">{index}</span>
            <span className="process-title">{title}</span>
            <span className="process-detail">{detail}</span>
          </div>
        ))}
      </div>
      
      <div className="mt-4 space-y-4 text-sm leading-relaxed">
        <p>
          La codificación usa una matriz generadora <strong>G</strong> sistemática: conserva los bits de datos y agrega paridad.
          La decodificación calcula el síndrome con <strong>H</strong>; si coincide con una columna, corrige ese bit y vuelve a verificar el bloque.
        </p>

        {result && (
          <div className={`alert ${result.metrics.errorsUncorrected === 0 ? 'ok' : 'warn'}`}>
            <span className="ic">!</span>
            <div>
              Tasa efectiva {(code.rate).toFixed(3)}.{" "}
              {mode === "encode"
                ? "La descarga final queda como texto binario agrupado."
                : `${result.metrics.errorsCorrected} bits corregidos y ${result.metrics.errorsUncorrected} chequeos residuales.`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
