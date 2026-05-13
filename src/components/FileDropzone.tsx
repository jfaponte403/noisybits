import { useRef, useState } from "react";
import { usePipelineStore } from "../store/pipelineStore";
import { FileUp, File as FileIcon } from "lucide-react";

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
          <div className="ic">
            {file ? <FileIcon size={16} /> : <FileUp size={16} />}
          </div>
          {file ? (
            <div className="flex-1 min-w-0">
              <div className="name">{file.name}</div>
              <div className="sub">
                {file.type || "binario"} · {file.bytes.length.toLocaleString()} bytes
              </div>
            </div>
          ) : (
            <div className="flex-1">
              <div className="name" style={{ whiteSpace: "normal" }}>
                Arrastrá un archivo o hacé clic
              </div>
              <div className="formats">
                .txt · .pdf · .png · .jpg · .wav · .mp3 · .mp4 · máx 50 MB
              </div>
            </div>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.pdf,.png,.jpg,.jpeg,.wav,.mp3,.mp4,text/plain,application/pdf,image/png,image/jpeg,audio/wav,audio/mpeg,video/mp4"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void loadFile(f);
          e.target.value = "";
        }}
      />
      {file && (
        <button className="linklike mt-2" onClick={(e) => { e.stopPropagation(); clearFile(); }}>
          quitar archivo
        </button>
      )}
    </div>
  );
}
