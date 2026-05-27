import type { Bit } from "../bitstream/BitArray";

/** Esquemas de modulación digital soportados en la cadena completa. */
export type ModScheme = "bpsk" | "qpsk" | "qam16";

/** Un símbolo en el plano de constelación (componentes en fase I y cuadratura Q). */
export interface ConstSymbol {
  i: number;
  q: number;
}

export const MOD_INFO: Record<ModScheme, { label: string; bitsPerSymbol: number; description: string }> = {
  bpsk: { label: "BPSK", bitsPerSymbol: 1, description: "1 bit por símbolo · 2 puntos sobre el eje I" },
  qpsk: { label: "QPSK", bitsPerSymbol: 2, description: "2 bits por símbolo · 4 puntos en cuadratura" },
  qam16: { label: "16-QAM", bitsPerSymbol: 4, description: "4 bits por símbolo · rejilla 4×4" },
};

export const ALL_MOD: ModScheme[] = ["bpsk", "qpsk", "qam16"];

/** Niveles de amplitud Gray para un par de bits (00,01,11,10) → (-3,-1,+1,+3). */
const GRAY_LEVELS: number[] = [-3, -1, 3, 1]; // index = (b0<<1)|b1
const LEVEL_VALUES = [-3, -1, 1, 3];

function bitsToLevel(b0: Bit, b1: Bit): number {
  return GRAY_LEVELS[(b0 << 1) | b1];
}

function levelToBits(level: number): [Bit, Bit] {
  const idx = GRAY_LEVELS.indexOf(level);
  return [(idx >> 1) & 1, idx & 1];
}

function nearestLevel(value: number): number {
  let best = LEVEL_VALUES[0];
  let bestDist = Infinity;
  for (const lv of LEVEL_VALUES) {
    const d = Math.abs(value - lv);
    if (d < bestDist) {
      bestDist = d;
      best = lv;
    }
  }
  return best;
}

/** Devuelve los puntos ideales de la constelación (sin ruido) para dibujar la rejilla. */
export function idealConstellation(scheme: ModScheme): ConstSymbol[] {
  switch (scheme) {
    case "bpsk":
      return [
        { i: -1, q: 0 },
        { i: 1, q: 0 },
      ];
    case "qpsk":
      return [
        { i: -1, q: -1 },
        { i: -1, q: 1 },
        { i: 1, q: -1 },
        { i: 1, q: 1 },
      ];
    case "qam16": {
      const pts: ConstSymbol[] = [];
      for (const i of LEVEL_VALUES) for (const q of LEVEL_VALUES) pts.push({ i, q });
      return pts;
    }
  }
}

/** Mapea bits a símbolos. Rellena con ceros hasta completar el último símbolo. */
export function modulate(bits: Bit[], scheme: ModScheme): { symbols: ConstSymbol[]; paddedLength: number } {
  const bps = MOD_INFO[scheme].bitsPerSymbol;
  const padded = bits.slice();
  while (padded.length % bps !== 0) padded.push(0 as Bit);

  const symbols: ConstSymbol[] = [];
  for (let s = 0; s < padded.length; s += bps) {
    switch (scheme) {
      case "bpsk":
        symbols.push({ i: padded[s] ? 1 : -1, q: 0 });
        break;
      case "qpsk":
        symbols.push({ i: padded[s] ? 1 : -1, q: padded[s + 1] ? 1 : -1 });
        break;
      case "qam16":
        symbols.push({
          i: bitsToLevel(padded[s], padded[s + 1]),
          q: bitsToLevel(padded[s + 2], padded[s + 3]),
        });
        break;
    }
  }
  return { symbols, paddedLength: padded.length };
}

/** Demodulación por decisión dura: cada símbolo recibido se asigna al punto ideal más cercano. */
export function demodulate(symbols: ConstSymbol[], scheme: ModScheme): Bit[] {
  const bits: Bit[] = [];
  for (const sym of symbols) {
    switch (scheme) {
      case "bpsk":
        bits.push((sym.i >= 0 ? 1 : 0) as Bit);
        break;
      case "qpsk":
        bits.push((sym.i >= 0 ? 1 : 0) as Bit, (sym.q >= 0 ? 1 : 0) as Bit);
        break;
      case "qam16": {
        const [bi0, bi1] = levelToBits(nearestLevel(sym.i));
        const [bq0, bq1] = levelToBits(nearestLevel(sym.q));
        bits.push(bi0, bi1, bq0, bq1);
        break;
      }
    }
  }
  return bits;
}

/** Ruido gaussiano (Box–Muller) con desviación estándar sigma. */
function gaussian(sigma: number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Canal AWGN: suma ruido gaussiano independiente a cada componente I/Q. */
export function applyAWGN(symbols: ConstSymbol[], sigma: number): ConstSymbol[] {
  if (sigma <= 0) return symbols.map((s) => ({ ...s }));
  return symbols.map((s) => ({
    i: s.i + gaussian(sigma),
    q: s.q + gaussian(sigma),
  }));
}
