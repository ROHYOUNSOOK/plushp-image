'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

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
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const { layout, visual } = splitCls(className);
  const selected = options.find(o => o.value === value);

  const calcPos = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const dropH = Math.min(options.length * 28 + 8, 240);
    const openUp = window.innerHeight - r.bottom < dropH + 8 && r.top > dropH + 8;
    setDropStyle({
      position: 'fixed',
      zIndex: 9999,
      left: r.left,
      minWidth: Math.max(r.width, 160),
      ...(openUp ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
    });
  }, [options.length]);

  const handleOpen = () => {
    if (disabled) return;
    if (!open) calcPos();
    setOpen(o => !o);
  };

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        dropRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const dropdown = open && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={dropRef}
          style={dropStyle}
          className="bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto"
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs whitespace-nowrap transition-colors
                ${opt.value === value
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <div className={`relative ${layout}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-1 ${visual} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
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
      {dropdown}
    </div>
  );
}
