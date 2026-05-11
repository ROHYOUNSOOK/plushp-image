/* ===========================
   Image Layer Drawing
   — 원본: plus_page_spread_통합.html 2905~2944행
=========================== */

import type { ImageLayer } from '@/types/layer';
import { hexToRgb, calcShadowColor } from '@/lib/colorHelpers';

export function drawImgLayer(
  ctx: CanvasRenderingContext2D,
  layer: ImageLayer,
  bgKeyColor: string,
  isExporting: boolean,
): void {
  if (!layer.img) {
    if (!isExporting) {
      const cx = layer.x + layer.w / 2;
      const cy = layer.y + layer.h / 2;
      ctx.save();
      ctx.fillStyle = 'rgba(200,200,200,0.4)';
      ctx.fillRect(layer.x, layer.y, layer.w, layer.h);
      ctx.strokeStyle = 'rgba(150,150,150,0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(layer.x + 1, layer.y + 1, layer.w - 2, layer.h - 2);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.font = '500 20px Pretendard';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('이미지를 드래그&드롭 또는 클릭하여 업로드', cx, cy);
      ctx.restore();
    }
    return;
  }

  ctx.save();
  ctx.globalAlpha = layer.opacity ?? 1;
  if (layer.shadow?.enabled) {
    const { r, g, b } = hexToRgb(layer.shadow.color || calcShadowColor(bgKeyColor));
    ctx.shadowColor = `rgba(${r},${g},${b},${layer.shadow.alpha ?? 0.2})`;
    ctx.shadowBlur = layer.shadow.blur ?? 10;
    ctx.shadowOffsetX = layer.shadow.offsetX ?? 0;
    ctx.shadowOffsetY = layer.shadow.offsetY ?? 20;
  }
  if (layer.rotation) {
    ctx.translate(layer.x + layer.w / 2, layer.y + layer.h / 2);
    ctx.rotate(layer.rotation * Math.PI / 180);
    ctx.drawImage(layer.img, -layer.w / 2, -layer.h / 2, layer.w, layer.h);
  } else {
    ctx.drawImage(layer.img, layer.x, layer.y, layer.w, layer.h);
  }
  ctx.restore();
}
