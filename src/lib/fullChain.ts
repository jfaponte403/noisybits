import {
  bytesToBits,
  bitsToBytes,
  type Bit,
  type BitType,
} from "./bitstream/BitArray";
import { encodeLDPC, decodeLDPC, type LDPCCode } from "./encoders/LDPC";
import {
  modulate,
  demodulate,
  applyAWGN,
  type ConstSymbol,
  type ModScheme,
} from "./modulation/modulation";

/** Bits + metadatos por bit, listos para visualizar en una rejilla. */
export interface TaggedBits {
  bits: Bit[];
  metadata: Record<number, BitType>;
}

export interface FullChainParams {
  bytes: Uint8Array; // señal fuente (texto codificado o archivo)
  sourceCode: LDPCCode;
  channelCode: LDPCCode;
  modulation: ModScheme;
  noise: number; // sigma del canal AWGN
  manualFlips?: number; // bits extra alterados aleatoriamente antes de decodificar
}

export interface FullChainResult {
  // Transmisor
  source: TaggedBits; // bits originales de la fuente
  sourceEncoded: TaggedBits; // tras codificación de fuente (LDPC)
  channelEncoded: TaggedBits; // tras codificación de canal (LDPC)
  symbolsTx: ConstSymbol[]; // tras modulación
  // Canal
  symbolsRx: ConstSymbol[]; // tras canal AWGN
  // Receptor
  demod: TaggedBits; // tras demodulación (marca bits alterados)
  channelDecoded: TaggedBits; // tras decodificación de canal
  sourceDecoded: TaggedBits; // tras decodificación de fuente (marca residuales)
  recoveredText: string;
  metrics: {
    sourceBits: number;
    afterSource: number;
    afterChannel: number;
    symbols: number;
    channelBitErrors: number; // errores introducidos por el canal (pre-decodificación)
    manualFlips: number; // bits alterados manualmente de forma aleatoria
    berChannel: number;
    residualBitErrors: number; // errores que quedaron en la fuente recuperada
    berFinal: number;
    integrity: boolean;
    elapsedMs: number;
  };
  recoveredBytes: Uint8Array;
}

/** Codifica una secuencia de bits en bloques de k → n, rellenando con ceros el último bloque. */
function encodeBlocks(code: LDPCCode, bits: Bit[]): { out: Bit[]; metadata: Record<number, BitType> } {
  const out: Bit[] = [];
  const metadata: Record<number, BitType> = {};
  for (let i = 0; i < bits.length; i += code.k) {
    const block: Bit[] = [];
    for (let j = 0; j < code.k; j++) block.push((bits[i + j] ?? 0) as Bit);
    const { codeword } = encodeLDPC(code, block);
    const base = out.length;
    for (let j = 0; j < codeword.length; j++) {
      out.push(codeword[j]);
      metadata[base + j] = j < code.k ? "data" : "parity";
    }
  }
  return { out, metadata };
}

/** Decodifica bloques de n → k recuperando los bits de información. */
function decodeBlocks(code: LDPCCode, bits: Bit[]): Bit[] {
  const out: Bit[] = [];
  for (let i = 0; i < bits.length; i += code.n) {
    const block: Bit[] = [];
    for (let j = 0; j < code.n; j++) block.push((bits[i + j] ?? 0) as Bit);
    const { data } = decodeLDPC(code, block);
    out.push(...data);
  }
  return out;
}

function plainMeta(bits: Bit[], type: BitType): Record<number, BitType> {
  const m: Record<number, BitType> = {};
  for (let i = 0; i < bits.length; i++) m[i] = type;
  return m;
}

/** Resultado de la fase de transmisión (hasta la señal recibida con errores). */
export interface TransmitResult {
  source: TaggedBits;
  sourceEncoded: TaggedBits;
  channelEncoded: TaggedBits;
  symbolsTx: ConstSymbol[];
  symbolsRx: ConstSymbol[];
  demod: TaggedBits;
  metrics: {
    sourceBits: number;
    afterSource: number;
    afterChannel: number;
    symbols: number;
    channelBitErrors: number;
    manualFlips: number;
    berChannel: number;
    elapsedMs: number;
  };
}

/** Resultado de la fase de recepción (decodificación → mensaje recuperado). */
export interface ReceiveResult {
  channelDecoded: TaggedBits;
  sourceDecoded: TaggedBits;
  recoveredText: string;
  recoveredBytes: Uint8Array;
  metrics: {
    residualBitErrors: number;
    berFinal: number;
    integrity: boolean;
    elapsedMs: number;
  };
}

/**
 * FASE 1 · Transmisión: fuente → cod. fuente → cod. canal → modulación →
 * canal con ruido (AWGN) + errores manuales → demodulación.
 * Devuelve la señal recibida (con errores) lista para decodificar.
 */
export function runTransmit(params: FullChainParams): TransmitResult {
  const t0 = performance.now();
  const { sourceCode, channelCode, modulation, noise } = params;
  const manualFlipCount = Math.max(0, Math.floor(params.manualFlips ?? 0));

  const sourceBits = bytesToBits(params.bytes);
  const srcEnc = encodeBlocks(sourceCode, sourceBits);
  const chEnc = encodeBlocks(channelCode, srcEnc.out);

  const { symbols: symbolsTx } = modulate(chEnc.out, modulation);
  const symbolsRx = applyAWGN(symbolsTx, noise);

  const demodAll = demodulate(symbolsRx, modulation);
  const demodBits = demodAll.slice(0, chEnc.out.length);

  // Alteración manual: se voltean bits aleatorios extra
  let manualFlips = 0;
  if (manualFlipCount > 0 && demodBits.length > 0) {
    const positions = new Set<number>();
    const target = Math.min(manualFlipCount, demodBits.length);
    while (positions.size < target) {
      positions.add(Math.floor(Math.random() * demodBits.length));
    }
    for (const p of positions) demodBits[p] = (demodBits[p] ^ 1) as Bit;
    manualFlips = positions.size;
  }

  const demodMeta: Record<number, BitType> = {};
  let channelBitErrors = 0;
  for (let i = 0; i < demodBits.length; i++) {
    if (demodBits[i] !== chEnc.out[i]) {
      demodMeta[i] = "altered";
      channelBitErrors++;
    } else {
      demodMeta[i] = chEnc.metadata[i] ?? "data";
    }
  }

  return {
    source: { bits: sourceBits, metadata: plainMeta(sourceBits, "data") },
    sourceEncoded: { bits: srcEnc.out, metadata: srcEnc.metadata },
    channelEncoded: { bits: chEnc.out, metadata: chEnc.metadata },
    symbolsTx,
    symbolsRx,
    demod: { bits: demodBits, metadata: demodMeta },
    metrics: {
      sourceBits: sourceBits.length,
      afterSource: srcEnc.out.length,
      afterChannel: chEnc.out.length,
      symbols: symbolsTx.length,
      channelBitErrors,
      manualFlips,
      berChannel: demodBits.length ? channelBitErrors / demodBits.length : 0,
      elapsedMs: performance.now() - t0,
    },
  };
}

/**
 * FASE 2 · Recepción: decod. canal → decod. fuente → mensaje recuperado.
 * Toma la señal recibida (de `runTransmit`) y los mismos códigos.
 */
export function runReceive(tx: TransmitResult, params: FullChainParams): ReceiveResult {
  const t0 = performance.now();
  const { sourceCode, channelCode } = params;

  const sourceBits = tx.source.bits;
  const srcEncBits = tx.sourceEncoded.bits;
  const srcEncMeta = tx.sourceEncoded.metadata;

  // Decodificación de canal (LDPC corrige)
  const chDecoded = decodeBlocks(channelCode, tx.demod.bits).slice(0, srcEncBits.length);
  const chDecodedMeta: Record<number, BitType> = {};
  for (let i = 0; i < chDecoded.length; i++) {
    chDecodedMeta[i] = chDecoded[i] !== srcEncBits[i] ? "uncorrected" : srcEncMeta[i] ?? "data";
  }

  // Decodificación de fuente (LDPC)
  const srcDecoded = decodeBlocks(sourceCode, chDecoded).slice(0, sourceBits.length);
  const srcDecodedMeta: Record<number, BitType> = {};
  let residualBitErrors = 0;
  for (let i = 0; i < srcDecoded.length; i++) {
    if (srcDecoded[i] !== sourceBits[i]) {
      srcDecodedMeta[i] = "uncorrected";
      residualBitErrors++;
    } else {
      srcDecodedMeta[i] = "corrected";
    }
  }

  const recoveredBytes = bitsToBytes(srcDecoded);
  let recoveredText: string;
  try {
    recoveredText = new TextDecoder("utf-8", { fatal: false }).decode(recoveredBytes);
  } catch {
    recoveredText = "";
  }

  return {
    channelDecoded: { bits: chDecoded, metadata: chDecodedMeta },
    sourceDecoded: { bits: srcDecoded, metadata: srcDecodedMeta },
    recoveredText,
    recoveredBytes,
    metrics: {
      residualBitErrors,
      berFinal: sourceBits.length ? residualBitErrors / sourceBits.length : 0,
      integrity: residualBitErrors === 0,
      elapsedMs: performance.now() - t0,
    },
  };
}

/**
 * Ejecuta toda la cadena de comunicación digital de una sola vez
 * (transmisión + recepción). Útil para tests y para una corrida completa.
 */
export function runFullChain(params: FullChainParams): FullChainResult {
  const tx = runTransmit(params);
  const rx = runReceive(tx, params);

  return {
    source: tx.source,
    sourceEncoded: tx.sourceEncoded,
    channelEncoded: tx.channelEncoded,
    symbolsTx: tx.symbolsTx,
    symbolsRx: tx.symbolsRx,
    demod: tx.demod,
    channelDecoded: rx.channelDecoded,
    sourceDecoded: rx.sourceDecoded,
    recoveredText: rx.recoveredText,
    metrics: {
      sourceBits: tx.metrics.sourceBits,
      afterSource: tx.metrics.afterSource,
      afterChannel: tx.metrics.afterChannel,
      symbols: tx.metrics.symbols,
      channelBitErrors: tx.metrics.channelBitErrors,
      manualFlips: tx.metrics.manualFlips,
      berChannel: tx.metrics.berChannel,
      residualBitErrors: rx.metrics.residualBitErrors,
      berFinal: rx.metrics.berFinal,
      integrity: rx.metrics.integrity,
      elapsedMs: tx.metrics.elapsedMs + rx.metrics.elapsedMs,
    },
    recoveredBytes: rx.recoveredBytes,
  };
}
