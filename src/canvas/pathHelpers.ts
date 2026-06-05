/* ===========================
   Path Helpers (순수 TS, React 의존 없음)
   — 원본: plus_page_spread_통합.html 3212~3330행
=========================== */

import type { FrameShapeId } from '@/types/layer';

/** 둥근 사각형 경로 (ctx.roundRect 폴백) */
export function rrPath(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
): void {
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** 모서리별 둥근 사각형 경로 (tl, tr, br, bl 개별 지정) */
export function rrPathCorners(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  tl: number, tr: number, br: number, bl: number,
): void {
  const m = Math.min(w / 2, h / 2);
  tl = Math.max(0, Math.min(tl, m));
  tr = Math.max(0, Math.min(tr, m));
  br = Math.max(0, Math.min(br, m));
  bl = Math.max(0, Math.min(bl, m));
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, [tl, tr, br, bl]); return; }
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y); ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br); ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl); ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

/** 정다각형 경로 (타원 기반) */
export function polygonPath(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, rx: number, ry: number,
  sides: number, startAngle: number,
): void {
  for (let i = 0; i < sides; i++) {
    const a = startAngle + i * Math.PI * 2 / sides;
    i === 0
      ? ctx.moveTo(cx + rx * Math.cos(a), cy + ry * Math.sin(a))
      : ctx.lineTo(cx + rx * Math.cos(a), cy + ry * Math.sin(a));
  }
  ctx.closePath();
}

/** 별 경로 */
export function starPath(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  outerRx: number, outerRy: number,
  innerRx: number, innerRy: number,
  points: number, startAngle: number,
): void {
  for (let i = 0; i < points * 2; i++) {
    const outer = i % 2 === 0;
    const a = startAngle + i * Math.PI / points;
    const px = cx + (outer ? outerRx : innerRx) * Math.cos(a);
    const py = cy + (outer ? outerRy : innerRy) * Math.sin(a);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** 프레임 도형 경로 범용 빌더 */
export function frameShapePath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  shape: FrameShapeId, radius: number, expand: number,
): void {
  expand = expand || 0;
  const cx = x + w / 2, cy = y + h / 2;
  const rx = w / 2 + expand, ry = h / 2 + expand;

  switch (shape) {
    case 'circle':
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      break;
    case 'triangle':
      ctx.moveTo(cx, y - expand);
      ctx.lineTo(x + w + expand, y + h + expand);
      ctx.lineTo(x - expand, y + h + expand);
      ctx.closePath();
      break;
    case 'rhombus':
      ctx.moveTo(cx, y - expand);
      ctx.lineTo(x + w + expand, cy);
      ctx.lineTo(cx, y + h + expand);
      ctx.lineTo(x - expand, cy);
      ctx.closePath();
      break;
    case 'pentagon':
      polygonPath(ctx, cx, cy, rx, ry, 5, -Math.PI / 2);
      break;
    case 'hexagon':
      polygonPath(ctx, cx, cy, rx, ry, 6, 0);
      break;
    case 'star':
      starPath(ctx, cx, cy, rx, ry, rx * 0.42, ry * 0.42, 5, -Math.PI / 2);
      break;
    default: // 'rect'
      rrPath(ctx, x - expand, y - expand, w + expand * 2, h + expand * 2, Math.max(0, (radius || 0) + expand));
  }
}
