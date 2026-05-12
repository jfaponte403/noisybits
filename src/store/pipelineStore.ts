import { create } from "zustand";
import { runPipeline, type ChannelConfig, type PipelineResult } from "../lib/pipeline";
import { DEFAULT_CODE_ID, getCode } from "../lib/encoders/Hamming";

const MAX_BYTES = 50 * 1024 * 1024;
const ACCEPTED = [
  "text/plain",
  "image/png",
  "image/jpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "video/mp4",
];

interface LoadedFile {
  name: string;
  type: string;
  bytes: Uint8Array;
}

/** 0 = configuración (landing) · 1..5 = etapas del pipeline */
export type StepId = 0 | 1 | 2 | 3 | 4 | 5;
export const LAST_STEP: StepId = 5;

interface PipelineState {
  file: LoadedFile | null;
  codeId: string;
  channel: ChannelConfig;
  result: PipelineResult | null;
  running: boolean;
  step: StepId;
  toast: { kind: "error" | "success"; message: string } | null;

  loadFile: (file: File) => Promise<void>;
  clearFile: () => void;
  setCodeId: (id: string) => void;
  setChannel: (patch: Partial<ChannelConfig>) => void;
  setStep: (s: StepId) => void;
  goNext: () => void;
  goBack: () => void;
  run: () => Promise<void>;
  showToast: (kind: "error" | "success", message: string) => void;
  dismissToast: () => void;
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  file: null,
  codeId: DEFAULT_CODE_ID,
  channel: { mode: "bsc", bscProbability: 0.03, pattern: "10101010", patternPosition: 0 },
  result: null,
  running: false,
  step: 0,
  toast: null,

  showToast: (kind, message) => set({ toast: { kind, message } }),
  dismissToast: () => set({ toast: null }),
  setStep: (step) => {
    if (step !== 0 && get().result === null) return;
    set({ step });
  },
  goNext: () => {
    const { step, result } = get();
    if (step >= LAST_STEP) return;
    if (step === 0) {
      void get().run();
      return;
    }
    if (result === null) return;
    set({ step: (step + 1) as StepId });
  },
  goBack: () => {
    const { step } = get();
    if (step <= 0) return;
    set({ step: (step - 1) as StepId });
  },
  setCodeId: (codeId) => set({ codeId, result: null, step: 0 }),

  loadFile: async (file) => {
    if (file.size > MAX_BYTES) {
      get().showToast("error", "El archivo excede el límite de 50 MB. Considera fragmentar.");
      return;
    }
    const type = file.type || guessType(file.name);
    if (!ACCEPTED.includes(type)) {
      get().showToast("error", `Tipo de archivo no soportado: ${type || "desconocido"}`);
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    set({ file: { name: file.name, type, bytes }, result: null, step: 0 });
    get().showToast("success", `Archivo cargado: ${file.name} (${bytes.length} bytes)`);
  },

  clearFile: () => set({ file: null, result: null, step: 0 }),

  setChannel: (patch) => set({ channel: { ...get().channel, ...patch } }),

  run: async () => {
    const { file, channel, codeId } = get();
    if (!file) {
      get().showToast("error", "Carga un archivo primero.");
      return;
    }
    set({ running: true });
    try {
      const result = await runPipeline(file.bytes, getCode(codeId), channel);
      set({ result, running: false, step: 1 });
      get().showToast(
        result.metrics.integrity ? "success" : "error",
        result.metrics.integrity
          ? "Pipeline completo · integridad ✅"
          : "Pipeline completo · integridad ❌ (errores residuales)",
      );
    } catch (e) {
      set({ running: false });
      get().showToast("error", `Error en el pipeline: ${(e as Error).message}`);
    }
  },
}));

function guessType(name: string): string {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  return (
    {
      txt: "text/plain",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      wav: "audio/wav",
      mp3: "audio/mpeg",
      mp4: "video/mp4",
    }[ext] ?? ""
  );
}

export function extensionFor(name: string): string {
  const ext = name.toLowerCase().split(".").pop();
  return ext ? `.${ext}` : ".bin";
}
