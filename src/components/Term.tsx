import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  label: string;
  children: ReactNode;
}

export function Term({ label, children }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span className="term-wrap" ref={ref}>
      <button
        type="button"
        className={`term-trigger${open ? " open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {label}
      </button>
      {open && (
        <span className="term-pop" role="dialog">
          <span className="term-pop-arrow" aria-hidden="true" />
          <span className="term-pop-title">{label}</span>
          <span className="term-pop-body">{children}</span>
        </span>
      )}
    </span>
  );
}

interface MatrixProps {
  rows: number[][];
  caption?: string;
}

export function Matrix({ rows, caption }: MatrixProps) {
  return (
    <span className="term-matrix">
      {caption && <span className="term-matrix-cap">{caption}</span>}
      <span className="term-matrix-grid">
        {rows.map((row, i) => (
          <span key={i} className="term-matrix-row">
            {row.map((v, j) => (
              <span key={j} className={`term-matrix-cell${v ? " on" : ""}`}>
                {v}
              </span>
            ))}
          </span>
        ))}
      </span>
    </span>
  );
}
