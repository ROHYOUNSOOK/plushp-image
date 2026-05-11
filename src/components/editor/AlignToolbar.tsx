'use client';


import React, { useRef, useState } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { alignLayers, distributeLayers, type AlignDir, type DistributeDir } from '@/lib/snapAndAlign';
import type { PositionedLayer } from '@/types/layer';
import { toast } from './Toast';

/* ── SVG 아이콘 (원본 HTML 동일) ── */
const ICONS: Record<string, React.ReactElement> = {
  left: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="1" width="2" height="16" fill="currentColor"/>
      <rect x="5" y="3" width="8" height="4" rx="0.5" fill="currentColor"/>
      <rect x="5" y="11" width="11" height="4" rx="0.5" fill="currentColor"/>
    </svg>
  ),
  centerH: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="8.5" y="1" width="2" height="16" fill="currentColor"/>
      <rect x="3" y="3" width="12" height="4" rx="0.5" fill="currentColor"/>
      <rect x="5" y="11" width="8" height="4" rx="0.5" fill="currentColor"/>
    </svg>
  ),
  right: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="14" y="1" width="2" height="16" fill="currentColor"/>
      <rect x="5" y="3" width="8" height="4" rx="0.5" fill="currentColor"/>
      <rect x="2" y="11" width="11" height="4" rx="0.5" fill="currentColor"/>
    </svg>
  ),
  top: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="2" width="16" height="2" fill="currentColor"/>
      <rect x="3" y="5" width="4" height="8" rx="0.5" fill="currentColor"/>
      <rect x="11" y="5" width="4" height="11" rx="0.5" fill="currentColor"/>
    </svg>
  ),
  centerV: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="8.5" width="16" height="2" fill="currentColor"/>
      <rect x="3" y="3" width="4" height="12" rx="0.5" fill="currentColor"/>
      <rect x="11" y="5" width="4" height="8" rx="0.5" fill="currentColor"/>
    </svg>
  ),
  bottom: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="14" width="16" height="2" fill="currentColor"/>
      <rect x="3" y="5" width="4" height="8" rx="0.5" fill="currentColor"/>
      <rect x="11" y="2" width="4" height="11" rx="0.5" fill="currentColor"/>
    </svg>
  ),
  distH: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="1" width="2" height="16" fill="currentColor"/>
      <rect x="15" y="1" width="2" height="16" fill="currentColor"/>
      <rect x="7" y="4" width="4" height="10" rx="0.5" fill="currentColor"/>
    </svg>
  ),
  distV: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="1" width="16" height="2" fill="currentColor"/>
      <rect x="1" y="15" width="16" height="2" fill="currentColor"/>
      <rect x="4" y="7" width="10" height="4" rx="0.5" fill="currentColor"/>
    </svg>
  ),
};

const ALIGN_BTNS: { key: AlignDir; title: string }[] = [
  { key: 'left',    title: '왼쪽 정렬' },
  { key: 'centerH', title: '수평 중앙 정렬' },
  { key: 'right',   title: '오른쪽 정렬' },
  { key: 'top',     title: '위쪽 정렬' },
  { key: 'centerV', title: '수직 중앙 정렬' },
  { key: 'bottom',  title: '아래쪽 정렬' },
];


export default function AlignToolbar() {
  const showGuides = useEditorStore(s => s.showGuides);

  /* ── 드래그 위치 ── */
  const [pos, setPos] = useState({ x: 12, y: 12 });
  const dragging = useRef(false);
  const startMouse = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    // 버튼 클릭은 드래그 시작 안 함
    if ((e.target as HTMLElement).closest('button')) return;
    dragging.current = true;
    startMouse.current = { x: e.clientX, y: e.clientY };
    startPos.current = { ...pos };
    e.preventDefault();

    const onMove = (me: MouseEvent) => {
      if (!dragging.current) return;
      setPos({
        x: startPos.current.x + (me.clientX - startMouse.current.x),
        y: startPos.current.y + (me.clientY - startMouse.current.y),
      });
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  /* ── 정렬 액션 ── */
  const handleAlign = (dir: AlignDir) => {
    const state = useEditorStore.getState();
    const page = state.pages[state.currentPage];
    if (!page) return;
    const ids = state.selectedLayerIds;
    const targets = page.layers.filter(l => ids.includes(l.id) && l.type !== 'background') as PositionedLayer[];
    if (targets.length === 0) { toast('레이어를 선택하세요'); return; }
    const copies = targets.map(l => ({ ...l })) as PositionedLayer[];
    state.pushHistory();
    alignLayers(copies, dir);
    copies.forEach(c => {
      // textbox는 positionPreset/freePos도 함께 업데이트해야 x/y가 그리기 시 덮어쓰이지 않음
      const upd: Record<string, unknown> = { x: c.x, y: c.y };
      if (c.type === 'textbox') { upd.positionPreset = null; upd.freePos = true; }
      state.updateLayer(c.id, upd as Parameters<typeof state.updateLayer>[1]);
    });
  };

  const handleDistribute = (dir: DistributeDir) => {
    const state = useEditorStore.getState();
    const page = state.pages[state.currentPage];
    if (!page) return;
    const ids = state.selectedLayerIds;
    const targets = page.layers.filter(l => ids.includes(l.id) && l.type !== 'background') as PositionedLayer[];
    if (targets.length < 3) { toast('3개 이상 선택 필요'); return; }
    const copies = targets.map(l => ({ ...l })) as PositionedLayer[];
    state.pushHistory();
    distributeLayers(copies, dir);
    copies.forEach(c => {
      const upd: Record<string, unknown> = { x: c.x, y: c.y };
      if (c.type === 'textbox') { upd.positionPreset = null; upd.freePos = true; }
      state.updateLayer(c.id, upd as Parameters<typeof state.updateLayer>[1]);
    });
  };

  const btnCls = "w-[30px] h-[30px] flex items-center justify-center rounded-[7px] border border-gray-200 bg-white text-gray-700 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-colors cursor-pointer";

  return (
    <div
      style={{ position: 'absolute', left: pos.x, top: pos.y, zIndex: 40 }}
      onMouseDown={onMouseDown}
      className="flex flex-col gap-1 bg-white border border-gray-200 rounded-lg shadow-md px-2 py-1.5 cursor-move select-none"
    >
      {/* 1행: 정렬 + 분배 */}
      <div className="flex items-center gap-1">
        {ALIGN_BTNS.map(({ key, title }) => (
          <button key={key} title={title} onClick={() => handleAlign(key)} className={btnCls}>
            {ICONS[key]}
          </button>
        ))}
        <span className="text-gray-300 text-lg mx-0.5 select-none">|</span>
        <button title="수평 균등 분배 (3개 이상 선택)" onClick={() => handleDistribute('h')} className={btnCls}>
          {ICONS.distH}
        </button>
        <button title="수직 균등 분배 (3개 이상 선택)" onClick={() => handleDistribute('v')} className={btnCls}>
          {ICONS.distV}
        </button>
      </div>

      {/* 2행: 실행취소/다시실행 + 가이드 */}
      <div className="flex items-center gap-1">
        <button title="실행 취소 (Ctrl+Z)" onClick={() => { useEditorStore.getState().undo(); toast('실행 취소'); }} className={btnCls}>
          ↩
        </button>
        <button title="다시 실행 (Ctrl+Shift+Z)" onClick={() => { useEditorStore.getState().redo(); toast('다시 실행'); }} className={btnCls}>
          ↪
        </button>
        <span className="text-gray-300 text-lg mx-0.5 select-none">|</span>
        <button
          title="가이드라인 토글 (Ctrl+G)"
          onClick={() => useEditorStore.getState().setShowGuides(!showGuides)}
          className={`h-[30px] px-2 flex items-center justify-center rounded-[7px] border text-xs font-medium transition-colors cursor-pointer ${
            showGuides ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-900 hover:text-white hover:border-gray-900'
          }`}
        >
          가이드
        </button>
      </div>
    </div>
  );
}
