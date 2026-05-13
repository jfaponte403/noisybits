import * as Comlink from "comlink";
import {
  bytesToBits,
  bitsToBytes,
  packBits,
  parseEncodedFile,
  type BitArray,
  type Bit,
  type BitType,
  type EncodedFileMeta,
} from "./bitstream/BitArray";
import { type AnyCode } from "./encoders/index";
import { ber, sha256Hex } from "./metrics/metrics";

export interface PipelineResult {
  original: BitArray;
  encoded: BitArray;
  received: BitArray;
  decoded: BitArray;
  sourceMeta?: EncodedFileMeta | null;
  metrics: {
    berPreDecode: number;
    berPostDecode: number;
    errorsCorrected: number;
    errorsUncorrected: number;
    integrity: boolean;
    originalHash: string;
    decodedHash: string;
    elapsedMs: number;
  };
}

const encoderWorker = new Worker(new URL("../workers/encoder.worker.ts", import.meta.url), { type: "module" });
const decoderWorker = new Worker(new URL("../workers/decoder.worker.ts", import.meta.url), { type: "module" });

interface EncodeAllResult {
  encoded: Bit[];
  metadata: Record<number, BitType>;
}

interface DecodeAllResult {
  decoded: Bit[];
  metadata: Record<number, BitType>;
  errorsCorrected: number;
  errorsUncorrected: number;
}

interface EncoderWorkerApi {
  encodeAllBlocks(code: AnyCode, paddedData: Bit[]): Promise<EncodeAllResult>;
}

interface DecoderWorkerApi {
  decodeAllBlocks(code: AnyCode, received: Bit[]): Promise<DecodeAllResult>;
}

const encoderApi = Comlink.wrap<EncoderWorkerApi>(encoderWorker);
const decoderApi = Comlink.wrap<DecoderWorkerApi>(decoderWorker);

export async function runEncodePipeline(
  fileBytes: Uint8Array,
  code: AnyCode
): Promise<PipelineResult> {
  const t0 = performance.now();
  const originalHash = await sha256Hex(fileBytes);
  const dataBits = bytesToBits(fileBytes);

  const original: BitArray = {
    bits: packBits(dataBits),
    length: dataBits.length,
    metadata: {},
  };
  for (let i = 0; i < dataBits.length; i++) original.metadata![i] = "data";

  const k = code.k;
  const padded: Bit[] = dataBits.slice();
  while (padded.length % k !== 0) padded.push(0 as Bit);

  const { encoded: encodedBits, metadata: encodedMetadata } = await encoderApi.encodeAllBlocks(code, padded);

  const encoded: BitArray = {
    bits: packBits(encodedBits),
    length: encodedBits.length,
    metadata: encodedMetadata,
  };

  const t1 = performance.now();

  return {
    original,
    encoded,
    received: encoded,
    decoded: original,
    metrics: {
      berPreDecode: 0,
      berPostDecode: 0,
      errorsCorrected: 0,
      errorsUncorrected: 0,
      integrity: true,
      originalHash,
      decodedHash: originalHash,
      elapsedMs: t1 - t0,
    },
  };
}

export async function runDecodePipeline(
  fileBytes: Uint8Array,
  code: AnyCode
): Promise<PipelineResult> {
  const t0 = performance.now();
  const { bits: encodedBits, meta: sourceMeta } = readEncodedFile(fileBytes);
  if (encodedBits.length % code.n !== 0) {
    throw new Error(`El archivo codificado no está alineado a bloques de ${code.n} bits.`);
  }

  const k = code.k;
  const n = code.n;

  const original: BitArray = {
    bits: packBits(encodedBits),
    length: encodedBits.length,
    metadata: {},
  };
  for (let i = 0; i < encodedBits.length; i++) {
    original.metadata![i] = (i % n) < k ? "data" : "parity";
  }

  // No channel simulation in decode mode — the uploaded file is taken as the received word.
  const receivedBits = encodedBits.slice();
  const receivedMetadata: Record<number, BitType> = {};
  for (let i = 0; i < encodedBits.length; i++) {
    receivedMetadata[i] = (i % n) < k ? "data" : "parity";
  }

  const received: BitArray = {
    bits: packBits(receivedBits),
    length: receivedBits.length,
    metadata: receivedMetadata,
  };

  const {
    decoded: decodedBits,
    metadata: decodedMetadata,
    errorsCorrected,
    errorsUncorrected,
  } = await decoderApi.decodeAllBlocks(code, receivedBits);

  const decoded: BitArray = {
    bits: packBits(decodedBits),
    length: decodedBits.length,
    metadata: decodedMetadata,
  };

  const decodedBytes = bitsToBytes(decodedBits);
  const decodedHash = await sha256Hex(decodedBytes);

  const t1 = performance.now();

  return {
    original,
    encoded: original,
    received,
    decoded,
    sourceMeta,
    metrics: {
      berPreDecode: ber(encodedBits, receivedBits),
      berPostDecode: 0,
      errorsCorrected,
      errorsUncorrected,
      integrity: errorsUncorrected === 0,
      originalHash: "N/A",
      decodedHash,
      elapsedMs: t1 - t0,
    },
  };
}

function readEncodedFile(fileBytes: Uint8Array): { bits: Bit[]; meta: EncodedFileMeta | null } {
  const text = new TextDecoder().decode(fileBytes);
  const parsed = parseEncodedFile(text);
  if (parsed) return { bits: parsed.bits, meta: parsed.meta };
  return { bits: bytesToBits(fileBytes), meta: null };
}
