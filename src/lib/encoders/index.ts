import { ALL_LDPC, LDPC_8_16, type LDPCCode } from "./LDPC";

export const ALL_CODES: LDPCCode[] = [
  ...ALL_LDPC,
];

export const DEFAULT_CODE_ID = LDPC_8_16.id;

export function getCode(id: string): LDPCCode {
  return ALL_CODES.find((c) => c.id === id) ?? ALL_LDPC[0];
}

export type AnyCode = LDPCCode;
