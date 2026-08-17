"use client";

import { useRef, useState } from "react";

interface DropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export default function Dropzone({ onFile, disabled }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const isValid = /\.(pdf|csv)$/i.test(file.name);
    if (!isValid) return;
    onFile(file);
  }

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      className={`flex flex-col items-center justify-center gap-4 border border-dashed px-6 py-20 text-center transition-colors duration-150 ${
        disabled
          ? "border-neutral-200 bg-neutral-50 cursor-not-allowed"
          : isDragging
            ? "border-neutral-900 bg-neutral-50 cursor-pointer"
            : "border-neutral-300 bg-white hover:border-neutral-400 hover:bg-neutral-50 cursor-pointer"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.csv,application/pdf,text/csv"
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />

      <svg
        width="34"
        height="34"
        viewBox="0 0 34 34"
        fill="none"
        className={disabled ? "text-neutral-300" : "text-neutral-400"}
      >
        <rect x="1" y="1" width="32" height="32" rx="16" stroke="currentColor" strokeWidth="1" />
        <path
          d="M17 22V12M17 12L12.5 16.5M17 12L21.5 16.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-neutral-800">
          {disabled ? "Processing statement…" : "Drag and drop a statement here"}
        </p>
        {!disabled && <p className="text-xs text-neutral-400">or click to browse</p>}
      </div>

      <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-300">PDF or CSV</p>
    </div>
  );
}
