import type { Bit } from "../bitstream/BitArray";

/** Bit Error Rate between two equal-length bit arrays. */
export function ber(a: Bit[], b: Bit[]): number {
  const n = Math.min(a.length, b.length);
  return n === 0 ? 0 : countDiff(a, b) / n;
}

export function countDiff(a: Bit[], b: Bit[]): number {
  const n = Math.min(a.length, b.length);
  let errors = 0;
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) errors++;
  return errors;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const digest = await crypto.subtle.digest("SHA-256", buf as ArrayBuffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
