import { useState } from "react";
import type { BitType } from "../lib/bitstream/BitArray";

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
  metadata,
  emptyHint = "Sin datos.",
  onBitClick,
}: {
  bits: number[] | null;
  metadata?: Record<number, BitType>;
  emptyHint?: string;
  onBitClick?: (globalIndex: number) => void;
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
      <div className={"bitgrid" + (onBitClick ? " interactive" : "")}>
        {view.map((val, i) => {
          const gi = start + i;
          const type = metadata?.[gi] || "data";
          const cls = "bit " + CLS[type];
          if (onBitClick) {
            return (
              <button
                key={i}
                type="button"
                className={cls}
                data-bit-type={type}
                title={`#${gi} · ${type} · clic para inspeccionar`}
                onClick={() => onBitClick(gi)}
              >
                {val}
              </button>
            );
          }
          return (
            <div key={i} className={cls} data-bit-type={type} title={`#${gi} · ${type}`}>
              {val}
            </div>
          );
        })}
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
  const items: [BitType, string][] = [
    ["data", "dato"],
    ["parity", "redundancia"],
    ["altered", "alterado en canal"],
    ["corrected", "corregido"],
    ["uncorrected", "error residual"],
  ];
  return (
    <div className="legend">
      {items.map(([type, label]) => (
        <span key={type} className={"chip " + CLS[type]}>
          <span className="sw" />
          {label}
        </span>
      ))}
    </div>
  );
}
