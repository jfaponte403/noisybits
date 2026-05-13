import { describe, expect, it } from "vitest";
import {
  bitsToBytes,
  bitsToGroupedBinaryText,
  bytesToBits,
  parseGroupedBinaryText,
  type Bit,
} from "../../src/lib/bitstream/BitArray";
import { ALL_LDPC, LDPC_8_16, decodeLDPC, encodeLDPC, type LDPCCode } from "../../src/lib/encoders/LDPC";

const fixtures: Array<{ name: string; bytes: Uint8Array }> = [
  { name: "texto", bytes: new TextEncoder().encode("noisybits LDPC test\ntexto plano\n") },
  { name: "audio", bytes: bytes([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45]) },
  { name: "imagen", bytes: bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]) },
  { name: "video", bytes: bytes([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]) },
  { name: "pdf", bytes: new TextEncoder().encode("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n") },
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
    expect(encodedText).toMatch(/^[01]{1,3}( [01]{1,3})*$/);

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

function bytes(values: number[]): Uint8Array {
  return new Uint8Array(values);
}
