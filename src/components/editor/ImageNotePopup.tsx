'use client';

import { useRef, useState, useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';

export default function ImageNotePopup() {
  const currentPage = useEditorStore(s => s.currentPage);
  const pages = useEditorStore(s => s.pages);
  const currentScheduleRow = useEditorStore(s => s.currentScheduleRow);

  const [pos, setPos] = useState({ x: 16, y: 120 });
  const [collapsed, setCollapsed] = useState(false);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const onHeaderMouseDown = (e: React.MouseEvent) => {
    if (!ref.current) return;
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  };

  const imageNotes: string[] = (currentScheduleRow as Record<string, unknown>)?.image_notes as string[] ?? [];
  const page = pages[currentPage];
  const isTextPage = page && !page.isMedicalLaw && !page.layers.some(l => l.type === 'doctor-card');

  // 텍스트 페이지만 표시 (문구 페이지 인덱스 계산)
  const textPageIndex = pages.slice(0, currentPage + 1).filter(
    p => !p.isMedicalLaw && !p.layers.some(l => l.type === 'doctor-card')
  ).length - 1;

  const note = isTextPage ? (imageNotes[textPageIndex] ?? '') : '';

  if (!currentScheduleRow || !isTextPage || !note) return null;

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999, width: 260 }}
      className="bg-white border border-orange-200 rounded-xl shadow-lg overflow-hidden select-none"
    >
      <div
        className="flex items-center justify-between px-3 py-2 bg-orange-50 border-b border-orange-100 cursor-move"
        onMouseDown={onHeaderMouseDown}
      >
        <span className="text-[11px] font-semibold text-orange-500">
          이미지 요청 — 페이지 {currentPage + 1}
        </span>
        <button
          className="text-gray-400 hover:text-gray-600 text-sm leading-none"
          onClick={() => setCollapsed(c => !c)}
          onMouseDown={e => e.stopPropagation()}
        >
          {collapsed ? '▾' : '▴'}
        </button>
      </div>
      {!collapsed && (
        <div className="px-3 py-2.5">
          <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{note}</p>
        </div>
      )}
    </div>
  );
}
