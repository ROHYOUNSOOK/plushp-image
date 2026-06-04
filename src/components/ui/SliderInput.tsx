'use client';

import { useState, useEffect } from 'react';

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  onChangeEnd?: () => void;
  min?: number;
  max?: number;
  step?: number;
}

export default function SliderInput({ label, value, onChange, onChangeEnd, min = 0, max = 100, step = 1 }: SliderInputProps) {
  const fmt = (v: number) => step < 1 ? v.toFixed(1) : String(Math.round(v));
  const [inputVal, setInputVal] = useState(fmt(value));

  useEffect(() => {
    setInputVal(fmt(value));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = () => {
    const n = Number(inputVal);
    if (!isNaN(n)) {
      const clamped = Math.min(max, Math.max(min, n));
      onChange(clamped);
      onChangeEnd?.();
    } else {
      setInputVal(fmt(value));
    }
  };

  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-xs text-gray-600 w-16 shrink-0">{label}</span>
      <input
        type="range"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        onPointerUp={onChangeEnd}
        onKeyUp={onChangeEnd}
        min={min}
        max={max}
        step={step}
        className="flex-1 accent-blue-500"
      />
      <input
        type="number"
        value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); }}
        min={min}
        max={max}
        step={step}
        className="text-xs text-gray-600 w-10 text-right border border-gray-200 rounded px-1 py-0.5 outline-none focus:border-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  );
}
