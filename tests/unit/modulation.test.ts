import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ALL_MOD,
  MOD_INFO,
  applyAWGN,
  demodulate,
  idealConstellation,
  modulate,
  type ConstSymbol,
  type ModScheme,
} from "../../src/lib/modulation/modulation";
import type { Bit } from "../../src/lib/bitstream/BitArray";

const SCHEMES: ModScheme[] = ["bpsk", "qpsk", "qam16"];

/** Deterministic LCG → [0,1) so noise/quantization tests are reproducible. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("modulation · metadata", () => {
  it("declares the expected bits per symbol", () => {
    expect(MOD_INFO.bpsk.bitsPerSymbol).toBe(1);
    expect(MOD_INFO.qpsk.bitsPerSymbol).toBe(2);
    expect(MOD_INFO.qam16.bitsPerSymbol).toBe(4);
  });

  it("lists every scheme exactly once", () => {
    expect([...ALL_MOD].sort()).toEqual([...SCHEMES].sort());
  });

  it.each(SCHEMES)("ideal constellation of %s has 2^bitsPerSymbol points", (scheme) => {
    const points = idealConstellation(scheme);
    expect(points.length).toBe(2 ** MOD_INFO[scheme].bitsPerSymbol);
  });
});

describe("modulation · mapping", () => {
  it("pads the bitstream up to a whole number of symbols", () => {
    // 3 bits with QPSK (2 bit/symbol) → padded to 4 bits = 2 symbols
    const { symbols, paddedLength } = modulate([1, 0, 1], "qpsk");
    expect(paddedLength).toBe(4);
    expect(symbols.length).toBe(2);
  });

  it("maps BPSK bit 1→+1 and bit 0→-1 on the I axis", () => {
    const { symbols } = modulate([1, 0], "bpsk");
    expect(symbols).toEqual([
      { i: 1, q: 0 },
      { i: -1, q: 0 },
    ]);
  });

  it("uses Gray-coded amplitude levels for 16-QAM (adjacent levels differ by one bit)", () => {
    // (b0,b1) → I level : 00→-3, 01→-1, 11→+1, 10→+3
    const cases: Array<[Bit, Bit, number]> = [
      [0, 0, -3],
      [0, 1, -1],
      [1, 1, 1],
      [1, 0, 3],
    ];
    for (const [b0, b1, level] of cases) {
      const { symbols } = modulate([b0, b1, 0, 0], "qam16");
      expect(symbols[0].i).toBe(level);
    }
  });
});

describe("modulation · noiseless round-trip", () => {
  it.each(SCHEMES)("recovers the original bits through %s without noise", (scheme) => {
    const rng = seededRandom(0xa5a5 + scheme.length);
    const bits: Bit[] = Array.from({ length: 200 }, () => (rng() < 0.5 ? 0 : 1) as Bit);

    const { symbols } = modulate(bits, scheme);
    const recovered = demodulate(symbols, scheme).slice(0, bits.length);

    expect(recovered).toEqual(bits);
  });

  it("survives the worst-case all-extremes 16-QAM pattern", () => {
    const bits: Bit[] = [0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1];
    const { symbols } = modulate(bits, "qam16");
    expect(demodulate(symbols, "qam16")).toEqual(bits);
  });
});

describe("modulation · AWGN channel", () => {
  it("is the identity when sigma = 0", () => {
    const tx: ConstSymbol[] = [
      { i: 1, q: -1 },
      { i: -3, q: 3 },
    ];
    expect(applyAWGN(tx, 0)).toEqual(tx);
  });

  it("does not mutate the transmitted symbols", () => {
    const tx: ConstSymbol[] = [{ i: 1, q: 1 }];
    const snapshot = structuredClone(tx);
    vi.spyOn(Math, "random").mockImplementation(seededRandom(7));
    applyAWGN(tx, 0.5);
    expect(tx).toEqual(snapshot);
  });

  it("perturbs symbols when sigma > 0 but keeps them finite and same length", () => {
    vi.spyOn(Math, "random").mockImplementation(seededRandom(123));
    const tx: ConstSymbol[] = Array.from({ length: 50 }, () => ({ i: 1, q: -1 }));
    const rx = applyAWGN(tx, 0.6);

    expect(rx.length).toBe(tx.length);
    expect(rx.every((s) => Number.isFinite(s.i) && Number.isFinite(s.q))).toBe(true);
    expect(rx.some((s) => s.i !== 1 || s.q !== -1)).toBe(true);
  });

  it("small noise still demodulates back to the transmitted bits (within decision regions)", () => {
    vi.spyOn(Math, "random").mockImplementation(seededRandom(999));
    const bits: Bit[] = [1, 0, 1, 1, 0, 0, 1, 0];
    const { symbols } = modulate(bits, "qpsk");
    const rx = applyAWGN(symbols, 0.05); // far below the ±1 decision boundary
    expect(demodulate(rx, "qpsk").slice(0, bits.length)).toEqual(bits);
  });
});
