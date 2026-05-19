import { usePipelineStore } from "../store/pipelineStore";
import { getCode } from "../lib/encoders/index";
import { CheckCircle2, CircleDot, Loader2 } from "lucide-react";
import { DecodedFilePreview, FilePreview } from "./FilePreview";
import { mediaKind } from "../lib/media/mediaKind";

interface ProcessStep {
  title: string;
  action: string;
  result: string;
  evidence: string;
  meta: string;
}

export function AlgorithmProcess() {
  const { codeId, result, mode, file, running, setInspect } = usePipelineStore();
  const code = getCode(codeId);
  const originalBits = result?.original.length ?? 0;
  const encodedBits = result?.encoded.length ?? 0;
  const receivedBits = result?.received.length ?? 0;
  const decodedBits = result?.decoded.length ?? 0;
  const blockCount = Math.ceil(originalBits / code.k);
  const encodedBlockCount = Math.ceil(encodedBits / code.n);
  const parityBitsPerBlock = code.n - code.k;
  const totalParityBits = Math.max(0, encodedBits - originalBits);
  const fmt = (value: number) => value.toLocaleString();

  const steps: ProcessStep[] = mode === "encode"
    ? [
        {
          title: "Entrada",
          action: "Se leyó el archivo cargado y se transformó cada byte en bits.",
          result: `Quedaron ${fmt(originalBits)} bits de información original.`,
          evidence: "Todos los bits se marcaron como datos antes de agregar redundancia.",
          meta: "bytes -> bits",
        },
        {
          title: "Bloqueo",
          action: `Se dividió la secuencia en bloques de ${code.k} bits.`,
          result: `Se prepararon ${fmt(blockCount)} bloques para la matriz generadora.`,
          evidence: "Si el último bloque no cerró exacto, se completó con ceros de relleno.",
          meta: `k=${code.k}`,
        },
        {
          title: "Paridad",
          action: "Se aplicó la matriz generadora G sobre cada bloque.",
          result: `Se agregaron ${parityBitsPerBlock} bits de paridad por bloque.`,
          evidence: `La salida acumuló ${fmt(totalParityBits)} bits redundantes en total.`,
          meta: `n=${code.n}`,
        },
        {
          title: "Salida codificada",
          action: "Se unieron los bloques codificados y se empaquetaron como texto binario.",
          result: `La salida final contiene ${fmt(encodedBits)} bits.`,
          evidence: `La tasa efectiva del código es ${code.rate.toFixed(3)}.`,
          meta: "TXT final",
        },
      ]
    : [
        {
          title: "Entrada codificada",
          action: "Se leyó el texto binario subido y se reconstruyó la secuencia tal cual llegó.",
          result: `Se alinearon ${fmt(encodedBits)} bits en bloques LDPC.`,
          evidence: `La entrada produjo ${fmt(encodedBlockCount)} bloques de ${code.n} bits.`,
          meta: "TXT -> bits",
        },
        {
          title: "Síndrome",
          action: "Se calculó s = H · r para cada bloque recibido.",
          result: `Se detectaron ${fmt(receivedBits)} bits en total a evaluar.`,
          evidence: `Si s = 0 en todos los bloques, no hace falta corregir nada.`,
          meta: "H · r",
        },
        {
          title: "Corrección",
          action: "Por bloque, se invierten los bits señalados por las ecuaciones de paridad.",
          result: `Se corrigieron ${fmt(result?.metrics.errorsCorrected ?? 0)} bits detectados.`,
          evidence: `Quedaron ${fmt(result?.metrics.errorsUncorrected ?? 0)} chequeos residuales sin resolver.`,
          meta: "bit-flipping",
        },
        {
          title: "Salida decodificada",
          action: "Se extrajeron los datos sistemáticos y se reconstruyó el archivo original.",
          result: `La salida contiene ${fmt(decodedBits)} bits decodificados.`,
          evidence: `Hash de salida ${result?.metrics.decodedHash.slice(0, 12)}...`,
          meta: "datos",
        },
      ];
  const isReady = Boolean(file);
  const phaseLabel = running ? "en ejecución" : result ? "etapas completadas" : isReady ? "listo para ejecutar" : "pendiente de archivo";

  return (
    <section className="card algo">
      <div className="process-kicker">
        <span className="tag">paso a paso</span>
        <span className="process-count">{phaseLabel}</span>
      </div>
      <h3>{mode === "encode" ? "Codificación" : "Decodificación"} · {code.label}</h3>
      {!result && (
        <p>
          {isReady
            ? "El archivo está cargado. Ejecutá el pipeline para comparar cada etapa con datos reales."
            : "Cargá un archivo para activar el recorrido. El panel mantiene visible qué hará cada etapa antes de procesar."}
        </p>
      )}

      <div className="process-stepper" aria-label={`Stepper de ${mode === "encode" ? "codificación" : "decodificación"}`}>
        {steps.map((step, index) => {
          const state = result ? "done" : running && index === 1 ? "active" : index === 0 && isReady ? "active" : "upcoming";
          const open = () => mode && setInspect({ kind: "stage", mode, index });
          return (
          <div
            className="process-step"
            key={step.title}
            data-state={state}
            role="button"
            tabIndex={0}
            onClick={open}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                open();
              }
            }}
            aria-label={`Explicar etapa: ${step.title}`}
          >
            <div className="process-node" aria-hidden="true">
              <span>{index + 1}</span>
              {state === "done" && <CheckCircle2 size={13} />}
              {state === "active" && (running ? <Loader2 size={13} /> : <CircleDot size={13} />)}
            </div>
            <div className="process-copy">
              <div className="process-head">
                <span className="process-title">{step.title}</span>
                <span className="process-meta">{step.meta}</span>
              </div>
              <dl className="process-facts">
                <div>
                  <dt>Qué se hizo</dt>
                  <dd>{step.action}</dd>
                </div>
                <div>
                  <dt>Resultado</dt>
                  <dd>{result ? step.result : "Se calculará al ejecutar el pipeline."}</dd>
                </div>
                <div>
                  <dt>Evidencia</dt>
                  <dd>{result ? step.evidence : "Pendiente de datos reales."}</dd>
                </div>
              </dl>
            </div>
          </div>
        );
        })}
        <MediaVisualizationStep
          stepNumber={steps.length + 1}
          mode={mode}
          file={file}
          result={result}
        />
      </div>
      
      <div className="algo-foot">
        <p className="algo-foot-prose">
          La codificación usa una matriz generadora <strong>G</strong> sistemática: conserva los bits de datos y agrega paridad.
          La decodificación calcula el síndrome con <strong>H</strong>; si coincide con una columna, corrige ese bit y vuelve a verificar el bloque.
        </p>
      </div>
    </section>
  );
}

interface MediaVisualizationStepProps {
  stepNumber: number;
  mode: "encode" | "decode" | null;
  file: { name: string; type: string; bytes: Uint8Array } | null;
  result: ReturnType<typeof usePipelineStore.getState>["result"];
}

function MediaVisualizationStep({ stepNumber, mode, file, result }: MediaVisualizationStepProps) {
  const ready = Boolean(file) && Boolean(result);
  const state: "done" | "active" | "upcoming" = ready ? "done" : file ? "active" : "upcoming";
  const kind = file ? mediaKind(file.type, file.name) : "binary";
  const showsReconstructed = mode === "decode" && Boolean(result);
  const previewKind = showsReconstructed && result?.sourceMeta
    ? mediaKind(result.sourceMeta.type, result.sourceMeta.name)
    : kind;

  return (
    <div
      className="process-step"
      data-state={state}
      aria-label="Vista del medio reconstruido"
    >
      <div className="process-node" aria-hidden="true">
        <span>{stepNumber}</span>
        {state === "done" && <CheckCircle2 size={13} />}
        {state === "active" && <CircleDot size={13} />}
      </div>
      <div className="process-copy">
        <div className="process-head">
          <span className="process-title">
            {mode === "encode" ? "Vista del medio original" : "Vista del medio reconstruido"}
          </span>
          <span className="process-meta">{previewKindLabel(previewKind)}</span>
        </div>
        <dl className="process-facts">
          <div>
            <dt>Qué se hace</dt>
            <dd>
              {mode === "encode"
                ? "Se muestra el archivo cargado en su formato nativo (imagen, audio, video, texto, PDF, binario)."
                : "Se reconstruye el archivo original a partir de los bits decodificados y se renderiza con la cabecera embebida."}
            </dd>
          </div>
          <div>
            <dt>Resultado</dt>
            <dd>
              {ready
                ? mode === "encode"
                  ? `Se previsualiza ${file?.name} como ${previewKindLabel(previewKind)}.`
                  : `Se previsualiza ${result?.sourceMeta?.name ?? file?.name} como ${previewKindLabel(previewKind)}.`
                : file
                  ? "Esperando la ejecución del pipeline para mostrar el medio reconstruido."
                  : "Cargá un archivo para activar la vista previa."}
            </dd>
          </div>
        </dl>
        <div className="media-vis">
          {!file && (
            <div className="preview">
              <div className="preview-head">vista previa · sin archivo</div>
              <div className="preview-body">
                <span className="preview-muted">cargá un archivo para previsualizarlo aquí</span>
              </div>
            </div>
          )}
          {file && mode === "encode" && <FilePreview file={file} mode="encode" />}
          {file && mode === "decode" && !result && <FilePreview file={file} mode="decode" />}
          {file && mode === "decode" && result && (
            <DecodedFilePreview result={result} fallbackName={file.name} />
          )}
        </div>
      </div>
    </div>
  );
}

function previewKindLabel(kind: ReturnType<typeof mediaKind>): string {
  switch (kind) {
    case "image":
      return "imagen";
    case "audio":
      return "audio";
    case "video":
      return "video";
    case "text":
      return "texto";
    case "pdf":
      return "PDF";
    default:
      return "binario";
  }
}
