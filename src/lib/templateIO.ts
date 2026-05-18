'use client';
/* ===========================
   Template Save / Load
=========================== */

import type { Layer, BackgroundLayer } from '@/types/layer';
import type { Page, MedConfig } from '@/types/page';
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
    out.url = null;
    out.dataUrl = null;
    // doctor-card는 imageUrl이 Vultr 원격 URL이므로 보존
    if (l.type === 'doctor-card') {
      const iu = (rest.imageUrl ?? null) as string | null;
      const isRemote = iu && !iu.startsWith('blob:') && (iu.startsWith('http') || iu.startsWith('/api/proxy-image') || iu.startsWith('/plus/'));
      out.imageUrl = isRemote ? iu : null;
    } else {
      out.imageUrl = null;
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

/* ── medConfig 직렬화 (로고 이미지 포함) ── */

async function serializeMedConfig(cfg: MedConfig): Promise<Record<string, unknown>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: Record<string, unknown> = { ...(cfg as any) };
  if (cfg.logo?.img) {
    const logoDataUrl = await imgToDataUrl(cfg.logo.img, cfg.logo.url ?? null, 'png');
    out.logo = { ...cfg.logo, img: null, url: logoDataUrl };
  }
  // bgImg는 저장하지 않음 (용량 절감)
  delete out.bgImg;
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
        medConfig: pg.medConfig ? await serializeMedConfig(pg.medConfig) : undefined,
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
  } else if (layer.type === 'doctor-card' && layer.imageUrl && typeof layer.imageUrl === 'string') {
    const u = layer.imageUrl as string;
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

/* ── medConfig 역직렬화 ── */

async function deserializeMedConfig(raw: Record<string, unknown>): Promise<MedConfig> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cfg = { ...raw } as any;
  if (cfg.logo?.url && typeof cfg.logo.url === 'string') {
    try {
      cfg.logo = { ...cfg.logo, img: await loadImage(cfg.logo.url) };
    } catch { cfg.logo = { ...cfg.logo, img: null }; }
  }
  return cfg as MedConfig;
}

/* ── 불러오기 ── */

export interface TemplatePage {
  id: number;
  name: string;
  bgColor?: string;
  isMedicalLaw?: boolean;
  medConfig?: MedConfig;
  layers: Layer[];
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
          const medConfig = pg.medConfig
            ? await deserializeMedConfig(pg.medConfig as Record<string, unknown>)
            : undefined;
          return {
            id: (pg.id as number) ?? i + 1,
            name: (pg.name as string) ?? '',
            bgColor: (pg.bgColor as string) ?? '#ffffff',
            isMedicalLaw: (pg.isMedicalLaw as boolean) ?? false,
            medConfig,
            layers,
          } as TemplatePage;
        })
      );

      onLoad(restoredPages, savedScheduleRow);
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
    out.url = null;
    out.dataUrl = null;
    if (l.type === 'doctor-card') {
      const iu = (rest.imageUrl ?? null) as string | null;
      const isRemote = iu && !iu.startsWith('blob:') && (iu.startsWith('http') || iu.startsWith('/api/proxy-image') || iu.startsWith('/plus/'));
      out.imageUrl = isRemote ? iu : null;
    } else {
      out.imageUrl = null;
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
        medConfig: pg.medConfig ? await serializeMedConfig(pg.medConfig) : undefined,
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
      const medConfig = pg.medConfig
        ? await deserializeMedConfig(pg.medConfig as Record<string, unknown>)
        : undefined;
      return {
        id: (pg.id as number) ?? i + 1,
        name: (pg.name as string) ?? '',
        bgColor: (pg.bgColor as string) ?? '#ffffff',
        isMedicalLaw: (pg.isMedicalLaw as boolean) ?? false,
        medConfig,
        layers,
      } as TemplatePage;
    })
  );

  return { pages: restoredPages, scheduleRow: savedScheduleRow };
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

  // 의료법 페이지는 medConfig.bgColor가 배경을 제어하므로 bgLayer 색상 적용 생략
  if (tpl.bgColor && !tpl.isMedicalLaw && !existingBg?.solidColor) {
    bgLayer.solidColor = tpl.bgColor;
  }

  return {
    ...currentPage,
    name: tpl.name || currentPage.name,
    isMedicalLaw: tpl.isMedicalLaw ?? false,
    medConfig: tpl.medConfig ?? currentPage.medConfig,
    layers: [bgLayer, ...tpl.layers],
  };
}
