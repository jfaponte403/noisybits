import { afterEach, describe, expect, it, vi } from "vitest";
import { runFullChain } from "../../src/lib/fullChain";
import { ALL_LDPC, type LDPCCode } from "../../src/lib/encoders/LDPC";
import { ALL_MOD, MOD_INFO, type ModScheme } from "../../src/lib/modulation/modulation";

function code(id: string): LDPCCode {
  const c = ALL_LDPC.find((x) => x.id === id);
  if (!c) throw new Error(`unknown code ${id}`);
  return c;
}

/** Rates required by the spec: 1/3, 1/2, 2/3, 4/5, 7/8. */
const RATE_IDS = ["ldpc_8_24", "ldpc_8_16", "ldpc_8_12", "ldpc_20_25", "ldpc_42_48"];

/** Deterministic LCG so flip/noise placement is reproducible. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const textBytes = (s: string) => new TextEncoder().encode(s);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("full chain · clean channel (noise 0, no flips)", () => {
  it("recovers the source exactly and reports integrity", () => {
    const r = runFullChain({
      bytes: textBytes("HOLA"),
      sourceCode: code("ldpc_8_16"),
      channelCode: code("ldpc_8_16"),
      modulation: "qpsk",
      noise: 0,
      manualFlips: 0,
    });

    expect(r.metrics.integrity).toBe(true);
    expect(r.metrics.channelBitErrors).toBe(0);
    expect(r.metrics.residualBitErrors).toBe(0);
    expect(r.recoveredText).toBe("HOLA");
    expect(Array.from(r.recoveredBytes)).toEqual(Array.from(textBytes("HOLA")));
  });

  // Cartesian product of every required rate × every modulation scheme.
  const combos = RATE_IDS.flatMap((id) => ALL_MOD.map((mod) => ({ id, mod })));
  it.each(combos)("round-trips through rate $id + $mod without noise", ({ id, mod }) => {
    const r = runFullChain({
      bytes: textBytes("noisybits"),
      sourceCode: code(id),
      channelCode: code(id),
      modulation: mod as ModScheme,
      noise: 0,
      manualFlips: 0,
    });
    expect(r.metrics.integrity).toBe(true);
    expect(Array.from(r.recoveredBytes)).toEqual(Array.from(textBytes("noisybits")));
  });
});

describe("full chain · pipeline dimensions", () => {
  it("reports consistent bit/symbol counts across stages", () => {
    const src = code("ldpc_8_16");
    const ch = code("ldpc_8_16");
    const mod: ModScheme = "qam16";
    const r = runFullChain({ bytes: textBytes("HOLA"), sourceCode: src, channelCode: ch, modulation: mod, noise: 0 });

    const m = r.metrics;
    expect(m.sourceBits).toBe(4 * 8); // "HOLA" = 4 bytes
    expect(m.afterSource % src.n).toBe(0);
    expect(m.afterSource).toBe((m.sourceBits / src.k) * src.n);
    expect(m.afterChannel % ch.n).toBe(0);
    expect(m.symbols).toBe(Math.ceil(m.afterChannel / MOD_INFO[mod].bitsPerSymbol));
  });

  it("pads correctly when the source is not block-aligned", () => {
    const src = code("ldpc_20_25"); // k=20, 32 bits → padded to 40
    const r = runFullChain({
      bytes: textBytes("Hi"), // 16 bits
      sourceCode: src,
      channelCode: code("ldpc_8_16"),
      modulation: "bpsk",
      noise: 0,
    });
    expect(r.metrics.sourceBits).toBe(16);
    expect(r.metrics.integrity).toBe(true);
    expect(Array.from(r.recoveredBytes)).toEqual(Array.from(textBytes("Hi")));
  });
});

describe("full chain · manual bit flips", () => {
  it("injects exactly the requested number of flips (deterministic at noise 0)", () => {
    vi.spyOn(Math, "random").mockImplementation(seededRandom(0xc0de));
    const r = runFullChain({
      bytes: textBytes("HOLA"),
      sourceCode: code("ldpc_8_16"),
      channelCode: code("ldpc_8_16"),
      modulation: "qpsk",
      noise: 0,
      manualFlips: 3,
    });
    // With no AWGN, every altered bit is a manual flip.
    expect(r.metrics.manualFlips).toBe(3);
    expect(r.metrics.channelBitErrors).toBe(3);
  });

  it("corrects a single injected error (within LDPC budget) and stays intact", () => {
    vi.spyOn(Math, "random").mockImplementation(seededRandom(1));
    const r = runFullChain({
      bytes: textBytes("HOLA"),
      sourceCode: code("ldpc_8_16"),
      channelCode: code("ldpc_8_16"),
      modulation: "qpsk",
      noise: 0,
      manualFlips: 1,
    });
    expect(r.metrics.channelBitErrors).toBe(1);
    expect(r.metrics.integrity).toBe(true);
    expect(Array.from(r.recoveredBytes)).toEqual(Array.from(textBytes("HOLA")));
  });

  it("leaves residual errors when flips overwhelm the correction budget", () => {
    vi.spyOn(Math, "random").mockImplementation(seededRandom(0xbad));
    const r = runFullChain({
      bytes: textBytes("HOLA"),
      sourceCode: code("ldpc_8_16"),
      channelCode: code("ldpc_8_16"),
      modulation: "qpsk",
      noise: 0,
      manualFlips: 40, // far beyond what 96 coded bits can repair
    });
    expect(r.metrics.channelBitErrors).toBe(40);
    expect(r.metrics.integrity).toBe(false);
    expect(r.metrics.residualBitErrors).toBeGreaterThan(0);
  });

  it("never flips more bits than the coded stream has", () => {
    vi.spyOn(Math, "random").mockImplementation(seededRandom(5));
    const r = runFullChain({
      bytes: textBytes("A"), // tiny stream
      sourceCode: code("ldpc_8_16"),
      channelCode: code("ldpc_8_16"),
      modulation: "qpsk",
      noise: 0,
      manualFlips: 10_000,
    });
    expect(r.metrics.manualFlips).toBeLessThanOrEqual(r.metrics.afterChannel);
  });
});

describe("full chain · arbitrary binary input", () => {
  it("round-trips raw bytes (non-text) without noise", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const r = runFullChain({
      bytes: png,
      sourceCode: code("ldpc_8_12"),
      channelCode: code("ldpc_8_16"),
      modulation: "qam16",
      noise: 0,
    });
    expect(r.metrics.integrity).toBe(true);
    expect(Array.from(r.recoveredBytes)).toEqual(Array.from(png));
  });
});
