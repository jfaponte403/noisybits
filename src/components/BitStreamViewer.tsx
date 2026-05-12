import { useState } from "react";
import type { AnnotatedBit, BitType } from "../lib/bitstream/BitArray";

const CLS: Record<BitType, string> = {
  data: "",
  parity: "r",
  altered: "a",
  corrected: "c",
  uncorrected: "e",
};

const WINDOW = 512; // multiple of 64

export function BitGrid({
  bits,
  emptyHint = "Sin datos.",
}: {
  bits: AnnotatedBit[] | null;
  emptyHint?: string;
}) {
  const [offset, setOffset] = useState(0);

  if (!bits || bits.length === 0) {
    return (
      <div className="bitgrid-wrap">
        <div className="bitgrid-empty">{emptyHint}</div>
      </div>
    );
  }

  const max = Math.max(0, bits.length - WINDOW);
  const start = Math.min(offset, max);
  const view = bits.slice(start, start + WINDOW);
  const p = max === 0 ? 0 : (start / max) * 100;

  return (
    <div className="bitgrid-wrap">
      <div className="bitgrid-meta">
        <span className="l">
          mostrando bits {start.toLocaleString()}–{(start + view.length).toLocaleString()}
        </span>
        <span className="r">{bits.length.toLocaleString()} bits totales</span>
      </div>
      <div className="bitgrid">
        {view.map((b, i) => (
          <div
            key={i}
            className={"bit " + CLS[b.type]}
            data-bit-type={b.type}
            title={`#${start + i} · ${b.type}`}
          >
            {b.value}
          </div>
        ))}
      </div>
      {bits.length > WINDOW && (
        <input
          type="range"
          className="pager"
          min={0}
          max={max}
          value={start}
          onChange={(e) => setOffset(Number(e.target.value))}
          style={{ "--p": `${p}%` } as React.CSSProperties}
          aria-label="desplazar la vista de bits"
        />
      )}
    </div>
  );
}

export function Legend() {
  const items: [string, string][] = [
    ["data", "dato"],
    ["r", "redundancia"],
    ["a", "alterado en canal"],
    ["c", "corregido"],
    ["e", "error residual"],
  ];
  return (
    <div className="legend">
      {items.map(([cls, label]) => (
        <span key={cls} className={"chip " + cls}>
          <span className="sw" />
          {label}
        </span>
      ))}
    </div>
  );
}
