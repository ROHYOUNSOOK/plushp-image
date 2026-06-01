/* ===========================
   History (Undo/Redo) Logic
   — 원본: plus_page_spread_통합.html 1650~1724행
   — 레이어 img 직렬화: imageCache에 보관, 스냅샷에는 '__cached__' 센티널
=========================== */

import type { Layer } from '@/types/layer';
import type { Page } from '@/types/page';
import { MAX_HISTORY } from '@/types/constants';
import imageCache from './imageCache';

/* ── 직렬화/역직렬화 ── */

type SerializedLayer = Record<string, unknown>;
type SerializedPage = {
  id: number;
  name: string;
  layers: SerializedLayer[];
  isMedicalLaw?: boolean;
};

function serializeLayers(layers: Layer[]): SerializedLayer[] {
  return layers.map(l => {
     
    const copy = { ...l } as any;
    if ('img' in l && l.img) {
      imageCache.set(l.id + '_img', l.img as HTMLImageElement);
      copy.img = '__cached__';
    }
    if (copy.frameMaskImg) {
      imageCache.set(l.id + '_mask', copy.frameMaskImg as HTMLImageElement);
      copy.frameMaskImg = '__cached__';
    }
    return copy as SerializedLayer;
  });
}

function deserializeLayers(layers: SerializedLayer[]): Layer[] {
  return layers.map(l => {
    const copy = { ...l } as Record<string, unknown>;
    if (copy.img === '__cached__') copy.img = imageCache.get(copy.id + '_img') || null;
    if (copy.frameMaskImg === '__cached__') copy.frameMaskImg = imageCache.get(copy.id + '_mask') || null;
    return copy as unknown as Layer;
  });
}

/* ── 스냅샷 생성/적용 ── */

export function createSnapshot(pages: Page[]): SerializedPage[] {
  return pages.map(p => {
    const pageCopy: SerializedPage = {
      id: p.id,
      name: p.name || '',
      layers: serializeLayers(p.layers),
    };
    if (p.isMedicalLaw) pageCopy.isMedicalLaw = true;
    return pageCopy;
  });
}

export function applySnapshot(snap: SerializedPage[]): Page[] {
  return snap.map(p => {
    const page: Page = {
      id: p.id,
      name: p.name || '',
      layers: deserializeLayers(p.layers),
    };
    if (p.isMedicalLaw) page.isMedicalLaw = true;
    return page;
  });
}

/* ── 히스토리 상태 타입 ── */

export interface HistoryState {
  _history: SerializedPage[][];
  _historyIndex: number;
  _redoStack: SerializedPage[][];
}

export const initialHistoryState: HistoryState = {
  _history: [],
  _historyIndex: -1,
  _redoStack: [],
};

/* ── 히스토리 액션 ── */

/**
 * 현재 pages를 히스토리에 저장 (변경 직전에 호출).
 * 새 변경이 발생하면 redo 스택은 초기화된다.
 */
export function pushHistory(
  state: HistoryState,
  pages: Page[],
): HistoryState {
  const snap = createSnapshot(pages);
  const newHistory = state._history.slice(0, state._historyIndex + 1);
  newHistory.push(snap);
  if (newHistory.length > MAX_HISTORY) newHistory.shift();
  return {
    _history: newHistory,
    _historyIndex: newHistory.length - 1,
    _redoStack: [], // 새 변경 → redo 스택 초기화
  };
}

/**
 * 실행 취소.
 * - currentPages: 현재 라이브 상태 (복원 후 redo로 되돌릴 수 있도록 저장)
 */
export function undo(
  state: HistoryState,
  currentPages: Page[],
): { pages: Page[]; newState: HistoryState } | null {
  if (state._historyIndex < 0) return null;

  // 현재 라이브 상태를 redo 스택에 쌓아 redo 가능하게 함
  const liveSnap = createSnapshot(currentPages);

  return {
    pages: applySnapshot(state._history[state._historyIndex]),
    newState: {
      _history: state._history,
      _historyIndex: state._historyIndex - 1,
      _redoStack: [liveSnap, ...state._redoStack],
    },
  };
}

/**
 * 다시 실행.
 * redo 스택에서 꺼내 복원하고, 히스토리 인덱스를 앞으로 이동.
 */
export function redo(
  state: HistoryState,
): { pages: Page[]; newState: HistoryState } | null {
  if (state._redoStack.length === 0) return null;

  const [snapToRestore, ...remainingRedoStack] = state._redoStack;
  return {
    pages: applySnapshot(snapToRestore),
    newState: {
      _history: state._history,
      _historyIndex: state._historyIndex + 1,
      _redoStack: remainingRedoStack,
    },
  };
}
