import { useEffect, useMemo, useState } from "react";
import { bitsToBytes, parseEncodedFile, unpackBits, type Bit, type EncodedFileMeta } from "../lib/bitstream/BitArray";
import type { PipelineResult } from "../lib/pipeline";
import { mediaKind } from "../lib/media/mediaKind";
import { usePipelineStore } from "../store/pipelineStore";
import { getCode } from "../lib/encoders/index";

interface LoadedFile {
  name: string;
  type: string;
  bytes: Uint8Array;
}

interface Props {
  file: LoadedFile;
  mode: "encode" | "decode";
}

type DecodedPreview =
  | { kind: "empty" }
  | { kind: "meta"; name: string; type: string; dataBits: number; bitCount: number; sample: string }
  | { kind: "raw"; sample: string; bitCount: number }
  | { kind: "invalid" };

export function FilePreview({ file, mode }: Props) {
  if (mode === "encode") return <EncodeSourcePreview file={file} />;
  return <DecodeSourcePreview file={file} />;
}

function EncodeSourcePreview({ file }: { file: LoadedFile }) {
  const url = useObjectUrl(file.bytes, file.type);
  const kind = mediaKind(file.type, file.name);

  return (
    <div className="preview">
      <div className="preview-head">vista previa · archivo original</div>
      <div className="preview-body">
        {kind === "image" && url && (
          <img src={url} alt={file.name} className="preview-image" />
        )}
        {kind === "audio" && url && (
          <audio src={url} controls className="preview-media" />
        )}
        {kind === "video" && url && (
          <video src={url} controls className="preview-media" />
        )}
        {kind === "text" && <TextSnippet bytes={file.bytes} />}
        {kind === "pdf" && url && (
          <a className="preview-link" href={url} target="_blank" rel="noreferrer">
            abrir PDF en nueva pestaña
          </a>
        )}
        {kind === "binary" && <BinarySnippet bytes={file.bytes} />}
      </div>
    </div>
  );
}

function DecodeSourcePreview({ file }: { file: LoadedFile }) {
  const codeId = usePipelineStore((s) => s.codeId);
  const blockSize = getCode(codeId).n;
  const preview = useMemo<DecodedPreview>(() => {
    if (!file.bytes.length) return { kind: "empty" };
    const text = safeDecodeText(file.bytes);
    if (text === null) return { kind: "invalid" };
    const parsed = parseEncodedFile(text);
    if (!parsed) return { kind: "invalid" };
    const sample = sampleBits(parsed.bits, blockSize);
    if (parsed.meta) {
      return {
        kind: "meta",
        name: parsed.meta.name,
        type: parsed.meta.type,
        dataBits: parsed.meta.dataBits,
        bitCount: parsed.bits.length,
        sample,
      };
    }
    return { kind: "raw", sample, bitCount: parsed.bits.length };
  }, [file, blockSize]);

  return (
    <div className="preview">
      <div className="preview-head">vista previa · archivo codificado</div>
      <div className="preview-body">
        {preview.kind === "empty" && <span className="preview-muted">archivo vacío</span>}
        {preview.kind === "invalid" && (
          <span className="preview-muted">
            contenido no reconocido como .txt de bits
          </span>
        )}
        {preview.kind === "meta" && (
          <div className="preview-meta">
            <div>
              <span className="preview-key">media original</span>
              <span className="preview-val mono">{preview.name}</span>
            </div>
            <div>
              <span className="preview-key">mime</span>
              <span className="preview-val mono">{preview.type}</span>
            </div>
            <div>
              <span className="preview-key">bits de datos</span>
              <span className="preview-val mono">{preview.dataBits.toLocaleString()}</span>
            </div>
            <div>
              <span className="preview-key">bits codificados</span>
              <span className="preview-val mono">{preview.bitCount.toLocaleString()}</span>
            </div>
            <div className="preview-sample mono">{preview.sample}</div>
          </div>
        )}
        {preview.kind === "raw" && (
          <div className="preview-meta">
            <div>
              <span className="preview-key">bits</span>
              <span className="preview-val mono">{preview.bitCount.toLocaleString()}</span>
            </div>
            <div className="preview-muted">
              sin cabecera embebida — se restaurará como archivo binario sin nombre original
            </div>
            <div className="preview-sample mono">{preview.sample}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Preview of the reconstructed media after running the decode pipeline. */
export function DecodedFilePreview({ result, fallbackName }: { result: PipelineResult; fallbackName: string }) {
  const reconstructed = useMemo(() => buildReconstructed(result, fallbackName), [result, fallbackName]);
  const url = useObjectUrl(reconstructed.bytes, reconstructed.type);
  const kind = mediaKind(reconstructed.type, reconstructed.name);

  return (
    <div className="preview">
      <div className="preview-head">vista previa · archivo reconstruido</div>
      <div className="preview-body">
        <div className="preview-meta">
          <div>
            <span className="preview-key">nombre</span>
            <span className="preview-val mono">{reconstructed.name}</span>
          </div>
          <div>
            <span className="preview-key">mime</span>
            <span className="preview-val mono">{reconstructed.type}</span>
          </div>
          <div>
            <span className="preview-key">bytes</span>
            <span className="preview-val mono">{reconstructed.bytes.length.toLocaleString()}</span>
          </div>
        </div>
        {kind === "image" && url && (
          <img src={url} alt={reconstructed.name} className="preview-image" />
        )}
        {kind === "audio" && url && <audio src={url} controls className="preview-media" />}
        {kind === "video" && url && <video src={url} controls className="preview-media" />}
        {kind === "text" && <TextSnippet bytes={reconstructed.bytes} />}
        {kind === "pdf" && url && (
          <a className="preview-link" href={url} target="_blank" rel="noreferrer">
            abrir PDF en nueva pestaña
          </a>
        )}
        {kind === "binary" && <BinarySnippet bytes={reconstructed.bytes} />}
      </div>
    </div>
  );
}

interface Reconstructed {
  name: string;
  type: string;
  bytes: Uint8Array;
}

function buildReconstructed(result: PipelineResult, fallbackName: string): Reconstructed {
  const meta: EncodedFileMeta | null = result.sourceMeta ?? null;
  const allBits = unpackBits(result.decoded.bits, result.decoded.length);
  const usableBits =
    meta && meta.dataBits > 0 && meta.dataBits <= allBits.length
      ? allBits.slice(0, meta.dataBits)
      : allBits;
  const bytes = bitsToBytes(usableBits as Bit[]);
  return {
    name: meta?.name ?? `decoded_${fallbackName}`,
    type: meta?.type || "application/octet-stream",
    bytes,
  };
}

function TextSnippet({ bytes }: { bytes: Uint8Array }) {
  const sample = useMemo(() => {
    const slice = bytes.slice(0, 600);
    try {
      return new TextDecoder("utf-8", { fatal: false }).decode(slice);
    } catch {
      return "";
    }
  }, [bytes]);
  return <pre className="preview-text mono">{sample}{bytes.length > 600 ? "…" : ""}</pre>;
}

function BinarySnippet({ bytes }: { bytes: Uint8Array }) {
  const sample = useMemo(() => {
    const limit = Math.min(64, bytes.length);
    const hex: string[] = [];
    for (let i = 0; i < limit; i++) hex.push(bytes[i].toString(16).padStart(2, "0"));
    return hex.join(" ");
  }, [bytes]);
  return (
    <div className="preview-meta">
      <span className="preview-muted">no se puede previsualizar este formato — primeros bytes:</span>
      <div className="preview-sample mono">{sample}{bytes.length > 64 ? " …" : ""}</div>
    </div>
  );
}

function useObjectUrl(bytes: Uint8Array, type: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    const blob = new Blob([buffer], { type: type || "application/octet-stream" });
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [bytes, type]);
  return url;
}

function safeDecodeText(bytes: Uint8Array): string | null {
  const limit = Math.min(bytes.length, 65536);
  try {
    const head = new TextDecoder("utf-8", { fatal: true }).decode(bytes.slice(0, limit));
    if (limit === bytes.length) return head;
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return null;
  }
}

function sampleBits(bits: number[], groupSize = 8): string {
  // Agrupa por la longitud de bloque n del código para que cada grupo sea una
  // palabra código completa (no medio bloque, como pasaría agrupando de a 8).
  const size = groupSize > 0 ? groupSize : 8;
  const limit = Math.min(bits.length, Math.max(96, size * 6));
  const groups: string[] = [];
  for (let i = 0; i < limit; i += size) groups.push(bits.slice(i, i + size).join(""));
  return groups.join(" ") + (bits.length > limit ? " …" : "");
}
