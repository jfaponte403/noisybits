import { usePipelineStore, type AppMode } from "../store/pipelineStore";
import { ShieldCheck, ShieldAlert } from "lucide-react";

interface Props {
  onSelect?: (mode: AppMode) => void;
}

export function ModePicker({ onSelect }: Props) {
  const { setMode } = usePipelineStore();

  const choose = (m: AppMode) => {
    if (onSelect) onSelect(m);
    else setMode(m);
  };

  return (
    <div className="mode-picker">
      <button type="button" className="mode-card" onClick={() => choose("encode")}>
        <div className="mc-ic">
          <ShieldCheck size={20} />
        </div>
        <div className="mc-t">Codificar</div>
        <div className="mc-d">
          Añadí redundancia a un archivo para protegerlo contra ruidos y errores.
        </div>
      </button>
      <button type="button" className="mode-card" onClick={() => choose("decode")}>
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
