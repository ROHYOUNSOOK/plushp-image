'use client';


import React from 'react';
import type { TextboxLayer } from '@/types/layer';
import { useEditorStore } from '@/store/editorStore';
import ColorPickerField from '@/components/ui/ColorPickerField';
import NumberInput from '@/components/ui/NumberInput';
import CustomSelect from '@/components/ui/CustomSelect';
import CustomCheckbox from '@/components/ui/CustomCheckbox';
import SliderInput from '@/components/ui/SliderInput';

const FONTS = ['GmarketSans', 'Pretendard', 'SCoreDream', 'Jalnan'];

const ALIGN_ICONS = {
  left: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="14" height="2" rx="0.5" fill="currentColor"/><rect x="2" y="8" width="9" height="2" rx="0.5" fill="currentColor"/><rect x="2" y="13" width="11" height="2" rx="0.5" fill="currentColor"/></svg>,
  center: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="14" height="2" rx="0.5" fill="currentColor"/><rect x="4.5" y="8" width="9" height="2" rx="0.5" fill="currentColor"/><rect x="3.5" y="13" width="11" height="2" rx="0.5" fill="currentColor"/></svg>,
  right: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="14" height="2" rx="0.5" fill="currentColor"/><rect x="7" y="8" width="9" height="2" rx="0.5" fill="currentColor"/><rect x="5" y="13" width="11" height="2" rx="0.5" fill="currentColor"/></svg>,
};
const VALIGN_ICONS = {
  top: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="14" height="2" rx="0.5" fill="currentColor"/><rect x="5" y="5" width="8" height="5" rx="0.5" fill="currentColor"/><rect x="5" y="11" width="8" height="2" rx="0.5" fill="currentColor" opacity="0.35"/></svg>,
  center: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="8" width="14" height="2" rx="0.5" fill="currentColor"/><rect x="5" y="4" width="8" height="4" rx="0.5" fill="currentColor"/><rect x="5" y="11" width="8" height="3" rx="0.5" fill="currentColor"/></svg>,
  bottom: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="14" width="14" height="2" rx="0.5" fill="currentColor"/><rect x="5" y="11" width="8" height="2" rx="0.5" fill="currentColor" opacity="0.35"/><rect x="5" y="5" width="8" height="5" rx="0.5" fill="currentColor"/></svg>,
};

const ALIGNS: { value: 'left' | 'center' | 'right' }[] = [
  { value: 'left' }, { value: 'center' }, { value: 'right' },
];
const VALIGNS: { value: 'top' | 'center' | 'bottom' }[] = [
  { value: 'top' }, { value: 'center' }, { value: 'bottom' },
];

export default function TextboxProps({ layer }: { layer: TextboxLayer }) {
  const updateLayer = useEditorStore(s => s.updateLayer);

  const update = (u: Partial<TextboxLayer>) => updateLayer(layer.id, u);

  return (
    <div className="space-y-3">
      <div className="font-bold text-xs text-gray-500 uppercase">텍스트박스</div>

      {/* 내용 */}
      <textarea
        value={layer.content}
        onChange={e => update({ content: e.target.value })}
        className="w-full text-xs text-gray-900 p-2 border border-gray-300 rounded resize-y min-h-[60px]"
        rows={3}
      />

      {/* 위치/크기 */}
      <div className="grid grid-cols-2 gap-1">
        <NumberInput label="X" value={layer.x} onChange={v => update({ x: v })} />
        <NumberInput label="Y" value={layer.y} onChange={v => update({ y: v })} />
        <NumberInput label="W" value={layer.w} onChange={v => update({ w: v })} min={10} />
        <NumberInput label="H" value={layer.h} onChange={v => update({ h: v })} min={10} />
      </div>

      {/* 폰트 */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs text-gray-600 w-16 shrink-0">폰트</span>
        <CustomSelect
          value={layer.font}
          onChange={v => update({ font: v })}
          className="flex-1 text-xs text-gray-900 px-1.5 py-1 border border-gray-300 rounded"
          options={FONTS.map(f => ({ value: f, label: f }))}
        />
      </div>

      <NumberInput label="크기" value={layer.fontSize} onChange={v => update({ fontSize: v })} min={10} max={500} />

      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs text-gray-600 w-16 shrink-0">굵기</span>
        <CustomSelect
          value={layer.fontWeight}
          onChange={v => update({ fontWeight: v })}
          className="flex-1 text-xs text-gray-900 px-1.5 py-1 border border-gray-300 rounded"
          options={['300', '400', '500', '700', '900'].map(w => ({ value: w, label: w }))}
        />
      </div>

      {/* 정렬 */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs text-gray-600 w-16 shrink-0">수평</span>
        <div className="flex gap-1">
          {ALIGNS.map(a => (
            <button
              key={a.value}
              onClick={() => update({ textAlign: a.value })}
              title={a.value === 'left' ? '왼쪽 정렬' : a.value === 'center' ? '가운데 정렬' : '오른쪽 정렬'}
              className={`p-1 rounded border ${layer.textAlign === a.value ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-300 text-gray-600'}`}
            >
              {ALIGN_ICONS[a.value]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs text-gray-600 w-16 shrink-0">수직</span>
        <div className="flex gap-1">
          {VALIGNS.map(a => (
            <button
              key={a.value}
              onClick={() => update({ vAlign: a.value })}
              title={a.value === 'top' ? '위 정렬' : a.value === 'center' ? '가운데 정렬' : '아래 정렬'}
              className={`p-1 rounded border ${layer.vAlign === a.value ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-300 text-gray-600'}`}
            >
              {VALIGN_ICONS[a.value]}
            </button>
          ))}
        </div>
      </div>

      <SliderInput label="행간" value={layer.lineHeight * 100} onChange={v => update({ lineHeight: v / 100 })} min={50} max={300} />

      {/* 색상 */}
      <ColorPickerField label="글자색" color={layer.textColor} onChange={c => update({ textColor: c })} />
      <ColorPickerField label="배경색" color={layer.fillColor || '#333333'} onChange={c => update({ fillColor: c })} />
      <SliderInput label="배경투명" value={layer.fillAlpha * 100} onChange={v => update({ fillAlpha: v / 100 })} min={0} max={100} />
      <NumberInput label="둥글기(전체)" value={layer.radius} onChange={v => update({ radius: v, radiusTL: v, radiusTR: v, radiusBR: v, radiusBL: v })} min={0} max={100} />

      {/* 자동 크기 */}
      <div className="flex items-center gap-2 mt-2">
        <CustomCheckbox
          checked={layer.autoSize}
          onChange={v => update({ autoSize: v })}
        />
        <span className="text-xs">자동 크기</span>
      </div>

      {/* 패딩 */}
      <div className="text-xs text-gray-500 mt-2">패딩</div>
      <div className="grid grid-cols-2 gap-1">
        <NumberInput label="상" value={layer.paddingTop} onChange={v => update({ paddingTop: v })} min={0} />
        <NumberInput label="하" value={layer.paddingBottom} onChange={v => update({ paddingBottom: v })} min={0} />
        <NumberInput label="좌" value={layer.paddingLeft} onChange={v => update({ paddingLeft: v })} min={0} />
        <NumberInput label="우" value={layer.paddingRight} onChange={v => update({ paddingRight: v })} min={0} />
      </div>

      {/* 테두리 */}
      <div className="flex items-center gap-2 mt-2">
        <CustomCheckbox
          checked={layer.border.enabled}
          onChange={v => update({ border: { ...layer.border, enabled: v } })}
        />
        <span className="text-xs">테두리</span>
      </div>
      {layer.border.enabled && (
        <>
          <ColorPickerField label="테두리색" color={layer.border.color} onChange={c => update({ border: { ...layer.border, color: c } })} />
          <NumberInput label="두께" value={layer.border.width} onChange={v => update({ border: { ...layer.border, width: v } })} min={1} max={20} />
        </>
      )}

      {/* 그림자 */}
      <div className="flex items-center gap-2 mt-2">
        <CustomCheckbox
          checked={layer.shadow.enabled}
          onChange={v => update({ shadow: { ...layer.shadow, enabled: v } })}
        />
        <span className="text-xs">그림자</span>
      </div>
      {layer.shadow.enabled && (
        <>
          <SliderInput label="흐림" value={layer.shadow.blur} onChange={v => update({ shadow: { ...layer.shadow, blur: v } })} min={0} max={50} />
          <NumberInput label="X" value={layer.shadow.offsetX} onChange={v => update({ shadow: { ...layer.shadow, offsetX: v } })} />
          <NumberInput label="Y" value={layer.shadow.offsetY} onChange={v => update({ shadow: { ...layer.shadow, offsetY: v } })} />
        </>
      )}

      {/* 모서리별 둥글기 */}
      <div className="text-xs text-gray-500 mt-3">모서리 둥글기</div>
      <div className="grid grid-cols-2 gap-1">
        <NumberInput label="좌상" value={layer.radiusTL ?? layer.radius} onChange={v => update({ radiusTL: v })} min={0} max={200} />
        <NumberInput label="우상" value={layer.radiusTR ?? layer.radius} onChange={v => update({ radiusTR: v })} min={0} max={200} />
        <NumberInput label="좌하" value={layer.radiusBL ?? layer.radius} onChange={v => update({ radiusBL: v })} min={0} max={200} />
        <NumberInput label="우하" value={layer.radiusBR ?? layer.radius} onChange={v => update({ radiusBR: v })} min={0} max={200} />
      </div>
    </div>
  );
}
