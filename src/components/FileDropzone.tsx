import { useRef, useState } from "react";
import { usePipelineStore } from "../store/pipelineStore";

export function FileDropzone() {
  const { file, loadFile, clearFile } = usePipelineStore();
  const [hover, setHover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div
        className={"drop" + (hover ? " hover" : "")}
        onDragOver={(e) => {
          e.preventDefault();
          setHover(true);
        }}
        onDragLeave={() => setHover(false)}
        onDrop={(e) => {
          e.preventDefault();
          setHover(false);
          const f = e.dataTransfer.files[0];
          if (f) void loadFile(f);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
      >
        <div className="row">
          <span className="ic">{file ? "▣" : "+"}</span>
          {file ? (
            <div style={{ minWidth: 0 }}>
              <div className="name">{file.name}</div>
              <div className="sub">
                {file.type} · {file.bytes.length.toLocaleString()} bytes
              </div>
            </div>
          ) : (
            <div>
              <div className="name" style={{ whiteSpace: "normal" }}>
                Arrastrá un archivo o hacé clic
              </div>
              <div className="formats">.txt · .png · .jpg · .wav · .mp3 · .mp4 · máx 50 MB</div>
            </div>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.png,.jpg,.jpeg,.wav,.mp3,.mp4,text/plain,image/png,image/jpeg,audio/wav,audio/mpeg,video/mp4"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void loadFile(f);
          e.target.value = "";
        }}
      />
      {file && (
        <button className="linklike" style={{ marginTop: 8 }} onClick={clearFile}>
          quitar archivo
        </button>
      )}
    </div>
  );
}
