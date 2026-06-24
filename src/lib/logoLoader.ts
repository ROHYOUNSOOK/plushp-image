'use client';

import { loadImage } from './utils';
import type { LogoLayer } from '@/types/layer';

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
 * 이미지가 없는 모든 페이지의 로고 레이어에 기본 로고 자동 로드
 * addPage / applySchedule 후 호출
 */
export async function autoLoadLogos(): Promise<void> {
  // 동적 import로 순환 참조 방지
  const { useEditorStore } = await import('@/store/editorStore');
  const store = useEditorStore.getState();

  const needsImg =
    store.pages.some(pg => pg.layers.some(l => l.type === 'logo' && !(l as LogoLayer).img)) ||
    store.pages.some(pg => pg.isMedicalLaw && !pg.layers.some(l => l.type === 'logo'));

  if (!needsImg) return;

  try {
    const img = await getDefaultLogoImage();
    const LOGO_SIZE = 70;

    const updatedPages = store.pages.map(pg => {
      // 이미지 없는 로고 레이어: img/url만 채우고 w/h/x/y는 레이어 값 유지
      let newLayers = pg.layers.map(l => {
        if (l.type === 'logo' && !(l as LogoLayer).img) {
          return { ...(l as LogoLayer), img, url: LOGO_URL } as LogoLayer;
        }
        return l;
      });

      // 의료법 페이지에 LogoLayer가 없으면 새로 추가
      if (pg.isMedicalLaw && !newLayers.some(l => l.type === 'logo')) {
        const medLogo: LogoLayer = {
          id: `l${Date.now()}_medlogo`,
          type: 'logo',
          name: '로고',
          visible: true,
          locked: false,
          img, url: LOGO_URL,
          x: LOGO_MARGIN, y: LOGO_MARGIN,
          w: LOGO_SIZE, h: LOGO_SIZE,
          opacity: 1, rotation: 0,
          stroke: { enabled: true, color: null, width: 3, radius: 0 },
          shadow: { enabled: false, color: null, alpha: 0.4, blur: 5, offsetX: 0, offsetY: 5 },
        };
        newLayers = [...newLayers, medLogo];
      }

      return { ...pg, layers: newLayers };
    });

    useEditorStore.getState().setPages(updatedPages);
  } catch (e) {
    console.error('[logoLoader] 로고 이미지 로드 실패:', e, 'URL:', LOGO_URL);
  }
}
