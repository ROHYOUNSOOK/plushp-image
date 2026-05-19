/* ===========================
   Hit Testing
   — 원본: plus_page_spread_통합.html 3176~3373행
=========================== */

import type { Layer, PositionedLayer, FrameLayer } from '@/types/layer';
import type { Page } from '@/types/page';
import { W, HANDLE_R } from '@/types/constants';

/**
 * PNG 마스크 히트 마스크 캐시
 * 값 1 = 히트 (마스크 테두리 불투명 영역 OR 내부 구멍)
 * 값 0 = 미스 (마스크 형태 바깥 투명 영역)
 * BFS로 가장자리에서 투명 픽셀을 "외부"로 마킹 → 나머지 투명은 "내부 구멍"
 */
type HitMaskData = { w: number; h: number; data: Uint8Array };
const hitMaskCache = new WeakMap<HTMLImageElement, HitMaskData>();

function getHitMask(img: HTMLImageElement): HitMaskData | null {
  if (hitMaskCache.has(img)) return hitMaskCache.get(img)!;
  if (typeof document === 'undefined') return null;
  try {
    const SCALE = Math.min(1, 512 / Math.max(img.naturalWidth, img.naturalHeight));
    const sw = Math.round(img.naturalWidth * SCALE);
    const sh = Math.round(img.naturalHeight * SCALE);
    const cv = document.createElement('canvas');
    cv.width = sw; cv.height = sh;
    const ctx = cv.getContext('2d')!;
    ctx.drawImage(img, 0, 0, sw, sh);
    const raw = ctx.getImageData(0, 0, sw, sh).data;
    const total = sw * sh;

    // BFS: 가장자리 투명 픽셀 → "외부"
    const isExterior = new Uint8Array(total);
    const queue: number[] = [];
    const enqueue = (idx: number) => {
      if (!isExterior[idx] && raw[idx * 4 + 3] < 10) {
        isExterior[idx] = 1;
        queue.push(idx);
      }
    };
    for (let x = 0; x < sw; x++) { enqueue(x); enqueue((sh - 1) * sw + x); }
    for (let y = 1; y < sh - 1; y++) { enqueue(y * sw); enqueue(y * sw + sw - 1); }
    let qi = 0;
    while (qi < queue.length) {
      const idx = queue[qi++];
      const x2 = idx % sw, y2 = (idx / sw) | 0;
      if (x2 > 0)      enqueue(idx - 1);
      if (x2 < sw - 1) enqueue(idx + 1);
      if (y2 > 0)      enqueue(idx - sw);
      if (y2 < sh - 1) enqueue(idx + sw);
    }

    // 히트 마스크: 불투명(테두리) OR 내부 구멍(외부 아닌 투명) → 1
    const hitData = new Uint8Array(total);
    for (let i = 0; i < total; i++) {
      hitData[i] = (raw[i * 4 + 3] >= 10 || !isExterior[i]) ? 1 : 0;
    }

    const entry: HitMaskData = { w: sw, h: sh, data: hitData };
    hitMaskCache.set(img, entry);
    return entry;
  } catch {
    return null;
  }
}

/**
 * PNG 마스크 프레임: 클릭 위치가 마스크 형태 안인지 확인
 * (테두리 불투명 + 내부 구멍 = hit / 형태 바깥 투명 = miss)
 * contain 스케일 보정 포함
 */
function isInsideMask(frame: FrameLayer, px: number, py: number): boolean {
  const maskImg = frame.frameMaskImg;
  if (!maskImg) return true;
  const hit = getHitMask(maskImg);
  if (!hit) return true;

  // contain 스케일 적용 시 마스크가 그려지는 실제 영역 계산
  const origW = maskImg.naturalWidth, origH = maskImg.naturalHeight;
  const sc = Math.min(frame.w / origW, frame.h / origH);
  const mw = origW * sc, mh = origH * sc;
  const mox = (frame.w - mw) / 2;
  const moy = (frame.h - mh) / 2;

  // 프레임 로컬 좌표 → 마스크 그려진 영역 내 좌표
  const lx = px - frame.x - mox;
  const ly = py - frame.y - moy;

  // 마스크가 그려진 영역 밖 → miss
  if (lx < 0 || ly < 0 || lx >= mw || ly >= mh) return false;

  // 마스크 이미지 픽셀 좌표로 변환
  const mx = Math.round((lx / mw) * hit.w);
  const my = Math.round((ly / mh) * hit.h);
  if (mx < 0 || my < 0 || mx >= hit.w || my >= hit.h) return false;
  return hit.data[my * hit.w + mx] === 1;
}

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
    if (!l.visible || l.locked || l.type === 'background') continue;
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
    .filter((l): l is PositionedLayer => l.visible && !l.locked && l.type !== 'background')
    .filter(l => px >= l.x && px <= l.x + l.w && py >= l.y && py <= l.y + l.h)
    .reverse();
}
