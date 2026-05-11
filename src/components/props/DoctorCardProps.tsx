'use client';


import type { DoctorCardLayer } from '@/types/layer';
import { useEditorStore } from '@/store/editorStore';
import ColorPickerField from '@/components/ui/ColorPickerField';
import NumberInput from '@/components/ui/NumberInput';
import { applyDoctorCardTemplate } from '@/lib/doctorCardTemplate';
import { toast } from '@/components/editor/Toast';

const FONTS = ['GmarketSans', 'Pretendard', 'SCoreDream', 'Jalnan'];

export default function DoctorCardProps({ layer }: { layer: DoctorCardLayer }) {
  const updateLayer = useEditorStore(s => s.updateLayer);
  const pushHistory = useEditorStore(s => s.pushHistory);
  const pages = useEditorStore(s => s.pages);
  const currentPage = useEditorStore(s => s.currentPage);
  const setPages = useEditorStore(s => s.setPages);

  const update = (u: Partial<DoctorCardLayer>) => updateLayer(layer.id, u);

  const handleTemplate = (count: 1 | 2 | 3 | 4) => {
    pushHistory();
    const newPages = [...pages];
    newPages[currentPage] = applyDoctorCardTemplate(pages[currentPage], count);
    setPages(newPages);
    toast(`의사카드 ${count}인 배치 완료`);
  };

  return (
    <div className="space-y-3">
      <div className="font-bold text-xs text-gray-500 uppercase">의사 카드</div>

      {/* 자동 배치 버튼 */}
      <div>
        <div className="text-xs text-gray-500 font-bold mb-1">자동 배치</div>
        <div className="grid grid-cols-4 gap-1">
          {([1, 2, 3, 4] as const).map(n => (
            <button key={n} onClick={() => handleTemplate(n)}
              className="px-1 py-1.5 text-xs rounded border border-gray-300 hover:bg-blue-50 hover:border-blue-400 transition-colors">
              {n}인
            </button>
          ))}
        </div>
      </div>

      {/* 위치 */}
      <div className="grid grid-cols-2 gap-1">
        <NumberInput label="X" value={layer.x} onChange={v => update({ x: v })} />
        <NumberInput label="Y" value={layer.y} onChange={v => update({ y: v })} />
      </div>

      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs text-gray-600 w-16 shrink-0">정렬</span>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map(a => (
            <button key={a} onClick={() => update({ align: a })}
              className={`px-2 py-0.5 text-xs rounded border ${layer.align === a ? 'bg-blue-100 border-blue-400' : 'border-gray-300'}`}
            >
              {a === 'left' ? '◀' : a === 'center' ? '◆' : '▶'}
            </button>
          ))}
        </div>
      </div>

      <NumberInput label="행간" value={layer.lineGap} onChange={v => update({ lineGap: v })} min={0} max={50} />

      {/* 진료과목 */}
      <div className="text-xs text-gray-500 mt-2 font-bold">진료과목</div>
      <input type="text" value={layer.subject} onChange={e => update({ subject: e.target.value })}
        className="w-full text-xs p-1.5 border border-gray-300 rounded" />
      <div className="grid grid-cols-2 gap-1">
        <NumberInput label="크기" value={layer.subjectSize} onChange={v => update({ subjectSize: v })} min={10} />
        <NumberInput label="굵기" value={layer.subjectWeight} onChange={v => update({ subjectWeight: v })} min={100} max={900} step={100} />
      </div>
      <ColorPickerField label="색" color={layer.subjectColor} onChange={c => update({ subjectColor: c })} />
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs text-gray-600 w-16 shrink-0">폰트</span>
        <select value={layer.subjectFont} onChange={e => update({ subjectFont: e.target.value })}
          className="flex-1 text-xs px-1.5 py-1 border border-gray-300 rounded">
          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* 이름 */}
      <div className="text-xs text-gray-500 mt-2 font-bold">원장 이름</div>
      <input type="text" value={layer.doctorName} onChange={e => update({ doctorName: e.target.value })}
        className="w-full text-xs p-1.5 border border-gray-300 rounded" />
      <div className="grid grid-cols-2 gap-1">
        <NumberInput label="크기" value={layer.nameSize} onChange={v => update({ nameSize: v })} min={10} />
        <NumberInput label="굵기" value={layer.nameWeight} onChange={v => update({ nameWeight: v })} min={100} max={900} step={100} />
      </div>
      <ColorPickerField label="색" color={layer.nameColor} onChange={c => update({ nameColor: c })} />
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs text-gray-600 w-16 shrink-0">폰트</span>
        <select value={layer.nameFont} onChange={e => update({ nameFont: e.target.value })}
          className="flex-1 text-xs px-1.5 py-1 border border-gray-300 rounded">
          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* suffix */}
      <div className="text-xs text-gray-500 mt-2 font-bold">접미사</div>
      <input type="text" value={layer.suffixText} onChange={e => update({ suffixText: e.target.value })}
        className="w-full text-xs p-1.5 border border-gray-300 rounded" />
      <div className="grid grid-cols-2 gap-1">
        <NumberInput label="크기" value={layer.suffixSize} onChange={v => update({ suffixSize: v })} min={10} />
        <NumberInput label="굵기" value={layer.suffixWeight} onChange={v => update({ suffixWeight: v })} min={100} max={900} step={100} />
      </div>
      <div className="grid grid-cols-2 gap-1">
        <NumberInput label="간격" value={layer.nameSuffixGap} onChange={v => update({ nameSuffixGap: v })} min={0} />
      </div>
      <ColorPickerField label="색" color={layer.suffixColor} onChange={c => update({ suffixColor: c })} />

      {/* 전문의 */}
      <div className="text-xs text-gray-500 mt-2 font-bold">전문의</div>
      <input type="text" value={layer.specialty} onChange={e => update({ specialty: e.target.value })}
        className="w-full text-xs p-1.5 border border-gray-300 rounded" />
      <div className="grid grid-cols-2 gap-1">
        <NumberInput label="크기" value={layer.specialtySize} onChange={v => update({ specialtySize: v })} min={10} />
        <NumberInput label="굵기" value={layer.specialtyWeight} onChange={v => update({ specialtyWeight: v })} min={100} max={900} step={100} />
      </div>
      <ColorPickerField label="색" color={layer.specialtyColor} onChange={c => update({ specialtyColor: c })} />
    </div>
  );
}
