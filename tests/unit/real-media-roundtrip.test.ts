import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  bitsToBytes,
  bytesToBits,
  parseEncodedFile,
  serializeEncodedFile,
  type Bit,
} from "../../src/lib/bitstream/BitArray";
import { LDPC_8_16, decodeLDPC, encodeLDPC, type LDPCCode } from "../../src/lib/encoders/LDPC";
import { mediaKind } from "../../src/lib/media/mediaKind";
import { sha256Sync } from "../helpers/sha256-sync";

/* ============================================================
   Real-file roundtrip — uses the binaries dropped in tests/media.
   Each fixture covers a different renderer in step 5:
     image.jpg  → <img>
     audio.mp3  → <audio>
     video.mp4  → <video>
     texto.pdf  → pdf link

   The user reported the video case erroring out in the UI; this
   suite exercises the same pipeline that the workers run, plus the
   .txt serialization that the download/upload cycle relies on.
   ============================================================ */

const MEDIA_DIR = resolve(fileURLToPath(new URL("../media", import.meta.url)));

interface RealFixture {
  file: string;
  name: string;
  type: string;
  expectedKind: ReturnType<typeof mediaKind>;
}

const fixtures: RealFixture[] = [
  { file: "image.jpg", name: "image.jpg", type: "image/jpeg", expectedKind: "image" },
  { file: "audio.mp3", name: "audio.mp3", type: "audio/mpeg", expectedKind: "audio" },
  { file: "texto.pdf", name: "texto.pdf", type: "application/pdf", expectedKind: "pdf" },
  { file: "video.mp4", name: "video.mp4", type: "video/mp4", expectedKind: "video" },
];

describe.each(fixtures)("real media roundtrip · $name", ({ file, name, type, expectedKind }) => {
  const bytes = readFileSync(resolve(MEDIA_DIR, file));
  const original = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  it(
    "encodes to .txt and decodes back to byte-identical bytes",
    () => {
      const txt = encodeFileToTxt(original, { name, type }, LDPC_8_16);

      expect(txt.startsWith("# noisybits v1 ")).toBe(true);
      expect(txt).toContain(`name=${encodeURIComponent(name)}`);
      expect(txt).toContain(`type=${encodeURIComponent(type)}`);
      expect(txt).toContain(`dataBits=${original.length * 8}`);

      const restored = decodeTxtToFile(txt, LDPC_8_16);

      expect(restored.name).toBe(name);
      expect(restored.type).toBe(type);
      expect(restored.bytes.length).toBe(original.length);
      // Hash check is faster than `expect(Array.from(a)).toEqual(...)` on
      // megabyte buffers (vitest's deep-equal is O(n) but with overhead).
      expect(sha256Sync(restored.bytes)).toBe(sha256Sync(original));
      // Step-5 renderer would pick the right element for this media.
      expect(mediaKind(restored.type, restored.name)).toBe(expectedKind);
    },
    30_000,
  );
});

/* ---------- helpers ---------- */

function encodeFileToTxt(
  fileBytes: Uint8Array,
  meta: { name: string; type: string },
  code: LDPCCode,
): string {
  const dataBits = bytesToBits(fileBytes);
  const padded: Bit[] = dataBits.slice();
  while (padded.length % code.k !== 0) padded.push(0 as Bit);

  const encoded: Bit[] = new Array(padded.length * (code.n / code.k));
  let outIdx = 0;
  const block = new Array<Bit>(code.k);
  for (let i = 0; i < padded.length; i += code.k) {
    for (let j = 0; j < code.k; j++) block[j] = padded[i + j];
    const { codeword } = encodeLDPC(code, block);
    for (let j = 0; j < codeword.length; j++) encoded[outIdx++] = codeword[j];
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

  expect(parsed.bits.length % code.n).toBe(0);

  const decoded: Bit[] = new Array((parsed.bits.length / code.n) * code.k);
  let outIdx = 0;
  const block = new Array<Bit>(code.n);
  for (let i = 0; i < parsed.bits.length; i += code.n) {
    for (let j = 0; j < code.n; j++) block[j] = parsed.bits[i + j];
    const trace = decodeLDPC(code, block);
    if (!trace.success) {
      throw new Error(`decode failed at block #${i / code.n}: syndrome ${trace.syndrome.join("")}`);
    }
    for (let j = 0; j < trace.data.length; j++) decoded[outIdx++] = trace.data[j];
  }

  const usable = decoded.slice(0, meta.dataBits);
  return { name: meta.name, type: meta.type, bytes: bitsToBytes(usable) };
}
