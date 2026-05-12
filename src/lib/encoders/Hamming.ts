import type { Bit } from "../bitstream/BitArray";

/**
 * Generic Hamming codes (single algorithm family), optionally extended with an
 * overall parity bit. All parity positions are powers of two (1-indexed).
 *
 * For a base code with `m` parity bits: baseN = 2^m - 1, k = baseN - m.
 * Extended: n = baseN + 1 (one extra overall-parity bit), still k data bits.
 */

export type BitRole = "data" | "parity" | "overall";

export interface HammingCode {
  id: string;
  label: string;
  m: number; // parity bits in the base code
  extended: boolean;
  baseN: number; // length of the base (non-extended) codeword
  n: number; // total codeword length
  k: number; // data bits per block
  rate: number; // k / n
}

function makeCode(m: number, extended: boolean): HammingCode {
  const baseN = (1 << m) - 1;
  const n = extended ? baseN + 1 : baseN;
  const k = baseN - m;
  return {
    id: `h${baseN}_${k}${extended ? "x" : ""}`,
    label: extended ? `Hamming(${n},${k}) extendido` : `Hamming(${n},${k})`,
    m,
    extended,
    baseN,
    n,
    k,
    rate: k / n,
  };
}

export const CODES: HammingCode[] = [
  makeCode(3, true), // Hamming(8,4) ext  — rate 1/2
  makeCode(3, false), // Hamming(7,4)      — rate 4/7
  makeCode(4, true), // Hamming(16,11) ext — rate 11/16
  makeCode(4, false), // Hamming(15,11)    — rate 11/15
  makeCode(5, false), // Hamming(31,26)    — rate 26/31
  makeCode(6, false), // Hamming(63,57)    — rate 57/63
];

export const DEFAULT_CODE_ID = CODES[0].id;

export function getCode(id: string): HammingCode {
  return CODES.find((c) => c.id === id) ?? CODES[0];
}

const isPow2 = (x: number) => (x & (x - 1)) === 0;

/** 1-indexed parity positions for the base code: 1, 2, 4, ... */
export function parityPositions(code: HammingCode): number[] {
  const out: number[] = [];
  for (let j = 0; j < code.m; j++) out.push(1 << j);
  return out;
}

/** 1-indexed data positions for the base code (everything that isn't a power of two). */
export function dataPositions(code: HammingCode): number[] {
  const out: number[] = [];
  for (let i = 1; i <= code.baseN; i++) if (!isPow2(i)) out.push(i);
  return out;
}

export interface ParityEquation {
  pos: number; // codeword position the parity bit lives at (1-indexed)
  covers: number[]; // data positions XORed into it
  value: Bit;
}

export interface EncodeTrace {
  codeword: Bit[]; // length code.n
  roles: BitRole[]; // role of each codeword position
  parityEquations: ParityEquation[];
  overall?: { covers: number[]; value: Bit };
}

export function encodeBlock(code: HammingCode, data: Bit[]): EncodeTrace {
  const cw = new Array<Bit>(code.baseN).fill(0);
  const dataPos = dataPositions(code);
  dataPos.forEach((pos, i) => (cw[pos - 1] = data[i] ?? 0));

  const parityEquations: ParityEquation[] = [];
  for (let j = 0; j < code.m; j++) {
    const pp = 1 << j;
    const covers: number[] = [];
    let value = 0;
    for (const pos of dataPos) {
      if (pos & pp) {
        covers.push(pos);
        value ^= cw[pos - 1];
      }
    }
    cw[pp - 1] = value;
    parityEquations.push({ pos: pp, covers, value });
  }

  const roles: BitRole[] = cw.map((_, idx) => (isPow2(idx + 1) ? "parity" : "data"));

  let overall: { covers: number[]; value: Bit } | undefined;
  if (code.extended) {
    const covers: number[] = [];
    let value = 0;
    for (let i = 1; i <= code.baseN; i++) {
      covers.push(i);
      value ^= cw[i - 1];
    }
    cw.push(value);
    roles.push("overall");
    overall = { covers, value };
  }

  return { codeword: cw, roles, parityEquations, overall };
}

export interface SyndromeBit {
  weight: number; // 1, 2, 4, ...
  covers: number[]; // positions contributing
  value: Bit;
}

export type Diagnosis = "no-error" | "single-corrected" | "overall-bit" | "double-uncorrectable";

export interface DecodeTrace {
  data: Bit[];
  syndromeBits: SyndromeBit[];
  syndrome: number;
  overallCheck?: Bit;
  diagnosis: Diagnosis;
  correctedPosition: number | null; // 1-indexed within the codeword, or null
}

export function decodeBlock(code: HammingCode, received: Bit[]): DecodeTrace {
  const r = received.slice();
  const base = code.extended ? r.slice(0, code.baseN) : r;

  const syndromeBits: SyndromeBit[] = [];
  let syndrome = 0;
  for (let j = 0; j < code.m; j++) {
    const w = 1 << j;
    const covers: number[] = [];
    let value = 0;
    for (let i = 1; i <= code.baseN; i++) {
      if (i & w) {
        covers.push(i);
        value ^= base[i - 1];
      }
    }
    syndromeBits.push({ weight: w, covers, value });
    syndrome |= value << j;
  }

  let overallCheck: Bit | undefined;
  if (code.extended) {
    let v = 0;
    for (let i = 0; i < code.n; i++) v ^= r[i];
    overallCheck = v;
  }

  let diagnosis: Diagnosis = "no-error";
  let correctedPosition: number | null = null;

  if (code.extended) {
    if (syndrome === 0 && overallCheck === 0) {
      diagnosis = "no-error";
    } else if (syndrome !== 0 && overallCheck === 1) {
      if (syndrome <= code.baseN) {
        r[syndrome - 1] ^= 1;
        correctedPosition = syndrome;
        diagnosis = "single-corrected";
      } else {
        diagnosis = "double-uncorrectable";
      }
    } else if (syndrome === 0 && overallCheck === 1) {
      r[code.n - 1] ^= 1;
      correctedPosition = code.n;
      diagnosis = "overall-bit";
    } else {
      diagnosis = "double-uncorrectable";
    }
  } else {
    if (syndrome === 0) {
      diagnosis = "no-error";
    } else if (syndrome <= code.baseN) {
      r[syndrome - 1] ^= 1;
      correctedPosition = syndrome;
      diagnosis = "single-corrected";
    } else {
      diagnosis = "double-uncorrectable";
    }
  }

  const data = dataPositions(code).map((pos) => r[pos - 1]);
  return { data, syndromeBits, syndrome, overallCheck, diagnosis, correctedPosition };
}
