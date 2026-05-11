'use client';


/* ===========================
   InlineTextEditor — 캔버스 위 텍스트박스 직접 편집 오버레이
   — 원본: plus_page_spread_통합.html 3602~3685행
=========================== */

import { useEffect, useRef } from 'react';
import { W, H } from '@/types/constants';
import type { TextboxLayer } from '@/types/layer';
import { useEditorStore, selectBgKeyColor } from '@/store/editorStore';
import { hexToRgb, calcAutoFillColor } from '@/lib/colorHelpers';

interface InlineTextEditorProps {
  layer: TextboxLayer;
  canvasRect: DOMRect;
  onFinish: (newContent: string) => void;
  onCancel: () => void;
}

export default function InlineTextEditor({ layer, canvasRect, onFinish, onCancel }: InlineTextEditorProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const bgKeyColor = useEditorStore(selectBgKeyColor);

  const scaleX = canvasRect.width / W;
  const scaleY = canvasRect.height / H;

  const fillHex = layer.fillColor || calcAutoFillColor(bgKeyColor);
  const { r: fr, g: fg, b: fb } = hexToRgb(fillHex);
  const bgColor = `rgba(${fr},${fg},${fb},${layer.fillAlpha ?? 1})`;

  const padT = (layer.paddingTop ?? 20) * scaleY;
  const padR = (layer.paddingRight ?? 20) * scaleX;
  const padB = (layer.paddingBottom ?? 20) * scaleY;
  const padL = (layer.paddingLeft ?? 20) * scaleX;
  const fontSize = (layer.fontSize || 48) * scaleX;
  const radius = (layer.radius || 0) * scaleX;

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.shiftKey)) {
      e.preventDefault();
      onFinish(taRef.current?.value ?? '');
    }
  };

  return (
    <textarea
      ref={taRef}
      defaultValue={layer.content || ''}
      onBlur={() => onFinish(taRef.current?.value ?? '')}
      onKeyDown={handleKeyDown}
      style={{
        position: 'fixed',
        left: canvasRect.left + layer.x * scaleX,
        top: canvasRect.top + layer.y * scaleY,
        width: layer.w * scaleX,
        height: layer.h * scaleY,
        fontSize,
        fontFamily: `${layer.font || 'Pretendard'}, sans-serif`,
        fontWeight: layer.fontWeight || '700',
        color: layer.textColor || '#ffffff',
        background: bgColor,
        border: '2px dashed rgba(255,255,255,0.7)',
        borderRadius: radius,
        outline: 'none',
        resize: 'none',
        padding: `${padT}px ${padR}px ${padB}px ${padL}px`,
        lineHeight: layer.lineHeight || 1,
        textAlign: (layer.textAlign || 'left') as React.CSSProperties['textAlign'],
        caretColor: layer.textColor || '#ffffff',
        zIndex: 5000,
        boxSizing: 'border-box',
        overflow: 'hidden',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    />
  );
}
