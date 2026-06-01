'use client';

import { useState, useRef, useEffect } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// w-full, flex-1 등 레이아웃 클래스는 컨테이너 div로, 나머지 시각 클래스는 버튼으로
function splitCls(cls: string) {
  const LAYOUT_RE = /\b(w-full|flex-1|flex-none|shrink-0|grow|min-w-\S+|max-w-\S+)\b/g;
  const layout: string[] = [];
  const visual = cls.replace(LAYOUT_RE, m => { layout.push(m); return ''; }).replace(/\s+/g, ' ').trim();
  return { layout: layout.join(' '), visual };
}

export default function CustomSelect({
  value, onChange, options, placeholder = '선택', disabled = false, className = '',
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { layout, visual } = splitCls(className);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${layout}`}>
      <button
        type="button"
        onClick={() => { if (!disabled) setOpen(o => !o); }}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-1 ${visual} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`truncate flex-1 text-left ${!selected ? 'opacity-50' : ''}`}>
          {selected?.label ?? placeholder}
        </span>
        <svg
          className={`shrink-0 w-3 h-3 opacity-40 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 min-w-full bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs whitespace-nowrap transition-colors
                ${opt.value === value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
