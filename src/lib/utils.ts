/* ===========================
   General Utilities
   — 원본: plus_page_spread_통합.html 1349~1382행
=========================== */

import { W, H } from '@/types/constants';
import type { PositionPreset } from '@/types/layer';

let _uidN = 1;

/** 유니크 레이어 ID 생성 */
export const uid = (): string => `l${_uidN++}_${Date.now()}`;

/** 값을 min~max 범위로 제한 */
export const clamp = (v: number, mn: number, mx: number): number =>
  Math.min(mx, Math.max(mn, v));

/** 텍스트박스 프리셋 위치 계산 */
export function calcTextboxPos(preset: PositionPreset, w: number, h: number): { x: number; y: number } {
  switch (preset) {
    case 'top-left':      return { x: 0, y: 0 };
    case 'top-center':    return { x: (W - w) / 2, y: 0 };
    case 'top-right':     return { x: W - w, y: 0 };
    case 'bottom-left':   return { x: 0, y: H - h };
    case 'bottom-center': return { x: (W - w) / 2, y: H - h };
    case 'bottom-right':  return { x: W - w, y: H - h };
    default:              return { x: 0, y: H - h };
  }
}

/** 이미지 로드 (crossOrigin 포함) */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = url;
  });
}

/** HTML 이스케이프 */
export function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
