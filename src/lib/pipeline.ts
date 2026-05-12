import { bytesToBits, bitsToBytes, type AnnotatedBit, type Bit } from "./bitstream/BitArray";
import {
  type HammingCode,
  type BitRole,
  type ParityEquation,
  type SyndromeBit,
  type Diagnosis,
  encodeBlock,
  decodeBlock,
} from "./encoders/Hamming";
import { applyBSC, applyPattern } from "./channel/channel";
import { ber, countDiff, sha256Hex } from "./metrics/metrics";

export type ChannelMode = "bsc" | "pattern";

export interface ChannelConfig {
  mode: ChannelMode;
  bscProbability: number;
  pattern: string;
  patternPosition: number;
}

/** Step-by-step trace of a single representative block, for the algorithm view. */
export interface BlockTrace {
  code: HammingCode;
  blockIndex: number;
  dataIn: Bit[];
  codeword: Bit[];
  roles: BitRole[];
  parityEquations: ParityEquation[];
  overall?: { covers: number[]; value: Bit };
  flippedPositions: number[]; // 1-indexed within the block's codeword
  received: Bit[];
  syndromeBits: SyndromeBit[];
  syndrome: number;
  overallCheck?: Bit;
  diagnosis: Diagnosis;
  correctedPosition: number | null;
  dataOut: Bit[];
}

export interface PipelineResult {
  code: HammingCode;
  original: AnnotatedBit[];
  encoded: AnnotatedBit[];
  received: AnnotatedBit[];
  decoded: AnnotatedBit[];
  comparison: AnnotatedBit[];
  trace: BlockTrace;
  decodedBytes: Uint8Array;
  encodedBytes: Uint8Array;
  receivedBytes: Uint8Array;
  metrics: {
    rate: number;
    inputBits: number;
    encodedBits: number;
    berPreDecode: number;
    berPostDecode: number;
    blocksCorrected: number;
    blocksUncorrectable: number;
    bitsResidual: number;
    integrity: boolean;
    originalHash: string;
    decodedHash: string;
    elapsedMs: number;
  };
}

export async function runPipeline(
  fileBytes: Uint8Array,
  code: HammingCode,
  config: ChannelConfig,
): Promise<PipelineResult> {
  const t0 = performance.now();

  const dataBits = bytesToBits(fileBytes);
  const padded: Bit[] = dataBits.slice();
  while (padded.length % code.k !== 0) padded.push(0);
  const nBlocks = padded.length / code.k;

  // ---- encode ----
  const encodedBits: Bit[] = [];
  const encodedRoles: BitRole[] = [];
  for (let b = 0; b < nBlocks; b++) {
    const block = padded.slice(b * code.k, b * code.k + code.k);
    const t = encodeBlock(code, block);
    for (let i = 0; i < code.n; i++) {
      encodedBits.push(t.codeword[i]);
      encodedRoles.push(t.roles[i]);
    }
  }

  // ---- channel ----
  const receivedBits =
    config.mode === "bsc"
      ? applyBSC(encodedBits, config.bscProbability)
      : applyPattern(encodedBits, config.pattern, config.patternPosition);

  // ---- decode ----
  const decodedBits: Bit[] = [];
  let blocksCorrected = 0;
  let blocksUncorrectable = 0;
  for (let b = 0; b < nBlocks; b++) {
    const cw = receivedBits.slice(b * code.n, b * code.n + code.n);
    const t = decodeBlock(code, cw);
    if (t.diagnosis === "single-corrected" || t.diagnosis === "overall-bit") blocksCorrected++;
    if (t.diagnosis === "double-uncorrectable") blocksUncorrectable++;
    decodedBits.push(...t.data);
  }
  const decodedTrimmed = decodedBits.slice(0, dataBits.length);

  // ---- pick a representative block for the trace: prefer the first that was hit by the channel ----
  let traceBlock = 0;
  for (let b = 0; b < nBlocks; b++) {
    const off = b * code.n;
    let hit = false;
    for (let i = 0; i < code.n; i++) if (receivedBits[off + i] !== encodedBits[off + i]) hit = true;
    if (hit) {
      traceBlock = b;
      break;
    }
  }
  const blockData = padded.slice(traceBlock * code.k, traceBlock * code.k + code.k);
  const enc = encodeBlock(code, blockData);
  const off = traceBlock * code.n;
  const blockReceived = receivedBits.slice(off, off + code.n);
  const flippedPositions: number[] = [];
  for (let i = 0; i < code.n; i++) if (blockReceived[i] !== enc.codeword[i]) flippedPositions.push(i + 1);
  const dec = decodeBlock(code, blockReceived);

  const trace: BlockTrace = {
    code,
    blockIndex: traceBlock,
    dataIn: blockData,
    codeword: enc.codeword,
    roles: enc.roles,
    parityEquations: enc.parityEquations,
    overall: enc.overall,
    flippedPositions,
    received: blockReceived,
    syndromeBits: dec.syndromeBits,
    syndrome: dec.syndrome,
    overallCheck: dec.overallCheck,
    diagnosis: dec.diagnosis,
    correctedPosition: dec.correctedPosition,
    dataOut: dec.data,
  };

  // ---- metrics ----
  const decodedBytes = bitsToBytes(decodedTrimmed);
  const originalHash = await sha256Hex(fileBytes);
  const decodedHash = await sha256Hex(decodedBytes);

  // ---- annotated views ----
  const original: AnnotatedBit[] = dataBits.map((v) => ({ value: v, type: "data" }));
  const encoded: AnnotatedBit[] = encodedBits.map((v, i) => ({
    value: v,
    type: encodedRoles[i] === "data" ? "data" : "parity",
  }));
  const received: AnnotatedBit[] = receivedBits.map((v, i) => ({
    value: v,
    type: v !== encodedBits[i] ? "altered" : encodedRoles[i] === "data" ? "data" : "parity",
  }));
  const decoded: AnnotatedBit[] = decodedBits.map((v, i) => ({
    value: v,
    type: v !== padded[i] ? "uncorrected" : "data",
  }));
  const comparison: AnnotatedBit[] = decodedTrimmed.map((v, i) => ({
    value: v,
    type: v !== dataBits[i] ? "uncorrected" : "data",
  }));

  const t1 = performance.now();

  return {
    code,
    original,
    encoded,
    received,
    decoded,
    comparison,
    trace,
    decodedBytes,
    encodedBytes: bitsToBytes(encodedBits),
    receivedBytes: bitsToBytes(receivedBits),
    metrics: {
      rate: code.rate,
      inputBits: dataBits.length,
      encodedBits: encodedBits.length,
      berPreDecode: ber(encodedBits, receivedBits),
      berPostDecode: ber(padded, decodedBits),
      blocksCorrected,
      blocksUncorrectable,
      bitsResidual: countDiff(padded, decodedBits),
      integrity: originalHash === decodedHash,
      originalHash,
      decodedHash,
      elapsedMs: t1 - t0,
    },
  };
}
