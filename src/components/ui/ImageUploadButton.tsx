'use client';


import { useRef } from 'react';

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
          onFile(file);
          e.target.value = '';
        }}
      />
    </>
  );
}
