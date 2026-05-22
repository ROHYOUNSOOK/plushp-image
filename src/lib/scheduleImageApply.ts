import type { FrameLayer } from '@/types/layer';
import type { TemplatePage } from './templateIO';
import { loadScheduleInnerImages } from './supabase';

/** 템플릿 페이지의 프레임 레이어에 스케줄 폴더 내부 이미지를 채워서 반환 */
export async function applyScheduleImagesToTemplatePages(
  pages: TemplatePage[],
  folderName: string,
): Promise<TemplatePage[]> {
  try {
    const textPages = pages.filter(pg => !pg.isMedicalLaw && pg.name !== '원장님');
    if (!textPages.length) return pages;
    const innerImages = await loadScheduleInnerImages(folderName, textPages.length);
    return pages.map(pg => {
      const textIdx = textPages.indexOf(pg);
      if (textIdx < 0) return pg;
      const inner = innerImages[textIdx];
      if (!inner?.img) return pg;
      return {
        ...pg,
        layers: pg.layers.map(l => {
          if (l.type !== 'frame') return l;
          const fr = l as FrameLayer;
          return { ...fr, img: inner.img!, url: inner.url ?? '' };
        }),
      };
    }) as TemplatePage[];
  } catch {
    return pages;
  }
}
