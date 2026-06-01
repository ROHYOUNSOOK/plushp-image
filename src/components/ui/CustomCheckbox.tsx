'use client';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export default function CustomCheckbox({ checked, onChange, className = '' }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors
        ${checked ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300 hover:border-gray-400'}
        ${className}`}
    >
      {checked && (
        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}
