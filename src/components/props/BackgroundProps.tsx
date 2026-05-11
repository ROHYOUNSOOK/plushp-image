'use client';


import type { BackgroundLayer } from '@/types/layer';
import { useEditorStore } from '@/store/editorStore';
import ColorPickerField from '@/components/ui/ColorPickerField';
import NumberInput from '@/components/ui/NumberInput';
import ImageUploadButton from '@/components/ui/ImageUploadButton';
import { loadImageFromFile, applyBgToAllPages } from '@/lib/imageUpload';
import { toast } from '@/components/editor/Toast';
import { calcAutoFillColor } from '@/lib/colorHelpers';
import { pickRandomBackground } from '@/lib/backgroundLoader';
import { useSyncColors } from '@/hooks/useSyncColors';

export default function BackgroundProps({ layer }: { layer: BackgroundLayer }) {
  const updateLayer = useEditorStore(s => s.updateLayer);
  const pushHistory = useEditorStore(s => s.pushHistory);
  const { applyColorTracking } = useSyncColors();

  const update = (updates: Partial<BackgroundLayer>) => {
    updateLayer(layer.id, updates);
  };

  const autoColor = calcAutoFillColor(layer.solidColor);

  return (
    <div className="space-y-3">
      <div className="font-bold text-xs text-gray-500 uppercase">배경</div>

      {/* 단색 + 자동 추적 */}
      <ColorPickerField
        label="단색"
        color={layer.solidColor}
        onChange={c => update({ solidColor: c })}
      />

      {/* 색상 추적 */}
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded border border-gray-300 shrink-0"
          style={{ background: autoColor }}
          title="자동 계산된 텍스트박스 색"
        />
        <button
          onClick={() => { pushHistory(); applyColorTracking(layer.solidColor); }}
          className="flex-1 text-xs py-1 px-2 rounded border border-gray-300 hover:bg-blue-50 hover:border-blue-400 transition-colors"
          title="텍스트박스·로고 색상을 배경색 기반으로 자동 적용"
        >
          색상 추적 적용
        </button>
      </div>

      <div className="text-xs text-gray-500 mt-2">변환</div>
      <NumberInput
        label="회전"
        value={layer.transform.rotation}
        onChange={v => {
          pushHistory();
          update({ transform: { ...layer.transform, rotation: v } });
        }}
        min={-360} max={360}
      />
      <NumberInput
        label="확대"
        value={Math.round(layer.transform.scale * 100)}
        onChange={v => {
          update({ transform: { ...layer.transform, scale: v / 100 } });
        }}
        min={50} max={300}
      />

      <div className="flex gap-2 mt-1">
        <button
          onClick={() => { pushHistory(); update({ transform: { ...layer.transform, flipH: !layer.transform.flipH } }); }}
          title="좌우 반전"
          className={`flex-1 flex items-center justify-center gap-1 py-1 rounded border text-xs ${layer.transform.flipH ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-300 text-gray-600'}`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="7" y="1" width="2" height="14" rx="0.5" fill="currentColor"/>
            <path d="M5 4L1 8L5 12V9H6V7H5V4Z" fill="currentColor"/>
            <path d="M11 4L15 8L11 12V9H10V7H11V4Z" fill="currentColor"/>
          </svg>
          좌우반전
        </button>
        <button
          onClick={() => { pushHistory(); update({ transform: { ...layer.transform, flipV: !layer.transform.flipV } }); }}
          title="상하 반전"
          className={`flex-1 flex items-center justify-center gap-1 py-1 rounded border text-xs ${layer.transform.flipV ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-300 text-gray-600'}`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="7" width="14" height="2" rx="0.5" fill="currentColor"/>
            <path d="M4 5L8 1L12 5H9V6H7V5H4Z" fill="currentColor"/>
            <path d="M4 11L8 15L12 11H9V10H7V11H4Z" fill="currentColor"/>
          </svg>
          상하반전
        </button>
      </div>

      <div className="mt-2 space-y-1.5">
        {/* 랜덤 배경 선택 */}
        <button
          onClick={async () => {
            toast('배경 불러오는 중...');
            try {
              const { img, url } = await pickRandomBackground();
              pushHistory();
              const state = useEditorStore.getState();
              applyBgToAllPages(img, url, state.pages);
              state.setPages([...state.pages]);
              toast('배경 적용 완료');
            } catch (e) {
              toast('배경 로드 실패: ' + (e instanceof Error ? e.message : ''));
            }
          }}
          className="w-full py-2 text-sm font-medium rounded border border-blue-400 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
        >
          🎲 배경 색상 및 이미지 변경
        </button>

        <ImageUploadButton
          label={layer.img ? '배경 이미지 교체' : '배경 이미지 업로드'}
          onFile={async (file) => {
            try {
              const { img, url } = await loadImageFromFile(file);
              pushHistory();
              const state = useEditorStore.getState();
              applyBgToAllPages(img, url, state.pages);
              state.setPages([...state.pages]);
              toast('배경 이미지 적용');
            } catch { toast('이미지 로드 실패'); }
          }}
        />
      </div>
      {layer.img && (
        <div className="text-xs text-green-600 mt-1">이미지 적용됨</div>
      )}
    </div>
  );
}
