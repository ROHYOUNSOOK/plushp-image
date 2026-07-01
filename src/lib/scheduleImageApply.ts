import type { FrameLayer, TextboxLayer } from '@/types/layer';
import type { TemplatePage } from './templateIO';
import { loadScheduleInnerImages } from './supabase';

/** 템플릿 페이지의 텍스트박스 내용을 현재 기획안 texts로 교체 */
export function applyScheduleTextsToTemplatePages(
  pages: TemplatePage[],
  texts: string[],
): TemplatePage[] {
  const textPages = pages.filter(pg => !pg.isMedicalLaw && !pg.layers.some(l => l.type === 'doctor-card'));
  return pages.map(pg => {
    const textIdx = textPages.indexOf(pg);
    if (textIdx < 0 || texts[textIdx] === undefined) return pg;
    // 텍스트박스가 2개 이상이면 디자이너가 수동으로 분할/편집한 것 → 저장된 내용 보존
    // (단일 텍스트박스 페이지에서만 기획안 문구 자동 반영)
    const textboxes = pg.layers.filter(l => l.type === 'textbox');
    if (textboxes.length !== 1) return pg;
    return {
      ...pg,
      layers: pg.layers.map(l => {
        if (l.type !== 'textbox') return l;
        return { ...(l as TextboxLayer), content: texts[textIdx] };
      }),
    };
  }) as TemplatePage[];
}

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
