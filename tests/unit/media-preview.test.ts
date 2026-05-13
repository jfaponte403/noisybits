import { describe, expect, it } from "vitest";
import { mediaKind, type MediaKind } from "../../src/lib/media/mediaKind";
import {
  bitsToBytes,
  bytesToBits,
  parseEncodedFile,
  serializeEncodedFile,
  type Bit,
} from "../../src/lib/bitstream/BitArray";
import { LDPC_8_16, decodeLDPC, encodeLDPC, type LDPCCode } from "../../src/lib/encoders/LDPC";

/* ============================================================
   Step 5 of the pipeline: media visualization.

   The UI uses `mediaKind(type, name)` to decide which renderer
   to use for a given file (<img>, <audio>, <video>, <pre>, pdf
   link, hex dump). These tests validate that decision across the
   formats the README claims to support, and that the decode flow
   yields the exact original bytes back so the preview is faithful.
   ============================================================ */

describe("mediaKind decision (step 5 renderer selection)", () => {
  const cases: Array<{ name: string; type: string; expected: MediaKind }> = [
    // images
    { name: "diagram.png", type: "image/png", expected: "image" },
    { name: "photo.jpg", type: "image/jpeg", expected: "image" },
    { name: "scan.jpeg", type: "image/jpeg", expected: "image" },
    { name: "frame.webp", type: "image/webp", expected: "image" },
    { name: "icon.svg", type: "image/svg+xml", expected: "image" },
    // audio
    { name: "tone.wav", type: "audio/wav", expected: "audio" },
    { name: "song.mp3", type: "audio/mpeg", expected: "audio" },
    { name: "voice.ogg", type: "audio/ogg", expected: "audio" },
    { name: "lossless.flac", type: "audio/flac", expected: "audio" },
    // video
    { name: "clip.mp4", type: "video/mp4", expected: "video" },
    { name: "stream.webm", type: "video/webm", expected: "video" },
    { name: "movie.mkv", type: "video/x-matroska", expected: "video" },
    // text
    { name: "notes.txt", type: "text/plain", expected: "text" },
    { name: "data.json", type: "application/json", expected: "text" },
    { name: "page.md", type: "text/markdown", expected: "text" },
    { name: "rows.csv", type: "text/csv", expected: "text" },
    // pdf
    { name: "paper.pdf", type: "application/pdf", expected: "pdf" },
    // binary fallback
    { name: "blob.bin", type: "application/octet-stream", expected: "binary" },
    { name: "unknown", type: "", expected: "binary" },
  ];

  it.each(cases)("classifies $name ($type) as $expected", ({ name, type, expected }) => {
    expect(mediaKind(type, name)).toBe(expected);
  });

  it("falls back to extension when MIME type is empty", () => {
    expect(mediaKind("", "thing.png")).toBe("image");
    expect(mediaKind("", "thing.wav")).toBe("audio");
    expect(mediaKind("", "thing.mp4")).toBe("video");
    expect(mediaKind("", "thing.pdf")).toBe("pdf");
    expect(mediaKind("", "thing.json")).toBe("text");
  });

  it("trusts MIME type over extension when both are present", () => {
    expect(mediaKind("image/png", "weird.exe")).toBe("image");
    expect(mediaKind("audio/wav", "data.bin")).toBe("audio");
  });
});

describe("step 5: media bytes survive encode -> .txt -> decode for every supported format", () => {
  const fixtures: Array<{ name: string; type: string; kind: MediaKind; bytes: Uint8Array }> = [
    {
      name: "tiny.png",
      type: "image/png",
      kind: "image",
      bytes: new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      ]),
    },
    {
      name: "tone.wav",
      type: "audio/wav",
      kind: "audio",
      bytes: new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
        0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20,
        0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
      ]),
    },
    {
      name: "clip.mp4",
      type: "video/mp4",
      kind: "video",
      bytes: new Uint8Array([
        0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70,
        0x6d, 0x70, 0x34, 0x32, 0x00, 0x00, 0x00, 0x00,
        0x6d, 0x70, 0x34, 0x32, 0x69, 0x73, 0x6f, 0x6d,
      ]),
    },
    {
      name: "notes.txt",
      type: "text/plain",
      kind: "text",
      bytes: new TextEncoder().encode("noisybits — step 5 media preview\nmulti-line ok\n"),
    },
    {
      name: "paper.pdf",
      type: "application/pdf",
      kind: "pdf",
      bytes: new TextEncoder().encode("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n"),
    },
  ];

  it.each(fixtures)("$kind ($name) restores byte-identical and keeps preview kind = $kind", ({ name, type, kind, bytes: original }) => {
    const txt = encodeFileToTxt(original, { name, type }, LDPC_8_16);
    const restored = decodeTxtToFile(txt, LDPC_8_16);

    expect(restored.name).toBe(name);
    expect(restored.type).toBe(type);
    expect(Array.from(restored.bytes)).toEqual(Array.from(original));
    // The reconstructed file MUST classify as the same media kind so the
    // step-5 visualization picks the same renderer the user expects.
    expect(mediaKind(restored.type, restored.name)).toBe(kind);
  });
});

/* ---------- helpers (kept local so this file is self-contained) ---------- */

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
  if (!parsed || !parsed.meta) throw new Error("could not parse encoded txt");
  const meta = parsed.meta;

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
