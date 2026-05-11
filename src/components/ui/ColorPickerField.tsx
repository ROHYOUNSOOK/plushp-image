'use client';


import { useState, useRef, useEffect } from 'react';
import { HexColorPicker, HexColorInput } from 'react-colorful';

interface ColorPickerFieldProps {
  label: string;
  color: string;
  onChange: (color: string) => void;
}

export default function ColorPickerField({ label, color, onChange }: ColorPickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const pickerW = 200;
      const left = rect.right + pickerW > window.innerWidth
        ? rect.left - pickerW - 4
        : rect.right + 4;
      const top = Math.min(rect.top, window.innerHeight - 260);
      setPos({ top, left });
    }
    setOpen(v => !v);
  };

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-xs text-gray-600 w-16 shrink-0">{label}</span>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="w-7 h-7 rounded border border-gray-300 shrink-0 cursor-pointer"
        style={{ backgroundColor: color }}
        title={color}
      />
      <HexColorInput
        color={color}
        onChange={onChange}
        prefixed
        className="flex-1 text-xs px-1.5 py-1 border border-gray-300 rounded w-0 min-w-0"
      />
      {open && (
        <div
          ref={popRef}
          className="fixed z-[9999] shadow-lg rounded-lg bg-white p-2"
          style={{ top: pos.top, left: pos.left }}
        >
          <HexColorPicker color={color} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
