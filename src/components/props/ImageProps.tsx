'use client';


import type { ImageLayer } from '@/types/layer';
import { useEditorStore } from '@/store/editorStore';
import NumberInput from '@/components/ui/NumberInput';
import SliderInput from '@/components/ui/SliderInput';
import ImageUploadButton from '@/components/ui/ImageUploadButton';
import CustomCheckbox from '@/components/ui/CustomCheckbox';
import { loadImageFromFile, applyImageLayerImage, compressForUploadWithImage, uploadScheduleImage, deleteOldImageLayerFile } from '@/lib/imageUpload';
import { setFilterFrozen } from '@/canvas/webglFilters';
import { toast, hideToast } from '@/components/editor/Toast';

export default function ImageProps({ layer }: { layer: ImageLayer }) {
  const updateLayer = useEditorStore(s => s.updateLayer);
  const pushHistory = useEditorStore(s => s.pushHistory);

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
        <CustomCheckbox
          checked={layer.shadow.enabled}
          onChange={v => update({ shadow: { ...layer.shadow, enabled: v } })}
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
              const previousUrl = layer.url; // 교체 전 URL — 업로드 성공 후 서버의 이전 파일 삭제용
              const { img: origImg } = await loadImageFromFile(file);
              useEditorStore.getState().pushHistory();

              // 편집·저장 해상도 일치 (프레임 내부 이미지와 동일 방식)
              const { blob, img, url: blobUrl } = await compressForUploadWithImage(origImg);
              applyImageLayerImage(layer, img, blobUrl);
              useEditorStore.getState().setPages([...useEditorStore.getState().pages]);
              toast('이미지 적용');

              const scheduleRow = useEditorStore.getState().currentScheduleRow;
              if (!scheduleRow) {
                toast('스케줄을 먼저 적용해주세요 (이미지는 로컬에만 적용됨)');
                return;
              }

              const { buildScheduleFolderName } = await import('@/hooks/useScheduleApplication');
              const folderName = buildScheduleFolderName(scheduleRow as unknown as Parameters<typeof buildScheduleFolderName>[0]);
              const state = useEditorStore.getState();
              const pageIdx = state.pages.findIndex(pg => pg.layers.some(l => l.id === layer.id));
              const pageIndex = (pageIdx >= 0 ? pageIdx : state.currentPage ?? 0) + 1;

              toast('이미지 업로드 중...', 0);
              const uploadedUrl = await uploadScheduleImage(folderName, pageIndex, blob, `img${layer.id}`);
              hideToast();
              if (uploadedUrl) {
                useEditorStore.getState().updateLayer(layer.id, { url: uploadedUrl });
                toast('업로드 완료');
                // 같은 레이어의 이전 이미지 정리 — 새 파일과 파일명이 다를 때만(같으면 방금 올린 파일을 덮어쓴 것)
                if (previousUrl && previousUrl.split('/').pop() !== uploadedUrl.split('/').pop()) {
                  deleteOldImageLayerFile(folderName, previousUrl);
                }
              } else {
                toast('업로드 실패 — 로컬 이미지로 적용됨');
              }
            } catch { toast('이미지 로드 실패'); }
          }}
        />
      </div>
      {layer.img && <div className="text-xs text-green-600 mt-1">이미지 적용됨</div>}

      {/* 이미지 조정 (Camera Raw — 프레임과 동일) */}
      {layer.img && (
        <>
          <div className="text-xs text-gray-500 mt-2">이미지 조정</div>
          {(() => {
            const onFilterChange = (patch: Partial<ImageLayer>) => {
              setFilterFrozen(true);
              update(patch);
            };
            const onFilterEnd = () => {
              setFilterFrozen(false);
              update({ _imgFilterCache: null });
            };
            return (
              <>
                <SliderInput label="노출" value={layer.imgLightness ?? 0} min={-20} max={20} step={0.1}
                  onChange={v => onFilterChange({ imgLightness: v })}
                  onChangeEnd={onFilterEnd} />
                <SliderInput label="색온도" value={layer.imgTemperature ?? 0} min={-20} max={20}
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
          <button
            className="text-xs text-gray-400 hover:text-gray-700 mt-0.5"
            onClick={() => {
              pushHistory();
              update({ imgLightness: 0, imgTemperature: 0, imgContrast: 0, imgSaturation: 0, _imgFilterCache: null });
            }}
          >
            보정 초기화
          </button>
        </>
      )}
    </div>
  );
}
