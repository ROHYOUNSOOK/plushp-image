'use client';

import { useEditorStore } from '@/store/editorStore';
import { makeLayer } from '@/lib/layerFactory';

export default function MedicalLawProps() {
  const currentPage = useEditorStore(s => s.currentPage);
  const page = useEditorStore(s => s.pages[s.currentPage]);
  const setPages = useEditorStore(s => s.setPages);
  const pages = useEditorStore(s => s.pages);
  const pushHistory = useEditorStore(s => s.pushHistory);

  const restoreMissingLayers = () => {
    pushHistory();
    const newPages = [...pages];
    let layers = [...page.layers];
    if (!layers.some(l => l.type === 'med-box'))   layers = [...layers, makeLayer('med-box')];
    if (!layers.some(l => l.type === 'med-title'))  layers = [...layers, makeLayer('med-title')];
    if (!layers.some(l => l.type === 'med-desc'))   layers = [...layers, makeLayer('med-desc')];
    if (!layers.some(l => l.type === 'logo'))        layers = [...layers, makeLayer('logo')];
    newPages[currentPage] = { ...page, layers };
    setPages(newPages);
  };

  return (
    <div className="space-y-3 p-1">
      <div className="font-bold text-xs text-gray-500 uppercase">⚖️ 의료법 페이지</div>
      <div className="text-xs text-gray-400 bg-gray-50 rounded p-3 space-y-2 leading-relaxed">
        <p>레이어 패널에서 각 레이어를 선택하여 편집하세요.</p>
        <ul className="list-disc list-inside space-y-1 text-gray-400">
          <li><span className="text-gray-600">⬜ 박스</span> — 위치·크기·색·그림자·패딩</li>
          <li><span className="text-gray-600">📝 제목</span> — 텍스트·폰트·색상</li>
          <li><span className="text-gray-600">📄 설명</span> — 텍스트·폰트·색상</li>
          <li><span className="text-gray-600">🏷 로고</span> — 위치·크기·투명도</li>
          <li><span className="text-gray-600">🌄 배경</span> — 배경색·이미지</li>
        </ul>
      </div>
      <button
        onClick={restoreMissingLayers}
        className="w-full text-xs py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
      >
        누락 레이어 복구
      </button>
    </div>
  );
}
