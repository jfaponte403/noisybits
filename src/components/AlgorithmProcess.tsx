import { usePipelineStore } from "../store/pipelineStore";
import { getCode } from "../lib/encoders/index";
import { CheckCircle2, CircleDot, Loader2 } from "lucide-react";

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
          action: "Se leyó el texto binario y se reconstruyó la secuencia codificada.",
          result: `Se alinearon ${fmt(encodedBits)} bits en bloques LDPC.`,
          evidence: `La entrada produjo ${fmt(encodedBlockCount)} bloques de ${code.n} bits.`,
          meta: "TXT -> bits",
        },
        {
          title: "Canal",
          action: "Se aplicó el modelo de ruido configurado antes de decodificar.",
          result: `Se recibieron ${fmt(receivedBits)} bits para corrección.`,
          evidence: `El BER previo a decodificar fue ${result?.metrics.berPreDecode.toFixed(4)}.`,
          meta: "ruido",
        },
        {
          title: "Síndrome",
          action: "Se calculó el síndrome con H para cada bloque recibido.",
          result: `Se corrigieron ${fmt(result?.metrics.errorsCorrected ?? 0)} bits detectados.`,
          evidence: `Quedaron ${fmt(result?.metrics.errorsUncorrected ?? 0)} chequeos residuales sin resolver.`,
          meta: "H · corrección",
        },
        {
          title: "Salida decodificada",
          action: "Se extrajeron los datos sistemáticos y se reconstruyó la carga útil.",
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
              <span className="process-cta">Ver explicación detallada →</span>
            </div>
          </div>
        );
        })}
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
    </section>
  );
}
