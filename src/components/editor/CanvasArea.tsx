'use client';


/* ===========================
   CanvasArea — 캔버스 렌더링 + 뷰포트 관리
   이벤트 핸들러: hooks/useCanvasEvents.ts
=========================== */

import { useRef, useEffect, useCallback, useState } from 'react';
import { W, H, ML_H } from '@/types/constants';
import { drawImmediate, type DrawContext } from '@/canvas/draw';
import {
  useEditorStore,
  selectCurrentPage,
  selectBgKeyColor,
} from '@/store/editorStore';
import type { BackgroundLayer } from '@/types/layer';
import { toast } from './Toast';
import InlineTextEditor from './InlineTextEditor';
import AlignToolbar from './AlignToolbar';
import ShortcutPanel from './ShortcutPanel';
import type { TextboxLayer } from '@/types/layer';
import { useCanvasEvents } from '@/hooks/useCanvasEvents';

function StatusBar() {
  const selectedCount = useEditorStore(s => s.selectedLayerIds.length);
  const x = useEditorStore(s => {
    const id = s.selectedLayerId;
    if (!id) return null;
    const l = s.pages[s.currentPage]?.layers.find(l => l.id === id);
    return l && 'x' in l ? Math.round((l as { x: number }).x) : null;
  });
  const y = useEditorStore(s => {
    const id = s.selectedLayerId;
    if (!id) return null;
    const l = s.pages[s.currentPage]?.layers.find(l => l.id === id);
    return l && 'y' in l ? Math.round((l as { y: number }).y) : null;
  });
  const w = useEditorStore(s => {
    const id = s.selectedLayerId;
    if (!id) return null;
    const l = s.pages[s.currentPage]?.layers.find(l => l.id === id);
    return l && 'w' in l ? Math.round((l as { w: number }).w) : null;
  });
  const h = useEditorStore(s => {
    const id = s.selectedLayerId;
    if (!id) return null;
    const l = s.pages[s.currentPage]?.layers.find(l => l.id === id);
    return l && 'h' in l ? Math.round((l as { h: number }).h) : null;
  });

  if (selectedCount > 1) {
    return (
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded pointer-events-none">
        {selectedCount}개 선택됨
      </div>
    );
  }
  if (x === null) return null;
  return (
    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded pointer-events-none flex gap-3">
      <span>X: {x}</span>
      <span>Y: {y}</span>
      <span>W: {w}</span>
      <span>H: {h}</span>
    </div>
  );
}

export default function CanvasArea({ showShortcuts = true }: { showShortcuts?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const dragRef = useRef<Parameters<typeof useCanvasEvents>[0]['dragRef']['current']>(null);
  const cycleRef = useRef<{ x: number; y: number; ids: string[]; idx: number } | null>(null);

  /* ── 뷰포트 (패닝 / 줌) ── */
  const [view, setView] = useState({ scale: 1, ox: 0, oy: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const spaceDownRef = useRef(false);
  const panRef = useRef<{ startX: number; startY: number; startOx: number; startOy: number } | null>(null);

  /* ── 이벤트 핸들러 (훅으로 분리) ── */
  const {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onDoubleClick,
    onDragOver,
    onDragLeave,
    onDrop,
  } = useCanvasEvents({
    canvasRef,
    containerRef,
    dragRef,
    cycleRef,
    spaceDownRef,
    panRef,
    viewRef,
    setView,
  });

  /* ── 캔버스 셋업 (DPR 스케일링) ── */
  const setupCanvas = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const page = useEditorStore.getState().pages[useEditorStore.getState().currentPage];
    const drawH = page?.isMedicalLaw ? ML_H : H;
    const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr;
    cv.height = drawH * dpr;
    const container = containerRef.current;
    if (container) {
      const maxW = container.clientWidth - 32;
      const maxH = container.clientHeight - 32;
      const scale = Math.min(maxW / W, maxH / drawH);
      cv.style.width = `${W * scale}px`;
      cv.style.height = `${drawH * scale}px`;
    }
    const ctx = cv.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  /* ── draw 호출 ── */
  const scheduleRedraw = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const cv = canvasRef.current;
      if (!cv) return;
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      const state = useEditorStore.getState();
      const page = selectCurrentPage(state);
      const bgKeyColor = selectBgKeyColor(state);
      const firstPageBg = state.pages[0]?.layers.find(l => l.type === 'background') as BackgroundLayer | undefined;
      const dc: DrawContext = {
        ctx, page, bgKeyColor,
        isExporting: state.isExporting,
        showGuides: state.showGuides,
        frameEditMode: state.frameEditMode,
        selectedLayerId: state.selectedLayerId,
        selectedLayerIds: state.selectedLayerIds,
        hoverId: state.hoverId,
        inlineEditingId: state.inlineEditingId,
        firstPageBg: firstPageBg ? { img: firstPageBg.img, solidColor: firstPageBg.solidColor } : undefined,
        isDragOver: state.isDragOver,
        dropTargetId: state.dropTargetId,
      };
      setupCanvas();
      drawImmediate(dc);
    });
  }, [setupCanvas]);

  /* ── 스토어 변경 시 자동 리드로 ── */
  useEffect(() => {
    const unsub = useEditorStore.subscribe(() => scheduleRedraw());
    const onResize = () => scheduleRedraw();
    window.addEventListener('resize', onResize);
    scheduleRedraw();
    return () => { unsub(); window.removeEventListener('resize', onResize); cancelAnimationFrame(rafRef.current); };
  }, [scheduleRedraw]);

  /* ── 인라인 텍스트 편집 상태 ── */
  const frameEditMode = useEditorStore(s => s.frameEditMode);
  const selectedIsFrame = useEditorStore(s => {
    const id = s.selectedLayerId;
    if (!id) return false;
    return s.pages[s.currentPage]?.layers.find(l => l.id === id)?.type === 'frame';
  });
  const inlineEditingId = useEditorStore(s => s.inlineEditingId);
  const inlineLayer = useEditorStore(s => {
    if (!s.inlineEditingId) return null;
    const page = s.pages[s.currentPage];
    return page?.layers.find(l => l.id === s.inlineEditingId) as TextboxLayer | null ?? null;
  });

  const handleInlineFinish = useCallback((newContent: string) => {
    const state = useEditorStore.getState();
    if (state.inlineEditingId) {
      state.pushHistory();
      state.updateLayer(state.inlineEditingId, { content: newContent });
    }
    state.setInlineEditingId(null);
  }, []);

  const handleInlineCancel = useCallback(() => {
    useEditorStore.getState().setInlineEditingId(null);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center bg-gray-200 p-4 flex-1 min-h-0 overflow-hidden"
      onPointerDown={e => {
        if (e.target === containerRef.current) {
          useEditorStore.getState().selectSingle(null);
        }
      }}
    >
      <canvas
        ref={canvasRef}
        tabIndex={0}
        className="bg-white shadow-lg max-w-full max-h-full outline-none"
        style={{
          transform: `translate(${view.ox}px, ${view.oy}px) scale(${view.scale})`,
          transformOrigin: 'center center',
          cursor: spaceDownRef.current ? (panRef.current ? 'grabbing' : 'grab') : undefined,
        }}
        onPointerDown={e => { canvasRef.current?.focus(); onPointerDown(e); }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onDoubleClick}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onKeyDown={e => {
          if (e.key !== 'Delete' && e.key !== 'Backspace') return;
          const state = useEditorStore.getState();
          if (state.inlineEditingId) return;
          if (state.selectedLayerIds.length === 0) return;
          e.preventDefault();
          state.pushHistory();
          const toDelete = state.selectedLayerIds.filter(id => {
            const layer = state.pages[state.currentPage]?.layers.find(l => l.id === id);
            return layer && layer.type !== 'background';
          });
          if (toDelete.length > 0) state.removeLayers(toDelete);
        }}
      />
      {(selectedIsFrame || frameEditMode) && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-yellow-400 text-yellow-900 font-semibold text-sm px-4 py-1.5 rounded-full shadow-md pointer-events-none select-none transition-all">
          {frameEditMode ? (
            <>
              <span>✏️ 프레임 내부 이미지 편집 중</span>
              <span className="text-yellow-700 font-normal text-xs">· F 또는 Esc 로 종료</span>
            </>
          ) : (
            <>
              <span>🖼 F키로 프레임 내부 이미지 편집</span>
              <span className="text-yellow-700 font-normal text-xs">· Ctrl+휠 로 확대/축소</span>
            </>
          )}
        </div>
      )}
      {showShortcuts && <ShortcutPanel />}
      <AlignToolbar />
      <StatusBar />
      <div className="absolute bottom-2 right-3 flex items-center gap-2 bg-black/40 text-white text-xs px-2 py-1 rounded pointer-events-none select-none">
        <span>{Math.round(view.scale * 100)}%</span>
        {view.scale !== 1 && <span className="text-gray-400">· Ctrl+0 초기화</span>}
      </div>
      {inlineEditingId && inlineLayer && canvasRef.current && (
        <InlineTextEditor
          key={inlineEditingId}
          layer={inlineLayer}
          canvasRect={canvasRef.current.getBoundingClientRect()}
          onFinish={handleInlineFinish}
          onCancel={handleInlineCancel}
        />
      )}
    </div>
  );
}
