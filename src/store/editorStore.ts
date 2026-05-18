'use client';

/* ===========================
   Zustand Editor Store
   — 원본 전역 변수: plus_page_spread_통합.html 1322~1344행
   — 원본 선택 함수: 2096~2114행
   — 원본 페이지 관리: 1592~1620행
=========================== */

import { create } from 'zustand';
import type { Layer } from '@/types/layer';
import type { TextboxLayer } from '@/types/layer';
import type { Page, MedConfig } from '@/types/page';
import { syncColorsAcrossPages, getBgKeyColor } from '@/lib/colorSync';
import { makeLayer } from '@/lib/layerFactory';
import { calcTextboxPos } from '@/lib/utils';
import { W, H } from '@/types/constants';
import { buildSchedulePages } from '@/lib/applySchedule';
import {
  type HistoryState,
  initialHistoryState,
  pushHistory as histPush,
  undo as histUndo,
  redo as histRedo,
} from './historySlice';

/* ── 스토어 타입 ── */

export interface EditorState extends HistoryState {
  // 페이지
  pages: Page[];
  currentPage: number;

  // 선택
  selectedLayerId: string | null;
  selectedLayerIds: string[];

  // 인터랙션
  frameEditMode: boolean;
  inlineEditingId: string | null;
  hoverId: string | null;
  isExporting: boolean;
  showGuides: boolean;

  // 드래그&드롭
  isDragOver: boolean;
  dropTargetId: string | null;

  // 스케줄
  currentScheduleRow: Record<string, unknown> | null;

  // ── 액션: 페이지 ──
  addPage: () => void;
  deletePage: (index: number) => void;
  switchPage: (index: number) => void;
  renamePage: (index: number, name: string) => void;

  // ── 액션: 선택 ──
  selectSingle: (id: string | null) => void;
  selectToggle: (id: string) => void;

  // ── 액션: 레이어 CRUD ──
  addLayer: (layer: Layer) => void;
  removeLayer: (id: string) => void;
  removeLayers: (ids: string[]) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  reorderLayer: (fromIdx: number, toIdx: number) => void;
  reorderLayers: (fromIdxs: number[], toIdx: number) => void;
  toggleVisible: (id: string) => void;
  toggleLocked: (id: string) => void;

  // ── 액션: 히스토리 ──
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // ── 액션: 기타 ──
  setFrameEditMode: (v: boolean) => void;
  setInlineEditingId: (id: string | null) => void;
  setHoverId: (id: string | null) => void;
  setIsExporting: (v: boolean) => void;
  setShowGuides: (v: boolean) => void;
  setPages: (pages: Page[]) => void;
  applySyncColors: (autoColor: string, shadowColor: string) => void;
  setIsDragOver: (v: boolean) => void;
  setDropTargetId: (id: string | null) => void;
  toggleMedicalLaw: (index: number) => void;
  updateMedConfig: (index: number, updates: Partial<import('@/types/page').MedConfig>) => void;
  applySchedule: (texts: string[], doctors: string[], doctorSpecialty: string, doctorSpecialties?: string[], doctorDepartments?: string[], doctorImageUrls?: (string | null)[], doctorImages?: (HTMLImageElement | null)[], frameImages?: { img: HTMLImageElement | null; url: string | null }[], frameInnerImages?: { img: HTMLImageElement | null; url: string | null }[]) => void;
  setCurrentScheduleRow: (row: Record<string, unknown> | null) => void;
}

/* ── 헬퍼 ── */

function getCurrentPageLayers(state: EditorState): Layer[] {
  return state.pages[state.currentPage]?.layers ?? [];
}

/* ── 스토어 생성 ── */

export const useEditorStore = create<EditorState>((set, get) => ({
  // 초기 상태
  pages: [{ id: 1, name: '', layers: [] }],
  currentPage: 0,
  selectedLayerId: null,
  selectedLayerIds: [],
  frameEditMode: false,
  inlineEditingId: null,
  hoverId: null,
  isExporting: false,
  showGuides: true,
  isDragOver: false,
  dropTargetId: null,
  currentScheduleRow: null,
  ...initialHistoryState,

  // ── 페이지 ──

  addPage: () => set(state => {
    // 로고 레이어 자동 생성 (외곽선 활성화, 좌상 가이드라인 위치)
    const logoLayer = makeLayer('logo') as import('@/types/layer').LogoLayer;
    logoLayer.stroke = { enabled: true, color: null, width: 3, radius: 0 };

    // 기존 페이지의 로고 이미지 자동 복사
    for (const pg of state.pages) {
      const existingLogo = pg.layers.find(l => l.type === 'logo') as import('@/types/layer').LogoLayer | undefined;
      if (existingLogo?.img) {
        logoLayer.img = existingLogo.img;
        logoLayer.url = existingLogo.url;
        logoLayer.w = existingLogo.w;
        logoLayer.h = existingLogo.h;
        break;
      }
    }

    const newPage: Page = { id: state.pages.length + 1, name: '', layers: [logoLayer] };
    const pages = [...state.pages, newPage];
    return {
      pages,
      currentPage: pages.length - 1,
      selectedLayerId: null,
      selectedLayerIds: [],
      frameEditMode: false,
    };
  }),

  deletePage: (index) => set(state => {
    if (state.pages.length <= 1) return state;
    const pages = state.pages.filter((_, i) => i !== index);
    const currentPage = state.currentPage >= pages.length ? pages.length - 1 : state.currentPage;
    return {
      pages,
      currentPage,
      selectedLayerId: null,
      selectedLayerIds: [],
    };
  }),

  switchPage: (index) => set({
    currentPage: index,
    selectedLayerId: null,
    selectedLayerIds: [],
    frameEditMode: false,
    inlineEditingId: null,
  }),

  renamePage: (index, name) => set(state => {
    const pages = [...state.pages];
    pages[index] = { ...pages[index], name };
    return { pages };
  }),

  // ── 선택 ──

  selectSingle: (id) => set({
    selectedLayerId: id,
    selectedLayerIds: id ? [id] : [],
  }),

  selectToggle: (id) => set(state => {
    const ids = [...state.selectedLayerIds];
    if (ids.includes(id)) {
      const filtered = ids.filter(x => x !== id);
      return {
        selectedLayerIds: filtered,
        selectedLayerId: filtered.at(-1) ?? null,
      };
    } else {
      ids.push(id);
      return {
        selectedLayerIds: ids,
        selectedLayerId: id,
      };
    }
  }),

  // ── 레이어 CRUD ──

  addLayer: (layer) => set(state => {
    const pages = [...state.pages];
    const page = { ...pages[state.currentPage] };
    const layers = [...page.layers];

    if (layer.type === 'background') {
      // 배경: 항상 최하단
      layers.unshift(layer);
    } else if (layer.type === 'frame' || layer.type === 'image') {
      // 프레임/이미지: 배경 바로 위 (배경 다음 첫 번째 비배경 위치)
      let idx = -1;
      for (let j = layers.length - 1; j >= 0; j--) { if (layers[j].type === 'background') { idx = j; break; } }
      layers.splice(idx + 1, 0, layer);
    } else if (layer.type === 'logo') {
      // 로고: 항상 최상단
      layers.push(layer);
    } else if (layer.type === 'textbox') {
      // 텍스트박스: 로고 바로 아래
      const logoIdx = layers.findIndex(l => l.type === 'logo');
      if (logoIdx >= 0) layers.splice(logoIdx, 0, layer);
      else layers.push(layer);
    } else {
      // 나머지: 텍스트박스/로고 아래
      const anchorIdx = layers.findIndex(l => l.type === 'textbox' || l.type === 'logo');
      if (anchorIdx >= 0) layers.splice(anchorIdx, 0, layer);
      else layers.push(layer);
    }

    page.layers = layers;
    pages[state.currentPage] = page;
    return { pages };
  }),

  removeLayer: (id) => set(state => {
    const pages = [...state.pages];
    const page = { ...pages[state.currentPage] };
    page.layers = page.layers.filter(l => l.id !== id);
    pages[state.currentPage] = page;
    const selectedLayerId = state.selectedLayerId === id ? null : state.selectedLayerId;
    const selectedLayerIds = state.selectedLayerIds.filter(x => x !== id);
    return { pages, selectedLayerId, selectedLayerIds };
  }),

  removeLayers: (ids) => set(state => {
    const idSet = new Set(ids);
    const pages = [...state.pages];
    const page = { ...pages[state.currentPage] };
    page.layers = page.layers.filter(l => !idSet.has(l.id));
    pages[state.currentPage] = page;
    const selectedLayerId = idSet.has(state.selectedLayerId ?? '') ? null : state.selectedLayerId;
    return { pages, selectedLayerId, selectedLayerIds: [] };
  }),

  updateLayer: (id, updates) => set(state => {
    const pages = [...state.pages];
    const page = { ...pages[state.currentPage] };
    page.layers = page.layers.map(l =>
      l.id === id ? { ...l, ...updates } as Layer : l
    );
    pages[state.currentPage] = page;
    return { pages };
  }),

  reorderLayer: (fromIdx, toIdx) => set(state => {
    const pages = [...state.pages];
    const page = { ...pages[state.currentPage] };
    const layers = [...page.layers];
    const [moved] = layers.splice(fromIdx, 1);
    layers.splice(toIdx, 0, moved);
    page.layers = layers;
    pages[state.currentPage] = page;
    return { pages };
  }),

  reorderLayers: (fromIdxs, toIdx) => set(state => {
    const pages = [...state.pages];
    const page = { ...pages[state.currentPage] };
    const layers = [...page.layers];
    // 이동할 레이어를 원래 순서 유지하며 추출
    const sortedIdxs = [...fromIdxs].sort((a, b) => a - b);
    const movedLayers = sortedIdxs.map(i => layers[i]);
    // toIdx 앞에 있는 선택 레이어 수 (삽입 위치 보정용)
    const beforeCount = sortedIdxs.filter(i => i < toIdx).length;
    // 선택 레이어 제거
    const remaining = layers.filter((_, i) => !fromIdxs.includes(i));
    // +1: 목표 항목의 위쪽(패널 기준 위 = 배열 기준 뒤)에 삽입
    const insertAt = Math.max(0, Math.min(toIdx - beforeCount + 1, remaining.length));
    remaining.splice(insertAt, 0, ...movedLayers);
    page.layers = remaining;
    pages[state.currentPage] = page;
    return { pages };
  }),

  toggleVisible: (id) => set(state => {
    const pages = [...state.pages];
    const page = { ...pages[state.currentPage] };
    page.layers = page.layers.map(l =>
      l.id === id ? { ...l, visible: !l.visible } as Layer : l
    );
    pages[state.currentPage] = page;
    return { pages };
  }),

  toggleLocked: (id) => set(state => {
    const pages = [...state.pages];
    const page = { ...pages[state.currentPage] };
    page.layers = page.layers.map(l =>
      l.id === id ? { ...l, locked: !l.locked } as Layer : l
    );
    pages[state.currentPage] = page;
    return { pages };
  }),

  // ── 히스토리 ──

  pushHistory: () => set(state => {
    const result = histPush(state, state.pages);
    return { _history: result._history, _historyIndex: result._historyIndex, _redoStack: result._redoStack };
  }),

  undo: () => set(state => {
    const result = histUndo(state, state.pages);
    if (!result) return state;
    let { currentPage, selectedLayerId, selectedLayerIds } = state;
    if (currentPage >= result.pages.length) currentPage = result.pages.length - 1;
    const pageLayerIds = new Set(result.pages[currentPage]?.layers.map(l => l.id) ?? []);
    if (selectedLayerId && !pageLayerIds.has(selectedLayerId)) {
      selectedLayerId = null;
      selectedLayerIds = [];
    } else {
      selectedLayerIds = selectedLayerIds.filter(id => pageLayerIds.has(id));
    }
    return {
      pages: result.pages,
      ...result.newState,
      currentPage,
      selectedLayerId,
      selectedLayerIds,
    };
  }),

  redo: () => set(state => {
    const result = histRedo(state);
    if (!result) return state;
    let { currentPage, selectedLayerId, selectedLayerIds } = state;
    if (currentPage >= result.pages.length) currentPage = result.pages.length - 1;
    const pageLayerIds = new Set(result.pages[currentPage]?.layers.map(l => l.id) ?? []);
    if (selectedLayerId && !pageLayerIds.has(selectedLayerId)) {
      selectedLayerId = null;
      selectedLayerIds = [];
    } else {
      selectedLayerIds = selectedLayerIds.filter(id => pageLayerIds.has(id));
    }
    return {
      pages: result.pages,
      ...result.newState,
      currentPage,
      selectedLayerId,
      selectedLayerIds,
    };
  }),

  // ── 기타 ──

  setFrameEditMode: (v) => set({ frameEditMode: v }),
  setInlineEditingId: (id) => set({ inlineEditingId: id }),
  setHoverId: (id) => set({ hoverId: id }),
  setIsExporting: (v) => set({ isExporting: v }),
  setShowGuides: (v) => set({ showGuides: v }),
  setPages: (pages) => set({ pages }),

  applySyncColors: (autoColor, shadowColor) => set(state => ({
    pages: syncColorsAcrossPages(
      state.pages,
      autoColor,
      shadowColor,
      getBgKeyColor(state.pages, state.currentPage, autoColor),
    ),
  })),

  setIsDragOver: (v) => set({ isDragOver: v }),
  setDropTargetId: (id) => set({ dropTargetId: id }),

  toggleMedicalLaw: (index) => set(state => {
    const pages = [...state.pages];
    const page = { ...pages[index] };
    if (page.isMedicalLaw) {
      page.isMedicalLaw = false;
    } else {
      page.isMedicalLaw = true;
      if (!page.medConfig) {
        page.medConfig = {
          marginX: 20, marginY: 20,
          padL: 20, padR: 20, padT: 35, padB: 35,
          boxAlpha: 0.9, boxColor: '#ffffff',
          boxStrokeEnabled: false, boxStrokeWidth: 2, boxStrokeColor: '#e0e0e0',
          midFillEnabled: false, midFillColor: '#f5f5f5',
          shadowColor: '#000000', shadowAlpha: 0.15, shadowBlur: 20, shadowX: 0, shadowY: 8,
          radiusTL: 16, radiusTR: 16, radiusBR: 16, radiusBL: 16,
          title: '본 포스팅은 본원에서\n의료법 제 56조 1항을 준수하여 직접 작성한 게시물입니다.',
          desc: '모든 시술 및 수술 후에는 개인에 따라 염증, 출혈, 신경 손상 등의\n부작용이 발생할 수 있으므로 의료진과 충분한 상담을 권장드립니다.',
          titleSize: 38, titleWeight: 700, titleColor: null, titleAccentColor: '#e02020', titleFont: 'GmarketSans', titleTrack: 0,
          descSize: 28, descWeight: 400, descColor: '#555555', descFont: 'GmarketSans', descTrack: 0,
          align: 'center', lineHeight: 1.6, titleLineHeight: 1.6, descLineHeight: 1.6,
          bgColor: '#e8f4f7',
          logo: { img: null, url: null, sizePct: 7, xPct: 6.3, yPct: 17.8, strokeEnabled: true, strokeWidth: 3, strokeColor: null },
        };
      }
    }
    pages[index] = page;
    return { pages };
  }),

  updateMedConfig: (index, updates) => set(state => {
    const pages = [...state.pages];
    const page = { ...pages[index] };
    if (!page.medConfig) return state;
    page.medConfig = { ...page.medConfig, ...updates };
    pages[index] = page;
    return { pages };
  }),

  applySchedule: (texts, doctors, doctorSpecialty, doctorSpecialties = [], doctorDepartments = [], doctorImageUrls = [], doctorImages = [], frameImages = [] as { img: HTMLImageElement | null; url: string | null }[], frameInnerImages = []) => set(state => {
    const pages = buildSchedulePages({
      texts, doctors, doctorSpecialty,
      doctorSpecialties, doctorDepartments,
      doctorImageUrls, doctorImages, frameImages, frameInnerImages,
      currentPages: state.pages,
    });
    return { pages, currentPage: 0, selectedLayerId: null, selectedLayerIds: [] };
  }),

  setCurrentScheduleRow: (row) => set({ currentScheduleRow: row }),
}));

/* ── 편의 셀렉터 ── */

/** 현재 페이지 객체 */
export const selectCurrentPage = (state: EditorState): Page | null =>
  state.pages[state.currentPage] ?? null;

/** 레이어 ID로 현재 페이지에서 찾기 */
export const selectLayer = (state: EditorState, id: string | null): Layer | null => {
  if (!id) return null;
  return getCurrentPageLayers(state).find(l => l.id === id) ?? null;
};

/** 선택된 단일 레이어 */
export const selectSelectedLayer = (state: EditorState): Layer | null =>
  selectLayer(state, state.selectedLayerId);

/** 선택된 모든 레이어 */
export const selectSelectedLayers = (state: EditorState): Layer[] =>
  state.selectedLayerIds
    .map(id => selectLayer(state, id))
    .filter((l): l is Layer => l !== null);

/** 배경 키 컬러 */
export const selectBgKeyColor = (state: EditorState): string => {
  // 1페이지 배경 solidColor를 브랜드 기준색으로 사용
  const page1Bg = state.pages[0]?.layers.find(l => l.type === 'background');
  if (page1Bg?.type === 'background' && page1Bg.solidColor) return page1Bg.solidColor;
  // fallback: 현재 페이지 배경
  const bg = getCurrentPageLayers(state).find(l => l.type === 'background');
  if (bg?.type === 'background') return bg.solidColor || '#4aabb8';
  return '#4aabb8';
};
