import * as Comlink from "comlink";
import { encodeLDPC, type LDPCCode } from "../lib/encoders/LDPC";
import { type Bit, type BitType } from "../lib/bitstream/BitArray";

export interface EncodeAllResult {
  encoded: Bit[];
  metadata: Record<number, BitType>;
}

const worker = {
  encodeLDPC(code: LDPCCode, data: Bit[]) {
    return encodeLDPC(code, data);
  },

  /**
   * Encodes a whole padded bit stream in a single worker hop. Avoids the
   * Comlink-per-block round-trips that made large media (e.g. ~1MB video)
   * effectively unusable.
   */
  encodeAllBlocks(code: LDPCCode, paddedData: Bit[]): EncodeAllResult {
    const k = code.k;
    const n = code.n;
    const blocks = paddedData.length / k;
    const encoded: Bit[] = new Array(blocks * n);
    const metadata: Record<number, BitType> = {};

    const block = new Array<Bit>(k);
    let outIdx = 0;
    for (let i = 0; i < paddedData.length; i += k) {
      for (let j = 0; j < k; j++) block[j] = paddedData[i + j];
      const { codeword } = encodeLDPC(code, block);
      for (let j = 0; j < n; j++) {
        encoded[outIdx] = codeword[j];
        metadata[outIdx] = j < k ? "data" : "parity";
        outIdx++;
      }
    }

    return { encoded, metadata };
  },
};

export type EncoderWorker = typeof worker;

Comlink.expose(worker);
