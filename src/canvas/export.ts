/* ===========================
   Export — 캔버스 렌더링 → JPG 다운로드
   — 원본: plus_page_spread_통합.html renderPageToCanvas, downloadCurrent, downloadAll
=========================== */

import JSZip from 'jszip';
import type { Page } from '@/types/page';
import type { BackgroundLayer } from '@/types/layer';
import { W, H, ML_H } from '@/types/constants';
import { drawImmediate, type DrawContext } from './draw';

/** 페이지를 오프스크린 캔버스에 렌더링 */
export function renderPageToCanvas(
  page: Page,
  pages: Page[],
  bgKeyColor: string,
): HTMLCanvasElement {
  const drawH = page.isMedicalLaw ? ML_H : H;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = drawH;
  const ctx = canvas.getContext('2d')!;

  const firstPageBg = pages[0]?.layers.find(l => l.type === 'background') as BackgroundLayer | undefined;

  const dc: DrawContext = {
    ctx,
    page,
    bgKeyColor,
    isExporting: true,
    showGuides: false,
    frameEditMode: false,
    selectedLayerId: null,
    selectedLayerIds: [],
    hoverId: null,
    inlineEditingId: null,
    firstPageBg: firstPageBg ? { img: firstPageBg.img, solidColor: firstPageBg.solidColor, scale: firstPageBg.transform?.scale } : undefined,
    isDragOver: false,
    dropTargetId: null,
  };

  drawImmediate(dc);
  return canvas;
}

/** 캔버스를 Blob으로 변환 */
function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('toBlob failed')),
      type,
      quality,
    );
  });
}

/** 파일 다운로드 트리거 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** 현재 페이지 JPG 다운로드 (파일명: 순번.jpg) */
export async function downloadCurrentPage(
  page: Page,
  pages: Page[],
  bgKeyColor: string,
  pageIndex: number,
): Promise<void> {
  const canvas = renderPageToCanvas(page, pages, bgKeyColor);
  const blob = await canvasToBlob(canvas);
  downloadBlob(blob, `${pageIndex + 1}.jpg`);
}

/** 날짜 문자열(2026-05-08) → YYMMDD(260508) 변환 */
function formatDateYYMMDD(date: string): string {
  if (!date) return '';
  const parts = date.split('-');
  if (parts.length < 3) return date.replace(/-/g, '');
  const yy = parts[0].slice(-2);
  return `${yy}${parts[1]}${parts[2]}`;
}

/** ZIP 파일명 생성: YYMMDD_accountId_keyword */
function buildZipName(scheduleRow: Record<string, unknown> | null): string {
  if (!scheduleRow) return '다운로드';
  const date = formatDateYYMMDD((scheduleRow.date as string) || '');
  const accountId = (scheduleRow.account_id as string) || '';
  const keyword = (scheduleRow.keyword as string) || '';
  return [date, accountId, keyword].filter(Boolean).join('_');
}

/** 전체 페이지 ZIP으로 다운로드 (각 파일: 1.jpg, 2.jpg, ...) */
export async function downloadAllAsZip(
  pages: Page[],
  bgKeyColor: string,
  scheduleRow: Record<string, unknown> | null,
): Promise<void> {
  const zip = new JSZip();

  for (let i = 0; i < pages.length; i++) {
    const canvas = renderPageToCanvas(pages[i], pages, bgKeyColor);
    const blob = await canvasToBlob(canvas);
    zip.file(`${i + 1}.jpg`, blob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipName = buildZipName(scheduleRow);
  downloadBlob(zipBlob, `${zipName}.zip`);
}
