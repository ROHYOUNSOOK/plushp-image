/* ===========================
   Hit Testing
   — 원본: plus_page_spread_통합.html 3176~3373행
=========================== */

import type { Layer, PositionedLayer } from '@/types/layer';
import type { Page } from '@/types/page';
import { W, HANDLE_R } from '@/types/constants';

export interface HandlePoint {
  x: number;
  y: number;
  handle: string;
}

/** 레이어의 8방향 리사이즈 핸들 좌표 */
export function getHandlePoints(layer: PositionedLayer): HandlePoint[] {
  const { x, y, w, h } = layer;
  return [
    { x, y, handle: 'nw' },
    { x: x + w / 2, y, handle: 'n' },
    { x: x + w, y, handle: 'ne' },
    { x: x + w, y: y + h / 2, handle: 'e' },
    { x: x + w, y: y + h, handle: 'se' },
    { x: x + w / 2, y: y + h, handle: 's' },
    { x, y: y + h, handle: 'sw' },
    { x, y: y + h / 2, handle: 'w' },
  ];
}

/** 다중 선택 레이어의 합산 바운딩 박스 계산 */
export function getGroupBounds(layers: PositionedLayer[]): { x: number; y: number; w: number; h: number } | null {
  if (layers.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const l of layers) {
    minX = Math.min(minX, l.x);
    minY = Math.min(minY, l.y);
    maxX = Math.max(maxX, l.x + l.w);
    maxY = Math.max(maxY, l.y + l.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** 리사이즈 핸들에 맞았는지 확인 */
export function hitTestHandle(layer: PositionedLayer, px: number, py: number): string | null {
  const thr = HANDLE_R * (W / 600) * 1.6;
  for (const h of getHandlePoints(layer)) {
    if (Math.abs(px - h.x) < thr && Math.abs(py - h.y) < thr) return h.handle;
  }
  return null;
}

/** 최상위 레이어 히트 테스트 (배경 제외, 뒤에서 앞으로 탐색) */
export function hitTestLayer(px: number, py: number, page: Page): Layer | null {
  const layers = page?.layers;
  if (!layers) return null;
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i];
    if (!l.visible || l.locked || l.type === 'background' || l.type === 'med-title' || l.type === 'med-desc') continue;
    const pl = l as PositionedLayer;
    if (px < pl.x || px > pl.x + pl.w || py < pl.y || py > pl.y + pl.h) continue;
    // 프레임: 바운딩박스 전체가 fill로 채워지므로 마스크 체크 없이 항상 히트
    return l;
  }
  return null;
}

/** 클릭 위치에 겹쳐있는 레이어 목록 (앞면 → 뒷면 순서) */
export function getOverlappingLayers(px: number, py: number, page: Page): Layer[] {
  const layers = page?.layers;
  if (!layers) return [];
  return layers
    .filter((l): l is PositionedLayer => l.visible && !l.locked && l.type !== 'background' && l.type !== 'med-title' && l.type !== 'med-desc')
    .filter(l => px >= l.x && px <= l.x + l.w && py >= l.y && py <= l.y + l.h)
    .reverse();
}
