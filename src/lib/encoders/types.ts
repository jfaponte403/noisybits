import type { Bit } from "../bitstream/BitArray";

export type Algorithm = "ldpc";
export type CodeRate = "1/2" | "2/3" | "3/4" | "5/6" | "7/8";

export interface BaseCode {
  id: string;
  label: string;
  n: number;
  k: number;
  rate: number;
  algorithm: Algorithm;
}

export interface ChannelCoder<TCode extends BaseCode, TEncodeTrace, TDecodeTrace> {
  encodeBlock(code: TCode, data: Bit[]): TEncodeTrace;
  decodeBlock(code: TCode, received: Bit[]): TDecodeTrace;
}
