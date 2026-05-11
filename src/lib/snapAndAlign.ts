/* ===========================
   Alignment & Distribution
   — 원본: plus_page_spread_통합.html 1742~1809행
=========================== */

import type { PositionedLayer } from '@/types/layer';
import { W, H } from '@/types/constants';

export type AlignDir = 'left' | 'right' | 'centerH' | 'top' | 'bottom' | 'centerV';
export type DistributeDir = 'h' | 'v';

/** 레이어 정렬 (단일: 캔버스 기준, 다중: 바운딩 박스 기준) */
export function alignLayers(layers: PositionedLayer[], dir: AlignDir): void {
  if (layers.length === 0) return;

  if (layers.length === 1) {
    const sel = layers[0];
    if (sel.type === 'textbox') (sel as { positionPreset: string | null }).positionPreset = null;
    switch (dir) {
      case 'left':    sel.x = 0; break;
      case 'right':   sel.x = W - sel.w; break;
      case 'centerH': sel.x = (W - sel.w) / 2; break;
      case 'top':     sel.y = 0; break;
      case 'bottom':  sel.y = H - sel.h; break;
      case 'centerV': sel.y = (H - sel.h) / 2; break;
    }
  } else {
    const bbLeft   = Math.min(...layers.map(l => l.x));
    const bbTop    = Math.min(...layers.map(l => l.y));
    const bbRight  = Math.max(...layers.map(l => l.x + l.w));
    const bbBottom = Math.max(...layers.map(l => l.y + l.h));
    layers.forEach(l => {
      if (l.type === 'textbox') (l as { positionPreset: string | null }).positionPreset = null;
      switch (dir) {
        case 'left':    l.x = bbLeft; break;
        case 'right':   l.x = bbRight - l.w; break;
        case 'centerH': l.x = (bbLeft + bbRight) / 2 - l.w / 2; break;
        case 'top':     l.y = bbTop; break;
        case 'bottom':  l.y = bbBottom - l.h; break;
        case 'centerV': l.y = (bbTop + bbBottom) / 2 - l.h / 2; break;
      }
    });
  }
}

/** 3개 이상 레이어 균등 분배 */
export function distributeLayers(layers: PositionedLayer[], dir: DistributeDir): boolean {
  if (layers.length < 3) return false;

  if (dir === 'h') {
    const sorted = [...layers].sort((a, b) => a.x - b.x);
    const totalW = sorted.reduce((s, l) => s + l.w, 0);
    const gap = (sorted.at(-1)!.x + sorted.at(-1)!.w - sorted[0].x - totalW) / (sorted.length - 1);
    let cursor = sorted[0].x + sorted[0].w;
    for (let i = 1; i < sorted.length - 1; i++) {
      sorted[i].x = cursor + gap;
      cursor = sorted[i].x + sorted[i].w;
    }
  } else {
    const sorted = [...layers].sort((a, b) => a.y - b.y);
    const totalH = sorted.reduce((s, l) => s + l.h, 0);
    const gap = (sorted.at(-1)!.y + sorted.at(-1)!.h - sorted[0].y - totalH) / (sorted.length - 1);
    let cursor = sorted[0].y + sorted[0].h;
    for (let i = 1; i < sorted.length - 1; i++) {
      sorted[i].y = cursor + gap;
      cursor = sorted[i].y + sorted[i].h;
    }
  }

  return true;
}
