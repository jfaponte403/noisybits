import * as Comlink from "comlink";
import { decodeLDPC, type LDPCCode } from "../lib/encoders/LDPC";
import { type Bit } from "../lib/bitstream/BitArray";

const worker = {
  decodeLDPC(code: LDPCCode, received: Bit[]) {
    return decodeLDPC(code, received);
  }
};

Comlink.expose(worker);
