'use client';


import type { TextLayer } from '@/types/layer';
import { useEditorStore } from '@/store/editorStore';
import ColorPickerField from '@/components/ui/ColorPickerField';
import NumberInput from '@/components/ui/NumberInput';
import SliderInput from '@/components/ui/SliderInput';

const FONTS = ['Pretendard', 'GmarketSans', 'SCoreDream', 'Jalnan'];

export default function TextProps({ layer }: { layer: TextLayer }) {
  const updateLayer = useEditorStore(s => s.updateLayer);

  const update = (u: Partial<TextLayer>) => updateLayer(layer.id, u);

  return (
    <div className="space-y-3">
      <div className="font-bold text-xs text-gray-500 uppercase">텍스트</div>

      <textarea
        value={layer.content}
        onChange={e => update({ content: e.target.value })}
        className="w-full text-xs p-2 border border-gray-300 rounded resize-y min-h-[60px]"
        rows={3}
      />

      <div className="grid grid-cols-2 gap-1">
        <NumberInput label="X" value={layer.x} onChange={v => update({ x: v })} />
        <NumberInput label="Y" value={layer.y} onChange={v => update({ y: v })} />
        <NumberInput label="W" value={layer.w} onChange={v => update({ w: v })} min={10} />
        <NumberInput label="H" value={layer.h} onChange={v => update({ h: v })} min={10} />
      </div>

      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs text-gray-600 w-16 shrink-0">폰트</span>
        <select
          value={layer.font}
          onChange={e => update({ font: e.target.value })}
          className="flex-1 text-xs px-1.5 py-1 border border-gray-300 rounded"
        >
          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      <NumberInput label="크기" value={layer.size} onChange={v => update({ size: v })} min={10} max={500} />
      <NumberInput label="굵기" value={layer.weight} onChange={v => update({ weight: v })} min={100} max={900} step={100} />
      <SliderInput label="행간" value={layer.lineHeight * 100} onChange={v => update({ lineHeight: v / 100 })} min={50} max={300} />

      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs text-gray-600 w-16 shrink-0">정렬</span>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map(a => (
            <button
              key={a}
              onClick={() => update({ align: a })}
              className={`px-2 py-0.5 text-xs rounded border ${layer.align === a ? 'bg-blue-100 border-blue-400' : 'border-gray-300'}`}
            >
              {a === 'left' ? '◀' : a === 'center' ? '◆' : '▶'}
            </button>
          ))}
        </div>
      </div>

      <ColorPickerField label="글자색" color={layer.color} onChange={c => update({ color: c })} />
    </div>
  );
}
