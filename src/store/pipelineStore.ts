import { create } from "zustand";
import {
  runEncodePipeline,
  runDecodePipeline,
  type ChannelConfig,
  type PipelineResult,
} from "../lib/pipeline";
import { DEFAULT_CODE_ID, getCode, type AnyCode } from "../lib/encoders/index";

const MAX_BYTES = 50 * 1024 * 1024;

interface LoadedFile {
  name: string;
  type: string;
  bytes: Uint8Array;
}

export type AppMode = "encode" | "decode";

interface PipelineState {
  mode: AppMode | null;
  file: LoadedFile | null;
  codeId: string;
  channel: ChannelConfig;
  result: PipelineResult | null;
  running: boolean;
  toast: { kind: "error" | "success"; message: string } | null;

  setMode: (mode: AppMode | null) => void;
  loadFile: (file: File) => Promise<void>;
  clearFile: () => void;
  setCodeId: (id: string) => void;
  setChannel: (patch: Partial<ChannelConfig>) => void;
  run: () => Promise<void>;
  showToast: (kind: "error" | "success", message: string) => void;
  dismissToast: () => void;
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  mode: null,
  file: null,
  codeId: DEFAULT_CODE_ID,
  channel: { mode: "bsc", bscProbability: 0.03, pattern: "10101010", patternPosition: 0 },
  result: null,
  running: false,
  toast: null,

  showToast: (kind, message) => set({ toast: { kind, message } }),
  dismissToast: () => set({ toast: null }),

  setMode: (mode) => set({ mode, file: null, result: null }),

  setCodeId: (codeId) => set({ codeId, result: null }),

  loadFile: async (file) => {
    if (file.size > MAX_BYTES) {
      get().showToast("error", "El archivo excede el límite de 50 MB. Considera fragmentar.");
      return;
    }
    const type = file.type || guessType(file.name);
    const bytes = new Uint8Array(await file.arrayBuffer());
    set({ file: { name: file.name, type, bytes }, result: null });
    get().showToast("success", `Archivo cargado: ${file.name} (${bytes.length} bytes)`);
  },

  clearFile: () => set({ file: null, result: null }),

  setChannel: (patch) => set({ channel: { ...get().channel, ...patch } }),

  run: async () => {
    const { file, channel, codeId, mode } = get();
    if (!file) {
      get().showToast("error", "Carga un archivo primero.");
      return;
    }
    set({ running: true });
    try {
      const code: AnyCode = getCode(codeId);
      let result: PipelineResult;
      if (mode === "encode") {
        result = await runEncodePipeline(file.bytes, code);
      } else {
        result = await runDecodePipeline(file.bytes, code, channel);
      }
      set({ result, running: false });
      get().showToast("success", "Procesamiento completado.");
    } catch (e) {
      set({ running: false });
      get().showToast("error", `Error: ${(e as Error).message}`);
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
      pdf: "application/pdf",
      wav: "audio/wav",
      mp3: "audio/mpeg",
      mp4: "video/mp4",
    }[ext] ?? ""
  );
}
