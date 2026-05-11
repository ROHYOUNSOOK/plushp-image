'use client';


import { useEditorStore } from '@/store/editorStore';
import type { MedConfig } from '@/types/page';
import ColorPickerField from '@/components/ui/ColorPickerField';
import NumberInput from '@/components/ui/NumberInput';
import SliderInput from '@/components/ui/SliderInput';
import ImageUploadButton from '@/components/ui/ImageUploadButton';
import { loadImageFromFile } from '@/lib/imageUpload';
import { toast } from '@/components/editor/Toast';
import type { MedLogoConfig } from '@/types/page';
import { calcAutoFillColor } from '@/lib/colorHelpers';

const FONTS = ['GmarketSans', 'Pretendard', 'SCoreDream', 'Jalnan'];

const PRESET_LOGOS = [
  { label: '사각', url: '/plus/pluslogo.png' },
  { label: '원형', url: '/plus/pluslogo_circle.png' },
];

async function loadLogoViaBlobUrl(url: string): Promise<HTMLImageElement> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`로고 로드 실패: ${url}`);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = blobUrl;
  });
}

export default function MedicalLawProps() {
  const currentPage = useEditorStore(s => s.currentPage);
  const page = useEditorStore(s => s.pages[s.currentPage]);
  const updateMedConfig = useEditorStore(s => s.updateMedConfig);
  const setPages = useEditorStore(s => s.setPages);
  const pages = useEditorStore(s => s.pages);

  const cfg = page?.medConfig;
  if (!cfg) return null;

  const upd = (u: Partial<MedConfig>) => updateMedConfig(currentPage, u);

  return (
    <div className="space-y-3">
      <div className="font-bold text-xs text-gray-500 uppercase">⚖️ 의료법 이미지 제작</div>

      {/* 배경 이미지 */}
      <div>
        <div className="text-xs text-gray-500 font-bold mb-1">배경 이미지</div>
        <ImageUploadButton
          label="배경 이미지 선택"
          onFile={async (file) => {
            try {
              const { img, url } = await loadImageFromFile(file);
              const newPages = [...pages];
              const pg = { ...newPages[currentPage] };
              pg.medConfig = { ...cfg, bgImg: img, bgUrl: url };
              newPages[currentPage] = pg;
              setPages(newPages);
              toast('배경 이미지 적용');
            } catch { toast('이미지 로드 실패'); }
          }}
        />
        <ColorPickerField label="배경 색" color={cfg.bgColor || '#e8f4f7'} onChange={c => upd({ bgColor: c })} />
      </div>

      {/* 캔버스·박스 */}
      <details open>
        <summary className="text-xs font-bold text-gray-600 cursor-pointer py-1">캔버스 · 박스</summary>
        <div className="space-y-2 mt-2">
          <div className="grid grid-cols-2 gap-1">
            <NumberInput label="좌우 여백" value={cfg.marginX} onChange={v => upd({ marginX: v })} min={0} />
            <NumberInput label="상하 여백" value={cfg.marginY} onChange={v => upd({ marginY: v })} min={0} />
          </div>
          <div className="grid grid-cols-2 gap-1">
            <NumberInput label="모서리" value={cfg.radiusTL} onChange={v => upd({ radiusTL: v, radiusTR: v, radiusBR: v, radiusBL: v })} min={0} />
            <SliderInput label="불투명도" value={cfg.boxAlpha * 100} onChange={v => upd({ boxAlpha: v / 100 })} min={0} max={100} />
          </div>
          <ColorPickerField label="박스 색" color={cfg.boxColor} onChange={c => upd({ boxColor: c })} />
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={cfg.boxStrokeEnabled} onChange={e => {
              const enabled = e.target.checked;
              upd({ boxStrokeEnabled: enabled, ...(enabled ? { boxStrokeColor: calcAutoFillColor(cfg.bgColor || '#e8f4f7') } : {}) });
            }} />
            <span className="text-xs">획 사용</span>
          </div>
          {cfg.boxStrokeEnabled && (
            <>
              <NumberInput label="획 두께" value={cfg.boxStrokeWidth} onChange={v => upd({ boxStrokeWidth: v })} min={0} />
              <ColorPickerField label="획 색" color={cfg.boxStrokeColor} onChange={c => upd({ boxStrokeColor: c })} />
            </>
          )}
        </div>
      </details>

      {/* 그림자 */}
      <details open>
        <summary className="text-xs font-bold text-gray-600 cursor-pointer py-1">박스 그림자</summary>
        <div className="space-y-2 mt-2">
          <ColorPickerField label="그림자 색" color={cfg.shadowColor} onChange={c => upd({ shadowColor: c })} />
          <SliderInput label="투명도" value={cfg.shadowAlpha * 100} onChange={v => upd({ shadowAlpha: v / 100 })} min={0} max={100} />
          <SliderInput label="번짐" value={cfg.shadowBlur} onChange={v => upd({ shadowBlur: v })} min={0} max={80} />
          <div className="grid grid-cols-2 gap-1">
            <NumberInput label="X 이동" value={cfg.shadowX} onChange={v => upd({ shadowX: v })} />
            <NumberInput label="Y 이동" value={cfg.shadowY} onChange={v => upd({ shadowY: v })} />
          </div>
        </div>
      </details>

      {/* 패딩 */}
      <details>
        <summary className="text-xs font-bold text-gray-600 cursor-pointer py-1">내부 패딩</summary>
        <div className="grid grid-cols-2 gap-1 mt-2">
          <NumberInput label="좌" value={cfg.padL} onChange={v => upd({ padL: v })} min={0} />
          <NumberInput label="우" value={cfg.padR} onChange={v => upd({ padR: v })} min={0} />
          <NumberInput label="상" value={cfg.padT} onChange={v => upd({ padT: v })} min={0} />
          <NumberInput label="하" value={cfg.padB} onChange={v => upd({ padB: v })} min={0} />
        </div>
      </details>

      {/* 제목 */}
      <details open>
        <summary className="text-xs font-bold text-gray-600 cursor-pointer py-1">제목 텍스트</summary>
        <div className="space-y-2 mt-2">
          <textarea
            value={cfg.title}
            onChange={e => upd({ title: e.target.value })}
            className="w-full text-xs p-1.5 border border-gray-300 rounded resize-none"
            rows={3}
          />
          <div className="grid grid-cols-2 gap-1">
            <NumberInput label="크기" value={cfg.titleSize} onChange={v => upd({ titleSize: v })} min={10} />
            <NumberInput label="굵기" value={cfg.titleWeight} onChange={v => upd({ titleWeight: v })} min={100} max={900} step={100} />
          </div>
          <SliderInput label="줄간격" value={(cfg.titleLineHeight ?? cfg.lineHeight) * 10} onChange={v => upd({ titleLineHeight: v / 10 })} min={10} max={30} />
          <div className="flex items-center gap-1">
            <div className="flex-1">
              <ColorPickerField
                label={cfg.titleColor ? '색' : '색 (자동)'}
                color={cfg.titleColor || calcAutoFillColor(cfg.bgColor || '#e8f4f7')}
                onChange={c => upd({ titleColor: c })}
              />
            </div>
            {cfg.titleColor && (
              <button
                onClick={() => upd({ titleColor: null })}
                className="text-xs text-gray-400 hover:text-blue-500 shrink-0 px-1"
                title="자동(배경색 기반)으로 초기화"
              >
                자동
              </button>
            )}
          </div>
          <ColorPickerField label="강조색" color={cfg.titleAccentColor || '#e02020'} onChange={c => upd({ titleAccentColor: c })} />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 w-16 shrink-0">폰트</span>
            <select value={cfg.titleFont} onChange={e => upd({ titleFont: e.target.value })}
              className="flex-1 text-xs px-1.5 py-1 border border-gray-300 rounded">
              {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </details>

      {/* 설명 */}
      <details open>
        <summary className="text-xs font-bold text-gray-600 cursor-pointer py-1">설명 텍스트</summary>
        <div className="space-y-2 mt-2">
          <textarea
            value={cfg.desc}
            onChange={e => upd({ desc: e.target.value })}
            className="w-full text-xs p-1.5 border border-gray-300 rounded resize-none"
            rows={3}
          />
          <div className="grid grid-cols-2 gap-1">
            <NumberInput label="크기" value={cfg.descSize} onChange={v => upd({ descSize: v })} min={10} />
            <NumberInput label="굵기" value={cfg.descWeight} onChange={v => upd({ descWeight: v })} min={100} max={900} step={100} />
          </div>
          <SliderInput label="줄간격" value={(cfg.descLineHeight ?? cfg.lineHeight) * 10} onChange={v => upd({ descLineHeight: v / 10 })} min={10} max={30} />
          <ColorPickerField label="색" color={cfg.descColor} onChange={c => upd({ descColor: c })} />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 w-16 shrink-0">폰트</span>
            <select value={cfg.descFont} onChange={e => upd({ descFont: e.target.value })}
              className="flex-1 text-xs px-1.5 py-1 border border-gray-300 rounded">
              {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </details>

      {/* 로고 */}
      <details open>
        <summary className="text-xs font-bold text-gray-600 cursor-pointer py-1">로고</summary>
        <div className="space-y-2 mt-2">
          {/* 프리셋 로고 선택 */}
          <div className="flex gap-2">
            {PRESET_LOGOS.map(({ label, url }) => (
              <button
                key={url}
                onClick={async () => {
                  try {
                    const img = await loadLogoViaBlobUrl(url);
                    const newPages = [...pages];
                    const pg = { ...newPages[currentPage] };
                    const prevLogo = pg.medConfig?.logo;
                    pg.medConfig = {
                      ...cfg,
                      logo: { ...(prevLogo ?? { sizePct: 8, xPct: 88, yPct: 50, strokeEnabled: false, strokeWidth: 3, strokeColor: null }), img, url },
                    };
                    newPages[currentPage] = pg;
                    setPages(newPages);
                    toast(`로고 적용: ${label}`);
                  } catch { toast('로고 로드 실패'); }
                }}
                className={`px-3 py-1 text-xs border rounded hover:bg-blue-50 ${cfg.logo?.url === url ? 'border-blue-400 bg-blue-100' : 'border-gray-300'}`}
              >
                {label}
              </button>
            ))}
            <ImageUploadButton
              label="직접 업로드"
              onFile={async (file) => {
                try {
                  const { img, url } = await loadImageFromFile(file);
                  const prevLogo = cfg.logo;
                  const newPages = [...pages];
                  const pg = { ...newPages[currentPage] };
                  pg.medConfig = {
                    ...cfg,
                    logo: { ...(prevLogo ?? { sizePct: 8, xPct: 88, yPct: 50, strokeEnabled: false, strokeWidth: 3, strokeColor: null }), img, url },
                  };
                  newPages[currentPage] = pg;
                  setPages(newPages);
                  toast('로고 업로드');
                } catch { toast('로고 로드 실패'); }
              }}
            />
          </div>

          {/* 로고 제거 */}
          {cfg.logo?.img && (
            <button
              onClick={() => {
                const newPages = [...pages];
                const pg = { ...newPages[currentPage] };
                pg.medConfig = { ...cfg, logo: { ...cfg.logo!, img: null, url: null } };
                newPages[currentPage] = pg;
                setPages(newPages);
              }}
              className="text-xs text-red-500 hover:underline"
            >
              로고 삭제
            </button>
          )}

          {/* 로고 세부 설정 (이미지 있을 때만) */}
          {cfg.logo?.img && (
            <>
              <NumberInput
                label="크기 (%)"
                value={cfg.logo.sizePct}
                onChange={v => upd({ logo: { ...cfg.logo!, sizePct: v } })}
                min={1} max={100}
              />
              <div className="grid grid-cols-2 gap-1">
                <NumberInput label="X위치 (%)" value={Math.round(cfg.logo.xPct * 10) / 10} onChange={v => upd({ logo: { ...cfg.logo!, xPct: v } })} min={0} max={100} />
                <NumberInput label="Y위치 (%)" value={Math.round(cfg.logo.yPct * 10) / 10} onChange={v => upd({ logo: { ...cfg.logo!, yPct: v } })} min={0} max={100} />
              </div>
            </>
          )}
        </div>
      </details>

      {/* 정렬 · 줄간격 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600 w-16 shrink-0">정렬</span>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map(a => (
            <button key={a} onClick={() => upd({ align: a })}
              className={`px-2 py-0.5 text-xs rounded border ${cfg.align === a ? 'bg-blue-100 border-blue-400' : 'border-gray-300'}`}>
              {a === 'left' ? '◀' : a === 'center' ? '◆' : '▶'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
