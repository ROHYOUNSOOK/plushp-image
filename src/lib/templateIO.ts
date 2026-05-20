'use client';
/* ===========================
   Template Save / Load
=========================== */

import type { Layer, BackgroundLayer } from '@/types/layer';
import type { Page } from '@/types/page';
import { makeLayer } from './layerFactory';
import { loadImage } from './utils';

/* ── 이미지를 data URL로 변환 ── */

async function imgToDataUrl(
  img: HTMLImageElement | null,
  url: string | null,
  format: 'jpeg' | 'png' = 'jpeg',
): Promise<string | null> {
  if (!img) return null;
  // blob URL, URL 없음, 또는 HTTP/data URL이 아닌 문자열(의사 ID 등) → 캔버스 변환
  const needsCanvas = !url || url.startsWith('blob:') || (!url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('/api/proxy-image') && !url.startsWith('/plus/'));
  if (needsCanvas) {
    try {
      const ofc = document.createElement('canvas');
      ofc.width = img.naturalWidth;
      ofc.height = img.naturalHeight;
      ofc.getContext('2d')!.drawImage(img, 0, 0);
      return format === 'png' ? ofc.toDataURL('image/png') : ofc.toDataURL('image/jpeg', 0.85);
    } catch {
      return null;
    }
  }
  return url;
}

/* ── 레이어 직렬화 ── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function serializeLayer(l: Layer): Promise<Record<string, unknown>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { img, frameMaskImg, _imgFilterCache, _holeCanvas, ...rest } = l as any;
  const out: Record<string, unknown> = { ...rest };

  if ('img' in l) {
    out.dataUrl = null;
    out.imageUrl = null;
    // image 레이어(원장님 사진 등): remote URL이면 보존 — frame 레이어는 스케줄 폴더에서 재로드하므로 null
    if (l.type === 'image') {
      const u = (rest.url ?? null) as string | null;
      const isRemote = u && !u.startsWith('blob:') && (u.startsWith('http') || u.startsWith('/api/proxy-image') || u.startsWith('/plus/'));
      out.url = isRemote ? u : null;
    } else {
      out.url = null;
    }
  }
  if ('frameMaskImg' in l) {
    // 프레임 마스크(프레임 이미지): remote URL이면 저장, blob이면 저장 안 함
    const maskUrl = (rest.frameMaskUrl ?? null) as string | null;
    const isMaskRemote = maskUrl && !maskUrl.startsWith('blob:') && (maskUrl.startsWith('http') || maskUrl.startsWith('/api/proxy-image') || maskUrl.startsWith('/plus/'));
    out.frameMaskUrl = isMaskRemote ? maskUrl : null;
    out.frameMaskDataUrl = null;
  }
  return out;
}

/* ── 파일명 생성 ── */

function buildTemplateFilename(scheduleRow: Record<string, unknown> | null): string {
  if (!scheduleRow) {
    const entered = typeof window !== 'undefined'
      ? window.prompt('저장할 파일명을 입력하세요 (날짜_아이디_키워드)', 'template')
      : null;
    return entered?.trim() || 'template';
  }
  const date = (scheduleRow.date as string) ?? '';
  const yy = date.length >= 4 ? date.slice(2, 4) : '';
  const mm = date.length >= 7 ? date.slice(5, 7) : '';
  const dd = date.length >= 10 ? date.slice(8, 10) : '';
  const dateStr = yy && mm && dd ? `${yy}${mm}${dd}` : '';
  const accountId = (scheduleRow.account_id as string) ?? '';
  const keyword = (scheduleRow.keyword as string) ?? '';
  return [dateStr, accountId, keyword].filter(Boolean).join('_') || 'template';
}

/* ── 저장 ── */

export async function saveTemplate(
  pages: Page[],
  scheduleRow: Record<string, unknown> | null = null,
): Promise<void> {
  const data = await Promise.all(
    pages.map(async pg => {
      const bgLayer = pg.layers.find(l => l.type === 'background') as BackgroundLayer | undefined;
      return {
        id: pg.id,
        name: pg.name,
        bgColor: bgLayer?.solidColor ?? '#ffffff',
        isMedicalLaw: pg.isMedicalLaw ?? false,
        layers: await Promise.all(
          pg.layers
            .filter(l => l.type !== 'background')
            .map(l => serializeLayer(l))
        ),
      };
    })
  );

  const filename = buildTemplateFilename(scheduleRow);
  const json = JSON.stringify({ version: 2, scheduleRow, pages: data }, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ── 레이어 역직렬화 ── */

async function deserializeLayer(raw: Record<string, unknown>): Promise<Layer> {
  const layer = { ...raw } as Record<string, unknown>;

  if ('dataUrl' in layer && layer.dataUrl) {
    // 로고는 autoLoadLogos가 blob URL로 재로드하므로 img = null 유지
    if ((layer as Record<string,unknown>).type === 'logo') {
      layer.img = null;
    } else {
      try {
        const u = layer.dataUrl as string;
        layer.img = await loadImage(u);
        if ((layer as Record<string,unknown>).type === 'doctor-card') {
          (layer as Record<string,unknown>).imageUrl = u;
        } else {
          layer.url = u;
        }
      } catch { layer.img = null; }
    }
    delete layer.dataUrl;
  } else if ('url' in layer && layer.url && typeof layer.url === 'string') {
    const u = layer.url as string;
    if (u.startsWith('http') || u.startsWith('/api/proxy-image') || u.startsWith('/plus/')) {
      try { layer.img = await loadImage(u); } catch { layer.img = null; }
    } else {
      layer.img = null;
    }
  } else if ('img' in layer) {
    layer.img = null;
  }

  if ('frameMaskDataUrl' in layer && layer.frameMaskDataUrl) {
    try {
      layer.frameMaskImg = await loadImage(layer.frameMaskDataUrl as string);
      layer.frameMaskUrl = layer.frameMaskDataUrl as string;
    } catch { layer.frameMaskImg = null; }
    delete layer.frameMaskDataUrl;
  } else if ('frameMaskUrl' in layer && layer.frameMaskUrl && typeof layer.frameMaskUrl === 'string') {
    const mu = layer.frameMaskUrl as string;
    if (mu.startsWith('http') || mu.startsWith('/api/proxy-image') || mu.startsWith('/plus/')) {
      try { layer.frameMaskImg = await loadImage(mu); } catch { layer.frameMaskImg = null; }
    } else {
      layer.frameMaskImg = null;
    }
  } else if ('frameMaskImg' in layer) {
    layer.frameMaskImg = null;
  }

  return layer as unknown as Layer;
}


/** 구버전 템플릿: medConfig.logo가 있고 LogoLayer가 없는 의료법 페이지 → LogoLayer로 마이그레이션 */
async function migrateMedLogoToLayer(pages: TemplatePage[]): Promise<TemplatePage[]> {
  const { W, ML_H } = await import('@/types/constants');
  const { makeLayer } = await import('./layerFactory');
  return pages.map(pg => {
    if (!pg.isMedicalLaw) return pg;
    if (pg.layers.some(l => l.type === 'logo')) return pg;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oldLogo = (pg as any)._rawMedConfig?.logo;
    if (!oldLogo?.img) return pg;
    const imgW = oldLogo.img.naturalWidth, imgH = oldLogo.img.naturalHeight;
    const drawW = ((oldLogo.sizePct ?? 7) / 100) * W;
    const drawH = imgW > 0 ? drawW * (imgH / imgW) : drawW;
    const x = Math.round((oldLogo.xPct / 100) * W - drawW / 2);
    const y = Math.round((oldLogo.yPct / 100) * ML_H - drawH / 2);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logoLayer = {
      ...(makeLayer('logo') as import('@/types/layer').LogoLayer),
      img: oldLogo.img, url: oldLogo.url ?? null,
      x, y, w: Math.round(drawW), h: Math.round(drawH),
      stroke: { enabled: oldLogo.strokeEnabled ?? true, color: oldLogo.strokeColor ?? null, width: oldLogo.strokeWidth ?? 3, radius: 0 },
    };
    return { ...pg, layers: [logoLayer, ...pg.layers] };
  });
}

/** 구버전 템플릿: med-title/med-desc 레이어가 없는 의료법 페이지 → medConfig에서 마이그레이션 */
async function migrateMedTextToLayers(pages: TemplatePage[]): Promise<TemplatePage[]> {
  const { makeLayer } = await import('./layerFactory');
  return pages.map(pg => {
    if (!pg.isMedicalLaw) return pg;
    if (pg.layers.some(l => l.type === 'med-title')) return pg;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cfg = (pg as any)._rawMedConfig;
    if (!cfg) return pg;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const titleLayer = makeLayer('med-title') as import('@/types/layer').MedTitleLayer;
    titleLayer.content       = cfg.title          ?? titleLayer.content;
    titleLayer.font          = cfg.titleFont       ?? titleLayer.font;
    titleLayer.fontSize      = cfg.titleSize       ?? titleLayer.fontSize;
    titleLayer.fontWeight    = cfg.titleWeight     ?? titleLayer.fontWeight;
    titleLayer.color         = cfg.titleColor      ?? null;
    titleLayer.accentColor   = cfg.titleAccentColor ?? titleLayer.accentColor;
    titleLayer.letterSpacing = cfg.titleTrack      ?? titleLayer.letterSpacing;
    titleLayer.lineHeight    = cfg.titleLineHeight  ?? cfg.lineHeight ?? titleLayer.lineHeight;
    titleLayer.align         = cfg.align           ?? titleLayer.align;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const descLayer = makeLayer('med-desc') as import('@/types/layer').MedDescLayer;
    descLayer.content       = cfg.desc           ?? descLayer.content;
    descLayer.font          = cfg.descFont        ?? descLayer.font;
    descLayer.fontSize      = cfg.descSize        ?? descLayer.fontSize;
    descLayer.fontWeight    = cfg.descWeight      ?? descLayer.fontWeight;
    descLayer.color         = cfg.descColor       ?? descLayer.color;
    descLayer.letterSpacing = cfg.descTrack       ?? descLayer.letterSpacing;
    descLayer.lineHeight    = cfg.descLineHeight   ?? cfg.lineHeight ?? descLayer.lineHeight;
    descLayer.align         = cfg.align           ?? descLayer.align;
    return { ...pg, layers: [...pg.layers, titleLayer, descLayer] };
  });
}

/* ── 불러오기 ── */

export interface TemplatePage {
  id: number;
  name: string;
  bgColor?: string;
  isMedicalLaw?: boolean;
  layers: Layer[];
  _rawMedConfig?: Record<string, unknown>; // 구버전 템플릿 마이그레이션 전용
}

export function openTemplatePicker(
  onLoad: (pages: TemplatePage[], scheduleRow: Record<string, unknown> | null) => void,
  onError: (msg: string) => void,
): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const rawPages: Record<string, unknown>[] = data.pages ?? data;
      const savedScheduleRow = (data.scheduleRow as Record<string, unknown> | null) ?? null;

      if (!Array.isArray(rawPages) || !rawPages.length) {
        onError('올바른 템플릿 파일이 아닙니다');
        return;
      }

      const restoredPages = await Promise.all(
        rawPages.map(async (pg, i) => {
          const layers = await Promise.all(
            ((pg.layers ?? []) as Record<string, unknown>[]).map(l => deserializeLayer(l))
          );
          return {
            id: (pg.id as number) ?? i + 1,
            name: (pg.name as string) ?? '',
            bgColor: (pg.bgColor as string) ?? '#ffffff',
            isMedicalLaw: (pg.isMedicalLaw as boolean) ?? false,
            _rawMedConfig: pg.medConfig as Record<string, unknown> | undefined,
            layers,
          } as TemplatePage;
        })
      );

      const migratedLogo = await migrateMedLogoToLayer(restoredPages);
      onLoad(await migrateMedTextToLayers(migratedLogo), savedScheduleRow);
    } catch {
      onError('파일을 불러오지 못했습니다');
    }
  };
  input.click();
}

/* ── 클라우드용 경량 레이어 직렬화 (blob URL 이미지 제외) ── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeLayerCloud(l: Layer): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { img, frameMaskImg, _imgFilterCache, _holeCanvas, ...rest } = l as any;
  const out: Record<string, unknown> = { ...rest };

  if ('img' in l) {
    out.dataUrl = null;
    out.imageUrl = null;
    if (l.type === 'image') {
      const u = (rest.url ?? null) as string | null;
      const isRemote = u && !u.startsWith('blob:') && (u.startsWith('http') || u.startsWith('/api/proxy-image') || u.startsWith('/plus/'));
      out.url = isRemote ? u : null;
    } else {
      out.url = null;
    }
  }
  if ('frameMaskImg' in l) {
    const maskUrl = rest.frameMaskUrl as string | null;
    const isMaskRemote = maskUrl && !maskUrl.startsWith('blob:') && (maskUrl.startsWith('http') || maskUrl.startsWith('/api/proxy-image') || maskUrl.startsWith('/plus/'));
    out.frameMaskUrl = isMaskRemote ? maskUrl : null;
    out.frameMaskDataUrl = null;
  }
  return out;
}

/* ── 클라우드 저장 ── */

export async function saveCloudTemplate(
  pages: Page[],
  scheduleRow: Record<string, unknown> | null = null,
): Promise<void> {
  const folder = buildTemplateFilename(scheduleRow);
  const data = await Promise.all(
    pages.map(async pg => {
      const bgLayer = pg.layers.find(l => l.type === 'background') as BackgroundLayer | undefined;
      return {
        id: pg.id,
        name: pg.name,
        bgColor: bgLayer?.solidColor ?? '#ffffff',
        isMedicalLaw: pg.isMedicalLaw ?? false,
        layers: await Promise.all(
          pg.layers
            .filter(l => l.type !== 'background')
            .map(l => serializeLayer(l))
        ),
      };
    })
  );

  const payload = { version: 2, scheduleRow, pages: data };
  const res = await fetch(`/api/plus-template?folder=${encodeURIComponent(folder)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('클라우드 저장 실패');
}

/* ── 클라우드 불러오기 ── */

export async function loadCloudTemplate(
  folderName: string,
): Promise<{ pages: TemplatePage[]; scheduleRow: Record<string, unknown> | null }> {
  const res = await fetch(`/api/plus-template?folder=${encodeURIComponent(folderName)}`);
  if (!res.ok) throw new Error('클라우드 불러오기 실패');
  const data = await res.json();

  const rawPages: Record<string, unknown>[] = data.pages ?? [];
  const savedScheduleRow = (data.scheduleRow as Record<string, unknown> | null) ?? null;

  const restoredPages = await Promise.all(
    rawPages.map(async (pg, i) => {
      const layers = await Promise.all(
        ((pg.layers ?? []) as Record<string, unknown>[]).map(l => deserializeLayer(l))
      );
      return {
        id: (pg.id as number) ?? i + 1,
        name: (pg.name as string) ?? '',
        bgColor: (pg.bgColor as string) ?? '#ffffff',
        isMedicalLaw: (pg.isMedicalLaw as boolean) ?? false,
        _rawMedConfig: pg.medConfig as Record<string, unknown> | undefined,
        layers,
      } as TemplatePage;
    })
  );

  const migratedLogo2 = await migrateMedLogoToLayer(restoredPages);
  return { pages: await migrateMedTextToLayers(migratedLogo2), scheduleRow: savedScheduleRow };
}

export async function listCloudTemplates(): Promise<string[]> {
  const res = await fetch('/api/plus-template');
  if (!res.ok) return [];
  const data = await res.json();
  return (data.folders as string[]) ?? [];
}

/* ── 현재 페이지에 템플릿 병합 ── */

export function mergeTemplateIntoPage(currentPage: Page, tpl: TemplatePage): Page {
  const existingBg = currentPage.layers.find(l => l.type === 'background') as BackgroundLayer | undefined;
  // 원본 변경 방지를 위해 복사
  const bgLayer: BackgroundLayer = existingBg
    ? { ...existingBg }
    : makeLayer('background') as BackgroundLayer;

  if (tpl.bgColor) bgLayer.solidColor = tpl.bgColor;

  return {
    ...currentPage,
    name: tpl.name || currentPage.name,
    isMedicalLaw: tpl.isMedicalLaw ?? false,
    layers: [bgLayer, ...tpl.layers],
  };
}
