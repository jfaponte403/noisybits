import { afterEach, describe, expect, it, vi } from "vitest";
import { runFullChain } from "../../src/lib/fullChain";
import { ALL_LDPC, type LDPCCode } from "../../src/lib/encoders/LDPC";
import { bitsToGroupedBinaryText, parseGroupedBinaryText } from "../../src/lib/bitstream/BitArray";
import type { ModScheme } from "../../src/lib/modulation/modulation";

/* ============================================================
   Flujo completo end-to-end, en el orden que pide el usuario:

     1. subir cualquier archivo (bytes arbitrarios)
     2. codificar la fuente (LDPC)
     3. codificar el canal (LDPC)
     4. modular
     5. obtener el .txt codificado (descargable)
     6. alterar ese codificado agregándole errores
     7. (descargar el recibido con errores)
     8. decodificar
     9. recuperar el mensaje

   Todos los parámetros (tasa de fuente, tasa de canal, modulación,
   ruido y número de errores) son variables en cada caso.
   ============================================================ */

function code(id: string): LDPCCode {
  const c = ALL_LDPC.find((x) => x.id === id);
  if (!c) throw new Error(`unknown code ${id}`);
  return c;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

// Una "imagen" binaria cualquiera (cabecera PNG + payload) — no es texto.
const ARCHIVO = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
]);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("flujo completo · subir archivo → codificar → .txt → recuperar", () => {
  it("recupera el archivo byte a byte en un canal limpio", () => {
    const r = runFullChain({
      bytes: ARCHIVO,
      sourceCode: code("ldpc_8_12"),
      channelCode: code("ldpc_8_16"),
      modulation: "qpsk",
      noise: 0,
      manualFlips: 0,
    });

    expect(r.metrics.integrity).toBe(true);
    expect(Array.from(r.recoveredBytes)).toEqual(Array.from(ARCHIVO));
  });

  it("el .txt codificado descargable se vuelve a leer idéntico (descargar → re-subir)", () => {
    const r = runFullChain({
      bytes: ARCHIVO,
      sourceCode: code("ldpc_8_16"),
      channelCode: code("ldpc_8_16"),
      modulation: "bpsk",
      noise: 0,
    });

    // Lo que descarga el botón "Descargar codificado (.txt)".
    const txt = bitsToGroupedBinaryText(r.channelEncoded.bits);
    expect(txt).toMatch(/^[01]{1,8}( [01]{1,8})*$/);

    // Al re-subirlo, los bits son exactamente los transmitidos.
    const reparsed = parseGroupedBinaryText(txt);
    expect(reparsed).toEqual(r.channelEncoded.bits);
  });

  it("inyectar errores corregibles altera el .txt recibido pero el mensaje se recupera", () => {
    vi.spyOn(Math, "random").mockImplementation(seededRandom(0x1234));
    const r = runFullChain({
      bytes: ARCHIVO,
      sourceCode: code("ldpc_8_16"),
      channelCode: code("ldpc_8_16"),
      modulation: "qpsk",
      noise: 0,
      manualFlips: 1, // dentro del presupuesto de corrección
    });

    const enviado = bitsToGroupedBinaryText(r.channelEncoded.bits);
    const recibido = bitsToGroupedBinaryText(r.demod.bits);

    // El .txt recibido (con errores) difiere del codificado original...
    expect(recibido).not.toBe(enviado);
    expect(r.metrics.channelBitErrors).toBe(1);
    // ...pero LDPC lo corrige y se recupera el archivo intacto.
    expect(r.metrics.integrity).toBe(true);
    expect(Array.from(r.recoveredBytes)).toEqual(Array.from(ARCHIVO));
  });

  it("demasiados errores rompen la integridad (se ven errores residuales)", () => {
    vi.spyOn(Math, "random").mockImplementation(seededRandom(0x9999));
    const r = runFullChain({
      bytes: ARCHIVO,
      sourceCode: code("ldpc_8_16"),
      channelCode: code("ldpc_8_16"),
      modulation: "qpsk",
      noise: 0,
      manualFlips: 80,
    });

    expect(r.metrics.channelBitErrors).toBe(80);
    expect(r.metrics.integrity).toBe(false);
    expect(r.metrics.residualBitErrors).toBeGreaterThan(0);
  });

  // El flujo debe funcionar variando TODOS los parámetros.
  const rates = ["ldpc_8_24", "ldpc_8_16", "ldpc_8_12", "ldpc_20_25", "ldpc_42_48"];
  const mods: ModScheme[] = ["bpsk", "qpsk", "qam16"];
  const matrix = rates.flatMap((src) => mods.map((mod) => ({ src, mod })));

  it.each(matrix)("variando parámetros: fuente=$src canal=ldpc_8_16 mod=$mod recupera en canal limpio", ({ src, mod }) => {
    const r = runFullChain({
      bytes: ARCHIVO,
      sourceCode: code(src),
      channelCode: code("ldpc_8_16"),
      modulation: mod,
      noise: 0,
      manualFlips: 0,
    });
    expect(r.metrics.integrity).toBe(true);
    expect(Array.from(r.recoveredBytes)).toEqual(Array.from(ARCHIVO));
  });
});
