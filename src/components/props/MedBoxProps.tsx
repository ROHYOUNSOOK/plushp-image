'use client';

import type { MedBoxLayer } from '@/types/layer';
import { useEditorStore } from '@/store/editorStore';
import ColorPickerField from '@/components/ui/ColorPickerField';
import NumberInput from '@/components/ui/NumberInput';
import SliderInput from '@/components/ui/SliderInput';

export default function MedBoxProps({ layer }: { layer: MedBoxLayer }) {
  const updateLayer = useEditorStore(s => s.updateLayer);
  const update = (u: Partial<MedBoxLayer>) => updateLayer(layer.id, u);

  return (
    <div className="space-y-3">
      <div className="font-bold text-xs text-gray-500 uppercase">박스</div>

      {/* 위치/크기 */}
      <div className="grid grid-cols-2 gap-1">
        <NumberInput label="X" value={layer.x} onChange={v => update({ x: v })} />
        <NumberInput label="Y" value={layer.y} onChange={v => update({ y: v })} />
        <NumberInput label="W" value={layer.w} onChange={v => update({ w: v })} min={10} />
        <NumberInput label="H" value={layer.h} onChange={v => update({ h: v })} min={10} />
      </div>

      {/* 박스 색상 */}
      <ColorPickerField label="박스 색" color={layer.boxColor} onChange={c => update({ boxColor: c })} />
      <SliderInput label="투명도" value={layer.boxAlpha * 100} onChange={v => update({ boxAlpha: v / 100 })} min={0} max={100} />

      {/* 모서리 둥글기 */}
      <div className="text-xs text-gray-500 mt-2">모서리 둥글기</div>
      <div className="grid grid-cols-2 gap-1">
        <NumberInput label="좌상" value={layer.radiusTL} onChange={v => update({ radiusTL: v })} min={0} max={200} />
        <NumberInput label="우상" value={layer.radiusTR} onChange={v => update({ radiusTR: v })} min={0} max={200} />
        <NumberInput label="우하" value={layer.radiusBR} onChange={v => update({ radiusBR: v })} min={0} max={200} />
        <NumberInput label="좌하" value={layer.radiusBL} onChange={v => update({ radiusBL: v })} min={0} max={200} />
      </div>

      {/* 외곽선 */}
      <div className="flex items-center gap-2 mt-2">
        <input type="checkbox" checked={layer.boxStrokeEnabled}
          onChange={e => update({ boxStrokeEnabled: e.target.checked })} />
        <span className="text-xs">외곽선</span>
      </div>
      {layer.boxStrokeEnabled && (
        <>
          <ColorPickerField label="선 색" color={layer.boxStrokeColor} onChange={c => update({ boxStrokeColor: c })} />
          <NumberInput label="두께" value={layer.boxStrokeWidth} onChange={v => update({ boxStrokeWidth: v })} min={1} max={20} />
        </>
      )}

      {/* 그림자 */}
      <div className="text-xs text-gray-500 mt-2">그림자</div>
      <ColorPickerField label="색상" color={layer.shadowColor} onChange={c => update({ shadowColor: c })} />
      <SliderInput label="투명도" value={layer.shadowAlpha * 100} onChange={v => update({ shadowAlpha: v / 100 })} min={0} max={100} />
      <SliderInput label="흐림" value={layer.shadowBlur} onChange={v => update({ shadowBlur: v })} min={0} max={60} />
      <NumberInput label="X 오프셋" value={layer.shadowX} onChange={v => update({ shadowX: v })} />
      <NumberInput label="Y 오프셋" value={layer.shadowY} onChange={v => update({ shadowY: v })} />
    </div>
  );
}
