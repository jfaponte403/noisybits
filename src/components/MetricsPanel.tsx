import { usePipelineStore, extensionFor } from "../store/pipelineStore";

export function ResultsBar() {
  const { result, file } = usePipelineStore();
  if (!result) return null;
  const m = result.metrics;

  return (
    <div className="statusbar">
      <Item k="código" v={result.code.label} />
      <span className="sep">·</span>
      <Item k="tasa" v={fmtRate(result.code.k, result.code.n)} />
      <span className="sep">·</span>
      <Item k="ber pre" v={pct(m.berPreDecode)} />
      <span className="sep">·</span>
      <Item k="ber post" v={pct(m.berPostDecode)} tone={m.berPostDecode ? "err" : undefined} />
      <span className="sep">·</span>
      <Item k="bloques corregidos" v={String(m.blocksCorrected)} />
      <span className="sep">·</span>
      <Item k="no corregibles" v={String(m.blocksUncorrectable)} tone={m.blocksUncorrectable ? "err" : undefined} />
      <span className="sep">·</span>
      <Item k="integridad" v={m.integrity ? "ok" : "falla"} tone={m.integrity ? "ok" : "err"} />
      <span className="sep">·</span>
      <Item k="tiempo" v={`${m.elapsedMs.toFixed(0)} ms`} />

      <div className="dls">
        <Dl label="encoded.bin" bytes={result.encodedBytes} name="encoded.bin" mime="application/octet-stream" />
        <Dl label="received.bin" bytes={result.receivedBytes} name="received.bin" mime="application/octet-stream" />
        <Dl
          label={`decoded${extensionFor(file?.name ?? "")}`}
          bytes={result.decodedBytes}
          name={`decoded${extensionFor(file?.name ?? "")}`}
          mime={file?.type || "application/octet-stream"}
        />
      </div>
    </div>
  );
}

function Item({ k, v, tone }: { k: string; v: string; tone?: "ok" | "err" }) {
  return (
    <span className="item">
      <span className="k">{k}</span>
      <span className={"v" + (tone ? " " + tone : "")}>{v}</span>
    </span>
  );
}

function Dl({ label, bytes, name, mime }: { label: string; bytes: Uint8Array; name: string; mime: string }) {
  return (
    <button
      className="btn btn-sm"
      onClick={() => {
        const buf = bytes.slice().buffer as ArrayBuffer;
        const url = URL.createObjectURL(new Blob([buf], { type: mime }));
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      }}
    >
      ↓ {label}
    </button>
  );
}

function pct(x: number) {
  return `${(x * 100).toFixed(2)} %`;
}
function fmtRate(k: number, n: number) {
  const g = gcd(k, n) || 1;
  return `${k / g}/${n / g}`;
}
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
