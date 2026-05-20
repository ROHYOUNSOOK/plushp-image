/* ===========================
   colorSync — 전 페이지 색상 동기화 순수 함수
   editorStore.ts applySyncColors에서 분리
=========================== */

import type { Page } from '@/types/page';
import type { TextboxLayer, FrameLayer, LogoLayer, ImageLayer, BackgroundLayer, MedTitleLayer } from '@/types/layer';
import { replaceTextboxImageColors } from './colorHelpers';

export function syncColorsAcrossPages(
  pages: Page[],
  autoColor: string,
  shadowColor: string,
  bgKeyColor: string,
): Page[] {
  return pages.map(pg => ({
    ...pg,
    layers: pg.layers.map(l => {
      if (l.type === 'med-title') return { ...l, color: autoColor };
      if (l.type === 'textbox') {
        const tb = l as TextboxLayer;
        return {
          ...tb,
          fillColor: autoColor,
          ...(tb.img ? { processedImg: replaceTextboxImageColors(tb.img, autoColor) } : {}),
        };
      }
      if (l.type === 'frame') {
        const fr = l as FrameLayer;
        if (fr.frameMaskImg) {
          return { ...fr, frameMaskProcessed: replaceTextboxImageColors(fr.frameMaskImg, bgKeyColor) };
        }
      }
      if (l.type === 'logo') {
        const lo = l as LogoLayer;
        return {
          ...lo,
          ...(lo.stroke?.enabled ? { stroke: { ...lo.stroke, color: autoColor } } : {}),
          ...(lo.shadow?.enabled ? { shadow: { ...lo.shadow, color: shadowColor } } : {}),
        };
      }
      if (l.type === 'image') {
        const im = l as ImageLayer;
        return im.shadow ? { ...im, shadow: { ...im.shadow, color: shadowColor } } : l;
      }
      return l;
    }),
  }));
}

export function getBgKeyColor(pages: Page[], currentPage: number, autoColor: string): string {
  const bgLayer = pages[currentPage]?.layers.find(l => l.type === 'background') as BackgroundLayer | undefined;
  return bgLayer?.solidColor || autoColor;
}
