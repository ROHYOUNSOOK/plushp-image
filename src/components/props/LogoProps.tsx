'use client';


import type { LogoLayer } from '@/types/layer';
import { useEditorStore } from '@/store/editorStore';
import ColorPickerField from '@/components/ui/ColorPickerField';
import NumberInput from '@/components/ui/NumberInput';
import SliderInput from '@/components/ui/SliderInput';
import CustomCheckbox from '@/components/ui/CustomCheckbox';
import ImageUploadButton from '@/components/ui/ImageUploadButton';
import { loadImageFromFile, applyLogoImage } from '@/lib/imageUpload';
import { LOGO_VARIANTS, loadLogoFromUrl } from '@/lib/logoLoader';
import { toast } from '@/components/editor/Toast';
import { W, H } from '@/types/constants';

const GUIDE_M = 30; // 가이드라인 마진 (drawGuides.ts 와 동일)

const CORNER_PRESETS = [
  { label: '좌상', getPos: (w: number, h: number) => ({ x: GUIDE_M, y: GUIDE_M, w, h }) },
  { label: '우상', getPos: (w: number, h: number) => ({ x: W - GUIDE_M - w, y: GUIDE_M, w, h }) },
  { label: '좌하', getPos: (w: number, h: number) => ({ x: GUIDE_M, y: H - GUIDE_M - h, w, h }) },
  { label: '우하', getPos: (w: number, h: number) => ({ x: W - GUIDE_M - w, y: H - GUIDE_M - h, w, h }) },
];

export default function LogoProps({ layer }: { layer: LogoLayer }) {
  const updateLayer = useEditorStore(s => s.updateLayer);

  const update = (u: Partial<LogoLayer>) => updateLayer(layer.id, u);

  const setLogoVariant = async (url: string, strokeDefault: boolean) => {
    try {
      const img = await loadLogoFromUrl(url);
      update({ img, url, stroke: { ...layer.stroke, enabled: strokeDefault } });
    } catch {
      toast('로고 변경 실패');
    }
  };
  const activeUrl = layer.url ?? LOGO_VARIANTS[0].url;

  return (
    <div className="space-y-3">
      <div className="font-bold text-xs text-gray-500 uppercase">로고</div>

      {/* 로고 종류 탭 */}
      <div className="grid grid-cols-2 gap-1">
        {LOGO_VARIANTS.map(v => {
          const active = activeUrl.endsWith(v.url);
          return (
            <button
              key={v.url}
              onClick={() => setLogoVariant(v.url, v.stroke)}
              className={`py-1.5 text-xs rounded border transition-colors ${
                active
                  ? 'bg-[#1450a0] text-white border-[#1450a0]'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {v.label}
            </button>
          );
        })}
      </div>

      {/* 가이드라인 코너 위치 프리셋 */}
      <div>
        <div className="text-xs text-gray-400 mb-1">위치 프리셋</div>
        <div className="grid grid-cols-4 gap-1">
          {CORNER_PRESETS.map(({ label, getPos }) => (
            <button
              key={label}
              onClick={() => update(getPos(layer.w, layer.h))}
              className="py-1 text-xs rounded border border-gray-300 hover:bg-blue-50 hover:border-blue-400"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1">
        <NumberInput label="X" value={layer.x} onChange={v => update({ x: v })} />
        <NumberInput label="Y" value={layer.y} onChange={v => update({ y: v })} />
        <NumberInput label="W" value={layer.w} onChange={v => update({ w: v })} min={10} />
        <NumberInput label="H" value={layer.h} onChange={v => update({ h: v })} min={10} />
      </div>

      <SliderInput label="불투명도" value={layer.opacity * 100} onChange={v => update({ opacity: v / 100 })} min={0} max={100} />
      <NumberInput label="회전" value={layer.rotation} onChange={v => update({ rotation: v })} min={-360} max={360} />

      {/* 외곽선 (획) */}
      <div className="flex items-center gap-2 mt-2">
        <CustomCheckbox
          checked={layer.stroke.enabled}
          onChange={v => update({ stroke: { ...layer.stroke, enabled: v } })}
        />
        <span className="text-xs">외곽선</span>
      </div>
      {layer.stroke.enabled && (
        <>
          <ColorPickerField label="선 색" color={layer.stroke.color || '#000000'} onChange={c => update({ stroke: { ...layer.stroke, color: c } })} />
          <NumberInput label="선 두께" value={layer.stroke.width} onChange={v => update({ stroke: { ...layer.stroke, width: v } })} min={1} max={20} />
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

      <div className="mt-2">
        <ImageUploadButton
          label={layer.img ? '로고 이미지 교체' : '로고 이미지 업로드'}
          onFile={async (file) => {
            try {
              const { img, url } = await loadImageFromFile(file);
              useEditorStore.getState().pushHistory();
              applyLogoImage(layer, img, url);
              useEditorStore.getState().setPages([...useEditorStore.getState().pages]);
              toast('로고 이미지 적용');
            } catch { toast('이미지 로드 실패'); }
          }}
        />
      </div>
      {layer.img && <div className="text-xs text-green-600 mt-1">이미지 적용됨</div>}
    </div>
  );
}
