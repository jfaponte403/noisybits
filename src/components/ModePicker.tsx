import { usePipelineStore } from "../store/pipelineStore";
import { ShieldCheck, ShieldAlert } from "lucide-react";

export function ModePicker() {
  const { setMode } = usePipelineStore();

  return (
    <div className="mode-picker">
      <button type="button" className="mode-card" onClick={() => setMode("encode")}>
        <div className="mc-ic">
          <ShieldCheck size={20} />
        </div>
        <div className="mc-t">Codificar</div>
        <div className="mc-d">
          Añadí redundancia a un archivo para protegerlo contra ruidos y errores.
        </div>
      </button>
      <button type="button" className="mode-card" onClick={() => setMode("decode")}>
        <div className="mc-ic">
          <ShieldAlert size={20} />
        </div>
        <div className="mc-t">Decodificar</div>
        <div className="mc-d">
          Analizá una señal recibida, detectá errores del canal y recuperá el original.
        </div>
      </button>
    </div>
  );
}
