/* ===========================
   Logo Layer Drawing
   — 원본: plus_page_spread_통합.html 3129~3161행
=========================== */

import type { LogoLayer } from '@/types/layer';
import { hexToRgb, calcShadowColor } from '@/lib/colorHelpers';
import { drawImgLayer } from './drawImage';

export function drawLogo(
  ctx: CanvasRenderingContext2D,
  layer: LogoLayer,
  bgKeyColor: string,
  isExporting: boolean,
): void {
  // 이미지 알파 채널을 따라가는 외곽선: shadow 트릭
  if (layer.stroke?.enabled && layer.img) {
    const { r, g, b } = hexToRgb(layer.stroke.color || calcShadowColor(bgKeyColor));
    const sw = layer.stroke.width || 3;
    const opacity = layer.opacity ?? 1;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.shadowColor = `rgb(${r},${g},${b})`;
    ctx.shadowBlur = 0;

    // 8방향으로 오프셋 그려서 solid outline 생성
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      ctx.shadowOffsetX = Math.round(Math.cos(angle) * sw);
      ctx.shadowOffsetY = Math.round(Math.sin(angle) * sw);
      if (layer.rotation) {
        const cx = layer.x + layer.w / 2, cy = layer.y + layer.h / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(layer.rotation * Math.PI / 180);
        ctx.drawImage(layer.img, -layer.w / 2, -layer.h / 2, layer.w, layer.h);
        ctx.restore();
      } else {
        ctx.drawImage(layer.img, layer.x, layer.y, layer.w, layer.h);
      }
    }
    ctx.restore();
  }

  // 로고 이미지 본체는 drawImgLayer와 동일
  drawImgLayer(ctx, layer as unknown as import('@/types/layer').ImageLayer, bgKeyColor, isExporting);
}
