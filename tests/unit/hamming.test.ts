import { describe, it, expect } from "vitest";
import { CODES, encodeBlock, decodeBlock, dataPositions } from "../../src/lib/encoders/Hamming";

function randBits(n: number): number[] {
  return Array.from({ length: n }, () => (Math.random() < 0.5 ? 0 : 1));
}

describe("Hamming code family", () => {
  for (const code of CODES) {
    describe(code.label, () => {
      it("encodes k bits into n bits and round-trips with no errors", () => {
        for (let trial = 0; trial < 20; trial++) {
          const data = randBits(code.k);
          const { codeword } = encodeBlock(code, data);
          expect(codeword).toHaveLength(code.n);
          const dec = decodeBlock(code, codeword);
          expect(dec.data).toEqual(data);
          expect(dec.diagnosis).toBe("no-error");
        }
      });

      it("corrects any single-bit error", () => {
        const data = randBits(code.k);
        const { codeword } = encodeBlock(code, data);
        for (let i = 0; i < code.n; i++) {
          const corrupted = codeword.slice();
          corrupted[i] ^= 1;
          const dec = decodeBlock(code, corrupted);
          expect(dec.data).toEqual(data);
          expect(dec.correctedPosition).toBe(i + 1);
        }
      });

      if (code.extended) {
        it("flags double-bit errors as uncorrectable", () => {
          const data = randBits(code.k);
          const { codeword } = encodeBlock(code, data);
          const corrupted = codeword.slice();
          // flip two distinct data positions
          const [a, b] = dataPositions(code);
          corrupted[a - 1] ^= 1;
          corrupted[b - 1] ^= 1;
          const dec = decodeBlock(code, corrupted);
          expect(dec.diagnosis).toBe("double-uncorrectable");
        });
      }
    });
  }
});
