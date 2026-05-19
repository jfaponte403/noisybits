import type { Bit } from "../bitstream/BitArray";
import type { BaseCode } from "./types";

export interface LDPCCode extends BaseCode {
  algorithm: "ldpc";
  H: number[][]; // Parity-check matrix
  G: number[][]; // Generator matrix
}

function weight(value: number): number {
  let count = 0;
  while (value > 0) {
    count += value & 1;
    value >>= 1;
  }
  return count;
}

function vectorFromMask(mask: number, length: number): number[] {
  return Array.from({ length }, (_, i) => (mask >> (length - i - 1)) & 1);
}

function generateParityRows(k: number, m: number): number[][] {
  const rows: number[][] = [];
  const max = 1 << m;
  const unitMasks = new Set(Array.from({ length: m }, (_, i) => 1 << i));

  for (let minWeight = 2; rows.length < k && minWeight <= m; minWeight++) {
    for (let mask = 1; mask < max && rows.length < k; mask++) {
      if (unitMasks.has(mask) || weight(mask) !== minWeight) continue;
      rows.push(vectorFromMask(mask, m));
    }
  }

  if (rows.length < k) {
    throw new Error(`No hay suficientes columnas LDPC para k=${k}, m=${m}`);
  }

  return rows;
}

function createSystematicLDPC(id: string, label: string, k: number, m: number): LDPCCode {
  const parityRows = generateParityRows(k, m);
  const G = parityRows.map((row, i) => [
    ...Array.from({ length: k }, (_, j) => (i === j ? 1 : 0)),
    ...row,
  ]);
  const H = Array.from({ length: m }, (_, parityIndex) => [
    ...parityRows.map((row) => row[parityIndex]),
    ...Array.from({ length: m }, (_, j) => (parityIndex === j ? 1 : 0)),
  ]);

  return {
    id,
    label,
    algorithm: "ldpc",
    n: k + m,
    k,
    rate: k / (k + m),
    H,
    G,
  };
}

export const LDPC_8_24: LDPCCode = createSystematicLDPC(
  "ldpc_8_24",
  "LDPC 1/3 (24, 8)",
  8,
  16
);

export const LDPC_8_16: LDPCCode = createSystematicLDPC(
  "ldpc_8_16",
  "LDPC 1/2 (16, 8)",
  8,
  8
);

export const LDPC_8_12: LDPCCode = createSystematicLDPC(
  "ldpc_8_12",
  "LDPC 2/3 (12, 8)",
  8,
  4
);

export const LDPC_24_32: LDPCCode = createSystematicLDPC(
  "ldpc_24_32",
  "LDPC 3/4 (32, 24)",
  24,
  8
);

export const LDPC_20_25: LDPCCode = createSystematicLDPC(
  "ldpc_20_25",
  "LDPC 4/5 (25, 20)",
  20,
  5
);

export const LDPC_25_30: LDPCCode = createSystematicLDPC(
  "ldpc_25_30",
  "LDPC 10/12 (30, 25)",
  25,
  5
);

export const LDPC_42_48: LDPCCode = createSystematicLDPC(
  "ldpc_42_48",
  "LDPC 7/8 (48, 42)",
  42,
  6
);

export const LDPC_7_4: LDPCCode = {
  id: "ldpc_7_4",
  label: "LDPC 4/7 (7, 4) - didáctico",
  algorithm: "ldpc",
  n: 7,
  k: 4,
  rate: 4 / 7,
  // H matrix (n-k x n) = (3 x 7)
  // p1 = d1 + d2 + d4
  // p2 = d1 + d3 + d4
  // p3 = d2 + d3 + d4
  H: [
    [1, 1, 0, 1, 1, 0, 0],
    [1, 0, 1, 1, 0, 1, 0],
    [0, 1, 1, 1, 0, 0, 1],
  ],
  // G matrix (k x n) = (4 x 7) in systematic form [I | P]
  G: [
    [1, 0, 0, 0, 1, 1, 0], // d1
    [0, 1, 0, 0, 1, 0, 1], // d2
    [0, 0, 1, 0, 0, 1, 1], // d3
    [0, 0, 0, 1, 1, 1, 1], // d4
  ],
};

export const ALL_LDPC: LDPCCode[] = [
  LDPC_8_24,
  LDPC_8_16,
  LDPC_8_12,
  LDPC_24_32,
  LDPC_20_25,
  LDPC_25_30,
  LDPC_42_48,
  LDPC_7_4,
];

export interface LDPCEncodeTrace {
  codeword: Bit[];
  dataIn: Bit[];
}

export function encodeLDPC(code: LDPCCode, data: Bit[]): LDPCEncodeTrace {
  const codeword: Bit[] = new Array(code.n).fill(0);
  for (let j = 0; j < code.n; j++) {
    let sum = 0;
    for (let i = 0; i < code.k; i++) {
      sum ^= data[i] * code.G[i][j];
    }
    codeword[j] = sum as Bit;
  }
  return { codeword, dataIn: data };
}

export interface LDPCDecodeTrace {
  data: Bit[];
  codeword: Bit[];
  syndrome: number[];
  success: boolean;
  correctedPositions: number[];
}

export function decodeLDPC(code: LDPCCode, received: Bit[], maxIterations = 10): LDPCDecodeTrace {
  const n = code.n;
  const m = code.H.length;
  const current = [...received];
  let success = false;
  let syndrome: number[] = [];
  const correctedPositions: number[] = [];

  for (let iter = 0; iter < maxIterations; iter++) {
    syndrome = calculateSyndrome(code, current);
    const allZero = syndrome.every((bit) => bit === 0);

    if (allZero) {
      success = true;
      break;
    }

    const exactColumn = findSyndromeColumn(code, syndrome);
    if (exactColumn >= 0) {
      current[exactColumn] ^= 1;
      correctedPositions.push(exactColumn);
      continue;
    }

    const failCounts = new Array(n).fill(0);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < m; i++) {
        if (code.H[i][j] === 1 && syndrome[i] === 1) {
          failCounts[j]++;
        }
      }
    }

    const maxFails = Math.max(...failCounts);
    if (maxFails === 0) break;

    const toFlip = failCounts.findIndex((count) => count === maxFails);
    current[toFlip] ^= 1;
    correctedPositions.push(toFlip);
  }

  syndrome = calculateSyndrome(code, current);
  success = syndrome.every((bit) => bit === 0);

  return {
    data: current.slice(0, code.k),
    codeword: current,
    syndrome,
    success,
    correctedPositions,
  };
}

function calculateSyndrome(code: LDPCCode, bits: Bit[]): number[] {
  return code.H.map((row) => {
    let sum = 0;
    for (let j = 0; j < code.n; j++) {
      sum ^= (bits[j] ?? 0) * row[j];
    }
    return sum;
  });
}

function findSyndromeColumn(code: LDPCCode, syndrome: number[]): number {
  for (let j = 0; j < code.n; j++) {
    let matches = true;
    for (let i = 0; i < syndrome.length; i++) {
      if (code.H[i][j] !== syndrome[i]) {
        matches = false;
        break;
      }
    }
    if (matches) return j;
  }
  return -1;
}

/* ------------------------------------------------------------------ *
 *  Pedagogical explainers — used by the inspector drawer to narrate
 *  exactly what the encoder / decoder did with a single block.
 *  Intentionally kept off the hot pipeline path: they recompute one
 *  block on demand instead of bloating every block's worker payload.
 * ------------------------------------------------------------------ */

export interface EncodeBlockExplain {
  k: number;
  n: number;
  data: Bit[];          // length k
  codeword: Bit[];      // length n
  /** For each codeword position j, the data indices i with G[i][j] === 1. */
  contributors: number[][];
}

export function explainEncodeBlock(code: LDPCCode, data: Bit[]): EncodeBlockExplain {
  const padded = Array.from({ length: code.k }, (_, i) => (data[i] ?? 0) as Bit);
  const { codeword } = encodeLDPC(code, padded);
  const contributors: number[][] = [];
  for (let j = 0; j < code.n; j++) {
    const c: number[] = [];
    for (let i = 0; i < code.k; i++) if (code.G[i][j] === 1) c.push(i);
    contributors.push(c);
  }
  return { k: code.k, n: code.n, data: padded, codeword, contributors };
}

export type DecodeAction = "already-clean" | "flip-syndrome-column" | "flip-majority-vote" | "stuck";

export interface DecodeIteration {
  syndrome: number[];                 // length m, before this step's flip
  failedChecks: number[];             // indices i with syndrome[i] === 1
  action: DecodeAction;
  target: number | null;              // codeword position flipped (if any)
}

export interface DecodeBlockExplain {
  k: number;
  n: number;
  m: number;
  received: Bit[];                    // length n
  corrected: Bit[];                   // length n, after decoding
  data: Bit[];                        // length k (systematic prefix of corrected)
  initialSyndrome: number[];
  finalSyndrome: number[];
  success: boolean;
  correctedPositions: number[];       // codeword positions the decoder flipped
  iterations: DecodeIteration[];
  /** For each check row i, the codeword positions j it constrains (H[i][j] === 1). */
  checkMembers: number[][];
  /** For each codeword position j, the check rows i that touch it (H[i][j] === 1). */
  variableChecks: number[][];
}

export function explainDecodeBlock(code: LDPCCode, received: Bit[], maxIterations = 10): DecodeBlockExplain {
  const n = code.n;
  const m = code.H.length;
  const current = received.map((b) => (b ?? 0) as Bit);
  const correctedPositions: number[] = [];
  const iterations: DecodeIteration[] = [];

  const initialSyndrome = calculateSyndrome(code, current);

  for (let iter = 0; iter < maxIterations; iter++) {
    const syndrome = calculateSyndrome(code, current);
    const failedChecks = syndrome.map((b, i) => (b === 1 ? i : -1)).filter((i) => i >= 0);

    if (failedChecks.length === 0) {
      iterations.push({ syndrome, failedChecks, action: "already-clean", target: null });
      break;
    }

    const exactColumn = findSyndromeColumn(code, syndrome);
    if (exactColumn >= 0) {
      iterations.push({ syndrome, failedChecks, action: "flip-syndrome-column", target: exactColumn });
      current[exactColumn] ^= 1;
      correctedPositions.push(exactColumn);
      continue;
    }

    const failCounts = new Array(n).fill(0);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < m; i++) if (code.H[i][j] === 1 && syndrome[i] === 1) failCounts[j]++;
    }
    const maxFails = Math.max(...failCounts);
    if (maxFails === 0) {
      iterations.push({ syndrome, failedChecks, action: "stuck", target: null });
      break;
    }
    const toFlip = failCounts.findIndex((c) => c === maxFails);
    iterations.push({ syndrome, failedChecks, action: "flip-majority-vote", target: toFlip });
    current[toFlip] ^= 1;
    correctedPositions.push(toFlip);
  }

  const finalSyndrome = calculateSyndrome(code, current);
  const success = finalSyndrome.every((b) => b === 0);

  const checkMembers: number[][] = code.H.map((row) =>
    row.map((v, j) => (v === 1 ? j : -1)).filter((j) => j >= 0),
  );
  const variableChecks: number[][] = Array.from({ length: n }, (_, j) =>
    code.H.map((row, i) => (row[j] === 1 ? i : -1)).filter((i) => i >= 0),
  );

  return {
    k: code.k,
    n,
    m,
    received: current.map((_, j) => (received[j] ?? 0) as Bit),
    corrected: [...current],
    data: current.slice(0, code.k),
    initialSyndrome,
    finalSyndrome,
    success,
    correctedPositions,
    iterations,
    checkMembers,
    variableChecks,
  };
}
