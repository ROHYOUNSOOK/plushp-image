'use client';


import type { FrameLayer } from '@/types/layer';
import { useEditorStore } from '@/store/editorStore';
import { FRAME_SHAPES } from '@/types/constants';
import ColorPickerField from '@/components/ui/ColorPickerField';
import NumberInput from '@/components/ui/NumberInput';
import SliderInput from '@/components/ui/SliderInput';
import ImageUploadButton from '@/components/ui/ImageUploadButton';
import { loadImageFromFile, compressForUpload } from '@/lib/imageUpload';
import { checkScheduleImageExists } from '@/lib/supabase';
import { buildScheduleFolderName } from '@/hooks/useScheduleApplication';
import { setFilterFrozen } from '@/canvas/webglFilters';
import { extractDominantColor, calcAutoFillColor, calcShadowColor, replaceTextboxImageColors, hasTransparentPixels } from '@/lib/colorHelpers';
import { selectBgKeyColor } from '@/store/editorStore';
import { toast, hideToast } from '@/components/editor/Toast';

export default function FrameProps({ layer }: { layer: FrameLayer }) {
  const updateLayer = useEditorStore(s => s.updateLayer);
  const pushHistory = useEditorStore(s => s.pushHistory);
  const applySyncColors = useEditorStore(s => s.applySyncColors);
  const bgKeyColor = useEditorStore(selectBgKeyColor);

  const update = (u: Partial<FrameLayer>) => updateLayer(layer.id, u);

  return (
    <div className="space-y-3">
      <div className="font-bold text-xs text-gray-500 uppercase">프레임</div>

      {/* 위치/크기 */}
      <div className="grid grid-cols-2 gap-1">
        <NumberInput label="X" value={layer.x} onChange={v => update({ x: v })} />
        <NumberInput label="Y" value={layer.y} onChange={v => update({ y: v })} />
        <NumberInput label="W" value={layer.w} onChange={v => update({ w: v })} min={10} />
        <NumberInput label="H" value={layer.h} onChange={v => update({ h: v })} min={10} />
      </div>

      {/* 도형 */}
      <div className="text-xs text-gray-500">도형</div>
      <div className="flex flex-wrap gap-1">
        {FRAME_SHAPES.map(s => (
          <button
            key={s.id}
            onClick={() => { pushHistory(); update({ shape: s.id }); }}
            className={`px-2 py-1 text-sm rounded border ${
              layer.shape === s.id ? 'bg-blue-100 border-blue-400' : 'border-gray-300'
            }`}
            title={s.label}
          >
            {s.icon}
          </button>
        ))}
      </div>

      <NumberInput label="둥글기" value={layer.radius} onChange={v => update({ radius: v })} min={0} max={540} />
      <SliderInput label="프레임 회전" value={layer.rotation ?? 0} onChange={v => update({ rotation: v })} min={-180} max={180} />
      <SliderInput label="불투명도" value={layer.opacity * 100} onChange={v => update({ opacity: v / 100 })} min={0} max={100} />

      {/* 채우기 */}
      {layer.fill && (
        <ColorPickerField label="채우기" color={layer.fill} onChange={c => update({ fill: c })} />
      )}

      {/* 외곽선 */}
      <div className="flex items-center gap-2 mt-2">
        <input
          type="checkbox"
          checked={layer.stroke.enabled}
          onChange={e => update({ stroke: { ...layer.stroke, enabled: e.target.checked } })}
        />
        <span className="text-xs">외곽선</span>
      </div>
      {layer.stroke.enabled && (
        <>
          <ColorPickerField label="선 색" color={layer.stroke.color || '#111111'} onChange={c => update({ stroke: { ...layer.stroke, color: c } })} />
          <NumberInput label="선 두께" value={layer.stroke.width} onChange={v => update({ stroke: { ...layer.stroke, width: v } })} min={1} max={30} />
        </>
      )}

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

      {/* 프레임 이미지 (PNG 마스크) — UI 숨김, 기능 유지 */}
      <div className="hidden">
        <ImageUploadButton
          label="프레임 이미지"
          onFile={async (file) => {
            try {
              const { img, url } = await loadImageFromFile(file);
              pushHistory();
              const isMask = hasTransparentPixels(img);
              const frameMaskProcessed = isMask ? replaceTextboxImageColors(img, bgKeyColor) : null;
              update({ frameMaskImg: img, frameMaskUrl: url, frameMaskProcessed });
              if (isMask) {
                const dominant = extractDominantColor(img);
                applySyncColors(calcAutoFillColor(dominant), calcShadowColor(dominant));
              }
            } catch { toast('이미지 로드 실패'); }
          }}
        />
        {layer.frameMaskImg && (
          <button onClick={() => { pushHistory(); update({ frameMaskImg: null, frameMaskUrl: null }); }}>제거</button>
        )}
      </div>

      {/* 프레임 내부 이미지 업로드 */}
      <div className="mt-2">
        <ImageUploadButton
          label={layer.img ? '프레임 내부 이미지 교체' : '프레임 내부 이미지'}
          onFile={async (file) => {
            try {
              const { img, url: blobUrl } = await loadImageFromFile(file);
              pushHistory();

                  // 즉시 적용 (blob URL) — 업로드 완료 전에도 에디터에 표시
              const sc = Math.max(layer.w / img.naturalWidth, layer.h / img.naturalHeight);
              useEditorStore.getState().updateLayer(layer.id, {
                img,
                url: blobUrl,
                imgScale: sc,
                imgOffsetX: (layer.w - img.naturalWidth * sc) / 2,
                imgOffsetY: (layer.h - img.naturalHeight * sc) / 2,
              });

              const scheduleRow = useEditorStore.getState().currentScheduleRow;

              if (!scheduleRow) {
                toast('스케줄을 먼저 적용해주세요 (이미지는 로컬에만 적용됨)');
                return;
              }

              const folderName = buildScheduleFolderName(scheduleRow as unknown as Parameters<typeof buildScheduleFolderName>[0]);
              const state = useEditorStore.getState();
              const pageIdx = state.pages.findIndex(pg => pg.layers.some(l => l.id === layer.id));
              const pageIndex = (pageIdx >= 0 ? pageIdx : state.currentPage ?? 0) + 1;

              const alreadyExists = await checkScheduleImageExists(folderName, pageIndex);
              if (alreadyExists && !confirm(`페이지 ${pageIndex}의 이미지가 이미 존재합니다.\n새 이미지로 교체하시겠습니까?`)) return;
              toast('이미지 업로드 중...', 0);
              try {
                const compressed = await compressForUpload(img);
                const formData = new FormData();
                formData.append('file', compressed, 'image.jpg');
                formData.append('folderName', folderName);
                formData.append('pageIndex', String(pageIndex));

                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 30000);
                const res = await fetch('/api/upload-schedule-image', {
                  method: 'POST',
                  body: formData,
                  signal: controller.signal,
                });
                clearTimeout(timeout);
                const data = await res.json();

                hideToast();
                if (data.url) {
                  useEditorStore.getState().updateLayer(layer.id, { url: data.url });
                  toast('업로드 완료');
                } else {
                  toast('업로드 실패 — 로컬 이미지로 적용됨');
                }
              } catch {
                hideToast();
                toast('업로드 실패 — 로컬 이미지로 적용됨');
              }
            } catch { toast('이미지 로드 실패'); }
          }}
        />
      </div>

      {/* 이미지 조정 */}
      {layer.img && (
        <>
          <div className="text-xs text-gray-500 mt-2">이미지 조정</div>

          {/* 드래그 중 freeze → 손 뗄 때 캐시 무효화 + 1회 WebGL 재계산 */}
          {(() => {
            const onFilterChange = (patch: Partial<FrameLayer>) => {
              setFilterFrozen(true);
              update(patch);
            };
            const onFilterEnd = () => {
              setFilterFrozen(false);
              update({ _imgFilterCache: null });
            };
            return (
              <>
                <SliderInput label="노출" value={layer.imgLightness} min={-20} max={20}
                  onChange={v => onFilterChange({ imgLightness: v })}
                  onChangeEnd={onFilterEnd} />
                <SliderInput label="색온도" value={layer.imgTemperature} min={-20} max={20}
                  onChange={v => onFilterChange({ imgTemperature: v })}
                  onChangeEnd={onFilterEnd} />
                <SliderInput label="대비" value={layer.imgContrast ?? 0} min={-20} max={20}
                  onChange={v => onFilterChange({ imgContrast: v })}
                  onChangeEnd={onFilterEnd} />
                <SliderInput label="채도" value={layer.imgSaturation ?? 0} min={-20} max={20}
                  onChange={v => onFilterChange({ imgSaturation: v })}
                  onChangeEnd={onFilterEnd} />
              </>
            );
          })()}

          <SliderInput label="확대" value={layer.imgScale * 100} onChange={v => {
            const oldScale = layer.imgScale;
            const newScale = v / 100;
            const iw = layer.img?.naturalWidth ?? 0;
            const ih = layer.img?.naturalHeight ?? 0;
            update({
              imgScale: newScale,
              imgOffsetX: layer.imgOffsetX + iw * (oldScale - newScale) / 2,
              imgOffsetY: layer.imgOffsetY + ih * (oldScale - newScale) / 2,
            });
          }} min={10} max={500} />
          <SliderInput label="회전" value={layer.imgRotation} onChange={v => update({ imgRotation: v })} min={-180} max={180} />
          <button
            className="text-xs text-gray-400 hover:text-gray-700 mt-0.5"
            onClick={() => {
              pushHistory();
              update({ imgLightness: 0, imgTemperature: 0, imgContrast: 0, imgSaturation: 0, imgScale: 1, imgRotation: 0, _imgFilterCache: null });
            }}
          >
            전체 초기화
          </button>
        </>
      )}
    </div>
  );
}
