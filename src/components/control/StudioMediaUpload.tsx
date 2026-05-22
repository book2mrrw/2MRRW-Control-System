"use client";

import { CloudUpload } from "lucide-react";
import { useEffect, useId, useRef, useState, type DragEvent } from "react";

type StudioMediaUploadProps = {
  mode: "cover" | "audio";
  accept: string;
  previewUrl?: string;
  previewIsVideo?: boolean;
  fileName?: string;
  specs: string;
  mainLabel: string;
  subLabel: string;
  buttonLabel: string;
  validationLine?: { ok: boolean; text: string } | null;
  canUpload: boolean;
  audioFormat?: string;
  audioFormats?: string[];
  onAudioFormatChange?: (value: string) => void;
  onFileSelected: (file: File | null) => void;
  onUpload: () => void;
};

export function StudioMediaUpload({
  mode,
  accept,
  previewUrl,
  previewIsVideo,
  fileName,
  specs,
  mainLabel,
  subLabel,
  buttonLabel,
  validationLine,
  canUpload,
  audioFormat,
  audioFormats,
  onAudioFormatChange,
  onFileSelected,
  onUpload
}: StudioMediaUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const pickFile = () => inputRef.current?.click();

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    onFileSelected(event.dataTransfer.files?.[0] ?? null);
  };

  return (
    <div className={`studio-upload studio-upload-${mode}`}>
      <div
        className={`studio-upload-preview${previewUrl ? " has-media" : ""}`}
        onClick={pickFile}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            pickFile();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={previewUrl ? "Replace selected file" : "Select file"}
      >
        {previewUrl ? (
          previewIsVideo ? (
            <video autoPlay loop muted playsInline src={previewUrl} />
          ) : mode === "audio" ? (
            <div className="studio-upload-audio-preview">
              <strong>{fileName}</strong>
              <span>Ready to upload</span>
            </div>
          ) : (
            <img alt="Selected cover preview" src={previewUrl} />
          )
        ) : (
          <span className="studio-upload-preview-empty">No file selected</span>
        )}
      </div>

      <div className="studio-upload-side">
        {mode === "audio" && audioFormats?.length ? (
          <label className="studio-upload-format">
            <span>Format</span>
            <select value={audioFormat} onChange={(event) => onAudioFormatChange?.(event.target.value)}>
              {audioFormats.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div
          className={`studio-upload-dropzone${dragOver ? " drag-over" : ""}${fileName ? " has-file" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={pickFile}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              pickFile();
            }
          }}
          role="button"
          tabIndex={0}
        >
          <CloudUpload size={28} aria-hidden />
          <strong>{mainLabel}</strong>
          <span>{subLabel}</span>
        </div>

        <p className="studio-upload-specs">{specs}</p>

        <button type="button" className="studio-upload-submit" disabled={!canUpload} onClick={onUpload}>
          {buttonLabel}
        </button>

        {validationLine ? (
          <p className={`studio-upload-validation${validationLine.ok ? " ok" : " err"}`}>
            {validationLine.ok ? "✓" : "✗"} {validationLine.text}
          </p>
        ) : null}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        className="studio-upload-input"
        type="file"
        accept={accept}
        onChange={(event) => onFileSelected(event.currentTarget.files?.[0] ?? null)}
      />
    </div>
  );
}
