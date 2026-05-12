export type BitType = "data" | "parity" | "altered" | "corrected" | "uncorrected";

export type Bit = number; // 0 or 1

export interface AnnotatedBit {
  value: Bit;
  type: BitType;
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
