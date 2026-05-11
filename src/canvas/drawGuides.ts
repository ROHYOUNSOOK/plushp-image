/* ===========================
   Guide Lines Drawing
   — 원본: plus_page_spread_통합.html 3163~3174행
=========================== */

import { W, H, ML_H, HANDLE_R } from '@/types/constants';
import type { PositionedLayer } from '@/types/layer';
import { getHandlePoints } from '@/lib/hitTest';

/** 캔버스 가이드라인 (중심선 + 30px 마진) */
export function drawGuides(ctx: CanvasRenderingContext2D, isMedicalLaw = false): void {
  const M = 30;
  const ch = isMedicalLaw ? ML_H : H;
  ctx.save();
  ctx.strokeStyle = 'rgba(100,100,255,0.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(M, M, W - M * 2, ch - M * 2);
  ctx.beginPath();
  ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, ch);
  ctx.moveTo(0, ch / 2); ctx.lineTo(W, ch / 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/** 선택 핸들 그리기 (파란색 점 + 점선 테두리) */
export function drawHandles(
  ctx: CanvasRenderingContext2D,
  layer: PositionedLayer,
  frameEditMode: boolean,
): void {
  if (frameEditMode && layer.type === 'frame') {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,140,0,0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(layer.x, layer.y, layer.w, layer.h);
    ctx.setLineDash([]);
    ctx.restore();
    return;
  }

  ctx.save();
  // 흰색 외곽선 먼저 그려 배경에 상관없이 잘 보이도록
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 4;
  ctx.setLineDash([6, 3]);
  ctx.strokeRect(layer.x, layer.y, layer.w, layer.h);
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.strokeRect(layer.x, layer.y, layer.w, layer.h);
  ctx.setLineDash([]);

  const R = HANDLE_R * (W / 600);
  getHandlePoints(layer).forEach(pt => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, R, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
  ctx.restore();
}
