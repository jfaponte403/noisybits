export type BitType = "data" | "parity" | "altered" | "corrected" | "uncorrected";

export type Bit = number; // 0 or 1

export interface BitArray {
  bits: Uint8Array;          // packed: 8 bits per byte
  length: number;            // bit count (not byte count)
  metadata?: Record<number, BitType>; // Record instead of Map for easier state management/serialization
}

/** Convert a Uint8Array of bytes to an array of bits (MSB first). */
export function bytesToBits(bytes: Uint8Array): Bit[] {
  const bits: Bit[] = [];
  for (const byte of bytes) {
    for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
  }
  return bits;
}

/** Convert an array of bits (MSB first) back to a Uint8Array. Pads with 0 to a byte boundary. */
export function bitsToBytes(bits: Bit[]): Uint8Array {
  const byteCount = Math.ceil(bits.length / 8);
  const out = new Uint8Array(byteCount);
  for (let i = 0; i < bits.length; i++) {
    if (bits[i]) out[i >> 3] |= 1 << (7 - (i & 7));
  }
  return out;
}

export function packBits(bits: Bit[]): Uint8Array {
  return bitsToBytes(bits);
}

export function unpackBits(bytes: Uint8Array, length: number): Bit[] {
  const bits: Bit[] = [];
  for (let i = 0; i < length; i++) {
    const byte = bytes[i >> 3];
    bits.push((byte >> (7 - (i & 7))) & 1);
  }
  return bits;
}

/** Unpack `count` bits starting at absolute bit index `start` (MSB first). */
export function unpackBitsRange(bytes: Uint8Array, start: number, count: number): Bit[] {
  const bits: Bit[] = [];
  for (let i = start; i < start + count; i++) {
    const byte = bytes[i >> 3] ?? 0;
    bits.push((byte >> (7 - (i & 7))) & 1);
  }
  return bits;
}

export function bitsToGroupedBinaryText(bits: Bit[], groupSize = 8): string {
  const groups: string[] = [];
  for (let i = 0; i < bits.length; i += groupSize) {
    groups.push(bits.slice(i, i + groupSize).join(""));
  }
  return groups.join(" ");
}

/**
 * Agrupa los bits por palabra de código de longitud `n`. Dentro de cada
 * palabra separa los `k` bits de mensaje de los `n-k` bits de paridad con un
 * espacio, y pone una palabra de código por línea. Como solo usa espacios y
 * saltos de línea, al quitar los separadores se recuperan los bits exactos
 * (sigue siendo parseable por `parseGroupedBinaryText`).
 *
 * Ej. (n=7, k=4):  "1010 110\n0011 101"
 */
export function bitsToCodewordText(bits: Bit[], n: number, k: number): string {
  if (n <= 0) return bitsToGroupedBinaryText(bits);
  const lines: string[] = [];
  for (let i = 0; i < bits.length; i += n) {
    const word = bits.slice(i, i + n);
    const data = word.slice(0, k).join("");
    const parity = word.slice(k).join("");
    lines.push(parity.length ? `${data} ${parity}` : data);
  }
  return lines.join("\n");
}

export function parseGroupedBinaryText(text: string): Bit[] | null {
  const compact = text.replace(/\s+/g, "");
  if (!compact || /[^01]/.test(compact)) return null;
  return Array.from(compact, (char) => Number(char) as Bit);
}

export interface EncodedFileMeta {
  name: string;
  type: string;
  dataBits: number;
}

const HEADER_PREFIX = "# noisybits v1";

/**
 * Serializa el flujo codificado a texto binario.
 *
 * `groupSize` debe ser la longitud de bloque `n` del código (no 8): agrupar de
 * a 8 escondería la estructura de la palabra código (p. ej. con tasa 12/24 los
 * límites de bloque caen en múltiplos de 24, no de 8). Agrupar por `n` hace que
 * cada grupo de la salida sea exactamente una palabra código LDPC.
 */
export function serializeEncodedFile(bits: Bit[], meta: EncodedFileMeta, groupSize = 8): string {
  const safeName = meta.name.replace(/[\r\n]/g, "_");
  const safeType = (meta.type || "application/octet-stream").replace(/[\r\n]/g, "_");
  const header = `${HEADER_PREFIX} name=${encodeURIComponent(safeName)} type=${encodeURIComponent(safeType)} dataBits=${meta.dataBits}`;
  return `${header}\n${bitsToGroupedBinaryText(bits, groupSize)}\n`;
}

export interface ParsedEncodedFile {
  bits: Bit[];
  meta: EncodedFileMeta | null;
}

export function parseEncodedFile(text: string): ParsedEncodedFile | null {
  const lines = text.split(/\r?\n/);
  let meta: EncodedFileMeta | null = null;
  const payloadLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) {
      if (!meta && trimmed.startsWith(HEADER_PREFIX)) {
        meta = parseHeaderLine(trimmed);
      }
      continue;
    }
    payloadLines.push(line);
  }
  const bits = parseGroupedBinaryText(payloadLines.join(" "));
  if (!bits) return null;
  return { bits, meta };
}

function parseHeaderLine(line: string): EncodedFileMeta | null {
  const fields: Record<string, string> = {};
  for (const token of line.split(/\s+/)) {
    const idx = token.indexOf("=");
    if (idx <= 0) continue;
    fields[token.slice(0, idx)] = token.slice(idx + 1);
  }
  const dataBits = Number(fields.dataBits);
  if (!Number.isFinite(dataBits) || dataBits < 0) return null;
  return {
    name: safeDecode(fields.name) || "decoded",
    type: safeDecode(fields.type) || "application/octet-stream",
    dataBits,
  };
}

function safeDecode(value: string | undefined): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
