import { describe, it, expect } from "vitest";
import { bitsToGroupedBinaryText, serializeEncodedFile, parseEncodedFile, type Bit } from "./BitArray";

/* La exportación a .txt debe agrupar según la tasa del código, no de a 8:
   con n=12 cada grupo es una palabra código completa, no medio bloque. */
describe("agrupación del .txt por tasa", () => {
  it("agrupa el flujo codificado por la longitud de bloque n", () => {
    const bits: Bit[] = Array.from({ length: 24 }, (_, i) => (i % 2) as Bit);
    const txt = serializeEncodedFile(bits, { name: "x", type: "text/plain", dataBits: 16 }, 12);
    const payload = txt.split("\n")[1];
    const groups = payload.split(" ");
    expect(groups).toHaveLength(2); // 24 bits / 12 = 2 grupos
    expect(groups[0]).toHaveLength(12);
  });

  it("agrupa los datos decodificados por k", () => {
    const bits: Bit[] = Array.from({ length: 24 }, () => 1 as Bit);
    const grouped = bitsToGroupedBinaryText(bits, 8);
    expect(grouped.split(" ")[0]).toHaveLength(8);
  });

  it("el parser ignora la agrupación: round-trip de bits intacto", () => {
    const bits: Bit[] = [1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0];
    const txt = serializeEncodedFile(bits, { name: "x", type: "text/plain", dataBits: 8 }, 12);
    const parsed = parseEncodedFile(txt);
    expect(parsed?.bits).toEqual(bits);
  });
});
