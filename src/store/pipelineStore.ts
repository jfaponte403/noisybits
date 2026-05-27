import { create } from "zustand";
import { runEncodePipeline, runDecodePipeline, type PipelineResult } from "../lib/pipeline";
import { DEFAULT_CODE_ID, getCode, type AnyCode } from "../lib/encoders/index";

const MAX_BYTES = 50 * 1024 * 1024;

interface LoadedFile {
  name: string;
  type: string;
  bytes: Uint8Array;
}

export type AppMode = "encode" | "decode";

/** What the inspector drawer is currently explaining. */
export type InspectTarget =
  | { kind: "stage"; mode: AppMode; index: number }
  | {
      kind: "bit";
      mode: AppMode;
      which: "original" | "encoded" | "received" | "decoded";
      index: number;
    };

interface PipelineState {
  mode: AppMode | null;
  file: LoadedFile | null;
  codeId: string;
  result: PipelineResult | null;
  running: boolean;
  toast: { kind: "error" | "success"; message: string } | null;
  inspect: InspectTarget | null;
  injectErrors: number;

  setMode: (mode: AppMode | null) => void;
  loadFile: (file: File) => Promise<void>;
  clearFile: () => void;
  setCodeId: (id: string) => void;
  setInjectErrors: (n: number) => void;
  run: () => Promise<void>;
  showToast: (kind: "error" | "success", message: string) => void;
  dismissToast: () => void;
  setInspect: (target: InspectTarget | null) => void;
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  mode: null,
  file: null,
  codeId: DEFAULT_CODE_ID,
  result: null,
  running: false,
  toast: null,
  inspect: null,
  injectErrors: 0,

  showToast: (kind, message) => set({ toast: { kind, message } }),
  dismissToast: () => set({ toast: null }),
  setInspect: (inspect) => set({ inspect }),
  setInjectErrors: (n) => set({ injectErrors: Math.max(0, Math.floor(n)) }),

  setMode: (mode) =>
    set((s) => {
      if (s.mode === mode) return {};
      if (mode === null) return { mode: null, file: null, result: null, inspect: null };
      return { mode, file: s.mode === null ? null : s.file, result: null, inspect: null };
    }),

  setCodeId: (codeId) => set({ codeId, result: null, inspect: null }),

  loadFile: async (file) => {
    if (file.size > MAX_BYTES) {
      get().showToast("error", "El archivo excede el límite de 50 MB. Considera fragmentar.");
      return;
    }
    const type = file.type || guessType(file.name);
    const bytes = new Uint8Array(await file.arrayBuffer());
    set({ file: { name: file.name, type, bytes }, result: null, inspect: dropBitInspect(get().inspect) });
    get().showToast("success", `Archivo cargado: ${file.name} (${bytes.length} bytes)`);
  },

  clearFile: () => set({ file: null, result: null, inspect: dropBitInspect(get().inspect) }),

  run: async () => {
    const { file, codeId, mode, injectErrors } = get();
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
        result = await runDecodePipeline(file.bytes, code, injectErrors);
      }
      set({ result, running: false, inspect: dropBitInspect(get().inspect) });
      get().showToast("success", "Procesamiento completado.");
    } catch (e) {
      set({ running: false });
      get().showToast("error", `Error: ${(e as Error).message}`);
    }
  },
}));

/** Bit inspections reference a specific (now stale) bit array; stage ones stay valid. */
function dropBitInspect(inspect: InspectTarget | null): InspectTarget | null {
  return inspect && inspect.kind === "stage" ? inspect : null;
}

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
