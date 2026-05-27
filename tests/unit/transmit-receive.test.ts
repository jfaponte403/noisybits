import { describe, expect, it } from "vitest";
import { runTransmit, runReceive, runFullChain } from "../../src/lib/fullChain";
import { ALL_LDPC, type LDPCCode } from "../../src/lib/encoders/LDPC";

function code(id: string): LDPCCode {
  const c = ALL_LDPC.find((x) => x.id === id);
  if (!c) throw new Error(`unknown code ${id}`);
  return c;
}

const params = {
  bytes: new TextEncoder().encode("HOLA"),
  sourceCode: code("ldpc_8_16"),
  channelCode: code("ldpc_8_16"),
  modulation: "qpsk" as const,
  noise: 0,
  manualFlips: 0,
};

describe("runTransmit / runReceive (fases separadas)", () => {
  it("runTransmit produce la señal transmitida sin decodificar", () => {
    const tx = runTransmit(params);
    expect(tx.channelEncoded.bits.length).toBe(tx.metrics.afterChannel);
    expect(tx.demod.bits.length).toBe(tx.metrics.afterChannel);
    // canal limpio → sin errores en el demodulado
    expect(tx.metrics.channelBitErrors).toBe(0);
    // no expone nada de la fase de recepción
    expect("channelDecoded" in tx).toBe(false);
  });

  it("runReceive decodifica una transmisión y recupera la fuente en canal limpio", () => {
    const tx = runTransmit(params);
    const rx = runReceive(tx, params);
    expect(rx.metrics.integrity).toBe(true);
    expect(Array.from(rx.recoveredBytes)).toEqual(Array.from(params.bytes));
    expect(rx.recoveredText).toBe("HOLA");
  });

  it("runFullChain equivale a transmit seguido de receive (canal limpio)", () => {
    const tx = runTransmit(params);
    const rx = runReceive(tx, params);
    const full = runFullChain(params);

    expect(full.channelEncoded.bits).toEqual(tx.channelEncoded.bits);
    expect(full.recoveredText).toBe(rx.recoveredText);
    expect(full.metrics.integrity).toBe(rx.metrics.integrity);
    expect(full.metrics.afterChannel).toBe(tx.metrics.afterChannel);
  });

  it("los errores manuales se cuentan en la fase de transmisión", () => {
    const tx = runTransmit({ ...params, manualFlips: 2 });
    expect(tx.metrics.manualFlips).toBe(2);
    expect(tx.metrics.channelBitErrors).toBe(2); // canal limpio: solo los manuales
  });
});
