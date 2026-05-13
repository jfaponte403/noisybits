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

export function bitsToGroupedBinaryText(bits: Bit[], groupSize = 3): string {
  const groups: string[] = [];
  for (let i = 0; i < bits.length; i += groupSize) {
    groups.push(bits.slice(i, i + groupSize).join(""));
  }
  return groups.join(" ");
}

export function parseGroupedBinaryText(text: string): Bit[] | null {
  const compact = text.replace(/\s+/g, "");
  if (!compact || /[^01]/.test(compact)) return null;
  return Array.from(compact, (char) => Number(char) as Bit);
}

export function bytesToGroupedBinaryText(bytes: Uint8Array, length: number, groupSize = 3): string {
  return bitsToGroupedBinaryText(unpackBits(bytes, length), groupSize);
}
