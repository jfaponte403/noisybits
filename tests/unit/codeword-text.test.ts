import { describe, expect, it } from "vitest";
import {
  bitsToCodewordText,
  parseGroupedBinaryText,
  type Bit,
} from "../../src/lib/bitstream/BitArray";

describe("bitsToCodewordText · agrupación por palabra de código", () => {
  it("separa mensaje y paridad para una tasa 4/7 (4 datos + 3 control)", () => {
    // dos palabras de código de 7 bits
    const bits: Bit[] = [1, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 1];
    const txt = bitsToCodewordText(bits, 7, 4);
    expect(txt).toBe("1010 110\n0011 101");
  });

  it("pone una palabra de código por línea", () => {
    const bits: Bit[] = [1, 1, 1, 1, 0, 0, 0, 0]; // n=4,k=2 → 2 palabras
    expect(bitsToCodewordText(bits, 4, 2).split("\n")).toHaveLength(2);
  });

  it("sigue siendo parseable: al quitar separadores se recuperan los bits", () => {
    const bits: Bit[] = [1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1];
    const txt = bitsToCodewordText(bits, 7, 4);
    expect(parseGroupedBinaryText(txt)).toEqual(bits);
  });

  it("sin paridad (k === n) no añade separador interno", () => {
    const bits: Bit[] = [1, 0, 1, 1];
    expect(bitsToCodewordText(bits, 4, 4)).toBe("1011");
  });

  it("tolera una última palabra incompleta sin romperse", () => {
    const bits: Bit[] = [1, 0, 1, 0, 1]; // 1 palabra completa de 4 + 1 bit suelto
    const txt = bitsToCodewordText(bits, 4, 2);
    expect(parseGroupedBinaryText(txt)).toEqual(bits);
  });
});
