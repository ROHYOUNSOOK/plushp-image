'use client';

/* ===========================
   useCanvasEvents — 캔버스 포인터/키보드/휠/드래그드롭 이벤트 핸들러
   CanvasArea.tsx에서 분리
=========================== */

import { useEffect, useCallback } from 'react';
import { W, H, ML_H } from '@/types/constants';
import { useEditorStore } from '@/store/editorStore';
import { hitTestHandle, hitTestLayer, getOverlappingLayers, getGroupBounds } from '@/lib/hitTest';
import type { PositionedLayer, BackgroundLayer, MedBoxLayer, Layer } from '@/types/layer';
import type { Page } from '@/types/page';
import {
  loadImageFromFile,
  applyBackgroundImage,
  applyFrameImage,
  applyImageLayerImage,
  createDroppedImageLayer,
  compressForUpload,
} from '@/lib/imageUpload';
import { toast } from '@/components/editor/Toast';

type LayerSnap = { id: string; x: number; y: number; w: number; h: number };

/** 의료법 페이지: 클릭 위치가 박스 내부 텍스트 영역이면 med-title/med-desc 반환 */
function hitTestMedText(x: number, y: number, page: Page): Layer | null {
  const boxLayer = page.layers.find(l => l.type === 'med-box') as MedBoxLayer | undefined;
  if (!boxLayer || !boxLayer.visible) return null;
  const innerX = boxLayer.x + boxLayer.padL;
  const innerY = boxLayer.y + boxLayer.padT;
  const innerW = boxLayer.w - boxLayer.padL - boxLayer.padR;
  const innerH = boxLayer.h - boxLayer.padT - boxLayer.padB;
  if (x < innerX || x > innerX + innerW || y < innerY || y > innerY + innerH) return null;
  const titleLayer = page.layers.find(l => l.type === 'med-title' && l.visible);
  const descLayer  = page.layers.find(l => l.type === 'med-desc'  && l.visible);
  const midY = innerY + innerH / 2;
  if (y <= midY) return titleLayer ?? descLayer ?? null;
  return descLayer ?? titleLayer ?? null;
}

type DragState = {
  type: 'move' | 'resize' | 'frameImg';
  layerId: string;
  handle?: string;
  ox: number; oy: number;
  startX: number; startY: number;
  startW: number; startH: number;
  startOffX?: number; startOffY?: number;
  rotation?: number;
  startXPct?: number; startYPct?: number;
} | {
  type: 'group-move';
  layerSnaps: LayerSnap[];
  ox: number; oy: number;
} | {
  type: 'group-resize';
  layerSnaps: LayerSnap[];
  handle: string;
  ox: number; oy: number;
  groupX: number; groupY: number; groupW: number; groupH: number;
} | {
  type: 'frameImgResize';
  layerId: string;
  handle: string;
  ox: number; oy: number;
  startImgScale: number;
  startOffX: number; startOffY: number;
  frameW: number; frameH: number;
} | null;

type CycleState = { x: number; y: number; ids: string[]; idx: number } | null;
type ViewState = { scale: number; ox: number; oy: number };

interface UseCanvasEventsParams {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  dragRef: React.MutableRefObject<DragState>;
  cycleRef: React.MutableRefObject<CycleState>;
  spaceDownRef: React.MutableRefObject<boolean>;
  panRef: React.MutableRefObject<{ startX: number; startY: number; startOx: number; startOy: number } | null>;
  viewRef: React.MutableRefObject<ViewState>;
  setView: React.Dispatch<React.SetStateAction<ViewState>>;
}

export function useCanvasEvents({
  canvasRef,
  containerRef,
  dragRef,
  cycleRef,
  spaceDownRef,
  panRef,
  viewRef,
  setView,
}: UseCanvasEventsParams) {

  /* ── 포인터 좌표 변환 ── */
  const getPointer = useCallback((e: React.PointerEvent | React.MouseEvent): { x: number; y: number } => {
    const cv = canvasRef.current;
    if (!cv) return { x: 0, y: 0 };
    const rect = cv.getBoundingClientRect();
    const state = useEditorStore.getState();
    const page = state.pages[state.currentPage];
    const coordH = page?.isMedicalLaw ? ML_H : H;
    return {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top) * (coordH / rect.height),
    };
  }, [canvasRef]);

  /* ── DragEvent 좌표 변환 ── */
  const getDragPointer = useCallback((e: React.DragEvent): { x: number; y: number } => {
    const cv = canvasRef.current;
    if (!cv) return { x: 0, y: 0 };
    const rect = cv.getBoundingClientRect();
    const state = useEditorStore.getState();
    const page = state.pages[state.currentPage];
    const coordH = page?.isMedicalLaw ? ML_H : H;
    return {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top) * (coordH / rect.height),
    };
  }, [canvasRef]);

  /* ── Pointer Down ── */
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (spaceDownRef.current) {
      panRef.current = { startX: e.clientX, startY: e.clientY, startOx: viewRef.current.ox, startOy: viewRef.current.oy };
      canvasRef.current?.setPointerCapture(e.pointerId);
      return;
    }

    const { x, y } = getPointer(e);
    const state = useEditorStore.getState();
    const page = state.pages[state.currentPage];
    if (!page) return;


    const sel = state.selectedLayerId
      ? page.layers.find(l => l.id === state.selectedLayerId) ?? null
      : null;

    if (state.frameEditMode && sel && sel.type === 'frame') {
      const fl = sel as import('@/types/layer').FrameLayer;
      // 코너 핸들 → 내부 이미지 경계 기준 리사이즈
      if (fl.img) {
        const imgBounds = {
          x: fl.x + fl.imgOffsetX,
          y: fl.y + fl.imgOffsetY,
          w: fl.img.naturalWidth  * fl.imgScale,
          h: fl.img.naturalHeight * fl.imgScale,
        } as PositionedLayer;
        const ch = hitTestHandle(imgBounds, x, y);
        if (ch) {
          state.pushHistory();
          dragRef.current = {
            type: 'frameImgResize', layerId: fl.id, handle: ch,
            ox: x, oy: y,
            startImgScale: fl.imgScale,
            startOffX: fl.imgOffsetX, startOffY: fl.imgOffsetY,
            frameW: fl.w, frameH: fl.h,
          };
          canvasRef.current?.setPointerCapture(e.pointerId);
          return;
        }
      }
      if (x >= fl.x && x <= fl.x + fl.w && y >= fl.y && y <= fl.y + fl.h) {
        state.pushHistory();
        dragRef.current = {
          type: 'frameImg', layerId: fl.id,
          ox: x, oy: y,
          startX: fl.x, startY: fl.y, startW: fl.w, startH: fl.h,
          startOffX: fl.imgOffsetX, startOffY: fl.imgOffsetY,
          rotation: fl.rotation || 0,
        };
        canvasRef.current?.setPointerCapture(e.pointerId);
        return;
      }
      state.setFrameEditMode(false);
    }

    // 다중 선택 그룹 조작
    if (state.selectedLayerIds.length > 1) {
      const groupLayers = state.selectedLayerIds
        .map(id => page.layers.find(l => l.id === id))
        .filter((l): l is PositionedLayer => l != null && l.type !== 'background' && 'x' in l);
      const bounds = getGroupBounds(groupLayers);
      if (bounds) {
        const groupHandle = hitTestHandle(bounds as PositionedLayer, x, y);
        if (groupHandle) {
          state.pushHistory();
          dragRef.current = {
            type: 'group-resize',
            layerSnaps: groupLayers.map(l => ({ id: l.id, x: l.x, y: l.y, w: l.w, h: l.h })),
            handle: groupHandle,
            ox: x, oy: y,
            groupX: bounds.x, groupY: bounds.y, groupW: bounds.w, groupH: bounds.h,
          };
          canvasRef.current?.setPointerCapture(e.pointerId);
          return;
        }
        const hitLayer = hitTestLayer(x, y, page);
        if (hitLayer && state.selectedLayerIds.includes(hitLayer.id)) {
          state.pushHistory();
          dragRef.current = {
            type: 'group-move',
            layerSnaps: groupLayers.map(l => ({ id: l.id, x: l.x, y: l.y, w: l.w, h: l.h })),
            ox: x, oy: y,
          };
          canvasRef.current?.setPointerCapture(e.pointerId);
          return;
        }
      }
    }

    if (sel && sel.type !== 'background') {
      const handle = hitTestHandle(sel as PositionedLayer, x, y);
      if (handle) {
        const pl = sel as PositionedLayer;
        state.pushHistory();
        dragRef.current = {
          type: 'resize', layerId: sel.id, handle,
          ox: x, oy: y,
          startX: pl.x, startY: pl.y, startW: pl.w, startH: pl.h,
        };
        canvasRef.current?.setPointerCapture(e.pointerId);
        return;
      }
    }

    const CYCLE_RADIUS = 18;
    const prev = cycleRef.current;
    const overlapping = getOverlappingLayers(x, y, page);
    let hit = hitTestLayer(x, y, page);

    // 의료법 페이지: 박스 내부 텍스트 영역 클릭 → med-title/med-desc 우선 선택
    if (page.isMedicalLaw && hit?.type === 'med-box') {
      const textHit = hitTestMedText(x, y, page);
      if (textHit) hit = textHit;
    }

    if (!e.shiftKey && overlapping.length > 1 && hit) {
      const nearPrev = prev && Math.hypot(x - prev.x, y - prev.y) < CYCLE_RADIUS;
      if (nearPrev && prev) {
        const nextIdx = (prev.idx + 1) % prev.ids.length;
        const nextId = prev.ids[nextIdx];
        const nextLayer = page.layers.find(l => l.id === nextId) ?? null;
        cycleRef.current = { x, y, ids: prev.ids, idx: nextIdx };
        hit = nextLayer;
      } else {
        const ids = overlapping.map(l => l.id);
        const topIdx = ids.indexOf(hit.id);
        cycleRef.current = { x, y, ids, idx: topIdx >= 0 ? topIdx : 0 };
      }
    } else {
      cycleRef.current = null;
    }

    if (hit) {
      if (e.shiftKey) {
        state.selectToggle(hit.id);
        const noPosSh = hit.type === 'background' || hit.type === 'med-title' || hit.type === 'med-desc';
        if (!noPosSh) {
          const pl = hit as PositionedLayer;
          state.pushHistory();
          dragRef.current = { type: 'move', layerId: hit.id, ox: x, oy: y, startX: pl.x, startY: pl.y, startW: pl.w, startH: pl.h };
          canvasRef.current?.setPointerCapture(e.pointerId);
        }
      } else if (hit.groupId && hit.type !== 'background') {
        // 그룹 레이어 클릭 → 같은 groupId 전체 선택 후 group-move
        const members = page.layers.filter(l => l.groupId === hit.groupId && l.type !== 'background') as PositionedLayer[];
        state.selectSingle(members[0].id);
        members.slice(1).forEach(m => state.selectToggle(m.id));
        state.pushHistory();
        dragRef.current = {
          type: 'group-move',
          layerSnaps: members.map(l => ({ id: l.id, x: l.x, y: l.y, w: l.w, h: l.h })),
          ox: x, oy: y,
        };
        canvasRef.current?.setPointerCapture(e.pointerId);
      } else {
        state.selectSingle(hit.id);
        const noPos = hit.type === 'background' || hit.type === 'med-title' || hit.type === 'med-desc';
        if (!noPos) {
          const pl = hit as PositionedLayer;
          state.pushHistory();
          dragRef.current = { type: 'move', layerId: hit.id, ox: x, oy: y, startX: pl.x, startY: pl.y, startW: pl.w, startH: pl.h };
          canvasRef.current?.setPointerCapture(e.pointerId);
        }
      }
    } else {
      cycleRef.current = null;
      state.selectSingle(null);
    }
  }, [canvasRef, dragRef, cycleRef, spaceDownRef, panRef, viewRef, getPointer]);

  /* ── Pointer Move ── */
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (panRef.current) {
      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;
      setView(prev => ({ ...prev, ox: panRef.current!.startOx + dx, oy: panRef.current!.startOy + dy }));
      return;
    }

    const { x, y } = getPointer(e);
    const drag = dragRef.current;

    if (!drag) {
      const state = useEditorStore.getState();
      const page = state.pages[state.currentPage];
      if (page) {
        const hov = hitTestLayer(x, y, page);
        const newHovId = hov?.id ?? null;
        if (newHovId !== state.hoverId) state.setHoverId(newHovId);
      }
      return;
    }

    const dx = x - drag.ox;
    const dy = y - drag.oy;

    if (drag.type === 'group-move') {
      const state = useEditorStore.getState();
      state.setPages(state.pages.map((pg, pi) => {
        if (pi !== state.currentPage) return pg;
        return {
          ...pg,
          layers: pg.layers.map(l => {
            const snap = drag.layerSnaps.find(s => s.id === l.id);
            if (!snap) return l;
            return { ...l, x: snap.x + dx, y: snap.y + dy };
          }),
        };
      }));
      return;
    }

    if (drag.type === 'group-resize') {
      const h = drag.handle;
      const isSide = h === 'n' || h === 's' || h === 'e' || h === 'w';
      const isCorner = !isSide;
      const cx = drag.groupX + drag.groupW / 2;
      const cy = drag.groupY + drag.groupH / 2;
      let newGX = drag.groupX, newGY = drag.groupY;
      let newGW = drag.groupW, newGH = drag.groupH;

      if (isSide) {
        // 사이드 핸들: 중앙 고정, 양쪽으로 동등하게 확장
        if (h === 'e') newGW = Math.max(20, drag.groupW + dx * 2);
        if (h === 'w') newGW = Math.max(20, drag.groupW - dx * 2);
        if (h === 's') newGH = Math.max(20, drag.groupH + dy * 2);
        if (h === 'n') newGH = Math.max(20, drag.groupH - dy * 2);
        newGX = cx - newGW / 2;
        newGY = cy - newGH / 2;
      } else {
        // 코너 핸들: 반대편 코너 고정
        if (h.includes('e')) newGW = Math.max(20, drag.groupW + dx);
        if (h.includes('w')) { newGW = Math.max(20, drag.groupW - dx); newGX = drag.groupX + dx; }
        if (h.includes('s')) newGH = Math.max(20, drag.groupH + dy);
        if (h.includes('n')) { newGH = Math.max(20, drag.groupH - dy); newGY = drag.groupY + dy; }
      }

      if (e.shiftKey && drag.groupW > 0 && drag.groupH > 0) {
        const aspect = drag.groupW / drag.groupH;
        if (isCorner) {
          const scale = Math.max(0.01, Math.abs(dx) >= Math.abs(dy) ? newGW / drag.groupW : newGH / drag.groupH);
          newGW = Math.max(20, Math.round(drag.groupW * scale));
          newGH = Math.max(20, Math.round(drag.groupH * scale));
          if (h.includes('w')) newGX = drag.groupX + drag.groupW - newGW;
          if (h.includes('n')) newGY = drag.groupY + drag.groupH - newGH;
        } else if (h === 'e' || h === 'w') {
          newGH = Math.max(20, Math.round(newGW / aspect));
          newGY = cy - newGH / 2;
        } else if (h === 'n' || h === 's') {
          newGW = Math.max(20, Math.round(newGH * aspect));
          newGX = cx - newGW / 2;
        }
      }
      const scaleX = newGW / drag.groupW;
      const scaleY = newGH / drag.groupH;
      const state = useEditorStore.getState();
      state.setPages(state.pages.map((pg, pi) => {
        if (pi !== state.currentPage) return pg;
        return {
          ...pg,
          layers: pg.layers.map(l => {
            const snap = drag.layerSnaps.find(s => s.id === l.id);
            if (!snap) return l;
            return {
              ...l,
              x: Math.round(newGX + (snap.x - drag.groupX) * scaleX),
              y: Math.round(newGY + (snap.y - drag.groupY) * scaleY),
              w: Math.max(10, Math.round(snap.w * scaleX)),
              h: Math.max(10, Math.round(snap.h * scaleY)),
            };
          }),
        };
      }));
      return;
    }

    if (drag.type === 'frameImgResize') {
      const state = useEditorStore.getState();
      const fl = state.pages[state.currentPage]?.layers.find(l => l.id === drag.layerId) as import('@/types/layer').FrameLayer | undefined;
      if (!fl?.img) return;
      const h = drag.handle;
      const isCorner = h.length === 2;
      const outward = isCorner
        ? (h === 'se' ? dx + dy : h === 'nw' ? -dx - dy : h === 'ne' ? dx - dy : -dx + dy)
        : (h === 'e' ? dx : h === 'w' ? -dx : h === 's' ? dy : -dy);
      const refDist = Math.sqrt(drag.frameW * drag.frameW + drag.frameH * drag.frameH);
      const newScale = Math.max(0.02, Math.min(20, drag.startImgScale * Math.max(0.05, 1 + outward / refDist)));
      // 프레임 중앙이 바라보는 이미지 콘텐츠 좌표를 고정
      const imgCX = (drag.frameW / 2 - drag.startOffX) / drag.startImgScale;
      const imgCY = (drag.frameH / 2 - drag.startOffY) / drag.startImgScale;
      state.updateLayer(drag.layerId, {
        imgScale: newScale,
        imgOffsetX: drag.frameW / 2 - imgCX * newScale,
        imgOffsetY: drag.frameH / 2 - imgCY * newScale,
      } as Partial<import('@/types/layer').FrameLayer>);
      return;
    }

    if (drag.type === 'frameImg') {
      const angle = (drag.rotation || 0) * Math.PI / 180;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const localDx = dx * cos + dy * sin;
      const localDy = -dx * sin + dy * cos;
      useEditorStore.getState().updateLayer(drag.layerId, {
        imgOffsetX: (drag.startOffX ?? 0) + localDx,
        imgOffsetY: (drag.startOffY ?? 0) + localDy,
      } as Partial<import('@/types/layer').FrameLayer>);
    } else if (drag.type === 'move') {
      let newX = drag.startX + dx;
      let newY = drag.startY + dy;
      const SNAP = 15;
      const _state = useEditorStore.getState();
      const _coordH = _state.pages[_state.currentPage]?.isMedicalLaw ? ML_H : H;
      const cx = newX + drag.startW / 2, cy = newY + drag.startH / 2;
      if (Math.abs(cx - W / 2) < SNAP) newX = W / 2 - drag.startW / 2;
      if (Math.abs(cy - _coordH / 2) < SNAP) newY = _coordH / 2 - drag.startH / 2;
      if (Math.abs(newX) < SNAP) newX = 0;
      if (Math.abs(newY) < SNAP) newY = 0;
      if (Math.abs(newX + drag.startW - W) < SNAP) newX = W - drag.startW;
      if (Math.abs(newY + drag.startH - _coordH) < SNAP) newY = _coordH - drag.startH;
      if (Math.abs(newX - 30) < SNAP) newX = 30;
      if (Math.abs(newY - 30) < SNAP) newY = 30;
      if (Math.abs(newX + drag.startW - (W - 30)) < SNAP) newX = W - 30 - drag.startW;
      if (Math.abs(newY + drag.startH - (_coordH - 30)) < SNAP) newY = _coordH - 30 - drag.startH;
      useEditorStore.getState().updateLayer(drag.layerId, { x: newX, y: newY } as Partial<PositionedLayer>);
    } else if (drag.type === 'resize') {
      const h = drag.handle!;
      let newX = drag.startX, newY = drag.startY;
      let newW = drag.startW, newH = drag.startH;
      if (h.includes('e')) newW = Math.max(10, drag.startW + dx);
      if (h.includes('w')) { newW = Math.max(10, drag.startW - dx); newX = drag.startX + dx; }
      if (h.includes('s')) newH = Math.max(10, drag.startH + dy);
      if (h.includes('n')) { newH = Math.max(10, drag.startH - dy); newY = drag.startY + dy; }
      if (e.shiftKey && drag.startW > 0 && drag.startH > 0) {
        const aspect = drag.startW / drag.startH;
        const isCorner = (h.includes('n') || h.includes('s')) && (h.includes('e') || h.includes('w'));
        if (isCorner) {
          const scale = Math.max(0.05, Math.abs(dx) >= Math.abs(dy) ? newW / drag.startW : newH / drag.startH);
          newW = Math.max(10, Math.round(drag.startW * scale));
          newH = Math.max(10, Math.round(drag.startH * scale));
          if (h.includes('w')) newX = drag.startX + drag.startW - newW;
          if (h.includes('n')) newY = drag.startY + drag.startH - newH;
        } else if (h === 'e' || h === 'w') {
          newH = Math.max(10, Math.round(newW / aspect));
        } else if (h === 'n' || h === 's') {
          newW = Math.max(10, Math.round(newH * aspect));
          if (h === 'n') newY = drag.startY + drag.startH - newH;
        }
      }
      const _state = useEditorStore.getState();
      const _layer = _state.pages[_state.currentPage]?.layers.find(l => l.id === drag.layerId);
      if (_layer?.type === 'doctor-card') {
        const dc = _layer as import('@/types/layer').DoctorCardLayer;
        const ratio = drag.startW > 0 ? newW / drag.startW : 1;
        _state.updateLayer(drag.layerId, {
          x: newX, y: newY, w: newW, h: newH,
          subjectSize:   Math.max(6, Math.round(dc.subjectSize   * ratio)),
          nameSize:      Math.max(6, Math.round(dc.nameSize      * ratio)),
          suffixSize:    Math.max(6, Math.round(dc.suffixSize    * ratio)),
          specialtySize: Math.max(6, Math.round(dc.specialtySize * ratio)),
        } as Partial<import('@/types/layer').DoctorCardLayer>);
      } else {
        _state.updateLayer(drag.layerId, { x: newX, y: newY, w: newW, h: newH } as Partial<PositionedLayer>);
      }
    }
  }, [dragRef, panRef, getPointer, setView]);

  /* ── Pointer Up ── */
  const onPointerUp = useCallback(() => {
    panRef.current = null;
    dragRef.current = null;
  }, [panRef, dragRef]);

  /* ── Double Click ── */
  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    const { x, y } = getPointer(e as unknown as React.PointerEvent);
    const state = useEditorStore.getState();
    const page = state.pages[state.currentPage];
    if (!page) return;

    // 의료법 페이지: 박스 내부 텍스트 영역 더블클릭 → 해당 레이어 선택
    if (page.isMedicalLaw) {
      let hit = hitTestLayer(x, y, page);
      if (hit?.type === 'med-box') {
        const textHit = hitTestMedText(x, y, page);
        if (textHit) hit = textHit;
      }
      if (hit) state.selectSingle(hit.id);
      return;
    }

    const hit = hitTestLayer(x, y, page);
    if (hit?.type === 'frame') {
      state.selectSingle(hit.id);
      state.setFrameEditMode(!state.frameEditMode);
      toast(state.frameEditMode ? '프레임 이미지 편집 모드' : '프레임 편집 모드 해제');
    } else if (hit?.type === 'textbox') {
      state.selectSingle(hit.id);
      state.setInlineEditingId(hit.id);
    }
  }, [getPointer]);

  /* ── Drag Over ── */
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const state = useEditorStore.getState();
    const page = state.pages[state.currentPage];
    if (page?.isMedicalLaw) return;
    const { x, y } = getDragPointer(e);
    const hit = hitTestLayer(x, y, page!);
    const newId = (hit && ['frame', 'image', 'background'].includes(hit.type)) ? hit.id : null;
    if (newId !== state.dropTargetId || !state.isDragOver) {
      state.setDropTargetId(newId);
      state.setIsDragOver(true);
    }
  }, [getDragPointer]);

  /* ── Drag Leave ── */
  const onDragLeave = useCallback((e: React.DragEvent) => {
    const cv = canvasRef.current;
    if (cv && !cv.contains(e.relatedTarget as Node)) {
      useEditorStore.getState().setIsDragOver(false);
      useEditorStore.getState().setDropTargetId(null);
    }
  }, [canvasRef]);

  /* ── Drop ── */
  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const state = useEditorStore.getState();
    state.setIsDragOver(false);
    state.setDropTargetId(null);
    const page = state.pages[state.currentPage];
    if (!page || page.isMedicalLaw) return;
    const files = [...(e.dataTransfer.files || [])].filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    const { x, y } = getDragPointer(e);
    try {
      const { img, url } = await loadImageFromFile(files[0]);
      state.pushHistory();
      const hit = hitTestLayer(x, y, page);
      if (hit && hit.type === 'frame') {
        // 즉시 적용 (blob URL)
        const fr = hit as import('@/types/layer').FrameLayer;
        const sc = Math.max(fr.w / img.naturalWidth, fr.h / img.naturalHeight);
        useEditorStore.getState().updateLayer(hit.id, {
          img,
          url,
          imgScale: sc,
          imgOffsetX: (fr.w - img.naturalWidth * sc) / 2,
          imgOffsetY: (fr.h - img.naturalHeight * sc) / 2,
        });
        state.selectSingle(hit.id);

        const scheduleRow = state.currentScheduleRow;
        if (scheduleRow) {
          const { buildScheduleFolderName } = await import('./useScheduleApplication');
          const folderName = buildScheduleFolderName(scheduleRow as unknown as Parameters<typeof buildScheduleFolderName>[0]);
          const pageIdx = state.pages.findIndex(pg => pg.layers.some(l => l.id === hit.id));
          const pageIndex = (pageIdx >= 0 ? pageIdx : state.currentPage) + 1;
          const { toast: dropToast, hideToast: dropHideToast } = await import('@/components/editor/Toast');
          const { checkScheduleImageExists } = await import('@/lib/supabase');
          const alreadyExists = await checkScheduleImageExists(folderName, pageIndex);
          if (alreadyExists && !confirm(`페이지 ${pageIndex}의 이미지가 이미 존재합니다.\n새 이미지로 교체하시겠습니까?`)) return;
          dropToast('이미지 업로드 중...', 0);
          try {
            const compressed = await compressForUpload(img);
            const formData = new FormData();
            formData.append('file', compressed, 'image.jpg');
            formData.append('folderName', folderName);
            formData.append('pageIndex', String(pageIndex));
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000);
            const res = await fetch('/api/upload-schedule-image', { method: 'POST', body: formData, signal: controller.signal });
            clearTimeout(timeout);
            const data = await res.json();
            dropHideToast();
            if (data.url) {
              useEditorStore.getState().updateLayer(hit.id, { url: data.url });
              dropToast('업로드 완료');
            } else {
              dropToast('업로드 실패 — 로컬 이미지로 적용됨');
            }
          } catch {
            dropHideToast();
            dropToast('업로드 실패 — 로컬 이미지로 적용됨');
          }
        } else {
          toast('프레임 이미지 적용');
        }
      } else if (hit && hit.type === 'image') {
        applyImageLayerImage(hit as import('@/types/layer').ImageLayer, img, url);
        state.selectSingle(hit.id);
        state.setPages([...state.pages]);
        toast('이미지 교체');
      } else {
        const bgLayer = page.layers.find(l => l.type === 'background') as BackgroundLayer | undefined;
        if (bgLayer) {
          applyBackgroundImage(bgLayer, img, url, state.pages);
          state.selectSingle(bgLayer.id);
          state.setPages([...state.pages]);
          toast('배경 이미지 적용');
        } else {
          const layer = createDroppedImageLayer(img, url, x, y);
          const tbIdx = page.layers.findIndex(l => l.type === 'textbox');
          page.layers.splice(tbIdx >= 0 ? tbIdx : page.layers.length, 0, layer);
          state.selectSingle(layer.id);
          state.setPages([...state.pages]);
          toast('새 이미지 레이어 추가');
        }
      }
    } catch {
      toast('이미지 로드 실패');
    }
  }, [canvasRef, getDragPointer]);

  /* ── 마우스 휠 ── */
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const state = useEditorStore.getState();
      const page = state.pages[state.currentPage];
      if (!page) return;
      const sel = state.selectedLayerId
        ? page.layers.find(l => l.id === state.selectedLayerId) ?? null
        : null;
      if (!sel || sel.type === 'background') {
        const cr = containerRef.current!.getBoundingClientRect();
        const cx = cr.left + cr.width / 2;
        const cy = cr.top + cr.height / 2;
        setView(prev => {
          const newScale = Math.min(5, Math.max(0.1, prev.scale * (e.deltaY > 0 ? 0.9 : 1.1)));
          return {
            scale: newScale,
            ox: (e.clientX - cx) * (1 - newScale / prev.scale) + prev.ox * (newScale / prev.scale),
            oy: (e.clientY - cy) * (1 - newScale / prev.scale) + prev.oy * (newScale / prev.scale),
          };
        });
        return;
      }
      const delta = e.deltaY > 0 ? 0.95 : 1.05;
      if (sel.type === 'frame' && state.frameEditMode) {
        const fl = sel as import('@/types/layer').FrameLayer;
        const oldScale = fl.imgScale;
        const newScale = Math.min(20, Math.max(0.02, oldScale * delta));
        if (fl.img) {
          fl.imgOffsetX -= fl.img.naturalWidth * (newScale - oldScale) / 2;
          fl.imgOffsetY -= fl.img.naturalHeight * (newScale - oldScale) / 2;
        }
        fl.imgScale = newScale;
        state.setPages([...state.pages]);
        return;
      }
      if (sel.type !== 'textbox') {
        const allIds = state.selectedLayerIds;
        if (allIds.length > 1) {
          // 다중 선택(그룹) → 그룹 중앙 기준 비례 스케일
          const groupLayers = allIds
            .map(id => page.layers.find(ly => ly.id === id))
            .filter((l): l is PositionedLayer => !!l && l.type !== 'background' && 'x' in l);
          const minX = Math.min(...groupLayers.map(l => l.x));
          const minY = Math.min(...groupLayers.map(l => l.y));
          const maxX = Math.max(...groupLayers.map(l => l.x + l.w));
          const maxY = Math.max(...groupLayers.map(l => l.y + l.h));
          const gcx = (minX + maxX) / 2, gcy = (minY + maxY) / 2;
          groupLayers.forEach(pl => {
            pl.x = gcx + (pl.x - gcx) * delta;
            pl.y = gcy + (pl.y - gcy) * delta;
            const prevW = pl.w;
            pl.w = Math.max(20, pl.w * delta);
            pl.h = Math.max(20, pl.h * delta);
            if ((pl as import('@/types/layer').Layer).type === 'doctor-card') {
              const dc = pl as import('@/types/layer').DoctorCardLayer;
              const ratio = prevW > 0 ? pl.w / prevW : 1;
              dc.subjectSize   = Math.max(6, Math.round(dc.subjectSize   * ratio));
              dc.nameSize      = Math.max(6, Math.round(dc.nameSize      * ratio));
              dc.suffixSize    = Math.max(6, Math.round(dc.suffixSize    * ratio));
              dc.specialtySize = Math.max(6, Math.round(dc.specialtySize * ratio));
            }
          });
        } else {
          const pl = sel as PositionedLayer;
          const cx = pl.x + pl.w / 2, cy = pl.y + pl.h / 2;
          const prevW = pl.w;
          pl.w = Math.max(20, pl.w * delta);
          pl.h = Math.max(20, pl.h * delta);
          pl.x = cx - pl.w / 2;
          pl.y = cy - pl.h / 2;
          if (sel.type === 'doctor-card') {
            const dc = sel as import('@/types/layer').DoctorCardLayer;
            const ratio = prevW > 0 ? pl.w / prevW : 1;
            dc.subjectSize   = Math.max(6, Math.round(dc.subjectSize   * ratio));
            dc.nameSize      = Math.max(6, Math.round(dc.nameSize      * ratio));
            dc.suffixSize    = Math.max(6, Math.round(dc.suffixSize    * ratio));
            dc.specialtySize = Math.max(6, Math.round(dc.specialtySize * ratio));
          }
        }
        state.setPages([...state.pages]);
      }
    };
    cv.addEventListener('wheel', onWheel, { passive: false });
    return () => cv.removeEventListener('wheel', onWheel);
  }, [canvasRef, containerRef, setView]);

  /* ── Space 패닝 ── */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        spaceDownRef.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDownRef.current = false;
        panRef.current = null;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [spaceDownRef, panRef]);

  /* ── 키보드 단축키 ── */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const state = useEditorStore.getState();

      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        setView({ scale: 1, ox: 0, oy: 0 });
        toast('뷰 초기화');
        return;
      }
      if (e.key === 'Escape') {
        if (state.frameEditMode) {
          state.setFrameEditMode(false);
          toast('프레임 편집 모드 해제');
        } else if (state.selectedLayerId) {
          state.selectSingle(null);
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault(); state.undo(); return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey))) {
        e.preventDefault(); state.redo(); return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = document.activeElement as HTMLElement | null;
        const tag = active?.tagName ?? '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || active?.isContentEditable) return;
        if (state.selectedLayerIds.length > 0 && !state.inlineEditingId) {
          e.preventDefault();
          state.pushHistory();
          const toDelete = state.selectedLayerIds.filter(id => {
            const layer = state.pages[state.currentPage]?.layers.find(l => l.id === id);
            return layer && layer.type !== 'background';
          });
          if (toDelete.length > 0) state.removeLayers(toDelete);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (!state.selectedLayerId) return;
        const page = state.pages[state.currentPage];
        const sel = page?.layers.find(l => l.id === state.selectedLayerId);
        if (!sel || sel.type === 'background') return;
        state.pushHistory();
        const copy = JSON.parse(JSON.stringify(sel));
        copy.id = `l${Date.now()}_dup`;
        copy.name = `${sel.name} 복사`;
        if ('x' in copy) copy.x += 20;
        if ('y' in copy) copy.y += 20;
        if ('img' in sel && sel.img) copy.img = sel.img;
        if ('frameMaskImg' in sel && (sel as unknown as Record<string, unknown>).frameMaskImg) copy.frameMaskImg = (sel as unknown as Record<string, unknown>).frameMaskImg;
        state.addLayer(copy);
        state.selectSingle(copy.id);
        toast('레이어 복제됨');
      }
      if (e.code === 'KeyF' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const active = document.activeElement as HTMLInputElement | null;
        const isTextInput = active && (
          active.tagName === 'TEXTAREA' ||
          (active.tagName === 'INPUT' && active.type !== 'range' && active.type !== 'checkbox')
        );
        if (isTextInput) return;
        e.preventDefault();
        const page = state.pages[state.currentPage];
        const selId = state.selectedLayerId ?? state.selectedLayerIds[0] ?? null;
        const sel = selId ? page?.layers.find(l => l.id === selId) : null;
        if (sel?.type === 'frame') {
          const next = !state.frameEditMode;
          state.setFrameEditMode(next);
          toast(next ? '프레임 내부 이미지 편집 모드' : '편집 모드 해제');
        } else {
          toast('프레임 레이어를 선택하세요');
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyG' && !e.shiftKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        if (state.selectedLayerIds.length >= 2) {
          state.pushHistory();
          state.groupLayers(state.selectedLayerIds);
          toast(`${state.selectedLayerIds.length}개 레이어 그룹화됨`);
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyG') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        const page = state.pages[state.currentPage];
        const groupIds = new Set(
          state.selectedLayerIds
            .map(id => page?.layers.find(l => l.id === id)?.groupId)
            .filter(Boolean) as string[]
        );
        if (groupIds.size > 0) {
          const toUngroup = page?.layers.filter(l => l.groupId && groupIds.has(l.groupId)).map(l => l.id) ?? [];
          if (toUngroup.length > 0) {
            state.pushHistory();
            state.ungroupLayers(toUngroup);
            toast('그룹 해제됨');
          }
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        const page = state.pages[state.currentPage];
        if (!page) return;
        const ids = page.layers.filter(l => l.type !== 'background').map(l => l.id);
        if (ids.length > 0) {
          useEditorStore.setState({ selectedLayerIds: ids, selectedLayerId: ids[ids.length - 1] });
          toast(`${ids.length}개 레이어 전체 선택`);
        }
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (!state.selectedLayerId || state.inlineEditingId) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        const page = state.pages[state.currentPage];
        const activeIds = state.selectedLayerIds?.length > 1 ? state.selectedLayerIds : [state.selectedLayerId];
        const movable = page?.layers.filter(l => activeIds.includes(l.id) && l.type !== 'background' && 'x' in l);
        if (movable && movable.length > 0) {
          state.pushHistory();
          movable.forEach(l => {
            state.updateLayer(l.id, { x: (l as { x: number }).x + dx, y: (l as { y: number }).y + dy } as Partial<PositionedLayer>);
          });
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setView]);

  return {
    getPointer,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onDoubleClick,
    onDragOver,
    onDragLeave,
    onDrop,
  };
}
