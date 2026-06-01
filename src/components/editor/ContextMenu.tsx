'use client';


import { useState, useEffect, useCallback } from 'react';
import { useEditorStore, selectSelectedLayer } from '@/store/editorStore';

import type { Layer } from '@/types/layer';
import { toast } from './Toast';

interface MenuPos {
  x: number;
  y: number;
}

export default function ContextMenu() {
  const [pos, setPos] = useState<MenuPos | null>(null);

  const layer = useEditorStore(selectSelectedLayer);
  const { pushHistory, removeLayer, addLayer, reorderLayer, toggleVisible, toggleLocked, selectSingle } = useEditorStore();

  // 우클릭 이벤트
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // 캔버스 위에서만 동작
      if (target.tagName === 'CANVAS') {
        e.preventDefault();
        setPos({ x: e.clientX, y: e.clientY });
      } else {
        setPos(null);
      }
    };
    const close = () => setPos(null);
    window.addEventListener('contextmenu', handler);
    window.addEventListener('click', close);
    return () => {
      window.removeEventListener('contextmenu', handler);
      window.removeEventListener('click', close);
    };
  }, []);

  const handleDuplicate = useCallback(() => {
    if (!layer || layer.type === 'background') return;
    pushHistory();
    const copy = JSON.parse(JSON.stringify(layer)) as Layer;
    copy.id = `l${Date.now()}_dup`;
    copy.name = `${layer.name} 복사`;
    if ('x' in copy) (copy as { x: number }).x += 20;
    if ('y' in copy) (copy as { y: number }).y += 20;
    // img는 JSON으로 복사 안 되므로 원본에서 가져오기
    if ('img' in layer && layer.img) {
      (copy as { img: HTMLImageElement | null }).img = (layer as { img: HTMLImageElement }).img;
    }
    addLayer(copy);
    selectSingle(copy.id);
    toast('레이어 복제됨');
    setPos(null);
  }, [layer, pushHistory, addLayer, selectSingle]);

  const handleDelete = useCallback(() => {
    if (!layer) return;
    pushHistory();
    removeLayer(layer.id);
    toast('레이어 삭제됨');
    setPos(null);
  }, [layer, pushHistory, removeLayer]);

  const handleMoveToFront = useCallback(() => {
    if (!layer) return;
    const state = useEditorStore.getState();
    const layers = state.pages[state.currentPage]?.layers;
    if (!layers) return;
    const idx = layers.findIndex(l => l.id === layer.id);
    if (idx < 0 || idx === layers.length - 1) return;
    pushHistory();
    reorderLayer(idx, layers.length - 1);
    toast('맨 앞으로 이동');
    setPos(null);
  }, [layer, pushHistory, reorderLayer]);

  const handleMoveToBack = useCallback(() => {
    if (!layer) return;
    const state = useEditorStore.getState();
    const layers = state.pages[state.currentPage]?.layers;
    if (!layers) return;
    const idx = layers.findIndex(l => l.id === layer.id);
    // 배경(0번) 바로 위로
    const targetIdx = layers[0]?.type === 'background' ? 1 : 0;
    if (idx < 0 || idx === targetIdx) return;
    pushHistory();
    reorderLayer(idx, targetIdx);
    toast('맨 뒤로 이동');
    setPos(null);
  }, [layer, pushHistory, reorderLayer]);

  const handleToggleVisible = useCallback(() => {
    if (!layer) return;
    toggleVisible(layer.id);
    setPos(null);
  }, [layer, toggleVisible]);

  const handleToggleLocked = useCallback(() => {
    if (!layer) return;
    toggleLocked(layer.id);
    toast(layer.locked ? '잠금 해제' : '잠금');
    setPos(null);
  }, [layer, toggleLocked]);

  if (!pos) return null;

  interface MenuItem {
    label: string;
    action?: () => void;
    disabled?: boolean;
    danger?: boolean;
  }

  const items: MenuItem[] = layer ? [
    { label: '복제', action: handleDuplicate, disabled: layer.type === 'background' },
    { label: '삭제', action: handleDelete, danger: true },
    { label: '---' },
    { label: '맨 앞으로', action: handleMoveToFront },
    { label: '맨 뒤로', action: handleMoveToBack },
    { label: '---' },
    { label: layer.visible ? '숨기기' : '보이기', action: handleToggleVisible },
    { label: layer.locked ? '잠금 해제' : '잠금', action: handleToggleLocked },
  ] : [
    { label: '선택된 레이어 없음', disabled: true },
  ];

  return (
    <div
      className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[140px]"
      style={{ left: pos.x, top: pos.y }}
    >
      {items.map((item, i) => {
        if (item.label === '---') {
          return <div key={i} className="border-t border-gray-100 my-1" />;
        }
        return (
          <button
            key={i}
            onClick={item.action}
            disabled={item.disabled}
            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent ${
              (item as { danger?: boolean }).danger ? 'text-red-500 hover:bg-red-50' : ''
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
