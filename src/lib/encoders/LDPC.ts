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

export const ALL_LDPC: LDPCCode[] = [LDPC_8_16, LDPC_8_12, LDPC_24_32, LDPC_7_4];

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
