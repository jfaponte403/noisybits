import * as Comlink from "comlink";
import { decodeLDPC, type LDPCCode } from "../lib/encoders/LDPC";
import { type Bit, type BitType } from "../lib/bitstream/BitArray";

export interface DecodeAllResult {
  decoded: Bit[];
  metadata: Record<number, BitType>;
  errorsCorrected: number;
  errorsUncorrected: number;
}

const worker = {
  decodeLDPC(code: LDPCCode, received: Bit[]) {
    return decodeLDPC(code, received);
  },

  /**
   * Decodes a whole received bit stream in a single worker hop. Avoids the
   * Comlink-per-block round-trips that made large media (e.g. ~1MB video)
   * effectively unusable.
   */
  decodeAllBlocks(code: LDPCCode, received: Bit[]): DecodeAllResult {
    const k = code.k;
    const n = code.n;
    const blocks = received.length / n;
    const decoded: Bit[] = new Array(blocks * k);
    const metadata: Record<number, BitType> = {};
    let errorsCorrected = 0;
    let errorsUncorrected = 0;

    const block = new Array<Bit>(n);
    let outIdx = 0;
    for (let i = 0; i < received.length; i += n) {
      for (let j = 0; j < n; j++) block[j] = received[i + j];
      const dec = decodeLDPC(code, block);
      errorsCorrected += dec.correctedPositions.length;
      if (!dec.success) {
        for (let s = 0; s < dec.syndrome.length; s++) if (dec.syndrome[s] === 1) errorsUncorrected++;
      }
      // Cheap Set lookup avoids quadratic includes() on long correctedPositions.
      const corrected = dec.correctedPositions.length
        ? new Set(dec.correctedPositions.filter((p) => p < k))
        : null;
      for (let j = 0; j < k; j++) {
        decoded[outIdx] = dec.data[j];
        metadata[outIdx] = corrected && corrected.has(j) ? "corrected" : "data";
        outIdx++;
      }
    }

    return { decoded, metadata, errorsCorrected, errorsUncorrected };
  },
};

export type DecoderWorker = typeof worker;

Comlink.expose(worker);
