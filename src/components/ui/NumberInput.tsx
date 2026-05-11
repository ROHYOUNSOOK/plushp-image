
interface NumberInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export default function NumberInput({ label, value, onChange, min, max, step = 1 }: NumberInputProps) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-xs text-gray-600 w-16 shrink-0">{label}</span>
      <input
        type="number"
        value={Math.round(value)}
        onChange={e => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="flex-1 text-xs px-1.5 py-1 border border-gray-300 rounded w-0 min-w-0"
      />
    </div>
  );
}
