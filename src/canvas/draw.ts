/* ===========================
   Main Draw Dispatcher
   — 원본: plus_page_spread_통합.html 2591~2710행
   — 순수 TS, React 의존 없음
=========================== */

import type { Layer, PositionedLayer } from '@/types/layer';
import type { Page } from '@/types/page';
import { W, H, ML_H } from '@/types/constants';

import { drawBg } from './drawBg';
import { drawFrame } from './drawFrame';
import { drawImgLayer } from './drawImage';
import { drawTextbox } from './drawTextbox';
import { drawText } from './drawText';
import { drawLogo } from './drawLogo';
import { drawDoctorCard } from './drawDoctorCard';
import { drawGuides, drawHandles } from './drawGuides';
import { drawMedicalLawPage } from './drawMedicalLaw';

export interface DrawContext {
  ctx: CanvasRenderingContext2D;
  page: Page | null;
  bgKeyColor: string;
  isExporting: boolean;
  showGuides: boolean;
  frameEditMode: boolean;
  selectedLayerId: string | null;
  selectedLayerIds: string[];
  hoverId: string | null;
  inlineEditingId: string | null;
  firstPageBg?: { img: HTMLImageElement | null; solidColor?: string };
  isDragOver: boolean;
  dropTargetId: string | null;
}

/** 레이어 ID로 현재 페이지에서 레이어 찾기 */
function getLayer(page: Page | null, id: string | null): Layer | null {
  if (!page || !id) return null;
  return page.layers.find(l => l.id === id) ?? null;
}

/** 메인 캔버스 렌더링 (동기) */
export function drawImmediate(dc: DrawContext): void {
  const { ctx, page, bgKeyColor, isExporting } = dc;
  const drawH = page?.isMedicalLaw ? ML_H : H;

  ctx.save();
  ctx.clearRect(0, 0, W, drawH);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, drawH);

  if (page?.isMedicalLaw) {
    const firstPageBg = dc.firstPageBg;
    drawMedicalLawPage(ctx, W, ML_H, page, bgKeyColor, firstPageBg);
  } else if (page) {
    page.layers.forEach(layer => {
      if (!layer.visible) return;
      ctx.save();
      switch (layer.type) {
        case 'background':
          drawBg(ctx, layer, isExporting);
          break;
        case 'frame':
          drawFrame(ctx, layer, bgKeyColor, isExporting);
          break;
        case 'image':
          drawImgLayer(ctx, layer, bgKeyColor, isExporting);
          break;
        case 'textbox':
          drawTextbox(ctx, layer, bgKeyColor, layer.id === dc.inlineEditingId);
          break;
        case 'text':
          drawText(ctx, layer, isExporting);
          break;
        case 'logo':
          drawLogo(ctx, layer, bgKeyColor, isExporting);
          break;
        case 'doctor-card':
          drawDoctorCard(ctx, layer);
          break;
      }
      ctx.restore();
    });
  }

  // UI 오버레이 (내보내기 시 스킵)
  if (!isExporting) {
    // 가이드라인
    if (dc.showGuides) {
      drawGuides(ctx, page?.isMedicalLaw ?? false);
    }

    // 호버 하이라이트
    if (dc.hoverId && dc.hoverId !== dc.selectedLayerId) {
      const hov = getLayer(page, dc.hoverId);
      if (hov && hov.visible && hov.type !== 'background') {
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect((hov as PositionedLayer).x, (hov as PositionedLayer).y, (hov as PositionedLayer).w, (hov as PositionedLayer).h);
        ctx.restore();
      }
    }

    // 다중 선택 보조 테두리
    dc.selectedLayerIds.forEach(id => {
      if (id === dc.selectedLayerId) return;
      const l = getLayer(page, id);
      if (l && l.visible && l.type !== 'background') {
        ctx.save();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 4;
        ctx.strokeRect((l as PositionedLayer).x, (l as PositionedLayer).y, (l as PositionedLayer).w, (l as PositionedLayer).h);
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 2;
        ctx.strokeRect((l as PositionedLayer).x, (l as PositionedLayer).y, (l as PositionedLayer).w, (l as PositionedLayer).h);
        ctx.setLineDash([]);
        ctx.restore();
      }
    });

    // 선택 핸들
    const sel = getLayer(page, dc.selectedLayerId);
    if (sel && sel.type !== 'background') {
      drawHandles(ctx, sel as PositionedLayer, dc.frameEditMode);
    }

    // 드래그 오버 오버레이
    if (dc.isDragOver) {
      if (dc.dropTargetId) {
        const tgt = getLayer(page, dc.dropTargetId);
        if (tgt && tgt.type !== 'background') {
          const pl = tgt as PositionedLayer;
          ctx.save();
          ctx.fillStyle = 'rgba(59,130,246,0.18)';
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 4]);
          ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
          ctx.strokeRect(pl.x, pl.y, pl.w, pl.h);
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(59,130,246,0.9)';
          ctx.font = 'bold 28px Pretendard, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('이미지 드롭', pl.x + pl.w / 2, pl.y + pl.h / 2);
          ctx.restore();
        } else if (tgt && tgt.type === 'background') {
          // 배경 레이어: 전체 캔버스 하이라이트
          ctx.save();
          ctx.fillStyle = 'rgba(255,255,255,0.18)';
          ctx.fillRect(0, 0, W, drawH);
          ctx.strokeStyle = 'rgba(160,30,30,0.9)';
          ctx.lineWidth = 5;
          ctx.setLineDash([14, 7]);
          ctx.strokeRect(6, 6, W - 12, drawH - 12);
          ctx.setLineDash([]);
          const bgLabel = '배경 이미지 드롭';
          ctx.font = 'bold 32px Pretendard, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const bgTw = ctx.measureText(bgLabel).width;
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.beginPath();
          ctx.roundRect(W / 2 - bgTw / 2 - 20, drawH / 2 - 28, bgTw + 40, 56, 10);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.fillText(bgLabel, W / 2, drawH / 2);
          ctx.restore();
        }
      } else {
        // 빈 공간: 새 이미지 레이어로 추가
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(0, 0, W, drawH);
        ctx.strokeStyle = 'rgba(160,30,30,0.9)';
        ctx.lineWidth = 5;
        ctx.setLineDash([14, 7]);
        ctx.strokeRect(6, 6, W - 12, drawH - 12);
        ctx.setLineDash([]);
        // 텍스트 배경 박스
        const label = '새 이미지 레이어로 추가';
        ctx.font = 'bold 32px Pretendard, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.roundRect(W / 2 - tw / 2 - 20, drawH / 2 - 28, tw + 40, 56, 10);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, W / 2, drawH / 2);
        ctx.restore();
      }
    }
  }

  ctx.restore();
}
