import { describe, expect, it } from "vitest";
import {
  bitsToBytes,
  bitsToGroupedBinaryText,
  bytesToBits,
  parseEncodedFile,
  parseGroupedBinaryText,
  serializeEncodedFile,
  type Bit,
} from "../../src/lib/bitstream/BitArray";
import { ALL_LDPC, LDPC_8_16, decodeLDPC, encodeLDPC, type LDPCCode } from "../../src/lib/encoders/LDPC";

const fixtures: Array<{ name: string; type: string; bytes: Uint8Array }> = [
  { name: "texto.txt", type: "text/plain", bytes: new TextEncoder().encode("noisybits LDPC test\ntexto plano\n") },
  { name: "audio.wav", type: "audio/wav", bytes: bytes([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45]) },
  { name: "imagen.png", type: "image/png", bytes: bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]) },
  { name: "video.mp4", type: "video/mp4", bytes: bytes([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]) },
  { name: "doc.pdf", type: "application/pdf", bytes: new TextEncoder().encode("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n") },
];

describe("LDPC file pipeline contract", () => {
  it("exposes LDPC rates 1/2, 2/3 and 3/4", () => {
    const rates = ALL_LDPC.map((code) => code.rate.toFixed(3));

    expect(rates).toContain((1 / 2).toFixed(3));
    expect(rates).toContain((2 / 3).toFixed(3));
    expect(rates).toContain((3 / 4).toFixed(3));
  });

  it.each(fixtures)("loads, encodes to binary txt and decodes $name", ({ bytes }) => {
    const encodedText = encodeFileToBinaryText(bytes, LDPC_8_16);
    expect(encodedText).toMatch(/^[01]{1,8}( [01]{1,8})*$/);

    const decoded = decodeBinaryTextToFile(encodedText, LDPC_8_16);

    expect(Array.from(decoded)).toEqual(Array.from(bytes));
  });

  it.each(fixtures)("recovers $name after modifying one encoded bit per selected block", ({ bytes }) => {
    const encodedText = encodeFileToBinaryText(bytes, LDPC_8_16);
    const encodedBits = parseGroupedBinaryText(encodedText);
    expect(encodedBits).not.toBeNull();

    const modified = encodedBits!.map((bit, index) => {
      const block = Math.floor(index / LDPC_8_16.n);
      const position = index % LDPC_8_16.n;
      return block % 3 === 0 && position === 2 ? ((bit ^ 1) as Bit) : bit;
    });

    const decoded = decodeBinaryTextToFile(bitsToGroupedBinaryText(modified), LDPC_8_16);

    expect(Array.from(decoded)).toEqual(Array.from(bytes));
  });
});

/* ============================================================
   End-to-end file roundtrip + noise injection.

   Exercises the same flow the UI uses:
     bytes → encodeLDPC per block → serializeEncodedFile (with
     # noisybits header) → parseEncodedFile → decodeLDPC per block
     → trim to meta.dataBits → bitsToBytes → original bytes.
   ============================================================ */
describe("LDPC end-to-end file roundtrip (file.png -> .txt -> file.png)", () => {
  it.each(fixtures)("restores $name byte-by-byte after encode/decode through a .txt", ({ name, type, bytes: original }) => {
    const encodedText = encodeFileToTxt(original, { name, type }, LDPC_8_16);

    expect(encodedText).toMatch(/^# noisybits v1 /);
    expect(encodedText).toContain(`name=${encodeURIComponent(name)}`);
    expect(encodedText).toContain(`type=${encodeURIComponent(type)}`);
    expect(encodedText).toContain(`dataBits=${original.length * 8}`);

    const restored = decodeTxtToFile(encodedText, LDPC_8_16);

    expect(restored.name).toBe(name);
    expect(restored.type).toBe(type);
    expect(restored.bytes.length).toBe(original.length);
    expect(Array.from(restored.bytes)).toEqual(Array.from(original));
  });

  it("restores a .png header + payload exactly after the .txt roundtrip", () => {
    const png = bytes([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    ]);

    const txt = encodeFileToTxt(png, { name: "tiny.png", type: "image/png" }, LDPC_8_16);
    const restored = decodeTxtToFile(txt, LDPC_8_16);

    expect(restored.bytes.slice(0, 8)).toEqual(png.slice(0, 8));
    expect(Array.from(restored.bytes)).toEqual(Array.from(png));
  });
});

describe("LDPC noise injection on the encoded .txt still restores the original", () => {
  it.each(fixtures)("recovers $name after random '1010' bit flips in the encoded .txt (1 flip per block)", ({ name, type, bytes: original }) => {
    const txt = encodeFileToTxt(original, { name, type }, LDPC_8_16);
    const noisy = injectRandom1010Noise(txt, LDPC_8_16, deterministicRng(0xC0DEC0DE));

    expect(noisy).not.toBe(txt);

    const restored = decodeTxtToFile(noisy, LDPC_8_16);

    expect(restored.name).toBe(name);
    expect(restored.bytes.length).toBe(original.length);
    expect(Array.from(restored.bytes)).toEqual(Array.from(original));
  });

  it("recovers a .png after random '1010' noise covering every block", () => {
    const png = bytes([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00,
    ]);

    const txt = encodeFileToTxt(png, { name: "noisy.png", type: "image/png" }, LDPC_8_16);
    const noisy = injectRandom1010Noise(txt, LDPC_8_16, deterministicRng(0xDEADBEEF));

    expect(noisy).not.toBe(txt);

    const restored = decodeTxtToFile(noisy, LDPC_8_16);

    expect(Array.from(restored.bytes)).toEqual(Array.from(png));
  });
});

/* ---------- helpers used by all blocks ---------- */

function encodeFileToBinaryText(fileBytes: Uint8Array, code: LDPCCode): string {
  const dataBits = bytesToBits(fileBytes);
  const padded = [...dataBits];
  while (padded.length % code.k !== 0) padded.push(0);

  const encoded: Bit[] = [];
  for (let i = 0; i < padded.length; i += code.k) {
    encoded.push(...encodeLDPC(code, padded.slice(i, i + code.k)).codeword);
  }

  return bitsToGroupedBinaryText(encoded);
}

function decodeBinaryTextToFile(encodedText: string, code: LDPCCode): Uint8Array {
  const encodedBits = parseGroupedBinaryText(encodedText);
  if (!encodedBits) throw new Error("encoded text did not contain binary bits");

  const decoded: Bit[] = [];
  for (let i = 0; i < encodedBits.length; i += code.n) {
    const block = encodedBits.slice(i, i + code.n);
    const trace = decodeLDPC(code, block);
    expect(trace.success).toBe(true);
    decoded.push(...trace.data);
  }

  return bitsToBytes(decoded);
}

function encodeFileToTxt(
  fileBytes: Uint8Array,
  meta: { name: string; type: string },
  code: LDPCCode,
): string {
  const dataBits = bytesToBits(fileBytes);
  const padded: Bit[] = [...dataBits];
  while (padded.length % code.k !== 0) padded.push(0 as Bit);

  const encoded: Bit[] = [];
  for (let i = 0; i < padded.length; i += code.k) {
    encoded.push(...encodeLDPC(code, padded.slice(i, i + code.k)).codeword);
  }

  return serializeEncodedFile(encoded, {
    name: meta.name,
    type: meta.type,
    dataBits: dataBits.length,
  });
}

function decodeTxtToFile(txt: string, code: LDPCCode): { name: string; type: string; bytes: Uint8Array } {
  const parsed = parseEncodedFile(txt);
  if (!parsed) throw new Error("encoded text did not parse");
  expect(parsed.meta).not.toBeNull();
  const meta = parsed.meta!;
  expect(parsed.bits.length % code.n).toBe(0);

  const decoded: Bit[] = [];
  for (let i = 0; i < parsed.bits.length; i += code.n) {
    const block = parsed.bits.slice(i, i + code.n);
    const trace = decodeLDPC(code, block);
    expect(trace.success).toBe(true);
    decoded.push(...trace.data);
  }

  const usable = decoded.slice(0, meta.dataBits);
  return { name: meta.name, type: meta.type, bytes: bitsToBytes(usable) };
}

/** Tiny deterministic LCG so the "random 1010 noise" tests are reproducible. */
function deterministicRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state;
  };
}

/**
 * Apply a 4-bit "1010" XOR pattern at a deterministic-random offset inside
 * each n-bit block of the encoded payload, but limited to one flipped bit
 * per block (the "1" in the leftmost position of the 1010 mask). This keeps
 * the noise within LDPC_8_16's correction budget while still producing
 * a meaningful change in the .txt.
 */
function injectRandom1010Noise(encodedTxt: string, code: LDPCCode, rng: () => number): string {
  const parsed = parseEncodedFile(encodedTxt);
  if (!parsed) throw new Error("noise injection: could not parse encoded txt");

  const bits = [...parsed.bits];
  const noisePattern: Bit[] = [1, 0, 1, 0];

  for (let block = 0; block < bits.length / code.n; block++) {
    const start = block * code.n;
    const offsetWithinBlock = rng() % code.n;
    // Apply the 1010 pattern, but only flip a single bit per block so a
    // correction-bounded code can recover. The XOR is on the leading "1".
    const flipAt = start + offsetWithinBlock;
    if (flipAt < bits.length) {
      bits[flipAt] = (bits[flipAt] ^ noisePattern[0]) as Bit;
    }
  }

  return serializeEncodedFile(bits, {
    name: parsed.meta!.name,
    type: parsed.meta!.type,
    dataBits: parsed.meta!.dataBits,
  });
}

function bytes(values: number[]): Uint8Array {
  return new Uint8Array(values);
}
