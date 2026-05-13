import * as Comlink from "comlink";
import {
  bytesToBits,
  bitsToBytes,
  packBits,
  parseGroupedBinaryText,
  type BitArray,
  type Bit,
  type BitType,
} from "./bitstream/BitArray";
import { type AnyCode } from "./encoders/index";
import type { LDPCDecodeTrace, LDPCEncodeTrace } from "./encoders/LDPC";
import { applyBSC } from "./channel/channel";
import { ber, sha256Hex } from "./metrics/metrics";

export type ChannelMode = "bsc" | "pattern";

export interface ChannelConfig {
  mode: ChannelMode;
  bscProbability: number;
  pattern: string;
  patternPosition: number;
}

export interface PipelineResult {
  original: BitArray;
  encoded: BitArray;
  received: BitArray;
  decoded: BitArray;
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

// Instantiate workers
const encoderWorker = new Worker(new URL("../workers/encoder.worker.ts", import.meta.url), { type: "module" });
const decoderWorker = new Worker(new URL("../workers/decoder.worker.ts", import.meta.url), { type: "module" });

interface EncoderWorkerApi {
  encodeLDPC(code: AnyCode, data: Bit[]): Promise<LDPCEncodeTrace>;
}

interface DecoderWorkerApi {
  decodeLDPC(code: AnyCode, received: Bit[]): Promise<LDPCDecodeTrace>;
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

  // 1. ORIGINAL
  const original: BitArray = {
    bits: packBits(dataBits),
    length: dataBits.length,
    metadata: {}
  };
  dataBits.forEach((_, i) => (original.metadata![i] = "data"));

  // 2. ENCODE
  const encodedBits: Bit[] = [];
  const encodedMetadata: Record<number, BitType> = {};
  
  const k = code.k;
  const padded = [...dataBits];
  while (padded.length % k !== 0) padded.push(0);
  
  for (let i = 0; i < padded.length; i += k) {
    const block = padded.slice(i, i + k);
    const enc = await encoderApi.encodeLDPC(code, block);
    const offset = encodedBits.length;
    enc.codeword.forEach((bit: Bit, j: number) => {
      encodedBits.push(bit);
      // In our systematic LDPC, first k are data, rest are parity
      encodedMetadata[offset + j] = j < k ? "data" : "parity";
    });
  }

  const encoded: BitArray = {
    bits: packBits(encodedBits),
    length: encodedBits.length,
    metadata: encodedMetadata
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
      elapsedMs: t1 - t0
    }
  };
}

export async function runDecodePipeline(
  fileBytes: Uint8Array,
  code: AnyCode,
  channelConfig: ChannelConfig
): Promise<PipelineResult> {
  const t0 = performance.now();
  const encodedBits = readEncodedBits(fileBytes);
  if (encodedBits.length % code.n !== 0) {
    throw new Error(`El archivo codificado no está alineado a bloques de ${code.n} bits.`);
  }

  const original: BitArray = {
    bits: packBits(encodedBits),
    length: encodedBits.length,
    metadata: {}
  };
  
  // Tag original as mix of data/parity based on code
  const k = code.k;
  const n = code.n;
  for (let i = 0; i < encodedBits.length; i++) {
      original.metadata![i] = (i % n) < k ? "data" : "parity";
  }

  // 1. CHANNEL (Noise)
  const receivedBits = [...encodedBits];
  if (channelConfig.mode === "bsc") {
    const bscBits = applyBSC(encodedBits, channelConfig.bscProbability);
    for (let i = 0; i < encodedBits.length; i++) {
        receivedBits[i] = bscBits[i];
    }
  } else if (channelConfig.mode === "pattern") {
      const pattern = channelConfig.pattern.split("").map(c => parseInt(c, 10));
      if (pattern.some((bit) => bit !== 0 && bit !== 1)) {
        throw new Error("El patrón de error solo puede contener 0 y 1.");
      }
      const pos = channelConfig.patternPosition;
      for (let i = 0; i < pattern.length; i++) {
          if (pos + i < receivedBits.length) {
              receivedBits[pos + i] ^= pattern[i];
          }
      }
  }

  const receivedMetadata: Record<number, BitType> = {};
  for (let i = 0; i < encodedBits.length; i++) {
    if (receivedBits[i] !== encodedBits[i]) {
        receivedMetadata[i] = "altered";
    } else {
        receivedMetadata[i] = (i % n) < k ? "data" : "parity";
    }
  }

  const received: BitArray = {
    bits: packBits(receivedBits),
    length: receivedBits.length,
    metadata: receivedMetadata
  };

  // 2. DECODE
  const decodedBits: Bit[] = [];
  const decodedMetadata: Record<number, BitType> = {};
  let errorsCorrected = 0;
  let errorsUncorrected = 0;

  for (let i = 0; i < receivedBits.length; i += n) {
      const block = receivedBits.slice(i, i + n);
      const dec = await decoderApi.decodeLDPC(code, block);
      errorsCorrected += dec.correctedPositions.length;
      if (!dec.success) errorsUncorrected += dec.syndrome.filter((bit: number) => bit === 1).length;
      const offset = decodedBits.length;
      dec.data.forEach((bit: Bit, j: number) => {
          decodedBits.push(bit);
          decodedMetadata[offset + j] = dec.correctedPositions.includes(j) ? "corrected" : "data";
      });
  }

  const decoded: BitArray = {
    bits: packBits(decodedBits),
    length: decodedBits.length,
    metadata: decodedMetadata
  };

  const decodedBytes = bitsToBytes(decodedBits);
  const decodedHash = await sha256Hex(decodedBytes);

  const t1 = performance.now();

  return {
    original,
    encoded: original,
    received,
    decoded,
    metrics: {
      berPreDecode: ber(encodedBits, receivedBits),
      berPostDecode: 0, 
      errorsCorrected,
      errorsUncorrected,
      integrity: false,
      originalHash: "N/A",
      decodedHash,
      elapsedMs: t1 - t0
    }
  };
}

function readEncodedBits(fileBytes: Uint8Array): Bit[] {
  const text = new TextDecoder().decode(fileBytes);
  const parsed = parseGroupedBinaryText(text);
  return parsed ?? bytesToBits(fileBytes);
}
