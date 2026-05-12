import { usePipelineStore, type StepId } from "../store/pipelineStore";

const STEPS: { id: StepId; title: string; sub: string }[] = [
  { id: 0, title: "Configuración", sub: "archivo + tasa" },
  { id: 1, title: "Original", sub: "archivo → bits" },
  { id: 2, title: "Codificación", sub: "hamming · redundancia" },
  { id: 3, title: "Canal", sub: "bsc · inyecta errores" },
  { id: 4, title: "Decodificación", sub: "síndrome · corrige" },
  { id: 5, title: "Verificación", sub: "sha-256 · métricas" },
];

export function Stepper() {
  const { step, setStep, result } = usePipelineStore();

  return (
    <>
      {STEPS.map((s, i) => {
        const state = s.id === step ? "active" : s.id < step ? "done" : "upcoming";
        const clickable = s.id === 0 || result !== null;
        return (
          <button
            key={s.id}
            type="button"
            className="step"
            data-state={state}
            disabled={!clickable}
            onClick={() => clickable && setStep(s.id)}
          >
            <span className="node">{state === "done" ? "✓" : i + 1}</span>
            <span className="txt">
              <span className="t">{s.title}</span>
              <span className="d">{s.sub}</span>
            </span>
          </button>
        );
      })}
    </>
  );
}
