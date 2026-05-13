import * as Comlink from "comlink";
import { encodeLDPC, type LDPCCode } from "../lib/encoders/LDPC";
import { type Bit } from "../lib/bitstream/BitArray";

const worker = {
  encodeLDPC(code: LDPCCode, data: Bit[]) {
    return encodeLDPC(code, data);
  }
};

Comlink.expose(worker);
