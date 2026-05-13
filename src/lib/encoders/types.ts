export type Algorithm = "ldpc";

export interface BaseCode {
  id: string;
  label: string;
  n: number;
  k: number;
  rate: number;
  algorithm: Algorithm;
}
