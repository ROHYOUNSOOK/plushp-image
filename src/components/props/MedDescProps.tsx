'use client';

import type { MedDescLayer } from '@/types/layer';
import { useEditorStore } from '@/store/editorStore';
import ColorPickerField from '@/components/ui/ColorPickerField';
import NumberInput from '@/components/ui/NumberInput';
import SliderInput from '@/components/ui/SliderInput';

const FONTS = ['GmarketSans', 'Pretendard', 'SCoreDream', 'Jalnan'];

export default function MedDescProps({ layer }: { layer: MedDescLayer }) {
  const updateLayer = useEditorStore(s => s.updateLayer);
  const update = (u: Partial<MedDescLayer>) => updateLayer(layer.id, u);

  return (
    <div className="space-y-3">
      <div className="font-bold text-xs text-gray-500 uppercase">📄 설명 텍스트</div>

      <textarea
        value={layer.content}
        onChange={e => update({ content: e.target.value })}
        className="w-full text-xs text-gray-900 p-1.5 border border-gray-300 rounded resize-none"
        rows={4}
      />

      <div className="grid grid-cols-2 gap-1">
        <NumberInput label="크기" value={layer.fontSize} onChange={v => update({ fontSize: v })} min={10} />
        <NumberInput label="굵기" value={layer.fontWeight} onChange={v => update({ fontWeight: v })} min={100} max={900} step={100} />
      </div>

      <SliderInput label="줄간격" value={layer.lineHeight * 10} onChange={v => update({ lineHeight: v / 10 })} min={10} max={30} />

      <ColorPickerField label="색" color={layer.color} onChange={c => update({ color: c })} />

      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs text-gray-600 w-16 shrink-0">폰트</span>
        <select value={layer.font} onChange={e => update({ font: e.target.value })}
          className="flex-1 text-xs text-gray-900 px-1.5 py-1 border border-gray-300 rounded">
          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600 w-16 shrink-0">정렬</span>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map(a => (
            <button key={a} onClick={() => update({ align: a })}
              className={`px-2 py-0.5 text-xs rounded border ${layer.align === a ? 'bg-blue-100 border-blue-400' : 'border-gray-300'}`}>
              {a === 'left' ? '◀' : a === 'center' ? '◆' : '▶'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
