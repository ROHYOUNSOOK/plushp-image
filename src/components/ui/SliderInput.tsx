
interface SliderInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export default function SliderInput({ label, value, onChange, min = 0, max = 100, step = 1 }: SliderInputProps) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-xs text-gray-600 w-16 shrink-0">{label}</span>
      <input
        type="range"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="flex-1"
      />
      <span className="text-xs text-gray-500 w-8 text-right">{Math.round(value)}</span>
    </div>
  );
}
