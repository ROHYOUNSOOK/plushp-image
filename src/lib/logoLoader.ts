'use client';

import { loadImage } from './utils';
import type { LogoLayer } from '@/types/layer';
import { W, H } from '@/types/constants';

const LOGO_MARGIN = 30;

export const LOGO_URL = '/plus/pluslogo_circle.png';

// 한 번 로드하면 캐시 재사용
let _cached: HTMLImageElement | null = null;

/**
 * fetch → blob URL 방식으로 이미지 로드
 * crossOrigin 속성 없이도 캔버스에 안전하게 사용 가능
 */
async function loadImageViaBlobUrl(url: string): Promise<HTMLImageElement> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  // blob URL은 동일 출처로 처리 → crossOrigin 불필요, 캔버스 오염 없음
  return loadImage(blobUrl);
}

export async function getDefaultLogoImage(): Promise<HTMLImageElement> {
  if (_cached) return _cached;
  try {
    // fetch 방식 시도 (CORS 헤더 없이도 동일 출처면 동작)
    _cached = await loadImageViaBlobUrl(LOGO_URL);
  } catch {
    // fallback: crossOrigin 직접 로드
    _cached = await loadImage(LOGO_URL);
  }
  return _cached;
}

/**
 * 이미지가 없는 모든 페이지의 로고 레이어 + 의료법 medConfig.logo 에 기본 로고 자동 로드
 * addPage / applySchedule 후 호출
 */
export async function autoLoadLogos(): Promise<void> {
  // 동적 import로 순환 참조 방지
  const { useEditorStore } = await import('@/store/editorStore');
  const store = useEditorStore.getState();

  const needsImg =
    store.pages.some(pg => pg.layers.some(l => l.type === 'logo' && !(l as LogoLayer).img)) ||
    store.pages.some(pg => pg.isMedicalLaw && pg.medConfig?.logo && !pg.medConfig.logo.img);

  if (!needsImg) return;

  try {
    const img = await getDefaultLogoImage();
    const aspect = img.naturalWidth / img.naturalHeight;
    const logoW = Math.round(86 * aspect);

    const updatedPages = store.pages.map(pg => {
      // 일반 레이어 로고
      const newLayers = pg.layers.map(l => {
        if (l.type === 'logo' && !(l as LogoLayer).img) {
          const logo = l as LogoLayer;
          // 현재 코너 위치 판별 후 새 크기에 맞게 x/y 재계산
          const isRight = logo.x > W / 2;
          const isBottom = logo.y > H / 2;
          const newX = isRight ? W - logoW - LOGO_MARGIN : LOGO_MARGIN;
          const newY = isBottom ? H - 86 - LOGO_MARGIN : LOGO_MARGIN;
          return { ...logo, img, url: LOGO_URL, h: 86, w: logoW, x: newX, y: newY } as LogoLayer;
        }
        return l;
      });

      // 의료법 페이지 medConfig.logo
      if (pg.isMedicalLaw && pg.medConfig?.logo && !pg.medConfig.logo.img) {
        return {
          ...pg,
          layers: newLayers,
          medConfig: {
            ...pg.medConfig,
            logo: { ...pg.medConfig.logo, img, url: LOGO_URL },
          },
        };
      }

      return { ...pg, layers: newLayers };
    });

    useEditorStore.getState().setPages(updatedPages);
  } catch (e) {
    console.error('[logoLoader] 로고 이미지 로드 실패:', e, 'URL:', LOGO_URL);
  }
}
