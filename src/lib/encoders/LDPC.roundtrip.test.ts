import { describe, it, expect } from "vitest";
import {
  encodeLDPC,
  decodeLDPC,
  LDPC_7_4,
  LDPC_8_16,
  LDPC_8_24,
  type LDPCCode,
} from "./LDPC";
import { bytesToBits, bitsToBytes, type Bit } from "../bitstream/BitArray";

/* ============================================================
   Round-trip: codificar → alterar los PRIMEROS bits → decodificar
   y comprobar que el mensaje se recupera intacto.

   Reproduce el caso que fallaba con una imagen: el truco es que
   el decoder por síndrome corrige ~1 error por bloque, así que los
   errores deben repartirse (un bit por bloque), no amontonarse todos
   en el primer bloque. Estos tests fijan ese contrato.
   ============================================================ */

/** Codifica un flujo de bits en bloques de k → n (rellenando con ceros). */
function encodeStream(code: LDPCCode, bits: Bit[]): Bit[] {
  const out: Bit[] = [];
  for (let i = 0; i < bits.length; i += code.k) {
    const block: Bit[] = [];
    for (let j = 0; j < code.k; j++) block.push((bits[i + j] ?? 0) as Bit);
    out.push(...encodeLDPC(code, block).codeword);
  }
  return out;
}

/** Decodifica un flujo de bloques de n → k recuperando los datos. */
function decodeStream(code: LDPCCode, bits: Bit[]): Bit[] {
  const out: Bit[] = [];
  for (let i = 0; i < bits.length; i += code.n) {
    const block: Bit[] = [];
    for (let j = 0; j < code.n; j++) block.push((bits[i + j] ?? 0) as Bit);
    out.push(...decodeLDPC(code, block).data);
  }
  return out;
}

const CODES: LDPCCode[] = [LDPC_7_4, LDPC_8_16, LDPC_8_24];

describe("LDPC round-trip", () => {
  it("recupera exacto sin errores", () => {
    for (const code of CODES) {
      const bits = bytesToBits(new TextEncoder().encode("HOLA MUNDO"));
      const encoded = encodeStream(code, bits);
      const decoded = decodeStream(code, encoded).slice(0, bits.length);
      expect(decoded).toEqual(bits);
    }
  });

  it("recupera el mensaje al voltear el PRIMER bit de cada bloque", () => {
    for (const code of CODES) {
      const bits = bytesToBits(new TextEncoder().encode("Imagen de prueba 123"));
      const encoded = encodeStream(code, bits);

      // Un error por bloque, siempre en la primera posición del bloque.
      for (let i = 0; i < encoded.length; i += code.n) {
        encoded[i] = (encoded[i] ^ 1) as Bit;
      }

      const decoded = decodeStream(code, encoded).slice(0, bits.length);
      expect(decoded).toEqual(bits);
    }
  });

  it("recupera bytes idénticos: el primer bit del mensaje alterado", () => {
    for (const code of CODES) {
      const original = new TextEncoder().encode("foto.png contenido binario simulado");
      const bits = bytesToBits(original);
      const encoded = encodeStream(code, bits);

      // Volteamos el primer bit del primer bloque (un único error, dentro de capacidad).
      encoded[0] = (encoded[0] ^ 1) as Bit;

      const decoded = decodeStream(code, encoded).slice(0, bits.length);
      const recovered = bitsToBytes(decoded);
      expect(Array.from(recovered)).toEqual(Array.from(original));
    }
  });

  it("documenta el límite: demasiados errores juntos en un bloque NO se corrigen", () => {
    // Hamming(7,4): corrige 1 error por bloque. Dos errores en el mismo bloque
    // exceden la capacidad y el dato recuperado difiere — esto es lo que hacía
    // fallar a las imágenes cuando se alteraban varios bits seguidos.
    const code = LDPC_7_4;
    const bits = bytesToBits(new TextEncoder().encode("X"));
    const encoded = encodeStream(code, bits);
    // Dos errores en el primer bloque.
    encoded[0] = (encoded[0] ^ 1) as Bit;
    encoded[1] = (encoded[1] ^ 1) as Bit;
    const decoded = decodeStream(code, encoded).slice(0, bits.length);
    expect(decoded).not.toEqual(bits);
  });
});
