'use client';

/* ===========================
   useSyncColors — 배경색 기반 색상 추적 적용
   BackgroundProps.tsx에서 분리
=========================== */

import { useEditorStore } from '@/store/editorStore';
import { calcAutoFillColor } from '@/lib/colorHelpers';
import { toast } from '@/components/editor/Toast';
import type { TextboxLayer, LogoLayer } from '@/types/layer';

export function useSyncColors() {
  const pages = useEditorStore(s => s.pages);
  const setPages = useEditorStore(s => s.setPages);

  const applyColorTracking = (bgHex: string) => {
    const autoColor = calcAutoFillColor(bgHex);
    const newPages = pages.map(pg => {
      const updatedLayers = pg.layers.map(l => {
        if (l.type === 'textbox') return { ...l, fillColor: autoColor } as TextboxLayer;
        if (l.type === 'logo' && (l as LogoLayer).stroke?.enabled)
          return { ...l, stroke: { ...(l as LogoLayer).stroke, color: autoColor } } as LogoLayer;
        return l;
      });
      return { ...pg, layers: updatedLayers };
    });
    setPages(newPages);
    toast('색상 추적 적용됨');
  };

  return { applyColorTracking };
}
