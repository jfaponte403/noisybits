import { describe, it, expect } from "vitest";
import { bytesToBits, bitsToBytes } from "../../src/lib/bitstream/BitArray";

describe("bitstream conversions", () => {
  it("converts 0x41 to MSB-first bits", () => {
    expect(bytesToBits(new Uint8Array([0x41]))).toEqual([0, 1, 0, 0, 0, 0, 0, 1]);
  });

  it("round-trips arbitrary byte sequences", () => {
    const bytes = new Uint8Array([0x00, 0xff, 0xa5, 0x3c, 0x81]);
    expect(Array.from(bitsToBytes(bytesToBits(bytes)))).toEqual(Array.from(bytes));
  });
});
