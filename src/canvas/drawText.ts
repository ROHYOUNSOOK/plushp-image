/* ===========================
   Text Layer Drawing + wrapText
   — 원본: plus_page_spread_통합.html 3020~3127행
=========================== */

import type { TextLayer } from '@/types/layer';

/** 텍스트 줄바꿈 (글자 단위) */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  text.split('\n').forEach(para => {
    if (!para) { lines.push(''); return; }
    let cur = '';
    for (const ch of para) {
      if (ctx.measureText(cur + ch).width > maxW && cur) {
        lines.push(cur);
        cur = ch;
      } else {
        cur += ch;
      }
    }
    if (cur) lines.push(cur);
  });
  return lines;
}

export function drawText(ctx: CanvasRenderingContext2D, layer: TextLayer, isExporting = false): void {
  ctx.font = `${layer.weight} ${layer.size}px ${layer.font || 'Pretendard'}`;
  ctx.textAlign = layer.align || 'center';
  ctx.textBaseline = 'top';

  // 빈 텍스트일 때 플레이스홀더 표시 (내보내기 시 제외)
  if (!layer.content?.trim()) {
    if (!isExporting) {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.font = `400 ${Math.min(layer.size, 28)}px Pretendard`;
      const ax = layer.x + layer.w / 2;
      ctx.textAlign = 'center';
      ctx.fillText('텍스트를 입력하세요', ax, layer.y + layer.h / 2 - 14);
      // 점선 테두리
      ctx.strokeStyle = 'rgba(150,150,150,0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(layer.x, layer.y, layer.w, layer.h);
      ctx.setLineDash([]);
    }
    return;
  }

  ctx.fillStyle = layer.color || '#000000';
  const lines = wrapText(ctx, layer.content, layer.w);
  const lh = layer.size * (layer.lineHeight || 1.3);
  const totalH = lines.length * lh;
  const startY = layer.y + Math.max(0, (layer.h - totalH) / 2);
  const ax = layer.align === 'left' ? layer.x : layer.align === 'right' ? layer.x + layer.w : layer.x + layer.w / 2;
  lines.forEach((line, i) => ctx.fillText(line, ax, startY + i * lh));
}
