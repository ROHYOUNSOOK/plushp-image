/* ===========================
   Background Layer Drawing
   — 원본: plus_page_spread_통합.html 2717~2742행
=========================== */

import type { BackgroundLayer } from '@/types/layer';
import { W, H } from '@/types/constants';

export function drawBg(
  ctx: CanvasRenderingContext2D,
  layer: BackgroundLayer,
  isExporting: boolean,
): void {
  if (!layer.img) {
    ctx.fillStyle = layer.solidColor || '#e9ecef';
    ctx.fillRect(0, 0, W, H);
    if (!isExporting) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.font = '500 28px Pretendard';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('배경 이미지를 드래그&드롭 또는 클릭하여 업로드', W / 2, H / 2);
    }
    return;
  }

  const { rotation, flipH, flipV, scale: userScale = 1 } = layer.transform;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  if (flipH) ctx.scale(-1, 1);
  if (flipV) ctx.scale(1, -1);
  ctx.rotate(rotation * Math.PI / 180);
  const img = layer.img;
  const baseScale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const finalScale = baseScale * userScale;
  const sw = img.naturalWidth * finalScale, sh = img.naturalHeight * finalScale;
  ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
  ctx.restore();
}
