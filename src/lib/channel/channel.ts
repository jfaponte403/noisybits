import type { Bit } from "../bitstream/BitArray";

/** Binary Symmetric Channel: flips each bit independently with probability p. */
export function applyBSC(bits: Bit[], p: number): Bit[] {
  return bits.map((b) => (Math.random() < p ? b ^ 1 : b));
}

/**
 * Manual error injection: XOR `pattern` (string of "0"/"1") into `bits` starting at `position`.
 * Bits beyond the end of the array are ignored.
 */
export function applyPattern(bits: Bit[], pattern: string, position: number): Bit[] {
  const out = bits.slice();
  for (let i = 0; i < pattern.length; i++) {
    const idx = position + i;
    if (idx < 0 || idx >= out.length) continue;
    out[idx] ^= pattern[i] === "1" ? 1 : 0;
  }
  return out;
}
