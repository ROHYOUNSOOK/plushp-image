'use client';


import { useRef } from 'react';

const MAX_SIZE_MB = 10;

interface ImageUploadButtonProps {
  label: string;
  accept?: string;
  onFile: (file: File) => void;
}

export default function ImageUploadButton({ label, accept = 'image/*', onFile }: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        className="w-full text-xs py-1.5 px-3 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
      >
        {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            alert(`이미지 용량이 너무 큽니다.\n최대 ${MAX_SIZE_MB}MB까지 업로드 가능합니다.\n(현재 파일: ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
            e.target.value = '';
            return;
          }
          onFile(file);
          e.target.value = '';
        }}
      />
    </>
  );
}
