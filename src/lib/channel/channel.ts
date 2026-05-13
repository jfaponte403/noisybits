import type { Bit } from "../bitstream/BitArray";

/** Binary Symmetric Channel: flips each bit independently with probability p. */
export function applyBSC(bits: Bit[], p: number): Bit[] {
  return bits.map((b) => (Math.random() < p ? b ^ 1 : b));
}
