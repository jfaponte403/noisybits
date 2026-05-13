export type MediaKind = "image" | "audio" | "video" | "text" | "pdf" | "binary";

const TEXT_EXTS = new Set(["txt", "md", "json", "csv", "log"]);
const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "avif"]);
const AUDIO_EXTS = new Set(["wav", "mp3", "ogg", "flac", "aac", "m4a"]);
const VIDEO_EXTS = new Set(["mp4", "webm", "mov", "mkv", "avi"]);
const PDF_EXTS = new Set(["pdf"]);

/**
 * Classifies a file by MIME type first, then extension. Used by the preview
 * components and the algorithm-process "media visualization" step to decide
 * which renderer (<img>, <audio>, <video>, <pre>, pdf link, hex dump) applies.
 */
export function mediaKind(type: string, name: string): MediaKind {
  const t = (type ?? "").toLowerCase();
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("audio/")) return "audio";
  if (t.startsWith("video/")) return "video";
  if (t === "application/pdf") return "pdf";
  if (t.startsWith("text/") || t === "application/json") return "text";

  const ext = (name ?? "").toLowerCase().split(".").pop() ?? "";
  if (IMAGE_EXTS.has(ext)) return "image";
  if (AUDIO_EXTS.has(ext)) return "audio";
  if (VIDEO_EXTS.has(ext)) return "video";
  if (PDF_EXTS.has(ext)) return "pdf";
  if (TEXT_EXTS.has(ext)) return "text";
  return "binary";
}
