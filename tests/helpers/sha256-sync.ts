import { createHash } from "node:crypto";

/** Synchronous SHA-256 helper for test fixtures — faster than deep-equal on megabyte buffers. */
export function sha256Sync(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
