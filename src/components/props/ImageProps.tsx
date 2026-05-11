'use client';


import type { ImageLayer } from '@/types/layer';
import { useEditorStore } from '@/store/editorStore';
import NumberInput from '@/components/ui/NumberInput';
import SliderInput from '@/components/ui/SliderInput';
import ImageUploadButton from '@/components/ui/ImageUploadButton';
import { loadImageFromFile, applyImageLayerImage } from '@/lib/imageUpload';
import { toast } from '@/components/editor/Toast';

export default function ImageProps({ layer }: { layer: ImageLayer }) {
  const updateLayer = useEditorStore(s => s.updateLayer);

  const update = (u: Partial<ImageLayer>) => updateLayer(layer.id, u);

  return (
    <div className="space-y-3">
      <div className="font-bold text-xs text-gray-500 uppercase">이미지</div>

      <div className="grid grid-cols-2 gap-1">
        <NumberInput label="X" value={layer.x} onChange={v => update({ x: v })} />
        <NumberInput label="Y" value={layer.y} onChange={v => update({ y: v })} />
        <NumberInput label="W" value={layer.w} onChange={v => update({ w: v })} min={10} />
        <NumberInput label="H" value={layer.h} onChange={v => update({ h: v })} min={10} />
      </div>

      <SliderInput label="불투명도" value={layer.opacity * 100} onChange={v => update({ opacity: v / 100 })} min={0} max={100} />
      <NumberInput label="회전" value={layer.rotation} onChange={v => update({ rotation: v })} min={-360} max={360} />

      {/* 그림자 */}
      <div className="flex items-center gap-2 mt-2">
        <input
          type="checkbox"
          checked={layer.shadow.enabled}
          onChange={e => update({ shadow: { ...layer.shadow, enabled: e.target.checked } })}
        />
        <span className="text-xs">그림자</span>
      </div>
      {layer.shadow.enabled && (
        <>
          <SliderInput label="흐림" value={layer.shadow.blur} onChange={v => update({ shadow: { ...layer.shadow, blur: v } })} min={0} max={50} />
          <NumberInput label="X 오프셋" value={layer.shadow.offsetX} onChange={v => update({ shadow: { ...layer.shadow, offsetX: v } })} />
          <NumberInput label="Y 오프셋" value={layer.shadow.offsetY} onChange={v => update({ shadow: { ...layer.shadow, offsetY: v } })} />
          <SliderInput label="투명도" value={layer.shadow.alpha * 100} onChange={v => update({ shadow: { ...layer.shadow, alpha: v / 100 } })} min={0} max={100} />
        </>
      )}

      <div className="mt-2">
        <ImageUploadButton
          label={layer.img ? '이미지 교체' : '이미지 업로드'}
          onFile={async (file) => {
            try {
              const { img, url } = await loadImageFromFile(file);
              useEditorStore.getState().pushHistory();
              applyImageLayerImage(layer, img, url);
              useEditorStore.getState().setPages([...useEditorStore.getState().pages]);
              toast('이미지 적용');
            } catch { toast('이미지 로드 실패'); }
          }}
        />
      </div>
      {layer.img && <div className="text-xs text-green-600 mt-1">이미지 적용됨</div>}
    </div>
  );
}
